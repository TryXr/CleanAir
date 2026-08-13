/**
 * Laufzeit-Zustand, der bewusst NICHT gespeichert wird:
 * UI-Flags, Speicher-Status, alles was beim Neuladen neu entstehen darf.
 */
export const session = $state({
  lastSavedAt: 0,
  saveFailed: false,
  bootedAt: Date.now(),
})
