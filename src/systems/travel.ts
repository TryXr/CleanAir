import Decimal from 'break_infinity.js'
import { PLANETS, findPlanet, planetForIndex, type PlanetDef } from '../data/planets'
import { rocketFor } from '../data/rockets'
import { addLog } from '../state/log.svelte'
import { deserializePlanet, planet, resetPlanet, serializePlanet } from '../state/planet.svelte'
import { canAffordMaterials, isUnlocked, run, spendMaterials, unlockPlanet } from '../state/run.svelte'
import { resetAtmosphereNotices } from './atmosphere'
import { metaEffects } from './metaEffects'
import { resetPopulationNotices } from './population'

/**
 * Reisen zwischen Planeten (DESIGN.md §16).
 *
 * Der Kern des Kurswechsels: Planeten sterben nicht mehr beim Verlassen. Der
 * aktive Planet lebt weiter in planet.svelte.ts, alle anderen liegen als
 * Momentaufnahme in `run.planets`. Reisen heißt: den aktiven einlagern, den
 * Zielplaneten auspacken.
 *
 * Dass hier serialisiert statt umgehängt wird, hat einen Grund: so bleibt
 * `planet` das eine reaktive Objekt, das der gesamte übrige Code direkt
 * anspricht. Ein Umbau auf `planets[aktiv].oxygen` hätte jede einzelne
 * Zeile in den Systemen und der UI angefasst.
 */

/** Der Planet, den die Rakete des aktuellen freischaltet. */
export function nextPlanetAfter(id: string): PlanetDef | undefined {
  const index = PLANETS.findIndex((p) => p.id === id)
  if (index < 0 || index + 1 >= PLANETS.length) return undefined
  return PLANETS[index + 1]
}

// --- Rakete ---------------------------------------------------------------

export function rocketCostPaid(): boolean {
  return planet.rocketBuilt
}

export function canBuildRocket(): boolean {
  const def = rocketFor(planet.id)
  if (!def || planet.rocketBuilt) return false
  if (planet.oxygen.lt(def.oxygenCost)) return false
  return canAffordMaterials(def.materialCost)
}

/**
 * Baut die Rakete des aktuellen Planeten und schaltet damit den nächsten
 * frei. Sie bleibt gebaut — auch nach einem Rückflug muss man sie nicht
 * erneut bezahlen.
 */
export function buildRocket(): boolean {
  const def = rocketFor(planet.id)
  if (!def || !canBuildRocket()) return false

  planet.oxygen = planet.oxygen.sub(def.oxygenCost)
  spendMaterials(def.materialCost)
  planet.rocketBuilt = true

  const next = nextPlanetAfter(planet.id)
  if (next) {
    unlockPlanet(next.id)
    addLog(`${def.name} steht. ${next.name} ist ab jetzt erreichbar.`, 'good')
  } else {
    addLog(`${def.name} steht — aber der Scanner findet nichts Neues.`, 'warn')
  }
  return true
}

// --- Reisen ---------------------------------------------------------------

export function canTravelTo(id: string): boolean {
  if (id === planet.id) return false
  return isUnlocked(id) && findPlanet(id) !== undefined
}

/**
 * Wechselt den aktiven Planeten. Ein noch nie besuchter Planet wird frisch
 * angelegt, ein bekannter genau so ausgepackt, wie man ihn verlassen hat —
 * mit laufenden Generatoren, Bevölkerung und halb gewachsenem Wald.
 */
export function travelTo(id: string): boolean {
  if (!canTravelTo(id)) return false
  const target = findPlanet(id)
  if (!target) return false

  // Den aktuellen Planeten einlagern, bevor irgendetwas überschrieben wird.
  run.planets = { ...run.planets, [planet.id]: serializePlanet() }

  const snapshot = run.planets[id]
  if (snapshot) {
    deserializePlanet(snapshot)
    // Der eingelagerte Planet ist jetzt der aktive — sonst läge er doppelt vor.
    const rest = { ...run.planets }
    delete rest[id]
    run.planets = rest
    addLog(`Zurück auf ${target.name}.`, 'good')
  } else {
    resetPlanet(target, metaEffects().startingOxygen)
    addLog(target.intro)
  }

  resetPopulationNotices()
  resetAtmosphereNotices()
  return true
}

// --- Übersicht für die UI -------------------------------------------------

export interface PlanetSummary {
  def: PlanetDef
  active: boolean
  unlocked: boolean
  visited: boolean
  completed: boolean
  rocketBuilt: boolean
  settlers: Decimal
  biomass: Decimal
}

function readSnapshot(raw: unknown): { completed: boolean; rocket: boolean; settlers: Decimal; biomass: Decimal } {
  const s = (raw ?? {}) as Record<string, unknown>
  const num = (v: unknown) => {
    try {
      return typeof v === 'string' || typeof v === 'number' ? new Decimal(v) : new Decimal(0)
    } catch {
      return new Decimal(0)
    }
  }
  return {
    completed: s.completed === true,
    rocket: s.rocketBuilt === true,
    settlers: num(s.settlers),
    biomass: num(s.biomass),
  }
}

export function planetSummaries(): PlanetSummary[] {
  return PLANETS.map((def) => {
    const active = def.id === planet.id
    const snapshot = run.planets[def.id]
    const data = active
      ? {
          completed: planet.completed,
          rocket: planet.rocketBuilt,
          settlers: planet.settlers,
          biomass: planet.biomass,
        }
      : readSnapshot(snapshot)

    return {
      def,
      active,
      unlocked: isUnlocked(def.id),
      visited: active || snapshot !== undefined,
      completed: data.completed,
      rocketBuilt: data.rocket,
      settlers: data.settlers,
      biomass: data.biomass,
    }
  })
}

/**
 * Biomasse aller Planeten des Durchlaufs — die Grundlage der Genesis-Kerne.
 * Seit §16 zählt nicht mehr ein einzelner Planet, sondern der ganze Lauf.
 */
export function totalBiomass(): Decimal {
  let total = planet.biomass
  for (const raw of Object.values(run.planets)) {
    total = total.add(readSnapshot(raw).biomass)
  }
  return total
}

/** Wie viele Planeten dieses Durchlaufs stabil stehen. */
export function completedCount(): number {
  return planetSummaries().filter((p) => p.completed).length
}

/** Der nächste noch nie besuchte Planet, für die Anzeige. */
export function nextUnvisited(): PlanetDef | undefined {
  return planetSummaries().find((p) => !p.visited)?.def ?? planetForIndex(PLANETS.length)
}
