import Decimal from 'break_infinity.js'
import { SALVAGE, findSalvage, type SalvageTarget } from '../data/salvage'
import { createRng } from '../engine/rng'
import { play } from '../engine/audio'
import { format } from '../engine/format'
import { findMaterial } from '../data/materials'
import { addLog } from '../state/log.svelte'
import { currentPlanetDef, planet } from '../state/planet.svelte'
import { grantFromSalvage } from './blueprints'
import { crewAway, unassigned } from './labor'
import { storeMaterial } from './storage'

/**
 * Bergung (M18, DESIGN.md §20.2).
 *
 * Ein Trupp zieht los, ist eine Weile weg und bringt etwas mit. Drei Sätze
 * aus §20, die dieses Modul umsetzt und die man beim Ändern nicht verlieren
 * darf:
 *
 * **1. Der Preis sind Hände, nicht Zeit.** Wer draußen ist, fehlt an jeder
 * Anlage und auf der Baustelle — die Buchhaltung dafür steht in labor.ts, weil
 * es dort schon eine gibt. Ein Grind, dessen Preis nur Zeit ist, ist
 * Wartezeit; einer, der einen Verzicht kostet, ist eine Entscheidung.
 *
 * **2. Ein Ziel erschöpft sich und erholt sich.** Ohne den Rückweg wäre
 * Bergung eine Liste zum Abhaken, ohne die Erschöpfung ein Automat.
 *
 * **3. Niemand stirbt.** Ein Zwischenfall hält den Trupp länger draußen und
 * halbiert die Beute. Er kostet nie einen Menschen — §1.2 gilt hier so gut
 * wie bei Wellen und Bränden, und `settlersLost` bleibt die Zahl der Anoxen.
 */

/** Wie viel länger ein Trupp nach einem Zwischenfall unterwegs ist. */
const MISHAP_DELAY = 0.5
/** Was von der Beute übrig bleibt, wenn etwas schiefgegangen ist. */
const MISHAP_YIELD = 0.5

/**
 * Der Würfel hängt am Ziel und am wievielten Anlauf — nicht an der Uhr.
 *
 * Damit ist ein Anlauf reproduzierbar: derselbe Spielstand schickt denselben
 * Trupp mit demselben Ausgang los, und ein Reload kann einen Zwischenfall
 * nicht wegladen. Dieselbe Begründung wie bei der Hochrechnung in §19 — ein
 * Zufall, den man neu würfeln kann, ist keiner.
 */
function rngFor(target: SalvageTarget, run: number): ReturnType<typeof createRng> {
  return createRng(`bergung:${planet.id}:${target.id}:${run}`)
}

export function runsOn(id: string): number {
  return planet.salvageRuns[id] ?? 0
}

/** 0…1 — wie leer das Ziel gerade ist. */
export function depletionOf(id: string): number {
  return planet.salvageDepletion[id] ?? 0
}

/** 0…1 — wie ergiebig ein Anlauf gerade wäre. Das Gegenstück zur Erschöpfung. */
export function yieldFactor(id: string): number {
  return 1 - depletionOf(id)
}

export function activeExpedition(id: string) {
  return planet.expeditions.find((e) => e.target === id)
}

/**
 * Welche Ziele auf diesem Planeten überhaupt existieren.
 *
 * Steht hier und nicht in der Komponente — dieselbe Regel wie bei
 * `isRevealed()` und `availableGoods()`: was nur die `.svelte`-Datei kennt,
 * kann keine Prüfung sehen (CLAUDE.md).
 */
export function targetsHere(): SalvageTarget[] {
  return SALVAGE.filter((t) => t.planets.includes(planet.id))
}

/** Und welche davon schon dastehen. */
export function revealedTargets(): SalvageTarget[] {
  return targetsHere().filter((t) => planet.oxygenTotal.gte(t.revealAt))
}

/**
 * Wie riskant ein Anlauf mit diesem Trupp wäre, 0…1.
 *
 * **Ein großer Trupp ist sicherer.** Daraus entsteht die Entscheidung, um die
 * es bei der Truppgröße geht: wenige Leute sind billig und riskant, viele
 * fehlen dafür an den Anlagen. Wo Anoxen sitzen, kommt ihr Druck als
 * Zuschlag dazu — das gibt §7 eine zweite Berührungsfläche, ohne dass ein
 * neues System nötig wäre.
 */
export function riskFor(target: SalvageTarget, crew: number): number {
  const anteil = target.minCrew / Math.max(target.minCrew, crew)
  const anoxen = currentPlanetDef().hasAnoxen ? 1 + (currentPlanetDef().anoxenPressure ?? 0) : 1
  return Math.min(0.9, target.risk * anteil * anoxen)
}

/** Was einem Anlauf im Weg steht — oder `null`. */
export function salvageBlocker(target: SalvageTarget, crew: number): string | null {
  if (!planet.oxygenTotal.gte(target.revealAt)) return 'noch nicht entdeckt'
  if (!target.planets.includes(planet.id)) return 'nicht auf diesem Planeten'
  if (activeExpedition(target.id)) return 'Trupp ist unterwegs'
  if (crew < target.minCrew) return `mindestens ${target.minCrew} Leute`
  if (crew > target.maxCrew) return `höchstens ${target.maxCrew} Leute`
  if (unassigned().lt(crew)) return 'zu wenige freie Bewohner'
  return null
}

export function canSend(target: SalvageTarget, crew: number): boolean {
  return salvageBlocker(target, crew) === null
}

/**
 * Schickt einen Trupp los.
 *
 * Der Ausgang steht hier schon fest und wird erst bei der Rückkehr erzählt —
 * siehe `rngFor`. Die Leute sind ab sofort weg: `unassigned()` zieht sie über
 * `crewAway()` ab, es gibt also keinen zweiten Zähler, der auseinanderlaufen
 * könnte.
 */
export function sendCrew(id: string, crew: number): boolean {
  const target = findSalvage(id)
  if (!target || !canSend(target, crew)) return false

  const rng = rngFor(target, runsOn(id))
  const mishap = rng.chance(riskFor(target, crew))

  planet.expeditions = [
    ...planet.expeditions,
    {
      target: id,
      crew,
      remaining: target.duration,
      total: target.duration,
      mishap,
    },
  ]
  addLog(`${crew} Leute ziehen los: ${target.name}.`)
  play('buy')
  return true
}

/**
 * Bricht einen Anlauf ab — die Leute kommen sofort zurück, ohne Beute.
 *
 * Das Gegenstück, das CLAUDE.md für alles verlangt, was bindet: ohne
 * Rückholung ist ein Trupp bei einer Hungersnot eine Sackgasse, weil genau
 * die Hände fehlen, die die Kolonie wieder hochbringen. Der Anlauf zählt
 * nicht als gelaufen — er hat ja nichts erbracht.
 */
export function recallCrew(id: string): boolean {
  const laufend = activeExpedition(id)
  if (!laufend) return false

  planet.expeditions = planet.expeditions.filter((e) => e.target !== id)
  addLog(`${laufend.crew} Leute abgezogen — ${findSalvage(id)?.name ?? id} bleibt liegen.`, 'warn')
  return true
}

/** Der Satz, den dieser Anlauf herausgibt — oder nichts mehr. */
function fragmentFor(target: SalvageTarget, run: number): string | undefined {
  return target.fragments[run]
}

function resolve(expedition: (typeof planet.expeditions)[number]): void {
  const target = findSalvage(expedition.target)
  if (!target) return

  const run = runsOn(target.id)
  const anteil =
    (expedition.crew / target.maxCrew) * yieldFactor(target.id) * (expedition.mishap ? MISHAP_YIELD : 1)

  const gebracht: string[] = []
  for (const y of target.yields) {
    const menge = new Decimal(y.amount).mul(anteil)
    if (menge.lte(0)) continue
    // storeMaterial() liefert zurück, was nicht mehr ins Lager passt — das
    // verfällt, genau wie beim Abbau. Gemeldet wird trotzdem, was gefunden
    // wurde: „nichts mitgebracht" bei vollem Lager wäre eine Lüge.
    storeMaterial(y.material, menge)
    gebracht.push(`${format(menge)} ${findMaterial(y.material)?.name ?? y.material}`)
  }

  planet.salvageRuns = { ...planet.salvageRuns, [target.id]: run + 1 }
  // Was man findet, kann man nachbauen (M20, §20.1).
  grantFromSalvage(target.id)
  planet.salvageDepletion = {
    ...planet.salvageDepletion,
    // Anteilig vom Rest, nicht absolut: so ist ein Ziel nie ganz leer und
    // der zwölfte Anlauf lohnt noch, nur weniger.
    [target.id]: Math.min(1, depletionOf(target.id) + target.depletion * yieldFactor(target.id)),
  }

  if (expedition.mishap) {
    addLog(
      `${target.name}: der Trupp steckte fest und kommt spät zurück — nur ${gebracht.join(', ')}.`,
      'warn',
    )
  } else {
    addLog(`${target.name}: ${gebracht.join(', ')}.`, 'good')
  }

  // Die Vorgeschichte steht nach dem Ertrag und in einer eigenen Zeile: sie
  // ist der Grund, ein Ziel ein sechstes Mal anzulaufen, und geht in einer
  // Materialaufzählung unter.
  const satz = fragmentFor(target, run)
  if (satz) addLog(satz)

  play('achievement')
}

/**
 * Registriertes System (Regel 1) — läuft damit auch offline mit.
 *
 * Das ist hier keine Formalie: ein Trupp, der nur bei offenem Tab
 * zurückkommt, wäre der einzige Teil des Spiels, für den Weggehen bestraft
 * wird. Der Nachlauf löst mehrere Anläufe hintereinander auf, weil er dieselbe
 * Funktion n-mal aufruft.
 */
export function salvageSystem(dt: number): void {
  // Erholung läuft immer, auch ohne Trupp draußen — sonst wartet man mit
  // leerem Ziel darauf, dass etwas passiert, das niemand auslöst.
  if (Object.keys(planet.salvageDepletion).length > 0) {
    const next: Record<string, number> = {}
    let geaendert = false
    for (const [id, wert] of Object.entries(planet.salvageDepletion)) {
      const target = findSalvage(id)
      const erholt = target ? Math.max(0, wert - target.recovery * dt) : 0
      if (erholt > 0) next[id] = erholt
      if (erholt !== wert) geaendert = true
    }
    if (geaendert) planet.salvageDepletion = next
  }

  if (planet.expeditions.length === 0) return

  const fertig: (typeof planet.expeditions)[number][] = []
  const laufend: (typeof planet.expeditions)[number][] = []

  for (const e of planet.expeditions) {
    const rest = e.remaining - dt
    if (rest > 0) {
      laufend.push({ ...e, remaining: rest })
      continue
    }

    /*
     * Der Zwischenfall schlägt erst **hier** zu, nicht beim Losschicken.
     *
     * Stünde die längere Dauer von Anfang an im Balken, könnte man am Timer
     * ablesen, dass etwas schiefgehen wird — der Würfel wäre sichtbar, bevor
     * er fällt. So ist der Trupp stattdessen überfällig, und das ist der
     * Moment, den man mitbekommen soll.
     */
    const target = findSalvage(e.target)
    if (target && e.mishap && e.total <= target.duration) {
      laufend.push({
        ...e,
        remaining: target.duration * MISHAP_DELAY,
        total: target.duration * (1 + MISHAP_DELAY),
      })
      addLog(`${target.name}: der Trupp ist überfällig.`, 'warn')
      continue
    }

    fertig.push(e)
  }

  planet.expeditions = laufend
  for (const e of fertig) resolve(e)
}

/** Für die UI: sind gerade Leute unterwegs? */
export function anyoneOut(): boolean {
  return crewAway() > 0
}
