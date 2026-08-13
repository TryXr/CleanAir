/**
 * Seeded RNG für prozedurale Planeten (ab Planet 6).
 *
 * Wichtig: derselbe Seed muss über Sessions und Save-Versionen hinweg
 * dieselbe Welt erzeugen — deshalb kein Math.random() und kein Wechsel
 * des Algorithmus nach dem ersten Release.
 */

/** String -> 32-Bit-Seed (xmur3). */
export function hashSeed(str: string): number {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507)
  h = Math.imul(h ^ (h >>> 13), 3266489909)
  return (h ^= h >>> 16) >>> 0
}

export interface Rng {
  /** [0, 1) */
  next(): number
  /** [min, max) */
  range(min: number, max: number): number
  /** Ganzzahl [min, max] */
  int(min: number, max: number): number
  /** Zufälliges Element (undefined nur bei leerem Array). */
  pick<T>(items: readonly T[]): T | undefined
  /** true mit Wahrscheinlichkeit p. */
  chance(p: number): boolean
}

/** Mulberry32 — klein, schnell, für Spielzwecke mehr als ausreichend. */
export function createRng(seed: number | string): Rng {
  let state = typeof seed === 'string' ? hashSeed(seed) : seed >>> 0

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  return {
    next,
    range: (min, max) => min + next() * (max - min),
    int: (min, max) => Math.floor(min + next() * (max - min + 1)),
    pick: <T,>(items: readonly T[]) =>
      items.length === 0 ? undefined : items[Math.floor(next() * items.length)],
    chance: (p) => next() < p,
  }
}
