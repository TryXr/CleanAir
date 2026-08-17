import Decimal from 'break_infinity.js'
import { META_UPGRADES } from '../data/metaUpgrades'
import { meta } from '../state/meta.svelte'

/**
 * Sammelt alle gekauften Meta-Upgrades zu einem Satz Faktoren.
 *
 * Dasselbe Prinzip wie bei der Produktion (DESIGN.md §13): Effekte werden an
 * genau einer Stelle ausmultipliziert. Produktion und Bevölkerung lesen hier,
 * statt jeweils selbst durch den Baum zu laufen.
 */
export interface MetaEffects {
  /** O₂ im Speicher beim Betreten eines neuen Planeten. */
  startingOxygen: Decimal
  globalProduction: Decimal
  clickPower: Decimal
  /** Faktor auf den Pro-Kopf-Verbrauch: 0.45 heißt 55 % gespart. */
  lifeSupport: number
  growthRate: number
  popCapacity: number
  /** Verstärkt den Arbeitskraft-Bonus, nicht die Produktion direkt. */
  workforce: number
}

export function metaEffects(): MetaEffects {
  const e: MetaEffects = {
    startingOxygen: new Decimal(0),
    globalProduction: new Decimal(1),
    clickPower: new Decimal(1),
    lifeSupport: 1,
    growthRate: 1,
    popCapacity: 1,
    workforce: 1,
  }

  for (const upgrade of META_UPGRADES) {
    if (!meta.metaUpgrades.includes(upgrade.id)) continue
    const effect = upgrade.effect

    switch (effect.kind) {
      case 'startingOxygen':
        e.startingOxygen = e.startingOxygen.add(effect.amount)
        break
      case 'globalProduction':
        e.globalProduction = e.globalProduction.mul(effect.factor)
        break
      case 'clickPower':
        e.clickPower = e.clickPower.mul(effect.factor)
        break
      case 'lifeSupport':
        e.lifeSupport *= 1 - effect.reduction
        break
      case 'growthRate':
        e.growthRate *= effect.factor
        break
      case 'popCapacity':
        e.popCapacity *= effect.factor
        break
      case 'workforce':
        e.workforce *= effect.factor
        break
    }
  }

  return e
}

/** Sind alle Voraussetzungen eines Knotens erfüllt? */
export function metaRequirementsMet(id: string): boolean {
  const def = META_UPGRADES.find((u) => u.id === id)
  if (!def?.requires) return true
  return def.requires.every((req) => meta.metaUpgrades.includes(req))
}
