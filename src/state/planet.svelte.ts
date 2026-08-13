import Decimal from 'break_infinity.js'
import { AURORA, findPlanet, type PlanetDef } from '../data/planets'
import { EVENTS } from '../data/events'
import { GENERATORS } from '../data/generators'
import { UPGRADES } from '../data/upgrades'
import { readDecimal, readNumber, readString, writeDecimal } from '../engine/serialize'

/**
 * Ein laufendes Zufalls-Ereignis. Planetenlokal, also Teil dieses Zustands —
 * beim Sprung ist der Sturm auf dem alten Planeten kein Thema mehr.
 */
export interface ActiveEvent {
  id: string
  /** Restlaufzeit in Sekunden. */
  remaining: number
  /** Hat der Spieler die Klick-Reaktion genutzt? */
  reacted: boolean
}

/** Sekunden bis zum ersten Ereignis auf einem frischen Planeten. */
export const FIRST_EVENT_DELAY = 150

/**
 * PLANET — wird beim Planetenwechsel vollständig zurückgesetzt.
 *
 * Alles, was einen Prestige-Sprung überleben soll, gehört nach meta.svelte.ts.
 * Diese Trennung ab Tag eins zu haben ist der Grund, warum der Wechsel in M2
 * ein Schritt war und kein Umbau.
 */
function initialPlanet(def: PlanetDef = AURORA, startingOxygen: Decimal = new Decimal(0)) {
  return {
    id: def.id,
    name: def.name,

    /** Vorrat zum Ausgeben — Generatoren und Upgrades zahlen hieraus. */
    oxygen: startingOxygen,
    /** Jemals produziert. Rein statistisch, wächst monoton. */
    oxygenTotal: startingOxygen,

    /**
     * Was tatsächlich in der Luft steht. Steigt durch Produktion, sinkt
     * durch Atmung und Brände — Käufe rühren es nicht an. Genau diese
     * Trennung erzeugt die Spannung aus DESIGN.md §5: mehr Bevölkerung heißt
     * mehr Produktion *und* fallender Atmosphärenwert.
     */
    airO2: startingOxygen,
    /** Der N₂-Puffer. Verdünnt alles andere, sonst nichts (§4). */
    airN2: new Decimal(0),
    /** CO₂, CH₄, SO₂ — zusammengefasst zu einem Wert. */
    pollution: new Decimal(0),

    /**
     * Sekunden, die *alle* Werte am Stück im Fenster stehen. Fällt einer
     * heraus, geht der Wert auf 0 zurück (§4).
     */
    stability: 0,

    /** Grundlage der Genesis-Kerne beim Abschluss (§6). */
    biomass: new Decimal(0),

    /** Generator-id -> Anzahl. */
    generators: {} as Record<string, number>,
    /** ids gekaufter Upgrades. */
    upgrades: [] as string[],

    /** Menschen auf *diesem* Planeten. Beim Wechsel werden sie zur Kolonie. */
    settlers: new Decimal(0),
    /** Zuwanderungsregler 0…1 (§5). */
    immigration: 1,

    /** Laufende Ereignisse und die Zeit bis zum nächsten. */
    events: [] as ActiveEvent[],
    nextEventIn: FIRST_EVENT_DELAY,

    clicks: 0,
    /** Sekunden auf diesem Planeten. */
    elapsed: 0,
    /** Zielfenster gehalten. Rastet ein und fällt nicht zurück. */
    completed: false,
  }
}

export const planet = $state(initialPlanet())

export type PlanetState = typeof planet

/** Planetenwechsel: lokalen Zustand verwerfen, Meta bleibt unberührt. */
export function resetPlanet(def: PlanetDef = AURORA, startingOxygen: Decimal = new Decimal(0)): void {
  Object.assign(planet, initialPlanet(def, startingOxygen))
}

/** Die Definition zum aktuell bespielten Planeten. */
export function currentPlanetDef(): PlanetDef {
  return findPlanet(planet.id) ?? AURORA
}

export function generatorCount(id: string): number {
  return planet.generators[id] ?? 0
}

export function hasUpgrade(id: string): boolean {
  return planet.upgrades.includes(id)
}

/** Führt der aktuelle Planet einen N₂-Puffer? */
export function usesNitrogen(): boolean {
  return currentPlanetDef().n2Window !== undefined
}

/** Kennt der aktuelle Planet Schadstoffe? */
export function usesPollution(): boolean {
  return currentPlanetDef().maxPollution !== undefined
}

export function serializePlanet() {
  return {
    id: planet.id,
    name: planet.name,
    oxygen: writeDecimal(planet.oxygen),
    oxygenTotal: writeDecimal(planet.oxygenTotal),
    airO2: writeDecimal(planet.airO2),
    airN2: writeDecimal(planet.airN2),
    pollution: writeDecimal(planet.pollution),
    stability: planet.stability,
    biomass: writeDecimal(planet.biomass),
    generators: { ...planet.generators },
    upgrades: [...planet.upgrades],
    settlers: writeDecimal(planet.settlers),
    immigration: planet.immigration,
    events: planet.events.map((e) => ({ ...e })),
    nextEventIn: planet.nextEventIn,
    clicks: planet.clicks,
    elapsed: planet.elapsed,
    completed: planet.completed,
  }
}

export function deserializePlanet(raw: unknown): void {
  const s = (raw ?? {}) as Record<string, unknown>

  planet.id = readString(s.id, AURORA.id)
  planet.name = findPlanet(planet.id)?.name ?? readString(s.name, AURORA.name)
  planet.oxygen = readDecimal(s.oxygen, 0)
  planet.oxygenTotal = readDecimal(s.oxygenTotal, 0)
  planet.airO2 = readDecimal(s.airO2, 0)
  planet.airN2 = readDecimal(s.airN2, 0)
  planet.pollution = readDecimal(s.pollution, 0)
  planet.stability = Math.max(0, readNumber(s.stability, 0))
  planet.biomass = readDecimal(s.biomass, 0)
  planet.settlers = readDecimal(s.settlers, 0)
  planet.immigration = Math.min(1, Math.max(0, readNumber(s.immigration, 1)))
  planet.nextEventIn = Math.max(0, readNumber(s.nextEventIn, FIRST_EVENT_DELAY))
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

  const savedEvents = Array.isArray(s.events) ? s.events : []
  planet.events = savedEvents
    .map((raw) => (raw ?? {}) as Record<string, unknown>)
    .filter((e) => EVENTS.some((def) => def.id === e.id))
    .map((e) => ({
      id: readString(e.id, ''),
      remaining: Math.max(0, readNumber(e.remaining, 0)),
      reacted: e.reacted === true,
    }))
    .filter((e) => e.remaining > 0)
}
