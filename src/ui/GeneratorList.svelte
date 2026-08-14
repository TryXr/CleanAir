<script lang="ts">
  import { GENERATORS, type GeneratorDef } from '../data/generators'
  import { findMaterial } from '../data/materials'
  import { format, formatInt, formatRate } from '../engine/format'
  import {
    buyGenerator,
    demolish,
    generatorCost,
    generatorRate,
    isAvailable,
    maxAffordable,
  } from '../systems/production'
  import { generatorCount, planet } from '../state/planet.svelte'
  import { canAffordMaterials } from '../state/run.svelte'
  import { session, type BuyAmount } from '../state/session.svelte'

  const AMOUNTS: BuyAmount[] = [1, 10, 'max']

  /** Gruppenschlüssel eines Generators — Gasart oder Ausgabeart. */
  function groupOf(def: GeneratorDef): string {
    return def.output.kind === 'gas' ? def.output.gas : def.output.kind
  }

  const GROUPS: { key: string; title: string; hint: string }[] = [
    { key: 'o2', title: 'Sauerstoff', hint: 'füllt Vorrat und Luft' },
    { key: 'n2', title: 'Puffer', hint: 'verdünnt die Mischung' },
    { key: 'scrub', title: 'Reinigung', hint: 'baut Schadstoffe ab' },
    { key: 'vent', title: 'Abblasen', hint: 'senkt den N₂-Puffer' },
    { key: 'plant', title: 'Wald', hint: 'Bäume atmen für dich' },
    { key: 'fell', title: 'Holzernte', hint: 'kostet Atmosphäre' },
    { key: 'material', title: 'Abbau', hint: 'füllt das globale Lager' },
  ]

  /** „40 Stein, 25 Holz" — für die Kaufschaltfläche. */
  function materialLabel(def: GeneratorDef, amount: number): string {
    if (!def.materialCost) return ''
    return Object.entries(def.materialCost)
      .map(([id, per]) => `${formatInt(per * Math.max(1, amount))} ${findMaterial(id)?.name ?? id}`)
      .join(', ')
  }

  const visible = $derived(
    GENERATORS.filter((g) => isAvailable(g) && planet.oxygenTotal.gte(g.revealAt)),
  )
  const groups = $derived(
    GROUPS.map((g) => ({ ...g, items: visible.filter((def) => groupOf(def) === g.key) })).filter(
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
    const out = def.output
    const suffix = count > 0 ? '' : ' pro Stück'
    const rate = count > 0 ? generatorRate(def) : null

    if (out.kind === 'gas' && (out.gas === 'scrub' || out.gas === 'vent')) {
      const value = rate ? rate.mul(100) : def.baseRate * 100
      const was = out.gas === 'scrub' ? 'der Schadstoffe' : 'des N₂-Puffers'
      return `${format(value, 3)} % ${was}/s${suffix}`
    }
    if (out.kind === 'gas') {
      const unit = out.gas === 'n2' ? 'N₂' : 'O₂'
      return rate ? formatRate(rate, unit) : `${format(def.baseRate)} ${unit}/s pro Stück`
    }
    if (out.kind === 'plant') {
      return rate ? formatRate(rate, 'Bäume') : `${format(def.baseRate)} Bäume/s pro Stück`
    }
    if (out.kind === 'fell') {
      return rate ? formatRate(rate, 'Bäume') + ' gefällt' : `${format(def.baseRate)} Bäume/s pro Stück`
    }
    if (out.kind === 'housing') {
      // Kapazität, keine Rate — deshalb bewusst ohne „/s".
      const total = generatorCount(def.id) * def.baseRate
      return count > 0
        ? `Wohnraum für ${formatInt(total)}`
        : `Wohnraum für ${formatInt(def.baseRate)} pro Stück`
    }
    if (out.kind === 'supply') {
      const name = out.supply === 'food' ? 'Nahrung' : 'Wasser'
      return rate ? formatRate(rate, name) : `${format(def.baseRate)} ${name}/s pro Stück`
    }
    const name = findMaterial(out.material)?.name ?? out.material
    return rate ? formatRate(rate, name) : `${format(def.baseRate)} ${name}/s pro Stück`
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

{#each groups as group (group.key)}
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
      {@const hasMaterials = canAffordMaterials(def.materialCost, Math.max(1, amount))}
      {@const affordable = amount > 0 && planet.oxygen.gte(cost) && hasMaterials}
      <li>
        <div class="info">
          <div class="line">
            <span class="name">{def.name}</span>
            <span class="count num">{formatInt(count)}</span>
          </div>
          <p class="desc">{def.description}</p>
          <span class="rate num">{rateLabel(def)}</span>
        </div>

        <!-- Abreißen (§17): das Gegenstück zur automatischen Zuwanderung.
             Ohne den Weg zurück wäre jede Wohnkuppel eine Einbahnstraße. -->
        {#if count > 0}
          <button
            class="wreck"
            onclick={() => demolish(def.id)}
            title="Ein Stück abreißen — ohne Rückerstattung"
          >
            Abreißen
          </button>
        {/if}

        <button class="buy" disabled={!affordable} onclick={() => onBuy(def)}>
          <span class="buy-label">
            Kaufen{amount > 1 ? ` ×${formatInt(amount)}` : ''}
          </span>
          <span class="cost num">{amount > 0 ? format(cost) : '—'} O₂</span>
          {#if def.materialCost}
            <span class="cost material num" class:missing={!hasMaterials}>
              {materialLabel(def, amount)}
            </span>
          {/if}
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

  .wreck {
    padding: 6px 10px;
    font-size: 11px;
    color: var(--muted);
  }

  .wreck:hover {
    color: var(--bad);
    border-color: var(--bad);
  }

  .cost.material {
    color: var(--warn);
    font-size: 10px;
  }

  .cost.material.missing {
    color: var(--bad);
  }
</style>
