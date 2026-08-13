import Decimal from 'break_infinity.js'
import { JOBS, findJob, type JobDef } from '../data/jobs'
import { addLog } from '../state/log.svelte'
import { currentPlanetDef, planet } from '../state/planet.svelte'
import { canAffordMaterials, spendMaterials } from '../state/run.svelte'

/**
 * Berufe (DESIGN.md §16).
 *
 * Dasselbe Muster wie metaEffects.ts und research.ts: die Zuweisungen werden
 * an genau einer Stelle zu Faktoren ausmultipliziert, und production.ts liest
 * hier, statt selbst durch die Berufsliste zu laufen (§13).
 */
export interface JobEffects {
  planting: number
  mining: number
  gas: number
  supply: number
}

export function jobCount(id: string): number {
  return planet.jobs[id] ?? 0
}

/** Menschen in Berufen. */
export function employed(): Decimal {
  let total = 0
  for (const def of JOBS) total += jobCount(def.id)
  return new Decimal(total)
}

/**
 * Freie Leute — weder in einem Beruf noch von einem Gebäude verschluckt.
 * Nur sie lassen sich neu zuweisen.
 */
export function freePopulation(): Decimal {
  const free = planet.settlers.sub(planet.bound).sub(employed())
  return free.lt(0) ? new Decimal(0) : free
}

export function jobEffects(): JobEffects {
  const e: JobEffects = { planting: 1, mining: 1, gas: 1, supply: 1 }
  for (const def of JOBS) {
    const count = jobCount(def.id)
    if (count <= 0) continue
    const bonus = def.perWorker * count
    switch (def.effect.kind) {
      case 'planting':
        e.planting += bonus
        break
      case 'mining':
        e.mining += bonus
        break
      case 'gas':
        e.gas += bonus
        break
      case 'supply':
        e.supply += bonus
        break
    }
  }
  return e
}

/** Führt der Planet die Mechanik, an der dieser Beruf ansetzt? */
export function jobVisible(def: JobDef): boolean {
  if (jobCount(def.id) > 0) return true
  const planetDef = currentPlanetDef()
  if (def.needs === 'forest') return planetDef.forestCapacity > 0
  if (def.needs === 'materials') return planetDef.materials.length > 0
  return planetDef.allowsPopulation
}

export function canHire(id: string, amount = 1): boolean {
  const def = findJob(id)
  if (!def || amount < 1) return false
  if (freePopulation().lt(amount)) return false
  return canAffordMaterials(def.hireCost, amount)
}

export function hire(id: string, amount = 1): boolean {
  const def = findJob(id)
  if (!def || !canHire(id, amount)) return false

  spendMaterials(def.hireCost, amount)
  planet.jobs = { ...planet.jobs, [id]: jobCount(id) + amount }
  return true
}

/**
 * Freistellen gibt die Leute zurück, aber nicht das Material — sonst wäre
 * Umverteilen kostenlos und damit keine Entscheidung.
 */
export function dismiss(id: string, amount = 1): boolean {
  const current = jobCount(id)
  if (current <= 0) return false

  const taken = Math.min(current, amount)
  planet.jobs = { ...planet.jobs, [id]: current - taken }
  return true
}

/**
 * Wenn die Bevölkerung schrumpft, können mehr Leute zugewiesen sein als
 * überhaupt leben. Dann müssen Berufe geräumt werden — sonst stünden
 * Bonuseffekte von Toten.
 */
export function enforceJobLimit(): void {
  const available = planet.settlers.sub(planet.bound)
  let assigned = employed()
  if (assigned.lte(available)) return

  const next = { ...planet.jobs }
  for (const def of JOBS) {
    if (assigned.lte(available)) break
    const count = next[def.id] ?? 0
    if (count <= 0) continue
    const excess = assigned.sub(available)
    const remove = Math.min(count, Math.ceil(excess.toNumber()))
    next[def.id] = count - remove
    assigned = assigned.sub(remove)
  }
  planet.jobs = next
  addLog('Es fehlen Leute — Stellen mussten geräumt werden.', 'warn')
}
