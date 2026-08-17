<script lang="ts">
  import { log } from '../state/log.svelte'

  function clock(at: number): string {
    return new Date(at).toLocaleTimeString('de-DE')
  }
</script>

<ul class="log">
  {#each log.entries as entry (entry.id)}
    <li class={entry.kind}>
      <span class="time num">{clock(entry.at)}</span>
      <span class="text">{entry.text}</span>
    </li>
  {:else}
    <li class="empty">Noch keine Ereignisse.</li>
  {/each}
</ul>

<style>
  .log {
    list-style: none;
    margin: 0;
    padding: 0;
    max-height: 420px;
    overflow-y: auto;
    font-size: 13px;
  }

  li {
    display: flex;
    gap: 10px;
    padding: 6px 0;
    border-bottom: 1px solid var(--line-soft);
  }

  li:last-child {
    border-bottom: none;
  }

  .time {
    color: var(--muted);
    font-size: 11px;
    padding-top: 2px;
    white-space: nowrap;
  }

  .text {
    color: var(--text-dim);
  }

  .good .text {
    color: var(--good);
  }
  .warn .text {
    color: var(--warn);
  }
  .bad .text {
    color: var(--bad);
  }

  .empty {
    color: var(--muted);
    font-style: italic;
  }
</style>
