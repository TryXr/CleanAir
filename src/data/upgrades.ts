/**
 * Die sechs Upgrades von Planet 1 (DESIGN.md §14, M1):
 * zwei auf den Klick, drei auf einzelne Generatoren, eines global.
 *
 * Einmalkauf, kein Level-System — das kommt frühestens mit dem Tech-Baum.
 */
export type UpgradeEffect =
  /** Multipliziert den Klick-Ertrag. */
  | { kind: 'click'; factor: number }
  /** Multipliziert genau einen Generatortyp. */
  | { kind: 'generator'; generatorId: string; factor: number }
  /** Multipliziert alle Generatoren. */
  | { kind: 'global'; factor: number }

export interface UpgradeDef {
  id: string
  name: string
  description: string
  cost: number
  effect: UpgradeEffect
  revealAt: number
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
]

export function findUpgrade(id: string): UpgradeDef | undefined {
  return UPGRADES.find((u) => u.id === id)
}
