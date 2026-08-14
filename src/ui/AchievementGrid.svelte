<script lang="ts">
  import { ACHIEVEMENTS } from '../data/achievements'
  import { achievementCount, isUnlocked, progressOf } from '../systems/achievements'

  const zaehler = $derived(achievementCount())

  // Erreichte nach unten: was noch offen ist, ist das Interessante.
  const sortiert = $derived(
    [...ACHIEVEMENTS].sort((a, b) => Number(isUnlocked(a.id)) - Number(isUnlocked(b.id))),
  )
</script>

<p class="balance">
  <strong class="num">{zaehler.erreicht}</strong> von {zaehler.gesamt} — jedes mit dauerhaftem Bonus
</p>

<div class="grid">
  {#each sortiert as a (a.id)}
    {@const erreicht = isUnlocked(a.id)}
    {@const fortschritt = progressOf(a.condition)}
    <div class="card" class:done={erreicht}>
      <span class="name">{a.name}</span>
      <span class="desc">{a.description}</span>
      {#if erreicht}
        <span class="reward good">{a.reward}</span>
      {:else}
        <div class="track"><div class="fill" style="width: {(fortschritt * 100).toFixed(1)}%"></div></div>
        <span class="reward num">{Math.floor(fortschritt * 100)} % · {a.reward}</span>
      {/if}
    </div>
  {/each}
</div>

<style>
  .balance {
    margin: 0 0 12px;
    font-size: 12px;
    color: var(--muted);
  }

  .balance strong {
    color: var(--good);
    font-size: 14px;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(196px, 1fr));
    gap: 9px;
  }

  .card {
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 11px;
    background: var(--panel-soft);
    border: 1px solid var(--line-soft);
    border-radius: 8px;
  }

  .card.done {
    border-color: rgba(111, 207, 130, 0.4);
  }

  .name {
    font-size: 13px;
    font-weight: 600;
  }

  .card:not(.done) .name {
    color: var(--text-dim);
  }

  .desc {
    font-size: 11px;
    line-height: 1.5;
    color: var(--muted);
  }

  .track {
    height: 4px;
    margin-top: auto;
    background: #071018;
    border-radius: 99px;
    overflow: hidden;
  }

  .fill {
    height: 100%;
    background: var(--o2-dim);
  }

  .reward {
    font-size: 11px;
    color: var(--muted);
  }

  .reward.good {
    margin-top: auto;
    color: var(--good);
  }
</style>
