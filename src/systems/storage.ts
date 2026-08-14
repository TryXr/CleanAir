import Decimal from 'break_infinity.js'
import { GENERATORS } from '../data/generators'
import { addLog } from '../state/log.svelte'
import { findMaterial } from '../data/materials'
import { generatorCount } from '../state/planet.svelte'
import { addMaterial, materialAmount, run } from '../state/run.svelte'

/**
 * Das Lager ist endlich (M11, DESIGN.md §17).
 *
 * Bis M10 war `run.materials` ein Fass ohne Boden: jede Mine förderte
 * unbegrenzt weiter, und die einzige Frage war Zeit. Mit einer Grenze wird
 * aus dem Abbau eine Entscheidung — fördern, bis es voll ist, und dann
 * entweder verbauen oder Hallen dazustellen.
 *
 * **Die Kapazität gehört dem Durchlauf, nicht dem Planeten.** Das Lager
 * selbst tut das schon (§16), und alles andere wäre eine Falle: eine Reise
 * würde die Grenze senken und im selben Moment Material vernichten, das
 * längst im Regal lag. Deshalb zählen Hallen auf *allen* Planeten des
 * Durchlaufs mit — der aktive aus `planet`, die übrigen aus ihrer
 * Momentaufnahme in `run.planets`.
 */

/**
 * Grundplatz je Material, ohne eine einzige Halle.
 *
 * Großzügig genug, dass der Anfang eines Planeten nie an der Grenze hängt —
 * die erste Halle kostet 10 Stein, und wer die nicht lagern könnte, säße in
 * einer Sackgasse.
 */
const BASE_STORAGE = 1000

/** Stück Lagerhalle auf einem serialisierten Planeten. */
function depotsInSnapshot(raw: unknown, id: string): number {
  const s = (raw ?? {}) as Record<string, unknown>
  const gens = (s.generators ?? {}) as Record<string, unknown>
  const n = gens[id]
  return typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0
}

/**
 * Platz je Material — für jedes Material derselbe Wert.
 *
 * Bewusst eine Grenze *pro Material* statt einer gemeinsamen: sonst
 * verdrängt eine schnelle Mine alles andere aus dem Regal, und der Spieler
 * verliert Material, ohne etwas falsch gemacht zu haben.
 */
export function materialCapacity(): Decimal {
  let space = BASE_STORAGE
  for (const def of GENERATORS) {
    if (def.output.kind !== 'storage') continue
    let stueck = generatorCount(def.id)
    for (const raw of Object.values(run.planets)) stueck += depotsInSnapshot(raw, def.id)
    space += stueck * def.baseRate
  }
  /*
   * Bewusst ohne Multiplikator: es gibt bislang keine Quelle für einen
   * Lager-Bonus. Kommt einer, gehört er in metaEffects()/researchEffects()
   * und wird hier ausmultipliziert — nie in diese Formel geschrieben
   * (CLAUDE.md, „Boni gehören in eine Sammelstelle").
   */
  return new Decimal(space)
}

/** 0…1 — wie voll das Regal für dieses Material ist. */
export function storageFraction(id: string): number {
  const cap = materialCapacity()
  if (cap.lte(0)) return 1
  return Math.min(1, materialAmount(id).div(cap).toNumber())
}

export function isStorageFull(id: string): boolean {
  return materialAmount(id).gte(materialCapacity())
}

/**
 * Gemeldete Materialien, damit die Warnung einmal kommt und nicht zwanzigmal
 * pro Sekunde. Räumt sich selbst auf, sobald wieder Platz ist — ein Timer
 * wäre eine zweite Uhr für nichts.
 */
const gemeldet = new Set<string>()

/** Beim Laden und beim Planetenwechsel: alte Meldungen gelten nicht mehr. */
export function resetStorageNotices(): void {
  gemeldet.clear()
}

/**
 * Der einzige Weg, auf dem im Spiel Material ins Lager kommt.
 *
 * `addMaterial()` aus state/run.svelte.ts ist der rohe Setzer **ohne**
 * Grenze — wer ihn direkt aufruft, hebelt das Lager aus.
 *
 * Liefert zurück, was keinen Platz mehr fand. Überschuss verfällt, wird aber
 * nie von dem abgezogen, was schon liegt: ein abgerissenes Depot darf kein
 * Material vernichten, sondern nur den Nachschub stoppen (§1.2).
 */
export function storeMaterial(id: string, amount: Decimal): Decimal {
  if (amount.lte(0)) return new Decimal(0)

  const cap = materialCapacity()
  const room = cap.sub(materialAmount(id))

  if (room.lte(0)) {
    if (!gemeldet.has(id)) {
      const name = findMaterial(id)?.name ?? id
      addLog(`Das Lager für ${name} ist voll. Was jetzt gefördert wird, verfällt.`, 'warn')
      gemeldet.add(id)
    }
    return amount
  }

  const passt = Decimal.min(amount, room)
  addMaterial(id, passt)
  if (materialAmount(id).lt(cap)) gemeldet.delete(id)
  return amount.sub(passt)
}

/** Für die UI: steht auf diesem Planeten überhaupt eine Halle zum Bauen? */
export function storageBuildings(): typeof GENERATORS {
  return GENERATORS.filter((d) => d.output.kind === 'storage')
}

/** Nur für die Anzeige: Lagerplatz, den der aktive Planet beisteuert. */
export function localDepots(): number {
  let n = 0
  for (const def of GENERATORS) {
    if (def.output.kind === 'storage') n += generatorCount(def.id)
  }
  return n
}
