/**
 * Save-Migrationen.
 *
 * Regel: Ein veröffentlichtes Save-Format wird nie rückwirkend geändert.
 * Wenn sich die Struktur ändert, steigt SAVE_VERSION um eins und hier kommt
 * ein Eintrag dazu, der von der Vorversion auf die neue hebt.
 *
 * Der Schlüssel ist die Zielversion:
 *   2: (s) => ...   hebt einen Save der Version 1 auf Version 2.
 */

export type SaveShape = Record<string, unknown>

export const MIGRATIONS: Record<number, (s: SaveShape) => SaveShape> = {
  // Version 1 ist das Ausgangsformat — hier steht bewusst noch nichts.
  //
  // Beispiel für später (M3, wenn der N₂-Puffer dazukommt):
  // 2: (s) => {
  //   const planet = (s.planet ?? {}) as SaveShape
  //   planet.nitrogen = '0'
  //   s.planet = planet
  //   return s
  // },
}

export interface MigrationResult {
  save: SaveShape
  /** Angewendete Zielversionen, für den Log. */
  applied: number[]
}

/** Hebt einen Save schrittweise auf die Zielversion. */
export function runMigrations(save: SaveShape, targetVersion: number): MigrationResult {
  const from = typeof save.version === 'number' ? save.version : 0
  const applied: number[] = []

  let current = save
  for (let v = from + 1; v <= targetVersion; v++) {
    const migrate = MIGRATIONS[v]
    if (!migrate) continue
    current = migrate(current)
    applied.push(v)
  }

  current.version = targetVersion
  return { save: current, applied }
}
