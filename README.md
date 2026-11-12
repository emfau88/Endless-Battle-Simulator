# Endless Battle Simulator

### ▶ [Jetzt im Browser öffnen: emfau88.github.io/Endless-Battle-Simulator](https://emfau88.github.io/Endless-Battle-Simulator/)

Direkt zur Kugelfabrik: [hochkant](https://emfau88.github.io/Endless-Battle-Simulator/?scenario=marble) ·
[Querformat](https://emfau88.github.io/Endless-Battle-Simulator/?scenario=marble&aspect=16:9) –
Vorschau und Regler laufen im Browser, auch am Handy. Videos entstehen am eigenen PC (`start.bat`).

Deterministische 2D-Physiksimulation im Stil von Algodoo-/„Satisfying Physics“-Videos mit automatischem MP4-Export.
Erstes Szenario: **Endless Naval Battle** – zwei Schiffe beschießen sich endlos, jede Kanonenkugel läuft in einem
geschlossenen, sichtbaren Kreislauf zurück ins Magazin.

Zweites Szenario: **Endless Marble Factory** – eine Kugelfabrik mit geschlossenem Kreislauf, deren Grafik vollständig
im Code entsteht (siehe [Endless Marble Factory](#endless-marble-factory)). Beide Szenarien exportieren mit Ton,
eingemessen auf YouTube-Lautheit (siehe [Ton](#ton)).

Die Architektur ist für weitere Szenarien und Videoformate vorbereitet (siehe [Erweiterbarkeit](#erweiterbarkeit));
der aktuelle Gesamtzustand steht im [Audit vom 12.11.2026](docs/AUDIT_2026-11-12.md). Offene Punkte:
[Roadmap](docs/ROADMAP.md) · Erledigtes: [Changelog](docs/CHANGELOG.md).

## Schnellstart

- **Online-Vorschau (ohne Installation):** https://emfau88.github.io/Endless-Battle-Simulator/ – Vorschau und Regler
  laufen im Browser, auch am Handy. Ein Video entsteht dort nicht; der Export braucht den eigenen PC.
- **Am PC:** `start.bat` doppelklicken. Der Server startet, der Browser öffnet `http://localhost:8080`, und der Knopf
  „Video exportieren“ funktioniert. Das Fenster offen lassen; Schließen beendet den Server.
- **Einstellungen mitnehmen:** Im Bedienfeld unter „Einstellungen teilen“ den Link kopieren oder eine JSON-Datei
  speichern und am PC wieder laden (auch als `--config` für die Kommandozeile).

## Voraussetzungen

| Werkzeug | Version (getestet) | Hinweis |
|---|---|---|
| Node.js | 22.17 (≥ 18 nötig) | |
| FFmpeg + ffprobe | N-121425 (2025-10) | muss `libx264` enthalten; im `PATH` oder per `FFMPEG_PATH` / `FFPROBE_PATH` |
| Chromium für Playwright | über `playwright@1.60.0` | falls nicht vorhanden: `npx playwright install chromium` |

Bibliotheken (fest gepinnt): **PixiJS 8.22.0** (Grafik), **Matter.js 0.20.0** (Physik). Die Browser-Builds liegen in
`vendor/` – `index.html` läuft daher auch offline.

## Befehle

```bash
npm install                 # Abhängigkeiten (Playwright, PixiJS, Matter.js)
npm start                   # Server + Oberfläche: http://localhost:8080
npm run export:test         # Abnahmetest: 20-s-MP4 -> output/test_20s.mp4 (inkl. ffprobe-Prüfung)
npm run export -- --config presets/naval-standard.json          # 60 Minuten hochkant (Vorlage für die Langfassung)
npm run export -- --config presets/naval-landscape-10min.json   # 10 Minuten 1920×1080
npm run export -- --config presets/naval-youtube-short.json     # YouTube-Short: 20 s, 1440×2560, 60 fps, mit Ton
npm run export -- --config presets/naval-youtube-10min.json     # YouTube: 10 Minuten, 2560×1440, 60 fps, mit Ton
npm run export -- --duration 5m --seed 7 --aspect 1:1 --resolution 1440 --fps 60 --bitrate 12M
npm test                    # gesamte Suite inkl. Golden-Referenzen; Zeitlimit 10 min je Testdatei
npm run golden              # Referenz-Hashes der Simulation prüfen (≈ 1 min)
npm run marble:test         # Kugelfabrik: 8-s-Testvideo 720p30 -> output/marble_test_8s_720p.mp4
node scripts/screenshot.mjs --scenario marble --aspect 16:9 --at 9 --out output/marble_16x9.png   # Einzelbild (PNG)
```

`index.html` kann auch direkt per Doppelklick geöffnet werden; der Button **Video exportieren** braucht aber den
Server (`npm start`). Ohne Server zeigt er den passenden Kommandozeilenbefehl an.

### Export-Optionen (`node export.mjs --help`)

| Bereich | Optionen |
|---|---|
| Konfiguration | `--config datei.json` · `--scenario id` · `--seed n` · `--param key=wert` (mehrfach) · `--no-hud` · `--no-camera` |
| Video | `--duration 20s/5m/1h` · `--aspect 9:16/16:9/1:1` (oder `--format portrait/landscape/square`) · `--resolution 720/1080/1440/2160` · `--fps 30/60` · `--tempo 0.64/0.8` (Zeitlupe) |
| Ton | `--no-audio` · `--volume klang=prozent` (0–200, mehrfach; `master` = Gesamt, z. B. `--volume splash=150`) |
| Qualität | `--crf 20` · `--bitrate 12M` (statt CRF) · `--preset medium` (x264) |
| Seeschlacht-Kürzel | `--ships` · `--cannons` · `--fire-rate` · `--speed` · `--intensity` · `--no-recycle` · `--no-golden` · `--no-sky` · `--no-meteors` · `--no-whales` |
| Technik | `--out datei.mp4` · `--gpu` / `--no-gpu` · `--jpeg-quality 0.92` · `--script szenario.js` |

Neben jedes Video schreibt der Export eine **JSON-Datei als Wiederholungsrezept**: normalisierte Konfiguration
inklusive tatsächlich verwendeter Encoderwerte, JPEG-Qualität und Rendererwahl, Zustand-Hash, Audioereignis-Hash
und Audioprüfsumme. Dazu kommen Git-Commit/Branch und Arbeitsverzeichnisstatus (`clean`, `dirty`, `unavailable`),
Node-, Playwright-, Chromium-, Pixi-, Matter-, FFmpeg- und ffprobe-Version. Zusatzskripte werden mit Pfad und SHA-256
verzeichnet. Ein `dirty`-Stand enthält Änderungen außerhalb des Commits; die JSON archiviert deren Inhalt nicht.

`node export.mjs --config output/<video>.json` übernimmt Konfiguration und Capturewerte. Explizite CLI-Optionen
überschreiben diese Werte. Zusatzskripte müssen nach Prüfung erneut mit `--script` angegeben werden; eine JSON
führt selbst keine Skripte aus und bestimmt keinen Ausgabepfad. Alte Vorlagen bleiben lesbar; fehlen Werte, gelten
die Defaults des aktuellen Programmstands. Die Oberfläche lädt weiterhin die Szenario-/Videoeinstellungen;
für die Wiederholung einschließlich JPEG-/Rendererwahl die CLI verwenden. Gleiche Pixel über verschiedene
Renderer oder Programmversionen hinweg sind damit nicht zugesichert.

Oberfläche und CLI zeigen Start, Bilder, Encoderabschluss, Klänge laden, Audiomix, Muxen, Prüfung und Speichern
getrennt. Der Audiomix läuft im Worker; der Server bleibt für Status und Abbruch erreichbar. Strg+C bzw. „Abbrechen“
beendet aktive Prozesse/Worker und räumt temporäre Dateien auf. Erst nach ffprobe- und Simulationsprüfung werden
MP4 und JSON übernommen. Bei gewöhnlichen Fehlern oder Abbruch werden vorhandene Zieldateien wiederhergestellt.
Ein Stromausfall oder erzwungenes Prozessende während der Dateiumbenennungen ist nicht durch eine
atomare Transaktion über beide Dateien abgesichert. Scheitert die Wiederherstellung selbst, bleiben die Sicherungen
im gemeldeten `.ebs-export-*`-Ordner zur manuellen Wiederherstellung erhalten.

Der Workflow [Production checks](.github/workflows/ci.yml) installiert Node 22.17.1, die per Lockfile gebundene
Playwright-/Chromium-Fassung und FFmpeg auf Ubuntu 24.04. Er führt bei Push/PR die vollständige Suite mit
Software-Rendering (`EBS_GPU=0`) aus und bewahrt Versions- und Testprotokolle auf. Die Golden-Prüfung ist Teil
der Suite; Referenzen werden dabei nicht neu geschrieben. Der erste GitHub-Runnerlauf bleibt bis zum Push offen.
Aktueller Prüfstand und Grenzen: [Produktionsabsicherung](docs/PRODUKTIONSSICHERUNG_2026-11-12.md).

## Aufbau

```
index.html                 Oberfläche (HTML/CSS) + Einbindung der Skripte
src/core.js                Kern: Physik-Takt, Video-Einstellungen, Konfigurationsschema, Szenario-Registry,
                           Zufall, Partikel, Session (Szenario <-> Bühne), Export-Schnittstelle window.exportAPI
src/scenarios/naval.js     Szenario „Endless Naval Battle“ (Simulation + Renderer + Registrierung)
src/scenarios/marble.js    Szenario „Endless Marble Factory“ (Bahnen, Simulation, Canvas-Grafik, Renderer)
scripts/screenshot.mjs     Einzelbild der laufenden Simulation als PNG (gleiche Seite wie der Export)
scripts/golden-hashes.mjs  Referenz-Hashes der Simulation prüfen (npm run golden) oder neu schreiben (npm run golden:write)
scripts/marble-metrics.mjs Messwerte der Kugelfabrik (Umläufe, Rütteln, Verweildauer) als Markdown-Tabelle
scripts/vendor.mjs         Browser-Builds von PixiJS und Matter.js nach vendor/ kopieren (npm run vendor)
docs/                      ROADMAP.md (offene Punkte), CHANGELOG.md (Erledigtes), Berichte je Schritt, Audit,
                           Referenzbilder (reference/) und Nachweise (nachweise/)
src/app.js                 Live-Bedienfeld und Export-Modus – kennt keine Schiffe, nur die Registrierung
lib/exporter.mjs           Export-Pipeline: Playwright rendert Frames -> Pipe -> FFmpeg (H.264) -> ffprobe-Prüfung
lib/browser.mjs            Chromium-Start (GPU mit automatischem Software-Fallback), Export-Seite öffnen
lib/audio.mjs              Tonspur: Samples dekodieren, Ereignisse deterministisch mischen, WAV schreiben
lib/audio-job.mjs          Abbrechbarer Audiomix im Worker (audio-worker.mjs)
lib/process.mjs            Abbrechbare Kindprozesse, Rückgabe erst nach Prozessende
lib/output.mjs             Geprüfte Dateien übernehmen und bei Fehlern zurückrollen
lib/provenance.mjs         Programmstand, Skriptprüfsummen und sichere Wiederholungsoptionen
assets/audio/              Sounds (Kenney Impact Sounds, CC0) mit Zuordnung und Lizenznachweis
export.mjs                 Kommandozeile
server.mjs                 Statischer Server + Export-API für den Button (/api/export, /api/export/cancel, /api/health)
start.bat                  Start per Doppelklick unter Windows (prüft Node.js und FFmpeg, startet Server und Browser)
presets/*.json             Konfigurationsvorlagen
test/*.test.mjs            Kern-, Simulations-, Export- und Browsertests (node:test)
test/fixtures/             Minimales Testszenario (beweist, dass Kern und Export szenariounabhängig sind), Referenz-Hashes
vendor/                    PixiJS- und Matter.js-Browser-Builds (per `npm run vendor` aus node_modules kopiert)
.github/workflows/pages.yml  Online-Vorschau über GitHub Pages (liefert index.html, src/ und vendor/ aus)
output/                    erzeugte Videos, JSON-Dateien, Screenshots (nicht im Repository)
```

Alle Browser-Dateien sind klassische Skripte (keine ES-Module), damit `index.html` auch per `file://` läuft.

## Konfigurationsschema (Version 1)

```json
{
  "version": 1,
  "scenario": "naval",
  "seed": 42,
  "params": { "ships": 2, "cannons": 4, "fireRate": 1, "projectileSpeed": 1, "intensity": 0.35, "ballsPerCannon": 5, "recycleVisible": true,
              "goldenBall": true, "sky": true, "skyMinutes": 0, "meteors": true, "meteorEvery": 75, "whales": true, "whaleEvery": 210 },
  "video":  { "aspect": "9:16", "resolution": 1080, "fps": 30, "durationSec": 45, "tempo": 1,
              "audio": true, "volume": { "master": 100, "shot": 100, "hit": 100, "splash": 100, "land": 100, "reload": 100 },
              "quality": { "crf": 20, "preset": "medium", "bitrate": null } },
  "view":   { "hud": true, "camera": true }
}
```

- `params` gehört dem Szenario (es normalisiert und begrenzt seine Werte selbst), `video` und `view` dem Kern.
- `video.volume`: Lautstärke in Prozent (0–200, Standard 100) – Gesamt (`master`) und je Klang der Klangtabelle des
  Szenarios; unbekannte Klänge fallen weg (siehe [Ton](#ton)).
- Fehlende oder ungültige Werte werden auf Standardwerte bzw. Grenzen gesetzt; die Seite ist die einzige Stelle, die das
  entscheidet (CLI, Server und Oberfläche reichen Konfigurationen nur weiter).
- **Videolänge:** Standard 45 Sekunden, frei wählbar von 1 s bis 4 h. In der Oberfläche als Eingabe (`45`, `45s`, `5m`,
  `1h`) mit Schnellwahl; die Kommandozeile nimmt ohne Vorlage weiterhin 20 s.
- **Szenario:** Fehlt die Angabe, startet das Standard-Szenario. Eine ausdrücklich genannte, aber unbekannte ID wird
  abgelehnt (`Unbekanntes Szenario "…". Verfügbar: naval, marble`) – in Kommandozeile, Export-API und Export-Seite.
  Die Live-Ansicht zeigt in diesem Fall eine Meldung und startet das Standard-Szenario.
- Das flache Phase-A-Format (`{ "seed": 42, "format": "landscape", "ships": 3 }`) wird weiterhin akzeptiert.

## Wie es funktioniert

**Logische Welt und Ausgabeauflösung sind getrennt.** Szenarien rechnen in einer logischen Welt mit kurzer Seite
1080 (9:16 = 1080×1920, 16:9 = 1920×1080, 1:1 = 1080×1080). Die Ausgabeauflösung (720p … 4K) skaliert nur das Bild.
Dieselbe Schlacht sieht in 720p und 4K also exakt gleich aus (per Test geprüft).

**Deterministischer Export.** Physik läuft immer mit festem Zeitschritt 1/60 s. Pro Videoframe werden genau 60/fps
Physikschritte gerechnet (2 bei 30 fps, 1 bei 60 fps), dann wird das Bild gerendert, als JPEG aus dem Canvas gelesen
und direkt per Pipe an FFmpeg gegeben – keine Einzelbilder auf der Platte. Renderdauer, Bildrate und Echtzeit haben
keinen Einfluss auf die Physik. Alle Zufallswerte kommen aus Seed-basierten Generatoren (Physik / Effekte getrennt),
Matter.js-interne Zähler werden beim Start zurückgesetzt. Gleicher Seed ⇒ identischer Ablauf.

**Tempo / Zeitlupe.** `video.tempo` (0.64, 0.8 oder 1, im Bedienfeld „0.64×“ und „0.8×“ bei der Simulationsgeschwindigkeit) verkleinert
den Physik-Zeitschritt auf tempo × 1/60 s. Pro Videoframe werden weiterhin gleich viele Schritte gerechnet, der Clip
läuft also flüssig in Zeitlupe statt mit wiederholten Frames. Die Uhr im HUD zeigt die Videozeit. Bei tempo 1 ist der
Ablauf bitgleich zu vorher.

**Sprache im Video.** Alle Texte, die im Clip selbst erscheinen (HUD, Teamnamen, Zähler), sind englisch; das
Bedienfeld bleibt deutsch.

**Geschoss-Kreislauf.** Zu Beginn hat jedes Schiff gleich viele Kugeln (Kanonen × Kugeln je Kanone, Standard 5).
Zustände: `Magazin → Flug (Matter.js) → Wasserkontakt → Sinken → Mulde am Meeresgrund → Messingsockel → Glasrohr durch
den Kiel → Magazin`. Der Meeresgrund hat unter jedem Heck eine Mulde, dazwischen einen flachen Rücken, und steigt zu den
Bildrändern an: Jede Kugel rollt bergab zum Sockel, egal wo sie landet. Kugeln werden nie erzeugt oder gelöscht, nur
wiederverwendet. Ist das Magazin leer, warten die Kanonen – das begrenzt die Feuerrate automatisch.

- **Duell (zwei Schiffe): Beuteprinzip.** Eine Kugel gehört dem Schiff, in dessen Mulde sie landet. Unter Wasser ist sie
  neutral, im Glasrohr nimmt sie die Teamfarbe des neuen Besitzers an, der sie zurückschießt. Damit sich die Munition
  nicht bei einem Schiff sammelt, feuert ein volles Regal bis zu 30 % schneller und ein leeres bis zu 15 % langsamer.
- **Drei und vier Schiffe:** Jedes Schiff behält seine Kugeln. Sie rollen in den Sockel der Mulde, in der sie liegen, und
  laufen von dort durch eine Leitung im Sand zum eigenen Rohr. Mit Beuteprinzip fangen die mittleren Schiffe fast alles
  ab und die äußeren stehen ohne Munition da (gemessen, siehe [Bericht](docs/NAVAL_MULDEN_LIFT.md)).

Kugeln, die an Deck liegen bleiben, werden Richtung Bug angestoßen; nur im Notfall (> 3 Stöße oder > 15 s Flugzeit)
fallen sie durch den Rumpf ins Wasser (hochkant ≈ 0,7 %, quer ≈ 2 % der Schüsse).

**Anzeige.** Hochkant stehen Titel, Zähler und Lebensbalken oben. Im Querformat mit zwei Schiffen stehen die
Lebensbalken in den oberen Ecken, der Titel blendet nach 5 s aus, Zeit und Zähler stehen unten in der Mitte – die
Bildmitte oben bleibt frei für die Flugbahnen.

**Schaden & Stabilisierung.** Pro Treffer: `Δ = 0,0026 × Intensität × Faktor × (1 − Schaden)²`. Die Dämpfung,
eine Reparatur der Crew ab 68 % und eine harte Grenze von 90 % verhindern, dass ein Schiff zerstört wird. Sichtbare
Löcher folgen dem Schadenswert (max. 26 offen, ältere werden geflickt), dazu Rauch, ab 35 % Feuer, Absinken,
Schlagseite und dunklerer Rumpf. Gemessener Verlauf bei 35 %: **1 min ≈ 3 % · 10 min ≈ 23 % · 30 min ≈ 47 % ·
60 min ≈ 64 %**. Alle Stellschrauben stehen im Objekt `TUNING` in `src/scenarios/naval.js`.

## Erweiterbarkeit

| Anforderung | Stand | Wo es andockt |
|---|---|---|
| 720p / 1080p / 1440p / 4K | Kern, CLI und Oberfläche, getestet (720p, 1080p, 4K) | `EBS.RESOLUTIONS`, `videoSize()` in `src/core.js` |
| 30 und 60 FPS | Kern, CLI und Oberfläche, getestet | `EBS.FPS_OPTIONS`; Physik bleibt bei 60 Hz |
| 9:16, 16:9, 1:1 | 9:16 und 16:9 in der Oberfläche; 1:1 in Kern + CLI, getestet | `EBS.ASPECTS`; Oberfläche: `UI_ASPECTS` in `src/app.js` |
| Zeitlupe | 0,64× und 0,8× in Kern, CLI und Oberfläche | `EBS.TEMPO_OPTIONS`; Szenario rechnet mit `timeScale` |
| Videoqualität / Bitrate | CRF, x264-Preset, feste Bitrate in CLI und Schema (nicht in der Oberfläche) | `video.quality`; `encoderArgs()` in `lib/exporter.mjs` |
| Frei wählbare Dauer | CLI, Schema und Oberfläche frei (1 s – 4 h); Oberfläche zusätzlich mit Schnellwahl | `UI_DURATIONS`, `parseDuration()` in `src/app.js` |
| Ton und Lautstärke | Tonspur aus Ereignissen, −14 LUFS, Regler gesamt und je Klang in Oberfläche, CLI und Schema | `audio` in der Szenario-Registrierung; `lib/audio.mjs` |
| Vorlagen und Seeds speichern | `presets/*.json`, `--config`, JSON neben jedem Video; Oberfläche: Teilen-Link, JSON speichern und laden, letzte Konfiguration bleibt erhalten | „Einstellungen teilen“ in `src/app.js` |
| Modulare Szenarien | Registry + Schnittstelle fertig; Bedienfeld, Statistiken, Ton-Regler, Export und Tests arbeiten szenariounabhängig | `EBS.registerScenario(...)` |

### Neues Szenario anlegen

1. Datei `src/scenarios/<name>.js` anlegen (Vorlage: `test/fixtures/dummy-scenario.js`, Vollbeispiele: `naval.js`, `marble.js`).
2. Darin `EBS.registerScenario({ id, title, defaults, controls, normalizeParams, create, createRenderer, panelStats })`,
   optional `panelNote` und `audio` (Klangtabelle).
   - `create({ seed, params, world, view, timeScale })` liefert die Simulation mit `stepOnce()`, `t`, `step`,
     `snapshot()`, `checkInvariants()`, `stateHash()`, `destroy()`; für Ton zusätzlich `events` und `eventSeq`.
   - `createRenderer({ app, sim, view, world, renderScale })` liefert `{ root, draw(), destroy() }`.
   - `controls` beschreibt die Regler; das Bedienfeld erzeugt sie automatisch, ebenso die Ton-Regler aus `audio`.
3. Eine `<script>`-Zeile in `index.html` ergänzen – oder ohne Änderung testen: `node export.mjs --script <datei> --scenario <id>`.
4. Szenario in `scripts/golden-hashes.mjs` aufnehmen (`npm run golden:write`) und eine eigene Testdatei anlegen.

Kern, Partikelpool, Bühne, Export-Pipeline, Mischer, Server und CLI bleiben dabei unverändert. Die vollständige
Checkliste (Determinismus, Matter.js-Reset, Ereignisformat, Parameternamen) steht im
[Audit, Abschnitt 4](docs/AUDIT_2026-11-12.md#4--checkliste-für-ein-neues-szenario).

## Endless Marble Factory

Auswahl in der Oberfläche über **Szenario**, per Kommandozeile mit `--scenario marble`. Regler: Anzahl der Kugeln
(20–35, Standard 35) und Kugeln je Farbröhre (1–3, Standard 2).

**Kreislauf.** `Glasbehälter → Zellenrad → Fallrohr → Förderband → Scanner → Sortierrohr mit Klappen → Farbröhre mit
Ventil → Sammelschiene → Kettenaufzug → Rücklaufrohr → Glasbehälter`. Kugeln werden nie erzeugt oder gelöscht.

**Physik nur dort, wo man sie sieht.** Im Glasbehälter rechnet Matter.js (Haufen, Nachrutschen). Alle anderen Wege
sind Bahnen mit Bogenlängen-Parametrisierung: Rollbeschleunigung aus der Bahnneigung, Rollwiderstand, Mindest- und
Höchsttempo je Abschnitt sowie Stau-Logik (keine Überlappung, Warten vor Klappen, Ventilen und Aufzug). Übergänge
zwischen Stationen liegen exakt aufeinander; ein Test prüft, dass keine Kugel pro Physikschritt mehr als 20 Einheiten
springt (gemessen ≈ 13).

**Mechanik ist gekoppelt, nicht dekorativ.** Der Zahnradzug (12/22/30/10 Zähne, Modul 6) hängt an der Welle der
Bandtrommel; Drehwinkel und Zahnphasen folgen aus dem Bandweg und den Zähneverhältnissen. Bandstollen, Trommeln,
Stützrollen, Kettenräder, Kettenglieder und Träger des Aufzugs bewegen sich mit derselben Geschwindigkeit wie die
Kugeln, die sie tragen. Klappen öffnen nur für die passende Farbe, Ventile halten den Puffer je Röhre.

**Zwei Layouts, eine Simulation.** `computeLayout()` ordnet die Baugruppen für 16:9 (Kreislauf im Uhrzeigersinn,
lange Sammelschiene) und 9:16 (Zickzack von oben nach unten, U-Bogen vor dem Sortierer) unterschiedlich an und
erzeugt daraus die Bahnen. Simulation, Renderer und Tests sind für beide identisch. 1:1 nutzt das Querformat-Layout
verkleinert (nicht eigens gestaltet).

**Einlaufphase.** Die Simulation rechnet beim Start 30 s vor (`warmup`), damit ein Video mit laufender Anlage beginnt.

**Grafik ausschließlich per Code** (Canvas 2D → PixiJS-Texturen, keine Bilddateien):

| Baugruppe | Umsetzung |
|---|---|
| Halle | Wandplatten, Träger, ferne Rohre, Boden mit Warnstreifen, warme Lichtbänder mit Lichtkegeln, Vignette |
| Glaskugeln | Radialverlauf je Farbe, Kaustik-Aufhellung, rotierendes „Katzenauge“, feststehender Glanzpunkt, additiver Farbschein, Kontaktschatten auf Band und Schiene |
| Glasrohre | Rückseite (Tönung, Wandschatten) + Vorderseite (versetzte Lichtreflexe, auf das Rohrinnere beschnitten; helle Glaskante), Stahl-/Messingmanschetten |
| Glasbehälter | einseitig geneigter Boden mit senkrechter Wand über dem Hals; getöntes Glas, Reflexbänder, Stahldeckel, Messingkragen |
| Zellenrad | rotierender Rotor mit vier Taschen hinter Glasdeckel, Stahlring mit Schrauben, Messingnabe |
| Förderband | Bandschleife mit umlaufenden Stollen, Trommeln, Stützrollen, Seitenwange, LED-Leiste |
| Zahnräder | Zahnprofil, Drehriefen, vertiefter Steg, Messingnabe; darüber feststehender Glanzkeil (wirkt metallisch, während sich das Rad darunter dreht) |
| Sortierer | Gehäuse, Scanner mit Farbblitz, sechs Messingklappen, Farbröhren mit Leuchtring, Ventilstifte, Funken und Lichtsäule beim Einsortieren |
| Aufzug | Kette aus Einzelgliedern, Kettenräder, Messingträger, Glasschacht |
| Sammelschiene | zwei Rundstäbe mit Messingklemmen und Stützen |
| Antrieb / Schaltschrank | Motorgehäuse mit Kühlrippen, Manometer, pulsierende Kontrollleuchten |
| Anzeige | Leuchtschrift, Zähler je Farbe, Umläufe, Zeit (über „HUD einblenden“ abschaltbar) |

**Gemessen (Kugelfabrik, AMD Radeon iGPU):** Live-Ansicht 1920×1080 60 FPS · Export-Frame (2 Physikschritte + Rendern
+ JPEG) 1080p quer 20,8 ms (≈ 48 Frames/s), 1080p hochkant 28,0 ms (≈ 36 Frames/s), 720p 10,4 ms (≈ 96 Frames/s) ·
8-s-Testvideo 720p30 komplett in 7 s (≈ 35 Frames/s inkl. Browserstart und Encoder) · reine Simulation: 10 Minuten
Simzeit in 2–3,5 s · JS-Heap nach 30 Minuten Simzeit unverändert ≈ 11 MB.

**Bekannte Schwächen**

- **Behälter (seit Schritt 2 entschärft):** Der frühere symmetrische Trichter ließ zwei Kugeln über dem Hals
  verkeilen und hatte eine tote Zone an der Flanke gegenüber dem Einlauf. Jetzt fällt der Boden einseitig zum Hals.
  Gemessen über 16 Läufe von je 10 Minuten: Rütteln insgesamt 1× (vorher 4–62× je Lauf), 494–501 von 500 möglichen
  Umläufen (vorher 430–475), längste Verweildauer 11–19 s (vorher 40–72 s). Brückenbrecher, Vorrang für lange
  liegende Kugeln und Rütteln bleiben als Sicherung erhalten; der Brückenbrecher greift weiterhin 240–480× je
  10 Minuten kurz ein (kleiner Schubs, wenn der Hals länger als 0,5 s leer bleibt).
- Die grüne Farbe hat bei 35 Kugeln nur 5 statt 6 Kugeln und wird entsprechend seltener sortiert.
- 1:1 ist nicht eigens gestaltet (verkleinertes Querformat-Layout).

## Seeschlacht: Himmel, seltene Ereignisse und goldene Kugel

Reine Darstellung – der Physikverlauf und die Referenz-Hashes bleiben unverändert. Die Standardwerte sind so gewählt,
dass jedes Video je nach Länge das passende Maß bekommt; alles ist im Bedienfeld einzeln schalt- und einstellbar und
steht in `params` (Teilen-Link, JSON, `--param`).

| Was | Standard | Einstellbar |
|---|---|---|
| **Goldene Kugel** (`goldenBall`) – eine Kugel ist golden, mit goldener Spur und Schimmer; der Zähler „GOLDEN BALL · fired 12×“ steht im Hochformat unter den Lebensbalken, im Querformat-Duell oben mittig, sobald der Titel ausgeblendet ist. Es ist die Kugel, die ein per Seed gewähltes Schiff als erste abfeuert; weil das Regal „zuletzt hinein, zuerst hinaus“ arbeitet, fliegt sie auch im 20-s-Short mehrmals (≈ alle 10–12 s) und wechselt im Duell die Seiten. | an | an/aus |
| **Himmelsverlauf** (`sky`, `skyMinutes`) – die Nacht vergeht: Morgengrauen am Horizont, Sterne verblassen, Wolken färben sich rosa; der Mond bleibt sichtbar. | an · Morgengrauen am Videoende, mindestens nach 10 min (im Short bleibt es Nacht) | an/aus · Morgengrauen nach 5 min … 2 h |
| **Sternschnuppe** (`meteors`, `meteorEvery`) – knapp 1 s lang. Jedes Video ab 8 s zeigt mindestens eine (im Short etwa in der Mitte). | an · etwa alle 75 s (10 min ≈ 6–10) | an/aus · 20–300 s (`--param` bis 600 s) |
| **Wal am Horizont** (`whales`, `whaleEvery`) – taucht 8 s lang im Mondlicht zwischen den Schiffen auf, bläst und taucht mit der Schwanzflosse ab. Bleibt selten: mit dem Standard erst in Videos ab ≈ 1–2,5 min. | an · etwa alle 3½ min (10 min ≈ 2–4) | an/aus · 30 s – 15 min (`--param` bis 30 min) |

Die Zeitpunkte stehen als fester Fahrplan aus Seed und Einstellungen fest (gleiche Konfiguration = gleiches Video) und
laufen in Videozeit, auch in Zeitlupe. Kommandozeile: `--no-golden`, `--no-sky`, `--no-meteors`, `--no-whales`, Feinwerte
mit `--param skyMinutes=20 --param meteorEvery=40 --param whaleEvery=120`.

## Ton

Beide Szenarien exportieren mit Tonspur (AAC, 48 kHz, Stereo). Die Seeschlacht nutzt bewusst wenige Klänge:
Kanonenschuss und Platscher (im Code erzeugt), Holzaufschlag für Treffer und leise den Kreislauf – ein dumpfes „Tock“,
wenn eine Kugel am Grund aufsetzt, und ein „Tink“, wenn sie im Regal ankommt (je rund 14 LU unter der Gesamtmischung,
etwa so leise wie der Platscher); eine Dichtebegrenzung je Klang verhindert
Ton-Chaos. Abschalten:
`--no-audio`, `"video": { "audio": false }` oder der Schalter „Ton im exportierten Video“. Die Vorschau im Browser
bleibt stumm.

**Lautheit nach YouTube-Standard:** Jede Tonspur wird beim Export eingemessen, sodass die Standardmischung (alle
Regler 100 %) **−14 LUFS** integriert erreicht (Messung nach ITU-R BS.1770 / EBU R128, für jedes Video einzeln). Ein
Spitzenbegrenzer mit 5 ms Vorausschau hält die Spitzen bei höchstens −1,5 dBFS (True Peak nach AAC unter −1 dBTP).

**Lautstärke regeln:** In der Karte „Ton“ gibt es einen Gesamtregler und einen Regler je Klang (Seeschlacht:
Kanonenschuss, Treffer, Platscher, Kugel am Grund, Nachladen; Kugelfabrik: neun Klänge), jeweils **0–200 %**, Standard 100 % = YouTube-Ziel.
Nach links leiser, nach rechts lauter (200 % = +6 dB, 50 % = −6 dB, 0 % = Klang aus). Der Gesamtregler wirkt unter
100 % hinter dem Begrenzer (50 % ergibt genau −20 LUFS), darüber treibt er in den Begrenzer: lauter, die Spitzen
bleiben begrenzt. Die Werte gelten für jedes Format (Hoch- und Querformat), werden gespeichert und stehen im
Teilen-Link (`vol.splash=40`) und in der JSON-Datei (`"video": { "volume": { "master": 80, "splash": 150 } }`).
Per Kommandozeile: `--volume master=80 --volume splash=150`. Die Simulation bleibt davon unberührt.

- **Ereignisse statt Aufnahme:** Die Simulation protokolliert, was passiert (Aufnahme am Zellenrad, Landung auf dem
  Band, Klappe, Aufprall in der Röhre, Ventil, Sammelschiene, Aufzug, Fall in den Behälter, Stöße im Behälter).
  Das Protokoll beobachtet nur – die Referenz-Hashes der Simulation sind mit und ohne Ton identisch.
- **Mischung:** `lib/audio.mjs` setzt je Ereignis ein Sample auf den Abtastwert genau (Physikschritt ÷ 60 s, auch in
  Zeitlupe), mit Lautstärke nach Aufprallstärke, Stereoposition nach Bildposition und leichter Verstimmung. Jede
  Farbröhre hat eine eigene Tonhöhe. Danach Einmessung auf −14 LUFS und Begrenzer (siehe oben); die Vorausschau
  verschiebt den Ton nicht gegenüber dem Bild.
- **Reproduzierbar:** Gleiche Konfiguration ergibt dieselbe Tonspur (Prüfsumme in der JSON-Datei neben dem Video).
- **Einbindung:** WAV wird blockweise geschrieben und ohne Neukodierung des Bildes ins MP4 eingebunden.
- **Sounds:** 17 Dateien aus Kenney Impact Sounds (CC0), dazu zwei im Code erzeugte Klänge der Seeschlacht; siehe
  `assets/audio/README.md`.

Mit FFmpeg (`ebur128`) nachgemessen an zwei 12-s-Clips mit Standardreglern (Seeschlacht quer, Kugelfabrik hochkant):
je −14,1 LUFS, True Peak −1,2 dBTP. Die Seeschlacht braucht dafür bis zu 5 dB Begrenzung, die Kugelfabrik wegen des
impulsiven Glasklirrens bis zu 19 dB an den lautesten Stellen. Motor- und Rollgeräusche fehlen.

## Gemessene Leistung (dieser Rechner, AMD Radeon iGPU)

| Vorgang | Ergebnis |
|---|---|
| Live-Ansicht (1080×1920) | ≈ 58 FPS |
| Reine Simulation | 60 Minuten Simzeit in ≈ 8 s |
| Export 1080p30 mit GPU | ≈ 32–36 Frames/s ⇒ 20-s-Video in ≈ 18 s, 60-min-Video geschätzt ≈ 55 min |
| Export 1080p60 | ≈ 28 Frames/s ⇒ 60-min-Video geschätzt ≈ 2 h 10 min |
| Export 1440p30 / 4K30 | ≈ 17 / ≈ 10 Frames/s ⇒ 60-min-Video geschätzt ≈ 1 h 45 min / ≈ 3 h |
| Export ohne GPU (SwiftShader) | ≈ 6 Frames/s bei 1080p ⇒ 60-min-Video geschätzt ≈ 5 h |
| JS-Speicher nach 60 min Simzeit | ≈ 12–23 MB, Partikel/Objekte fest begrenzt |

## Bewertung und bekannte Schwächen

- Optik: dunkle Nachtszene, leuchtende Flugbahnen in Teamfarben, sichtbare Löcher/Flicken, Rauch, Feuer, transparentes
  Wasser mit sichtbarer Recycling-Mechanik, HUD mit Rumpfzustand – auf dem Handy gut lesbar. Der Mond steht über der
  Lücke zwischen den Schiffen und wirft eine Glitzerbahn aufs Wasser und weiche Lichtbahnen darunter; das Mündungsfeuer
  erhellt kurz Segel und Rumpf, an der Wasserlinie schäumt es am Rumpf (reine Darstellung, ohne Einfluss auf die Physik).
- Schiffe sind einfache Vektorgrafik; Segel blähen sich nur leicht, Masten brechen nicht. Treffer auf Masten erscheinen
  als Löcher in den Segeln.
- Ton gibt es nur im exportierten Video; die Vorschau im Browser ist stumm (siehe „Ton“).
- Physik ist deterministisch; die Pixel können sich zwischen GPU- und Software-Renderer minimal unterscheiden.
- Bei 3–4 Schiffen werden die Schiffe kleiner und das Bild voller.
- Ein vollständiger 60-Minuten-**Videoexport** wurde noch nicht durchgeführt; die 60-Minuten-**Simulation** ist getestet.
- Bei 4K bremst die Übergabe der Frames als JPEG/Base64 (≈ 10 Frames/s). Für lange 4K-Videos wäre später eine schnellere
  Übergabe sinnvoll; die Schnittstelle (`renderFrames`) bliebe dabei gleich.
