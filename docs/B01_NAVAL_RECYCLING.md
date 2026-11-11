# B01 · Naval Battle: Unterwasser-Recycling beruhigen

**Datum:** 11.11.2026 · **Ausgangs-Commit:** `9589724` (W1/W2) · **Branch:** `b01-naval-recycling`
**Betroffene Datei:** `src/scenarios/naval.js`, nur die Methode `_drawRecycling(t)` im Renderer. Simulation unverändert.

## Vorher

Je Schiff zwei durchgehende helle Linien in Teamfarbe am Bildboden, darauf alle 44 Einheiten ein Pfeil, der mit der
Geschwindigkeit des Förderbands wanderte; im Aufzugsrohr wanderten zusätzlich Sprossen. Bei zwei Schiffen ergab das
zwei gegenläufige Pfeilketten in Rot und Blau über die ganze Bildbreite.

## Nachher

- **Rinne statt Leuchtlinie:** dunkles Bett, darüber eine dünne Kante in gedämpfter Teamfarbe (Deckkraft 0,32 statt 0,75).
- **Wenige Stützrollen:** alle 150 Einheiten eine Rolle mit einem langsam umlaufenden Punkt.
- **Feste Richtungsmarken:** alle 300 Einheiten ein kleiner Pfeil, der sich nicht bewegt.
- **Aufzugsrohr:** dunkles Glas mit gedämpften Kanten und wenigen festen Manschetten statt wandernder Sprossen.
- **Entkoppelt:** Nichts in der Zeichnung hängt mehr an `TUNING.conveyor`. Die einzige Bewegung sind die Kugeln selbst
  und der Punkt je Rolle (feste Bildgeschwindigkeit).

Kugelbewegung, Munitionsbilanz und Recyclinglogik liegen in der Simulation und wurden nicht angefasst.

## Abnahme

| Kriterium | Ergebnis |
|---|---|
| Identischer Physikverlauf bei gleichem Seed | Ja: Zustand-Hash des 10-s-Exports vorher und nachher `54ef6dd8`; `test/golden.test.mjs` besteht (alle Naval-Hashes aus Schritt 0 unverändert) |
| Erkennbar ruhigerer Bildboden | Ja, in beiden Formaten (Bilder unten) |
| Recyclingkreislauf weiterhin sichtbar | Ja: Rinne, Rollen, Aufzugsrohr und die zurücklaufenden Kugeln sind erkennbar |
| Lesbarkeit am Smartphone | Nicht am Gerät geprüft; die Rinnen sind jetzt bewusst unauffällig |

## Nachweise

| | 9:16 | 16:9 |
|---|---|---|
| Vorher | [Bild](nachweise/b01_vorher_9x16.png) | [Bild](nachweise/b01_vorher_16x9.png) |
| Nachher | [Bild](nachweise/b01_nachher_9x16.png) | [Bild](nachweise/b01_nachher_16x9.png) |

Clips (lokal, nicht im Repository): `output/b01_naval_vorher_9x16_10s.mp4`, `output/b01_naval_nachher_9x16_10s.mp4`,
je 10 s in 720p. Die Referenzbilder unter `reference/` wurden für Naval neu erzeugt.

## Tests

| Lauf | Ergebnis | Dauer |
|---|---|---|
| `test/sim.test.mjs` + `test/golden.test.mjs` + `test/core.test.mjs` | 19/19 | 84 s |
| `test/export.test.mjs` + `test/live.test.mjs` + `test/config.test.mjs` | 19/19 | 74 s |

Die Tests für Kugelfabrik, Ton und Teilen habe ich nicht erneut ausgeführt; sie laden `naval.js`, prüfen aber nichts daran.

## Geprüft, aber nicht geändert

- **Bildaufbau für Shorts:** Im Hochkantformat nimmt das Wasser rund die Hälfte der Bildhöhe ein, die Schiffe stehen
  klein in der Bildmitte. Größere Schiffe und weniger Unterwasserfläche wären ein Eingriff ins Layout und damit in
  Flugbahnen und Treffer – also in die Physik. Das gehört in einen eigenen Schritt (B08) mit neu gesetzten Hashes.
- **`recycleVisible` aus:** Der Schalter funktioniert unverändert und blendet die gesamte Mechanik aus.
- Die Clips habe ich nicht in Echtzeit angesehen; beurteilt wurden Einzelbilder.
