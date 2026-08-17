/**
 * Klänge als Daten (DESIGN.md §14, M9-Politur).
 *
 * Keine Audiodateien: jeder Ton wird zur Laufzeit aus einem Oszillator und
 * einer Hüllkurve erzeugt. Das passt zur Design-Sprache aus app.css („dunkel,
 * technisch, ruhig"), kostet null Byte im Bundle, wirft keine Lizenzfragen
 * auf — und lässt sich hier durch Zahlenändern stimmen, genau wie das
 * Balancing.
 *
 * Reine Daten. Erzeugt werden sie in engine/audio.ts.
 */
export interface SoundDef {
  id: string
  /** Startfrequenz in Hz. */
  freq: number
  /** Zielfrequenz. Fehlt sie, bleibt der Ton konstant. */
  toFreq?: number
  type: OscillatorType
  /** Dauer in Sekunden. */
  duration: number
  /** Spitzenlautstärke 0…1, wird mit der Gesamtlautstärke multipliziert. */
  gain: number
  /**
   * Kürzester Abstand zwischen zwei Wiedergaben in Millisekunden.
   *
   * Ohne das wird der Klick-Knopf zum Maschinengewehr: wer schnell klickt,
   * löst zwanzig Töne pro Sekunde aus, die sich zu Krach addieren.
   */
  minGap?: number
}

export const SOUNDS: readonly SoundDef[] = [
  {
    id: 'click',
    freq: 240,
    toFreq: 190,
    type: 'triangle',
    duration: 0.05,
    gain: 0.18,
    minGap: 45,
  },
  {
    id: 'buy',
    freq: 420,
    toFreq: 640,
    type: 'triangle',
    duration: 0.08,
    gain: 0.22,
    minGap: 60,
  },
  {
    id: 'upgrade',
    freq: 523,
    toFreq: 784,
    type: 'sine',
    duration: 0.16,
    gain: 0.28,
  },
  {
    id: 'research',
    freq: 700,
    toFreq: 940,
    type: 'sine',
    duration: 0.13,
    gain: 0.24,
  },
  {
    /** Ein kleiner Aufstieg — der einzige Ton, der wirklich freundlich klingt. */
    id: 'achievement',
    freq: 660,
    toFreq: 1180,
    type: 'sine',
    duration: 0.38,
    gain: 0.3,
  },
  {
    id: 'complete',
    freq: 523,
    toFreq: 1046,
    type: 'sine',
    duration: 0.55,
    gain: 0.32,
  },
  {
    id: 'travel',
    freq: 300,
    toFreq: 520,
    type: 'sine',
    duration: 0.35,
    gain: 0.26,
  },
  {
    /** Startender Antrieb: langer Aufwärtsschleifer. */
    id: 'rocket',
    freq: 110,
    toFreq: 720,
    type: 'sawtooth',
    duration: 0.9,
    gain: 0.3,
  },
  {
    /** Tief und fallend. Die Anoxen sollen im Bauch ankommen. */
    id: 'wave',
    freq: 96,
    toFreq: 58,
    type: 'sawtooth',
    duration: 0.7,
    gain: 0.34,
  },
  {
    id: 'ability',
    freq: 820,
    toFreq: 380,
    type: 'square',
    duration: 0.16,
    gain: 0.22,
  },
  {
    id: 'fire',
    freq: 210,
    toFreq: 120,
    type: 'sawtooth',
    duration: 0.45,
    gain: 0.28,
  },
]

export function findSound(id: string): SoundDef | undefined {
  return SOUNDS.find((s) => s.id === id)
}

/** Alle ids als Typ, damit ein Tippfehler beim Aufruf auffällt. */
export type SoundId =
  | 'click'
  | 'buy'
  | 'upgrade'
  | 'research'
  | 'achievement'
  | 'complete'
  | 'travel'
  | 'rocket'
  | 'wave'
  | 'ability'
  | 'fire'
