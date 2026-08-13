<script lang="ts">
  import { GENERATORS, type GeneratorDef } from '../data/generators'
  import { format, formatInt, formatRate } from '../engine/format'
  import { buyGenerator, generatorCost, generatorRate, maxAffordable } from '../systems/production'
  import { generatorCount, planet } from '../state/planet.svelte'
  import { session, type BuyAmount } from '../state/session.svelte'

  const AMOUNTS: BuyAmount[] = [1, 10, 'max']

  const visible = $derived(GENERATORS.filter((g) => planet.oxygenTotal.gte(g.revealAt)))

  /** Wie viele Stück ein Klick kauft — bei „Max" abhängig vom Guthaben. */
  function amountFor(def: GeneratorDef): number {
    return session.buyAmount === 'max' ? maxAffordable(def) : session.buyAmount
  }

  function onBuy(def: GeneratorDef): void {
    const amount = amountFor(def)
    if (amount > 0) buyGenerator(def.id, amount)
  }
</script>

<div class="toolbar">
  <span class="hint">Kaufmenge</span>
  {#each AMOUNTS as amount (amount)}
    <button
      class="chip"
      class:active={session.buyAmount === amount}
      onclick={() => (session.buyAmount = amount)}
    >
      {amount === 'max' ? 'Max' : `×${amount}`}
    </button>
  {/each}
</div>

<ul class="generators">
  {#each visible as def (def.id)}
    {@const count = generatorCount(def.id)}
    {@const amount = amountFor(def)}
    {@const cost = generatorCost(def, Math.max(1, amount))}
    {@const affordable = amount > 0 && planet.oxygen.gte(cost)}
    <li>
      <div class="info">
        <div class="line">
          <span class="name">{def.name}</span>
          <span class="count num">{formatInt(count)}</span>
        </div>
        <p class="desc">{def.description}</p>
        <span class="rate num">
          {count > 0 ? formatRate(generatorRate(def)) : `${format(def.baseRate)} O₂/s pro Stück`}
        </span>
      </div>

      <button class="buy" disabled={!affordable} onclick={() => onBuy(def)}>
        <span class="buy-label">
          Kaufen{amount > 1 ? ` ×${formatInt(amount)}` : ''}
        </span>
        <span class="cost num">{amount > 0 ? format(cost) : '—'} O₂</span>
      </button>
    </li>
  {/each}
</ul>

<style>
  .toolbar {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 14px;
  }

  .hint {
    font-size: 10px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--muted);
    margin-right: 4px;
  }

  .chip {
    padding: 3px 11px;
    font-size: 12px;
    border-radius: 99px;
  }

  .chip.active {
    border-color: var(--o2-dim);
    background: #123332;
    color: var(--o2);
  }

  .generators {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  li {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px 14px;
    background: var(--panel-soft);
    border: 1px solid var(--line-soft);
    border-radius: 8px;
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
    font-weight: 600;
    font-size: 14px;
  }

  .count {
    font-size: 13px;
    color: var(--o2);
  }

  .desc {
    margin: 2px 0 4px;
    font-size: 12px;
    color: var(--muted);
  }

  .rate {
    font-size: 12px;
    color: var(--text-dim);
  }

  .buy {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
    min-width: 122px;
    padding: 8px 12px;
  }

  .buy-label {
    font-size: 13px;
  }

  .cost {
    font-size: 11px;
    color: var(--muted);
  }

  .buy:not(:disabled) .cost {
    color: var(--o2);
  }
</style>
