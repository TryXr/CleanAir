/**
 * Planetendefinitionen.
 *
 * Ein Planet führt genau ein neues System ein (DESIGN.md §11):
 * Aurora nur O₂, Vesta die Bevölkerung — und ab M3 die Mischung aus
 * N₂-Puffer und Schadstoffen. Druck und Temperatur bekommen ihre Felder
 * erst mit Kharon, nicht vorsorglich.
 */

/** Ein Zielfenster aus DESIGN.md §4 — Unter- und Obergrenze in Prozent. */
export interface Window {
  min: number
  max: number
}

export interface PlanetDef {
  id: string
  name: string
  /** Zeile im Log beim Betreten. */
  intro: string

  /**
   * Menge des nativen Inertgases, in denselben Einheiten wie produziertes Gas.
   *
   * Der Maßstab des ganzen Planeten hängt an dieser einen Zahl: die Atmosphäre
   * ist eine echte Mischung, also gilt
   *
   *   anteil(gas) = 100 × menge(gas) / (base + O₂ + N₂ + Schadstoffe)
   *
   * Für p % eines Gases braucht es folglich base × p/(100−p) davon, solange
   * sonst nichts in der Luft steht. Ein größeres `baseAtmosphere` heißt: mehr
   * Fremdgas zu verdünnen, also länger. Das ist der Schwierigkeitsregler.
   */
  baseAtmosphere: number

  /** Zielfenster für O₂. Über `max` brechen Brände aus (§4). */
  o2Window: Window
  /**
   * Zielfenster für den N₂-Puffer. Fehlt es, kennt der Planet kein N₂ —
   * Aurora bleibt bewusst das reine O₂-Tutorial.
   */
  n2Window?: Window
  /** Obergrenze für Schadstoffe in Prozent. Fehlt sie, gibt es keine. */
  maxPollution?: number
  /**
   * Anteil der O₂-Produktion, der als Schadstoff anfällt.
   *
   * Schadstoffe sind bewusst ein Nebenprodukt der *eigenen* Industrie und
   * keine Grundausgasung des Planeten. Eine Rate, die an der Gesamtatmosphäre
   * hängt, verschwindet bei exponentiell wachsender Produktion im Rauschen —
   * gemessen 0,006 % statt der gemeinten 1 %. An die Produktion gekoppelt
   * bleibt der Anteil dagegen konstant bei rund `pollutionPerO2 × O₂-Anteil`
   * und damit auf jedem Maßstab gleich spürbar. Dazu passt auch die Fiktion:
   * der Dreck kommt von dir.
   */
  pollutionPerO2: number

  /**
   * Sekunden, die *alle* Werte ununterbrochen im Fenster stehen müssen (§4).
   * Der Timer setzt beim Verlassen zurück — das ist die eigentliche Prüfung
   * am Ende eines Planeten, nicht der Zufallstreffer.
   */
  stabilitySeconds: number

  /** Laufen hier Zufalls-Ereignisse? Aurora bleibt ungestört. */
  hasEvents: boolean

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
   * Aus der Sättigungskurve von M2 umgerechnet, damit die simulierte
   * Spieldauer erhalten bleibt: 19 % verlangen weiterhin exakt 2,85 M O₂
   * (12,15 M × 19/81). Vier Spielstile lagen damit bei 20,0 / 21,2 / 23,6 /
   * 25,6 Minuten — das Fenster aus DESIGN.md §13.
   */
  baseAtmosphere: 12150000,

  /**
   * Nach oben offen: Aurora hat kein N₂ zum Verdünnen, ein Deckel wäre also
   * eine Falle ohne Ausweg. 100 % ist unerreichbar und wirkt wie „kein Max".
   */
  o2Window: { min: 19, max: 100 },
  pollutionPerO2: 0,

  /** Kurz — hier lernt der Spieler nur, dass der Balken halten muss. */
  stabilitySeconds: 30,
  hasEvents: false,

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
   * Simuliert, nicht geschätzt (CLAUDE.md „Balancing prüfen statt schätzen").
   *
   * Vesta ist rund achtmal so groß wie Aurora: der Puffer will mitgefüllt
   * werden, und das native Inertgas muss auf ein paar Prozent verdünnt sein,
   * bevor O₂ und N₂ überhaupt gleichzeitig ins Fenster passen. Gemessene
   * Abschlusszeiten liegen bei 34–40 Minuten je nach Spielstil —
   * Zielfenster laut DESIGN.md §13 sind 30–45 min aktiv.
   */
  baseAtmosphere: 100000000,

  /** Das klassische Fenster aus §4. */
  o2Window: { min: 19, max: 23 },
  n2Window: { min: 74, max: 80 },
  maxPollution: 1,
  /**
   * Ohne Wäscher pendelt sich der Schadstoffanteil bei rund
   * `0.09 × 21 % ≈ 1,9 %` ein — knapp doppelt so hoch wie erlaubt. Vesta
   * lässt sich also nicht abschließen, ohne die eigene Industrie zu putzen.
   */
  pollutionPerO2: 0.09,

  stabilitySeconds: 180,
  hasEvents: true,

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
