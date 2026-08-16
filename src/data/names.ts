import { createRng } from '../engine/rng'

/**
 * Namen für die Kolonie (M27, DESIGN.md §17).
 *
 * **Nur wo Einzelne vorkommen.** Die Bevölkerung zählt in Dutzenden bis
 * Hunderten (gemessen 60 bis 437 je Planet), ein Personenregister wäre also
 * viel Oberfläche für wenig — und genau das Micromanagement, das §17
 * abgeschafft hat. Namen tauchen deshalb nur dort auf, wo das Spiel ohnehin
 * von *einem* Menschen erzählt: wer einen Bergungstrupp anführt, und wer eine
 * Etappe eines Bauwerks fertig gemacht hat.
 *
 * Das ist §1.4 („Zahlen erzählen eine Geschichte") mit dem billigsten
 * denkbaren Mittel: eine Liste, eine Funktion, ein paar Log-Zeilen. Kein
 * Zustand, keine Bedienung, kein Panel.
 *
 * **Der Name hängt am Anlass, nicht an der Uhr.** `nameFor()` würfelt aus
 * einem Schlüssel — „Trupp zur Landefähre, dritter Anlauf" ergibt immer
 * denselben Menschen, auch nach einem Neuladen. Derselbe Grundsatz wie beim
 * Zwischenfall in systems/salvage.ts und bei der Hochrechnung in §19: ein
 * Zufall, den man neu würfeln kann, ist keiner.
 *
 * Die Auswahl ist bewusst breit gestreut. Wer aufbricht, um einen fremden
 * Planeten atembar zu machen, kommt von überall her — eine Liste aus einer
 * einzigen Sprachregion würde eine Behauptung aufstellen, die dieses Spiel
 * nirgends sonst macht.
 */

const VORNAMEN: readonly string[] = [
  'Amara', 'Anselm', 'Ayla', 'Bogdan', 'Chidi', 'Dagny', 'Eitan', 'Elif',
  'Fumiko', 'Georgi', 'Hania', 'Idris', 'Ingrid', 'Jarek', 'Juno', 'Kwame',
  'Lieve', 'Lucía', 'Mahdi', 'Marisol', 'Nadia', 'Niko', 'Oona', 'Osei',
  'Petra', 'Rashid', 'Rina', 'Samir', 'Sanna', 'Sena', 'Tadeo', 'Thandi',
  'Ulla', 'Vikram', 'Wanjiru', 'Yara', 'Yusuf', 'Zofia',
]

const NACHNAMEN: readonly string[] = [
  'Adeyemi', 'Almeida', 'Bauer', 'Costa', 'Duval', 'Eriksen', 'Farkas',
  'Gomes', 'Haddad', 'Ibarra', 'Jansen', 'Kaur', 'Kovač', 'Larsen', 'Mbeki',
  'Moreau', 'Nakamura', 'Novak', 'Okafor', 'Oyelaran', 'Petrov', 'Quintero',
  'Reyes', 'Sadiq', 'Salonen', 'Tanaka', 'Ustinov', 'Vargas', 'Weber',
  'Yildiz', 'Zheng',
]

/**
 * Ein Mensch zu diesem Anlass — immer derselbe für denselben Schlüssel.
 *
 * Der Schlüssel soll den *Anlass* beschreiben und nichts Flüchtiges
 * enthalten: `bergung:aurora:lander:3` ist gut, alles mit `Date.now()` darin
 * wäre der Zufall, den ein Neuladen wegwirft.
 */
export function nameFor(key: string): string {
  const rng = createRng(`name:${key}`)
  const vor = rng.pick(VORNAMEN) ?? 'Ada'
  const nach = rng.pick(NACHNAMEN) ?? 'Kern'
  return `${vor} ${nach}`
}

/** Für Prüfungen: wie viele verschiedene Namen die Listen hergeben. */
export function nameCount(): number {
  return VORNAMEN.length * NACHNAMEN.length
}
