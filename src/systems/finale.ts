import { FINALE } from '../data/finale'
import { PLANETS } from '../data/planets'
import { play } from '../engine/audio'
import { addLog } from '../state/log.svelte'
import { meta } from '../state/meta.svelte'
import { canAffordMaterials, spendMaterials } from '../state/run.svelte'
import { planetSummaries } from './travel'

/**
 * Das Finale (M16, DESIGN.md §19).
 *
 * Die eine Regel, die dieses System von allem anderen unterscheidet: es
 * **passiert nur einmal und nimmt nichts weg**. Kein Reset, kein
 * Weiterspielen-verboten, kein Bildschirm, der sich nicht schließen lässt.
 * §1.2 gilt auch für ein Ende — wer danach weiterspielen will, spielt weiter,
 * und wer einen Prestige-Durchlauf anhängt, behält die Aussaat trotzdem.
 *
 * Deshalb steht das Flag in `meta` und nicht im Durchlauf: es ist die einzige
 * Sache im Spiel, die man nur ein einziges Mal erreicht.
 */

/** Wie viele der sechs Planeten stabil stehen. */
export function stableCount(): number {
  return planetSummaries().filter((p) => p.completed).length
}

/** Alle sechs — die eigentliche Bedingung. */
export function allStable(): boolean {
  return stableCount() >= PLANETS.length
}

/**
 * Was der Aussaat noch im Weg steht — oder `null`.
 *
 * Wie `orderBlocker` beim Bauen: ein Grund ist immer besser als eine graue
 * Schaltfläche, und hier ganz besonders, weil die Bedingung über Stunden
 * läuft und man sonst rät, woran es hängt.
 */
export function finaleBlocker(): string | null {
  if (meta.finaleReached) return 'schon ausgesät'
  if (!allStable()) return `${stableCount()} von ${PLANETS.length} Atmosphären stehen`
  if (!canAffordMaterials(FINALE.materialCost)) return 'zu wenig Material'
  return null
}

/**
 * Sät aus. Einmalig, unumkehrbar in dem Sinn, dass es nicht *zurückgenommen*
 * wird — aber ohne jeden Verlust.
 */
export function seedUniverse(): boolean {
  if (finaleBlocker() !== null) return false

  spendMaterials(FINALE.materialCost)
  meta.finaleReached = true
  meta.finaleAt = Date.now()
  play('rocket')
  addLog(
    'Die Kapseln sind unterwegs. Von hier an rechnet jemand anders weiter.',
    'good',
  )
  return true
}
