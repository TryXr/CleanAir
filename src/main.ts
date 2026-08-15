import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'

import { format, formatTime } from './engine/format'
import {
  applyOffline,
  registerSystem,
  reportsAbsence,
  runTicks,
  startLoop,
  stopLoop,
} from './engine/loop'
import { isAudioReady, play as playSound, unlockAudio } from './engine/audio'
import {
  SAVE_VERSION,
  buildSave,
  exportSave,
  importSave,
  loadGame,
  saveNow,
  suspendPersistence,
} from './engine/save'
import * as achievements from './systems/achievements'
import * as atmosphere from './systems/atmosphere'
import * as events from './systems/events'
import * as combat from './systems/combat'
import * as construction from './systems/construction'
import * as contentment from './systems/contentment'
import * as finale from './systems/finale'
import * as crafting from './systems/crafting'
import * as forest from './systems/forest'
import * as labor from './systems/labor'
import * as storage from './systems/storage'
import * as population from './systems/population'
import * as prestige from './systems/prestige'
import * as production from './systems/production'
import * as research from './systems/research'
import * as salvage from './systems/salvage'
import * as travel from './systems/travel'
import { atmosphereSystem, resetAtmosphereNotices } from './systems/atmosphere'
import { achievementsSystem } from './systems/achievements'
import { seedingSystem } from './systems/seeding'
import { combatSystem } from './systems/combat'
import { constructionSystem } from './systems/construction'
import { craftingSystem } from './systems/crafting'
import { eventsSystem } from './systems/events'
import { populationSystem, resetPopulationNotices } from './systems/population'
import { productionSystem } from './systems/production'
import { resetStorageNotices } from './systems/storage'
import { salvageSystem } from './systems/salvage'
import { AURORA, PLANETS } from './data/planets'
import { EVENTS } from './data/events'
import { GENERATORS } from './data/generators'
import { ACHIEVEMENTS } from './data/achievements'
import { MATERIALS } from './data/materials'
import { ROCKETS } from './data/rockets'
import { compare, runAll, runPlanet, table } from './dev/balance'
import { selftest } from './dev/selftest'
import { run } from './state/run.svelte'
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
   3b. verarbeitung — direkt danach: die Kette greift auf das zu, was eben
                     gefördert wurde. Andersherum hinge jede Stufe einen Tick
                     hinterher, eine dreigliedrige Kette also drei.
   4. bau          — nach der Produktion: eine Anlage, die in diesem Tick
                     fertig wird, liefert erst im nächsten. Andersherum
                     produzierte sie, bevor sie stand.
   4b. bergung     — vor der Bevölkerung: ein zurückkehrender Trupp gibt Hände
                     frei, und enforceStaffLimit() räumt gleich danach auf.
   5. bevölkerung  — atmet weg, was eben entstanden ist.
   6. atmosphäre   — bewertet zuletzt den fertigen Zustand des Ticks und
                     entscheidet über Brände und den Stabilitäts-Timer.
   7. anoxen       — ganz zuletzt: die Welle schlägt auf den fertigen Zustand
                     ein. Andersherum würde eine Sabotage im selben Tick noch
                     produzieren, den sie gerade lahmgelegt hat.
-------------------------------------------------------------------------- */

registerSystem('zeit', (dt) => {
  meta.totalPlaytime += dt
  planet.elapsed += dt
})

registerSystem('ereignisse', eventsSystem)
registerSystem('produktion', productionSystem)
registerSystem('verarbeitung', craftingSystem)
registerSystem('bau', constructionSystem)
/*
 * Bergung nach dem Bau und vor der Bevölkerung (M18, §20.2).
 *
 * Die Stelle ist nicht beliebig: ein zurückkehrender Trupp gibt Hände frei,
 * und `enforceStaffLimit()` in der Bevölkerung räumt danach auf. Andersherum
 * würde eine Rückkehr eine Sekunde lang nicht zählen.
 */
registerSystem('bergung', salvageSystem)
registerSystem('bevölkerung', populationSystem)
registerSystem('atmosphäre', atmosphereSystem)
registerSystem('anoxen', combatSystem)
registerSystem('achievements', achievementsSystem)
// Ganz am Ende der Kette: die Aussaat hört auf niemanden mehr.
registerSystem('aussaat', seedingSystem)

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

  // Angerechnet ist angerechnet — erzählt wird erst, wenn die Abwesenheit
  // etwas zu erzählen hat. Ein kurzer Blick in einen anderen Tab ist keine
  // Nachricht, und 200 davon sind ein zugeschütteter Log (siehe loop.ts).
  if (!reportsAbsence(result.elapsedSeconds)) return

  const gained = planet.oxygen.sub(before)
  addLog(
    `${formatTime(result.elapsedSeconds)} abwesend — ${formatTime(result.creditedSeconds)} angerechnet: +${format(gained)} O₂.`,
    'good',
  )
}

resetPopulationNotices()
resetAtmosphereNotices()
resetStorageNotices()

if (loaded.status === 'loaded') creditAbsence(loaded.awayMs)

startLoop()

// Browser lassen keinen Ton zu, bevor der Spieler etwas angefasst hat.
// Der erste Klick auf „O₂ freisetzen" ist damit von selbst die Vorstellung.
for (const ereignis of ['pointerdown', 'keydown'] as const) {
  window.addEventListener(ereignis, () => unlockAudio(), { once: true })
}

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
function stopPersistence(): void {
  // Die eigentliche Sperre sitzt in save.ts — nur dort greift sie auch für
  // importSave() und damit für den Selbsttest. Ein Schalter allein hier war
  // löchrig und hat beim Bau von M11 einen Spielstand gekostet.
  suspendPersistence()
  clearInterval(autosaveTimer)
}

function persist(): void {
  saveNow()
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
      contentment,
      finale,
      crafting,
      atmosphere,
      population,
      prestige,
      research,
      salvage,
      events,
      forest,
      labor,
      construction,
      storage,
      combat,
      achievements,
      travel,
      run,
      selftest,
      /** Balancing-Werkzeug (§13). Fasst den Spielstand nicht an. */
      balance: { run: runPlanet, all: runAll, compare, table },
      audio: { unlockAudio, play: playSound, isAudioReady },
      // Für Save-Rundläufe im Test: exportieren, Zustand zerstören,
      // importieren und prüfen, ob wirklich alles zurückkommt.
      save: { exportSave, importSave, saveNow, buildSave, SAVE_VERSION },
      data: {
        GENERATORS,
        UPGRADES,
        META_UPGRADES,
        ROCKETS,
        RESEARCH,
        EVENTS,
        MATERIALS,
        ACHIEVEMENTS,
        AURORA,
        PLANETS,
      },
    },
  })
}

/* --- UI ------------------------------------------------------------------ */

export default mount(App, { target: document.getElementById('app')! })
