<script lang="ts">
  import { findGenerator } from '../data/generators'
  import { formatInt, formatTime } from '../engine/format'
  import {
    buildRate,
    cancelSite,
    secondsUntilDone,
    siteProgress,
  } from '../systems/construction'
  import { assignBuilder, canAssignBuilder, unassignBuilder, unassigned } from '../systems/labor'
  import { planet } from '../state/planet.svelte'

  /**
   * Die Baustelle (M11, §17).
   *
   * Hier wird sichtbar, was M11 ausmacht: bezahlt ist nicht gebaut. Die
   * Kolonne arbeitet die Reihe von oben ab, und wer niemanden abstellt,
   * schaut den Bauautomaten beim Kriechen zu.
   */
  const sites = $derived(planet.sites)
  const frei = $derived(unassigned())
  const rate = $derived(buildRate())

  /** Größere Schritte, weil die alten Planeten mit Tausenden rechnen. */
  const STEPS = [1, 10] as const

  function alleZuweisen(): void {
    assignBuilder(Math.floor(frei.toNumber()))
  }
</script>

<div class="head">
  <div>
    <span class="count num">{formatInt(planet.builders)}</span>
    <span class="unit">auf der Baustelle</span>
  </div>
  <div class="rate num">{rate.toFixed(2)} Arbeit/s</div>
</div>

<div class="controls">
  {#each STEPS as step (step)}
    <button onclick={() => unassignBuilder(step)} disabled={planet.builders <= 0}>−{step}</button>
  {/each}
  {#each STEPS as step (step)}
    <button onclick={() => assignBuilder(step)} disabled={!canAssignBuilder()}>+{step}</button>
  {/each}
  <button onclick={alleZuweisen} disabled={!canAssignBuilder()}>alle</button>
  <span class="free num">{formatInt(frei)} ohne Aufgabe</span>
</div>

{#if planet.builders === 0}
  <!-- Der Grundtakt ist Absicht (sonst wäre jeder leere Planet eine
       Sackgasse), aber er soll sich nach Verlegenheit anfühlen. -->
  <p class="warn">
    Niemand baut. Die Bauautomaten der Landefähre arbeiten allein weiter — quälend langsam.
  </p>
{/if}

{#if sites.length === 0}
  <p class="empty">Keine Baustelle offen. Unter „Anlagen" beginnt jeder Bau.</p>
{:else}
  <ul>
    {#each sites as site, i (i)}
      {@const def = findGenerator(site.id)}
      {#if def}
        {@const anteil = siteProgress(site)}
        <li class:active={i === 0}>
          <div class="info">
            <div class="line">
              <span class="name">{def.name}</span>
              {#if site.remaining > 1}
                <span class="left num">×{site.remaining}</span>
              {/if}
              <span class="eta num">{formatTime(secondsUntilDone(i))}</span>
            </div>
            <div class="bar" aria-hidden="true">
              <div class="fill" style:width="{Math.round(anteil * 100)}%"></div>
            </div>
            <span class="state num">
              {#if i === 0}
                {Math.round(anteil * 100)} % am nächsten Stück
              {:else}
                wartet
              {/if}
            </span>
          </div>

          <!-- Abbrechen erstattet die noch nicht gebauten Stück vollständig.
               Ein Fehlklick auf „Max" darf keine Strafe sein. -->
          <button
            class="cancel"
            onclick={() => cancelSite(i)}
            title="Abbrechen — offene Stück werden erstattet"
          >
            Abbrechen
          </button>
        </li>
      {/if}
    {/each}
  </ul>
{/if}

<style>
  .head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 10px;
  }

  .count {
    font-size: 26px;
    font-weight: 600;
    color: var(--o2);
  }

  .unit {
    font-size: 12px;
    color: var(--muted);
    margin-left: 6px;
  }

  .head .rate {
    font-size: 12px;
    color: var(--text-dim);
  }

  .controls {
    display: flex;
    align-items: center;
    gap: 5px;
    margin-bottom: 12px;
  }

  .controls button {
    min-width: 34px;
    padding: 5px 8px;
    font-size: 12px;
    line-height: 1;
  }

  .free {
    margin-left: auto;
    font-size: 11px;
    color: var(--muted);
  }

  .warn {
    margin: 0 0 12px;
    font-size: 12px;
    line-height: 1.6;
    color: var(--warn);
    border-left: 2px solid var(--warn);
    padding-left: 11px;
  }

  .empty {
    margin: 0;
    font-size: 12px;
    line-height: 1.6;
    color: var(--muted);
  }

  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  li {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    background: var(--panel-soft);
    border: 1px solid var(--line-soft);
    border-radius: 8px;
  }

  li.active {
    border-left: 2px solid var(--o2-dim);
  }

  .info {
    flex: 1;
    min-width: 0;
  }

  .line {
    display: flex;
    align-items: baseline;
    gap: 10px;
  }

  .name {
    font-size: 13px;
    font-weight: 600;
  }

  .left {
    font-size: 12px;
    color: var(--o2);
  }

  .eta {
    margin-left: auto;
    font-size: 11px;
    color: var(--muted);
  }

  .bar {
    height: 4px;
    margin: 6px 0 4px;
    background: var(--line-soft);
    border-radius: 99px;
    overflow: hidden;
  }

  .fill {
    height: 100%;
    background: var(--o2-dim);
  }

  .state {
    font-size: 11px;
    color: var(--text-dim);
  }

  li:not(.active) .state {
    color: var(--muted);
  }

  .cancel {
    padding: 6px 10px;
    font-size: 11px;
    color: var(--muted);
  }

  .cancel:hover {
    color: var(--bad);
    border-color: var(--bad);
  }
</style>
