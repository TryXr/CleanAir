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
  /** M1: Generatoren, Upgrades und Abschlusszustand kommen zum Planeten dazu. */
  2: (s) => {
    const planet = (s.planet ?? {}) as SaveShape
    planet.generators = {}
    planet.upgrades = []
    planet.clicks = 0
    planet.completed = false
    s.planet = planet
    return s
  },

  /** M2: Luft-O₂ getrennt vom Vorrat, Bevölkerung, Biomasse, Meta-Baum. */
  3: (s) => {
    const planet = (s.planet ?? {}) as SaveShape
    // Bis M2 war der Atmosphärenwert das kumulierte O₂. Genau das war der
    // Stand der Luft, also übernimmt airO2 diesen Wert unverändert — der
    // Spieler verliert durch die Umstellung keinen Fortschritt.
    const produced = typeof planet.oxygenTotal === 'string' ? planet.oxygenTotal : '0'
    planet.airO2 = produced
    planet.biomass = produced
    planet.settlers = '0'
    planet.immigration = 1
    s.planet = planet

    const meta = (s.meta ?? {}) as SaveShape
    meta.metaUpgrades = []
    s.meta = meta
    return s
  },
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
