<script lang="ts">
  /**
   * Die Werkstatt (M14, §18).
   *
   * Der Unterschied zur Anlagenliste steht in einer Zeile: hier entsteht
   * nichts dauerhaft Stehendes, sondern ein Stück Ware. Bezahlt wird in
   * Material und Arbeitszeit — kein O₂, weil §17 von O₂ als Währung
   * wegführt und ein neues System sie nicht wieder einführen soll.
   *
   * Die Bestellung landet in derselben Reihe wie ein Hausbau. Das ist die
   * eigentliche Entscheidung: dieselbe Kolonne kann in derselben Zeit ein
   * Haus bauen oder Werkzeug machen.
   */
  import { GOODS, type GoodDef } from '../data/goods'
  import { findMaterial } from '../data/materials'
  import { formatInt, formatTime } from '../engine/format'
  import { buildRate, goodBlocker, orderGood } from '../systems/construction'
  import { planet } from '../state/planet.svelte'
  import { canAffordMaterials, materialAmount } from '../state/run.svelte'
  import { session } from '../state/session.svelte'

  const sichtbar = $derived(GOODS.filter((g) => planet.oxygenTotal.gte(g.revealAt)))

  /** „4 Holz" — was ein Stück verbraucht. */
  function eingang(def: GoodDef, amount: number): string {
    return Object.entries(def.input)
      .map(([id, per]) => `${formatInt(per * amount)} ${findMaterial(id)?.name ?? id}`)
      .join(' + ')
  }

  function ausgang(def: GoodDef): string {
    const m = findMaterial(def.output)
    return def.amount === 1 ? (m?.singular ?? m?.name ?? def.output) : `${def.amount} ${m?.name}`
  }

  /**
   * Wie viele Stück das Lager gerade hergibt — für „Max".
   *
   * Bewusst hier und nicht in einem System: es ist dieselbe Frage wie bei
   * maxAffordable(), nur ohne O₂, und eine zweite Zahl im Lager gibt es
   * dafür nicht.
   */
  function maxMoeglich(def: GoodDef): number {
    let max = Infinity
    for (const [id, per] of Object.entries(def.input)) {
      if (per <= 0) continue
      max = Math.min(max, Math.floor(materialAmount(id).div(per).toNumber()))
    }
    return Number.isFinite(max) ? Math.max(0, max) : 0
  }

  function mengeFuer(def: GoodDef): number {
    return session.buyAmount === 'max' ? maxMoeglich(def) : session.buyAmount
  }
</script>

{#if sichtbar.length === 0}
  <p class="empty">Noch nichts zu fertigen.</p>
{:else}
  <ul>
    {#each sichtbar as def (def.id)}
      {@const amount = Math.max(1, mengeFuer(def))}
      {@const gewuenscht = mengeFuer(def)}
      {@const blocker = goodBlocker(def, gewuenscht)}
      {@const vorhanden = materialAmount(def.output)}
      <li>
        <div class="info">
          <div class="line">
            <span class="name">{def.name}</span>
            <span class="stock num">{formatInt(vorhanden)} im Lager</span>
          </div>
          <p class="desc">{def.description}</p>
          <span class="recipe num">{eingang(def, 1)} → {ausgang(def)}</span>
        </div>

        <button
          class="order"
          disabled={blocker !== null}
          onclick={() => orderGood(def.id, gewuenscht)}
          title={blocker ?? 'Bestellen'}
        >
          <span class="label">
            Fertigen{gewuenscht > 1 ? ` ×${formatInt(gewuenscht)}` : ''}
          </span>
          <span
            class="cost num"
            class:missing={!canAffordMaterials(def.input, amount)}
          >
            {eingang(def, amount)}
          </span>
          <span class="cost time num">
            {buildRate() > 0 ? `${formatTime((def.work * amount) / buildRate())} Arbeit` : 'keine Kolonne'}
          </span>
        </button>
      </li>
    {/each}
  </ul>
{/if}

<style>
  ul {
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

  .stock {
    font-size: 12px;
    color: var(--o2);
  }

  .desc {
    margin: 2px 0 4px;
    font-size: 12px;
    color: var(--muted);
  }

  .recipe {
    font-size: 11px;
    color: var(--text-dim);
  }

  .order {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
    min-width: 122px;
    padding: 8px 12px;
  }

  .label {
    font-size: 13px;
  }

  .cost {
    font-size: 11px;
    color: var(--warn);
  }

  .cost.missing {
    color: var(--bad);
  }

  .cost.time {
    font-size: 10px;
    color: var(--muted);
  }

  .empty {
    margin: 0;
    font-size: 12px;
    color: var(--muted);
  }
</style>
