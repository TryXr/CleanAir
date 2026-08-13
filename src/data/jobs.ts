/**
 * Berufe (DESIGN.md §16).
 *
 * Die zweite Art, Menschen zu binden — und die einzige, die man wieder lösen
 * kann. Gebäude verschlucken beim Bau einmalig Bevölkerung; Berufe belegen
 * dauerhaft freie Leute und lassen sich jederzeit umverteilen.
 *
 * Dass es beide Wege gibt, ist Absicht: der Bau einer Halle ist eine
 * endgültige Entscheidung, die Verteilung der Arbeitskraft eine laufende.
 *
 * Einstellen kostet Material aus dem globalen Lager. Freistellen erstattet
 * nichts — sonst wäre Umverteilen kostenlos und die Entscheidung keine.
 */
import type { MaterialCost } from './materials'

/** Woran ein Beruf ansetzt. Wirkt additiv je Arbeiter. */
export type JobEffect =
  /** Baumschulen pflanzen schneller. */
  | { kind: 'planting' }
  /** Abbau fördert schneller. */
  | { kind: 'mining' }
  /** Alle Gas-Anlagen liefern mehr. */
  | { kind: 'gas' }
  /** Nahrung und Wasser. */
  | { kind: 'supply' }

export interface JobDef {
  id: string
  name: string
  description: string
  effect: JobEffect
  /**
   * Zuwachs je Arbeiter, additiv: 0.03 heißt, zehn Arbeiter geben +30 %.
   * Additiv statt multiplikativ, damit der zwanzigste Förster noch
   * nachvollziehbar so viel bringt wie der zweite.
   */
  perWorker: number
  /** Einmalige Kosten je eingestelltem Arbeiter. */
  hireCost: MaterialCost
  /** Nur sichtbar, wenn der Planet die passende Mechanik führt. */
  needs?: 'forest' | 'materials'
}

export const JOBS: readonly JobDef[] = [
  {
    id: 'forester',
    name: 'Förster',
    description: 'Setzt, pflegt und zieht nach. Baumschulen arbeiten je Förster 3 % schneller.',
    effect: { kind: 'planting' },
    perWorker: 0.03,
    hireCost: { holz: 5 },
    needs: 'forest',
  },
  {
    id: 'miner',
    name: 'Bergmann',
    description: 'Kennt das Gestein. Der Abbau läuft je Bergmann 2,5 % schneller.',
    effect: { kind: 'mining' },
    perWorker: 0.025,
    hireCost: { stein: 8 },
    needs: 'materials',
  },
  {
    id: 'farmer',
    name: 'Gärtner',
    description: 'Hält die Nährlösung im Gleichgewicht. Versorgung je Gärtner +3,5 %.',
    effect: { kind: 'supply' },
    perWorker: 0.035,
    hireCost: { holz: 4 },
  },
  {
    id: 'technician',
    name: 'Techniker',
    description: 'Wartet die Türme. Alle Gas-Anlagen liefern je Techniker 1,5 % mehr.',
    effect: { kind: 'gas' },
    perWorker: 0.015,
    hireCost: { titan: 2 },
    needs: 'materials',
  },
]

export function findJob(id: string): JobDef | undefined {
  return JOBS.find((j) => j.id === id)
}
