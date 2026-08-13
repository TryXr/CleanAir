# CleanAir

Incremental Game über Terraforming. Konzept, Balancing-Ziele und Meilensteine
stehen in [DESIGN.md](DESIGN.md) — **bei Fragen zu Spielinhalt immer dort
nachsehen, nicht raten.** Aktueller Stand: M0 abgeschlossen.

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
| `state/` | Reaktiver Zustand (`.svelte.ts`, Runes) | `planet` wird beim Wechsel zurückgesetzt, `meta` nie. |
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
Alle Multiplikatoren laufen zentral in `systems/production.ts` zusammen, damit
später nachvollziehbar bleibt, woher eine Zahl kommt.

## Ein System pro Planet

Die wichtigste Design-Regel aus DESIGN.md §11: Jeder Planet führt genau **eine**
neue Mechanik ein. Kein Feature vorziehen, weil es gerade praktisch wäre.
