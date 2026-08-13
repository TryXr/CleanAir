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
   * Pro Sekunde pro Stück, vor allen Multiplikatoren. Bei `scrub` ist das
   * der Anteil der Schadstoffe, den ein Stück pro Sekunde entfernt, bei
   * `plant` und `fell` die Zahl der Bäume.
   */
  baseRate: number
  /** Ab wie viel jemals freigesetztem O₂ der Generator sichtbar wird. */
  revealAt: number
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
    revealAt: 1800,
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
    revealAt: 900,
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
    revealAt: 6000,
  },
]

export function findGenerator(id: string): GeneratorDef | undefined {
  return GENERATORS.find((g) => g.id === id)
}

/** Alle Generatoren einer Gasart, in Datenreihenfolge. */
export function generatorsForGas(gas: GasKind): readonly GeneratorDef[] {
  return GENERATORS.filter((g) => g.output.kind === 'gas' && g.output.gas === gas)
}
