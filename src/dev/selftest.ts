import Decimal from 'break_infinity.js'
import { GENERATORS } from '../data/generators'
import { AURORA, PLANETS } from '../data/planets'
import { ROCKETS } from '../data/rockets'
import { findSound } from '../data/sounds'
import { play } from '../engine/audio'
import { exportSave, importSave } from '../engine/save'
import { deserializeSettings, serializeSettings, settings } from '../state/settings.svelte'
import { deserializePlanet, planet, resetPlanet, serializePlanet } from '../state/planet.svelte'
import { run } from '../state/run.svelte'
import { atmosphereSystem, n2Percent } from '../systems/atmosphere'
import { meta } from '../state/meta.svelte'
import { achievementsSystem } from '../systems/achievements'
import { combatSystem } from '../systems/combat'
import { clickGain, currentO2Rate, isAvailable, productionSystem } from '../systems/production'
import { buildRocket, travelTo } from '../systems/travel'

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
