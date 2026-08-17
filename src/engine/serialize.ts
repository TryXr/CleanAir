import Decimal from 'break_infinity.js'
import { d, type Numeric } from './format'

/**
 * Defensive Leser für Save-Daten.
 *
 * Ein Spielstand ist Fremddaten: alt, von Hand editiert oder halb migriert.
 * Jeder Wert wird deshalb geprüft und fällt im Zweifel auf den Default
 * zurück, statt NaN durch die halbe Simulation zu tragen.
 */

export function readDecimal(value: unknown, fallback: Numeric = 0): Decimal {
  if (typeof value !== 'string' && typeof value !== 'number') return d(fallback)
  try {
    const parsed = new Decimal(value)
    const valid = Number.isFinite(parsed.mantissa) && Number.isFinite(parsed.exponent)
    return valid ? parsed : d(fallback)
  } catch {
    return d(fallback)
  }
}

export function readNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

export function readInt(value: unknown, fallback: number): number {
  return Math.floor(readNumber(value, fallback))
}

export function readBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

export function readString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback
}

/** Decimal -> Save-String. Nie als Number speichern, das verliert Präzision. */
export function writeDecimal(value: Decimal): string {
  return value.toString()
}
