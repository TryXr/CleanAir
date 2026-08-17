<script lang="ts">
  /*
   * Die Übersichtsspalte links — was man beim Spielen ständig wissen muss,
   * ohne dafür den Reiter zu wechseln.
   *
   * Die Reiter aus M9 haben ein Problem mitgebracht: Nahrung und Wasser
   * stehen unter „Kolonie", gebaut wird unter „Aufbau", der Zielwert unter
   * „Planet". Wer baut, sieht also nicht, dass die Rationen leerlaufen — und
   * auf Aurora sind sie nach zwölf Minuten weg (§17).
   *
   * Bewusst nur Anzeige, keine Knöpfe: entschieden wird in den Reitern. Sonst
   * gäbe es zwei Orte für dieselbe Handlung, und einer davon wäre irgendwann
   * der veraltete. Die ausführliche Fassung mit Reichweite und Warnungen
   * bleibt im Versorgungs-Panel.
   *
   * **Eine Ausnahme: „O₂ freisetzen".** Sie ist keine Entscheidung, sondern
   * die Grundhandlung des Spiels, und sie war bis eben nur im Reiter „Planet"
   * erreichbar — wer unter „Aufbau" merkte, dass zehn O₂ fehlen, musste
   * zurückwechseln, klicken und wieder vorwechseln. Die Warnung oben bleibt
   * trotzdem gültig, deshalb steht der Knopf **einmal** in
   * ReleaseButton.svelte und wird hier wie im Atmosphären-Panel nur
   * eingesetzt. Zwei Kopien wären der veraltete Ort, vor dem dieser Absatz
   * warnt.
   */
  import { findGenerator } from '../data/generators'
  import { format, formatInt, formatPercent, formatRate, formatTime } from '../engine/format'
  import { currentPlanetDef, planet } from '../state/planet.svelte'
  import { inWindow, o2Percent, stabilityRequired } from '../systems/atmosphere'
  import { activeSite, secondsUntilDone } from '../systems/construction'
  import { contentment } from '../systems/contentment'
  import { handFactor, unassigned } from '../systems/labor'
  import {
    foodConsumption,
    netO2Rate,
    populationCapacity,
    waterConsumption,
  } from '../systems/population'
  import { currentO2Rate, supplyRate } from '../systems/production'
  import ReleaseButton from './ReleaseButton.svelte'

  const def = $derived(currentPlanetDef())
  const percent = $derived(o2Percent())
  const ziel = $derived(def.o2Window.min)
  const stabil = $derived(inWindow())

  const luftNetto = $derived(netO2Rate())

  const vorraete = $derived([
    { label: 'Nahrung', stock: planet.food, net: supplyRate('food').sub(foodConsumption()) },
    { label: 'Wasser', stock: planet.water, net: supplyRate('water').sub(waterConsumption()) },
  ])

  /*
   * **Die wirksame Grenze, nicht die Betten.**
   *
   * Hier stand `housingCapacity()`, und damit meldete die Leiste auf Aurora
   * „60 / 1.59K" — während die Kolonie bei 60 stehen bleibt, weil die
   * Planetengrenze bindet. Eine Zahl, die 1500 freie Plätze verspricht, die
   * es nicht gibt, ist schlimmer als gar keine: sie lässt einen Wohnraum
   * bauen, der nichts bewirkt. `populationCapacity()` ist das Minimum aus
   * beidem und damit die Zahl, an der die Kolonie tatsächlich anstößt.
   */
  const kapazitaet = $derived(populationCapacity())
  const frei = $derived(unassigned())
  /** Unter 70 % wächst nichts mehr (§17) — diese Schwelle ist die Farbe wert. */
  const knapp = $derived(planet.satiety < 0.7)
  const zufrieden = $derived(contentment())

  const baustelle = $derived(activeSite())
  const bauName = $derived(baustelle ? (findGenerator(baustelle.id)?.name ?? baustelle.id) : '')
</script>

<aside class="rail">
  <section>
    <h2>Ziel</h2>
    <div class="big">
      <span class="num">{percent.toFixed(2)}</span><span class="pct">%</span>
      <span class="of num">von {ziel} %</span>
    </div>
    <div class="bar" aria-hidden="true">
      <div class="fill" style="width: {Math.min(100, (percent / ziel) * 100).toFixed(2)}%"></div>
    </div>
    <!-- Der Timer erscheint erst, wenn er etwas bedeutet: vorher wäre „0s"
         nur eine Zahl, die nie gezählt hat. -->
    {#if stabil || planet.stability > 0}
      <p class="line" class:good={stabil}>
        Stabil <span class="num">{formatTime(planet.stability)} / {formatTime(stabilityRequired())}</span>
      </p>
    {/if}
  </section>

  <section>
    <h2>Sauerstoff</h2>
    <dl>
      <div>
        <dt>Vorrat</dt>
        <dd class="num accent">{format(planet.oxygen)}</dd>
      </div>
      <div>
        <dt>Produktion</dt>
        <dd class="num">{formatRate(currentO2Rate())}</dd>
      </div>
      <!-- Die Luft entscheidet über den Sieg, der Vorrat ist nur Kaufkraft
           (Regel 6). Netto negativ heißt: der Fortschritt läuft rückwärts,
           egal wie voll die Kasse ist. -->
      <div>
        <dt>Netto in der Luft</dt>
        <dd class="num" class:bad={luftNetto.lt(0)}>
          {luftNetto.lt(0) ? '' : '+'}{formatRate(luftNetto)}
        </dd>
      </div>
    </dl>
    <div class="klick">
      <ReleaseButton kompakt />
    </div>
  </section>

  {#if def.allowsPopulation}
    <section>
      <h2>Versorgung</h2>
      <dl>
        {#each vorraete as v (v.label)}
          <div>
            <dt>{v.label}</dt>
            <dd class="num" class:bad={v.stock.lte(0) || v.net.lt(0)}>
              {format(v.stock)}
              <span class="rate" class:bad={v.net.lt(0)}>
                {v.net.lt(0) ? '' : '+'}{formatRate(v.net)}
              </span>
            </dd>
          </div>
        {/each}
      </dl>
    </section>

    <section>
      <h2>Kolonie</h2>
      <dl>
        <div>
          <dt>Bewohner</dt>
          <dd class="num">{formatInt(planet.settlers)} / {formatInt(kapazitaet)}</dd>
        </div>
        <div>
          <dt>Ohne Aufgabe</dt>
          <dd class="num" class:accent={frei.gt(0)}>{formatInt(frei)}</dd>
        </div>
        <div>
          <dt>Sättigung</dt>
          <dd class="num" class:bad={knapp}>{formatPercent(planet.satiety * 100, 0)}</dd>
        </div>
        <div>
          <dt>Handleistung</dt>
          <dd class="num">{formatPercent(handFactor() * 100, 0)}</dd>
        </div>
        <!-- Zufriedenheit steht bewusst *nicht* neben der Handleistung: sie
             wirkt seit dem Nachtrag zu M14 nicht mehr auf sie, sondern auf
             die Biomasse und damit auf die Genesis-Kerne (§18). Der Faktor
             daneben sagt, was sie tatsächlich bringt. -->
        <div>
          <dt>Zufriedenheit</dt>
          <dd class="num" class:accent={zufrieden > 0}>
            {formatPercent(zufrieden * 100, 0)}
            <span class="rate">×{(1 + zufrieden).toFixed(2)} Biomasse</span>
          </dd>
        </div>
      </dl>
    </section>
  {/if}

  <section>
    <h2>Baustelle</h2>
    {#if baustelle}
      <p class="line">
        {bauName}{#if baustelle.remaining > 1}<span class="num"> ×{baustelle.remaining}</span>{/if}
      </p>
      <p class="line dim">noch <span class="num">{formatTime(secondsUntilDone(0))}</span></p>
    {:else}
      <p class="line dim">nichts im Bau</p>
    {/if}
  </section>
</aside>

<style>
  /*
   * Zwei Formen, ein Inhalt: schmales Fenster → ein Band über der Seite,
   * breites Fenster → die stehende Spalte links. Der Grenzwert 1320 px steht
   * auch in App.svelte, wo das Raster die dritte Spalte aufmacht.
   */
  .rail {
    display: flex;
    flex-wrap: wrap;
    background: var(--panel);
    border: 1px solid var(--line-soft);
    border-radius: var(--radius);
  }

  section {
    flex: 1 1 180px;
    padding: 10px 14px;
  }

  @media (min-width: 1320px) {
    .rail {
      flex-direction: column;
      padding: 4px 0;
      /* Mitlaufen statt mitscrollen: die Spalte soll auch dann noch da sein,
         wenn man unten in einer langen Anlagenliste steht. */
      position: sticky;
      top: 76px;
    }

    section {
      flex: initial;
    }

    section + section {
      border-top: 1px solid var(--line-soft);
    }
  }

  h2 {
    margin: 0 0 7px;
    font-size: 10px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--muted);
    font-weight: 600;
  }

  .big {
    display: flex;
    align-items: baseline;
    gap: 4px;
  }

  .big .num {
    font-size: 21px;
    font-weight: 600;
    color: var(--o2);
    line-height: 1.1;
  }

  .pct {
    font-size: 12px;
    color: var(--o2-dim);
  }

  .of {
    margin-left: auto;
    font-size: 11px;
    color: var(--muted);
  }

  .bar {
    height: 4px;
    margin-top: 7px;
    border-radius: 99px;
    background: var(--panel-soft);
    overflow: hidden;
  }

  .fill {
    height: 100%;
    background: var(--o2);
  }

  dl {
    display: grid;
    gap: 5px;
    margin: 0;
  }

  dl div {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
  }

  dt {
    font-size: 11px;
    color: var(--muted);
  }

  dd {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
  }

  .rate {
    margin-left: 5px;
    font-size: 10px;
    font-weight: 400;
    color: var(--good);
  }

  .accent {
    color: var(--o2);
  }

  .bad,
  .rate.bad {
    color: var(--bad);
  }

  .line {
    margin: 7px 0 0;
    font-size: 12px;
    color: var(--text-dim);
  }

  .line.good {
    color: var(--good);
  }

  .line.dim {
    font-size: 11px;
    color: var(--muted);
  }

  .line:first-of-type {
    margin-top: 0;
  }

  .klick {
    margin-top: 9px;
  }
</style>
