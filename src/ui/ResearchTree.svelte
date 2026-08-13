<script lang="ts">
  import { BRANCHES, RESEARCH, findResearch } from '../data/research'
  import { format, formatRate } from '../engine/format'
  import { researchRate } from '../systems/population'
  import {
    buyResearch,
    canBuyResearch,
    researchCost,
    researchLevel,
    researchUnlocked,
    researchVisible,
  } from '../systems/research'
  import { meta } from '../state/meta.svelte'

  const rate = $derived(researchRate())

  const branches = $derived(
    BRANCHES.map((branch) => ({
      ...branch,
      nodes: RESEARCH.filter((r) => r.branch === branch.id && researchVisible(r)),
    })).filter((b) => b.nodes.length > 0),
  )

  function requirementNames(ids: readonly string[] | undefined): string {
    if (!ids) return ''
    return ids.map((id) => findResearch(id)?.name ?? id).join(', ')
  }
</script>

<p class="balance">
  Verfügbar: <strong class="num">{format(meta.research)}</strong> Forschungspunkte
  <span class="rate num">+{formatRate(rate)}</span>
</p>

{#if branches.length === 0}
  <p class="empty">
    Forschung entsteht aus Bevölkerung. Sobald Menschen auf einem Planeten leben, füllt sich der
    Baum.
  </p>
{/if}

{#each branches as branch (branch.id)}
  <h3 class="branch">
    {branch.name}<span class="branch-hint">{branch.hint}</span>
  </h3>

  <div class="grid">
    {#each branch.nodes as node (node.id)}
      {@const level = researchLevel(node.id)}
      {@const maxed = level >= node.maxLevel}
      {@const unlocked = researchUnlocked(node)}
      <button
        class="card"
        class:maxed
        class:locked={!unlocked}
        disabled={!canBuyResearch(node.id)}
        onclick={() => buyResearch(node.id)}
      >
        <span class="line">
          <span class="name">{node.name}</span>
          <span class="level num">{level} / {node.maxLevel}</span>
        </span>
        <span class="desc">{node.description}</span>
        {#if maxed}
          <span class="cost good">ausgereizt</span>
        {:else if !unlocked}
          <span class="cost muted">benötigt {requirementNames(node.requires)}</span>
        {:else}
          <span class="cost num">{format(researchCost(node))} FP</span>
        {/if}
      </button>
    {/each}
  </div>
{/each}

<style>
  .balance {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin: 0 0 14px;
    font-size: 12px;
    color: var(--muted);
  }

  .balance strong {
    color: var(--o2);
    font-size: 14px;
  }

  .balance .rate {
    margin-left: auto;
    color: var(--text-dim);
    font-size: 11px;
  }

  .empty {
    margin: 0;
    font-size: 12px;
    line-height: 1.6;
    color: var(--muted);
  }

  .branch {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin: 16px 0 8px;
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-dim);
  }

  .branch:first-of-type {
    margin-top: 0;
  }

  .branch-hint {
    font-size: 10px;
    letter-spacing: 0;
    text-transform: none;
    color: var(--muted);
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(196px, 1fr));
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

  .line {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    width: 100%;
  }

  .name {
    font-size: 13px;
    font-weight: 600;
  }

  .level {
    font-size: 11px;
    color: var(--o2);
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

  .cost.good {
    color: var(--good);
  }

  .cost.muted {
    color: var(--muted);
    font-size: 11px;
  }

  .card.locked {
    opacity: 0.4;
  }

  .card.maxed {
    opacity: 0.6;
    border-style: dashed;
  }
</style>
