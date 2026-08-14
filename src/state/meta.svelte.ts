import Decimal from 'break_infinity.js'
import { META_UPGRADES } from '../data/metaUpgrades'
import { RESEARCH } from '../data/research'
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
  /** Forschungsknoten -> erreichte Stufe. Der Tech-Baum aus §10. */
  researchNodes: {} as Record<string, number>,

  planetsCompleted: 0,
  /** Gesamte gespielte Zeit in Sekunden, inkl. angerechneter Offline-Zeit. */
  totalPlaytime: 0,
  firstStarted: Date.now(),

  /**
   * Reine Statistik für das Panel aus M3. Nichts hiervon fließt je in eine
   * Spielformel zurück — sonst wäre es Zustand und keine Statistik.
   */
  stats: {
    /** Jemals produziertes O₂, über alle Planeten hinweg. */
    totalOxygen: new Decimal(0),
    totalClicks: 0,
    eventsSeen: 0,
    /** Davon per Klick-Reaktion beantwortet. */
    eventsHandled: 0,
    /** Wie oft ein Planet in Brand geraten ist. */
    fires: 0,
    /** Schnellster Planetenabschluss in Sekunden. 0 = noch keiner. */
    bestPlanetSeconds: 0,
    /** Abgeschlossene Durchläufe (§16). */
    runs: 0,

    /** Anoxen (§7). */
    wavesSeen: 0,
    wavesRepelled: 0,
    abilitiesUsed: 0,
    settlersLost: 0,
  },
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
    researchNodes: { ...meta.researchNodes },
    planetsCompleted: meta.planetsCompleted,
    totalPlaytime: meta.totalPlaytime,
    firstStarted: meta.firstStarted,
    stats: {
      totalOxygen: writeDecimal(meta.stats.totalOxygen),
      totalClicks: meta.stats.totalClicks,
      eventsSeen: meta.stats.eventsSeen,
      eventsHandled: meta.stats.eventsHandled,
      fires: meta.stats.fires,
      bestPlanetSeconds: meta.stats.bestPlanetSeconds,
      runs: meta.stats.runs,
      wavesSeen: meta.stats.wavesSeen,
      wavesRepelled: meta.stats.wavesRepelled,
      abilitiesUsed: meta.stats.abilitiesUsed,
      settlersLost: meta.stats.settlersLost,
    },
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

  // Dasselbe für die Forschung, zusätzlich auf die aktuelle Maximalstufe
  // begrenzt: ein Knoten, der später gekürzt wird, darf keinen Überhang
  // aus einem alten Save mitschleppen.
  const savedNodes = (s.researchNodes ?? {}) as Record<string, unknown>
  const nodes: Record<string, number> = {}
  for (const def of RESEARCH) {
    const level = Math.floor(readNumber(savedNodes[def.id], 0))
    if (level > 0) nodes[def.id] = Math.min(level, def.maxLevel)
  }
  meta.researchNodes = nodes

  meta.planetsCompleted = readInt(s.planetsCompleted, 0)
  meta.totalPlaytime = readNumber(s.totalPlaytime, 0)
  meta.firstStarted = readNumber(s.firstStarted, Date.now())

  const stats = (s.stats ?? {}) as Record<string, unknown>
  meta.stats.totalOxygen = readDecimal(stats.totalOxygen, 0)
  meta.stats.totalClicks = readInt(stats.totalClicks, 0)
  meta.stats.eventsSeen = readInt(stats.eventsSeen, 0)
  meta.stats.eventsHandled = readInt(stats.eventsHandled, 0)
  meta.stats.fires = readInt(stats.fires, 0)
  meta.stats.bestPlanetSeconds = readNumber(stats.bestPlanetSeconds, 0)
  meta.stats.runs = readInt(stats.runs, 0)
  meta.stats.wavesSeen = readInt(stats.wavesSeen, 0)
  meta.stats.wavesRepelled = readInt(stats.wavesRepelled, 0)
  meta.stats.abilitiesUsed = readInt(stats.abilitiesUsed, 0)
  meta.stats.settlersLost = readNumber(stats.settlersLost, 0)
}
