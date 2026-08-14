<script lang="ts">
  import { DEFENSES } from '../data/defenses'
  import { ENEMIES } from '../data/enemies'
  import { findMaterial } from '../data/materials'
  import { format, formatInt, formatTime } from '../engine/format'
  import {
    buildDefense,
    canBuildDefense,
    combatStatus,
    defenseCost,
    defenseCount,
    useAbility,
  } from '../systems/combat'
  import { planet } from '../state/planet.svelte'

  /**
   * Zwei Rollen, ein Panel: `lage` gehört dorthin, wo man sofort reagiert,
   * `bau` zwischen die übrigen Kaufreihen. Zusammen waren sie ein Block, in
   * dem der Abwehrknopf neben dem Einkaufszettel stand.
   */
  interface Props {
    zeige?: 'alles' | 'lage' | 'bau'
  }
  let { zeige = 'alles' }: Props = $props()

  const s = $derived(combatStatus())
  const imKampf = $derived(s.kraft > 0)

  const sichtbar = $derived(DEFENSES.filter((d) => planet.oxygenTotal.gte(d.revealAt)))

  function materialLabel(cost: Record<string, number> | undefined): string {
    if (!cost) return ''
    return Object.entries(cost)
      .map(([id, n]) => `${formatInt(n)} ${findMaterial(id)?.name ?? id}`)
      .join(', ')
  }
</script>

{#if zeige !== 'bau'}
{#if imKampf}
  <div class="wave">
    <div class="line">
      <span class="name">Welle {s.welle}</span>
      <span class="left num">noch {formatTime(Math.ceil(s.rest))}</span>
    </div>
    <div class="bar">
      <div class="fill" style="width: {Math.min(100, (s.kraft / (s.kraft + 1)) * 100).toFixed(1)}%"></div>
    </div>
    <p class="detail num">
      Kampfkraft {formatInt(Math.ceil(s.kraft))} · deine Abwehr {format(s.verteidigung)}/s
      {#if s.schild > 0}· Schild {Math.ceil(s.schild)}s{/if}
    </p>

    <ul class="composition">
      {#each ENEMIES as e (e.id)}
        {@const anteil = s.zusammensetzung[e.id]}
        {#if anteil > 0}
          <li>
            <span class="enemy">{e.name}</span>
            <span class="share num">{Math.round(anteil * 100)} %</span>
          </li>
        {/if}
      {/each}
    </ul>

    <div class="abilities">
      {#each s.abilities as a (a.def.id)}
        <button disabled={!a.bereit} onclick={() => useAbility(a.def.id)} title={a.def.description}>
          <span>{a.def.name}</span>
          {#if a.cooldown > 0}<span class="cd num">{Math.ceil(a.cooldown)}s</span>{/if}
        </button>
      {/each}
    </div>
  </div>
{:else}
  <div class="calm">
    <div class="line">
      <span class="name">Ruhe zwischen den Wellen</span>
      <span class="left num">{Math.round(s.bedrohung * 100)} %</span>
    </div>
    <div class="bar threat">
      <div class="fill" style="width: {(s.bedrohung * 100).toFixed(1)}%"></div>
    </div>
    <p class="hint">
      {#if s.welle === 0}
        Sie merken, dass sich die Luft verändert. Je weiter du terraformst, desto schneller kommen
        sie.
      {:else}
        Nächste Welle wird stärker. Jetzt ist die Zeit zu bauen.
      {/if}
    </p>
  </div>
{/if}

{/if}

{#if s.stillgelegt > 0}
  <p class="damage">
    <strong class="num">{Math.round(s.stillgelegt * 100)} %</strong> deiner Anlagen stehen still.
    Sie laufen von selbst wieder an — Reparaturdepots beschleunigen das.
  </p>
{/if}

{#if zeige !== 'lage'}
<h3>Verteidigung</h3>
{#if sichtbar.length === 0}
  <p class="hint">Noch nichts zu bauen. Setz weiter O₂ frei.</p>
{:else}
  <ul class="defenses">
    {#each sichtbar as def (def.id)}
      {@const kosten = defenseCost(def.id)}
      {@const kaufbar = canBuildDefense(def.id)}
      <li>
        <div class="info">
          <div class="line">
            <span class="name">{def.name}</span>
            <span class="count num">{defenseCount(def.id)}</span>
          </div>
          <p class="desc">{def.description}</p>
          <span class="rate num">
            {#if def.damage > 0}
              {format(def.damage)} Schaden/s pro Stück
            {:else}
              Reparatur statt Feuerkraft
            {/if}
          </span>
        </div>
        <button class="buy" disabled={!kaufbar} onclick={() => buildDefense(def.id)}>
          <span>Bauen</span>
          <span class="cost num">{format(kosten)} O₂</span>
          {#if def.materialCost}
            <span class="cost material num">{materialLabel(def.materialCost)}</span>
          {/if}
          {#if def.populationCost}
            <span class="cost material num">{def.populationCost} Menschen</span>
          {/if}
        </button>
      </li>
    {/each}
  </ul>
{/if}
{/if}

<style>
  .wave,
  .calm {
    padding: 11px 13px;
    background: var(--panel-soft);
    border: 1px solid var(--line-soft);
    border-radius: 8px;
    margin-bottom: 12px;
  }

  .wave {
    border-left: 2px solid var(--bad);
  }

  .line {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
  }

  .name {
    font-size: 13px;
    font-weight: 600;
  }

  .left {
    font-size: 11px;
    color: var(--muted);
  }

  .bar {
    height: 6px;
    margin: 8px 0;
    background: #071018;
    border-radius: 99px;
    overflow: hidden;
  }

  .fill {
    height: 100%;
    background: var(--bad);
    transition: width 0.2s linear;
  }

  .bar.threat .fill {
    background: var(--warn);
  }

  .detail {
    margin: 0;
    font-size: 11px;
    color: var(--muted);
  }

  .composition {
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin: 8px 0 0;
    padding: 0;
  }

  .composition li {
    display: flex;
    gap: 6px;
    font-size: 11px;
  }

  .enemy {
    color: var(--text-dim);
  }

  .share {
    color: var(--bad);
  }

  .abilities {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 10px;
  }

  .abilities button {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    font-size: 12px;
  }

  .cd {
    color: var(--muted);
    font-size: 10px;
  }

  .damage {
    margin: 0 0 12px;
    font-size: 12px;
    line-height: 1.6;
    color: var(--warn);
    border-left: 2px solid var(--warn);
    padding-left: 11px;
  }

  h3 {
    margin: 14px 0 8px;
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-dim);
  }

  .hint {
    margin: 6px 0 0;
    font-size: 11px;
    line-height: 1.5;
    color: var(--muted);
  }

  .defenses {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 9px;
  }

  .defenses li {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    background: var(--panel-soft);
    border: 1px solid var(--line-soft);
    border-radius: 8px;
  }

  .info {
    flex: 1;
    min-width: 0;
  }

  .count {
    font-size: 13px;
    color: var(--o2);
  }

  .desc {
    margin: 2px 0 4px;
    font-size: 11px;
    color: var(--muted);
  }

  .rate {
    font-size: 11px;
    color: var(--text-dim);
  }

  .buy {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 1px;
    min-width: 130px;
    padding: 8px 12px;
    font-size: 13px;
  }

  .cost {
    font-size: 11px;
    color: var(--muted);
  }

  .buy:not(:disabled) .cost {
    color: var(--o2);
  }

  .cost.material {
    color: var(--warn);
    font-size: 10px;
  }
</style>
