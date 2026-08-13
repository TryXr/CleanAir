import Decimal from 'break_infinity.js'
import { AURORA } from '../data/planets'
import { GENERATORS } from '../data/generators'
import { UPGRADES } from '../data/upgrades'
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
    id: AURORA.id,
    name: AURORA.name,

    /** Aktueller Vorrat — wird zum Kaufen ausgegeben. */
    oxygen: new Decimal(0),
    /** Jemals freigesetzt. Treibt Atmosphäre und später die Genesis-Kerne. */
    oxygenTotal: new Decimal(0),

    /** Generator-id -> Anzahl. */
    generators: {} as Record<string, number>,
    /** ids gekaufter Upgrades. */
    upgrades: [] as string[],

    clicks: 0,
    /** Sekunden auf diesem Planeten. */
    elapsed: 0,
    /** Zielfenster erreicht. In M2 löst das den Planetenwechsel aus. */
    completed: false,
  }
}

export const planet = $state(initialPlanet())

export type PlanetState = typeof planet

/** Planetenwechsel: lokalen Zustand verwerfen, Meta bleibt unberührt. */
export function resetPlanet(): void {
  Object.assign(planet, initialPlanet())
}

export function generatorCount(id: string): number {
  return planet.generators[id] ?? 0
}

export function hasUpgrade(id: string): boolean {
  return planet.upgrades.includes(id)
}

export function serializePlanet() {
  return {
    id: planet.id,
    name: planet.name,
    oxygen: writeDecimal(planet.oxygen),
    oxygenTotal: writeDecimal(planet.oxygenTotal),
    generators: { ...planet.generators },
    upgrades: [...planet.upgrades],
    clicks: planet.clicks,
    elapsed: planet.elapsed,
    completed: planet.completed,
  }
}

export function deserializePlanet(raw: unknown): void {
  const s = (raw ?? {}) as Record<string, unknown>

  planet.id = readString(s.id, AURORA.id)
  planet.name = readString(s.name, AURORA.name)
  planet.oxygen = readDecimal(s.oxygen, 0)
  planet.oxygenTotal = readDecimal(s.oxygenTotal, 0)
  planet.clicks = readNumber(s.clicks, 0)
  planet.elapsed = readNumber(s.elapsed, 0)
  planet.completed = s.completed === true

  // Nur bekannte ids übernehmen. Ein Save, der aus einer Version mit anderen
  // Generatoren stammt, soll keine Geister-Einträge einschleppen.
  const savedGenerators = (s.generators ?? {}) as Record<string, unknown>
  const generators: Record<string, number> = {}
  for (const def of GENERATORS) {
    const count = readNumber(savedGenerators[def.id], 0)
    if (count > 0) generators[def.id] = Math.floor(count)
  }
  planet.generators = generators

  const savedUpgrades = Array.isArray(s.upgrades) ? s.upgrades : []
  planet.upgrades = UPGRADES.filter((u) => savedUpgrades.includes(u.id)).map((u) => u.id)
}
