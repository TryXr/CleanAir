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

  /** M3: Atmosphären-Mischung, Stabilitäts-Timer, Forschung, Ereignisse. */
  4: (s) => {
    const planet = (s.planet ?? {}) as SaveShape
    // Bis M3 bestand die Luft nur aus O₂. Ein Puffer war nie aufgebaut
    // worden, Schadstoffe gab es nicht — beide starten also bei null, und
    // der Spieler beginnt die Mischung auf dem laufenden Planeten.
    planet.airN2 = '0'
    planet.pollution = '0'
    planet.stability = 0
    planet.events = []
    planet.nextEventIn = 150
    s.planet = planet

    const meta = (s.meta ?? {}) as SaveShape
    meta.researchNodes = {}
    // Die Statistik beginnt nicht bei null, sondern mit dem, was der Save
    // schon weiß. Alles andere wäre eine Lüge über die eigene Spielzeit.
    meta.stats = {
      totalOxygen: typeof planet.oxygenTotal === 'string' ? planet.oxygenTotal : '0',
      totalClicks: typeof planet.clicks === 'number' ? planet.clicks : 0,
      eventsSeen: 0,
      eventsHandled: 0,
      fires: 0,
      bestPlanetSeconds: 0,
    }
    s.meta = meta
    return s
  },

  /** M4: Materialien mit globalem Lager, Wald als erste Kette. */
  5: (s) => {
    const planet = (s.planet ?? {}) as SaveShape
    planet.trees = '0'
    s.planet = planet

    // Die dritte Lebensdauer aus DESIGN.md §16. Ein alter Stand hat noch
    // kein Lager — angefangen wird bei leer, nicht bei geschenkt.
    s.run = { materials: {} }
    return s
  },

  /** M5: Bevölkerung braucht Wohnraum, Nahrung und Wasser; dazu Berufe. */
  6: (s) => {
    const planet = (s.planet ?? {}) as SaveShape
    // Leere Vorräte wären hart: ein alter Stand hat Siedler, aber noch keine
    // Hydroponik. Ein Startvorrat gibt Zeit, die ersten Hallen zu bauen,
    // statt die Kolonie beim Laden verhungern zu lassen.
    planet.food = '500'
    planet.water = '500'
    planet.bound = '0'
    planet.jobs = {}
    s.planet = planet
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
