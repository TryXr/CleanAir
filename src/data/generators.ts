/**
 * Generatoren.
 *
 * Reine Daten. Balancing passiert hier durch Zahlen-Editieren, nicht durch
 * Code-Umbau — deshalb steht in dieser Datei bewusst keine einzige Formel.
 * Die Kostenkurve lebt in systems/production.ts (DESIGN.md §13).
 */

/**
 * Woran ein Generator arbeitet. Bestimmt zugleich, auf welchem Planeten er
 * überhaupt auftaucht: N₂-Anlagen erst dort, wo es einen Puffer gibt,
 * Wäscher erst dort, wo Schadstoffe entstehen.
 */
export type GasKind =
  /** Füllt Vorrat *und* Luft. Die einzige Quelle von Kaufkraft. */
  | 'o2'
  /** Füllt nur die Luft. Verdünnt damit alles andere. */
  | 'n2'
  /** Baut Schadstoffe ab — Anteil pro Sekunde statt absoluter Menge. */
  | 'scrub'

export interface GeneratorDef {
  id: string
  name: string
  /** Ein Satz Fiktion. Zahlen sollen eine Geschichte erzählen (§1.4). */
  description: string
  gas: GasKind
  baseCost: number
  /** kosten(n) = baseCost × costGrowth^n */
  costGrowth: number
  /**
   * Pro Sekunde pro Stück, vor allen Multiplikatoren. Bei `scrub` ist das
   * der Anteil der Schadstoffe, den ein Stück pro Sekunde entfernt.
   */
  baseRate: number
  /** Ab wie viel jemals freigesetztem O₂ der Generator sichtbar wird. */
  revealAt: number
}

export const GENERATORS: readonly GeneratorDef[] = [
  {
    id: 'electrolysis',
    name: 'Elektrolyse-Zelle',
    description: 'Spaltet gebundenes Wasser im Gestein. Langsam, aber sie läuft überall.',
    gas: 'o2',
    baseCost: 10,
    costGrowth: 1.12,
    baseRate: 0.3,
    revealAt: 0,
  },
  {
    id: 'photolysis',
    name: 'Photolyse-Farm',
    description: 'Genmodifizierte Algen unter Kuppeln. Der erste sichtbare Grünton auf Aurora.',
    gas: 'o2',
    baseCost: 120,
    costGrowth: 1.13,
    baseRate: 4,
    revealAt: 40,
  },
  {
    id: 'processor',
    name: 'Atmosphärenprozessor',
    description: 'Türme, die den Himmel umschreiben. Man hört sie noch im Orbit.',
    gas: 'o2',
    baseCost: 1500,
    costGrowth: 1.14,
    baseRate: 55,
    revealAt: 400,
  },

  /* --- Puffer -----------------------------------------------------------
     N₂ ist die einzige Antwort auf zu viel O₂: es verdünnt die Mischung,
     statt irgendetwas abzubauen. Deshalb muss es deutlich schneller laufen
     als die O₂-Seite — das Fenster verlangt rund viermal so viel davon.
  ---------------------------------------------------------------------- */
  {
    id: 'sublimator',
    name: 'Stickstoff-Sublimator',
    description: 'Taut gefrorenes Nitrat aus dem Permafrost. Der Puffer, in dem O₂ erst atembar wird.',
    gas: 'n2',
    baseCost: 300,
    costGrowth: 1.12,
    baseRate: 14,
    revealAt: 200,
  },
  {
    id: 'cracker',
    name: 'Nitrat-Cracker',
    description: 'Bricht Salzlager im industriellen Maßstab auf. Vesta riecht danach nach Ammoniak.',
    gas: 'n2',
    baseCost: 9000,
    costGrowth: 1.14,
    baseRate: 260,
    revealAt: 3000,
  },

  /* --- Schadstoffe ------------------------------------------------------
     Wäscher arbeiten anteilig, nicht absolut. Dadurch pendelt sich der
     Schadstoffanteil unabhängig vom Maßstab der Atmosphäre ein:
     gleichgewicht% = 100 × ausgasung / waschleistung.
  ---------------------------------------------------------------------- */
  {
    id: 'scrubber',
    name: 'CO₂-Wäscher',
    description: 'Bindet Kohlendioxid an Mineralstaub und lässt ihn abregnen.',
    gas: 'scrub',
    baseCost: 2000,
    costGrowth: 1.15,
    baseRate: 0.0018,
    revealAt: 1500,
  },
]

export function findGenerator(id: string): GeneratorDef | undefined {
  return GENERATORS.find((g) => g.id === id)
}

/** Alle Generatoren einer Gasart, in Datenreihenfolge. */
export function generatorsForGas(gas: GasKind): readonly GeneratorDef[] {
  return GENERATORS.filter((g) => g.gas === gas)
}
