<script lang="ts">
  import { AURORA } from '../data/planets'
  import { format, formatRate } from '../engine/format'
  import { o2Percent, remainingToTarget, targetProgress } from '../systems/atmosphere'
  import { clickGain, currentO2Rate, releaseOxygen } from '../systems/production'
  import { planet } from '../state/planet.svelte'

  const percent = $derived(o2Percent())
  const progress = $derived(targetProgress())
  const rate = $derived(currentO2Rate())
  const gain = $derived(clickGain())
  const remaining = $derived(remainingToTarget())
</script>

<div class="head">
  <div>
    <span class="percent num">{percent.toFixed(2)}</span><span class="pct">%</span>
    <span class="unit">O₂ in der Atmosphäre</span>
  </div>
  <div class="target">
    Ziel <strong class="num">{AURORA.targetO2} %</strong>
  </div>
</div>

<div class="bar" class:done={planet.completed}>
  <div class="fill" style="width: {(progress * 100).toFixed(3)}%"></div>
</div>

{#if planet.completed}
  <p class="done-note">
    Aurora ist atembar. Der Planetenwechsel und die Genesis-Kerne folgen in M2 —
    bis dahin läuft die Produktion einfach weiter.
  </p>
{:else}
  <p class="remaining">
    Noch <strong class="num">{format(remaining)}</strong> O₂ freizusetzen.
  </p>
{/if}

<div class="stock">
  <div>
    <span class="label">Vorrat</span>
    <span class="value num">{format(planet.oxygen)}</span>
  </div>
  <div>
    <span class="label">Produktion</span>
    <span class="value num">{formatRate(rate)}</span>
  </div>
</div>

<button class="release primary" onclick={releaseOxygen}>
  <span>O₂ freisetzen</span>
  <span class="gain num">+{format(gain)}</span>
</button>

<style>
  .head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }

  .percent {
    font-size: 46px;
    font-weight: 600;
    color: var(--o2);
    line-height: 1;
  }

  .pct {
    font-size: 22px;
    color: var(--o2);
    margin-left: 2px;
  }

  .unit {
    display: block;
    font-size: 12px;
    color: var(--muted);
    margin-top: 4px;
  }

  .target {
    font-size: 12px;
    color: var(--muted);
  }

  .target strong {
    color: var(--text);
    font-weight: 600;
  }

  .bar {
    height: 9px;
    margin: 14px 0 10px;
    background: #071018;
    border: 1px solid var(--line);
    border-radius: 99px;
    overflow: hidden;
  }

  .fill {
    height: 100%;
    background: linear-gradient(90deg, var(--o2-dim), var(--o2));
    transition: width 0.18s linear;
  }

  .bar.done .fill {
    background: linear-gradient(90deg, var(--o2), var(--good));
  }

  .remaining,
  .done-note {
    margin: 0;
    font-size: 12px;
    color: var(--muted);
  }

  .remaining strong {
    color: var(--text-dim);
    font-weight: 600;
  }

  .done-note {
    color: var(--good);
    line-height: 1.6;
  }

  .stock {
    display: flex;
    gap: 30px;
    margin: 18px 0 14px;
  }

  .label {
    display: block;
    font-size: 10px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .value {
    font-size: 19px;
    font-weight: 600;
  }

  .release {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    width: 100%;
    padding: 15px;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.02em;
  }

  .gain {
    color: var(--o2);
    font-size: 13px;
  }
</style>
