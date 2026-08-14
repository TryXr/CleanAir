/**
 * Verteidigung (DESIGN.md §8).
 *
 * „Deine Waffe ist dein Fortschritt" (§7): Oxidationstürme, Drohnen und
 * Druckwellen sind alle nur Anwendungen dessen, was du ohnehin herstellst.
 * Deshalb kosten sie O₂ und Material — jede Anlage in der Verteidigung ist
 * eine, die nicht terraformt. Genau die Opportunitätskosten aus §8.
 *
 * Der eigentliche Spielanteil liegt *zwischen* den Wellen: hier wird gebaut,
 * die Welle selbst läuft dann automatisch ab.
 */
import type { MaterialCost } from './materials'
import type { EnemyKind } from './enemies'

export interface DefenseDef {
  id: string
  name: string
  description: string
  baseCost: number
  costGrowth: number
  materialCost?: MaterialCost
  populationCost?: number
  /** Schaden pro Sekunde und Stück, vor der Konter-Matrix. */
  damage: number
  /**
   * Wirksamkeit gegen die einzelnen Einheiten (§7). 1 = voll, 0.2 = kaum.
   * Ohne diese Matrix wäre „mehr Türme" immer die richtige Antwort und die
   * Einheitentypen bloße Dekoration.
   */
  effectiveness: Readonly<Record<EnemyKind, number>>
  /** Ab wie viel jemals freigesetztem O₂ sichtbar. */
  revealAt: number
}

export const DEFENSES: readonly DefenseDef[] = [
  {
    id: 'oxitower',
    name: 'Oxidationsturm',
    description: 'Bläst reinen Sauerstoff in die Gänge. Für die Anoxen ist das Feuer.',
    baseCost: 4000,
    costGrowth: 1.14,
    damage: 12,
    effectiveness: { schuerfer: 1, speier: 0.4, panzer: 0.15 },
    revealAt: 2500,
  },
  {
    id: 'drones',
    name: 'Drohnenschwarm',
    description: 'Abfangjäger für alles, was aufsteigt. Fängt den Speier, bevor er ausatmet.',
    baseCost: 6500,
    costGrowth: 1.14,
    materialCost: { titan: 6 },
    populationCost: 3,
    damage: 9,
    effectiveness: { schuerfer: 0.35, speier: 1.2, panzer: 0.2 },
    revealAt: 5000,
  },
  {
    id: 'pressure',
    name: 'Druckwellen-Emitter',
    description: 'Verdichtet die Luft zu einem Schlag. Das Einzige, was einen Panzer aufbricht.',
    baseCost: 14000,
    costGrowth: 1.15,
    materialCost: { titan: 14, stein: 30 },
    populationCost: 5,
    damage: 7,
    effectiveness: { schuerfer: 0.3, speier: 0.25, panzer: 1.4 },
    revealAt: 12000,
  },
  {
    id: 'depot',
    name: 'Reparaturdepot',
    description:
      'Kein Geschütz, sondern eine Werkstatt. Bringt lahmgelegte Anlagen schneller zurück ans Netz.',
    baseCost: 3000,
    costGrowth: 1.13,
    materialCost: { stein: 20 },
    populationCost: 2,
    // Richtet selbst keinen Schaden an; die Wirkung steckt in der Reparaturrate.
    damage: 0,
    effectiveness: { schuerfer: 0, speier: 0, panzer: 0 },
    revealAt: 3000,
  },
]

export function findDefense(id: string): DefenseDef | undefined {
  return DEFENSES.find((d) => d.id === id)
}

/** Anteil lahmgelegter Anlagen, den ein Depot pro Sekunde zurückholt. */
export const REPAIR_PER_DEPOT = 0.004

/** Grundreparatur ohne Depot — Rückschläge sind temporär, auch ohne Werkstatt (§1.2). */
export const REPAIR_BASE = 0.0015
