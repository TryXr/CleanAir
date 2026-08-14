import { runMigrations, type SaveShape } from './migrations'
import { deserializeMeta, serializeMeta } from '../state/meta.svelte'
import { deserializePlanet, serializePlanet } from '../state/planet.svelte'
import { deserializeRun, serializeRun } from '../state/run.svelte'
import { deserializeSettings, serializeSettings } from '../state/settings.svelte'
import { session } from '../state/session.svelte'

export const SAVE_KEY = 'cleanair.save'

/** Bei jeder Struktur­änderung erhöhen und in migrations.ts eintragen. */
export const SAVE_VERSION = 9

export interface SaveData extends SaveShape {
  version: number
  savedAt: number
}

export function buildSave(): SaveData {
  return {
    version: SAVE_VERSION,
    savedAt: Date.now(),
    meta: serializeMeta(),
    planet: serializePlanet(),
    run: serializeRun(),
    settings: serializeSettings(),
  }
}

/**
 * Wurde der Stand bewusst verworfen?
 *
 * Ohne diese Sperre wirkt Löschen nicht: `wipeSave()` entfernt den Eintrag,
 * der übliche `location.reload()` danach löst aber `beforeunload` aus — und
 * der Handler schreibt den noch im Speicher stehenden Stand sofort wieder
 * hin. Man landet nach dem Neuladen auf demselben Planeten wie vorher.
 *
 * Die Sperre gilt bis zum Neuladen. Ein Import hebt sie auf, denn wer
 * importiert, will wieder gespeichert haben.
 */
let discarded = false

export function saveGame(): boolean {
  if (discarded) return false
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(buildSave()))
    return true
  } catch {
    // Quota voll oder Storage gesperrt (Privatmodus). Kein Absturz deswegen.
    return false
  }
}

/**
 * Speichern inklusive UI-Rückmeldung. Der reguläre Weg aus dem Spiel heraus —
 * `saveGame()` bleibt der stumme Unterbau für Tests und Import.
 */
export function saveNow(): boolean {
  // Kein Fehler, sondern Absicht: nach dem Verwerfen gibt es nichts zu
  // speichern. Ein rotes „Speichern fehlgeschlagen" wäre hier gelogen.
  if (discarded) return true

  const ok = saveGame()
  session.saveFailed = !ok
  if (ok) session.lastSavedAt = Date.now()
  return ok
}

export type LoadStatus =
  | 'loaded'
  | 'empty'
  /** Nicht lesbar — der defekte Stand bleibt liegen, statt überschrieben zu werden. */
  | 'corrupt'
  /** Save stammt aus einer neueren Spielversion. */
  | 'future'

export interface LoadResult {
  status: LoadStatus
  /** Realzeit seit dem letzten Speichern, in Millisekunden. */
  awayMs: number
  appliedMigrations: number[]
}

export function loadGame(): LoadResult {
  const empty: LoadResult = { status: 'empty', awayMs: 0, appliedMigrations: [] }

  let text: string | null = null
  try {
    text = localStorage.getItem(SAVE_KEY)
  } catch {
    return empty
  }
  if (!text) return empty

  let parsed: SaveShape
  try {
    parsed = JSON.parse(text) as SaveShape
  } catch {
    return { status: 'corrupt', awayMs: 0, appliedMigrations: [] }
  }

  const version = typeof parsed.version === 'number' ? parsed.version : 0
  if (version > SAVE_VERSION) {
    return { status: 'future', awayMs: 0, appliedMigrations: [] }
  }

  const { save, applied } = runMigrations(parsed, SAVE_VERSION)

  deserializeSettings(save.settings)
  deserializeMeta(save.meta)
  deserializeRun(save.run)
  deserializePlanet(save.planet)

  const savedAt = typeof save.savedAt === 'number' ? save.savedAt : Date.now()
  return {
    status: 'loaded',
    awayMs: Math.max(0, Date.now() - savedAt),
    appliedMigrations: applied,
  }
}

export function wipeSave(): void {
  discarded = true
  try {
    localStorage.removeItem(SAVE_KEY)
  } catch {
    /* egal — der Aufrufer lädt gleich ohnehin neu */
  }
}

// --- Export / Import als Textblock ---------------------------------------

function encodeBase64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  // In Blöcken, weil String.fromCharCode(...bytes) bei großen Saves
  // den Call-Stack sprengt.
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}

function decodeBase64(encoded: string): string {
  const binary = atob(encoded)
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export function exportSave(): string {
  return encodeBase64(JSON.stringify(buildSave()))
}

export function importSave(encoded: string): boolean {
  try {
    const parsed = JSON.parse(decodeBase64(encoded.trim())) as SaveShape
    const version = typeof parsed.version === 'number' ? parsed.version : 0
    if (version > SAVE_VERSION) return false

    const { save } = runMigrations(parsed, SAVE_VERSION)
    // Reihenfolge und Vollständigkeit müssen zu loadGame() passen: fehlt hier
    // ein Teilzustand, verliert ein Import genau ihn — der Durchlauf-Zustand
    // ist so seit M4 stillschweigend verschwunden.
    deserializeSettings(save.settings)
    deserializeMeta(save.meta)
    deserializeRun(save.run)
    deserializePlanet(save.planet)
    // Wer importiert, will wieder gespeichert haben.
    discarded = false
    saveGame()
    return true
  } catch {
    return false
  }
}
