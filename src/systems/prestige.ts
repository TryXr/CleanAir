import Decimal from 'break_infinity.js'
import { findMetaUpgrade } from '../data/metaUpgrades'
import { AURORA } from '../data/planets'
import { addLog } from '../state/log.svelte'
import { meta } from '../state/meta.svelte'
import { planet, resetPlanet } from '../state/planet.svelte'
import { resetRun } from '../state/run.svelte'
import { resetAtmosphereNotices } from './atmosphere'
import { metaEffects, metaRequirementsMet } from './metaEffects'
import { resetPopulationNotices } from './population'
import { completedCount, totalBiomass } from './travel'

/**
 * Prestige — der Durchlauf-Reset (DESIGN.md §16).
 *
 * Seit M6 setzt Prestige **nicht mehr einen Planeten** zurück, sondern den
 * ganzen Durchlauf. Man spielt, bis sich der Fortschritt zäh anfühlt, drückt
 * dann bewusst auf Reset und beginnt wieder auf Aurora — mit Genesis-Kernen
 * aus der Biomasse *aller* Planeten des Laufs.
 *
 * Damit ist der Reset wieder das, was er im Genre sein soll: eine
 * freiwillige Entscheidung gegen abnehmenden Ertrag statt ein Knopf, der am
 * Ende jedes Planeten aufleuchtet. Den Planetenwechsel übernimmt
 * systems/travel.ts.
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

/** Was ein sofortiger Reset einbrächte — aus der Biomasse des ganzen Laufs. */
export function pendingCores(): Decimal {
  return coresFor(totalBiomass())
}

/** Wie viel Biomasse bis zum nächsten Kern fehlt. */
export function biomassToNextCore(): Decimal {
  const next = pendingCores().add(1)
  return next.pow(2).mul(BIOMASS_NORM).sub(totalBiomass())
}

/**
 * Ein Reset lohnt sich erst, wenn er etwas abwirft. Er ist bewusst nicht an
 * einen abgeschlossenen Planeten gebunden — der Spieler entscheidet selbst,
 * wann es zäh genug ist (§16).
 */
export function canPrestige(): boolean {
  return pendingCores().gte(1)
}

export function doPrestige(): boolean {
  if (!canPrestige()) return false

  const gained = pendingCores()
  const planets = completedCount()
  // Menschen bleiben als Kolonie-Erfahrung erhalten, auch wenn der Lauf endet.
  const settlers = planet.settlers

  meta.genesisCores = meta.genesisCores.add(gained)
  meta.population = meta.population.add(settlers)
  meta.planetsCompleted += planets
  meta.stats.runs += 1

  // Der ganze Durchlauf fällt: alle Planeten, alles Material, alle
  // Freischaltungen. Nur meta überlebt.
  resetRun()
  resetPlanet(AURORA, metaEffects().startingOxygen)
  resetPopulationNotices()
  resetAtmosphereNotices()

  addLog(
    `Durchlauf beendet: ${planets} ${planets === 1 ? 'Planet' : 'Planeten'} stabil, ` +
      `+${gained.toString()} Genesis-Kerne. Alles andere bleibt zurück.`,
    'good',
  )
  addLog(AURORA.intro)

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
