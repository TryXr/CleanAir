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

  /** Führt dieser Planet Bevölkerung ein? */
  allowsPopulation: boolean

  /**
   * Menschen, die schon da sind, wenn man ankommt (§17).
   *
   * Aurora ist keine Landung auf leerem Fels mehr, sondern eine Landung mit
   * Mannschaft: zehn Leute und Rationen. Damit steht die Aufgabe von Sekunde
   * eins fest — eigene Versorgung aufbauen, bevor die Kisten leer sind.
   */
  startSettlers: number
  /**
   * Verbrauch pro Kopf und Sekunde.
   *
   * Steht am Planeten, weil die alten Planeten noch mit Zehntausenden von
   * Siedlern rechnen (§17 stellt sie erst in M13 um). Ein Wert, der bei zwölf
   * Leuten Druck erzeugt, würde dort in Sekunden alles leerfressen.
   */
  foodPerCapita: number
  waterPerCapita: number
  /** O₂ pro Kopf und Sekunde. Aus demselben Grund am Planeten wie oben. */
  o2PerCapita: number
  /** Mitgebrachte Rationen. Endlich, und genau das ist der Druck. */
  startFood: number
  startWater: number
  /**
   * Wohnplätze, die von Anfang an stehen — die Landekapseln.
   *
   * Ohne sie greift die Wohnraum-Grenze aus M5 sofort und die mitgebrachte
   * Mannschaft hätte kein Dach, würde also augenblicklich schrumpfen.
   */
  baseHousing: number
  /** Ab diesem O₂-Anteil landen die ersten Siedler. */
  settleAt: number
  /** Bevölkerungsobergrenze bei vollständig atembarer Atmosphäre. */
  popCapacity: number
}

export const AURORA: PlanetDef = {
  id: 'aurora',
  name: 'Aurora',
  intro:
    'Aurora. Roter Staub, dünne Luft, kein Laut. Zehn Menschen steigen aus, dazu Kisten mit Wasser und Rationen — mehr gibt es nicht, und nachgeliefert wird nichts.',

  /**
   * Seit §17 um den Faktor 30 kleiner — und das ist kein Versehen.
   *
   * Bis M9 stand hier 12,15 M, ausgelegt auf einen Spieler mit beliebig
   * vielen Anlagen und unbegrenzter Arbeitskraft. Mit einem Dutzend Bewohnern,
   * die jede Anlage erst besetzen müssen, liegt die erreichbare O₂-Rate bei
   * rund 100/s statt bei Tausenden. Gemessen war Aurora mit dem alten Wert
   * schlicht unschaffbar: nach 90 Minuten stand der Anteil bei 0,00 %.
   *
   * Zweimal nachgemessen, weil sich die Voraussetzung geändert hat: solange
   * auch die O₂-Anlagen Personal brauchten, lag der Wert bei 4·10⁵. Seit die
   * Trennung „Maschine gegen Handarbeit" gilt, laufen Elektrolyse, Photolyse
   * und Prozessor von allein, und die erreichbare Rate steigt um das
   * Zwanzigfache.
   *
   * Simuliert mit zugewiesener Handarbeit: 4·10⁵ → 11,5 min, 1,5·10⁶ →
   * 15,2 min, 4·10⁶ → 21,1 min. Gewählt ist der letzte Wert — Zielfenster
   * laut §13 sind 15–25 Minuten.
   */
  baseAtmosphere: 4000000,

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
   * Seit M12 führt Aurora die Eisenkette — und damit fällt das alte „reines
   * O₂-Tutorial" endgültig weg.
   *
   * Das ist kein Verstoß gegen §11, sondern dessen Fortschreibung unter §17:
   * Aurora ist nicht mehr der erste von fünf gleichartigen Planeten, sondern
   * die **Blaupause**, an der sich das ganze Kolonie-Modell beweisen muss.
   * Ein Planet, auf dem man nichts verarbeiten kann, kann das nicht zeigen —
   * und die Rakete aus Metallplatten (§17, M12) braucht einen Ort, an dem
   * Metallplatten entstehen.
   *
   * Erz kommt aus dem Boden, Eisen und Metallplatten entstehen erst hier.
   * Für `isAvailable` ist der Unterschied egal: die Liste sagt, welche
   * Stoffe dieser Planet führt, nicht wie sie zustande kommen.
   */
  materials: ['erz', 'eisen', 'platten'],
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

  /*
   * Aurora ist ab §17 der Mars: keine leere Welt, die man später besiedelt,
   * sondern eine Landung mit Mannschaft. Die Bevölkerung ist damit von der
   * ersten Sekunde an das Thema — und nicht mehr eine Belohnung für 19 % O₂.
   */
  allowsPopulation: true,
  /**
   * Vier Menschen, nicht zehn.
   *
   * Bei zwölf Betten heißt das: die Landung füllt ihre eigenen Kapseln nur zu
   * einem Drittel, und die ersten Zugewanderten sind ein sichtbarer Gewinn
   * statt einer Randnotiz. Vier Hände sind außerdem zu wenige, um alles
   * gleichzeitig zu besetzen — wer an die Erzmine geht, steht nicht am
   * Flechtenfeld. Genau diese Entscheidung ist der Inhalt von §17.
   */
  startSettlers: 4,
  foodPerCapita: 0.0104,
  waterPerCapita: 0.0139,
  o2PerCapita: 0.03,
  /**
   * Rationen für rund vierzehn Minuten — **mit der Mannschaft mitgeschrumpft**
   * (vorher 90/120 für zehn Leute).
   *
   * Der Vorrat muss an der Kopfzahl hängen, sonst verschwindet mit den sechs
   * Leuten auch der Druck: dieselben 90 Einheiten hätten vier Menschen 36
   * Minuten lang ernährt, und das Überlebensproblem, mit dem Aurora seit §17
   * anfängt, wäre keins mehr. Lang genug, um in Ruhe zu verstehen, was zu tun
   * ist; kurz genug, dass Nichtstun auffällt.
   */
  startFood: 36,
  startWater: 48,
  /** Die Landekapseln. Platz für die Mannschaft und acht Zugewanderte. */
  baseHousing: 12,

  /** Sie sind schon da — es gibt keine Schwelle mehr zu überschreiten. */
  settleAt: 0,
  popCapacity: 60,
}

export const VESTA: PlanetDef = {
  id: 'vesta',
  name: 'Vesta',
  intro:
    'Vesta ist größer und kälter als Aurora — und diesmal kommen Menschen mit. Sie atmen, was du produzierst.',

  /**
   * **Um mehr als das Dreitausendfache gefallen** — und das ist kein
   * Vertipper, sondern Rechnung.
   *
   * Ein Planet mit N₂-Fenster braucht Gas im Umfang von rund **49×** seiner
   * Grundatmosphäre: O₂ soll 19–23 % stellen, N₂ 74–80 %, für das native
   * Inertgas bleiben also ein bis zwei Prozent. Aurora ohne Puffer braucht
   * dagegen nur 0,24× — es hat kein Fenster nach oben und muss nichts
   * gleichzeitig treffen.
   *
   * Der alte Wert stammt aus dem Modell mit 24 000 Siedlern und dem globalen
   * Arbeitskraft-Multiplikator. Mit Dutzenden und ohne ihn lag Vesta nach
   * 180 Minuten bei 7,6 % N₂ von nötigen 74.
   *
   * Simuliert: 30 000 → 41,9 min. Zielfenster laut §13 sind 30–45 min.
   */
  baseAtmosphere: 30000,

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

  /*
   * Ab M13 rechnet auch Vesta in Dutzenden (§17, Entscheidung 2). Die alten
   * 24 000 stammen aus der Zeit, in der Bevölkerung ein Multiplikator war —
   * einzeln zuweisen lässt sich nur, was man zählen kann.
   *
   * Der Pro-Kopf-Verbrauch ist jetzt überall derselbe wie auf Aurora. Zwei
   * Sätze Zahlen für dieselbe Sache waren die Übergangslösung aus §17
   * („erst Aurora, dann der Rest") und fallen hiermit weg.
   */
  startSettlers: 0,
  foodPerCapita: 0.0104,
  waterPerCapita: 0.0139,
  o2PerCapita: 0.03,
  startFood: 0,
  startWater: 0,
  /**
   * Die Kapseln der Rakete, mit der man ankommt.
   *
   * Ohne sie ist die Ankunft ein Flaschenhals: Wohnraum will gebaut werden,
   * und ohne Bewohner bauen nur die Bauautomaten aus M11. Gemessen standen
   * nach 30 Minuten vier Module und vier Leute.
   */
  baseHousing: 8,
  /**
   * Früh genug, dass die Siedler den Aufbau mitprägen. Seit §17 entscheidet
   * die Luft ohnehin nur über den *Nachwuchs*, nicht übers Überleben — die
   * Kolonie lebt in Kapseln.
   */
  settleAt: 0.5,
  popCapacity: 120,
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

  /**
   * Simuliert mit vollem Lager im Rücken: 70 000 → 82,7 min. Zielfenster
   * laut §13 sind 1–2 h.
   *
   * „Mit vollem Lager" ist hier keine Bequemlichkeit, sondern Voraussetzung:
   * Pyras Puffer hängt am Nitrat-Cracker, der Cracker an Titan, und Titan
   * gibt es nur auf Vesta (§16). Ohne Fracht blieb der Planet in der
   * Simulation bei 75,7 % N₂ stehen und war nicht abzuschließen — genau der
   * Zwang zum Rückflug, den §16 gemeint hat.
   */
  baseAtmosphere: 70000,
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
  startSettlers: 0,
  // Dutzende statt Zehntausende, Pro-Kopf-Werte wie überall seit M13.
  foodPerCapita: 0.0104,
  waterPerCapita: 0.0139,
  o2PerCapita: 0.03,
  startFood: 0,
  startWater: 0,
  baseHousing: 8,
  settleAt: 2,
  popCapacity: 180,
}

export const KRYO: PlanetDef = {
  id: 'kryo',
  name: 'Kryo',
  intro:
    'Kryo ist still und weiß. Wasser gibt es im Überfluss, aber alles hier braucht seine Zeit — auch die Menschen.',

  /**
   * Das Fünfzigfache von Vesta. Simuliert: 1,5 M → 138 min. Zielfenster laut
   * §13 sind 2–4 h.
   *
   * Kryo verträgt einen so viel größeren Maßstab als Pyra, weil sein
   * Hand-Hebel (Nitrateis) direkt auf der harten Seite sitzt und die Kolonie
   * mit 240 Bewohnern die größte vor Nimbus ist. Der Widerstand des Planeten
   * bleibt trotzdem die Zeit: `growthFactor` 0,45 heißt, dass diese 240
   * Menschen sehr lange brauchen, bis sie da sind.
   */
  baseAtmosphere: 1500000,
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
  startSettlers: 0,
  foodPerCapita: 0.0104,
  waterPerCapita: 0.0139,
  o2PerCapita: 0.03,
  startFood: 0,
  startWater: 0,
  baseHousing: 8,
  /** In der Kälte wird es erst spät wohnlich. */
  settleAt: 6,
  popCapacity: 240,
}

export const NIMBUS: PlanetDef = {
  id: 'nimbus',
  name: 'Nimbus',
  intro:
    'Ein Mond im Schatten eines Gasriesen. Stickstoff kostet hier nichts — aber die Atmosphäre, die du füllen sollst, ist gewaltig.',

  /**
   * Das Doppelte von Kryo und der größte Maßstab des Durchlaufs. Simuliert:
   * 3 M → 158 min. Zielfenster laut §13 sind 2–4 h.
   *
   * **Jetzt simulativ belegt** — bis M12 stand hier ausdrücklich, dass der
   * Simulant keine brauchbare Zahl liefert: weil der Gasschöpfer den Puffer
   * fast umsonst füllt, pendelte ein gierig kaufender Bot zwischen „N₂
   * überfüllt" und „N₂ abgeblasen, O₂ über dem Fenster" und maß am Ende sich
   * selbst. Behoben hat das nicht der Planet, sondern der Simulant: er baut
   * seither bis knapp *über* die Untergrenze des Fensters statt bis an den
   * oberen Rand. Am Rand pendelt jeder Wert, und der Stabilitäts-Timer setzt
   * bei jedem Ausschlag zurück.
   *
   * Nimbus behält seine Aufgabe: der Puffer ist geschenkt, der Sauerstoff ist
   * die Lebensarbeit. Er ist der einzige Planet, dessen Hand-Hebel auf der
   * O₂-Seite sitzt.
   */
  baseAtmosphere: 3000000,
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
  startSettlers: 0,
  foodPerCapita: 0.0104,
  waterPerCapita: 0.0139,
  o2PerCapita: 0.03,
  startFood: 0,
  startWater: 0,
  baseHousing: 8,
  settleAt: 3,
  /** Die größte Kolonie des Durchlaufs — und sie wird gebraucht. */
  popCapacity: 360,
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
