import type { MaterialCost } from './materials'

/**
 * Das Ende (M16).
 *
 * Bis hierher war jeder Abschluss ein Zwischenstand: ein Planet steht stabil,
 * eine Rakete bringt dich weiter, ein Reset bringt Kerne. Das Spiel hatte
 * kein Ende, sondern nur immer neue Anfänge — und damit auch keine Aussage.
 *
 * Erebos liefert die Vorlage dafür, ohne dass es geplant war: dort war schon
 * jemand, hat verloren und **keine Notizen hinterlassen**. Genau das ist das
 * Finale — nicht ein siebter Planet, sondern das Gegenteil davon. Du gibst
 * weiter, was hier gelernt wurde, an Welten, die du nie sehen wirst.
 *
 * Deshalb kostet die Aussaat von *jedem* Planeten etwas. Sie ist die letzte
 * Konsequenz aus §16: kein Planet hat alles, also ist das Ende nur zu haben,
 * wenn man überall war und zurückgekommen ist.
 */
export interface FinaleDef {
  name: string
  /** Ein Satz, der auf der Schaltfläche steht. */
  hint: string
  /** Material aus dem globalen Lager — von jedem Planeten etwas. */
  materialCost: MaterialCost
}

export const FINALE: FinaleDef = {
  name: 'Die Aussaat',
  hint: 'Von jedem Planeten etwas — und von hier aus weiter, als du je fliegen wirst.',
  materialCost: {
    /** Aurora: was die Kolonie selbst gewalzt hat. */
    platten: 5000,
    /** Vesta: der erste fremde Boden. */
    titan: 8000,
    holz: 12000,
    /** Pyra: aus dem Feuer. */
    obsidian: 6000,
    /** Kryo: aus dem Eis. */
    eis: 6000,
    /** Nimbus: aus dem Gas. */
    helium: 4000,
    /** Und was Hände daraus gemacht haben (M14). */
    werkzeug: 40,
    balken: 60,
  },
}

/**
 * Der Epilog, in Absätzen.
 *
 * Bewusst nüchtern und kurz gehalten — das Spiel erzählt seine Geschichte
 * sonst über Zahlen und Anlagenbeschreibungen (§1.4), und ein Ende, das
 * plötzlich pathetisch wird, gehörte einem anderen Spiel. Der letzte Absatz
 * ist die einzige Stelle, an der etwas offen bleiben darf.
 */
export const EPILOG: readonly string[] = [
  'Sechs Atmosphären stehen. Keine davon war vorher da, und keine davon ist deine — sie gehören jetzt denen, die darin atmen.',

  'Die Kapseln sind kleiner, als du gedacht hättest. Kein Schiff, keine Mannschaft: Sporen, Nährsalz, ein Rechenwerk von der Größe einer Faust und die Notizen. Vor allem die Notizen. Auf Erebos hat jemand dasselbe versucht und verloren, und das Einzige, was uns von ihm blieb, war seine vergiftete Luft.',

  'Sie brauchen dreihundert Jahre bis zu den nächsten Sternen. Du wirst nicht erfahren, welche davon ankommen. Das ist keine Tragik, sondern die Rechnung: eine Atmosphäre baut man nicht für sich, sondern für die, die nach einem kommen — das war schon auf Aurora so, als vier Leute in Kapseln saßen und ein Flechtenfeld gossen.',

  'Die Anoxen sind nicht besiegt. Sie waren zuerst hier, und wo sie sich in den Boden zurückgezogen haben, bleiben sie. Auch das steht in den Notizen.',

  'Irgendwo, in einer Nacht in dreihundert Jahren, wird auf einem namenlosen Fels der erste Anteil messbar. Nicht atembar. Messbar.',
]
