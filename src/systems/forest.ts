import Decimal from 'break_infinity.js'
import { currentPlanetDef, planet } from '../state/planet.svelte'

/**
 * Der Wald (DESIGN.md §16).
 *
 * Die erste Materialkette und zugleich die erste echte Abwägung zwischen
 * zwei Ressourcen:
 *
 *   Baum pflanzen ──► wächst ──► erzeugt O₂
 *                        └────► fällen ──► Holz, aber der O₂-Beitrag entfällt
 *
 * Bauholz kostet also Atmosphäre. Wer zu viel fällt, sieht den O₂-Anteil
 * fallen und schiebt den Stabilitäts-Timer aus M3 vor sich her; wer nie
 * fällt, hat schöne Luft und nichts zu bauen.
 *
 * Der Bestand ist planetenlokal, das Holz global (state/run.svelte.ts) —
 * genau diese Trennung macht die Rückkehr zu alten Planeten später
 * lohnend.
 *
 * Hier steht nur die Mathematik. Gepflanzt und gefällt wird im Tick von
 * production.ts, weil Baumschule und Sägewerk gewöhnliche Anlagen sind und
 * dieselben Multiplikatoren abbekommen sollen wie alles andere (§13).
 */

/**
 * O₂ pro Sekunde und Baum.
 *
 * Simuliert, nicht geschätzt. Bei 0.9 drückte der Wald Vesta auf 29,7 min und
 * damit unter das Zielfenster aus §13; bei 0.3 war das Fällen umsonst zu
 * haben — Kahlschlag kostete keine messbare Zeit mehr und die Abwägung war
 * keine. Bei 0.5 stimmt beides: Vesta liegt bei 32,1 min, und wer alles
 * abholzt, braucht 34,0 min. Der Baum ist damit knapp zwei Minuten wert.
 */
const O2_PER_TREE = 0.5

/** Holz pro gefälltem Baum. */
export const WOOD_PER_TREE = 4

export function forestCapacity(): Decimal {
  return new Decimal(currentPlanetDef().forestCapacity)
}

export function hasForest(): boolean {
  return currentPlanetDef().forestCapacity > 0
}

/** Wie viele Bäume noch Platz haben. */
export function forestRoom(): Decimal {
  const room = forestCapacity().sub(planet.trees)
  return room.lt(0) ? new Decimal(0) : room
}

/** 0…1 — wie voll der Planet steht, für die Anzeige. */
export function forestFill(): number {
  const cap = forestCapacity()
  if (cap.lte(0)) return 0
  return Math.min(1, planet.trees.div(cap).toNumber())
}

/**
 * O₂ pro Sekunde aus dem Wald.
 *
 * Bewusst ohne die globalen Multiplikatoren: ein Baum atmet nicht schneller,
 * weil mehr Menschen auf dem Planeten wohnen. Der Wald ist eine ruhige,
 * verlässliche Grundlast — und genau deshalb tut das Fällen weh.
 */
export function forestO2Rate(): Decimal {
  return planet.trees.mul(O2_PER_TREE)
}

/** Wie viel O₂/s ein einzelner Schlag kostet. Für die Anzeige im Panel. */
export function o2PerTree(): number {
  return O2_PER_TREE
}
