<script lang="ts">
  import type { WindowStatus } from '../systems/atmosphere'

  interface Props {
    status: WindowStatus
  }

  let { status }: Props = $props()

  /** Position auf der Skala in Prozent der Balkenbreite. */
  function pos(value: number): number {
    return Math.min(100, Math.max(0, (value / status.scaleMax) * 100))
  }

  const left = $derived(pos(status.min))
  const width = $derived(Math.max(0.8, pos(status.max) - pos(status.min)))
  const marker = $derived(pos(status.value))
  const below = $derived(status.value < status.min)
</script>

<div class="row" class:ok={status.ok}>
  <div class="labels">
    <span class="label">{status.label}</span>
    <span class="value num">{status.value.toFixed(2)} %</span>
    <span class="window num">
      {#if status.key === 'pollution'}
        Ziel unter {status.max} %
      {:else}
        Ziel {status.min}–{status.max} %
      {/if}
    </span>
  </div>

  <div class="track">
    <!-- Das Zielfenster als Band, nicht als Linie: man trifft einen Bereich. -->
    <div class="band" style="left: {left}%; width: {width}%"></div>
    <div class="fill" style="width: {marker}%"></div>
    <div class="marker" style="left: {marker}%"></div>
  </div>

  <span class="state">
    {#if status.ok}
      im Fenster
    {:else if below}
      zu niedrig
    {:else}
      zu hoch
    {/if}
  </span>
</div>

<style>
  .row {
    margin-bottom: 12px;
  }

  .labels {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin-bottom: 5px;
  }

  .label {
    font-size: 12px;
    font-weight: 600;
    min-width: 74px;
  }

  .value {
    font-size: 15px;
    font-weight: 600;
    color: var(--bad);
  }

  .ok .value {
    color: var(--good);
  }

  .window {
    margin-left: auto;
    font-size: 11px;
    color: var(--muted);
  }

  .track {
    position: relative;
    height: 10px;
    background: #071018;
    border: 1px solid var(--line);
    border-radius: 99px;
    overflow: hidden;
  }

  .band {
    position: absolute;
    top: 0;
    bottom: 0;
    background: rgba(111, 207, 130, 0.22);
    border-left: 1px solid rgba(111, 207, 130, 0.5);
    border-right: 1px solid rgba(111, 207, 130, 0.5);
  }

  .fill {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    background: linear-gradient(90deg, var(--o2-dim), var(--o2));
    opacity: 0.5;
    transition: width 0.18s linear;
  }

  .marker {
    position: absolute;
    top: -2px;
    bottom: -2px;
    width: 2px;
    margin-left: -1px;
    background: var(--text);
    transition: left 0.18s linear;
  }

  .state {
    display: block;
    margin-top: 4px;
    font-size: 11px;
    color: var(--bad);
  }

  .ok .state {
    color: var(--good);
  }
</style>
