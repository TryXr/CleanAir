<script lang="ts">
  import { format, formatRate, formatTime } from './engine/format'
  import { TICK_RATE } from './engine/loop'
  import { SAVE_VERSION, exportSave, importSave, saveNow, wipeSave } from './engine/save'
  import { currentO2Rate } from './systems/production'
  import { addLog } from './state/log.svelte'
  import { meta } from './state/meta.svelte'
  import { planet } from './state/planet.svelte'
  import { settings } from './state/settings.svelte'
  import LogPanel from './ui/LogPanel.svelte'
  import Panel from './ui/Panel.svelte'
  import TopBar from './ui/TopBar.svelte'

  let transfer = $state('')

  const ticks = $derived(Math.round(meta.totalPlaytime * TICK_RATE))

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
    <Panel title="Atmosphäre" hint="Platzhalter bis M1">
      <div class="readout">
        <span class="big num">{format(planet.oxygen)}</span>
        <span class="unit">O₂</span>
      </div>
      <div class="rate num">{formatRate(currentO2Rate())}</div>
      <p class="note">
        Feste Grundrate ohne Generatoren. Sie existiert nur, um zu zeigen, dass Tick,
        Zahlformatierung, Speichern und Offline-Fortschritt zusammen funktionieren. In
        M1 treten hier der Klick-Button und die drei Generatoren an ihre Stelle.
      </p>
    </Panel>

    <Panel title="Systemstatus" hint="M0 — Gerüst">
      <dl class="stats">
        <div><dt>Tickrate</dt><dd class="num">{TICK_RATE} Hz</dd></div>
        <div><dt>Ticks gesamt</dt><dd class="num">{ticks.toLocaleString('de-DE')}</dd></div>
        <div><dt>Zeit auf {planet.name}</dt><dd class="num">{formatTime(planet.elapsed)}</dd></div>
        <div><dt>Gesamtspielzeit</dt><dd class="num">{formatTime(meta.totalPlaytime)}</dd></div>
        <div><dt>O₂ insgesamt</dt><dd class="num">{format(planet.oxygenTotal)}</dd></div>
        <div><dt>Save-Version</dt><dd class="num">{SAVE_VERSION}</dd></div>
        <div><dt>Autosave</dt><dd class="num">alle {settings.autosaveSeconds} s</dd></div>
        <div>
          <dt>Offline</dt>
          <dd class="num">
            {Math.round(settings.offlineEfficiency * 100)} %, max. {settings.offlineMaxHours} h
          </dd>
        </div>
      </dl>
    </Panel>

    <Panel title="Spielstand">
      <div class="actions">
        <button class="primary" onclick={onSave}>Jetzt speichern</button>
        <button onclick={onExport}>Exportieren</button>
        <button onclick={onImport} disabled={!transfer.trim()}>Importieren</button>
        <button class="danger" onclick={onWipe}>Löschen</button>
      </div>
      <textarea
        bind:value={transfer}
        spellcheck="false"
        placeholder="Export erscheint hier — oder Save-Text zum Importieren einfügen."
      ></textarea>
    </Panel>
  </div>

  <div class="column side">
    <Panel title="Ereignisse">
      <LogPanel />
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

  .side {
    position: sticky;
    top: 76px;
  }

  .readout {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }

  .big {
    font-size: 44px;
    font-weight: 600;
    color: var(--o2);
    line-height: 1.1;
  }

  .unit {
    font-size: 15px;
    color: var(--muted);
  }

  .rate {
    margin-top: 2px;
    font-size: 13px;
    color: var(--text-dim);
  }

  .note {
    margin: 14px 0 0;
    font-size: 12px;
    line-height: 1.6;
    color: var(--muted);
    border-left: 2px solid var(--line);
    padding-left: 11px;
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    gap: 10px 22px;
    margin: 0;
  }

  .stats div {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    border-bottom: 1px dotted var(--line-soft);
    padding-bottom: 6px;
  }

  dt {
    font-size: 12px;
    color: var(--muted);
  }

  dd {
    margin: 0;
    font-size: 13px;
    color: var(--text);
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 12px;
  }

  @media (max-width: 900px) {
    main {
      grid-template-columns: minmax(0, 1fr);
    }

    .side {
      position: static;
    }
  }
</style>
