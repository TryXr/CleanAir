import Decimal from 'break_infinity.js'
import { readDecimal, readNumber, readString, writeDecimal } from '../engine/serialize'

/**
 * PLANET — wird beim Planetenwechsel vollständig zurückgesetzt.
 *
 * Alles, was einen Prestige-Sprung überleben soll, gehört nach meta.svelte.ts.
 * Diese Trennung ab Tag eins zu haben ist der Grund, warum M2 später ein
 * kleiner Schritt wird statt eines Umbaus.
 */
function initialPlanet() {
  return {
    id: 'aurora',
    name: 'Aurora',

    oxygen: new Decimal(0),
    /** Jemals auf diesem Planeten produziert — Basis für Genesis-Kerne. */
    oxygenTotal: new Decimal(0),

    /** Sekunden auf diesem Planeten. */
    elapsed: 0,
  }
}

export const planet = $state(initialPlanet())

export type PlanetState = typeof planet

/** Planetenwechsel: lokalen Zustand verwerfen, Meta bleibt unberührt. */
export function resetPlanet(): void {
  Object.assign(planet, initialPlanet())
}

export function serializePlanet() {
  return {
    id: planet.id,
    name: planet.name,
    oxygen: writeDecimal(planet.oxygen),
    oxygenTotal: writeDecimal(planet.oxygenTotal),
    elapsed: planet.elapsed,
  }
}

export function deserializePlanet(raw: unknown): void {
  const s = (raw ?? {}) as Record<string, unknown>
  planet.id = readString(s.id, 'aurora')
  planet.name = readString(s.name, 'Aurora')
  planet.oxygen = readDecimal(s.oxygen, 0)
  planet.oxygenTotal = readDecimal(s.oxygenTotal, 0)
  planet.elapsed = readNumber(s.elapsed, 0)
}
