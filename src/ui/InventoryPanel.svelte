<script lang="ts">
  import { MATERIALS } from '../data/materials'
  import { format, formatRate } from '../engine/format'
  import { materialRate } from '../systems/production'
  import { isStorageFull, materialCapacity, storageFraction } from '../systems/storage'
  import { currentPlanetDef } from '../state/planet.svelte'
  import { materialAmount } from '../state/run.svelte'

  /**
   * Das globale Lager (DESIGN.md §16). Es gehört dem Durchlauf, nicht dem
   * Planeten — Holz von hier baut später auch anderswo.
   *
   * Seit M11 ist es endlich (§17). Die Grenze steht bewusst in jeder Zeile
   * und nicht nur als Fußnote: ein Regal, das still überläuft, ist der
   * unangenehmste Weg, Fortschritt zu verlieren.
   */
  const def = $derived(currentPlanetDef())
  const cap = $derived(materialCapacity())

  // Alles anzeigen, was man besitzt oder hier fördern kann. Ein Material,
  // das es auf diesem Planeten nicht gibt und von dem nichts im Lager
  // liegt, wäre nur eine leere Zeile.
  const rows = $derived(
    MATERIALS.map((m) => ({
      def: m,
      amount: materialAmount(m.id),
      rate: materialRate(m.id),
      local: def.materials.includes(m.id),
      full: isStorageFull(m.id),
      fraction: storageFraction(m.id),
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
          <span class="amount" class:full={row.full}>{format(row.amount)}</span>
          <span class="cap">/ {format(cap)}</span>
          {#if row.full}
            <span class="over">voll — Nachschub verfällt</span>
          {:else if row.rate.gt(0)}
            <span class="rate">+{formatRate(row.rate)}</span>
          {/if}
        </dd>
      </div>
      <div class="track" aria-hidden="true">
        <div class="fill" class:full={row.full} style:width="{Math.round(row.fraction * 100)}%"></div>
      </div>
    {/each}
  </dl>

  <p class="hint">
    Das Lager gilt für alle Planeten dieses Durchlaufs. Lagerhallen heben die Grenze — für jedes
    Material zugleich.
  </p>
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
    padding-bottom: 4px;
  }

  .track {
    display: block;
    height: 3px;
    padding: 0;
    margin-bottom: 4px;
    background: var(--line-soft);
    border-radius: 99px;
    overflow: hidden;
  }

  .fill {
    height: 100%;
    background: var(--o2-dim);
  }

  .fill.full {
    background: var(--warn);
  }

  .amount.full {
    color: var(--warn);
  }

  .cap {
    font-size: 11px;
    font-weight: 400;
    color: var(--muted);
  }

  .over {
    margin-left: 7px;
    font-size: 10px;
    font-weight: 400;
    color: var(--warn);
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
