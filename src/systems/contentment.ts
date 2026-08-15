import { GENERATORS } from '../data/generators'
import { generatorCount, planet } from '../state/planet.svelte'

/**
 * Zufriedenheit (M14, DESIGN.md §18).
 *
 * Der zweite Faktor auf die Handleistung — und bewusst **nicht** die zweite
 * Sättigung. Die Trennung ist die Zeitskala: Sättigung schwankt mit den
 * Vorräten und fällt bei jedem Engpass sofort, Zufriedenheit wächst über
 * einen ganzen Planeten hinweg und hängt an dem, was dort steht.
 *
 * Sie ist ein **abgeleiteter Wert**, kein gespeicherter. Das ist Absicht:
 *
 * - Ein gespeicherter Wert bräuchte ein Gegenstück, das ihn wieder senkt
 *   (CLAUDE.md: „alles, was wächst, braucht ein Gegenstück"). Hier ist das
 *   Gegenstück eingebaut — Komfort zählt **pro Kopf**, also verdünnt jeder
 *   neue Mensch ihn von selbst.
 * - Ein abgeleiteter Wert kann nicht mit dem Save auseinanderlaufen. Abriss
 *   wirkt sofort und ohne Sonderfall, genauso wie beim Wohnraum.
 */

/**
 * Komfortpunkte, die eine zufriedene Person braucht.
 *
 * Bei 6 Punkten je Gemeinschaftsraum heißt das: einer für zwei Leute. Die
 * Zahl entscheidet, wie schnell Zuwachs den Bonus wieder auffrisst — sie ist
 * der eigentliche Balancing-Hebel dieses Systems.
 */
const COMFORT_PER_CAPITA = 1.5

/**
 * Komfortpunkte, die diese Kolonie für volle Zufriedenheit bräuchte.
 *
 * Eigene Funktion, damit niemand die Rechnung nachbaut. Genau das war
 * passiert: das Balancing-Werkzeug hatte `leute × 3` eingetippt, und als die
 * Konstante auf 1,5 fiel, überbaute der simulierte Spieler um das Doppelte —
 * gemessen wurde danach seine veraltete Regel und nicht die Änderung.
 */
export function comfortNeeded(): number {
  return planet.settlers.toNumber() * COMFORT_PER_CAPITA
}

/** Alle Komfortpunkte, die auf diesem Planeten stehen. */
export function comfortPoints(): number {
  let points = 0
  for (const def of GENERATORS) {
    if (def.output.kind === 'amenity') points += generatorCount(def.id) * def.baseRate
  }
  return points
}

/**
 * 0…1 — wie zufrieden die Kolonie ist.
 *
 * Ohne Bewohner ist sie 0 und nicht etwa 1: ein leerer Planet hat keine
 * zufriedenen Menschen, er hat gar keine. Die Unterscheidung ist wichtig,
 * weil `handFactor()` sonst auf einem unbewohnten Planeten den vollen Bonus
 * gäbe — an Hände, die es nicht gibt.
 */
export function contentment(): number {
  const leute = planet.settlers.toNumber()
  if (leute <= 0) return 0
  return Math.min(1, comfortPoints() / (leute * COMFORT_PER_CAPITA))
}

/**
 * Der Faktor, mit dem Zufriedenheit die Handleistung multipliziert: 1,0 bis
 * 2,0.
 *
 * **Der heutige Wert ist der Startwert, nicht die Obergrenze** (§18). Der
 * naheliegendere Weg — bei 0,5 anfangen und auf 1,0 wachsen — hätte jede der
 * fünf Zieldauern aus §13 ungültig gemacht, ohne dafür etwas anderes zu
 * erzählen.
 */
export function contentmentFactor(): number {
  return 1 + contentment()
}
