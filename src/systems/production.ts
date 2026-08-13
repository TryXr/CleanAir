import Decimal from 'break_infinity.js'
import { GENERATORS, findGenerator, type GeneratorDef } from '../data/generators'
import { UPGRADES, findUpgrade } from '../data/upgrades'
import { generatorCount, hasUpgrade, planet } from '../state/planet.svelte'

/**
 * Produktion — die einzige Stelle, an der Multiplikatoren zusammenlaufen.
 *
 * DESIGN.md §13: „Alle Multiplikatoren zentral sammeln — niemals verstreut."
 * Wenn später Arbeitskraft, Druckfaktor und Forschung dazukommen, kommen sie
 * hierher und nirgendwo sonst. Sonst ist nach drei Meilensteinen nicht mehr
 * nachvollziehbar, woher eine Zahl stammt.
 */

/** Klick-Ertrag vor allen Multiplikatoren. */
const BASE_CLICK = 1

interface Multipliers {
  click: Decimal
  global: Decimal
  perGenerator: Record<string, Decimal>
}

function collectMultipliers(): Multipliers {
  const m: Multipliers = { click: new Decimal(1), global: new Decimal(1), perGenerator: {} }

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

/** Gesamte Produktionsrate des Planeten. */
export function currentO2Rate(): Decimal {
  let total = new Decimal(0)
  for (const def of GENERATORS) total = total.add(generatorRate(def))
  return total
}

export function clickGain(): Decimal {
  return collectMultipliers().click.mul(BASE_CLICK)
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
  planet.oxygen = planet.oxygen.add(gain)
  planet.oxygenTotal = planet.oxygenTotal.add(gain)
  planet.clicks++
}

export function productionSystem(dt: number): void {
  const gain = currentO2Rate().mul(dt)
  if (gain.lte(0)) return

  planet.oxygen = planet.oxygen.add(gain)
  planet.oxygenTotal = planet.oxygenTotal.add(gain)
}
