# Cloud Wars: Umsetzungsbericht

Laufender Bericht zu R38. Plan und Startwerte: [CLOUD_WARS_PLAN_2026-11-18.md](CLOUD_WARS_PLAN_2026-11-18.md).

## C0 · Gerüst und Gelände (18.11.2026)

**Umfang**

- Neues Szenario `cloudwars` mit dem Anzeigenamen „Cloud Wars (in Arbeit)“. Regler „Ablauf“ (Short oder Runden),
  bisher ohne Wirkung.
- `src/scenarios/cloudwars/terrain.js`: Gelände aus dem Prototyp (Zeilen 101–466), fast unverändert.
  - Rauschen, Wasser, Wald, Felder, Straßen und Dörfer hängen nur von der Weltposition ab (Ganzzahl-Hash).
  - Der Seed wählt nur den Ausschnitt.
  - `renderChunk` zeichnet jetzt mit wählbarer Schärfe direkt ins Zielbild. Jede Kachel ragt 3 Pixel in die nächste,
    damit keine Fugen entstehen. Die erste Fassung hatte sichtbare dunkle Linien an den Kachelgrenzen.
- Ausschnitt-Wahl `pickArea`: bis zu 256 Kandidaten, jeder um ein passendes Dorf gelegt. Der erste, der alle Regeln
  erfüllt, wird genommen. Regeln:
  - Wasser 8–22 %, Wald 25–50 %, Felder ≥ 12 %
  - ein Dorf mit 8+ Häusern ganz im Bild, zwei Straßenstücke
  - freie Wiese höchstens 30 %. Diese Regel ist neu gegenüber dem Plan, weil Seed 42 sonst eine halbe Bildseite
    leere Wiese zeigte.
- Maßstab je Format nach Entscheidung des Nutzers („auf Handy und PC jeweils passend“): hochkant 1 GE = 2,0 logische
  Einheiten (näher), quer 1,4 (mehr Landschaft). Mit dem kleineren Hochformat-Ausschnitt fand die Zufallssuche bei
  6 von 12 Seeds keinen gültigen Ausschnitt; seit die Kandidaten um ein Dorf gelegt werden, sind es 0 von 40
  (Seeds 1–20, beide Formate).
- Der Renderer zeichnet das Gelände einmal vor, in der Schärfe des Ausgabebilds.
- Verdrahtung:
  - `index.html`
  - Prüfgruppe `cloudwars` in `scripts/test-ci.mjs` und `.github/workflows/ci.yml`
  - Szenario-Listen in `test/core.test.mjs` und `test/presets.test.mjs`

**Messwerte** (ohne Grafikkarte, 1080p, Seite öffnen bis erstes Bild):

- 1,1–1,7 s je Seed, einschließlich der Ausschnitt-Wahl.
- 40 Prüffälle (Seeds 1–20, je hoch und quer): alle Regeln erfüllt.

**Vorschau**

- [Hochformat](reference/cloudwars-c0-hochformat-2026-11-18.jpg): Seeds 1 bis 4 mit Maßstab 2,0.
- [Querformat](reference/cloudwars-c0-querformat-2026-11-18.jpg): Seeds 42, 7, 3 und 5.

**Geprüft**

- `node --test test/cloudwars.test.mjs`, zwei Tests:
  - Geländeregeln für drei Seeds in beiden Formaten
  - gleicher Seed ergibt ein pixelgleiches Bild, ein anderer Seed ein anderes
  - Zeichnen ändert den Zustand nicht
- Die beiden angepassten Listen-Tests in `core.test.mjs` und `presets.test.mjs` (nur diese zwei Tests).
- `npm run golden`: identisch mit der Referenz.
- Kein vollständiger `npm test`, kein Export.

**Grenzen und Befund**

- Zwei gleichzeitig zeichnende Seiten wichen ohne Grafikkarte in Einzelpixeln voneinander ab; nacheinander
  geöffnet sind die Bilder gleich (dreimal geprüft). Der Test öffnet die Seiten deshalb nacheinander. Für den Export
  spielt das keine Rolle, weil dort eine Seite allein zeichnet.
- Noch keine Wolken, kein Ton, keine Anzeige.
- Entschieden: Maßstab je Format (siehe oben).

## C1 · Wolken in der Simulation (18.11.2026)

**Umfang**

- `src/scenarios/cloudwars/simulation.js` mit den Regeln aus Abschnitt 3 des Plans:
  - vier Teams (Nimbus, Cirrus, Cumulus, Stratus), eine Wolke je Team im Short, zwei im Runden-Modus
  - neutrale Wolken, die auf der Windseite nachkommen; ihre Zahl richtet sich nach der Fläche (hochkant 10, quer 18)
  - Wind mit langsam drehender Richtung
  - Steuerung alle 0,25 s: Flucht, Beute, Tanken über dem See, Treiben; weich vom Rand abgestoßen
  - Fressen mit Bremse für große Wolken, Verdunsten, Obergrenze
  - Ausscheiden, Rundenende, im Runden-Modus Punktestand und neue Runde nach 4 s
  - Ereignisse `absorb`, `eliminated`, `win`
  - Fress-Aufzeichnungen (`eats`) für die fliegenden Puffs in C2
- Zwei Zufallsströme (Ablauf und festgehaltene Aussehenswerte); `stateHash` deckt Wolken, Zufallsstände und
  Fress-Aufzeichnungen ab.
- Bis C2 zeichnet der Renderer die Wolken nur als einfache Scheiben mit Teamfarbe.

**Abweichungen von den Startwerten (gemessen)**

Runden-Modus quer über 6 bis 20 Seeds, je 20 Minuten Vorlauf ohne Bilder:

| Einstellung | Median einer Runde | größte Masse |
|---|---|---|
| Plan (Team gegen Team ab 1,1-facher Masse, Bremse ab 40, Verdunsten 0,004) | 64 s | 90 |
| Team gegen Team ab 1,35 | 109 s | 113 |
| 1,5 / Bremse ab 25 / Verdunsten 0,006 (**gewählt**) | 156 s (20 Seeds); nach der Randänderung aus C2 132 s | 93 |
| 1,6 / 25 / 0,006 | 360 s (fast jede Runde läuft in die Zeitgrenze) | 91 |
| 1,7 / 25 / 0,006 | 360 s | 77 |

- Zwischen 1,5 und 1,6 liegt eine Kante: Darüber holt der Führende die anderen nicht mehr ein. Gewählt ist 1,5.
  Das ergibt im Median 2,6 Minuten statt der geplanten 3 bis 5. Mit den Blitzen aus C3 ändert sich das Gleichgewicht
  ohnehin, deshalb wird dort neu gemessen.
- Im Short bleibt Team gegen Team bei 1,1. Hochkant, Seeds 1–10: Sieger im Median nach 24 s (13–42 s), erstes
  Ausscheiden nach 5–19 s. Das ist eine gute Grundlage für die Regie in C7.
- Hochkant im Runden-Modus sind die Runden kürzer (Median 69 s), weil das Bild kleiner ist. Das Langvideo ist quer.

**Geprüft:** `node --test test/cloudwars.test.mjs`, fünf Tests:

- gleicher Seed, gleicher Ablauf
- 10 Minuten Runden-Modus ohne Verletzung der Invarianten, Ereignisfolge ohne Lücke, Masse unter 120,
  mindestens eine beendete Runde
- Short mit Sieger innerhalb von 2 Minuten

Kein vollständiger `npm test`, kein Export.

## C2 · Wolken zeichnen (18.11.2026)

**Umfang**

- `src/scenarios/cloudwars/art.js`: Wolken-Sprites aus dem Prototyp (weicher Grundkörper, Lichtseiten, Glanzlichter),
  dazu neu:
  - Teamfarbe als Tönung der Schattenseite (30 %) und als Saum unten rechts
  - Augen mit Blick in Fahrtrichtung und Blinzeln (aus Zeit und Kennung)
  - Namensschild über jeder Team-Wolke, feste Schriftgröße in beiden Formaten
  - Schatten am Boden, Wolke 34 logische Einheiten darüber
  - fliegende Puffs beim Fressen und ein kurzes Nachfedern
- Puffs, Federn und Blinzeln werden aus den Fress-Aufzeichnungen und der Simulationszeit berechnet. Der Renderer hat
  keinen eigenen Zustand außer dem Sprite-Zwischenspeicher, und der hängt nur von Seed, Größenstufe, Art und Team ab.
- Sprite-Neubau, wenn sich der Radius um mehr als eine Stufe (8 %) ändert. Die Grenze von drei Neubauten je Bild aus
  dem Prototyp ist weggefallen, damit das Bild nicht vom Verlauf abhängt.
- Simulation: Team-Wolken bleiben großteils im Bild (Mittelpunkt mindestens 0,7 Radien vom Rand). Vorher ragten große
  Wolken halb hinaus. Dadurch fällt der Median einer Runde im Runden-Modus von 156 auf 132 s (20 Seeds).

**Messwerte:** Ohne Grafikkarte, 1080p, je Bild einschließlich JPEG-Kodierung: Median 82–83 ms, höchstens 97–121 ms.
Das ist nicht mit dem Plan-Ziel (nur Zeichnen, mit Grafikkarte) vergleichbar. Gemessen wird erneut in C4.

**Vorschau:** [Hochformat](reference/cloudwars-c2-hochformat-2026-11-18.jpg) und
[Querformat](reference/cloudwars-c2-querformat-2026-11-18.jpg). Je vier Bilder: Start, Fressen in Nahsicht, große
Wolke, Gedränge.

**Geprüft:** `node --test test/cloudwars.test.mjs`, sechs Tests. Neu ist der Seek-Test: Das Bild bei Sekunde 8 ist nach
einem Sprung pixelgleich mit dem Bild nach 239 gezeichneten Bildern, mit mehreren Fress-Vorgängen dazwischen. Kein
vollständiger `npm test`, kein Export.

**Bekannt und offen**

- Zwei Wolken desselben Teams können sich überdecken (Runden-Modus), dann überlappen auch die Namensschilder.
- Die Runden sind mit 2,2 Minuten im Median kürzer als geplant. Neu messen mit den Blitzen in C3.
- **Stopp, Stil-Checkpoint beim Nutzer:** Gesichter an oder aus? Teamfarbe kräftiger oder schwächer? Passen die Namen?
