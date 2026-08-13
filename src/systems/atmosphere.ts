import Decimal from 'break_infinity.js'
import { currentPlanetDef, planet } from '../state/planet.svelte'
import { addLog } from '../state/log.svelte'

/**
 * Atmosphäre.
 *
 * Bis Planet 2 gibt es genau einen Wert: den O₂-Anteil. N₂-Puffer,
 * Schadstoffe und der Stabilitäts-Timer aus DESIGN.md §4 kommen ab M3 dazu.
 *
 * Der Anteil hängt an `airO2` — dem, was tatsächlich in der Luft steht.
 * Generatorkäufe rühren diesen Topf nicht an (sonst würde Fortschritt
 * rückwärts laufen, §1.2), Atmung dagegen schon.
 */

/** Sättigungskurve: anteil = max × luft / (luft + K). */
export function o2Percent(): number {
  const def = currentPlanetDef()
  const air = planet.airO2
  return air.mul(def.atmosphereMax).div(air.add(def.atmosphereK)).toNumber()
}

/** 0…1 — Fortschritt bis zum atembaren Fenster, für die Balkenanzeige. */
export function targetProgress(): number {
  return Math.min(1, o2Percent() / currentPlanetDef().targetO2)
}

/** Wie viel Luft-O₂ für einen bestimmten Anteil nötig ist. */
export function airNeededFor(percent: number): Decimal {
  const def = currentPlanetDef()
  if (percent >= def.atmosphereMax) return new Decimal(Infinity)
  return new Decimal(def.atmosphereK).mul(percent).div(def.atmosphereMax - percent)
}

/** Noch fehlendes O₂ bis zum Ziel. */
export function remainingToTarget(): Decimal {
  const needed = airNeededFor(currentPlanetDef().targetO2).sub(planet.airO2)
  return needed.lt(0) ? new Decimal(0) : needed
}

export function atmosphereSystem(_dt: number): void {
  if (planet.completed) return

  const def = currentPlanetDef()
  if (o2Percent() < def.targetO2) return

  // Rastet ein: ein späterer Einbruch durch Atmung nimmt den Abschluss nicht
  // wieder weg. Rückschläge sind temporär, nie permanent (§1.2).
  planet.completed = true
  addLog(
    `${def.name} ist atembar. ${def.targetO2} % O₂ erreicht — der Sprung zum nächsten Planeten steht offen.`,
    'good',
  )
}
