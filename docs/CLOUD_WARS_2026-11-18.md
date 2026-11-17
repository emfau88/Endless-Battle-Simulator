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
