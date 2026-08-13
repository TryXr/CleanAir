import Decimal from 'break_infinity.js'
import { currentPlanetDef, planet } from '../state/planet.svelte'
import { addLog } from '../state/log.svelte'
import { meta } from '../state/meta.svelte'
import { effectiveO2Window, o2Percent } from './atmosphere'
import { eventEffects } from './eventEffects'
import { metaEffects } from './metaEffects'
import { currentO2Rate } from './production'
import { researchEffects } from './research'

/**
 * Bevölkerung (DESIGN.md §5).
 *
 * Die zentrale Spannung des Spiels: Menschen sind ein Produktionsbonus und
 * ein O₂-Verbraucher zugleich. Sie zehren an der Luft (`airO2`), nicht am
 * Vorrat — wer zu schnell wachsen lässt, sieht den Atmosphärenwert fallen,
 * behält aber sein Kaufguthaben.
 *
 * Seit M3 ist der Zuwanderungsregler damit auch ein Atmosphärenwerkzeug:
 * steht das O₂ über dem Fenster, sind mehr atmende Menschen die schnellste
 * Art, es wieder herunterzubekommen.
 */

/**
 * O₂ pro Sekunde und Kopf, vor Lebenserhaltung.
 *
 * Der Wert wirkt hoch, ist aber der Angelpunkt des ganzen Systems: der
 * Arbeitskraft-Bonus wächst mit √Bevölkerung, der Verbrauch linear. Daraus
 * entsteht von selbst ein Kipppunkt — bis dahin zahlen sich Menschen aus,
 * danach kosten sie mehr, als sie bringen. Genau die Entscheidung aus §5.
 * Zu klein gewählt (der erste Entwurf lag bei 0.0022) verbraucht die
 * Bevölkerung 0,09 % der Produktion und die Spannung existiert nur auf dem
 * Papier.
 */
const O2_PER_CAPITA = 1.2

/** Logistische Wachstumsrate pro Sekunde bei voller Zuwanderung. */
const BASE_GROWTH = 0.025

/** Die erste Landefähre. Ohne Startwert käme logistisches Wachstum nie los. */
const SEED_SETTLERS = 25

/** Biomasse pro Siedler und Sekunde — speist die Genesis-Kerne (§6). */
const BIOMASS_PER_SETTLER = 0.04

/**
 * Forschungspunkte pro Siedler und Sekunde (§5, §10).
 *
 * Bewusst nur aus den Siedlern des *aktuellen* Planeten: die abgeschlossenen
 * Kolonien liefern laut §6 Credits und Wachstum, nicht Forschung. Ihr
 * passives Einkommen ist Sache von M5.
 */
const RESEARCH_PER_SETTLER = 0.0009

/**
 * 0…1 — wie gut der Planet gerade zu bewohnen ist. Unterhalb von `settleAt`
 * bleibt er leer, an der Untergrenze des O₂-Fensters ist er voll bewohnbar.
 */
export function habitability(): number {
  const def = currentPlanetDef()
  if (!def.allowsPopulation) return 0

  const span = effectiveO2Window().min - def.settleAt
  if (span <= 0) return o2Percent() >= def.settleAt ? 1 : 0

  const raw = (o2Percent() - def.settleAt) / span
  return Math.min(1, Math.max(0, raw))
}

/** Wie viele Menschen der Planet im aktuellen Zustand trägt. */
export function populationCapacity(): Decimal {
  const def = currentPlanetDef()
  const factor = metaEffects().popCapacity * researchEffects().popCapacity
  return new Decimal(def.popCapacity).mul(habitability()).mul(factor)
}

/** O₂ pro Sekunde, das die Siedler wegatmen. */
export function o2ConsumptionRate(): Decimal {
  const perCapita =
    O2_PER_CAPITA *
    metaEffects().lifeSupport *
    researchEffects().lifeSupport *
    eventEffects().consumption
  return planet.settlers.mul(perCapita)
}

/** Forschung pro Sekunde. */
export function researchRate(): Decimal {
  return planet.settlers.mul(RESEARCH_PER_SETTLER).mul(researchEffects().researchYield)
}

/** Was netto in der Luft ankommt. Negativ heißt: die Atmosphäre schrumpft. */
export function netO2Rate(): Decimal {
  return currentO2Rate().sub(o2ConsumptionRate())
}

/** Nur für die Anzeige: läuft die Atmosphäre gerade rückwärts? */
export function isSuffocating(): boolean {
  return planet.settlers.gt(0) && netO2Rate().lt(0)
}

/** Log-Zustände, damit Meldungen nicht 20-mal pro Sekunde erscheinen. */
let hasLandedLogged = false
let wasNegative = false

/** Beim Planetenwechsel und beim Laden zurücksetzen. */
export function resetPopulationNotices(): void {
  hasLandedLogged = planet.settlers.gt(0)
  wasNegative = false
}

export function populationSystem(dt: number): void {
  const def = currentPlanetDef()

  // Verbrauch zuerst: er gilt auch, wenn gerade niemand nachwächst.
  if (planet.settlers.gt(0)) {
    const consumed = o2ConsumptionRate().mul(dt)
    planet.airO2 = planet.airO2.sub(consumed)
    if (planet.airO2.lt(0)) planet.airO2 = new Decimal(0)

    planet.biomass = planet.biomass.add(planet.settlers.mul(BIOMASS_PER_SETTLER).mul(dt))
    meta.research = meta.research.add(researchRate().mul(dt))
  }

  if (!def.allowsPopulation) return

  const capacity = populationCapacity()

  if (capacity.lte(0)) {
    // Unbewohnbar geworden — die Siedlung leert sich, statt schlagartig zu sterben.
    if (planet.settlers.gt(0)) {
      planet.settlers = planet.settlers.mul(Math.max(0, 1 - BASE_GROWTH * dt))
      if (planet.settlers.lt(1)) planet.settlers = new Decimal(0)
    }
    return
  }

  // Erstlandung
  if (planet.settlers.lte(0)) {
    if (planet.immigration <= 0) return
    planet.settlers = new Decimal(Math.min(SEED_SETTLERS, capacity.toNumber()))
    if (!hasLandedLogged) {
      addLog(`Die erste Landefähre setzt auf ${def.name} auf.`, 'good')
      hasLandedLogged = true
    }
    return
  }

  // Logistisches Wachstum. Über der Kapazität wird der Term negativ und die
  // Bevölkerung schrumpft von selbst — kein Sonderfall nötig.
  const rate =
    BASE_GROWTH *
    metaEffects().growthRate *
    researchEffects().growthRate *
    eventEffects().growth *
    planet.immigration
  const room = new Decimal(1).sub(planet.settlers.div(capacity))
  planet.settlers = planet.settlers.add(planet.settlers.mul(rate).mul(room).mul(dt))

  if (planet.settlers.lt(0)) planet.settlers = new Decimal(0)

  const negative = netO2Rate().lt(0)
  if (negative && !wasNegative) {
    addLog('Die Siedler verbrauchen mehr O₂ als produziert wird. Der Wert fällt.', 'warn')
  }
  wasNegative = negative
}
