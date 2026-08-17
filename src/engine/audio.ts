import { findSound, type SoundId } from '../data/sounds'
import { isCatchUp } from './loop'
import { settings } from '../state/settings.svelte'

/**
 * Tonerzeugung über die Web Audio API.
 *
 * Drei Dinge machen den Unterschied zwischen „Ton" und „Zumutung", und alle
 * drei stecken hier:
 *
 * 1. **Nichts im Nachlauf.** Wer zwölf Stunden weg war, käme sonst zu einer
 *    Salve aus hunderten Tönen zurück — dieselbe Falle wie bei den
 *    Ereignissen in M3.
 * 2. **Abstand je Klang.** Ohne Mindestpause wird der Klick-Knopf zum
 *    Maschinengewehr.
 * 3. **Der Kontext startet erst auf eine Geste.** Browser blockieren Audio
 *    vorher; ein Versuch davor wirft entweder oder hinterlässt einen toten,
 *    „suspended" Kontext.
 */

let ctx: AudioContext | null = null
let master: GainNode | null = null

/** Zeitpunkt der letzten Wiedergabe je Klang, für die Mindestpause. */
const lastPlayed = new Map<string, number>()

/**
 * Startet den Audiokontext. Muss aus einem echten Benutzerereignis heraus
 * aufgerufen werden — main.ts hängt das an den ersten Klick.
 */
export function unlockAudio(): void {
  if (ctx) {
    if (ctx.state === 'suspended') void ctx.resume()
    return
  }
  try {
    const Ctor = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return
    ctx = new Ctor()
    master = ctx.createGain()
    master.gain.value = 1
    master.connect(ctx.destination)
  } catch {
    // Kein Audio verfügbar. Das Spiel läuft trotzdem weiter.
    ctx = null
  }
}

export function isAudioReady(): boolean {
  return ctx !== null && ctx.state === 'running'
}

export function play(id: SoundId): void {
  if (!settings.soundEnabled) return
  // Nachlauf: Töne würden sich zu einer Salve stapeln.
  if (isCatchUp()) return
  if (!ctx || !master || ctx.state !== 'running') return

  const def = findSound(id)
  if (!def) return

  const now = performance.now()
  const gap = def.minGap ?? 0
  if (gap > 0) {
    const last = lastPlayed.get(id) ?? -Infinity
    if (now - last < gap) return
    lastPlayed.set(id, now)
  }

  const lautstaerke = Math.max(0, Math.min(1, settings.soundVolume)) * def.gain
  if (lautstaerke <= 0) return

  try {
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    const env = ctx.createGain()

    osc.type = def.type
    osc.frequency.setValueAtTime(def.freq, t)
    if (def.toFreq !== undefined) {
      // exponentiell, weil Tonhöhe logarithmisch wahrgenommen wird —
      // ein linearer Schleifer klingt am Ende wie festgeklemmt.
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, def.toFreq), t + def.duration)
    }

    // Kurzer Anschlag, dann Ausklang. Ohne den Anschlag knackt es.
    env.gain.setValueAtTime(0.0001, t)
    env.gain.exponentialRampToValueAtTime(lautstaerke, t + 0.008)
    env.gain.exponentialRampToValueAtTime(0.0001, t + def.duration)

    osc.connect(env)
    env.connect(master)
    osc.start(t)
    osc.stop(t + def.duration + 0.02)
    // Aufräumen, sonst sammeln sich über Stunden tausende Knoten an.
    osc.onended = () => {
      osc.disconnect()
      env.disconnect()
    }
  } catch {
    /* Ein fehlgeschlagener Ton darf niemals das Spiel stören. */
  }
}

/** Für Tests: Zustand zurücksetzen, ohne den Kontext zu schließen. */
export function resetAudioThrottle(): void {
  lastPlayed.clear()
}
