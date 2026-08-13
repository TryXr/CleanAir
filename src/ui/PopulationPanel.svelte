<script lang="ts">
  import { format, formatInt, formatRate } from '../engine/format'
  import {
    habitability,
    isSuffocating,
    netO2Rate,
    o2ConsumptionRate,
    populationCapacity,
  } from '../systems/population'
  import { workforceMultiplier } from '../systems/production'
  import { currentPlanetDef, planet } from '../state/planet.svelte'

  const def = $derived(currentPlanetDef())
  const capacity = $derived(populationCapacity())
  const consumption = $derived(o2ConsumptionRate())
  const net = $derived(netO2Rate())
  const workforce = $derived(workforceMultiplier())
  const suffocating = $derived(isSuffocating())
  const fill = $derived(capacity.lte(0) ? 0 : Math.min(1, planet.settlers.div(capacity).toNumber()))
</script>

{#if planet.settlers.lte(0) && habitability() <= 0}
  <p class="waiting">
    Noch unbewohnbar. Ab <strong class="num">{def.settleAt} %</strong> O₂ landen die ersten Siedler.
  </p>
{:else}
  <div class="head">
    <div>
      <span class="count num">{formatInt(planet.settlers)}</span>
      <span class="unit">Menschen auf {def.name}</span>
    </div>
    <div class="cap num">von {formatInt(capacity)}</div>
  </div>

  <div class="bar">
    <div class="fill" style="width: {(fill * 100).toFixed(2)}%"></div>
  </div>

  <dl class="stats">
    <div>
      <dt>Arbeitskraft</dt>
      <dd class="num accent">×{format(workforce)}</dd>
    </div>
    <div>
      <dt>O₂-Verbrauch</dt>
      <dd class="num">−{formatRate(consumption)}</dd>
    </div>
    <div>
      <dt>Netto in der Luft</dt>
      <dd class="num" class:bad={suffocating}>
        {net.lt(0) ? '' : '+'}{formatRate(net)}
      </dd>
    </div>
  </dl>

  {#if suffocating}
    <p class="warn">
      Mehr Atmung als Produktion — der O₂-Anteil fällt. Zuwanderung drosseln oder Generatoren
      nachbauen.
    </p>
  {/if}
{/if}

<label class="immigration">
  <span class="line">
    <span>Zuwanderung</span>
    <span class="num">{Math.round(planet.immigration * 100)} %</span>
  </span>
  <input
    type="range"
    min="0"
    max="100"
    step="5"
    value={Math.round(planet.immigration * 100)}
    oninput={(e) => (planet.immigration = e.currentTarget.valueAsNumber / 100)}
  />
</label>

<style>
  .waiting {
    margin: 0 0 14px;
    font-size: 12px;
    color: var(--muted);
  }

  .waiting strong {
    color: var(--text-dim);
  }

  .head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
  }

  .count {
    font-size: 30px;
    font-weight: 600;
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

  .warn {
    margin: 0 0 12px;
    font-size: 12px;
    line-height: 1.6;
    color: var(--warn);
    border-left: 2px solid var(--warn);
    padding-left: 11px;
  }

  .immigration {
    display: block;
    margin-top: 4px;
  }

  .line {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 6px;
  }

  input[type='range'] {
    width: 100%;
    accent-color: var(--o2);
  }
</style>
