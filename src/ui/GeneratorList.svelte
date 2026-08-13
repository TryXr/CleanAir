<script lang="ts">
  import { GENERATORS, type GasKind, type GeneratorDef } from '../data/generators'
  import { format, formatInt, formatRate } from '../engine/format'
  import { buyGenerator, generatorCost, generatorRate, maxAffordable } from '../systems/production'
  import { generatorCount, planet, usesNitrogen, usesPollution } from '../state/planet.svelte'
  import { session, type BuyAmount } from '../state/session.svelte'

  const AMOUNTS: BuyAmount[] = [1, 10, 'max']

  const GROUPS: { gas: GasKind; title: string; hint: string }[] = [
    { gas: 'o2', title: 'Sauerstoff', hint: 'füllt Vorrat und Luft' },
    { gas: 'n2', title: 'Puffer', hint: 'verdünnt die Mischung' },
    { gas: 'scrub', title: 'Reinigung', hint: 'baut Schadstoffe ab' },
  ]

  /** Kennt der Planet die Mechanik, an der dieser Generator arbeitet? */
  function available(def: GeneratorDef): boolean {
    if (def.gas === 'n2') return usesNitrogen()
    if (def.gas === 'scrub') return usesPollution()
    return true
  }

  const visible = $derived(
    GENERATORS.filter((g) => available(g) && planet.oxygenTotal.gte(g.revealAt)),
  )
  const groups = $derived(
    GROUPS.map((g) => ({ ...g, items: visible.filter((def) => def.gas === g.gas) })).filter(
      (g) => g.items.length > 0,
    ),
  )

  /** Wie viele Stück ein Klick kauft — bei „Max" abhängig vom Guthaben. */
  function amountFor(def: GeneratorDef): number {
    return session.buyAmount === 'max' ? maxAffordable(def) : session.buyAmount
  }

  function onBuy(def: GeneratorDef): void {
    const amount = amountFor(def)
    if (amount > 0) buyGenerator(def.id, amount)
  }

  /**
   * Wäscher arbeiten anteilig statt absolut, also braucht ihre Zeile eine
   * eigene Einheit — sonst stünde dort „0.002/s" ohne Bezugsgröße.
   */
  function rateLabel(def: GeneratorDef): string {
    const count = generatorCount(def.id)
    if (def.gas === 'scrub') {
      const value = count > 0 ? generatorRate(def).mul(100) : def.baseRate * 100
      return `${format(value, 3)} % der Schadstoffe/s${count > 0 ? '' : ' pro Stück'}`
    }
    const unit = def.gas === 'n2' ? 'N₂' : 'O₂'
    return count > 0
      ? formatRate(generatorRate(def), unit)
      : `${format(def.baseRate)} ${unit}/s pro Stück`
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

{#each groups as group (group.gas)}
  <!-- Überschriften erst, wenn es mehr als eine Gruppe gibt: auf Aurora
       wäre „Sauerstoff" über der einzigen Liste nur Lärm. -->
  {#if groups.length > 1}
    <h3 class="group">
      {group.title}<span class="group-hint">{group.hint}</span>
    </h3>
  {/if}

  <ul class="generators">
    {#each group.items as def (def.id)}
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
          <span class="rate num">{rateLabel(def)}</span>
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
{/each}

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

  .group {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin: 18px 0 8px;
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-dim);
  }

  .group:first-of-type {
    margin-top: 0;
  }

  .group-hint {
    font-size: 10px;
    letter-spacing: 0;
    text-transform: none;
    color: var(--muted);
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
