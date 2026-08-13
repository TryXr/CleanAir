/**
 * Materialien (DESIGN.md §16).
 *
 * Der Stoff, aus dem gebaut wird — im Unterschied zu O₂, das zugleich
 * Währung, Produktionsziel und Fortschrittsbalken ist. Genau diese
 * Doppelrolle war das Problem: es fehlte etwas, das man *hat* statt
 * ausgibt.
 *
 * Das Inventar ist global (state/run.svelte.ts), die Vorkommen sind
 * planetenlokal (data/planets.ts). Diese Trennung ist der Grund, warum sich
 * die Rückkehr zu alten Planeten später lohnt.
 */
export interface MaterialDef {
  id: string
  name: string
  /** Ein Satz Fiktion. Zahlen sollen eine Geschichte erzählen (§1.4). */
  description: string
  /** Kurzzeichen für enge Anzeigen. */
  short: string
}

export const MATERIALS: readonly MaterialDef[] = [
  {
    id: 'holz',
    name: 'Holz',
    description: 'Gewachsener Baustoff. Jeder Balken war einmal ein Baum, der Sauerstoff gemacht hat.',
    short: 'Hz',
  },
  {
    id: 'stein',
    name: 'Stein',
    description: 'Aus dem Tagebau. Schwer, stumpf und in jeder Fundamentplatte.',
    short: 'St',
  },
  {
    id: 'titan',
    name: 'Titan',
    description: 'Leicht und zäh. Vesta liegt voll davon — anderswo muss man es mitbringen.',
    short: 'Ti',
  },
]

export function findMaterial(id: string): MaterialDef | undefined {
  return MATERIALS.find((m) => m.id === id)
}

/** Kosten in Materialien: id -> Menge pro Stück. */
export type MaterialCost = Readonly<Record<string, number>>
