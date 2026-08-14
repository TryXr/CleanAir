import { readBool, readNumber } from '../engine/serialize'

export const settings = $state({
  /** Sekunden zwischen zwei Autosaves. */
  autosaveSeconds: 30,

  offlineEnabled: true,
  /** Anteil der Abwesenheit, der angerechnet wird. */
  offlineEfficiency: 0.5,
  /** Deckel in Stunden. */
  offlineMaxHours: 12,

  /**
   * Ton an? Standardmäßig ja, aber leise.
   *
   * Ein Schalter, der ab Werk aus steht, wird nie gefunden — und der Browser
   * lässt ohnehin keinen Ton zu, bevor der Spieler das erste Mal klickt. Der
   * erste Klick auf „O₂ freisetzen" ist damit von selbst die Vorstellung.
   */
  soundEnabled: true,
  /** 0…1. Bewusst niedrig: das Spiel läuft stundenlang nebenher. */
  soundVolume: 0.35,
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
  settings.soundEnabled = readBool(s.soundEnabled, true)
  settings.soundVolume = Math.min(1, Math.max(0, readNumber(s.soundVolume, 0.35)))
}
