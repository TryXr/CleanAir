import Decimal from 'break_infinity.js'
import { GENERATORS, findGenerator, type GasKind, type GeneratorDef } from '../data/generators'
import { UPGRADES, findUpgrade } from '../data/upgrades'
import { currentPlanetDef, generatorCount, hasUpgrade, planet } from '../state/planet.svelte'
import { meta } from '../state/meta.svelte'
import { fireThrottle } from './atmosphere'
import { eventEffects } from './eventEffects'
import { metaEffects } from './metaEffects'
import { researchEffects } from './research'

/**
 * Produktion — die einzige Stelle, an der Multiplikatoren zusammenlaufen.
 *
 * DESIGN.md §13: „Alle Multiplikatoren zentral sammeln — niemals verstreut."
 * Das sind inzwischen fünf Quellen: lokale Upgrades, der Meta-Baum, der
 * Forschungsbaum, die Arbeitskraft und laufende Ereignisse. Der Druckfaktor
 * kommt in M4 hierher und nirgendwo sonst.
 *
 *   rate = basisRate × anzahl × Π(upgrades) × global × gasFaktor
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
  const scale = metaEffects().workforce * researchEffects().workforce
  return planet.settlers.sqrt().div(WORKFORCE_SCALE).mul(scale).add(1)
}

interface Multipliers {
  click: Decimal
  /** Gilt für jede Anlage, unabhängig davon, woran sie arbeitet. */
  global: Decimal
  /** Zusätzlich je nach Gasart — hier wirkt die Forschung getrennt. */
  byGas: Record<GasKind, Decimal>
  perGenerator: Record<string, Decimal>
}

function collectMultipliers(): Multipliers {
  const mEffects = metaEffects()
  const rEffects = researchEffects()
  const events = eventEffects()

  const m: Multipliers = {
    click: mEffects.clickPower.mul(rEffects.clickPower).mul(BASE_CLICK),
    global: mEffects.globalProduction
      .mul(rEffects.globalProduction)
      .mul(workforceMultiplier())
      .mul(events.production)
      .mul(fireThrottle()),
    byGas: {
      o2: rEffects.o2Yield,
      n2: rEffects.n2Yield,
      scrub: rEffects.scrubYield,
    },
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

/**
 * Leistung eines Generatortyps inklusive Stückzahl.
 *
 * Die Einheit hängt an der Gasart: bei `o2` und `n2` ist es Gas pro Sekunde,
 * bei `scrub` der Anteil der Schadstoffe, der pro Sekunde verschwindet.
 */
export function generatorRate(def: GeneratorDef): Decimal {
  const count = generatorCount(def.id)
  if (count === 0) return new Decimal(0)

  const m = collectMultipliers()
  return new Decimal(def.baseRate)
    .mul(count)
    .mul(m.perGenerator[def.id] ?? 1)
    .mul(m.byGas[def.gas])
    .mul(m.global)
}

function rateForGas(gas: GasKind): Decimal {
  let total = new Decimal(0)
  for (const def of GENERATORS) {
    if (def.gas === gas) total = total.add(generatorRate(def))
  }
  return total
}

/** O₂ pro Sekunde, vor Verbrauch und Bränden. */
export function currentO2Rate(): Decimal {
  return rateForGas('o2')
}

/** N₂ pro Sekunde. Geht ausschließlich in die Luft, nie in den Vorrat. */
export function currentN2Rate(): Decimal {
  return rateForGas('n2')
}

/** Anteil der Schadstoffe, der pro Sekunde abgebaut wird. */
export function currentScrubRate(): Decimal {
  return rateForGas('scrub')
}

export function clickGain(): Decimal {
  return collectMultipliers().click
}

// --- Kosten ---------------------------------------------------------------

/** Preis des nächsten Stücks, nach Forschungsrabatt. */
function firstUnitCost(def: GeneratorDef): Decimal {
  const owned = generatorCount(def.id)
  return new Decimal(def.baseCost)
    .mul(Decimal.pow(def.costGrowth, owned))
    .mul(researchEffects().buildCost)
}

/**
 * Kosten für `amount` weitere Stück, ausgehend vom aktuellen Bestand.
 * Geometrische Reihe statt Schleife — bei „Max" wären das sonst
 * zehntausende Iterationen pro Frame.
 */
export function generatorCost(def: GeneratorDef, amount = 1): Decimal {
  const g = def.costGrowth
  const first = firstUnitCost(def)
  if (amount === 1) return first
  return first.mul(Decimal.pow(g, amount).sub(1)).div(g - 1)
}

/** Wie viele Stück das aktuelle Guthaben hergibt. */
export function maxAffordable(def: GeneratorDef): number {
  const g = def.costGrowth
  const first = firstUnitCost(def)
  if (planet.oxygen.lt(first)) return 0

  // k = log_g( 1 + guthaben × (g−1) / erstesStück )
  const ratio = planet.oxygen.mul(g - 1).div(first).add(1)
  return Math.floor(ratio.log10() / Math.log10(g))
}

/** Upgrade-Preis, ebenfalls nach Forschungsrabatt. */
export function upgradeCost(id: string): Decimal {
  const def = findUpgrade(id)
  if (!def) return new Decimal(0)
  return new Decimal(def.cost).mul(researchEffects().buildCost)
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

  const cost = upgradeCost(id)
  if (planet.oxygen.lt(cost)) return false

  planet.oxygen = planet.oxygen.sub(cost)
  planet.upgrades = [...planet.upgrades, id]
  return true
}

// --- Tick -----------------------------------------------------------------

/** Der Klick-Button. Die einzige Aktion, die es in Minute eins gibt. */
export function releaseOxygen(): void {
  addOxygen(clickGain())
  planet.clicks++
  meta.stats.totalClicks += 1
}

/**
 * Zentraler O₂-Zufluss. Produktion speist vier Töpfe gleichzeitig: den
 * ausgebbaren Vorrat, die Planetenstatistik, die tatsächliche Luft und die
 * Biomasse. Nur der Vorrat wird durch Käufe wieder kleiner (§6 in CLAUDE.md).
 */
export function addOxygen(amount: Decimal): void {
  planet.oxygen = planet.oxygen.add(amount)
  planet.oxygenTotal = planet.oxygenTotal.add(amount)
  planet.airO2 = planet.airO2.add(amount)
  planet.biomass = planet.biomass.add(amount)
  meta.stats.totalOxygen = meta.stats.totalOxygen.add(amount)
}

export function productionSystem(dt: number): void {
  const def = currentPlanetDef()
  const o2Rate = currentO2Rate()

  const o2 = o2Rate.mul(dt)
  if (o2.gt(0)) addOxygen(o2)

  // N₂ landet nur in der Luft: es ist Puffer, keine Kaufkraft.
  const n2 = currentN2Rate().mul(dt)
  if (n2.gt(0)) planet.airN2 = planet.airN2.add(n2)

  // Schadstoffe als Nebenprodukt der eigenen Anlagen. Sie stehen hier und
  // nicht in atmosphere.ts, weil dieses System die Produktionsrate ohnehin
  // kennt — und weil die Fiktion dieselbe ist: der Dreck kommt aus den
  // Türmen, die auch den Sauerstoff machen.
  if (def.maxPollution !== undefined && o2Rate.gt(0)) {
    const dirt = o2Rate.mul(def.pollutionPerO2 * eventEffects().pollution).mul(dt)
    planet.pollution = planet.pollution.add(dirt)
  }

  // Wäscher arbeiten anteilig statt absolut. Dadurch pendelt sich der
  // Schadstoffanteil unabhängig vom Maßstab der Atmosphäre ein.
  if (planet.pollution.gt(0)) {
    const scrubbed = currentScrubRate().mul(dt).toNumber()
    if (scrubbed > 0) planet.pollution = planet.pollution.mul(Math.max(0, 1 - scrubbed))
  }
}
