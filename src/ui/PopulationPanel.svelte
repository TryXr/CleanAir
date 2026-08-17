<script lang="ts">
  import { formatInt, formatRate } from '../engine/format'
  import {
    habitability,
    isSuffocating,
    netO2Rate,
    o2ConsumptionRate,
    capacityLimit,
    populationCapacity,
  } from '../systems/population'
  import { totalStaff, unassigned } from '../systems/labor'
  import { currentPlanetDef, planet } from '../state/planet.svelte'

  const def = $derived(currentPlanetDef())
  const capacity = $derived(populationCapacity())
  const consumption = $derived(o2ConsumptionRate())
  const net = $derived(netO2Rate())
  const zugewiesen = $derived(totalStaff())
  const frei = $derived(unassigned())
  const suffocating = $derived(isSuffocating())
  const fill = $derived(capacity.lte(0) ? 0 : Math.min(1, planet.settlers.div(capacity).toNumber()))

  /*
   * Der Balken sieht aus wie eine Bettenanzeige, ist aber das Minimum aus
   * Betten und Planetengrenze. Wer voll ist, muss wissen, *welche* der beiden
   * bremst — sonst baut er Wohnraum, der nichts bewirkt (auf Aurora gemessen:
   * 1592 Betten gegen eine Planetengrenze von 60).
   */
  const grenze = $derived(capacityLimit())
  const voll = $derived(capacity.gt(0) && planet.settlers.gte(capacity.sub(0.5)))
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

  {#if voll}
    <p class="limit">
      {#if grenze === 'raum'}
        <strong>Die Betten sind voll.</strong> Mehr Wohnraum lässt die Kolonie weiterwachsen.
      {:else}
        <strong>{def.name} trägt nicht mehr.</strong> Wohnraum hilft ab hier nicht — die Grenze
        des Planeten heben nur Forschung, Meta-Baum und Erfolge.
      {/if}
    </p>
  {/if}

  <dl class="stats">
    <!-- Bis M12 stand hier ein globaler Multiplikator. Seit §17 wirkt
         Arbeitskraft über Plätze — also zählt, wer wo steht, und vor allem,
         wer gerade nirgends steht. -->
    <div>
      <dt>Zugewiesen</dt>
      <dd class="num accent">{formatInt(zugewiesen)}</dd>
    </div>
    <div>
      <dt>Ohne Aufgabe</dt>
      <dd class="num" class:accent={frei.gt(0)}>{formatInt(frei)}</dd>
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

<!-- Kein Zuwanderungsregler mehr (§17): Menschen kommen von selbst, sobald
     Rationen und Wohnraum reichen. Wer weniger will, reißt Wohnraum ab —
     das ist die Entscheidung, nicht ein Schieber. -->

<style>
  /* Steht nur da, wenn die Kolonie tatsächlich anstößt — ein dauerhafter
     Hinweis wäre Rauschen über der Zahl, um die es geht. */
  .limit {
    margin: 8px 0 0;
    font-size: 11px;
    line-height: 1.5;
    color: var(--muted);
  }

  .limit strong {
    color: var(--warn);
    font-weight: 600;
  }

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

</style>
