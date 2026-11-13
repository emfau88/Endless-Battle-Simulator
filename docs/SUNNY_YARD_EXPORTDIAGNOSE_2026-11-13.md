# Sunny-Yard-Exportdiagnose · 13.11.2026

## Ausgangsstand und Grenzen

Vor Änderungen frisch geprüft: lokaler und GitHub-`main` stehen auf
`cc1bc7cfb813fe5b29f660814662dd07c11f7e8f`. Der ursprüngliche Arbeitsbaum ist sauber,
ausgecheckt ist `codex/scrap-replay-diagnostics` / `727b356a3dc18a5d0c729ca2c0d30ad17ae53013`.
Dieser Branch und die vorhandenen Belege bleiben unverändert. Keine `AGENTS.md` im
Repository oder seinen übergeordneten Verzeichnissen gefunden.

Eigener Branch: `codex/sunny-replay-cause`, eigener Worktree unter
`output/sunny-replay-worktree`, direkt von `main` angelegt. Keine Änderungen an `main`.
WSL ist lokal nicht installiert; die Linux-Untersuchungen laufen auf GitHub Actions.

Der [letzte vollständige Main-Lauf 43462916717](https://github.com/emfau88/Endless-Battle-Simulator/actions/runs/43462916717)
hat **133/134** bestanden: Core 55/55, Audio 17/17, Produktion 33/33, Scrap 28/29.
Der frisch abgerufene Job 132014275919 bestätigt den Sunny-Yard-Fehler
`16:9: bytegleiche Wiederholung`. Die davor stehenden Assertions für Zustand und
Audioereignisse bestanden. Die [Pages-Veröffentlichung](https://github.com/emfau88/Endless-Battle-Simulator/actions/runs/43462916773)
war erfolgreich. [Diagnoselauf 43466671398](https://github.com/emfau88/Endless-Battle-Simulator/actions/runs/43466671398)
ist abgebrochen. Die alten Lade-/Konfigurationstests sind keine aktuellen Fehlerbelege.

Die vier vorhandenen Windows-Paare sind bytegleich, einschließlich dekodiertem Bild
und Ton. Sie belegen keine Ursache für die Linux-Abweichung. Die damaligen
fehlgeschlagenen MP4s fehlen. Bibliotheken, Browser, Encoder, Regeln, Karten, HUD,
Kamera, Marble, Assertions, Timeouts und Golden-Referenzen werden nicht repariert
oder verändert, solange kein belastbarer Befund vorliegt.

## Audit vor der ersten Änderung

Nachgewiesen ist eine vollständige MP4-Abweichung trotz identischer Zustands- und
Ereignis-Hashes. Bildaufnahme, PCM-Mischung, Kodierung und Container sind zunächst
gleichberechtigte Hypothesen. Der fehlende Nachweis ist ein abweichendes Linux-Paar
mit getrenntem Vergleich dieser Stufen. Die erste Untersuchung ist deshalb der
bestehende Sunny-Yard-Test unter derselben Ubuntu-/Node-/Playwright-Konfiguration,
mit Sicherung der fertig erzeugten Dateien **nach** Testende und anschließender
Analyse. Es gibt keine Reparatur und keine automatische Wiederholung.

## Runde 1: Originalfall ohne Eingriff in die Exportpipeline

Commit `cf984540b1750193cca76edf850b907026164e8e`,
[Lauf 43469713604](https://github.com/emfau88/Endless-Battle-Simulator/actions/runs/43469713604),
[Artefakt 14060456232](https://github.com/emfau88/Endless-Battle-Simulator/actions/runs/43469713604/artifacts/14060456232).

Nur `^Sunny Yard:` aus `test/scrap-browser.test.mjs`, einmal: **1/1 bestanden**.
Der unveränderte Test enthält je ein 2-s-Exportpaar in 16:9 und 9:16, 720p30,
Seed 42, Sunshine, Audio, Software-Rendering, ultrafast. Die Dateien werden im
Abschlusshook vor der bisherigen Bereinigung kopiert. Kein Zusatzskript im Browser,
keine geänderten Exportargumente, keine geänderte Assertion.

Beide Paare stimmen in allen erhobenen Vergleichen überein: normalisierte
Konfiguration, Exportoptionen, Zustands-/Ereignis-Hash, vollständige MP4-Bytes,
dekodierte Video-Frameprüfsummen, dekodiertes Float32-Audio, kodierte Video-/Audio-
Pakete samt Zeitstempeln, Stream- und Container-Metadaten.
Bei Paketvergleichen wird nur die Dateiposition ausgeschlossen; beim separaten
Containervergleich werden Dateiname, Gesamtgröße und Gesamtbitrate ausgeklammert.
Der vollständige MP4-Bytevergleich bleibt unverändert maßgeblich.

MP4-SHA256 (jeweils Original = Replay):

- 16:9: `e03241ae446d697d1f88b5c86067bad4124e117857c761780e9172592d389714`
- 9:16: `ec8751c8a82806915991111f9d72a64e77e91144a6f01b0f5339363ecd8cda9f`

Lokale Sicherung: `output/sunny-replay-investigation/round1/`, insbesondere
`comparison.json`, `environment.log`, `test.log`, `exports/`, Frameprüfsummen,
Audio-PCM und vollständige ffprobe-Ausgaben. **Keine Reproduktion, kein Ursachenbeweis.**

## Runde 2: ursprüngliche Vorgänger und echte Encodereingaben

Commit `1bad1b599f54b3084d2b5a79695d2a2f9395d71c`,
[Lauf 43470899791](https://github.com/emfau88/Endless-Battle-Simulator/actions/runs/43470899791):
dieselben vier unmittelbar vorausgehenden Browserfälle wie im
fehlgeschlagenen Scrap-Job, dann Sunny Yard, jeweils einmal. Die sonstigen Tests
und die vollständige Suite werden nicht gestartet.

Temporäre Instrumentierung mit `EBS_REPLAY_INPUTS=1` ausschließlich für Sunshine:
Die bereits an `ff.stdin.write` übergebenen Buffer werden im Speicher referenziert;
kein zusätzlicher Browseraufruf, kein zusätzlicher Frame, keine veränderte Batch-
größe, kein weiteres Await in der Aufnahme. Erst nach erfolgreicher Veröffentlichung
werden der originale MJPEG-Strom, Frame-SHA256 und tatsächliche FFmpeg-Argumente
geschrieben. Die fertige WAV-Datei wird nach Kodierung und Audioprüfung, unmittelbar
vor ihrer bisherigen Löschung, gelesen und ebenfalls gesichert. Das kann geringe
CPU-/Speicherkosten verursachen; eine vollständige Timing-Neutralität wird nicht
behauptet. Renderfolge, Eingabebytes, Backpressure und Encoderoptionen bleiben gleich.

Separater Diagnosefehler: Der vorherige Startversuch
[43470582672](https://github.com/emfau88/Endless-Battle-Simulator/actions/runs/43470582672)
auf `4a98dfef6a6709b65740a9a8134db25b2ceea026` erzeugte keinen Job und führte keinen
Test aus. Ein Doppelpunkt mit Leerzeichen im erweiterten Testfilter war als
unquotierter YAML-Wert ungültig. Ausschließlich der `run`-Wert wurde zum Blockwert
geändert; anschließend wurde das gesamte YAML mit PyYAML erfolgreich eingelesen.
Das ist kein Exportfehler und kein ausgeführter Diagnoseversuch.

Ergebnis von Runde 2: **5/5 bestanden**.
[Artefakt 14062030659](https://github.com/emfau88/Endless-Battle-Simulator/actions/runs/43470899791/artifacts/14062030659),
lokal `output/sunny-replay-investigation/round2/`.
Je Format sind alle 60 tatsächlichen JPEG-Frames bytegleich, ebenso die WAV-/PCM-
Eingabe und alle FFmpeg-Argumente nach Ersetzen ausschließlich des temporären
Arbeitsverzeichnisses. Alle Ausgangsvergleiche aus Runde 1 stimmen wieder überein.
Beide MP4-Hashes sind auch über beide Runden identisch. WAV-SHA256 für 16:9:
`7e20eeeb7b7a354c6911f0e9c687fe87ce0c246acbbdb0655cb10ab3fc4289dd`.

## Runde 3: zeitliche Zuführung identischer Encodereingaben

Die unveränderten, mit SHA256 pro Frame und WAV verifizierten Eingaben aus Runde 2
werden pro Format einmal unmittelbar und einmal in Zehnerpaketen mit jeweils
2 Sekunden Abstand zu FFmpeg geschrieben. Backpressure wird unverändert beachtet.
Es handelt sich weiterhin um 60 Frames / 2 Sekunden Film, nicht längere Exporte.
Die tatsächlich aufgezeichneten Video- und Mux-Argumente werden übernommen; nur
die Ein-/Ausgabepfade zeigen auf die gesicherten Daten und neue Zieldateien.
Keine Browser-Neuberechnung, keine geänderten Encoderparameter, keine Retries.
Geprüft wird der strenge MP4-Bytevergleich untereinander und gegen den ursprünglichen
Export aus Runde 2; die anschließende getrennte Spuranalyse bleibt erhalten.
