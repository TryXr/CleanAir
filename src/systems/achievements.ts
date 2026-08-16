import Decimal from 'break_infinity.js'
import { ACHIEVEMENTS, type Condition } from '../data/achievements'
import { play } from '../engine/audio'
import { addLog } from '../state/log.svelte'
import { meta } from '../state/meta.svelte'
import { grantFromAchievement } from './blueprints'
import { planet } from '../state/planet.svelte'
import { materialAmount } from '../state/run.svelte'
import { inhabitedPlanets, totalSettlers } from './travel'

/**
 * Achievements (DESIGN.md §10).
 *
 * Dasselbe Muster wie metaEffects.ts und researchEffects: alle
 * freigeschalteten Boni laufen an genau einer Stelle zusammen, statt sich
 * über die Systeme zu verteilen (§13).
 *
 * Die Prüfung läuft im Tick mit. Das sind ein paar Zahlenvergleiche pro
 * Sekunde — billiger als jede Buchhaltung, die sich merken müsste, wann
 * etwas zuletzt geprüft wurde.
 */
export interface AchievementEffects {
  globalProduction: Decimal
  clickPower: Decimal
  researchYield: number
  popCapacity: number
  /** Faktor auf Baukosten: 0.9 heißt 10 % billiger. */
  buildCost: number
  defenseDamage: number
}

export function isUnlocked(id: string): boolean {
  return meta.achievements.includes(id)
}

export function achievementEffects(): AchievementEffects {
  const e: AchievementEffects = {
    globalProduction: new Decimal(1),
    clickPower: new Decimal(1),
    researchYield: 1,
    popCapacity: 1,
    buildCost: 1,
    defenseDamage: 1,
  }

  for (const def of ACHIEVEMENTS) {
    if (!isUnlocked(def.id)) continue
    const effect = def.effect
    switch (effect.kind) {
      case 'globalProduction':
        e.globalProduction = e.globalProduction.mul(effect.factor)
        break
      case 'clickPower':
        e.clickPower = e.clickPower.mul(effect.factor)
        break
      case 'researchYield':
        e.researchYield *= effect.factor
        break
      case 'popCapacity':
        e.popCapacity *= effect.factor
        break
      case 'buildCost':
        e.buildCost *= 1 - effect.reduction
        break
      case 'defenseDamage':
        e.defenseDamage *= effect.factor
        break
    }
  }

  return e
}

/**
 * Wie viele Planeten dieses Durchlaufs gerade bewohnt sind.
 *
 * Der aktive Planet lebt in `planet`, alle anderen als Momentaufnahme in
 * `run.planets` — deshalb muss hier beides gezählt werden (§16).
 */

function isMet(c: Condition): boolean {
  switch (c.kind) {
    case 'totalOxygen':
      return meta.stats.totalOxygen.gte(c.atLeast)
    case 'clicks':
      return meta.stats.totalClicks >= c.atLeast
    case 'planetsCompleted':
      return meta.planetsCompleted >= c.atLeast
    case 'runs':
      return meta.stats.runs >= c.atLeast
    case 'population':
      // Alle Planeten des Laufs, nicht nur der, auf dem man gerade steht —
      // sonst wäre ein Erfolg über Bevölkerung dadurch zu verlieren, dass man
      // weiterfliegt (M24, systems/travel.ts).
      return meta.population.add(totalSettlers()).gte(c.atLeast)
    case 'research':
      return meta.research.gte(c.atLeast)
    case 'cores':
      return meta.genesisCores.gte(c.atLeast)
    case 'material':
      return materialAmount(c.material).gte(c.atLeast)
    case 'trees':
      return planet.trees.gte(c.atLeast)
    case 'wavesRepelled':
      return meta.stats.wavesRepelled >= c.atLeast
    case 'abilitiesUsed':
      return meta.stats.abilitiesUsed >= c.atLeast
    case 'eventsHandled':
      return meta.stats.eventsHandled >= c.atLeast
    case 'fires':
      return meta.stats.fires >= c.atLeast
    case 'inhabitedPlanets':
      return inhabitedPlanets() >= c.atLeast
  }
}

/** Für die Anzeige: 0…1, wie weit die Bedingung erfüllt ist. */
export function progressOf(c: Condition): number {
  const anteil = (ist: number, soll: number) => (soll <= 0 ? 1 : Math.min(1, ist / soll))
  switch (c.kind) {
    case 'totalOxygen':
      return anteil(meta.stats.totalOxygen.toNumber(), c.atLeast)
    case 'clicks':
      return anteil(meta.stats.totalClicks, c.atLeast)
    case 'planetsCompleted':
      return anteil(meta.planetsCompleted, c.atLeast)
    case 'runs':
      return anteil(meta.stats.runs, c.atLeast)
    case 'population':
      return anteil(meta.population.add(totalSettlers()).toNumber(), c.atLeast)
    case 'research':
      return anteil(meta.research.toNumber(), c.atLeast)
    case 'cores':
      return anteil(meta.genesisCores.toNumber(), c.atLeast)
    case 'material':
      return anteil(materialAmount(c.material).toNumber(), c.atLeast)
    case 'trees':
      return anteil(planet.trees.toNumber(), c.atLeast)
    case 'wavesRepelled':
      return anteil(meta.stats.wavesRepelled, c.atLeast)
    case 'abilitiesUsed':
      return anteil(meta.stats.abilitiesUsed, c.atLeast)
    case 'eventsHandled':
      return anteil(meta.stats.eventsHandled, c.atLeast)
    case 'fires':
      return anteil(meta.stats.fires, c.atLeast)
    case 'inhabitedPlanets':
      return anteil(inhabitedPlanets(), c.atLeast)
  }
}

export function achievementsSystem(_dt: number): void {
  for (const def of ACHIEVEMENTS) {
    if (isUnlocked(def.id)) continue
    if (!isMet(def.condition)) continue

    meta.achievements = [...meta.achievements, def.id]
    addLog(`${def.name} — ${def.reward}.`, 'good')
    // Wer etwas geschafft hat, hat sich etwas verdient (M20, §20.1).
    grantFromAchievement(def.id)
    play('achievement')
  }
}

/** Wie viele von wie vielen. Für die Panel-Überschrift. */
export function achievementCount(): { erreicht: number; gesamt: number } {
  return { erreicht: meta.achievements.length, gesamt: ACHIEVEMENTS.length }
}
