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
      'Kaum mehr als der Tank, mit dem du gekommen bist, umgebaut auf einen Sprung. Aurora gibt nichts her, woraus man etwas Besseres bauen könnte.',
    // Aurora kennt keine Materialien (§11 — reines O₂-Tutorial), also kostet
    // die erste Rakete nur das, was der Planet überhaupt hat.
    oxygenCost: 250000,
  },
  {
    planetId: 'vesta',
    name: 'Titan-Träger',
    description:
      'Ein richtiges Schiff. Titan für die Zelle, Holz für die Verschalung, Stein für die Rampe — Vesta liefert alles davon selbst.',
    oxygenCost: 4000000,
    materialCost: { titan: 3500, holz: 9000, stein: 14000 },
  },
]

export function rocketFor(planetId: string): RocketDef | undefined {
  return ROCKETS.find((r) => r.planetId === planetId)
}
