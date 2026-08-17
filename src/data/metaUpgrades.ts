/**
 * Der Meta-Baum — gekauft mit Genesis-Kernen, bleibt für immer (DESIGN.md §6).
 *
 * Bewusst Einmalkäufe statt Stufen: zehn klar unterscheidbare Entscheidungen
 * lesen sich besser als drei Regler, die man hochzieht. Stufen kommen mit dem
 * Forschungsbaum in M3.
 */
export type MetaEffect =
  /** O₂-Startkapital auf jedem neuen Planeten. */
  | { kind: 'startingOxygen'; amount: number }
  /** Multiplikator auf alle Generatoren, überall. */
  | { kind: 'globalProduction'; factor: number }
  /** Multiplikator auf den Klick-Ertrag. */
  | { kind: 'clickPower'; factor: number }
  /** Senkt den O₂-Verbrauch pro Kopf (0.25 = −25 %). */
  | { kind: 'lifeSupport'; reduction: number }
  /** Beschleunigt das Bevölkerungswachstum. */
  | { kind: 'growthRate'; factor: number }
  /** Hebt die Bevölkerungsobergrenze. */
  | { kind: 'popCapacity'; factor: number }
  /** Verstärkt den Arbeitskraft-Bonus. */
  | { kind: 'workforce'; factor: number }

export interface MetaUpgradeDef {
  id: string
  name: string
  description: string
  /** Kosten in Genesis-Kernen. */
  cost: number
  effect: MetaEffect
  /** Erst kaufbar, wenn alle genannten Knoten stehen. */
  requires?: readonly string[]
}

export const META_UPGRADES: readonly MetaUpgradeDef[] = [
  {
    id: 'cache-1',
    name: 'Vorratstank',
    description: 'Jeder neue Planet beginnt mit 500 O₂ im Speicher.',
    cost: 1,
    effect: { kind: 'startingOxygen', amount: 500 },
  },
  {
    id: 'click-boost',
    name: 'Servo-Handschuhe',
    description: 'Klick-Ertrag ×5 — auf jedem Planeten, von der ersten Sekunde an.',
    cost: 1,
    effect: { kind: 'clickPower', factor: 5 },
  },
  {
    id: 'production-1',
    name: 'Standardisierte Bauteile',
    description: 'Alle Generatoren produzieren 50 % mehr.',
    cost: 2,
    effect: { kind: 'globalProduction', factor: 1.5 },
  },
  {
    id: 'growth-1',
    name: 'Werbekampagne',
    description: 'Bevölkerung wächst 60 % schneller.',
    cost: 2,
    effect: { kind: 'growthRate', factor: 1.6 },
    requires: ['cache-1'],
  },
  {
    id: 'life-1',
    name: 'Atemrückgewinnung',
    description: 'Menschen verbrauchen 25 % weniger O₂.',
    cost: 3,
    effect: { kind: 'lifeSupport', reduction: 0.25 },
    requires: ['cache-1'],
  },
  {
    id: 'capacity-1',
    name: 'Modulbauweise',
    description: 'Siedlungskapazität +60 %.',
    cost: 4,
    effect: { kind: 'popCapacity', factor: 1.6 },
    requires: ['growth-1'],
  },
  {
    id: 'cache-2',
    name: 'Frachtterminal',
    description: 'Startkapital steigt auf 6 000 O₂.',
    cost: 5,
    effect: { kind: 'startingOxygen', amount: 5500 },
    requires: ['cache-1'],
  },
  {
    id: 'workforce-1',
    name: 'Schichtbetrieb',
    description: 'Der Arbeitskraft-Bonus wirkt doppelt so stark.',
    cost: 6,
    effect: { kind: 'workforce', factor: 2 },
    requires: ['capacity-1'],
  },
  {
    id: 'production-2',
    name: 'Orbitale Fertigung',
    description: 'Alle Generatoren produzieren nochmals doppelt so viel.',
    cost: 9,
    effect: { kind: 'globalProduction', factor: 2 },
    requires: ['production-1'],
  },
  {
    id: 'life-2',
    name: 'Geschlossene Kreisläufe',
    description: 'Menschen verbrauchen nochmals 40 % weniger O₂.',
    cost: 12,
    effect: { kind: 'lifeSupport', reduction: 0.4 },
    requires: ['life-1'],
  },
]

export function findMetaUpgrade(id: string): MetaUpgradeDef | undefined {
  return META_UPGRADES.find((u) => u.id === id)
}
