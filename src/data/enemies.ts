/**
 * Die Anoxen (DESIGN.md §7).
 *
 * Der Twist: Sauerstoff ist für sie Gift. Aus ihrer Sicht ist der Spieler der
 * Angreifer, der ihre Heimat vergiftet — und ihre Waffe ist nicht Schaden,
 * sondern **Rückschritt**. Sie legen Anlagen lahm und pumpen Methan in die
 * Luft, sodass der Fortschrittsbalken rückwärts läuft. Für ein Incremental
 * ist das bedrohlicher als jede Trefferpunkteleiste.
 *
 * Reine Daten. Wann eine Welle kommt und wie sie ausgeht, steht in
 * systems/combat.ts.
 */

/** Woran eine Einheit arbeitet — das bestimmt zugleich ihren Konter. */
export type EnemyKind =
  /** Legt Anlagen lahm. */
  | 'schuerfer'
  /** Ignoriert Gebäude, pumpt Methan in die Atmosphäre. */
  | 'speier'
  /** Gepanzert. Türme beißen sich daran die Zähne aus. */
  | 'panzer'

export interface EnemyDef {
  id: EnemyKind
  name: string
  description: string
  /** Anteil an der Kampfkraft einer Welle, bevor Planetenmodifikatoren wirken. */
  weight: number
  /**
   * Was diese Einheit anrichtet, je Kampfkraftpunkt und Sekunde.
   * Genau eines der drei ist gesetzt.
   */
  effect:
    | { kind: 'disable'; unitsPerPower: number }
    | { kind: 'methane'; pollutionPerPower: number }
    | { kind: 'kill'; settlersPerPower: number }
}

export const ENEMIES: readonly EnemyDef[] = [
  {
    id: 'schuerfer',
    name: 'Schürfer',
    description: 'Gräbt sich unter die Anlagen und frisst die Leitungen. Was er erreicht, steht still.',
    weight: 4,
    effect: { kind: 'disable', unitsPerPower: 0.012 },
  },
  {
    id: 'speier',
    name: 'Speier',
    description: 'Ignoriert alles Gebaute und bläst Methan in den Himmel. Dein Fenster wandert.',
    weight: 3,
    effect: { kind: 'methane', pollutionPerPower: 90 },
  },
  {
    id: 'panzer',
    name: 'Panzerform',
    description: 'Träge, dick und gegen Sauerstoff völlig gleichgültig. Nur Druck bringt sie um.',
    weight: 2,
    effect: { kind: 'kill', settlersPerPower: 0.05 },
  },
]

export function findEnemy(id: string): EnemyDef | undefined {
  return ENEMIES.find((e) => e.id === id)
}
