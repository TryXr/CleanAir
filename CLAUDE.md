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

M18 ist angefangen: **Bergung** (§20.2) steht — ein Trupp zieht los, ist eine
Weile weg und bringt Material und einen Satz Vorgeschichte mit. Der Preis sind
ausdrücklich **Hände** und nicht Zeit: wer draußen ist, fehlt an jeder Anlage,
und die Buchhaltung dafür sitzt in `unassigned()` und nicht in einem zweiten
Zähler. **§20.1 (Baupläne) und §20.3 (Bauwerke) sind noch Entwurf** — wer dort
etwas voraussetzt, liest einen Plan und keinen Zustand.

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
cleanair.selftest()      // 155 Prüfungen, Ausgabe in der Konsole
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
Material kommt, das der Planet nicht führt.

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

Was sein simulierter Spieler kann, steht im Kopf der Datei. **Seit dem
Nachtrag zu M17 stehen alle sechs Planeten im Fenster** — Aurora 24,9 min,
Vesta 38,5, Pyra 73,1, Kryo 129,6, Nimbus 151,7, Erebos 176,7, jeder länger
als der vorige, ohne dass eine Zahl dafür gestellt wurde. Die Tabelle im
Dateikopf ist der aktuelle Stand; wer sie ändert, ersetzt die Zahlen, statt
alte danebenzustellen.

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
