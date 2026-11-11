# Schritte W1 und W2 · Playlink, Handybedienung, Start per Doppelklick

**Datum:** 11.11.2026 · **Ausgangs-Commit:** `fad2cb4` (Schritt 4) · **Branch:** `w1-playlink`
**Betroffene Dateien:** `src/app.js`, `index.html`, neu `start.bat`, `.nojekyll`, `test/share.test.mjs`, `README.md`.
Simulation, Renderer und Export unverändert.

## W1 · Playlink und Handybedienung

**Adresse:** https://emfau88.github.io/Endless-Battle-Simulator/ (GitHub Pages über GitHub Actions; der Workflow `.github/workflows/pages.yml` liefert bei jedem Push auf `main` nur `index.html`, `src/` und `vendor/` aus).

| Punkt | Umsetzung |
|---|---|
| Öffentlicher Vorschau-Link | GitHub Pages war bereits auf „GitHub Actions“ gestellt; ein Workflow liefert die Seite aus; die Seite läuft unter dem Unterpfad des Repositorys, weil alle Pfade relativ sind |
| Export online | Ohne Export-Server heißt der Knopf „Export nur am eigenen PC – Befehl anzeigen“; ein Hinweis erklärt, dass Vorschau und Regler hier funktionieren und das Video am eigenen PC entsteht. Ein Klick zeigt `start.bat` und den passenden Kommandozeilenbefehl |
| Handyoberfläche | Bedienfeld unter der Vorschau, kein seitliches Scrollen, Bedienflächen mindestens 44 px hoch, 16 px Schrift in Eingabefeldern (verhindert das automatische Hineinzoomen am iPhone) |
| Teilen-Link | „Einstellungen teilen“ zeigt einen Link mit Szenario, Seed, Reglern, Format, Dauer, Tempo, Ton, HUD und Kamera; ein frischer Browser stellt daraus dieselbe Szene her |
| JSON | Einstellungen speichern und laden; geladen werden auch die JSON-Dateien neben exportierten Videos. Fehlerhafte Dateien und unbekannte Szenarien werden gemeldet, ohne die Einstellungen zu verändern |

Der Server-Betrieb am PC ist unverändert: Dort bleibt der Knopf „Video exportieren“.

### Prüfliste für das echte Handy (deine Aufgabe)

- [ ] Link öffnen: Erscheint die Kugelfabrik innerhalb weniger Sekunden?
- [ ] FPS-Anzeige im Bedienfeld ablesen (Ziel: flüssig, deutlich über 30).
- [ ] Szenario wechseln, Format wechseln, Geschwindigkeit 0,8× und 10× antippen.
- [ ] Regler mit dem Finger ziehen; Seed und Videolänge eintippen (zoomt die Seite dabei ungewollt?).
- [ ] „Kopieren“ antippen und den Link in einem anderen Gerät öffnen: gleiche Szene?
- [ ] Hoch- und Querhalten des Geräts ausprobieren.
- [ ] Wird das Gerät warm oder ruckelt es nach einer Minute?

## W2 · Start per Doppelklick

`start.bat` im Projektordner:

- prüft, ob Node.js vorhanden ist, und nennt sonst die Bezugsquelle;
- installiert beim ersten Start die Abhängigkeiten (`npm install`) und kopiert die Bibliotheken;
- weist auf fehlendes FFmpeg hin (Vorschau geht dann, Export nicht);
- startet den Server und öffnet nach zwei Sekunden `http://localhost:8080` im Standardbrowser;
- meldet verständlich, wenn der Server schon in einem anderen Fenster läuft.

Geprüft: gestartet auf einem Testport ohne Browser – der Server antwortete, FFmpeg wurde erkannt, nach dem Beenden war
der Port wieder frei. **Nicht geprüft:** ein echter Doppelklick im Explorer und der Erststart auf einem Rechner ohne
`node_modules`.

## Tests

Jede Testdatei einzeln, je Lauf auf 2 Minuten begrenzt – zusammen 65 von 65 bestanden.

| Lauf | Ergebnis | Dauer |
|---|---|---|
| `test/share.test.mjs` (neu) + `test/audio.test.mjs` + `test/core.test.mjs` | 15/15 | 87 s |
| `test/export.test.mjs` + `test/live.test.mjs` + `test/config.test.mjs` | 19/19 | 78 s |
| `test/marble.test.mjs` | 17/17 | 75 s |
| `test/sim.test.mjs` + `test/golden.test.mjs` | 14/14 | 65 s |

Neu geprüft: statische Auslieferung unter einem Unterpfad ohne Export-Server, Teilen-Link in einem frischen Browser
(gleiche Konfiguration und gleicher Simulationsverlauf), JSON speichern und laden samt Fehlerfällen, Handyansicht bei
390×844.

## Nachweise

- [Handyansicht, ganze Seite](nachweise/w1_handy_ganz.png), [Handyansicht, erster Bildschirm](nachweise/w1_handy_oben.png)

## Offen

- **Geschwindigkeit auf einem echten Handy ist unbekannt.** Die Vorschau rechnet in voller Auflösung (1080×1920).
- **Die Seite ist öffentlich.** Ausgeliefert werden nur `index.html`, `src/` und `vendor/`.
- Ein Export vom Handy aus auf dem eigenen PC ist nicht Teil dieses Schritts.
- Der Link enthält alle Werte im Klartext; er wird lang, ist aber lesbar.
