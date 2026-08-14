/**
 * Aktive Fähigkeiten im Kampf (DESIGN.md §8).
 *
 * Drei Knöpfe mit Abklingzeit, nicht mehr. Der Anspruch aus §8 ist
 * ausdrücklich „2–3 bewusste Klicks pro Welle" — Beteiligung ohne Stress.
 * Wer gar nicht klickt, verliert etwas, aber nichts Endgültiges (§1.3).
 *
 * Jede Fähigkeit hat einen Preis, der im Spiel selbst weh tut, statt eine
 * eigene Währung zu erfinden: die Salve kostet Atmosphäre, die Evakuierung
 * kostet Produktion.
 */
export type AbilityEffect =
  /** Halbiert den Schaden der Welle für `duration` Sekunden. */
  | { kind: 'shield'; factor: number; duration: number }
  /** Sofortschaden an der Welle, bezahlt mit Luft-O₂. */
  | { kind: 'salvo'; damage: number; airCost: number }
  /** Schützt die Bevölkerung für den Rest der Welle, legt dafür Anlagen still. */
  | { kind: 'evacuate'; disableShare: number }

export interface AbilityDef {
  id: string
  name: string
  description: string
  /** Sekunden Abklingzeit. */
  cooldown: number
  effect: AbilityEffect
}

export const ABILITIES: readonly AbilityDef[] = [
  {
    id: 'shield',
    name: 'Notfall-Schild',
    description: 'Halbiert den Schaden der Welle für 20 Sekunden.',
    cooldown: 90,
    effect: { kind: 'shield', factor: 0.5, duration: 20 },
  },
  {
    id: 'salvo',
    name: 'O₂-Salve',
    description:
      'Ein Stoß reinen Sauerstoffs. Hoher Sofortschaden — und ein Loch in der Atmosphäre, das du wieder füllen musst.',
    cooldown: 60,
    effect: { kind: 'salvo', damage: 400, airCost: 0.02 },
  },
  {
    id: 'evacuate',
    name: 'Evakuierung',
    description:
      'Bringt die Siedlung unter Tage. Niemand stirbt mehr in dieser Welle, dafür steht ein Drittel der Anlagen still.',
    cooldown: 240,
    effect: { kind: 'evacuate', disableShare: 0.33 },
  },
]

export function findAbility(id: string): AbilityDef | undefined {
  return ABILITIES.find((a) => a.id === id)
}
