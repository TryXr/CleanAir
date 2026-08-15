import Decimal from 'break_infinity.js'
import { GENERATORS, type GeneratorDef } from '../data/generators'
import { MATERIALS } from '../data/materials'
import { AURORA, PLANETS, type PlanetDef } from '../data/planets'
import { runStep, stopLoop } from '../engine/loop'
import {
  exportSave,
  importSave,
  isPersistenceSuspended,
  resumePersistence,
  suspendPersistence,
} from '../engine/save'
import { meta } from '../state/meta.svelte'
import { planet, resetPlanet } from '../state/planet.svelte'
import { run } from '../state/run.svelte'
import { o2Percent, n2Percent, pollutionPercent } from '../systems/atmosphere'
import { orderGenerator } from '../systems/construction'
import { contentment } from '../systems/contentment'
import { reseedEvents } from '../systems/events'
import { assignBuilder, canAssign, canAssignBuilder, handFactor, unassigned } from '../systems/labor'
import { housingCapacity } from '../systems/population'
import { assign } from '../systems/labor'
import { isAvailable, maxAffordable, releaseOxygen } from '../systems/production'
import { travelTo } from '../systems/travel'

/**
 * Balancing-Werkzeug (DESIGN.md §13).
 *
 * Warum es das gibt: bis M14 wurde für jede Balancing-Frage eine neue
 * Heuristik in die Konsole getippt. Der Messversuch zur Obergrenze aus §18
 * ist daran gescheitert — zwei Läufe derselben Frage gaben 37,6 und „steckt
 * fest", weil eine Kleinigkeit an der Kaufregel anders war. Gemessen wurde
 * das Rauschen der Heuristik, nicht die Änderung am Spiel.
 *
 * Drei Dinge macht dieses Werkzeug deshalb anders:
 *
 * 1. **Es fährt die echten Systeme in der echten Reihenfolge** (runStep aus
 *    loop.ts). Der alte Versuch hatte Bau und Bevölkerung vertauscht und
 *    Ereignisse gar nicht — er maß ein anderes Spiel.
 * 2. **Es ist reproduzierbar.** Ereignisse bekommen einen festen Startwert,
 *    zwei Varianten sehen also dieselben Stürme.
 * 3. **Es fasst den Spielstand nicht an.** Wie der Selbsttest sichert es
 *    vorher und stellt danach wieder her — und sperrt währenddessen das
 *    Speichern. Genau hier sind in diesem Projekt schon zwei Stände
 *    gestorben (CLAUDE.md).
 *
 * Aufruf in der Konsole:
 *
 *     cleanair.balance.run('vesta')          // ein Planet
 *     cleanair.balance.all()                 // alle fünf, als Tabelle
 *     cleanair.balance.compare('nimbus')     // mit und ohne Komfort
 *
 * **Was der simulierte Spieler kann — und was nicht.** Aurora schafft er in
 * 19,9 min (§13 will 15–25). Auf **Vesta, Pyra und Kryo scheitert er**.
 *
 * Wichtig für die Einordnung: er startet **ohne jeden Fortschritt** — keine
 * Forschung, keine Meta-Upgrades, keine Achievements. Die Zahlen in §13
 * stammen aus Läufen, die diese Boni hatten, und sind deshalb nicht direkt
 * vergleichbar. Ein Vesta-Lauf, gemessen mit stehengebliebenen Achievements
 * aus einem gespielten Tab, ergab 38,6 min; derselbe Aufruf mit sauberer
 * Meta-Ebene schließt nicht ab und steht bei 23,0 % O₂ fest. Was davon der
 * Planet ist und was der Regler, ist offen — beides ist plausibel.
 *
 * Auf Pyra kommt die eigene Industrie dazu: er baut O₂-Anlagen, bis der
 * Anteil stimmt, und der Anteil stimmt auf einem schmutzigen Planeten nie,
 * weil die Schadstoffe im Nenner mitwachsen — eine Rückkopplung, die nicht
 * konvergiert.
 *
 * Das ist ausdrücklich **kein Beleg, dass Pyra unbalanciert ist**: M13 hat
 * ihn bei 82,7 min gemessen, eine Strategie existiert also. Sie ist nur
 * planetenspezifisch, und dieser Regler kennt sie nicht. Wer sie einbaut,
 * schreibe sie hierher und nicht in eine neue Konsolenzeile — der ganze
 * Zweck dieser Datei ist, dass die nächste Frage nicht wieder bei null
 * anfängt.
 *
 * ### Was ein zweiter Anlauf auf Pyra ergeben hat
 *
 * Vier Regeln ausprobiert und alle wieder ausgebaut, weil jede einen anderen
 * Planeten kaputtmachte. Die Befunde sind trotzdem gültig und ersparen dem
 * nächsten Versuch die Sackgassen:
 *
 * - **Die Formel steht in der Mechanik.** Dreck entsteht absolut
 *   (`o2Rate × pollutionPerO2`), Wäscher entfernen anteilig. Im
 *   Gleichgewicht ist der Bestand `o2Rate × pollutionPerO2 / scrubRate`. Wer
 *   die nötige Waschleistung daraus ausrechnet statt auf den Pegel zu
 *   reagieren, drückt Pyra von 91 % auf 4 % Schadstoffe und von 0 auf 153
 *   Bewohner. Der Pegel ist die Folge und hinkt Minuten hinterher.
 * - **Der Riegel „erst waschen, dann bauen" braucht einen Kaltstart.** Ohne
 *   Waschleistung ist die Bedingung nie erfüllt, also wird nie der erste
 *   Elektrolyseur gebaut: Vesta blieb bei 0 % O₂ und 95,2 % N₂ stehen.
 * - **Über dem O₂-Fenster schließt sich eine Falle.** Es brennt, der Abbrand
 *   drosselt die Produktion, ohne Produktion fehlt das O₂ für den Puffer,
 *   ohne Puffer sinkt der Anteil nie wieder. Gemessen: Pyra bei 23,8 % O₂,
 *   Guthaben 2476, Warteschlange leer — Stillstand. Auf die Untergrenze zu
 *   zielen ist aber genauso falsch, dann fällt Vesta bei jedem Ausschlag
 *   heraus.
 * - **In Blöcken zu bestellen ruiniert die Kasse.** Fünf Sublimatoren am
 *   Stück, danach kein bezahlbarer Elektrolyseur mehr.
 */

export interface BalanceOptions {
  /** Klicks pro Sekunde. Ohne Klicks kommt niemand an den ersten Generator. */
  clicks?: number
  /** Baut der simulierte Spieler Zufriedenheits-Anlagen? */
  komfort?: boolean
  /** Wie viel Material er mitbringt. Ohne Fracht ist Pyra unlösbar (§16). */
  fracht?: number
  /** Abbruch nach so vielen Spielminuten. */
  maxMinuten?: number
  /**
   * Sekunden pro Schritt.
   *
   * **Nur 1 liefert belastbare Zahlen.** Größere Schritte sind nicht bloß
   * ungenauer, sie ändern das Ergebnis qualitativ: zwischen zwei
   * Entscheidungen läuft der Atmosphärenwert weiter, und ein Planet mit
   * Fenster schießt darüber hinaus. Gemessen — Vesta schließt mit `schritt:
   * 1` in 38,6 min ab und mit `schritt: 2` **gar nicht**, bei sonst
   * identischen Bedingungen.
   *
   * Gröber ist also nur für einen schnellen Blick auf einen langen Planeten
   * brauchbar, und das Ergebnis trägt dann `grob: true`.
   */
  schritt?: number
  /** Startwert für die Ereignisse. Gleicher Wert = gleiche Stürme. */
  seed?: string
}

export interface BalanceResult {
  planet: string
  /** Minuten bis `completed`, oder null wenn nicht erreicht. */
  minuten: number | null
  /** Minuten bis die Rakete stand, oder null. */
  rakete: number | null
  o2: number
  n2: number
  schadstoffe: number
  bewohner: number
  zufriedenheit: number
  handleistung: number
  /** Was am Ende stand — die Diagnose bei einem Lauf, der nicht fertig wird. */
  anlagen: Record<string, number>
  /**
   * O₂-Guthaben und offene Bestellungen am Ende.
   *
   * Die zwei Zahlen, an denen man einen steckengebliebenen Lauf erkennt:
   * leeres Guthaben heißt „konnte nichts mehr kaufen", eine volle Reihe
   * heißt „konnte nicht mehr bauen". Ohne sie rät man, warum nichts passiert
   * ist — und rät dann an der falschen Stelle weiter.
   */
  guthaben: number
  warteschlange: number
  /** Mit Schrittweite > 1 gemessen und damit **nicht** belastbar. */
  grob: boolean
}

const STANDARD: Required<BalanceOptions> = {
  clicks: 1,
  komfort: false,
  fracht: 50000,
  maxMinuten: 300,
  schritt: 1,
  seed: 'balance',
}

/**
 * Der simulierte Spieler.
 *
 * Bewusst schlicht und an einer Stelle: er zielt auf die **Mitte** des
 * Fensters statt an seinen Rand. Am Rand pendelt jeder Wert, und der
 * Stabilitäts-Timer setzt bei jedem Ausschlag zurück — was dann wie ein
 * unbalancierbarer Planet aussieht, ist eine schlechte Heuristik (M13,
 * Nimbus).
 */
function entscheiden(def: PlanetDef, opts: Required<BalanceOptions>): void {
  const leute = planet.settlers.toNumber()
  const o2 = o2Percent()
  const n2 = n2Percent()

  const offen = (id: string): number =>
    planet.sites.filter((s) => s.id === id).reduce((a, s) => a + s.remaining, 0)
  const steht = (id: string): number => (planet.generators[id] ?? 0) + offen(id)

  /*
   * Nur nachbestellen, wenn von der Sorte nichts mehr in der Reihe steht.
   * Ohne diese Bremse schießt die Warteschlange über das Fenster hinaus, und
   * zu viel O₂ lässt sich nicht abbauen, nur verdünnen (§4).
   */
  /**
   * Bestellt, wenn von dieser Sorte nichts mehr in der Reihe steht.
   *
   * Die Menge hängt am Abstand zum Ziel — ein Mensch klickt „Max", wenn ihm
   * dreißig Prozentpunkte fehlen, und einzeln, wenn er kurz davor steht.
   * Einzeln zu bestellen ist nicht die vorsichtige Variante, sondern eine
   * andere Messung: Vesta brauchte damit 71,4 statt 41,9 min, weil die
   * Bauschlange und nicht der Planet die Grenze war.
   */
  const kaufen = (g: GeneratorDef, mindestens = 0): void => {
    if (offen(g.id) > 0) return
    if (mindestens > 0) {
      orderGenerator(g.id, Math.min(mindestens, Math.max(1, maxAffordable(g))))
      return
    }
    /*
     * Die Menge hängt am Guthaben, nicht am Abstand zum Ziel.
     *
     * Beides ausprobiert: nach Abstand zu bestellen heißt, auf Aurora in der
     * ersten Minute zehn Prozessoren zu ordern und danach nichts mehr — der
     * Lauf kam auf 3,6 % statt 19. Ein Viertel dessen, was man sich leisten
     * könnte, hält den Nachschub in Gang und lässt trotzdem Geld für die
     * nächste Stufe übrig.
     */
    const menge = Math.max(1, Math.min(4, Math.floor(maxAffordable(g) / 4)))
    orderGenerator(g.id, menge)
  }

  const da = GENERATORS.filter((g) => isAvailable(g))
  const gas = (art: string): GeneratorDef[] =>
    da.filter((g) => g.output.kind === 'gas' && g.output.gas === art)

  // Erst leben, dann wachsen: Versorgung und Wohnraum vor allem anderen.
  for (const g of da) {
    if (g.output.kind === 'supply' && steht(g.id) < Math.ceil(leute / 3) + 1) kaufen(g)
    if (g.output.kind === 'housing' && leute >= housingCapacity().toNumber() - 2) kaufen(g)
    if (opts.komfort && g.output.kind === 'amenity' && steht(g.id) * g.baseRate < leute * 3) {
      kaufen(g)
    }
  }

  const o2Ziel = (def.o2Window.min + Math.min(def.o2Window.max, def.o2Window.min + 4)) / 2

  /*
   * Die eigene Industrie erstickt einen (Pyra, §11).
   *
   * Ohne diese Rückkopplung baut der Simulant munter weiter O₂-Anlagen, die
   * ihrerseits Schadstoffe machen, und keine Zahl Wäscher kommt hinterher:
   * gemessen 82,6 % Schadstoffe nach 200 Minuten, dadurch 4,1 % O₂, dadurch
   * **null Bewohner** — und ohne Hände läuft die Aschewäsche nicht, die
   * genau dagegen gebaut ist. Der Planet war nicht unlösbar, der Spieler war
   * es.
   *
   * Die Schwelle ist bewusst das **Doppelte** des Fensters und nicht das
   * Fenster selbst: bei „schon über der Grenze" sperrt sich der Simulant
   * selbst aus. Gemessen auf Kryo — 2,41 % Schadstoffe bei erlaubtem 1 %
   * blockierten den O₂-Bau dauerhaft, der Planet blieb bei 16,9 % O₂ stehen,
   * obwohl er nur hätte weiterwaschen müssen.
   */
  const erstickt = def.maxPollution !== undefined && pollutionPercent() > def.maxPollution * 2

  if (!def.n2Window) {
    // Ohne Fenster nach oben gibt es nichts abzuwägen: O₂, bis es reicht.
    if (o2 < o2Ziel) for (const g of gas('o2')) kaufen(g)
  } else {
    /*
     * **Der Puffer führt.** Ein Planet mit Fenster braucht rund viermal so
     * viel N₂ wie O₂ (74–80 % gegen 19–23 %), und zu viel O₂ lässt sich
     * nicht abbauen, nur verdünnen (§4). Wer beide unabhängig auf ihr Ziel
     * regelt, läuft mit dem O₂ voraus und steht dann bei 23,0 % fest —
     * gemessen auf Vesta, bevor diese Zeile hier stand.
     *
     * Also: O₂ nur nachlegen, wenn der Puffer nicht hinterherhinkt.
     */
    const n2Ziel = (def.n2Window.min + def.n2Window.max) / 2

    /*
     * O₂ darf nur so weit vorlaufen, wie der Puffer schon steht.
     *
     * Nicht „erst Puffer, dann O₂": das serialisiert zwei Aufbauten, die
     * nebeneinander laufen müssen, und kostete auf Vesta 30 Minuten (71,4
     * statt 41,9). Sondern anteilig — steht der Puffer bei der Hälfte, darf
     * auch O₂ bei der Hälfte stehen. Das eine Prozent Zugabe verhindert eine
     * Klemme am Anfang, wenn beide bei null stehen.
     */
    const erlaubtesO2 = (n2 / n2Ziel) * o2Ziel + 1

    if (n2 < n2Ziel || o2 > def.o2Window.max - 1) {
      for (const g of gas('n2')) kaufen(g)
    }
    if (!erstickt && o2 < Math.min(o2Ziel, erlaubtesO2)) for (const g of gas('o2')) kaufen(g)
    if (n2 > n2Ziel + 1.5) for (const g of gas('vent')) kaufen(g)
  }

  /*
   * Wäscher wachsen **mit** der Industrie, nicht hinterher.
   *
   * Wäscher arbeiten anteilig, die Quelle liefert absolut nach — wer erst
   * wäscht, wenn der Wert steht, wäscht gegen einen Bestand an, der weiter
   * wächst. Gemessen mit der Nachher-Regel: Pyra bei 69,8 % Schadstoffen
   * nach 200 Minuten und dauerhaft steckengeblieben. Die Faustregel „halb so
   * viele Wäscher wie qualmende Anlagen" ist das, was ein Spieler tut, der
   * den Planeten schon einmal verloren hat.
   */
  if (def.maxPollution !== undefined) {
    const qualm = gas('o2').reduce((n, g) => n + (planet.generators[g.id] ?? 0), 0)
    const waescher = gas('scrub').reduce((n, g) => n + (planet.generators[g.id] ?? 0), 0)
    /*
     * Wäscher dürfen in einem Zug aufholen. Mit derselben Deckelung wie alle
     * anderen kommen sie strukturell nicht hinterher: die Industrie besteht
     * aus *drei* Anlagentypen, die je vier Stück pro Bestellung nachlegen,
     * die Reinigung aus einem oder zwei. Gemessen ohne diese Zeile — Kryo bei
     * 14,8 % Schadstoffen, Pyra bei 72,5 %.
     */
    const rueckstand = Math.ceil(qualm / 2) - waescher
    if (rueckstand > 0 || pollutionPercent() > def.maxPollution * 0.3) {
      for (const g of gas('scrub')) kaufen(g, Math.max(1, Math.min(20, rueckstand)))
    }
  }

  // Rückfallkauf: wer nur „das gerade Nötige" kauft und es sich nicht leisten
  // kann, kauft sonst gar nichts und der Lauf stockt bei zwölffacher
  // Spielzeit (CLAUDE.md).
  const billigste = da
    .filter((g) => g.output.kind === 'gas' && g.output.gas === 'o2')
    .sort((a, b) => a.baseCost - b.baseCost)[0]
  if (billigste && o2 < def.o2Window.min && !def.n2Window) kaufen(billigste)

  // Hände: erst an die Plätze, der Rest auf die Baustelle.
  for (const g of da) {
    if (!g.workSlots) continue
    while (canAssign(g.id) && unassigned().gt(0)) assign(g.id, 1)
  }
  if (planet.builders < 3 && canAssignBuilder()) assignBuilder(1)
}

/** Ein Lauf auf einem Planeten. Verändert den Spielstand **nicht**. */
export function runPlanet(planetId: string, options: BalanceOptions = {}): BalanceResult {
  const opts = { ...STANDARD, ...options }
  const warGesperrt = isPersistenceSuspended()
  suspendPersistence()
  const sicherung = exportSave()

  try {
    stopLoop()
    reseedEvents(opts.seed)

    /*
     * Auch die Meta-Ebene auf null — sonst misst man nicht den Planeten,
     * sondern den Spielstand, in dem man gerade steckt.
     *
     * Gemessen: derselbe Vesta-Lauf ergab 41,0 min aus dem frischen Tab und
     * „schließt nicht ab" direkt nach einem Selbsttest, weil dessen
     * Forschung und Erfolge als Multiplikatoren stehen geblieben waren. Ein
     * Balancing-Werkzeug, dessen Ergebnis von der Vorgeschichte abhängt,
     * misst nichts.
     */
    meta.metaUpgrades = []
    meta.researchNodes = {}
    meta.achievements = []
    meta.research = new Decimal(0)
    meta.genesisCores = new Decimal(0)
    meta.population = new Decimal(0)
    meta.credits = new Decimal(0)
    meta.planetsCompleted = 0
    /*
     * Die Statistik gehört mit zurückgesetzt, obwohl sie „nie in eine
     * Spielformel zurückfließt".
     *
     * Sie fließt nämlich doch — über die Achievements. Die vergeben sich
     * anhand der Statistik, und jedes trägt einen dauerhaften Bonus. Eine
     * geleerte Achievement-Liste ist deshalb wertlos, solange die Zahlen
     * darunter stehen bleiben: das System vergibt im ersten Tick alles
     * wieder, was die alte Statistik hergibt.
     *
     * Gemessen: derselbe Vesta-Lauf ergab 38,6 min aus einem frischen Tab und
     * „schließt nicht ab" aus einem Tab mit gespieltem Stand — bei
     * identischem Aufruf. Zwei Läufe *innerhalb* einer Sitzung waren dagegen
     * immer gleich, weshalb der Fehler beim Prüfen zunächst durchrutschte.
     */
    meta.stats.totalOxygen = new Decimal(0)
    meta.stats.totalClicks = 0
    meta.stats.eventsSeen = 0
    meta.stats.eventsHandled = 0
    meta.stats.fires = 0
    meta.stats.bestPlanetSeconds = 0
    meta.stats.runs = 0
    meta.stats.wavesSeen = 0
    meta.stats.wavesRepelled = 0
    meta.stats.abilitiesUsed = 0
    meta.stats.settlersLost = 0

    run.materials = {}
    run.planets = {}
    run.unlocked = PLANETS.map((p) => p.id)
    resetPlanet(AURORA, new Decimal(0))
    if (planetId !== AURORA.id) travelTo(planetId)

    const fracht: Record<string, Decimal> = {}
    for (const m of MATERIALS) fracht[m.id] = new Decimal(opts.fracht)
    run.materials = fracht

    const def = PLANETS.find((p) => p.id === planetId) ?? AURORA
    const schritte = Math.floor((opts.maxMinuten * 60) / opts.schritt)
    let fertigBei: number | null = null
    let raketeBei: number | null = null

    for (let i = 1; i <= schritte; i++) {
      for (let k = 0; k < opts.clicks * opts.schritt; k++) releaseOxygen()
      entscheiden(def, opts)
      runStep(opts.schritt)

      const sekunden = i * opts.schritt
      if (planet.rocketBuilt && raketeBei === null) raketeBei = sekunden
      if (planet.completed) {
        fertigBei = sekunden
        break
      }
    }

    const anlagen: Record<string, number> = {}
    for (const [id, n] of Object.entries(planet.generators)) if (n > 0) anlagen[id] = n

    return {
      planet: planetId,
      minuten: fertigBei === null ? null : +(fertigBei / 60).toFixed(1),
      rakete: raketeBei === null ? null : +(raketeBei / 60).toFixed(1),
      o2: +o2Percent().toFixed(1),
      n2: +n2Percent().toFixed(1),
      schadstoffe: +pollutionPercent().toFixed(2),
      bewohner: Math.round(planet.settlers.toNumber()),
      zufriedenheit: +contentment().toFixed(2),
      handleistung: +handFactor().toFixed(2),
      guthaben: +planet.oxygen.toNumber().toFixed(0),
      warteschlange: planet.sites.reduce((a, s) => a + s.remaining, 0),
      grob: opts.schritt > 1,
      anlagen,
    }
  } finally {
    importSave(sicherung)
    if (!warGesperrt) resumePersistence()
  }
}

/** Alle fünf Planeten gegen ihre Zieldauern aus §13. */
export function runAll(options: BalanceOptions = {}): BalanceResult[] {
  return PLANETS.map((p) => runPlanet(p.id, options))
}

/**
 * Dieselbe Frage zweimal, einmal mit und einmal ohne Komfort.
 *
 * Der Sinn ist die **Wiederholung**: `laeufe` gibt an, wie oft jede Variante
 * mit verschiedenen Ereignis-Startwerten läuft. Ohne diese Streuung hält man
 * den Unterschied zwischen zwei Zufallslagen für einen Effekt — der Fehler,
 * an dem der erste Messversuch nach M14 gescheitert ist.
 */
export function compare(
  planetId: string,
  options: BalanceOptions = {},
  laeufe = 3,
): {
  ohne: (number | null)[]
  mit: (number | null)[]
  median: { ohne: number | null; mit: number | null }
} {
  const ohne: (number | null)[] = []
  const mit: (number | null)[] = []
  for (let i = 0; i < laeufe; i++) {
    const seed = `${options.seed ?? STANDARD.seed}:${i}`
    ohne.push(runPlanet(planetId, { ...options, seed, komfort: false }).minuten)
    mit.push(runPlanet(planetId, { ...options, seed, komfort: true }).minuten)
  }
  const median = (werte: (number | null)[]): number | null => {
    const echte = werte.filter((w): w is number => w !== null).sort((a, b) => a - b)
    return echte.length === 0 ? null : (echte[Math.floor(echte.length / 2)] ?? null)
  }
  return { ohne, mit, median: { ohne: median(ohne), mit: median(mit) } }
}

/** Zieldauern aus §13, damit ein Ergebnis sich selbst einordnet. */
const ZIEL: Record<string, [number, number]> = {
  aurora: [15, 25],
  vesta: [30, 45],
  pyra: [60, 120],
  kryo: [120, 240],
  nimbus: [120, 240],
}

/** Tabelle für die Konsole — Ergebnis neben Zielfenster. */
export function table(results: BalanceResult[]): string {
  const zeilen = results.map((r) => {
    const ziel = ZIEL[r.planet]
    const urteil =
      r.minuten === null
        ? 'schließt nicht ab'
        : !ziel
          ? ''
          : r.minuten < ziel[0]
            ? 'zu schnell'
            : r.minuten > ziel[1]
              ? 'zu langsam'
              : 'im Fenster'
    const dauer = r.minuten === null ? '—' : `${r.minuten} min`
    const z = ziel ? `${ziel[0]}–${ziel[1]} min` : '—'
    const warnung = r.grob ? '  (grob gemessen, nicht belastbar)' : ''
    return `${r.planet.padEnd(8)} ${dauer.padStart(10)}  Ziel ${z.padEnd(12)} ${urteil}${warnung}`
  })
  return zeilen.join('\n')
}
