<script lang="ts">
  import { formatTime } from '../engine/format'
  import { activeEvents } from '../systems/eventEffects'
  import { reactToEvent, timeToNextEvent } from '../systems/events'

  const active = $derived(activeEvents())
  const next = $derived(timeToNextEvent())
</script>

{#if active.length === 0}
  <p class="idle">
    Ruhige Lage. Der nächste Zwischenfall wird in etwa
    <strong class="num">{formatTime(Math.ceil(next))}</strong> erwartet.
  </p>
{:else}
  {#each active as entry (entry.def.id)}
    <div class="event {entry.def.kind}">
      <div class="line">
        <span class="name">{entry.def.name}</span>
        <span class="left num">noch {formatTime(Math.ceil(entry.remaining))}</span>
      </div>
      <p class="text">{entry.def.text}</p>

      {#if entry.def.reaction}
        {#if entry.reacted}
          <p class="reacted">Reaktion eingeleitet.</p>
        {:else}
          <!-- Nie Pflicht: wer nicht klickt, verliert wenig (§1.3). -->
          <button onclick={() => reactToEvent(entry.def.id)}>{entry.def.reaction.label}</button>
        {/if}
      {/if}
    </div>
  {/each}
{/if}

<style>
  .idle {
    margin: 0;
    font-size: 12px;
    line-height: 1.6;
    color: var(--muted);
  }

  .idle strong {
    color: var(--text-dim);
    font-weight: 600;
  }

  .event {
    padding: 11px 13px;
    background: var(--panel-soft);
    border: 1px solid var(--line-soft);
    border-left: 2px solid var(--muted);
    border-radius: 8px;
  }

  .event + .event {
    margin-top: 9px;
  }

  .event.good {
    border-left-color: var(--good);
  }
  .event.warn {
    border-left-color: var(--warn);
  }
  .event.bad {
    border-left-color: var(--bad);
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

  .text {
    margin: 5px 0 9px;
    font-size: 12px;
    line-height: 1.6;
    color: var(--text-dim);
  }

  button {
    padding: 6px 12px;
    font-size: 13px;
  }

  .reacted {
    margin: 0;
    font-size: 11px;
    color: var(--good);
  }
</style>
