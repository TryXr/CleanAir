import Decimal from 'break_infinity.js'
import { findGenerator, type GeneratorDef } from '../data/generators'
import { play } from '../engine/audio'
import { addLog } from '../state/log.svelte'
import { generatorCount, planet, type BuildSite } from '../state/planet.svelte'
import { canAffordMaterials, spendMaterials } from '../state/run.svelte'
import { handFactor, unassigned } from './labor'
import { generatorCost, isAvailable } from './production'
import { storeMaterial } from './storage'

/**
 * Bauen kostet Hände und Zeit (M11, DESIGN.md §17).
 *
 * Bis M10 war Bauen ein Kassenvorgang: bezahlen, Anlage steht. Seit M11 legt
 * das Bezahlen nur eine **Baustelle** an — Material, O₂ und verbaute
 * Menschen sind sofort weg, das Gebäude entsteht erst durch Arbeit. Damit
 * bekommt Arbeitskraft eine zweite Rolle neben dem Betrieb: sie entscheidet
 * nicht mehr nur, was läuft, sondern auch, was überhaupt entsteht.
 *
 * Die Kolonne arbeitet die **vorderste** Baustelle ab und rückt dann nach.
 * Bewusst nicht auf alle verteilt: eine Reihe, die sichtbar von oben
 * abgearbeitet wird, ist verständlich; fünf gleichzeitig kriechende Balken
 * sind es nicht.
 */

/**
 * Arbeitersekunden, die *ohne* jeden Bauarbeiter anfallen — die Bauautomaten,
 * die mit der Landefähre gekommen sind.
 *
 * **Notwendig, nicht bequem.** Ohne diesen Grundtakt wäre jeder Planet außer
 * Aurora eine Sackgasse: Vesta bis Nimbus starten mit null Bewohnern, und
 * Bewohner brauchen Wohnraum, und Wohnraum will gebaut werden. Ohne Hände
 * käme nie jemand an, der Hände anlegen könnte. Nachgerechnet ist das exakt
 * null Fortschritt pro Sekunde — dieselbe Falle wie beim Abriss in M10.
 *
 * Klein genug, dass Hände trotzdem die Hauptsache bleiben: eine einzige
 * zugewiesene Person verdreifacht das Tempo.
 */
const AUTOMATON_WORK = 0.5

/** Arbeitersekunden pro Sekunde, die auf der Baustelle geleistet werden. */
export function buildRate(): number {
  return AUTOMATON_WORK + planet.builders * handFactor()
}

/** Die vorderste Baustelle — die, an der gerade gearbeitet wird. */
export function activeSite(): BuildSite | undefined {
  return planet.sites[0]
}

/** 0…1 — Fortschritt am aktuellen Stück der vordersten Baustelle. */
export function siteProgress(site: BuildSite): number {
  const def = findGenerator(site.id)
  if (!def || def.buildWork <= 0) return 1
  return Math.min(1, site.progress / def.buildWork)
}

/**
 * Sekunden bis diese Baustelle vollständig abgearbeitet ist — inklusive
 * allem, was in der Reihe davor steht. Ohne die Warteschlange wäre die
 * Anzeige eine Lüge über alles außer der ersten Zeile.
 */
export function secondsUntilDone(index: number): number {
  const rate = buildRate()
  if (rate <= 0) return Infinity

  let work = 0
  for (let i = 0; i <= index && i < planet.sites.length; i++) {
    const site = planet.sites[i]!
    const def = findGenerator(site.id)
    if (!def) continue
    work += def.buildWork * site.remaining - site.progress
  }
  return work / rate
}

// --- Bestellen ------------------------------------------------------------

/**
 * Was einer Bestellung im Weg steht — oder `null`, wenn sie durchgeht.
 * Gibt der UI einen Grund, statt nur einen ausgegrauten Knopf.
 */
export function orderBlocker(def: GeneratorDef, amount: number): string | null {
  if (amount < 1) return 'keine Menge'
  if (!isAvailable(def)) return `${def.name} gibt es hier nicht`
  if (planet.oxygen.lt(generatorCost(def, amount))) return 'zu wenig O₂'
  if (!canAffordMaterials(def.materialCost, amount)) return 'zu wenig Material'
  const people = (def.populationCost ?? 0) * amount
  if (people > 0 && unassigned().lt(people)) return 'zu wenige freie Bewohner'
  return null
}

/**
 * Legt eine Baustelle an. Bezahlt wird sofort und vollständig.
 *
 * Sofort zu bezahlen ist die ehrlichere Variante: sonst könnte man zwanzig
 * Bestellungen mit demselben Guthaben aufgeben und stünde später vor einer
 * Reihe, die nie fertig wird. Wer es sich anders überlegt, bricht ab — und
 * bekommt für jedes noch nicht gebaute Stück den vollen Preis zurück.
 */
export function orderGenerator(id: string, amount: number): boolean {
  const def = findGenerator(id)
  if (!def) return false
  if (orderBlocker(def, amount) !== null) return false

  planet.oxygen = planet.oxygen.sub(generatorCost(def, amount))
  spendMaterials(def.materialCost, amount)
  const people = (def.populationCost ?? 0) * amount
  if (people > 0) planet.bound = planet.bound.add(people)

  // Ersetzen statt schieben — Svelte bemerkt ein push() auf einem $state-Array
  // zwar, aber die Ersetzung hält es einheitlich mit dem übrigen Code.
  planet.sites = [...planet.sites, { id, remaining: amount, progress: 0 }]
  play('buy')
  return true
}

/**
 * Bricht eine Baustelle ab und erstattet die **noch nicht gebauten** Stück
 * vollständig.
 *
 * Die Erstattung ist exakt, nicht anteilig geschätzt — aber nur, wenn die
 * **Reihenfolge stimmt**: erst die Baustelle aus der Reihe nehmen, dann den
 * Preis ausrechnen. `generatorCost` zählt seit M11 die offenen Bestellungen
 * mit, also zählte eine noch eingereihte Baustelle sich selbst mit und
 * erstattete die Preisstufen *über* den eigenen. Nach dem Ausbuchen trifft
 * sie dagegen genau die Stufen, die bezahlt und nie gebaut wurden.
 *
 * Was am angefangenen Stück schon gearbeitet wurde, ist weg — Arbeit lässt
 * sich nicht zurückgeben.
 *
 * Kein Widerspruch zum „Abriss ohne Rückerstattung" aus §17: dort steht ein
 * fertiges Gebäude, hier steht noch nichts.
 */
export function cancelSite(index: number): boolean {
  const site = planet.sites[index]
  if (!site) return false
  const def = findGenerator(site.id)
  if (!def) return false

  const offen = site.remaining
  planet.sites = planet.sites.filter((_, i) => i !== index)

  planet.oxygen = planet.oxygen.add(generatorCost(def, offen))
  if (def.materialCost) {
    for (const [material, per] of Object.entries(def.materialCost)) {
      storeMaterial(material, new Decimal(per * offen))
    }
  }
  if (def.populationCost) {
    planet.bound = planet.bound.sub(def.populationCost * offen)
    if (planet.bound.lt(0)) planet.bound = new Decimal(0)
  }
  return true
}

// --- Tick -----------------------------------------------------------------

/**
 * Ein fertiges Stück übergeben.
 *
 * Erst hier wächst `generators` — vorher zählt die Anlage nirgends mit,
 * weder für Produktion noch für Arbeitsplätze. Genau das ist der Punkt von
 * M11: eine bezahlte Anlage ist noch keine stehende.
 */
function finishUnit(def: GeneratorDef): void {
  planet.generators[def.id] = generatorCount(def.id) + 1
}

export function constructionSystem(dt: number): void {
  if (planet.sites.length === 0) return

  let work = buildRate() * dt
  if (work <= 0) return

  let fertig = 0
  let letzter: GeneratorDef | undefined

  while (work > 0 && planet.sites.length > 0) {
    const site = planet.sites[0]!
    const def = findGenerator(site.id)
    if (!def) {
      // Kann nur passieren, wenn ein Generator aus den Daten verschwindet.
      // Die Baustelle stillschweigend fallen lassen ist besser, als die
      // ganze Reihe daran hängen zu lassen.
      planet.sites = planet.sites.slice(1)
      continue
    }

    const fehlt = Math.max(0, def.buildWork - site.progress)
    if (work < fehlt) {
      site.progress += work
      work = 0
      break
    }

    // Ein Stück ist fertig.
    work -= fehlt
    finishUnit(def)
    fertig++
    letzter = def

    if (site.remaining <= 1) {
      planet.sites = planet.sites.slice(1)
    } else {
      site.remaining -= 1
      site.progress = 0
    }
  }

  if (fertig > 0 && letzter) {
    addLog(
      fertig === 1
        ? `${letzter.name} steht.`
        : `${fertig} Anlagen fertiggestellt, zuletzt ${letzter.name}.`,
      'good',
    )
  }
}
