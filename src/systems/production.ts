import Decimal from 'break_infinity.js'
import { GENERATORS, findGenerator, type GeneratorDef } from '../data/generators'
import { UPGRADES, findUpgrade } from '../data/upgrades'
import { generatorCount, hasUpgrade, planet } from '../state/planet.svelte'
import { metaEffects } from './metaEffects'

/**
 * Produktion — die einzige Stelle, an der Multiplikatoren zusammenlaufen.
 *
 * DESIGN.md §13: „Alle Multiplikatoren zentral sammeln — niemals verstreut."
 * Aktuell sind das lokale Upgrades, der Meta-Baum und die Arbeitskraft.
 * Druckfaktor und Forschung kommen später hierher und nirgendwo sonst.
 *
 *   rate = basisRate × anzahl × Π(upgrades) × global × arbeitskraft
 */

/** Klick-Ertrag vor allen Multiplikatoren. */
const BASE_CLICK = 1

/**
 * Teiler der Arbeitskraft-Kurve. Wurzelförmig, damit Bevölkerung spürbar
 * hilft, ohne die Produktion zu übernehmen — sie soll ein Verstärker sein,
 * kein Ersatz für Generatoren.
 */
const WORKFORCE_SCALE = 40

/** Produktionsbonus durch Siedler: 1 + √siedler / scale. */
export function workforceMultiplier(): Decimal {
  if (planet.settlers.lte(0)) return new Decimal(1)
  const bonus = planet.settlers.sqrt().div(WORKFORCE_SCALE).mul(metaEffects().workforce)
  return bonus.add(1)
}

interface Multipliers {
  click: Decimal
  global: Decimal
  perGenerator: Record<string, Decimal>
}

function collectMultipliers(): Multipliers {
  const effects = metaEffects()
  const m: Multipliers = {
    click: effects.clickPower.mul(BASE_CLICK),
    global: effects.globalProduction.mul(workforceMultiplier()),
    perGenerator: {},
  }

  for (const upgrade of UPGRADES) {
    if (!hasUpgrade(upgrade.id)) continue
    const effect = upgrade.effect

    switch (effect.kind) {
      case 'click':
        m.click = m.click.mul(effect.factor)
        break
      case 'global':
        m.global = m.global.mul(effect.factor)
        break
      case 'generator': {
        const current = m.perGenerator[effect.generatorId] ?? new Decimal(1)
        m.perGenerator[effect.generatorId] = current.mul(effect.factor)
        break
      }
    }
  }

  return m
}

/** O₂/s eines Generatortyps inklusive Stückzahl. */
export function generatorRate(def: GeneratorDef): Decimal {
  const count = generatorCount(def.id)
  if (count === 0) return new Decimal(0)

  const m = collectMultipliers()
  return new Decimal(def.baseRate)
    .mul(count)
    .mul(m.perGenerator[def.id] ?? 1)
    .mul(m.global)
}

/** Gesamte Produktionsrate des Planeten, vor Verbrauch. */
export function currentO2Rate(): Decimal {
  let total = new Decimal(0)
  for (const def of GENERATORS) total = total.add(generatorRate(def))
  return total
}

export function clickGain(): Decimal {
  return collectMultipliers().click
}

// --- Kosten ---------------------------------------------------------------

/**
 * Kosten für `amount` weitere Stück, ausgehend vom aktuellen Bestand.
 * Geometrische Reihe statt Schleife — bei „Max" wären das sonst
 * zehntausende Iterationen pro Frame.
 */
export function generatorCost(def: GeneratorDef, amount = 1): Decimal {
  const owned = generatorCount(def.id)
  const g = def.costGrowth
  const first = new Decimal(def.baseCost).mul(Decimal.pow(g, owned))
  if (amount === 1) return first
  return first.mul(Decimal.pow(g, amount).sub(1)).div(g - 1)
}

/** Wie viele Stück das aktuelle Guthaben hergibt. */
export function maxAffordable(def: GeneratorDef): number {
  const owned = generatorCount(def.id)
  const g = def.costGrowth
  const first = new Decimal(def.baseCost).mul(Decimal.pow(g, owned))
  if (planet.oxygen.lt(first)) return 0

  // k = log_g( 1 + guthaben × (g−1) / erstesStück )
  const ratio = planet.oxygen.mul(g - 1).div(first).add(1)
  return Math.floor(ratio.log10() / Math.log10(g))
}

// --- Käufe ----------------------------------------------------------------

export function buyGenerator(id: string, amount: number): boolean {
  const def = findGenerator(id)
  if (!def || amount < 1) return false

  const cost = generatorCost(def, amount)
  if (planet.oxygen.lt(cost)) return false

  planet.oxygen = planet.oxygen.sub(cost)
  planet.generators[id] = generatorCount(id) + amount
  return true
}

export function buyUpgrade(id: string): boolean {
  const def = findUpgrade(id)
  if (!def || hasUpgrade(id)) return false
  if (planet.oxygen.lt(def.cost)) return false

  planet.oxygen = planet.oxygen.sub(def.cost)
  planet.upgrades = [...planet.upgrades, id]
  return true
}

// --- Tick -----------------------------------------------------------------

/** Der Klick-Button. Die einzige Aktion, die es in Minute eins gibt. */
export function releaseOxygen(): void {
  const gain = clickGain()
  addOxygen(gain)
  planet.clicks++
}

/**
 * Zentraler Zufluss. Produktion speist drei Töpfe gleichzeitig:
 * den ausgebbaren Vorrat, die Statistik und die tatsächliche Luft.
 */
function addOxygen(amount: Decimal): void {
  planet.oxygen = planet.oxygen.add(amount)
  planet.oxygenTotal = planet.oxygenTotal.add(amount)
  planet.airO2 = planet.airO2.add(amount)
  planet.biomass = planet.biomass.add(amount)
}

export function productionSystem(dt: number): void {
  const gain = currentO2Rate().mul(dt)
  if (gain.lte(0)) return
  addOxygen(gain)
}
