export type LogKind = 'info' | 'good' | 'warn' | 'bad'

export interface LogEntry {
  id: number
  at: number
  kind: LogKind
  text: string
}

/** Nur die letzten N Einträge behalten — der Log läuft stundenlang mit. */
const MAX_ENTRIES = 200

let nextId = 1

export const log = $state({
  entries: [] as LogEntry[],
})

/**
 * Das Ereignis-Log ist laut DESIGN.md auch der Träger der Story
 * (Kapitel 15) — deshalb bewusst früh im Gerüst und nicht als Debug-Ausgabe.
 */
export function addLog(text: string, kind: LogKind = 'info'): void {
  log.entries.unshift({ id: nextId++, at: Date.now(), kind, text })
  if (log.entries.length > MAX_ENTRIES) log.entries.length = MAX_ENTRIES
}

export function clearLog(): void {
  log.entries = []
}
