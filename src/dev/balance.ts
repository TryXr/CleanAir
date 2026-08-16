import Decimal from 'break_infinity.js'
import { GENERATORS, type GeneratorDef } from '../data/generators'
import { ABILITIES } from '../data/abilities'
import { DEFENSES } from '../data/defenses'
import { MATERIALS } from '../data/materials'
import { RESEARCH } from '../data/research'
import { findEvent } from '../data/events'
import { AURORA, PLANETS, type PlanetDef } from '../data/planets'
import { runStep, stopLoop } from '../engine/loop'
import {
  exportSave,
  importSave,
  isPersistenceSuspended,
  resumePersistence,
  suspendPersistence,
} from '../engine/save'
import { meta } from '../state/meta.svelte'
import { planet, resetPlanet } from '../state/planet.svelte'
import { run } from '../state/run.svelte'
import {
  n2Percent,
  o2Percent,
  pollutionPercent,
  resetAtmosphereNotices,
} from '../systems/atmosphere'
import { orderBlocker, orderGenerator } from '../systems/construction'
import {
  buildDefense,
  canBuildDefense,
  canUseAbility,
  defensePower,
  requiredDefense,
  useAbility,
} from '../systems/combat'
import { comfortNeeded, contentment } from '../systems/contentment'
import { reseedEvents } from '../systems/events'
import { activeExpedition, revealedTargets, salvageBlocker, sendCrew } from '../systems/salvage'
import { buyResearch, canBuyResearch } from '../systems/research'
import {
  assignBuilder,
  canAssign,
  canAssignBuilder,
  crewAway,
  handFactor,
  unassigned,
} from '../systems/labor'
import {
  landmarkDone,
  landmarkHere,
  orderStage,
  stageBlocker,
  stagesDone,
} from '../systems/landmarks'
import { gatedGenerators } from '../systems/blueprints'
import {
  housingCapacity,
  o2ConsumptionRate,
  resetPopulationNotices,
} from '../systems/population'
import { pendingCores } from '../systems/prestige'
import { resetStorageNotices } from '../systems/storage'
import { assign } from '../systems/labor'
import {
  canDemolish,
  currentO2Rate,
  demolish,
  isAvailable,
  maxAffordable,
  releaseOxygen,
} from '../systems/production'
import { travelTo } from '../systems/travel'

/**
 * Balancing-Werkzeug (DESIGN.md §13).
 *
 * Warum es das gibt: bis M14 wurde für jede Balancing-Frage eine neue
 * Heuristik in die Konsole getippt. Der Messversuch zur Obergrenze aus §18
 * ist daran gescheitert — zwei Läufe derselben Frage gaben 37,6 und „steckt
 * fest", weil eine Kleinigkeit an der Kaufregel anders war. Gemessen wurde
 * das Rauschen der Heuristik, nicht die Änderung am Spiel.
 *
 * Drei Dinge macht dieses Werkzeug deshalb anders:
 *
 * 1. **Es fährt die echten Systeme in der echten Reihenfolge** (runStep aus
 *    loop.ts). Der alte Versuch hatte Bau und Bevölkerung vertauscht und
 *    Ereignisse gar nicht — er maß ein anderes Spiel.
 * 2. **Es ist reproduzierbar.** Ereignisse bekommen einen festen Startwert,
 *    zwei Varianten sehen also dieselben Stürme.
 * 3. **Es fasst den Spielstand nicht an.** Wie der Selbsttest sichert es
 *    vorher und stellt danach wieder her — und sperrt währenddessen das
 *    Speichern. Genau hier sind in diesem Projekt schon zwei Stände
 *    gestorben (CLAUDE.md).
 *
 * Aufruf in der Konsole:
 *
 *     cleanair.balance.run('vesta')              // ein Planet
 *     cleanair.balance.all()                     // alle sechs, als Tabelle
 *     cleanair.balance.compare('nimbus')         // mit und ohne Komfort
 *     cleanair.balance.run('aurora', { bauwerk: true })   // bis das Bauwerk steht
 *     cleanair.balance.compare('vesta', 'plaene')         // was die Schlösser kosten
 *
 * **Was der simulierte Spieler kann — und was nicht.** Gemessen ohne jeden
 * mitgeschleppten Fortschritt:
 *
 * | Planet | gemessen | Ziel §13 | | Bauwerk steht |
 * |---|---|---|---|---|
 * | Aurora | 24,9 min | 15–25 | im Fenster | 65,9 min |
 * | Vesta | 38,5 min | 30–45 | im Fenster | 83,0 min |
 * | Pyra | 61,5 min | 60–120 | im Fenster | 123,8 min |
 * | Kryo | 129,6 min | 120–240 | im Fenster | 128,6 min |
 * | Nimbus | 135,2 min | 120–240 | im Fenster | 183,6 min |
 * | Erebos | 157,4 min | 120–240 | im Fenster | hat keines |
 *
 * Die letzte Spalte ist die Antwort auf die offene Frage aus §20 („wie viele
 * Fundstücke kostet ein Bauwerk?"): bei sechs Fundstücken — acht auf Kryo und
 * Nimbus — steht ein Bauwerk nach dem **Zwei- bis Zweieinhalbfachen** der
 * Planetendauer auf den frühen Welten und ungefähr zur Abschlusszeit auf den
 * späten. Ein Nachmittag, kein Wochenende.
 *
 * **Alle sechs stehen im Fenster** — ein Lauf, `maxMinuten: 240`, sonst
 * Standardwerte. Die Reihenfolge stimmt dabei auch inhaltlich: jeder Planet
 * dauert länger als der vorige, ohne dass eine Zahl dafür gestellt wurde.
 *
 * Frühere Einträge dieser Tabelle sind absichtlich nicht aufgehoben: sie
 * behaupteten „Pyra bricht bei 145 min ein" und „Kryo/Nimbus zu schnell",
 * und beides ist seit den Commits zu M13 erledigt. Eine Tabelle, die alte
 * Befunde konserviert, schickt den nächsten Messversuch auf eine Fährte, die
 * es nicht mehr gibt — die Lehren darunter bleiben, die Zahlen nicht.
 *
 * Zwei ganze Systeme hat er anfangs ignoriert, und beide Male sah es aus wie
 * ein unbalancierter Planet:
 *
 * - **Forschung.** Er sammelte Punkte und gab sie nie aus. Ohne sie schloss
 *   Vesta *überhaupt nicht* ab und stand bei 23,0 % O₂ fest; mit ihr steht
 *   der Planet nach 38,4 min. Das war der Unterschied zwischen „der Planet
 *   ist kaputt" und „der Spieler war es".
 * - **Verteidigung.** Auf Pyra sitzen die ersten Anoxen (§7). Der Einbruch
 *   kommt spät und sieht deshalb nach etwas anderem aus: bei Minute 130 stand
 *   der Planet sauber im Fenster (O₂ 21,5 %, Schadstoffe 0,04 %), bei Minute
 *   190 war er auf 8,6 % O₂ und 59,8 % Schadstoffen zusammengebrochen. Wellen
 *   wachsen mit dem Fortschritt, also trifft es den, der weit kommt.
 *
 * Ein drittes Mal dasselbe Muster, gefunden mit `abgelehnt`: der Simulant
 * wies **jede** Hand einer Anlage zu, und Gebäude mit `populationCost`
 * brauchen *freie* Leute. Der Nitrat-Cracker, an dem Pyras Puffer hängt,
 * scheiterte 5120-mal an „zu wenige freie Bewohner", während Geld und Titan
 * dalagen.
 *
 * Ein **viertes** Mal, bei der ersten Messung von Erebos, und diesmal war es
 * keine vergessene Möglichkeit, sondern eine Regel, die woanders richtig ist:
 * `erstickt` verbietet O₂-Bau, solange die Schadstoffe über dem Doppelten des
 * Fensters stehen. Auf Pyra ist das die Rettung — dort ist der Dreck selbst
 * gemacht. Auf Erebos, der mit 60 % beginnt, griff die Sperre in der ersten
 * Sekunde und ließ sich nie mehr lösen: nach 20 Minuten kein einziger
 * Wäscher, Guthaben 89, Schadstoffe unverändert bei 59,97 %. Der Planet sah
 * unlösbar aus und war es nicht — es fehlten die paar Elektrolysezellen, mit
 * denen ein Mensch den ersten Wäscher bezahlt. Die Sperre hängt jetzt daran,
 * ob überhaupt schon gewaschen wird.
 *
 * Ein **fünftes** Mal, direkt bei der ersten Messung der Bergung (M18): mit
 * `bergung: true` fiel Vesta von 38,5 auf **163,4 min**. Es sah aus, als sei
 * das System zu teuer — tatsächlich war es wieder der Simulant. Er schickte
 * los, sobald `minCrew` freie Leute dastanden, und zog sie damit ab, *bevor*
 * die nächste Anlage besetzt war: eine frisch gebaute Nitratgrube fand keine
 * Hände mehr, weil dieselben Hände alle sieben Minuten wieder unterwegs
 * waren. Mit „erst wenn jeder Platz besetzt ist und ein **voller** Trupp
 * übrig bleibt" steht Vesta wieder bei 38,5.
 *
 * **Die 163,4 sind trotzdem der wichtigste Messwert des Meilensteins**: sie
 * belegen, dass der Preis der Bergung echt ist. Wer jede freie Hand
 * rausschickt, verliert seinen Planeten — genau das war die Absicht (§20.2),
 * und ohne diese Zahl wäre es eine Behauptung geblieben.
 *
 * ### Und ein **sechstes** Mal, bei der Messung von §20 — dreifach gestaffelt
 *
 * Die M18-Antwort auf die 163,4 lautete: erst losschicken, wenn *jeder* Platz
 * besetzt ist und ein *voller* Trupp übrig bleibt. Damit kostete Bergung
 * angeblich fast nichts. Beim Bau der `bauwerk`-Option kam heraus, warum:
 *
 * | gemessen | Anläufe in 300 min |
 * |---|---|
 * | „alle Plätze besetzt" | Aurora **0**, Vesta **1** |
 * | Rücklage nur beim Losschicken | Aurora 1 |
 * | Rücklage auch bei Zuweisung | Aurora 2 |
 * | Rücklage auch beim **Kauf** | Aurora 8 |
 * | Zählung als Decimal statt `toNumber()` | Aurora **10**, Trupp 92 % der Zeit draußen |
 *
 * Der Simulant bestellt laufend neue Anlagen, jede bringt neue Plätze mit —
 * „alle Plätze besetzt" ist deshalb praktisch nie wahr. Gemessen wurde also
 * nicht, was Bergung kostet, sondern dass sie nie stattfand. **Ein System,
 * das nicht anspringt, sieht in jeder Tabelle aus wie ein System, das nichts
 * kostet.** Das ist der teuerste Fehlbefund von allen, weil er beruhigt.
 *
 * Die letzte Zeile war die schlimmste und im Code unsichtbar: `unassigned()`
 * lieferte nach vier Abzügen 7,9999999999999, `Math.floor(…toNumber())`
 * rundete auf 8, und `sendCrew` lehnte 8 exakt vergleichend ab — 8704-mal in
 * einem Lauf, ohne eine einzige Spur. Der Fehler saß dabei nicht nur im
 * Werkzeug: `Decimal.floor()` läuft in break_infinity durch `toNumber()`,
 * also zeigte auch `formatInt()` „8 ohne Aufgabe" an, während das Spiel acht
 * ablehnte. Behoben in systems/labor.ts, festgehalten im Selbsttest.
 *
 * Mit allen fünf Zeilen kostet Bergung: Aurora −0,3 min, Vesta −0,2, Pyra 0,
 * Kryo +1,0, Nimbus +11,9, Erebos −0,4. Das ist der richtige Befund für ein
 * **optionales** System — es darf sich lohnen, es darf wehtun, aber es darf
 * keinen Planeten erzwingen.
 *
 * ### Was `compare()` über mehrere Startwerte zeigt
 *
 * Bergung und Bauwerk kosten Vesta im Median **nichts** (41,4 ohne / 40,9 mit
 * Bergung / 41,5 mit Bauwerk). Wichtiger war, was dabei nebenbei auffiel:
 * derselbe Planet brauchte je nach Ereignislage 39,3 oder **193,6** Minuten,
 * und zwar ohne jedes neue System.
 *
 * ### Ein **siebtes** Mal — und es war der teuerste Befund von allen
 *
 * Die 193,6 aufzuklären hat den Simulanten und einen Planeten verändert. Der
 * Hergang, ablesbar an `ereignisse` und `verlauf`:
 *
 * 1. Startwert `balance:0` wirft **vier Temperaturinversionen** in die ersten
 *    22 Minuten — als einziges Ereignis mit `needs: 'nitrogen'` bremst sie
 *    genau den Puffer (Produktion ×0,7).
 * 2. Der Regler gleicht aus und schwingt: N₂ auf **85,4 %** (Fenster bis 80),
 *    dann kippt O₂ bei Minute 42 auf **23,4 %** (Fenster bis 23).
 * 3. Ab da steht der Lauf 150 Minuten bei 23,0 bis 23,3 % und kriecht. Das ist
 *    die Falle aus §4: über dem O₂-Fenster gibt es kein Zurück.
 *
 * Kein Ereignis dauert länger als 150 Sekunden — 150 Minuten Schaden kann also
 * nur über eine Falle gehen. Und die Falle war offen, weil der Simulant den
 * **Abriss** nicht kannte (§17). N₂ hat das Ventil, Schadstoffe haben den
 * Wäscher, O₂ hat *kein* Gegenmittel außer aufzuhören zu produzieren. Mit der
 * Abrissregel: Vesta 47,1 statt 193,6 bei demselben Startwert, die beiden
 * anderen unverändert.
 *
 * **Und dann fiel Erebos aus seinem Fenster.** Derselbe Griff verkürzte ihn
 * von 176,7 auf 86,0 min — weit unter sein Ziel von 120–240 und kürzer als
 * Kryo und Nimbus. Die alte Zahl war zu 90 Minuten „steht über dem Fenster
 * fest": der letzte Planet war nie so lang, wie diese Tabelle behauptet hat.
 * Die Frachthypothese (der Simulant startet mit 50 000 von allem, und Erebos
 * fördert nichts) wurde geprüft und ist **falsch** — mit 1000 statt 50 000
 * braucht er 92,2 statt 86,0. Erebos' Startluft steht deshalb seit M22 auf dem
 * Vierfachen, Anteile unverändert (data/planets.ts).
 *
 * Die Lehre ist die alte, nur teurer: **ein Planet, der auffällig ist, ist
 * meistens ein Simulant, der etwas nicht kann.** Siebenmal in Folge, und
 * diesmal hat es eine Zahl in `data/` gekostet, die drei Meilensteine lang
 * richtig aussah.
 *
 * **Die Lehre für die nächste Balancing-Frage:** bevor eine Zahl in `data/`
 * angefasst wird, prüfen, ob der Simulant überhaupt alle Systeme benutzt, die
 * ein Mensch benutzen würde — und ob eine Regel, die er befolgt, auf *diesem*
 * Planeten dasselbe bedeutet wie auf dem, für den sie geschrieben wurde.
 * Fünfmal hintereinander war das die Ursache, und jedes Mal sah es zuerst
 * nach einem kaputten Planeten oder einem zu teuren System aus.
 *
 * ### Was ein zweiter Anlauf auf Pyra ergeben hat
 *
 * Vier Regeln ausprobiert und alle wieder ausgebaut, weil jede einen anderen
 * Planeten kaputtmachte. Die Befunde sind trotzdem gültig und ersparen dem
 * nächsten Versuch die Sackgassen:
 *
 * - **Die Formel steht in der Mechanik.** Dreck entsteht absolut
 *   (`o2Rate × pollutionPerO2`), Wäscher entfernen anteilig. Im
 *   Gleichgewicht ist der Bestand `o2Rate × pollutionPerO2 / scrubRate`. Wer
 *   die nötige Waschleistung daraus ausrechnet statt auf den Pegel zu
 *   reagieren, drückt Pyra von 91 % auf 4 % Schadstoffe und von 0 auf 153
 *   Bewohner. Der Pegel ist die Folge und hinkt Minuten hinterher.
 * - **Der Riegel „erst waschen, dann bauen" braucht einen Kaltstart.** Ohne
 *   Waschleistung ist die Bedingung nie erfüllt, also wird nie der erste
 *   Elektrolyseur gebaut: Vesta blieb bei 0 % O₂ und 95,2 % N₂ stehen.
 * - **Über dem O₂-Fenster schließt sich eine Falle.** Es brennt, der Abbrand
 *   drosselt die Produktion, ohne Produktion fehlt das O₂ für den Puffer,
 *   ohne Puffer sinkt der Anteil nie wieder. Gemessen: Pyra bei 23,8 % O₂,
 *   Guthaben 2476, Warteschlange leer — Stillstand. Auf die Untergrenze zu
 *   zielen ist aber genauso falsch, dann fällt Vesta bei jedem Ausschlag
 *   heraus.
 * - **In Blöcken zu bestellen ruiniert die Kasse.** Fünf Sublimatoren am
 *   Stück, danach kein bezahlbarer Elektrolyseur mehr.
 */

export interface BalanceOptions {
  /** Klicks pro Sekunde. Ohne Klicks kommt niemand an den ersten Generator. */
  clicks?: number
  /** Baut der simulierte Spieler Zufriedenheits-Anlagen? */
  komfort?: boolean
  /**
   * Schickt er Trupps zur Bergung los (M18, §20.2)?
   *
   * Standardmäßig aus, damit die gemessenen Dauern der sechs Planeten
   * vergleichbar bleiben. Eingeschaltet kostet Bergung Hände und bringt
   * Material — welche Richtung überwiegt, ist eine Messung und keine Meinung.
   */
  bergung?: boolean
  /**
   * Baut er das Bauwerk seines Planeten (M19, §20.3)?
   *
   * **Schaltet die Bergung mit ein**, und das ist keine Bequemlichkeit,
   * sondern die Mechanik: jede Etappe kostet Fundstücke, und die kommen
   * ausschließlich aus der Bergung. Ein Lauf mit `bauwerk` ohne `bergung`
   * würde messen, wie lange ein Planet braucht, wenn der Simulant auf etwas
   * wartet, das nie kommt.
   */
  bauwerk?: boolean
  /**
   * Kennt er alle Baupläne von Anfang an (M20, §20.1)?
   *
   * Die Gegenprobe zu den Schlössern: eingeschaltet steht offen, was sonst
   * erst aus Forschung, Bergung oder einem Erfolg kommt. Der Unterschied
   * zwischen beiden Läufen ist genau der Preis, den §20.1 kostet.
   *
   * **Ausgeschaltet heißt hier wirklich leer.** `runPlanet` setzt
   * `meta.blueprints` in beiden Fällen selbst — bis zu dieser Option tat es
   * das nicht, und ein Lauf aus einem gespielten Tab brachte die dort
   * verdienten Baupläne mit. Dieselbe Fehlerklasse wie bei `meta.stats`, nur
   * einen Meilenstein jünger.
   */
  plaene?: boolean
  /** Wie viel Material er mitbringt. Ohne Fracht ist Pyra unlösbar (§16). */
  fracht?: number
  /** Abbruch nach so vielen Spielminuten. */
  maxMinuten?: number
  /**
   * Sekunden pro Schritt.
   *
   * **Nur 1 liefert belastbare Zahlen.** Größere Schritte sind nicht bloß
   * ungenauer, sie ändern das Ergebnis qualitativ: zwischen zwei
   * Entscheidungen läuft der Atmosphärenwert weiter, und ein Planet mit
   * Fenster schießt darüber hinaus. Gemessen — Vesta schließt mit `schritt:
   * 1` in 38,6 min ab und mit `schritt: 2` **gar nicht**, bei sonst
   * identischen Bedingungen.
   *
   * Gröber ist also nur für einen schnellen Blick auf einen langen Planeten
   * brauchbar, und das Ergebnis trägt dann `grob: true`.
   */
  schritt?: number
  /** Startwert für die Ereignisse. Gleicher Wert = gleiche Stürme. */
  seed?: string
  /**
   * Sekunden zwischen zwei **Entscheidungen** des Simulanten.
   *
   * Nicht mit `schritt` zu verwechseln: die Systeme laufen weiter in
   * Sekundenschritten, nur das Kaufen und Zuweisen passiert seltener. Das ist
   * kein Genauigkeitsverlust, sondern näher am Menschen — niemand prüft
   * zwanzigmal pro Sekunde seine Anlagenliste. Es macht lange Planeten
   * überhaupt erst messbar: Pyra braucht zweieinhalb Stunden Spielzeit.
   */
  takt?: number
}

export interface BalanceResult {
  planet: string
  /** Minuten bis `completed`, oder null wenn nicht erreicht. */
  minuten: number | null
  /** Minuten bis die Rakete stand, oder null. */
  rakete: number | null
  o2: number
  n2: number
  schadstoffe: number
  bewohner: number
  zufriedenheit: number
  handleistung: number
  /**
   * Genesis-Kerne, die dieser Lauf einbrächte.
   *
   * Seit dem Nachtrag zu M14 der einzige Ort, an dem sich Zufriedenheit
   * auszahlt — eine Dauer allein kann den Komfort-Ausbau deshalb gar nicht
   * bewerten. Wer nur auf Minuten schaut, hält jede Investition für Verlust.
   */
  kerne: number
  /**
   * Biomasse des Laufs — die ungerundete Fassung von `kerne`.
   *
   * Nötig, weil die Kernformel eine Wurzel mit Abrundung ist: doppelte
   * Biomasse sind nur 1,41-mal so viele Kerne, und auf einem frühen Planeten
   * verschwindet der ganze Gewinn unter der Rundung. Wer den Effekt von
   * Komfort sehen will, schaut hierher.
   */
  biomasse: number
  /** Was am Ende stand — die Diagnose bei einem Lauf, der nicht fertig wird. */
  anlagen: Record<string, number>
  /**
   * O₂-Guthaben und offene Bestellungen am Ende.
   *
   * Die zwei Zahlen, an denen man einen steckengebliebenen Lauf erkennt:
   * leeres Guthaben heißt „konnte nichts mehr kaufen", eine volle Reihe
   * heißt „konnte nicht mehr bauen". Ohne sie rät man, warum nichts passiert
   * ist — und rät dann an der falschen Stelle weiter.
   */
  guthaben: number
  warteschlange: number
  /**
   * Fertige Etappen des Bauwerks am Ende, 0…4 (§20.3).
   *
   * Ohne diese Zahl ist ein Lauf mit `bauwerk` nicht zu lesen: eine
   * unveränderte Dauer heißt entweder „das Bauwerk kostet nichts" oder „er hat
   * nie eine Etappe bestellt", und das sind entgegengesetzte Befunde.
   */
  etappen: number
  /**
   * Fundstücke im Lager am Ende — der Vorrat, aus dem Etappen bezahlt werden.
   *
   * Sie sind das einzige nicht herstellbare Material und gehen nur in
   * Bauwerke. Steht hier eine große Zahl bei wenigen Etappen, lag es nicht am
   * Nachschub, sondern an Arbeit, Material oder der Bauschlange.
   */
  fundstuecke: number
  /** Abgeschlossene Bergungsanläufe, über alle Ziele dieses Planeten. */
  anlaeufe: number
  /**
   * Minuten, bis das Bauwerk stand — oder null.
   *
   * **Nicht dieselbe Frage wie `minuten`, und das ist der Punkt.** Ein Bauwerk
   * ist das Ding, auf das man hinarbeitet (§20.3); die Atmosphäre steht lange
   * vorher. Mit `bauwerk: true` läuft die Messung deshalb über `completed`
   * hinaus weiter — sonst misst man nur, wie viele Etappen zufällig vor dem
   * Abschluss fertig wurden, und das ist eine Eigenschaft der Planetendauer
   * und keine des Bauwerks.
   */
  bauwerkMin: number | null
  /**
   * Welches Ereignis wann auftrat — `"12,3 min Sonneneruption"`.
   *
   * Nötig geworden bei der Frage, warum Vesta je nach Startwert 39 oder 193
   * Minuten braucht. Ein Ereignis dauert 60 bis 150 Sekunden; dass eines davon
   * 150 Minuten kostet, kann nur über eine **Falle** gehen und nicht über
   * seine Dauer. Welche das ist, sieht man erst, wenn Zeitpunkt und Verlauf
   * nebeneinander liegen — der Endzustand allein sagt nur, dass etwas
   * schiefging.
   */
  ereignisse: string[]
  /**
   * Der Verlauf, einmal je Minute: Atmosphäre, Guthaben, Bevölkerung.
   *
   * Dieselbe Begründung wie bei `abgelehnt`: die Frage „wann ist es gekippt?"
   * ist aus einem Endstand nicht zu beantworten, und Raten kostet in diesem
   * Projekt regelmäßig drei Anläufe. Ein Eintrag pro Minute ist billig genug,
   * dass er immer mitlaufen kann.
   */
  verlauf: { min: number; o2: number; n2: number; guthaben: number; leute: number }[]
  /** Mit Schrittweite > 1 gemessen und damit **nicht** belastbar. */
  grob: boolean
  /**
   * Abgelehnte Bestellungen, nach Grund gezählt: `"cracker: zu wenig O₂"`.
   *
   * Die Frage „warum baut er das nicht?" ist beim Debuggen eines Laufs die
   * häufigste, und sie ist ohne diese Zahlen nicht zu beantworten — man sieht
   * nur, dass etwas fehlt, nicht warum. Bei Pyras Nitrat-Cracker hat das
   * Raten drei Anläufe gekostet.
   */
  abgelehnt: Record<string, number>
}

const STANDARD: Required<BalanceOptions> = {
  clicks: 1,
  komfort: false,
  bergung: false,
  bauwerk: false,
  plaene: false,
  fracht: 50000,
  maxMinuten: 300,
  schritt: 1,
  seed: 'balance',
  /*
   * Auch hier ist 1 der einzige belastbare Wert. Mit 5 ist der Simulant
   * entscheidungsgebremst statt planetgebremst: Aurora fiel von 19,9 auf
   * 26,3 min, Vesta schloss gar nicht mehr ab. Ausprobiert, weil lange
   * Planeten sonst kaum messbar sind — die Antwort war stattdessen, die
   * Entscheidung selbst billiger zu machen (siehe `listen`).
   */
  takt: 1,
}

/**
 * Was auf diesem Planeten überhaupt gebaut werden kann.
 *
 * Einmal pro Lauf statt einmal pro Sekunde: `isAvailable` hängt nur am
 * Planeten, ändert sich während eines Laufs also nie. Vorher lief für jede
 * Entscheidung ein Filter über alle Generatoren — bei zweieinhalb Stunden
 * Spielzeit sind das 9000 überflüssige Durchläufe.
 */
interface Listen {
  alle: GeneratorDef[]
  o2: GeneratorDef[]
  n2: GeneratorDef[]
  scrub: GeneratorDef[]
  vent: GeneratorDef[]
  supply: GeneratorDef[]
  housing: GeneratorDef[]
  amenity: GeneratorDef[]
  mitPlaetzen: GeneratorDef[]
  groessterBedarf: number
}

function sammelListen(): Listen {
  const alle = GENERATORS.filter((g) => isAvailable(g))
  const gas = (art: string): GeneratorDef[] =>
    alle.filter((g) => g.output.kind === 'gas' && g.output.gas === art)
  const art = (kind: string): GeneratorDef[] => alle.filter((g) => g.output.kind === kind)
  return {
    alle,
    o2: gas('o2'),
    n2: gas('n2'),
    scrub: gas('scrub'),
    vent: gas('vent'),
    supply: art('supply'),
    housing: art('housing'),
    amenity: art('amenity'),
    mitPlaetzen: alle.filter((g) => g.workSlots),
    groessterBedarf: alle.reduce((max, g) => Math.max(max, g.populationCost ?? 0), 0),
  }
}

/**
 * Der simulierte Spieler.
 *
 * Bewusst schlicht und an einer Stelle: er zielt auf die **Mitte** des
 * Fensters statt an seinen Rand. Am Rand pendelt jeder Wert, und der
 * Stabilitäts-Timer setzt bei jedem Ausschlag zurück — was dann wie ein
 * unbalancierbarer Planet aussieht, ist eine schlechte Heuristik (M13,
 * Nimbus).
 */
function entscheiden(
  def: PlanetDef,
  opts: Required<BalanceOptions>,
  listen: Listen,
  abgelehnt: Record<string, number>,
): void {
  const leute = planet.settlers.toNumber()
  const o2 = o2Percent()
  const n2 = n2Percent()

  const notieren = (g: GeneratorDef, grund: string): void => {
    const key = `${g.name}: ${grund}`
    abgelehnt[key] = (abgelehnt[key] ?? 0) + 1
  }

  const offen = (id: string): number =>
    planet.sites.filter((s) => s.id === id).reduce((a, s) => a + s.remaining, 0)
  const steht = (id: string): number => (planet.generators[id] ?? 0) + offen(id)

  /*
   * **Wer bergen will, hält einen Trupp frei** (Messung zu §20).
   *
   * Die Rücklage steht hier oben, weil sie an *drei* Stellen wirken muss: beim
   * Kauf, bei der Zuweisung und beim Losschicken. Zwei davon hatte der erste
   * Anlauf vergessen, und jedes Mal sah das Ergebnis gleich aus — kaum ein
   * Trupp zog los, und die Bergung schien nichts zu kosten. Der Reihe nach
   * gemessen:
   *
   * - nur beim Losschicken: null Anläufe auf Aurora in 300 Minuten,
   * - dazu bei der Zuweisung: einer, weil Käufe mit `populationCost` die
   *   freien Leute in dem Moment verbrauchen, in dem sie auftauchen,
   * - erst mit allen dreien läuft das System.
   *
   * Ein Mensch, der sich für die Bergung entschieden hat, gibt seine letzten
   * freien Hände nicht für die nächste Anlage aus. Genau das steht jetzt hier.
   *
   * Ohne `bergung` ist die Zahl 0 — die Läufe der sechs Planeten bleiben damit
   * Zeile für Zeile vergleichbar mit allem, was vorher gemessen wurde.
   *
   * **Ein voller Trupp, sobald die Kolonie ihn tragen kann** — dieselbe
   * Bedingung wie bei der Bau-Reserve darüber (`>= das Vierfache`), und
   * bewusst kein zweiter erfundener Bruchteil. Ein Zehntel der Kolonie stand
   * hier zuerst, und es hat den Ertrag verzerrt statt ihn zu messen: die Beute
   * hängt an `crew / maxCrew` (systems/salvage.ts), also bekam die kleinste
   * Kolonie die kleinsten Trupps *und* den geringsten Anteil. Gemessen —
   * Aurora brauchte 206 Minuten für sein Bauwerk und Kryo 106, die erste Welt
   * also achtmal ihre eigene Spieldauer und die vierte nur ihre eigene. Das
   * war kein Befund über die Planeten, sondern über den Deckel.
   */
  const groessterTrupp = opts.bergung
    ? revealedTargets().reduce((max, t) => Math.max(max, t.maxCrew), 0)
    : 0
  const truppReserve =
    planet.settlers.toNumber() >= groessterTrupp * 4 ? groessterTrupp : 0

  /*
   * Nur nachbestellen, wenn von der Sorte nichts mehr in der Reihe steht.
   * Ohne diese Bremse schießt die Warteschlange über das Fenster hinaus, und
   * zu viel O₂ lässt sich nicht abbauen, nur verdünnen (§4).
   */
  /**
   * Bestellt, wenn von dieser Sorte nichts mehr in der Reihe steht.
   *
   * Die Menge hängt am Abstand zum Ziel — ein Mensch klickt „Max", wenn ihm
   * dreißig Prozentpunkte fehlen, und einzeln, wenn er kurz davor steht.
   * Einzeln zu bestellen ist nicht die vorsichtige Variante, sondern eine
   * andere Messung: Vesta brauchte damit 71,4 statt 41,9 min, weil die
   * Bauschlange und nicht der Planet die Grenze war.
   */
  const kaufen = (g: GeneratorDef, mindestens = 0): void => {
    if (offen(g.id) > 0) return
    if (mindestens > 0) {
      orderGenerator(g.id, Math.min(mindestens, Math.max(1, maxAffordable(g))))
      return
    }
    /*
     * Die Menge hängt am Guthaben, nicht am Abstand zum Ziel.
     *
     * Beides ausprobiert: nach Abstand zu bestellen heißt, auf Aurora in der
     * ersten Minute zehn Prozessoren zu ordern und danach nichts mehr — der
     * Lauf kam auf 3,6 % statt 19. Ein Viertel dessen, was man sich leisten
     * könnte, hält den Nachschub in Gang und lässt trotzdem Geld für die
     * nächste Stufe übrig.
     */
    let menge = Math.max(1, Math.min(4, Math.floor(maxAffordable(g) / 4)))
    /*
     * Menschenkosten deckeln die Menge.
     *
     * Sonst bestellt der Simulant zwei Nitrat-Cracker, bräuchte dafür 24
     * freie Leute, hat aber nur die zwölf der Reserve — und die Bestellung
     * scheitert *ganz*, statt ein Stück zu liefern. Auf Pyra blieb der Puffer
     * genau daran hängen: 139 000 O₂ auf der Hand, Titan im Lager, und
     * trotzdem null Cracker.
     */
    if (g.populationCost) {
      // Die Trupp-Rücklage ist hier abgezogen: sonst verbraucht der nächste
      // Kauf genau die Leute, die gleich losziehen sollen — die Stelle, an der
      // die Bergung dreimal hintereinander unsichtbar geblieben ist.
      const verfuegbar = unassigned().toNumber() - truppReserve
      menge = Math.min(menge, Math.floor(verfuegbar / g.populationCost))
      if (menge < 1) {
        notieren(g, 'zu wenige freie Bewohner')
        return
      }
    }
    const grund = orderBlocker(g, menge)
    if (grund !== null) {
      notieren(g, grund)
      return
    }
    orderGenerator(g.id, menge)
  }

  const gas = (art: 'o2' | 'n2' | 'scrub' | 'vent'): GeneratorDef[] => listen[art]

  // Erst leben, dann wachsen: Versorgung und Wohnraum vor allem anderen.
  for (const g of listen.supply) if (steht(g.id) < Math.ceil(leute / 3) + 1) kaufen(g)
  for (const g of listen.housing) if (leute >= housingCapacity().toNumber() - 2) kaufen(g)
  if (opts.komfort) {
    // Bedarf kommt aus contentment.ts, nicht aus einer zweiten Formel hier.
    const komfortDa = listen.amenity.reduce((n, g) => n + steht(g.id) * g.baseRate, 0)
    if (komfortDa < comfortNeeded()) for (const g of listen.amenity) kaufen(g)
  }

  /*
   * Die Mitte des Fensters — zweimal gemessen, dass es die Mitte sein muss.
   *
   * Tiefer zu zielen (unteres Drittel) klingt sicherer, weil O₂ nur steigen
   * kann. Es kostet aber genau das Tempo, das den Planeten ins Fenster
   * bringt: Vesta fiel damit von 38,4 auf 104,7 min. Der Überschuss auf Pyra
   * ist damit *nicht* über den Zielpunkt zu lösen.
   */
  const o2Ziel = (def.o2Window.min + Math.min(def.o2Window.max, def.o2Window.min + 4)) / 2
  const n2Ziel = def.n2Window ? (def.n2Window.min + def.n2Window.max) / 2 : 0

  /*
   * Die eigene Industrie erstickt einen (Pyra, §11).
   *
   * Ohne diese Rückkopplung baut der Simulant munter weiter O₂-Anlagen, die
   * ihrerseits Schadstoffe machen, und keine Zahl Wäscher kommt hinterher:
   * gemessen 82,6 % Schadstoffe nach 200 Minuten, dadurch 4,1 % O₂, dadurch
   * **null Bewohner** — und ohne Hände läuft die Aschewäsche nicht, die
   * genau dagegen gebaut ist. Der Planet war nicht unlösbar, der Spieler war
   * es.
   *
   * Die Schwelle ist bewusst das **Doppelte** des Fensters und nicht das
   * Fenster selbst: bei „schon über der Grenze" sperrt sich der Simulant
   * selbst aus. Gemessen auf Kryo — 2,41 % Schadstoffe bei erlaubtem 1 %
   * blockierten den O₂-Bau dauerhaft, der Planet blieb bei 16,9 % O₂ stehen,
   * obwohl er nur hätte weiterwaschen müssen.
   */
  /*
   * **Aber nur, wenn schon gewaschen wird** (Erebos, M15).
   *
   * Die Regel oben ist auf Pyra entstanden, wo der Dreck *selbst gemacht*
   * ist: erst steht die Industrie, dann steigt der Anteil, dann hilft nur
   * aufhören. Erebos dreht das um — der Planet beginnt mit 60 % Schadstoffen,
   * die Sperre greift also in der ersten Sekunde und lässt sich nie mehr
   * lösen. Gemessen: nach 20 Minuten kein einziger Wäscher, Guthaben 89,
   * Schadstoffe unverändert bei 59,97 %. Der Simulant war in genau die Falle
   * gelaufen, vor der der Hinweis im Spiel jetzt warnt — nur andersherum: er
   * hat gar kein O₂ mehr gemacht und konnte damit die 2000 für den Wäscher
   * nie bezahlen.
   *
   * Ein Mensch tut dort das Naheliegende: ein paar Elektrolysezellen als
   * Einkommen, davon den Wäscher, dann waschen. Die Sperre gehört deshalb an
   * die Frage „kann ich überhaupt schon waschen".
   *
   * **Pyra ändert sich dadurch, und zwar messbar:** 84,5 min mit der alten
   * Fassung, 73,1 min mit dieser — beide Zahlen im selben Lauf gemessen, nur
   * diese eine Bedingung getauscht. Der Grund ist derselbe wie auf Erebos,
   * nur kleiner: auch dort steigt der Dreck über das Doppelte, *bevor* der
   * erste Wäscher steht, und in diesem Fenster hielt die alte Regel den
   * Simulanten von beidem ab — bauen durfte er nicht, waschen konnte er
   * nicht. Der Planet bleibt mit 73,1 min im Fenster (60–120), und die neue
   * Fassung ist das ehrlichere Modell: niemand hört auf zu bauen, während er
   * gegen die Verschmutzung noch gar nichts unternehmen kann.
   */
  const waescherStehen = listen.scrub.some((g) => (planet.generators[g.id] ?? 0) > 0)
  const erstickt =
    def.maxPollution !== undefined && pollutionPercent() > def.maxPollution * 2 && waescherStehen

  if (!def.n2Window) {
    // Ohne Fenster nach oben gibt es nichts abzuwägen: O₂, bis es reicht.
    if (o2 < o2Ziel) for (const g of gas('o2')) kaufen(g)
  } else {
    /*
     * **Der Puffer führt.** Ein Planet mit Fenster braucht rund viermal so
     * viel N₂ wie O₂ (74–80 % gegen 19–23 %), und zu viel O₂ lässt sich
     * nicht abbauen, nur verdünnen (§4). Wer beide unabhängig auf ihr Ziel
     * regelt, läuft mit dem O₂ voraus und steht dann bei 23,0 % fest —
     * gemessen auf Vesta, bevor diese Zeile hier stand.
     *
     * Also: O₂ nur nachlegen, wenn der Puffer nicht hinterherhinkt.
     */

    /*
     * O₂ darf nur so weit vorlaufen, wie der Puffer schon steht.
     *
     * Nicht „erst Puffer, dann O₂": das serialisiert zwei Aufbauten, die
     * nebeneinander laufen müssen, und kostete auf Vesta 30 Minuten (71,4
     * statt 41,9). Sondern anteilig — steht der Puffer bei der Hälfte, darf
     * auch O₂ bei der Hälfte stehen. Das eine Prozent Zugabe verhindert eine
     * Klemme am Anfang, wenn beide bei null stehen.
     */
    const erlaubtesO2 = (n2 / n2Ziel) * o2Ziel + 1

    if (n2 < n2Ziel || o2 > def.o2Window.max - 1) {
      for (const g of gas('n2')) kaufen(g)
    }
    if (!erstickt && o2 < Math.min(o2Ziel, erlaubtesO2)) for (const g of gas('o2')) kaufen(g)
    if (n2 > n2Ziel + 1.5) for (const g of gas('vent')) kaufen(g)
  }

  /*
   * **Über dem O₂-Fenster reißt man ab** (§17) — der sechste Fall derselben
   * Klasse.
   *
   * Fünfmal war die Ursache eines scheinbar kaputten Planeten, dass der
   * Simulant ein ganzes System nicht benutzte (Forschung, Verteidigung,
   * Reserve, Bergung, Zählweise). Hier ist es der **Abriss**, und er wiegt
   * schwerer als die anderen: N₂ hat mit dem Abblasventil ein Gegenstück,
   * Schadstoffe haben den Wäscher — O₂ hat **keines**. Über dem Fenster gibt
   * es kein Zurück (§4), außer aufzuhören zu produzieren. Genau dafür ist
   * `demolish()` da, und genau das tut ein Mensch, der sieht, wie sein Anteil
   * davonläuft.
   *
   * Gemessen an Vesta mit Startwert `balance:0`: vier Temperaturinversionen in
   * den ersten 22 Minuten bremsen den Puffer (Produktion ×0,7), der Regler
   * schwingt — N₂ auf 85,4 %, dann O₂ auf 23,4 % bei einem Fenster bis 23 —
   * und danach steht der Lauf **150 Minuten** bei 23,0 bis 23,3 % und kriecht.
   * 193,6 min statt 39,3, allein aus der Ereignislage.
   *
   * Die Bedingung ist bewusst „solange die Luft noch O₂ **gewinnt**" und nicht
   * „solange der Anteil zu hoch ist": der Anteil fällt nach einem Abriss nicht
   * sofort, er fällt erst, wenn die Atmung überwiegt. Am Anteil zu hängen
   * hieße, bis zur letzten Anlage abzureißen — der Regler, der spiegelbildlich
   * schwingt.
   */
  if (o2 > def.o2Window.max && currentO2Rate().gt(o2ConsumptionRate())) {
    for (const g of gas('o2')) {
      if (canDemolish(g.id)) {
        demolish(g.id, 1)
        break
      }
    }
  }

  /*
   * Wäscher wachsen **mit** der Industrie, nicht hinterher.
   *
   * Wäscher arbeiten anteilig, die Quelle liefert absolut nach — wer erst
   * wäscht, wenn der Wert steht, wäscht gegen einen Bestand an, der weiter
   * wächst. Gemessen mit der Nachher-Regel: Pyra bei 69,8 % Schadstoffen
   * nach 200 Minuten und dauerhaft steckengeblieben. Die Faustregel „halb so
   * viele Wäscher wie qualmende Anlagen" ist das, was ein Spieler tut, der
   * den Planeten schon einmal verloren hat.
   */
  if (def.maxPollution !== undefined) {
    const qualm = gas('o2').reduce((n, g) => n + (planet.generators[g.id] ?? 0), 0)
    const waescher = gas('scrub').reduce((n, g) => n + (planet.generators[g.id] ?? 0), 0)
    /*
     * Wäscher dürfen in einem Zug aufholen. Mit derselben Deckelung wie alle
     * anderen kommen sie strukturell nicht hinterher: die Industrie besteht
     * aus *drei* Anlagentypen, die je vier Stück pro Bestellung nachlegen,
     * die Reinigung aus einem oder zwei. Gemessen ohne diese Zeile — Kryo bei
     * 14,8 % Schadstoffen, Pyra bei 72,5 %.
     */
    const rueckstand = Math.ceil(qualm / 2) - waescher
    if (rueckstand > 0 || pollutionPercent() > def.maxPollution * 0.3) {
      for (const g of gas('scrub')) kaufen(g, Math.max(1, Math.min(20, rueckstand)))
    }
  }

  // Rückfallkauf: wer nur „das gerade Nötige" kauft und es sich nicht leisten
  // kann, kauft sonst gar nichts und der Lauf stockt bei zwölffacher
  // Spielzeit (CLAUDE.md).
  const billigste = [...listen.o2].sort((a, b) => a.baseCost - b.baseCost)[0]
  if (billigste && o2 < def.o2Window.min && !def.n2Window) kaufen(billigste)

  /*
   * Verteidigung, wo es Anoxen gibt (§7).
   *
   * Ohne diese Zeilen ignoriert der Simulant ein ganzes System — und das
   * rächt sich nicht sofort, sondern nach über zwei Stunden: Pyra stand bei
   * Minute 130 mit O₂ 21,5 %, N₂ 77,1 % und 0,04 % Schadstoffen sauber im
   * Fenster und war bei Minute 190 auf 8,6 % O₂ und 59,8 % Schadstoffen
   * zusammengebrochen. Die Wellen wachsen mit dem Fortschritt (§7), also
   * trifft der Einbruch genau den, der weit gekommen ist.
   *
   * Bewusst je ein Stück von jeder Sorte statt „viel vom Billigsten": die
   * Konter-Matrix in data/defenses.ts macht eine einseitige Verteidigung
   * wertlos, und das gehört mitgemessen.
   */
  if (def.hasAnoxen) {
    /*
     * **So viel Verteidigung, wie die nächste Welle verlangt.**
     *
     * Je ein Stück pro Sorte und Entscheidung zu bauen reicht nicht: Wellen
     * wachsen geometrisch (Faktor 1,28 je Welle), eine feste Baurate wächst
     * linear. Gemessen — Pyra stand bei 120 Minuten sauber im Fenster und war
     * bei 145 Minuten auf 48,5 % Schadstoffen, weil die Wellen davongezogen
     * waren. Die Schwelle kommt aus combat.ts und nicht aus einer Faustregel
     * hier: eine Welle steht 75 Sekunden, also zählt Schaden *pro Sekunde*.
     *
     * Der Zuschlag von 30 % ist die Reserve für die nächste Welle, die schon
     * wieder stärker ist als die, gegen die gerade gerechnet wird.
     */
    const noetig = requiredDefense().mul(1.3)
    let versuche = 0
    while (defensePower(Math.max(1, planet.waveNumber)).lt(noetig) && versuche < 20) {
      const gebaut = DEFENSES.some((d) => canBuildDefense(d.id) && buildDefense(d.id))
      if (!gebaut) break
      versuche++
    }
    for (const a of ABILITIES) {
      if (canUseAbility(a.id)) useAbility(a.id)
    }
  }

  /*
   * Forschung ausgeben, sobald sie reicht.
   *
   * Ohne diese vier Zeilen sammelte der Simulant Forschungspunkte an und gab
   * sie nie aus — ein Spieler, der eine ganze Systemebene ignoriert. Die
   * Reihenfolge ist bewusst die Datenreihenfolge und keine Bewertung: welcher
   * Zweig sich lohnt, ist selbst eine Balancing-Frage und gehört nicht als
   * stille Annahme in das Werkzeug, das sie beantworten soll.
   */
  for (const node of RESEARCH) {
    if (canBuyResearch(node.id)) buyResearch(node.id)
  }

  /*
   * Hände an die Plätze — aber **nicht alle**.
   *
   * Manche Gebäude verschlucken beim Bau Menschen (`populationCost`), und
   * `orderBlocker` verlangt dafür *freie*. Wer jede Hand sofort zuweist, kann
   * sie nie mehr bauen. Auf Pyra ist das kein Randfall: dort hängt der Puffer
   * am Nitrat-Cracker, der kostet zwölf Leute, und genau deshalb stand der
   * Planet mit null Crackern bei 23,4 % O₂ über dem Fenster — es fehlte nicht
   * an Geld, an Material oder an Zeit, sondern an zwölf Menschen, die nicht
   * gerade an einer Anlage standen.
   */
  const groessterBedarf = listen.groessterBedarf
  /*
   * Die Reserve gilt erst, wenn die Kolonie sie sich leisten kann. Eine
   * Siedlung von acht Leuten kann keine zwölf freihalten — sie hat dann
   * niemanden an der Keimkammer, verhungert und arbeitet mit 25 %. Gemessen:
   * Pyra mit fester Reserve bei 8 Bewohnern und 95,5 % Schadstoffen.
   */
  /*
   * Die Reserve muss für **mehrere** Bauten reichen, nicht für die größte.
   *
   * Gemessen mit `abgelehnt`: mit einer Reserve von genau zwölf scheiterte
   * der Nitrat-Cracker 5120-mal an „zu wenige freie Bewohner" — Hydroponik
   * und Eisschmelze kosten ebenfalls Leute und werden vorher gekauft, also
   * war der Topf jedes Mal leer, wenn der Cracker an der Reihe war. Ein
   * Zuschlag von fünf Prozent der Bevölkerung deckt die Kleinen ab, ohne der
   * Handarbeit ernsthaft etwas wegzunehmen.
   */
  const leuteGesamt = planet.settlers.toNumber()
  const bauReserve =
    leuteGesamt >= groessterBedarf * 4 ? groessterBedarf + Math.ceil(leuteGesamt * 0.05) : 0

  /** Was die Zuweisungsschleife freilassen muss: beide Rücklagen zusammen. */
  const reserve = bauReserve + truppReserve

  /*
   * **Die Baukolonne zuerst, dann die Plätze.**
   *
   * Andersherum frisst sie die Reserve auf: die Platz-Schleife lässt genau
   * zwölf Leute frei, danach zieht die Kolonne drei davon ab, und die zwölf,
   * die der Nitrat-Cracker braucht, sind nie beisammen. Gemessen — Pyra mit
   * null Crackern bei 160 Minuten, obwohl Geld, Titan und Menschen da waren.
   */
  if (planet.builders < 3 && canAssignBuilder()) assignBuilder(1)

  /*
   * **Einen Hebel, der über sein Ziel schießt, besetzt man nicht weiter.**
   *
   * Das ist der Unterschied zwischen einem Menschen und einer
   * Zuweisungsschleife: wer sieht, dass der Puffer über dem Fenster steht,
   * zieht Leute von der Nitratgrube ab, statt weiter Gas zu machen, das er
   * nicht mehr loswird. Ohne diese Zeile misst man etwas Absurdes — mit
   * geschenkter doppelter Handleistung wurde Vesta *unlösbar* und Pyra fiel
   * von 84,5 auf 127,3 min, weil der Simulant stur weiter N₂ produzierte.
   *
   * Es ist auch der Grund, warum Zufriedenheit vorher nirgends etwas brachte:
   * ihr Bonus landete auf Anlagen, deren Ausstoß schon zu hoch war.
   */
  const ueberZiel = (g: GeneratorDef): boolean => {
    if (g.output.kind !== 'gas') return false
    if (g.output.gas === 'o2') return o2 > o2Ziel
    if (g.output.gas === 'n2') return def.n2Window !== undefined && n2 > n2Ziel
    return false
  }

  for (const g of listen.mitPlaetzen) {
    /*
     * Nur **nicht weiter** besetzen, nicht räumen.
     *
     * Alle abzuziehen klingt konsequenter und ist schlechter: der Wert fällt
     * unter das Ziel, die Leute kommen zurück, er steigt darüber — ein
     * Regler, der schwingt statt zu halten. Gemessen kostete das Vesta 67
     * Minuten (105,4 statt 38,4). Der Bestand bleibt also stehen, es wächst
     * nur nichts mehr nach.
     */
    if (ueberZiel(g)) continue
    while (canAssign(g.id) && unassigned().toNumber() > reserve) assign(g.id, 1)
  }

  /*
   * Bergung — **zuletzt und nur mit Überschuss** (M18, §20.2).
   *
   * Die Stelle ist die Aussage: erst stehen die Plätze und die Baukolonne,
   * und wer dann noch übrig ist, geht raus. Andersherum wäre gemessen
   * worden, was ein Spieler tut, der seine Anlagen leerräumt, um Material zu
   * holen, das er ohne Anlagen nicht braucht.
   *
   * Standardmäßig **aus**: die sechs Planeten stehen ohne Bergung im Fenster
   * (§18-Nachtrag), und diese Zahlen sollen vergleichbar bleiben. Wer wissen
   * will, was das System kostet oder bringt, schaltet es zu — genau wie
   * `komfort`.
   */
  if (opts.bergung) {
    /*
     * **Nur wenn wirklich niemand gebraucht wird.**
     *
     * Der erste Anlauf schickte los, sobald `minCrew` freie Leute dastanden —
     * und ruinierte Vesta: 163,4 Minuten statt 38,5. Der Grund war nicht das
     * System, sondern der Simulant. Er zog die Leute ab, *bevor* die nächste
     * Anlage besetzt war: eine neu gebaute Nitratgrube fand keine Hände mehr,
     * weil dieselben Hände alle sieben Minuten wieder unterwegs waren. Ein
     * Mensch schickt einen Trupp los, wenn Leute herumstehen — nicht, wenn
     * gerade zufällig welche zwischen zwei Zuweisungen frei sind.
     *
     * Zwei Bedingungen bilden das ab: **jeder Platz ist besetzt**, und es
     * bleibt danach ein **voller Trupp** übrig. Wer weniger fordert, misst
     * einen Spieler, der seine eigene Kolonie ausräumt.
     */
    /*
     * **Warum kein Trupp losgezogen ist, gehört gezählt.**
     *
     * Ohne diese Zeilen sah ein Lauf mit Bergung auf Aurora aus wie „das
     * System kostet nichts" — tatsächlich ging in 25 Minuten kein einziger
     * Trupp raus, und gemessen wurde, dass nichts passiert. Genau dieselbe
     * Lücke hatte `abgelehnt` für Anlagen geschlossen; für die Bergung fehlte
     * sie noch, und ein System, das nicht anspringt, ist von einem System, das
     * nichts kostet, nur an dieser Zahl zu unterscheiden.
     */
    const notierenBergung = (grund: string): void => {
      const key = `Bergung: ${grund}`
      abgelehnt[key] = (abgelehnt[key] ?? 0) + 1
    }

    /*
     * **Wer noch um seinen Puffer kämpft, schickt keine Leute weg.**
     *
     * Die dritte Bedingung, und sie ist die einzige, die den Zeitpunkt
     * betrifft statt der Zahl. Ohne sie fiel Vesta von 38,5 auf 163,4 min —
     * dieselbe Zahl wie beim ersten Bergungs-Anlauf in M18, und aus demselben
     * Grund, nur später: ein Trupp geht in dem Moment raus, in dem der Puffer
     * noch hinterherhinkt, die Nitratgrube verliert ihre Hände, das O₂ läuft
     * dem N₂ davon — und über dem Fenster gibt es kein Zurück (§4). Der Lauf
     * endete bei 23,0 % O₂ und verbrachte zwei Stunden mit Verdünnen.
     *
     * Ein Mensch tut das nicht. Er schickt einen Trupp los, wenn die Kolonie
     * *läuft*, und nicht, während er um sein Fenster kämpft. Auf Planeten ohne
     * N₂-Fenster (Aurora) gibt es nichts abzuwarten, dort greift die Bedingung
     * nie.
     */
    /*
     * **Höchstens die Rücklage ist gleichzeitig draußen — nicht „alle Plätze zuerst".**
     *
     * Die M18-Fassung verlangte, dass *kein* Arbeitsplatz mehr frei ist. Das
     * war gegen die richtige Gefahr gerichtet und trotzdem falsch: der
     * Simulant bestellt laufend neue Anlagen, jede bringt neue Plätze mit,
     * also ist die Bedingung praktisch nie erfüllt. Gemessen über 300 Minuten:
     * Aurora **zwei** Anläufe, Vesta **einer**, dazu 17 171 Ticks mit dem
     * Vermerk „noch Plätze unbesetzt". Damit war die M18-Aussage „Bergung
     * kostet fast nichts" keine Messung des Systems, sondern eine Messung
     * seines Nichtstuns — die teuerste Sorte Fehlbefund, weil sie beruhigt.
     *
     * Die Grenze ist jetzt die Rücklage selbst: so viele Leute hat die Kolonie
     * für draußen vorgesehen, mehr gehen nicht. Eine Zahl, drei Wirkungen —
     * statt einer Rücklage und eines zweiten Deckels, die auseinanderlaufen
     * können.
     */
    const draussen = crewAway()
    if (draussen >= truppReserve) {
      notierenBergung('genug Leute unterwegs')
    } else if (def.n2Window !== undefined && n2 < def.n2Window.min) {
      notierenBergung('Puffer hinkt noch hinterher')
    } else {
      const ziele = revealedTargets()
      if (ziele.length === 0) notierenBergung('noch kein Ziel entdeckt')
      for (const ziel of ziele) {
        // Auch „läuft gerade" gehört gezählt. Ein stiller `continue` ist beim
        // Lesen der Diagnose nicht von „kommt nie dazu" zu unterscheiden, und
        // genau diese Unterscheidung war hier dreimal die entscheidende.
        if (activeExpedition(ziel.id)) {
          notierenBergung('Trupp ist unterwegs')
          continue
        }
        /*
         * Wer jetzt noch frei ist, ist wirklich frei — **ohne zweiten Abzug**.
         *
         * Die Rücklagen wirken schon dort, wo sie hingehören: in der
         * Zuweisungsschleife. Hier noch einmal die Bau-Reserve abzuziehen
         * ergab dauerhaft negative Zahlen (`-7/3`) und damit wieder null
         * Anläufe — denn Käufe mit `populationCost` verbrauchen freie Leute
         * *vor* dieser Stelle, der Vorrat steht also ohnehin schon unter der
         * Rücklage. Zweimal dieselbe Vorsicht ist keine doppelte Sicherheit,
         * sondern eine Sperre.
         *
         * **Und gezählt wird als Decimal, nicht über `toNumber()`.**
         * `Math.floor(unassigned().toNumber())` sah richtig aus und war die
         * teuerste Zeile dieser Messung: bei 7,999… freien Leuten rundet die
         * Umrechnung auf 8,00, `Math.floor` liefert 8, und `sendCrew` lehnt
         * mit „zu wenige freie Bewohner" ab — Decimal vergleicht exakt. Das
         * passierte **8704-mal in einem einzigen Lauf** und ließ die Bergung
         * dreiviertel der Zeit stillstehen, ohne eine Spur zu hinterlassen.
         * `formatInt()` in engine/format.ts macht es seit jeher richtig
         * (`n.floor()` *vor* der Umrechnung) — deshalb zeigt die Oberfläche
         * korrekt 7 an und ist von diesem Fehler nicht betroffen.
         */
        const frei = unassigned().floor().toNumber()
        /*
         * **So viele, wie entbehrlich sind — nicht so viele, wie hineinpassen.**
         *
         * Bis zur Messung von §20 schickte der Simulant ausschließlich
         * `maxCrew`. Das war die Überkorrektur zur M18-Falle: dort zog er
         * Leute ab, *bevor* die Anlagen besetzt waren, und die Antwort darauf
         * ist die Bedingung eine Zeile höher, nicht die Truppgröße. Gemessen
         * hat die volle Truppe auf Aurora **null Anläufe** ergeben — acht
         * freie Leute standen dort nie beisammen, Höchststand drei —, und ein
         * Lauf ohne einen einzigen Anlauf sah aus wie „Bergung kostet nichts".
         *
         * `minCrew` steht in den Daten und bedeutet genau das: ein kleiner
         * Trupp geht auch, er bringt weniger mit und trägt mehr Risiko
         * (systems/salvage.ts). Diese Abwägung ist der Sinn der Truppgröße —
         * sie wegzudrücken heißt, das System an sich nicht zu messen.
         */
        const trupp = Math.min(ziel.maxCrew, frei)
        if (trupp < ziel.minCrew) notierenBergung(`kein Trupp frei (${frei}/${ziel.minCrew})`)
        // Ein Losschicken, das fehlschlägt, muss laut sein. Es war die letzte
        // stille Stelle in dieser Kette — und prompt die, an der 8705 von
        // 12 062 Entscheidungen verschwanden.
        else if (!sendCrew(ziel.id, trupp)) {
          notierenBergung(`abgelehnt: ${salvageBlocker(ziel, trupp) ?? 'ohne Grund'}`)
        }
      }
    }
  }

  /*
   * Das Bauwerk — **nach** allem anderen (M19, §20.3).
   *
   * Die Stelle ist wieder die Aussage. Eine Etappe steht in derselben Reihe
   * wie ein Wohnmodul (`BuildSite.art`), also nimmt sie der Kolonne Zeit weg;
   * wer sie vor Versorgung und Wohnraum bestellt, misst einen Spieler, der
   * sein Denkmal wichtiger nimmt als seine Leute. Genau das soll die Messung
   * *nicht* voraussetzen — die Frage aus §20 ist, was ein Bauwerk kostet,
   * wenn man es nebenher baut.
   *
   * Bestellt wird immer nur die **nächste** Etappe, und `stageBlocker()`
   * verhindert von sich aus, dass zwei gleichzeitig laufen. Der Grund fürs
   * Scheitern wandert in `abgelehnt`: „warum baut er das nicht?" ist bei
   * einem Lauf, der bei zwei Etappen stehen bleibt, die einzige Frage.
   */
  if (opts.bauwerk && landmarkHere()) {
    const grund = stageBlocker()
    if (grund === null) orderStage()
    // „steht fertig" und „Etappe läuft" sind kein Scheitern, sondern der
    // Normalfall — sie zu zählen ersäuft die eine Zeile, auf die es ankommt.
    else if (grund !== 'steht fertig' && grund !== 'Etappe läuft') {
      const key = `Bauwerk: ${grund}`
      abgelehnt[key] = (abgelehnt[key] ?? 0) + 1
    }
  }
}

/** Ein Lauf auf einem Planeten. Verändert den Spielstand **nicht**. */
export function runPlanet(planetId: string, options: BalanceOptions = {}): BalanceResult {
  const opts = { ...STANDARD, ...options }
  /*
   * Ein Bauwerk ohne Bergung ist keine Variante, sondern ein Messfehler:
   * jede Etappe kostet Fundstücke, und die gibt es nirgendwo sonst. Wer
   * `bauwerk: true` allein setzt, misst einen Spieler, der auf Material
   * wartet, das er sich nicht holt — deshalb hier und nicht in der
   * Aufruferklärung.
   */
  if (opts.bauwerk) opts.bergung = true
  const warGesperrt = isPersistenceSuspended()
  suspendPersistence()
  const sicherung = exportSave()

  try {
    stopLoop()
    reseedEvents(opts.seed)

    /*
     * Auch die Meta-Ebene auf null — sonst misst man nicht den Planeten,
     * sondern den Spielstand, in dem man gerade steckt.
     *
     * Gemessen: derselbe Vesta-Lauf ergab 41,0 min aus dem frischen Tab und
     * „schließt nicht ab" direkt nach einem Selbsttest, weil dessen
     * Forschung und Erfolge als Multiplikatoren stehen geblieben waren. Ein
     * Balancing-Werkzeug, dessen Ergebnis von der Vorgeschichte abhängt,
     * misst nichts.
     */
    meta.metaUpgrades = []
    meta.researchNodes = {}
    meta.achievements = []
    /*
     * **Und die Baupläne**, die M20 dazugestellt hat.
     *
     * Sie standen hier bis zur Messung von §20 nicht — ein Lauf aus einem
     * gespielten Tab brachte damit still jeden Bauplan mit, den dieser Stand
     * verdient hatte, und maß ein Spiel ohne Schlösser. Dieselbe Fehlerklasse
     * wie bei `meta.stats` weiter unten, und derselbe Grund, warum sie nicht
     * auffällt: zwei Läufe *innerhalb* einer Sitzung sind trotzdem gleich.
     *
     * `plaene: true` ist die Gegenprobe dazu und füllt die Liste absichtlich
     * ganz — der Unterschied beider Läufe ist der Preis der Schlösser.
     */
    meta.blueprints = opts.plaene ? gatedGenerators() : []
    meta.research = new Decimal(0)
    meta.genesisCores = new Decimal(0)
    meta.population = new Decimal(0)
    meta.credits = new Decimal(0)
    meta.planetsCompleted = 0
    /*
     * Die Statistik gehört mit zurückgesetzt, obwohl sie „nie in eine
     * Spielformel zurückfließt".
     *
     * Sie fließt nämlich doch — über die Achievements. Die vergeben sich
     * anhand der Statistik, und jedes trägt einen dauerhaften Bonus. Eine
     * geleerte Achievement-Liste ist deshalb wertlos, solange die Zahlen
     * darunter stehen bleiben: das System vergibt im ersten Tick alles
     * wieder, was die alte Statistik hergibt.
     *
     * Gemessen: derselbe Vesta-Lauf ergab 38,6 min aus einem frischen Tab und
     * „schließt nicht ab" aus einem Tab mit gespieltem Stand — bei
     * identischem Aufruf. Zwei Läufe *innerhalb* einer Sitzung waren dagegen
     * immer gleich, weshalb der Fehler beim Prüfen zunächst durchrutschte.
     */
    meta.stats.totalOxygen = new Decimal(0)
    meta.stats.totalClicks = 0
    meta.stats.eventsSeen = 0
    meta.stats.eventsHandled = 0
    meta.stats.fires = 0
    meta.stats.bestPlanetSeconds = 0
    meta.stats.runs = 0
    meta.stats.wavesSeen = 0
    meta.stats.wavesRepelled = 0
    meta.stats.abilitiesUsed = 0
    meta.stats.settlersLost = 0

    run.materials = {}
    run.planets = {}
    run.unlocked = PLANETS.map((p) => p.id)
    resetPlanet(AURORA, new Decimal(0))
    if (planetId !== AURORA.id) travelTo(planetId)

    const fracht: Record<string, Decimal> = {}
    for (const m of MATERIALS) fracht[m.id] = new Decimal(opts.fracht)
    /*
     * **Fundstücke sind keine Fracht.**
     *
     * Sie sind das einzige Material, das sich nicht herstellen lässt — „es war
     * schon da" (data/materials.ts) —, und sie gehen ausschließlich in
     * Bauwerke. Wer sie mit einlädt, misst die Frage weg, die §20 offen
     * gelassen hat: 50 000 mitgebrachte Fundstücke machen jede Etappe sofort
     * bezahlbar, und ein Bauwerk sähe aus wie reine Bauzeit.
     *
     * Das ist auch inhaltlich die einzig richtige Zeile: Fracht ist, was man
     * vom vorigen Planeten mitbringt, und dort hat man seine Fundstücke
     * verbaut.
     */
    fracht.fundstueck = new Decimal(0)
    run.materials = fracht

    const def = PLANETS.find((p) => p.id === planetId) ?? AURORA
    const listen = sammelListen()
    const abgelehnt: Record<string, number> = {}
    const schritte = Math.floor((opts.maxMinuten * 60) / opts.schritt)
    let fertigBei: number | null = null
    let raketeBei: number | null = null
    let bauwerkBei: number | null = null
    /*
     * **Der Abschluss ist nicht das Ende, wenn ein Bauwerk gemessen wird.**
     *
     * `completed` heißt „die Atmosphäre steht stabil" — das passiert lange
     * bevor vier Etappen aus Fundstücken bezahlt sind, und Fundstücke kommen
     * nur aus der Bergung, also im Takt von Minuten. Bräche der Lauf hier ab,
     * hieße das Ergebnis „so viele Etappen passen zufällig in die Dauer dieses
     * Planeten" und nicht „so lange dauert ein Bauwerk". Ein Mensch spielt an
     * dieser Stelle auch weiter: die Rakete steht, der Planet läuft, und das
     * Denkmal ist genau jetzt das, worauf er hinarbeitet (§20.3).
     */
    const weiterlaufen = (): boolean =>
      opts.bauwerk && landmarkHere() !== undefined && !landmarkDone()

    const ereignisse: string[] = []
    const verlauf: BalanceResult['verlauf'] = []
    /*
     * Ereignisse werden am **Anfang** eines Ticks gesehen, nicht am Ende: ein
     * kurzes Ereignis kann zwischen zwei Beobachtungen sonst vollständig
     * auftreten und wieder vergehen. Gemerkt wird, was gerade läuft, und
     * gemeldet nur der Wechsel.
     */
    let laufendesEreignis: string | undefined

    for (let i = 1; i <= schritte; i++) {
      for (let k = 0; k < opts.clicks * opts.schritt; k++) releaseOxygen()
      if ((i * opts.schritt) % opts.takt === 0) entscheiden(def, opts, listen, abgelehnt)
      runStep(opts.schritt)

      const sekunden = i * opts.schritt

      const jetzt = planet.events[0]?.id
      if (jetzt !== undefined && jetzt !== laufendesEreignis) {
        ereignisse.push(`${(sekunden / 60).toFixed(1)} min ${findEvent(jetzt)?.name ?? jetzt}`)
      }
      laufendesEreignis = jetzt

      if (sekunden % 60 === 0) {
        verlauf.push({
          min: sekunden / 60,
          o2: +o2Percent().toFixed(1),
          n2: +n2Percent().toFixed(1),
          guthaben: Math.round(planet.oxygen.toNumber()),
          leute: Math.round(planet.settlers.toNumber()),
        })
      }
      if (planet.rocketBuilt && raketeBei === null) raketeBei = sekunden
      if (landmarkDone() && bauwerkBei === null) bauwerkBei = sekunden
      if (planet.completed) {
        if (fertigBei === null) fertigBei = sekunden
        if (!weiterlaufen()) break
      }
    }

    const anlagen: Record<string, number> = {}
    for (const [id, n] of Object.entries(planet.generators)) if (n > 0) anlagen[id] = n

    return {
      planet: planetId,
      minuten: fertigBei === null ? null : +(fertigBei / 60).toFixed(1),
      rakete: raketeBei === null ? null : +(raketeBei / 60).toFixed(1),
      o2: +o2Percent().toFixed(1),
      n2: +n2Percent().toFixed(1),
      schadstoffe: +pollutionPercent().toFixed(2),
      bewohner: Math.round(planet.settlers.toNumber()),
      zufriedenheit: +contentment().toFixed(2),
      handleistung: +handFactor().toFixed(2),
      kerne: pendingCores().toNumber(),
      biomasse: +planet.biomass.toNumber().toFixed(0),
      guthaben: +planet.oxygen.toNumber().toFixed(0),
      warteschlange: planet.sites.reduce((a, s) => a + s.remaining, 0),
      etappen: stagesDone(),
      bauwerkMin: bauwerkBei === null ? null : +(bauwerkBei / 60).toFixed(1),
      ereignisse,
      verlauf,
      fundstuecke: +(run.materials.fundstueck?.toNumber() ?? 0).toFixed(1),
      anlaeufe: Object.values(planet.salvageRuns).reduce((a, n) => a + n, 0),
      grob: opts.schritt > 1,
      abgelehnt,
      anlagen,
    }
  } finally {
    importSave(sicherung)
    /*
     * Und die Merker der Systeme mit zurück.
     *
     * `importSave` stellt den *Zustand* wieder her, aber nicht die
     * modulinternen Flags, die doppelte Log-Meldungen verhindern („hungert
     * schon", „brennt schon"). Ein Selbsttest direkt nach einem
     * Balancing-Lauf meldete dadurch „Versorgung erholt sich wieder" als
     * Fehler und nach einem Neuladen nicht — ein Werkzeug, das solche Spuren
     * hinterlässt, macht die nächste Messung unerklärlich.
     */
    resetPopulationNotices()
    resetAtmosphereNotices()
    resetStorageNotices()
    if (!warGesperrt) resumePersistence()
  }
}

/** Alle fünf Planeten gegen ihre Zieldauern aus §13. */
export function runAll(options: BalanceOptions = {}): BalanceResult[] {
  return PLANETS.map((p) => runPlanet(p.id, options))
}

/** Die Schalter, die `compare()` gegeneinander stellen kann. */
export type BalanceFlag = 'komfort' | 'bergung' | 'bauwerk' | 'plaene'

/**
 * Dieselbe Frage zweimal, einmal mit und einmal ohne **einen** Schalter.
 *
 * Der Sinn ist die **Wiederholung**: `laeufe` gibt an, wie oft jede Variante
 * mit verschiedenen Ereignis-Startwerten läuft. Ohne diese Streuung hält man
 * den Unterschied zwischen zwei Zufallslagen für einen Effekt — der Fehler,
 * an dem der erste Messversuch nach M14 gescheitert ist.
 *
 * **Der Schalter ist seit der Messung von §20 ein Parameter.** Vorher stand
 * `komfort` fest im Rumpf, und §20 verlangt dieselbe Gegenüberstellung für
 * drei weitere Teile. Eine zweite Funktion daneben hätte geheißen, die
 * Streuungslogik zu kopieren — und beim nächsten Mal die eine Hälfte zu
 * ändern:
 *
 *     cleanair.balance.compare('aurora', 'bauwerk')
 *     cleanair.balance.compare('vesta', 'plaene', {}, 5)
 */
export function compare(
  planetId: string,
  flag: BalanceFlag = 'komfort',
  options: BalanceOptions = {},
  laeufe = 3,
): {
  flag: BalanceFlag
  ohne: (number | null)[]
  mit: (number | null)[]
  median: { ohne: number | null; mit: number | null }
} {
  const ohne: (number | null)[] = []
  const mit: (number | null)[] = []
  for (let i = 0; i < laeufe; i++) {
    const seed = `${options.seed ?? STANDARD.seed}:${i}`
    ohne.push(runPlanet(planetId, { ...options, seed, [flag]: false }).minuten)
    mit.push(runPlanet(planetId, { ...options, seed, [flag]: true }).minuten)
  }
  const median = (werte: (number | null)[]): number | null => {
    const echte = werte.filter((w): w is number => w !== null).sort((a, b) => a - b)
    return echte.length === 0 ? null : (echte[Math.floor(echte.length / 2)] ?? null)
  }
  return { flag, ohne, mit, median: { ohne: median(ohne), mit: median(mit) } }
}

/** Zieldauern aus §13, damit ein Ergebnis sich selbst einordnet. */
const ZIEL: Record<string, [number, number]> = {
  aurora: [15, 25],
  vesta: [30, 45],
  pyra: [60, 120],
  kryo: [120, 240],
  nimbus: [120, 240],
  /*
   * Erebos fällt unter dieselbe Zeile in §13 („4+: 2–4 h") wie Kryo und
   * Nimbus. Bewusst kein eigenes, längeres Fenster, obwohl er der letzte
   * Planet ist: seine Härte soll aus der **Reihenfolge** kommen — waschen,
   * abblasen, atmen lassen —, nicht aus einer größeren Zahl. Wer ihn löst,
   * hat verstanden, wie die Mischung rechnet; das ist die Prüfung, nicht die
   * Dauer.
   */
  erebos: [120, 240],
}

/** Tabelle für die Konsole — Ergebnis neben Zielfenster. */
export function table(results: BalanceResult[]): string {
  const zeilen = results.map((r) => {
    const ziel = ZIEL[r.planet]
    const urteil =
      r.minuten === null
        ? 'schließt nicht ab'
        : !ziel
          ? ''
          : r.minuten < ziel[0]
            ? 'zu schnell'
            : r.minuten > ziel[1]
              ? 'zu langsam'
              : 'im Fenster'
    const dauer = r.minuten === null ? '—' : `${r.minuten} min`
    const z = ziel ? `${ziel[0]}–${ziel[1]} min` : '—'
    const warnung = r.grob ? '  (grob gemessen, nicht belastbar)' : ''
    /*
     * Der lange Weg steht nur da, wenn er begangen wurde. Eine Spalte
     * „0/4 Etappen" in jeder Zeile eines Laufs ohne Bergung wäre kein
     * Messwert, sondern Rauschen über der Zahl, um die es geht.
     */
    const weg =
      r.anlaeufe > 0 || r.etappen > 0
        ? `  ${r.etappen}/4 Etappen, ${r.anlaeufe} Anläufe, ${r.fundstuecke} Fd`
        : ''
    return `${r.planet.padEnd(8)} ${dauer.padStart(10)}  Ziel ${z.padEnd(12)} ${urteil}${warnung}${weg}`
  })
  return zeilen.join('\n')
}
