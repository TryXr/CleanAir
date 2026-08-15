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
 * Rechnet die Abwesenheit nach. Gedrosselt und gedeckelt, damit
 * Wegbleiben nie die bessere Strategie ist als Spielen.
 */
export function applyOffline(
  elapsedMs: number,
  efficiency: number,
  maxHours: number,
): OfflineResult {
  const elapsedSeconds = Math.max(0, elapsedMs / 1000)
  const cappedSeconds = Math.min(elapsedSeconds, maxHours * 3600)
  const creditedSeconds = cappedSeconds * efficiency
  const ticks = Math.floor(creditedSeconds / TICK_DT)

  catchUp = true
  try {
    runTicks(ticks)
  } finally {
    catchUp = false
  }

  return { elapsedSeconds, creditedSeconds, ticks }
}
