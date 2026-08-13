<script lang="ts">
  import { format, formatInt } from '../engine/format'
  import { biomassToNextCore, canPrestige, doPrestige, pendingCores } from '../systems/prestige'
  import { completedCount, totalBiomass } from '../systems/travel'

  const cores = $derived(pendingCores())
  const toNext = $derived(biomassToNextCore())
  const ready = $derived(canPrestige())
  const stable = $derived(completedCount())

  /**
   * Der Reset wirft alles weg. Ein versehentlicher Klick wäre der teuerste
   * Fehler im Spiel — deshalb als einziger Knopf mit Rückfrage.
   */
  function onReset(): void {
    const frage =
      `Durchlauf wirklich beenden?\n\n` +
      `+${formatInt(cores)} Genesis-Kerne.\n` +
      `Alle Planeten, das gesamte Lager und alle Freischaltungen fallen weg.`
    if (confirm(frage)) doPrestige()
  }
</script>

<div class="head">
  <div>
    <span class="cores num">{formatInt(cores)}</span>
    <span class="unit">Genesis-Kerne beim Reset</span>
  </div>
</div>

<dl class="stats">
  <div><dt>Biomasse des Durchlaufs</dt><dd class="num">{format(totalBiomass())}</dd></div>
  <div><dt>bis zum nächsten Kern</dt><dd class="num">{format(toNext)}</dd></div>
  <div><dt>stabile Planeten</dt><dd class="num">{stable}</dd></div>
</dl>

{#if ready}
  <p class="note">
    Der Reset beendet den ganzen Durchlauf: alle Planeten, das Lager und alle Freischaltungen
    fallen weg. Kerne, Meta-Baum und Forschung bleiben. Du landest wieder auf Aurora — mit mehr
    in der Hand als beim letzten Mal.
  </p>
{:else}
  <p class="note muted">
    Noch nicht genug Biomasse für einen Kern. Der Reset lohnt sich erst, wenn er etwas abwirft —
    wann das ist, entscheidest du selbst.
  </p>
{/if}

<button class="primary jump" disabled={!ready} onclick={onReset}>Durchlauf zurücksetzen</button>

<style>
  .head {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }

  .cores {
    font-size: 32px;
    font-weight: 600;
    color: var(--warn);
  }

  .unit {
    font-size: 12px;
    color: var(--muted);
  }

  .stats {
    display: grid;
    gap: 6px;
    margin: 12px 0;
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

  .note {
    margin: 0 0 12px;
    font-size: 12px;
    line-height: 1.6;
    color: var(--text-dim);
  }

  .note.muted {
    color: var(--muted);
  }

  .jump {
    width: 100%;
    padding: 12px;
    font-weight: 600;
  }
</style>
