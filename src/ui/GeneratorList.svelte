<script lang="ts">
  import { GENERATOR_GROUPS, GENERATORS, groupOf, type GeneratorDef } from '../data/generators'
  import { findMaterial } from '../data/materials'
  import { format, formatInt, formatRate, formatTime } from '../engine/format'
  import {
    demolish,
    generatorCost,
    generatorRate,
    isAvailable,
    maxAffordable,
  } from '../systems/production'
  import { buildRate, orderGenerator } from '../systems/construction'
  import { craftBlocker, effectiveCraftRate } from '../systems/crafting'
  import { generatorCount, pendingUnits, planet } from '../state/planet.svelte'
  import { canAffordMaterials } from '../state/run.svelte'
  import { session, type BuyAmount } from '../state/session.svelte'

  const AMOUNTS: BuyAmount[] = [1, 10, 'max']

  /**
   * Wie lange dieses Stück bei der aktuellen Kolonne dauert (M11).
   *
   * Bewusst an der Kaufschaltfläche und nicht nur auf der Baustelle: die
   * Entscheidung „lohnt sich das jetzt?" fällt hier, und eine Bauzeit, die
   * man erst nach dem Bezahlen sieht, wäre eine Überraschung statt einer
   * Information.
   */
  function buildLabel(def: GeneratorDef, amount: number): string {
    const rate = buildRate()
    if (rate <= 0) return 'Bauzeit unbestimmt'
    return `${formatTime((def.buildWork * Math.max(1, amount)) / rate)} Bauzeit`
  }

  /** „2 Eisenerz → 1 Eisen" — das Rezept einer Verarbeitungsanlage (M12). */
  function recipeLabel(def: GeneratorDef): string {
    if (def.output.kind !== 'craft') return ''
    const ein = Object.entries(def.output.input)
      .map(([id, per]) => `${formatInt(per)} ${findMaterial(id)?.name ?? id}`)
      .join(' + ')
    // Der Ausgang ist immer genau eins, also die Einzahl.
    const m = findMaterial(def.output.material)
    return `${ein} → 1 ${m?.singular ?? m?.name ?? def.output.material}`
  }

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
    GENERATOR_GROUPS.map((g) => ({
      ...g,
      items: visible.filter((def) => groupOf(def) === g.key),
    })).filter(
      (g) => g.items.length > 0,
    ),
  )

  /** Wie viele Stück ein Klick kauft — bei „Max" abhängig vom Guthaben. */
  function amountFor(def: GeneratorDef): number {
    return session.buyAmount === 'max' ? maxAffordable(def) : session.buyAmount
  }

  function onBuy(def: GeneratorDef): void {
    const amount = amountFor(def)
    if (amount > 0) orderGenerator(def.id, amount)
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
    if (out.kind === 'storage') {
      const total = generatorCount(def.id) * def.baseRate
      return count > 0
        ? `+${formatInt(total)} Platz je Material`
        : `+${formatInt(def.baseRate)} Platz je Material pro Stück`
    }
    if (out.kind === 'supply') {
      const name = out.supply === 'food' ? 'Nahrung' : 'Wasser'
      return rate ? formatRate(rate, name) : `${format(def.baseRate)} ${name}/s pro Stück`
    }
    if (out.kind === 'craft') {
      /*
       * Bewusst die *wirksame* Rate, nicht die theoretische: eine Presse ohne
       * Eisen zeigt sonst fröhlich 0,36 Platten/s an, während nichts
       * passiert. Der Grund dafür steht in der Zeile darunter (craftBlocker).
       */
      const name = findMaterial(out.material)?.name ?? out.material
      return rate
        ? formatRate(effectiveCraftRate(def), name)
        : `${format(def.baseRate)} ${name}/s pro Stück`
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
      {@const imBau = pendingUnits(def.id)}
      {@const amount = amountFor(def)}
      {@const cost = generatorCost(def, Math.max(1, amount))}
      {@const hasMaterials = canAffordMaterials(def.materialCost, Math.max(1, amount))}
      {@const affordable = amount > 0 && planet.oxygen.gte(cost) && hasMaterials}
      <li>
        <div class="info">
          <div class="line">
            <span class="name">{def.name}</span>
            <span class="count num">{formatInt(count)}</span>
            <!-- Bestelltes gehört sichtbar neben das Gebaute: sonst wirkt
                 ein Klick folgenlos und man bestellt dasselbe zweimal. -->
            {#if imBau > 0}
              <span class="pending num">+{formatInt(imBau)} im Bau</span>
            {/if}
          </div>
          <p class="desc">{def.description}</p>
          <span class="rate num">{rateLabel(def)}</span>
          <!-- Das Rezept steht auch ohne gebautes Stück da: es ist die
               Information, nach der man entscheidet, ob man die Stufe davor
               überhaupt schon hat. -->
          {#if def.output.kind === 'craft'}
            <span class="recipe num">{recipeLabel(def)}</span>
            {@const stockt = count > 0 ? craftBlocker(def) : null}
            {#if stockt}
              <span class="stalled num">steht still — {stockt}</span>
            {/if}
          {/if}
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
            Bauen{amount > 1 ? ` ×${formatInt(amount)}` : ''}
          </span>
          <span class="cost num">{amount > 0 ? format(cost) : '—'} O₂</span>
          {#if def.materialCost}
            <span class="cost material num" class:missing={!hasMaterials}>
              {materialLabel(def, amount)}
            </span>
          {/if}
          <span class="cost time num">{buildLabel(def, amount)}</span>
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

  .recipe {
    display: block;
    margin-top: 3px;
    font-size: 11px;
    color: var(--muted);
  }

  .stalled {
    display: block;
    margin-top: 2px;
    font-size: 11px;
    color: var(--warn);
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

  .pending {
    font-size: 11px;
    color: var(--warn);
  }

  .cost.time {
    font-size: 10px;
    color: var(--muted);
  }

  .cost.material {
    color: var(--warn);
    font-size: 10px;
  }

  .cost.material.missing {
    color: var(--bad);
  }
</style>
