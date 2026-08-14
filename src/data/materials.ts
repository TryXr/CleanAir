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
  /**
   * Einzahl, falls `name` ein Plural ist.
   *
   * Nur die Metallplatten brauchen das — alle übrigen Materialien sind
   * Stoffnamen und stehen im Singular. „1 Metallplatten" im Rezept war der
   * einzige Grammatikfehler in der Oberfläche, und ein Feld ist ehrlicher als
   * eine Regel, die dem Deutschen die Endung abschneidet.
   */
  singular?: string
}

/* --- Die Eisenkette (M12, §17) --------------------------------------------
   Die ersten Materialien, die **nicht** aus dem Boden kommen. Erz wird
   gefördert, alles danach entsteht in einer Anlage aus dem vorherigen Glied:

     Erz ──Schmelze──► Eisen ──Presse──► Metallplatten ──► Rakete

   Damit bekommt das Lager seine eigentliche Aufgabe: es ist nicht mehr nur
   ein Zähler, sondern der Puffer *zwischen* zwei Stufen. Wer die Presse
   schneller besetzt als die Schmelze, sieht Eisen leerlaufen; wer sie gar
   nicht besetzt, sieht Eisen an die Lagergrenze stoßen.
--------------------------------------------------------------------------- */

export const MATERIALS: readonly MaterialDef[] = [
  {
    id: 'erz',
    name: 'Eisenerz',
    description: 'Rostroter Bruch aus dem Tagebau. In dieser Form nutzlos — aber alles beginnt damit.',
    short: 'Er',
  },
  {
    id: 'eisen',
    name: 'Eisen',
    description: 'Aus dem Ofen, noch warm. Der erste Stoff auf Aurora, den niemand mitgebracht hat.',
    short: 'Fe',
  },
  {
    id: 'platten',
    name: 'Metallplatten',
    description: 'Gewalzt, geschnitten, gestapelt. Woraus eine Rakete tatsächlich besteht.',
    short: 'Pl',
    singular: 'Metallplatte',
  },
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
  {
    id: 'obsidian',
    name: 'Obsidian',
    description: 'Erstarrte Lava, scharfkantig und hitzefest. Nur dort, wo es einmal gebrannt hat.',
    short: 'Ob',
  },
  {
    id: 'schwefel',
    name: 'Schwefel',
    description: 'Gelbe Krusten am Kraterrand. Riecht nach Pyra und bleibt an allem haften.',
    short: 'Sw',
  },
  {
    id: 'eis',
    name: 'Eis',
    description: 'Uraltes Wassereis. Auf Kryo liegt es meterdick, überall sonst ist es Fracht.',
    short: 'Ei',
  },
  {
    id: 'helium',
    name: 'Helium',
    description: 'Aus der Hochatmosphäre abgezapft. Wiegt nichts und ist überall knapp außer hier.',
    short: 'He',
  },
]

export function findMaterial(id: string): MaterialDef | undefined {
  return MATERIALS.find((m) => m.id === id)
}

/** Kosten in Materialien: id -> Menge pro Stück. */
export type MaterialCost = Readonly<Record<string, number>>
