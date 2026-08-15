<script lang="ts">
  import Decimal from 'break_infinity.js'
  import { wipeSave } from '../engine/save'
  import { nextPlanetAfter, travelTo } from '../systems/travel'
  import { addLog } from '../state/log.svelte'
  import { planet } from '../state/planet.svelte'
  import { meta } from '../state/meta.svelte'
  import { run, unlockPlanet } from '../state/run.svelte'
  import { MATERIALS } from '../data/materials'
  import { PLANETS } from '../data/planets'

  /**
   * Werkzeuge fürs Spieltesten. Wird in App.svelte nur eingehängt, wenn
   * `import.meta.env.DEV` gilt — im Production-Build existiert das Panel
   * nicht und fliegt beim Tree-Shaking mit raus.
   *
   * Bewusst ohne Rückfrage: beim Balancing drückt man das zwanzigmal
   * hintereinander, und ein Bestätigungsdialog wäre genau zwanzigmal im Weg.
   * Der reguläre „Löschen"-Knopf im Spielstand-Panel fragt weiterhin nach.
   */
  function resetAll(): void {
    // wipeSave() sperrt zusätzlich jedes weitere Speichern bis zum Neuladen.
    // Ohne diese Sperre schriebe der beforeunload-Handler den aktuellen
    // Stand beim reload sofort wieder zurück.
    wipeSave()
    location.reload()
  }

  /**
   * Schaltet den nächsten Planeten frei und fliegt hin. Ohne das kostet
   * jeder Test der Vesta-Systeme — Mischung, Wald, Materialien, Berufe —
   * erst zwanzig Minuten Aurora.
   *
   * Geht bewusst über travelTo(), damit hier derselbe Weg getestet wird,
   * den der Spieler nimmt: Planet einlagern, Ziel auspacken.
   */
  function skipPlanet(): void {
    const next = nextPlanetAfter(planet.id)
    if (!next) {
      addLog('Debug: kein weiterer Planet vorhanden.', 'warn')
      return
    }
    unlockPlanet(next.id)
    planet.oxygen = planet.oxygen.add(new Decimal(25000))
    travelTo(next.id)
    addLog(`Debug: gesprungen nach ${next.name}.`, 'warn')
  }

  /**
   * Versetzt in die Spätphase: alle Planeten frei, das Lager voll.
   *
   * Der Grund ist der Befund, der sich durch dieses Projekt zieht — Fehler
   * sitzen dort, wo nur ein Mensch hinkommt, und an Erebos, der Werkstatt und
   * dem Ende kommt man sonst erst nach Stunden. Wer sie nie mit der Hand
   * öffnet, findet dort dieselben Sachen wie damals bei den
   * Versorgungsanlagen: nie.
   *
   * Bewusst **ohne** stabile Atmosphären — die muss man weiterhin selbst
   * herstellen. Es ist eine Abkürzung zum Inhalt, kein Durchspielen.
   */
  function lateGame(): void {
    for (const p of PLANETS) unlockPlanet(p.id)
    const lager: Record<string, Decimal> = {}
    for (const m of MATERIALS) lager[m.id] = new Decimal(50000)
    run.materials = lager
    planet.oxygen = planet.oxygen.add(new Decimal(5e7))
    planet.oxygenTotal = planet.oxygenTotal.add(new Decimal(5e7))
    addLog('Debug: Spätphase hergestellt — alle Planeten frei, Lager voll.', 'warn')
  }

  /**
   * Erklärt alle Planeten für stabil — der einzige Weg, das Ende in Minuten
   * statt in Stunden zu sehen. Getrennt vom Knopf darüber, weil es das Spiel
   * *überspringt* statt es abzukürzen.
   */
  function allStable(): void {
    planet.completed = true
    const eingelagert = { ...run.planets }
    for (const p of PLANETS) {
      if (p.id === planet.id) continue
      eingelagert[p.id] = { ...(eingelagert[p.id] ?? { id: p.id }), completed: true }
    }
    run.planets = eingelagert
    addLog('Debug: alle Atmosphären als stabil markiert.', 'warn')
  }
</script>

<p class="state">
  <span class="num">{planet.name}</span> · Durchlauf {meta.stats.runs + 1} ·
  <span class="num">{Math.floor(planet.elapsed)}s</span>
</p>

<button onclick={skipPlanet}>Nächster Planet</button>
<button onclick={lateGame}>Spätphase</button>
<button onclick={allStable}>Alles stabil</button>
<button class="danger" onclick={resetAll}>Alles zurücksetzen</button>

<p class="hint">
  „Spätphase" schaltet alle Planeten frei und füllt das Lager — der Weg zu Erebos und zur
  Werkstatt, ohne Stunden dafür zu spielen. „Alles stabil" erklärt zusätzlich alle Atmosphären
  für fertig und macht damit das Ende sichtbar; das überspringt das Spiel, statt es abzukürzen.
</p>

<p class="hint">
  Löscht Spielstand, Meta und Forschung und startet frisch auf Aurora — ohne Rückfrage.
</p>

<style>
  .state {
    margin: 0 0 10px;
    font-size: 12px;
    color: var(--text-dim);
  }

  button {
    width: 100%;
    padding: 9px;
    font-size: 13px;
  }

  button + button {
    margin-top: 7px;
  }

  .hint {
    margin: 9px 0 0;
    font-size: 11px;
    line-height: 1.5;
    color: var(--muted);
  }
</style>
