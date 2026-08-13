<script lang="ts">
  import { MATERIALS } from '../data/materials'
  import { format, formatRate } from '../engine/format'
  import { materialRate } from '../systems/production'
  import { currentPlanetDef } from '../state/planet.svelte'
  import { materialAmount } from '../state/run.svelte'

  /**
   * Das globale Lager (DESIGN.md §16). Es gehört dem Durchlauf, nicht dem
   * Planeten — Holz von hier baut später auch anderswo.
   */
  const def = $derived(currentPlanetDef())

  // Alles anzeigen, was man besitzt oder hier fördern kann. Ein Material,
  // das es auf diesem Planeten nicht gibt und von dem nichts im Lager
  // liegt, wäre nur eine leere Zeile.
  const rows = $derived(
    MATERIALS.map((m) => ({
      def: m,
      amount: materialAmount(m.id),
      rate: materialRate(m.id),
      local: def.materials.includes(m.id),
    })).filter((r) => r.amount.gt(0) || r.local),
  )
</script>

{#if rows.length === 0}
  <p class="empty">
    Auf {def.name} gibt es nichts abzubauen. Materialien warten auf anderen Planeten.
  </p>
{:else}
  <dl>
    {#each rows as row (row.def.id)}
      <div>
        <dt>
          {row.def.name}
          {#if !row.local}<span class="foreign">nicht hier</span>{/if}
        </dt>
        <dd class="num">
          {format(row.amount)}
          {#if row.rate.gt(0)}<span class="rate">+{formatRate(row.rate)}</span>{/if}
        </dd>
      </div>
    {/each}
  </dl>

  <p class="hint">Das Lager gilt für alle Planeten dieses Durchlaufs.</p>
{/if}

<style>
  .empty {
    margin: 0;
    font-size: 12px;
    line-height: 1.6;
    color: var(--muted);
  }

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
    color: var(--text-dim);
  }

  .foreign {
    margin-left: 6px;
    font-size: 10px;
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

  .hint {
    margin: 10px 0 0;
    font-size: 11px;
    color: var(--muted);
  }
</style>
