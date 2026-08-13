import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'

import { format, formatTime } from './engine/format'
import { applyOffline, registerSystem, runTicks, startLoop, stopLoop } from './engine/loop'
import { loadGame, saveNow } from './engine/save'
import * as atmosphere from './systems/atmosphere'
import * as events from './systems/events'
import * as population from './systems/population'
import * as prestige from './systems/prestige'
import * as production from './systems/production'
import * as research from './systems/research'
import { atmosphereSystem, resetAtmosphereNotices } from './systems/atmosphere'
import { eventsSystem } from './systems/events'
import { populationSystem, resetPopulationNotices } from './systems/population'
import { productionSystem } from './systems/production'
import { AURORA, PLANETS } from './data/planets'
import { EVENTS } from './data/events'
import { GENERATORS } from './data/generators'
import { META_UPGRADES } from './data/metaUpgrades'
import { RESEARCH } from './data/research'
import { UPGRADES } from './data/upgrades'
import { resetPlanet } from './state/planet.svelte'
import { addLog } from './state/log.svelte'
import { meta } from './state/meta.svelte'
import { planet } from './state/planet.svelte'
import { settings } from './state/settings.svelte'

/* --- Systeme -------------------------------------------------------------
   Die Reihenfolge ist Teil des Balancings, nicht Geschmackssache:

   1. zeit         — Uhren zuerst, alles andere rechnet gegen sie.
   2. ereignisse   — legen ihre Faktoren an, bevor jemand sie liest.
   3. produktion   — Zufluss vor Verbrauch, damit ein Tick nie ins Negative kippt.
   4. bevölkerung  — atmet weg, was eben entstanden ist.
   5. atmosphäre   — bewertet zuletzt den fertigen Zustand des Ticks und
                     entscheidet über Brände und den Stabilitäts-Timer.
-------------------------------------------------------------------------- */

registerSystem('zeit', (dt) => {
  meta.totalPlaytime += dt
  planet.elapsed += dt
})

registerSystem('ereignisse', eventsSystem)
registerSystem('produktion', productionSystem)
registerSystem('bevölkerung', populationSystem)
registerSystem('atmosphäre', atmosphereSystem)

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
    addLog(AURORA.intro, 'good')
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

resetPopulationNotices()
resetAtmosphereNotices()

if (loaded.status === 'loaded') creditAbsence(loaded.awayMs)

startLoop()

/* --- Persistenz ---------------------------------------------------------- */

// Autosave über einen eigenen Timer statt über den Tick: sonst würde der
// Offline-Nachlauf tausende Speichervorgänge auslösen.
const autosaveTimer = setInterval(() => saveNow(), Math.max(5, settings.autosaveSeconds) * 1000)

/**
 * Speichern komplett stilllegen — Timer, Tab-Wechsel und Schließen.
 *
 * Nur für Balancing-Simulationen. Wer den Planeten in der Konsole
 * durchrechnet, verändert denselben Zustand, den das Autosave gleich
 * wegschreibt; ohne diesen Schalter überschreibt eine Simulation den
 * echten Spielstand. Genau das ist beim Bau von M3 einmal passiert.
 */
let persistenceOff = false
function stopPersistence(): void {
  persistenceOff = true
  clearInterval(autosaveTimer)
}

function persist(): void {
  if (!persistenceOff) saveNow()
}

window.addEventListener('beforeunload', persist)

let hiddenAt = 0
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    hiddenAt = Date.now()
    persist()
  } else if (hiddenAt > 0) {
    creditAbsence(Date.now() - hiddenAt)
    hiddenAt = 0
  }
})

/* --- Debug --------------------------------------------------------------- */

// Nur im Dev-Build. Gibt in der Browser-Konsole Zugriff auf genau die
// Instanzen, mit denen das laufende Spiel arbeitet — nötig für
// Balancing-Simulationen, weil ein eigener `import` im Devtools-Kontext
// eine zweite, unbeteiligte Kopie der Module bekommt.
if (import.meta.env.DEV) {
  Object.assign(window, {
    cleanair: {
      planet,
      meta,
      settings,
      loop: { startLoop, stopLoop, runTicks, registerSystem },
      /** Vor jeder Simulation aufrufen, sonst frisst das Autosave den Spielstand. */
      stopPersistence,
      resetPlanet,
      production,
      atmosphere,
      population,
      prestige,
      research,
      events,
      data: { GENERATORS, UPGRADES, META_UPGRADES, RESEARCH, EVENTS, AURORA, PLANETS },
    },
  })
}

/* --- UI ------------------------------------------------------------------ */

export default mount(App, { target: document.getElementById('app')! })
