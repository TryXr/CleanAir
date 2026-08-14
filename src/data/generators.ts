/**
 * Generatoren.
 *
 * Reine Daten. Balancing passiert hier durch Zahlen-Editieren, nicht durch
 * Code-Umbau — deshalb steht in dieser Datei bewusst keine einzige Formel.
 * Die Kostenkurve lebt in systems/production.ts (DESIGN.md §13).
 */
import type { MaterialCost } from './materials'

/**
 * Woran ein Generator arbeitet. Bestimmt zugleich, auf welchem Planeten er
 * überhaupt auftaucht: N₂-Anlagen erst dort, wo es einen Puffer gibt,
 * Wäscher erst dort, wo Schadstoffe entstehen.
 */
export type GasKind =
  /** Füllt Vorrat *und* Luft. Die einzige Quelle von Kaufkraft. */
  | 'o2'
  /** Füllt nur die Luft. Verdünnt damit alles andere. */
  | 'n2'
  /** Baut Schadstoffe ab — Anteil pro Sekunde statt absoluter Menge. */
  | 'scrub'
  /**
   * Bläst N₂ ab. Ebenfalls anteilig.
   *
   * Ohne dieses Gegenstück ist zu viel Puffer ein *permanenter* Schaden: N₂
   * verdünnt den O₂-Anteil, und wer zu viel davon erzeugt hat, konnte ihn nie
   * wieder loswerden. Auf Nimbus mit seinem offenen Gashahn ruinierte das den
   * Planeten binnen Minuten. Leitlinie §1.2 verlangt aber, dass Rückschläge
   * temporär bleiben — also gibt es ein Ventil.
   */
  | 'vent'

/**
 * Was eine Anlage herstellt.
 *
 * Bewusst eine Union statt mehrerer optionaler Felder: so kann eine Anlage
 * nicht versehentlich zwei Dinge gleichzeitig sein, und der Compiler zwingt
 * jede Auswertung, alle Fälle zu behandeln.
 */
export type Output =
  | { kind: 'gas'; gas: GasKind }
  /** Fördert ein Material ins globale Lager. */
  | { kind: 'material'; material: string }
  /** Pflanzt Bäume, bis der Planet voll ist. */
  | { kind: 'plant' }
  /** Fällt Bäume zu Holz. Verbraucht also den Bestand, den `plant` aufbaut. */
  | { kind: 'fell' }
  /**
   * Nahrung oder Wasser. Bleibt planetenlokal und geht bewusst *nicht* ins
   * globale Lager: sonst ernährt ein einziger Farmplanet alle anderen mit,
   * und jede Kolonie verliert ihr eigenes Überlebensproblem.
   */
  | { kind: 'supply'; supply: SupplyKind }
  /** Wohnraum. Eine Kapazität, keine Rate — siehe housingCapacity(). */
  | { kind: 'housing' }
  /**
   * Lagerraum. Ebenfalls eine Kapazität, keine Rate — siehe
   * systems/storage.ts. Seit M11 ist das Lager endlich, und Überschuss
   * verfällt an der Grenze.
   */
  | { kind: 'storage' }
  /**
   * Ein Rezept (M12, §17): verbraucht Material und liefert anderes.
   *
   * Der Unterschied zu `material` ist die **Voraussetzung**. Eine Mine
   * fördert, solange jemand daran steht; eine Schmelze braucht zusätzlich
   * etwas zum Schmelzen. Damit gibt es eine zweite Sorte Stillstand neben dem
   * unbesetzten Arbeitsplatz — und der Grund dafür ist nicht mehr die
   * Kolonie, sondern die Kette davor.
   *
   * `baseRate` zählt in **Ausgang** pro Sekunde. Der Eingang ergibt sich
   * daraus über `input`, und zwar anteilig: eine halb ausgelastete Presse
   * verbraucht auch nur halb so viel Eisen.
   */
  | { kind: 'craft'; material: string; input: MaterialCost }

export type SupplyKind = 'food' | 'water'

export interface GeneratorDef {
  id: string
  name: string
  /** Ein Satz Fiktion. Zahlen sollen eine Geschichte erzählen (§1.4). */
  description: string
  output: Output
  baseCost: number
  /** kosten(n) = baseCost × costGrowth^n */
  costGrowth: number
  /**
   * Zusätzliche Materialkosten pro Stück — **flach**, nicht exponentiell.
   *
   * Die O₂-Kurve bremst bereits exponentiell. Eine zweite exponentielle
   * Bremse daneben würde späte Anlagen schlicht unbaubar machen. Flach heißt
   * dagegen: Material entscheidet, *ob* man einen Anlagentyp überhaupt
   * anfangen kann, und bleibt danach ein stetiger Abfluss.
   */
  materialCost?: MaterialCost
  /**
   * Menschen, die der Bau **einmalig** verschluckt (DESIGN.md §16).
   *
   * Sie ziehen ein und gehören ab dann zum Gebäude: sie atmen weiter und
   * zählen zur Bevölkerung, stehen aber nie wieder für Berufe zur Verfügung.
   * Bewusst keine laufende Bindung — das wäre Mikromanagement.
   *
   * Nur auf Anlagen, die es ausschließlich auf bewohnten Planeten gibt.
   * Sonst wäre Aurora unspielbar, wo niemand wohnt.
   */
  populationCost?: number
  /**
   * Pro Sekunde pro Stück, vor allen Multiplikatoren. Bei `scrub` ist das
   * der Anteil der Schadstoffe, den ein Stück pro Sekunde entfernt, bei
   * `plant` und `fell` die Zahl der Bäume.
   */
  baseRate: number

  /**
   * Arbeitersekunden, die ein Stück bis zur Fertigstellung braucht (M11, §17).
   *
   * Bezahlen legt seit M11 nur noch eine **Baustelle** an. Was daraus wird,
   * entscheidet die Baukolonne: ein Bauarbeiter leistet eine Arbeitersekunde
   * pro Sekunde, die Bauautomaten der Landefähre einen Bruchteil davon
   * (systems/construction.ts).
   *
   * Pflichtfeld, kein Default. Ein vergessener Wert wäre sonst ein Gebäude,
   * das in null Zeit dasteht — und damit genau die Sofort-Mechanik, die M11
   * abschafft. Der Compiler soll daran erinnern.
   */
  buildWork: number
  /** Ab wie viel jemals freigesetztem O₂ der Generator sichtbar wird. */
  revealAt: number

  /**
   * Arbeitsplätze pro Stück (§17).
   *
   * Eine Anlage mit Plätzen produziert **nichts**, solange niemand zugewiesen
   * ist — nicht weniger, nichts. Halb besetzt heißt halbe Leistung.
   *
   * Die Trennlinie ist bewusst **Maschine gegen Handarbeit**, nicht „alles
   * braucht jemanden": Elektrolyse, Photolyse, Prozessor, Sublimator, Wäscher
   * und Ventil sind chemische Apparate und laufen von selbst. Plätze haben
   * nur Bergbau, Schmelze, Sägewerk, Forst und Landwirtschaft — Arbeiten, bei
   * denen jemand mit anpackt.
   *
   * Das hält auch den Anfang schlank: die O₂-Seite braucht keine Verwaltung,
   * und Zuweisung bleibt eine Entscheidung statt einer Pflichtübung.
   */
  workSlots?: number

  /**
   * Ausdrückliche Planetenbindung. Fehlt sie, ergibt sich die Verfügbarkeit
   * aus `output` (N₂-Anlagen nur mit Puffer, Abbau nur beim passenden
   * Vorkommen). Nötig für Anlagen, die ein Planet *allein* hat, obwohl ihre
   * Ausgabe anderswo genauso existiert — der Gasschöpfer wäre sonst auf
   * jedem Planeten mit N₂-Fenster zu haben und Nimbus verlöre sein Wahrzeichen.
   */
  planets?: readonly string[]
}

export const GENERATORS: readonly GeneratorDef[] = [
  {
    id: 'electrolysis',
    name: 'Elektrolyse-Zelle',
    description: 'Spaltet gebundenes Wasser im Gestein. Langsam, aber sie läuft von allein.',
    output: { kind: 'gas', gas: 'o2' },
    baseCost: 10,
    costGrowth: 1.12,
    baseRate: 0.3,
    /** Die kleinste Baustelle des Spiels — sonst wäre Minute eins Warten. */
    buildWork: 4,
    revealAt: 0,
  },

  /* --- Überleben auf Aurora ---------------------------------------------
     Beide kosten kein Material: Aurora hat keins. Sie sind die Antwort auf
     die endlichen Rationen und damit das erste, was gebaut werden muss.
  ---------------------------------------------------------------------- */
  {
    id: 'condenser',
    name: 'Kondensator',
    description:
      'Presst Feuchtigkeit aus der dünnen Luft. Wenig, aber es hört nicht auf — anders als die Kisten.',
    output: { kind: 'supply', supply: 'water' },
    baseCost: 25,
    costGrowth: 1.15,
    baseRate: 0.09,
    buildWork: 6,
    revealAt: 0,
  },
  {
    id: 'sprouter',
    name: 'Keimkammer',
    description: 'Sprossen unter Lampen. Schmeckt nach nichts und hält alle am Leben.',
    output: { kind: 'supply', supply: 'food' },
    baseCost: 40,
    costGrowth: 1.15,
    baseRate: 0.07,
    buildWork: 8,
    revealAt: 0,
    workSlots: 1,
  },
  /* --- Der Hand-Hebel auf die Atmosphäre (M13, §17) ---------------------
     Die offene Frage aus §17: auf Aurora zahlten sich Menschen nicht aus.
     Gemessen war der Planet *mit* Wohnraum langsamer als ohne (24,6 gegen
     22,3 min) — die ganze O₂-Seite bestand aus Apparaten, die keine Hände
     brauchen, also kostete jeder zusätzliche Mensch Atem und brachte für die
     Atmosphäre nichts.

     Das Flechtenfeld ist die Antwort und bewusst **kein** Widerspruch zur
     M10-Trennung „Maschine gegen Handarbeit": Elektrolyse, Photolyse und
     Prozessor bleiben Apparate und laufen weiter von selbst. Daneben steht
     jetzt eine Anlage, die *nur* durch Hände läuft — damit ist die O₂-Seite
     nicht länger entweder-oder, sondern eine Entscheidung darüber, wo
     freie Leute hingehen.

     Pro ausgegebenem O₂ liefert sie ungefähr so viel wie ein Prozessor. Der
     Unterschied ist der Preis in Menschen: wer keine übrig hat, baut
     Apparate; wer welche übrig hat, bekommt sie hier fast geschenkt — ein
     Mensch atmet 0,03 O₂/s weg und erzeugt hier ein Vielfaches davon.

     Vorerst nur auf Aurora. §17 sagt „erst Aurora, dann der Rest": die
     übrigen Planeten bekommen ihren Hand-Hebel, wenn sie in der zweiten
     Hälfte von M13 auf die neue Wirtschaft umgestellt werden.
  ---------------------------------------------------------------------- */
  {
    id: 'lichen',
    name: 'Flechtenfeld',
    description:
      'Von Hand auf den nackten Fels gesetzt und feucht gehalten. Es sieht nach nichts aus und ist der erste Ort, an dem Aurora selbst atmet.',
    output: { kind: 'gas', gas: 'o2' },
    baseCost: 500,
    /**
     * **Flach, und das ist der ganze Trick.** Die knappe Ressource dieser
     * Anlage sollen Hände sein, nicht O₂ — also darf die O₂-Kurve nicht die
     * Grenze setzen. Der erste Anlauf stand auf 1,13 und war am Rand pro
     * ausgegebenem O₂ nur ein Drittel so gut wie ein Prozessor; Menschen
     * blieben damit ein Verlustgeschäft (gemessen 23,7 gegen 21,1 min).
     */
    costGrowth: 1.08,
    /**
     * Gemessen statt geschätzt, über einen Sweep von 8 bis 80: erst hier
     * dreht sich das Vorzeichen deutlich. Wohnraum bringt jetzt 1,7 min
     * Vorsprung statt 2,3 min Verlust, und der Vollausbau mit Kette und
     * Kolonie liegt bei 23,8 min — im Fenster aus §13.
     *
     * Die Apparate werden dadurch nicht überflüssig: mit den zehn
     * Mitgebrachten lassen sich knapp fünf Felder besetzen, der Rest der
     * Atmosphäre kommt weiter aus Photolyse und Prozessor.
     */
    baseRate: 80,
    buildWork: 18,
    revealAt: 100,
    workSlots: 2,
    planets: ['aurora'],
  },
  {
    id: 'photolysis',
    name: 'Photolyse-Farm',
    description: 'Genmodifizierte Algen unter Kuppeln. Der erste sichtbare Grünton auf Aurora.',
    output: { kind: 'gas', gas: 'o2' },
    baseCost: 120,
    costGrowth: 1.13,
    baseRate: 4,
    buildWork: 15,
    revealAt: 40,
  },
  {
    id: 'processor',
    name: 'Atmosphärenprozessor',
    description: 'Türme, die den Himmel umschreiben. Man hört sie noch im Orbit.',
    output: { kind: 'gas', gas: 'o2' },
    baseCost: 1500,
    costGrowth: 1.14,
    baseRate: 55,
    buildWork: 40,
    revealAt: 400,
  },

  /* --- Wohnraum, den Aurora bauen kann (M11) -----------------------------
     Die offene Frage aus §17: die Wohnkuppel kostet Stein, den Aurora nicht
     führt — die Kolonie blieb dort bei den zwölf Betten der Landekapseln und
     damit statisch. Das Wohnmodul ist die Antwort: es kostet **kein**
     Material, weil es aus dem Regolith vor Ort gedruckt wird. Damit hat auch
     der materiallose Planet einen zweiten Akt, ohne dass Aurora ein
     Materialvorkommen bekommt und §11 verletzt.

     Wie die Kuppel bewusst ohne populationCost: Wohnraum, der Menschen
     kostet, ist ein Henne-Ei-Problem ohne Ausgang.
  ---------------------------------------------------------------------- */
  {
    id: 'habitat',
    name: 'Wohnmodul',
    description:
      'Aus Regolith gedruckt, in einer Nacht aufgestellt. Vier Kojen, eine Schleuse, kein Fenster.',
    output: { kind: 'housing' },
    baseCost: 350,
    /** Steiler als die O₂-Seite: jeder neue Mensch atmet und isst mit. */
    costGrowth: 1.2,
    baseRate: 4,
    buildWork: 20,
    revealAt: 60,
  },

  /* --- Die Eisenkette (M12, §17) ----------------------------------------
     Der erste Ort, an dem eine Anlage etwas verbraucht, das eine andere
     herstellt:

       Erz ──Schmelze──► Eisen ──Presse──► Metallplatten ──► Rakete

     Jedes Glied hat Plätze, denn jedes ist Handarbeit. Und jedes hat zwei
     Arten stillzustehen: unbesetzt, oder ohne Nachschub. Die zweite ist neu
     und der eigentliche Inhalt von M12 — sie kommt nicht aus der Kolonie,
     sondern aus der Stufe davor.

     Alle drei Stufen laufen mit **derselben** Rate, und das ist kein
     Copy-Paste: das Verhältnis entsteht aus dem Rezept, nicht aus der
     Geschwindigkeit. Weil zwei Eingang ein Ausgang ergeben, verarbeitet jede
     Stufe die Hälfte dessen, was die Stufe davor liefert — zwei Minen
     sättigen eine Schmelze, zwei Schmelzen eine Presse, und die volle Kette
     ist 4 : 2 : 1.

     Nachgerechnet, nachdem der erste Anlauf es falsch hatte: mit 0,5 / 0,25 /
     0,12 verbrauchte eine Schmelze 0,5 Erz/s und damit genau *eine* Mine. In
     der Simulation standen Erz und Eisen nach 90 Minuten beide am Lagerlimit,
     während die Presse hungerte — die Kette hätte das Gegenteil dessen
     gelehrt, was der Kommentar behauptete.
  ---------------------------------------------------------------------- */
  {
    id: 'oremine',
    name: 'Erzmine',
    description:
      'Ein Stollen in den roten Hang. Was herauskommt, ist wertlos, bis es durch den Ofen geht.',
    output: { kind: 'material', material: 'erz' },
    baseCost: 200,
    costGrowth: 1.14,
    baseRate: 0.5,
    buildWork: 22,
    revealAt: 150,
    workSlots: 2,
  },
  {
    id: 'smelter',
    name: 'Schmelze',
    description:
      'Ein Ofen, der nie ausgehen darf. Zwei Körbe Erz werden ein Barren — der Rest geht als Schlacke weg.',
    output: { kind: 'craft', material: 'eisen', input: { erz: 2 } },
    baseCost: 600,
    costGrowth: 1.15,
    baseRate: 0.5,
    buildWork: 35,
    revealAt: 400,
    workSlots: 2,
  },
  {
    id: 'press',
    name: 'Walzpresse',
    description:
      'Barren rein, Platten raus. Die Halle bebt im Takt, und man hört sie durch den ganzen Krater.',
    output: { kind: 'craft', material: 'platten', input: { eisen: 2 } },
    baseCost: 1400,
    costGrowth: 1.15,
    baseRate: 0.5,
    buildWork: 50,
    revealAt: 900,
    workSlots: 2,
  },

  /* --- Puffer -----------------------------------------------------------
     N₂ ist die einzige Antwort auf zu viel O₂: es verdünnt die Mischung,
     statt irgendetwas abzubauen. Deshalb muss es deutlich schneller laufen
     als die O₂-Seite — das Fenster verlangt rund viermal so viel davon.
  ---------------------------------------------------------------------- */
  {
    id: 'sublimator',
    name: 'Stickstoff-Sublimator',
    description: 'Taut gefrorenes Nitrat aus dem Permafrost. Der Puffer, in dem O₂ erst atembar wird.',
    output: { kind: 'gas', gas: 'n2' },
    baseCost: 300,
    costGrowth: 1.12,
    baseRate: 14,
    buildWork: 20,
    revealAt: 200,
  },
  {
    id: 'cracker',
    name: 'Nitrat-Cracker',
    description: 'Bricht Salzlager im industriellen Maßstab auf. Vesta riecht danach nach Ammoniak.',
    output: { kind: 'gas', gas: 'n2' },
    baseCost: 9000,
    costGrowth: 1.14,
    /** Der Cracker ist die erste Anlage, die ohne Material nicht anläuft. */
    materialCost: { titan: 8 },
    baseRate: 260,
    buildWork: 60,
    populationCost: 12,
    revealAt: 3000,
  },

  /* --- Schadstoffe ------------------------------------------------------
     Wäscher arbeiten anteilig, nicht absolut. Dadurch pendelt sich der
     Schadstoffanteil unabhängig vom Maßstab der Atmosphäre ein:
     gleichgewicht% = 100 × ausgasung / waschleistung.
  ---------------------------------------------------------------------- */
  {
    id: 'scrubber',
    name: 'CO₂-Wäscher',
    description: 'Bindet Kohlendioxid an Mineralstaub und lässt ihn abregnen.',
    output: { kind: 'gas', gas: 'scrub' },
    baseCost: 2000,
    costGrowth: 1.15,
    baseRate: 0.0018,
    buildWork: 30,
    revealAt: 1500,
  },

  {
    id: 'vent',
    name: 'Abblasventil',
    description:
      'Lässt Stickstoff kontrolliert in den Weltraum ab. Unelegant, aber die einzige Art, einen zu vollen Puffer wieder loszuwerden.',
    output: { kind: 'gas', gas: 'vent' },
    baseCost: 2600,
    costGrowth: 1.15,
    baseRate: 0.0016,
    buildWork: 30,
    revealAt: 1500,
  },

  /* --- Lager (M11, §17) --------------------------------------------------
     Das Lager ist seit M11 endlich, und ohne Hallen verfällt jeder Überschuss
     an der Grenze. Die Halle steht auf einem Planeten, ihr Platz gehört aber
     dem **Durchlauf** — wie das Lager selbst (systems/storage.ts). Sonst
     würde eine Reise die Kapazität senken und im selben Moment Material
     vernichten, das längst im Regal lag.

     Verfügbar nur, wo überhaupt etwas gefördert wird: eine Halle auf Aurora
     wäre eine Zeile ohne Zweck.
  ---------------------------------------------------------------------- */
  {
    id: 'depot',
    name: 'Lagerhalle',
    description:
      'Regale bis unters Dach, halb in den Fels getrieben. Was hier keinen Platz findet, bleibt liegen und verwittert.',
    output: { kind: 'storage' },
    baseCost: 900,
    costGrowth: 1.12,
    /*
     * Kostet seit M12 kein Material mehr. Vorher waren es 10 Stein, was
     * genau so lange ging, wie die Halle nur auf Planeten mit Stein
     * auftauchte. Seit Aurora eigene Materialien führt, erscheint sie auch
     * dort — und wäre mit einer Steinforderung ein Knopf, den dieser Planet
     * nie drücken kann. Regale aus dem, was am Ort liegt: dieselbe
     * Begründung, aus der der Steinbruch selbst kein Material braucht.
     */
    /** Platz je Halle und Material. Die Raketen brauchen bis zu 20 000. */
    baseRate: 2500,
    buildWork: 25,
    revealAt: 500,
  },

  /* --- Wald -------------------------------------------------------------
     Die Kette aus §16: Bäume erzeugen O₂, solange sie stehen, und werden
     beim Fällen zu Holz. Beides gleichzeitig geht nicht — das ist die
     eigentliche Entscheidung. Bauholz kostet Atmosphäre.
  ---------------------------------------------------------------------- */
  {
    id: 'nursery',
    name: 'Baumschule',
    description: 'Setzlinge unter Folie. Jeder angewachsene Baum atmet für dich mit.',
    output: { kind: 'plant' },
    baseCost: 800,
    costGrowth: 1.13,
    baseRate: 0.5,
    buildWork: 12,
    revealAt: 600,
    workSlots: 1,
  },
  {
    id: 'sawmill',
    name: 'Sägewerk',
    description: 'Macht aus Stämmen Balken — und aus einem Stück Atmosphäre einen Rohstoff.',
    output: { kind: 'fell' },
    baseCost: 2400,
    costGrowth: 1.14,
    materialCost: { stein: 5 },
    baseRate: 0.35,
    buildWork: 35,
    populationCost: 3,
    revealAt: 1800,
    workSlots: 2,
  },

  /* --- Leben ------------------------------------------------------------
     Menschen tauchen nicht mehr ab einem O₂-Wert auf. Sie brauchen ein Dach,
     etwas zu essen und etwas zu trinken — und beides bleibt planetenlokal.
     Die Wohnkuppel kostet bewusst *keine* Bevölkerung: sonst käme man aus
     dem Henne-Ei-Problem nie heraus.
  ---------------------------------------------------------------------- */
  {
    id: 'dome',
    name: 'Wohnkuppel',
    description: 'Druckdicht, eng und warm. Der erste Ort auf Vesta, an dem jemand schlafen kann.',
    output: { kind: 'housing' },
    baseCost: 500,
    costGrowth: 1.13,
    /**
     * Bewusst Stein und nicht Holz: Holz käme aus dem Sägewerk, das Menschen
     * kostet, die es ohne Wohnkuppel nicht gibt. Stein bricht die Kette, weil
     * der Steinbruch ohne Bevölkerung auskommt.
     */
    materialCost: { stein: 12 },
    /**
     * Betten je Kuppel. Simuliert: bei 40 wurde Wohnraum zur alles
     * bestimmenden Grenze, die Bevölkerung fiel von 79k auf 6k und Vesta auf
     * 54,7 min — weit über das Fenster aus §13. Bei 300 bleibt Wohnraum eine
     * echte Investition, ohne die Arbeitskraft zu erwürgen.
     */
    baseRate: 300,
    buildWork: 60,
    revealAt: 400,
  },
  {
    id: 'hydroponics',
    name: 'Hydroponik-Halle',
    description: 'Nährlösung statt Boden. Riecht nach nassem Metall und Tomaten.',
    output: { kind: 'supply', supply: 'food' },
    baseCost: 1600,
    costGrowth: 1.13,
    materialCost: { holz: 8, stein: 6 },
    populationCost: 4,
    baseRate: 3.5,
    buildWork: 45,
    revealAt: 1200,
    workSlots: 2,
  },
  {
    id: 'icemelt',
    name: 'Eisschmelze',
    description: 'Taut den Permafrost und filtert ihn. Vesta hat mehr Wasser als Luft.',
    output: { kind: 'supply', supply: 'water' },
    baseCost: 1300,
    costGrowth: 1.12,
    materialCost: { stein: 12 },
    populationCost: 3,
    baseRate: 4.5,
    buildWork: 40,
    revealAt: 1000,
  },

  /* --- Abbau ------------------------------------------------------------ */
  {
    id: 'quarry',
    name: 'Steinbruch',
    description: 'Der erste Eingriff, den man vom Orbit aus sieht. Stein gibt es überall, wo Fels ist.',
    output: { kind: 'material', material: 'stein' },
    baseCost: 1200,
    costGrowth: 1.13,
    baseRate: 0.4,
    buildWork: 25,
    revealAt: 350,
    workSlots: 2,
  },
  {
    id: 'titanmine',
    name: 'Titan-Mine',
    description: 'Tief, teuer und laut. Vesta gibt das Metall nur gegen Aufwand her.',
    output: { kind: 'material', material: 'titan' },
    baseCost: 12000,
    costGrowth: 1.15,
    materialCost: { stein: 40, holz: 25 },
    baseRate: 0.12,
    buildWork: 70,
    populationCost: 8,
    revealAt: 6000,
    workSlots: 3,
  },

  /* --- Pyra: Dreck statt Wald ------------------------------------------- */
  {
    id: 'obsidianpit',
    name: 'Obsidianbruch',
    description: 'Man schlägt die Glaskruste ab, solange sie warm ist. Später wird sie zu hart.',
    output: { kind: 'material', material: 'obsidian' },
    baseCost: 2200,
    costGrowth: 1.13,
    baseRate: 0.3,
    buildWork: 30,
    populationCost: 3,
    revealAt: 1400,
    workSlots: 2,
  },
  {
    id: 'sulfurvent',
    name: 'Schwefelschlot',
    description: 'Eine Haube über der Fumarole. Der Ertrag ist gut, der Geruch bleibt in der Kleidung.',
    output: { kind: 'material', material: 'schwefel' },
    baseCost: 5000,
    costGrowth: 1.14,
    materialCost: { obsidian: 15 },
    baseRate: 0.22,
    buildWork: 45,
    populationCost: 4,
    revealAt: 3500,
    workSlots: 2,
  },

  /* --- Kryo: Wasser im Überfluss ---------------------------------------- */
  {
    id: 'icecutter',
    name: 'Eisschneider',
    description: 'Sägt Blöcke aus dem Panzer. Auf Kryo liegt der Rohstoff einfach herum.',
    output: { kind: 'material', material: 'eis' },
    baseCost: 1800,
    costGrowth: 1.12,
    baseRate: 0.55,
    buildWork: 28,
    populationCost: 2,
    revealAt: 1100,
    workSlots: 2,
  },

  /* --- Nimbus: Gas kostet nichts ---------------------------------------- */
  {
    id: 'heliumtap',
    name: 'Heliumzapfer',
    description: 'Ein Rüssel in die Hochatmosphäre. Der Gasriese merkt nichts davon.',
    output: { kind: 'material', material: 'helium' },
    baseCost: 9000,
    costGrowth: 1.14,
    baseRate: 0.18,
    buildWork: 60,
    populationCost: 5,
    revealAt: 5000,
    workSlots: 3,
  },
  {
    id: 'gasscoop',
    name: 'Gasschöpfer',
    description:
      'Schöpft Stickstoff direkt aus dem Riesen nebenan. Was anderswo die halbe Arbeit ist, ist hier ein offener Hahn.',
    // Das Wahrzeichen von Nimbus. Nur nützt der Überfluss wenig, wenn die
    // Atmosphäre zwanzigmal so groß ist wie anderswo — der Planet gibt dir
    // die eine Hälfte geschenkt und macht die andere zur Lebensaufgabe.
    output: { kind: 'gas', gas: 'n2' },
    baseCost: 6000,
    costGrowth: 1.11,
    materialCost: { helium: 4 },
    baseRate: 3200,
    buildWork: 45,
    populationCost: 6,
    revealAt: 2500,
    planets: ['nimbus'],
  },
]

export function findGenerator(id: string): GeneratorDef | undefined {
  return GENERATORS.find((g) => g.id === id)
}

/** Alle Generatoren einer Gasart, in Datenreihenfolge. */
export function generatorsForGas(gas: GasKind): readonly GeneratorDef[] {
  return GENERATORS.filter((g) => g.output.kind === 'gas' && g.output.gas === gas)
}
