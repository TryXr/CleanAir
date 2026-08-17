<script lang="ts">
  import { findMaterial } from '../data/materials'
  import type { SalvageTarget } from '../data/salvage'
  import Decimal from 'break_infinity.js'
  import { format, formatInt, formatTime } from '../engine/format'
  import { unassigned } from '../systems/labor'
  import {
    activeExpedition,
    canSend,
    depletionOf,
    recallCrew,
    revealedTargets,
    riskFor,
    runsOn,
    salvageBlocker,
    sendCrew,
    yieldFactor,
  } from '../systems/salvage'
  import { session } from '../state/session.svelte'

  /**
   * Bergung (M18, §20.2).
   *
   * Die Anzeige muss genau zwei Dinge klarmachen, weil sonst die
   * Entscheidung verschwindet, um die es geht:
   *
   * 1. **Was der Trupp kostet** — die Leute stehen währenddessen an keiner
   *    Anlage. Deshalb steht die Zahl der freien Bewohner oben und nicht
   *    irgendwo klein.
   * 2. **Dass ein großer Trupp sicherer ist.** Risiko und Ertrag stehen
   *    beide am Regler und ändern sich, während man ihn schiebt — sonst
   *    wählt jeder immer das Minimum und merkt nie, warum es schiefgeht.
   */
  const ziele = $derived(revealedTargets())
  const frei = $derived(unassigned())

  /** Truppgröße je Ziel. Lebt in der Sitzung, nicht im Spielstand. */
  function crewFor(t: SalvageTarget): number {
    const gewaehlt = session.crew[t.id]
    if (gewaehlt === undefined) return t.minCrew
    return Math.min(t.maxCrew, Math.max(t.minCrew, gewaehlt))
  }

  function setCrew(t: SalvageTarget, n: number): void {
    session.crew = { ...session.crew, [t.id]: Math.min(t.maxCrew, Math.max(t.minCrew, n)) }
  }

  /**
   * `format` und nicht `formatInt`: ein kleiner Trupp bringt von einem
   * seltenen Posten weniger als ein Stück mit — gutgeschrieben werden die
   * 0,75 Werkzeug trotzdem. Auf ganze Zahlen gerundet stand hier „0
   * Werkzeug" als Versprechen, und das war doppelt falsch.
   */
  function ertragText(t: SalvageTarget, crew: number): string {
    const anteil = (crew / t.maxCrew) * yieldFactor(t.id)
    return t.yields
      .map((y) => `${format(new Decimal(y.amount * anteil))} ${findMaterial(y.material)?.name ?? y.material}`)
      .join(', ')
  }
</script>

<p class="head">
  <span class="num">{formatInt(frei)}</span>
  <span class="unit">ohne Aufgabe</span>
</p>

{#if ziele.length === 0}
  <p class="empty">
    Hier ist nichts zu holen — jedenfalls nichts, das schon jemand gefunden hätte. Setz weiter O₂
    frei.
  </p>
{/if}

{#each ziele as t (t.id)}
  {@const laufend = activeExpedition(t.id)}
  {@const crew = crewFor(t)}
  {@const hindernis = salvageBlocker(t, crew)}
  {@const leer = depletionOf(t.id)}

  <section class:out={laufend !== undefined}>
    <header>
      <h3>{t.name}</h3>
      {#if runsOn(t.id) > 0}
        <span class="runs num">{runsOn(t.id)}× angelaufen</span>
      {/if}
    </header>

    <p class="desc">{t.description}</p>

    {#if laufend}
      <div class="bar" role="progressbar" aria-valuenow={laufend.remaining}>
        <div class="fill" style:width="{(1 - laufend.remaining / laufend.total) * 100}%"></div>
      </div>
      <p class="status">
        <span class="num">{laufend.crew}</span> Leute unterwegs — zurück in
        <span class="num">{formatTime(laufend.remaining)}</span>
      </p>
      <button onclick={() => recallCrew(t.id)}>Zurückrufen</button>
      <p class="hint">
        Abgezogen heißt ohne Beute — aber die Hände sind sofort wieder da.
      </p>
    {:else}
      <div class="crew">
        <button disabled={crew <= t.minCrew} onclick={() => setCrew(t, crew - 1)}>−</button>
        <span class="num">{crew}</span>
        <button disabled={crew >= t.maxCrew} onclick={() => setCrew(t, crew + 1)}>+</button>
        <span class="unit">Leute · {formatTime(t.duration)}</span>
      </div>

      <dl>
        <div><dt>Beute</dt><dd class="num">{ertragText(t, crew)}</dd></div>
        <div>
          <dt>Risiko</dt>
          <dd class="num" class:warn={riskFor(t, crew) > 0.12}>
            {Math.round(riskFor(t, crew) * 100)} %
          </dd>
        </div>
        {#if leer > 0.02}
          <div>
            <dt>Ergiebigkeit</dt>
            <dd class="num" class:warn={leer > 0.5}>{Math.round(yieldFactor(t.id) * 100)} %</dd>
          </div>
        {/if}
      </dl>

      <button class="primary" disabled={!canSend(t, crew)} onclick={() => sendCrew(t.id, crew)}>
        Trupp losschicken
        {#if hindernis}<span class="blocker">{hindernis}</span>{/if}
      </button>
    {/if}
  </section>
{/each}

<style>
  .head {
    display: flex;
    align-items: baseline;
    gap: 6px;
    margin: 0 0 12px;
  }

  .head .num {
    font-size: 20px;
    color: var(--o2);
  }

  .unit {
    font-size: 11px;
    color: var(--muted);
  }

  section {
    border: 1px solid var(--line-soft);
    border-radius: 8px;
    padding: 11px 12px;
  }

  section + section {
    margin-top: 9px;
  }

  section.out {
    border-color: var(--o2);
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 10px;
  }

  h3 {
    margin: 0;
    font-size: 14px;
  }

  .runs {
    font-size: 11px;
    color: var(--muted);
  }

  .desc {
    margin: 6px 0 10px;
    font-size: 12px;
    line-height: 1.5;
    color: var(--text-dim);
  }

  .crew {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .crew button {
    width: 28px;
    padding: 3px 0;
    font-size: 14px;
  }

  .crew .num {
    min-width: 24px;
    text-align: center;
    font-size: 15px;
  }

  dl {
    display: grid;
    gap: 5px;
    margin: 0 0 10px;
  }

  dl div {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    border-bottom: 1px dotted var(--line-soft);
    padding-bottom: 4px;
  }

  dt {
    font-size: 11px;
    color: var(--muted);
  }

  dd {
    margin: 0;
    font-size: 12px;
    text-align: right;
  }

  .warn {
    color: var(--bad);
  }

  button {
    width: 100%;
    padding: 7px;
    font-size: 13px;
  }

  .crew button {
    width: 28px;
  }

  .blocker {
    display: block;
    font-size: 11px;
    color: var(--bad);
  }

  .bar {
    height: 6px;
    border-radius: 3px;
    background: var(--line-soft);
    overflow: hidden;
    margin-bottom: 7px;
  }

  .fill {
    height: 100%;
    background: var(--o2);
  }

  .status {
    margin: 0 0 8px;
    font-size: 12px;
    color: var(--text-dim);
  }

  .hint,
  .empty {
    margin: 7px 0 0;
    font-size: 11px;
    line-height: 1.5;
    color: var(--muted);
  }
</style>
