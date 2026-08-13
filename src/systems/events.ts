import { EVENTS, findEvent, type EventDef } from '../data/events'
import { isCatchUp } from '../engine/loop'
import { createRng } from '../engine/rng'
import { addLog } from '../state/log.svelte'
import { meta } from '../state/meta.svelte'
import { currentPlanetDef, planet, usesNitrogen, usesPollution } from '../state/planet.svelte'
import { populationCapacity } from './population'
import { addOxygen, currentO2Rate } from './production'

/**
 * Zufalls-Ereignisse (DESIGN.md §10).
 *
 * Zwei Regeln halten das System freundlich:
 *
 * 1. Immer nur *ein* Ereignis gleichzeitig. Zwei überlagerte Effekte wären
 *    nicht mehr lesbar, und Lesbarkeit ist der ganze Zweck.
 * 2. Nichts spawnt im Nachlauf. Zwölf Stunden Abwesenheit würden sonst
 *    hundert Stürme in den Log schreiben, auf die niemand mehr reagieren
 *    kann — der Spieler käme zurück und hätte nur verloren.
 *
 * Die Wirkung laufender Ereignisse steht in eventEffects.ts.
 */

/** Sekunden zwischen zwei Ereignissen, zufällig aus diesem Bereich. */
const MIN_GAP = 180
const MAX_GAP = 400

const rng = createRng(`ereignisse:${Date.now()}`)

/** Führt der Planet die Mechanik, die dieses Ereignis braucht? */
function isPossible(def: EventDef): boolean {
  switch (def.needs) {
    case 'population':
      return currentPlanetDef().allowsPopulation
    case 'nitrogen':
      return usesNitrogen()
    case 'pollution':
      return usesPollution()
    default:
      return true
  }
}

/**
 * Die Klick-Reaktion aus §10. Sie ist nie Pflicht: wer sie ignoriert,
 * verliert wenig — wer sie nutzt, gewinnt spürbar (§1.3).
 *
 * Die Sofortboni sind bewusst relativ (Sekunden aktueller Produktion,
 * Anteil der Kapazität) statt absolut. Sonst wäre derselbe Fund in Minute
 * fünf ein Segen und in Stunde drei eine Beleidigung.
 */
export function reactToEvent(id: string): boolean {
  const active = planet.events.find((e) => e.id === id)
  const def = findEvent(id)
  if (!active || active.reacted || !def?.reaction) return false

  const reaction = def.reaction
  active.reacted = true
  meta.stats.eventsHandled += 1

  if (reaction.grantSeconds) {
    const gain = currentO2Rate().mul(reaction.grantSeconds)
    if (gain.gt(0)) addOxygen(gain)
  }
  if (reaction.grantSettlers) {
    const gain = populationCapacity().mul(reaction.grantSettlers)
    if (gain.gt(0)) planet.settlers = planet.settlers.add(gain)
  }

  addLog(reaction.text, 'good')
  if (reaction.ends) planet.events = planet.events.filter((e) => e.id !== id)

  return true
}

// --- Tick -----------------------------------------------------------------

function spawn(): void {
  const candidates = EVENTS.filter(isPossible)
  if (candidates.length === 0) return

  const totalWeight = candidates.reduce((sum, e) => sum + e.weight, 0)
  let roll = rng.next() * totalWeight
  const picked = candidates.find((e) => (roll -= e.weight) < 0) ?? candidates[candidates.length - 1]
  if (!picked) return

  planet.events = [...planet.events, { id: picked.id, remaining: picked.duration, reacted: false }]
  meta.stats.eventsSeen += 1
  addLog(picked.text, picked.kind)
}

export function eventsSystem(dt: number): void {
  // Laufende Ereignisse laufen auch im Nachlauf ab — sonst stünde nach zwölf
  // Stunden Abwesenheit noch der Sturm von gestern über den Anlagen.
  if (planet.events.length > 0) {
    const surviving = planet.events.filter((active) => {
      active.remaining -= dt
      if (active.remaining > 0) return true
      if (!isCatchUp()) addLog(`${findEvent(active.id)?.name ?? 'Das Ereignis'} ist vorüber.`)
      return false
    })
    if (surviving.length !== planet.events.length) planet.events = surviving
  }

  if (!currentPlanetDef().hasEvents || isCatchUp()) return

  planet.nextEventIn -= dt
  if (planet.nextEventIn > 0) return

  planet.nextEventIn = rng.range(MIN_GAP, MAX_GAP)
  // Läuft noch etwas, wird der Slot übersprungen und der Timer neu gestellt.
  if (planet.events.length === 0) spawn()
}

/** Sekunden bis zum nächsten Ereignis. Sichtbarer Timer statt Überraschung. */
export function timeToNextEvent(): number {
  return Math.max(0, planet.nextEventIn)
}
