<script lang="ts">
  import { TICK_RATE } from './engine/loop'
  import { SAVE_VERSION, exportSave, importSave, saveNow, wipeSave } from './engine/save'
  import { addLog } from './state/log.svelte'
  import { meta } from './state/meta.svelte'
  import { currentPlanetDef, planet } from './state/planet.svelte'
  import { hasAnyMaterial } from './state/run.svelte'
  import { session, type TabId } from './state/session.svelte'
  import { settings } from './state/settings.svelte'
  import { activeEvents } from './systems/eventEffects'
  import { stableCount } from './systems/finale'
  import { hasForest } from './systems/forest'
  import { pendingCores } from './systems/prestige'
  import AchievementGrid from './ui/AchievementGrid.svelte'
  import AtmospherePanel from './ui/AtmospherePanel.svelte'
  import BuildPanel from './ui/BuildPanel.svelte'
  import CombatPanel from './ui/CombatPanel.svelte'
  import DebugPanel from './ui/DebugPanel.svelte'
  import EventPanel from './ui/EventPanel.svelte'
  import FinalePanel from './ui/FinalePanel.svelte'
  import ForestPanel from './ui/ForestPanel.svelte'
  import GeneratorList from './ui/GeneratorList.svelte'
  import InventoryPanel from './ui/InventoryPanel.svelte'
  import LogPanel from './ui/LogPanel.svelte'
  import MetaTree from './ui/MetaTree.svelte'
  import NextStep from './ui/NextStep.svelte'
  import Panel from './ui/Panel.svelte'
  import PlanetMap from './ui/PlanetMap.svelte'
  import PlanetView from './ui/PlanetView.svelte'
  import PopulationPanel from './ui/PopulationPanel.svelte'
  import PrestigePanel from './ui/PrestigePanel.svelte'
  import StaffPanel from './ui/StaffPanel.svelte'
  import StatusRail from './ui/StatusRail.svelte'
  import ResearchTree from './ui/ResearchTree.svelte'
  import StatsPanel from './ui/StatsPanel.svelte'
  import SupplyPanel from './ui/SupplyPanel.svelte'
  import TopBar from './ui/TopBar.svelte'
  import UpgradeGrid from './ui/UpgradeGrid.svelte'
  import WorkshopPanel from './ui/WorkshopPanel.svelte'

  let transfer = $state('')

  const ticks = $derived(Math.round(meta.totalPlaytime * TICK_RATE))
  const def = $derived(currentPlanetDef())

  /* --- Schrittweise Enthüllung ---------------------------------------------
     Ein Panel erscheint erst, wenn es etwas zu entscheiden gibt. Vorher ist
     es für einen neuen Spieler nur eine weitere Kiste, die er verstehen zu
     müssen glaubt.
  ------------------------------------------------------------------------ */
  const showPopulation = $derived(def.allowsPopulation)
  const showForest = $derived(hasForest())
  /** Auf Aurora wächst der Wald nur — gefällt wird erst, wo Holz zählt. */
  const fellt = $derived(def.materials.includes('holz'))
  const showInventory = $derived(def.materials.length > 0 || hasAnyMaterial())
  const showCombat = $derived(def.hasAnoxen)
  const showResearch = $derived(
    meta.research.gt(0) || Object.keys(meta.researchNodes).length > 0 || planet.settlers.gt(0),
  )
  const showAchievements = $derived(meta.achievements.length > 0)
  const showMetaTree = $derived(meta.genesisCores.gt(0) || meta.metaUpgrades.length > 0)
  const showPrestige = $derived(planet.completed || meta.stats.runs > 0 || pendingCores().gte(1))
  // Die Sternenkarte lohnt erst, wenn es überhaupt ein Ziel gibt.
  const showMap = $derived(planet.rocketBuilt || meta.stats.runs > 0 || planet.completed)
  /*
   * Das Ende zeigt sich ab der Hälfte — vorher wäre es ein Versprechen, mit
   * dem niemand etwas anfangen kann, und danach ist es das, worauf man
   * hinspielt. Wer ausgesät hat, behält den Epilog für immer.
   */
  const showFinale = $derived(meta.finaleReached || stableCount() >= 3)

  const isDev = import.meta.env.DEV

  /** Nur laufende Ereignisse verdienen einen Platz in der Seitenspalte. */
  const laufendeEreignisse = $derived(activeEvents())

  /**
   * Reiter statt einer endlosen Spalte.
   *
   * Vorher standen bis zu vierzehn gleich gewichtete Panels untereinander —
   * man konnte Atmosphäre und Anlagen nicht gleichzeitig sehen und musste
   * zum Klicken scrollen. Ein Reiter zeigt jetzt genau einen Zusammenhang.
   * Leere Reiter erscheinen gar nicht erst.
   */
  const tabs = $derived(
    (
      [
        { id: 'planet', label: 'Planet', an: true },
        { id: 'kolonie', label: 'Kolonie', an: showPopulation },
        { id: 'aufbau', label: 'Aufbau', an: true },
        { id: 'fortschritt', label: 'Fortschritt', an: showResearch || showAchievements || showMetaTree },
        { id: 'imperium', label: 'Imperium', an: showMap || showPrestige },
        { id: 'system', label: 'System', an: true },
      ] as const
    ).filter((t) => t.an),
  )

  // Verschwindet der aktive Reiter (etwa nach einem Reset), nicht ins Leere fallen.
  $effect(() => {
    if (!tabs.some((t) => t.id === session.tab)) session.tab = 'planet'
  })

  function onSave(): void {
    const ok = saveNow()
    addLog(ok ? 'Spielstand gespeichert.' : 'Speichern fehlgeschlagen.', ok ? 'good' : 'bad')
  }

  async function onExport(): Promise<void> {
    transfer = exportSave()
    try {
      await navigator.clipboard.writeText(transfer)
      addLog('Spielstand in die Zwischenablage kopiert.', 'good')
    } catch {
      addLog('Zwischenablage nicht verfügbar — Text unten manuell kopieren.', 'warn')
    }
  }

  function onImport(): void {
    if (!transfer.trim()) return
    if (importSave(transfer)) {
      addLog('Spielstand importiert.', 'good')
    } else {
      addLog('Import fehlgeschlagen: unlesbar oder aus einer neueren Version.', 'bad')
    }
  }

  function onWipe(): void {
    if (!confirm('Spielstand endgültig löschen und neu starten?')) return
    wipeSave()
    location.reload()
  }
</script>

<TopBar />

<nav class="tabs">
  {#each tabs as t (t.id)}
    <button class:active={session.tab === t.id} onclick={() => (session.tab = t.id as TabId)}>
      {t.label}
    </button>
  {/each}
</nav>

<main>
  <!-- Links das Dauerhafte, in der Mitte der gewählte Reiter, rechts das
       Laufende. Die Übersicht steht bewusst zuerst im DOM: sie ist das, was
       man zuerst liest — und bei schmalem Fenster rutscht sie dadurch nach
       oben statt ans Ende. -->
  <StatusRail />

  <div class="column">
    <NextStep />

    {#if session.tab === 'planet'}
      <Panel title={planet.name} hint={def.intro.split('.')[0]}>
        <PlanetView />
      </Panel>

      <Panel title="Atmosphäre" hint="das eigentliche Ziel">
        <AtmospherePanel />
      </Panel>

      {#if showForest}
        <Panel title="Wald" hint={fellt ? 'Holz kostet Atmosphäre' : 'jeder Baum atmet mit'}>
          <ForestPanel />
        </Panel>
      {/if}
    {/if}

    {#if session.tab === 'kolonie'}
      <Panel title="Zuweisung" hint="Handarbeit braucht Hände">
        <StaffPanel />
      </Panel>

      <Panel title="Bevölkerung" hint="atmet mit">
        <PopulationPanel />
      </Panel>

      <Panel title="Versorgung" hint="bleibt auf dem Planeten">
        <SupplyPanel />
      </Panel>

    {/if}

    {#if session.tab === 'aufbau'}
      <!-- Die Baustelle steht *über* den Anlagen: sie ist seit M11 der Ort,
           an dem ein Kauf endet, und wer sie übersieht, wundert sich, warum
           nichts passiert. -->
      <Panel title="Baustelle" hint="bezahlt ist nicht gebaut">
        <BuildPanel />
      </Panel>

      <Panel title="Anlagen">
        <GeneratorList />
      </Panel>

      <!-- Die Werkstatt steht bei den Anlagen und nicht bei der Kolonie:
           bestellt wird hier, gewirkt wird über die Bauten, die diese Güter
           kosten. -->
      {#if showPopulation}
        <Panel title="Werkstatt" hint="Material und Arbeitszeit, kein O₂">
          <WorkshopPanel />
        </Panel>
      {/if}

      <Panel title="Verbesserungen">
        <UpgradeGrid />
      </Panel>

      {#if showCombat}
        <Panel title="Verteidigung" hint="zwischen den Wellen bauen">
          <CombatPanel zeige="bau" />
        </Panel>
      {/if}

      {#if showInventory}
        <Panel title="Lager" hint="gilt für alle Planeten">
          <InventoryPanel />
        </Panel>
      {/if}
    {/if}

    {#if session.tab === 'fortschritt'}
      {#if showResearch}
        <Panel title="Forschung" hint="bleibt für immer">
          <ResearchTree />
        </Panel>
      {/if}

      {#if showAchievements}
        <Panel title="Erfolge" hint="jeder mit Bonus">
          <AchievementGrid />
        </Panel>
      {/if}

      {#if showMetaTree}
        <Panel title="Meta-Baum" hint="bleibt für immer">
          <MetaTree />
        </Panel>
      {/if}
    {/if}

    {#if session.tab === 'imperium'}
      {#if showMap}
        <Panel title="Sternenkarte" hint="Planeten bleiben bestehen">
          <PlanetMap />
        </Panel>
      {/if}

      {#if showPrestige}
        <Panel title="Durchlauf" hint="Reset gegen Kerne">
          <PrestigePanel />
        </Panel>
      {/if}

      <!-- Das Ende steht bei der Sternenkarte und nicht in einem eigenen
           Reiter: es ist der letzte Punkt derselben Reise, kein Nebenschauplatz.
           Sichtbar wird es erst, wenn die Hälfte steht — vorher wäre es ein
           Versprechen, mit dem niemand etwas anfangen kann. -->
      {#if showFinale}
        <Panel title={meta.finaleReached ? 'Die Aussaat' : 'Das Ende'} hint="was danach kommt">
          <FinalePanel />
        </Panel>
      {/if}
    {/if}

    {#if session.tab === 'system'}
      <Panel title="Statistik">
        <StatsPanel />
      </Panel>

      <Panel title="Spielstand">
        <div class="actions">
          <button class="primary" onclick={onSave}>Speichern</button>
          <button onclick={onExport}>Export</button>
          <button onclick={onImport} disabled={!transfer.trim()}>Import</button>
          <button class="danger" onclick={onWipe}>Löschen</button>
        </div>
        <textarea
          bind:value={transfer}
          spellcheck="false"
          placeholder="Export erscheint hier — oder Save-Text zum Importieren einfügen."
        ></textarea>

        <dl class="stats">
          <div><dt>Tickrate</dt><dd class="num">{TICK_RATE} Hz</dd></div>
          <div><dt>Ticks</dt><dd class="num">{ticks.toLocaleString('de-DE')}</dd></div>
          <div><dt>Save-Version</dt><dd class="num">{SAVE_VERSION}</dd></div>
          <div><dt>Autosave</dt><dd class="num">{settings.autosaveSeconds} s</dd></div>
          <div>
            <dt>Offline</dt>
            <dd class="num">
              {Math.round(settings.offlineEfficiency * 100)} % / {settings.offlineMaxHours} h
            </dd>
          </div>
          <div>
            <dt>Lautstärke</dt>
            <dd class="num">
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={Math.round(settings.soundVolume * 100)}
                oninput={(e) => (settings.soundVolume = e.currentTarget.valueAsNumber / 100)}
              />
            </dd>
          </div>
        </dl>
      </Panel>

      {#if isDev}
        <Panel title="Debug" hint="nur im Dev-Build">
          <DebugPanel />
        </Panel>
      {/if}
    {/if}
  </div>

  <!-- Die Seitenspalte trägt nur, was unabhängig vom Reiter gilt: was gerade
       passiert, und was man deshalb sofort beantworten können muss. -->
  <div class="column side">
    {#if showCombat}
      <Panel title="Anoxen" hint="dein Fortschritt ist ihr Gift">
        <CombatPanel zeige="lage" />
      </Panel>
    {/if}

    {#if laufendeEreignisse.length > 0}
      <Panel title="Zwischenfall">
        <EventPanel />
      </Panel>
    {/if}

    <Panel title="Ereignisse">
      <LogPanel />
    </Panel>
  </div>
</main>

<style>
  .tabs {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
    max-width: 1180px;
    margin: 0 auto;
    padding: var(--gap) 20px 0;
  }

  .tabs button {
    padding: 7px 16px;
    font-size: 13px;
    border-radius: 8px 8px 0 0;
    border-bottom-color: transparent;
    color: var(--muted);
    background: transparent;
  }

  .tabs button:hover:not(.active) {
    color: var(--text-dim);
  }

  .tabs button.active {
    color: var(--o2);
    background: var(--panel);
    border-color: var(--line-soft);
    border-bottom-color: var(--panel);
  }

  main {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 320px;
    gap: var(--gap);
    max-width: 1180px;
    margin: 0 auto;
    padding: 6px 20px 60px;
    align-items: start;
  }

  /*
   * Die Übersicht kostet die Mitte keinen Platz, solange keiner da ist:
   * unterhalb von 1320 px legt sie sich als Band über die volle Breite, und
   * das bisherige Layout bleibt Zeile für Zeile, wie es war. Ihre eigene
   * Form (Band oder Spalte) regelt StatusRail.svelte am selben Grenzwert.
   */
  main > :global(.rail) {
    grid-column: 1 / -1;
  }

  @media (min-width: 1320px) {
    main {
      grid-template-columns: 216px minmax(0, 1fr) 320px;
      max-width: 1440px;
    }

    main > :global(.rail) {
      grid-column: auto;
    }
  }

  .column {
    display: flex;
    flex-direction: column;
    gap: var(--gap);
    min-width: 0;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    margin-bottom: 10px;
  }

  .actions button {
    padding: 6px 11px;
    font-size: 13px;
  }

  .stats {
    display: grid;
    gap: 6px;
    margin: 14px 0 0;
  }

  .stats div {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    border-bottom: 1px dotted var(--line-soft);
    padding-bottom: 5px;
  }

  dt {
    font-size: 11px;
    color: var(--muted);
  }

  dd {
    margin: 0;
    font-size: 12px;
  }

  @media (max-width: 900px) {
    main {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
