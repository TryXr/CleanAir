import Decimal from 'break_infinity.js'
import { LANDMARKS, landmarkFor, type LandmarkDef, type LandmarkStage } from '../data/landmarks'
import { nameFor } from '../data/names'
import { play } from '../engine/audio'
import { addLog } from '../state/log.svelte'
import { planet } from '../state/planet.svelte'
import { canAffordMaterials, run, spendMaterials } from '../state/run.svelte'

/**
 * Bauwerke (M19, DESIGN.md §20.3).
 *
 * Das erste Ding im Spiel, von dem es genau eines gibt. Die Logik hier ist
 * bewusst dünn — der Bau selbst läuft über dieselbe Baustelle wie alles
 * andere (systems/construction.ts), damit die Entscheidung „Bauwerk oder
 * Wohnmodul" wirklich eine ist und nicht zwei Warteschlangen nebeneinander.
 *
 * Was hier steht, ist deshalb nur: welche Etappe dran ist, was sie kostet,
 * und **was ein fertiges Bauwerk bewirkt**. Der letzte Teil ist die
 * Sammelstelle im Sinne von CLAUDE.md: `landmarkEffects()` liefert einen
 * Satz Zahlen, und die fünf Stellen im Spiel, die sie brauchen, lesen von
 * dort. Wer eine Wirkung direkt in eine Formel schreibt, macht sie
 * unauffindbar.
 */

/** Wie viele Etappen dieses Planeten fertig sind. */
export function stagesDone(): number {
  return planet.landmarkStage
}

export function landmarkHere(): LandmarkDef | undefined {
  return landmarkFor(planet.id)
}

/** Die Etappe, die als Nächstes dran ist — oder `undefined`, wenn alles steht. */
export function nextStage(): LandmarkStage | undefined {
  const def = landmarkHere()
  if (!def) return undefined
  return def.stages[planet.landmarkStage]
}

/** Steht das Bauwerk dieses Planeten fertig da? */
export function landmarkDone(): boolean {
  const def = landmarkHere()
  return def !== undefined && planet.landmarkStage >= def.stages.length
}

/** Läuft gerade eine Etappe in der Bauschlange? */
export function stageUnderway(): boolean {
  return planet.sites.some((s) => s.art === 'bauwerk')
}

/**
 * Wie viel Arbeit eine Etappe verlangt — nach Abzug des Werkzeugs.
 *
 * **Hier löst Werkzeug endlich sein Versprechen ein.** Seine Beschreibung
 * sagt seit M14 „Verdoppelt, was dieselben Hände schaffen", und mechanisch
 * tat es nichts: es war Zutat für ein Badehaus und für die Aussaat. Wer über
 * die geforderte Menge hinaus welches im Lager hat, baut schneller — bis zur
 * Hälfte der Arbeit, nicht weiter.
 *
 * Bewusst nur an dieser Stelle und nicht an `buildRate()`: eine allgemeine
 * Baubeschleunigung wirkt auf Wohnraum und damit auf Bevölkerung und damit
 * auf den O₂-Verbrauch — also auf etwas, das in ein Fenster treffen muss. Das
 * ist genau die Falle, die CLAUDE.md beschreibt.
 */
export function stageWork(stage: LandmarkStage): number {
  const vorrat = run.materials.werkzeug?.toNumber() ?? 0
  const gefordert = stage.cost.werkzeug ?? 0
  const ueberschuss = Math.max(0, vorrat - gefordert)
  // 40 überzählige Werkzeuge bringen die volle Halbierung. Flach genug, dass
  // es sich lohnt, und gedeckelt, damit es kein Ersatz für Hände wird.
  const abzug = Math.min(0.5, ueberschuss / 80)
  return stage.work * (1 - abzug)
}

/** Was der nächsten Etappe im Weg steht — oder `null`. */
export function stageBlocker(): string | null {
  const def = landmarkHere()
  if (!def) return 'hier ist kein Bauwerk vorgesehen'
  if (landmarkDone()) return 'steht fertig'
  if (stageUnderway()) return 'Etappe läuft'
  const stage = nextStage()
  if (!stage) return 'steht fertig'
  if (!canAffordMaterials(stage.cost)) return 'zu wenig Material'
  return null
}

export function canOrderStage(): boolean {
  return stageBlocker() === null
}

/**
 * Bestellt die nächste Etappe.
 *
 * Material sofort weg, die Etappe entsteht durch Arbeit — dieselbe Reihe,
 * dieselbe Kolonne wie bei jedem Haus (M11). Kein O₂: Bauwerke sind der Teil
 * des Spiels, in dem §17 zu Ende gedacht ist.
 */
export function orderStage(): boolean {
  const stage = nextStage()
  if (!stage || !canOrderStage()) return false

  spendMaterials(stage.cost)
  const def = landmarkHere()!
  planet.sites = [
    ...planet.sites,
    { art: 'bauwerk', id: def.id, remaining: 1, progress: 0 },
  ]
  addLog(`${def.name}: ${stage.name} begonnen.`)
  play('buy')
  return true
}

/**
 * Eine Etappe ist fertig geworden — gerufen aus dem Bausystem.
 *
 * Steht hier und nicht dort, damit die Regel „was passiert, wenn ein Bauwerk
 * wächst" an einer Stelle liegt: das Bausystem weiß nur, dass Arbeit fertig
 * ist, nicht was das bedeutet.
 */
export function completeStage(id: string): void {
  const def = LANDMARKS.find((l) => l.id === id)
  if (!def) return

  planet.landmarkStage = Math.min(def.stages.length, planet.landmarkStage + 1)
  const stage = def.stages[planet.landmarkStage - 1]

  if (planet.landmarkStage >= def.stages.length) {
    addLog(`${def.name} steht. ${def.effectText}`, 'good')
    play('complete')
  } else {
    /*
     * **Wer die Etappe fertig gemacht hat, steht dabei** (M27, §17).
     *
     * Namen nur, wo Einzelne vorkommen — und ein Bauwerk ist die Stelle, an
     * der dieses Spiel es selbst schon andeutet: die Saatbank endet mit „Die
     * Handschrift bleibt". Der Schlüssel enthält Planet und Etappe, nie die
     * Uhrzeit: dieselbe Etappe trägt nach einem Neuladen denselben Namen.
     */
    const wer = nameFor(`bauwerk:${planet.id}:${def.id}:${planet.landmarkStage}`)
    addLog(`${def.name}: ${stage?.name ?? 'Etappe'} fertig. Aufgeschrieben von ${wer}.`, 'good')
    play('upgrade')
  }
}

// --- Wirkungen ------------------------------------------------------------

export interface LandmarkEffects {
  /** Hält der Stabilitäts-Timer, statt zurückzufallen? */
  stabilityHold: boolean
  /** Faktor auf den Biomasse-Zuwachs. */
  biomass: number
  /** Obergrenze für den Schadstoffanteil in Prozent, oder `undefined`. */
  pollutionCap: number | undefined
  /** Untergrenze für die Sättigung. */
  satietyFloor: number
  /** Zusätzlicher Lagerplatz, aus allen Planeten des Durchlaufs. */
  storage: number
}

/**
 * Steht dieses Bauwerk irgendwo im Durchlauf fertig?
 *
 * Für `scope: 'run'` muss auch nachgesehen werden, was **eingelagert** ist:
 * `planet` ist nur der aktive Planet, alle anderen liegen als Momentaufnahme
 * in `run.planets`. Genau diese Verwechslung — Eigenschaft des aktiven
 * Planeten statt des Durchlaufs — hat in diesem Projekt schon die
 * Sternenkarte und die Anlagenliste gekostet.
 */
function fertigImDurchlauf(def: LandmarkDef): boolean {
  if (planet.id === def.planet) return planet.landmarkStage >= def.stages.length
  const eingelagert = run.planets[def.planet] as { landmarkStage?: unknown } | undefined
  const stufe = typeof eingelagert?.landmarkStage === 'number' ? eingelagert.landmarkStage : 0
  return stufe >= def.stages.length
}

/**
 * Die Sammelstelle. Alle fünf Wirkungen an einem Ort, wie es CLAUDE.md für
 * jeden Bonus verlangt — die Systeme lesen von hier und rechnen nicht selbst.
 */
export function landmarkEffects(): LandmarkEffects {
  const effects: LandmarkEffects = {
    stabilityHold: false,
    biomass: 1,
    pollutionCap: undefined,
    satietyFloor: 0,
    storage: 0,
  }

  for (const def of LANDMARKS) {
    // Ortsgebundene Bauwerke wirken nur dort, wo sie stehen. Ein Wetterturm
    // auf Aurora hilft nicht auf Kryo — er steht ja auf Aurora.
    if (def.scope === 'planet') {
      if (planet.id !== def.planet) continue
      if (planet.landmarkStage < def.stages.length) continue
    } else if (!fertigImDurchlauf(def)) {
      continue
    }

    const e = def.effect
    switch (e.kind) {
      case 'stabilityHold':
        effects.stabilityHold = true
        break
      case 'biomass':
        effects.biomass *= e.factor
        break
      case 'pollutionCap':
        effects.pollutionCap =
          effects.pollutionCap === undefined ? e.percent : Math.min(effects.pollutionCap, e.percent)
        break
      case 'satietyFloor':
        effects.satietyFloor = Math.max(effects.satietyFloor, e.floor)
        break
      case 'storage':
        effects.storage += e.amount
        break
    }
  }

  return effects
}

/** Für die Oberfläche: wie weit das Bauwerk dieses Planeten ist, 0…1. */
export function landmarkProgress(): number {
  const def = landmarkHere()
  if (!def) return 0
  return Math.min(1, planet.landmarkStage / def.stages.length)
}

/** Gesamtkosten einer Etappe als Decimal-Paare — für die Anzeige. */
export function stageCostEntries(stage: LandmarkStage): [string, Decimal][] {
  return Object.entries(stage.cost).map(([id, menge]) => [id, new Decimal(menge)])
}
