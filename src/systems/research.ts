import Decimal from 'break_infinity.js'
import { RESEARCH, findResearch, type ResearchDef } from '../data/research'
import { addLog } from '../state/log.svelte'
import { meta } from '../state/meta.svelte'
import { usesNitrogen, usesPollution } from '../state/planet.svelte'

/**
 * Forschung (DESIGN.md §10).
 *
 * Gleiches Prinzip wie metaEffects.ts: alle gekauften Stufen werden an
 * genau einer Stelle zu einem Satz Faktoren ausmultipliziert. Produktion,
 * Bevölkerung und Atmosphäre lesen hier, statt jeweils selbst durch den
 * Baum zu laufen (§13).
 */
export interface ResearchEffects {
  o2Yield: Decimal
  n2Yield: Decimal
  scrubYield: Decimal
  globalProduction: Decimal
  clickPower: Decimal
  workforce: number
  /** Faktor auf alle Baukosten: 0.7 heißt 30 % billiger. */
  buildCost: number
  lifeSupport: number
  growthRate: number
  popCapacity: number
  researchYield: number
  /** Prozentpunkte, um die das O₂-Fenster je Seite weiter wird. */
  o2Widen: number
  stabilitySpeed: number
}

export function researchLevel(id: string): number {
  return meta.researchNodes[id] ?? 0
}

export function researchEffects(): ResearchEffects {
  const e: ResearchEffects = {
    o2Yield: new Decimal(1),
    n2Yield: new Decimal(1),
    scrubYield: new Decimal(1),
    globalProduction: new Decimal(1),
    clickPower: new Decimal(1),
    workforce: 1,
    buildCost: 1,
    lifeSupport: 1,
    growthRate: 1,
    popCapacity: 1,
    researchYield: 1,
    o2Widen: 0,
    stabilitySpeed: 1,
  }

  for (const def of RESEARCH) {
    const level = researchLevel(def.id)
    if (level <= 0) continue
    const effect = def.effect

    switch (effect.kind) {
      case 'o2Yield':
        e.o2Yield = e.o2Yield.mul(Math.pow(effect.factor, level))
        break
      case 'n2Yield':
        e.n2Yield = e.n2Yield.mul(Math.pow(effect.factor, level))
        break
      case 'scrubYield':
        e.scrubYield = e.scrubYield.mul(Math.pow(effect.factor, level))
        break
      case 'globalProduction':
        e.globalProduction = e.globalProduction.mul(Math.pow(effect.factor, level))
        break
      case 'clickPower':
        e.clickPower = e.clickPower.mul(Math.pow(effect.factor, level))
        break
      case 'workforce':
        e.workforce *= Math.pow(effect.factor, level)
        break
      case 'buildCost':
        e.buildCost *= Math.pow(1 - effect.reduction, level)
        break
      case 'lifeSupport':
        e.lifeSupport *= Math.pow(1 - effect.reduction, level)
        break
      case 'growthRate':
        e.growthRate *= Math.pow(effect.factor, level)
        break
      case 'popCapacity':
        e.popCapacity *= Math.pow(effect.factor, level)
        break
      case 'researchYield':
        e.researchYield *= Math.pow(effect.factor, level)
        break
      case 'o2Window':
        e.o2Widen += effect.widen * level
        break
      case 'stabilitySpeed':
        e.stabilitySpeed *= Math.pow(effect.factor, level)
        break
    }
  }

  return e
}

// --- Kauf -----------------------------------------------------------------

/** Kosten der *nächsten* Stufe. */
export function researchCost(def: ResearchDef): Decimal {
  return new Decimal(def.baseCost).mul(Decimal.pow(def.costGrowth, researchLevel(def.id)))
}

/** Sind alle Vorgängerknoten mindestens auf Stufe 1? */
export function researchUnlocked(def: ResearchDef): boolean {
  if (!def.requires) return true
  return def.requires.every((id) => researchLevel(id) > 0)
}

/**
 * Sichtbar heißt nicht kaufbar. Gesperrte Knoten bleiben stehen und nennen
 * ihre Voraussetzung — ein Baum, dessen Äste erst beim Betreten erscheinen,
 * ist kein Baum, sondern eine Überraschung.
 *
 * Ausgeblendet wird nur, was auf diesem Planeten gar keinen Sinn ergibt:
 * Stickstoff-Forschung auf einem Planeten ohne Puffer. Bereits erforschte
 * Stufen bleiben sichtbar, sonst verschwände der Fortschritt beim
 * Rücksprung nach Aurora.
 */
export function researchVisible(def: ResearchDef): boolean {
  if (researchLevel(def.id) > 0) return true
  if (def.needs === 'nitrogen' && !usesNitrogen()) return false
  if (def.needs === 'pollution' && !usesPollution()) return false
  return true
}

export function canBuyResearch(id: string): boolean {
  const def = findResearch(id)
  if (!def) return false
  if (researchLevel(id) >= def.maxLevel) return false
  if (!researchUnlocked(def)) return false
  return meta.research.gte(researchCost(def))
}

export function buyResearch(id: string): boolean {
  const def = findResearch(id)
  if (!def || !canBuyResearch(id)) return false

  meta.research = meta.research.sub(researchCost(def))
  const level = researchLevel(id) + 1
  meta.researchNodes = { ...meta.researchNodes, [id]: level }
  addLog(`${def.name} auf Stufe ${level} erforscht.`, 'good')
  return true
}
