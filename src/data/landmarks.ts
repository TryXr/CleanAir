import type { MaterialCost } from './materials'

/**
 * Bauwerke (M19, DESIGN.md §20.3).
 *
 * **Ein Bauwerk pro Planet. Genau eines.** Es ist das erste Ding in diesem
 * Spiel, von dem es keine Stückzahl gibt — und damit die Antwort auf den
 * Befund aus §20: bei einer Kostenkurve von ×1,08 bis ×1,20 ist das nächste
 * Stück immer „dasselbe, etwas teurer", und ein Ziel entsteht so nie.
 *
 * Vier Regeln, die ein Bauwerk von einer Anlage unterscheiden:
 *
 * 1. **Es kostet null O₂.** Material, Fundstücke und Arbeitszeit. Das führt
 *    §17 zu Ende.
 * 2. **Es entsteht in Etappen**, jede mit eigener Rechnung — vier Schritte,
 *    die man einzeln sieht, statt eines Balkens, der eine Stunde läuft.
 * 3. **Es steht in derselben Reihe wie ein Haus** (`BuildSite.art`). Dieselbe
 *    Kolonne, dieselbe Zeit: wer am Bauwerk baut, baut gerade kein Wohnmodul.
 * 4. **Seine Wirkung ist kein Beschleuniger.** Das ist die wichtigste und die
 *    am leichtesten zu vergessende: das Ziel dieses Spiels ist ein *Fenster*,
 *    kein Maximum. Wer den Ausstoß erhöht, erhöht die Gefahr, darüber
 *    hinauszuschießen — und über dem O₂-Fenster gibt es kein Zurück (§4).
 *    Jedes Bauwerk nimmt deshalb ein **Risiko** weg oder verlängert die
 *    **Reichweite**. Keines produziert etwas.
 *
 * **Erebos hat keines**, und das ist Absicht: dort baut man kein Denkmal,
 * dort räumt man auf. Sein Bauwerk ist die Aussaat (§19).
 */

/**
 * Woran ein Bauwerk wirkt.
 *
 * Der Schlüsseltyp ist absichtlich eng: eine neue Art zwingt den Compiler,
 * die Behandlung in systems/landmarks.ts zu verlangen — dasselbe Muster wie
 * `GENERATOR_GROUPS` in data/generators.ts.
 */
export type LandmarkEffect =
  /** Der Stabilitäts-Timer pausiert, statt auf null zu fallen. */
  | { kind: 'stabilityHold' }
  /** Biomasse wächst um diesen Faktor schneller — zahlt auf den Abflug (§18). */
  | { kind: 'biomass'; factor: number }
  /** Der Schadstoffanteil kann diesen Wert nicht mehr überschreiten. */
  | { kind: 'pollutionCap'; percent: number }
  /** Die Sättigung fällt nicht unter diesen Wert. */
  | { kind: 'satietyFloor'; floor: number }
  /** Zusätzlicher Platz im Lager, für jedes Material zugleich. */
  | { kind: 'storage'; amount: number }

export interface LandmarkStage {
  name: string
  /** Ein Satz, der beschreibt, was jetzt entsteht. */
  description: string
  /** Material und Fundstücke. Sofort fällig wie bei jeder Bestellung. */
  cost: MaterialCost
  /** Arbeitersekunden für diese Etappe. */
  work: number
}

export interface LandmarkDef {
  id: string
  planet: string
  name: string
  description: string
  /**
   * Wirkt das fertige Bauwerk nur auf seinem Planeten oder im ganzen
   * Durchlauf?
   *
   * **Der Unterschied ist keine Feinheit, sondern die Falle dieses Projekts.**
   * `planet` ist das eine reaktive Objekt für den *aktiven* Planeten; wer eine
   * Wirkung daran festmacht, verliert sie beim Wegfliegen. Für einen
   * Wetterturm ist genau das richtig — er steht dort und hilft dort. Für ein
   * Lager, das laut §16 dem ganzen Durchlauf gehört, wäre es ein Fehler, und
   * zwar derselbe, der schon die Sternenkarte nach jedem Flug verschwinden
   * ließ.
   */
  scope: 'planet' | 'run'
  effect: LandmarkEffect
  /** Was das fertige Bauwerk bewirkt — in einem Satz, für die Oberfläche. */
  effectText: string
  stages: readonly LandmarkStage[]
}

export const LANDMARKS: readonly LandmarkDef[] = [
  {
    id: 'wetterturm',
    planet: 'aurora',
    name: 'Der Wetterturm',
    description:
      'Ein Mast mit Messköpfen bis in die obere Schicht. Er ändert nichts an der Luft — er sagt nur früh genug, was sie vorhat.',
    scope: 'planet',
    effect: { kind: 'stabilityHold' },
    effectText: 'Der Stabilitäts-Timer fällt nicht mehr auf null, sondern pausiert.',
    stages: [
      {
        name: 'Fundament',
        description: 'Ein Ring aus Beton, tief genug, dass der Wind ihn nicht mehr interessiert.',
        cost: { stein: 120, fundstueck: 1 },
        work: 240,
      },
      {
        name: 'Rohbau',
        description: 'Vierzig Meter Gitter, Segment für Segment nach oben.',
        cost: { platten: 90, titan: 40, fundstueck: 1 },
        work: 420,
      },
      {
        name: 'Hülle',
        description: 'Verkleidung und Leitern. Ab hier kann jemand hinauf, ohne zu klettern.',
        cost: { balken: 30, werkzeug: 8, fundstueck: 2 },
        work: 600,
      },
      {
        name: 'Inbetriebnahme',
        description: 'Die Messköpfe kommen an ihren Platz. Danach hat die Kolonie eine Vorwarnung.',
        cost: { platten: 60, werkzeug: 6, fundstueck: 2 },
        work: 780,
      },
    ],
  },

  {
    id: 'saatbank',
    planet: 'vesta',
    name: 'Die Saatbank',
    description:
      'Kühlfächer voller Samen, Sporen und Stecklinge — von hier, von Aurora, von überall. Was hier liegt, fliegt eines Tages weiter.',
    /*
     * Biomasse ist eine Eigenschaft des Planeten, aber sie zahlt auf den
     * Abflug ein (§18) und damit auf den ganzen Durchlauf. Trotzdem `planet`:
     * die Saatbank steht auf Vesta und lässt *dort* mehr wachsen. Ein Bonus,
     * der von Vesta aus die Biomasse auf Kryo erhöht, wäre eine Zahl ohne
     * Bild.
     */
    scope: 'planet',
    effect: { kind: 'biomass', factor: 1.6 },
    effectText: 'Biomasse wächst hier um 60 % schneller — und Biomasse ist, wie weit die Aussaat reicht.',
    stages: [
      {
        name: 'Fundament',
        description: 'Ein Keller im Permafrost. Die Kälte ist hier umsonst zu haben.',
        cost: { stein: 150, holz: 80, fundstueck: 1 },
        work: 300,
      },
      {
        name: 'Rohbau',
        description: 'Regale bis unter die Decke, aus Holz, das nicht ausgast.',
        cost: { balken: 40, titan: 50, fundstueck: 1 },
        work: 480,
      },
      {
        name: 'Hülle',
        description: 'Doppelte Schleuse. Was hier hereinkommt, soll in dreihundert Jahren noch keimen.',
        cost: { platten: 80, werkzeug: 10, fundstueck: 2 },
        work: 660,
      },
      {
        name: 'Inbetriebnahme',
        description: 'Der erste Bestand wird eingelagert und beschriftet. Die Handschrift bleibt.',
        cost: { eisen: 100, werkzeug: 8, fundstueck: 2 },
        work: 840,
      },
    ],
  },

  {
    id: 'aschefang',
    planet: 'pyra',
    name: 'Der Aschefang',
    description:
      'Eine Wand aus Kaminen quer zum Wind, die den Ausstoß abfängt, bevor er sich verteilt. Sie macht die Luft nicht sauber — sie verhindert, dass es schlimmer wird.',
    scope: 'planet',
    effect: { kind: 'pollutionCap', percent: 6 },
    effectText: 'Der Schadstoffanteil kann nicht mehr über 6 % steigen, egal was passiert.',
    stages: [
      {
        name: 'Fundament',
        description: 'Sockel im frisch erstarrten Basalt. Man gräbt hier nicht, man sprengt.',
        cost: { obsidian: 140, fundstueck: 1 },
        work: 360,
      },
      {
        name: 'Rohbau',
        description: 'Zwölf Kamine, jeder so hoch wie das Fördergerüst.',
        cost: { platten: 120, titan: 60, fundstueck: 1 },
        work: 540,
      },
      {
        name: 'Hülle',
        description: 'Filterkassetten aus Mineralstaub — dieselbe Idee wie im Wäscher, nur stehend.',
        cost: { schwefel: 100, werkzeug: 12, fundstueck: 2 },
        work: 720,
      },
      {
        name: 'Inbetriebnahme',
        description: 'Die Züge werden ausgerichtet. Ab jetzt läuft der Dreck nicht mehr davon.',
        cost: { obsidian: 90, balken: 40, fundstueck: 2 },
        work: 900,
      },
    ],
  },

  {
    id: 'zisterne',
    planet: 'kryo',
    name: 'Die Zisterne',
    description:
      'Ein Becken unter dem Eis, groß genug für einen Winter. Auf einem Planeten, auf dem alles seine Zeit braucht, ist ein Vorrat mehr wert als ein Ertrag.',
    scope: 'planet',
    effect: { kind: 'satietyFloor', floor: 0.5 },
    effectText: 'Die Versorgung fällt nicht mehr unter die Hälfte — Engpässe bremsen, aber kippen nichts.',
    /*
     * **Acht Fundstücke, nicht sechs — gemessen bei der Messung zu §20.**
     *
     * Mit sechs stand die Zisterne nach 101,6 Minuten, während Kryo selbst
     * erst nach 130 fertig wird. Ein Bauwerk, das vor dem Ziel dasteht, ist
     * kein Ziel mehr, sondern eine Zwischenstation — und ausgerechnet der
     * vierte Planet hätte damit das früheste Denkmal gehabt. Der Grund ist
     * nicht Kryo, sondern die Kolonie: große Siedlungen schicken größere
     * Trupps, und die Beute hängt an `crew / maxCrew`. Späte Planeten müssen
     * deshalb mehr verlangen, sonst wird der lange Weg zum Selbstläufer.
     */
    stages: [
      {
        name: 'Fundament',
        description: 'Ein Schacht ins Eis, ausgekleidet gegen das Nachrutschen.',
        cost: { eis: 160, stein: 100, fundstueck: 1 },
        work: 360,
      },
      {
        name: 'Rohbau',
        description: 'Das Becken selbst. Es fasst mehr, als die Kolonie in Wochen trinkt.',
        cost: { platten: 110, titan: 50, fundstueck: 2 },
        work: 600,
      },
      {
        name: 'Hülle',
        description: 'Dämmung und Deckel, damit der Vorrat nicht wieder zu dem wird, woraus er kam.',
        cost: { balken: 50, werkzeug: 12, fundstueck: 2 },
        work: 780,
      },
      {
        name: 'Inbetriebnahme',
        description: 'Pumpen und Leitungen. Danach ist ein schlechter Tag nur noch ein schlechter Tag.',
        cost: { eisen: 120, werkzeug: 10, fundstueck: 3 },
        work: 960,
      },
    ],
  },

  {
    id: 'fahrstuhl',
    planet: 'nimbus',
    name: 'Der Fahrstuhl',
    description:
      'Ein Seil in die obere Schicht und eine Gondel daran. Wer einmal oben ist, muss nicht mehr jedes Gramm einzeln hinaufschleppen — das gilt für den ganzen Durchlauf.',
    /*
     * Das einzige Bauwerk mit `run`: das Lager gehört seit §16 ausdrücklich
     * allen Planeten gemeinsam. Ein Fahrstuhl, dessen Wirkung beim Wegfliegen
     * verschwindet, wäre die Verwechslung „Eigenschaft des aktiven Planeten
     * statt des Durchlaufs" — dieselbe, die die Sternenkarte gekostet hat.
     */
    scope: 'run',
    effect: { kind: 'storage', amount: 2500 },
    effectText: 'Das Lager fasst 2500 mehr — von jedem Material, auf allen Planeten.',
    stages: [
      {
        name: 'Fundament',
        description: 'Ein Anker, der ein Seil hält, an dem eine Gondel hängt. Klingt einfacher, als es ist.',
        cost: { platten: 130, stein: 120, fundstueck: 1 },
        work: 420,
      },
      {
        name: 'Rohbau',
        description: 'Das Seil. Titan, geflochten, in einem Stück.',
        cost: { titan: 120, fundstueck: 2 },
        work: 660,
      },
      {
        name: 'Hülle',
        description: 'Die Gondel — Platz für Menschen und für Kisten, in dieser Reihenfolge.',
        cost: { helium: 90, balken: 50, werkzeug: 12, fundstueck: 2 },
        work: 840,
      },
      {
        name: 'Inbetriebnahme',
        description: 'Die erste Fahrt geht nach oben und kommt beladen zurück.',
        cost: { helium: 120, werkzeug: 10, fundstueck: 3 },
        work: 1020,
      },
    ],
  },
]

export function landmarkFor(planetId: string): LandmarkDef | undefined {
  return LANDMARKS.find((l) => l.planet === planetId)
}

export function findLandmark(id: string): LandmarkDef | undefined {
  return LANDMARKS.find((l) => l.id === id)
}
