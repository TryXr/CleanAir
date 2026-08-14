/**
 * Laufzeit-Zustand, der bewusst NICHT gespeichert wird:
 * UI-Flags, Speicher-Status, alles was beim Neuladen neu entstehen darf.
 */
export type BuyAmount = 1 | 10 | 'max'

export const session = $state({
  lastSavedAt: 0,
  saveFailed: false,
  bootedAt: Date.now(),

  /** Kaufmenge für Generatoren — gilt für alle Reihen gemeinsam. */
  buyAmount: 1 as BuyAmount,

  /**
   * Sichtbarer Reiter. Bewusst nicht gespeichert: nach dem Neuladen soll man
   * dort landen, wo das Spiel passiert, nicht in der Statistik von gestern.
   */
  tab: 'planet' as TabId,
})

export type TabId = 'planet' | 'aufbau' | 'fortschritt' | 'imperium' | 'system'
