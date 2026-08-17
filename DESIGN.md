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
17. [Kurswechsel II: Die Kolonie](#17-kurswechsel-ii-die-kolonie)
18. [Kurswechsel III: Zufriedenheit und die Werkstatt](#18-kurswechsel-iii-zufriedenheit-und-die-werkstatt)
19. [Das Ende](#19-das-ende)
20. [Kurswechsel IV: Der lange Weg](#20-kurswechsel-iv-der-lange-weg)

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

> **Überarbeitet in [§17](#17-kurswechsel-ii-die-kolonie).** Bevölkerung ist
> nicht länger ein Multiplikator mit Atemkosten, sondern die Arbeitskraft, ohne
> die nichts läuft. Sie tauchen auch nicht mehr ab einem O₂-Wert auf: auf
> Aurora landet man mit zehn Leuten und Rationen.

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
- ~~**Bevölkerung steuerbar oder automatisch?**~~ **Entschieden in §17,
  nachgetragen in M24: automatisch.** Zuwanderung passiert von selbst, sobald
  Wohnraum und Versorgung es hergeben — der Regler wäre genau der
  Micromanagement-Druck, den diese Zeile befürchtet hat. Das Gegenstück ist
  nicht ein Schieber, sondern der **Abriss**: Wohnraum weg heißt, die Leute
  ziehen ab. Damit gilt auch hier „alles, was wächst, braucht ein Gegenstück",
  ohne eine zweite Bedienung.
- ~~**Wellen-Frequenz:** an Echtzeit gekoppelt oder an Fortschritt?~~
  **Entschieden in M8: an den Fortschritt.** §7 gab die Antwort bereits vor
  („Der Fortschritt erzeugt die Bedrohung. Keine künstlichen Trigger nötig"),
  und es ist zugleich das idle-freundlichere: wer weggeht, während nichts
  wächst, kommt nicht in eine Wand aus Wellen zurück.
- ~~**Kolonie-Ertrag:** linear pro Kolonie oder mit abnehmendem
  Grenzertrag?~~ **Entschieden mit §16, nachgetragen in M24: abnehmend.** Aus
  „Kolonien" sind Planeten geworden, und ihr Ertrag ist die Biomasse des
  ganzen Laufs — verrechnet über `kerne = floor(√(biomasse / 300000))` in
  systems/prestige.ts. Die Wurzel *ist* der abnehmende Grenzertrag: doppelte
  Biomasse sind 1,41-mal so viele Kerne. Genau deshalb misst
  [dev/balance.ts](src/dev/balance.ts) auch die ungerundete Biomasse mit — auf
  einem frühen Planeten verschwindet ein Zugewinn sonst unter der Rundung.
- ~~**Sollen Erfolge Bestände oder Summen messen?**~~ **Entschieden in M26:
  gemischt — Summen, wo der Text eine Wegmarke verspricht; Bestände, wo er
  ausdrücklich „gleichzeitig" sagt.**

  Der Befund aus M25: vier der sechzehn Erfolge prüften einen **Bestand**,
  während ihr Text eine **Summe** versprach. „100.000 Holz geschlagen"
  verlangte 100.000 gleichzeitig im Lager, und das Lager fasst 1000 plus 2500
  je Halle — der schwere Teil stand im Text gar nicht. „10.000
  Forschungspunkte verdient" verlangte sie *ungenutzt*: jeder Kauf entfernte
  einen davon, und ausgeben ist das, was das Spiel überall sonst verlangt.

  Entschieden wurde **nicht**, den Text zur Prüfung zu ziehen (so hatte M25 es
  provisorisch gemacht), sondern die Prüfung zum Text. Es zählen jetzt
  `meta.stats.materialsMined` und `meta.stats.totalResearch`, beide in der
  Meta-Ebene und damit über den Durchlauf-Reset hinweg — ein Erfolg, den ein
  Reset zurücknimmt, wäre die Strafe aus §1.2.

  **Gezählt wird der Fund, nicht der gelagerte Teil.** Wer bei vollem Regal
  weiterfördert, hat trotzdem gefördert; es verfällt nur. Andersherum hinge
  die Summe wieder an der Lagergrenze, und der Fehler wäre bloß eine Ebene
  tiefer gewandert. Der Zähler sitzt deshalb in `storeMaterial()` **vor** der
  Grenze — der einzigen Stelle, durch die im Spiel Material ins Lager kommt.

  „Förster" (10.000 Bäume gleichzeitig) und „Diaspora" (drei bewohnte Welten
  gleichzeitig) bleiben Bestände: dort *ist* das Gleichzeitige die Aufgabe.

  SAVE_VERSION 20. Die Migration füllt die neuen Zähler bewusst **nicht** auf:
  was vor der Zählung gefördert wurde, weiß niemand mehr, und eine geratene
  Zahl könnte einen Erfolg vergeben, den es nie gab.
- ~~**Story-Präsentation:** Log-Einträge, Dialogfenster oder ein Codex?~~
  **Entschieden, nachgetragen in M24: der Log — und seit §20.2 die Bergung.**
  Die Vermutung „Log ist am billigsten und stört den Flow am wenigsten" hat
  sich gehalten, aber die eigentliche Antwort kam später: ein Bergungsziel
  gibt bei jedem Anlauf **einen weiteren Satz** heraus, der Reihe nach. Damit
  ist die Vorgeschichte kein Nachschlagewerk neben dem Spiel, sondern ein
  Ertrag *im* Spiel — der einzige, den kein Balancing kaputtmachen kann.

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
| **M9** ✓ | Politur (bisher M7) — Achievements, Planetenansicht, Ton | |

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

- ~~**Überlebt das Material-Inventar den Durchlauf-Reset?**~~ **Nein**, wie
  hier vermutet: `resetRun()` leert Material, Freischaltungen und alle
  eingelagerten Planeten. Der zweite Teil der Vermutung ist ebenfalls
  eingetroffen, nur mit anderem Stoff — der Meta-Baum gewährt Start**vorrat**
  statt Startmaterial („Vorratstank: jeder neue Planet beginnt mit 500 O₂").
- ~~**Wie viele Planeten pro Durchlauf?**~~ **Alle sechs**, und der Reset ist
  nicht an eine Zahl gebunden: er lohnt sich, sobald er einen Kern abwirft,
  und wann es zäh genug ist, entscheidet der Spieler (§16). Die Frage „nach
  Planet 2 resetten" hat sich damit erledigt, statt beantwortet zu werden.
- ~~**Was passiert mit `meta.population` beim Reset?**~~ **Anders als hier
  vermutet: sie überlebt.** `doPrestige()` addiert die Bewohner des Laufs auf
  `meta.population` — Menschen bleiben als Kolonie-Erfahrung erhalten, auch
  wenn alles andere zurückfällt. **In M24 korrigiert:** addiert wurde bis dahin
  nur `planet.settlers`, also die Welt, auf der man beim Drücken zufällig
  stand. Wer seinen Lauf auf einem frisch besiedelten Planeten beendete,
  verschenkte jede Kolonie davor.

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

### Der Wald wird in zwei Hälften eingeführt

Aurora war zu dünn: 22 Minuten Klicken und drei Generatoren. Es bekommt
deshalb den Wald — aber nur die *halbe* Kette.

| | Aurora | Vesta |
|---|---|---|
| Bäume pflanzen | ✓ | ✓ |
| Bäume fällen | — | ✓ |
| Was der Wald ist | reiner Gewinn | eine Abwägung |

Damit bleibt §11 gewahrt: Aurora lernt „Bäume atmen für dich", Vesta lernt
„Bauholz kostet Atmosphäre". Zwei Gedanken, zwei Planeten. Technisch hängt
das Sägewerk daran, ob der Planet Holz überhaupt als Rohstoff führt — es ist
also eine Datenaussage, keine Sonderregel im Code.

Gemessen: Aurora ohne Wald 22,0 min, mit Wald 19,3 min bei 15,5 % Waldanteil
an der Produktion. Beides im Zielfenster von §13, und der Wald ist ein
Anreiz statt einer Pflicht.

### Reiter statt einer endlosen Spalte (M9)

Nach M8 standen auf einem ausgebauten Planeten **vierzehn gleich gewichtete
Panels** untereinander. Man konnte Atmosphäre und Anlagen nicht gleichzeitig
sehen, musste zum Klicken scrollen, und der Klick-Knopf sah aus wie das
Export-Feld. Für einen neuen Spieler war das eine Wand.

Drei Eingriffe, in dieser Reihenfolge wirksam:

1. **Fünf Reiter** — Planet, Aufbau, Fortschritt, Imperium, System. Ein Reiter
   zeigt einen Zusammenhang. Leere Reiter erscheinen gar nicht: beim
   Erstkontakt auf Aurora sind es drei.
2. **Die Hauptaktion nach oben.** Vorrat, Rate und der Freisetzen-Knopf stehen
   jetzt *vor* den Fensterbalken. Die wichtigste Handlung des Spiels darf
   nicht unter dem Sichtbereich liegen.
3. **Ein Satz „was jetzt".** Aus dem Zustand abgeleitet, nie aus einem Skript —
   er kann also nicht falsch stehenbleiben. Der häufigste Abbruchgrund in
   Incrementals ist nicht Schwierigkeit, sondern Ratlosigkeit.

Die Seitenspalte trägt nur noch, was unabhängig vom Reiter gilt und sofort
beantwortet werden muss: laufende Wellen, laufende Zwischenfälle, das Log.
Der Verteidigungs-Einkauf ist dafür in den Aufbau-Reiter gewandert — akut
reagieren und in Ruhe bauen sind zwei verschiedene Situationen.

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

---

## 17. Kurswechsel II: Die Kolonie

Entschieden nach M9. **Diese Sektion hat Vorrang vor §5, §13 und §16**, wo
sie ihnen widerspricht.

Der Auslöser: Bevölkerung ist bisher ein Multiplikator mit Atemkosten. Sie
soll die **zentrale** Rolle spielen — Menschen, die bauen, arbeiten und
versorgt werden wollen, nicht eine Zahl, die eine andere Zahl größer macht.
Vorbild ist Kittens Game: nichts läuft von selbst, alles läuft durch Hände.

### Vier Entscheidungen

**1. O₂ ist keine Währung mehr.** Es ist nur noch der Wert, den man hochbringt
— das Ziel, nicht das Zahlungsmittel. Bezahlt wird mit Material und
Arbeitskraft. „Du kannst eine Rakete nicht aus O₂ bauen" gilt für jedes
Gebäude, nicht nur für die Rakete.

**2. Bevölkerung in Dutzenden, nicht Zehntausenden.** Einzelne Zuweisung
funktioniert nur, wenn der einzelne Mensch zählt. Vestas 24 000 und Nimbus'
60 000 fallen um ein bis drei Größenordnungen.

**3. Versorgung ist ein Regler auf die Arbeitskraft, kein Todesurteil.**

```
sättigung 1,0  →  volle Arbeitsleistung
sättigung 0,5  →  halbe Arbeitsleistung
sättigung 0,0  →  niemand arbeitet — aber niemand stirbt
```

Das ist der elegantere Weg als eine Hungertod-Mechanik: Der Druck ist eine
Kurve statt einer Klippe, und **offline verliert man automatisch nur
Produktion, nie Menschen**. Leitlinie §1.3 ist damit ohne Sonderregel im Code
erfüllt statt durch eine Ausnahme. Die bisherige `STARVE_RATE` in
population.ts entfällt ersatzlos.

**4. Erst Aurora, dann der Rest.** Aurora wird die Blaupause. Vesta bis
Nimbus laufen vorerst nach dem alten Modell weiter und werden in M13
nachgezogen. Zwischenzeitlich ist das Spiel inkonsistent, aber jederzeit
spielbar — das ist der Preis dafür, das Modell klein zu erproben.

### Aurora wird der Mars

**Maßstab:** `baseAtmosphere` fiel von 12,15 M auf 4 M. Der alte Wert war auf
unbegrenzte Arbeitskraft ausgelegt; gemessen stand der O₂-Anteil nach 90
Minuten bei 0,00 %. Simuliert mit zugewiesener Handarbeit: 4·10⁵ → 11,5 min,
1,5·10⁶ → 15,2 min, 4·10⁶ → 21,1 min — Zielfenster §13 sind 15–25 min.


Kein leerer Fels mehr, sondern eine Landung: **zehn Menschen, endliche Wasser-
und Essensrationen**, und die Aufgabe, vor dem Aufbrauchen eigene Produktion
zu haben. Aus dem Klickspiel wird ein Überlebensproblem mit klarem ersten
Ziel. Mit genug Terraforming wird daraus eine zweite Erde.

Beim Abflug nimmt die Rakete **einen Teil der Bevölkerung mit** — der Rest
bleibt als Kolonie. Damit ist die Rakete auch eine Entscheidung darüber, wo
Arbeitskraft künftig steht.

### Das neue Modell

| Begriff | Bedeutung |
|---|---|
| **Bewohner** | Zählbar, zuweisbar, versorgt oder nicht. Ohne Zuweisung untätig. |
| **Arbeitsplatz** | Nur **Handarbeit** hat Plätze. Unbesetzt produziert sie **nichts**. |
| **Rezept** | Ein Verarbeitungsgebäude verbraucht Eingang und liefert Ausgang. |
| **Bauplatz** | Ein Gebäude entsteht nicht sofort: es braucht Material *und* einen zugewiesenen Bauarbeiter *und* Zeit. |
| **Lager** | Endlich. Lagerhallen heben die Grenze — ohne sie verfällt Überschuss. |

Die Kette bis zur Rakete ist beispielhaft:

```
Eisenerz  ──Mine──►  Erz  ──Schmelze──►  Eisen  ──Presse──►  Metallplatten  ──►  Rakete
             (Arbeiter)      (Arbeiter)         (Arbeiter)
```

Jeder Pfeil braucht Hände. Ohne zugewiesene Bewohner steht die ganze Kette.

### Meilensteine

| | Inhalt | Warum diese Reihenfolge |
|---|---|---|
| **M10** ✓ | Aurora startet mit 10 Bewohnern und endlichen Rationen. Zuweisung an Anlagen, Sättigung regelt die Arbeitsleistung, Abriss als Weg zurück. | Kleinstmöglicher vollständiger Loop, an dem sich das Modell beweisen muss |
| **M11** ✓ | Bauen kostet Hände und Zeit: Bauplatz, Bauarbeiter, Fertigstellung. Lagerhallen mit echter Kapazitätsgrenze, Wohnhäuser. | Braucht den Arbeitskraft-Begriff aus M10 |
| **M12** ✓ | Verarbeitungsketten mit Zwischengütern und Rezepten. Rakete aus Metallplatten statt aus O₂. | Braucht Gebäude und Lager aus M11 |
| **M13** ✓ | Aurora als Mars zu Ende (Flechtenfeld), dann Vesta bis Nimbus auf die neue Wirtschaft umgestellt und vollständig neu balanciert. | Aufräumen, wenn das Modell steht |

### Was dabei zerbricht

Ehrlich benannt, damit es niemanden überrascht:

- **Das Balancing von M4 bis M8 ist danach Makulatur.** Jede Zahl war für
  „O₂ ist Währung" simuliert.
- **Ein Teil der Selbsttests** prüft Regeln, die es dann nicht mehr gibt.
  In M10 traf das zwei Prüfungen — beide hätten danach grün gemeldet und
  nichts mehr geprüft.
- **Der Save bricht mehrfach** — je Meilenstein mindestens eine Migration.
- Der Arbeitskraft-Multiplikator (`1 + √siedler / 40`) ist bei 50 Bewohnern
  sinnlos und wird ersetzt.

### Entschieden in M10

**Plätze hat nur Handarbeit, nicht jede Anlage.** Elektrolyse, Photolyse,
Prozessor, Sublimator, Cracker, Wäscher, Ventil, Kondensator und Gasschöpfer
sind chemische Apparate und laufen von selbst. Zugewiesen wird an Bergbau,
Schmelze, Sägewerk, Forst und Landwirtschaft. Das hält die O₂-Seite frei von
Verwaltung und macht Zuweisung zu einer Entscheidung statt zu einer
Pflichtübung an jedem Gebäude.

**Berufe sind ersatzlos gestrichen.** Sie waren Bonusgeber aus M5 und damit
ein zweites System für dieselbe Sache. `data/jobs.ts`, `systems/jobs.ts` und
das Panel sind gelöscht.

**Zuwanderung passiert automatisch,** sobald Rationen und Wohnraum reichen —
ohne Regler. Nachwuchs setzt Überschuss voraus: unter 70 % Sättigung wächst
nichts.

**Dafür lassen sich Anlagen abreißen.** Ohne Regler wäre Bevölkerung sonst
eine Einbahnstraße. Abriss ist dasselbe Prinzip wie Wäscher für Schadstoffe
und Ventil für N₂ — jede dauerhaft erhöhende Anlage braucht ein Gegenstück.
Ohne Rückerstattung; verbaute Menschen kommen zurück.

> **Falle, zweimal getroffen:** Wachsen und Schrumpfen dürfen **nicht** an
> derselben Rate hängen. Die enthält den Sättigungsfaktor, und bei knappen
> Vorräten ist er null — eine überfüllte Kolonie schrumpfte dann nicht, und
> der Abriss war genau dann wirkungslos, wenn man ihn braucht. Nachgerechnet:
> exakt 0,0 Änderung pro Sekunde.

**Wohnraum entscheidet über das Überleben, nicht die Außenluft.** Vorher
skalierte die Bewohnbarkeit die Kapazität, und bei 0 % O₂ war sie null — die
zehn Mitgebrachten wären sofort gestorben. Eine Marskolonie lebt in
versiegelten Kapseln; die Atmosphäre bestimmt nur noch, wie gut es sich
*vermehrt*.

**Versorgungsanlagen sind von der Sättigungsstrafe ausgenommen.** Sonst gibt
es eine Sackgasse: Sättigung senkt die Arbeit, Arbeit erzeugt Nahrung. Sich
selbst zu ernähren gibt man zuletzt auf.

**Pro-Kopf-Verbrauch steht am Planeten**, nicht global — Aurora rechnet mit
einem Dutzend Leuten, Vesta bis Nimbus noch mit Zehntausenden.

### Entschieden in M11

**Bezahlen legt eine Baustelle an, keine Anlage.** Material, O₂ und verbaute
Menschen sind sofort weg; das Gebäude entsteht durch Arbeit. Jede Anlage hat
dafür ein Pflichtfeld `buildWork` in Arbeitersekunden — kein Default, damit
ein vergessener Wert nicht stillschweigend die alte Sofort-Mechanik
zurückbringt.

**Die Kolonne arbeitet die vorderste Baustelle ab, nicht alle gleichzeitig.**
Eine Reihe, die sichtbar von oben abgearbeitet wird, versteht man; fünf
gleichzeitig kriechende Balken nicht. Fortschritt zählt pro *Stück*, also
liefert eine Zehnerbestellung nach und nach statt zehnmal so lange gar nichts.

**Es gibt einen Grundtakt ohne Bauarbeiter** (`0,5` Arbeit/s, die Bauautomaten
der Landefähre). Das widerspricht dem Tabelleneintrag „braucht einen
zugewiesenen Bauarbeiter" bewusst — ohne ihn wären Vesta bis Nimbus
**Sackgassen**: sie starten mit null Bewohnern, Bewohner brauchen Wohnraum,
Wohnraum will gebaut werden. Gemessen: mit Grundtakt steht die erste
Wohnkuppel auf Vesta nach 119 s und die ersten Siedler landen in derselben
Sekunde. Hände bleiben trotzdem die Hauptsache — ein einziger Bauarbeiter
verdreifacht das Tempo.

**Abbrechen erstattet die offenen Stück vollständig.** Kein Widerspruch zum
„Abriss ohne Rückerstattung": dort steht ein fertiges Gebäude, hier steht noch
nichts. Ein Fehlklick auf „Max" darf keine Strafe sein.

> **Falle, beim Bauen dieselbe wie beim Preis:** Die Kostenkurve muss
> *bestellte* Stück mitzählen, sonst kostet zweimal „Max" hintereinander
> beide Male den niedrigen Preis. Und beim Abbrechen muss die Baustelle
> **zuerst** aus der Reihe fliegen und **dann** der Preis gerechnet werden —
> andersherum zählt sie sich selbst mit und erstattet die Stufen *über* den
> eigenen. Gemessen war das ein Gewinn von 4021 O₂ pro Abbruch.

**Das Lager ist endlich, die Grenze gehört dem Durchlauf.** Grundplatz 1000 je
Material, jede Lagerhalle +2500 — für alle Materialien zugleich, damit nicht
eine schnelle Mine den Rest aus dem Regal drängt. Hallen auf *allen* Planeten
zählen mit: eine planetenlokale Grenze würde beim Reisen sinken und im selben
Moment Material vernichten, das längst im Regal lag. Überschuss verfällt, aber
was schon liegt, bleibt liegen — auch nach einem Abriss (§1.2).

**Aurora bekommt das Wohnmodul.** Es kostet kein Material, weil es aus
Regolith vor Ort gedruckt wird — so hat der materiallose Planet einen zweiten
Akt, ohne dass Aurora ein Vorkommen bekommt und §11 verletzt.

**Gemessen (simuliert, nicht geschätzt):** Aurora liegt jetzt bei 22,8–25,1
min je nach Klickrate und Spielweise; die Bauzeit kostet rund zwei Minuten
gegenüber den 21,1 min aus M10. Das ist der obere Rand des Fensters aus §13
(15–25 min) — nachgestellt wurde nichts, weil der Unterschied zum Fenster
sechs Sekunden beträgt und damit unter dem Rauschen einer Heuristik liegt.

### Entschieden in M12

**Aurora ist nicht mehr das reine O₂-Tutorial.** Die Eisenkette — Erzmine,
Schmelze, Walzpresse — steht dort und nirgendwo sonst. Das widerspricht §11
dem Buchstaben nach, folgt ihm aber dem Sinn nach: Aurora ist unter §17 keiner
von fünf gleichartigen Planeten mehr, sondern die **Blaupause**, an der sich
das Kolonie-Modell beweisen muss. Ein Planet ohne Verarbeitung kann das nicht
zeigen, und die Rakete aus Metallplatten braucht einen Ort, an dem
Metallplatten entstehen.

**Die Rakete von Aurora kostet null O₂.** Nicht weniger — null. Ein Restbetrag
wäre die halbherzige Variante gewesen: solange O₂ irgendwo Rechnungen bezahlt,
bleibt es Währung. Vesta bis Nimbus zahlen bis M13 weiter mit beidem.

**Ein Rezept hat zwei Arten stillzustehen.** Unbesetzt, und ohne Nachschub.
Die zweite ist der eigentliche Inhalt von M12, denn ihr Grund liegt nicht in
der Kolonie, sondern in der Stufe davor. Beide werden in der UI benannt statt
nur als kleinere Zahl gezeigt.

> **Volles Ausgangslager heißt stocken, nicht fressen.** Eine Presse bei
> vollem Plattenregal darf kein Eisen mehr verbrauchen. Andersherum
> verschwindet Material in einer Anlage, deren Ausgang ohnehin verfällt — ein
> stiller, dauerhafter Verlust und damit derselbe Schaden, gegen den M11 die
> Lagergrenze bewusst *nur* den Nachschub stoppen ließ (§1.2). Gemessen ohne
> die Sperre: 1,33 Eisen pro fünf Sekunden ins Nichts.

**Das Verhältnis der Kette entsteht aus dem Rezept, nicht aus der
Geschwindigkeit.** Alle drei Stufen laufen mit derselben Rate; weil zwei
Eingang ein Ausgang ergeben, verarbeitet jede Stufe die Hälfte der
vorherigen. Die volle Kette ist 4 : 2 : 1. Der erste Anlauf hatte
abgestufte Raten und damit exakt das Gegenteil gelehrt — Erz und Eisen
standen nach 90 Minuten beide am Lagerlimit, während die Presse hungerte.

Simuliert nach der Korrektur: Stabilität bei 24,7 min ohne Kette und 25,4 min
mit ihr, die Rakete steht bei 20,0 min. Wer das Verhältnis verfehlt (8 Minen
auf 2 Schmelzen), wartet 27,9 min auf die Rakete und sieht Erz bei 998 an der
Grenze stehen — die Fehlinvestition kostet acht Minuten und ist sichtbar.

### Entschieden in M13, erste Hälfte

**Menschen zahlen sich auf Aurora jetzt aus.** Das war die härteste offene
Frage des Kurswechsels: gemessen war der Planet *mit* gebautem Wohnraum
langsamer als ohne (24,6 gegen 22,3 min). Die ganze O₂-Seite bestand aus
Apparaten, die keine Hände brauchen — also kostete jeder zusätzliche Mensch
Atem und O₂ und brachte für die Atmosphäre nichts.

Von den beiden Wegen, die §17 vorschlug, ist es die **O₂-Anlage mit Plätzen**
geworden, nicht der Wald: ein Wald wird einmal gepflanzt und atmet danach
ohne jede Hand weiter, ist also kein *laufender* Hebel. Das Flechtenfeld ist
einer.

Kein Widerspruch zur M10-Trennung „Maschine gegen Handarbeit": Elektrolyse,
Photolyse und Prozessor bleiben Apparate. Daneben steht jetzt eine Anlage, die
nur durch Hände läuft — die O₂-Seite ist damit kein Entweder-oder mehr,
sondern eine Entscheidung darüber, wohin freie Leute gehen.

> **Die knappe Ressource muss die gemeinte sein.** Der erste Anlauf gab dem
> Feld eine normale Kostenkurve (1,13) und Rate 8. Am Rand war es damit pro
> ausgegebenem O₂ nur ein Drittel so gut wie ein Prozessor — die Grenze war
> weiter das O₂, nicht die Hände, und das Vorzeichen drehte sich nicht
> (23,7 gegen 21,1 min). Erst eine flache Kurve (1,08) und Rate 80 machen
> Hände zur Grenze. Gemessen über einen Sweep von 8 bis 80, nicht geraten.

Ebenfalls geprüft und verworfen: billigerer Wohnraum. Aurora deckelt bei 60
Bewohnern, jedes Modul darüber ist verschwendetes O₂ — die Wohnkurve zu
senken machte den Planeten durchweg *langsamer*.

Gemessen nach der Änderung: 18,6 min ohne Wohnraum, **16,9 min mit** — 1,7 min
Vorsprung statt 2,3 min Verlust. Der Vollausbau mit Kolonie, Eisenkette und
Rakete liegt bei 23,8 min, die Rakete steht bei 20,1 min. Beides im Fenster
aus §13.

### Entschieden in M13, zweite Hälfte

**Alle Planeten rechnen jetzt in Dutzenden** — Vesta 120, Pyra 180, Kryo 240,
Nimbus 360, Pro-Kopf-Verbrauch überall wie auf Aurora. Damit fällt die
Übergangslösung aus §17 („der Verbrauch steht am Planeten, weil die alten noch
mit Zehntausenden rechnen") ersatzlos weg.

**`workforceMultiplier()` ist gestrichen.** Bevölkerung wirkt über Plätze; ein
globaler Bonus daneben war ein zweites System für dieselbe Sache.

**Jeder Planet hat einen Hand-Hebel — an seiner eigenen Engstelle:**

| Planet | Hebel | Seite | warum dort |
|---|---|---|---|
| Aurora | Flechtenfeld | O₂ | kein Puffer, O₂ ist alles |
| Vesta | Nitratgrube | N₂ | Vestas Problem ist der Puffer (§16) |
| Pyra | Aschewäsche | Schadstoffe | die eigene Industrie erstickt einen |
| Kryo | Nitrateis | N₂ | dieselbe harte Seite wie Vesta |
| Nimbus | Schwebefarm | O₂ | Gasschöpfer verschenkt den Puffer |

> **Zweimal derselbe Fehler, bevor die Regel klar war.** Vesta und Kryo
> bekamen zuerst O₂-Hebel — und wurden dadurch *unlösbar*, nicht leichter.
> Auf einem Planeten mit Puffer ist das N₂-Fenster (74–80 %) viermal so groß
> wie das O₂-Fenster (19–23 %), und zu viel O₂ lässt sich **nicht abbauen,
> nur verdünnen** (§4). Wer die O₂-Seite verstärkt, schiebt den Anteil über
> die Obergrenze, und von dort führt kein Weg zurück: gemessen stand Kryo nach
> fünf Stunden bei O₂ 23,0 % und N₂ 76,7 % fest. Aus demselben Grund musste
> Nimbus' Schwebefarm von 1600 auf 600 — ein O₂-Hebel kann sich
> überschießen, ein N₂-Hebel nicht.

**Der Maßstab fällt drastisch, und das ist Rechnung statt Gefühl.** Ein Planet
mit N₂-Fenster braucht Gas im Umfang von rund **49× seiner Grundatmosphäre**
(O₂ 21 % + N₂ 77 % lassen dem Inertgas ein bis zwei Prozent), Aurora ohne
Fenster nach oben nur 0,24×. Mit Dutzenden statt Zehntausenden und ohne den
Multiplikator lag Vesta mit dem alten Wert nach 180 Minuten bei 7,6 % N₂ von
nötigen 74.

| Planet | vorher | nachher | simuliert | Ziel §13 |
|---|---|---|---|---|
| Vesta | 100 M | 30 k | 41,9 min | 30–45 min |
| Pyra | 400 M | 70 k | 82,7 min | 1–2 h |
| Kryo | 1,2 Mrd. | 1,5 M | ~130 min | 2–4 h |
| Nimbus | 1 Mrd. | 3 M | ~128 min | 2–4 h |

Nimbus ist damit **erstmals simulativ belegt**. Behoben hat das nicht der
Planet, sondern der Simulant: er baut seither bis knapp *über* die Untergrenze
des Fensters statt an den oberen Rand. Am Rand pendelt jeder Wert, und der
Stabilitäts-Timer setzt bei jedem Ausschlag zurück — was vorher wie ein
unbalancierbarer Planet aussah, war eine schlechte Heuristik.

Nebenbei bestätigt: **Pyra ist ohne Fracht von Vesta nicht lösbar.** Sein
Puffer hängt am Cracker, der Cracker an Titan, und Titan gibt es nur auf
Vesta. Ohne mitgebrachtes Material blieb der Planet bei 75,7 % N₂ stehen —
genau der Zwang zum Rückflug, den §16 gemeint hat.

### Nachtrag zu M13: die Liste ist der einzige Weg

Beim ersten echten Spieltest nach M13 stellte sich heraus, dass Kondensator
und Keimkammer **seit M5 nicht baubar** waren. Nicht zu teuer, nicht zu spät
freigeschaltet — schlicht nicht in der Anlagenliste. Die Tabelle, die dort die
Gruppen bildet, hatte für `supply` nie eine Zeile, und was keine Gruppe hat,
verschwindet lautlos. Auf Aurora macht das den zentralen Loop aus §17
unspielbar: die Rationen reichen zwölf Minuten, danach fällt die Sättigung auf
den Boden, und es gibt keinen Weg zu eigener Versorgung.

Acht Meilensteine, 89 grüne Prüfungen und mehrere Balancing-Läufe haben das
nicht gesehen, weil sie alle `orderGenerator()` direkt aufrufen. Sie bauten
Keimkammern über einen Weg, den ein Mensch nie hat.

Die Lehre ist nicht „besser hinsehen", sondern eine Zuständigkeit:

- **Anzeigetabellen sind Daten und gehören nach `data/`.** Was nur die
  `.svelte`-Datei kennt, kann keine Prüfung sehen. `GENERATOR_GROUPS` steht
  jetzt neben den Generatoren.
- **Vollständigkeit erzwingt der Compiler.** Der Gruppenschlüssel ist aus
  `Output` abgeleitet statt von Hand aufgezählt; eine neue Ausgabeart ohne
  Zeile lässt den Typecheck scheitern und nennt die fehlende Art. Dasselbe
  gilt für die Zweige des Forschungsbaums.
- **Den Rest prüft der Selbsttest.** Ob eine Anlage auf irgendeinem Planeten
  überhaupt verfügbar ist, hängt an `isAvailable()` und damit an Laufzeit­
  logik — dafür geht die Prüfung alle fünf Planeten durch, so wie ein Spieler
  es täte.

### Offene Fragen dieses Kurswechsels

- ~~**Was wird aus dem Klick-Knopf?**~~ **Entschieden in M26: er bleibt, wie
  er ist.** O₂ ist auf Aurora nicht mehr der Preis der *Rakete*, bezahlt aber
  weiterhin jede Anlage — „O₂ freisetzen" hat damit ein Ziel, und das
  Balancing-Werkzeug zeigt, wie handfest: ohne Klicks kommt der simulierte
  Spieler nicht einmal an den ersten Generator (dev/balance.ts). Die Frage
  stellt sich erst wieder, wenn auch Anlagen kein O₂ mehr kosten; bis dahin
  wäre jede Änderung eine Lösung ohne Problem.
- ~~**Wohnkuppel, Hydroponik und Eisschmelze erscheinen auf Aurora, obwohl sie
  Stein und Holz kosten, die es dort nicht gibt.**~~ **Nachgesehen nach M17
  und in dieser Form nicht auffindbar** — beim ersten Besuch zeigt die Liste
  nur Elektrolyse, Kondensator und Keimkammer. Dafür stand ein anderer Fall
  daneben, den niemand vermutet hatte: **die Werkstatt** war ab Sekunde eins
  auf Aurora sichtbar und bot Balken aus Holz an, das es dort nicht gibt.
  Behoben über `availableGoods()` — ein Rezept erscheint erst, wenn
  mindestens einer seiner Eingänge im Lager liegt.

  Gefunden wurde es, indem der Planet zum ersten Mal in der *Oberfläche*
  geöffnet wurde statt simuliert. Dasselbe Muster wie bei den
  Versorgungsanlagen acht Meilensteine zuvor.
- ~~**Haben Bewohner Namen?**~~ **Entschieden in M27: ja, aber nur dort, wo
  ohnehin von Einzelnen die Rede ist.** Ein Personenregister wäre viel
  Oberfläche für eine Bevölkerung, die in Dutzenden bis Hunderten zählt
  (gemessen 60 bis 437 je Planet) — und genau das Micromanagement, das §17
  abgeschafft hat. Namen stehen deshalb an zwei Stellen und in keinem Panel:

  - **Wer einen Bergungstrupp anführt.** Dieselbe Person zieht los und kommt
    zurück; bei einem Zwischenfall ist sie diejenige, auf die man wartet. Aus
    „der Trupp kommt spät" wird jemand, der zu spät kommt.
  - **Wer eine Etappe eines Bauwerks fertig gemacht hat.** Die Saatbank deutet
    es selbst schon an: „Die Handschrift bleibt."

  **Kein Zustand, keine Migration.** `nameFor(schlüssel)` in
  [data/names.ts](src/data/names.ts) leitet den Namen aus dem *Anlass* ab —
  „Trupp zur Landefähre, dritter Anlauf" ergibt immer denselben Menschen, auch
  nach einem Neuladen. Derselbe Grundsatz wie beim Zwischenfall (§20.2) und
  bei der Hochrechnung (§19): ein Zufall, den man neu würfeln kann, ist
  keiner. Weil nichts gespeichert wird, kann auch nichts mit dem Spielstand
  auseinanderlaufen.
- ~~**Der Arbeitskraft-Multiplikator** (`1 + √siedler / 40`) gehört
  ersetzt.~~ **Erledigt in der zweiten Hälfte von M13:** ersatzlos gestrichen,
  Hände wirken nur noch über Plätze.

---

## 18. Kurswechsel III: Zufriedenheit und die Werkstatt

Entschieden nach M13. **Diese Sektion hat Vorrang vor §17**, wo sie ihr
widerspricht.

Der Auslöser: seit §17 sind Hände die knappe Ressource, aber ein Paar Hände
leistet immer dasselbe. Die einzige Antwort auf jedes Problem heißt „mehr
Leute" — und Leute atmen, wohnen und essen, sind also nie umsonst. Es fehlt
der Weg, dieselben Menschen **besser** arbeiten zu lassen.

### Drei Entscheidungen

**1. Die heutige Leistung ist der Startwert, nicht die Obergrenze.**
Zufriedenheit hebt die Handleistung von 100 % auf bis zu 200 %; sie startet
bei null. Der naheliegendere Weg — bei 50 % anfangen und auf 100 % wachsen —
wurde verworfen, weil er jede der fünf Zieldauern aus §13 ungültig macht,
ohne dafür etwas anderes zu erzählen. Wer weniger als 100 % will, bekommt
dasselbe Gefühl über eine Zufriedenheit, die bei null steht.

**2. Zufriedenheit steht am Planeten, Güter liegen global.** Bauten stehen
nun mal dort, wo sie gebaut wurden — jeder Planet baut seine Zufriedenheit
selbst auf. Die Werkstatt-Güter dagegen liegen im Durchlauf-Lager und wirken
überall, womit Fracht und Rückkehr denselben Sinn bekommen, den §16 für
Material vorsieht.

**3. Gegenstände sind eine Bestellung, kein Klick.** Kittens Game stellt sie
sofort her; hier kosten sie Material **und Arbeitszeit**, wie jedes Gebäude
seit M11. Ein sofortiger Klick wäre das erste im Spiel, das ohne Hände
passiert, und damit ein Loch in §17. Beide Sorten Bestellung teilen sich
dieselbe Reihe und dieselbe Kolonne — wer Werkzeug will, baut in dieser Zeit
kein Haus. Genau das ist die Entscheidung.

### Was Zufriedenheit *nicht* ist

Sie ist **nicht die Sättigung**. Die gibt es seit M10, sie regelt dieselbe
Zahl, und zwei Quellen für einen Wert sind der Fehler, an dem
`workforceMultiplier()` und die Berufe gestorben sind. Die Trennung ist die
Zeitskala:

| | Quelle | Verhalten |
|---|---|---|
| **Sättigung** | Vorräte im Lager | schwankt stündlich, fällt bei Engpass sofort |
| **Zufriedenheit** | Bauten und Güter | wächst über einen Planeten hinweg, fällt nur durch Zuwachs |

Beide treffen sich an genau einer Stelle: `handFactor()` in labor.ts. Wer
einen dritten Faktor auf dieselbe Zahl legen will, gehört ebenfalls dorthin.

**Das Gegenstück zum Wachsen** (CLAUDE.md) ist eingebaut statt angehängt:
Zufriedenheit ist der Ausbau **pro Kopf**. Wer die Kolonie wachsen lässt,
verdünnt sie und muss nachbauen. Das braucht keinen Regler und keinen
Verfall — mehr Menschen sind von selbst die Kehrseite.

### Die Werkstatt

Balken und Werkzeug entstehen aus Material, das anderswo gefördert wird, und
sind ihrerseits Baustoff für alles, was Zufriedenheit bringt. Die Kette ist
damit dieselbe Idee wie die Eisenkette aus M12, nur eine Ebene höher — und
sie zwingt zum Reisen, weil kein Planet beide Eingänge hat.

**Metallplatten bleiben, wo sie sind.** Die Walzpresse aus M12 stellt sie
weiter laufend her; die Werkstatt macht *neue* Güter. Zwei Wege zur selben
Ware wären zwei Systeme für dieselbe Sache.

### Meilensteine

| | Inhalt | Warum diese Reihenfolge |
|---|---|---|
| **M14** | Zufriedenheit als zweiter Faktor auf die Handleistung, Werkstatt mit Gütern auf Bestellung, Zufriedenheits-Bauten. | Braucht die Bestell-Reihe aus M11 und das globale Lager aus M12 |
| **M15** ✓ | Erebos — der sechste Planet. Er hat schon eine Atmosphäre, die falsche. | Erst wenn feststeht, wie weit Zufriedenheit trägt |

### Zufriedenheit hat die falsche Form — gemessen, nicht vermutet

Der unbequemste Befund dieser Messreihe, und er betrifft M14 selbst.

**Komfort lohnt sich auf keinem Planeten.** Voller Ausbau kostet Vesta 4,1
min (38,4 → 42,5), Pyra 20,8 (84,5 → 105,3), Nimbus 6,5 (151,7 → 158,2); nur
Kryo gewinnt 1,1. Naheliegend wäre, die Kosten zu senken — der Bedarf pro Kopf
ist von 3 auf 1,5 gefallen, und es hat **nichts** geändert (42,7 → 42,5).

Der Grund liegt tiefer, und der entscheidende Versuch war, den Bonus zu
**verschenken**: volle Zufriedenheit ohne jedes Gebäude. Danach war Vesta
*gar nicht mehr abzuschließen* und Pyra fiel von 84,5 auf 127,3 min.

> **Das Ziel dieses Spiels ist ein Fenster, kein Maximum.** Ein Bonus auf den
> laufenden Ausstoß erhöht damit nicht den Erfolg, sondern die Gefahr,
> darüber hinauszuschießen — und über dem O₂-Fenster gibt es kein Zurück (§4).
> Doppelte Hände heißt doppeltes N₂ aus der Nitratgrube, und das ist auf einem
> Planeten mit Puffer kein Geschenk, sondern ein Problem.

Ebenfalls ausprobiert und wieder ausgebaut: den Bonus auf Bauen und Forschung
umzuhängen statt auf die Produktion. Pyra verbesserte sich damit (105,3 →
97,2), Vesta schloss dafür gar nicht mehr ab — schnellere Forschung bringt
mehr Produktion, also denselben Überschuss eine Ecke weiter. **Nicht
festgeschrieben**, weil eine halb gemessene Umgestaltung schlechter ist als
ein benanntes Problem.

Danach wurden alle Kandidaten durchgemessen, jeweils Komfort gegen keinen
Komfort:

| Wirkung von Zufriedenheit | Vesta | Pyra |
|---|---|---|
| Hände | −4,1 min | −20,8 min |
| geringerer Verbrauch | −4,1 | −29,2 |
| billigere Anlagen | −2,7 | −22,3 |
| mehr Zuwanderung | −4,1 | −29,4 |

**Alle vier kosten Zeit.** Und der Gegentest schließt auch die Kosten als
Erklärung aus: mit Bauzeit 3 und ohne Materialkosten — also fast geschenkt —
wurde Pyra **117,1 min**, schlechter als mit dem teuren Komfort, weil dann
noch mehr davon gebaut wird und der Überschuss noch größer ausfällt.

### Die Lösung: Zufriedenheit zahlt auf den Abflug, nicht auf den Planeten

Sie multipliziert seit dem Nachtrag zu M14 die **Biomasse** — und sonst
nichts. Biomasse speist die Genesis-Kerne (§13) und damit den Meta-Baum; der
Lohn kommt also nach dem Abflug und kann das Fenster strukturell nicht
gefährden. Jeder andere Kanal beschleunigt etwas, das in ein Fenster treffen
muss, und ist damit kein Geschenk, sondern ein Risiko.

Für den Spieler ist es dadurch eine **echte Entscheidung** statt einer
Pflichtübung: Komfort kostet Zeit auf diesem Planeten und zahlt auf den
nächsten Durchlauf ein.

| Planet | ohne Komfort | mit Komfort |
|---|---|---|
| Vesta | 38,4 min · 421 008 Biomasse | 42,5 min · 468 246 (+11 %) |
| Pyra | 84,5 min · 1 023 922 | 113,9 min · 2 587 679 (+153 %) |

Auf Pyra kostet voller Ausbau 29 Minuten und bringt zweieinhalbmal so viel
Biomasse — über die Wurzelformel rund 1,6-mal so viele Kerne. Auf dem kurzen
Vesta lohnt es sich kaum, weil der Komfort erst gegen Ende steht. Auch das ist
eine Aussage und keine Panne: **auf einem Planeten, den man schnell hinter
sich bringt, baut man keine Badehäuser.**

> **Die Kerne runden, die Biomasse nicht.** Doppelte Biomasse sind nur
> 1,41-mal so viele Kerne, und auf einem frühen Planeten verschwindet der
> ganze Gewinn unter dem Abrunden. Wer die Wirkung von Komfort messen will,
> schaut auf `biomasse` im Ergebnis des Balancing-Werkzeugs, nicht auf
> `kerne`.

### Offene Fragen dieses Kurswechsels

- **Wie hoch darf die Obergrenze wirklich?** 200 % verdoppelt die Ausbeute
  jeder Handarbeit. Ein erster Messversuch nach M14 hat die Frage **nicht**
  beantwortet, aber drei Dinge gezeigt, die vorher nicht klar waren:

  | Planet | Hebel | ohne Komfort | mit Komfort |
  |---|---|---|---|
  | Vesta | N₂ | 37,6 min | 45–47 min |
  | Kryo | N₂ | 163,2 min | 194,2 min |
  | Nimbus | O₂ | 123,0 min | 78–80 min |

  **Erstens:** auf den N₂-Planeten macht voller Komfort den Planeten
  *langsamer*, nicht schneller — die Bauzeit und das O₂ für die
  Komfortbauten kosten mehr, als die doppelten Hände einbringen. Das ist
  dieselbe Falle wie bei Auroras Wohnraum vor M13 („mit gebautem Wohnraum
  langsamer als ohne") und der Punkt, an dem die Zahlen am ehesten nicht
  stimmen.

  **Zweitens:** Zufriedenheit beschleunigt auch das **Bauen**, weil
  `buildRate()` seit M11 an `handFactor()` hängt. Sie ist damit kein Hebel
  auf Handarbeit, sondern ein Tempohebel auf fast alles. Das war so nicht
  entworfen und ist die eigentliche Frage hinter der Obergrenze.

  **Drittens, und deshalb steht die Frage weiter offen:** Nimbus' 123 → 80
  min lassen sich *nicht* der Obergrenze zuschreiben. Bei halber
  Zufriedenheit (Handleistung 148 %) steht dort 78,1 min, bei voller 80,2 —
  der Unterschied kommt aus der Reihenfolge in der Bauschlange, nicht aus dem
  Bonus. Auch die Gegenprobe über die Rate der Schwebefarm (600 → 350) ändert
  nur 1,2 min. Der Simulant ist für diese Frage schlicht zu grob; sein
  Rauschen ist größer als der gesuchte Effekt.

  **Nächster Schritt ist deshalb kein Zahlendreh, sondern ein
  Balancing-Werkzeug**, das die Planeten reproduzierbar durchspielt, statt
  eine Heuristik pro Frage neu zu schreiben.

  **Nachtrag, mit dem Werkzeug gemessen** (dev/balance.ts, sauberer Start
  ohne Forschung, Meta-Baum oder Achievements):

  | Planet | gemessen | Ziel §13 | |
  |---|---|---|---|
  | Aurora | 24,9 min | 15–25 | im Fenster |
  | Vesta | 38,5 min | 30–45 | im Fenster |
  | Pyra | 73,1 min | 60–120 | im Fenster |
  | Kryo | 129,6 min | 120–240 | im Fenster |
  | Nimbus | 151,7 min | 120–240 | im Fenster |
  | Erebos | 176,7 min | 120–240 | im Fenster |

  **Zum ersten Mal liegen alle sechs im Fenster**, gemessen mit demselben
  Regler und ohne mitgeschleppten Fortschritt. Die Zahlen der mittleren drei
  stammen aus den Korrekturen weiter unten; Kryo und Nimbus waren nach der
  Wellen-Behebung auf 97,5 und 63,5 min gefallen — ein Teil ihrer früheren
  Spielzeit war die Spirale, nicht der Planet.

  **Erebos ist im Nachtrag zu M17 dazugekommen** und war bis dahin nie
  gemessen worden. Die Reihenfolge stimmt dabei auch inhaltlich: jeder Planet
  dauert länger als der vorige, ohne dass eine Zahl dafür gestellt wurde —
  die Staffelung entsteht aus den Mechaniken, nicht aus einem Regler. Beim
  ersten Versuch sah er unlösbar aus, und die Ursache saß im Simulanten und
  nicht im Planeten: seine Sperre „bei zu viel Dreck kein O₂ bauen" ist für
  Pyra geschrieben, wo der Dreck selbst gemacht ist. Auf einem Planeten, der
  vergiftet **beginnt**, verbietet dieselbe Regel genau den Zug, mit dem man
  den ersten Wäscher bezahlt.

  Zur Obergrenze selbst: auf Vesta kostet voller Komfort 4,3 min (38,4 gegen
  42,7). Sie trivialisiert dort also nichts.

### Zwei Befunde aus dem ersten vollständigen Messlauf

**Pyra hing nicht an seiner eigenen Mechanik.** §11 gibt ihm „die eigene
Industrie erstickt einen" als Thema. Gemessen entschied das nichts: den
Schadstoffausstoß zu halbieren änderte die Dauer um **0,1 Minuten**
(196,5 statt 196,4), während der Anoxendruck sie verdreifachte. Sein Thema
war Kulisse.

**Behoben in zwei Schritten, und die Reihenfolge war entscheidend.** Erst
musste die Wellen-Spirale weg — solange die Anoxen alles bestimmten, war der
Dreck nicht messbar, weil er im Rauschen verschwand. Danach reagiert der
Planet sauber auf ihn:

| `pollutionPerO2` | Dauer |
|---|---|
| 0,36 (vorher) | 61,5 min |
| **0,72 (jetzt)** | **84,5 min** |
| 1,44 | 118,8 min |
| 2,88 | 116,8 min (gesättigt) |

Verdoppelt auf **0,72** — achtmal so schmutzig wie Vesta. Damit kostet Pyras
eigenes Thema 23 Minuten und ist die größte einzelne Bremse des Planeten,
statt eine Behauptung im Kommentar. Ab 2,88 sättigt der Effekt, weil dann
ohnehin nur noch gewaschen wird.

> **Die Anoxen hatten eine Weglaufschwelle, und die verstieß gegen §1.2.**
> Zwischen `anoxenPressure` 0,90 und 0,95 verdoppelte sich Pyras Dauer:
> 86,0 → 183,3 min. Fünf Prozent Unterschied im Druck, Faktor zwei im
> Ergebnis. Der Grund war strukturell: Wellen wachsen geometrisch (Faktor
> 1,28), Verteidigung wächst so schnell, wie man sie bezahlen kann — und eine
> verlorene Welle legt Anlagen lahm, senkt also die Produktion, mit der man
> die nächste bezahlen müsste.
>
> **Behoben, indem nur eskaliert, was überstanden ist.** Eine verlorene Welle
> wiederholt sich in gleicher Stärke, statt die nächste stärkere nachzuziehen.
> Der Rückschlag bleibt hart, aber er hat einen Boden — §1.2. Es passt auch
> besser zu §7: der *Fortschritt* erzeugt die Bedrohung, und wer in einer
> Welle feststeckt, macht keinen.
>
> Danach ist die Klippe verschwunden: 0,90 → 62,0 min, 0,95 → 61,4, 1,00 →
> 61,5. Flach über den ganzen Bereich, und Pyra fällt bei vollem Druck von
> 196,4 auf 61,5 min.

**Jeder Planet hat genau einen Hebel, und er ist nirgends derselbe.** Das ist
der nützlichste Einzelbefund dieser Messreihe. Gemessen wurde jeweils, was
eine Halbierung oder Verdopplung mit der Dauer macht:

| Planet | wirkt | wirkt **nicht** |
|---|---|---|
| Pyra | Schadstoffausstoß (61,5 → 118,8 min) | — |
| Kryo | Grundatmosphäre (97,5 → 129,6) | Bevölkerung (−0,6), Wachstum (−0,2) |
| Nimbus | Bevölkerungsgrenze (63,5 → 151,7) | Grundatmosphäre — sie wirkt **rückwärts** |

Nimbus ist der lehrreiche Fall: seine Grundatmosphäre zu erhöhen macht ihn
*schneller* (3 M → 80,2 min, 4,5 M → 69,7, 6 M → 67,6), weil mehr Inertgas
beide Anteile verdünnt und der Gasschöpfer den Puffer ohnehin verschenkt.
Gebremst wird er über den bewohnbaren Platz — was zugleich die bessere
Geschichte ist: ein Mond ohne Boden, auf dem Menschen auf Schwebeplattformen
leben. „Größe" heißt bei ihm das, was zu füllen ist, nicht die Zahl derer,
die füllen.

> **Den Hebel messen, nicht raten.** Dreimal in Folge war der naheliegende
> Regler der falsche: Pyras Dreck wirkte nicht (bis die Wellen behoben
> waren), Kryos Bevölkerung wirkt nicht, Nimbus' Größe wirkt verkehrt herum.
> Eine Sensitivitätsmessung über vier Kandidaten kostet zehn Minuten und
> ersetzt eine Woche Zahlenraten.
- **Bringt der sechste Planet eine neue Mechanik oder den Abschluss?** §11
  verlangt eine neue; ein Finale, das nur das Vorhandene bündelt, wäre der
  ehrlichere Schluss. Beides ist vertretbar, entschieden ist es nicht.
- **Wirken gelagerte Luxusgüter auch ohne Verbau?** In Kittens Game tun sie
  das. Hier zunächst nicht — Güter wirken, indem sie verbaut werden. Sonst
  gäbe es wieder zwei Quellen für eine Zahl.

### M15: Erebos — Abbau statt Aufbau

**Die offene Frage war, ob der sechste Planet eine sechste Mechanik bekommt
(§11) oder ein Finale wird, das bündelt. Die Antwort ist beides — über ein
umgekehrtes Problem statt über ein neues System.**

Fünf Planeten lang hieß Terraforming: aus nichts etwas machen. Erebos hat
schon eine Atmosphäre, dicht und vollständig, und sie ist vergiftet. Jemand
war vor dir hier und hat verloren.

Damit werden die drei **Gegenstücke**, die das Spiel längst hat und die bisher
immer Beiwerk waren, zum Hauptdarsteller: Wäscher gegen den Dreck, Ventil
gegen den Puffer, Verdünnung gegen zu viel O₂. Ein Finale, das ein sechstes
System aufmacht, bündelt nichts — es fängt noch einmal an.

Der Weg ist dreistufig und die Reihenfolge zwingend:

| | Zustand | Werkzeug |
|---|---|---|
| Ankunft | O₂ 1 %, N₂ 35 %, Schadstoffe 60 % | — |
| nach der Wäsche | N₂ **87 %**, über seinem Fenster | Wäscher |
| nach dem Abblasen | Puffer im Fenster, O₂ fehlt | Ventil |
| zuletzt | O₂ von 2,5 auf 19 % | Produktion |

Wer die Reihenfolge vertauscht, arbeitet gegen sich: O₂ in eine Luft zu
pumpen, die zu 60 % aus Dreck besteht, verpufft im Nenner.

**Erebos gibt nichts her** — kein Vorkommen, kein Wald. Was dort gebaut wird,
ist mitgebracht. Das ist die letzte Konsequenz aus §16: der Planet, auf dem
sich entscheidet, ob man vorher Lager angelegt hat.

Gemessen im ersten Anlauf: **231,5 min** bei einem Zielfenster von 2–4 h. Der
Lauf zeigt genau die gemeinte Form — 39 Wäscher, 6 Ventile, Schadstoffe auf
null, am Ende O₂ 21,4 % und N₂ 76,0 %.

Sein `anoxenPressure` liegt bei 0,9 und damit unter Nimbus' 1,4. Das ist
Absicht: Erebos' Widerstand soll aus seiner Luft kommen. Pyra hat vorgeführt,
wie schnell die Anoxen sonst das eigentliche Thema eines Planeten überdecken.

---

## 19. Das Ende

Bis M15 hatte CleanAir kein Ende, sondern nur immer neue Anfänge: ein Planet
steht stabil, eine Rakete bringt dich weiter, ein Reset bringt Kerne. Das ist
für ein Incremental-Spiel normal — und es kostet die Aussage. Ein Spiel über
Terraforming, das nie ankommt, sagt nichts darüber, wofür man es tut.

### Die Aussaat

**Erebos liefert die Vorlage, ohne dass es geplant war.** Dort war schon
jemand, hat verloren und **keine Notizen hinterlassen**; das Einzige, was von
ihm blieb, ist seine vergiftete Luft. Das Finale ist genau das Gegenteil: du
gibst weiter, was hier gelernt wurde — an Welten, die du nie sehen wirst.

Keine siebte Welt, kein siebtes System. Kapseln mit Sporen, Nährsalz, einem
Rechenwerk und den Notizen.

### Drei Eigenschaften, die nicht verhandelbar sind

**1. Es kostet von jedem Planeten etwas.** Metallplatten von Aurora, Titan und
Holz von Vesta, Obsidian von Pyra, Eis von Kryo, Helium von Nimbus — dazu
Werkzeug und Balken aus der Werkstatt (M14). Die letzte Konsequenz aus §16:
kein Planet hat alles, also ist das Ende nur zu haben, wenn man überall war
und zurückgekommen ist.

**2. Es verlangt alle sechs Atmosphären.** Nicht die Raketen — die sind seit
§16 nur Transport —, sondern `completed`: sechsmal ein Wert, der stabil im
Fenster steht. Das ist die einzige Bedingung im Spiel, die sich nicht kaufen
lässt.

**3. Es nimmt nichts weg.** Kein Reset, kein Bildschirm, der sich über das
Spiel legt, kein „Danke fürs Spielen, bitte neu anfangen". Wer danach
weiterspielen will, spielt weiter; wer einen Prestige-Durchlauf anhängt,
behält die Aussaat trotzdem — deshalb steht das Flag in `meta` und nicht im
Durchlauf. §1.2 gilt auch für ein Ende.

> **Der Epilog bleibt lesbar.** Er steht als Panel neben der Sternenkarte und
> nicht als Overlay, das man einmal sieht und wegklickt. Ein Text, den man
> nicht wiederfinden kann, ist kein Abschluss, sondern eine Zwischensequenz.

### Ton

Nüchtern und kurz. Das Spiel erzählt seine Geschichte sonst über Zahlen und
Anlagenbeschreibungen (§1.4); ein Ende, das plötzlich pathetisch wird, gehörte
einem anderen Spiel. Es endet auf einer Messung, nicht auf einem Triumph:

> *Irgendwo, in einer Nacht in dreihundert Jahren, wird auf einem namenlosen
> Fels der erste Anteil messbar. Nicht atembar. Messbar.*

Und die Anoxen bleiben ausdrücklich unbesiegt. Sie waren zuerst da (§7); ein
Ende, das sie wegräumt, würde die einzige Position im Spiel verraten, die
nicht die des Spielers ist.

### Was nach dem Ende kommt (M17)

Ein Ende, hinter dem nichts ist, macht aus einem Idle-Spiel einen Abspann. Die
Aussaat bekommt deshalb einen **Nachhall** — aber einen, der dem Epilog nicht
widerspricht.

> Dort steht: *„Du wirst nicht erfahren, welche davon ankommen."*

Also gibt es keine Funkverbindung. Was das Panel zeigt, ist eine
**Hochrechnung**: die Notizen rechnen weiter, während die Kapseln fliegen. Alle
90 Sekunden Spielzeit fällt ein Befund, ein Drittel davon trägt. Die Welten
bekommen Namen wie Katalognummern — „Kes-9", „Amaru-4" —, weil eine Zahl
allein nichts erzählt (§1.4): „37 Welten erreicht" ist Statistik, „Tanis-4
stumm. Vermutlich zu kalt." ist eine Geschichte.

**Wie weit die Aussaat reicht, entscheidet sich beim Abflug** und nie wieder:
die Zahl der Kapseln hängt an der Biomasse des Durchlaufs — und damit über §18
an der Zufriedenheit. Das schließt den Kreis, den M14 offengelassen hatte:
Komfort zahlt nicht auf Tempo ein, sondern darauf, **wie weit man reicht**.

Drei Regeln, die das System klein halten:

- **Es läuft offline mit** (Regel 1, registriertes System). Dreihundert Jahre
  vergehen nicht, während man zusieht — der Nachlauf holt mehrere Befunde auf
  einmal nach, nicht einen.
- **Es ist nicht verbesserbar.** Die Trefferquote steht fest. Wer mehr Treffer
  will, schickt mehr Kapseln, und diese Schraube sitzt *vor* dem Abflug. Sonst
  wäre die Aussaat ein weiteres System zum Optimieren statt ein Nachhall.
- **Es ist reproduzierbar.** Der Zufall hängt am Zeitpunkt der Aussaat, nicht
  an der Uhr: derselbe Spielstand meldet immer dieselben Welten. Ein Reload,
  der andere Befunde erzeugt, wäre ein Zufallsgenerator mit Text.

---

## 20. Kurswechsel IV: Der lange Weg

> **Gebaut.** §20.2 (Bergung) seit M18, §20.3 (Bauwerke) seit M19, §20.1
> (Baupläne) seit M20 — letzterer in deutlich engerem Zuschnitt als hier
> entworfen. Der Nachtrag am Ende von §20.1 sagt, warum, und mit welchen
> Zahlen. **Der Entwurf steht bewusst unverändert darüber:** er ist der
> Gedankengang, der Nachtrag ist die Messung.

### Der Befund

Gespielt, nicht hergeleitet: **man arbeitet auf nichts hin.** Auf jedem
Planeten steht nach wenigen Minuten der vollständige Katalog offen, und von da
an besteht das Spiel aus vielen kleinen Käufen derselben Form — bezahlen,
warten, ein Zähler geht um eins hoch. Es gibt im ganzen Spiel kein einziges
Ding, das teuer genug wäre, um es sich *vorzunehmen*.

Drei Ursachen, alle drei hausgemacht:

1. **Nichts ist verschlossen.** `revealAt` misst gegen `oxygenTotal`, und das
   ist eine Eigenschaft des Planeten. Ein paar hundert O₂ später ist alles da,
   was dieser Planet zu bieten hat. Der Fortschritt ist damit eine
   Aufwärmphase von Minuten, nicht ein Bogen über Stunden.
2. **Die Kostenkurve löscht jeden Meilenstein.** Bei ×1,08 bis ×1,20 ist das
   nächste Stück immer „dasselbe, etwas teurer". Ein Ziel entsteht so nie.
3. **Nichts ist einzigartig.** Es gibt kein Gebäude, von dem es genau eines
   gibt. Alles ist eine Stückzahl — und `×10` und `Max` löschen auch noch den
   Moment, in dem man einem Ding beim Entstehen zusieht.

Dazu ein loses Ende, das genau hier hineingehört: **Werkzeug verspricht in
seiner Beschreibung „Wer es in der Hand hat, schafft das Doppelte" und tut
mechanisch nichts.** Es ist Zutat für ein Badehaus und für die Aussaat, sonst
nichts.

### Die Antwort in drei Teilen

Ein Ziel, ein Weg dorthin, und ein Grund, warum der Weg dauert. Einzeln ist
jeder Teil eine halbe Lösung: ein Ziel ohne Weg ist eine Wand, ein Weg ohne
Ziel ist Beschäftigung.

---

### 20.1 Baupläne — nicht alles ist von Anfang an da

Eine Anlage lässt sich erst bauen, wenn ihr **Bauplan** bekannt ist. Der
Startsatz ist klein und deckt genau das, was Aurora zum Anfangen braucht:
Elektrolyse-Zelle, Kondensator, Keimkammer, Wohnmodul. Alles Weitere wird
verdient.

**Baupläne liegen in `meta`.** Sie sind damit die dritte Sorte dauerhaften
Fortschritts neben Kernen und Forschung — einmal verdient, für immer da. Das
ist keine Bequemlichkeit, sondern §1.2: ein Durchlauf-Reset, der Wissen
zurücknimmt, macht aus dem Neuanfang eine Strafe.

Drei Quellen, und jede erzählt etwas anderes:

| Quelle | Was sie freischaltet | Warum dort |
|---|---|---|
| **Forschung** | Die Apparate — Photolyse, Prozessor, Cracker | Was man versteht, kann man bauen |
| **Bergung** (20.2) | Die schweren Sachen — Sublimator, Wäscher, Ventil | Was man findet, kann man nachbauen |
| **Erfolge** | Die Sonderfälle — Badehaus, Lagerhalle | Wer etwas geschafft hat, hat sich etwas verdient |

> **Die Sackgassenprüfung wird zur Pflicht.** Der Selbsttest kennt bereits
> „Keine Sackgassen" für die Planeten. Mit Bauplänen wird daraus eine schärfere
> Frage: **ist jeder Planet mit dem Startsatz plus allem, was bis dorthin
> erreichbar war, lösbar?** Das ist eine Prüfung mit Gegenprobe und keine
> Hoffnung. Ohne sie baut sich dieser Abschnitt eine Wand, die niemand mehr
> findet — genau die Fehlerklasse, an der dieses Projekt schon achtmal
> vorbeigelaufen ist.

**Gebaut in M20 — und der Entwurf oben war zu ehrgeizig. Gemessen, nicht
diskutiert:**

Der erste Anlauf hat verschlossen, was der Entwurf vorschlägt: die Apparate
(Photolyse, Prozessor, Cracker) hinter Forschung, die schweren Sachen hinter
Bergung. Das Ergebnis war die Wand, vor der dieser Abschnitt selbst warnt:

| Planet | vorher | Baupläne wie entworfen |
|---|---|---|
| Aurora | 24,9 min | 49,9 min |
| Vesta | 38,5 min | 66,1 min |
| Kryo | 129,6 min | **schließt nicht ab** |
| Erebos | 176,7 min | **schließt nicht ab** |

Kryo und Erebos endeten mit zu viel O₂ und zu wenig N₂ — der Cracker fehlte,
und ohne Puffer schließt sich die Falle aus §4, aus der es kein Zurück gibt.

**Zweiter Anlauf: Atmosphärenkette wieder frei, Wirtschaft verschlossen.**
Alle sechs schlossen wieder ab, aber Vesta stand bei 121,1 statt 38,5. Der
Grund war ein anderer und schlimmer: `sawmill` und `dome` hingen an der
Bergung, und wer nicht bergen geht, bekommt sie **nie**. Damit wäre Bergung
Pflicht geworden — genau das, was M18 ausdrücklich ausschließt.

**Was übrig bleibt, ist eine engere und ehrlichere Regel:**

> **Ein Schloss gehört nur an das, was ein Planet nicht braucht.**
>
> Die Atmosphärenkette ist das *Ziel* des Spiels, nicht sein Inhaltsverzeichnis
> — ein Schloss dort ist eine Wand. Die Gegenmittel (Wäscher, Ventil) sind die
> Gegenstücke aus §1.2 und dürfen erst recht keines bekommen. Auch Wohnraum,
> Versorgung und die Materialketten der Planeten tragen: sie stehen offen.
>
> Verschlossen bleiben fünf Anlagen, die eine Kolonie **bequemer** machen und
> nicht **möglich**: Gemeinschaftsraum, Badehaus, Walzpresse, Lagerhalle,
> Baumschule. Damit stehen alle sechs Planeten wieder exakt auf ihren
> gemessenen Zeiten — die Sperren kosten nur den, der sie aufmacht.

Und die zweite Regel, die aus dem zweiten Anlauf folgt:

> **Jeder Bauplan muss ohne Bergung erreichbar sein.** Bergung darf ihn früher
> liefern, nie exklusiv. Sonst ist ein optionales System die Voraussetzung für
> ein anderes, und „optional" ist eine Behauptung.

**Verschlossen heißt sichtbar.** Eine gesperrte Anlage steht mit ihrem Namen,
ihrer Beschreibung und der Quelle ihres Bauplans in der Liste, nur ausgegraut.
Auf etwas hinarbeiten kann man nur, was man sieht; eine Anlage, die einfach
fehlt, ist keine Aufgabe, sondern eine Lücke.

**Die Migration rechnet um, statt zu vergessen.** Wer mit einem alten Stand
lädt, hat die verschlossenen Anlagen längst gebaut — alles, was auf dem
aktiven oder einem eingelagerten Planeten steht, gilt deshalb als bekannt.
Niemand soll vor einem Schloss stehen, dessen Schlüssel er vor Stunden
verdient hat.

---

### 20.2 Bergung — wofür Bewohner sonst noch da sind

Ein **Trupp** wird losgeschickt: 3 bis 12 Leute, 5 bis 30 Minuten. Sie fehlen
so lange in der Arbeitsleistung.

**Der Preis sind Hände, und deshalb ist es eine Entscheidung.** Das ist
dieselbe Klammer wie bei der Werkstatt in §18: dieselbe Kolonne kann in
derselben Zeit ein Haus bauen, Werkzeug machen — oder losziehen. Ein Grind,
dessen Preis nur Zeit ist, ist Wartezeit; ein Grind, dessen Preis ein Verzicht
ist, ist Spiel.

**Ziele stehen in `data/`, eines bis drei je Planet**, und sie sind der Ort,
an dem dieses Spiel endlich seine Vorgeschichte erzählen darf:

| Planet | Ziel | Was dort liegt |
|---|---|---|
| Aurora | Die erste Landefähre | Werkzeug, Platten — und wer vier Leute in Kapseln hierher schickte |
| Vesta | Der Vermessungsmast | Holz, Titan, die Karten des Vorgängertrupps |
| Pyra | Die Schwefelbrüche | Obsidian, Schwefel — und wie viele dort geblieben sind |
| Kryo | Das Eisfeld | Eis, Helium, eine Sonde, die nie gemeldet hat |
| Nimbus | Die Wolkenstation | Helium, Bauteile, ein abgebrochenes Protokoll |
| Erebos | **Die Anlagen des Vorgängers** | Alles Übrige — und die Notizen, von denen §19 sagt, er habe keine hinterlassen |

Der Ertrag hat drei Sorten:

- **Material**, ausdrücklich auch solches, **das der Planet nicht führt**. Das
  ist der Punkt, an dem Bergung mehr ist als ein zweiter Steinbruch: sie ist
  der einzige Weg, auf Erebos an Material zu kommen, ohne zu fliegen.
- **Fundstücke** — selten, nicht herstellbar, und die Währung der Bauwerke
  (20.3). Sie sind der Grund, warum man ein Ziel ein zwölftes Mal anläuft.
- **Fragmente** für den Log. Kein Material, keine Zahl, nur ein Satz. §1.4
  sagt, das Spiel erzählt über Anlagen und Zahlen; hier erzählt es zum ersten
  Mal über einen Fund.

Drei Regeln halten es im Rahmen:

> **1. Ein Ziel erschöpft sich — und erholt sich.** Der Ertrag pro Anlauf
> sinkt und wächst über Minuten zurück. Ohne diesen Boden ist Bergung ein
> Automat, den man einmal einrichtet und nie wieder ansieht; mit einer harten
> Grenze wäre sie eine Liste zum Abhaken. Beides ist kein Spiel.
>
> **2. Niemand stirbt.** Ein schiefgegangener Anlauf bringt Leute **gebunden**
> zurück, nicht gar nicht: sie fehlen eine Weile und kommen wieder. §1.2 gilt
> auch hier, und `settlersLost` bleibt das, was es ist — die Folge einer Welle,
> nicht die eines Ausflugs.
>
> **3. Das Risiko hängt am Planeten, nicht am Würfel allein.** Wo Anoxen
> sitzen, ist ein Trupp draußen in Gefahr. Damit bekommt §7 eine zweite
> Berührungsfläche, ohne dass ein neues System nötig wäre.

**Gebaut in M18, und zwei Dinge sind dabei anders geworden als hier geplant:**

- **Fundstücke kamen erst mit M19.** In M18 hätten sie ein Zähler ohne
  Ausgabe sein müssen; seit die Bauwerke stehen, sind sie deren Währung und
  das einzige nicht herstellbare Material im Spiel.
- **Ein Zwischenfall verlängert, statt zu binden.** Geplant war „die Leute
  kommen angeschlagen zurück und fehlen eine Weile". Gebaut ist: der Trupp
  ist **überfällig**, bleibt die Hälfte der Zeit länger draußen und bringt die
  Hälfte mit. Das ist derselbe Preis — Hände, die fehlen — ohne einen zweiten
  Zustand, und es hat einen Moment, den man mitbekommt: die Zeile „der Trupp
  ist überfällig" fällt, wenn die Uhr eigentlich abgelaufen wäre.

> **Der Preis ist gemessen und nicht behauptet.** Mit einem Simulanten, der
> jede freie Hand rausschickt, fiel Vesta von 38,5 auf **163,4 min** — Bergung
> kann einen Planeten kosten. Mit der Regel, die ein Mensch anwendet („erst
> wenn jeder Platz besetzt ist und ein voller Trupp übrig bleibt"), stehen
> alle sechs Planeten unverändert im Fenster. Beides gehört zusammen: ein
> optionales System darf wehtun, aber es darf keinen Planeten erzwingen.

---

### 20.3 Bauwerke — das Ding, auf das man hinarbeitet

**Ein Bauwerk pro Planet. Genau eines.** Es wird nicht gekauft, sondern in
**vier Etappen** errichtet: Fundament, Rohbau, Hülle, Inbetriebnahme. Jede
Etappe hat ihre eigene Rechnung und ihre eigenen Arbeitersekunden, und die
Anzeige sagt jederzeit, welche gerade läuft und was noch fehlt.

Fünf Eigenschaften, jede eine Absage an eine der drei Ursachen oben:

**Es kostet null O₂.** Material, Fundstücke und Arbeitszeit. Das führt §17 zu
Ende und trennt es sauber von jedem Generator.

**Es kostet Werkzeug — und mehr Werkzeug baut schneller.** Werkzeug über der
geforderten Menge senkt die Arbeitersekunden der Etappe. Damit löst die
Beschreibung endlich ihr Versprechen ein, und die Werkstatt bekommt einen
Zweck jenseits eines einzelnen Badehauses.

**Es steht in derselben Reihe** (`BuildSite.art = 'bauwerk'`). Dieselbe
Kolonne, dieselbe Zeit — wer am Bauwerk baut, baut gerade kein Haus.

**Jede Etappe verlangt Material von auswärts.** Damit wird die Hin- und
Rückreise aus §16 zur Tätigkeit im Mittelspiel statt nur zur Bedingung im
Finale.

**Und die Wirkung ist kein Beschleuniger.** Das ist die Fessel, die sich
dieses Projekt selbst angelegt hat und die hier am wichtigsten ist: über dem
O₂-Fenster gibt es kein Zurück, also darf eine Belohnung nicht auf den Ausstoß
wirken. Jedes Bauwerk nimmt stattdessen ein **Risiko** weg oder verlängert die
**Reichweite**:

| Planet | Bauwerk | Wirkung |
|---|---|---|
| Aurora | **Der Wetterturm** | Der Stabilitäts-Timer fällt bei einem Ausrutscher nicht auf null, sondern *pausiert* |
| Vesta | **Die Saatbank** | Biomasse zählt dauerhaft mehr → mehr Kapseln (§18: der einzige sichere Ort für einen Bonus) |
| Pyra | **Der Aschefang** | Deckelt den Schadstoffanteil nach oben — er kann nicht mehr davonlaufen |
| Kryo | **Die Zisterne** | Die Sättigung fällt nicht unter einen Boden; Hunger bremst, kippt aber nicht |
| Nimbus | **Der Fahrstuhl** | Hebt die Lagergrenze für alle Materialien des Durchlaufs |

**Erebos bekommt keines, und das ist die Pointe.** Dort baut man kein Denkmal,
dort räumt man auf — das Bauwerk dieses Planeten ist die Aussaat, die es schon
gibt. Rückwirkend wird das Finale damit vom Einzelstück zum letzten Mitglied
einer Familie: dieselbe Form, dieselbe Reihe, dieselbe Art zu bezahlen.

**Die Etappen sind auf der Planetenansicht sichtbar.** Der Canvas zeichnet
bereits Geländepunkte, die mit der Biomasse ergrünen; eine Silhouette an
fester Position, die mit jeder Etappe wächst, ist wenig Arbeit und der
eigentliche Lohn. Ein Ziel, das man nur als Fortschrittsbalken kennt, ist eine
Zahl; eines, das am Horizont steht, ist ein Bauwerk.

**Der Bauplan ist `meta`, das Bauwerk ist der Planet.** Dieselbe Trennung wie
Forschung gegen Anlagen: was man einmal gelernt hat, bleibt; was auf einem
Planeten steht, fällt mit dem Durchlauf.

**Gebaut in M19, und drei Dinge sind dabei anders geworden als hier geplant:**

- **Baupläne blieben außen vor.** §20.1 ist weiterhin Entwurf, und das
  Bauwerk braucht ihn nicht: **Fundstücke sind das Schloss.** Sie kommen
  ausschließlich aus der Bergung, gehen ausschließlich in Bauwerke, und damit
  hängt das Ziel schon am langen Weg, ohne dass ein zweites Gattersystem nötig
  wäre. Ein Bauplan zusätzlich wäre zweimal warten auf dasselbe — genau die
  Frage, die unten unter „Offen" steht.
- **Werkzeug wirkt nur an dieser einen Stelle.** Geplant war „mehr Werkzeug
  baut schneller". Gebaut ist: überzähliges Werkzeug senkt die Arbeitszeit
  einer **Bauwerks-Etappe**, bis zur Hälfte, sonst nichts. Eine allgemeine
  Baubeschleunigung hätte auf Wohnraum gewirkt, damit auf Bevölkerung, damit
  auf den O₂-Verbrauch — also auf etwas, das ins Fenster treffen muss. Das ist
  die Falle aus §18, nur ein Stockwerk tiefer.
- **`scope` ist ein Pflichtfeld geworden.** Vier Bauwerke wirken nur auf ihrem
  Planeten, der Fahrstuhl auf dem ganzen Durchlauf — weil das Lager seit §16
  allen Planeten gemeinsam gehört. Ohne diese Unterscheidung wäre er beim
  Wegfliegen verschwunden: dieselbe Verwechslung „Eigenschaft des aktiven
  Planeten statt des Durchlaufs", die schon die Sternenkarte gekostet hat.

> **Die Prüfung dazu ist beim ersten Versuch durchgerutscht**, und das gehört
> hierher, weil es die Fehlerklasse selbst betrifft. „Ein ortsgebundenes
> Bauwerk wirkt nicht von fern" blieb grün, als der Planetenvergleich
> testweise ausgebaut wurde — denn auf dem Zielplaneten stand die Etappenzahl
> ohnehin auf null, der Wetterturm fiel schon dort durch. Erst mit **einem
> fertigen Bauwerk auf beiden Planeten** trennt die Prüfung sauber. Eine
> Gegenprobe, die grün bleibt, ist kein bestandener Test, sondern ein
> unbrauchbarer.

---

### Was das mit dem Balancing macht

Seit dem Nachtrag zu M17 stehen **alle sechs Planeten im Fenster** (§18).
Jeder der drei Teile oben verschiebt das, und zwar in verschiedene Richtungen:

- **Baupläne** verlängern die frühen Planeten, weil weniger zur Verfügung
  steht. Am stärksten trifft es Aurora und Vesta — die beiden mit dem engsten
  Zielfenster.
- **Bergung** verlängert alles, solange sie Hände kostet, und verkürzt es,
  sobald ihr Ertrag zählt. Welche Richtung überwiegt, ist eine Messung und
  keine Meinung.
- **Bauwerke** machen einen Planeten **langsamer** — Bauzeit, die anderswo
  fehlt. Das ist derselbe Effekt, den M14 beim Komfort gemessen hat, und dort
  war er größer als erwartet.

> **Reihenfolge: bauen, dann messen, dann Zahlen festschreiben.** Für jeden
> Teil eine eigene Option in [dev/balance.ts](src/dev/balance.ts) — `plaene`,
> `bergung`, `bauwerk` — wie `komfort` es vormacht, und `compare()` über
> mehrere Startwerte. Wer die Zieldauern aus §13 vorher anpasst, misst
> anschließend die eigene Erwartung.

### Gemessen (M21)

Alle drei Optionen stehen, `compare()` nimmt den Schalter jetzt als Parameter.
Das Ergebnis, ein Lauf je Feld, `maxMinuten: 300`:

| Planet | Grundlinie | mit Bergung | Bauwerk steht | Ziel §13 |
|---|---|---|---|---|
| Aurora | 24,9 min | 24,6 | **65,9** | 15–25 ✓ |
| Vesta | 38,5 min | 38,3 | **83,0** | 30–45 ✓ |
| Pyra | 61,5 min | 62,4 | **123,8** | 60–120 ✓ |
| Kryo | 129,6 min | 130,6 | **128,6** | 120–240 ✓ |
| Nimbus | 135,2 min | 147,1 | **183,6** | 120–240 ✓ |
| Erebos | 157,4 min | 176,3 | hat keines | 120–240 ✓ |

(Pyra und Erebos stehen hier bereits mit den Zahlen aus M22 — siehe unten.)

Die drei Vorhersagen oben waren **zwei Drittel falsch**, und das ist der Wert
der Messung:

- **Baupläne kosten nichts.** Vorhergesagt war „verlängert die frühen
  Planeten, am stärksten Aurora und Vesta". Gemessen ist der Unterschied
  zwischen `plaene: true` und `false` auf Aurora, Vesta und Pyra **exakt
  null** (24,9 / 38,5 / 73,1 in beiden Fassungen). Der Zuschnitt aus M20 —
  Schlösser nur an Bequemlichkeit — trägt genau so weit, wie er sollte: die
  Sperren kosten nur den, der sie aufmacht. Das war bisher eine Behauptung des
  M20-Commits und ist jetzt gemessen.
- **Bergung verlängert nicht, sie ist fast umsonst** — außer auf Nimbus
  (+11,9 min). Auf Aurora, Vesta und Erebos ist sie sogar minimal schneller,
  weil das geborgene Material Käufe vorzieht.
- **Bauwerke machen den Planeten nicht langsamer.** Vorhergesagt war der
  Komfort-Effekt aus M14 („größer als erwartet"). Gemessen kostet der Bau
  aller vier Etappen die Abschlusszeit **0,0 bis 0,7 Minuten**, weil die
  Etappen fast alle *nach* dem Abschluss fallen: das Bauwerk wartet ohnehin
  auf Fundstücke, nicht auf die Bauschlange.

> **Ein Wert ist wegen der Messung gestellt worden:** Kryos Zisterne kostet
> jetzt acht statt sechs Fundstücke. Mit sechs stand sie nach 101,6 Minuten,
> während Kryo selbst erst nach 130 fertig wird — ein Bauwerk, das **vor** dem
> Ziel dasteht, ist kein Ziel mehr. Der Grund ist nicht der Planet, sondern
> die Kolonie: große Siedlungen schicken größere Trupps, und die Beute hängt
> an `crew / maxCrew`. Späte Welten müssen deshalb mehr verlangen.

Und ein Befund, der nicht §20 gehört, aber ohne `compare()` über mehrere
Startwerte nie aufgefallen wäre: **Vesta hängt an der Ereignislage.** Derselbe
Planet, dieselbe Fassung, drei Startwerte — 39,3, 41,4 und **193,6** Minuten.
Fünffache Dauer bei einem von drei Läufen, ohne jedes neue System.

### Der Abriss fehlte (M22)

Die Aufklärung der 193,6 hat den Simulanten und einen Planeten verändert.
Ablesbar geworden ist sie erst, seit ein Lauf mitschreibt, **welches** Ereignis
wann auftrat und wie die Atmosphäre dabei lief:

1. Startwert `balance:0` wirft **vier Temperaturinversionen** in die ersten 22
   Minuten — das einzige Ereignis mit `needs: 'nitrogen'`, Produktion ×0,7. Es
   bremst genau den Puffer.
2. Der Regler gleicht aus und **schwingt**: N₂ auf 85,4 % (Fenster bis 80),
   dann kippt O₂ bei Minute 42 auf 23,4 % (Fenster bis 23).
3. Von da an steht der Lauf 150 Minuten bei 23,0 bis 23,3 % und kriecht.

Kein Ereignis dauert länger als 150 Sekunden. 150 Minuten Schaden können also
nur über eine **Falle** entstehen, und die Falle stand offen, weil der
simulierte Spieler den **Abriss** nicht kannte (§17). Das ist bedeutsamer als
die sechs vorherigen Fälle derselben Art: N₂ hat das Abblasventil, Schadstoffe
haben den Wäscher — **O₂ hat kein Gegenmittel** außer aufzuhören zu
produzieren. Wer über sein O₂-Fenster schießt, hat genau einen Zug, und der
Simulant kannte ihn nicht.

Mit der Abrissregel: Vesta 47,1 statt 193,6 bei demselben Startwert, die
beiden anderen Startwerte unverändert.

> **Und dann fiel Erebos aus seinem Fenster.** Derselbe Griff verkürzte ihn von
> 176,7 auf 86,0 min. Die alte Zahl bestand zu 90 Minuten aus „steht über dem
> O₂-Fenster fest" — der letzte Planet war nie so lang, wie die Tabelle
> behauptet hat, und ein Mensch, der abreißt, war nie so lange dort. Damit war
> die Aussage „alle sechs stehen im Fenster" bei Erebos ein Artefakt.
>
> Die naheliegende Erklärung wurde geprüft und ist **falsch**: der Simulant
> startet mit 50 000 von jedem Material, und Erebos fördert als einziger
> Planet nichts — aber mit 1000 statt 50 000 braucht er 92,2 statt 86,0 min,
> zwischen 1000 und 5000 ändert sich gar nichts. Der Planet war wirklich zu
> kurz.
>
> Erebos' Startluft steht deshalb auf dem **Vierfachen**, alle vier Zahlen
> zugleich, Anteile unverändert. Das ist die einzige Fassung, die §15 treu
> bleibt: seine Härte kommt weiter aus der *Reihenfolge* — waschen, abblasen,
> atmen lassen —, gewachsen ist nur die Menge Arbeit. Gemessen über drei
> Startwerte: 157,4 / 138,9 / 162,5 min, jeder im Fenster und jeder länger als
> Nimbus. ×3,5 rutschte mit 125 min darunter.

Damit stehen alle sechs Planeten wieder im Fenster **und** in der richtigen
Reihenfolge: 24,9 / 38,5 / 61,5 / 129,6 / 135,2 / 157,4 Minuten.

> **Nachtrag M28: diese sechs Zahlen waren zu niedrig gemessen.** Nicht der
> Simulant war diesmal schuld, sondern die Startausstattung des Werkzeugs:
> `fracht` gibt jedem Lauf 50 000 von *jedem* Material mit, und der Erfolg
> „Titanherz" verlangte bis M26 50 000 Titan **im Lager**. Jeder gemessene
> Lauf lief also ab der ersten Sekunde mit geschenkten +8 % Produktion, die
> kein Mensch zu Spielbeginn hat. Seit die Erfolge Summen messen, fällt der
> Bonus weg. Ehrlich gemessen: **26,5 / 42,1 / 69,7 / 133,6 / 159,8 / 159,3**.
>
> Zwei Aussagen halten damit nicht mehr und sind die nächste Balancing-Aufgabe:
> Aurora steht 1,5 min über seinem Fenster (15–25), und Nimbus hat Erebos bis
> auf 0,5 min eingeholt.

### Nachgemessen über drei Startwerte (M29)

Von den beiden Aufgaben oben blieb nach ehrlicher Messung nur **eine** übrig —
und eine dritte kam dazu. Mediane aus drei Ereignis-Startwerten:

| Planet | Median | Spanne | Ziel §13 | |
|---|---|---|---|---|
| Aurora | 24,2 min | 24,2–24,2 | 15–25 | im Fenster |
| Vesta | 42,1 min | 41,8–42,9 | 30–45 | im Fenster |
| Pyra | 69,7 min | 62,7–70,2 | 60–120 | im Fenster |
| Kryo | 110,0 min | 101,5–133,6 | 120–240 | **10 min zu schnell** |
| Nimbus | 155,6 min | 153,4–159,8 | 120–240 | im Fenster |
| Erebos | 165,4 min | 159,3–171,9 | 120–240 | im Fenster |

- **Aurora ist behoben.** `baseAtmosphere` von 4·10⁶ auf 3·10⁶ — der Planet
  ist anlaufgebunden und nicht füllgebunden, die Hälfte der Atmosphäre spart
  nur fünf Minuten. Aurora führt keine Ereignisse, die 24,2 min stehen daher
  auf die Nachkommastelle fest.
- **Nimbus gegen Erebos war ein Trugschluss.** 159,8 gegen 159,3 waren zwei
  Läufe an ihren jeweiligen Rändern; die Mediane liegen zehn Minuten
  auseinander. Nichts zu tun.
- **Kryo war nie im Fenster** — die 133,6 aus M28 waren der beste von drei
  Läufen. `baseAtmosphere` ist dort aber der falsche Regler: ×1,5 hebt den
  Median auf 123,1, der schlechteste Startwert bleibt bei 103,9. Kryo ist
  **wachstumsgebunden** (`growthFactor` 0,45). **In M31 genau daran gelöst**,
  siehe unten.

### Kryo bekommt seine Zeit zurück (M31)

Der Planet, dessen Wesen „alles hier braucht seine Zeit" ist, war zu schnell —
und der Regler dafür ist das Wachstum, nicht die Atmosphäre. Gemessen über
drei Ereignis-Startwerte:

| `growthFactor` | Median | Spanne |
|---|---|---|
| 0,45 (alt) | 110,0 | 101,5–133,6 |
| 0,32 | 115,9 | 85,2–130,1 |
| 0,24 | 122,5 | 117,8–128,6 |
| 0,20 | 122,2 | 100,0–131,0 |
| **0,16 (neu)** | **130,1** | **126,3–157,5** |

0,16 ist der erste Wert, bei dem *jeder* Startwert im Fenster landet — und er
beruhigt den Regler zusätzlich: weniger Menschen atmen weniger, der O₂-Anteil
schwingt schwächer, die Spanne halbiert sich. Die Zwischenwerte sind nicht
monoton (0,20 liegt im Median über 0,24, im schlechtesten Lauf aber 18 min
darunter); ein einzelner Lauf hätte hier jede beliebige Antwort geliefert.

**Damit stehen alle sechs Planeten im Fenster und in der richtigen
Reihenfolge:** 24,2 / 42,1 / 69,7 / 130,1 / 155,6 / 165,4.

> **Was die Messung nicht kann:** ob sich Kryo dadurch *zäh* statt *langsam*
> anfühlt. Die Kolonie steht bei Minute 40 erst bei 42 Menschen statt bei 220
> und füllt sich bis Minute 60. Das ist die eine Stelle dieses Planeten, die
> beim Spielen geprüft gehört — der Selbsttest sieht sie nicht.

> **Ein Lauf ist kein Messwert.** Beide Fehlschlüsse aus M28 stammen aus dem
> Vergleich einzelner Läufe. Wer zwei Planeten vergleicht oder ein Fenster
> prüft, nimmt Mediane und notiert die Spanne dazu.

### Drei Fallen, die dieser Entwurf ausdrücklich vermeidet

1. **Grind ist keine Wartezeit.** Jeder lange Weg hier kostet **Hände** und
   damit einen Verzicht. Ein Ziel, das nur Zeit kostet, füllt man mit einem
   zweiten Tab.
2. **Kein Beschleuniger als Belohnung.** Die Bauwerkswirkungen nehmen Risiko
   oder geben Reichweite. Der Kasten in CLAUDE.md steht dort, weil verschenkte
   Zufriedenheit Vesta einmal unlösbar gemacht hat.
3. **Kein dauerhafter Verlust.** Baupläne bleiben, geborgene Leute kommen
   wieder, ein erschöpftes Ziel erholt sich.

### Offen

- ~~**Wie viele Fundstücke kostet ein Bauwerk?**~~ **Beantwortet (M21):**
  sechs, auf Kryo und Nimbus acht. Damit steht ein Bauwerk nach dem Zwei- bis
  Zweieinhalbfachen der Planetendauer auf den frühen Welten und ungefähr zur
  Abschlusszeit auf den späten — ein Nachmittag, kein Wochenende. Die Zahl ist
  gemessen und nicht gewählt: sie ergibt sich daraus, wie oft ein Trupp
  loszieht und wie stark sich ein Ziel dabei erschöpft.
- ~~**Darf ein Trupp reisen?**~~ **Nein, entschieden in M33.** Die Rakete ist
  der einzige Weg zwischen den Welten (§16); ein zweiter, billigerer Weg für
  Material nähme ihr den Sinn — und die Hin- und Rückreise ist ausdrücklich
  die Tätigkeit, die §20.3 im Mittelspiel haben will.

  Faktisch war es nie möglich: `targetsHere()` filtert nach dem aktiven
  Planeten, und `salvageBlocker()` antwortet „nicht auf diesem Planeten".
  Neu ist, dass es **geprüft** ist — eine Entscheidung, die nur in der
  Datenform steckt, verschwindet beim nächsten Umbau dieser Datei.

  Ein Trupp, der beim Abflug noch draußen ist, bleibt es: sein Planet wird
  serialisiert eingelagert, seine Systeme laufen nicht weiter, und bei der
  Rückkehr geht die Fahrt dort weiter, wo sie stand. Das ist dasselbe
  Verhalten wie für alles andere auf einem verlassenen Planeten.
- ~~**Was passiert mit `revealAt`?**~~ **Entschieden in M20, geprüft in M23:**
  wo ein Bauplan gilt, gilt nur er (`isRevealed()` in systems/production.ts).
  Der Grund ist schärfer als „zweimal warten": ein Bauplan liegt in `meta` und
  überlebt jede Reise, `revealAt` misst gegen `oxygenTotal` und steht bei
  jeder Ankunft wieder auf null. Beides zugleich hieße, auf einem neuen
  Planeten ein zweites Mal auf etwas zu warten, das man längst verdient hat.
  Die Prüfung deckte bis M23 nur die Richtung „Schwelle erfüllt, Plan fehlt"
  ab — die eigentliche Entscheidung war ungeprüft.
- ~~**Warum kostet ein Startwert Vesta 150 Minuten?**~~ **Beantwortet (M22):**
  vier Temperaturinversionen früh, ein schwingender Regler, und dann die
  O₂-Falle aus §4 — offen gehalten davon, dass der simulierte Spieler nie
  abgerissen hat. Siehe oben.

