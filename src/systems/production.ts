import Decimal from 'break_infinity.js'
import { planet } from '../state/planet.svelte'

/**
 * PLATZHALTER bis M1.
 *
 * Erzeugt eine feste Grundrate, damit sich in M0 nachweisen lässt, dass
 * Tick, Zahlformatierung, Save und Offline-Fortschritt zusammenspielen.
 * In M1 ersetzt die echte Generatoren-Formel aus DESIGN.md §13 diese Zeile:
 *
 *   rate = basisRate × anzahl × Π(upgrades) × arbeitskraft × druckFaktor
 */
export const PLACEHOLDER_O2_RATE = new Decimal(0.2)

export function currentO2Rate(): Decimal {
  return PLACEHOLDER_O2_RATE
}

export function productionSystem(dt: number): void {
  const gain = currentO2Rate().mul(dt)
  planet.oxygen = planet.oxygen.add(gain)
  planet.oxygenTotal = planet.oxygenTotal.add(gain)
}
