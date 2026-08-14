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

  /**
   * M6: dauerhafte Planeten, Rakete, Reset auf Durchlauf-Ebene.
   *
   * Der bisherige Stand wird zum aktiven Planeten des laufenden Durchlaufs.
   * Raketen gab es vorher nicht, also steht keine. Und weil bisher
   * `planetsCompleted` den Fortschritt *ersetzte*, wird daraus die
   * Freischaltliste abgeleitet: wer schon auf Vesta stand, darf weiterhin
   * dorthin — sonst säße er nach dem Laden auf einem gesperrten Planeten.
   */
  7: (s) => {
    const planet = (s.planet ?? {}) as SaveShape
    planet.rocketBuilt = false
    s.planet = planet

    const meta = (s.meta ?? {}) as SaveShape
    const stats = (meta.stats ?? {}) as SaveShape
    stats.runs = 0
    meta.stats = stats
    s.meta = meta

    const run = (s.run ?? {}) as SaveShape
    const activeId = typeof planet.id === 'string' ? planet.id : 'aurora'
    run.unlocked = activeId === 'aurora' ? ['aurora'] : ['aurora', activeId]
    run.planets = {}
    s.run = run
    return s
  },

  /** M8: die Anoxen. Verteidigung, Wellen, lahmgelegte Anlagen. */
  8: (s) => {
    const planet = (s.planet ?? {}) as SaveShape
    planet.defenses = {}
    planet.disabled = {}
    // Bedrohung beginnt bei null: wer auf einem alten Stand mitten auf Pyra
    // steht, soll nicht in der ersten Sekunde von einer Welle überrascht
    // werden, gegen die er noch nichts gebaut haben konnte.
    planet.threat = 0
    planet.waveNumber = 0
    planet.wavePower = 0
    planet.waveRemaining = 0
    planet.cooldowns = {}
    planet.shieldRemaining = 0
    planet.evacuated = false
    s.planet = planet

    const meta = (s.meta ?? {}) as SaveShape
    const stats = (meta.stats ?? {}) as SaveShape
    stats.wavesSeen = 0
    stats.wavesRepelled = 0
    stats.abilitiesUsed = 0
    stats.settlersLost = 0
    meta.stats = stats
    s.meta = meta
    return s
  },

  /**
   * M9: Achievements mit Effekt.
   *
   * Bewusst leer statt rückwirkend vergeben: die Prüfung läuft im Tick und
   * schaltet beim ersten Laden alles frei, was der Spieler ohnehin längst
   * erfüllt hat. Rückwirkendes Eintragen hier würde dieselbe Arbeit doppelt
   * machen — und stillschweigend, ohne die Meldung im Log.
   */
  9: (s) => {
    const meta = (s.meta ?? {}) as SaveShape
    meta.achievements = []
    s.meta = meta
    return s
  },

  /** M9: Ton. */
  10: (s) => {
    const settings = (s.settings ?? {}) as SaveShape
    settings.soundEnabled = true
    settings.soundVolume = 0.35
    s.settings = settings
    return s
  },

  /**
   * M10: Bewohner, Zuweisung und Sättigung (§17).
   *
   * Ein alter Stand hat weder Zuweisungen noch eine Sättigung. Volle
   * Sättigung als Start ist die freundliche Wahl: niemand soll nach dem
   * Laden in einer Hungersnot aufwachen, die er nicht verschuldet hat.
   */
  11: (s) => {
    const planet = (s.planet ?? {}) as SaveShape
    planet.staff = {}
    planet.satiety = 1
    s.planet = planet
    return s
  },

  /**
   * M10-Nachtrag: Berufe und Zuwanderungsregler entfallen (§17).
   *
   * Berufe waren Bonusgeber und sind durch die Zuweisung an Anlagen ersetzt.
   * Zuwanderung passiert automatisch, sobald Rationen und Wohnraum reichen —
   * wer weniger Menschen will, reißt Wohnraum ab.
   *
   * Beide Felder werden gelöscht statt übersetzt: sie haben in der neuen
   * Mechanik keine Entsprechung, und ein stiller Rest im Save wäre nur eine
   * Falle für den nächsten Leser.
   */
  12: (s) => {
    const planet = (s.planet ?? {}) as SaveShape
    delete planet.jobs
    delete planet.immigration
    s.planet = planet
    return s
  },

  /**
   * M11: Bauen kostet Hände und Zeit; das Lager ist endlich (§17).
   *
   * Keine offene Baustelle und keine Baukolonne — ein alter Stand hat beides
   * nie gekannt. Was schon gebaut ist, bleibt gebaut: rückwirkend Gebäude in
   * Baustellen zu verwandeln wäre ein Rückschritt für etwas längst Bezahltes.
   *
   * Das Lager wird bewusst **nicht** auf die neue Grenze gestutzt. Wer mit
   * 50 000 Titan lädt, behält sie — die Kapazität stoppt ab jetzt den
   * Nachschub, sie vernichtet nichts (§1.2). Ohne diese Entscheidung würde
   * die Migration stillschweigend Stunden an Förderarbeit löschen.
   */
  13: (s) => {
    const planet = (s.planet ?? {}) as SaveShape
    planet.sites = []
    planet.builders = 0
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
