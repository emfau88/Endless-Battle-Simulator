# Seeschlacht: Mulden am Meeresgrund, Lift durch den Kiel, Beuteprinzip

**Datum:** 12.11.2026 · **Ausgangs-Commit:** `1a422c0` · **Branch:** `naval-beuteprinzip-lift`
**Betroffene Dateien:** `src/scenarios/naval.js` (Simulation und Darstellung), `test/sim.test.mjs`,
`test/fixtures/golden-hashes.json`, Referenzbilder unter `docs/reference/`, README.

Roadmap-Punkt R01, Teil „Glasrohre, Anschlüsse, Sammelrinne“ samt den drei dort genannten Mängeln. R01 sah eine reine
Darstellungsänderung vor. Du hast am 12.11.2026 nach einer Vorschau (zwei 18-s-Clips aus einer Kopie) den Umbau mit
Physikänderung freigegeben; die Referenz-Hashes der Seeschlacht sind deshalb bewusst neu gesetzt.

## Was geändert wurde

| | vorher | nachher |
|---|---|---|
| Weg der Kugel am Grund | flache Sammelrinne über die ganze Breite, eine Spur je Schiff, kein sichtbarer Antrieb | Meeresgrund mit einer Mulde unter jedem Heck, flachem Rücken dazwischen und Anstieg zu den Rändern: Die Kugel rollt bergab |
| Wem die Kugel gehört (Duell) | dem Schiff, das sie verschossen hat – sie läuft quer durchs Bild zurück | dem Schiff, in dessen Mulde sie landet (Beuteprinzip) – es schießt sie zurück |
| Rohr | frei stehend neben dem Heck, 6,5 % (quer) bzw. 4,4 % (hochkant) der Bildbreite vom Rand, durchstößt die Wasserlinie | Glasrohr vom Sockel senkrecht zum Kiel, 11,5 % bzw. 11,8 % vom Rand; oben gleitet eine Glasmanschette mit dem Seegang |
| Kugel im Rohr | lag vor dem Glas (keine Schicht darüber) | liegt zwischen Rückwand und Frontglas mit Reflexen und Messingringen |
| Anschluss unten | Stahlkasten, harter Knick | Messingsockel mit Einläufen links und rechts und Schauglas; der Ring leuchtet, wenn eine Kugel einläuft |
| Farbe der Kugel | Teamfarbe des Besitzers überall | unter Wasser neutral, im Rohr lädt sich die Farbe des Besitzers auf |
| Lebensbalken (Querformat, Duell) | oben in der Bildmitte | obere Ecken; Titel blendet nach 5 s aus; Zeit und Zähler unten in der Mitte |
| Meeresgrund im Hochformat | bei 95 % der Bildhöhe, Wassersäule 39 % der Bildhöhe | Mulden bei 79,5 %, Wassersäule 23 %; darunter ruhiger Sand, den YouTube überdecken darf |
| Kleintext | „Ammo 7/20 · Hits taken 18“ | „Ammo 7“ (bei drei und vier Schiffen „Ammo 7/15“) |

Geschwindigkeiten: Rollen am Grund 300 (vorher Förderband 330), Steigen im Rohr 230 Einheiten/s. Eine Kugel rollt aus
dem Stand an. Der Schalter „Recycling sichtbar“ blendet weiterhin Rohre, Sockel und Kugeln unter Wasser aus; der
Meeresgrund bleibt sichtbar.

## Die drei Mängel aus R01

| Mangel | Stand |
|---|---|
| Sinkt eine Kugel außerhalb der Rohre, rollt sie über den Meeresgrund zur Rinne | behoben: Der Grund steigt zu den Rändern an, jede Kugel rollt bergab in eine Mulde |
| Kugeln fliegen hinter den Lebensbalken durch | behoben für das Querformat mit zwei Schiffen (dort lag der Scheitel der hohen Bögen genau unter Titel und Balken). Hochkant reichen die Bögen nicht bis zur Anzeige. Bei drei und vier Schiffen im Querformat stehen die Balken weiter oben in der Mitte – offen |
| Rohre stehen nah am Bildrand | behoben: Die Rohre stehen unter dem Rumpf |

## Beuteprinzip im Duell: Verteilung der Munition

Ohne Ausgleich würde sich die Munition beim langsamer feuernden Schiff sammeln. Regel: Feuertempo ×
`clamp(1 + 0,03 × (Munition − 9), 0,85, 1,3)` – ein volles Regal feuert bis zu 30 % schneller, ein leeres bis zu 15 %
langsamer (9 = 45 % der Anfangsmenge).

Gemessen über je 10 Minuten Simulationszeit, Abtastung jede Sekunde:

| Format | Seed | Munition Rot / Blau (kleinster–größter Wert) | Sekunden ohne Munition (Rot / Blau, von 600) | Schüsse | Trefferquote | Notfall-Rückführungen |
|---|---|---|---|---|---|---|
| 16:9 | 42 | 4–18 / 2–18 | 0 / 0 | 1601 | 72 % | 38 |
| 16:9 | 7 | 2–18 / 2–20 | 0 / 0 | 1643 | 72 % | 31 |
| 16:9 | 1234 | 1–17 / 5–18 | 0 / 0 | 1608 | 70 % | 25 |
| 9:16 | 42 | 0–18 / 2–18 | 2 / 0 | 1617 | 70 % | 12 |
| 9:16 | 7 | 2–18 / 3–20 | 0 / 0 | 1654 | 69 % | 11 |
| 9:16 | 1234 | 1–17 / 3–18 | 0 / 0 | 1619 | 69 % | 9 |

Quadrat 1:1 (Seed 9): Munition im Mittel 9,4 / 10,0, kein Schiff ohne Munition.

Vergleich mit dem Stand davor (`1a422c0`, dieselbe Messung mit denselben Seeds): 1623 / 1669 / 1627 Schüsse in
beiden Formaten, Trefferquote 70–71 % (16:9) und 66–69 % (9:16), Notfall-Rückführungen 27–32 (16:9) und 5–10 (9:16),
ein Schiff 1 von 600 Sekunden ohne Munition. Die Schlacht ist also praktisch gleich dicht geblieben: 0,4–1,6 % weniger
Schüsse, Trefferquote und Notfälle im selben Bereich.

## Drei und vier Schiffe: kein Beuteprinzip

Mit Beuteprinzip stehen die äußeren Schiffe fast durchgehend ohne Munition da, die mittleren horten. Ursache: Schüsse
über ein mittleres Schiff hinweg treffen dessen Masten und fallen in dessen Mulde. Gemessen (Seed 9, 10 Minuten,
drei Schiffe mit je drei Kanonen, Sekunden ohne Munition von 600, Rot / Blau / Grün):

| Variante | 16:9 | 9:16 |
|---|---|---|
| Kugel geht zum nächsten Rohr | 587 / 0 / 307 | 587 / 0 / 391 |
| Einzugsbereich mittig zwischen den Schiffen | 518 / 0 / 18 | 431 / 0 / 97 |
| zusätzlich alle Gegner gleich oft anvisieren | 413 / 0 / 90 | 472 / 0 / 196 |
| zusätzlich Überschuss im Regal stark beschleunigt verschießen | 352 / 0 / 1 | 380 / 0 / 26 |
| **umgesetzt: jedes Schiff behält seine Kugeln** | **0 / 0 / 0** | **0 / 0 / 0** |

Umgesetzt: Bei drei und vier Schiffen bleibt die Kugel bei ihrem Schiff. Sie rollt in den Sockel der Mulde, in der sie
liegt, und läuft von dort verdeckt durch eine Leitung im Sand (als Messingrohr im Sandquerschnitt gezeichnet) zum
eigenen Rohr. Zielwahl und Feuertempo sind dort wie vor dem Umbau. Vier Schiffe mit je zwei Kanonen: ebenfalls kein
Schiff ohne Munition, Schüsse je Schiff 366 / 392 / 406 / 380.

Unverändert im Grundsatz: Sehr hohe Feuerrate (6 Kanonen, 3×) und sehr wenige Kugeln (1 Kanone, 5 Kugeln) bleiben
durch den Vorrat begrenzt – dort warten die Kanonen wie bisher häufig auf Kugeln. Mit dem alten Stand habe ich diese
beiden Fälle nicht verglichen.

## Nachweise

Alle Bilder habe ich angesehen. 720p, Seed 42, nach 24 s.

| | 16:9 | 9:16 |
|---|---|---|
| Vorher | [Bild](nachweise/naval_lift_vorher_16x9.png) | [Bild](nachweise/naval_lift_vorher_9x16.png) |
| Nachher | [Bild](nachweise/naval_lift_nachher_16x9.png) | [Bild](nachweise/naval_lift_nachher_9x16.png) |

- [Lift in Vergrößerung](nachweise/naval_lift_detail.png) (Ausschnitt aus 1080p): Sockel mit Schauglas, Kugeln in der
  Warteschlange, Glasrohr, Manschette am Kiel.
- [Drei Schiffe, 16:9](nachweise/naval_lift_3schiffe_16x9.png): Leitung im Sand zwischen den Sockeln.
- Die Referenzbilder `reference/naval_9x16_720p.png` und `reference/naval_16x9_720p.png` sind neu erzeugt.

Geprüft, ohne Bild im Repository: Quadrat 1:1, vier Schiffe im Querformat, drei Schiffe hochkant, „Recycling
sichtbar“ aus, Startbild mit Titel. Zwei 18-s-Vorschauclips (aus der Kopie, Stand vor der Regel für drei und vier
Schiffe) hast du gesehen; ich selbst habe nur Einzelbilder beurteilt, keinen Clip in Echtzeit.

## Tests

| Lauf | Ergebnis | Dauer |
|---|---|---|
| `npm test` (alle neun Testdateien) | 74/74 | 362 s |
| `npm run golden` nach dem Neuschreiben | identisch mit der Referenz | 31 s |

Schaden nach 1 / 5 / 10 / 30 / 60 Minuten im 60-Minuten-Test: 2,9 / 12,3 / 22,7 / 46,8 / 63,5 % (Werte im README
gelten weiter).

Neu in `test/sim.test.mjs`:

- Duell: Munition bleibt verteilt, kein Schiff steht länger leer (10 Minuten, beide Formate).
- Drei und vier Schiffe: jedes Schiff behält seine Kugeln, keines steht leer (10 Minuten).

`checkInvariants()` prüft jetzt die Gesamtzahl der Kugeln, den Besitz der Kugeln in Magazin und Mulde und – bei drei
und vier Schiffen – weiterhin die feste Kugelzahl je Schiff.

**Referenz-Hashes:** Vor dem Neuschreiben wichen genau die 24 Einträge der Seeschlacht ab (12 Fälle × 2 Prüfpunkte);
alle Einträge der Kugelfabrik waren identisch.

## Offen

Steht in der [Roadmap](ROADMAP.md) (R01, R05, R18, R19).
