/**
 * Raketen (DESIGN.md §16).
 *
 * Die Rakete ist **Transport, kein Abschluss**. Sie bringt dich zum nächsten
 * Planeten; fertig ist ein Planet erst, wenn seine Atmosphäre stabil steht.
 * Beides ist bewusst entkoppelt — man darf weiterziehen und später
 * zurückkommen, um zu Ende zu terraformen. Ohne diese Entkopplung wäre ein
 * alter Planet ein abgehakter Punkt und die Rückkehr sinnlos.
 *
 * Jeder Planet baut seine eigene Rakete aus dem, was er hat. Das ist der
 * Hauptgrund, warum sich Planeten unterschiedlich anfühlen sollen: nicht
 * andere Zahlen für dieselbe Sache, sondern eine andere Bauaufgabe.
 */
import type { MaterialCost } from './materials'

export interface RocketDef {
  /** Von welchem Planeten diese Rakete startet. */
  planetId: string
  name: string
  description: string
  /** O₂ aus dem Vorrat des Planeten. */
  oxygenCost: number
  /** Material aus dem globalen Lager. */
  materialCost?: MaterialCost
}

export const ROCKETS: readonly RocketDef[] = [
  {
    planetId: 'aurora',
    name: 'Landefähre',
    description:
      'Kaum mehr als der Tank, mit dem du gekommen bist — aber diesmal mit einer Zelle, die ihr die Kolonie selbst gewalzt hat.',
    /*
     * **Die erste Rakete, die nichts mit O₂ zu tun hat** (§17, Entscheidung 1:
     * „Du kannst eine Rakete nicht aus O₂ bauen").
     *
     * Bis M11 kostete sie 250 000 O₂ und sonst nichts, weil Aurora keine
     * Materialien führte. Seit M12 gibt es die Eisenkette, und damit fällt
     * der O₂-Preis ersatzlos weg statt nur kleiner zu werden. Ein Restbetrag
     * wäre die halbherzige Variante: solange O₂ noch irgendwo Rechnungen
     * bezahlt, bleibt es Währung.
     *
     * O₂ ist ab hier auf Aurora ausschließlich das Ziel — der Wert, den man
     * hochbringt. Vesta bis Nimbus zahlen bis M13 weiter mit beidem.
     */
    oxygenCost: 0,
    materialCost: { platten: 400 },
  },
  {
    planetId: 'vesta',
    name: 'Titan-Träger',
    description:
      'Ein richtiges Schiff. Titan für die Zelle, Holz für die Verschalung, Stein für die Rampe — Vesta liefert alles davon selbst.',
    oxygenCost: 4000000,
    materialCost: { titan: 3500, holz: 9000, stein: 14000 },
  },

  /*
   * Ab hier verlangt jede Rakete etwas, das ihr Planet **nicht** hat. Das ist
   * kein Schikane-Design, sondern der Punkt des ganzen Kurswechsels: ohne
   * Rückflug kommt man nicht weiter, und dadurch sind alte Planeten keine
   * abgehakten Punkte, sondern Lager und Werkstatt.
   */
  {
    planetId: 'pyra',
    name: 'Schlackenwerfer',
    description:
      'Aus Obsidian und Schwefel gebaut, aber die Zelle hält nur mit Titan. Das wächst auf Pyra nicht — das holst du von Vesta.',
    oxygenCost: 9000000,
    materialCost: { obsidian: 12000, schwefel: 6000, titan: 5000 },
  },
  {
    planetId: 'kryo',
    name: 'Gletscherlanze',
    description:
      'Eis als Treibstoff, Obsidian als Hitzeschild. Kryo liefert das eine, Pyra das andere.',
    oxygenCost: 16000000,
    materialCost: { eis: 20000, obsidian: 9000, stein: 18000 },
  },
  {
    planetId: 'nimbus',
    name: 'Sammlerschiff',
    description:
      'Das letzte Schiff dieses Durchlaufs. Es trägt etwas von jedem Planeten, auf dem du warst.',
    oxygenCost: 40000000,
    materialCost: { helium: 15000, titan: 12000, obsidian: 10000, eis: 10000 },
  },
]

export function rocketFor(planetId: string): RocketDef | undefined {
  return ROCKETS.find((r) => r.planetId === planetId)
}
