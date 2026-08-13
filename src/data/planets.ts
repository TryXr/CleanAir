/**
 * Planetendefinitionen.
 *
 * Ein Planet führt genau ein neues System ein (DESIGN.md §11):
 * Aurora nur O₂, Vesta die Bevölkerung. N₂-Puffer, Schadstoffe, Druck und
 * Temperatur bekommen ihre Felder erst, wenn der Planet sie einführt —
 * nicht vorsorglich.
 */
export interface PlanetDef {
  id: string
  name: string
  /** Zeile im Log beim Betreten. */
  intro: string

  /**
   * Sättigungskonstante der Atmosphärenkurve:
   *   anteil% = atmosphereMax × luftO₂ / (luftO₂ + atmosphereK)
   *
   * Eine Sättigungskurve statt „linear bis Ziel", damit die letzten
   * Prozentpunkte spürbar zäher werden und Generatoren bis zum Schluss
   * einen Zweck haben.
   */
  atmosphereK: number
  /** Asymptote der Kurve. Wird nie ganz erreicht. */
  atmosphereMax: number
  /** Untergrenze des Zielfensters — ab hier ist der Planet atembar. */
  targetO2: number

  /** Führt dieser Planet Bevölkerung ein? Aurora bewusst nicht. */
  allowsPopulation: boolean
  /** Ab diesem O₂-Anteil landen die ersten Siedler. */
  settleAt: number
  /** Bevölkerungsobergrenze bei vollständig atembarer Atmosphäre. */
  popCapacity: number
}

export const AURORA: PlanetDef = {
  id: 'aurora',
  name: 'Aurora',
  intro: 'Aurora. Kein Grün, kein Laut, keine Atmosphäre. Der erste Handgriff gehört dir.',

  /**
   * Simuliert, nicht geschätzt: mit diesem K erreichen vier Spielstile
   * das Zielfenster nach 20,0 / 21,2 / 23,6 / 25,6 Minuten — das Fenster
   * aus DESIGN.md §13.
   */
  atmosphereK: 1650000,
  atmosphereMax: 30,
  targetO2: 19,

  allowsPopulation: false,
  settleAt: 0,
  popCapacity: 0,
}

export const VESTA: PlanetDef = {
  id: 'vesta',
  name: 'Vesta',
  intro:
    'Vesta ist größer und kälter als Aurora — und diesmal kommen Menschen mit. Sie atmen, was du produzierst.',

  /**
   * Simuliert: 32,5 / 34,5 / 38,2 Minuten bei 100 / 50 / 25 % Zuwanderung.
   * Zielfenster für Planet 2 laut DESIGN.md §13 sind 30–45 min aktiv.
   */
  atmosphereK: 12000000,
  atmosphereMax: 28,
  targetO2: 19,

  allowsPopulation: true,
  /** Früh genug, dass die Siedler den Aufbau noch mitprägen. */
  settleAt: 1.5,
  popCapacity: 24000,
}

/** Reihenfolge = Fortschritt. meta.planetsCompleted indiziert hier hinein. */
export const PLANETS: readonly PlanetDef[] = [AURORA, VESTA]

export function findPlanet(id: string): PlanetDef | undefined {
  return PLANETS.find((p) => p.id === id)
}

/** Der Planet, der nach n abgeschlossenen dran ist. Am Ende bleibt der letzte. */
export function planetForIndex(index: number): PlanetDef {
  return PLANETS[Math.min(index, PLANETS.length - 1)] ?? AURORA
}

/** Gibt es nach diesem Planeten noch einen weiteren? */
export function hasNextPlanet(index: number): boolean {
  return index + 1 < PLANETS.length
}
