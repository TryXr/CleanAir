<script lang="ts">
  import { format, formatInt, formatRate, formatTime } from '../engine/format'
  import {
    foodConsumption,
    housingCapacity,
    isStarving,
    waterConsumption,
  } from '../systems/population'
  import { supplyRate } from '../systems/production'
  import { planet } from '../state/planet.svelte'

  interface Row {
    label: string
    stock: ReturnType<typeof format>
    net: number
    rate: string
    reachSeconds: number
    empty: boolean
  }

  function row(label: string, stock: typeof planet.food, produced: typeof planet.food, used: typeof planet.food): Row {
    const net = produced.sub(used)
    return {
      label,
      stock: format(stock),
      net: net.toNumber(),
      rate: `${net.lt(0) ? '' : '+'}${formatRate(net)}`,
      // Wie lange der Vorrat bei Unterdeckung noch reicht.
      reachSeconds: net.gte(0) ? Infinity : stock.div(net.neg()).toNumber(),
      empty: stock.lte(0),
    }
  }

  const rows = $derived([
    row('Nahrung', planet.food, supplyRate('food'), foodConsumption()),
    row('Wasser', planet.water, supplyRate('water'), waterConsumption()),
  ])

  const beds = $derived(housingCapacity())
  const starving = $derived(isStarving())
</script>

{#if beds.lte(0)}
  <p class="warn">
    Kein Wohnraum. Ohne Wohnkuppel landet niemand — gute Luft allein reicht seit M5 nicht mehr.
  </p>
{/if}

<dl>
  <div>
    <dt>Wohnraum</dt>
    <dd class="num">{formatInt(planet.settlers)} / {formatInt(beds)}</dd>
  </div>
  {#each rows as r (r.label)}
    <div>
      <dt>{r.label}</dt>
      <dd class="num" class:bad={r.empty || r.net < 0}>
        {r.stock}
        <span class="rate" class:bad={r.net < 0}>{r.rate}</span>
      </dd>
    </div>
  {/each}
</dl>

{#if starving}
  <p class="warn">
    Die Vorräte sind leer. Die Siedlung schrumpft, bis wieder genug da ist.
  </p>
{:else}
  {#each rows.filter((r) => r.net < 0 && Number.isFinite(r.reachSeconds)) as r (r.label)}
    <p class="note">
      {r.label} reicht noch <strong class="num">{formatTime(r.reachSeconds)}</strong>.
    </p>
  {/each}
{/if}

<style>
  dl {
    display: grid;
    gap: 7px;
    margin: 0;
  }

  dl div {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
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
    font-size: 14px;
    font-weight: 600;
    white-space: nowrap;
  }

  .rate {
    margin-left: 7px;
    font-size: 11px;
    font-weight: 400;
    color: var(--good);
  }

  .rate.bad,
  dd.bad {
    color: var(--bad);
  }

  .note {
    margin: 10px 0 0;
    font-size: 11px;
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
</style>
