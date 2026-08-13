<script lang="ts">
  import { JOBS } from '../data/jobs'
  import { findMaterial } from '../data/materials'
  import { formatInt } from '../engine/format'
  import { canHire, dismiss, employed, freePopulation, hire, jobCount, jobVisible } from '../systems/jobs'
  import { planet } from '../state/planet.svelte'

  const free = $derived(freePopulation())
  const visible = $derived(JOBS.filter(jobVisible))

  function costLabel(cost: Record<string, number>): string {
    return Object.entries(cost)
      .map(([id, per]) => `${per} ${findMaterial(id)?.name ?? id}`)
      .join(', ')
  }
</script>

<dl class="summary">
  <div><dt>Frei</dt><dd class="num accent">{formatInt(free)}</dd></div>
  <div><dt>In Berufen</dt><dd class="num">{formatInt(employed())}</dd></div>
  <div><dt>In Gebäuden</dt><dd class="num">{formatInt(planet.bound)}</dd></div>
</dl>

{#if visible.length === 0}
  <p class="empty">Noch keine Berufe verfügbar.</p>
{:else}
  <ul>
    {#each visible as job (job.id)}
      {@const count = jobCount(job.id)}
      <li>
        <div class="info">
          <div class="line">
            <span class="name">{job.name}</span>
            <span class="count num">{formatInt(count)}</span>
          </div>
          <p class="desc">{job.description}</p>
          <span class="cost num">Einstellen: {costLabel(job.hireCost)}</span>
        </div>
        <div class="actions">
          <button disabled={!canHire(job.id)} onclick={() => hire(job.id)}>+1</button>
          <button disabled={count <= 0} onclick={() => dismiss(job.id)}>−1</button>
        </div>
      </li>
    {/each}
  </ul>

  <p class="hint">
    Freistellen gibt die Leute zurück, aber nicht das Material — Umverteilen kostet.
  </p>
{/if}

<style>
  .summary {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin: 0 0 14px;
  }

  .summary div {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .summary dt {
    font-size: 10px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .summary dd {
    margin: 0;
    font-size: 17px;
    font-weight: 600;
  }

  .accent {
    color: var(--o2);
  }

  .empty {
    margin: 0;
    font-size: 12px;
    color: var(--muted);
  }

  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 9px;
  }

  li {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 11px 13px;
    background: var(--panel-soft);
    border: 1px solid var(--line-soft);
    border-radius: 8px;
  }

  .info {
    flex: 1;
    min-width: 0;
  }

  .line {
    display: flex;
    align-items: baseline;
    gap: 10px;
  }

  .name {
    font-weight: 600;
    font-size: 13px;
  }

  .count {
    font-size: 13px;
    color: var(--o2);
  }

  .desc {
    margin: 2px 0 4px;
    font-size: 11px;
    line-height: 1.5;
    color: var(--muted);
  }

  .cost {
    font-size: 11px;
    color: var(--warn);
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .actions button {
    padding: 4px 12px;
    font-size: 13px;
  }

  .hint {
    margin: 10px 0 0;
    font-size: 11px;
    color: var(--muted);
  }
</style>
