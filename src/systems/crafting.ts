import Decimal from 'break_infinity.js'
import { GENERATORS, type GeneratorDef } from '../data/generators'
import { findMaterial } from '../data/materials'
import { materialAmount, spendMaterials } from '../state/run.svelte'
import { generatorRate } from './production'
import { materialCapacity, storeMaterial } from './storage'

/**
 * Verarbeitung (M12, DESIGN.md §17).
 *
 * Bis M11 hatte jede Anlage genau eine Voraussetzung: jemanden, der daran
 * steht. Ein Rezept bringt die zweite — **Nachschub**. Eine Schmelze ohne Erz
 * steht genauso still wie eine ohne Personal, aber der Grund liegt nicht mehr
 * in der Kolonie, sondern in der Stufe davor. Genau das macht aus einer Liste
 * von Anlagen eine Kette.
 *
 * Zwei Regeln, die beide aus §1.2 folgen und ohne die das Lager aus M11 zur
 * Falle würde:
 *
 * **1. Kein Eingang, kein Verbrauch.** Was nicht da ist, wird nicht
 * abgebucht. Selbstverständlich — aber nur, solange man anteilig rechnet
 * statt in ganzen Rezepten.
 *
 * **2. Volles Ausgangslager heißt stocken, nicht fressen.** Eine Presse bei
 * vollem Plattenregal darf kein Eisen mehr verbrauchen. Sonst verschwände
 * Material in einer Anlage, deren Ausgang ohnehin verfällt — ein stiller,
 * dauerhafter Verlust, und damit dieselbe Sorte Schaden, gegen die M11 die
 * Lagergrenze bewusst *nur* den Nachschub stoppen ließ.
 *
 * Die Reihenfolge im Tick ist Balancing: `productionSystem` fördert zuerst,
 * erst danach greift die Kette darauf zu (siehe main.ts). Andersherum liefe
 * jede Stufe dem Erz einen Tick hinterher, und eine dreigliedrige Kette
 * hinge drei Ticks zurück.
 */

/** Alle Anlagen mit Rezept, in Datenreihenfolge. */
export function craftingGenerators(): GeneratorDef[] {
  return GENERATORS.filter((d) => d.output.kind === 'craft')
}

/**
 * Wie viel Ausgang der Eingang im Lager noch hergibt.
 *
 * Der knappste Posten entscheidet — wie bei der Sättigung ist es das Minimum
 * und nicht der Durchschnitt: aus Erz allein wird kein Stahl, wenn die Kohle
 * fehlt.
 */
export function inputLimit(def: GeneratorDef): Decimal {
  if (def.output.kind !== 'craft') return new Decimal(0)

  let limit: Decimal | null = null
  for (const [id, per] of Object.entries(def.output.input)) {
    if (per <= 0) continue
    const moeglich = materialAmount(id).div(per)
    if (limit === null || moeglich.lt(limit)) limit = moeglich
  }
  return limit ?? new Decimal(Infinity)
}

/** Wie viel Ausgang noch ins Regal passt. */
export function outputRoom(def: GeneratorDef): Decimal {
  if (def.output.kind !== 'craft') return new Decimal(0)
  const room = materialCapacity().sub(materialAmount(def.output.material))
  return room.lt(0) ? new Decimal(0) : room
}

/**
 * Warum diese Anlage gerade nichts tut — oder `null`, wenn sie läuft.
 *
 * Gehört hierher und nicht in die Komponente: die UI soll den Grund
 * *anzeigen*, nicht herleiten. Ein zweiter Satz derselben Bedingungen in
 * Svelte wäre die Sorte Doppelung, die beim nächsten Balancing auseinander
 * läuft.
 */
export function craftBlocker(def: GeneratorDef): string | null {
  if (def.output.kind !== 'craft') return null
  if (generatorRate(def).lte(0)) return null

  if (inputLimit(def).lte(0)) {
    const fehlt = Object.keys(def.output.input)
      .filter((id) => materialAmount(id).lte(0))
      .map((id) => findMaterial(id)?.name ?? id)
    return fehlt.length > 0 ? `kein ${fehlt.join(', ')}` : null
  }
  if (outputRoom(def).lte(0)) {
    const name = findMaterial(def.output.material)?.name ?? def.output.material
    return `Lager für ${name} voll`
  }
  return null
}

/**
 * Was diese Anlage im Moment tatsächlich schafft — nach Personal, Nachschub
 * und Platz. Auch die Anzeige nimmt diesen Wert, damit dort nie eine Rate
 * steht, die gar nicht ankommt.
 */
export function effectiveCraftRate(def: GeneratorDef): Decimal {
  if (def.output.kind !== 'craft') return new Decimal(0)
  return Decimal.min(Decimal.min(generatorRate(def), inputLimit(def)), outputRoom(def))
}

export function craftingSystem(dt: number): void {
  for (const def of craftingGenerators()) {
    if (def.output.kind !== 'craft') continue

    const soll = generatorRate(def).mul(dt)
    if (soll.lte(0)) continue

    /*
     * Beide Grenzen *vor* dem Abbuchen. Erst rechnen, dann verbrauchen — die
     * umgekehrte Reihenfolge ist genau der Fehler, der Material in einer
     * blockierten Anlage verschwinden lässt.
     */
    const menge = Decimal.min(Decimal.min(soll, inputLimit(def)), outputRoom(def))
    if (menge.lte(0)) continue

    // Anteilig, nicht in ganzen Rezepten: eine halb ausgelastete Presse
    // verbraucht auch nur halb so viel Eisen. Ganze Rezepte würden bei
    // kleinen dt schlicht nie auslösen.
    spendMaterials(def.output.input, menge.toNumber())
    storeMaterial(def.output.material, menge)
  }
}
