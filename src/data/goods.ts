/**
 * Werkstattgüter (M14, DESIGN.md §18).
 *
 * Reine Daten wie alles in diesem Ordner. Der Unterschied zu einem
 * Verarbeitungs-Generator (M12) ist nicht der Stoff, sondern die **Form der
 * Arbeit**: eine Presse läuft, solange jemand an ihr steht, und liefert
 * stetig. Ein Werkstattstück wird *bestellt* — Material sofort weg, das Stück
 * entsteht durch Arbeitersekunden in derselben Reihe, in der auch Gebäude
 * entstehen.
 *
 * Daraus folgt die Entscheidung, um die es geht: dieselbe Kolonne kann in
 * derselben Zeit ein Haus bauen oder Werkzeug machen. Beides zugleich geht
 * nicht.
 */
import type { MaterialCost } from './materials'

export interface GoodDef {
  id: string
  name: string
  /** Ein Satz Fiktion. Zahlen sollen eine Geschichte erzählen (§1.4). */
  description: string
  /** Was ein Stück verbraucht. Sofort fällig, wie bei jeder Bestellung. */
  input: MaterialCost
  /** Welches Material entsteht — id aus data/materials.ts. */
  output: string
  /** Wie viel davon pro Stück. */
  amount: number
  /**
   * Arbeitersekunden pro Stück. Pflichtfeld aus demselben Grund wie
   * `buildWork` an den Anlagen: ein vergessener Wert wäre ein Gut, das in
   * null Zeit dasteht, und damit ein Loch in §17.
   */
  work: number
  /** Ab wie viel jemals freigesetztem O₂ das Rezept sichtbar wird. */
  revealAt: number
}

export const GOODS: readonly GoodDef[] = [
  {
    id: 'balken',
    name: 'Balken',
    description: 'Vier Stämme, eine Säge, ein Nachmittag. Das erste, was nach Handwerk aussieht statt nach Notlage.',
    input: { holz: 4 },
    output: 'balken',
    amount: 1,
    work: 12,
    revealAt: 0,
  },
  {
    id: 'werkzeug',
    name: 'Werkzeug',
    description: 'Zwei Platten, ein Balken, viel Feilen. Wer es in der Hand hat, schafft das Doppelte.',
    input: { platten: 2, balken: 1 },
    output: 'werkzeug',
    amount: 1,
    work: 30,
    revealAt: 0,
  },
]

export function findGood(id: string): GoodDef | undefined {
  return GOODS.find((g) => g.id === id)
}
