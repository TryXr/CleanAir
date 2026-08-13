import Decimal from 'break_infinity.js'
import { MATERIALS, type MaterialCost } from '../data/materials'
import { PLANETS } from '../data/planets'
import { readDecimal, writeDecimal } from '../engine/serialize'

/**
 * DURCHLAUF — die dritte Lebensdauer im Zustand (DESIGN.md §16).
 *
 * Bis M3 gab es zwei: `planet` stirbt beim Wechsel, `meta` lebt ewig. Das neue
 * Modell braucht etwas dazwischen — Dinge, die über *alle* Planeten eines
 * Durchlaufs hinweg gelten, aber den Prestige-Reset nicht überleben. Das
 * Material-Inventar ist der erste Bewohner: Holz von Planet 1 baut auf
 * Planet 3, aber ein neuer Durchlauf beginnt mit leerem Lager. Sonst würde
 * der zweite Durchlauf den ersten bedeutungslos machen; Startmaterial soll
 * später aus Genesis-Upgrades kommen, nicht aus Übertrag.
 *
 * Der Reset selbst kommt erst in M6. Bis dahin ist das hier eine Ebene, die
 * nie zurückgesetzt wird — der Behälter steht aber schon richtig, damit M6
 * ein Verdrahten wird und kein Umzug mit Migration.
 */
export const run = $state({
  /** Material-id -> Menge. Global über alle Planeten des Durchlaufs. */
  materials: {} as Record<string, Decimal>,

  /**
   * Planeten, die in diesem Durchlauf angeflogen werden dürfen. Wächst, wenn
   * auf dem aktuellen Planeten eine Rakete fertig wird.
   */
  unlocked: ['aurora'] as string[],

  /**
   * Zustand aller *nicht* aktiven Planeten, serialisiert.
   *
   * Der aktive Planet lebt weiterhin in planet.svelte.ts — nur so bleibt
   * jeder `planet.foo`-Zugriff im übrigen Code unverändert gültig. Beim
   * Reisen wird der aktive Planet hier eingelagert und der Zielplanet
   * ausgepackt (systems/travel.ts). Planeten sterben damit nicht mehr beim
   * Wechsel, sondern erst beim Durchlauf-Reset (§16).
   */
  planets: {} as Record<string, unknown>,
})

export type RunState = typeof run

export function materialAmount(id: string): Decimal {
  return run.materials[id] ?? new Decimal(0)
}

export function addMaterial(id: string, amount: Decimal): void {
  if (amount.lte(0)) return
  // Ersetzen, nicht mutieren — Svelte proxied keine Klasseninstanzen.
  run.materials = { ...run.materials, [id]: materialAmount(id).add(amount) }
}

/** Reicht das Lager für diese Kosten? */
export function canAffordMaterials(cost: MaterialCost | undefined, amount = 1): boolean {
  if (!cost) return true
  for (const [id, per] of Object.entries(cost)) {
    if (materialAmount(id).lt(per * amount)) return false
  }
  return true
}

/**
 * Wie oft diese Kosten aus dem Lager bezahlbar sind. `Infinity`, wenn keine
 * Materialien verlangt werden — dann begrenzt allein das O₂.
 */
export function affordableCount(cost: MaterialCost | undefined): number {
  if (!cost) return Infinity
  let limit = Infinity
  for (const [id, per] of Object.entries(cost)) {
    if (per <= 0) continue
    limit = Math.min(limit, Math.floor(materialAmount(id).div(per).toNumber()))
  }
  return limit
}

export function spendMaterials(cost: MaterialCost | undefined, amount = 1): boolean {
  if (!cost) return true
  if (!canAffordMaterials(cost, amount)) return false

  const next = { ...run.materials }
  for (const [id, per] of Object.entries(cost)) {
    next[id] = materialAmount(id).sub(per * amount)
  }
  run.materials = next
  return true
}

/** Hat der Spieler überhaupt schon Material gesehen? Steuert die Anzeige. */
export function hasAnyMaterial(): boolean {
  return MATERIALS.some((m) => materialAmount(m.id).gt(0))
}

/** Ist dieser Planet in diesem Durchlauf anfliegbar? */
export function isUnlocked(id: string): boolean {
  return run.unlocked.includes(id)
}

export function unlockPlanet(id: string): void {
  if (!isUnlocked(id)) run.unlocked = [...run.unlocked, id]
}

/**
 * Der Durchlauf-Reset (DESIGN.md §16). Alle Planeten, alles Material, alle
 * Freischaltungen fallen weg — was bleibt, sind die Genesis-Kerne und der
 * Meta-Baum in meta.svelte.ts.
 */
export function resetRun(): void {
  run.materials = {}
  run.unlocked = ['aurora']
  run.planets = {}
}

export function serializeRun() {
  const materials: Record<string, string> = {}
  for (const def of MATERIALS) {
    const amount = materialAmount(def.id)
    if (amount.gt(0)) materials[def.id] = writeDecimal(amount)
  }
  return { materials, unlocked: [...run.unlocked], planets: { ...run.planets } }
}

export function deserializeRun(raw: unknown): void {
  const s = (raw ?? {}) as Record<string, unknown>
  const saved = (s.materials ?? {}) as Record<string, unknown>

  // Nur bekannte ids übernehmen, damit ein Save aus einer Version mit
  // anderen Materialien keine Geister-Einträge einschleppt.
  const materials: Record<string, Decimal> = {}
  for (const def of MATERIALS) {
    const amount = readDecimal(saved[def.id], 0)
    if (amount.gt(0)) materials[def.id] = amount
  }
  run.materials = materials

  // Nur bekannte Planeten übernehmen. Aurora ist immer erreichbar, sonst
  // stünde man nach einem kaputten Save ohne Ziel da.
  const savedUnlocked = Array.isArray(s.unlocked) ? s.unlocked : []
  const unlocked = PLANETS.filter((p) => savedUnlocked.includes(p.id)).map((p) => p.id)
  run.unlocked = unlocked.includes('aurora') ? unlocked : ['aurora', ...unlocked]

  const savedPlanets = (s.planets ?? {}) as Record<string, unknown>
  const planets: Record<string, unknown> = {}
  for (const def of PLANETS) {
    if (savedPlanets[def.id]) planets[def.id] = savedPlanets[def.id]
  }
  run.planets = planets
}
