import Decimal from 'break_infinity.js'
import { findGenerator, type GeneratorDef } from '../data/generators'
import { GOODS, findGood, type GoodDef } from '../data/goods'
import { play } from '../engine/audio'
import { addLog } from '../state/log.svelte'
import { generatorCount, planet, type BuildSite } from '../state/planet.svelte'
import { canAffordMaterials, materialAmount, spendMaterials } from '../state/run.svelte'
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

/**
 * Arbeitersekunden für *ein* Stück dieser Bestellung — Anlage oder Ware.
 *
 * Die eine Stelle, an der die Reihe beide Sorten auseinanderhält. Alles
 * andere in diesem System rechnet nur noch mit dieser Zahl und muss den
 * Unterschied nicht kennen.
 */
export function siteWork(site: BuildSite): number {
  if (site.art === 'ware') return findGood(site.id)?.work ?? 0
  return findGenerator(site.id)?.buildWork ?? 0
}

/** Wie das, was hier entsteht, in der Oberfläche heißt. */
export function siteName(site: BuildSite): string {
  const name = site.art === 'ware' ? findGood(site.id)?.name : findGenerator(site.id)?.name
  return name ?? site.id
}

/** 0…1 — Fortschritt am aktuellen Stück der vordersten Baustelle. */
export function siteProgress(site: BuildSite): number {
  const work = siteWork(site)
  if (work <= 0) return 1
  return Math.min(1, site.progress / work)
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
    work += siteWork(site) * site.remaining - site.progress
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
  planet.sites = [...planet.sites, { art: 'anlage', id, remaining: amount, progress: 0 }]
  play('buy')
  return true
}

/**
 * Welche Rezepte die Werkstatt gerade anbietet.
 *
 * Ein Rezept erscheint erst, wenn **mindestens einer seiner Eingänge im Lager
 * liegt**. Ohne diese Regel steht die Werkstatt von der ersten Sekunde auf
 * Aurora und bietet Balken aus Holz an, das es dort nicht gibt und das der
 * Spieler noch nie gesehen hat — zwei Zeilen ohne Funktion, genau die
 * Anzeigefrage, die §18 offengelassen hatte.
 *
 * Bewusst „einer" und nicht „alle": Werkzeug braucht Platten *und* Balken,
 * und es soll sichtbar werden, sobald Platten da sind. Was dann noch fehlt,
 * steht rot an der Schaltfläche — so hält es der Rest des Spiels auch.
 *
 * Steht hier und nicht in der Komponente, damit der Selbsttest es sehen kann
 * (CLAUDE.md: Anzeigetabellen gehören nicht in die `.svelte`-Datei).
 */
export function availableGoods(): GoodDef[] {
  return GOODS.filter(
    (g) =>
      planet.oxygenTotal.gte(g.revealAt) &&
      Object.keys(g.input).some((id) => materialAmount(id).gt(0)),
  )
}

/**
 * Was einer Werkstatt-Bestellung im Weg steht — oder `null`.
 *
 * Kein O₂ in der Liste, und das ist Absicht: Güter kosten Material und
 * Arbeitszeit (§18). O₂ als Währung ist der Weg, von dem §17 wegführt — ein
 * neues System sollte ihn nicht wieder einführen.
 */
export function goodBlocker(def: GoodDef, amount: number): string | null {
  if (amount < 1) return 'keine Menge'
  if (!canAffordMaterials(def.input, amount)) return 'zu wenig Material'
  return null
}

/**
 * Bestellt Werkstattgüter. Material sofort weg, das Stück entsteht durch
 * Arbeit — dieselbe Reihe, dieselbe Kolonne wie beim Bauen.
 */
export function orderGood(id: string, amount: number): boolean {
  const def = findGood(id)
  if (!def) return false
  if (goodBlocker(def, amount) !== null) return false

  spendMaterials(def.input, amount)
  planet.sites = [...planet.sites, { art: 'ware', id, remaining: amount, progress: 0 }]
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

  // Eine Ware kostet kein O₂ und keine Menschen — es kommt genau das zurück,
  // was hineingegangen ist.
  if (site.art === 'ware') {
    const good = findGood(site.id)
    if (!good) return false
    const offen = site.remaining
    planet.sites = planet.sites.filter((_, i) => i !== index)
    for (const [material, per] of Object.entries(good.input)) {
      storeMaterial(material, new Decimal(per * offen))
    }
    return true
  }

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
function finishUnit(site: BuildSite): void {
  if (site.art === 'ware') {
    const good = findGood(site.id)
    if (!good) return
    /*
     * Über storeMaterial(), nicht über addMaterial() — die Lagergrenze aus
     * M11 gilt auch für Werkstattgüter. Was keinen Platz findet, verfällt;
     * was schon liegt, bleibt liegen.
     */
    storeMaterial(good.output, new Decimal(good.amount))
    return
  }
  const def = findGenerator(site.id)
  if (!def) return
  planet.generators[def.id] = generatorCount(def.id) + 1
}

export function constructionSystem(dt: number): void {
  if (planet.sites.length === 0) return

  let work = buildRate() * dt
  if (work <= 0) return

  let fertig = 0
  let letzter = ''

  while (work > 0 && planet.sites.length > 0) {
    const site = planet.sites[0]!
    const stueckArbeit = siteWork(site)
    if (stueckArbeit <= 0) {
      // Kann nur passieren, wenn eine id aus den Daten verschwindet. Die
      // Baustelle stillschweigend fallen lassen ist besser, als die ganze
      // Reihe daran hängen zu lassen.
      planet.sites = planet.sites.slice(1)
      continue
    }

    const fehlt = Math.max(0, stueckArbeit - site.progress)
    if (work < fehlt) {
      site.progress += work
      work = 0
      break
    }

    // Ein Stück ist fertig.
    work -= fehlt
    finishUnit(site)
    fertig++
    letzter = siteName(site)

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
        ? `${letzter} fertig.`
        : `${fertig} Stück fertiggestellt, zuletzt ${letzter}.`,
      'good',
    )
  }
}
