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

  /**
   * Was schon in der Luft steht, wenn man ankommt (M15).
   *
   * Fehlt es, startet der Planet leer — so war es bis Nimbus, und deshalb
   * hieß Terraforming bisher immer *aufbauen*. Erebos kehrt das um: dort
   * steht eine fertige Atmosphäre, nur die falsche, und der erste Zug ist
   * Abbau statt Aufbau.
   *
   * Bewusst drei getrennte Werte statt eines „Verschmutzungsgrads": die
   * Atmosphäre ist eine Mischung (§4), und welcher der drei Töpfe zu voll ist,
   * entscheidet, welches Werkzeug hilft — Wäscher, Ventil oder Verdünnung.
   */
  startAirO2?: number
  startAirN2?: number
  startPollution?: number

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
   * 15,2 min, 4·10⁶ → 21,1 min. Zielfenster laut §13 sind 15–25 Minuten.
   *
   * **Seit M29 3·10⁶ statt 4·10⁶.** Nicht weil der Planet sich geändert hätte,
   * sondern weil die Messung vorher falsch war: bis M26 erfüllte die Fracht
   * des Balancing-Werkzeugs (50 000 von jedem Material) den Erfolg
   * „Titanherz", und jeder Lauf lief mit geschenkten +8 % Produktion. Ohne sie
   * stand Aurora bei 26,5 min und damit **über** seinem Fenster.
   *
   * Der Ertrag dieser Zahl flacht stark ab — Aurora ist anlaufgebunden, nicht
   * füllgebunden: 4·10⁶ → 26,5 min, 3,4·10⁶ → 24,9, 3·10⁶ → 24,2, 2,8·10⁶ →
   * 23,7, 2·10⁶ → 21,4. Die Hälfte der Atmosphäre spart nur fünf Minuten.
   * Gewählt ist 3·10⁶: eine knappe Minute Abstand zum Fensterrand, und Aurora
   * behält mit Abstand die größte Grundatmosphäre der frühen Planeten (Vesta
   * 30 000, Pyra 70 000). Aurora führt keine Ereignisse, die Zahl ist deshalb
   * auf die Nachkommastelle reproduzierbar (24,2 über drei Startwerte).
   */
  baseAtmosphere: 3000000,

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
   * **Achtmal so schmutzig wie Vesta** (0,09), verdoppelt im Nachtrag zu M14.
   *
   * Bei 0,36 war Pyras eigenes Thema Kulisse: den Wert zu halbieren änderte
   * die Dauer um 0,1 Minuten, während der Anoxendruck sie verdreifachte. Der
   * Wäscher-Zweig war „die halbe Miete" nur im Kommentar.
   *
   * Gemessen nach der Verdopplung (und nachdem die Wellen-Spirale behoben
   * war, die den Effekt vorher überdeckte): 61,5 min bei 0,36 gegen 84,5 min
   * bei 0,72. Der Dreck kostet jetzt 23 Minuten und ist damit die größte
   * einzelne Bremse des Planeten. Bei 1,44 wären es 118,8 min — das obere
   * Ende des Fensters aus §13 —, ab 2,88 sättigt der Effekt, weil der
   * Simulant dann ohnehin nur noch wäscht.
   */
  pollutionPerO2: 0.72,

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
   * **Verdoppelt im Nachtrag zu M14**, von 1,5 M auf 3 M — das Hundertfache
   * von Vesta.
   *
   * Nötig, weil Kryo nach der Wellen-Korrektur bei 97,5 min lag und damit
   * deutlich unter dem Fenster aus §13 (2–4 h). Ein Teil seiner früher
   * gemessenen Spielzeit war nicht der Planet, sondern die Wellen-Spirale.
   *
   * Die Grundatmosphäre ist bei ihm der **einzige** Hebel, der greift, und
   * das ist gemessen und nicht geraten: die Bevölkerungsgrenze zu halbieren
   * ändert 0,6 Minuten, den Wachstumsfaktor zu halbieren 0,2 — und die Rate
   * des Nitrateises zu halbieren macht ihn sogar *schneller* (72,4), weil
   * weniger Puffer weniger Überschuss zum Abblasen heißt. Verdoppelt steht er
   * bei 129,6 min. Darüber sättigt es: 4,5 M bringt nur 133,7.
   */
  baseAtmosphere: 3000000,
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
  /**
   * **Die kleinste Kolonie des Durchlaufs, nicht die größte** — halbiert von
   * 360 auf 180 im Nachtrag zu M14.
   *
   * Der Grund ist zuerst gemessen und dann erzählt worden, aber die
   * Geschichte passt besser als die alte: Nimbus ist ein Mond ohne Boden.
   * Menschen leben hier auf Schwebeplattformen, und davon gibt es wenige —
   * die *Atmosphäre* ist gewaltig, der bewohnbare Platz ist es nicht. „Größe"
   * heißt bei ihm das, was zu füllen ist, nicht die Zahl derer, die füllen.
   *
   * Gemessen war die Bevölkerungsgrenze der mit Abstand stärkste Hebel des
   * Planeten: halbiert bringt sie 63,5 auf 151,7 min. Alles andere reicht
   * nicht heran — halbe Schwebefarm 74,3, halber Gasschöpfer 90,6, doppelte
   * Stabilitätszeit 90,9. Und die Grundatmosphäre wirkt bei ihm sogar
   * **rückwärts**: sie zu erhöhen macht ihn schneller (4,5 M → 69,7), weil
   * mehr Inertgas beide Anteile verdünnt und der Gasschöpfer den Puffer
   * ohnehin verschenkt.
   */
  popCapacity: 180,
}

/**
 * Erebos — der sechste Planet (M15, §18).
 *
 * **Die eine neue Sache hier ist kein neues System, sondern ein umgekehrtes
 * Problem.** Fünf Planeten lang hieß Terraforming: aus nichts etwas machen.
 * Erebos hat schon eine Atmosphäre, dicht und vollständig — sie ist nur
 * vergiftet. Der erste Zug ist Abbau.
 *
 * Das erfüllt §11 dem Sinn nach, ohne ihm dem Buchstaben nach zu folgen: es
 * gibt keine sechste Mechanik zu lernen. Stattdessen werden die drei
 * *Gegenstücke*, die das Spiel längst hat und die bisher immer Beiwerk waren,
 * zum Hauptdarsteller — Wäscher gegen den Dreck, Ventil gegen den Puffer,
 * Verdünnung gegen zu viel O₂. Ein Finale, das ein sechstes System aufmacht,
 * bündelt nichts; es fängt noch einmal an.
 *
 * Der Weg ist bewusst dreistufig und in dieser Reihenfolge zwingend:
 *
 * 1. **Waschen.** 60 % Schadstoffe drücken alles andere unter sein Fenster.
 *    Solange sie stehen, ist kein Anteil zu retten.
 * 2. **Abblasen.** Ist der Dreck weg, schnellt der Puffer auf rund 87 % — weit
 *    über sein Fenster. Wer hier weiter N₂ macht, hat nichts verstanden.
 * 3. **Atmen lassen.** Erst dann fehlt Sauerstoff, und zwar viel.
 *
 * Wer die Reihenfolge vertauscht, arbeitet gegen sich: O₂ in eine Luft zu
 * pumpen, die zu 60 % aus Dreck besteht, verpufft im Nenner.
 */
export const EREBOS: PlanetDef = {
  id: 'erebos',
  name: 'Erebos',
  intro:
    'Hier war schon jemand. Die Luft ist dicht, warm und tödlich — jemand hat diesen Planeten terraformt und dabei verloren. Du bekommst seine Atmosphäre, nicht seine Notizen.',

  baseAtmosphere: 4000000,

  /*
   * Der Startzustand ist der ganze Planet. Gerechnet, nicht gegriffen:
   * zusammen mit `baseAtmosphere` ergibt das rund 4 % Inertgas, 1 % O₂,
   * 35 % N₂ und 60 % Schadstoffe. Nach vollständiger Wäsche stünde der Puffer
   * bei etwa 87 % und damit über seinem Fenster — genau deshalb sind Ventil
   * *und* Wäscher nötig und nicht nur eines von beiden.
   *
   * **Alle vier Zahlen sind seit M22 viermal so groß, die Anteile unverändert.**
   * Erebos war zu kurz, und zwar erst sichtbar, seit der simulierte Spieler
   * abreißen kann (§17): vorher stand er 90 Minuten über dem O₂-Fenster fest
   * und maß 176,7 min, danach 86,0 — weit unter seinem Fenster von 120–240 und
   * kürzer als Kryo und Nimbus. Der letzte Planet war nie so lang, wie die
   * Tabelle behauptet hat; gemessen wurde die blinde Stelle des Simulanten.
   *
   * Der Faktor liegt auf **allen vier** Zahlen und nicht auf einer: nur so
   * bleiben die Anteile stehen, und damit bleibt die Härte dieses Planeten
   * seine *Reihenfolge* — waschen, abblasen, atmen lassen — statt einer
   * einzelnen größeren Zahl. Was wächst, ist allein die Menge Arbeit. Gemessen
   * über drei Startwerte: 157,4 / 138,9 / 162,5 min, jeder im Fenster und
   * jeder länger als Nimbus (135,2). ×3,5 rutschte mit 125 min darunter.
   */
  startAirO2: 1000000,
  startAirN2: 35000000,
  startPollution: 60000000,

  o2Window: { min: 19, max: 23 },
  n2Window: { min: 74, max: 80 },
  maxPollution: 1,
  /** Die alte Industrie qualmt nicht mehr. Deine schon. */
  pollutionPerO2: 0.2,

  /** Der längste Atem des Spiels — es ist die letzte Prüfung. */
  stabilitySeconds: 360,
  hasEvents: true,

  hasAnoxen: true,
  /**
   * Weniger Druck als auf Nimbus, und das ist Absicht: Erebos' Widerstand
   * soll aus seiner Luft kommen, nicht aus den Wellen. Pyra hat vorgeführt,
   * wie schnell die Anoxen sonst das eigentliche Thema eines Planeten
   * überdecken (§18).
   */
  anoxenPressure: 0.9,

  /** Rostrot unter braunem Smog. */
  palette: { rock: '#6b4a3a', sky: '#4a3a2a', accent: '#c88a5a' },

  /**
   * **Erebos gibt nichts her.** Kein Vorkommen, kein Wald — was hier gebaut
   * wird, ist mitgebracht. Das ist die letzte Konsequenz aus §16: der Planet,
   * auf dem sich entscheidet, ob man vorher Lager angelegt hat.
   */
  materials: [],
  forestCapacity: 0,

  growthFactor: 0.8,
  allowsPopulation: true,
  startSettlers: 0,
  foodPerCapita: 0.0104,
  waterPerCapita: 0.0139,
  o2PerCapita: 0.03,
  startFood: 0,
  startWater: 0,
  baseHousing: 8,
  /** Man kann hier von Anfang an landen — die Luft ist ohnehin nicht atembar. */
  settleAt: 0,
  popCapacity: 240,
}

/** Reihenfolge = Fortschritt. Die Rakete eines Planeten öffnet den nächsten. */
export const PLANETS: readonly PlanetDef[] = [AURORA, VESTA, PYRA, KRYO, NIMBUS, EREBOS]

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
