import Decimal from 'break_infinity.js'
import { GENERATORS } from '../data/generators'
import { currentPlanetDef, generatorCount, planet } from '../state/planet.svelte'
import { addLog } from '../state/log.svelte'
import { meta } from '../state/meta.svelte'
import { effectiveO2Window, o2Percent } from './atmosphere'
import { eventEffects } from './eventEffects'
import { enforceJobLimit } from './jobs'
import { enforceStaffLimit } from './labor'
import { metaEffects } from './metaEffects'
import { currentO2Rate } from './production'
import { achievementEffects } from './achievements'
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

/*
 * Der Pro-Kopf-Verbrauch steht seit §17 am Planeten, nicht mehr hier: Aurora
 * rechnet mit einem Dutzend Leuten, Vesta bis Nimbus noch mit Zehntausenden.
 * Ein gemeinsamer Wert kann nicht beides sein.
 */

/**
 * Wie schnell sich die Sättigung an die Versorgungslage angleicht (§17).
 *
 * Träge gewählt: eine Sekunde ohne Wasser darf nicht die ganze Kolonie
 * lahmlegen. So wird aus einem kurzen Engpass eine Warnung statt einer
 * Katastrophe — und aus einem langen ein echter Stillstand.
 */
const SATIETY_ADJUST = 0.05

/**
 * Wohnraum aus Kuppeln.
 *
 * Bewusst *ohne* die Produktions-Multiplikatoren: eine Kuppel fasst so viele
 * Menschen, wie sie fasst. Arbeitskraft, Ereignisse oder gar die
 * Brand-Drosselung dürften daran nichts ändern — sonst würden bei einem Brand
 * schlagartig Betten verschwinden.
 */
export function housingCapacity(): Decimal {
  let beds = currentPlanetDef().baseHousing
  for (const def of GENERATORS) {
    if (def.output.kind === 'housing') beds += generatorCount(def.id) * def.baseRate
  }
  return new Decimal(beds)
    .mul(researchEffects().popCapacity)
    .mul(metaEffects().popCapacity)
    .mul(achievementEffects().popCapacity)
}

/**
 * Wie viele Menschen der Planet im aktuellen Zustand trägt.
 *
 * Zwei Grenzen, die kleinere gewinnt: was die Atmosphäre hergibt und wofür
 * Betten dastehen. Ohne Wohnkuppeln landet niemand — Menschen tauchen seit
 * M5 nicht mehr allein wegen guter Luft auf (§16).
 */
export function populationCapacity(): Decimal {
  const def = currentPlanetDef()
  const factor =
    metaEffects().popCapacity * researchEffects().popCapacity * achievementEffects().popCapacity
  /*
   * Wohnraum entscheidet, nicht die Außenluft (§17).
   *
   * Bis M9 skalierte die Bewohnbarkeit die Kapazität — auf Aurora mit 0 % O₂
   * war sie damit null, und die zehn mitgebrachten Leute wären in der ersten
   * Minute weggestorben. Das ist auch fiktional falsch: eine Marskolonie lebt
   * in versiegelten Kapseln, nicht von der Luft draußen. Die Atmosphäre
   * bestimmt jetzt, wie gut es sich *vermehrt*, nicht ob man überlebt.
   */
  const byPlanet = new Decimal(def.popCapacity).mul(factor)
  return Decimal.min(byPlanet, housingCapacity())
}

/** Nahrung pro Sekunde, die verbraucht wird. */
export function foodConsumption(): Decimal {
  return planet.settlers.mul(currentPlanetDef().foodPerCapita)
}

export function waterConsumption(): Decimal {
  return planet.settlers.mul(currentPlanetDef().waterPerCapita)
}

/** Fehlt gerade etwas zum Leben? */
export function isStarving(): boolean {
  if (planet.settlers.lte(0)) return false
  return (
    (planet.food.lte(0) && foodConsumption().gt(0)) ||
    (planet.water.lte(0) && waterConsumption().gt(0))
  )
}

/** O₂ pro Sekunde, das die Siedler wegatmen. */
export function o2ConsumptionRate(): Decimal {
  const perCapita =
    currentPlanetDef().o2PerCapita *
    metaEffects().lifeSupport *
    researchEffects().lifeSupport *
    eventEffects().consumption
  return planet.settlers.mul(perCapita)
}

/** Forschung pro Sekunde. */
export function researchRate(): Decimal {
  return planet.settlers
    .mul(RESEARCH_PER_SETTLER)
    .mul(researchEffects().researchYield)
    .mul(achievementEffects().researchYield)
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
let wasStarving = false

/** Beim Planetenwechsel und beim Laden zurücksetzen. */
export function resetPopulationNotices(): void {
  hasLandedLogged = planet.settlers.gt(0)
  wasNegative = false
  wasStarving = isStarving()
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

  /* --- Versorgung und Sättigung (§17) --------------------------------------
     Niemand verhungert. Fehlende Versorgung senkt die *Arbeitsleistung*, und
     zwar träge: aus einem kurzen Engpass wird eine Warnung, aus einem langen
     ein Stillstand. Der Vorteil gegenüber einer Hungertod-Mechanik ist nicht
     nur Milde — es macht Abwesenheit von selbst ungefährlich (§1.3), ohne
     dafür eine Sonderregel für den Offline-Nachlauf zu brauchen.
  ---------------------------------------------------------------------- */
  if (planet.settlers.gt(0)) {
    const essenBedarf = foodConsumption().mul(dt)
    const wasserBedarf = waterConsumption().mul(dt)

    const essenDa = Decimal.min(planet.food, essenBedarf)
    const wasserDa = Decimal.min(planet.water, wasserBedarf)
    planet.food = planet.food.sub(essenDa)
    planet.water = planet.water.sub(wasserDa)
    if (planet.food.lt(0)) planet.food = new Decimal(0)
    if (planet.water.lt(0)) planet.water = new Decimal(0)

    // Der knappere der beiden Posten bestimmt die Lage — satt wird man nicht
    // von Wasser allein.
    const essenAnteil = essenBedarf.lte(0) ? 1 : essenDa.div(essenBedarf).toNumber()
    const wasserAnteil = wasserBedarf.lte(0) ? 1 : wasserDa.div(wasserBedarf).toNumber()
    const gedeckt = Math.min(essenAnteil, wasserAnteil)

    planet.satiety += (gedeckt - planet.satiety) * SATIETY_ADJUST * dt
    planet.satiety = Math.min(1, Math.max(0, planet.satiety))
  }

  const knapp = planet.satiety < 0.6
  if (knapp && !wasStarving) {
    addLog('Die Vorräte reichen nicht. Die Arbeit wird langsamer.', 'warn')
    wasStarving = true
  } else if (!knapp && wasStarving) {
    addLog('Die Versorgung steht wieder.', 'good')
    wasStarving = false
  }

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

  /*
   * Logistisches Wachstum, aber nur bei guter Versorgung (§17): Nachwuchs
   * setzt Überschuss voraus, nicht bloß Überleben. Bei knapper Sättigung
   * steht die Kolonie still, statt weiter zu wachsen und alles zu verschärfen.
   */
  const rate =
    BASE_GROWTH *
    def.growthFactor *
    Math.max(0, (planet.satiety - 0.7) / 0.3) *
    // Draußen atembare Luft macht Nachwuchs attraktiver, ist aber keine
    // Bedingung mehr — in der Kapsel lebt es sich auch, nur enger.
    (0.25 + 0.75 * habitability()) *
    metaEffects().growthRate *
    researchEffects().growthRate *
    eventEffects().growth *
    planet.immigration
  const room = new Decimal(1).sub(planet.settlers.div(capacity))
  planet.settlers = planet.settlers.add(planet.settlers.mul(rate).mul(room).mul(dt))

  if (planet.settlers.lt(0)) planet.settlers = new Decimal(0)

  // Schrumpft die Kolonie, dürfen keine Leute an Plätzen stehenbleiben, die
  // es nicht mehr gibt.
  enforceJobLimit()
  enforceStaffLimit()

  const negative = netO2Rate().lt(0)
  if (negative && !wasNegative) {
    addLog('Die Siedler verbrauchen mehr O₂ als produziert wird. Der Wert fällt.', 'warn')
  }
  wasNegative = negative
}
