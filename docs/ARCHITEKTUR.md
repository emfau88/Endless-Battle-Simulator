# Architektur

Stand: 16.11.2026. Beschreibt, wie der Simulator aufgebaut ist und was ein Szenario liefern muss. Ersetzt die
Checkliste aus dem [Audit vom 12.11.](AUDIT_2026-11-12.md) und das geplante Grafik-Playbook (R14).

## 1 · Aufbau in einem Satz

Ein szenario-neutraler **Kern** verbindet eine **Simulation** (fester Takt, nur Seed-Zufall) mit einem **Renderer**
(liest nur) und stellt beides der **Vorschau** im Browser und dem **Exporter** (Playwright und FFmpeg) bereit.

| Ordner / Datei | Aufgabe |
|---|---|
| `index.html`, `src/app.js` | Bedienoberfläche und Vorschau; lädt alle Szenario-Skripte von Hand per `<script>` |
| `src/core.js` | Zeit, Einstellungsschema, Szenario-Anmeldung, Zufall, Partikel, `Session`, Export-Schnittstelle |
| `src/canvas-scene.js` | Adapter für Szenarien, die auf ein eigenes Canvas statt direkt in PixiJS zeichnen |
| `src/scenarios/<id>.js` und `src/scenarios/<id>/` | Ein Szenario: Anmeldung, Simulation, Renderer, Grafik |
| `src/scenarios/shared/` | Gemeinsame Bausteine mehrerer Szenarien (bisher die Tierchen-Grafik) |
| `src/production-presets.js`, `presets/` | Short- und Langvideo-Vorlagen |
| `lib/` | Export: Browser steuern, Bilder holen, Ton mischen, MP4 schreiben, Rezept sichern |
| `export.mjs`, `server.mjs` | Kommandozeile und lokaler Server für den Export |
| `test/`, `scripts/` | Tests, Referenz-Hashes, Prüf- und Review-Skripte |
| `output/` | Erzeugte Videos und Bilder. Von Git ignoriert, bleibt lokal. |

Alle Skripte im Browser sind klassische Skripte (keine Module), damit `index.html` auch ohne Server läuft. Alles hängt
am globalen Objekt `EBS`.

## 2 · Grundregeln

- **Fester Takt:** 60 Simulationsschritte je Videosekunde, unabhängig von Bildrate und Echtzeit. Zeitlupe verkleinert
  den Zeitschritt, nicht die Zahl der Schritte.
- **Logische Welt:** kurze Bildseite = 1 080 Einheiten (9:16 → 1 080 × 1 920, 16:9 → 1 920 × 1 080). Die
  Auflösung skaliert nur das Bild.
- **Reproduzierbar:** gleicher Seed, gleiche Einstellungen und gleicher Programmstand ergeben denselben Ablauf.
- **Trennung:** Der Renderer verändert die Simulation nie. Ton entsteht aus einem Ereignisprotokoll der Simulation.
- **Seek-Regel:** Das Bild zum Zeitpunkt t sieht nach einem Sprung genauso aus wie nach durchgehender Wiedergabe.
  Nur Szenarien, die das erfüllen, dürfen Ausschnitte exportieren.

## 3 · Was ein Szenario liefert

Anmeldung mit `EBS.registerScenario({ … })`.

### Pflicht

| Feld | Bedeutung |
|---|---|
| `id`, `title` | Kennung und Anzeigename |
| `defaults`, `normalizeParams(p)` | Standardwerte; begrenzt jeden Wert selbst |
| `controls[]` | Regler der Oberfläche (siehe unten) |
| `create(ctx)` | Baut die Simulation. `ctx = { seed, params, world, view, timeScale, video }` |
| `createRenderer(ctx)` | Baut den Renderer. `ctx = { app, sim, view, world, renderScale, video }` |
| `panelStats(sim)` | Kennzahlen für das Bedienfeld |

### Wahlweise

| Feld | Wofür |
|---|---|
| `audio` oder `audioForParams(params)` | Klangtabelle (Abschnitt 5) |
| `panelNote(sim)` | Eine Zeile Zusammenfassung im Bedienfeld |
| `videoDefaults` | Eigene Standardwerte für Auflösung, Bildrate, Qualität |
| `tempoRange { min, max, default }` | Stufenloses Filmtempo statt der festen Stufen 0,64 / 0,8 / 1 |
| `supportsCamera: false` | Schaltet den Kamera-Schalter ab |
| `reframe(renderer, ctx)`, `canReframe(cfg)` | Formatwechsel ohne Neustart der Welt |
| `supportsClips` (Wert oder Funktion) | Ausschnittsexport freigegeben; setzt die Seek-Regel voraus |
| `hasNaturalDuration(cfg)`, `durationLabel` | Das Szenario bestimmt die Videolänge selbst (Auftrag, Turnier) |
| `requiresPreflight(cfg)`, `createExportPlan(cfg, world)` | Vorlauf vor dem Export, der Ablauf und Dauer prüft |
| `createAudioMixPlan(events, ctx)` | Tonmischung nach Bildausschnitt der Kamera |
| `restartOnDuration` | Vorschau startet neu, wenn die Videolänge geändert wird |

### Regler (`controls[]`)

`key`, `label`, `type` (`range`, `select`, `check`), dazu `min`, `max`, `step`, `options`, `format`.
`restart: true` für Werte, die den Aufbau ändern. `sets` lädt je Auswahl zusammengehörige Standardwerte.
`visible(params)` blendet einen Regler abhängig von anderen aus. `rebuildUi` baut nach der Auswahl die Regler neu
auf; `resetMix` lädt dabei die Standardmischung der neuen Auswahl (für Modi mit eigener Klangtabelle).

`videoSets` kann einer Auswahl passende Videoeinstellungen mitgeben. Die Territory-Großkarte öffnet dadurch beim Anwenden das Querformat.

Parameternamen dürfen nicht mit Kern-Schlüsseln kollidieren: `version`, `name`, `description`, `scenario`, `seed`,
`format`, `aspect`, `resolution`, `fps`, `durationSec`, `tempo`, `audio`, `crf`, `preset`, `bitrate`, `hud`,
`camera` und alles mit dem Präfix `vol.`.

## 4 · Simulation und Renderer

**Simulation:** `stepOnce()`, `t`, `step`, `snapshot()` (mit `summary`), `checkInvariants()` → `{ ok, errors }`,
`stateHash()` (Zustand einschließlich Zufallsstände), `destroy()`. Wahlweise `setParam(k, v)`.

- Zeitschritt `dt = DT × timeScale`; bei `timeScale = 1` Bit für Bit gleich.
- Getrennte Zufallsströme für Ablauf und Effekte.
- Bei Matter.js vor `Engine.create`: `Common._nextId = 0; Common._seed = 0;`. In `destroy()` aufräumen
  (`Events.off`, `Composite.clear`, `Engine.clear`).
- Objekte fest begrenzen (Pools); nichts wächst mit der Laufzeit.

**Renderer:** `root` (PixiJS-Container), `draw()`, `destroy()` (eigene Texturen freigeben).

- Eigenes Layout für 9:16 und 16:9.
- Statische Grafik einmal in Texturen vorzeichnen, bewegte Teile als Sprites.
- Texte im Video englisch.

## 5 · Ton

Die Simulation schreibt Ereignisse in einen Ringpuffer `events` mit Zähler `eventSeq`:

```js
{ seq, step, t, type, x, y, p, c }   // p = Stärke, c = Farbe oder Index
```

Die Klangtabelle ordnet jedem Ereignistyp Klänge zu:

```js
audio.events[type] = { label, samples, gain, detune, minGap, ref, semis, scale }
```

`label` wird zum Lautstärkeregler. Der Exporter misst die Gesamtlautheit auf −14 LUFS ein und prüft die Spitzen nach
der AAC-Kodierung. Weitere Felder der Klangtabelle: `background` (Dauerklang mit eigenem Regler), `defaultVolume`,
`ceilingDb`, `aacNoPns`. Der Ringpuffer muss die Ereignisse von zehn Bildern sicher fassen; ein Überlauf wird beim
Export gemeldet.

## 6 · Export

1. Playwright öffnet die Seite im Exportmodus und steuert sie über `window.exportAPI`.
2. Je Videobild: feste Zahl Simulationsschritte, zeichnen, Bild als JPEG abholen.
3. Ereignisse werden laufend eingesammelt, der Ton wird in einem eigenen Prozess gemischt.
4. FFmpeg schreibt H.264 und AAC. Neben jedem MP4 liegt ein Rezept (JSON) mit Einstellungen, Seed, Programmstand und
   Prüfsummen.

Ausschnitte (`--clip-start`, `--clip-duration`) simulieren den Vorlauf ohne Bilder und schneiden den Ton aus der
Mischung der ganzen Episode.

Richtwert: Der 20-Minuten-Export der Pyramide in 1080p60 lief mit rund 21 Bildern pro Sekunde, also etwa eine Stunde.

## 7 · Tests und Prüflauf

- `scripts/test-ci.mjs` ordnet jede Testdatei über ihren Dateinamen einer von 18 Gruppen zu; der Prüflauf auf GitHub
  startet jede Gruppe einzeln (`.github/workflows/ci.yml`).
- **Referenz-Hashes** (`npm run golden`) decken Naval, Kugelfabrik und Mycelium ab. Die anderen Szenarien halten
  ihre Zustandsreferenzen in den eigenen Testdateien; ebenso der Naval-Modus „Ruhiges Duell“ (`test/naval-calm.test.mjs`).
- Vorlage für den Rahmen eines Szenarios: `test/fixtures/dummy-scenario.js`.

## 8 · Checkliste: neues Szenario

- [ ] Ordner `src/scenarios/<id>/` mit `simulation.js`, `renderer.js`, bei Bedarf `layout.js`, `art.js`, `story.js`;
      Anmeldung in `src/scenarios/<id>.js`. Vorbild: `waterpark`.
- [ ] `<script>`-Zeilen in `index.html`.
- [ ] Short- und Langvideo-Vorlage: `src/production-presets.js` und `presets/production/`.
- [ ] Testdateien mit Präfix `<id>` und Gruppe in `scripts/test-ci.mjs` sowie `.github/workflows/ci.yml`.
- [ ] Tests: gleicher Seed = gleicher Ablauf, Zeichnen ändert den Zustand nicht, Invarianten im Langlauf,
      kurzer Export mit Ton, Vorlagen-Export.
- [ ] Zeile in der README-Tabelle, Eintrag in ROADMAP und CHANGELOG.
- [ ] Solange unfertig: in der Oberfläche als „in Arbeit“ erkennbar.

## 9 · Bekannte Schwachstellen

| Punkt | Umgang |
|---|---|
| Drei sehr große Einzeldateien: `pyramid.js` (1 927 Zeilen), `naval.js` (1 700), `marble.js` (1 356) | Erst teilen, wenn dort gebaut wird. Beweis der Gleichheit über Referenz-Hashes und Referenzbilder. Bei Naval liegt der erste Baustein schon getrennt (`naval/sails.js`); die vollständige Aufteilung steht aus. |
| Verdrahtung von Hand an sechs Stellen (Checkliste oben) | Checkliste abarbeiten; kein Automatismus nötig. |
| Fahrplan-Logik viermal einzeln gebaut (Naval-Himmel, Pyramid-Tageslauf, Waterpark-Story, Marble-Works-Meilensteine) | Gemeinsamer Baustein, sobald das nächste Szenario ihn braucht. |
| 4K-Export langsam (Bildübergabe als JPEG/Base64) | Bei Bedarf (R11). |
| Für den Wasserpark fehlt der Vorlagen-Exporttest | Nachziehen (R30). |

## 10 · Geplante gemeinsame Bausteine

Entstehen als neue Dateien mit dem ersten Szenario, das sie braucht (R32). Bestehende Szenarien werden nicht auf
einen Schlag umgestellt.

| Baustein | Inhalt | Zuerst gebraucht von |
|---|---|---|
| `src/shared/timeline.js` | Kapitel und Ereignisse aus Seed und Videolänge, mit Mindestabstand | Naval-Langvideo |
| `src/shared/camera2d.js` | Übersicht, Verfolgung, Nahaufnahme; rein aus der Simulationszeit; Ton nach Bildausschnitt | Marble XL |
| `src/shared/tiled-layer.js` | Hintergrund in Kacheln für Welten, die größer als der Bildschirm sind | Marble XL |
| Vertragstest | Ein Test, der jedes angemeldete Szenario gegen Abschnitt 3 und 4 prüft | nächster Szenario-Umbau |
| Abschnittsexport | Lange Videos in Teilen exportieren und zusammenfügen | erster 30-Minuten-Export |

Startwerte für die Kamera: Schwenk höchstens 150 Einheiten pro Sekunde, Zoomwechsel mindestens 2 Sekunden, jede
Einstellung mindestens 8 Sekunden, Verfolgung höchstens 20 Sekunden. Der Modus „nur Übersicht“ ist immer wählbar.
