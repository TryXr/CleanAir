<script lang="ts">
  import { format, formatInt, formatRate, formatTime } from '../engine/format'
  import { inertPercent, totalAtmosphere } from '../systems/atmosphere'
  import { netO2Rate, o2ConsumptionRate, researchRate } from '../systems/population'
  import { currentN2Rate, currentO2Rate } from '../systems/production'
  import { totalStaff } from '../systems/labor'
  import { pendingCores } from '../systems/prestige'
  import { totalSettlers } from '../systems/travel'
  import { meta } from '../state/meta.svelte'
  import { planet, usesNitrogen, usesPollution } from '../state/planet.svelte'

  const stats = $derived(meta.stats)
  const since = $derived(
    new Date(meta.firstStarted).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }),
  )
</script>

<h3>Dieser Planet</h3>
<dl>
  <div><dt>Zeit auf {planet.name}</dt><dd class="num">{formatTime(planet.elapsed)}</dd></div>
  <div><dt>O₂ freigesetzt</dt><dd class="num">{format(planet.oxygenTotal)}</dd></div>
  <div><dt>O₂-Produktion</dt><dd class="num">{formatRate(currentO2Rate())}</dd></div>
  {#if usesNitrogen()}
    <div><dt>N₂-Produktion</dt><dd class="num">{formatRate(currentN2Rate())}</dd></div>
  {/if}
  {#if planet.settlers.gt(0)}
    <div><dt>Atmung</dt><dd class="num">−{formatRate(o2ConsumptionRate())}</dd></div>
    <div>
      <dt>Netto in der Luft</dt>
      <dd class="num" class:bad={netO2Rate().lt(0)}>
        {netO2Rate().lt(0) ? '' : '+'}{formatRate(netO2Rate())}
      </dd>
    </div>
    <!-- Kein globaler Multiplikator mehr (M13): Arbeitskraft ist, wer an
         einer Anlage steht. -->
    <div>
      <dt>Zugewiesen</dt>
      <dd class="num accent">{formatInt(totalStaff())} von {formatInt(planet.settlers)}</dd>
    </div>
    <div><dt>Forschung</dt><dd class="num">+{formatRate(researchRate())}</dd></div>
  {/if}
  <div><dt>Gesamtatmosphäre</dt><dd class="num">{format(totalAtmosphere())}</dd></div>
  <div><dt>davon Inertgas</dt><dd class="num">{inertPercent().toFixed(2)} %</dd></div>
  {#if usesPollution()}
    <div><dt>Schadstoffe</dt><dd class="num">{format(planet.pollution)}</dd></div>
  {/if}
  <div><dt>Biomasse</dt><dd class="num">{format(planet.biomass)}</dd></div>
  <div><dt>Kerne beim Sprung</dt><dd class="num warn">{formatInt(pendingCores())}</dd></div>
</dl>

<h3>Insgesamt</h3>
<dl>
  <div><dt>Spielzeit</dt><dd class="num">{formatTime(meta.totalPlaytime)}</dd></div>
  <div><dt>Erster Start</dt><dd class="num">{since}</dd></div>
  <div><dt>Durchläufe</dt><dd class="num">{meta.stats.runs}</dd></div>
  <div><dt>Planeten abgeschlossen</dt><dd class="num">{meta.planetsCompleted}</dd></div>
  {#if stats.bestPlanetSeconds > 0}
    <div>
      <dt>Schnellster Abschluss</dt>
      <dd class="num">{formatTime(stats.bestPlanetSeconds)}</dd>
    </div>
  {/if}
  <div><dt>O₂ jemals</dt><dd class="num">{format(stats.totalOxygen)}</dd></div>
  <div><dt>Klicks</dt><dd class="num">{formatInt(stats.totalClicks)}</dd></div>
  <div><dt>Bevölkerung gesamt</dt><dd class="num">{formatInt(meta.population.add(totalSettlers()))}</dd></div>
  <div><dt>Forschungspunkte</dt><dd class="num">{format(meta.research)}</dd></div>
  <div>
    <dt>Ereignisse</dt>
    <dd class="num">{stats.eventsSeen} · {stats.eventsHandled} beantwortet</dd>
  </div>
  <div><dt>Brände</dt><dd class="num" class:bad={stats.fires > 0}>{stats.fires}</dd></div>
</dl>

<style>
  h3 {
    margin: 16px 0 8px;
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-dim);
  }

  h3:first-child {
    margin-top: 0;
  }

  dl {
    display: grid;
    gap: 6px;
    margin: 0;
  }

  dl div {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    border-bottom: 1px dotted var(--line-soft);
    padding-bottom: 5px;
  }

  dt {
    font-size: 11px;
    color: var(--muted);
  }

  dd {
    margin: 0;
    font-size: 12px;
    white-space: nowrap;
  }

  .accent {
    color: var(--o2);
  }

  .warn {
    color: var(--warn);
  }

  .bad {
    color: var(--bad);
  }
</style>
