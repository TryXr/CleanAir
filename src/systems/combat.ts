import Decimal from 'break_infinity.js'
import { ABILITIES, findAbility } from '../data/abilities'
import { DEFENSES, REPAIR_BASE, REPAIR_PER_DEPOT, findDefense } from '../data/defenses'
import { ENEMIES, type EnemyKind } from '../data/enemies'
import { GENERATORS } from '../data/generators'
import { play } from '../engine/audio'
import { isCatchUp } from '../engine/loop'
import { addLog } from '../state/log.svelte'
import { meta } from '../state/meta.svelte'
import { currentPlanetDef, generatorCount, planet } from '../state/planet.svelte'
import { canAffordMaterials, spendMaterials } from '../state/run.svelte'
import { effectiveO2Window, o2Percent } from './atmosphere'
import { achievementEffects } from './achievements'
import { unassigned } from './labor'

/**
 * Die Anoxen (DESIGN.md §7, §8).
 *
 * Belagerung in Wellen, kein Echtzeit-Micromanagement. Zwischen den Wellen
 * wird gebaut — das ist der eigentliche Spielanteil —, die Welle selbst läuft
 * automatisch ab und lässt drei Knöpfe zu.
 *
 * Zwei Entscheidungen prägen das ganze System:
 *
 * **Wellen hängen am Fortschritt, nicht an der Uhr.** §15 lässt das offen,
 * §7 beantwortet es aber schon: „Der Fortschritt erzeugt die Bedrohung. Keine
 * künstlichen Trigger nötig." Das ist zugleich das idle-freundlichere: wer
 * weggeht, während nichts wächst, kommt nicht in eine Wand aus Wellen.
 *
 * **Anlagen werden lahmgelegt, nicht zerstört.** §8 spricht von zerstörten
 * Gebäuden, §1.2 nennt Angriffe ausdrücklich als *temporären* Rückschlag.
 * §1.2 gewinnt — aus demselben Grund, aus dem Brände in M3 nur drosseln:
 * verlorene Käufe sind der zuverlässigste Weg, jemanden zum Aufhören zu
 * bringen.
 */

/** Bedrohung, ab der eine Welle losbricht. */
const WAVE_AT = 100

/**
 * Wie schnell sich Bedrohung aufbaut, bei voll erreichtem O₂-Fenster und
 * Druckfaktor 1. Simuliert, nicht geraten — siehe Commit zu M8.
 */
const THREAT_RATE = 0.42

/** Sekunden, die eine Welle über dem Planeten steht. */
const WAVE_DURATION = 75

/** Kampfkraft der ersten Welle. Jede weitere wächst geometrisch. */
const BASE_POWER = 260
const POWER_GROWTH = 1.28

// --- Zusammensetzung ------------------------------------------------------

/**
 * Anteile der Einheitentypen in der aktuellen Welle.
 *
 * Panzerformen kommen erst später dazu: die erste Begegnung soll mit Türmen
 * zu gewinnen sein, damit der Spieler den Konter überhaupt kennenlernt,
 * bevor er ihn braucht.
 */
export function waveComposition(waveNumber: number): Record<EnemyKind, number> {
  const gewichte: Record<EnemyKind, number> = {
    schuerfer: 4,
    speier: waveNumber >= 2 ? 3 : 0,
    panzer: waveNumber >= 4 ? 2 + Math.min(4, waveNumber - 4) : 0,
  }
  const summe = Object.values(gewichte).reduce((a, b) => a + b, 0) || 1
  return {
    schuerfer: gewichte.schuerfer / summe,
    speier: gewichte.speier / summe,
    panzer: gewichte.panzer / summe,
  }
}

// --- Verteidigung ---------------------------------------------------------

export function defenseCount(id: string): number {
  return planet.defenses[id] ?? 0
}

export function defenseCost(id: string): Decimal {
  const def = findDefense(id)
  if (!def) return new Decimal(0)
  return new Decimal(def.baseCost).mul(Decimal.pow(def.costGrowth, defenseCount(id)))
}

export function canBuildDefense(id: string): boolean {
  const def = findDefense(id)
  if (!def) return false
  if (planet.oxygen.lt(defenseCost(id))) return false
  if (!canAffordMaterials(def.materialCost)) return false
  return (def.populationCost ?? 0) <= unassigned().toNumber()
}

export function buildDefense(id: string): boolean {
  const def = findDefense(id)
  if (!def || !canBuildDefense(id)) return false

  planet.oxygen = planet.oxygen.sub(defenseCost(id))
  spendMaterials(def.materialCost)
  if (def.populationCost) planet.bound = planet.bound.add(def.populationCost)
  planet.defenses = { ...planet.defenses, [id]: defenseCount(id) + 1 }
  return true
}

/**
 * Schaden pro Sekunde gegen die aktuelle Zusammensetzung.
 *
 * Hier zahlt sich die Konter-Matrix aus: gegen eine Welle aus Panzerformen
 * richten zwanzig Türme fast nichts aus, drei Emitter dagegen viel. Ohne das
 * wäre „mehr vom Billigsten" immer richtig.
 */
export function defensePower(waveNumber = planet.waveNumber): Decimal {
  const anteile = waveComposition(waveNumber)
  let total = new Decimal(0)
  for (const def of DEFENSES) {
    const count = defenseCount(def.id)
    if (count === 0 || def.damage === 0) continue
    let wirkung = 0
    for (const enemy of ENEMIES) wirkung += anteile[enemy.id] * def.effectiveness[enemy.id]
    total = total.add(new Decimal(def.damage).mul(count).mul(wirkung))
  }
  return total.mul(achievementEffects().defenseDamage)
}

// --- Fähigkeiten ----------------------------------------------------------

export function abilityCooldown(id: string): number {
  return planet.cooldowns[id] ?? 0
}

export function canUseAbility(id: string): boolean {
  if (planet.wavePower <= 0) return false
  if (abilityCooldown(id) > 0) return false
  const def = findAbility(id)
  if (!def) return false
  if (def.effect.kind === 'evacuate' && planet.evacuated) return false
  return true
}

export function useAbility(id: string): boolean {
  const def = findAbility(id)
  if (!def || !canUseAbility(id)) return false

  const e = def.effect
  switch (e.kind) {
    case 'shield':
      planet.shieldRemaining = e.duration
      addLog('Notfall-Schild steht. Der Schaden ist halbiert.', 'good')
      break
    case 'salvo': {
      // Der Preis ist Atmosphäre — genau die Ressource, um die es geht.
      const kosten = planet.airO2.mul(e.airCost)
      planet.airO2 = planet.airO2.sub(kosten)
      if (planet.airO2.lt(0)) planet.airO2 = new Decimal(0)
      planet.wavePower = Math.max(0, planet.wavePower - e.damage)
      addLog('O₂-Salve. Die Welle bricht ein — und ein Stück Atmosphäre mit ihr.', 'good')
      break
    }
    case 'evacuate': {
      planet.evacuated = true
      disableShare(e.disableShare)
      addLog('Die Siedlung ist unter Tage. Die Anlagen stehen still.', 'warn')
      break
    }
  }

  planet.cooldowns = { ...planet.cooldowns, [id]: def.cooldown }
  meta.stats.abilitiesUsed += 1
  play('ability')
  return true
}

// --- Schaden --------------------------------------------------------------

/** Legt einen Anteil aller laufenden Anlagen still. */
function disableShare(share: number): void {
  const next = { ...planet.disabled }
  for (const def of GENERATORS) {
    const laufend = generatorCount(def.id) - (next[def.id] ?? 0)
    if (laufend <= 0) continue
    next[def.id] = (next[def.id] ?? 0) + Math.ceil(laufend * share)
  }
  planet.disabled = next
}

/** Legt eine absolute Zahl an Anlagen still, gleichmäßig über die Typen. */
function disableUnits(units: number): void {
  if (units <= 0) return
  const kandidaten = GENERATORS.filter(
    (d) => generatorCount(d.id) - (planet.disabled[d.id] ?? 0) > 0,
  )
  if (kandidaten.length === 0) return

  const next = { ...planet.disabled }
  const proTyp = units / kandidaten.length
  for (const def of kandidaten) {
    const laufend = generatorCount(def.id) - (next[def.id] ?? 0)
    next[def.id] = (next[def.id] ?? 0) + Math.min(laufend, proTyp)
  }
  planet.disabled = next
}

/** Wie viele Stück eines Typs gerade wirklich laufen. */
export function activeCount(id: string): number {
  return Math.max(0, generatorCount(id) - (planet.disabled[id] ?? 0))
}

/** Anteil aller Anlagen, der stillsteht — für die Anzeige. */
export function disabledShare(): number {
  let gesamt = 0
  let aus = 0
  for (const def of GENERATORS) {
    gesamt += generatorCount(def.id)
    aus += planet.disabled[def.id] ?? 0
  }
  return gesamt > 0 ? Math.min(1, aus / gesamt) : 0
}

// --- Tick -----------------------------------------------------------------

function startWave(): void {
  const def = currentPlanetDef()
  planet.waveNumber += 1
  planet.wavePower = BASE_POWER * Math.pow(POWER_GROWTH, planet.waveNumber - 1) * def.anoxenPressure
  planet.waveRemaining = WAVE_DURATION
  planet.evacuated = false
  meta.stats.wavesSeen += 1
  play('wave')
  addLog(
    `Welle ${planet.waveNumber}: die Anoxen steigen aus dem Boden. Dein Sauerstoff ist ihr Gift — und sie wissen, woher er kommt.`,
    'bad',
  )
}

function endWave(repelled: boolean): void {
  planet.wavePower = 0
  planet.waveRemaining = 0
  planet.shieldRemaining = 0
  if (repelled) {
    meta.stats.wavesRepelled += 1
    addLog(`Welle ${planet.waveNumber} abgewehrt.`, 'good')
  } else {
    addLog(`Welle ${planet.waveNumber} zieht ab. Was sie angerichtet hat, bleibt vorerst.`, 'warn')
  }
}

export function combatSystem(dt: number): void {
  const def = currentPlanetDef()

  /* --- Reparatur ---------------------------------------------------------
     Läuft immer, auch während einer Welle und auch im Nachlauf. Rückschläge
     sollen von selbst verheilen (§1.2), Depots beschleunigen das nur.
  --------------------------------------------------------------------- */
  const offen = Object.values(planet.disabled).reduce((a, b) => a + b, 0)
  if (offen > 0) {
    const rate = REPAIR_BASE + REPAIR_PER_DEPOT * defenseCount('depot')
    const next: Record<string, number> = {}
    for (const [id, count] of Object.entries(planet.disabled)) {
      const rest = count - Math.max(count * rate, 0.02) * dt
      if (rest > 0.01) next[id] = rest
    }
    planet.disabled = next
  }

  // Abklingzeiten laufen immer weiter.
  if (Object.keys(planet.cooldowns).length > 0) {
    const next: Record<string, number> = {}
    for (const [id, left] of Object.entries(planet.cooldowns)) {
      if (left - dt > 0) next[id] = left - dt
    }
    planet.cooldowns = next
  }
  if (planet.shieldRemaining > 0) planet.shieldRemaining = Math.max(0, planet.shieldRemaining - dt)

  if (!def.hasAnoxen) return

  /* --- Bedrohung ---------------------------------------------------------
     Sie wächst mit dem erreichten O₂-Anteil: je weiter das Terraforming, desto
     aggressiver. Bei 0 % passiert nichts — wer noch nicht angefangen hat,
     wird nicht angegriffen.
  --------------------------------------------------------------------- */
  if (planet.wavePower <= 0) {
    const fortschritt = Math.min(1, o2Percent() / Math.max(1, effectiveO2Window().min))
    planet.threat += THREAT_RATE * fortschritt * def.anoxenPressure * dt
    if (planet.threat >= WAVE_AT) {
      planet.threat = 0
      if (!isCatchUp()) startWave()
    }
    return
  }

  /* --- Laufende Welle ---------------------------------------------------- */
  const anteile = waveComposition(planet.waveNumber)
  const schild = planet.shieldRemaining > 0 ? 0.5 : 1

  // Verteidigung schießt zurück.
  const schaden = defensePower().mul(dt).toNumber()
  planet.wavePower = Math.max(0, planet.wavePower - schaden)
  if (planet.wavePower <= 0) {
    endWave(true)
    return
  }

  // Und richtet ihrerseits an, was ihre Zusammensetzung hergibt.
  const wirkung = planet.wavePower * schild * dt
  for (const enemy of ENEMIES) {
    const anteil = anteile[enemy.id]
    if (anteil <= 0) continue
    const kraft = wirkung * anteil
    const e = enemy.effect

    if (e.kind === 'disable') {
      disableUnits(kraft * e.unitsPerPower)
    } else if (e.kind === 'methane' && def.maxPollution !== undefined) {
      planet.pollution = planet.pollution.add(kraft * e.pollutionPerPower)
    } else if (e.kind === 'kill' && !planet.evacuated) {
      const tot = Decimal.min(planet.settlers, new Decimal(kraft * e.settlersPerPower))
      planet.settlers = planet.settlers.sub(tot)
      if (planet.bound.gt(planet.settlers)) planet.bound = planet.settlers
      meta.stats.settlersLost += tot.toNumber()
    }
  }

  planet.waveRemaining -= dt
  if (planet.waveRemaining <= 0) endWave(false)
}

/** Für die UI: alles, was das Kampfpanel braucht. */
export function combatStatus() {
  const def = currentPlanetDef()
  return {
    aktiv: def.hasAnoxen,
    welle: planet.waveNumber,
    kraft: planet.wavePower,
    rest: planet.waveRemaining,
    bedrohung: Math.min(1, planet.threat / WAVE_AT),
    verteidigung: defensePower(),
    zusammensetzung: waveComposition(planet.waveNumber || 1),
    stillgelegt: disabledShare(),
    schild: planet.shieldRemaining,
    abilities: ABILITIES.map((a) => ({
      def: a,
      cooldown: abilityCooldown(a.id),
      bereit: canUseAbility(a.id),
    })),
  }
}
