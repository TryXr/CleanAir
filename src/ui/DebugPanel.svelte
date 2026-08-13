<script lang="ts">
  import Decimal from 'break_infinity.js'
  import { planetForIndex } from '../data/planets'
  import { wipeSave } from '../engine/save'
  import { resetAtmosphereNotices } from '../systems/atmosphere'
  import { resetPopulationNotices } from '../systems/population'
  import { addLog } from '../state/log.svelte'
  import { planet, resetPlanet } from '../state/planet.svelte'
  import { meta } from '../state/meta.svelte'

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
   * Direkt auf den nächsten Planeten. Ohne das kostet jeder Test der
   * Vesta-Systeme — Mischung, Wald, Materialien — erst zwanzig Minuten
   * Aurora.
   */
  function skipPlanet(): void {
    const next = planetForIndex(meta.planetsCompleted + 1)
    meta.planetsCompleted += 1
    resetPlanet(next, new Decimal(25000))
    resetPopulationNotices()
    resetAtmosphereNotices()
    addLog(`Debug: übersprungen nach ${next.name}.`, 'warn')
  }
</script>

<p class="state">
  <span class="num">{planet.name}</span> · Planet {meta.planetsCompleted + 1} ·
  <span class="num">{Math.floor(planet.elapsed)}s</span>
</p>

<button onclick={skipPlanet}>Nächster Planet</button>
<button class="danger" onclick={resetAll}>Alles zurücksetzen</button>

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
