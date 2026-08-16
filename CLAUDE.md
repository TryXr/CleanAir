# CleanAir

Incremental Game über Terraforming. Konzept, Balancing-Ziele und Meilensteine
stehen in [DESIGN.md](DESIGN.md) — **bei Fragen zu Spielinhalt immer dort
nachsehen, nicht raten.** Aktueller Stand: M3 abgeschlossen (Atmosphären-
Mischung, Stabilitäts-Timer, Forschung, Ereignisse, Statistik).

M4 bis M6 sind ebenfalls fertig: Materialien mit globalem Lager und die
Wald-Kette, dann Wohnraum, Nahrung, Wasser und Berufe — und zuletzt der
Umbau auf dauerhafte Planeten.

M7 und M8 ebenfalls: fünf Planeten mit eigenen Materialien, Ketten und
Raketen — und die Anoxen mit Wellen, Verteidigung und drei Fähigkeiten.

M9 ist fertig: Achievements mit Effekt, die drehende Planetenansicht und der
synthetisierte Ton.

**Achtung: DESIGN.md §16 ist ein Kurswechsel und hat Vorrang vor §6 und §11.**

**Achtung: DESIGN.md §17 ist der nächste Kurswechsel und hat Vorrang vor §5,
§13 und §16.** Ab M10 ist O₂ **keine Währung mehr**, sondern nur noch der
Wert, den man hochbringt — bezahlt wird mit Material und Arbeitskraft.
Bevölkerung zählt in Dutzenden statt Zehntausenden, Versorgung regelt die
Arbeitsleistung statt Menschen sterben zu lassen — und Arbeitsplätze haben
nur **Handarbeit** (Bergbau, Schmelze, Sägewerk, Forst, Landwirtschaft).
Chemische Apparate wie Elektrolyse oder Prozessor laufen von selbst.
Vor jeder Arbeit an Kosten, Bevölkerung oder Berufen dort nachlesen.

M22 ist fertig: **Der Abriss fehlte** — und mit ihm war ein Planet falsch
eingestellt. Vesta brauchte bei einem von drei Ereignis-Startwerten 193,6
statt 39,3 Minuten. Ursache: vier Temperaturinversionen früh bremsen den
Puffer, der Regler schwingt (N₂ auf 85,4 %, dann O₂ auf 23,4 % bei einem
Fenster bis 23), und danach steht der Lauf 150 Minuten fest. Kein Ereignis
dauert länger als 150 Sekunden — so viel Schaden geht nur über die Falle aus
§4.

> **O₂ ist das einzige, was kein Gegenmittel hat.** N₂ hat das Abblasventil,
> Schadstoffe haben den Wäscher — über dem O₂-Fenster gibt es genau einen Zug,
> und das ist der **Abriss** (§17). Der simulierte Spieler kannte ihn nicht;
> das ist der siebte Fall von „ein Planet, der auffällig ist, ist meistens ein
> Simulant, der etwas nicht kann", und der erste, der eine Zahl in `data/`
> gekostet hat.

Denn mit Abriss fiel **Erebos von 176,7 auf 86,0 min** — weit unter sein
Fenster und kürzer als Kryo und Nimbus. Die alte Zahl bestand zu 90 Minuten
aus Steckenbleiben über dem Fenster; ein Mensch war dort nie so lange. Die
Frachthypothese wurde geprüft und ist falsch (mit 1000 statt 50 000 Material:
92,2 min). Erebos' Startluft steht deshalb auf dem **Vierfachen**, alle vier
Zahlen zugleich, Anteile unverändert — seine Härte bleibt die *Reihenfolge*,
gewachsen ist nur die Menge Arbeit.

M21 ist fertig: **§20 ist gemessen** — `plaene`, `bergung` und `bauwerk` sind
Optionen in [dev/balance.ts](src/dev/balance.ts), `compare()` nimmt den
Schalter als Parameter. Zwei der drei Vorhersagen aus §20 waren falsch:
Baupläne kosten **exakt null** (die Sperren treffen nur den, der sie aufmacht),
und Bauwerke verlängern den Planeten nicht, weil ihre Etappen ohnehin auf
Fundstücke warten und nicht auf die Bauschlange. Ein Bauwerk steht nach dem
Zwei- bis Zweieinhalbfachen der Planetendauer.

> **Ein System, das nicht anspringt, sieht in jeder Tabelle aus wie ein
> System, das nichts kostet.** M18 hatte gemessen „Bergung ist fast umsonst" —
> tatsächlich zog in 300 Minuten auf Aurora *kein einziger* Trupp los, weil
> die Regel „erst wenn jeder Platz besetzt ist" bei einem Simulanten, der
> laufend neue Anlagen mit neuen Plätzen baut, nie wahr wird. Der teuerste
> Fehlbefund von allen, weil er beruhigt. Wer ein optionales System misst,
> prüft **zuerst**, wie oft es überhaupt ausgelöst hat — dafür zählt die
> Diagnose jetzt auch die Gründe, aus denen *nichts* passiert ist.

> **`Math.floor(decimal.toNumber())` zählt keine Menschen.** Vier Abzüge in
> `unassigned()` machen aus glatten 8 ein 7,9999999999999. `lt(8)` ist dann
> exakt wahr, während `toNumber()` **und** `Decimal.floor()` auf 8 aufrunden —
> `floor()` läuft in break_infinity durch `toNumber()`. Ergebnis: die Anzeige
> versprach „8 ohne Aufgabe", und ein Trupp von 8 wurde mit „zu wenige freie
> Bewohner" abgelehnt; in einem Lauf 8704-mal. Die Korrektur sitzt in
> `unassigned()` selbst, weil das die eine Wahrheit darüber ist, wer greifbar
> ist. Was auf ein Zehnmilliardstel an einer ganzen Zahl liegt, **ist** diese
> ganze Zahl.

M20 ist fertig: **Baupläne** (§20.1) — fünf Anlagen brauchen erst einen Plan,
und der liegt in `meta`, überlebt also den Durchlauf-Reset. Der Zuschnitt ist
**gemessen und nicht entworfen**: die ehrgeizige Fassung aus §20.1 machte Kryo
und Erebos unlösbar und Aurora doppelt so lang.

> **Ein Schloss gehört nur an das, was ein Planet nicht braucht.** Die
> Atmosphärenkette ist das *Ziel* des Spiels — ein Schloss dort ist eine Wand.
> Gegenmittel (Wäscher, Ventil), Wohnraum, Versorgung und die Materialketten
> stehen offen. Verschlossen sind Gemeinschaftsraum, Badehaus, Walzpresse,
> Lagerhalle und Baumschule: Dinge, die eine Kolonie **bequemer** machen, nicht
> **möglich**. Und: **jeder Bauplan muss ohne Bergung erreichbar sein** — sie
> darf ihn früher liefern, nie exklusiv, sonst ist ein optionales System die
> Voraussetzung für ein anderes.

M19 ist fertig: **Bauwerke** (§20.3) — eines pro Planet, vier Etappen, null
O₂, in derselben Bauschlange wie ein Haus. Ihre Wirkungen nehmen ausdrücklich
**Risiko** weg oder geben **Reichweite**; kein einziger Produktionsbonus, weil
das Ziel ein Fenster ist und kein Maximum. `landmarkEffects()` in
systems/landmarks.ts ist die Sammelstelle, `scope` unterscheidet ortsgebunden
von durchlaufweit — Erebos hat keines, dort ist die Aussaat das Bauwerk.
Bezahlt wird mit **Fundstücken**, dem einzigen nicht herstellbaren Material:
sie kommen nur aus der Bergung und gehen nur in Bauwerke.

M18 steht: **Bergung** (§20.2) — ein Trupp zieht los, ist eine
Weile weg und bringt Material und einen Satz Vorgeschichte mit. Der Preis sind
ausdrücklich **Hände** und nicht Zeit: wer draußen ist, fehlt an jeder Anlage,
und die Buchhaltung dafür sitzt in `unassigned()` und nicht in einem zweiten
Zähler.

M17 ist fertig: **Nach dem Ende läuft die Hochrechnung** (§19). Keine
Funkverbindung — der Epilog sagt, dass man nicht erfährt, welche Kapseln
ankommen, also zeigt das Spiel ein *Modell* und keine Nachrichten. Die Zahl
der Kapseln hängt an der Biomasse und damit an der Zufriedenheit: das ist der
Kreis, den M14 offengelassen hatte. Nicht verbesserbar, offline mitlaufend,
und der Zufall hängt am Zeitpunkt der Aussaat — derselbe Stand meldet immer
dieselben Welten.

M16 ist fertig: **Das Spiel hat ein Ende** (§19). „Die Aussaat" verlangt alle
sechs stabilen Atmosphären und von jedem Planeten Material — und **nimmt
nichts weg**: kein Reset, kein Overlay, der Epilog bleibt als Panel lesbar.
`meta.finaleReached` steht in der Meta-Ebene, weil es die einzige Sache ist,
die man genau einmal erreicht und die kein Durchlauf-Reset kassiert (§1.2).

M15 ist fertig: **Erebos hat schon eine Atmosphäre, die falsche.** Sechs
Planeten, aber kein sechstes System — die neue Sache ist ein umgekehrtes
Problem. `startAirO2`, `startAirN2` und `startPollution` in
[data/planets.ts](src/data/planets.ts) füllen die Luft beim Ankommen, und
damit werden die drei Gegenstücke (Wäscher, Ventil, Verdünnung) vom Beiwerk
zum Hauptdarsteller. Die Reihenfolge ist zwingend: waschen, abblasen, atmen
lassen — O₂ in eine Luft zu pumpen, die zu 60 % aus Dreck besteht, verpufft
im Nenner.

M14 ist fertig: **Zufriedenheit zahlt auf den Abflug, nicht auf den Planeten**
(§18). Sie multipliziert die **Biomasse** und damit die Genesis-Kerne — und
sonst nichts. Sie ist **abgeleitet, nicht gespeichert**: Komfort zählt pro
Kopf, also verdünnt jeder neue Mensch sie von selbst, und das geforderte
Gegenstück ist eingebaut statt angehängt.

> **Ein Beschleuniger ist in diesem Spiel keine Belohnung.** Das Ziel ist ein
> *Fenster*, kein Maximum — wer den Ausstoß erhöht, erhöht die Gefahr,
> darüber hinauszuschießen, und über dem O₂-Fenster gibt es kein Zurück (§4).
> Zufriedenheit wirkte einen halben Meilenstein lang auf die Handleistung;
> mit verschenkter voller Zufriedenheit war Vesta **gar nicht mehr
> abzuschließen**. Auch Verbrauch, Kosten und Zuwanderung wurden gemessen —
> alle drei machten es schlimmer. Wer künftig einen Bonus einbaut, prüfe
> zuerst, ob er auf etwas wirkt, das ins Fenster treffen muss.

Dazu die **Werkstatt**: Güter kosten Material und Arbeitszeit, kein O₂, und
stehen in **derselben Reihe** wie ein Hausbau (`BuildSite.art`). Dieselbe
Kolonne kann in derselben Zeit ein Haus bauen oder Werkzeug machen — zwei
getrennte Warteschlangen hätten die Entscheidung wegdefiniert.

M13 ist fertig: **Jeder Planet hat einen Hand-Hebel an seiner eigenen
Engstelle.** Eine O₂-Anlage mit Plätzen hebt die M10-Trennung „Maschine gegen
Handarbeit" nicht auf — die Apparate laufen weiter von selbst —, sondern
stellt eine Anlage daneben, die *nur* durch Hände läuft. Kostenkurven bewusst
flach (1,08): die knappe Ressource soll die gemeinte sein, also Hände und
nicht O₂.

> **Der Hebel gehört an die Engstelle, nicht überall an dieselbe Stelle.**
> Zweimal falsch gemacht: Vesta und Kryo bekamen zuerst O₂-Hebel und wurden
> dadurch *unlösbar*. Auf einem Planeten mit Puffer ist das N₂-Fenster
> (74–80 %) viermal so groß wie das O₂-Fenster (19–23 %), und **zu viel O₂
> lässt sich nicht abbauen, nur verdünnen** (§4). N₂ ist damit fast überall
> die harte Seite *und* das einzige Gegenmittel. Nur Nimbus, wo der
> Gasschöpfer den Puffer verschenkt, hat seinen Hebel auf der O₂-Seite — und
> dort musste die Rate von 1600 auf 600, weil ein O₂-Hebel sich überschießen
> kann und ein N₂-Hebel nicht.

`workforceMultiplier()` ist damit ersatzlos gestrichen: Bevölkerung wirkt über
Plätze, ein zweiter globaler Bonus auf dieselbe Sache wäre die verstreute
Rechnung, die weiter unten verboten ist. Bevölkerung zählt jetzt auf **allen**
Planeten in Dutzenden (120 bis 360), Pro-Kopf-Verbrauch ist überall gleich.

M12 ist fertig: **Verarbeitung ist eine zweite Sorte Stillstand.** Eine Anlage
mit `output.kind === 'craft'` verbraucht Material und liefert anderes — sie
steht nicht nur still, wenn niemand daran arbeitet, sondern auch ohne
Nachschub. Beides gehört benannt, nicht als kleinere Zahl gezeigt. Die Logik
sitzt in systems/crafting.ts und läuft als eigenes System **hinter**
`produktion`, damit die Kette im selben Tick durchläuft. Die Rakete von Aurora
kostet seit M12 **null O₂** und 400 Metallplatten.

> **Volles Ausgangslager heißt stocken, nicht fressen.** Beide Grenzen —
> Eingang im Lager und Platz für den Ausgang — müssen *vor* dem Abbuchen
> gerechnet werden. Andersherum verschwindet Eisen in einer Presse, deren
> Platten ohnehin verfallen. Gemessen: 1,33 Eisen pro fünf Sekunden ins Nichts.

M11 ist fertig: **Bezahlen legt eine Baustelle an, keine Anlage.** Wer eine
Anlage direkt in `planet.generators` schreibt, hebelt den Meilenstein aus —
der Weg führt über `orderGenerator()` in systems/construction.ts, und fertig
wird sie durch Arbeit (Bauarbeiter plus einen kleinen Grundtakt, ohne den
jeder Planet ohne Startbevölkerung eine Sackgasse wäre). Dazu ein **endliches
Lager**: `addMaterial()` ist der rohe Setzer, im Spiel geht Material
ausschließlich über `storeMaterial()` aus systems/storage.ts.

**Eine Bedingung und ihr Fortschrittsbalken lesen dieselbe Quelle.** Klingt
selbstverständlich und war es nicht: bis M26 prüfte der Erfolg „Holzweg" den
Lagerbestand, während sein Text eine Fördermenge versprach — und `progressOf()`
las noch eine dritte Zahl. Ein Balken, der etwas anderes misst als die
Bedingung, ist schlimmer als kein Balken: er steht bei 100 %, und nichts
passiert. `isMet()` und `progressOf()` in systems/achievements.ts gehören
deshalb Fall für Fall nebeneinander gelesen.

**Boni gehören in eine Sammelstelle, nie in die Formel.** Es gibt inzwischen
fünf Quellen — Meta-Baum, Forschung, Berufe, Ereignisse, Achievements. Jede
hat ihr eigenes `*Effects()`-Modul, und `collectMultipliers()` in
production.ts multipliziert sie aus. Wer einen Bonus direkt in eine Rechnung
schreibt, macht ihn unauffindbar.

**Alles, was wächst, braucht ein Gegenstück.** Alles, was eine Menge dauerhaft
*erhöht*, braucht ein Gegenstück — sonst ist Überschuss ein permanenter
Schaden und verstößt gegen §1.2. Wäscher für Schadstoffe, Abblasventil für
N₂. Beide arbeiten anteilig, und das Ventil nur oberhalb des Fensters: ein
stur laufender Regler erzeugt denselben Schaden spiegelverkehrt. Seit §17
gilt das auch für Bevölkerung: Zuwanderung passiert automatisch, also ist
**Abriss** der Weg zurück — und Schrumpfen darf deshalb nicht am
Sättigungsfaktor hängen, sonst wirkt der Abriss bei knappen Vorräten nicht.
Seit M11 ist die Lagergrenze das Gegenstück zum Abbau — sie stoppt aber nur
den Nachschub und vernichtet nie, was schon liegt.

## Drei Lebensdauern, nicht zwei

Seit M6 hat der Zustand drei Ebenen (§16). Wer das verwechselt, baut
Fortschritt an der falschen Stelle ein:

| Ebene | Datei | Stirbt bei |
|---|---|---|
| `planet` | `state/planet.svelte.ts` | nichts mehr — nur der **aktive** Planet |
| `run` | `state/run.svelte.ts` | Durchlauf-Reset (Material, Freischaltungen, alle anderen Planeten) |
| `meta` | `state/meta.svelte.ts` | nie (Kerne, Meta-Baum, Forschung) |

Der Trick beim Reisen: `planet` bleibt das **eine** reaktive Objekt für den
aktiven Planeten, alle anderen liegen serialisiert in `run.planets`.
`systems/travel.ts` lagert beim Wechsel ein und packt aus. Deshalb musste
kein einziger `planet.foo`-Zugriff im übrigen Code angefasst werden — ein
Umbau auf `planets[aktiv].oxygen` hätte jede Zeile in Systemen und UI
berührt.

**Rakete ≠ Abschluss.** Die Rakete bringt einen zum nächsten Planeten,
`completed` heißt „Atmosphäre steht stabil". Beides ist bewusst entkoppelt,
damit sich die Rückkehr lohnt.

## Befehle

```
npm run dev         Vite auf :5173
npm run typecheck   tsc + svelte-check
npm run build       Production-Build
```

Node liegt unter `C:\Program Files\nodejs`. Fehlt `npm` im PATH einer Shell,
den Pfad voranstellen statt neu zu installieren.

## Sprache

Deutsch in UI-Texten, Kommentaren und Commits. Englisch in Bezeichnern
(`oxygenTotal`, nicht `sauerstoffGesamt`).

## Architektur

| Ordner | Enthält | Regel |
|---|---|---|
| `engine/` | Loop, Save, Migrations, Format, RNG | Kennt das Spiel nicht. Keine Generatoren, keine Anoxen. |
| `data/` | Generatoren, Upgrades, Feinde als Objekte | Reine Daten, null Logik. Balancing = hier Zahlen ändern. |
| `state/` | Reaktiver Zustand (`.svelte.ts`, Runes) | Drei Lebensdauern: `planet` stirbt beim Wechsel, `run` beim Durchlauf-Reset (ab M6), `meta` nie. |
| `systems/` | Logik, die pro Tick läuft | Bekommt `dt`, schreibt in `state/`. |
| `ui/` | Svelte-Komponenten | Nur Darstellung, keine Spielregeln. |

## Fünf Regeln, die nicht verhandelbar sind

**1. Zeitabhängige Logik nur als registriertes System.**
`registerSystem('name', (dt) => …)` in [main.ts](src/main.ts). Nie `setInterval`
für Spiellogik — sonst bricht der Offline-Fortschritt, der genau darauf beruht,
dieselben Systeme n-mal am Stück laufen zu lassen. Die Registrierungsreihenfolge
ist Balancing (Produktion vor Verbrauch).

**2. Decimal immer ersetzen, nie mutieren.**
```ts
planet.oxygen = planet.oxygen.add(gain)   // richtig
```
Svelte proxied nur Objekte und Arrays, keine Klasseninstanzen. In-place-Änderung
an einem Decimal löst kein UI-Update aus. Jede Spielzahl, die wachsen kann, ist
ein `Decimal` — kein `number`.

**3. Zahlen werden nur in [format.ts](src/engine/format.ts) zu Text.**
Kein `.toFixed()` in Komponenten.

**4. Save-Struktur ändern heißt: `SAVE_VERSION` erhöhen + Eintrag in
[migrations.ts](src/engine/migrations.ts).** Beides, immer, im selben Commit.
Neue Felder brauchen einen defensiven Leser aus
[serialize.ts](src/engine/serialize.ts) mit sinnvollem Default.

**5. Balancing gehört nach `data/`, nicht in Formeln.**
Alle Multiplikatoren laufen zentral in `systems/production.ts` zusammen (lokale
Upgrades, Arbeitskraft) bzw. in `systems/metaEffects.ts` (Meta-Baum), damit
später nachvollziehbar bleibt, woher eine Zahl kommt.

**6. Drei O₂-Töpfe nicht verwechseln.**
`oxygen` ist das ausgebbare Guthaben, `oxygenTotal` reine Statistik, und
`airO2` ist das, was tatsächlich in der Luft steht und den Atmosphärenwert
bestimmt. Käufe zehren nur am Guthaben, Atmung nur an der Luft. Diese Trennung
ist der Grund, warum Fortschritt nie durch einen Generatorkauf rückwärts läuft
und Bevölkerung trotzdem wehtun kann.

**7. Die Atmosphäre ist eine Mischung, kein Balken.**
Jeder Anteil ist `100 × menge / gesamt`, wobei `gesamt` das native Inertgas
einschließt (DESIGN.md §4). Daraus folgt alles Weitere von selbst: N₂ senkt
den O₂-Anteil, ohne O₂ zu verbrauchen. Nie einen Anteil direkt setzen —
immer die Menge ändern und den Anteil ausrechnen lassen.

## Selbsttest vor jedem Commit

```js
cleanair.selftest()      // 197 Prüfungen, Ausgabe in der Konsole
```

Deckt die Fehlerklasse ab, die beim Lesen des Codes **nicht** auffällt und in
diesem Projekt jedes Mal mehrere Meilensteine unentdeckt überlebt hat:
Save-Rundlauf, Reisen mit Ein- und Auslagern, Raketen-Sperren, Sackgassen,
Vollständigkeit der Serialisierung, Regler-Verhalten des Ventils, Sabotage der
Anoxen, Achievement-Boni, Ton, die Trennung Maschine/Handarbeit, der Abriss
als Weg zurück — und seit M11, dass eine Bestellung *nicht* sofort dasteht,
dass Bestelltes den Preis mitzieht, dass ein Abbruch exakt erstattet und dass
das Lager wirklich überläuft statt still weiterzuwachsen. Seit M12 zusätzlich,
dass eine Verarbeitung ohne Eingang nichts liefert, dass das Rezeptverhältnis
exakt stimmt, dass ein volles Ausgangslager keinen Eingang mehr frisst und
dass die Kette im selben Tick bis zur letzten Stufe durchläuft. Seit M13, dass
eine O₂-Anlage mit Plätzen unbesetzt nichts liefert und besetzt mehr bringt,
als der Atem der Zugewiesenen kostet. Seit M18, dass ein Bergungstrupp
wirklich Hände bindet, dass er sie beim Zurückrufen sofort wieder freigibt,
dass ein Ziel sich erschöpft *und* erholt, und dass Erebos über die Bergung an
Material kommt, das der Planet nicht führt. Seit M19, dass eine Etappe nicht
sofort dasteht, dass **erst die letzte** Etappe die Wirkung freischaltet, dass
ein ortsgebundenes Bauwerk aus der Ferne nichts tut und der Fahrstuhl sehr
wohl. Seit M20 die **Sackgassenprüfung**: jeder Bauplan hat eine Quelle, kein
Gegenmittel hat ein Schloss, und jeder Planet kommt ohne Bauplan in Gang. Seit
M21, dass die **angezeigte** Zahl freier Leute auch eine gültige Truppgröße
ist — die Prüfung fragt nach dem Versprechen der Oberfläche, nicht nach der
internen Zahl, weil genau zwischen beiden der Fehler saß.

> **Eine Gegenprobe, die grün bleibt, ist kein bestandener Test.** Die Prüfung
> „ein ortsgebundenes Bauwerk wirkt nicht von fern" blieb beim Ausbau des
> Planetenvergleichs grün — auf dem Zielplaneten stand die Etappenzahl ohnehin
> auf null, die Wirkung fiel schon dort durch. Erst mit einem fertigen Bauwerk
> auf **beiden** Planeten trennt sie sauber. Wer eine Gegenprobe macht und
> nichts rot wird, hat den Test zu prüfen, nicht den Code zu loben.

Der Test sichert den Zustand vorher und stellt ihn danach wieder her — und
sperrt seit M11 zusätzlich das Speichern, solange er läuft. Vorher schrieb
jeder Lauf über `importSave()` in den echten Spielstand; genau daran ist beim
Bau von M11 einer verloren gegangen. Die Prüfung „Gesperrte Persistenz
schreibt nichts" hält das offen.

**Neue Prüfung nur mit Gegenprobe.** Ein Test, der auf korrektem Code besteht,
beweist nichts — den Fehler absichtlich einbauen, rot sehen, zurückbauen.
Genau so sind die vorhandenen Prüfungen entstanden.

Was er *nicht* kann: Spielgefühl. Ob Brände nerven, ob ein Fenster zu eng ist,
ob sich ein Planet zäh statt langsam anfühlt — dafür gibt es nur Spielen.

**Und er sieht die Oberfläche nicht.** Jede Prüfung und jeder Balancing-Lauf
ruft `orderGenerator()` direkt auf und geht damit an der Anlagenliste vorbei.
Ein Fehler, der nur dort sitzt, bleibt für sie unsichtbar — gemessen acht
Meilensteine lang: eine Tabelle entschied, welche Anlagen überhaupt angezeigt
werden, und `supply` hatte dort nie einen Eintrag. Kondensator und Keimkammer
waren seit M5 nicht baubar, während 89 Prüfungen grün meldeten und die
Simulationen munter Keimkammern bauten — über einen Weg, den ein Mensch nie
hat.

> **Eine neue `Output`-Art braucht immer zwei Einträge:** die Behandlung in
> der Logik *und* eine Zeile in `GENERATOR_GROUPS`. Beides erzwingt jetzt der
> Compiler — die Tabelle steht seit dem Nachtrag zu M13 in
> [data/generators.ts](src/data/generators.ts), ihr Schlüsseltyp ist aus
> `Output` abgeleitet, und eine fehlende Zeile lässt den Typecheck mit der
> fehlenden Art im Fehlertext scheitern. Dasselbe Muster steht über
> `BRANCHES` in [data/research.ts](src/data/research.ts).

Was der Compiler *nicht* sehen kann, prüft der Selbsttest: dass jede Anlage
auf mindestens einem der fünf Planeten verfügbar ist. `isAvailable()` ist
Laufzeitlogik, und eine Anlage, die nirgends verfügbar ist, steht in keiner
Liste — sichtbar nur, wenn man alle Planeten durchgeht. Genau diesen Weg geht
ein Mensch. **Anzeigetabellen gehören deshalb nach `data/`, nicht in die
Komponente:** was nur die `.svelte`-Datei kennt, kann keine Prüfung sehen.

> **`planet.settlers` ist nicht die Bevölkerung.** Vierter Fall von
> „Eigenschaft des aktiven Planeten statt des Durchlaufs" (M24), und der
> teuerste: 300 Menschen auf Aurora, ein Flug nach Vesta, und die Kopfzeile
> meldete **Bevölkerung 0**. Dieselbe Summe fehlte in der Statistik, in den
> Achievements und im Prestige-Übertrag — wer seinen Lauf auf einem frisch
> besiedelten Planeten beendete, verschenkte jede Kolonie davor. Es gibt jetzt
> `totalSettlers()` in systems/travel.ts, direkt neben `totalBiomass()`, das
> seit §16 genau dasselbe richtig macht. **Wer eine Zahl über „den Durchlauf"
> anzeigt, sucht zuerst die Schwester in travel.ts** — und schreibt keine
> zweite, private daneben. `inhabitedPlanets()` war so eine (M25): sie las die
> Momentaufnahmen von Hand nach und hätte bei jeder Formatänderung still `0`
> gemeldet, statt zu scheitern.

> **Ein Etikett muss die Frage beantworten, die es stellt.** Dritter Durchgang
> durch die laufende Oberfläche (M23), dieselbe Klasse noch eine Ebene tiefer:
> das Lager schrieb „Balken **nicht hier**", während zwei Panels darüber die
> Werkstatt Balken anbot und dreihundert im Regal lagen. Die Bedingung fragte
> `planet.materials` ab — also „wird hier aus dem Boden geholt" — und
> beschriftete damit „gibt es hier nicht". Balken, Werkzeug und Fundstücke
> stehen in keiner Förderliste, weil sie aus keinem Boden kommen; der Vermerk
> stand also auf jedem Planeten dauerhaft und falsch. Jetzt heißt die Regel
> `obtainableHere()` und steht in `systems/` — gefördert, gefertigt **oder**
> geborgen.

> **Verfügbar ist nicht sichtbar.** Der zweite Durchgang durch die laufende
> Oberfläche hat dieselbe Klasse noch einmal getroffen, eine Ebene tiefer:
> `isAvailable()` sagt, ob eine Anlage auf diesem Planeten *existiert*,
> `revealAt` sagt, ob sie schon *dasteht* — und es misst gegen `oxygenTotal`,
> eine Eigenschaft des **Planeten**, die beim Ankommen bei null steht. Auf
> Erebos, der mit 60 % Schadstoffen beginnt, war der Wäscher deshalb
> unsichtbar, während der Hinweis oben zum Waschen aufforderte. Dieselbe
> Verwechslung „Eigenschaft des aktiven Planeten statt des Durchlaufs" hatte
> die Sternenkarte nach jedem Flug verschwinden lassen. Beide Bedingungen
> heißen jetzt `isRevealed()` und `showsPlanetMap()` und stehen in `systems/`
> — die Regel eine Zeile weiter oben, wörtlich genommen.

## Balancing prüfen statt schätzen

**Seit M14 gibt es dafür ein Werkzeug** — [dev/balance.ts](src/dev/balance.ts),
in der Konsole unter `cleanair.balance`:

```js
cleanair.balance.run('vesta')        // ein Lauf, mit Diagnose am Ende
cleanair.balance.table(...)          // Ergebnis neben dem Zielfenster aus §13
cleanair.balance.compare('vesta')    // mit und ohne Komfort, mehrfach
```

Es fährt die **echten Systeme in der echten Reihenfolge** (`runStep` aus
loop.ts), setzt die Ereignisse auf einen festen Startwert und stellt den
Spielstand danach wieder her. Alle drei Punkte sind Lehrgeld: eine
handgetippte Heuristik hatte Bau und Bevölkerung vertauscht, zwei Läufe
derselben Frage sahen verschiedene Stürme, und ein Lauf direkt nach dem
Selbsttest lieferte ein anderes Ergebnis, weil dessen Forschung noch als
Multiplikator stand. **Wer eine Balancing-Frage hat, erweitert dieses
Werkzeug — er tippt keine neue Schleife in die Konsole.**

Was sein simulierter Spieler kann, steht im Kopf der Datei. **Alle sechs
Planeten stehen im Fenster** — Aurora 24,9 min, Vesta 38,5, Pyra 61,5, Kryo
129,6, Nimbus 135,2, Erebos 157,4, jeder länger als der vorige. Fünf dieser
Zahlen sind nie gestellt worden; die sechste (Erebos) ist es seit M22, weil
erst der Abriss gezeigt hat, wie kurz der Planet wirklich war. Die Tabelle im
Dateikopf ist der aktuelle Stand; wer sie ändert, ersetzt die Zahlen, statt
alte danebenzustellen.

> **Jede dieser Zahlen ist nur so gut wie der Simulant.** Zweimal in zwei
> Meilensteinen hat eine neue Fähigkeit die halbe Tabelle verschoben — die
> Decimal-Zählung brachte Nimbus von 151,7 auf 135,2, der Abriss Pyra von 73,1
> auf 61,5 und Erebos von 176,7 auf 86,0. Wer eine Zahl in `data/` ändern
> will, fragt zuerst, welchen Zug ein Mensch hier hätte und der Simulant
> nicht.

> **Bevor eine Zahl in `data/` angefasst wird: benutzt der Simulant überhaupt
> alle Systeme, die ein Mensch benutzen würde?** Zweimal hintereinander war
> genau das die Ursache eines scheinbar unbalancierten Planeten. Er gab
> **Forschung** nie aus — ohne sie schloss Vesta gar nicht ab, mit ihr steht
> der Planet nach 38,4 min. Und er baute keine **Verteidigung** — Pyra stand
> bei Minute 130 sauber im Fenster und war bei Minute 190 zusammengebrochen,
> weil die Wellen mit dem Fortschritt wachsen (§7).
>
> **Und die Fortsetzung davon, bei Erebos' erster Messung:** eine Regel, die
> er befolgt, kann auf einem Planeten das Gegenteil bedeuten. Die Sperre
> „bei zu viel Dreck kein O₂ bauen" rettet Pyra, wo der Dreck selbst gemacht
> ist — auf Erebos, der mit 60 % beginnt, griff sie in der ersten Sekunde und
> nie wieder anders: kein Wäscher, Guthaben 89, der Planet sah unlösbar aus.
> **Ein umgekehrter Planet braucht die Regeln in beide Richtungen geprüft**,
> nicht nur die Möglichkeiten abgehakt.

> **`meta.stats` gehört beim Messen mit zurückgesetzt**, obwohl dort „reine
> Statistik" steht: Achievements vergeben sich daraus und tragen
> Produktionsboni. Die Statistik fließt also sehr wohl in eine Spielformel
> zurück, nur über eine Ecke — und ein Lauf aus einem gespielten Tab misst
> sonst die Boni mit.

Zieldauern pro Planet stehen in DESIGN.md §13 und wurden bisher **simuliert,
nicht geraten**. Im Dev-Build gibt `window.cleanair` in der Browser-Konsole
Zugriff auf die laufenden Instanzen (`planet`, `meta`, `production`,
`population`, `prestige`, `data`, `loop`). Ein eigener `import` in den Devtools
liefert eine zweite, unbeteiligte Kopie der Module — deshalb immer über
`window.cleanair` gehen.

Vor dem Festschreiben neuer Zahlen: **`cleanair.stopPersistence()`**,
`loop.stopLoop()`, Planet zurücksetzen, in 1-Sekunden-Schritten
`productionSystem` / `populationSystem` / `atmosphereSystem` treiben und die
Abschlusszeit gegen §13 prüfen.

`stopPersistence()` ist nicht optional: die Simulation verändert denselben
Zustand, den das Autosave 30 Sekunden später wegschreibt. Ohne den Schalter
überschreibt ein Balancing-Lauf den echten Spielstand — beim Bau von M3
genau einmal passiert.

Seit M11 sitzt die eigentliche Sperre in [save.ts](src/engine/save.ts)
(`suspendPersistence()`), nicht mehr nur in main.ts. Der Schalter dort deckte
Timer, `beforeunload` und Tab-Wechsel ab — aber nicht `saveGame()` selbst, und
`importSave()` ruft es auf. Der Selbsttest stellt seinen Ausgangszustand genau
darüber wieder her, schrieb also bei **jedem** Lauf. So ist beim Bau von M11
ein zweiter Spielstand verloren gegangen, obwohl die Regel oben befolgt war.

Ein simulierter Spieler braucht außerdem zwei Dinge, sonst misst man Unsinn:
**Klicks** (ohne sie kommt er nie an den ersten Generator) und einen
**Rückfallkauf** — wer nur „das gerade Nötige" kauft und es sich nicht leisten
kann, kauft sonst gar nichts und der Lauf stockt bei zwölffacher Spielzeit.

## Ein System pro Planet

Die wichtigste Design-Regel aus DESIGN.md §11: Jeder Planet führt genau **eine**
neue Mechanik ein. Kein Feature vorziehen, weil es gerade praktisch wäre.
