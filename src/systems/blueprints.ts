import { GENERATORS, findGenerator } from '../data/generators'
import { RESEARCH } from '../data/research'
import { SALVAGE } from '../data/salvage'
import { ACHIEVEMENTS } from '../data/achievements'
import { addLog } from '../state/log.svelte'
import { meta } from '../state/meta.svelte'

/**
 * Baupläne (M20, DESIGN.md §20.1).
 *
 * Der letzte der drei Teile aus §20. Der Befund dort: **man arbeitet auf
 * nichts hin, weil nach wenigen Minuten alles offensteht.** Ein Bauplan ist
 * das Schloss davor — eine Anlage lässt sich erst bauen, wenn man weiß, wie.
 *
 * **Baupläne liegen in `meta`.** Sie sind damit die dritte Sorte dauerhaften
 * Fortschritts neben Kernen und Forschung: einmal verdient, für immer da. Ein
 * Durchlauf-Reset, der Wissen zurücknimmt, macht aus dem Neuanfang eine
 * Strafe und verstößt gegen §1.2.
 *
 * > **Ein Gegenmittel bekommt nie ein Schloss.**
 * >
 * > Wäscher und Ventil sind die Gegenstücke, die CLAUDE.md für alles
 * > verlangt, was wächst — ohne sie ist Überschuss ein dauerhafter Schaden.
 * > Sie hinter eine Forschungskette zu hängen wäre genau die Wand, vor der
 * > §20.1 warnt: auf Erebos beginnt der Planet mit 60 % Schadstoffen, und wer
 * > dort erst zwei Forschungsknoten kaufen muss, bevor er waschen darf, steht
 * > vor einer Tür, die nur von innen aufgeht. Dasselbe gilt für den ersten
 * > O₂-Erzeuger, den ersten Wohnraum und die erste Versorgung: **was einen
 * > Planeten überhaupt in Gang bringt, ist immer bekannt.**
 */

/** Kennt der Spieler diesen Bauplan? */
export function knowsBlueprint(id: string): boolean {
  return meta.blueprints.includes(id)
}

/**
 * Darf diese Anlage gebaut werden?
 *
 * Anlagen ohne `needsBlueprint` sind immer bekannt — das ist der Startsatz
 * und alles, was einen Planeten in Gang bringt.
 */
export function isUnlocked(id: string): boolean {
  const def = findGenerator(id)
  if (!def?.needsBlueprint) return true
  return knowsBlueprint(id)
}

/**
 * Trägt einen Bauplan ein und meldet ihn — einmal.
 *
 * Die Meldung gehört hierher und nicht an die drei Quellen: sonst steht
 * derselbe Satz dreimal im Code und beim vierten Mal anders.
 */
export function grantBlueprint(id: string, quelle: string): boolean {
  if (knowsBlueprint(id)) return false
  meta.blueprints = [...meta.blueprints, id]
  const name = findGenerator(id)?.name ?? id
  addLog(`Bauplan: ${name}. ${quelle}`, 'good')
  return true
}

/* --- Die drei Quellen ------------------------------------------------------
   Jede erzählt etwas anderes: was man versteht, kann man bauen (Forschung);
   was man findet, kann man nachbauen (Bergung); wer etwas geschafft hat, hat
   sich etwas verdient (Erfolge). Die Zuordnung selbst steht in `data/` — hier
   steht nur, wann nachgesehen wird.
-------------------------------------------------------------------------- */

/** Nach jedem Forschungskauf: welche Stufen sind jetzt erreicht? */
export function grantFromResearch(nodeId: string, level: number): void {
  const node = RESEARCH.find((n) => n.id === nodeId)
  if (!node?.blueprints) return
  for (const eintrag of node.blueprints) {
    if (level >= eintrag.level) grantBlueprint(eintrag.id, `Aus ${node.name}, Stufe ${eintrag.level}.`)
  }
}

/** Nach einem abgeschlossenen Bergungsanlauf. */
export function grantFromSalvage(targetId: string): void {
  const target = SALVAGE.find((t) => t.id === targetId)
  if (!target?.blueprints) return
  for (const id of target.blueprints) grantBlueprint(id, `Geborgen aus: ${target.name}.`)
}

/** Nach einem freigeschalteten Erfolg. */
export function grantFromAchievement(achievementId: string): void {
  const a = ACHIEVEMENTS.find((x) => x.id === achievementId)
  if (!a?.blueprints) return
  for (const id of a.blueprints) grantBlueprint(id, `Verdient mit: ${a.name}.`)
}

/**
 * Woher dieser Bauplan kommt — als Satz für die Oberfläche.
 *
 * **Ein verschlossenes Feld muss sichtbar sein.** §20 will, dass man auf
 * etwas hinarbeitet; auf etwas, das gar nicht dasteht, kann man nicht
 * hinarbeiten, und der Unterschied zwischen „gibt es hier nicht" und „kannst
 * du noch nicht" ist für den Spieler der ganze Punkt. Deshalb zeigt die
 * Anlagenliste eine gesperrte Zeile mit genau diesem Satz statt gar nichts.
 */
export function blueprintSource(id: string): string {
  const quellen: string[] = []
  for (const n of RESEARCH) {
    for (const b of n.blueprints ?? []) {
      if (b.id === id) quellen.push(`${n.name}, Stufe ${b.level}`)
    }
  }
  for (const t of SALVAGE) {
    if (t.blueprints?.includes(id)) quellen.push(t.name)
  }
  for (const a of ACHIEVEMENTS) {
    if (a.blueprints?.includes(id)) quellen.push(a.name)
  }
  return quellen.length > 0 ? quellen.join(' oder ') : 'unbekannt'
}

/* --- Für Prüfungen und Anzeige --------------------------------------------- */

/** Alle Anlagen, die überhaupt einen Bauplan brauchen. */
export function gatedGenerators(): string[] {
  return GENERATORS.filter((g) => g.needsBlueprint).map((g) => g.id)
}

/**
 * Jeder Bauplan muss aus mindestens einer Quelle kommen.
 *
 * Ohne diese Prüfung wäre ein Tippfehler in `data/` eine Anlage, die niemand
 * je bauen kann — und zwar unsichtbar, weil sie in keiner Liste steht. Genau
 * die Fehlerklasse, die in diesem Projekt schon acht Meilensteine überlebt
 * hat (CLAUDE.md, „Verfügbar ist nicht sichtbar").
 */
export function unreachableBlueprints(): string[] {
  const erreichbar = new Set<string>()
  for (const n of RESEARCH) for (const b of n.blueprints ?? []) erreichbar.add(b.id)
  for (const t of SALVAGE) for (const id of t.blueprints ?? []) erreichbar.add(id)
  for (const a of ACHIEVEMENTS) for (const id of a.blueprints ?? []) erreichbar.add(id)
  return gatedGenerators().filter((id) => !erreichbar.has(id))
}

/**
 * Baupläne, deren **einzige** Quelle sich selbst voraussetzt.
 *
 * Die Prüfung darüber fragt „gibt es eine Quelle?" und war damit zufrieden —
 * die Baumschule hatte eine: den Erfolg „Förster". Der verlangt 10.000
 * stehende Bäume, und Bäume gibt es ausschließlich aus der Baumschule. Ein
 * geschlossener Ring, gefunden erst beim Spielen (M35), obwohl die
 * Sackgassenprüfung aus M20 genau dafür gebaut war.
 *
 * Geprüft wird der Fall, der ihn erzeugt: ein Erfolg, dessen Bedingung an
 * einer Menge hängt, die nur die gesperrte Anlage selbst hervorbringt. `trees`
 * kommt nur aus `plant`, `material` nur aus `material` — mehr Bedingungsarten
 * hängen heute nicht an Anlagen, und eine neue fällt hier auf, weil sie
 * eingetragen werden muss.
 *
 * **Eine Quelle zählt nur, wenn man sie ohne das Verschlossene erreicht.**
 */
export function circularBlueprints(): string[] {
  const ring: string[] = []

  for (const id of gatedGenerators()) {
    const def = findGenerator(id)
    if (!def) continue

    const quellen = [
      ...RESEARCH.filter((n) => (n.blueprints ?? []).some((b) => b.id === id)),
      ...SALVAGE.filter((t) => (t.blueprints ?? []).includes(id)),
    ]
    // Forschung und Bergung sind nie selbstbezüglich: beide laufen ohne diese
    // Anlage. Gibt es dort eine Quelle, ist der Bauplan erreichbar.
    if (quellen.length > 0) continue

    const erfolge = ACHIEVEMENTS.filter((a) => (a.blueprints ?? []).includes(id))
    const alleSelbstbezüglich =
      erfolge.length > 0 &&
      erfolge.every((a) => {
        const c = a.condition
        if (c.kind === 'trees') return def.output.kind === 'plant'
        if (c.kind === 'material') {
          return def.output.kind === 'material' && def.output.material === c.material
        }
        return false
      })

    if (alleSelbstbezüglich) ring.push(id)
  }

  return ring
}
