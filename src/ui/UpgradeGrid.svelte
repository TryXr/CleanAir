<script lang="ts">
  import { UPGRADES } from '../data/upgrades'
  import { format } from '../engine/format'
  import { buyUpgrade } from '../systems/production'
  import { hasUpgrade, planet } from '../state/planet.svelte'

  const visible = $derived(UPGRADES.filter((u) => planet.oxygenTotal.gte(u.revealAt)))
</script>

{#if visible.length === 0}
  <p class="empty">Noch keine Verbesserungen verfügbar. Setz weiter O₂ frei.</p>
{:else}
  <div class="grid">
    {#each visible as upgrade (upgrade.id)}
      {@const owned = hasUpgrade(upgrade.id)}
      {@const affordable = !owned && planet.oxygen.gte(upgrade.cost)}
      <button
        class="card"
        class:owned
        disabled={owned || !affordable}
        onclick={() => buyUpgrade(upgrade.id)}
      >
        <span class="name">{upgrade.name}</span>
        <span class="desc">{upgrade.description}</span>
        <span class="cost num">
          {owned ? 'gekauft' : `${format(upgrade.cost)} O₂`}
        </span>
      </button>
    {/each}
  </div>
{/if}

<style>
  .empty {
    margin: 0;
    font-size: 12px;
    color: var(--muted);
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(196px, 1fr));
    gap: 10px;
  }

  .card {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
    text-align: left;
    padding: 12px;
    background: var(--panel-soft);
  }

  .name {
    font-size: 13px;
    font-weight: 600;
  }

  .desc {
    font-size: 11px;
    line-height: 1.5;
    color: var(--muted);
  }

  .cost {
    margin-top: auto;
    padding-top: 4px;
    font-size: 12px;
    color: var(--o2);
  }

  .card:disabled .cost {
    color: var(--muted);
  }

  .card.owned {
    opacity: 0.55;
    border-style: dashed;
  }

  .card.owned .cost {
    color: var(--good);
  }
</style>
