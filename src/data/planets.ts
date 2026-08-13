/**
 * Planetendefinitionen.
 *
 * Planet 1 kennt nur O₂ (Tutorial, DESIGN.md §4). N₂-Puffer, Schadstoffe,
 * Druck und Temperatur kommen ab Planet 2 dazu — die Felder dafür gehören
 * erst dann hierher, nicht vorsorglich schon jetzt.
 */
export interface PlanetDef {
  id: string
  name: string
  /** Zeile im Log beim Betreten. */
  intro: string

  /**
   * Sättigungskonstante der Atmosphärenkurve:
   *   anteil% = atmosphereMax × gesamtO₂ / (gesamtO₂ + atmosphereK)
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
}

export const AURORA: PlanetDef = {
  id: 'aurora',
  name: 'Aurora',
  intro: 'Aurora. Kein Grün, kein Laut, keine Atmosphäre. Der erste Handgriff gehört dir.',
  /**
   * Simuliert, nicht geschätzt: mit diesem K erreichen vier Spielstile
   * (aktiv-sparend, aktiv-gierig, wenig Klicks, kaum Klicks) das Zielfenster
   * nach 20,0 / 21,2 / 23,6 / 25,6 Minuten — das Fenster aus DESIGN.md §13.
   */
  atmosphereK: 1650000,
  atmosphereMax: 30,
  targetO2: 19,
}

export const PLANETS: readonly PlanetDef[] = [AURORA]

export function findPlanet(id: string): PlanetDef | undefined {
  return PLANETS.find((p) => p.id === id)
}
