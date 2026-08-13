import Decimal from 'break_infinity.js'
import { AURORA } from '../data/planets'
import { planet } from '../state/planet.svelte'
import { addLog } from '../state/log.svelte'

/**
 * Atmosphäre.
 *
 * Planet 1 kennt nur einen Wert: den O₂-Anteil. N₂-Puffer, Schadstoffe und
 * der Stabilitäts-Timer aus DESIGN.md §4 kommen ab M3 dazu — hier steht
 * bewusst nur das eine System, das Aurora einführt.
 */

/**
 * Sättigungskurve: anteil = max × gesamt / (gesamt + K).
 *
 * Wichtig für das Spielgefühl: der Anteil hängt am *jemals* freigesetzten
 * O₂, nicht am Vorrat. Sonst würde ein Generatorkauf die Atmosphäre
 * schrumpfen lassen, und Fortschritt darf nie rückwärts laufen (§1.2).
 */
export function o2Percent(): number {
  const total = planet.oxygenTotal
  const value = total.mul(AURORA.atmosphereMax).div(total.add(AURORA.atmosphereK))
  return value.toNumber()
}

/** 0…1 — Fortschritt bis zum atembaren Fenster, für die Balkenanzeige. */
export function targetProgress(): number {
  return Math.min(1, o2Percent() / AURORA.targetO2)
}

/** Wie viel O₂ insgesamt für einen bestimmten Anteil nötig ist. */
export function totalNeededFor(percent: number): Decimal {
  const max = AURORA.atmosphereMax
  if (percent >= max) return new Decimal(Infinity)
  return new Decimal(AURORA.atmosphereK).mul(percent).div(max - percent)
}

/** Noch fehlendes O₂ bis zum Ziel. */
export function remainingToTarget(): Decimal {
  const needed = totalNeededFor(AURORA.targetO2).sub(planet.oxygenTotal)
  return needed.lt(0) ? new Decimal(0) : needed
}

export function atmosphereSystem(_dt: number): void {
  if (planet.completed) return
  if (o2Percent() < AURORA.targetO2) return

  planet.completed = true
  addLog(
    `${planet.name} ist atembar. ${AURORA.targetO2} % O₂ erreicht — die ersten Siedler sind unterwegs.`,
    'good',
  )
}
