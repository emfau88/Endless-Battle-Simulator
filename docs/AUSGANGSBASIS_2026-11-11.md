# Ausgangsbasis · Schritt 0

**Datum:** 11.11.2026 · **Ausgangs-Commit:** `main` · `0f13787` · **Branch:** `schritt-0-ausgangsbasis`
**Zweck:** verlässlicher Vergleichsstand vor den nächsten Änderungen (Plan: [UMSETZUNGSPLAN.md](UMSETZUNGSPLAN.md)).

## 1 · Ausgangslage

- `main` entsprach `origin/main`, Arbeitsverzeichnis sauber (nur der neue Plan war unversioniert).
- Kein Server, kein Export und kein Chromium-Prozess lief.
- Versionen: Playwright 1.60.0 (Chromium 148.0.7778.96), PixiJS 8.22.0, Matter.js 0.20.0.

## 2 · Tests am Ausgangs-Commit

Jede Testdatei einzeln, je Lauf auf 2 Minuten begrenzt.

| Lauf | Ergebnis | Dauer |
|---|---|---|
| `test/core.test.mjs` + `test/sim.test.mjs` | 17/17 | 64 s |
| `test/marble.test.mjs` | 17/17 | 77 s |
| `test/export.test.mjs` + `test/live.test.mjs` | 11/11 | 51 s |
| `test/golden.test.mjs` (neu in diesem Schritt) | 2/2 | 32 s |

Die ersten drei Läufe fanden vor den Ergänzungen dieses Schritts statt. Simulation, Renderer, Kern und Export wurden
in diesem Schritt nicht verändert.

## 3 · Referenz-Hashes

- Datei: `test/fixtures/golden-hashes.json` – 16 Fälle × 2 Prüfpunkte = 32 Hashes.
- Fälle: Naval und Marble × 9:16 und 16:9 × Seed 42 und 7 × Tempo 1 und 0,8.
- Prüfpunkte: nach 1200 und 7200 Physikschritten (20 s und 120 s bei Tempo 1; bei Tempo 0,8 entsprechend 16 s und 96 s
  Simulationszeit).
- Zwei vollständige Läufe nacheinander lieferten identische Hashes; alle 32 Hashes sind paarweise verschieden.
- `npm run golden` vergleicht den aktuellen Code mit der Datei, `npm run golden:write` schreibt sie neu.
  `test/golden.test.mjs` prüft dasselbe innerhalb von `npm test` und meldet zusätzlich geänderte Versionen.

**Grenzen:** Die Hashes gelten für genau die oben genannten Versionen. Nach einem Playwright-, PixiJS- oder
Matter.js-Update müssen sie bewusst neu erzeugt werden. Sie erfassen den Simulationszustand, nicht das Bild.
Ob der Zeitlupen-Commit `b14334c` die Physik bei Tempo 1 gegenüber V0.1 verändert hat, ist damit **nicht** geprüft –
die Hashes beginnen erst bei `0f13787`.

## 4 · Referenzbilder

720p, Seed 42, nach 20 s Simulationszeit, erzeugt mit `scripts/screenshot.mjs`. Alle vier wurden angesehen.

| Szenario | 9:16 | 16:9 |
|---|---|---|
| Naval | [naval_9x16_720p.png](reference/naval_9x16_720p.png) | [naval_16x9_720p.png](reference/naval_16x9_720p.png) |
| Marble | [marble_9x16_720p.png](reference/marble_9x16_720p.png) | [marble_16x9_720p.png](reference/marble_16x9_720p.png) |

Beobachtungen:

- **Naval-Anzeige im Standbild:** Das HUD aktualisiert sich nur jeden 6. Frame. Ein einzelnes Standbild zeigte deshalb
  „00:00 · Shots 0 · Hits 0“ trotz laufender Schlacht. Im Video fällt das nicht auf. `scripts/screenshot.mjs` rendert
  jetzt zwölf Frames Vorlauf; `naval.js` blieb unverändert.
- **Naval-Bildboden:** Die roten und blauen Pfeillinien des Recyclings sind in beiden Formaten deutlich sichtbar –
  Ausgangszustand für B01.
- **Marble:** englische Texte und Zähler stimmen; die Messingmanschette unter dem Zellenrad sitzt weiterhin schräg.

## 5 · Marble-Messwerte (Ausgangswerte für Schritt 2)

Je Lauf 10 Minuten Simulationszeit, 8 Seeds je Format, erzeugt mit `scripts/marble-metrics.mjs`.
Theoretisches Maximum: 500 Umläufe je 10 Minuten (eine Kugel alle 1,2 s).

### Tempo 1 – Zusammenfassung

| Format | Umläufe | Rütteln (Spanne / Mittel) | Verweildauer (s) | längste Pause (s) | wenigste Umläufe einer Kugel |
|---|---|---|---|---|---|
| 16:9 | 451–475 | 7–18 / 11.9 | 40–59 | 4.9–7.3 | 10 |
| 9:16 | 430–464 | 4–62 / 22.1 | 54–72 | 3.7–6.7 | 11 |

### Tempo 0,8 (Zeitlupe) – Zusammenfassung

| Format | Umläufe | Rütteln (Spanne / Mittel) | Verweildauer (s) | längste Pause (s) | wenigste Umläufe einer Kugel |
|---|---|---|---|---|---|
| 16:9 | 446–475 | 6–28 / 14.5 | 37–53 | 4.1–7.7 | 10 |
| 9:16 | 446–473 | 10–33 / 19.4 | 43–61 | 4.1–5.8 | 11 |

**Lesart:** Das sichtbare Rütteln ist häufiger als bei V0.1 berichtet (dort 2–28× aus weniger Läufen).
Hochkant ist deutlich schlechter als quer; der Ausreißer ist Seed 3 hochkant mit 62 Rüttelereignissen. Keine Kugel
bleibt liegen (mindestens 10 Umläufe je Kugel), kein Lauf steht still, die Kugelbilanz stimmt überall.

### Tempo 1 – Einzelwerte

| Format | Seed | Umläufe | Umläufe je Kugel | Rütteln | längste Verweildauer im Behälter (s) | längste Pause (s) | größter Schritt | Prüfung |
|---|---|---|---|---|---|---|---|---|
| 16:9 | 42 | 475 | 11–15 | 11 | 48 | 5.7 | 13.2 | OK |
| 16:9 | 1 | 466 | 11–15 | 7 | 40 | 4.9 | 12.6 | OK |
| 16:9 | 2 | 451 | 10–14 | 14 | 54 | 4.9 | 13.4 | OK |
| 16:9 | 3 | 456 | 11–15 | 8 | 57 | 4.9 | 13.0 | OK |
| 16:9 | 4 | 457 | 11–15 | 18 | 59 | 7.3 | 13.2 | OK |
| 16:9 | 5 | 462 | 10–15 | 13 | 55 | 4.9 | 13.1 | OK |
| 16:9 | 6 | 455 | 10–15 | 10 | 58 | 6.2 | 13.1 | OK |
| 16:9 | 7 | 459 | 11–15 | 14 | 48 | 5.7 | 13.2 | OK |
| 9:16 | 42 | 444 | 11–14 | 28 | 59 | 5.0 | 13.2 | OK |
| 9:16 | 1 | 461 | 12–15 | 11 | 61 | 4.1 | 13.2 | OK |
| 9:16 | 2 | 462 | 12–15 | 13 | 58 | 6.7 | 13.1 | OK |
| 9:16 | 3 | 430 | 11–14 | 62 | 61 | 6.0 | 13.0 | OK |
| 9:16 | 4 | 448 | 11–14 | 26 | 72 | 5.8 | 12.9 | OK |
| 9:16 | 5 | 462 | 12–15 | 4 | 61 | 3.7 | 12.8 | OK |
| 9:16 | 6 | 451 | 11–15 | 19 | 68 | 5.0 | 13.2 | OK |
| 9:16 | 7 | 464 | 11–15 | 14 | 54 | 4.9 | 13.1 | OK |

### Tempo 0,8 – Einzelwerte

| Format | Seed | Umläufe | Umläufe je Kugel | Rütteln | längste Verweildauer im Behälter (s) | längste Pause (s) | größter Schritt | Prüfung |
|---|---|---|---|---|---|---|---|---|
| 16:9 | 42 | 475 | 11–15 | 12 | 37 | 4.9 | 10.3 | OK |
| 16:9 | 1 | 446 | 10–15 | 28 | 47 | 7.7 | 10.8 | OK |
| 16:9 | 2 | 473 | 12–15 | 6 | 43 | 5.4 | 10.9 | OK |
| 16:9 | 3 | 471 | 12–15 | 16 | 53 | 4.1 | 10.9 | OK |
| 16:9 | 4 | 466 | 11–15 | 21 | 44 | 4.9 | 10.8 | OK |
| 16:9 | 5 | 470 | 11–15 | 13 | 38 | 4.1 | 10.6 | OK |
| 16:9 | 6 | 462 | 10–15 | 8 | 44 | 6.5 | 10.8 | OK |
| 16:9 | 7 | 462 | 10–15 | 12 | 48 | 4.9 | 10.7 | OK |
| 9:16 | 42 | 459 | 12–15 | 22 | 48 | 5.3 | 10.8 | OK |
| 9:16 | 1 | 472 | 12–15 | 18 | 43 | 5.2 | 10.9 | OK |
| 9:16 | 2 | 467 | 12–15 | 20 | 47 | 5.2 | 10.8 | OK |
| 9:16 | 3 | 459 | 11–15 | 16 | 61 | 4.1 | 10.7 | OK |
| 9:16 | 4 | 446 | 11–14 | 25 | 56 | 4.9 | 10.6 | OK |
| 9:16 | 5 | 462 | 12–15 | 33 | 56 | 5.8 | 10.6 | OK |
| 9:16 | 6 | 473 | 12–15 | 11 | 47 | 4.1 | 10.9 | OK |
| 9:16 | 7 | 467 | 12–15 | 10 | 49 | 4.1 | 10.6 | OK |

## 6 · Offen

- Die Zielwerte für Schritt 2 im Plan (Rütteln höchstens 2× je 10 Minuten) sind gegenüber diesen Ausgangswerten
  ehrgeizig; ob sie erreichbar sind, zeigt erst die konstruktive Änderung.
- Kein Referenzclip erzeugt – laut Roadmap nur „sofern nötig“; die Bilder und Hashes genügen als Ausgangsbasis.
