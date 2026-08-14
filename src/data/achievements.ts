/**
 * Achievements mit echtem Effekt (DESIGN.md §10).
 *
 * Ausdrücklich *keine* Vitrine: jedes hier schaltet einen kleinen, dauerhaften
 * Bonus frei. Der Sinn steht im Konzept — „starker Anreiz, Randstrategien
 * auszuprobieren". Deshalb belohnen sie bewusst auch Dinge, die man sonst nie
 * täte: nur klicken, einen Planeten kahlschlagen, eine Welle ohne
 * Verteidigung überstehen.
 *
 * Reine Daten (CLAUDE.md): die Bedingung ist eine beschriebene Prüfung, keine
 * Funktion. Ausgewertet wird sie in systems/achievements.ts.
 */

/** Was geprüft wird. Alle Vergleiche sind „mindestens". */
export type Condition =
  | { kind: 'totalOxygen'; atLeast: number }
  | { kind: 'clicks'; atLeast: number }
  | { kind: 'planetsCompleted'; atLeast: number }
  | { kind: 'runs'; atLeast: number }
  | { kind: 'population'; atLeast: number }
  | { kind: 'research'; atLeast: number }
  | { kind: 'cores'; atLeast: number }
  | { kind: 'material'; material: string; atLeast: number }
  | { kind: 'trees'; atLeast: number }
  | { kind: 'wavesRepelled'; atLeast: number }
  | { kind: 'abilitiesUsed'; atLeast: number }
  | { kind: 'eventsHandled'; atLeast: number }
  | { kind: 'fires'; atLeast: number }
  /** Gleichzeitig auf so vielen Planeten Siedler haben. */
  | { kind: 'inhabitedPlanets'; atLeast: number }

/** Dauerhafter Bonus. Wirkt über alle Durchläufe hinweg. */
export type AchievementEffect =
  | { kind: 'globalProduction'; factor: number }
  | { kind: 'clickPower'; factor: number }
  | { kind: 'researchYield'; factor: number }
  | { kind: 'popCapacity'; factor: number }
  | { kind: 'buildCost'; reduction: number }
  | { kind: 'defenseDamage'; factor: number }

export interface AchievementDef {
  id: string
  name: string
  /** Was man getan hat. */
  description: string
  condition: Condition
  effect: AchievementEffect
  /** Bonus als Text, damit die UI ihn nicht selbst formulieren muss. */
  reward: string
}

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  /* --- Die ersten Schritte ---------------------------------------------- */
  {
    id: 'first-breath',
    name: 'Erster Atemzug',
    description: '10.000 O₂ freigesetzt.',
    condition: { kind: 'totalOxygen', atLeast: 10000 },
    effect: { kind: 'globalProduction', factor: 1.03 },
    reward: '+3 % Produktion',
  },
  {
    id: 'handwork',
    name: 'Handarbeit',
    description: '1.000 Mal selbst Hand angelegt.',
    // Belohnt genau den Spielstil, den Generatoren eigentlich überflüssig
    // machen sollen — und macht ihn dadurch zu einer echten Option.
    condition: { kind: 'clicks', atLeast: 1000 },
    effect: { kind: 'clickPower', factor: 2 },
    reward: 'Klick-Ertrag ×2',
  },
  {
    id: 'first-world',
    name: 'Eine Welt, die atmet',
    description: 'Einen Planeten stabil bekommen.',
    condition: { kind: 'planetsCompleted', atLeast: 1 },
    effect: { kind: 'globalProduction', factor: 1.05 },
    reward: '+5 % Produktion',
  },

  /* --- Aufbau ------------------------------------------------------------ */
  {
    id: 'lumberjack',
    name: 'Holzweg',
    description: '100.000 Holz geschlagen.',
    condition: { kind: 'material', material: 'holz', atLeast: 100000 },
    effect: { kind: 'buildCost', reduction: 0.05 },
    reward: '−5 % Baukosten',
  },
  {
    id: 'quarryman',
    name: 'Steinreich',
    description: '250.000 Stein abgebaut.',
    condition: { kind: 'material', material: 'stein', atLeast: 250000 },
    effect: { kind: 'buildCost', reduction: 0.05 },
    reward: '−5 % Baukosten',
  },
  {
    id: 'titanheart',
    name: 'Titanherz',
    description: '50.000 Titan gefördert.',
    condition: { kind: 'material', material: 'titan', atLeast: 50000 },
    effect: { kind: 'globalProduction', factor: 1.08 },
    reward: '+8 % Produktion',
  },
  {
    id: 'forester',
    name: 'Förster',
    description: '10.000 Bäume gleichzeitig stehen haben.',
    condition: { kind: 'trees', atLeast: 10000 },
    effect: { kind: 'popCapacity', factor: 1.1 },
    reward: '+10 % Siedlungskapazität',
  },

  /* --- Menschen ---------------------------------------------------------- */
  {
    id: 'crowded',
    name: 'Gedränge',
    description: '50.000 Menschen im Imperium.',
    condition: { kind: 'population', atLeast: 50000 },
    effect: { kind: 'researchYield', factor: 1.15 },
    reward: '+15 % Forschung',
  },
  {
    id: 'scholars',
    name: 'Gelehrte',
    description: '10.000 Forschungspunkte verdient.',
    condition: { kind: 'research', atLeast: 10000 },
    effect: { kind: 'researchYield', factor: 1.15 },
    reward: '+15 % Forschung',
  },
  {
    id: 'diaspora',
    name: 'Diaspora',
    description: 'Auf drei Planeten gleichzeitig leben Menschen.',
    condition: { kind: 'inhabitedPlanets', atLeast: 3 },
    effect: { kind: 'globalProduction', factor: 1.12 },
    reward: '+12 % Produktion',
  },

  /* --- Anoxen ------------------------------------------------------------ */
  {
    id: 'held-the-line',
    name: 'Gehalten',
    description: 'Fünf Wellen abgewehrt.',
    condition: { kind: 'wavesRepelled', atLeast: 5 },
    effect: { kind: 'defenseDamage', factor: 1.15 },
    reward: '+15 % Abwehrschaden',
  },
  {
    id: 'quick-hands',
    name: 'Schnelle Hände',
    description: '25 Mal eine Fähigkeit im Kampf eingesetzt.',
    condition: { kind: 'abilitiesUsed', atLeast: 25 },
    effect: { kind: 'defenseDamage', factor: 1.2 },
    reward: '+20 % Abwehrschaden',
  },

  /* --- Randstrategien ---------------------------------------------------- */
  {
    id: 'firestarter',
    name: 'Brandstifter',
    description: 'Zehn Mal einen Planeten in Brand gesetzt.',
    // Ein Fehler, den man normalerweise vermeidet — hier wird er zur
    // Sammelaufgabe. Genau die „Randstrategie" aus §10.
    condition: { kind: 'fires', atLeast: 10 },
    effect: { kind: 'globalProduction', factor: 1.06 },
    reward: '+6 % Produktion',
  },
  {
    id: 'firefighter',
    name: 'Krisenmanager',
    description: 'Auf 15 Zwischenfälle reagiert.',
    condition: { kind: 'eventsHandled', atLeast: 15 },
    effect: { kind: 'globalProduction', factor: 1.06 },
    reward: '+6 % Produktion',
  },

  /* --- Weit gekommen ----------------------------------------------------- */
  {
    id: 'again',
    name: 'Noch einmal von vorn',
    description: 'Einen Durchlauf abgeschlossen.',
    condition: { kind: 'runs', atLeast: 1 },
    effect: { kind: 'globalProduction', factor: 1.15 },
    reward: '+15 % Produktion',
  },
  {
    id: 'corekeeper',
    name: 'Kernbestand',
    description: '50 Genesis-Kerne besessen.',
    condition: { kind: 'cores', atLeast: 50 },
    effect: { kind: 'buildCost', reduction: 0.08 },
    reward: '−8 % Baukosten',
  },
]

export function findAchievement(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id)
}
