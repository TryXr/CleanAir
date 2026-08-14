<script lang="ts">
  import { format, formatRate, formatTime } from '../engine/format'
  import {
    atmosphereStatus,
    fireIntensity,
    inertPercent,
    inWindow,
    o2Percent,
    remainingToTarget,
    stabilityProgress,
    stabilityRequired,
    targetProgress,
  } from '../systems/atmosphere'
  import { clickGain, currentN2Rate, currentO2Rate, releaseOxygen } from '../systems/production'
  import { currentPlanetDef, planet, usesNitrogen } from '../state/planet.svelte'
  import WindowBar from './WindowBar.svelte'

  const def = $derived(currentPlanetDef())
  const percent = $derived(o2Percent())
  const status = $derived(atmosphereStatus())
  const stable = $derived(inWindow())
  const held = $derived(stabilityProgress())
  const fire = $derived(fireIntensity())
  const rate = $derived(currentO2Rate())
  const n2Rate = $derived(currentN2Rate())
  const gain = $derived(clickGain())
  const remaining = $derived(remainingToTarget())

  /** Erst wenn ein zweiter Wert dazukommt, lohnt die ausführliche Ansicht. */
  const isMixture = $derived(status.length > 1)
</script>

<div class="head">
  <div>
    <span class="percent num">{percent.toFixed(2)}</span><span class="pct">%</span>
    <span class="unit">O₂ in der Atmosphäre</span>
  </div>
  <div class="target">
    {#if isMixture}
      Inertgas <strong class="num">{inertPercent().toFixed(1)} %</strong>
    {:else}
      Ziel <strong class="num">{def.o2Window.min} %</strong>
    {/if}
  </div>
</div>

<!-- Vorrat, Rate und der Knopf stehen bewusst *vor* den Balken: die
     Hauptaktion des Spiels darf nicht unter dem Sichtbereich liegen, und ein
     neuer Spieler soll nicht an drei Diagrammen vorbeiscrollen müssen, um zu
     verstehen, was er tun kann. -->
<div class="stock">
  <div>
    <span class="label">Vorrat</span>
    <span class="value num">{format(planet.oxygen)}</span>
  </div>
  <div>
    <span class="label">O₂-Produktion</span>
    <span class="value num">{formatRate(rate)}</span>
  </div>
  {#if usesNitrogen()}
    <div>
      <span class="label">N₂-Produktion</span>
      <span class="value num">{formatRate(n2Rate)}</span>
    </div>
  {/if}
</div>

<button class="release primary" onclick={releaseOxygen}>
  <span>O₂ freisetzen</span>
  <span class="gain num">+{format(gain)}</span>
</button>

{#if isMixture}
  <div class="windows">
    {#each status as s (s.key)}
      <WindowBar status={s} />
    {/each}
  </div>
{:else}
  <div class="bar" class:done={planet.completed}>
    <div class="fill" style="width: {(targetProgress() * 100).toFixed(3)}%"></div>
  </div>
  {#if !planet.completed && !stable}
    <p class="remaining">
      Noch <strong class="num">{format(remaining)}</strong> O₂ freizusetzen.
    </p>
  {/if}
{/if}

<!-- Der Stabilitäts-Timer aus §4: nicht berühren, sondern halten. -->
<div class="stability" class:running={stable} class:done={planet.completed}>
  <div class="stability-head">
    <span class="label">Stabilität</span>
    <span class="num">
      {#if planet.completed}
        gehalten
      {:else}
        {formatTime(Math.floor(planet.stability))} / {formatTime(stabilityRequired())}
      {/if}
    </span>
  </div>
  <div class="thin">
    <div class="thin-fill" style="width: {((planet.completed ? 1 : held) * 100).toFixed(2)}%"></div>
  </div>
  {#if planet.completed}
    <p class="note good">
      {def.name} ist abgeschlossen. Länger bleiben bringt mehr Biomasse und damit mehr
      Genesis-Kerne, mit abnehmendem Ertrag.
    </p>
  {:else if stable}
    <p class="note good">Alle Werte im Fenster. Nicht mehr anfassen.</p>
  {:else}
    <p class="note">
      Der Timer läuft erst, wenn {status.length > 1 ? 'alle Werte' : 'der Wert'} im Fenster
      {status.length > 1 ? 'stehen' : 'steht'} — und beginnt beim Verlassen von vorn.
    </p>
  {/if}
</div>

{#if fire > 0.02}
  <p class="fire">
    Zu viel O₂: es brennt. Die Anlagen liefern nur noch
    <strong class="num">{Math.round((1 - 0.5 * fire) * 100)} %</strong>, und der Brand frisst
    Sauerstoff aus der Luft. Mehr N₂ verdünnt die Mischung und erstickt ihn.
  </p>
{/if}

<style>
  .head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 16px;
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

  .remaining {
    margin: 0;
    font-size: 12px;
    color: var(--muted);
  }

  .remaining strong {
    color: var(--text-dim);
    font-weight: 600;
  }

  .stability {
    margin: 16px 0 0;
    padding: 11px 13px;
    background: var(--panel-soft);
    border: 1px solid var(--line-soft);
    border-radius: 8px;
  }

  .stability.running {
    border-color: rgba(111, 207, 130, 0.4);
  }

  .stability-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
    font-size: 12px;
    margin-bottom: 7px;
  }

  .thin {
    height: 5px;
    background: #071018;
    border-radius: 99px;
    overflow: hidden;
  }

  .thin-fill {
    height: 100%;
    width: 0;
    background: var(--warn);
    transition: width 0.18s linear;
  }

  .stability.running .thin-fill,
  .stability.done .thin-fill {
    background: var(--good);
  }

  .note {
    margin: 8px 0 0;
    font-size: 11px;
    line-height: 1.6;
    color: var(--muted);
  }

  .note.good {
    color: var(--good);
  }

  .fire {
    margin: 12px 0 0;
    font-size: 12px;
    line-height: 1.6;
    color: var(--bad);
    border-left: 2px solid var(--bad);
    padding-left: 11px;
  }

  .fire strong {
    font-weight: 600;
  }

  .stock {
    display: flex;
    flex-wrap: wrap;
    gap: 26px;
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
