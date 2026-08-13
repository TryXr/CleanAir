<script lang="ts">
  import { format, formatInt, formatTime } from '../engine/format'
  import { hasNextPlanet, planetForIndex } from '../data/planets'
  import { biomassToNextCore, canPrestige, doPrestige, pendingCores } from '../systems/prestige'
  import { meta } from '../state/meta.svelte'
  import { currentPlanetDef, planet } from '../state/planet.svelte'

  const def = $derived(currentPlanetDef())
  const cores = $derived(pendingCores())
  const toNext = $derived(biomassToNextCore())
  const ready = $derived(canPrestige())
  const next = $derived(planetForIndex(meta.planetsCompleted + 1))
  const isLast = $derived(!hasNextPlanet(meta.planetsCompleted))
</script>

<div class="head">
  <div>
    <span class="cores num">{formatInt(cores)}</span>
    <span class="unit">Genesis-Kerne beim Sprung</span>
  </div>
</div>

<dl class="stats">
  <div><dt>Biomasse</dt><dd class="num">{format(planet.biomass)}</dd></div>
  <div><dt>bis zum nächsten Kern</dt><dd class="num">{format(toNext)}</dd></div>
</dl>

{#if ready}
  <p class="note">
    {def.name} ist abgeschlossen. Generatoren, Upgrades und Atmosphäre bleiben zurück — Kerne,
    Bevölkerung und der Meta-Baum kommen mit.
    {#if planet.settlers.gt(0)}
      {formatInt(planet.settlers)} Menschen bleiben als Kolonie auf {def.name}.
    {/if}
  </p>
{:else}
  <p class="note muted">
    Der Sprung wird frei, sobald {def.name} alle Werte {formatTime(def.stabilitySeconds)} am Stück
    im Zielfenster hält.
  </p>
{/if}

<button class="primary jump" disabled={!ready} onclick={() => doPrestige()}>
  {#if isLast && ready}
    Erneut nach {next.name}
  {:else}
    Sprung nach {next.name}
  {/if}
</button>

<style>
  .head {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }

  .cores {
    font-size: 32px;
    font-weight: 600;
    color: var(--warn);
  }

  .unit {
    font-size: 12px;
    color: var(--muted);
  }

  .stats {
    display: grid;
    gap: 6px;
    margin: 12px 0;
  }

  .stats div {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    border-bottom: 1px dotted var(--line-soft);
    padding-bottom: 5px;
  }

  dt {
    font-size: 11px;
    color: var(--muted);
  }

  dd {
    margin: 0;
    font-size: 13px;
  }

  .note {
    margin: 0 0 12px;
    font-size: 12px;
    line-height: 1.6;
    color: var(--text-dim);
  }

  .note.muted {
    color: var(--muted);
  }

  .jump {
    width: 100%;
    padding: 12px;
    font-weight: 600;
  }
</style>
