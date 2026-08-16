import Decimal from 'break_infinity.js'
import { GENERATORS, findGenerator, type GeneratorDef } from '../data/generators'
import { generatorCount, planet } from '../state/planet.svelte'

/**
 * Arbeitskraft (DESIGN.md §17).
 *
 * Der Kern des Kurswechsels: eine Anlage mit Arbeitsplätzen produziert
 * **nichts**, solange niemand zugewiesen ist. Nicht weniger — nichts. Damit
 * hört Bevölkerung auf, ein Multiplikator zu sein, und wird zu dem, wodurch
 * überhaupt etwas passiert.
 *
 * Plätze haben aber nur **Handarbeit**: Bergbau, Schmelze, Sägewerk, Forst,
 * Landwirtschaft. Chemische Apparate — Elektrolyse, Photolyse, Prozessor,
 * Sublimator, Wäscher, Ventil — laufen von selbst. Das hält den Anfang
 * schlank und macht Zuweisung zu einer Entscheidung statt zu einer
 * Pflichtübung an jeder einzelnen Anlage.
 *
 * Zwei Faktoren greifen ineinander:
 *
 *   leistung = besetzung × sättigung
 *
 * **Besetzung** ist der Anteil der besetzten Plätze — halb besetzt heißt halbe
 * Leistung. **Sättigung** ist, wie gut die Leute versorgt sind. Wer hungert,
 * arbeitet langsamer; wer gar nichts hat, arbeitet nicht. Niemand stirbt
 * daran (§17), weshalb Abwesenheit nur Produktion kostet und nie Menschen.
 *
 * Anlagen ohne `workSlots` laufen wie bisher von allein. So können Vesta bis
 * Nimbus im alten Modell weiterlaufen, bis M13 sie nachzieht.
 */

/** Plätze, die dieser Anlagentyp insgesamt anbietet. */
export function totalSlots(def: GeneratorDef): number {
  if (!def.workSlots) return 0
  return generatorCount(def.id) * def.workSlots
}

export function staffOn(id: string): number {
  return planet.staff[id] ?? 0
}

/** Alle zugewiesenen Bewohner über sämtliche Anlagen. */
export function totalStaff(): Decimal {
  let sum = 0
  for (const def of GENERATORS) sum += staffOn(def.id)
  return new Decimal(sum)
}

/**
 * 0…1 — wie weit die Plätze besetzt sind.
 *
 * Ohne Plätze gilt 1: die alten Anlagen sollen nicht plötzlich stillstehen,
 * nur weil das Konzept sich geändert hat.
 */
export function staffing(def: GeneratorDef): number {
  const slots = totalSlots(def)
  if (slots <= 0) return 1
  return Math.min(1, staffOn(def.id) / slots)
}

/**
 * Mindestleistung hungernder Leute.
 *
 * Ohne diesen Boden ist die Sättigung eine **Todesspirale**: sie senkt die
 * Arbeitsleistung, Arbeit erzeugt Nahrung, also kommt eine Kolonie bei
 * Sättigung 0 nie wieder hoch. Gemessen — selbst ein Spieler, der alles
 * richtig baute, stand nach 20 Minuten dauerhaft bei 0 und blieb dort.
 * Das verstößt gegen §1.2: Rückschläge sollen temporär sein.
 *
 * Mit Boden bleibt der Druck hoch (drei Viertel Verlust), aber der Weg
 * zurück existiert immer.
 */
const SATIETY_FLOOR = 0.25

/**
 * Wie viel ein Paar Hände gerade leistet — 0,25 bei leeren Vorräten, 1 bei
 * voller Sättigung.
 *
 * Eigene Funktion, weil seit M11 auch die Baustelle danach rechnet. Zweimal
 * dieselbe Formel hinzuschreiben hieße, sie beim nächsten Balancing genau
 * einmal zu ändern.
 *
 * **Zufriedenheit steht hier nicht mehr** (Nachtrag zu M14). Sie war einen
 * halben Meilenstein lang der zweite Faktor an dieser Stelle, und das war die
 * falsche Form: das Ziel dieses Spiels ist ein *Fenster*, kein Maximum, also
 * erhöht ein Bonus auf den laufenden Ausstoß nicht den Erfolg, sondern die
 * Gefahr, darüber hinauszuschießen. Gemessen — mit verschenkter voller
 * Zufriedenheit war Vesta gar nicht mehr abzuschließen und Pyra fiel von 84,5
 * auf 127,3 min. Sie zahlt jetzt auf die Biomasse und damit auf den Abflug
 * ein (systems/contentment.ts).
 */
export function handFactor(): number {
  return SATIETY_FLOOR + (1 - SATIETY_FLOOR) * planet.satiety
}

/**
 * Der Faktor, mit dem production.ts jede Anlagenleistung multipliziert.
 *
 * **Versorgung ist ausgenommen.** Nahrung und Wasser laufen immer mit voller
 * Besetzungsleistung, egal wie hungrig die Leute sind — sich selbst zu
 * ernähren ist das Letzte, was jemand aufgibt.
 *
 * Das ist nicht nur Fiktion, sondern notwendig: mit Strafe auch auf der
 * Versorgung gibt es eine Sackgasse. Gemessen — ein Spieler, der zu früh in
 * O₂-Anlagen investierte, fiel auf Sättigung 0, und drei Keimkammern
 * lieferten dort nur noch 0,059/s gegen 0,125/s Bedarf. Aus dieser Lage
 * führte kein Weg zurück, was §1.2 verbietet. Mit der Ausnahme ist der
 * Rückweg immer offen: die Kolonie erholt sich, verliert aber Zeit.
 */
export function laborFactor(def: GeneratorDef): number {
  if (!def.workSlots) return 1
  if (def.output.kind === 'supply') return staffing(def)
  return staffing(def) * handFactor()
}

// --- Zuweisen -------------------------------------------------------------

/**
 * Leute, die gerade draußen bergen (M18, §20.2).
 *
 * Steht hier und nicht in systems/salvage.ts, damit die Buchhaltung an
 * **einer** Stelle bleibt: `unassigned()` ist die Wahrheit darüber, wer noch
 * greifbar ist, und ein Trupp, der dort fehlt, wäre eine zweite Rechnung
 * daneben. Es liest nur den Zustand, es gibt also keinen Ring zwischen den
 * beiden Systemen.
 */
export function crewAway(): number {
  let sum = 0
  for (const e of planet.expeditions) sum += e.crew
  return sum
}

/**
 * Bewohner, die weder an einer Anlage stehen noch auf der Baustelle noch von
 * einem Bau verschluckt sind — und nicht gerade unterwegs.
 *
 * > **Die Anzeige verspricht acht, die Prüfung sagt sieben.**
 * >
 * > Vier Abzüge hintereinander lassen aus glatten 8 ein 7,9999999999999
 * > werden. Das wäre folgenlos, wenn alle Stellen gleich rundeten — tun sie
 * > aber nicht: `lt(8)` vergleicht exakt und ist **wahr**, während sowohl
 * > `toNumber()` als auch `Decimal.floor()` auf **8** aufrunden (floor läuft
 * > in break_infinity durch toNumber). Damit zeigt `formatInt()` „8 ohne
 * > Aufgabe", der Regler im Bergungsfenster lässt einen Trupp von 8 wählen,
 * > und `salvageBlocker()` antwortet „zu wenige freie Bewohner". Der Spieler
 * > sieht eine Zahl, die es angeblich nicht gibt.
 * >
 * > Gefunden beim Messen von §20: in **einem** Lauf 8704 abgelehnte
 * > Bergungsanläufe aus genau diesem Grund — die Zuweisungsschleife fährt den
 * > Wert wiederholt exakt auf die Grenze, also trifft es nicht nur den
 * > Randfall. Wer im Spiel „besetzen" so lange klickt, bis niemand mehr frei
 * > ist, erzeugt denselben Rest.
 *
 * Deshalb: was auf ein Zehnmilliardstel an einer ganzen Zahl liegt, **ist**
 * diese ganze Zahl. Menschen sind ganzzahlig, der Rest ist Rechenrauschen aus
 * vier Subtraktionen — und die Korrektur gehört hierher, weil das hier die
 * eine Wahrheit darüber ist, wer greifbar ist (siehe `crewAway`). Jede Stelle,
 * die stattdessen selbst rundet, wäre die verstreute Rechnung, die CLAUDE.md
 * verbietet.
 */
export function unassigned(): Decimal {
  const frei = planet.settlers
    .sub(planet.bound)
    .sub(totalStaff())
    .sub(planet.builders)
    .sub(crewAway())
  if (frei.lt(0)) return new Decimal(0)
  const gerundet = Math.round(frei.toNumber())
  return Math.abs(frei.toNumber() - gerundet) < 1e-9 ? new Decimal(gerundet) : frei
}

// --- Baukolonne (M11) -----------------------------------------------------

export function canAssignBuilder(): boolean {
  return unassigned().gte(1)
}

/** Liefert, wie viele tatsächlich auf die Baustelle gegangen sind. */
export function assignBuilder(amount = 1): number {
  const frei = Math.floor(unassigned().toNumber())
  const n = Math.min(amount, frei)
  if (n <= 0) return 0
  planet.builders += n
  return n
}

export function unassignBuilder(amount = 1): number {
  const n = Math.min(amount, planet.builders)
  if (n <= 0) return 0
  planet.builders -= n
  return n
}

export function canAssign(id: string): boolean {
  const def = findGenerator(id)
  if (!def?.workSlots) return false
  if (staffOn(id) >= totalSlots(def)) return false
  return unassigned().gte(1)
}

export function assign(id: string, amount = 1): boolean {
  const def = findGenerator(id)
  if (!def?.workSlots) return false

  const platz = totalSlots(def) - staffOn(id)
  const frei = Math.floor(unassigned().toNumber())
  const n = Math.min(amount, platz, frei)
  if (n <= 0) return false

  planet.staff = { ...planet.staff, [id]: staffOn(id) + n }
  return true
}

export function unassign(id: string, amount = 1): boolean {
  const aktuell = staffOn(id)
  if (aktuell <= 0) return false
  planet.staff = { ...planet.staff, [id]: Math.max(0, aktuell - amount) }
  return true
}

/**
 * Räumt Zuweisungen, die es nicht mehr geben kann.
 *
 * Zwei Fälle: die Bevölkerung ist geschrumpft, oder Anlagen wurden lahmgelegt
 * und bieten weniger Plätze. Ohne dieses Aufräumen stünden Leute an Plätzen,
 * die es nicht gibt, und die Rechnung ginge still daneben.
 */
export function enforceStaffLimit(): void {
  let next: Record<string, number> | null = null

  for (const def of GENERATORS) {
    const zugewiesen = staffOn(def.id)
    if (zugewiesen === 0) continue
    const platz = totalSlots(def)
    if (zugewiesen > platz) {
      next ??= { ...planet.staff }
      next[def.id] = platz
    }
  }
  if (next) planet.staff = next

  // Danach erst die Gesamtzahl prüfen — sonst räumt man doppelt.
  // Ein Trupp draußen zählt wie verbaute Menschen: er ist nicht greifbar und
  // lässt sich auch nicht abziehen, also schrumpft der Rest.
  const verfuegbar = planet.settlers.sub(planet.bound).sub(crewAway())
  let gesamt = totalStaff().add(planet.builders)
  if (gesamt.lte(verfuegbar)) return

  /*
   * Die Baustelle zuerst leeren. Wenn die Kolonie schrumpft, ist ein
   * unterbesetztes Sägewerk der kleinere Schaden als eine Nahrungskette, die
   * stehenbleibt — und die Baustelle wartet ohnehin geduldig.
   */
  if (planet.builders > 0) {
    const zuviel = Math.ceil(gesamt.sub(verfuegbar).toNumber())
    const weg = Math.min(planet.builders, zuviel)
    planet.builders -= weg
    gesamt = gesamt.sub(weg)
    if (gesamt.lte(verfuegbar)) return
  }

  const gekuerzt = { ...planet.staff }
  for (const def of GENERATORS) {
    if (gesamt.lte(verfuegbar)) break
    const n = gekuerzt[def.id] ?? 0
    if (n <= 0) continue
    const zuviel = Math.ceil(gesamt.sub(verfuegbar).toNumber())
    const weg = Math.min(n, zuviel)
    gekuerzt[def.id] = n - weg
    gesamt = gesamt.sub(weg)
  }
  planet.staff = gekuerzt
}

/** Für die UI: alle Anlagen mit Plätzen, die auf diesem Planeten stehen. */
export function staffedGenerators(): GeneratorDef[] {
  return GENERATORS.filter((d) => d.workSlots && generatorCount(d.id) > 0)
}
