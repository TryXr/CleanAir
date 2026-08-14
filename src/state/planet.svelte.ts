import Decimal from 'break_infinity.js'
import { AURORA, findPlanet, type PlanetDef } from '../data/planets'
import { ABILITIES } from '../data/abilities'
import { DEFENSES } from '../data/defenses'
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

    /**
     * Stehende Bäume. Planetenlokal — das Holz daraus landet dagegen im
     * globalen Lager (state/run.svelte.ts, DESIGN.md §16).
     */
    trees: new Decimal(0),

    /** Grundlage der Genesis-Kerne beim Abschluss (§6). */
    biomass: new Decimal(0),

    /** Generator-id -> Anzahl. */
    generators: {} as Record<string, number>,
    /** ids gekaufter Upgrades. */
    upgrades: [] as string[],

    /** Menschen auf *diesem* Planeten. Beim Wechsel werden sie zur Kolonie. */
    settlers: new Decimal(def.startSettlers),

    /**
     * Zugewiesene Bewohner je Anlage (§17). Ohne Besetzung produziert eine
     * Anlage mit Arbeitsplätzen nichts.
     */
    staff: {} as Record<string, number>,
    /**
     * 0…1 — wie gut die Leute versorgt sind, und damit ihre Arbeitsleistung.
     *
     * Bewusst träge: eine Sekunde ohne Wasser soll nicht sofort die ganze
     * Kolonie lahmlegen, und ein kurzer Engpass ist eine Warnung statt einer
     * Katastrophe. Wer gar nichts hat, arbeitet nicht — stirbt aber auch
     * nicht (§17). Damit verliert man offline nur Produktion, nie Menschen.
     */
    satiety: 1,

    /**
     * Vorräte. Planetenlokal wie die Luft, nicht im globalen Lager — jede
     * Kolonie muss sich selbst ernähren (DESIGN.md §16).
     */
    food: new Decimal(def.startFood),
    water: new Decimal(def.startWater),

    /**
     * Menschen, die Gebäude beim Bau verschluckt haben. Sie leben und atmen
     * weiter, stehen aber nie wieder für Berufe zur Verfügung.
     */
    bound: new Decimal(0),

    /** Laufende Ereignisse und die Zeit bis zum nächsten. */
    events: [] as ActiveEvent[],
    nextEventIn: FIRST_EVENT_DELAY,

    /* --- Anoxen (§7) ------------------------------------------------------
       Planetenlokal, damit eine Belagerung auf Pyra nicht mit nach Kryo
       fliegt — und damit sie beim Rückflug genau so weiterläuft.
    -------------------------------------------------------------------- */
    /** Verteidigungsanlage-id -> Anzahl. */
    defenses: {} as Record<string, number>,
    /**
     * Lahmgelegte Anlagen: Generator-id -> Anzahl außer Betrieb.
     *
     * Bewusst *nicht* gelöschte Anlagen. §1.2 nennt Angriffe ausdrücklich als
     * temporären Rückschlag, und in einem Incremental ist der Verlust
     * gekaufter Gebäude der zuverlässigste Weg, jemanden zum Aufhören zu
     * bringen. Sie kommen von selbst zurück, mit Depot schneller.
     */
    disabled: {} as Record<string, number>,
    /**
     * Aufgestauter Druck. Wächst mit dem Fortschritt — „der Fortschritt
     * erzeugt die Bedrohung" (§7), keine künstlichen Trigger.
     */
    threat: 0,
    /** Die wievielte Welle dieses Planeten läuft bzw. kam zuletzt. */
    waveNumber: 0,
    /** Verbleibende Kampfkraft der laufenden Welle. 0 = keine Welle. */
    wavePower: 0,
    /** Restdauer der laufenden Welle in Sekunden. */
    waveRemaining: 0,
    /** Abklingzeiten der drei Fähigkeiten in Sekunden. */
    cooldowns: {} as Record<string, number>,
    /** Läuft gerade ein Notfall-Schild, und wie lange noch? */
    shieldRemaining: 0,
    /** Wurde für diese Welle evakuiert? */
    evacuated: false,

    /**
     * Steht die Rakete dieses Planeten? Sie ist der Weg zum *nächsten*
     * Planeten und völlig unabhängig von `completed` — man darf weiterziehen,
     * bevor die Atmosphäre steht, und später zurückkommen (§16).
     */
    rocketBuilt: false,

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
    trees: writeDecimal(planet.trees),
    stability: planet.stability,
    biomass: writeDecimal(planet.biomass),
    generators: { ...planet.generators },
    upgrades: [...planet.upgrades],
    settlers: writeDecimal(planet.settlers),
    staff: { ...planet.staff },
    satiety: planet.satiety,
    food: writeDecimal(planet.food),
    water: writeDecimal(planet.water),
    bound: writeDecimal(planet.bound),
    events: planet.events.map((e) => ({ ...e })),
    nextEventIn: planet.nextEventIn,
    defenses: { ...planet.defenses },
    disabled: { ...planet.disabled },
    threat: planet.threat,
    waveNumber: planet.waveNumber,
    wavePower: planet.wavePower,
    waveRemaining: planet.waveRemaining,
    cooldowns: { ...planet.cooldowns },
    shieldRemaining: planet.shieldRemaining,
    evacuated: planet.evacuated,
    rocketBuilt: planet.rocketBuilt,
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
  planet.trees = readDecimal(s.trees, 0)
  planet.stability = Math.max(0, readNumber(s.stability, 0))
  planet.biomass = readDecimal(s.biomass, 0)
  planet.settlers = readDecimal(s.settlers, 0)
  planet.satiety = Math.min(1, Math.max(0, readNumber(s.satiety, 1)))
  planet.food = readDecimal(s.food, 0)
  planet.water = readDecimal(s.water, 0)
  planet.bound = readDecimal(s.bound, 0)

  planet.nextEventIn = Math.max(0, readNumber(s.nextEventIn, FIRST_EVENT_DELAY))
  planet.threat = Math.max(0, readNumber(s.threat, 0))
  planet.waveNumber = Math.max(0, Math.floor(readNumber(s.waveNumber, 0)))
  planet.wavePower = Math.max(0, readNumber(s.wavePower, 0))
  planet.waveRemaining = Math.max(0, readNumber(s.waveRemaining, 0))
  planet.shieldRemaining = Math.max(0, readNumber(s.shieldRemaining, 0))
  planet.evacuated = s.evacuated === true

  // Nur bekannte ids übernehmen — dieselbe Vorsicht wie bei Generatoren.
  const savedDefenses = (s.defenses ?? {}) as Record<string, unknown>
  const defenses: Record<string, number> = {}
  for (const def of DEFENSES) {
    const count = readNumber(savedDefenses[def.id], 0)
    if (count > 0) defenses[def.id] = Math.floor(count)
  }
  planet.defenses = defenses

  const savedDisabled = (s.disabled ?? {}) as Record<string, unknown>
  const disabled: Record<string, number> = {}
  for (const def of GENERATORS) {
    const count = readNumber(savedDisabled[def.id], 0)
    if (count > 0) disabled[def.id] = Math.floor(count)
  }
  planet.disabled = disabled

  const savedCooldowns = (s.cooldowns ?? {}) as Record<string, unknown>
  const cooldowns: Record<string, number> = {}
  for (const a of ABILITIES) {
    const left = readNumber(savedCooldowns[a.id], 0)
    if (left > 0) cooldowns[a.id] = left
  }
  planet.cooldowns = cooldowns

  planet.rocketBuilt = s.rocketBuilt === true
  planet.clicks = readNumber(s.clicks, 0)
  planet.elapsed = readNumber(s.elapsed, 0)
  planet.completed = s.completed === true

  // Nur bekannte ids übernehmen. Ein Save, der aus einer Version mit anderen
  // Generatoren stammt, soll keine Geister-Einträge einschleppen.
  // Zuweisungen nur für bekannte Anlagen übernehmen.
  const savedStaff = (s.staff ?? {}) as Record<string, unknown>
  const staff: Record<string, number> = {}
  for (const def of GENERATORS) {
    const n = Math.floor(readNumber(savedStaff[def.id], 0))
    if (n > 0) staff[def.id] = n
  }
  planet.staff = staff

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
