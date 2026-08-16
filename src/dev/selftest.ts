import Decimal from 'break_infinity.js'
import { runPlanet } from './balance'
import { GENERATOR_GROUPS, GENERATORS, findGenerator, groupOf } from '../data/generators'
import { FINALE } from '../data/finale'
import { AURORA, PLANETS } from '../data/planets'
import { ROCKETS } from '../data/rockets'
import { findSound } from '../data/sounds'
import { play } from '../engine/audio'
import { reportsAbsence } from '../engine/loop'
import { formatInt } from '../engine/format'
import {
  exportSave,
  importSave,
  isPersistenceSuspended,
  resumePersistence,
  saveGame,
  suspendPersistence,
} from '../engine/save'
import { deserializeSettings, serializeSettings, settings } from '../state/settings.svelte'
import {
  deserializePlanet,
  pendingUnits,
  planet,
  resetPlanet,
  serializePlanet,
} from '../state/planet.svelte'
import { materialAmount, run, unlockPlanet } from '../state/run.svelte'
import { atmosphereSystem, n2Percent, o2Percent, pollutionPercent } from '../systems/atmosphere'
import { meta } from '../state/meta.svelte'
import { achievementsSystem } from '../systems/achievements'
import { combatSystem } from '../systems/combat'
import {
  availableGoods,
  buildRate,
  cancelSite,
  constructionSystem,
  orderBlocker,
  orderGenerator,
  orderGood,
} from '../systems/construction'
import { contentment } from '../systems/contentment'
import { finaleBlocker, seedUniverse } from '../systems/finale'
import { seedingSystem } from '../systems/seeding'
import {
  depletionOf,
  recallCrew,
  revealedTargets,
  runsOn,
  salvageBlocker,
  salvageSystem,
  sendCrew,
} from '../systems/salvage'
import { findSalvage } from '../data/salvage'
import { landmarkFor } from '../data/landmarks'
import {
  grantBlueprint,
  knowsBlueprint,
  unreachableBlueprints,
} from '../systems/blueprints'
import { buyResearch } from '../systems/research'
import {
  canOrderStage,
  landmarkDone,
  landmarkEffects,
  landmarkHere,
  orderStage,
  stagesDone,
} from '../systems/landmarks'
import { craftBlocker, craftingSystem } from '../systems/crafting'
import { assign, assignBuilder, crewAway, handFactor, unassign, unassigned } from '../systems/labor'
import { housingCapacity, o2ConsumptionRate, populationSystem } from '../systems/population'
import {
  clickGain,
  currentO2Rate,
  demolish,
  generatorCost,
  isAvailable,
  isRevealed,
  productionSystem,
  supplyRate,
} from '../systems/production'
import { isStorageFull, materialCapacity, storeMaterial } from '../systems/storage'
import { buildRocket, showsPlanetMap, travelTo } from '../systems/travel'

/**
 * Selbsttest — die mechanische Klasse von Fehlern, ohne Spieltest.
 *
 * Jede Prüfung hier steht für einen Fehler, der tatsächlich passiert ist und
 * beim bloßen Lesen des Codes nicht auffiel:
 *
 * - Der Löschen-Knopf wirkte nicht, weil `beforeunload` den Stand sofort
 *   zurückschrieb. Lag seit M0 drin.
 * - `importSave()` rief `deserializeRun()` nicht auf und verlor stillschweigend
 *   Material, Freischaltungen und eingelagerte Planeten. Lag seit M4 drin.
 * - N₂ war nicht entfernbar; zu viel Puffer ruinierte einen Planeten dauerhaft.
 *   Lag seit M3 in jedem Planeten mit Puffer.
 *
 * Aufruf in der Konsole: `cleanair.selftest()`.
 *
 * Achtung: der Test verändert den Zustand. Er sichert ihn vorher und stellt
 * ihn danach wieder her — trotzdem nicht mitten im echten Spiel laufen lassen.
 */

interface Result {
  name: string
  ok: boolean
  detail?: string
}

function check(results: Result[], name: string, ok: boolean, detail = ''): void {
  results.push(ok ? { name, ok } : { name, ok, detail })
}

/** Zustand komplett sichern, um nach dem Test nichts kaputt zu lassen. */
function snapshot(): string {
  return exportSave()
}

function restore(blob: string): void {
  importSave(blob)
}

function freshRun(): void {
  run.materials = {}
  run.planets = {}
  run.unlocked = PLANETS.map((p) => p.id)
  resetPlanet(AURORA, new Decimal(0))
}

export function selftest(): { bestanden: number; fehlgeschlagen: number; ergebnisse: Result[] } {
  /*
   * Erst die Speichersperre, dann alles andere.
   *
   * `restore()` geht über importSave(), und das schreibt am Ende bewusst in
   * den Spielstand — „wer importiert, will wieder gespeichert haben". Damit
   * schrieb jeder Testlauf in den echten Stand, und ein Lauf, der mitten in
   * einer Simulation startet, konserviert genau diese Simulation. So ist
   * beim Bau von M11 ein Spielstand verloren gegangen.
   */
  const warGesperrt = isPersistenceSuspended()
  suspendPersistence()

  const sicherung = snapshot()
  const r: Result[] = []

  try {
    /* --- Save-Rundlauf ---------------------------------------------------
       Der Bug, der seit M4 drinsteckte: exportieren, alles zerstören,
       importieren — und prüfen, ob wirklich *jeder* Teilzustand zurückkommt.
    --------------------------------------------------------------------- */
    freshRun()
    planet.generators = { electrolysis: 42 }
    planet.airO2 = new Decimal(1234567)
    planet.rocketBuilt = true
    run.materials = { holz: new Decimal(4321) }
    run.unlocked = ['aurora', 'vesta']
    run.planets = { vesta: { id: 'vesta', generators: { sublimator: 9 } } }

    const blob = exportSave()
    freshRun()
    planet.generators = {}
    planet.airO2 = new Decimal(0)
    const importiert = importSave(blob)

    check(r, 'Import meldet Erfolg', importiert)
    check(r, 'Import stellt Generatoren wieder her', (planet.generators.electrolysis ?? 0) === 42)
    check(r, 'Import stellt Luft-O₂ wieder her', planet.airO2.eq(1234567))
    check(r, 'Import stellt die Rakete wieder her', planet.rocketBuilt === true)
    check(
      r,
      'Import stellt das Materiallager wieder her',
      (run.materials.holz?.toNumber() ?? 0) === 4321,
      `holz=${run.materials.holz?.toString() ?? 'fehlt'}`,
    )
    check(r, 'Import stellt Freischaltungen wieder her', run.unlocked.includes('vesta'))
    check(r, 'Import stellt eingelagerte Planeten wieder her', run.planets.vesta !== undefined)

    /*
     * Die Speichersperre muss dort greifen, wo wirklich geschrieben wird.
     * Der Test läuft selbst unter dieser Sperre — schlägt die Prüfung fehl,
     * schreibt gerade ein Testlauf oder eine Simulation in den echten Stand.
     * Genau so ist beim Bau von M11 einer verloren gegangen.
     */
    check(r, 'Gesperrte Persistenz schreibt nichts', saveGame() === false)

    /* --- Reisen ----------------------------------------------------------
       Ein Planet muss den Wechsel unverändert überstehen.
    --------------------------------------------------------------------- */
    freshRun()
    planet.generators = { electrolysis: 17 }
    planet.airO2 = new Decimal(999000)
    planet.clicks = 555
    travelTo('vesta')
    const fremd = (planet.generators.electrolysis ?? 0) === 0
    travelTo('aurora')

    check(r, 'Fremder Planet startet leer', fremd)
    check(r, 'Rückkehr erhält Generatoren', (planet.generators.electrolysis ?? 0) === 17)
    check(r, 'Rückkehr erhält Luft-O₂', planet.airO2.eq(999000))
    check(r, 'Rückkehr erhält Klicks', planet.clicks === 555)
    check(r, 'Verlassener Planet liegt eingelagert', run.planets.vesta !== undefined)
    check(r, 'Aktiver Planet liegt nicht doppelt vor', run.planets.aurora === undefined)

    /* --- Rakete ----------------------------------------------------------
       Sie muss ohne das nötige Material sperren und mit ihm freigeben.
    --------------------------------------------------------------------- */
    freshRun()
    travelTo('pyra')
    planet.oxygen = new Decimal(1e12)
    run.materials = { obsidian: new Decimal(1e6), schwefel: new Decimal(1e6) }
    const ohneTitan = buildRocket()
    run.materials = { ...run.materials, titan: new Decimal(1e6) }
    const mitTitan = buildRocket()

    check(r, 'Rakete sperrt ohne auswärtiges Material', !ohneTitan)
    check(r, 'Rakete baut mit vollständigem Material', mitTitan)
    check(r, 'Gebaute Rakete schaltet den nächsten Planeten frei', run.unlocked.includes('kryo'))

    /* --- Der Weg zurück --------------------------------------------------
       Gefunden beim Durchklicken, nicht hier: die Sternenkarte hing an
       `planet.rocketBuilt`, und das gehört dem **aktiven** Planeten. Wer
       Aurora abschloss, die Rakete baute und nach Vesta flog, stand dort
       ohne Karte — und damit ohne Rückflug, auf dem §16 vollständig
       aufbaut. Genau diese Reihenfolge steht hier nach.
    --------------------------------------------------------------------- */
    freshRun()
    run.unlocked = ['aurora']
    const karteAmAnfang = showsPlanetMap()
    planet.completed = true
    const karteNachAbschluss = showsPlanetMap()
    planet.rocketBuilt = true
    unlockPlanet('vesta')
    travelTo('vesta')
    const karteNachAnkunft = showsPlanetMap()

    check(r, 'Ohne Ziel keine Sternenkarte', !karteAmAnfang)
    check(r, 'Abgeschlossener Planet zeigt die Karte', karteNachAbschluss)
    check(r, 'Die Karte bleibt nach der Ankunft', karteNachAnkunft)

    /* --- Keine Sackgassen ------------------------------------------------
       Zwei Invarianten, die eine unspielbare Konstellation verhindern.
    --------------------------------------------------------------------- */
    for (const def of PLANETS) {
      freshRun()
      travelTo(def.id)
      const o2Quellen = GENERATORS.filter(
        (g) => isAvailable(g) && g.output.kind === 'gas' && g.output.gas === 'o2' && g.revealAt === 0,
      )
      check(r, `${def.name}: O₂-Anlage ab Sekunde eins verfügbar`, o2Quellen.length > 0)
    }

    /*
     * Und die Sackgasse, die acht Meilensteine überlebt hat: eine Anlage, die
     * es im Datenmodell gibt, aber in **keiner** Anlagenliste auftaucht.
     *
     * Die Gruppe hat seit M13 der Compiler (GENERATOR_GROUPS), die zweite
     * Hälfte kann er nicht sehen: `isAvailable` ist Laufzeitlogik, und eine
     * Anlage, die auf keinem der fünf Planeten verfügbar ist, steht nirgends
     * — sichtbar nur, wenn man alle Planeten durchgeht. Genau diesen Weg geht
     * ein Mensch, und genau ihn ging bisher keine Prüfung.
     */
    const bekannteGruppen = new Set<string>(GENERATOR_GROUPS.map((g) => g.key))
    const ohneGruppe = GENERATORS.filter((g) => !bekannteGruppen.has(groupOf(g)))
    check(
      r,
      'Jede Anlage fällt in eine Gruppe der Anlagenliste',
      ohneGruppe.length === 0,
      ohneGruppe.map((g) => `${g.name} (${groupOf(g)})`).join(', '),
    )

    const nirgends = GENERATORS.filter((g) => !PLANETS.some((p) => isAvailable(g, p)))
    check(
      r,
      'Jede Anlage ist auf mindestens einem Planeten verfügbar',
      nirgends.length === 0,
      nirgends.map((g) => g.name).join(', '),
    )

    // Jede Rakete muss aus Material baubar sein, das irgendwo im Spiel vorkommt.
    const alleVorkommen = new Set(PLANETS.flatMap((p) => p.materials))
    for (const rocket of ROCKETS) {
      const fehlend = Object.keys(rocket.materialCost ?? {}).filter((m) => !alleVorkommen.has(m))
      check(
        r,
        `Rakete ${rocket.name}: alle Materialien sind irgendwo förderbar`,
        fehlend.length === 0,
        fehlend.join(', '),
      )
    }

    /* --- Ventil regelt, statt zu leeren ----------------------------------
       Der Fehler aus M7 in beide Richtungen: N₂ muss abbaubar sein, darf aber
       nicht unter das Fenster gezogen werden.
    --------------------------------------------------------------------- */
    freshRun()
    travelTo('vesta')
    const fenster = PLANETS.find((p) => p.id === 'vesta')!.n2Window!
    planet.airN2 = new Decimal(1e9)
    planet.airO2 = new Decimal(1e7)
    planet.generators = { vent: 30 }
    const n2Start = n2Percent()
    for (let i = 0; i < 600; i++) productionSystem(1)
    const n2Ende = n2Percent()

    check(r, 'Ventil senkt einen überfüllten Puffer', n2Ende < n2Start, `${n2Start} → ${n2Ende}`)
    check(
      r,
      'Ventil zieht den Puffer nicht unter das Fenster',
      n2Ende >= fenster.min - 1,
      `N₂ bei ${n2Ende.toFixed(2)} %, Fenster ab ${fenster.min} %`,
    )

    /* --- Serialisierung ist vollständig ----------------------------------
       Ein neues Feld in planet.svelte.ts, das niemand in serializePlanet()
       einträgt, fällt sonst erst beim nächsten Laden auf.
    --------------------------------------------------------------------- */
    freshRun()
    const serialisiert = Object.keys(serializePlanet())
    const imZustand = Object.keys(planet)
    const vergessen = imZustand.filter((k) => !serialisiert.includes(k))
    check(
      r,
      'Alle Planetenfelder werden gespeichert',
      vergessen.length === 0,
      `nicht serialisiert: ${vergessen.join(', ')}`,
    )

    // Und der Rückweg: was gespeichert wird, muss auch gelesen werden.
    freshRun()
    const vorher = serializePlanet()
    deserializePlanet(vorher)
    const nachher = serializePlanet()
    const abweichend = Object.keys(vorher).filter(
      (k) => JSON.stringify((vorher as never)[k]) !== JSON.stringify((nachher as never)[k]),
    )
    check(
      r,
      'Speichern und Lesen sind zueinander passend',
      abweichend.length === 0,
      `abweichend: ${abweichend.join(', ')}`,
    )

    /* --- Anoxen ----------------------------------------------------------
       Der wichtigste Punkt: Sabotage muss die Produktion wirklich senken,
       und Anlagen dürfen dabei nie verschwinden (§1.2).
    --------------------------------------------------------------------- */
    freshRun()
    travelTo('pyra')
    planet.generators = { electrolysis: 100 }
    // Seit §17 produziert eine Anlage nur mit zugewiesenen Leuten. Ohne diese
    // Zeilen misst der Test zweimal null und beweist nichts.
    planet.settlers = new Decimal(100)
    planet.staff = { electrolysis: 100 }
    planet.satiety = 1
    const volleRate = currentO2Rate().toNumber()
    planet.disabled = { electrolysis: 60 }
    const gedrosselt = currentO2Rate().toNumber()
    check(r, 'Lahmgelegte Anlagen produzieren nicht', gedrosselt < volleRate, `${volleRate} → ${gedrosselt}`)
    check(r, 'Lahmlegen löscht keine Anlagen', (planet.generators.electrolysis ?? 0) === 100)

    // Reparatur holt sie von selbst zurück, auch ohne Depot.
    for (let i = 0; i < 600; i++) combatSystem(1)
    check(
      r,
      'Anlagen laufen von selbst wieder an',
      (planet.disabled.electrolysis ?? 0) < 60,
      `noch ${planet.disabled.electrolysis ?? 0} aus`,
    )

    // Kein Angriff, wo keine Anoxen leben.
    freshRun()
    travelTo('vesta')
    planet.threat = 0
    planet.airO2 = new Decimal(1e9)
    for (let i = 0; i < 2000; i++) combatSystem(1)
    check(r, 'Planeten ohne Anoxen bleiben verschont', planet.waveNumber === 0)

    /* --- Arbeitskraft (§17) -----------------------------------------------
       Die neue Kernregel: ohne zugewiesene Leute läuft nichts. Und niemand
       verhungert — Versorgungsmangel senkt die Leistung, tötet aber nicht.
    --------------------------------------------------------------------- */
    freshRun()
    check(r, 'Aurora startet mit Mannschaft', planet.settlers.eq(4), planet.settlers.toString())
    check(r, 'Aurora startet mit Rationen', planet.food.gt(0) && planet.water.gt(0))
    /*
     * Die Rationen hängen an der Kopfzahl, nicht an einer festen Menge: sonst
     * verschwindet mit einer kleineren Mannschaft auch das Überlebensproblem,
     * mit dem Aurora seit §17 anfängt. Zehn Minuten sind die Untergrenze zum
     * Verstehen, dreißig wären eine Einladung zum Nichtstun.
     */
    const reichweite = planet.food.div(planet.settlers.mul(AURORA.foodPerCapita)).toNumber()
    check(
      r,
      'Auroras Rationen reichen 10 bis 20 Minuten',
      reichweite > 600 && reichweite < 1200,
      `${Math.round(reichweite)} s`,
    )

    /*
     * Geprüft wird an der Keimkammer, nicht an der Elektrolyse: seit der
     * Trennung „Maschine gegen Handarbeit" laufen chemische Apparate von
     * selbst. Genau das gehört mitgeprüft, sonst wandert die Regel
     * unbemerkt wieder auf alle Anlagen zurück.
     */
    planet.generators = { electrolysis: 5, sprouter: 4 }
    planet.staff = {}
    planet.satiety = 1
    check(r, 'Maschinen laufen ohne Zuweisung', currentO2Rate().gt(0))
    check(r, 'Handarbeit ohne Zuweisung liefert nichts', supplyRate('food').eq(0))

    assign('sprouter', 4)
    check(r, 'Besetzte Handarbeit liefert', supplyRate('food').gt(0))

    // Halb besetzt heißt halbe Leistung.
    const voll = supplyRate('food').toNumber()
    unassign('sprouter', 2)
    const teilweise = supplyRate('food').toNumber()
    check(
      r,
      'Halbe Besetzung heißt halbe Leistung',
      teilweise < voll && teilweise > 0,
      `${voll} → ${teilweise}`,
    )

    // Leere Vorräte legen die Arbeit lahm, töten aber niemanden.
    planet.food = new Decimal(0)
    planet.water = new Decimal(0)
    const leuteVorher = planet.settlers.toNumber()
    for (let i = 0; i < 3000; i++) populationSystem(1)
    check(r, 'Leere Vorräte senken die Sättigung', planet.satiety < 0.2, `${planet.satiety}`)
    check(r, 'Hunger tötet niemanden', planet.settlers.toNumber() >= leuteVorher - 0.001)

    /* --- Abriss deeskaliert (§17) ------------------------------------------
       Seit Zuwanderung automatisch passiert, ist Abriss der einzige Weg
       zurück. Er muss also nicht nur Gebäude entfernen, sondern die
       Bevölkerung auch wirklich schrumpfen lassen — und zwar unabhängig von
       der Sättigung. Genau daran wäre er beinahe gescheitert.
    --------------------------------------------------------------------- */
    freshRun()
    travelTo('vesta')
    planet.generators = { dome: 10 }
    // Über der Kapazität *nach* dem Abriss, aber unter der davor — sonst
    // prüft der Test nichts. Genau daran ist er beim ersten Anlauf gescheitert.
    planet.settlers = new Decimal(2500)
    planet.food = new Decimal(0)
    planet.water = new Decimal(0)
    planet.satiety = 0
    const platzVorher = housingCapacity().toNumber()

    demolish('dome', 5)
    const platzNachher = housingCapacity().toNumber()
    check(r, 'Abriss senkt den Wohnraum', platzNachher < platzVorher, `${platzVorher} → ${platzNachher}`)
    check(r, 'Abriss entfernt Anlagen', (planet.generators.dome ?? 0) === 5)

    const leuteVorAbriss = planet.settlers.toNumber()
    for (let i = 0; i < 1200; i++) populationSystem(1)
    check(
      r,
      'Bevölkerung schrumpft auch bei leeren Vorräten',
      planet.settlers.toNumber() < leuteVorAbriss,
      `${leuteVorAbriss} → ${planet.settlers.toNumber().toFixed(0)}`,
    )

    // Und der Rückweg bleibt offen: Versorgung erholt sich wieder.
    freshRun()
    planet.settlers = new Decimal(10)
    planet.food = new Decimal(500)
    planet.water = new Decimal(500)
    for (let i = 0; i < 3000; i++) populationSystem(1)
    check(r, 'Versorgung erholt sich wieder', planet.satiety > 0.9, `${planet.satiety}`)

    /* --- Bauen kostet Hände und Zeit (M11, §17) ---------------------------
       Der Kern des Meilensteins: bezahlt ist nicht gebaut. Geprüft wird
       beides — dass eine Bestellung *nicht* sofort dasteht, und dass sie
       trotzdem zuverlässig fertig wird.
    --------------------------------------------------------------------- */
    freshRun()
    planet.oxygen = new Decimal(1e6)
    planet.settlers = new Decimal(20)
    planet.satiety = 1

    const bestellt = orderGenerator('electrolysis', 3)
    check(r, 'Bestellung wird angenommen', bestellt)
    check(
      r,
      'Bestellung liefert nicht sofort eine Anlage',
      (planet.generators.electrolysis ?? 0) === 0,
      `sofort da: ${planet.generators.electrolysis ?? 0}`,
    )
    check(r, 'Bestellung legt eine Baustelle an', pendingUnits('electrolysis') === 3)

    // Ohne Bauarbeiter läuft es trotzdem — sonst wäre jeder Planet ohne
    // Bewohner eine Sackgasse.
    const ohneKolonne = buildRate()
    assignBuilder(4)
    const mitKolonne = buildRate()
    check(r, 'Bau läuft auch ohne Bauarbeiter', ohneKolonne > 0, `${ohneKolonne}/s`)
    check(
      r,
      'Bauarbeiter beschleunigen den Bau deutlich',
      mitKolonne > ohneKolonne * 2,
      `${ohneKolonne} → ${mitKolonne}`,
    )

    for (let i = 0; i < 120; i++) constructionSystem(1)
    check(
      r,
      'Baustelle wird fertig und liefert die Anlagen',
      (planet.generators.electrolysis ?? 0) === 3,
      `gebaut: ${planet.generators.electrolysis ?? 0}`,
    )
    check(r, 'Fertige Baustelle verschwindet aus der Reihe', planet.sites.length === 0)

    // Bestelltes muss die Kostenkurve mitzählen. Sonst kostet zweimal „Max"
    // hintereinander beide Male den niedrigen Preis.
    freshRun()
    planet.oxygen = new Decimal(1e9)
    const preisLeer = generatorCost(findGenerator('electrolysis')!, 1).toNumber()
    orderGenerator('electrolysis', 5)
    const preisBestellt = generatorCost(findGenerator('electrolysis')!, 1).toNumber()
    check(
      r,
      'Bestellte Stück verteuern das nächste',
      preisBestellt > preisLeer,
      `${preisLeer} → ${preisBestellt}`,
    )

    // Abbrechen erstattet die offenen Stück vollständig — O₂ wie Material.
    freshRun()
    travelTo('vesta')
    planet.oxygen = new Decimal(1e9)
    run.materials = { stein: new Decimal(500) }
    // Die Wohnkuppel liegt seit M20 hinter einem Bauplan. Diese Prüfung meint
    // den Abbruch und nicht das Schloss — also wird es aufgeschlossen, statt
    // die Prüfung auf eine andere Anlage umzubiegen.
    grantBlueprint('dome', 'Prüfung.')
    const o2Vorher = planet.oxygen.toNumber()
    const steinVorher = materialAmount('stein').toNumber()
    orderGenerator('dome', 4)
    check(r, 'Bestellung bucht Material ab', materialAmount('stein').toNumber() < steinVorher)
    cancelSite(0)
    check(
      r,
      'Abbruch erstattet O₂ vollständig',
      Math.abs(planet.oxygen.toNumber() - o2Vorher) < 0.01,
      `${o2Vorher} → ${planet.oxygen.toNumber()}`,
    )
    check(
      r,
      'Abbruch erstattet Material vollständig',
      Math.abs(materialAmount('stein').toNumber() - steinVorher) < 0.01,
      `${steinVorher} → ${materialAmount('stein').toNumber()}`,
    )
    check(r, 'Abbruch räumt die Baustelle weg', planet.sites.length === 0)

    /* --- Wohnraum auf Aurora (offene Frage aus §17) -----------------------
       Die Wohnkuppel kostet Stein, den Aurora nicht führt — die Kolonie blieb
       bei den zwölf Betten der Landekapseln stehen. Das Wohnmodul muss dort
       ohne jedes Material baubar sein.
    --------------------------------------------------------------------- */
    freshRun()
    const wohnmodul = findGenerator('habitat')!
    check(r, 'Aurora kann Wohnraum bauen', isAvailable(wohnmodul))
    check(r, 'Wohnraum auf Aurora kostet kein Material', wohnmodul.materialCost === undefined)

    const bettenVorher = housingCapacity().toNumber()
    planet.oxygen = new Decimal(1e6)
    planet.settlers = new Decimal(10)
    assignBuilder(3)
    orderGenerator('habitat', 2)
    for (let i = 0; i < 200; i++) constructionSystem(1)
    check(
      r,
      'Gebauter Wohnraum hebt die Kapazität',
      housingCapacity().toNumber() > bettenVorher,
      `${bettenVorher} → ${housingCapacity().toNumber()}`,
    )

    /* --- Das Ende (M16, §19) ----------------------------------------------
       Drei Eigenschaften, die ein Ende haben muss: es geht nicht zu früh, es
       geht nicht zweimal, und es nimmt nichts weg. Die dritte ist die
       wichtigste — §1.2 gilt auch hier.
    --------------------------------------------------------------------- */
    freshRun()
    meta.finaleReached = false
    run.materials = Object.fromEntries(
      Object.entries(FINALE.materialCost).map(([id, m]) => [id, new Decimal(m * 2)]),
    )
    check(
      r,
      'Aussaat ist ohne stehende Atmosphären gesperrt',
      finaleBlocker() !== null && !seedUniverse(),
      finaleBlocker() ?? 'kein Grund',
    )

    // Alle sechs stabil — über die eingelagerten Planeten, wie im Spiel.
    planet.completed = true
    run.planets = Object.fromEntries(
      PLANETS.filter((p) => p.id !== planet.id).map((p) => [
        p.id,
        { id: p.id, completed: true },
      ]),
    )
    check(r, 'Aussaat wird frei, wenn alles steht', finaleBlocker() === null, finaleBlocker() ?? '')

    const kerneVorher = meta.genesisCores.toString()
    const ausgesaet = seedUniverse()
    check(r, 'Aussaat gelingt', ausgesaet && meta.finaleReached)
    check(r, 'Aussaat nimmt keine Kerne weg', meta.genesisCores.toString() === kerneVorher)
    check(r, 'Aussaat geht nur einmal', !seedUniverse())

    // Und sie überlebt den Prestige-Reset — ein Ende gehört nicht dem Durchlauf.
    const blobFinale = exportSave()
    meta.finaleReached = false
    importSave(blobFinale)
    check(r, 'Save erhält die Aussaat', meta.finaleReached)

    /* --- Die Hochrechnung danach (M17) ------------------------------------
       Sie darf nur nach der Aussaat laufen, muss offline nachholen können und
       muss bei gleichem Spielstand dieselben Welten melden — sonst ist sie
       ein Zufallsgenerator mit Text statt eines Modells.
    --------------------------------------------------------------------- */
    check(r, 'Aussaat schickt Kapseln los', meta.capsules > 0, `${meta.capsules}`)
    meta.capsulesResolved = 0
    meta.capsulesTaken = 0
    meta.capsuleProgress = 0
    meta.seedLog = []

    seedingSystem(10)
    check(r, 'Ohne Zeit keine Meldung', meta.capsulesResolved === 0)

    // Ein langer Nachlauf muss mehrere Meldungen bringen, nicht eine.
    seedingSystem(1000)
    const nachLauf = meta.capsulesResolved
    check(r, 'Offline holt mehrere Meldungen nach', nachLauf > 1, `${nachLauf}`)
    check(r, 'Hochrechnung behält nur die letzten Befunde', meta.seedLog.length <= 8)

    // Wiederholung ist bei fünf Zeilen je Ausgang eingebaut — zwei gleiche
    // *nebeneinander* liest sich aber als Fehler. Genau das stand im Panel.
    const doppelt = meta.seedLog.some((zeile, i) => {
      if (i === 0) return false
      const vorher = meta.seedLog[i - 1]!
      return zeile.slice(zeile.indexOf(' ')) === vorher.slice(vorher.indexOf(' '))
    })
    check(r, 'Kein Befund steht zweimal hintereinander', !doppelt, meta.seedLog.join(' / '))

    const ersteBefunde = [...meta.seedLog].join('|')
    meta.capsulesResolved = 0
    meta.capsulesTaken = 0
    meta.capsuleProgress = 0
    meta.seedLog = []
    seedingSystem(1000)
    check(
      r,
      'Gleicher Stand meldet dieselben Welten',
      meta.seedLog.join('|') === ersteBefunde,
      meta.seedLog[0] ?? '',
    )

    // Und irgendwann ist Schluss: mehr Meldungen als Kapseln gibt es nicht.
    seedingSystem(100000)
    check(
      r,
      'Nie mehr Meldungen als Kapseln',
      meta.capsulesResolved === meta.capsules,
      `${meta.capsulesResolved} von ${meta.capsules}`,
    )

    meta.finaleReached = false
    const vorherResolved = meta.capsulesResolved
    seedingSystem(1000)
    check(r, 'Ohne Aussaat rechnet nichts', meta.capsulesResolved === vorherResolved)

    /* --- Abwesenheit meldet sich nicht bei jedem Tab-Wechsel ---------------
       Auch das kam aus dem Durchklicken: ein Tab im Hintergrund schrieb alle
       sechs Sekunden „5s abwesend", und nach zehn Minuten bestand der ganze
       Log aus dieser Zeile. Angerechnet wird weiterhin ab fünf Sekunden —
       nur erzählt wird es erst, wenn es etwas zu erzählen gibt.
    --------------------------------------------------------------------- */
    check(r, 'Kurzes Wegsehen schreibt nichts in den Log', !reportsAbsence(6))
    check(r, 'Echte Abwesenheit meldet sich', reportsAbsence(3600))

    /* --- Erebos beginnt mit der falschen Atmosphäre (M15) ------------------
       Der ganze Planet steht und fällt mit seinem Startzustand. Wäre er leer,
       wäre es Nimbus mit anderen Zahlen — und die drei Gegenstücke, um die es
       geht, blieben Beiwerk wie überall sonst.
    --------------------------------------------------------------------- */
    freshRun()
    travelTo('erebos')
    check(
      r,
      'Erebos startet mit voller Luft',
      planet.pollution.gt(0) && planet.airN2.gt(0),
      `O₂ ${planet.airO2}, N₂ ${planet.airN2}, Dreck ${planet.pollution}`,
    )
    check(
      r,
      'Erebos startet außerhalb aller drei Fenster',
      pollutionPercent() > 1 && n2Percent() < 74 && o2Percent() < 19,
      `${o2Percent().toFixed(1)} / ${n2Percent().toFixed(1)} / ${pollutionPercent().toFixed(1)}`,
    )
    /*
     * Und die Reihenfolge, die den Planeten ausmacht: **erst waschen**. Ist
     * der Dreck weg, steht der Puffer über seinem Fenster — deshalb braucht
     * es danach das Ventil. Ohne diese Eigenschaft wäre der Wäscher der
     * einzige nötige Griff und der Planet eine Fingerübung.
     */
    /*
     * Und dieselbe Reihenfolge muss in der **Liste** stehen, nicht nur in der
     * Mechanik. Genau hier klaffte sie auseinander: der Hinweis oben schickte
     * zum Waschen, und der Wäscher war nicht da, weil `revealAt` gegen
     * `oxygenTotal` misst und das auf einem frisch betretenen Planeten bei
     * null steht. Gefunden beim Durchklicken — bis dahin ist Erebos nur
     * simuliert worden, und ein Simulant ruft orderGenerator() direkt auf.
     */
    const waescher = findGenerator('scrubber')!
    const ventil = findGenerator('vent')!
    check(r, 'Erebos zeigt den Wäscher ab der ersten Sekunde', isRevealed(waescher))
    check(r, 'Das Ventil wartet noch — erst waschen', !isRevealed(ventil))

    planet.pollution = new Decimal(0)
    check(
      r,
      'Nach der Wäsche steht der Puffer über dem Fenster',
      n2Percent() > 80,
      `N₂ ${n2Percent().toFixed(1)} %`,
    )
    check(r, 'Jetzt zeigt die Liste das Ventil', isRevealed(ventil))

    // Gegenprobe im Test selbst: anderswo tropft das Angebot weiter herein.
    freshRun()
    travelTo('vesta')
    check(r, 'Anderswo bleibt der Wäscher zunächst verborgen', !isRevealed(waescher))

    /* --- Wellen eskalieren nur, was überstanden ist (§1.2) -----------------
       Die Spirale, die Pyra unspielbar machte: Wellen wuchsen unabhängig vom
       Ausgang, eine verlorene Welle senkte die Produktion, mit der man die
       nächste bezahlen müsste. Gemessen war das eine Klippe — fünf Prozent
       Anoxendruck, Faktor zwei in der Dauer.
    --------------------------------------------------------------------- */
    freshRun()
    travelTo('pyra')
    planet.waveNumber = 5
    planet.wavePower = 1000
    planet.waveRemaining = 1
    planet.defenses = {}
    // Ohne Verteidigung läuft die Welle ab, statt abgewehrt zu werden.
    combatSystem(2)
    check(
      r,
      'Verlorene Welle eskaliert nicht',
      planet.waveNumber === 5,
      `Welle ${planet.waveNumber} statt 5`,
    )

    // Und die Gegenrichtung: abgewehrt wird sehr wohl eskaliert. Dafür
    // braucht es Türme — ohne Schaden endet eine Welle nur durch Ablauf.
    planet.defenses = { oxitower: 20 }
    planet.wavePower = 0.0001
    planet.waveRemaining = 60
    combatSystem(1)
    check(
      r,
      'Abgewehrte Welle eskaliert',
      planet.waveNumber === 6,
      `Welle ${planet.waveNumber} statt 6`,
    )

    /* --- Das Balancing-Werkzeug fasst den Spielstand nicht an --------------
       Dieselbe Gefahr wie beim Selbsttest, und in diesem Projekt schon
       zweimal eingetreten: ein Lauf, der den echten Stand überschreibt. Ein
       Werkzeug, das ganze Planeten durchspielt, ist die schlimmste denkbare
       Variante davon — es hinterließe eine fertig simulierte Kolonie.
    --------------------------------------------------------------------- */
    freshRun()
    planet.generators = { electrolysis: 7 }
    planet.airO2 = new Decimal(4711)
    /*
     * Verglichen wird der Zustand, nicht die Exportdatei: die trägt einen
     * Zeitstempel und unterscheidet sich deshalb immer von sich selbst.
     */
    const zustand = (): string =>
      JSON.stringify([planet.id, planet.generators, planet.airO2.toString(), planet.sites.length])
    const vorLauf = zustand()
    runPlanet('aurora', { maxMinuten: 1 })
    check(
      r,
      'Balancing-Lauf lässt den Spielstand unverändert',
      zustand() === vorLauf,
      `${vorLauf} → ${zustand()}`,
    )
    check(r, 'Balancing-Lauf hält die Speichersperre', isPersistenceSuspended())

    /* --- Zufriedenheit und Werkstatt (M14, §18) ---------------------------
       Zwei Fehler, die hier möglich sind und beim Lesen nicht auffallen: ein
       Bonus, der auch ohne Bewohner gilt, und ein Zuwachs, der die
       Zufriedenheit *nicht* verdünnt — dann wäre sie einmal gebaut und für
       immer voll, und das eingebaute Gegenstück wäre keins.
    --------------------------------------------------------------------- */
    freshRun()
    planet.settlers = new Decimal(10)
    planet.satiety = 1
    const handOhne = handFactor()
    check(r, 'Ohne Komfort ist die Handleistung unverändert', Math.abs(handOhne - 1) < 0.001, `${handOhne}`)

    /*
     * Zufriedenheit darf die Handleistung **nicht** anfassen. Sie tat es
     * einen halben Meilenstein lang, und das war die falsche Form: in einem
     * Spiel, dessen Ziel ein Fenster ist, ist ein Beschleuniger keine
     * Belohnung. Gemessen war Vesta mit verschenkter voller Zufriedenheit
     * gar nicht mehr abzuschließen (§18).
     */
    planet.generators = { commons: 5 }
    const handMit = handFactor()
    check(
      r,
      'Zufriedenheit lässt die Handleistung in Ruhe',
      Math.abs(handMit - handOhne) < 0.001,
      `${handOhne.toFixed(2)} → ${handMit.toFixed(2)}`,
    )

    /*
     * Stattdessen zahlt sie auf die Biomasse und damit auf die Genesis-Kerne.
     *
     * Beide Proben mit **derselben** Kopfzahl: `populationSystem` lässt die
     * Kolonie nebenbei wachsen, und ohne das Zurücksetzen misst man den
     * Zuwachs mit — der Faktor lag dadurch bei 2,02 statt 2,00.
     */
    planet.generators = {}
    planet.settlers = new Decimal(10)
    planet.biomass = new Decimal(0)
    populationSystem(10)
    const biomasseOhne = planet.biomass.toNumber()

    planet.generators = { commons: 5 }
    planet.settlers = new Decimal(10)
    planet.biomass = new Decimal(0)
    populationSystem(10)
    const biomasseMit = planet.biomass.toNumber()
    check(
      r,
      'Zufriedenheit hebt die Biomasse',
      biomasseMit > biomasseOhne * 1.01,
      `${biomasseOhne.toFixed(2)} → ${biomasseMit.toFixed(2)}`,
    )
    check(
      r,
      'Biomasse bleibt unter dem Doppelten',
      biomasseMit <= biomasseOhne * 2.0001,
      `Faktor ${(biomasseMit / biomasseOhne).toFixed(2)}`,
    )

    const zufriedenKlein = contentment()
    planet.settlers = new Decimal(60)
    check(
      r,
      'Zuwachs verdünnt die Zufriedenheit',
      contentment() < zufriedenKlein,
      `${zufriedenKlein.toFixed(2)} → ${contentment().toFixed(2)}`,
    )

    // Ein unbewohnter Planet hat keine zufriedenen Menschen, sondern keine.
    planet.settlers = new Decimal(0)
    check(r, 'Ohne Bewohner keine Zufriedenheit', contentment() === 0)

    /* Die Werkstatt: Material sofort weg, Ware erst durch Arbeit. */
    freshRun()
    run.materials = { holz: new Decimal(40) }
    const holzVorher = materialAmount('holz').toNumber()
    /*
     * Ein Rezept ohne jeden Eingang gehört nicht in die Liste. Sonst steht
     * die Werkstatt ab Sekunde eins auf Aurora und bietet Balken aus Holz an,
     * das es dort nicht gibt — dieselbe Klasse Anzeigefehler wie damals bei
     * `supply`, nur andersherum.
     */
    run.materials = {}
    check(r, 'Werkstatt zeigt nichts ohne Eingänge', availableGoods().length === 0)
    run.materials = { holz: new Decimal(40) }
    check(
      r,
      'Werkstatt zeigt das Rezept, dessen Eingang da ist',
      availableGoods().some((g) => g.id === 'balken'),
      availableGoods().map((g) => g.id).join(', '),
    )

    const wareBestellt = orderGood('balken', 3)
    check(r, 'Werkstatt nimmt die Bestellung an', wareBestellt)
    check(r, 'Werkstatt bucht Material sofort ab', materialAmount('holz').toNumber() < holzVorher)
    check(r, 'Ware liegt nicht sofort im Lager', materialAmount('balken').eq(0))
    check(r, 'Werkstattstück steht in derselben Reihe', planet.sites[0]?.art === 'ware')

    planet.settlers = new Decimal(6)
    planet.satiety = 1
    assignBuilder(3)
    for (let i = 0; i < 300; i++) constructionSystem(1)
    check(
      r,
      'Arbeit liefert die Ware',
      materialAmount('balken').eq(3),
      materialAmount('balken').toString(),
    )

    // Und der Abbruch gibt genau das zurück, was hineinging.
    freshRun()
    run.materials = { holz: new Decimal(40) }
    const vorAbbruch = materialAmount('holz').toNumber()
    orderGood('balken', 5)
    cancelSite(0)
    check(
      r,
      'Abbruch erstattet die Ware-Bestellung vollständig',
      Math.abs(materialAmount('holz').toNumber() - vorAbbruch) < 0.01,
      `${vorAbbruch} → ${materialAmount('holz').toNumber()}`,
    )

    /* Und durch den Save: eine Ware-Baustelle darf nicht zur Anlage werden. */
    freshRun()
    run.materials = { holz: new Decimal(40) }
    orderGood('balken', 2)
    const wareBlob = exportSave()
    freshRun()
    importSave(wareBlob)
    check(
      r,
      'Save erhält die Ware-Baustelle',
      planet.sites[0]?.art === 'ware' && planet.sites[0]?.id === 'balken',
      JSON.stringify(planet.sites[0] ?? null),
    )

    /* --- Bergung (M18, §20.2) ---------------------------------------------
       Der ganze Sinn steht und fällt mit einem Satz: **der Preis sind Hände.**
       Ein Trupp, der nicht aus der Arbeitsleistung verschwindet, ist ein
       Geschenk mit Wartezeit davor — und das wäre genau der Grind, den §20
       ausschließt.
    --------------------------------------------------------------------- */
    freshRun()
    travelTo('aurora')
    planet.oxygenTotal = new Decimal(1e6)
    planet.settlers = new Decimal(20)
    planet.satiety = 1
    run.materials = {}

    const landefaehre = findSalvage('lander')!
    check(r, 'Aurora hat ein Bergungsziel', revealedTargets().some((t) => t.id === 'lander'))

    const freiVorher = unassigned().toNumber()
    const losgeschickt = sendCrew('lander', 5)
    check(r, 'Trupp lässt sich losschicken', losgeschickt)
    check(
      r,
      'Ein Trupp bindet Hände',
      unassigned().toNumber() === freiVorher - 5,
      `${freiVorher} → ${unassigned().toNumber()}`,
    )
    check(r, 'Zweiter Trupp zum selben Ziel geht nicht', !sendCrew('lander', 5))

    // Vor der Rückkehr darf nichts im Lager liegen.
    salvageSystem(landefaehre.duration - 5)
    check(r, 'Unterwegs bringt der Trupp nichts', materialAmount('platten').eq(0))

    salvageSystem(30)
    check(r, 'Bergung liefert Material', materialAmount('platten').gt(0), materialAmount('platten').toString())
    check(
      r,
      'Der Trupp kommt zurück',
      unassigned().toNumber() === freiVorher,
      `${unassigned().toNumber()} statt ${freiVorher}`,
    )
    check(r, 'Der Anlauf ist gezählt', runsOn('lander') === 1)

    // Erschöpfung: derselbe Trupp bringt beim zweiten Mal weniger.
    const ersteBeute = materialAmount('platten').toNumber()
    check(r, 'Das Ziel ist erschöpft', depletionOf('lander') > 0, `${depletionOf('lander')}`)
    sendCrew('lander', 5)
    salvageSystem(landefaehre.duration + 1)
    const zweiteBeute = materialAmount('platten').toNumber() - ersteBeute
    check(
      r,
      'Ein zweiter Anlauf bringt weniger',
      zweiteBeute < ersteBeute,
      `${ersteBeute} → ${zweiteBeute}`,
    )

    // Und der Rückweg: das Ziel erholt sich, sonst wäre es eine Liste zum Abhaken.
    const leerVorher = depletionOf('lander')
    salvageSystem(600)
    check(
      r,
      'Ein erschöpftes Ziel erholt sich',
      depletionOf('lander') < leerVorher,
      `${leerVorher} → ${depletionOf('lander')}`,
    )

    // Ohne freie Leute kein Trupp — sonst stünden Zuweisung und Bergung
    // nebeneinander statt gegeneinander.
    freshRun()
    travelTo('aurora')
    planet.oxygenTotal = new Decimal(1e6)
    planet.settlers = new Decimal(2)
    check(r, 'Ohne freie Leute kein Trupp', !sendCrew('lander', 5))

    /*
     * **Was die Anzeige verspricht, muss sich losschicken lassen.**
     *
     * Gefunden beim Messen von §20 und beim Lesen des Codes unsichtbar: vier
     * Abzüge in `unassigned()` machen aus glatten 8 ein 7,9999999999999.
     * `lt(8)` vergleicht exakt und ist wahr, `toNumber()` und
     * `Decimal.floor()` runden beide auf 8 — also zeigt `formatInt()` „8 ohne
     * Aufgabe", und ein Trupp von 8 wird mit „zu wenige freie Bewohner"
     * abgelehnt. In einem einzigen Balancing-Lauf ist das 8704-mal passiert
     * und hat die Bergung dreiviertel der Zeit stillstehen lassen, ohne eine
     * Spur zu hinterlassen.
     *
     * Die Prüfung fragt deshalb nicht nach der internen Zahl, sondern nach
     * dem Versprechen: **die angezeigte Zahl ist eine gültige Truppgröße.**
     * Gegenprobe (Rundung in labor.ts entfernt) gesehen: rot.
     */
    freshRun()
    travelTo('aurora')
    planet.oxygenTotal = new Decimal(1e6)
    // Der Rechenrest, wie ihn vier Subtraktionen hinterlassen.
    planet.settlers = new Decimal(8).sub(new Decimal(1e-13))
    const gezeigt = Number(formatInt(unassigned()))
    check(r, 'Die Anzeige rundet acht freie Leute', gezeigt === 8, `${gezeigt}`)
    check(
      r,
      'Und genau acht lassen sich auch losschicken',
      salvageBlocker(findSalvage('lander')!, gezeigt) === null,
      `${salvageBlocker(findSalvage('lander')!, gezeigt)}`,
    )

    /*
     * Erebos führt kein eigenes Material (§19) — und genau deshalb ist die
     * Bergung dort die Rechtfertigung des ganzen Systems: sie ist der einzige
     * Weg, hier an Stoff zu kommen, ohne zu fliegen.
     */
    freshRun()
    travelTo('erebos')
    planet.oxygenTotal = new Decimal(1e6)
    planet.settlers = new Decimal(30)
    planet.satiety = 1
    run.materials = {}
    sendCrew('vorgaenger', 8)
    salvageSystem(findSalvage('vorgaenger')!.duration * 2 + 1)
    check(
      r,
      'Erebos liefert Material, das der Planet nicht führt',
      materialAmount('titan').gt(0),
      materialAmount('titan').toString(),
    )

    // Rückholung: die Hände müssen sofort wieder da sein, sonst ist ein
    // Trupp bei einer Hungersnot eine Sackgasse.
    freshRun()
    travelTo('aurora')
    planet.oxygenTotal = new Decimal(1e6)
    planet.settlers = new Decimal(20)
    const vorAbzug = unassigned().toNumber()
    sendCrew('lander', 6)
    recallCrew('lander')
    check(r, 'Abgezogene Leute sind sofort wieder da', unassigned().toNumber() === vorAbzug)
    check(r, 'Ein Abbruch zählt nicht als Anlauf', runsOn('lander') === 0)

    /* Und durch den Save: ein Trupp bleibt unterwegs. */
    freshRun()
    travelTo('aurora')
    planet.oxygenTotal = new Decimal(1e6)
    planet.settlers = new Decimal(20)
    sendCrew('lander', 4)
    const truppBlob = exportSave()
    freshRun()
    importSave(truppBlob)
    check(
      r,
      'Save erhält den laufenden Trupp',
      planet.expeditions[0]?.target === 'lander' && planet.expeditions[0]?.crew === 4,
      JSON.stringify(planet.expeditions[0] ?? null),
    )
    check(r, 'Ein gespeicherter Trupp bindet weiter Hände', crewAway() === 4)

    /* --- Baupläne (M20, §20.1) --------------------------------------------
       §20.1 verlangt die Sackgassenprüfung ausdrücklich als Pflicht, nicht
       als Hoffnung: „ist jeder Planet mit dem Startsatz plus allem, was bis
       dorthin erreichbar war, lösbar?" Vollständig beweisen kann das nur ein
       Balancing-Lauf — was hier steht, sind die Invarianten, ohne die er gar
       nicht erst laufen kann.
    --------------------------------------------------------------------- */
    freshRun()
    meta.blueprints = []

    check(
      r,
      'Jeder Bauplan hat eine Quelle',
      unreachableBlueprints().length === 0,
      unreachableBlueprints().join(', '),
    )

    /*
     * **Ein Gegenmittel bekommt nie ein Schloss.** Wäscher und Ventil sind die
     * Gegenstücke aus §1.2 — ohne sie ist Überschuss ein dauerhafter Schaden.
     * Auf Erebos beginnt der Planet mit 60 % Schadstoffen; wer dort erst
     * forschen müsste, bevor er waschen darf, steht vor einer Tür, die nur von
     * innen aufgeht.
     */
    const gegenmittel = GENERATORS.filter(
      (g) => g.output.kind === 'gas' && (g.output.gas === 'scrub' || g.output.gas === 'vent'),
    )
    check(
      r,
      'Gegenmittel brauchen keinen Bauplan',
      gegenmittel.every((g) => !g.needsBlueprint),
      gegenmittel.filter((g) => g.needsBlueprint).map((g) => g.id).join(', '),
    )

    /*
     * Und der Anfang jedes Planeten: ohne Bauplan muss überall mindestens ein
     * O₂-Erzeuger, eine Versorgung und — wo Menschen leben — ein Wohnraum
     * stehen. Sonst kommt man dort gar nicht erst in Gang.
     */
    const offeneSackgassen: string[] = []
    for (const def of PLANETS) {
      const offen = GENERATORS.filter((g) => isAvailable(g, def) && !g.needsBlueprint)
      const hatO2 = offen.some((g) => g.output.kind === 'gas' && g.output.gas === 'o2')
      const hatVersorgung = offen.some((g) => g.output.kind === 'supply')
      const hatWohnraum = offen.some((g) => g.output.kind === 'housing')
      if (!hatO2) offeneSackgassen.push(`${def.id}: kein O₂`)
      if (def.allowsPopulation && !hatVersorgung) offeneSackgassen.push(`${def.id}: keine Versorgung`)
      if (def.allowsPopulation && !hatWohnraum) offeneSackgassen.push(`${def.id}: kein Wohnraum`)
    }
    check(
      r,
      'Jeder Planet kommt ohne Bauplan in Gang',
      offeneSackgassen.length === 0,
      offeneSackgassen.join(' · '),
    )

    // Und das Schloss selbst: verschlossen heißt unsichtbar *und* unbaubar.
    const presse = findGenerator('press')!
    travelTo('aurora')
    planet.oxygenTotal = new Decimal(1e9)
    planet.oxygen = new Decimal(1e9)
    run.materials = { erz: new Decimal(1e6), eisen: new Decimal(1e6) }
    check(r, 'Ohne Bauplan nicht sichtbar', !isRevealed(presse))
    check(r, 'Ohne Bauplan nicht bestellbar', !orderGenerator('press', 1))
    check(r, 'Und der Grund steht dran', orderBlocker(presse, 1) === 'Bauplan fehlt')

    grantBlueprint('press', 'Prüfung.')
    check(r, 'Mit Bauplan sichtbar', isRevealed(presse))
    check(r, 'Mit Bauplan bestellbar', orderGenerator('press', 1))

    /*
     * Baupläne überleben den Durchlauf-Reset. Sie liegen in `meta`, weil ein
     * Neuanfang, der Wissen zurücknimmt, eine Strafe wäre (§1.2).
     */
    const blob20 = exportSave()
    meta.blueprints = []
    importSave(blob20)
    check(r, 'Save erhält die Baupläne', knowsBlueprint('press'))

    // Und die drei Quellen tragen wirklich ein.
    freshRun()
    meta.blueprints = []
    meta.research = new Decimal(1e6)
    buyResearch('ind-cost')
    check(r, 'Forschung gibt ihren Bauplan heraus', knowsBlueprint('press'))

    freshRun()
    meta.blueprints = []
    travelTo('aurora')
    planet.oxygenTotal = new Decimal(1e6)
    planet.settlers = new Decimal(20)
    sendCrew('lander', 5)
    salvageSystem(findSalvage('lander')!.duration * 2 + 1)
    check(r, 'Bergung gibt ihren Bauplan heraus', knowsBlueprint('depot'))

    /* --- Bauwerke (M19, §20.3) --------------------------------------------
       Das erste Ding im Spiel, von dem es genau eines gibt. Geprüft wird die
       Kette: bestellen legt eine Baustelle an, Arbeit hebt die Etappe, und
       erst die letzte Etappe schaltet die Wirkung frei.
    --------------------------------------------------------------------- */
    freshRun()
    travelTo('aurora')
    planet.settlers = new Decimal(30)
    planet.satiety = 1
    run.materials = {}

    check(r, 'Aurora hat ein Bauwerk', landmarkHere()?.id === 'wetterturm')
    check(r, 'Erebos hat keines', landmarkFor('erebos') === undefined)
    check(r, 'Ohne Material keine Etappe', !canOrderStage())

    run.materials = {
      stein: new Decimal(1000),
      platten: new Decimal(1000),
      titan: new Decimal(1000),
      balken: new Decimal(1000),
      werkzeug: new Decimal(1000),
      fundstueck: new Decimal(50),
    }
    const steinVorEtappe = materialAmount('stein').toNumber()
    check(r, 'Mit Material geht die Etappe', orderStage())
    check(r, 'Etappe bucht Material sofort ab', materialAmount('stein').toNumber() < steinVorEtappe)
    check(r, 'Etappe steht in derselben Reihe', planet.sites[0]?.art === 'bauwerk')
    check(r, 'Etappe steht nicht sofort fertig da', stagesDone() === 0)
    check(r, 'Zweite Etappe geht nicht parallel', !canOrderStage())

    assignBuilder(20)
    for (let i = 0; i < 900; i++) constructionSystem(1)
    check(r, 'Arbeit hebt die Etappe', stagesDone() === 1, `${stagesDone()}`)

    /*
     * Die Wirkung darf erst mit der **letzten** Etappe kommen. Ein Bauwerk,
     * das nach dem Fundament schon hilft, ist kein Ziel mehr, sondern ein
     * Kauf mit Extraschritten.
     */
    check(r, 'Eine halbe Etappe wirkt nicht', !landmarkEffects().stabilityHold)
    for (let stufe = 0; stufe < 3; stufe++) {
      orderStage()
      for (let i = 0; i < 2000; i++) constructionSystem(1)
    }
    check(r, 'Vier Etappen machen das Bauwerk fertig', landmarkDone(), `${stagesDone()}`)
    check(r, 'Erst das fertige Bauwerk wirkt', landmarkEffects().stabilityHold)

    /*
     * Und die Wirkung selbst: der Timer hält, statt auf null zu fallen. Das
     * ist die ganze Zusage des Wetterturms.
     */
    planet.stability = 42
    planet.airO2 = new Decimal(0)
    atmosphereSystem(1)
    check(r, 'Der Wetterturm hält den Timer', planet.stability === 42, `${planet.stability}`)

    // Gegenprobe innerhalb des Tests: ohne Bauwerk fällt er.
    planet.landmarkStage = 0
    planet.stability = 42
    atmosphereSystem(1)
    check(r, 'Ohne Bauwerk fällt der Timer', planet.stability === 0, `${planet.stability}`)

    /*
     * **Ortsgebunden heißt ortsgebunden.** Der Wetterturm steht auf Aurora
     * und hilft auf Kryo nicht — dieselbe Verwechslung „Eigenschaft des
     * aktiven Planeten statt des Durchlaufs" hat in diesem Projekt schon die
     * Sternenkarte und die Anlagenliste gekostet, nur andersherum.
     */
    planet.landmarkStage = 4
    travelTo('kryo')
    /*
     * **Kryos Bauwerk wird ebenfalls fertig gesetzt**, und das ist der ganze
     * Trick dieser Prüfung. Ohne diese Zeile ist sie wertlos: auf Kryo stünde
     * `landmarkStage` auf 0, der Wetterturm fiele schon an der Stufenprüfung
     * durch, und die Gegenprobe (Planetenvergleich ausbauen) bliebe grün.
     * Genau so ist sie beim ersten Versuch durchgerutscht. Mit fertiger
     * Zisterne trennt sie sauber: die Wirkung *dieses* Planeten gilt, die des
     * anderen nicht.
     */
    planet.landmarkStage = 4
    check(r, 'Ein ortsgebundenes Bauwerk wirkt nicht von fern', !landmarkEffects().stabilityHold)
    check(r, 'Das Bauwerk dieses Planeten wirkt sehr wohl', landmarkEffects().satietyFloor > 0)

    /*
     * Der Fahrstuhl dagegen **muss** von fern wirken: das Lager gehört seit
     * §16 dem ganzen Durchlauf. Er steht auf Nimbus, gemessen wird auf Kryo.
     */
    const lagerVorher = materialCapacity().toNumber()
    travelTo('nimbus')
    planet.landmarkStage = 4
    travelTo('kryo')
    check(
      r,
      'Der Fahrstuhl wirkt aus der Ferne',
      materialCapacity().toNumber() > lagerVorher,
      `${lagerVorher} → ${materialCapacity().toNumber()}`,
    )

    /* Und durch den Save: die Etappenzahl muss zurückkommen. */
    freshRun()
    travelTo('aurora')
    planet.landmarkStage = 2
    const bauBlob = exportSave()
    freshRun()
    importSave(bauBlob)
    check(r, 'Save erhält die Etappenzahl', planet.landmarkStage === 2, `${planet.landmarkStage}`)

    /* --- Das Lager ist endlich (M11, §17) ---------------------------------
       Ohne Grenze war Abbau nur eine Frage der Zeit. Mit Grenze muss der
       Überschuss wirklich verfallen — und Hallen müssen wirklich helfen.
    --------------------------------------------------------------------- */
    freshRun()
    travelTo('vesta')
    run.materials = {}
    const grenze = materialCapacity().toNumber()
    storeMaterial('stein', new Decimal(grenze * 10))
    check(
      r,
      'Lager läuft nicht über die Grenze',
      Math.abs(materialAmount('stein').toNumber() - grenze) < 0.01,
      `${materialAmount('stein').toNumber()} statt ${grenze}`,
    )
    check(r, 'Volles Lager meldet sich als voll', isStorageFull('stein'))

    planet.generators = { depot: 2 }
    const grenzeMitHalle = materialCapacity().toNumber()
    check(
      r,
      'Lagerhalle hebt die Grenze',
      grenzeMitHalle > grenze,
      `${grenze} → ${grenzeMitHalle}`,
    )
    check(r, 'Nach dem Ausbau ist wieder Platz', !isStorageFull('stein'))

    // Und die andere Richtung: ein volles Regal darf nie kleiner machen, was
    // schon drinliegt. Sonst würde ein Abriss Material vernichten (§1.2).
    planet.generators = {}
    const drinnen = materialAmount('stein').toNumber()
    storeMaterial('stein', new Decimal(1e6))
    check(
      r,
      'Volles Lager vernichtet nicht, was schon liegt',
      materialAmount('stein').toNumber() >= drinnen,
      `${drinnen} → ${materialAmount('stein').toNumber()}`,
    )

    /* --- Achievements ----------------------------------------------------
       Sie müssen sich auslösen *und* wirken. Ein Erfolg ohne Effekt wäre
       genau die Vitrine, die §10 nicht will.
    --------------------------------------------------------------------- */
    freshRun()
    meta.achievements = []
    meta.stats.totalClicks = 5000
    const vorherKlick = clickGain().toNumber()
    achievementsSystem(1)
    check(r, 'Achievement löst bei erfüllter Bedingung aus', meta.achievements.includes('handwork'))
    const nachherKlick = clickGain().toNumber()
    check(
      r,
      'Achievement-Bonus wirkt wirklich',
      nachherKlick > vorherKlick,
      `Klick ${vorherKlick} → ${nachherKlick}`,
    )

    // Und nicht doppelt: ein zweiter Durchlauf darf nichts hinzufügen.
    const anzahl = meta.achievements.length
    achievementsSystem(1)
    check(r, 'Achievements lösen nicht doppelt aus', meta.achievements.length === anzahl)

    meta.stats.totalClicks = 0
    meta.achievements = []

    /* --- Ton --------------------------------------------------------------
       Getestet wird nicht, wie es klingt, sondern dass es nichts kaputt macht:
       kein Absturz ohne Audiokontext, jede id vorhanden, Lautstärke begrenzt.
    --------------------------------------------------------------------- */
    const soundIds = [
      'click', 'buy', 'upgrade', 'research', 'achievement',
      'complete', 'travel', 'rocket', 'wave', 'ability', 'fire',
    ] as const
    const fehlende = soundIds.filter((id) => !findSound(id))
    check(r, 'Alle benutzten Klänge sind definiert', fehlende.length === 0, fehlende.join(', '))

    let krachte = false
    try {
      // Ohne freigeschalteten Kontext darf play() einfach nichts tun.
      for (const id of soundIds) play(id)
      settings.soundEnabled = false
      for (const id of soundIds) play(id)
      settings.soundEnabled = true
    } catch {
      krachte = true
    }
    check(r, 'Ton ohne Audiokontext stürzt nicht ab', !krachte)

    settings.soundVolume = 5
    deserializeSettings(serializeSettings())
    check(r, 'Lautstärke wird auf 0…1 begrenzt', settings.soundVolume <= 1)
    settings.soundVolume = 0.35

    /* --- Verarbeitung (M12) ----------------------------------------------
       Die neue Fehlerklasse: eine Anlage, die etwas *verbraucht*. Drei Wege,
       das falsch zu machen — produzieren ohne Eingang, das Verhältnis
       verrutschen lassen, und Eingang fressen, obwohl der Ausgang keinen
       Platz mehr hat. Alle drei sind absichtlich eingebaut und rot gesehen
       worden, bevor sie hier stehen.
    --------------------------------------------------------------------- */
    freshRun()
    planet.settlers = new Decimal(20)
    planet.satiety = 1
    planet.generators = { press: 1 }
    assign('press', 2)

    run.materials = {}
    craftingSystem(10)
    check(
      r,
      'Verarbeitung ohne Eingang liefert nichts',
      materialAmount('platten').lte(0),
      `platten=${materialAmount('platten').toString()}`,
    )
    check(r, 'Der Grund für den Stillstand wird benannt', craftBlocker(findGenerator('press')!) !== null)

    // Gegenprobe zur Zeile davor: mit Eisen im Lager muss dieselbe Presse
    // liefern. Ohne diese Prüfung wäre „liefert nichts" auch dann grün, wenn
    // die Verarbeitung überhaupt nicht läuft.
    run.materials = { eisen: new Decimal(100) }
    craftingSystem(1)
    const gewalzt = materialAmount('platten')
    check(r, 'Mit Eingang läuft dieselbe Anlage an', gewalzt.gt(0), `platten=${gewalzt.toString()}`)

    /*
     * Erhaltung: das Rezept ist 2 Eisen → 1 Platte, also muss exakt das
     * Doppelte des Ausgangs verschwunden sein. Ein Rundungsfehler hier wäre
     * eine stille Materialquelle oder -senke.
     */
    const eisenWeg = new Decimal(100).sub(materialAmount('eisen'))
    check(
      r,
      'Rezept verbraucht genau das Zweifache',
      eisenWeg.sub(gewalzt.mul(2)).abs().lt(0.0001),
      `eisen weg=${eisenWeg.toString()}, platten=${gewalzt.toString()}`,
    )

    /*
     * Der eigentliche Fund: volles Ausgangslager darf keinen Eingang mehr
     * verbrauchen. Andersherum verschwindet Eisen in einer Presse, deren
     * Platten ohnehin verfallen — ein dauerhafter, unsichtbarer Verlust und
     * damit derselbe Schaden, gegen den M11 die Lagergrenze *nur* den
     * Nachschub stoppen ließ (§1.2).
     */
    run.materials = { eisen: new Decimal(100), platten: materialCapacity() }
    craftingSystem(5)
    check(
      r,
      'Volles Ausgangslager verbraucht keinen Eingang',
      materialAmount('eisen').eq(100),
      `eisen=${materialAmount('eisen').toString()}`,
    )
    check(r, 'Volles Lager wird als Grund gemeldet', craftBlocker(findGenerator('press')!) !== null)

    /*
     * Die Kette muss in *einem* Tick durchlaufen. Läuft die Verarbeitung vor
     * der Förderung, hinkt jede Stufe einen Tick hinterher — bei drei
     * Gliedern also drei. Genau deshalb steht `verarbeitung` in main.ts
     * hinter `produktion`.
     */
    freshRun()
    planet.settlers = new Decimal(30)
    planet.satiety = 1
    planet.generators = { oremine: 4, smelter: 2, press: 1 }
    assign('oremine', 8)
    assign('smelter', 4)
    assign('press', 2)
    run.materials = {}
    productionSystem(1)
    craftingSystem(1)
    check(
      r,
      'Die Kette liefert im selben Tick bis zur letzten Stufe',
      materialAmount('platten').gt(0),
      `erz=${materialAmount('erz').toString()}, eisen=${materialAmount('eisen').toString()}`,
    )

    /* --- Hände wirken auf die Atmosphäre (M13, §17) -----------------------
       Bis M12 bestand die O₂-Seite von Aurora ausschließlich aus Apparaten,
       und Bevölkerung war für die Atmosphäre ein reiner Verlust. Das
       Flechtenfeld dreht das um — aber nur, solange es auch besetzt ist.
       Diese Prüfung hält beides fest: dass es ohne Hände nichts liefert, und
       dass es mit Händen mehr liefert als der Atem der Leute kostet.
    --------------------------------------------------------------------- */
    freshRun()
    planet.settlers = new Decimal(12)
    planet.satiety = 1
    planet.generators = { lichen: 2 }
    const ohneHaende = currentO2Rate()
    check(
      r,
      'Flechtenfeld ohne Zuweisung liefert nichts',
      ohneHaende.lte(0),
      `rate=${ohneHaende.toString()}`,
    )

    assign('lichen', 4)
    const mitHaenden = currentO2Rate()
    check(r, 'Mit Zuweisung liefert es O₂', mitHaenden.gt(0), `rate=${mitHaenden.toString()}`)
    check(
      r,
      'Zugewiesene Hände bringen mehr O₂ als ihr Atem kostet',
      mitHaenden.gt(o2ConsumptionRate()),
      `feld=${mitHaenden.toString()}, atem=${o2ConsumptionRate().toString()}`,
    )

    /* --- Die Rakete kostet kein O₂ mehr (M12, §17) ----------------------- */
    freshRun()
    planet.oxygen = new Decimal(1e9)
    run.materials = {}
    check(r, 'Rakete lässt sich nicht aus O₂ allein bauen', !buildRocket())

    run.materials = { platten: new Decimal(400) }
    planet.oxygen = new Decimal(0)
    check(r, 'Rakete entsteht aus Metallplatten ohne jedes O₂', buildRocket())

    /* --- Atmosphäre bleibt endlich -------------------------------------- */
    freshRun()
    travelTo('vesta')
    planet.generators = { electrolysis: 100, sublimator: 50 }
    for (let i = 0; i < 300; i++) {
      productionSystem(1)
      atmosphereSystem(1)
    }
    const summe = n2Percent() + (planet.airO2.gt(0) ? 1 : 0)
    check(r, 'Atmosphärenwerte bleiben endlich', Number.isFinite(summe) && !Number.isNaN(summe))
    check(r, 'Kein negatives Luft-O₂', planet.airO2.gte(0))
    check(r, 'Keine negativen Schadstoffe', planet.pollution.gte(0))
    check(r, 'Keine negative Bevölkerung', planet.settlers.gte(0))
  } finally {
    restore(sicherung)
    // Nur freigeben, wenn der Test die Sperre selbst gesetzt hat. Wer mitten
    // in einer Balancing-Simulation testet, will danach weiterhin nicht
    // gespeichert haben.
    if (!warGesperrt) resumePersistence()
  }

  const fehlgeschlagen = r.filter((x) => !x.ok)
  // Ausgabe bewusst über console: der Test ist ein Werkzeug für die Konsole.
  for (const x of r) {
    if (x.ok) console.log(`  ok   ${x.name}`)
    else console.error(`  FEHL ${x.name}${x.detail ? ` — ${x.detail}` : ''}`)
  }
  console.log(
    `${r.length - fehlgeschlagen.length} von ${r.length} bestanden` +
      (fehlgeschlagen.length ? `, ${fehlgeschlagen.length} fehlgeschlagen` : ''),
  )

  return {
    bestanden: r.length - fehlgeschlagen.length,
    fehlgeschlagen: fehlgeschlagen.length,
    ergebnisse: r,
  }
}
