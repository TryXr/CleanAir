# CleanAir — Spielkonzept & Entwicklungsplan

> Ein Incremental Game über Terraforming, Bevölkerung und eine Spezies, für die dein
> Fortschritt Gift ist.

**Genre:** Incremental / Idle
**Steuerung:** ausschließlich Maus
**Plattform:** Browser (später optional Desktop via Tauri)
**Rolle des Spielers:** „CleanAir (Cleaner)" — bringt Sauerstoff in die Atmosphären fremder Planeten

---

## Inhalt

1. [Vision & Design-Leitlinien](#1-vision--design-leitlinien)
2. [Technologie-Entscheidung](#2-technologie-entscheidung)
3. [Kern-Loop](#3-kern-loop)
4. [Atmosphäre als Mischung](#4-atmosphäre-als-mischung)
5. [Bevölkerung](#5-bevölkerung)
6. [Prestige: Planetenwechsel](#6-prestige-planetenwechsel)
7. [Die Anoxen](#7-die-anoxen)
8. [Kampfsystem](#8-kampfsystem)
9. [Wirtschaft & Kolonien](#9-wirtschaft--kolonien)
10. [Forschung, Flotte, Ereignisse](#10-forschung-flotte-ereignisse)
11. [Planeten-Progression](#11-planeten-progression)
12. [Technische Architektur](#12-technische-architektur)
13. [Balancing-Grundlagen](#13-balancing-grundlagen)
14. [Meilensteine](#14-meilensteine)
15. [Offene Fragen](#15-offene-fragen)
16. [Kurswechsel: Materialien, Planeten, Rakete](#16-kurswechsel-materialien-planeten-rakete)

---

## 1. Vision & Design-Leitlinien

CleanAir beginnt als simples Klickspiel und wächst über Stunden zu einer
Sternenkarte mit Wirtschaft, Forschung und Krieg. Der Reiz liegt darin, dass
**nichts verloren geht** — jeder abgeschlossene Planet bleibt als Kolonie
Teil deines Imperiums.

### Fünf Leitlinien

1. **Ein neues System pro Planet.** Niemals zwei gleichzeitig einführen. Der
   Spieler soll jede neue Mechanik einzeln verstehen können.
2. **Fortschritt ist nie verloren.** Ein Reset gibt immer mehr zurück, als er
   nimmt. Rückschläge (Angriffe, Brände) sind temporär, nie permanent.
3. **Idle heißt nicht passiv.** Es gibt immer eine sinnvolle Klick-Entscheidung,
   aber nie eine erzwungene. Wer weggeht, verliert nichts Wesentliches.
4. **Zahlen erzählen eine Geschichte.** Jede Ressource hat eine Fiktion.
   Bevölkerung ist nicht „Währung B", sondern Menschen, die atmen und sterben können.
5. **Kein Game Over.** Verlieren bedeutet Rückschritt, nie Abbruch.

---

## 2. Technologie-Entscheidung

### Warum Web und nicht Godot/Unity

Incremental Games bestehen zu ~95 % aus **UI und Zahlen** — Buttons, Listen,
Tooltips, Upgrade-Karten, Statistiken. Genau dafür ist HTML/CSS das beste
Werkzeug überhaupt. Game-Engines sind hier ausgesprochen schwach: Unitys uGUI
und Godots Control-Nodes werden mühsam, sobald 200 Upgrade-Karten mit Fließtext
und Tooltips gerendert werden sollen.

Praktisch das gesamte Genre ist Web-basiert: Antimatter Dimensions, Cookie
Clicker, Kittens Game, Universal Paperclips.

### Stack

| Bereich | Wahl | Begründung |
|---|---|---|
| Sprache | **TypeScript** | Bei einem Projekt, das über Monate wächst, verhindert der Typechecker Balancing- und Save-Bugs |
| Build | **Vite** | Instant Hot-Reload, keine Konfiguration nötig |
| UI | **Svelte 5** | Reaktive Stores passen exakt zu „Zahl ändert sich → UI aktualisiert sich"; minimaler Boilerplate |
| Große Zahlen | **break_infinity.js** | Ab Planet 3–4 wird `Number.MAX_SAFE_INTEGER` gesprengt. Nicht optional |
| Styling | Tailwind oder plain CSS | Geschmackssache |
| Persistenz | localStorage, JSON, `saveVersion` + Migrations | Ab Tag 1 einplanen |
| Desktop (später) | **Tauri** | Dasselbe Projekt als Steam-Build, ~10 MB statt Electrons ~150 MB |

### Optionale Visualisierung

Der Planet selbst kann als Canvas- oder Three.js-Element gerendert werden
(drehende Kugel, die sichtbar grüner wird, Partikel für Sauerstoff), während
das gesamte restliche Interface HTML bleibt. Beste beider Welten.

---

## 3. Kern-Loop

```
   Klicken ──► O₂ ──► Generatoren kaufen ──► mehr O₂/s
                │                                │
                │                                ▼
                │                        Atmosphäre steigt
                │                                │
                │                                ▼
                └──── Bevölkerung siedelt ◄──────┘
                              │
                              ├──► Arbeitskraft ──► Produktionsboni
                              ├──► Forschung ─────► Tech-Baum
                              └──► Credits ───────► Wirtschaft
                              │
                              ▼
                     verbraucht O₂  ⚠
```

Der Spieler startet mit einem einzigen Button. Nach wenigen Minuten kauft er
den ersten Generator, nach 20 Minuten hat er drei Generator-Typen und sechs
Upgrades und schließt seinen ersten Planeten ab.

---

## 4. Atmosphäre als Mischung

Der wichtigste Design-Unterschied zu „Zahl geht hoch": Die Atmosphäre hat
mehrere Werte, und man muss ein **Fenster** treffen, keinen Schwellenwert.

### Die Rechnung dahinter (seit M3 umgesetzt)

Jeder Planet hat eine Menge nativen Inertgases. Alle Anteile sind echte
Anteile an der Gesamtmenge:

```
anteil(gas) = 100 × menge(gas) / (inertgas + O₂ + N₂ + Schadstoffe)
```

Daraus folgt das gesamte Spiel dieses Systems von selbst, ohne Sonderregeln:

- Mehr O₂ hebt O₂ **und** senkt N₂.
- **N₂ ist das einzige Werkzeug gegen zu viel O₂** — es baut nichts ab, es
  verdünnt. Genau das macht es zum „Puffer" der Fiktion.
- Das native Inertgas verschwindet nie, es wird nur verdünnt. Der Anteil,
  auf den es gedrückt werden muss, bestimmt die Länge des Planeten.
- Schadstoffe sind ein Nebenprodukt der **eigenen** Produktion, keine
  Grundausgasung des Planeten. Eine Rate, die an der Gesamtatmosphäre hängt,
  verschwindet bei exponentiell wachsender Produktion im Rauschen (gemessen:
  0,006 % statt der gemeinten 1 %). An die Produktion gekoppelt bleibt der
  Anteil auf jedem Maßstab gleich spürbar — und die Fiktion ist besser: der
  Dreck kommt von dir.

| Wert | Zielfenster | Spannung |
|---|---|---|
| **O₂** | 19–23 % | Zu wenig = unbewohnbar. **Zu viel = spontane Brände**, Gebäude gehen verloren |
| **N₂** (Puffer) | 74–80 % | Ohne Puffer kein stabiles Fenster; muss separat produziert werden |
| **Schadstoffe** (CO₂, CH₄, SO₂) | < 1 % | Wird von den Anoxen aktiv erhöht |
| **Druck** | planetenabhängig | Skaliert alle Produktionsraten |
| **Temperatur** | planetenabhängig | Beeinflusst Bevölkerungswachstum |

### Abschlussbedingung

Ein Planet gilt als abgeschlossen, wenn **alle Werte X Minuten ununterbrochen
im Zielfenster bleiben** — nicht, wenn sie einmal berührt wurden. Dadurch wird
das Finale eines Planeten zu einer echten kleinen Prüfung statt zu einem
Zufallstreffer.

Ein Stabilitäts-Timer läuft sichtbar mit und setzt bei Verlassen des Fensters
zurück. Das ist der Moment, in dem der Spieler zum ersten Mal aktiv gegensteuern
muss.

### Einführungsreihenfolge

- **Planet 1:** nur O₂ (Tutorial)
- **Planet 2:** + N₂-Puffer, + Schadstoffe
- **Planet 3:** + Druck, + Temperatur

---

## 5. Bevölkerung

Sobald die Atmosphäre atembar ist, siedeln Menschen. Bevölkerung ist die
zentrale **persistente** Ressource — sie überlebt jeden Planetenwechsel.

### Bevölkerung produziert

| Output | Verwendung |
|---|---|
| **Arbeitskraft** | Multiplikator auf alle Generatoren |
| **Forschung** | Währung des Tech-Baums |
| **Credits** | Wirtschaft, Flotte, Handel |

### Bevölkerung kostet

Menschen **verbrauchen Sauerstoff**. Das erzeugt die zentrale Spannung des
Spiels:

> Mehr Bevölkerung = mehr Produktion, aber sinkender Atmosphärenwert.

Eine Kolonie zu schnell wachsen zu lassen kann den Stabilitäts-Timer
zurückwerfen. Der Spieler bekommt Regler für Zuwanderung und später
Lebenserhaltungs-Upgrades, die den Pro-Kopf-Verbrauch senken.

Bei Anoxen-Angriffen **sterben Menschen** — ein echter, spürbarer Verlust, weil
er direkt die Produktionsrate senkt.

---

## 6. Prestige: Planetenwechsel

> **Überarbeitet in [§16](#16-kurswechsel-materialien-planeten-rakete).** Der
> Reset betrifft nicht mehr den einzelnen Planeten, sondern den ganzen
> Durchlauf. Die Grundidee unten („du besitzt den Planeten ab jetzt") gilt
> weiter — nur radikaler: Planeten bleiben *begehbar*, nicht nur als
> Einkommensposten.

```
     ┌────────── PLANET (wird zurückgesetzt) ──────────┐
     │  O₂ / N₂ / Schadstoffe / Druck / Temperatur      │
     │  Generatoren, lokale Upgrades                    │
     │  Verteidigungsanlagen                            │
     └──────────────────────┬───────────────────────────┘
                            │  Abschluss
                            ▼
     ┌────────── META (bleibt für immer) ──────────────┐
     │  Bevölkerung                                     │
     │  Credits                                         │
     │  Forschung & Tech-Baum                           │
     │  Flotte                                          │
     │  Genesis-Kerne (Prestige-Währung)                │
     │  Achievements                                    │
     └──────────────────────┬───────────────────────────┘
                            │
                            ▼
     ┌────────── KOLONIEN (passives Einkommen) ────────┐
     │  Jeder abgeschlossene Planet liefert dauerhaft   │
     │  Credits und Bevölkerungswachstum.               │
     │  Ab Planet 4: Handelsrouten dazwischen.          │
     └──────────────────────────────────────────────────┘
```

### Der entscheidende Punkt

**Du verlässt einen Planeten nicht — du besitzt ihn ab jetzt.** Abgeschlossene
Planeten werden zu Kolonien mit passivem Einkommen. Der Spieler sieht sein
Imperium wachsen, statt nur einen abstrakten Multiplikator zu erhöhen. Das ist
emotional deutlich stärker als klassisches Prestige.

### Genesis-Kerne

Prestige-Währung, berechnet aus der beim Abschluss erreichten Gesamt-Biomasse.
Sie kaufen permanente Upgrades im Meta-Baum:

- Start-Kapital auf neuen Planeten
- Globale Produktions-Multiplikatoren
- Schnelleres Bevölkerungswachstum
- Zusätzliche Planeten-Auswahloptionen
- Kolonie-Ertragsboni

### Planetenwahl

Vor dem Sprung zeigt der Scanner 2–3 Planetenoptionen mit ihren Modifikatoren
(z. B. „Eiswelt: −40 % Temperatur, +100 % Mineralien"). Das verwandelt
„Weiter drücken" in eine echte Entscheidung. Bessere Scanner = mehr Optionen.

---

## 7. Die Anoxen

Ab **Planet 3** trifft der Spieler auf die Anoxen — anaerobe Lebensformen.

### Der Twist

> **Sauerstoff ist für sie Gift.**

Das dreht die ganze Perspektive:

- Aus ihrer Sicht ist **der Spieler der Angreifer**. Er vergiftet ihre Heimat.
- **Deine Waffe ist dein Fortschritt:** Oxidationstürme, O₂-Salven, Druckwellen.
- **Ihre Waffe ist Rückschritt:** Sie sabotieren Generatoren und pumpen Methan
  in die Atmosphäre. Der Fortschrittsbalken läuft rückwärts — für
  Incremental-Spieler weit bedrohlicher als „du verlierst HP".
- **Eskalation entsteht von selbst:** Je weiter der Spieler terraformt, desto
  aggressiver werden sie. Der Fortschritt erzeugt die Bedrohung. Keine
  künstlichen Trigger nötig.

### Einheitentypen

| Einheit | Verhalten | Konter |
|---|---|---|
| **Schürfer** | Greift Generatoren an | Oxidationstürme |
| **Speier** | Ignoriert Gebäude, pumpt Methan in die Atmosphäre | Drohnen (Abfangjäger) |
| **Panzerform** | Immun gegen O₂ | Nur Druckwaffen |
| **Schwärmer** | Große Zahl, schwach einzeln | Flächenwaffen |
| **Königin** (Boss) | Spawnt endlos Wellen, bis sie fällt | Kombination aus allem |

### Die Fraktions-Entscheidung (ab Planet 5)

Der Spieler wählt einen Pfad — irreversibel pro Durchlauf:

**Ausrottungs-Pfad**
Schneller, direkter, höhere Kurzfrist-Multiplikatoren. Öffnet den Militär-Tech-Zweig.

**Diplomatie-Pfad**
Der Spieler baut abgeschottete Methan-Habitate. Kostet Fläche und Ressourcen,
verlangsamt das Terraforming. Belohnung: Die Anoxen werden zur befreundeten
Fraktion und geben Zugriff auf **anaerobe Biotechnologie** — ein kompletter
Tech-Zweig, den der Ausrottungs-Pfad nie zu sehen bekommt (u. a. Generatoren,
die Schadstoffe direkt in O₂ umwandeln).

Zwei Spielstile, hoher Wiederspielwert, und eine moralische Frage, die zum
Thema des Spiels passt.

---

## 8. Kampfsystem

**Kein Echtzeit-Micromanagement.** Das Modell ist eine **Belagerung in Wellen** —
mausfreundlich und idle-tauglich.

### Ablauf

**1. Zwischen den Wellen** (der eigentliche Spielanteil)
Der Spieler baut Verteidigung: Oxidationstürme, Schildgeneratoren,
Drohnenschwärme, Reparaturdepots, Evakuierungsbunker. Klassisches
Ressourcen-Ausgeben mit Opportunitätskosten — jeder Credit in Verteidigung ist
ein Credit weniger für Terraforming.

**2. Der Wellen-Timer läuft sichtbar mit.**
Erzeugt Druck auf jede Kaufentscheidung, ohne Hektik zu verlangen.

**3. Während der Welle**
Läuft automatisch ab, dargestellt als Fortschrittsleiste mit Ereignis-Log. Der
Spieler hat 2–3 aktive Fähigkeiten mit Cooldown:

- **Notfall-Schild** — halbiert Schaden für 10 s
- **O₂-Salve** — hoher Sofortschaden, kostet Atmosphärenwert
- **Evakuierung** — rettet Bevölkerung, opfert Gebäude

Also 3–4 bewusste Klicks pro Welle. Beteiligung ohne Stress.

**4. Niederlage**
Ist nie Game Over, sondern Rückschritt: zerstörte Gebäude, tote Bevölkerung,
Methan in der Atmosphäre. Das Spiel bleibt entspannt, die Bedrohung bleibt echt.

### Warum das funktioniert

Der Kampf greift direkt in den Kern-Loop ein — er ist kein separates Mini-Spiel,
sondern eine weitere Kraft, die an denselben Zahlen zieht.

---

## 9. Wirtschaft & Kolonien

Ab **Planet 4** wird aus der Ansammlung von Kolonien ein System.

### Kolonien

Jeder abgeschlossene Planet produziert dauerhaft:
- Credits (abhängig von Bevölkerung und Ausbaustufe)
- Bevölkerungswachstum
- ggf. Spezialressourcen je nach Planetentyp

### Handelsrouten

Zwischen zwei Kolonien lässt sich eine Route einrichten. Ertrag hängt ab von:
- Distanz (weiter = mehr Ertrag, mehr Frachterbedarf)
- Angebot/Nachfrage der beteiligten Planetentypen
- Verfügbaren Frachtern in der Flotte
- Piraterie-Risiko (später: Anoxen-Raider auf Routen)

### Kolonieverwaltung

Jede Kolonie bekommt eine Ausrichtung:
- **Industrie** — Credits
- **Forschung** — Forschungspunkte
- **Landwirtschaft** — Bevölkerungswachstum
- **Militär** — Flottenkapazität, Verteidigung anderer Kolonien

Später: „Gouverneure" (Auto-Management), damit die Verwaltung bei 20 Kolonien
nicht zur Arbeit wird.

---

## 10. Forschung, Flotte, Ereignisse

### Forschung (ab Planet 2)

Persistenter Tech-Baum in Zweigen:

- **Atmosphärentechnik** — Produktion, Effizienz, Stabilität
- **Biologie** — Bevölkerung, Lebenserhaltung, O₂-Verbrauch senken
- **Industrie** — Credits, Baukosten, Automatisierung
- **Militär** (ab P3) — Verteidigung, Waffen, Schilde
- **Anaerobik** (nur Diplomatie-Pfad) — Schadstoff-Verwertung

### Flotte

Schiffe sind persistent und drücken den Prestige-Fortschritt sichtbar aus:

| Schiff | Effekt |
|---|---|
| **Transporter** | Startkapital auf neuen Planeten |
| **Scanner** | Mehr Planetenoptionen bei der Wahl |
| **Frachter** | Kapazität für Handelsrouten |
| **Fregatte** | Verteidigungsbonus auf allen Planeten |
| **Träger** (spät) | Automatische Wellen-Abwehr auf Kolonien |

### Ereignisse

Zufällige, zeitlich begrenzte Ereignisse brechen die Monotonie der Idle-Phasen:

- **Sonneneruption** — +50 % Produktion, aber Schadstoffe steigen
- **Sandsturm** — Generatoren offline, bis geklickt/repariert
- **Meteoritenschauer** — Gebäudeschaden, aber Mineralienfund
- **Migrantenwelle** — Bevölkerungsschub, höherer O₂-Verbrauch

Jedes Ereignis hat eine optionale Klick-Reaktion, die es abmildert oder
verstärkt. Wer nicht reagiert, verliert wenig — wer reagiert, gewinnt spürbar.

### Weitere Systeme

- **Achievements mit echtem Effekt** (kleine permanente Boni) — starker Anreiz,
  Randstrategien auszuprobieren
- **Offline-Fortschritt**, gedrosselt (z. B. 50 %, max. 12 h) — für ein
  Idle-Game nicht verhandelbar
- **Statistik-Panel mit Graphen** — die Zielgruppe liebt das
- **Automations-Schicht** (spät) — Auto-Buyer, Prioritäten, einfache Skripte

---

## 11. Planeten-Progression

| # | Planet | Neu eingeführt |
|---|---|---|
| 1 | **Aurora** | Tutorial: Klicken, 3 Generatoren, 6 Upgrades, reines O₂ |
| 2 | **Vesta** | Schadstoffe, N₂-Puffer, Bevölkerung, Forschung, Ereignisse |
| 3 | **Kharon** | **Anoxen**, Kampf, Druck & Temperatur |
| 4 | **Tethys** | Wirtschaft, Handelsrouten, Kolonieverwaltung |
| 5 | **Erebos** | Anoxen-Königin, Fraktions-Entscheidung (Krieg / Diplomatie) |
| 6+ | prozedural | Modifikatoren: Eiswelt, Vulkanwelt, hohe Gravitation, Anoxen-Hochburg, Gasriesen-Mond |
| ∞ | Endgame | System-Skala: Atmosphären-Netzwerk, Automations-Skripte, Ascension-Layer |

**Regel:** Jeder Planet führt genau **ein** neues System ein. Das ist der
wichtigste Schutz gegen Überforderung.

> **Überarbeitet in [§16](#16-kurswechsel-materialien-planeten-rakete).** Die
> Planeten bleiben, aber sie werden dauerhaft begehbar statt nacheinander
> abgehakt, und ihr Charakter entsteht aus eigenen Materialien statt aus
> anderen Zahlen. Die Regel „ein System pro Planet" gilt weiter — sie ist der
> Grund, warum der Kurswechsel in §16 auf mehrere Meilensteine verteilt ist
> und nicht am Stück gebaut wird.

---

## 12. Technische Architektur

```
CleanAir/
├── index.html
├── package.json
├── vite.config.ts
├── svelte.config.js
├── DESIGN.md
└── src/
    ├── main.ts
    ├── App.svelte
    ├── app.css
    │
    ├── engine/                 # spielunabhängige Infrastruktur
    │   ├── loop.ts             # fixer Tick (20 Hz) über deltaTime
    │   ├── save.ts             # Serialisierung, localStorage
    │   ├── migrations.ts       # Save-Versionen hochziehen
    │   ├── format.ts           # Zahlformatierung (1.23K / 4.56M / 1.2e18)
    │   └── rng.ts              # seeded RNG für prozedurale Planeten
    │
    ├── data/                   # reine Daten, keine Logik
    │   ├── planets.ts
    │   ├── generators.ts
    │   ├── upgrades.ts
    │   ├── research.ts
    │   ├── enemies.ts
    │   ├── defenses.ts
    │   ├── ships.ts
    │   └── achievements.ts
    │
    ├── state/                  # reaktiver Zustand
    │   ├── planet.svelte.ts    # wird beim Wechsel zurückgesetzt
    │   ├── meta.svelte.ts      # bleibt für immer
    │   ├── combat.svelte.ts
    │   └── settings.svelte.ts
    │
    ├── systems/                # Logik, läuft im Tick
    │   ├── production.ts
    │   ├── atmosphere.ts
    │   ├── population.ts
    │   ├── combat.ts
    │   ├── economy.ts
    │   └── events.ts
    │
    └── ui/                     # Komponenten
        ├── TopBar.svelte
        ├── AtmospherePanel.svelte
        ├── GeneratorList.svelte
        ├── UpgradeGrid.svelte
        ├── ResearchTree.svelte
        ├── CombatPanel.svelte
        ├── ColonyMap.svelte
        └── LogPanel.svelte
```

### Vier Prinzipien ab Zeile eins

**1. Daten getrennt von Logik.**
Jeder Generator, jedes Upgrade, jeder Feind ist ein Objekt in `data/`.
Balancing wird dadurch zu Zahlen-Editieren statt Code-Umbauen.

```ts
// data/generators.ts
export const GENERATORS = [
  { id: 'electrolysis', name: 'Elektrolyse-Zelle',
    baseCost: 15, costGrowth: 1.15, baseRate: 0.2 },
  // ...
] as const
```

**2. Fixer Tick über `deltaTime`.**
20 Hz, jeder Systemschritt bekommt `dt`. Offline-Fortschritt ist dann einfach
„viele Ticks auf einmal" — kein Sonderfall, kein Duplikatcode.

**3. `break_infinity.js` von Anfang an.**
Nachrüsten ist ein Albtraum, weil jede Rechenoperation angefasst werden muss.

**4. Save mit `version` + Migrations-Kette ab dem ersten Commit.**
Sonst zerschießt man irgendwann den eigenen Spielstand — und den der Tester.

```ts
const MIGRATIONS = {
  1: (s) => { s.meta.credits = '0'; return s },
  2: (s) => { s.planet.nitrogen = '0'; return s },
}
```

---

## 13. Balancing-Grundlagen

### Kostenkurve

Klassisch exponentiell:

```
kosten(n) = basiskosten × wachstum^n        wachstum ≈ 1.15 … 1.20
```

Höheres Wachstum bei späteren Generatoren, damit der Spieler nicht in einem
einzigen Gebäudetyp „feststeckt".

### Produktionskurve

```
rate = basisRate × anzahl × Π(upgrades) × arbeitskraft × druckFaktor
```

Alle Multiplikatoren zentral in `systems/production.ts` sammeln — niemals
verstreut. Sonst ist später nicht mehr nachvollziehbar, woher eine Zahl kommt.

### Prestige-Ertrag

```
genesisKerne = floor( sqrt(gesamtBiomasse / normierung) )
```

Wurzelfunktion, damit sich längeres Bleiben lohnt, aber mit abnehmendem Ertrag —
der Spieler soll irgendwann weiterziehen wollen.

### Zieldauer pro Planet

| Planet | Dauer aktiv | Dauer idle |
|---|---|---|
| 1 | 15–25 min | — |
| 2 | 30–45 min | 1–2 h |
| 3 | 1–2 h | 3–5 h |
| 4+ | 2–4 h | 8–24 h |

---

## 14. Meilensteine

### M0 — Fundament
- Vite + Svelte 5 + TypeScript aufsetzen
- Game-Loop mit fixem Tick (20 Hz) und `deltaTime`
- Save/Load in localStorage, `saveVersion`, Migrations-Gerüst
- Zahlformatierung mit `break_infinity.js`
- Grundlayout und Design-Sprache

**Ergebnis:** Gerüst läuft, noch kein Spiel.

### M1 — Erster spielbarer Planet
- Planet 1 „Aurora": Klick-Button „O₂ freisetzen"
- 3 Generatoren mit exponentieller Kostenkurve
- 6 Upgrades (Klick-Multiplikator, Generator-Multiplikatoren, Global)
- Atmosphären-Anzeige und Abschlussbedingung
- Ereignis-Log
- Offline-Fortschritt

**Ergebnis: Ab hier ist CleanAir spielbar.** Jede weitere Erweiterung wird an
einem laufenden Spiel getestet statt ins Blaue gebaut.

### M2 — Prestige & Bevölkerung
- Trennung `planet` / `meta` im State
- Planetenwechsel mit Genesis-Kernen
- Bevölkerung: Zuwanderung, Wachstum, O₂-Verbrauch
- Arbeitskraft als Produktionsmultiplikator
- Meta-Upgrade-Baum (erste 8–10 Knoten)
- Planet 2 „Vesta"

**Ergebnis:** Der Kern-Reiz des Genres funktioniert.

### M3 — Tiefe ✅
- ✅ Atmosphären-Mischung (N₂, Schadstoffe)
- ✅ Stabilitäts-Timer als Abschlussbedingung
- ✅ Forschungsbaum (13 Knoten in drei Zweigen, mit Stufen)
- ✅ Zufalls-Ereignisse (5 Stück, je mit optionaler Klick-Reaktion)
- ✅ Statistik-Panel

**Ergebnis:** Das Spiel hat Entscheidungen, nicht nur Wartezeiten.

Gemessen (simuliert, nicht geschätzt): Aurora 21,8 min, Vesta 35,5–37,7 min
je nach Klickrate. Ohne Wäscher pendeln sich die Schadstoffe bei 2,8 % ein —
Vesta ist dann nicht abschließbar, der Zweig ist also keine Zierde.

### M4 — Die Anoxen
- Feind-Spawns, Wellen-System, Wellen-Timer
- Verteidigungsgebäude
- 3 aktive Fähigkeiten mit Cooldown
- Methan-Sabotage (Fortschritt läuft rückwärts)
- Druck & Temperatur
- Planet 3 „Kharon"

**Ergebnis:** Der dramaturgische Höhepunkt des Spiels.

### M5 — Wirtschaft
- Kolonien mit passivem Einkommen
- Handelsrouten
- Kolonie-Ausrichtungen
- Flotte & Werft
- Planet 4 „Tethys"

**Ergebnis:** Langzeitmotivation.

### M6 — Endgame
- Prozedurale Planeten mit Modifikatoren
- Anoxen-Königin, Fraktions-Entscheidung
- Anaerobik-Tech-Zweig
- Automations-Schicht (Auto-Buyer, Prioritäten)
- Ascension-Layer

### M7 — Politur
- Achievements mit Effekt
- Vollständiges Balancing-Pass
- Sound, Animationen, Partikel
- Planeten-Visualisierung (Canvas/Three.js)
- Optional: Tauri-Build für Steam

---

## 15. Offene Fragen

Bewusst noch nicht entschieden — sollte während M1/M2 im Spiel getestet werden:

- ~~**Wie hart soll der O₂-Überschuss bestrafen?**~~ **Entschieden in M3:
  temporäre Drosselung plus Abbrand, kein Gebäudeverlust.** Permanenter
  Verlust gekaufter Anlagen widerspricht Leitlinie §1.2 und ist in einem
  Incremental-Spiel der zuverlässigste Weg, jemanden zum Aufhören zu bringen.
  Der Abbrand macht das Ganze stattdessen selbstregelnd: je weiter über dem
  Fenster, desto mehr O₂ verschwindet, der Anteil bleibt also knapp über der
  Grenze stehen statt davonzulaufen. Herunterdrücken muss man ihn selbst —
  mit N₂ oder mehr atmender Bevölkerung.
- **Bevölkerung steuerbar oder automatisch?** Ein Regler gibt Kontrolle, aber
  auch Micromanagement-Druck.
- ~~**Wellen-Frequenz:** an Echtzeit gekoppelt oder an Fortschritt?~~
  **Entschieden in M8: an den Fortschritt.** §7 gab die Antwort bereits vor
  („Der Fortschritt erzeugt die Bedrohung. Keine künstlichen Trigger nötig"),
  und es ist zugleich das idle-freundlichere: wer weggeht, während nichts
  wächst, kommt nicht in eine Wand aus Wellen zurück.
- **Kolonie-Ertrag:** linear pro Kolonie oder mit abnehmendem Grenzertrag?
  Linear kann spät explodieren.
- **Story-Präsentation:** Log-Einträge, Dialogfenster oder ein Codex zum
  Nachlesen? Log ist am billigsten und stört den Flow am wenigsten.

---

## 16. Kurswechsel: Materialien, Planeten, Rakete

Entschieden nach M3. **Diese Sektion hat Vorrang vor §6 und §11**, wo sie
ihnen widerspricht.

Der Auslöser: die Ressourcen greifen zu wenig ineinander. O₂ ist Währung,
Produktionsziel und Fortschrittsbalken in einem, und Bevölkerung ist nur ein
Multiplikator mit Atemkosten. Es fehlt der Stoff, aus dem man tatsächlich
etwas baut.

### Zwei Ebenen statt einer

Bisher galt: Prestige = Planetenwechsel. Das trennt sich.

**Der Durchlauf.** Mehrere Planeten existieren *gleichzeitig* und dauerhaft.
Man reist zwischen ihnen hin und her, baut alte Kolonien weiter aus und holt
dort Material. Beim Wechsel wird nichts zurückgesetzt.

**Der Reset.** Fühlt sich der Fortschritt zu zäh an, setzt man den *ganzen
Durchlauf* zurück und beginnt wieder auf Planet 1 — mit Genesis-Kernen aus
dem Erreichten, die im nächsten Durchlauf Upgrades freischalten. Das erste
Mal typischerweise nach Planet 2.

Damit ist der Reset wieder das, was er im Genre ist: eine freiwillige
Entscheidung gegen abnehmenden Ertrag, nicht ein Knopf am Ende eines Planeten.

### Rakete und Abschluss sind zwei verschiedene Dinge

| | Bedeutung |
|---|---|
| **Rakete** | Der Weg zum nächsten Planeten. Pro Planet anders zu bauen, aus dessen eigenen Materialien. Reines Transportmittel. |
| **Stabile Atmosphäre** | Der Planet gilt als *fertig*. Fenster und Stabilitäts-Timer aus §4 bleiben unverändert in Kraft. |

Beides ist bewusst entkoppelt: Man darf weiterziehen, bevor ein Planet fertig
ist, und später zurückkommen, um ihn zu Ende zu terraformen. Genau das gibt
der Rückkehr ihren Sinn — ohne diese Entkopplung wäre ein alter Planet ein
abgehakter Punkt.

### Materialien

Holz, Stein, Titan und so weiter. **Jeder Planet hat eigene Vorkommen** — das
ist der zweite Grund zurückzukehren.

Das Inventar ist **global**: Material von Planet 1 baut auf Planet 3. O₂ und
Bevölkerung gehören ausdrücklich *nicht* hinein — O₂ ist planetenlokal (§4),
Bevölkerung ein eigenes System (§5).

Kreisläufe statt reinem Abbau. Beispiel Wald:

```
Baum pflanzen ──► wächst ──► erzeugt O₂
                     │
                     └──► fällen ──► Holz, aber der O₂-Beitrag entfällt
```

Die Abwägung ist die interessante Stelle: Bauholz kostet Atmosphäre.

### Bevölkerung: Bedürfnisse und Berufe

Menschen tauchen nicht mehr einfach ab einem O₂-Wert auf. Sie brauchen erst
**Hütten, Essen und Trinken**.

**Berufe** sind die zweite Hälfte: Förster bauen den Wald auf, andere Berufe
andere Ketten. Jemanden einzustellen kostet Ressourcen.

Gebäude kosten **einmalig** Bevölkerung — die Leute ziehen ein, danach läuft
das Gebäude allein. Keine dauerhafte Arbeiterbindung, kein Zuweisungs-
Mikromanagement.

### Planeten sollen sich unterschiedlich anfühlen

Ein Lavabrocken, eine Eiswüste, eine Gasquelle zum Anzapfen. Der Unterschied
steckt in den **Materialien, den Bauketten und der Rakete** — nicht in
anderen Zahlen für dieselbe Sache. Ein Planet, der sich nur durch einen
höheren `baseAtmosphere` unterscheidet, ist kein neuer Planet.

### Überarbeitete Meilensteinfolge

Die Anoxen rücken nach hinten. Sie sind ein Konflikt-System und brauchen
etwas, worum es sich zu kämpfen lohnt — das entsteht erst mit Materialien
und dauerhaften Kolonien.

| | Inhalt | Warum diese Reihenfolge |
|---|---|---|
| **M4** ✅ | Materialien + globales Inventar, erste Bauketten (Wald) | Löst das eigentliche Problem sofort und passt noch in die heutige Architektur |
| **M5** ✅ | Bevölkerung: Hütten, Nahrung, Wasser, Berufe | Braucht Materialien, um überhaupt bezahlbar zu sein |
| **M6** ✓ | Mehrere Planeten gleichzeitig, Rakete, Reisen — und der Reset auf Durchlauf-Ebene | Der Architektur-Umbau. Reset muss *mit*, weil „Planet abschließen = zurücksetzen" dann nicht mehr gilt |
| **M7** ✓ | Planeten-Identität: Lava, Eis, Gas mit eigenen Ketten | Inhalt auf dem Gerüst von M6 |
| **M8** ✓ | Die Anoxen (bisher M4) | |
| **M9** | Politur (bisher M7) — Achievements ✓, Planetenansicht ✓, Ton offen | |

### Stand nach M4

Gebaut: drei Materialien (Holz, Stein, Titan), globales Lager auf der neuen
Durchlauf-Ebene, die Wald-Kette und der Abbau. Materialien starten auf
**Vesta**, nicht auf Aurora — Aurora bliebe sonst nicht das reine
O₂-Tutorial, das §11 verlangt. Wie sich Materialien endgültig über die
Planeten verteilen, entscheidet M7 mit der Planeten-Identität.

Gemessen (simuliert, nicht geschätzt):

| Spielweise | Dauer |
|---|---|
| Aurora (unverändert zu M3) | 21,8 min |
| Vesta, Wald zur Hälfte geerntet | 32,1 min |
| Vesta, Kahlschlag | 34,0 min |
| Vesta, gar kein Holz | schließt nicht ab |

Der Baum ist damit knapp zwei Minuten wert — die Abwägung „Bauholz kostet
Atmosphäre" ist messbar, ohne den Planeten zu entscheiden. Bei 0,9 O₂/Baum
drückte der Wald Vesta unter das Zielfenster, bei 0,3 war Fällen umsonst zu
haben; 0,5 trifft beides.

**Die Kette ist bewusst kritisch:** Holz → Titan-Mine → Titan → Nitrat-Cracker
→ N₂. Wer nie ein Sägewerk baut, bekommt den Cracker nicht und damit den
N₂-Puffer nicht ins Fenster. Das ist kein Sackgassen-Verlust — ein Sägewerk
lässt sich jederzeit nachbauen, und die fehlenden Materialien stehen rot an
der Kaufschaltfläche —, aber es ist die härteste Abhängigkeit im Spiel.
Sollte sich das beim Spielen als zu streng anfühlen, ist der richtige Hebel,
Sublimatoren allein bis ins Fenster reichen zu lassen (langsamer, aber
möglich), nicht die Materialkosten zu senken.

### Stand nach M5

Menschen tauchen nicht mehr allein wegen guter Luft auf. Sie brauchen
**Betten** (Wohnkuppel), **Nahrung** (Hydroponik-Halle) und **Wasser**
(Eisschmelze). Fehlt eines, wächst nichts mehr und die Siedlung schrumpft
langsam — langsam, weil Rückschläge temporär bleiben sollen (§1.2).

Menschen werden auf **zwei** Arten gebunden, und das ist Absicht:

| | Wirkung |
|---|---|
| **Gebäude** | verschlucken beim Bau einmalig Leute. Endgültig, nicht umkehrbar. |
| **Berufe** | belegen freie Leute dauerhaft, lassen sich aber umverteilen. Einstellen kostet Material, Freistellen erstattet nichts. |

Die Wohnkuppel kostet bewusst **Stein statt Holz**: Holz käme aus dem
Sägewerk, das Menschen kostet, die es ohne Wohnkuppel nicht gibt. Der
Steinbruch kommt ohne Bevölkerung aus und bricht die Verklemmung.

Gemessen (simuliert, nicht geschätzt):

| Spielweise | Dauer |
|---|---|
| Aurora (unverändert seit M3) | 21,8 min |
| Vesta | 37,8 min |
| Vesta, gar kein Holz | schließt nicht ab |

Zwei Zahlen mussten dafür nachgezogen werden: Betten je Kuppel von 40 auf
**300** (bei 40 wurde Wohnraum zur alles bestimmenden Grenze, die Bevölkerung
fiel von 79k auf 6k und Vesta auf 54,7 min), und `settleAt` von 1,5 auf
**0,5 %** — da Wohnraum das Wachstum ohnehin begrenzt, darf die Luft früher
freigeben.

**Die Holz-Abhängigkeit ist mit M5 noch härter geworden:** ohne Sägewerk gibt
es kein Holz, ohne Holz keine Hydroponik-Halle — und damit nicht nur keinen
N₂-Puffer, sondern auch nichts zu essen. Das ist die Stelle, die beim
Spielen am ehesten unfair wirken wird.

### Offene Fragen dieses Kurswechsels

- **Überlebt das Material-Inventar den Durchlauf-Reset?** Vermutlich nicht —
  sonst trivialisiert der zweite Durchlauf den ersten. Naheliegender:
  Genesis-Upgrades gewähren *Startmaterial*.
- **Wie viele Planeten pro Durchlauf?** Beim ersten Mal nach Planet 2 zu
  resetten heißt: der erste Durchlauf ist kurz. Wächst das später auf 5, 10?
- **Was passiert mit `meta.population` beim Reset?** Bevölkerung ist bisher
  „überlebt für immer". Unter dem neuen Modell gehört sie vermutlich zum
  Durchlauf und wird mit zurückgesetzt.

### Die fünf Planeten (M7)

Jeder stellt ein *anderes* Problem, nicht dasselbe mit anderen Zahlen:

| Planet | Problem | Materialien | Besonderheit |
|---|---|---|---|
| **Aurora** | Tutorial | — | nur O₂, kein Fenster nach oben |
| **Vesta** | Puffer und Dreck | Holz, Stein, Titan | einziger Wald mit Ertrag |
| **Pyra** | Die eigene Industrie erstickt einen | Obsidian, Schwefel | viermal so schmutzig, kein Wald |
| **Kryo** | Zeit | Eis, Stein | Wachstum 0,45 — alles dauert |
| **Nimbus** | Größe | Helium | N₂ per Gasschöpfer fast umsonst |

Verbindend: **keiner hat alles, was seine eigene Rakete braucht.** Pyra
verlangt Titan (nur Vesta), Kryo verlangt Obsidian (nur Pyra), Nimbus
verlangt von jedem etwas. Zurückfliegen ist dadurch kein Bonusweg, sondern
der Weg.

### Anlagen fallen aus, sie sterben nicht (M8)

§8 spricht von zerstörten Gebäuden, §1.2 nennt **Angriffe** ausdrücklich als
*temporären* Rückschlag. Das widerspricht sich, und §1.2 gewinnt — aus
demselben Grund, aus dem Brände seit M3 nur drosseln: verlorene Käufe sind
in einem Incremental der zuverlässigste Weg, jemanden zum Aufhören zu bringen.

Sabotierte Anlagen stehen also still und laufen von selbst wieder an;
Reparaturdepots beschleunigen das nur. Gemessen über eine Stunde ohne jede
Verteidigung: Welle 1 → 8, bis zu 65 % der Anlagen aus, Produktion von 19.140
auf 1.517 gefallen, ein Drittel der Bevölkerung tot — und zwischen den Wellen
erholt sich alles sichtbar wieder. Der Fortschrittsbalken läuft rückwärts,
ohne dass etwas endgültig verloren geht.

### Die Konter-Matrix trägt

Ohne sie wäre „mehr vom Billigsten" immer richtig und die Einheitentypen aus
§7 bloße Dekoration. Gemessen auf Pyra über eine Stunde:

| Verteidigung | Anlagen | Ausfall | Endproduktion |
|---|---|---|---|
| nur Oxidationstürme | 20 | 12 % | 12.544 |
| gemischt (Turm/Drohne/Druck/Depot) | 31 | 0 % | 18.808 |

Die gemischte Aufstellung gewinnt deutlich, obwohl sie nicht wesentlich mehr
kostet. Genau das war die Absicht.

### Achievements sind keine Vitrine (M9)

§10 verlangt „Achievements mit echtem Effekt … starker Anreiz, Randstrategien
auszuprobieren". Also trägt jedes der 16 einen dauerhaften Bonus, und drei
belohnen ausdrücklich Dinge, die man sonst nie täte:

- **Handarbeit** — 1.000 Klicks, obwohl Generatoren das Klicken ablösen sollen.
- **Brandstifter** — zehnmal einen Planeten in Brand setzen, also zehnmal
  genau den Fehler machen, den M3 einem abgewöhnt.
- **Diaspora** — auf drei Planeten *gleichzeitig* siedeln, was ohne die
  dauerhaften Planeten aus M6 gar nicht möglich wäre.

Die Boni laufen wie alles andere über eine zentrale Sammelstelle
(`achievementEffects()`), nicht verstreut (§13). Nachgemessen mit allen 16
freigeschaltet: Klick ×2, Produktion ×1,69, Baukosten ×0,83, Abwehrschaden
120 → 165,6.

### Die Planetenansicht zeigt den Spielstand (M9)

§2 nannte die drehende Kugel optional. Sie ist es wert, weil sie das erste
ist, das den Zustand zeigt, ohne dass man Zahlen liest: der Bewuchs folgt dem
O₂-Anteil, der Dunst den Schadstoffen, die Lichter auf der Nachtseite der
Bevölkerung, die glühenden Flecken der Brandstärke. Die Farben kommen aus
`PlanetDef.palette` — ein neuer Planet wird weiterhin komplett in
`data/planets.ts` beschrieben, ohne die UI anzufassen.

Canvas statt Three.js: eine schattierte Kugel mit gedrehten Oberflächenpunkten
braucht keine 3D-Bibliothek und keine zusätzliche Abhängigkeit.

Die Drehung hängt an `requestAnimationFrame`, nicht am Tick — sie ist keine
Spiellogik, wird nicht gespeichert, und im Tick würde sie beim
Offline-Nachlauf durchdrehen.

### Das Abblasventil

Aus M7 gelernt: N₂ war **nicht entfernbar**. Wer zu viel Puffer erzeugt
hatte, verdünnte seinen O₂-Anteil dauerhaft — auf Nimbus mit seinem offenen
Gashahn binnen Minuten. Das verstößt gegen §1.2 („Rückschläge sind temporär").

Das Ventil ist deshalb ein **Regler, kein Abfluss**: es öffnet nur oberhalb
des Fensters und schließt von selbst. Ein stur laufendes Ventil erzeugte im
Test exakt dasselbe Problem spiegelverkehrt — N₂ auf 0, O₂ auf 26,8 %,
Planet unabschließbar.

### Entschieden in M6

- **Das Material-Inventar überlebt den Reset nicht.** Sonst startet Durchlauf 2
  mit dem vollen Lager aus Durchlauf 1 und macht den ersten bedeutungslos.
  Startmaterial soll später aus Genesis-Upgrades kommen.
- **Nahrung und Wasser bleiben planetenlokal** und gehören nicht ins globale
  Lager. Sonst ernährt ein einziger Farmplanet alle anderen mit, und jede
  Kolonie verliert ihr eigenes Überlebensproblem. Handel damit ist ein
  eigenes Thema.
- **Der Reset ist nicht an einen abgeschlossenen Planeten gebunden.** Er wird
  frei, sobald er mindestens einen Kern abwirft — wann es zäh genug ist,
  entscheidet der Spieler.
