/**
 * Zufalls-Ereignisse (DESIGN.md §10).
 *
 * Der Sinn ist nicht Schaden, sondern Rhythmus: Idle-Phasen bekommen eine
 * Unterbrechung, auf die man reagieren *kann*, aber nicht muss. Wer nicht
 * reagiert, verliert wenig; wer reagiert, gewinnt spürbar (§1.3).
 *
 * Reine Daten. Wann etwas ausgelöst wird, entscheidet systems/events.ts.
 */
import type { LogKind } from '../state/log.svelte'

/**
 * Faktoren, die ein laufendes Ereignis auf das Spiel legt. Alle Felder sind
 * optional; was fehlt, bleibt bei 1. Sie werden in systems/events.ts zu
 * einem Satz Multiplikatoren zusammengefasst und dort gelesen, wo die
 * jeweilige Zahl ohnehin entsteht — nicht verstreut angewendet (§13).
 */
export interface EventEffect {
  /** Auf alle Generatoren. */
  production?: number
  /** Auf die Grundausgasung von Schadstoffen. */
  pollution?: number
  /** Auf den O₂-Verbrauch pro Kopf. */
  consumption?: number
  /** Auf das Bevölkerungswachstum. */
  growth?: number
}

export interface EventReaction {
  label: string
  /** Log-Zeile nach dem Klick. */
  text: string
  /** Ersetzt den Effekt für die Restdauer. Fehlt er, bleibt der alte. */
  effect?: EventEffect
  /** Beendet das Ereignis sofort. */
  ends?: boolean
  /**
   * Sofortbonus in Sekunden aktueller Produktion. Skalenfrei — ein früher
   * Fund ist relativ genauso viel wert wie ein später.
   */
  grantSeconds?: number
  /** Sofortbonus an Siedlern, als Anteil der aktuellen Kapazität. */
  grantSettlers?: number
}

export interface EventDef {
  id: string
  name: string
  /** Log-Zeile beim Auftreten. */
  text: string
  kind: LogKind
  /** Sekunden. */
  duration: number
  /** Relatives Gewicht bei der Auswahl. */
  weight: number
  /** Nur, wenn der Planet diese Mechanik führt. */
  needs?: 'population' | 'nitrogen' | 'pollution'
  effect: EventEffect
  reaction?: EventReaction
}

export const EVENTS: readonly EventDef[] = [
  {
    id: 'flare',
    name: 'Sonneneruption',
    text: 'Eine Sonneneruption trifft die Tagseite. Die Anlagen laufen heiß — und schmutzig.',
    kind: 'warn',
    duration: 90,
    weight: 10,
    effect: { production: 1.5, pollution: 4 },
    reaction: {
      label: 'Filter hochfahren',
      text: 'Die Filter fangen den Ruß ab. Weniger Schub, aber saubere Luft.',
      effect: { production: 1.25 },
    },
  },
  {
    id: 'sandstorm',
    name: 'Sandsturm',
    text: 'Ein Sandsturm legt sich über die Anlagen. Fast alles steht still.',
    kind: 'bad',
    duration: 120,
    weight: 9,
    effect: { production: 0.25 },
    reaction: {
      label: 'Anlagen freischaufeln',
      text: 'Die Anlagen sind frei. Der Sturm zieht ohne weiteren Schaden ab.',
      ends: true,
    },
  },
  {
    id: 'meteors',
    name: 'Meteoritenschauer',
    text: 'Meteoriten schlagen im Hochland ein. Staub steigt auf, Krater glühen.',
    kind: 'warn',
    duration: 60,
    weight: 7,
    needs: 'pollution',
    effect: { production: 0.9, pollution: 5 },
    reaction: {
      label: 'Bergungstrupp schicken',
      text: 'Der Bergungstrupp bringt oxidreiches Gestein zurück — ein unerwarteter Fund.',
      grantSeconds: 45,
    },
  },
  {
    id: 'migrants',
    name: 'Migrantenwelle',
    text: 'Ein Konvoi bittet um Landeerlaubnis. Mehr Hände — und mehr Lungen.',
    kind: 'info',
    duration: 150,
    weight: 8,
    needs: 'population',
    effect: { growth: 3, consumption: 1.35 },
    reaction: {
      label: 'Quartiere öffnen',
      text: 'Die Quartiere werden geöffnet. Der Konvoi setzt geschlossen auf.',
      effect: { growth: 3, consumption: 1.5 },
      grantSettlers: 0.12,
    },
  },
  {
    id: 'inversion',
    name: 'Temperaturinversion',
    text: 'Eine Inversionsschicht hält den Puffer am Boden. Das N₂ steigt kaum noch auf.',
    kind: 'warn',
    duration: 100,
    weight: 6,
    needs: 'nitrogen',
    effect: { production: 0.7, pollution: 2.5 },
    reaction: {
      label: 'Schichten durchmischen',
      text: 'Die Prozessoren blasen die Inversion auseinander. Die Luft steht wieder offen.',
      ends: true,
    },
  },
]

export function findEvent(id: string): EventDef | undefined {
  return EVENTS.find((e) => e.id === id)
}
