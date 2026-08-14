<script lang="ts">
  import { GENERATORS } from '../data/generators'
  import { rocketFor } from '../data/rockets'
  import { atmosphereStatus, fireIntensity, inWindow } from '../systems/atmosphere'
  import { canBuildRocket } from '../systems/travel'
  import { generatorCost } from '../systems/production'
  import { housingCapacity } from '../systems/population'
  import { currentPlanetDef, generatorCount, pendingUnits, planet } from '../state/planet.svelte'

  /**
   * Ein Satz, der sagt, was jetzt dran ist.
   *
   * Der häufigste Abbruchgrund in Incrementals ist nicht Schwierigkeit,
   * sondern Ratlosigkeit: zwanzig Panels und kein Hinweis, welches gerade
   * zählt. Der Hinweis wird aus dem Zustand abgeleitet, nicht aus einem
   * Skript — er kann also nie „falsch stehenbleiben".
   *
   * Bewusst *ein* Satz und ohne Ausrufezeichen. Er soll führen, nicht drängen
   * (§1.3: „nie eine erzwungene Klick-Entscheidung").
   */
  const hinweis = $derived.by((): string | null => {
    const def = currentPlanetDef()
    const erste = GENERATORS[0]!

    // Ganz am Anfang: es gibt genau eine sinnvolle Handlung.
    if (generatorCount(erste.id) === 0 && pendingUnits(erste.id) === 0) {
      return planet.oxygen.gte(generatorCost(erste, 1))
        ? `Du kannst dir die erste ${erste.name} leisten — unter „Aufbau".`
        : 'Setz O₂ frei, bis die erste Anlage bezahlbar ist.'
    }

    /*
     * Seit M11 die häufigste Ratlosigkeit: es ist bezahlt, es passiert
     * nichts. Der Grund steht auf der Baustelle und nicht dort, wo geklickt
     * wurde — also hier.
     */
    if (planet.sites.length > 0 && planet.builders === 0) {
      return 'Auf der Baustelle steht niemand. Weis unter „Aufbau" Bauarbeiter zu.'
    }

    if (planet.completed) {
      const rakete = rocketFor(planet.id)
      if (rakete && !planet.rocketBuilt) {
        return canBuildRocket()
          ? `${def.name} steht stabil. Die ${rakete.name} lässt sich jetzt bauen — unter „Imperium".`
          : `${def.name} steht stabil. Für die Weiterreise fehlt noch Material für die ${rakete.name}.`
      }
      return `${def.name} ist fertig. Unter „Imperium" geht es weiter oder zurück.`
    }

    if (fireIntensity() > 0.02) {
      return def.n2Window
        ? 'Zu viel O₂ — es brennt. N₂ verdünnt die Mischung und erstickt die Brände.'
        : 'Zu viel O₂ — es brennt.'
    }

    // Wohnraum ist seit M5 die Bremse, die man am ehesten übersieht.
    if (def.allowsPopulation && housingCapacity().lte(0)) {
      return 'Ohne Wohnraum landet niemand. Bau welchen unter „Aufbau".'
    }

    const offen = atmosphereStatus().find((s) => !s.ok)
    if (offen) {
      if (offen.key === 'o2') {
        return offen.value < offen.min
          ? 'Der O₂-Anteil ist zu niedrig. Mehr Anlagen, mehr Luft.'
          : 'Der O₂-Anteil liegt über dem Fenster. N₂ verdünnt ihn.'
      }
      if (offen.key === 'n2') {
        return offen.value < offen.min
          ? 'Der N₂-Puffer fehlt. Ohne ihn passt das Fenster nie.'
          : 'Zu viel N₂ — es drückt den O₂-Anteil nach unten.'
      }
      return 'Die Schadstoffe stehen über der Grenze. Wäscher bauen.'
    }

    if (inWindow()) {
      return 'Alle Werte im Fenster. Jetzt nichts kaputtmachen — der Timer läuft.'
    }
    return null
  })
</script>

{#if hinweis}
  <p class="hint">{hinweis}</p>
{/if}

<style>
  .hint {
    margin: 0 0 var(--gap);
    padding: 10px 14px;
    font-size: 13px;
    line-height: 1.5;
    color: var(--text-dim);
    background: var(--panel);
    border: 1px solid var(--line-soft);
    border-left: 2px solid var(--o2-dim);
    border-radius: var(--radius);
  }
</style>
