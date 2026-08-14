import Decimal from 'break_infinity.js'
import {
  GENERATORS,
  findGenerator,
  type GasKind,
  type GeneratorDef,
  type SupplyKind,
} from '../data/generators'
import { UPGRADES, findUpgrade } from '../data/upgrades'
import { currentPlanetDef, generatorCount, hasUpgrade, planet } from '../state/planet.svelte'
import { meta } from '../state/meta.svelte'
import { addMaterial, affordableCount, canAffordMaterials, spendMaterials } from '../state/run.svelte'
import { play } from '../engine/audio'
import { achievementEffects } from './achievements'
import { fireThrottle, n2Percent } from './atmosphere'
import { enforceStaffLimit, laborFactor, unassigned } from './labor'
import { eventEffects } from './eventEffects'
import { WOOD_PER_TREE, forestO2Rate, forestRoom } from './forest'
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
  /** Zusätzlich je nach Gasart — hier wirken Forschung und Techniker. */
  byGas: Record<GasKind, Decimal>
  /** Zusätzlich je nach Ausgabeart — hier wirken die übrigen Berufe. */
  byKind: Record<'plant' | 'fell' | 'material' | 'supply' | 'housing', Decimal>
  perGenerator: Record<string, Decimal>
}

function collectMultipliers(): Multipliers {
  const mEffects = metaEffects()
  const rEffects = researchEffects()
  const events = eventEffects()

  const aEffects = achievementEffects()
  const m: Multipliers = {
    click: mEffects.clickPower.mul(rEffects.clickPower).mul(aEffects.clickPower).mul(BASE_CLICK),
    global: mEffects.globalProduction
      .mul(rEffects.globalProduction)
      .mul(aEffects.globalProduction)
      .mul(workforceMultiplier())
      .mul(events.production)
      .mul(fireThrottle()),
    byGas: {
      o2: rEffects.o2Yield,
      n2: rEffects.n2Yield,
      scrub: rEffects.scrubYield,
      vent: new Decimal(1),
    },
    byKind: {
      plant: new Decimal(1),
      fell: new Decimal(1),
      material: new Decimal(1),
      supply: new Decimal(1),
      // Wohnraum ist eine Kapazität und wird bewusst nirgends multipliziert.
      housing: new Decimal(1),
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
  // Lahmgelegte Anlagen zählen nicht mit. Ohne diese eine Zeile wäre die
  // Sabotage der Anoxen (§7) reine Kosmetik — sie *ist* der Angriff.
  const count = Math.max(0, generatorCount(def.id) - (planet.disabled[def.id] ?? 0))
  if (count <= 0) return new Decimal(0)

  /*
   * Arbeitskraft (§17). Eine Anlage mit Plätzen produziert nichts, solange
   * niemand zugewiesen ist — nicht weniger, nichts. Das ist die eine Zeile,
   * die Bevölkerung vom Multiplikator zur Voraussetzung macht.
   */
  const labor = laborFactor(def)
  if (labor <= 0) return new Decimal(0)

  const m = collectMultipliers()
  // Forschungsboni gelten je Gasart; Abbau und Wald hängen bislang nur an
  // den globalen Faktoren.
  const specific =
    def.output.kind === 'gas' ? m.byGas[def.output.gas] : m.byKind[def.output.kind]
  return new Decimal(def.baseRate)
    .mul(count)
    .mul(m.perGenerator[def.id] ?? 1)
    .mul(specific)
    .mul(m.global)
    .mul(labor)
}

function rateForGas(gas: GasKind): Decimal {
  let total = new Decimal(0)
  for (const def of GENERATORS) {
    if (def.output.kind === 'gas' && def.output.gas === gas) {
      total = total.add(generatorRate(def))
    }
  }
  return total
}

/** Summe aller Anlagen mit dieser Ausgabeart. */
function rateForKind(kind: 'plant' | 'fell'): Decimal {
  let total = new Decimal(0)
  for (const def of GENERATORS) {
    if (def.output.kind === kind) total = total.add(generatorRate(def))
  }
  return total
}

/** Bäume pro Sekunde, die gepflanzt werden. */
export function plantingRate(): Decimal {
  return rateForKind('plant')
}

/** Bäume pro Sekunde, die gefällt werden — begrenzt durch den Bestand. */
export function fellingRate(): Decimal {
  return rateForKind('fell')
}

/** Nahrung bzw. Wasser pro Sekunde. */
export function supplyRate(supply: SupplyKind): Decimal {
  let total = new Decimal(0)
  for (const def of GENERATORS) {
    if (def.output.kind === 'supply' && def.output.supply === supply) {
      total = total.add(generatorRate(def))
    }
  }
  return total
}

/**
 * Material pro Sekunde, das ins Lager fließt.
 *
 * Holz zählt hier mit, obwohl es nicht abgebaut, sondern gefällt wird —
 * fürs Lager ist der Unterschied egal, und eine Zeile ohne Rate, während
 * sichtbar Holz hereinkommt, wäre schlicht falsch. Gefällt wird nur, solange
 * Bäume stehen.
 */
export function materialRate(material: string): Decimal {
  let total = new Decimal(0)
  for (const def of GENERATORS) {
    if (def.output.kind === 'material' && def.output.material === material) {
      total = total.add(generatorRate(def))
    }
  }
  if (material === 'holz' && planet.trees.gt(0)) {
    total = total.add(Decimal.min(fellingRate(), planet.trees).mul(WOOD_PER_TREE))
  }
  return total
}

/**
 * O₂ pro Sekunde, vor Verbrauch und Bränden.
 *
 * Der Wald zählt mit: er ist eine echte O₂-Quelle, und sonst würde die
 * Netto-Anzeige der Bevölkerung sowie der Sofortbonus aus Ereignissen ihn
 * schlicht übersehen.
 */
export function currentO2Rate(): Decimal {
  return rateForGas('o2').add(forestO2Rate())
}

/** N₂ pro Sekunde. Geht ausschließlich in die Luft, nie in den Vorrat. */
export function currentN2Rate(): Decimal {
  return rateForGas('n2')
}

/** Anteil der Schadstoffe, der pro Sekunde abgebaut wird. */
export function currentScrubRate(): Decimal {
  return rateForGas('scrub')
}

/** Anteil des N₂-Puffers, der pro Sekunde abgeblasen wird. */
export function currentVentRate(): Decimal {
  return rateForGas('vent')
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
    .mul(achievementEffects().buildCost)
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

/** Wie viele Stück das aktuelle Guthaben hergibt — O₂ *und* Material. */
export function maxAffordable(def: GeneratorDef): number {
  const g = def.costGrowth
  const first = firstUnitCost(def)
  if (planet.oxygen.lt(first)) return 0

  // k = log_g( 1 + guthaben × (g−1) / erstesStück )
  const ratio = planet.oxygen.mul(g - 1).div(first).add(1)
  const byOxygen = Math.floor(ratio.log10() / Math.log10(g))

  // Material bremst flach, deckelt „Max" aber genauso hart.
  return Math.min(byOxygen, affordableCount(def.materialCost))
}

/** Upgrade-Preis, ebenfalls nach Forschungsrabatt. */
export function upgradeCost(id: string): Decimal {
  const def = findUpgrade(id)
  if (!def) return new Decimal(0)
  return new Decimal(def.cost).mul(researchEffects().buildCost)
    .mul(achievementEffects().buildCost)
}

// --- Käufe ----------------------------------------------------------------

/**
 * Führt der aktuelle Planet die Mechanik, an der diese Anlage arbeitet?
 *
 * Gehört hierher und nicht nur in die UI: sonst könnte ein Konsolenaufruf —
 * oder später ein Auto-Käufer — einen Steinbruch auf einem Planeten bauen,
 * der gar keinen Stein hat, und der würde dann fröhlich fördern.
 */
export function isAvailable(def: GeneratorDef): boolean {
  const planetDef = currentPlanetDef()
  // Eine ausdrückliche Bindung schlägt jede Ableitung aus der Ausgabe.
  if (def.planets && !def.planets.includes(planetDef.id)) return false

  const out = def.output
  switch (out.kind) {
    case 'gas':
      // Das Ventil gehört überall dorthin, wo es einen Puffer gibt — sonst
      // wäre zu viel N₂ ein Schaden ohne Ausweg.
      if (out.gas === 'n2' || out.gas === 'vent') return planetDef.n2Window !== undefined
      if (out.gas === 'scrub') return planetDef.maxPollution !== undefined
      return true
    case 'material':
      return planetDef.materials.includes(out.material)
    case 'plant':
      return planetDef.forestCapacity > 0
    case 'fell':
      // Fällen setzt voraus, dass Holz hier überhaupt ein Rohstoff ist.
      // Auf Aurora wächst der Wald, aber niemand schlägt ihn — dort ist er
      // reiner Gewinn, und die Abwägung lernt man erst auf Vesta (§11).
      return planetDef.forestCapacity > 0 && planetDef.materials.includes('holz')
    case 'supply':
    case 'housing':
      // Versorgung und Wohnraum gibt es nur, wo überhaupt jemand wohnt.
      return planetDef.allowsPopulation
  }
}

export function buyGenerator(id: string, amount: number): boolean {
  const def = findGenerator(id)
  if (!def || amount < 1) return false
  if (!isAvailable(def)) return false

  const cost = generatorCost(def, amount)
  if (planet.oxygen.lt(cost)) return false
  // Alle drei Preise müssen stimmen, bevor irgendetwas abgebucht wird — sonst
  // wäre O₂ weg und die Anlage stünde trotzdem nicht.
  if (!canAffordMaterials(def.materialCost, amount)) return false
  const people = (def.populationCost ?? 0) * amount
  if (people > 0 && unassigned().lt(people)) return false

  planet.oxygen = planet.oxygen.sub(cost)
  spendMaterials(def.materialCost, amount)
  // Die Leute ziehen ein und stehen nie wieder zur Verfügung.
  if (people > 0) planet.bound = planet.bound.add(people)
  planet.generators[id] = generatorCount(id) + amount
  play('buy')
  return true
}

/**
 * Abreißen (§17).
 *
 * Seit Zuwanderung automatisch passiert, ist die Kolonie sonst eine
 * Einbahnstraße: mehr Wohnraum heißt mehr Menschen heißt mehr Verbrauch, und
 * es gäbe keinen Weg zurück. Abriss ist damit kein Komfort, sondern das
 * Gegenstück, das CLAUDE.md für jede dauerhaft *erhöhende* Anlage verlangt —
 * dieselbe Regel wie Wäscher für Schadstoffe und Ventil für N₂.
 *
 * **Ohne Rückerstattung.** Wer abreißt, will Last loswerden, nicht Geld
 * zurück. Eine Erstattung würde außerdem Bauen und Abreißen zu einer
 * Rechenaufgabe machen, statt zu einer Entscheidung über die Kolonie.
 *
 * Verbaute Menschen kommen dagegen zurück — sie sind nicht verbraucht,
 * sondern gebunden gewesen.
 */
export function canDemolish(id: string): boolean {
  return generatorCount(id) > 0
}

export function demolish(id: string, amount = 1): boolean {
  const def = findGenerator(id)
  if (!def || !canDemolish(id)) return false

  const weg = Math.min(amount, generatorCount(id))
  const rest = generatorCount(id) - weg
  if (rest > 0) planet.generators[id] = rest
  else delete planet.generators[id]

  if (def.populationCost) {
    planet.bound = planet.bound.sub(def.populationCost * weg)
    if (planet.bound.lt(0)) planet.bound = new Decimal(0)
  }

  // Lahmgelegte Stück dürfen nicht mehr sein als vorhandene, und an
  // verschwundenen Plätzen kann niemand mehr stehen.
  const aus = planet.disabled[id] ?? 0
  if (aus > rest) {
    if (rest > 0) planet.disabled[id] = rest
    else delete planet.disabled[id]
  }
  enforceStaffLimit()
  return true
}

export function buyUpgrade(id: string): boolean {
  const def = findUpgrade(id)
  if (!def || hasUpgrade(id)) return false

  const cost = upgradeCost(id)
  if (planet.oxygen.lt(cost)) return false

  planet.oxygen = planet.oxygen.sub(cost)
  planet.upgrades = [...planet.upgrades, id]
  play('upgrade')
  return true
}

// --- Tick -----------------------------------------------------------------

/** Der Klick-Button. Die einzige Aktion, die es in Minute eins gibt. */
export function releaseOxygen(): void {
  addOxygen(clickGain())
  play('click')
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

  /* --- Wald ---------------------------------------------------------------
     Erst pflanzen, dann fällen. Andersherum könnte ein Sägewerk Bäume
     abräumen, die im selben Tick noch gar nicht standen.
  ---------------------------------------------------------------------- */
  if (def.forestCapacity > 0) {
    const planted = Decimal.min(plantingRate().mul(dt), forestRoom())
    if (planted.gt(0)) planet.trees = planet.trees.add(planted)
  }

  if (planet.trees.gt(0)) {
    // Nie mehr fällen als steht — sonst entstünde Holz aus dem Nichts.
    const felled = Decimal.min(fellingRate().mul(dt), planet.trees)
    if (felled.gt(0)) {
      planet.trees = planet.trees.sub(felled)
      addMaterial('holz', felled.mul(WOOD_PER_TREE))
    }
  }

  // Abbau: alles, was direkt ins globale Lager geht.
  for (const gen of GENERATORS) {
    if (gen.output.kind !== 'material') continue
    const gained = generatorRate(gen).mul(dt)
    if (gained.gt(0)) addMaterial(gen.output.material, gained)
  }

  // Versorgung bleibt auf dem Planeten — verbraucht wird sie in population.ts.
  if (def.allowsPopulation) {
    const food = supplyRate('food').mul(dt)
    if (food.gt(0)) planet.food = planet.food.add(food)
    const water = supplyRate('water').mul(dt)
    if (water.gt(0)) planet.water = planet.water.add(water)
  }

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

  /*
   * Abblasen — und zwar nur oberhalb des Fensters.
   *
   * Ein Ventil, das stur läuft, erzeugt exakt dasselbe Problem in die andere
   * Richtung: es zieht den Puffer auf null, das O₂ wird nicht mehr verdünnt
   * und steht plötzlich über dem Fenster. Gemessen: N₂ 0 %, O₂ 26,8 %, Planet
   * unabschließbar. Als Regler statt als Abfluss kann es nur retten, nie
   * schaden — es schließt von selbst, sobald der Puffer wieder im Ziel ist.
   */
  const n2Max = def.n2Window?.max
  if (n2Max !== undefined && planet.airN2.gt(0) && n2Percent() > n2Max) {
    const vented = currentVentRate().mul(dt).toNumber()
    if (vented > 0) planet.airN2 = planet.airN2.mul(Math.max(0, 1 - vented))
  }
}
