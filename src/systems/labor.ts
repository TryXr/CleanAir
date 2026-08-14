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
  return staffing(def) * (SATIETY_FLOOR + (1 - SATIETY_FLOOR) * planet.satiety)
}

// --- Zuweisen -------------------------------------------------------------

/** Bewohner, die weder zugewiesen noch von einem Bau verschluckt sind. */
export function unassigned(): Decimal {
  const frei = planet.settlers.sub(planet.bound).sub(totalStaff())
  return frei.lt(0) ? new Decimal(0) : frei
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
  const verfuegbar = planet.settlers.sub(planet.bound)
  let gesamt = totalStaff()
  if (gesamt.lte(verfuegbar)) return

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
