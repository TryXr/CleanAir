<script lang="ts">
  import type { Snippet } from 'svelte'

  interface Props {
    title: string
    hint?: string
    children?: Snippet
  }

  let { title, hint = '', children }: Props = $props()
</script>

<section class="panel">
  <header>
    <h2>{title}</h2>
    {#if hint}<span class="hint">{hint}</span>{/if}
  </header>
  <div class="body">
    {@render children?.()}
  </div>
</section>

<style>
  .panel {
    background: var(--panel);
    border: 1px solid var(--line-soft);
    border-radius: var(--radius);
    overflow: hidden;
  }

  header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
    padding: 11px 16px;
    background: linear-gradient(180deg, #0f1a24, #0b131b);
    border-bottom: 1px solid var(--line-soft);
  }

  h2 {
    font-size: 12px;
    letter-spacing: 0.11em;
    text-transform: uppercase;
    color: var(--text-dim);
  }

  .hint {
    font-size: 11px;
    color: var(--muted);
  }

  .body {
    padding: 16px;
  }
</style>
