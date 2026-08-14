<script lang="ts">
  import { TICK_RATE } from './engine/loop'
  import { SAVE_VERSION, exportSave, importSave, saveNow, wipeSave } from './engine/save'
  import { addLog } from './state/log.svelte'
  import { meta } from './state/meta.svelte'
  import { planet } from './state/planet.svelte'
  import { settings } from './state/settings.svelte'
  import { currentPlanetDef } from './state/planet.svelte'
  import { pendingCores } from './systems/prestige'
  import { hasForest } from './systems/forest'
  import { hasAnyMaterial } from './state/run.svelte'
  import AtmospherePanel from './ui/AtmospherePanel.svelte'
  import CombatPanel from './ui/CombatPanel.svelte'
  import DebugPanel from './ui/DebugPanel.svelte'
  import EventPanel from './ui/EventPanel.svelte'
  import ForestPanel from './ui/ForestPanel.svelte'
  import GeneratorList from './ui/GeneratorList.svelte'
  import InventoryPanel from './ui/InventoryPanel.svelte'
  import JobPanel from './ui/JobPanel.svelte'
  import SupplyPanel from './ui/SupplyPanel.svelte'
  import LogPanel from './ui/LogPanel.svelte'
  import MetaTree from './ui/MetaTree.svelte'
  import Panel from './ui/Panel.svelte'
  import PlanetMap from './ui/PlanetMap.svelte'
  import PopulationPanel from './ui/PopulationPanel.svelte'
  import PrestigePanel from './ui/PrestigePanel.svelte'
  import ResearchTree from './ui/ResearchTree.svelte'
  import StatsPanel from './ui/StatsPanel.svelte'
  import TopBar from './ui/TopBar.svelte'
  import UpgradeGrid from './ui/UpgradeGrid.svelte'

  let transfer = $state('')

  const ticks = $derived(Math.round(meta.totalPlaytime * TICK_RATE))

  // Schrittweise Enthüllung: kein Panel zeigen, bevor es etwas zu entscheiden gibt.
  const showPopulation = $derived(currentPlanetDef().allowsPopulation)
  const showPrestige = $derived(
    planet.completed || meta.stats.runs > 0 || pendingCores().gte(1),
  )
  const showMetaTree = $derived(meta.genesisCores.gt(0) || meta.metaUpgrades.length > 0)
  const showResearch = $derived(
    meta.research.gt(0) || Object.keys(meta.researchNodes).length > 0 || planet.settlers.gt(0),
  )
  const showEvents = $derived(currentPlanetDef().hasEvents)
  const showCombat = $derived(currentPlanetDef().hasAnoxen)

  const showForest = $derived(hasForest())
  // Lager zeigen, sobald es hier etwas zu holen gibt oder schon etwas drin ist.
  const showInventory = $derived(currentPlanetDef().materials.length > 0 || hasAnyMaterial())

  /** Debug-Werkzeuge gibt es nur im Dev-Build, nie im ausgelieferten Spiel. */
  const isDev = import.meta.env.DEV

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

<main>
  <div class="column">
    <Panel title="Atmosphäre" hint={planet.name}>
      <AtmospherePanel />
    </Panel>

    {#if showPopulation}
      <Panel title="Bevölkerung" hint="atmet mit">
        <PopulationPanel />
      </Panel>

      <Panel title="Versorgung" hint="bleibt auf dem Planeten">
        <SupplyPanel />
      </Panel>

      <Panel title="Berufe" hint="verteilte Arbeitskraft">
        <JobPanel />
      </Panel>
    {/if}

    {#if showForest}
      <Panel title="Wald" hint="Holz kostet Atmosphäre">
        <ForestPanel />
      </Panel>
    {/if}

    <Panel title="Anlagen">
      <GeneratorList />
    </Panel>

    <Panel title="Verbesserungen">
      <UpgradeGrid />
    </Panel>

    {#if showResearch}
      <Panel title="Forschung" hint="bleibt für immer">
        <ResearchTree />
      </Panel>
    {/if}

    {#if showMetaTree}
      <Panel title="Meta-Baum" hint="bleibt für immer">
        <MetaTree />
      </Panel>
    {/if}
  </div>

  <div class="column side">
    {#if isDev}
      <Panel title="Debug" hint="nur im Dev-Build">
        <DebugPanel />
      </Panel>
    {/if}

    {#if showInventory}
      <Panel title="Lager" hint="gilt für alle Planeten">
        <InventoryPanel />
      </Panel>
    {/if}

    {#if showCombat}
      <Panel title="Anoxen" hint="dein Fortschritt ist ihr Gift">
        <CombatPanel />
      </Panel>
    {/if}

    {#if showEvents}
      <Panel title="Lage" hint="Zwischenfälle">
        <EventPanel />
      </Panel>
    {/if}

    <Panel title="Sternenkarte" hint="Planeten bleiben bestehen">
      <PlanetMap />
    </Panel>

    {#if showPrestige}
      <Panel title="Durchlauf" hint="Reset gegen Kerne">
        <PrestigePanel />
      </Panel>
    {/if}

    <Panel title="Statistik">
      <StatsPanel />
    </Panel>

    <Panel title="Ereignisse">
      <LogPanel />
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

      <details>
        <summary>Systemstatus</summary>
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
        </dl>
      </details>
    </Panel>
  </div>
</main>

<style>
  main {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 340px;
    gap: var(--gap);
    max-width: 1180px;
    margin: 0 auto;
    padding: var(--gap) 20px 60px;
    align-items: start;
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

  details {
    margin-top: 14px;
  }

  summary {
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted);
    cursor: pointer;
  }

  .stats {
    display: grid;
    gap: 6px;
    margin: 12px 0 0;
  }

  .stats div {
    display: flex;
    justify-content: space-between;
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
