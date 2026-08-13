<script lang="ts">
  import { format, formatInt } from '../engine/format'
  import { meta } from '../state/meta.svelte'
  import { planet } from '../state/planet.svelte'
  import { session } from '../state/session.svelte'

  const saveLabel = $derived(
    session.saveFailed
      ? 'Speichern fehlgeschlagen'
      : session.lastSavedAt === 0
        ? 'noch nicht gespeichert'
        : `gespeichert ${new Date(session.lastSavedAt).toLocaleTimeString('de-DE')}`,
  )
</script>

<header class="topbar">
  <div class="brand">
    <span class="mark">◍</span>
    <div>
      <h1>CleanAir</h1>
      <span class="sub">{planet.name} · Planet {meta.planetsCompleted + 1}</span>
    </div>
  </div>

  <div class="resources">
    <div class="res accent">
      <span class="label">O₂</span>
      <span class="value num">{format(planet.oxygen)}</span>
    </div>
    <div class="res">
      <span class="label">Bevölkerung</span>
      <span class="value num">{formatInt(meta.population)}</span>
    </div>
    <div class="res">
      <span class="label">Credits</span>
      <span class="value num">{format(meta.credits)}</span>
    </div>
    <div class="res">
      <span class="label">Genesis-Kerne</span>
      <span class="value num">{formatInt(meta.genesisCores)}</span>
    </div>
  </div>

  <div class="save" class:failed={session.saveFailed}>{saveLabel}</div>
</header>

<style>
  .topbar {
    display: flex;
    align-items: center;
    gap: 24px;
    flex-wrap: wrap;
    padding: 12px 20px;
    background: rgba(8, 14, 20, 0.86);
    border-bottom: 1px solid var(--line);
    backdrop-filter: blur(6px);
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 11px;
  }

  .mark {
    font-size: 26px;
    color: var(--o2);
    line-height: 1;
  }

  h1 {
    font-size: 17px;
    letter-spacing: 0.04em;
  }

  .sub {
    display: block;
    font-size: 11px;
    color: var(--muted);
  }

  .resources {
    display: flex;
    gap: 22px;
    flex-wrap: wrap;
    margin-left: auto;
  }

  .res {
    display: flex;
    flex-direction: column;
    min-width: 84px;
  }

  .label {
    font-size: 10px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .value {
    font-size: 17px;
    font-weight: 600;
  }

  .accent .value {
    color: var(--o2);
  }

  .save {
    font-size: 11px;
    color: var(--muted);
    white-space: nowrap;
  }

  .save.failed {
    color: var(--bad);
  }
</style>
