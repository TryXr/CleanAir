import Decimal from 'break_infinity.js'
import { findMetaUpgrade } from '../data/metaUpgrades'
import { hasNextPlanet, planetForIndex } from '../data/planets'
import { addLog } from '../state/log.svelte'
import { meta } from '../state/meta.svelte'
import { currentPlanetDef, planet, resetPlanet } from '../state/planet.svelte'
import { resetAtmosphereNotices } from './atmosphere'
import { metaEffects, metaRequirementsMet } from './metaEffects'
import { resetPopulationNotices } from './population'

/**
 * Prestige — der Planetenwechsel (DESIGN.md §6).
 *
 * Der entscheidende Punkt aus dem Konzept: Du verlässt einen Planeten nicht,
 * du besitzt ihn ab jetzt. Deshalb wandern die Siedler beim Sprung nach
 * `meta.population` statt verloren zu gehen — sie bleiben als Kolonie
 * bestehen, auch wenn deren passives Einkommen erst in M5 dazukommt.
 */

/**
 * Normierung der Wurzelformel aus §13. So gewählt, dass ein sauber
 * durchgespieltes Aurora rund drei Kerne abwirft — genug für die ersten
 * beiden Knoten, zu wenig für alles auf einmal.
 */
const BIOMASS_NORM = 300000

/** kerne = floor( sqrt( biomasse / normierung ) ) */
export function coresFor(biomass: Decimal): Decimal {
  if (biomass.lte(0)) return new Decimal(0)
  return biomass.div(BIOMASS_NORM).sqrt().floor()
}

/** Was der aktuelle Planet beim sofortigen Sprung einbrächte. */
export function pendingCores(): Decimal {
  return coresFor(planet.biomass)
}

/** Wie viel Biomasse bis zum nächsten Kern fehlt. */
export function biomassToNextCore(): Decimal {
  const next = pendingCores().add(1)
  return next.pow(2).mul(BIOMASS_NORM).sub(planet.biomass)
}

export function canPrestige(): boolean {
  return planet.completed
}

export function doPrestige(): boolean {
  if (!canPrestige()) return false

  const finished = currentPlanetDef()
  const gained = pendingCores()
  const settlers = planet.settlers

  meta.genesisCores = meta.genesisCores.add(gained)
  meta.population = meta.population.add(settlers)
  meta.planetsCompleted += 1

  const next = planetForIndex(meta.planetsCompleted)
  resetPlanet(next, metaEffects().startingOxygen)
  resetPopulationNotices()
  resetAtmosphereNotices()

  addLog(
    `${finished.name} ist abgeschlossen. +${gained.toString()} Genesis-Kerne.` +
      (settlers.gt(0) ? ` ${settlers.floor().toString()} Menschen bleiben als Kolonie zurück.` : ''),
    'good',
  )

  if (!hasNextPlanet(meta.planetsCompleted - 1)) {
    addLog(
      `Der Scanner findet vorerst nichts Neues — ${next.name} wird erneut angeflogen. Prozedurale Planeten kommen in M6.`,
      'warn',
    )
  }
  addLog(next.intro)

  return true
}

// --- Meta-Baum ------------------------------------------------------------

export function canBuyMetaUpgrade(id: string): boolean {
  const def = findMetaUpgrade(id)
  if (!def) return false
  if (meta.metaUpgrades.includes(id)) return false
  if (!metaRequirementsMet(id)) return false
  return meta.genesisCores.gte(def.cost)
}

export function buyMetaUpgrade(id: string): boolean {
  const def = findMetaUpgrade(id)
  if (!def || !canBuyMetaUpgrade(id)) return false

  meta.genesisCores = meta.genesisCores.sub(def.cost)
  meta.metaUpgrades = [...meta.metaUpgrades, id]
  addLog(`${def.name} freigeschaltet.`, 'good')
  return true
}
