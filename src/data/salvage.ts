/**
 * Bergungsziele (M18, DESIGN.md §20.2).
 *
 * Reine Daten wie alles in diesem Ordner. Ein Ziel ist ein Ort auf einem
 * Planeten, zu dem ein Trupp losziehen kann — er ist eine Weile weg, fehlt so
 * lange in der Arbeitsleistung und bringt etwas mit.
 *
 * **Warum es das gibt.** §20 nennt den Befund: man arbeitet auf nichts hin,
 * weil nach wenigen Minuten alles offensteht. Bergung ist der lange Weg, und
 * ihr Preis sind ausdrücklich **Hände** und nicht Zeit — ein Grind, der nur
 * Zeit kostet, füllt man mit einem zweiten Tab.
 *
 * **Und es ist der Ort, an dem dieses Spiel seine Vorgeschichte erzählt.**
 * Bis hierher erzählt CleanAir über Anlagenbeschreibungen und Zahlen (§1.4).
 * Ein Ziel gibt bei jedem Anlauf einen weiteren Satz heraus, der Reihe nach —
 * das ist der eigentliche Grund, ein Wrack ein sechstes Mal anzulaufen, und
 * es ist ein Ertrag, den kein Balancing kaputtmachen kann.
 */

export interface SalvageYield {
  /** Material-id aus data/materials.ts. */
  material: string
  /** Menge bei vollem Trupp und unberührtem Ziel. */
  amount: number
}

export interface SalvageTarget {
  id: string
  /** Auf welchen Planeten dieses Ziel liegt. */
  planets: readonly string[]
  name: string
  /** Ein Satz Fiktion, wie überall in data/. */
  description: string

  /** Sekunden für einen Anlauf. */
  duration: number
  /** Kleinster und größter Trupp. */
  minCrew: number
  maxCrew: number

  yields: readonly SalvageYield[]

  /**
   * Wie stark ein Anlauf das Ziel erschöpft (0…1 vom Rest).
   *
   * Zusammen mit `recovery` ist das der Boden unter dem Grind: ohne
   * Erschöpfung wäre Bergung ein Automat, den man einmal einrichtet; mit
   * einer harten Obergrenze wäre sie eine Liste zum Abhaken (§20.2).
   */
  depletion: number
  /**
   * Anteil, um den sich das Ziel je Sekunde erholt.
   *
   * **Muss deutlich langsamer sein, als ein Anlauf leert** — sonst baut sich
   * nie eine Erschöpfung auf, und das ganze Gegenstück ist Zierde. Genau das
   * war der erste Satz Zahlen hier: 0,0016/s über einen Anlauf von 300 s sind
   * 0,48 Erholung gegen 0,28 Erschöpfung, das Ziel war also nach jeder Fahrt
   * voller als vorher. Der Selbsttest hat es gemeldet („Ein zweiter Anlauf
   * bringt weniger — 25 → 25"), kein Mensch hätte es beim Lesen gesehen.
   *
   * Die Werte sind jetzt so gesetzt, dass Dauerbetrieb sich bei rund 40 %
   * Ergiebigkeit einpendelt: `x = 1 − recovery × duration / depletion`. Wer
   * ununterbrochen fährt, bekommt weniger pro Fahrt als jemand, der das Ziel
   * ruhen lässt — und das ist der Boden, den §20.2 verlangt.
   */
  recovery: number

  /**
   * Grundrisiko eines Zwischenfalls bei **kleinstem** Trupp.
   *
   * Ein großer Trupp ist sicherer — daraus wird die Entscheidung, um die es
   * bei der Truppgröße geht: wenige Leute sind billig und riskant, viele sind
   * sicher und fehlen an den Anlagen. Wo Anoxen sitzen, kommt ein Zuschlag
   * dazu (systems/salvage.ts).
   */
  risk: number

  /**
   * Was der Trupp beim n-ten Anlauf mitbringt — der Reihe nach, nicht
   * gewürfelt. Ist die Liste durch, gibt es nur noch Material.
   */
  fragments: readonly string[]

  /** Baupläne, die der erste erfolgreiche Anlauf mitbringt (M20). */
  blueprints?: readonly string[]

  /** Ab wie viel jemals freigesetztem O₂ das Ziel sichtbar wird. */
  revealAt: number
}

export const SALVAGE: readonly SalvageTarget[] = [
  {
    id: 'lander',
    blueprints: ['depot'],
    planets: ['aurora'],
    name: 'Die erste Landefähre',
    description:
      'Sie steht seit dem ersten Tag am Rand des Flechtenfelds. Niemand hat sie je ausgeräumt — es gab immer Dringenderes.',
    duration: 300,
    minCrew: 3,
    maxCrew: 8,
    yields: [
      { material: 'platten', amount: 40 },
      { material: 'werkzeug', amount: 2 },
      { material: 'fundstueck', amount: 1.1 },
    ],
    depletion: 0.28,
    recovery: 0.00037,
    risk: 0.05,
    fragments: [
      'In der Fähre liegen vier Schlafkojen. Drei sind benutzt worden.',
      'Ein Handbuch, wasserfleckig: „Kapitel 4 — Wenn der Anteil nach 200 Tagen unter 1 % steht."',
      'Der Bordrechner läuft noch. Letzter Eintrag: eine Bestellung für Saatgut, nie abgeschickt.',
      'Unter der Rampe eine eingeritzte Strichliste. Sie hört bei achtzig auf.',
    ],
    revealAt: 250,
  },
  {
    id: 'mast',
    planets: ['vesta'],
    name: 'Der Vermessungsmast',
    description:
      'Ein Gittermast auf dem Kamm, gebaut von einem Trupp, der vor dir hier war und weiterzog. Die Verankerung ist mehr wert als die Messtechnik.',
    duration: 420,
    minCrew: 4,
    maxCrew: 10,
    yields: [
      { material: 'titan', amount: 30 },
      { material: 'holz', amount: 60 },
      { material: 'werkzeug', amount: 2 },
      { material: 'fundstueck', amount: 1.2 },
    ],
    depletion: 0.25,
    recovery: 0.000238,
    risk: 0.07,
    fragments: [
      'Die Karten im Mastfuß sind sauber gezeichnet und brechen mitten im Blatt ab.',
      'Auf der Rückseite eine Notiz: „N₂ zuerst. Wir haben es andersherum versucht."',
      'Ein zweiter Satz Karten, für einen Planeten, der auf keiner Route steht.',
    ],
    revealAt: 400,
  },
  {
    id: 'brueche',
    planets: ['pyra'],
    name: 'Die Schwefelbrüche',
    description:
      'Offene Gruben, in denen vor dir jemand gearbeitet hat. Der Wind trägt die Asche über die Kante, und die Werkzeuge liegen noch, wo sie hingelegt wurden.',
    duration: 480,
    minCrew: 5,
    maxCrew: 12,
    yields: [
      { material: 'obsidian', amount: 45 },
      { material: 'schwefel', amount: 60 },
      { material: 'fundstueck', amount: 1.3 },
    ],
    depletion: 0.22,
    recovery: 0.000183,
    risk: 0.14,
    fragments: [
      'An der Grubenwand hängen zwölf Atemmasken auf zwölf Haken. Elf sind benutzt.',
      'Ein Schichtbuch, letzte Zeile: „Luft heute wieder schlechter. Morgen kürzer fahren."',
      'Kein weiterer Eintrag. Das Buch hat noch sechzig leere Seiten.',
    ],
    revealAt: 600,
  },
  {
    id: 'eisfeld',
    planets: ['kryo'],
    name: 'Die Sonde im Eisfeld',
    description:
      'Sie ist vor langer Zeit hier heruntergekommen und hat nie gemeldet. Das Eis hat sie gehalten wie eine Hand.',
    duration: 540,
    minCrew: 5,
    maxCrew: 12,
    yields: [
      { material: 'eis', amount: 80 },
      { material: 'helium', amount: 20 },
      { material: 'platten', amount: 25 },
      { material: 'fundstueck', amount: 1.4 },
    ],
    depletion: 0.2,
    recovery: 0.000148,
    risk: 0.09,
    fragments: [
      'Die Sonde hat gesendet. Vierzehn Jahre lang, in eine Richtung, in der niemand mehr war.',
      'Ihr Speicher ist voll mit Wetterdaten. Sie sind gut. Sie sind unbrauchbar.',
      'Am Gehäuse ein aufgemalter Name, halb abgeschliffen. Der Rest ist ein Datum.',
    ],
    revealAt: 800,
  },
  {
    id: 'wolkenstation',
    blueprints: ['bathhouse'],
    planets: ['nimbus'],
    name: 'Die Wolkenstation',
    description:
      'Sie hängt an drei Ballons in der oberen Schicht und ist seit Jahren leer. Wer hoch will, braucht Leute, die nicht schwindelfrei sein müssen, sondern geduldig.',
    duration: 600,
    minCrew: 6,
    maxCrew: 12,
    yields: [
      { material: 'helium', amount: 55 },
      { material: 'platten', amount: 30 },
      { material: 'werkzeug', amount: 3 },
      { material: 'fundstueck', amount: 1.5 },
    ],
    depletion: 0.2,
    recovery: 0.000133,
    risk: 0.12,
    fragments: [
      'Das Protokoll bricht mitten im Satz ab: „…halten den Puffer jetzt bei 71, aber der Schöpfer"',
      'Drei Schlafsäcke, ordentlich gerollt. Die Station war geräumt, nicht verlassen.',
      'An der Luke von innen mit Kreide: „Wir kommen wieder, wenn unten Luft ist."',
    ],
    revealAt: 1000,
  },
  {
    id: 'vorgaenger',
    planets: ['erebos'],
    name: 'Die Anlagen des Vorgängers',
    description:
      'Reihen von Türmen, die noch stehen und nichts mehr tun. Hier ist alles, was dieser Planet je an Material gesehen hat — mitgebracht von jemandem, der nicht mehr fragt.',
    duration: 660,
    minCrew: 6,
    maxCrew: 12,
    /*
     * Erebos führt **kein** Material (§19). Genau deshalb ist dieses Ziel die
     * Rechtfertigung des ganzen Systems: es ist der einzige Weg, hier an
     * Stoff zu kommen, ohne zu fliegen — und es ist zugleich der Ort, an dem
     * der Vorgänger doch Notizen hinterlassen hat. Nur eben keine, die
     * jemand für ihn abgelegt hätte.
     */
    yields: [
      { material: 'platten', amount: 50 },
      { material: 'titan', amount: 35 },
      { material: 'werkzeug', amount: 4 },
      { material: 'fundstueck', amount: 1.7 },
    ],
    depletion: 0.18,
    recovery: 0.000109,
    risk: 0.16,
    fragments: [
      'In der ersten Halle steht ein Wäscher. Er ist gebaut worden, als es längst zu spät war.',
      'Ein Vorratsbuch: Werkzeug, Balken, Platten — alles mitgebracht, nichts nachgeliefert.',
      'Auf der Rückseite einer Blechtafel, in großer Schrift: „Reihenfolge. REIHENFOLGE."',
      'Ein einzelner Satz, mit dem Finger in den Staub eines Schaltschranks: „zu viel O₂, zu früh."',
      'Danach nichts mehr. Wer hier war, hat nicht aufgeschrieben, wie es ausging.',
    ],
    revealAt: 1200,
  },
]

export function findSalvage(id: string): SalvageTarget | undefined {
  return SALVAGE.find((t) => t.id === id)
}
