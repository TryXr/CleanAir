import { readBool, readNumber } from '../engine/serialize'

export const settings = $state({
  /** Sekunden zwischen zwei Autosaves. */
  autosaveSeconds: 30,

  offlineEnabled: true,
  /** Anteil der Abwesenheit, der angerechnet wird. */
  offlineEfficiency: 0.5,
  /** Deckel in Stunden. */
  offlineMaxHours: 12,
})

export function serializeSettings() {
  return { ...settings }
}

export function deserializeSettings(raw: unknown): void {
  const s = (raw ?? {}) as Record<string, unknown>
  settings.autosaveSeconds = readNumber(s.autosaveSeconds, 30)
  settings.offlineEnabled = readBool(s.offlineEnabled, true)
  settings.offlineEfficiency = readNumber(s.offlineEfficiency, 0.5)
  settings.offlineMaxHours = readNumber(s.offlineMaxHours, 12)
}
