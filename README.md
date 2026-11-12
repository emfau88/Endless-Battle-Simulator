# Endless Battle Simulator – Phase A (MVP)

### ▶ [Jetzt im Browser öffnen: emfau88.github.io/Endless-Battle-Simulator](https://emfau88.github.io/Endless-Battle-Simulator/)

Direkt zur Kugelfabrik: [hochkant](https://emfau88.github.io/Endless-Battle-Simulator/?scenario=marble) ·
[Querformat](https://emfau88.github.io/Endless-Battle-Simulator/?scenario=marble&aspect=16:9) –
Vorschau und Regler laufen im Browser, auch am Handy. Videos entstehen am eigenen PC (`start.bat`).

Deterministische 2D-Physiksimulation im Stil von Algodoo-/„Satisfying Physics“-Videos mit automatischem MP4-Export.
Erstes Szenario: **Endless Naval Battle** – zwei Schiffe beschießen sich endlos, jede Kanonenkugel läuft in einem
geschlossenen, sichtbaren Kreislauf zurück ins Magazin.

Phase A ist abgeschlossen. Die Architektur ist bereits für weitere Szenarien und Videoformate vorbereitet
(siehe [Erweiterbarkeit](#erweiterbarkeit)).

Zweites Szenario (visueller Prototyp V0.1): **Endless Marble Factory** – eine Kugelfabrik mit geschlossenem Kreislauf,
deren Grafik vollständig im Code entsteht (siehe [Endless Marble Factory](#endless-marble-factory-prototyp-v01)).

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
npm run export -- --duration 5m --seed 7 --aspect 1:1 --resolution 1440 --fps 60 --bitrate 12M
npm test                    # alle automatisierten Tests (≈ 4 min; jeder Test wird nach 2 min automatisch abgebrochen)
npm run marble:test         # Kugelfabrik: 8-s-Testvideo 720p30 -> output/marble_test_8s_720p.mp4
node scripts/screenshot.mjs --scenario marble --aspect 16:9 --at 9 --out output/marble_16x9.png   # Einzelbild (PNG)
```

`index.html` kann auch direkt per Doppelklick geöffnet werden; der Button **Video exportieren** braucht aber den
Server (`npm start`). Ohne Server zeigt er den passenden Kommandozeilenbefehl an.

### Export-Optionen (`node export.mjs --help`)

| Bereich | Optionen |
|---|---|
| Konfiguration | `--config datei.json` · `--scenario id` · `--seed n` · `--param key=wert` (mehrfach) · `--no-hud` · `--no-camera` |
| Video | `--duration 20s/5m/1h` · `--aspect 9:16/16:9/1:1` (oder `--format portrait/landscape/square`) · `--resolution 720/1080/1440/2160` · `--fps 30/60` · `--tempo 0.8` (Zeitlupe) |
| Qualität | `--crf 20` · `--bitrate 12M` (statt CRF) · `--preset medium` (x264) |
| Seeschlacht-Kürzel | `--ships` · `--cannons` · `--fire-rate` · `--speed` · `--intensity` · `--no-recycle` |
| Technik | `--out datei.mp4` · `--gpu` / `--no-gpu` · `--jpeg-quality 0.92` · `--script szenario.js` |

Neben jedes Video schreibt der Export eine **JSON-Datei mit der vollständigen Konfiguration** (inkl. Seed und
Zustand-Hash). `node export.mjs --config output/<video>.json` erzeugt dasselbe Video erneut. Strg+C bricht einen Export
sauber ab (FFmpeg wird beendet, die Teildatei gelöscht).

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
docs/                      Umsetzungsplan, Ausgangsbasis und Referenzbilder
src/app.js                 Live-Bedienfeld und Export-Modus – kennt keine Schiffe, nur die Registrierung
lib/exporter.mjs           Export-Pipeline: Playwright rendert Frames -> Pipe -> FFmpeg (H.264) -> ffprobe-Prüfung
lib/browser.mjs            Chromium-Start (GPU mit automatischem Software-Fallback), Export-Seite öffnen
lib/audio.mjs              Tonspur: Samples dekodieren, Ereignisse deterministisch mischen, WAV schreiben
assets/audio/              Sounds (Kenney Impact Sounds, CC0) mit Zuordnung und Lizenznachweis
export.mjs                 Kommandozeile
server.mjs                 Statischer Server + Export-API für den Button (/api/export, /api/export/cancel, /api/health)
start.bat                  Start per Doppelklick unter Windows (prüft Node.js und FFmpeg, startet Server und Browser)
presets/*.json             Konfigurationsvorlagen
test/*.test.mjs            Kern-, Simulations-, Export- und Browsertests (node:test)
test/fixtures/             Minimales Testszenario (beweist, dass Kern und Export szenariounabhängig sind)
vendor/                    PixiJS- und Matter.js-Browser-Builds (per `npm run vendor` aus node_modules kopiert)
output/                    erzeugte Videos, JSON-Dateien, Screenshots
```

Alle Browser-Dateien sind klassische Skripte (keine ES-Module), damit `index.html` auch per `file://` läuft.

## Konfigurationsschema (Version 1)

```json
{
  "version": 1,
  "scenario": "naval",
  "seed": 42,
  "params": { "ships": 2, "cannons": 4, "fireRate": 1, "projectileSpeed": 1, "intensity": 0.35, "recycleVisible": true },
  "video":  { "aspect": "9:16", "resolution": 1080, "fps": 30, "durationSec": 45, "tempo": 1,
              "quality": { "crf": 20, "preset": "medium", "bitrate": null } },
  "view":   { "hud": true, "camera": true }
}
```

- `params` gehört dem Szenario (es normalisiert und begrenzt seine Werte selbst), `video` und `view` dem Kern.
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

**Geschoss-Kreislauf.** Jedes Schiff besitzt eine feste Anzahl Kugeln (Kanonen × 5). Zustände:
`Magazin → Flug (Matter.js) → Wasserkontakt → Sinken → Förderband → Aufzug → Magazin`. Kugeln werden nie erzeugt oder
gelöscht, nur wiederverwendet. Ist das Magazin leer, warten die Kanonen – das begrenzt die Feuerrate automatisch.
Kugeln, die an Deck liegen bleiben, werden Richtung Bug angestoßen; nur im Notfall (> 3 Stöße oder > 15 s Flugzeit)
fallen sie durch den Rumpf ins Wasser (≈ 0,4 % der Schüsse).

**Schaden & Stabilisierung.** Pro Treffer: `Δ = 0,0026 × Intensität × Faktor × (1 − Schaden)²`. Die Dämpfung,
eine Reparatur der Crew ab 68 % und eine harte Grenze von 90 % verhindern, dass ein Schiff zerstört wird. Sichtbare
Löcher folgen dem Schadenswert (max. 26 offen, ältere werden geflickt), dazu Rauch, ab 35 % Feuer, Absinken,
Schlagseite und dunklerer Rumpf. Gemessener Verlauf bei 35 %: **1 min ≈ 3 % · 10 min ≈ 23 % · 30 min ≈ 47 % ·
60 min ≈ 64 %**. Alle Stellschrauben stehen im Objekt `TUNING` in `src/scenarios/naval.js`.

## Erweiterbarkeit

| Anforderung | Stand | Wo es andockt |
|---|---|---|
| 720p / 1080p / 1440p / 4K | im Kern und in der CLI fertig, getestet (720p, 1080p, 4K); Oberfläche bietet noch nur 1080p | `EBS.RESOLUTIONS`, `videoSize()` in `src/core.js` |
| 30 und 60 FPS | Kern + CLI fertig, getestet | `EBS.FPS_OPTIONS`; Physik bleibt bei 60 Hz |
| 9:16, 16:9, 1:1 | 9:16 und 16:9 in der Oberfläche; 1:1 in Kern + CLI, getestet | `EBS.ASPECTS`; Oberfläche: `UI_ASPECTS` in `src/app.js` |
| Videoqualität / Bitrate | CRF, x264-Preset, feste Bitrate in CLI und Schema | `video.quality`; `encoderArgs()` in `lib/exporter.mjs` |
| Frei wählbare Dauer | CLI, Schema und Oberfläche frei (1 s – 4 h); Oberfläche zusätzlich mit Schnellwahl | `UI_DURATIONS`, `parseDuration()` in `src/app.js` |
| Vorlagen und Seeds speichern | `presets/*.json`, `--config`, JSON neben jedem Video; Oberfläche merkt sich die letzte Konfiguration | Verwaltung in der Oberfläche noch offen |
| Modulare Szenarien | Registry + Schnittstelle fertig; Bedienfeld, Statistiken, Export und Tests arbeiten szenariounabhängig | `EBS.registerScenario(...)` |

### Neues Szenario anlegen

1. Datei `src/scenarios/<name>.js` anlegen (Vorlage: `test/fixtures/dummy-scenario.js`, Vollbeispiel: `naval.js`).
2. Darin `EBS.registerScenario({ id, title, defaults, controls, normalizeParams, create, createRenderer, panelStats })`.
   - `create({ seed, params, world, view })` liefert die Simulation mit `stepOnce()`, `t`, `snapshot()`,
     `checkInvariants()`, `stateHash()`, `destroy()`.
   - `createRenderer({ app, sim, view, world, renderScale })` liefert `{ root, draw(), destroy() }`.
   - `controls` beschreibt die Regler; das Bedienfeld erzeugt sie automatisch.
3. Eine `<script>`-Zeile in `index.html` ergänzen – oder ohne Änderung testen: `node export.mjs --script <datei> --scenario <id>`.

Kern, Partikelpool, Bühne, Export-Pipeline, Server und CLI bleiben dabei unverändert.

## Endless Marble Factory (Prototyp V0.1)

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

**Bekannte Schwächen des Prototyps**

- **Behälter (seit Schritt 2 entschärft):** Der frühere symmetrische Trichter ließ zwei Kugeln über dem Hals
  verkeilen und hatte eine tote Zone an der Flanke gegenüber dem Einlauf. Jetzt fällt der Boden einseitig zum Hals.
  Gemessen über 16 Läufe von je 10 Minuten: Rütteln insgesamt 1× (vorher 4–62× je Lauf), 494–501 von 500 möglichen
  Umläufen (vorher 430–475), längste Verweildauer 11–19 s (vorher 40–72 s). Brückenbrecher, Vorrang für lange
  liegende Kugeln und Rütteln bleiben als Sicherung erhalten; der Brückenbrecher greift weiterhin 240–480× je
  10 Minuten kurz ein (kleiner Schubs, wenn der Hals länger als 0,5 s leer bleibt).
- Die grüne Farbe hat bei 35 Kugeln nur 5 statt 6 Kugeln und wird entsprechend seltener sortiert.
- 1:1 ist nicht eigens gestaltet (verkleinertes Querformat-Layout).

## Ton

Beide Szenarien exportieren mit Tonspur (AAC, 48 kHz, Stereo). Die Seeschlacht nutzt bewusst nur drei Klänge:
Kanonenschuss und Platscher (im Code erzeugt) und Holzaufschlag für Treffer; eine Dichtebegrenzung je Klang verhindert
Ton-Chaos. Abschalten:
`--no-audio`, `"video": { "audio": false }` oder der Schalter „Ton im exportierten Video“. Die Vorschau im Browser
bleibt stumm.

**Lautheit nach YouTube-Standard:** Jede Tonspur wird beim Export eingemessen, sodass die Standardmischung (alle
Regler 100 %) **−14 LUFS** integriert erreicht (Messung nach ITU-R BS.1770 / EBU R128, für jedes Video einzeln). Ein
Spitzenbegrenzer mit 5 ms Vorausschau hält die Spitzen bei höchstens −1,5 dBFS (True Peak nach AAC unter −1 dBTP).

**Lautstärke regeln:** In der Karte „Ton“ gibt es einen Gesamtregler und einen Regler je Klang (Seeschlacht:
Kanonenschuss, Treffer, Platscher; Kugelfabrik: neun Klänge), jeweils **0–200 %**, Standard 100 % = YouTube-Ziel.
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
- **Sounds:** zehn Dateien aus Kenney Impact Sounds (CC0), siehe `assets/audio/README.md`.

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
  Wasser mit sichtbarer Recycling-Mechanik, HUD mit Rumpfzustand – auf dem Handy gut lesbar.
- Schiffe sind einfache Vektorgrafik; Segel blähen sich nur leicht, Masten brechen nicht. Treffer auf Masten erscheinen
  als Löcher in den Segeln.
- Ton gibt es nur im exportierten Video; die Vorschau im Browser ist stumm (siehe „Ton“).
- Physik ist deterministisch; die Pixel können sich zwischen GPU- und Software-Renderer minimal unterscheiden.
- Bei 3–4 Schiffen werden die Schiffe kleiner und das Bild voller.
- Ein vollständiger 60-Minuten-**Videoexport** wurde noch nicht durchgeführt; die 60-Minuten-**Simulation** ist getestet.
- Bei 4K bremst die Übergabe der Frames als JPEG/Base64 (≈ 10 Frames/s). Für lange 4K-Videos wäre später eine schnellere
  Übergabe sinnvoll; die Schnittstelle (`renderFrames`) bliebe dabei gleich.
