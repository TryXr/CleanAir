import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'

import { format, formatTime } from './engine/format'
import { applyOffline, registerSystem, startLoop } from './engine/loop'
import { loadGame, saveNow } from './engine/save'
import { productionSystem } from './systems/production'
import { addLog } from './state/log.svelte'
import { meta } from './state/meta.svelte'
import { planet } from './state/planet.svelte'
import { settings } from './state/settings.svelte'

/* --- Systeme -------------------------------------------------------------
   Die Reihenfolge ist Teil des Balancings: erst Zeit fortschreiben, dann
   produzieren. Ab M1 kommen Verbrauch, Atmosphäre und Bevölkerung dazu —
   Produktion vor Verbrauch, damit ein Tick nie ins Negative kippt.
-------------------------------------------------------------------------- */

registerSystem('zeit', (dt) => {
  meta.totalPlaytime += dt
  planet.elapsed += dt
})

registerSystem('produktion', productionSystem)

/* --- Start --------------------------------------------------------------- */

const loaded = loadGame()

switch (loaded.status) {
  case 'loaded':
    addLog(`Willkommen zurück auf ${planet.name}.`)
    if (loaded.appliedMigrations.length > 0) {
      addLog(`Spielstand aktualisiert (Migration ${loaded.appliedMigrations.join(', ')}).`, 'good')
    }
    break
  case 'corrupt':
    addLog('Gespeicherter Stand ist unlesbar. Er wurde nicht überschrieben.', 'bad')
    break
  case 'future':
    addLog('Spielstand stammt aus einer neueren Version und wurde nicht geladen.', 'bad')
    break
  case 'empty':
    addLog('Atmosphärenprozessor online. Sauerstoffproduktion beginnt.', 'good')
    break
}

/**
 * Abwesenheit nachrechnen — für geschlossene Tabs ebenso wie für
 * Hintergrund-Tabs, in denen requestAnimationFrame pausiert. Bewusst
 * dieselbe Drosselung in beiden Fällen, sonst wäre „Tab offen lassen"
 * strikt besser als „Spiel schließen".
 */
function creditAbsence(awayMs: number): void {
  if (!settings.offlineEnabled || awayMs < 5000) return

  const before = planet.oxygen
  const result = applyOffline(awayMs, settings.offlineEfficiency, settings.offlineMaxHours)
  if (result.ticks === 0) return

  const gained = planet.oxygen.sub(before)
  addLog(
    `${formatTime(result.elapsedSeconds)} abwesend — ${formatTime(result.creditedSeconds)} angerechnet: +${format(gained)} O₂.`,
    'good',
  )
}

if (loaded.status === 'loaded') creditAbsence(loaded.awayMs)

startLoop()

/* --- Persistenz ---------------------------------------------------------- */

// Autosave über einen eigenen Timer statt über den Tick: sonst würde der
// Offline-Nachlauf tausende Speichervorgänge auslösen.
setInterval(() => saveNow(), Math.max(5, settings.autosaveSeconds) * 1000)

window.addEventListener('beforeunload', () => {
  saveNow()
})

let hiddenAt = 0
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    hiddenAt = Date.now()
    saveNow()
  } else if (hiddenAt > 0) {
    creditAbsence(Date.now() - hiddenAt)
    hiddenAt = 0
  }
})

/* --- UI ------------------------------------------------------------------ */

export default mount(App, { target: document.getElementById('app')! })
