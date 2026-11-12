# Schritt 2 · Marble: Trichterstau konstruktiv entschärfen (B02)

**Datum:** 11.11.2026 · **Ausgangs-Commit:** `5d91778` (Schritt 1) · **Branch:** `schritt-2-marble-trichter`
**Betroffene Dateien:** `src/scenarios/marble.js`, `scripts/marble-metrics.mjs`, `test/marble.test.mjs`,
`test/fixtures/golden-hashes.json`, `README.md`, Referenzbilder. Naval, Kern und Export unverändert.

## 1 · Ursache (nachgestellt mit festen Seeds)

Untersucht am Stand vor der Änderung, je 10 Minuten Simulationszeit:

| Lauf | Rütteln | Episoden | davon „zwei Kugeln beidseits über dem Hals“ | Kugeln mit über 15 s Liegezeit: links / Mitte / rechts |
|---|---|---|---|---|
| 9:16, Seed 3 | 62× | 23 | 9 | 0 / 22 / 38 |
| 9:16, Seed 42 | 28× | 9 | 5 | 0 / 21 / 28 |
| 16:9, Seed 4 | 18× | 6 | 4 | 0 / 20 / 38 |
| 16:9, Seed 1 | 7× | 4 | 2 | 0 / 17 / 32 |

- **Stau:** Im symmetrischen Trichter liegen zwei Kugeln links und rechts über dem Hals (gemessen bei etwa ±21 Einheiten
  seitlich, 22 über der Halsoberkante) und stützen sich gegenseitig. In den übrigen Episoden hatte sich dieselbe
  Brücke gerade erst gelöst; der Rüttler sprang trotzdem an, weil er nur die Zeit seit der letzten Aufnahme maß.
- **Tote Zone:** Lange liegende Kugeln fanden sich nie links, sondern ausschließlich auf der rechten Flanke – der Seite
  gegenüber dem Einlauf. Die Werte in der Mitte sind Kugeln, die der Vorrang bereits zum Hals gezogen hatte.
- **Kein Stillstand des Zellenrads:** Das Rad war in 0 % der Schritte angehalten; die Ursache liegt allein im Behälter.

## 2 · Was geändert wurde

1. **Einseitiger Behälter.** Der Boden fällt vom Einlauf (links) zum Hals, rechts steht eine senkrechte Wand direkt
   über dem Hals. Der Behälter wurde dafür nach links verbreitert (Fassungsvermögen etwa wie zuvor); Hals, Zellenrad
   und Fallrohr stehen unverändert. Zwei Kugeln können sich nicht mehr symmetrisch abstützen, und es gibt keine
   Flanke gegenüber dem Einlauf mehr.
2. **Brückenbrecher greift erst nach 0,5 s leerem Hals** statt sofort. Das sofortige Eingreifen störte das normale
   Nachrutschen und kostete Durchsatz.
3. **Rüttler springt nicht mehr an, wenn eine Kugel im Hals bereitliegt**, und ein leerer Behälter zählt nicht als Stau.
4. **Messingmanschette** sitzt waagerecht direkt unter dem Gehäusering des Zellenrads.

Die Rüttelstärke wurde nicht erhöht. Brückenbrecher, Vorrang und Rütteln bleiben als Sicherung erhalten und werden
weiter gezählt (`stats.kicks`, `stats.priority`, `stats.shakes`).

**Verworfen (gemessen):** Den Brückenbrecher auf „die Kugel über der Öffnung“ statt auf die unterste Kugel zu
richten, verschlechterte alles drastisch (rund 200 statt 500 Umläufe, Rütteln etwa 490× je 10 Minuten).

## 3 · Vorher / Nachher

8 Seeds je Format, je 10 Minuten Simulationszeit, dieselben Seeds wie in der Ausgangsbasis.
Theoretisches Maximum: 500 Umläufe.

| Tempo 1 | Rütteln je Lauf (Mittel) | Umläufe | längste Verweildauer im Behälter | wenigste Umläufe einer Kugel |
|---|---|---|---|---|
| 16:9 vorher | 7–18 (11,9) | 451–475 | 40–59 s | 10 |
| 16:9 nachher | 0–1 (0,1) | 494–501 | 11–19 s | 12 |
| 9:16 vorher | 4–62 (22,1) | 430–464 | 54–72 s | 11 |
| 9:16 nachher | 0 (0,0) | 497–500 | 12–16 s | 12 |

| Tempo 0,8 | Rütteln je Lauf (Mittel) | Umläufe | längste Verweildauer im Behälter |
|---|---|---|---|
| 16:9 vorher | 6–28 (14,5) | 446–475 | 37–53 s |
| 16:9 nachher | 0 (0,0) | 496–500 | 12–15 s |
| 9:16 vorher | 10–33 (19,4) | 446–473 | 43–61 s |
| 9:16 nachher | 0 (0,0) | 497–500 | 13–18 s |

In allen 32 Läufen zusammen (320 Minuten Simulationszeit) rüttelte der Behälter genau einmal.

### Zielwerte aus dem Plan

| Ziel | Ergebnis |
|---|---|
| Rütteln höchstens 2× je 10 Minuten in beiden Formaten | erreicht (höchstens 1×) |
| Verweildauer unter 40 s | erreicht (höchstens 19 s) |
| mindestens 470 Umläufe je 10 Minuten | erreicht (mindestens 494) |
| keine Kugel mit null Umläufen | erreicht (mindestens 11 je Kugel) |
| größter Schritt unter 20 Einheiten | erreicht (höchstens 12,7) |

### Tempo 1 – Zusammenfassung und Einzelwerte

| Format | Umläufe | Rütteln (Spanne / Mittel) | Brückenbrecher (Spanne / Mittel) | Verweildauer (s) | längste Pause (s) | wenigste Umläufe einer Kugel |
|---|---|---|---|---|---|---|
| 16:9 | 494–501 | 0–1 / 0.1 | 241–363 / 311.6 | 11–19 | 4.1–6.5 | 12 |
| 9:16 | 497–500 | 0–0 / 0.0 | 443–482 / 461.1 | 12–16 | 2.5–4.1 | 12 |

| Format | Seed | Umläufe | Umläufe je Kugel | Rütteln | Brückenbrecher | längste Verweildauer im Behälter (s) | längste Pause (s) | größter Schritt | Prüfung |
|---|---|---|---|---|---|---|---|---|---|
| 16:9 | 42 | 500 | 13–17 | 0 | 333 | 11 | 4.1 | 12.4 | OK |
| 16:9 | 1 | 499 | 12–16 | 0 | 332 | 13 | 4.9 | 12.0 | OK |
| 16:9 | 2 | 497 | 12–16 | 1 | 363 | 15 | 6.5 | 12.7 | OK |
| 16:9 | 3 | 501 | 12–16 | 0 | 324 | 12 | 4.1 | 12.0 | OK |
| 16:9 | 4 | 499 | 12–16 | 0 | 241 | 11 | 4.9 | 10.1 | OK |
| 16:9 | 5 | 499 | 12–16 | 0 | 282 | 12 | 4.1 | 10.6 | OK |
| 16:9 | 6 | 494 | 12–16 | 0 | 316 | 19 | 4.4 | 11.6 | OK |
| 16:9 | 7 | 499 | 12–15 | 0 | 302 | 12 | 5.2 | 10.7 | OK |
| 9:16 | 42 | 497 | 12–16 | 0 | 477 | 15 | 2.5 | 12.3 | OK |
| 9:16 | 1 | 497 | 12–16 | 0 | 463 | 16 | 3.3 | 11.9 | OK |
| 9:16 | 2 | 499 | 12–16 | 0 | 482 | 15 | 2.5 | 11.3 | OK |
| 9:16 | 3 | 500 | 12–15 | 0 | 445 | 12 | 2.5 | 11.6 | OK |
| 9:16 | 4 | 499 | 12–16 | 0 | 473 | 15 | 3.3 | 11.8 | OK |
| 9:16 | 5 | 500 | 12–15 | 0 | 443 | 12 | 4.1 | 12.2 | OK |
| 9:16 | 6 | 500 | 12–16 | 0 | 443 | 13 | 3.3 | 12.3 | OK |
| 9:16 | 7 | 500 | 12–16 | 0 | 463 | 12 | 2.5 | 11.3 | OK |

### Tempo 0,8 – Zusammenfassung und Einzelwerte

| Format | Umläufe | Rütteln (Spanne / Mittel) | Brückenbrecher (Spanne / Mittel) | Verweildauer (s) | längste Pause (s) | wenigste Umläufe einer Kugel |
|---|---|---|---|---|---|---|
| 16:9 | 496–500 | 0–0 / 0.0 | 296–356 / 330.8 | 12–15 | 4.1–4.9 | 11 |
| 9:16 | 497–500 | 0–0 / 0.0 | 470–542 / 510.4 | 13–18 | 2.5–4.9 | 12 |

| Format | Seed | Umläufe | Umläufe je Kugel | Rütteln | Brückenbrecher | längste Verweildauer im Behälter (s) | längste Pause (s) | größter Schritt | Prüfung |
|---|---|---|---|---|---|---|---|---|---|
| 16:9 | 42 | 500 | 13–16 | 0 | 296 | 12 | 4.1 | 9.5 | OK |
| 16:9 | 1 | 498 | 12–15 | 0 | 338 | 14 | 4.1 | 10.0 | OK |
| 16:9 | 2 | 498 | 12–15 | 0 | 344 | 12 | 4.1 | 9.9 | OK |
| 16:9 | 3 | 496 | 11–16 | 0 | 356 | 13 | 4.1 | 9.4 | OK |
| 16:9 | 4 | 497 | 12–17 | 0 | 333 | 15 | 4.9 | 9.6 | OK |
| 16:9 | 5 | 500 | 12–16 | 0 | 302 | 13 | 4.1 | 10.2 | OK |
| 16:9 | 6 | 500 | 12–17 | 0 | 338 | 12 | 4.1 | 10.1 | OK |
| 16:9 | 7 | 498 | 12–15 | 0 | 339 | 14 | 4.5 | 10.1 | OK |
| 9:16 | 42 | 497 | 12–15 | 0 | 519 | 17 | 3.3 | 10.1 | OK |
| 9:16 | 1 | 499 | 12–16 | 0 | 496 | 16 | 2.5 | 9.6 | OK |
| 9:16 | 2 | 497 | 12–15 | 0 | 497 | 17 | 2.5 | 9.3 | OK |
| 9:16 | 3 | 500 | 12–16 | 0 | 470 | 13 | 2.5 | 10.2 | OK |
| 9:16 | 4 | 497 | 12–16 | 0 | 531 | 18 | 3.3 | 9.9 | OK |
| 9:16 | 5 | 500 | 12–16 | 0 | 542 | 16 | 2.5 | 10.6 | OK |
| 9:16 | 6 | 499 | 12–16 | 0 | 500 | 16 | 4.9 | 9.4 | OK |
| 9:16 | 7 | 498 | 13–16 | 0 | 528 | 17 | 2.5 | 10.4 | OK |

## 4 · Tests

Jede Testdatei einzeln, je Lauf auf 2 Minuten begrenzt.

| Lauf | Ergebnis | Dauer |
|---|---|---|
| `test/marble.test.mjs` | 17/17 | 75 s |
| `test/core.test.mjs` + `test/sim.test.mjs` + `test/golden.test.mjs` | 19/19 | 86 s |
| `test/export.test.mjs` + `test/live.test.mjs` + `test/config.test.mjs` | 19/19 | 79 s |

- Die Kreislauftests verlangen jetzt mindestens 470 Umläufe und höchstens 2× Rütteln je 10 Minuten (vorher: über 400
  Umläufe, Rütteln ungeprüft).
- **Referenz-Hashes:** Vor dem Neuschreiben wichen alle 16 Marble-Fälle ab und kein Naval-Fall. Die Marble-Hashes
  wurden bewusst neu gesetzt, die Naval-Hashes sind unverändert.
- 30-Minuten-Lauf: 1498 Umläufe (vorher 1357), Speicher stabil.

## 5 · Nachweise

- Bilder: [Behälter 16:9](nachweise/schritt2_behaelter_16x9.png), [Behälter 9:16](nachweise/schritt2_behaelter_9x16.png),
  Referenzbilder unter `reference/` neu erzeugt.
- Clips (lokal, nicht im Repository): `output/schritt2_marble_16x9_10s.mp4`, `output/schritt2_marble_9x16_10s.mp4`,
  je 10 s in 720p. Aus beiden wurden 30 Einzelbilder des Behälters angesehen: Die Kugeln rollen als Reihe den Boden
  hinunter, Neuankömmlinge fallen links ein, kein Rütteln.

## 6 · Offen

> Stand dieses Berichts. Offene Punkte werden seit 12.11.2026 nur noch in der [ROADMAP](ROADMAP.md) geführt.

- **Brückenbrecher greift weiterhin oft ein:** 240–360× (quer) und 440–540× (hochkant) je 10 Minuten, jeweils ein
  kleiner Schubs, wenn der Hals länger als 0,5 s leer bleibt. In den angesehenen Einzelbildern fällt das nicht auf;
  ob es im laufenden Video als Zucken sichtbar ist, habe ich nicht am Bildschirm in Echtzeit beurteilt.
- **Farbverteilung (nur geprüft, nicht geändert):** Bei 35 Kugeln hat Grün 5 statt 6 Kugeln und wird etwa 63× statt
  88× je 10 Minuten sortiert. 30 Kugeln (6 × 5) gleichen das aus, leeren aber den Behälter (im Mittel 2–3 Kugeln)
  und kosten im Querformat Durchsatz (456 statt 500 Umläufe). Ausgewogen und voll wäre erst 36 – das liegt über der
  bisherigen Obergrenze von 35.
- **Optik:** Der Behälter ist jetzt asymmetrisch und zeigt meist eine Kugelreihe statt eines Haufens. Die rechte
  Stütze steht frei neben dem Zellenrad.
- Am selben Bildschirm in Echtzeit angesehen habe ich die Clips nicht; beurteilt wurden Einzelbilder.
