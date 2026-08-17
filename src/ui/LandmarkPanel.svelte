<script lang="ts">
  import Decimal from 'break_infinity.js'
  import { findMaterial } from '../data/materials'
  import { format, formatTime } from '../engine/format'
  import { buildRate } from '../systems/construction'
  import {
    canOrderStage,
    landmarkDone,
    landmarkHere,
    nextStage,
    orderStage,
    stageBlocker,
    stageUnderway,
    stageWork,
  } from '../systems/landmarks'
  import { materialAmount } from '../state/run.svelte'
  import { planet } from '../state/planet.svelte'

  /**
   * Das Bauwerk dieses Planeten (M19, §20.3).
   *
   * Die Anzeige hat eine Aufgabe: **das Ziel sichtbar halten, auch wenn es
   * weit weg ist.** Deshalb stehen alle vier Etappen untereinander und nicht
   * nur die nächste — man soll sehen, was noch kommt, und nicht nur, was
   * gerade dran ist. Ein Fortschrittsbalken über eine Stunde ist eine Zahl;
   * vier Namen, von denen zwei durchgestrichen sind, sind ein Vorhaben.
   */
  const def = $derived(landmarkHere())
  const stufe = $derived(planet.landmarkStage)
  const naechste = $derived(nextStage())
  const fertig = $derived(landmarkDone())
  const laeuft = $derived(stageUnderway())
  const hindernis = $derived(stageBlocker())

  /**
   * `singular` bei genau einem Stück.
   *
   * Ohne das steht in der Etappenrechnung „1 Fundstücke", und die Materialien
   * führen ihre Einzahl nicht umsonst mit. Beim Durchklicken sofort
   * aufgefallen — beim Lesen des Codes nicht.
   */
  function materialName(id: string, menge: number): string {
    const m = findMaterial(id)
    if (!m) return id
    return menge === 1 ? (m.singular ?? m.name) : m.name
  }

  function kostenText(kosten: Record<string, number>): string {
    return Object.entries(kosten)
      .map(([id, menge]) => `${format(new Decimal(menge))} ${materialName(id, menge)}`)
      .join(', ')
  }

  function fehlt(kosten: Record<string, number>): string[] {
    return Object.entries(kosten)
      .filter(([id, menge]) => materialAmount(id).lt(menge))
      .map(([id]) => findMaterial(id)?.name ?? id)
  }
</script>

{#if def}
  <p class="desc">{def.description}</p>

  <ol>
    {#each def.stages as stage, i (stage.name)}
      <li class:done={i < stufe} class:active={i === stufe && !fertig}>
        <div class="row">
          <span class="name">{stage.name}</span>
          {#if i < stufe}
            <span class="mark">steht</span>
          {:else if i === stufe && laeuft}
            <span class="mark building">im Bau</span>
          {/if}
        </div>
        {#if i >= stufe}
          <p class="stage-desc">{stage.description}</p>
          <p class="cost">
            {kostenText(stage.cost)}
            <span class="work">· {formatTime(stageWork(stage) / Math.max(0.01, buildRate()))}</span>
          </p>
        {/if}
      </li>
    {/each}
  </ol>

  {#if fertig}
    <p class="effect">{def.effectText}</p>
  {:else if naechste}
    <button class="primary" disabled={!canOrderStage()} onclick={() => orderStage()}>
      {naechste.name} beginnen
      {#if hindernis}<span class="blocker">{hindernis}</span>{/if}
    </button>
    {#if fehlt(naechste.cost).length > 0}
      <p class="hint">Es fehlt: {fehlt(naechste.cost).join(', ')}.</p>
    {/if}
    <p class="hint">
      Eine Etappe steht in derselben Reihe wie ein Haus — dieselbe Kolonne, dieselbe Zeit.
      Überzähliges Werkzeug im Lager macht sie schneller.
    </p>
  {/if}
{/if}

<style>
  .desc {
    margin: 0 0 12px;
    font-size: 12px;
    line-height: 1.6;
    color: var(--text-dim);
  }

  ol {
    list-style: none;
    margin: 0 0 12px;
    padding: 0;
  }

  li {
    border-left: 2px solid var(--line-soft);
    padding: 0 0 10px 11px;
  }

  li.done {
    border-left-color: var(--o2);
  }

  li.active {
    border-left-color: var(--text-dim);
  }

  .row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 10px;
  }

  .name {
    font-size: 13px;
  }

  li.done .name {
    color: var(--muted);
  }

  .mark {
    font-size: 11px;
    color: var(--o2);
  }

  .mark.building {
    color: var(--text-dim);
  }

  .stage-desc {
    margin: 3px 0 4px;
    font-size: 11px;
    line-height: 1.5;
    color: var(--muted);
  }

  .cost {
    margin: 0;
    font-size: 11px;
    color: var(--text-dim);
  }

  .work {
    color: var(--muted);
  }

  .effect {
    margin: 0;
    padding: 9px 11px;
    border-radius: 7px;
    border: 1px solid var(--o2);
    font-size: 12px;
    line-height: 1.5;
  }

  button {
    width: 100%;
    padding: 8px;
    font-size: 13px;
  }

  .blocker {
    display: block;
    font-size: 11px;
    color: var(--bad);
  }

  .hint {
    margin: 8px 0 0;
    font-size: 11px;
    line-height: 1.5;
    color: var(--muted);
  }
</style>
