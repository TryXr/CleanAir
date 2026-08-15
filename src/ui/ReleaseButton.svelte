<script lang="ts">
  import { format } from '../engine/format'
  import { clickGain, releaseOxygen } from '../systems/production'

  /**
   * „O₂ freisetzen" — die eine Handlung, die immer geht.
   *
   * **Warum als eigene Komponente.** In der Übersichtsleiste steht seit M9
   * ausdrücklich „bewusst nur Anzeige, keine Knöpfe: sonst gäbe es zwei Orte
   * für dieselbe Handlung, und einer davon wäre irgendwann der veraltete."
   * Die Sorge ist berechtigt — die Antwort darauf ist aber nicht, den Knopf
   * wegzulassen, sondern ihn **einmal** zu bauen und zweimal hinzustellen.
   * Zwei Kopien desselben Markups wären genau der veraltete Ort.
   *
   * Und die Ausnahme trägt: der Klick ist keine *Entscheidung* wie Kaufen
   * oder Zuweisen, sondern die Grundhandlung des Spiels. Wer im Reiter
   * „Aufbau" merkt, dass zehn O₂ fehlen, soll nicht erst zurückwechseln
   * müssen.
   */
  interface Props {
    /** Schmale Fassung für die Übersichtsleiste. */
    kompakt?: boolean
  }

  const { kompakt = false }: Props = $props()

  const gain = $derived(clickGain())
</script>

<button class="release primary" class:kompakt onclick={releaseOxygen}>
  <span>O₂ freisetzen</span>
  <span class="gain num">+{format(gain)}</span>
</button>

<style>
  .release {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    width: 100%;
    padding: 15px;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.02em;
  }

  .gain {
    color: var(--o2);
    font-size: 13px;
  }

  .kompakt {
    gap: 7px;
    padding: 8px;
    font-size: 12px;
  }

  .kompakt .gain {
    font-size: 11px;
  }
</style>
