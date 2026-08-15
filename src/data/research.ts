/**
 * Der Forschungsbaum (DESIGN.md §10).
 *
 * Unterschied zum Meta-Baum: Knoten haben **Stufen**. Der Meta-Baum ist eine
 * Handvoll klar unterscheidbarer Einmal-Entscheidungen, die Forschung ist der
 * Ort, an dem sich Bevölkerung dauerhaft in Zahlen umsetzt — dafür sind
 * Stufen mit steigenden Kosten das ehrlichere Werkzeug.
 *
 * Forschung ist persistent: der Baum überlebt den Planetenwechsel.
 */
export type ResearchBranch = 'atmo' | 'bio' | 'ind'

/**
 * Die Zweige des Baums — wie bei den Anlagengruppen zugleich Reihenfolge und
 * **Sichtbarkeit**: ui/ResearchTree.svelte zeigt nur, was hier eine Zeile hat.
 * Ein Zweig ohne Eintrag ließe seine Knoten lautlos verschwinden, genau wie
 * `supply` es acht Meilensteine lang in der Anlagenliste tat.
 */
export const BRANCHES = [
  { id: 'atmo', name: 'Atmosphärentechnik', hint: 'Produktion, Puffer, Stabilität' },
  { id: 'bio', name: 'Biologie', hint: 'Menschen, Lebenserhaltung, Wissen' },
  { id: 'ind', name: 'Industrie', hint: 'Kosten, Klick, Arbeitskraft' },
] as const satisfies readonly { id: ResearchBranch; name: string; hint: string }[]

/* Vollständigkeit auf Compiler-Ebene — siehe GENERATOR_GROUPS. */
type FehlenderZweig = Exclude<ResearchBranch, (typeof BRANCHES)[number]['id']>
const _jederZweigHatEineZeile: [FehlenderZweig] extends [never] ? true : FehlenderZweig = true
void _jederZweigHatEineZeile

/** Wirkung *einer* Stufe. Stufen multiplizieren bzw. addieren sich auf. */
export type ResearchEffect =
  | { kind: 'o2Yield'; factor: number }
  | { kind: 'n2Yield'; factor: number }
  | { kind: 'scrubYield'; factor: number }
  | { kind: 'globalProduction'; factor: number }
  | { kind: 'clickPower'; factor: number }
  | { kind: 'workforce'; factor: number }
  /** Senkt alle Baukosten (0.12 = −12 % je Stufe, multiplikativ). */
  | { kind: 'buildCost'; reduction: number }
  | { kind: 'lifeSupport'; reduction: number }
  | { kind: 'growthRate'; factor: number }
  | { kind: 'popCapacity'; factor: number }
  | { kind: 'researchYield'; factor: number }
  /** Verbreitert das O₂-Zielfenster um n Prozentpunkte je Seite. */
  | { kind: 'o2Window'; widen: number }
  /** Lässt den Stabilitäts-Timer schneller laufen. */
  | { kind: 'stabilitySpeed'; factor: number }

export interface ResearchDef {
  id: string
  name: string
  description: string
  branch: ResearchBranch
  maxLevel: number
  /** Kosten der ersten Stufe. kosten(stufe) = baseCost × costGrowth^stufe */
  baseCost: number
  costGrowth: number
  effect: ResearchEffect
  /** Erst sichtbar, wenn alle genannten Knoten mindestens Stufe 1 haben. */
  requires?: readonly string[]
  /** Baupläne, die dieser Knoten ab der genannten Stufe freigibt (M20). */
  blueprints?: readonly { level: number; id: string }[]
  /** Nur auf Planeten, die diese Mechanik führen. */
  needs?: 'nitrogen' | 'pollution'
}

export const RESEARCH: readonly ResearchDef[] = [
  /* --- Atmosphärentechnik ---------------------------------------------- */
  {
    id: 'atmo-yield',
    name: 'Katalytische Membranen',
    description: 'Alle O₂-Anlagen liefern +30 % je Stufe.',
    branch: 'atmo',
    maxLevel: 6,
    baseCost: 30,
    costGrowth: 2.4,
    effect: { kind: 'o2Yield', factor: 1.3 },
  },
  {
    id: 'atmo-n2',
    name: 'Kryo-Destillation',
    description: 'Alle N₂-Anlagen liefern +35 % je Stufe.',
    branch: 'atmo',
    maxLevel: 6,
    baseCost: 45,
    costGrowth: 2.4,
    effect: { kind: 'n2Yield', factor: 1.35 },
    needs: 'nitrogen',
  },
  {
    id: 'atmo-scrub',
    name: 'Bindemittel-Filter',
    description: 'Wäscher arbeiten 45 % gründlicher je Stufe.',
    branch: 'atmo',
    maxLevel: 5,
    baseCost: 90,
    costGrowth: 2.6,
    effect: { kind: 'scrubYield', factor: 1.45 },
    needs: 'pollution',
    requires: ['atmo-yield'],
  },
  {
    id: 'atmo-window',
    name: 'Klimamodelle',
    description: 'Das O₂-Zielfenster wird je Stufe um 0,4 Punkte nach beiden Seiten weiter.',
    branch: 'atmo',
    maxLevel: 3,
    baseCost: 400,
    costGrowth: 4,
    effect: { kind: 'o2Window', widen: 0.4 },
    requires: ['atmo-yield'],
  },
  {
    id: 'atmo-stability',
    name: 'Wetterkontrolle',
    description: 'Der Stabilitäts-Timer läuft je Stufe 30 % schneller.',
    branch: 'atmo',
    maxLevel: 3,
    baseCost: 600,
    costGrowth: 3.5,
    effect: { kind: 'stabilitySpeed', factor: 1.3 },
    requires: ['atmo-window'],
  },

  /* --- Biologie --------------------------------------------------------- */
  {
    id: 'bio-research',
    name: 'Lehranstalten',
    description: 'Die Bevölkerung forscht 50 % ergiebiger je Stufe.',
    branch: 'bio',
    maxLevel: 6,
    baseCost: 25,
    costGrowth: 2.5,
    effect: { kind: 'researchYield', factor: 1.5 },
  },
  {
    id: 'bio-life',
    name: 'Kreislaufatmung',
    description: 'Menschen verbrauchen je Stufe 18 % weniger O₂.',
    branch: 'bio',
    maxLevel: 5,
    baseCost: 60,
    costGrowth: 2.8,
    effect: { kind: 'lifeSupport', reduction: 0.18 },
  },
  {
    id: 'bio-growth',
    name: 'Hydroponik',
    description: 'Die Bevölkerung wächst je Stufe 30 % schneller.',
    branch: 'bio',
    maxLevel: 4,
    baseCost: 80,
    costGrowth: 2.8,
    effect: { kind: 'growthRate', factor: 1.3 },
    requires: ['bio-research'],
  },
  {
    id: 'bio-capacity',
    name: 'Habitatringe',
    description: 'Die Siedlungskapazität steigt je Stufe um 35 %.',
    branch: 'bio',
    maxLevel: 4,
    baseCost: 150,
    costGrowth: 3,
    effect: { kind: 'popCapacity', factor: 1.35 },
    requires: ['bio-growth'],
  },

  /* --- Industrie -------------------------------------------------------- */
  {
    id: 'ind-cost',
    name: 'Serienfertigung',
    description: 'Alle Baukosten sinken je Stufe um 12 %.',
    branch: 'ind',
    maxLevel: 5,
    baseCost: 50,
    costGrowth: 2.7,
    effect: { kind: 'buildCost', reduction: 0.12 },
    blueprints: [
      { level: 1, id: 'press' },
      { level: 3, id: 'depot' },
    ],
  },
  {
    id: 'ind-global',
    name: 'Fließbandbau',
    description: 'Alle Anlagen produzieren je Stufe 20 % mehr.',
    branch: 'ind',
    maxLevel: 6,
    baseCost: 70,
    costGrowth: 2.5,
    effect: { kind: 'globalProduction', factor: 1.2 },
  },
  {
    id: 'ind-work',
    name: 'Automatisierung',
    description: 'Der Arbeitskraft-Bonus wirkt je Stufe 40 % stärker.',
    branch: 'ind',
    maxLevel: 4,
    baseCost: 120,
    costGrowth: 3,
    effect: { kind: 'workforce', factor: 1.4 },
    requires: ['ind-global'],
  },
  {
    id: 'ind-click',
    name: 'Exoskelette',
    description: 'Dreifacher Klick-Ertrag je Stufe.',
    branch: 'ind',
    maxLevel: 3,
    baseCost: 200,
    costGrowth: 3.2,
    effect: { kind: 'clickPower', factor: 3 },
    requires: ['ind-cost'],
  },
]

export function findResearch(id: string): ResearchDef | undefined {
  return RESEARCH.find((r) => r.id === id)
}
