<script lang="ts">
  import { META_UPGRADES, findMetaUpgrade } from '../data/metaUpgrades'
  import { formatInt } from '../engine/format'
  import { metaRequirementsMet } from '../systems/metaEffects'
  import { buyMetaUpgrade, canBuyMetaUpgrade } from '../systems/prestige'
  import { meta } from '../state/meta.svelte'

  function requirementNames(ids: readonly string[] | undefined): string {
    if (!ids) return ''
    return ids.map((id) => findMetaUpgrade(id)?.name ?? id).join(', ')
  }
</script>

<p class="balance">
  Verfügbar: <strong class="num">{formatInt(meta.genesisCores)}</strong> Genesis-Kerne
</p>

<div class="grid">
  {#each META_UPGRADES as node (node.id)}
    {@const owned = meta.metaUpgrades.includes(node.id)}
    {@const unlocked = metaRequirementsMet(node.id)}
    {@const buyable = canBuyMetaUpgrade(node.id)}
    <button
      class="card"
      class:owned
      class:locked={!unlocked && !owned}
      disabled={!buyable}
      onclick={() => buyMetaUpgrade(node.id)}
    >
      <span class="name">{node.name}</span>
      <span class="desc">{node.description}</span>
      {#if owned}
        <span class="cost good">freigeschaltet</span>
      {:else if !unlocked}
        <span class="cost muted">benötigt {requirementNames(node.requires)}</span>
      {:else}
        <span class="cost num">{node.cost} {node.cost === 1 ? 'Kern' : 'Kerne'}</span>
      {/if}
    </button>
  {/each}
</div>

<style>
  .balance {
    margin: 0 0 12px;
    font-size: 12px;
    color: var(--muted);
  }

  .balance strong {
    color: var(--warn);
    font-size: 14px;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
    gap: 9px;
  }

  .card {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
    text-align: left;
    padding: 11px;
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
    color: var(--warn);
  }

  .cost.good {
    color: var(--good);
  }

  .cost.muted {
    color: var(--muted);
    font-size: 11px;
  }

  .card.owned {
    opacity: 0.6;
    border-style: dashed;
  }

  .card.locked {
    opacity: 0.4;
  }
</style>
