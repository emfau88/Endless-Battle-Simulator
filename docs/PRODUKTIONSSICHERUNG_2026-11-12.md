# Produktionsabsicherung · 12.11.2026

Ausgangsstand: `c72cf78` (Roadmap nach Einarbeitung), auf Codebasis `0f87887`.
Branch: `codex/production-safety`. Arbeitsverzeichnis zu Beginn sauber; keine anwendbare `AGENTS.md` gefunden.
CI: `79f4295`. Exporter, Oberfläche und Regressionen: `4676d3b`.
Die Änderungen wurden lokal committet, nicht gepusht. Der erste GitHub-Runnerlauf ist damit noch offen (R02).

Der Auftrag autorisierte zunächst ausschließlich Vorschläge zu Marble und zusätzlich die technische Absicherung
des Produktionswegs. Im Verlauf wurde ein **isolierter lokaler Marble-Versuch** angefragt. Dieser liegt separat
unter `output/marble-foundry-prototype/index.html` und ist weder in der Szenario-Registry noch im Exporter registriert.
Naval-/Marble-Simulationscode, Audio-Rechenregeln und Golden-Referenzen wurden nicht verändert.

## Ergebnis entlang des Produktionswegs

| Grenze | Verhalten und Nachweis |
|---|---|
| Konfiguration → Renderer | Encoder-Überschreibungen werden vor der Normalisierung eingearbeitet. Das gespeicherte `config.video.quality` stimmt mit dem tatsächlich verwendeten Encoder überein. `EBS_GPU=0` wirkt auch im Exporter. |
| Renderer → Encoder | Abbruch beendet aktives Chromium/FFmpeg; Pipe und Encoderabschluss gehören zum Abbruchpfad. Explizite Phasen ersetzen den bisherigen reinen Frame-Fortschritt. |
| Ereignisse → Audio | Sample-Dekodierung nutzt abbrechbare Kindprozesse. Einmessung und WAV-Erzeugung laufen im Worker. Der Server bearbeitet währenddessen Status und Abbruch. Berechnung, Lautheitsziel und Klanggestaltung bleiben unverändert. |
| Audio → MP4 | Muxen und ffprobe erhalten das Signal; die Rückgabe wartet auf das Ende des jeweiligen Prozesses bzw. Workers. |
| Prüfung → Ausgabe | ffprobe, Audio-/Frame-/Simulationsprüfung laufen auf temporären Dateien. Erst danach werden MP4 und JSON übernommen. Bei Fehlern/Abbruch stellt die Übernahme vorhandene Dateien wieder her. |
| Ergebnis → Wiederholung | Schema 2 ergänzt Git-Commit/Branch, `clean`/`dirty`/`unavailable`, unversionierte/geänderte Pfade, Laufzeitversionen und Zusatzskript-SHA-256. `exportOptions` enthält wirksame JPEG-/Rendererwahl; Audio enthält eine SHA-256-Prüfsumme der Ereignisfolge. CLI-Wiederholung übernimmt diese deklarativen Werte. |
| API → Oberfläche | Bild-, Audio-, Prüf- und Speicherphase sind sichtbar; „Abbruch angefordert“ bleibt bis zum Aufräumen stehen. 100 % und der fertige Link erscheinen erst nach erfolgreicher Rückkehr. Beim Server-Shutdown wird auf das Aufräumen gewartet. |

Die JSON darf keine zusätzlichen Skripte ausführen oder einen Ausgabepfad auswählen. Für aufgezeichnete
Zusatzskripte verlangt die CLI wieder explizite `--script`-Argumente. Alte Vorlagen bleiben lesbar; fehlende
Werte werden weiterhin durch aktuelle Defaults ergänzt. Die Oberfläche lädt die Szenario-/Videoeinstellungen,
die CLI zusätzlich die gespeicherten Capturewerte.

## Prüfung und tatsächliche Ergebnisse

Umgebung: Windows, Node **22.17.1**, Playwright **1.60.0**, Chromium **148.0.7778.96**, Pixi **8.22.0**,
Matter **0.20.0**; FFmpeg/ffprobe **N-121425-g0bc54cddb1-20251013**, libx264. Für die Prüfung des CI-Pfads
wurde `EBS_GPU=0` gesetzt. Der bereits installierte passende Chromium-Cache wurde über
`PLAYWRIGHT_BROWSERS_PATH=C:\Users\madde\AppData\Local\ms-playwright` ausgewählt.

| Lauf | Tatsächliches Ergebnis |
|---|---|
| Unveränderte Ausgangsbasis | 71 von 79 Tests bestanden in der Sandbox; acht HTTP-Fälle scheiterten am gesperrten localhost-Zugriff (`ERR_NETWORK_ACCESS_DENIED`/`EACCES`). `live` und `share` mit lokalem Netzwerkzugriff erneut: **9/9 bestanden**. Damit waren alle 79 bestehenden Fälle erfolgreich geprüft; kein einzelner behaupteter 79/79-Gesamtlauf. |
| Erste gezielte Audio-/Exportprüfung mit Software-Rendering | Die ausgeführten Einzelprüfungen bestanden, aber zwei Testdateien wurden nach je 120 s abgebrochen. Das bisherige `--test-timeout` begrenzte auch die ganze Datei. Für Software-Rendering nun 600 s je Datei; CI zusätzlich 25 Minuten für den Job. |
| Neue Produktionsregressionen | **16/16 bestanden** in 88,16 s; anschließend auch in der vollständigen Suite erfolgreich. |
| Vollständige Suite mit Software-Rendering | **94/97 bestanden**, drei Fehler, keine abgebrochenen/übersprungenen Fälle; 870,78 s. Der 20-s-Oberflächenexport überschritt sein 180-s-UI-Limit. Zwei folgende API-Tests bekamen dadurch 409 („Export läuft“). Alle anderen Testdateien bestanden, einschließlich der Golden-Prüfung. |
| Gezielte Korrektur und Wiederholung | Nur der UI-Prüfclip wurde auf 3 s/720p verkleinert; der gesamte Klick-/API-/Datei-/Statusweg bleibt geprüft. Eine Nachbereitung beendet einen eventuell noch laufenden Job auch nach Testfehlern. Danach **7/7 Live-Tests bestanden**, 114,33 s, erneut mit Software-Rendering. |
| Gesamtbewertung des finalen Stands | **Alle 97 unterschiedlichen Fälle erfolgreich abgedeckt:** 90 unveränderte Fälle aus dem Gesamtlauf plus die sieben Fälle der korrigierten Live-Datei. Kein weiterer vollständiger 97/97-Lauf nach der reinen Teständerung behauptet. |

Lokale Protokolle liegen in `output/production-baseline.log`, `production-baseline-http.log`,
`production-targeted.log`, `production-new-tests.log`, `production-full-suite.log` und `production-live-final.log`.
Sie sind erzeugte, nicht versionierte Dateien. Die Testfälle selbst sind in `test/production.test.mjs` und
`test/live.test.mjs` sowie der vorhandenen Suite reproduzierbar.

Die neuen Regressionen prüfen insbesondere:

- Einen tatsächlich laufenden Kindprozess abbrechen; nach Rückgabe ist seine PID nicht mehr aktiv.
- WAV-Bytes, Prüfsummen und Messwerte des Workers gegen den synchronen Mischer vergleichen.
- Hauptthread während eines laufenden Audiomixes weiter bedienen und Worker beenden.
- Abbruch an acht Phasengrenzen: Start, Bilder, Encoderabschluss, Samples, Audiomix, Muxen, Prüfung, Speichern.
  Vorhandene MP4-/JSON-Inhalte bleiben erhalten; temporäre Dateien verschwinden.
- Bei einem echten Dateifehler nach der ersten übernommenen Datei beide vorherigen Dateien wiederherstellen.
- Eine absichtlich verletzte Simulationsinvariante vor Veröffentlichung zurückweisen.
- Sauberes Git, geänderte/unversionierte Dateien und fehlendes Repository unterscheiden.
- Zwei kurze Exporte über Sidecar und CLI wiederholen: Konfiguration, Capturewerte, Zustand, Audioereignis-Hash,
  Audiomesswerte und **MP4-Bytes waren auf demselben Software-Renderer identisch**.
- Über den echten HTTP-Server während des Audiomischens Status lesen und abbrechen. Der Test verlangt
  `cancelled` samt Aufräumen innerhalb von **2,5 Sekunden** und bestand. Das ist ein lokaler Grenzwertnachweis,
  keine Zusage für jede Hardware.

Die Golden-Prüfung (24 Fälle × 2 Prüfpunkte) bestand unverändert. Die vorhandenen Lautheits-, Synchronitäts-,
Stumm-, Tempo- und Formatprüfungen bestanden. Kein Video war länger als 20 s; längere Simulationsvorläufe
der bestehenden Suite sind keine Videoexporte. Es fand keine neue inhaltliche Hör-/Filmabnahme der Szenarien statt.
Die geänderte Statusdarstellung wurde per DOM-Test und Screenshot geprüft (`output/production-audio-status.png`).
Nach Ergänzung des Scrollens zum Statusfeld wurde ausschließlich dieser Darstellungstest nochmals ausgeführt: **1/1 bestanden** (14,97 s einschließlich Browser-/Serverstart).

## CI und Grenzen

Der Workflow installiert Node 22.17.1, Lockfile-Abhängigkeiten, Playwright-Chromium mit Systempaketen und FFmpeg
auf Ubuntu 24.04. Versions- und Testprotokolle werden als Artefakt gesichert. Das entspricht dem dokumentierten
[Playwright-CI-Ablauf](https://playwright.dev/docs/ci-intro). Der explizite Bash-Modus aktiviert `pipefail`, damit
`tee` einen Testfehler nicht verdeckt; siehe [GitHub-Shell-Verhalten](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#jobsjob_idstepsshell).
Lokale Negativprobe mit derselben Shell-Konfiguration: `(exit 7) | tee ...` ergab **Exit 7**. YAML wurde eingelesen
und auf Shell/Software-Rendering geprüft. **Ubuntu-Runner, frische Installation und roter GitHub-Check sind noch
nicht praktisch abgenommen.** R02 bleibt dafür offen.

Die Dateiübernahme schützt gewöhnliche Fehler und kooperativen Abbruch, nicht Stromausfall oder hartes
Prozessende zwischen zwei Umbenennungen. Scheitert eine Wiederherstellung, wird der Sicherungsordner erhalten
und in der Fehlermeldung genannt. Git-Status und Versionsangaben archivieren keine ungecommitteten Quellen und
versprechen keine identischen Pixel über andere Renderer/Versionen hinweg. 60-Minuten-Export, 4K-Durchsatz und
echte Handy-Leistung wurden nicht neu abgenommen; diese Restpunkte bleiben bei R11.

## Isolierter Marble-Versuch und nächster Inhalt

Der lokale Versuch **Marble Foundry** zeigt bewusst einen kompakten Ablauf: Beschichtung nach zwölf Durchläufen,
Magnetbrücke nach 18 beschichteten Rohlingen, Veredelung nach je acht sortierten Metall-/Glasmurmeln und ein
Zwischenziel von 24 Prisma-Murmeln. Der untere Weg ist langsam genug für einen sichtbaren Stau; die neue obere
Strecke nimmt Metall ab. Die Veredelung nimmt zwei Murmeln auf und gibt zwei zurück. Es werden keine Murmeln
erzeugt oder gelöscht.

Der separate Canvas-Versuch nutzt feste Schritte und einfache Bahnregeln, keine Integration in die bestehende
Matter-/Pixi-Szene. Ausbauten hängen von Zählern ab, kurze Bauanimationen von der Modellzeit. Kein Audio und kein
MP4-Anschluss. Die vier Meilensteine wurden bei ca. **12,57 / 34,73 / 55,57 / 83,95 Modellsekunden** erreicht.
Alle 36 Identitäten blieben erhalten; ohne Entwicklung blieb nach zehn Minuten reiner Simulation alles im
Anfangskreislauf. Start/Pause, nächster Ausbau und Vergleichsschalter wurden bedient; Start-/Zwischen-/Endbilder
wurden betrachtet. Bei 390 px Breite gab es keinen seitlichen Überlauf; das ersetzt keine Handy-Lesbarkeitsabnahme.

Dieser Versuch prüft, ob sichtbare Entwicklung als Idee überzeugt. Er beweist keine Zuschauerbindung über
10–20 Minuten. Empfehlung: zuerst ansehen, Marble anschließend bewusst auswählen oder vormerken; **Scrap Arena
bleibt der nächste Kandidat für eine vollständige Integration**. Sein konkreter Anschlussplan steht ausschließlich
in R06/R20 der [Roadmap](ROADMAP.md). Die neue Marble-Variante und Scrap wurden noch nicht in den Simulator eingebaut.
