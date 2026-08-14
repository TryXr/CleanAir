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
  /** Ab wie viel jemals freigesetztem O₂ der Generator sichtbar wird. */
  revealAt: number

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
    description: 'Spaltet gebundenes Wasser im Gestein. Langsam, aber sie läuft überall.',
    output: { kind: 'gas', gas: 'o2' },
    baseCost: 10,
    costGrowth: 1.12,
    baseRate: 0.3,
    revealAt: 0,
  },
  {
    id: 'photolysis',
    name: 'Photolyse-Farm',
    description: 'Genmodifizierte Algen unter Kuppeln. Der erste sichtbare Grünton auf Aurora.',
    output: { kind: 'gas', gas: 'o2' },
    baseCost: 120,
    costGrowth: 1.13,
    baseRate: 4,
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
    revealAt: 400,
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
    revealAt: 1500,
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
    revealAt: 600,
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
    populationCost: 3,
    revealAt: 1800,
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
    revealAt: 1200,
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
    revealAt: 350,
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
    populationCost: 8,
    revealAt: 6000,
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
    populationCost: 3,
    revealAt: 1400,
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
    populationCost: 4,
    revealAt: 3500,
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
    populationCost: 2,
    revealAt: 1100,
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
    populationCost: 5,
    revealAt: 5000,
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
