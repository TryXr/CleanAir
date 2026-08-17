import Decimal from 'break_infinity.js'
import type { Window } from '../data/planets'
import { play } from '../engine/audio'
import { addLog } from '../state/log.svelte'
import { meta } from '../state/meta.svelte'
import { currentPlanetDef, planet } from '../state/planet.svelte'
import { landmarkEffects } from './landmarks'
import { researchEffects } from './research'

/**
 * Atmosphäre als Mischung (DESIGN.md §4).
 *
 * Der Kern von M3: die Luft ist kein Fortschrittsbalken mehr, sondern ein
 * Verhältnis. Jeder Anteil ergibt sich aus derselben Formel
 *
 *   anteil(gas) = 100 × menge(gas) / (nativesInertgas + O₂ + N₂ + Schadstoffe)
 *
 * und daraus folgt das ganze Spiel dieses Meilensteins von selbst: mehr O₂
 * hebt O₂ und senkt N₂, mehr N₂ verdünnt das O₂ wieder, Schadstoffe drücken
 * beide. Man trifft ein Fenster, keinen Schwellenwert — und muss es halten.
 *
 * Die Anteile hängen an der *Luft*, nicht am Vorrat. Generatorkäufe rühren
 * sie nicht an (sonst liefe Fortschritt rückwärts, CLAUDE.md §6), Atmung
 * und Brände dagegen schon.
 */

/* --- Brände ---------------------------------------------------------------
   Die offene Frage aus DESIGN.md §15 ist hier entschieden: Brände sind eine
   temporäre Drosselung plus Abbrand, *kein* Gebäudeverlust. Permanenter
   Verlust widerspricht Leitlinie §1.2, und in einem Incremental-Spiel ist
   der Verlust gekaufter Anlagen der zuverlässigste Weg, jemanden zum
   Aufhören zu bringen.

   Der Abbrand macht das Ganze selbstregelnd: je weiter über dem Fenster,
   desto mehr O₂ verschwindet. Der Anteil kann dadurch kaum davonlaufen —
   er bleibt knapp über der Grenze stehen, und der Spieler muss ihn mit
   N₂ von oben zurück ins Fenster drücken.
-------------------------------------------------------------------------- */

/** Prozentpunkte über dem Fenster bis zur vollen Brandstärke. */
const FIRE_SPAN = 8
/** Anteil des Luft-O₂, der bei voller Stärke pro Sekunde verbrennt. */
const FIRE_BURN = 0.02
/** Wie viel des verbrannten O₂ als Schadstoff zurückbleibt. */
const FIRE_POLLUTION = 0.15
/** Produktionsverlust bei voller Brandstärke. */
const FIRE_THROTTLE = 0.5
/** Ab dieser Stärke wird ein Brand gemeldet — darunter ist es ein Glimmen. */
const FIRE_NOTICE = 0.02

// --- Mischung -------------------------------------------------------------

/** Alles, was in der Luft steht, inklusive des nativen Inertgases. */
export function totalAtmosphere(): Decimal {
  return planet.airO2
    .add(planet.airN2)
    .add(planet.pollution)
    .add(currentPlanetDef().baseAtmosphere)
}

function share(amount: Decimal): number {
  const total = totalAtmosphere()
  if (total.lte(0)) return 0
  return amount.div(total).mul(100).toNumber()
}

export function o2Percent(): number {
  return share(planet.airO2)
}

export function n2Percent(): number {
  return share(planet.airN2)
}

export function pollutionPercent(): number {
  return share(planet.pollution)
}

/** Das native Restgas. Es verschwindet nie, es wird nur verdünnt. */
export function inertPercent(): number {
  return share(new Decimal(currentPlanetDef().baseAtmosphere))
}

/**
 * Das O₂-Fenster, wie es aktuell gilt. „Klimamodelle" aus dem Forschungsbaum
 * verbreitern es nach beiden Seiten — die einzige Stelle, an der eine
 * Zielvorgabe des Planeten überhaupt beweglich ist.
 */
export function effectiveO2Window(): Window {
  const base = currentPlanetDef().o2Window
  const widen = researchEffects().o2Widen
  return { min: Math.max(0, base.min - widen), max: base.max + widen }
}

/** Wie viel Luft-O₂ nötig wäre, damit der Anteil bei `percent` läge. */
export function airNeededFor(percent: number): Decimal {
  if (percent >= 100) return new Decimal(Infinity)
  // Die übrigen Gase bleiben stehen: o2 = p × rest / (100 − p).
  const rest = totalAtmosphere().sub(planet.airO2)
  return rest.mul(percent).div(100 - percent)
}

/** Noch fehlendes O₂ bis zur Untergrenze des Fensters. */
export function remainingToTarget(): Decimal {
  const needed = airNeededFor(effectiveO2Window().min).sub(planet.airO2)
  return needed.lt(0) ? new Decimal(0) : needed
}

/** 0…1 — Fortschritt bis zur Untergrenze, für die Balkenanzeige. */
export function targetProgress(): number {
  const min = effectiveO2Window().min
  return min <= 0 ? 1 : Math.min(1, o2Percent() / min)
}

// --- Fenster --------------------------------------------------------------

export interface WindowStatus {
  key: 'o2' | 'n2' | 'pollution'
  label: string
  value: number
  min: number
  max: number
  /** Obergrenze der Anzeigeskala — ein Fenster von 19–23 auf 0–100 wäre ein Strich. */
  scaleMax: number
  ok: boolean
}

/**
 * Alle Werte, die dieser Planet führt, mit ihrem Zielfenster. Aurora liefert
 * genau einen Eintrag — das reine O₂-Tutorial bleibt reines O₂.
 */
export function atmosphereStatus(): WindowStatus[] {
  const def = currentPlanetDef()
  const list: WindowStatus[] = []

  const o2 = effectiveO2Window()
  list.push({
    key: 'o2',
    label: 'O₂',
    value: o2Percent(),
    min: o2.min,
    max: o2.max,
    scaleMax: o2.max >= 100 ? 30 : Math.min(100, o2.max * 1.4),
    ok: o2Percent() >= o2.min && o2Percent() <= o2.max,
  })

  if (def.n2Window) {
    const value = n2Percent()
    list.push({
      key: 'n2',
      label: 'N₂',
      value,
      min: def.n2Window.min,
      max: def.n2Window.max,
      scaleMax: 100,
      ok: value >= def.n2Window.min && value <= def.n2Window.max,
    })
  }

  if (def.maxPollution !== undefined) {
    const value = pollutionPercent()
    list.push({
      key: 'pollution',
      label: 'Schadstoffe',
      value,
      min: 0,
      max: def.maxPollution,
      scaleMax: def.maxPollution * 2,
      ok: value <= def.maxPollution,
    })
  }

  return list
}

/** Stehen alle Werte im Fenster? */
export function inWindow(): boolean {
  return atmosphereStatus().every((s) => s.ok)
}

// --- Stabilität -----------------------------------------------------------

/** Sekunden, die der Planet noch gehalten werden muss. */
export function stabilityRequired(): number {
  return currentPlanetDef().stabilitySeconds
}

/** 0…1 — der sichtbar mitlaufende Timer aus §4. */
export function stabilityProgress(): number {
  const required = stabilityRequired()
  if (required <= 0) return 1
  return Math.min(1, planet.stability / required)
}

// --- Brände ---------------------------------------------------------------

/** 0…1 — wie stark es gerade brennt. 0 heißt: alles ruhig. */
export function fireIntensity(): number {
  const excess = o2Percent() - effectiveO2Window().max
  if (excess <= 0) return 0
  return Math.min(1, excess / FIRE_SPAN)
}

/** Faktor auf die Produktion, den production.ts einsammelt. */
export function fireThrottle(): number {
  return 1 - FIRE_THROTTLE * fireIntensity()
}

// --- Tick -----------------------------------------------------------------

/** Log-Zustände, damit Meldungen nicht 20-mal pro Sekunde erscheinen. */
let wasBurning = false
let wasStable = false
/** Meldet den angehaltenen Timer genau einmal statt in jedem Tick. */
let wasHolding = false

/** Beim Planetenwechsel und beim Laden zurücksetzen. */
export function resetAtmosphereNotices(): void {
  wasBurning = fireIntensity() > FIRE_NOTICE
  wasStable = inWindow()
}

export function atmosphereSystem(dt: number): void {
  const def = currentPlanetDef()

  // 1. Brand: verbrennt Luft-O₂ und hinterlässt Schadstoffe. Die Schadstoffe
  //    aus der laufenden Produktion entstehen dagegen in production.ts —
  //    dort, wo die Rate ohnehin bekannt ist.
  const intensity = fireIntensity()
  if (intensity > 0) {
    const burnt = planet.airO2.mul(FIRE_BURN * intensity * dt)
    planet.airO2 = planet.airO2.sub(burnt)
    if (planet.airO2.lt(0)) planet.airO2 = new Decimal(0)
    if (def.maxPollution !== undefined) {
      planet.pollution = planet.pollution.add(burnt.mul(FIRE_POLLUTION))
    }
  }

  /*
   * Der Aschefang (M19, §20.3): eine Obergrenze für den Schadstoffanteil.
   *
   * Gekappt wird die **Menge**, nicht der Anteil — Regel 7 aus CLAUDE.md gilt
   * auch hier: nie einen Anteil direkt setzen. Aus dem Zielprozentsatz p
   * folgt die zulässige Menge als `p × rest / (100 − p)`, also genau die
   * Umkehrung, die `airNeededFor()` für O₂ macht.
   *
   * Es ist eine Decke und keine Reinigung: der Wäscher bleibt nötig, der
   * Dreck geht davon nicht weg. Er läuft nur nicht mehr davon.
   */
  const cap = landmarkEffects().pollutionCap
  if (cap !== undefined && def.maxPollution !== undefined && pollutionPercent() > cap) {
    const rest = totalAtmosphere().sub(planet.pollution)
    planet.pollution = rest.mul(cap).div(100 - cap)
  }

  const burning = intensity > FIRE_NOTICE
  if (burning && !wasBurning) {
    meta.stats.fires += 1
    play('fire')
    addLog(
      'Der O₂-Anteil liegt über dem Fenster — es brennt. Mehr N₂ verdünnt die Luft und erstickt die Brände.',
      'bad',
    )
  } else if (!burning && wasBurning) {
    addLog('Die Brände sind erstickt.', 'good')
  }
  wasBurning = burning

  // 3. Stabilitäts-Timer. Er läuft nur, solange *alle* Werte stehen, und
  //    fällt sonst auf null zurück — das ist die eigentliche Prüfung (§4).
  const stable = inWindow()
  if (stable) {
    planet.stability += dt * researchEffects().stabilitySpeed
  } else if (landmarkEffects().stabilityHold) {
    /*
     * Der Wetterturm (M19, §20.3): der Timer **pausiert**, statt zu fallen.
     *
     * Das ist die Sorte Wirkung, die ein Bauwerk haben darf — sie nimmt ein
     * Risiko weg und erhöht keine Rate. Der Planet wird dadurch nicht
     * schneller fertig; er wird nur nicht mehr für einen Ausrutscher um
     * sechs Minuten zurückgeworfen.
     */
    if (planet.stability > 0 && !planet.completed && !wasHolding) {
      addLog('Ein Wert steht außerhalb des Fensters. Der Wetterturm hält den Timer an.', 'warn')
    }
  } else {
    if (planet.stability > 0 && !planet.completed) {
      addLog('Ein Wert hat das Fenster verlassen. Der Stabilitäts-Timer beginnt von vorn.', 'warn')
    }
    planet.stability = 0
  }
  wasHolding = !stable && landmarkEffects().stabilityHold

  if (stable && !wasStable && !planet.completed) {
    addLog(`Alle Werte im Fenster. ${stabilityRequired()} Sekunden halten.`, 'good')
  }
  wasStable = stable

  if (planet.completed) return
  if (planet.stability < stabilityRequired()) return

  // Rastet ein: ein späterer Einbruch nimmt den Abschluss nicht wieder weg.
  // Rückschläge sind temporär, nie permanent (§1.2).
  planet.completed = true
  play('complete')
  const best = meta.stats.bestPlanetSeconds
  if (best === 0 || planet.elapsed < best) meta.stats.bestPlanetSeconds = planet.elapsed
  addLog(
    `${def.name} ist stabil. Die Atmosphäre hält sich selbst — der Sprung zum nächsten Planeten steht offen.`,
    'good',
  )
}
