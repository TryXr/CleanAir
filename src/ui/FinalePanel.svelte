<script lang="ts">
  /**
   * Das Ende (M16, §19).
   *
   * Zwei Zustände, ein Panel: davor die Bedingung, danach der Epilog. Bewusst
   * kein Bildschirm, der sich über das Spiel legt und weggeklickt werden
   * will — wer nach dem Ende weiterspielt, soll den Text wiederfinden können
   * statt ihn einmal gesehen zu haben.
   */
  import { EPILOG, FINALE } from '../data/finale'
  import { findMaterial } from '../data/materials'
  import { PLANETS } from '../data/planets'
  import { formatInt } from '../engine/format'
  import { meta } from '../state/meta.svelte'
  import { materialAmount } from '../state/run.svelte'
  import { finaleBlocker, seedUniverse, stableCount } from '../systems/finale'
  import { capsulesUnderway } from '../systems/seeding'

  const stehen = $derived(stableCount())
  const unterwegs = $derived(capsulesUnderway())
  const blocker = $derived(finaleBlocker())
  const bereit = $derived(blocker === null)

  const posten = $derived(
    Object.entries(FINALE.materialCost).map(([id, menge]) => ({
      name: findMaterial(id)?.name ?? id,
      menge,
      da: materialAmount(id).toNumber(),
    })),
  )
</script>

{#if meta.finaleReached}
  <div class="epilog">
    {#each EPILOG as absatz, i (i)}
      <p class:letzter={i === EPILOG.length - 1}>{absatz}</p>
    {/each}
    <p class="signatur">
      Ausgesät am {new Date(meta.finaleAt).toLocaleDateString('de-DE')} — und das Spiel läuft weiter,
      falls du es willst.
    </p>

    <!-- Keine Funkverbindung, sondern ein Modell: der Epilog sagt, dass du
         nicht erfahren wirst, welche ankommen. Die Notizen rechnen weiter. -->
    <h3>Hochrechnung</h3>
    <dl class="zaehler">
      <div><dt>Kapseln unterwegs</dt><dd class="num">{formatInt(unterwegs)}</dd></div>
      <div><dt>ausgewertet</dt><dd class="num">{formatInt(meta.capsulesResolved)} / {formatInt(meta.capsules)}</dd></div>
      <div><dt>tragen</dt><dd class="num accent">{formatInt(meta.capsulesTaken)}</dd></div>
    </dl>

    {#if meta.seedLog.length > 0}
      <ul class="befunde">
        {#each meta.seedLog as zeile (zeile)}
          <li>{zeile}</li>
        {/each}
      </ul>
    {:else}
      <p class="signatur">Noch kein Befund. Das Modell rechnet weiter, auch wenn du zusiehst.</p>
    {/if}
  </div>
{:else}
  <p class="lead">{FINALE.hint}</p>

  <div class="fortschritt">
    <span class="zahl num">{stehen} / {PLANETS.length}</span>
    <span class="unit">Atmosphären stehen stabil</span>
  </div>
  <div class="bar" aria-hidden="true">
    <div class="fill" style:width="{(stehen / PLANETS.length) * 100}%"></div>
  </div>

  <ul class="posten">
    {#each posten as p (p.name)}
      <li class:fehlt={p.da < p.menge}>
        <span>{p.name}</span>
        <span class="num">{formatInt(p.da)} / {formatInt(p.menge)}</span>
      </li>
    {/each}
  </ul>

  <button class="primary" disabled={!bereit} onclick={seedUniverse}>
    {FINALE.name}
  </button>
  {#if !bereit}
    <p class="grund">{blocker}</p>
  {/if}
{/if}

<style>
  .lead {
    margin: 0 0 14px;
    font-size: 13px;
    line-height: 1.6;
    color: var(--text-dim);
  }

  .fortschritt {
    display: flex;
    align-items: baseline;
    gap: 10px;
  }

  .zahl {
    font-size: 22px;
    font-weight: 600;
    color: var(--o2);
  }

  .unit {
    font-size: 12px;
    color: var(--muted);
  }

  .bar {
    height: 5px;
    margin: 8px 0 16px;
    border-radius: 99px;
    background: var(--panel-soft);
    overflow: hidden;
  }

  .fill {
    height: 100%;
    background: var(--o2);
  }

  .posten {
    list-style: none;
    margin: 0 0 16px;
    padding: 0;
    display: grid;
    gap: 5px;
  }

  .posten li {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    font-size: 12px;
    color: var(--text-dim);
    border-bottom: 1px dotted var(--line-soft);
    padding-bottom: 4px;
  }

  .posten li.fehlt {
    color: var(--bad);
  }

  .grund {
    margin: 8px 0 0;
    font-size: 11px;
    color: var(--muted);
  }

  .epilog p {
    margin: 0 0 14px;
    font-size: 13px;
    line-height: 1.75;
    color: var(--text-dim);
  }

  /* Der letzte Absatz ist die Pointe — er bekommt Luft und Farbe. */
  .epilog p.letzter {
    color: var(--o2);
    border-left: 2px solid var(--o2-dim);
    padding-left: 14px;
  }

  .signatur {
    margin-top: 20px;
    font-size: 11px;
    color: var(--muted);
  }

  h3 {
    margin: 26px 0 10px;
    font-size: 10px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .zaehler {
    display: grid;
    gap: 5px;
    margin: 0 0 14px;
  }

  .zaehler div {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
    border-bottom: 1px dotted var(--line-soft);
    padding-bottom: 4px;
  }

  .zaehler dt {
    font-size: 11px;
    color: var(--muted);
  }

  .zaehler dd {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
  }

  .zaehler dd.accent {
    color: var(--o2);
  }

  .befunde {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 6px;
  }

  .befunde li {
    font-size: 12px;
    line-height: 1.5;
    color: var(--text-dim);
    padding-left: 12px;
    border-left: 1px solid var(--line-soft);
  }
</style>
