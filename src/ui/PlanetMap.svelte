<script lang="ts">
  import { findMaterial } from '../data/materials'
  import { rocketFor } from '../data/rockets'
  import { format, formatInt } from '../engine/format'
  import { buildRocket, canBuildRocket, canTravelTo, planetSummaries, travelTo } from '../systems/travel'
  import { planet } from '../state/planet.svelte'
  import { materialAmount } from '../state/run.svelte'

  const summaries = $derived(planetSummaries())
  const rocket = $derived(rocketFor(planet.id))
  const buildable = $derived(canBuildRocket())

  /** Fehlbetrag je Material, damit man sieht, woran es hakt. */
  function shortfall(id: string, needed: number): number {
    const have = materialAmount(id).toNumber()
    return Math.max(0, needed - have)
  }
</script>

<ul class="planets">
  {#each summaries as p (p.def.id)}
    <li class:active={p.active} class:locked={!p.unlocked}>
      <div class="info">
        <div class="line">
          <span class="name">{p.def.name}</span>
          {#if p.active}
            <span class="tag here">hier</span>
          {:else if !p.unlocked}
            <span class="tag">unerreichbar</span>
          {:else if !p.visited}
            <span class="tag new">neu</span>
          {/if}
          {#if p.completed}<span class="tag done">stabil</span>{/if}
        </div>
        <span class="detail num">
          {#if p.visited || p.active}
            {formatInt(p.settlers)} Menschen · Biomasse {format(p.biomass)}
          {:else}
            noch nie betreten
          {/if}
        </span>
      </div>

      {#if !p.active && p.unlocked}
        <button onclick={() => travelTo(p.def.id)} disabled={!canTravelTo(p.def.id)}>
          {p.visited ? 'Zurück' : 'Hinfliegen'}
        </button>
      {/if}
    </li>
  {/each}
</ul>

{#if rocket}
  <div class="rocket" class:done={planet.rocketBuilt}>
    <div class="line">
      <span class="name">{rocket.name}</span>
      {#if planet.rocketBuilt}<span class="tag done">gebaut</span>{/if}
    </div>
    <p class="desc">{rocket.description}</p>

    {#if !planet.rocketBuilt}
      <dl class="cost">
        <div>
          <dt>O₂</dt>
          <dd class="num" class:missing={planet.oxygen.lt(rocket.oxygenCost)}>
            {format(rocket.oxygenCost)}
          </dd>
        </div>
        {#each Object.entries(rocket.materialCost ?? {}) as [id, needed] (id)}
          <div>
            <dt>{findMaterial(id)?.name ?? id}</dt>
            <dd class="num" class:missing={shortfall(id, needed) > 0}>
              {formatInt(needed)}
              {#if shortfall(id, needed) > 0}
                <span class="gap">− {formatInt(shortfall(id, needed))} fehlen</span>
              {/if}
            </dd>
          </div>
        {/each}
      </dl>

      <button class="primary build" disabled={!buildable} onclick={() => buildRocket()}>
        Rakete bauen
      </button>
      <p class="hint">
        Die Rakete ist der Weg zum nächsten Planeten — nicht das Ziel dieses Planeten. Der gilt
        erst als fertig, wenn seine Atmosphäre stabil steht.
      </p>
    {/if}
  </div>
{/if}

<style>
  .planets {
    list-style: none;
    margin: 0 0 14px;
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
    border-color: var(--o2-dim);
  }

  li.locked {
    opacity: 0.45;
  }

  .info {
    flex: 1;
    min-width: 0;
  }

  .line {
    display: flex;
    align-items: baseline;
    gap: 8px;
    flex-wrap: wrap;
  }

  .name {
    font-size: 14px;
    font-weight: 600;
  }

  .tag {
    font-size: 10px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--muted);
    border: 1px solid var(--line);
    border-radius: 99px;
    padding: 1px 7px;
  }

  .tag.here {
    color: var(--o2);
    border-color: var(--o2-dim);
  }

  .tag.done {
    color: var(--good);
    border-color: rgba(111, 207, 130, 0.4);
  }

  .tag.new {
    color: var(--warn);
    border-color: rgba(230, 180, 81, 0.4);
  }

  .detail {
    display: block;
    margin-top: 3px;
    font-size: 11px;
    color: var(--muted);
  }

  li button {
    padding: 6px 12px;
    font-size: 12px;
  }

  .rocket {
    padding: 12px 13px;
    background: var(--panel-soft);
    border: 1px solid var(--line-soft);
    border-radius: 8px;
  }

  .rocket.done {
    border-color: rgba(111, 207, 130, 0.35);
  }

  .desc {
    margin: 5px 0 10px;
    font-size: 12px;
    line-height: 1.6;
    color: var(--muted);
  }

  .cost {
    display: grid;
    gap: 5px;
    margin: 0 0 11px;
  }

  .cost div {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    border-bottom: 1px dotted var(--line-soft);
    padding-bottom: 4px;
  }

  dt {
    font-size: 11px;
    color: var(--muted);
  }

  dd {
    margin: 0;
    font-size: 12px;
    color: var(--text-dim);
  }

  dd.missing {
    color: var(--bad);
  }

  .gap {
    margin-left: 6px;
    font-size: 10px;
  }

  .build {
    width: 100%;
    padding: 10px;
    font-weight: 600;
  }

  .hint {
    margin: 9px 0 0;
    font-size: 11px;
    line-height: 1.5;
    color: var(--muted);
  }
</style>
