/**
 * Die Welten, auf die die Kapseln zufliegen (M17, DESIGN.md §19).
 *
 * Reine Daten — Namensbausteine und Befunde. Zusammengesetzt werden sie mit
 * dem Seed-RNG aus engine/rng.ts, der seit M0 genau dafür dasteht („prozedural
 * ab Planet 6") und bis jetzt nie gebraucht wurde.
 *
 * **Warum überhaupt Namen?** Weil eine Zahl allein nichts erzählt (§1.4). „37
 * Welten erreicht" ist eine Statistik; „Kes-9 trägt, Amaru-4 nicht" ist eine
 * Geschichte, in der man beim zweiten Namen kurz innehält.
 */

/** Erste Silbe — klingt nach Katalognummer, nicht nach Fantasy. */
const STAMM: readonly string[] = [
  'Kes', 'Amaru', 'Tell', 'Nirit', 'Obu', 'Sarn', 'Velo', 'Idra', 'Chal', 'Mero',
  'Tanis', 'Ekur', 'Rasa', 'Yoto', 'Nemet', 'Balis', 'Corvo', 'Hadu', 'Sela', 'Wren',
]

/**
 * Ein Fels bekommt eine Nummer, keinen Titel. Die Menschen, die ihn taufen,
 * sind dreihundert Jahre entfernt und haben ihn nie gesehen.
 */
export function worldName(a: number, b: number): string {
  return `${STAMM[a % STAMM.length]}-${(b % 9) + 1}`
}

/**
 * Was aus einer Kapsel wurde.
 *
 * Bewusst nüchtern und ohne Ausrufezeichen: die Hochrechnung meldet Befunde,
 * keine Erfolge. Und das Scheitern überwiegt — dreihundert Jahre sind eine
 * lange Zeit für einen Behälter von der Größe einer Faust.
 */
export const GELUNGEN: readonly string[] = [
  'trägt. Erster messbarer Anteil nach elf Jahren.',
  'trägt. Die Flechten haben den Nordhang genommen.',
  'trägt, langsam. Der Fels gibt Wasser her, mehr nicht — es reicht.',
  'trägt. Das Rechenwerk meldet sich noch, mit halber Leistung.',
  'trägt. Die Notizen waren gebraucht worden, steht darin.',
]

export const GESCHEITERT: readonly string[] = [
  'stumm. Vermutlich zu kalt.',
  'stumm. Die Kapsel hat den Eintritt nicht überstanden.',
  'stumm. Kein Wasser, nirgends.',
  'stumm. Angekommen und nicht angewachsen.',
  'stumm. Kein Grund erkennbar.',
]
