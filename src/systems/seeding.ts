import { GELUNGEN, GESCHEITERT, worldName } from '../data/worlds'
import { createRng } from '../engine/rng'
import { meta } from '../state/meta.svelte'

/**
 * Die Hochrechnung nach der Aussaat (M17, DESIGN.md §19).
 *
 * **Sie widerspricht dem Epilog nicht.** Dort steht: „Du wirst nicht
 * erfahren, welche davon ankommen." Genau deshalb ist das hier keine
 * Funkverbindung, sondern ein Modell — die Notizen rechnen weiter, während
 * die Kapseln fliegen. Was das Panel zeigt, ist eine Erwartung und keine
 * Nachricht, und die Zeilen sind entsprechend formuliert.
 *
 * Sie läuft als registriertes System und damit auch offline (Regel 1) — was
 * hier passt wie sonst nirgends: dreihundert Jahre vergehen nicht, während
 * man zusieht.
 */

/** Sekunden Spielzeit je Meldung. */
const SECONDS_PER_CAPSULE = 90

/** Wie viele Befunde die Anzeige behält. */
const LOG_LIMIT = 8

/**
 * Wie viele Kapseln die Aussaat mitgibt.
 *
 * Hängt an der Biomasse des Durchlaufs und damit — über `contentmentFactor()`
 * — daran, **wie gut die Kolonien gelebt haben**. Das ist die Stelle, an der
 * Zufriedenheit endlich sichtbar wird: sie zahlt nicht auf Tempo ein (das war
 * die falsche Form, §18), sondern darauf, wie weit die Aussaat reicht.
 *
 * Die Wurzel hält den Abstand zwischen einem ordentlichen und einem
 * perfekten Durchlauf angenehm klein — Faktor zwei in der Biomasse sind
 * Faktor 1,41 in den Kapseln, nicht Faktor zwei.
 */
export function capsulesFor(biomass: number): number {
  if (biomass <= 0) return 12
  return 12 + Math.floor(Math.sqrt(biomass / 5000))
}

/**
 * Ob eine Kapsel anwächst.
 *
 * Fest verdrahtet auf ein Drittel und bewusst nicht verbesserbar: die
 * Aussaat ist kein weiteres System zum Optimieren, sondern ein Nachhall. Wer
 * mehr Treffer will, schickt mehr Kapseln — das ist die einzige Schraube, und
 * sie sitzt vor dem Abflug.
 */
const TAKE_CHANCE = 1 / 3

/**
 * Der Zufall hängt am Zeitpunkt der Aussaat, nicht an der Uhr.
 *
 * Damit meldet derselbe Spielstand immer dieselben Welten — ein Reload darf
 * keine anderen Befunde erzeugen, sonst ist der Nachhall bloß ein
 * Zufallsgenerator mit Text.
 */
function rngFor(index: number) {
  return createRng(`aussaat:${meta.finaleAt}:${index}`)
}

export function capsulesUnderway(): number {
  return Math.max(0, meta.capsules - meta.capsulesResolved)
}

export function seedingSystem(dt: number): void {
  if (!meta.finaleReached) return
  if (capsulesUnderway() <= 0) return

  meta.capsuleProgress += dt
  // Eine Schleife, weil der Offline-Nachlauf viele Meldungen auf einmal
  // bringt — sonst käme nach zwölf Stunden Abwesenheit genau eine.
  while (meta.capsuleProgress >= SECONDS_PER_CAPSULE && capsulesUnderway() > 0) {
    meta.capsuleProgress -= SECONDS_PER_CAPSULE

    const index = meta.capsulesResolved
    const rng = rngFor(index)
    const name = worldName(rng.int(0, 999), rng.int(0, 999))
    const traegt = rng.chance(TAKE_CHANCE)
    const zeilen = traegt ? GELUNGEN : GESCHEITERT
    const text = `${name} ${zeilen[rng.int(0, zeilen.length - 1)]}`

    meta.capsulesResolved += 1
    if (traegt) meta.capsulesTaken += 1
    meta.seedLog = [...meta.seedLog, text].slice(-LOG_LIMIT)
  }
}
