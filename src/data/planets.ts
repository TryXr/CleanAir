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

  /**
   * Leben hier Anoxen (§7)? Sie tauchen erst ab dem dritten Planeten auf —
   * vorher hat der Spieler genug damit zu tun, die Atmosphäre zu verstehen.
   */
  hasAnoxen: boolean
  /**
   * Wie aggressiv sie sind. Skaliert Wellenstärke und Frequenz, damit sich
   * die Bedrohung pro Planet unterscheidet statt überall gleich zu sein.
   */
  anoxenPressure: number

  /**
   * Welche Materialien es hier gibt (DESIGN.md §16). Leer = dieser Planet
   * kennt keine — der Hauptgrund, später zu einem alten Planeten
   * zurückzukehren, ist genau diese Liste.
   */
  materials: readonly string[]
  /**
   * Wie viele Bäume der Planet trägt. 0 = kein Wald möglich.
   * Ein Lavabrocken wird hier später eine sehr kleine Zahl stehen haben.
   */
  forestCapacity: number

  /**
   * Faktor auf das Bevölkerungswachstum. Eine Eiswüste füllt sich langsamer
   * als eine milde Welt — Identität durch spürbares Verhalten, nicht durch
   * eine andere Zahl für dieselbe Sache.
   */
  growthFactor: number

  /**
   * Rein visuell (M9): Grundfarben der Planetenansicht.
   *
   * Steht hier und nicht in der Komponente, weil Planeten-Identität laut §16
   * an einer Stelle zusammenbleiben soll — ein neuer Planet wird komplett in
   * dieser Datei beschrieben, ohne die UI anzufassen.
   */
  palette: {
    /** Gestein im Licht. */
    rock: string
    /** Atmosphärenschimmer am Rand. */
    sky: string
    /** Der Farbtupfer, der den Planeten kenntlich macht — Lava, Eis, Gas. */
    accent: string
  }

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

  hasAnoxen: false,
  anoxenPressure: 0,

  /**
   * Aurora bleibt das reine O₂-Tutorial. Materialien wären hier das zweite
   * System auf demselben Planeten, und genau davor schützt §11. Sie beginnen
   * auf Vesta; wie sie sich später über die Planeten verteilen, entscheidet
   * M7 mit der Planeten-Identität.
   */
  materials: [],
  /**
   * Aurora bekommt den Wald — aber nur die *halbe* Kette.
   *
   * Bäume pflanzen ist hier reiner Gewinn: sie atmen für dich, es gibt nichts
   * abzuwägen. Das Sägewerk erscheint erst dort, wo Holz überhaupt ein
   * Rohstoff ist (siehe isAvailable in production.ts) — also auf Vesta, und
   * erst dort wird aus dem Wald eine Entscheidung. So bleibt §11 gewahrt:
   * ein neuer Gedanke pro Planet statt zwei auf einmal.
   *
   * Klein gehalten, damit Aurora einen zweiten Akt bekommt und nicht ein
   * anderes Spiel wird.
   */
  forestCapacity: 2500,

  /** Nackter Fels, kaum Himmel. */
  palette: { rock: '#6f757c', sky: '#33495c', accent: '#8b9199' },

  growthFactor: 1,
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

  /** Vesta bleibt verschont — hier lernt man erst die Mischung. */
  hasAnoxen: false,
  anoxenPressure: 0,

  /**
   * Vesta führt die Materialien ein. Titan gibt es vorerst nur hier — der
   * erste Grund, später zurückzufliegen, statt den Planeten abzuhaken.
   */
  materials: ['holz', 'stein', 'titan'],
  /** Kalt, aber mit Wasser im Permafrost. Wald geht, üppig wird er nicht. */
  forestCapacity: 12000,

  /** Kalter Staub, ein erster Hauch Blau. */
  palette: { rock: '#7d6b57', sky: '#3f5f7a', accent: '#4f8a5a' },

  growthFactor: 1,
  allowsPopulation: true,
  /**
   * Früh genug, dass die Siedler den Aufbau noch mitprägen.
   *
   * Seit M5 begrenzt Wohnraum das Wachstum ohnehin, also darf die Luft
   * früher freigeben: mit 1,5 landeten die ersten erst nach 21 Minuten und
   * Vesta lief auf 46 min hinaus, mit 0,5 sind es 18 Minuten und 37,8 min
   * gesamt.
   */
  settleAt: 0.5,
  popCapacity: 24000,
}

/* --- Planeten-Identität (DESIGN.md §16, M7) --------------------------------
   Jeder der folgenden Planeten stellt ein *anderes* Problem, nicht dasselbe
   Problem mit anderen Zahlen:

     Pyra    — Dreck.  Die eigene Industrie erstickt einen, Wald gibt es nicht.
     Kryo    — Zeit.   Alles wächst langsam, dafür ist Wasser im Überfluss da.
     Nimbus  — Größe.  N₂ kostet nichts, aber die Atmosphäre ist riesig.

   Was sie verbindet: keiner von ihnen hat alles, was seine eigene Rakete
   braucht. Zurückfliegen ist damit kein Bonusweg, sondern der Weg.
--------------------------------------------------------------------------- */

export const PYRA: PlanetDef = {
  id: 'pyra',
  name: 'Pyra',
  intro:
    'Pyra glüht. Der Boden ist frisch erstarrt, die Luft schmeckt nach Schwefel — und alles, was du hier baust, macht sie schlechter.',

  /** Das Vierfache von Vesta. Simuliert: 49,6 min mit vollem Lager im Rücken. */
  baseAtmosphere: 400000000,
  o2Window: { min: 19, max: 23 },
  n2Window: { min: 74, max: 80 },
  maxPollution: 1,
  /**
   * Viermal so schmutzig wie Vesta. Der Wäscher-Zweig ist hier keine
   * Nebensache mehr, sondern die halbe Miete — und Holz zum Bauen muss
   * mitgebracht werden, weil nichts wächst.
   */
  pollutionPerO2: 0.36,

  stabilitySeconds: 240,
  hasEvents: true,

  /**
   * Der erste Planet mit Anoxen (§7). Passend zur Fiktion: wo es warm und
   * sauerstofffrei ist, sitzen sie am dichtesten.
   */
  hasAnoxen: true,
  anoxenPressure: 1,

  /** Frisch erstarrte Kruste mit glühenden Rissen. */
  palette: { rock: '#3c221c', sky: '#6b2a18', accent: '#ff6a2a' },

  materials: ['obsidian', 'schwefel'],
  /** Nichts wächst auf frischer Lava. */
  forestCapacity: 0,

  growthFactor: 0.8,
  allowsPopulation: true,
  settleAt: 2,
  popCapacity: 30000,
}

export const KRYO: PlanetDef = {
  id: 'kryo',
  name: 'Kryo',
  intro:
    'Kryo ist still und weiß. Wasser gibt es im Überfluss, aber alles hier braucht seine Zeit — auch die Menschen.',

  /** Zwölffaches Vesta. Simuliert: 65,3 min. */
  baseAtmosphere: 1200000000,
  o2Window: { min: 19, max: 23 },
  n2Window: { min: 74, max: 80 },
  maxPollution: 1,
  /** Kalt und sauber. Schadstoffe sind hier fast kein Thema. */
  pollutionPerO2: 0.03,

  stabilitySeconds: 240,
  hasEvents: true,

  /** In der Kälte sind sie träge — seltener, aber zäher. */
  hasAnoxen: true,
  anoxenPressure: 0.75,

  /** Weiß bis zum Horizont. */
  palette: { rock: '#b9cbd8', sky: '#6f93ab', accent: '#dff1ff' },

  materials: ['eis', 'stein'],
  /** Zwergsträucher unter Folie. Mehr gibt die Kälte nicht her. */
  forestCapacity: 3000,

  /** Der eigentliche Widerstand dieses Planeten. */
  growthFactor: 0.45,
  allowsPopulation: true,
  /** In der Kälte wird es erst spät wohnlich. */
  settleAt: 6,
  popCapacity: 40000,
}

export const NIMBUS: PlanetDef = {
  id: 'nimbus',
  name: 'Nimbus',
  intro:
    'Ein Mond im Schatten eines Gasriesen. Stickstoff kostet hier nichts — aber die Atmosphäre, die du füllen sollst, ist gewaltig.',

  /**
   * Zehnmal Vesta, knapp unter Kryo. N₂ ist hier geschenkt, O₂ ist die
   * Lebensarbeit — das ist die Aufgabe dieses Planeten.
   *
   * **Nicht simulativ belegt.** Anders als bei den übrigen Planeten hat der
   * Simulant hier keine brauchbare Zahl geliefert: weil der Gasschöpfer den
   * Puffer fast umsonst füllt, pendelt ein gierig kaufender Bot zwischen
   * „N₂ überfüllt" und „N₂ abgeblasen, O₂ über dem Fenster" und misst am
   * Ende sich selbst statt den Planeten. Ein Mensch, der zusieht und
   * gegensteuert, hat es hier leichter als die Heuristik. Die Zahl stammt
   * daher aus dem Vergleich mit Kryo (1,2 Mrd. → 65 min) und gehört beim
   * Spieltest überprüft.
   *
   * Vorsicht bei der Intuition: `baseAtmosphere` ist im kleinen Bereich ein
   * schwacher Regler, oberhalb von etwa einer Milliarde aber ein sehr
   * steiler — zwischen 1,2 und 6 Mrd. liegt der Unterschied zwischen
   * „65 Minuten" und „in vier Stunden nicht zu schaffen".
   */
  baseAtmosphere: 1000000000,
  o2Window: { min: 19, max: 23 },
  n2Window: { min: 74, max: 80 },
  maxPollution: 1,
  pollutionPerO2: 0.07,

  stabilitySeconds: 300,
  hasEvents: true,

  /** Der größte Druck des Durchlaufs — hier sitzt ihre Hochburg. */
  hasAnoxen: true,
  anoxenPressure: 1.4,

  /** Gasbänder im Schatten des Riesen. */
  palette: { rock: '#7c6f92', sky: '#6a5f8f', accent: '#c2a6e8' },

  materials: ['helium'],
  /** Kein fester Boden, kein Wald. */
  forestCapacity: 0,

  growthFactor: 0.9,
  allowsPopulation: true,
  settleAt: 3,
  popCapacity: 60000,
}

/** Reihenfolge = Fortschritt. Die Rakete eines Planeten öffnet den nächsten. */
export const PLANETS: readonly PlanetDef[] = [AURORA, VESTA, PYRA, KRYO, NIMBUS]

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
