import { findEvent, type EventDef, type EventEffect } from '../data/events'
import { planet } from '../state/planet.svelte'

/**
 * Fasst alle laufenden Ereignisse zu einem Satz Faktoren zusammen.
 *
 * Eigenes Modul aus demselben Grund wie metaEffects.ts: Produktion,
 * Atmosphäre und Bevölkerung lesen hier, statt jeweils selbst durch die
 * Ereignisliste zu laufen (§13). Dass es getrennt von systems/events.ts
 * liegt, hält zusätzlich den Import-Graph zyklenfrei — der Tick dort darf
 * Produktion und Bevölkerung benutzen, dieses Modul kennt nur Daten.
 */

/** Der Effekt, der gerade gilt — nach einer Reaktion ein anderer. */
export function effectOf(id: string, reacted: boolean): EventEffect | undefined {
  const def = findEvent(id)
  if (!def) return undefined
  return reacted && def.reaction ? def.reaction.effect : def.effect
}

export function eventEffects(): Required<EventEffect> {
  const total: Required<EventEffect> = {
    production: 1,
    pollution: 1,
    consumption: 1,
    growth: 1,
  }

  for (const active of planet.events) {
    const effect = effectOf(active.id, active.reacted)
    if (!effect) continue
    total.production *= effect.production ?? 1
    total.pollution *= effect.pollution ?? 1
    total.consumption *= effect.consumption ?? 1
    total.growth *= effect.growth ?? 1
  }

  return total
}

export interface ActiveEventView {
  def: EventDef
  remaining: number
  reacted: boolean
}

/** Für die UI: die Definitionen zu den laufenden Ereignissen. */
export function activeEvents(): ActiveEventView[] {
  const views: ActiveEventView[] = []
  for (const active of planet.events) {
    const def = findEvent(active.id)
    if (def) views.push({ def, remaining: active.remaining, reacted: active.reacted })
  }
  return views
}
