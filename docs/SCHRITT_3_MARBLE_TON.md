# Schritt 3 · Marble: Ton (B05, zunächst nur Marble)

**Datum:** 11.11.2026 · **Ausgangs-Commit:** `cb8a437` (Schritt 2) · **Branch:** `schritt-3-marble-ton`
**Betroffene Dateien:** neu `lib/audio.mjs`, `assets/audio/` (10 Sounds, Lizenz, Zuordnung), `test/audio.test.mjs`;
geändert `src/scenarios/marble.js` (Ereignisprotokoll, Klangtabelle), `src/core.js` (Schalter `video.audio`,
Klangtabelle in der Export-Schnittstelle), `lib/exporter.mjs`, `export.mjs`, `src/app.js`, `index.html`, `README.md`.
Naval unverändert.

## Was gebaut wurde

1. **Ereignisprotokoll in der Kugelfabrik** – neun Ereignistypen: `pick` (Zellenrad), `belt` (Förderband), `flap`
   (Klappe), `clink` (Aufprall in der Farbröhre), `valve` (Ventil), `rail` (Sammelschiene), `lift` (Aufzug), `hopper`
   (Fall in den Behälter), `tick` (Stöße im Behälter, höchstens alle 3 Schritte). Es beobachtet nur.
2. **Mischer** (`lib/audio.mjs`) – dekodiert die Samples einmal, setzt je Ereignis eine Stimme abtastgenau, mischt
   blockweise zu einer WAV-Datei. Lautstärke folgt der Aufprallstärke, Stereoposition der Bildposition; jede Farbröhre
   klingt in einer eigenen Tonhöhe (Halbtonschritte 0, 2, 4, 7, 9, 12). Weicher Begrenzer, Obergrenze −0,45 dBFS.
3. **Export** – Ereignisse werden je Frame-Paket abgeholt, die WAV-Datei wird ohne Neukodierung des Bildes ins MP4
   eingebunden (AAC, 48 kHz, Stereo, 192 kbit/s). Die JSON-Datei neben dem Video enthält Ereigniszahl, Spitzenpegel
   und Prüfsumme der Tonspur.
4. **Stummoption** – `--no-audio`, `"video": { "audio": false }`, Schalter „Ton im exportierten Video“ (bei Szenarien
   ohne Ton ausgegraut).
5. **Sounds** – zehn Dateien aus Kenney Impact Sounds, CC0; Dateiliste und Zuordnung in `assets/audio/README.md`,
   Lizenztext liegt bei.

**Entscheidung Motor- und Rollgeräusch:** entfällt vorerst. Das Kenney-Paket enthält nichts Passendes; ein
synthetischer Dauerton ohne Hörprobe wäre ein Risiko für die Tonqualität.

## Abnahme

| Kriterium | Ergebnis |
|---|---|
| Synchroner Ton in beiden Formaten | Ja, technisch belegt: Mischer setzt Ereignisse abtastgenau; im fertigen MP4 liegt der Lautstärkeverlauf höchstens 20 ms neben den Ereigniszeiten – bei Tempo 1 und 0,8 |
| Ohne Übersteuern | Ja: Spitze −0,9 bis −1,8 dBFS; der Begrenzer bleibt auch bei absichtlich dreifacher Übersteuerung unter 0 dBFS |
| Gleicher Seed ergibt dieselbe Tonspur | Ja: identische Prüfsumme in zwei Exporten |
| Referenz-Hashes unverändert | Ja: `test/golden.test.mjs` besteht; Export mit und ohne Ton hat denselben Zustand-Hash |
| „Sauberer“ Klang | **Nicht von mir beurteilbar** – ich kann die Clips nicht hören. Auswahl und Lautstärkeverhältnis der Sounds sind begründete Annahmen. Bitte anhören. |

## Messwerte der Testclips

| Clip | Ereignisse | Spitze | Lautheit | Tonspur |
|---|---|---|---|---|
| `output/schritt3_ton_16x9_12s.mp4` | 128 | −1,8 dBFS | −25,2 LUFS | AAC, 48 kHz, Stereo, 12,000 s |
| `output/schritt3_ton_9x16_12s.mp4` | 136 | −0,9 dBFS | −23,7 LUFS | AAC, 48 kHz, Stereo, 12,000 s |

In beiden Clips griff der Begrenzer bei einzelnen Überlagerungen ein. Kein Ereignis ging verloren.

## Tests

Jede Testdatei einzeln, je Lauf auf 2 Minuten begrenzt.

| Lauf | Ergebnis | Dauer |
|---|---|---|
| `test/audio.test.mjs` (neu) + `test/config.test.mjs` | 13/13 | 54 s |
| `test/core.test.mjs` + `test/sim.test.mjs` + `test/golden.test.mjs` | 19/19 | 86 s |
| `test/marble.test.mjs` | 17/17 | 78 s |
| `test/export.test.mjs` + `test/live.test.mjs` | 12/12 | 53 s |

Die neuen Tests prüfen: abtastgenaue Lage und korrekten WAV-Aufbau, Reproduzierbarkeit, Begrenzer, Export mit Ton bei
Tempo 1 und 0,8 (Länge, Format, Synchronität per Kreuzkorrelation, Pegel, JSON-Datei), Unabhängigkeit der Simulation
vom Ton, Stummoption, Seeschlacht ohne Tonspur, Schalter in der Oberfläche.

Ein Test deckte einen Fehler auf, der behoben ist: Bei starker Übersteuerung lief der Begrenzer bis exakt 0 dBFS.

## Offen

- **Hörprobe fehlt** (siehe Abnahme). Stellschrauben stehen in der Klangtabelle: `gain` je Ereignis, `master`.
- **Lautheit:** etwa −24 LUFS. YouTube zielt auf −14 LUFS und hebt leisere Videos nicht an; das Video wirkt also eher
  leise. Mehr Pegel braucht stärkere Begrenzung oder eine Lautheitsanpassung – nicht Teil dieses Schritts.
- **Klirren je Farbröhre:** Die Funken im Bild entstehen weiterhin bei jedem Schritt eines Aufpralls, der Ton nur bei
  deutlichem Tempoverlust. Bild und Ton nutzen also leicht unterschiedliche Auslöser.
- **Kein Motor- und Rollgeräusch**, die Vorschau im Browser bleibt stumm, Naval hat noch keinen Ton.
- **Lange Videos:** Der Mischer arbeitet blockweise und hält nur die Ereignisliste im Speicher; mit mehr als
  12 Sekunden habe ich ihn nicht ausgeführt.
