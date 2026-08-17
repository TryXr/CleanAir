/**
 * Lokale Upgrades — Einmalkäufe, die mit dem Planeten zurückgesetzt werden.
 * Gestufte, dauerhafte Verbesserungen sind Sache des Forschungsbaums
 * (data/research.ts).
 *
 * Die ersten sechs sind Planet 1 (DESIGN.md §14, M1): zwei auf den Klick,
 * drei auf einzelne Generatoren, eines global. Die restlichen tauchen erst
 * auf, wenn der Planet Puffer und Schadstoffe kennt.
 */
export type UpgradeEffect =
  /** Multipliziert den Klick-Ertrag. */
  | { kind: 'click'; factor: number }
  /** Multipliziert genau einen Generatortyp. */
  | { kind: 'generator'; generatorId: string; factor: number }
  /** Multipliziert alle Generatoren. */
  | { kind: 'global'; factor: number }

/** Mechanik, die der Planet führen muss, damit das Upgrade erscheint. */
export type Requirement = 'nitrogen' | 'pollution'

export interface UpgradeDef {
  id: string
  name: string
  description: string
  cost: number
  effect: UpgradeEffect
  revealAt: number
  needs?: Requirement
}

export const UPGRADES: readonly UpgradeDef[] = [
  {
    id: 'valves',
    name: 'Verstärkte Handventile',
    description: 'Dreifacher Durchsatz pro Handgriff.',
    cost: 40,
    effect: { kind: 'click', factor: 3 },
    revealAt: 15,
  },
  {
    id: 'electrodes',
    name: 'Beschichtete Elektroden',
    description: 'Elektrolyse-Zellen arbeiten doppelt so schnell.',
    cost: 200,
    effect: { kind: 'generator', generatorId: 'electrolysis', factor: 2 },
    revealAt: 90,
  },
  {
    id: 'pistons',
    name: 'Druckstoß-Kolben',
    description: 'Vierfacher Klick-Ertrag. Der letzte Grund, selbst Hand anzulegen.',
    cost: 800,
    effect: { kind: 'click', factor: 4 },
    revealAt: 350,
  },
  {
    id: 'nutrients',
    name: 'Nährlösung II',
    description: 'Photolyse-Farmen arbeiten doppelt so schnell.',
    cost: 2500,
    effect: { kind: 'generator', generatorId: 'photolysis', factor: 2 },
    revealAt: 1200,
  },
  {
    id: 'catalyst',
    name: 'Katalysator-Netz',
    description: 'Alle Anlagen des Planeten teilen sich einen Katalysator. +60 % überall.',
    cost: 6000,
    effect: { kind: 'global', factor: 1.6 },
    revealAt: 3000,
  },
  {
    id: 'turbines',
    name: 'Turbinen-Nachrüstung',
    description: 'Atmosphärenprozessoren arbeiten doppelt so schnell.',
    cost: 14000,
    effect: { kind: 'generator', generatorId: 'processor', factor: 2 },
    revealAt: 7000,
  },

  /* --- Puffer und Schadstoffe ------------------------------------------ */
  {
    id: 'coldtraps',
    name: 'Kältefallen',
    description: 'Sublimatoren halten den Permafrost offen und liefern doppelt so viel N₂.',
    cost: 1800,
    effect: { kind: 'generator', generatorId: 'sublimator', factor: 2 },
    revealAt: 900,
    needs: 'nitrogen',
  },
  {
    id: 'membranes',
    name: 'Selektive Membranen',
    description: 'Wäscher binden 80 % mehr Kohlendioxid pro Durchgang.',
    cost: 9000,
    effect: { kind: 'generator', generatorId: 'scrubber', factor: 1.8 },
    revealAt: 4000,
    needs: 'pollution',
  },
  {
    id: 'saltworks',
    name: 'Salzwerk-Ausbau',
    description: 'Nitrat-Cracker arbeiten doppelt so schnell.',
    cost: 40000,
    effect: { kind: 'generator', generatorId: 'cracker', factor: 2 },
    revealAt: 20000,
    needs: 'nitrogen',
  },
]

export function findUpgrade(id: string): UpgradeDef | undefined {
  return UPGRADES.find((u) => u.id === id)
}
