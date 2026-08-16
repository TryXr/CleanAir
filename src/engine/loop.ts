/**
 * Fixer Tick über deltaTime.
 *
 * Alles, was Zeit verbraucht, läuft als registriertes System mit konstantem
 * dt. Dadurch ist Offline-Fortschritt kein Sonderfall, sondern nur „viele
 * Ticks am Stück" — derselbe Code, dieselben Ergebnisse.
 */

export const TICK_RATE = 20
export const TICK_MS = 1000 / TICK_RATE
/** Fester Zeitschritt in Sekunden. Jedes System rechnet gegen diesen Wert. */
export const TICK_DT = 1 / TICK_RATE

export type System = (dt: number) => void

interface Registered {
  name: string
  fn: System
}

const systems: Registered[] = []

/**
 * Reihenfolge = Registrierungsreihenfolge. Sie ist Teil des Balancings
 * (z. B. Produktion vor Verbrauch), also bewusst nicht alphabetisch.
 */
export function registerSystem(name: string, fn: System): void {
  systems.push({ name, fn })
}

/** Führt genau einen Tick aus. */
function tick(): void {
  for (const s of systems) s.fn(TICK_DT)
  totalTicks++
}

/** Führt n Ticks am Stück aus — für Offline-Fortschritt und Tests. */
export function runTicks(count: number): void {
  for (let i = 0; i < count; i++) tick()
}

/**
 * Ein Schritt mit frei gewähltem `dt` — für das Balancing-Werkzeug.
 *
 * Ein Lauf über zwei Stunden Spielzeit sind bei 20 Hz 144 000 Ticks; in
 * Sekundenschritten sind es 7200. Deshalb grob schreiten zu dürfen ist der
 * Unterschied zwischen „misst man mal eben" und „misst man nie".
 *
 * Der Grund, warum das hier steht und nicht im Werkzeug: die
 * **Reihenfolge** der Systeme ist Balancing (siehe registerSystem) und darf
 * nur an einer Stelle stehen. Ein Werkzeug, das sie abschreibt, misst
 * irgendwann ein anderes Spiel als das laufende — genau so ist der erste
 * Messversuch nach M14 danebengegangen: er hatte Bau und Bevölkerung
 * vertauscht und Ereignisse gar nicht.
 */
export function runStep(dt: number): void {
  for (const s of systems) s.fn(dt)
}

let catchUp = false

/**
 * Läuft gerade ein Nachlauf (Offline, Test) statt Echtzeit?
 *
 * Bleibt bewusst spielunabhängig: die Engine sagt nur, in welchem Modus sie
 * tickt. Was das bedeutet, entscheiden die Systeme — Ereignisse etwa spawnen
 * hier nicht, weil zwölf Stunden Abwesenheit sonst hundert Stürme in den Log
 * schreiben würden, die niemand mehr abwenden kann.
 */
export function isCatchUp(): boolean {
  return catchUp
}

let totalTicks = 0
export function getTotalTicks(): number {
  return totalTicks
}

// --- Laufender Betrieb ---------------------------------------------------

let rafId = 0
let lastFrame = 0
let accumulator = 0
let running = false

/**
 * Obergrenze pro Frame. Ohne sie holt ein Tab, der 10 Minuten im Hintergrund
 * lag, alles in einem einzigen Frame nach und friert den Browser ein.
 * Was darüber hinausgeht, übernimmt die Offline-Berechnung.
 */
const MAX_TICKS_PER_FRAME = 100

function frame(now: number): void {
  if (!running) return

  const elapsed = Math.min(now - lastFrame, MAX_TICKS_PER_FRAME * TICK_MS)
  lastFrame = now
  accumulator += elapsed

  let ticks = 0
  while (accumulator >= TICK_MS && ticks < MAX_TICKS_PER_FRAME) {
    accumulator -= TICK_MS
    tick()
    ticks++
  }

  rafId = requestAnimationFrame(frame)
}

export function startLoop(): void {
  if (running) return
  running = true
  lastFrame = performance.now()
  accumulator = 0
  rafId = requestAnimationFrame(frame)
}

export function stopLoop(): void {
  running = false
  cancelAnimationFrame(rafId)
}

export function isRunning(): boolean {
  return running
}

// --- Offline -------------------------------------------------------------

export interface OfflineResult {
  /** Tatsächlich verstrichene Realzeit in Sekunden. */
  elapsedSeconds: number
  /** Davon angerechnet, nach Deckel und Effizienz. */
  creditedSeconds: number
  ticks: number
}

/**
 * Ab wie vielen Sekunden Abwesenheit eine Meldung überhaupt etwas erzählt.
 *
 * **Angerechnet** wird deutlich früher — ab fünf Sekunden, sonst verlöre
 * jeder Tab-Wechsel Zeit, weil `requestAnimationFrame` im Hintergrund
 * stehenbleibt. **Erzählt** werden muss es deswegen aber nicht: der Log ist
 * laut DESIGN.md §15 der Träger der Geschichte und hält nur 200 Einträge.
 *
 * Gemessen in der laufenden Oberfläche: ein Tab, der im Hintergrund lag, hat
 * alle sechs Sekunden „5s abwesend — 2s angerechnet: +0 O₂." geschrieben.
 * Nach zehn Minuten bestand der gesamte Log aus dieser einen Zeile — jedes
 * Ereignis, jeder Sturm, jede Fertigmeldung war herausgeschoben. Ein
 * Nebenläufer hatte damit den Erzählkanal des Spiels überschrieben.
 */
export const REPORT_ABSENCE_SECONDS = 60

/**
 * Ist diese Abwesenheit einen Eintrag im Ereignis-Log wert?
 *
 * Steht hier statt in main.ts, weil dort nichts liegt, was eine Prüfung
 * anfassen kann — und die Entscheidung „was darf in den Log" ist genau die
 * Sorte Regel, die sonst unbemerkt kippt.
 */
export function reportsAbsence(elapsedSeconds: number): boolean {
  return elapsedSeconds >= REPORT_ABSENCE_SECONDS
}

/**
 * Sekunden je Schritt im Nachlauf — zwanzigmal gröber als im laufenden Spiel.
 *
 * Im Betrieb tickt das Spiel mit 20 Hz, weil ein Mensch zusieht. Im Nachlauf
 * sieht niemand zu, und die Feinheit kostet dann nur Rechenzeit.
 */
const CATCHUP_DT = 1

/**
 * Obergrenze der Schritte, egal wie lang die Abwesenheit war.
 *
 * Darüber wird der Schritt gestreckt statt die Zahl erhöht: die Rechenzeit
 * bleibt damit beschränkt, auch wenn der Deckel eines Tages von zwölf auf
 * hundert Stunden stiege.
 */
const MAX_CATCHUP_STEPS = 5000

/**
 * Rechnet die Abwesenheit nach. Gedrosselt und gedeckelt, damit
 * Wegbleiben nie die bessere Strategie ist als Spielen.
 *
 * > **Der Nachlauf lief bis M32 in 20-Hz-Schritten und hat den Browser
 * > eingefroren.** Zwölf Stunden Abwesenheit sind beim voreingestellten
 * > Deckel 21 600 angerechnete Sekunden — mal 20 Hz sind das **432 000 Ticks
 * > am Stück**, synchron, bevor das erste Bild erscheint. Gemessen kostet ein
 * > Tick rund 0,79 ms, unabhängig davon, wie groß der Spielstand ist (es ist
 * > fester Aufwand über elf Systeme, nicht Menge). Macht **342 Sekunden
 * > Standbild** nach einer Nacht — und schon 28 Sekunden nach einer Stunde.
 *
 * Die einzige Stellschraube ist die **Zahl der Schritte**, denn der Aufwand
 * pro Schritt hängt nicht am Spielstand. Gemessen für eine Stunde Nachlauf,
 * gleicher Ausgangsstand:
 *
 * | Schritt | Dauer | O₂ % | N₂ % | Schadstoffe % | Guthaben |
 * |---|---|---|---|---|---|
 * | 0,05 s | 51,6 s | 17,257 | 79,906 | 2,749 | 6 862 685 |
 * | 1 s | 2,7 s | 17,281 | 80,014 | 2,618 | 6 904 246 |
 * | 5 s | 0,5 s | 17,269 | 79,964 | 2,677 | 6 778 032 |
 *
 * Unter 0,2 % Unterschied in der Atmosphäre, unter 1,3 % beim Guthaben, die
 * Bevölkerung auf den Kopf gleich. **Das steht nicht im Widerspruch zu dem
 * Satz aus dev/balance.ts**, dass gröbere Schritte das Ergebnis qualitativ
 * ändern: dort ging es um die *Entscheidungstaktung* des simulierten Spielers
 * — zwischen zwei Käufen läuft der Wert weiter und schießt über sein Fenster.
 * Im Nachlauf kauft niemand etwas; es wird nur integriert.
 */
export function applyOffline(
  elapsedMs: number,
  efficiency: number,
  maxHours: number,
): OfflineResult {
  const elapsedSeconds = Math.max(0, elapsedMs / 1000)
  const cappedSeconds = Math.min(elapsedSeconds, maxHours * 3600)
  const creditedSeconds = cappedSeconds * efficiency

  /*
   * **Mindestens ein Schritt, sobald überhaupt Zeit anzurechnen ist.**
   *
   * `floor(credited / 1)` allein verschluckt alles unter einer Sekunde. Bei
   * der Voreinstellung fällt das nie auf — fünf Sekunden Abwesenheit sind
   * 2,5 angerechnete —, aber wer die Anrechnung in den Einstellungen auf 10 %
   * stellt, bekäme für kurze Pausen **null** Schritte und damit gar nichts.
   * Das wäre verschenkte Zeit aus einem Rundungsfehler, und §1.3 verlangt das
   * Gegenteil.
   */
  const ticks =
    creditedSeconds > 0
      ? Math.min(Math.max(1, Math.floor(creditedSeconds / CATCHUP_DT)), MAX_CATCHUP_STEPS)
      : 0
  // Der Schritt trägt die volle angerechnete Zeit — auch wenn die Zahl der
  // Schritte gedeckelt ist, geht dem Spieler keine Sekunde verloren.
  const dt = ticks > 0 ? creditedSeconds / ticks : 0

  catchUp = true
  try {
    for (let i = 0; i < ticks; i++) runStep(dt)
  } finally {
    catchUp = false
  }

  return { elapsedSeconds, creditedSeconds, ticks }
}
