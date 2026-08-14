<script lang="ts">
  import { formatInt, formatRate } from '../engine/format'
  import {
    assign,
    canAssign,
    laborFactor,
    staffOn,
    staffedGenerators,
    totalSlots,
    unassign,
    unassigned,
  } from '../systems/labor'
  import { generatorRate } from '../systems/production'
  import { planet } from '../state/planet.svelte'

  /**
   * Zuweisung von Bewohnern an Anlagen (§17).
   *
   * Der Kern des Kurswechsels sichtbar gemacht: eine Anlage ohne Besetzung
   * zeigt „steht still", nicht bloß eine kleinere Zahl. Das soll unangenehm
   * aussehen — es ist die Hauptentscheidung des Spiels.
   */
  const anlagen = $derived(staffedGenerators())
  const frei = $derived(unassigned())
  const satt = $derived(planet.satiety)

  function einheit(def: (typeof anlagen)[number]): string {
    const out = def.output
    if (out.kind === 'gas') return out.gas === 'n2' ? 'N₂' : 'O₂'
    if (out.kind === 'supply') return out.supply === 'food' ? 'Nahrung' : 'Wasser'
    if (out.kind === 'plant') return 'Bäume'
    return ''
  }
</script>

<div class="head">
  <div>
    <span class="count num">{formatInt(frei)}</span>
    <span class="unit">ohne Aufgabe</span>
  </div>
  <div class="satiety num" class:low={satt < 0.6}>
    Arbeitsleistung {Math.round(satt * 100)} %
  </div>
</div>

{#if satt < 0.95}
  <p class="warn">
    Schlecht versorgte Leute arbeiten langsamer. Bei leeren Vorräten steht alles still — sterben
    tut aber niemand.
  </p>
{/if}

{#if anlagen.length === 0}
  <p class="empty">
    Noch keine Anlage mit Arbeitsplätzen gebaut. Unter „Aufbau" entsteht die erste.
  </p>
{:else}
  <ul>
    {#each anlagen as def (def.id)}
      {@const belegt = staffOn(def.id)}
      {@const plaetze = totalSlots(def)}
      {@const leer = belegt === 0}
      <li class:idle={leer}>
        <div class="info">
          <div class="line">
            <span class="name">{def.name}</span>
            <span class="slots num" class:full={belegt >= plaetze}>{belegt} / {plaetze}</span>
          </div>
          <span class="rate num">
            {#if leer}
              steht still — niemand zugewiesen
            {:else}
              {formatRate(generatorRate(def), einheit(def))}
              · Leistung {Math.round(laborFactor(def) * 100)} %
            {/if}
          </span>
        </div>

        <div class="controls">
          <button onclick={() => unassign(def.id)} disabled={belegt <= 0} title="Einen abziehen">
            −
          </button>
          <button onclick={() => assign(def.id)} disabled={!canAssign(def.id)} title="Einen zuweisen">
            +
          </button>
        </div>
      </li>
    {/each}
  </ul>
{/if}

<style>
  .head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
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

  .satiety {
    font-size: 12px;
    color: var(--good);
  }

  .satiety.low {
    color: var(--warn);
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

  li.idle {
    border-left: 2px solid var(--warn);
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

  .slots {
    font-size: 12px;
    color: var(--muted);
  }

  .slots.full {
    color: var(--o2);
  }

  .rate {
    display: block;
    margin-top: 3px;
    font-size: 11px;
    color: var(--text-dim);
  }

  li.idle .rate {
    color: var(--warn);
  }

  .controls {
    display: flex;
    gap: 5px;
  }

  .controls button {
    width: 30px;
    padding: 5px 0;
    font-size: 15px;
    line-height: 1;
  }
</style>
