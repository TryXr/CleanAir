<script lang="ts">
  import { format, formatInt, formatRate } from '../engine/format'
  import { WOOD_PER_TREE, forestCapacity, forestFill, forestO2Rate, o2PerTree } from '../systems/forest'
  import { fellingRate, plantingRate } from '../systems/production'
  import { planet } from '../state/planet.svelte'

  const planting = $derived(plantingRate())
  const felling = $derived(fellingRate())
  const capacity = $derived(forestCapacity())
  const o2 = $derived(forestO2Rate())

  /** Netto-Zuwachs. Negativ heißt: der Wald wird abgeholzt. */
  const net = $derived(planting.sub(planet.trees.gt(0) ? felling : 0))
  const wood = $derived(planet.trees.gt(0) ? felling.mul(WOOD_PER_TREE) : felling.mul(0))
  const shrinking = $derived(net.lt(0))
  const full = $derived(planet.trees.gte(capacity) && capacity.gt(0))
</script>

<div class="head">
  <div>
    <span class="count num">{formatInt(planet.trees)}</span>
    <span class="unit">Bäume</span>
  </div>
  <div class="cap num">von {formatInt(capacity)}</div>
</div>

<div class="bar">
  <div class="fill" style="width: {(forestFill() * 100).toFixed(2)}%"></div>
</div>

<dl class="stats">
  <div>
    <dt>O₂ aus dem Wald</dt>
    <dd class="num accent">+{formatRate(o2)}</dd>
  </div>
  <div>
    <dt>Bestand</dt>
    <dd class="num" class:bad={shrinking}>
      {net.lt(0) ? '' : '+'}{formatRate(net)}
    </dd>
  </div>
  <div>
    <dt>Holzertrag</dt>
    <dd class="num">{wood.gt(0) ? '+' + formatRate(wood) : '—'}</dd>
  </div>
</dl>

{#if shrinking}
  <p class="warn">
    Es wird mehr gefällt als nachwächst. Jeder Baum weniger sind
    <strong class="num">{format(o2PerTree())}</strong> O₂/s weniger — das drückt auf den
    Atmosphärenwert und damit auf den Stabilitäts-Timer.
  </p>
{:else if full}
  <p class="note">
    Der Planet steht voll. Weitere Baumschulen bringen nichts, solange nicht gefällt wird.
  </p>
{:else if felling.gt(0)}
  <p class="note">
    Wald und Sägewerk im Gleichgewicht. Holz kostet hier dauerhaft Atmosphäre — mehr Baumschulen
    verschieben die Rechnung.
  </p>
{:else}
  <p class="note">
    Noch wird nicht gefällt. Ein Sägewerk macht aus Bäumen Holz — und aus Atmosphäre Baustoff.
  </p>
{/if}

<style>
  .head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
  }

  .count {
    font-size: 30px;
    font-weight: 600;
    color: var(--good);
  }

  .unit {
    font-size: 12px;
    color: var(--muted);
    margin-left: 6px;
  }

  .cap {
    font-size: 12px;
    color: var(--muted);
  }

  .bar {
    height: 6px;
    margin: 10px 0 14px;
    background: #071018;
    border: 1px solid var(--line);
    border-radius: 99px;
    overflow: hidden;
  }

  .fill {
    height: 100%;
    background: linear-gradient(90deg, #2d6a4f, var(--good));
    transition: width 0.2s linear;
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 8px 18px;
    margin: 0 0 12px;
  }

  .stats div {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    border-bottom: 1px dotted var(--line-soft);
    padding-bottom: 5px;
  }

  dt {
    font-size: 11px;
    color: var(--muted);
  }

  dd {
    margin: 0;
    font-size: 13px;
  }

  .accent {
    color: var(--o2);
  }

  .bad {
    color: var(--bad);
  }

  .note,
  .warn {
    margin: 0;
    font-size: 11px;
    line-height: 1.6;
    color: var(--muted);
  }

  .warn {
    color: var(--warn);
    border-left: 2px solid var(--warn);
    padding-left: 11px;
    font-size: 12px;
  }
</style>
