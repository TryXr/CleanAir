import Decimal from 'break_infinity.js'
import { META_UPGRADES } from '../data/metaUpgrades'
import { readDecimal, readInt, readNumber, writeDecimal } from '../engine/serialize'

/**
 * META — überlebt jeden Planetenwechsel.
 *
 * Hinweis zu Decimal in $state: Svelte proxied nur Objekte und Arrays,
 * keine Klasseninstanzen. Decimals also immer *ersetzen*
 * (`meta.credits = meta.credits.add(x)`), nie in-place mutieren.
 */
export const meta = $state({
  genesisCores: new Decimal(0),
  population: new Decimal(0),
  credits: new Decimal(0),
  research: new Decimal(0),

  /** ids gekaufter Meta-Upgrades. Der Baum aus DESIGN.md §6. */
  metaUpgrades: [] as string[],

  planetsCompleted: 0,
  /** Gesamte gespielte Zeit in Sekunden, inkl. angerechneter Offline-Zeit. */
  totalPlaytime: 0,
  firstStarted: Date.now(),
})

export function hasMetaUpgrade(id: string): boolean {
  return meta.metaUpgrades.includes(id)
}

export type MetaState = typeof meta

export function serializeMeta() {
  return {
    genesisCores: writeDecimal(meta.genesisCores),
    population: writeDecimal(meta.population),
    credits: writeDecimal(meta.credits),
    research: writeDecimal(meta.research),
    metaUpgrades: [...meta.metaUpgrades],
    planetsCompleted: meta.planetsCompleted,
    totalPlaytime: meta.totalPlaytime,
    firstStarted: meta.firstStarted,
  }
}

export function deserializeMeta(raw: unknown): void {
  const s = (raw ?? {}) as Record<string, unknown>
  meta.genesisCores = readDecimal(s.genesisCores, 0)
  meta.population = readDecimal(s.population, 0)
  meta.credits = readDecimal(s.credits, 0)
  meta.research = readDecimal(s.research, 0)
  // Nur bekannte ids übernehmen, damit ein Save aus einer Version mit
  // anderem Baum keine Geister-Knoten einschleppt.
  const savedUpgrades = Array.isArray(s.metaUpgrades) ? s.metaUpgrades : []
  meta.metaUpgrades = META_UPGRADES.filter((u) => savedUpgrades.includes(u.id)).map((u) => u.id)

  meta.planetsCompleted = readInt(s.planetsCompleted, 0)
  meta.totalPlaytime = readNumber(s.totalPlaytime, 0)
  meta.firstStarted = readNumber(s.firstStarted, Date.now())
}
