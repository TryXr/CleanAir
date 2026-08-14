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
cleanair.selftest()      // 77 Prüfungen, Ausgabe in der Konsole
```

Deckt die Fehlerklasse ab, die beim Lesen des Codes **nicht** auffällt und in
diesem Projekt jedes Mal mehrere Meilensteine unentdeckt überlebt hat:
Save-Rundlauf, Reisen mit Ein- und Auslagern, Raketen-Sperren, Sackgassen,
Vollständigkeit der Serialisierung, Regler-Verhalten des Ventils, Sabotage der
Anoxen, Achievement-Boni, Ton, die Trennung Maschine/Handarbeit, der Abriss
als Weg zurück — und seit M11, dass eine Bestellung *nicht* sofort dasteht,
dass Bestelltes den Preis mitzieht, dass ein Abbruch exakt erstattet und dass
das Lager wirklich überläuft statt still weiterzuwachsen.

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

## Balancing prüfen statt schätzen

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
