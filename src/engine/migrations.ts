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

  /**
   * M14: Zufriedenheit und die Werkstatt (§18).
   *
   * Die Bestellreihe trägt seit M14 ein `art`-Feld, weil dort jetzt auch
   * Werkstattgüter stehen. Alles, was ein alter Stand enthält, ist eine
   * Anlage — die Werkstatt gab es noch nicht.
   *
   * Zufriedenheit selbst braucht **kein** Feld: sie wird aus den stehenden
   * Anlagen abgeleitet (systems/contentment.ts). Ein gespeicherter Wert
   * könnte mit dem Save auseinanderlaufen und bräuchte ein eigenes
   * Gegenstück; der abgeleitete hat beides nicht.
   */
  /**
   * M16: das Ende (§19).
   *
   * Nichts umzurechnen — `finaleReached` liest sich aus einem alten Save von
   * selbst als `false`, und das ist auch richtig: wer vor M16 gespielt hat,
   * hat nicht ausgesät. Der Eintrag steht trotzdem hier, weil die Regel aus
   * CLAUDE.md keine Ausnahme für „ist ja nur ein Feld" kennt — ein
   * stillschweigend übersprungener Versionssprung ist genau die Stelle, an
   * der später niemand mehr weiß, ob eine Migration fehlt oder überflüssig
   * war.
   */
  15: (s) => s,

  /**
   * M17: die Hochrechnung nach der Aussaat (§19).
   *
   * Ebenfalls nichts umzurechnen: die Zähler lesen sich aus einem alten Save
   * als null, und wer nie ausgesät hat, hat auch keine Kapseln unterwegs.
   */
  16: (s) => s,

  /**
   * M18: Bergung (§20.2).
   *
   * Nichts umzurechnen — `expeditions`, `salvageRuns` und `salvageDepletion`
   * lesen sich aus einem alten Save als leer, und das ist der richtige
   * Zustand: wer vor M18 gespielt hat, hat niemanden draußen. Der Eintrag
   * steht trotzdem hier, aus demselben Grund wie 15 und 16.
   */
  17: (s) => s,

  /**
   * M19: Bauwerke (§20.3).
   *
   * `landmarkStage` liest sich aus einem alten Save als 0 — niemand hat vor
   * M19 gebaut. Die neue Baustellenart `bauwerk` braucht ebenfalls nichts:
   * ein alter Save kennt sie nicht, und der Leser in planet.svelte.ts fällt
   * für unbekannte Arten auf `anlage` zurück.
   */
  18: (s) => s,

  /**
   * M20: Baupläne (§20.1).
   *
   * **Hier ist ausnahmsweise etwas umzurechnen.** Ein alter Stand hat die
   * verschlossenen Anlagen längst gebaut — wer nach dieser Version lädt,
   * darf nicht plötzlich vor einem Schloss stehen, dessen Schlüssel er vor
   * Stunden verdient hat. Alles, was irgendwo steht, gilt deshalb als
   * bekannt: auf dem aktiven Planeten und in jedem eingelagerten.
   */
  /*
   * M26: Erfolge messen Summen statt Bestände (§15).
   *
   * `meta.stats.materialsMined` und `meta.stats.totalResearch` kommen dazu.
   * **Die Migration füllt sie bewusst nicht auf** — was vor der Zählung
   * gefördert wurde, weiß niemand mehr, und eine geratene Zahl wäre schlimmer
   * als eine ehrliche Null: sie könnte einen Erfolg vergeben, den es nicht
   * gab, oder einen knapp verpassen lassen.
   *
   * Ein bestehender Spielstand verliert dadurch nichts: die vier betroffenen
   * Erfolge waren am Bestand gemessen ohnehin kaum erreichbar, und einmal
   * vergebene Erfolge stehen in `meta.achievements` und bleiben. Die
   * defensiven Leser in state/meta.svelte.ts liefern für beide Felder 0, der
   * Eintrag hier steht trotzdem — damit die Versionskette lückenlos bleibt
   * und die Absicht dokumentiert ist.
   */
  20: (s) => s,

  19: (s) => {
    const bekannt = new Set<string>(Array.isArray(s.meta && (s.meta as SaveShape).blueprints) ? ((s.meta as SaveShape).blueprints as string[]) : [])

    const sammle = (roh: unknown): void => {
      const gen = ((roh ?? {}) as SaveShape).generators
      if (!gen || typeof gen !== 'object') return
      for (const [id, n] of Object.entries(gen as Record<string, unknown>)) {
        if (typeof n === 'number' && n > 0) bekannt.add(id)
      }
    }

    sammle(s.planet)
    const run = (s.run ?? {}) as SaveShape
    for (const stored of Object.values((run.planets ?? {}) as Record<string, unknown>)) sammle(stored)

    const meta = (s.meta ?? {}) as SaveShape
    meta.blueprints = [...bekannt]
    s.meta = meta
    return s
  },

  14: (s) => {
    const planet = (s.planet ?? {}) as SaveShape
    const sites = Array.isArray(planet.sites) ? planet.sites : []
    planet.sites = sites.map((raw) => ({ ...((raw ?? {}) as object), art: 'anlage' }))
    s.planet = planet

    // Eingelagerte Planeten führen ihre eigene Reihe — sie gehören mit.
    const run = (s.run ?? {}) as SaveShape
    const planets = (run.planets ?? {}) as Record<string, SaveShape>
    for (const stored of Object.values(planets)) {
      const gelagert = Array.isArray(stored?.sites) ? stored.sites : []
      if (stored) stored.sites = gelagert.map((raw) => ({ ...((raw ?? {}) as object), art: 'anlage' }))
    }
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
