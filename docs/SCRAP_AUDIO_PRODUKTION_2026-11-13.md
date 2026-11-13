# Scrap-Ton und Produktionsabsicherung · 13.11.2026

**Späterer Prüfstand:** Der automatische Main-Nachlauf bestand mit 130/133 Tests; drei Browser-Lade-Timeouts
traten in `test/share.test.mjs` auf. Audio, Produktion und Scrap blieben grün. R02 wurde erneut geöffnet.
Korrektur und aktueller Nachweis: [Browser-Teststabilität](BROWSER_TESTSTABILITAET_2026-11-13.md).
Die unten genannten 133/133 bleiben der tatsächlich bestandene frühere PR-Lauf.

Ausgangspunkt: `main` / `52b7987b37a75bf85d9325354ad26ddb54d250de`, sauber und mit GitHub abgeglichen.
Der Folgeauftrag umfasst Produktionsabsicherung und Ton. Umsetzung im Branch `codex/scrap-audio-production`.
Karten, Kampfregeln, Kamera und der isolierte Marble-Prototyp bleiben unverändert.

## Ursachen und Änderung

Der vollständige [Main-Lauf 43419722141](https://github.com/emfau88/Endless-Battle-Simulator/actions/runs/43419722141)
brach nach 25 Minuten ab. Zuvor scheiterten der Marble-Audiofall bei Tempo 0,8 und das Warten auf die
Audiomischphase im Live-Abbruchtest. Der ältere [Minimalnachweis](CI_ERSTLAUF_2026-11-13.md) zeigte bereits
−0,7 dBTP im AAC statt höchstens −1 dBTP, auch auf dem damaligen Hauptbranch.

- PCM-Reserve von −1,5 auf **−2 dBFS** erhöht, für Scrap auf **−3 dBFS**. Nach jedem AAC-Mux misst FFmpeg `ebur128=peak=true` die
  tatsächliche Ausgabespur. Fehlende/ungültige Messung oder True Peak über −1 dBTP verhindern die Veröffentlichung.
  `audio.encoded` enthält die kodierten Werte; ein Clip wird separat gemessen, seine Mischung bleibt aus der
  gesamten Originalepisode abgeleitet. Stille ist als solche gekennzeichnet. Die neue Phase ist abbrechbar.
- Der echte HTTP-Abbruchtest rendert acht statt zwanzig Sekunden vor dem Audiomix. Er verlangt jetzt außerdem
  bereits gemeldeten Worker-Fortschritt. Die 110-s-Frist zum Erreichen der Audiophase und die strenge Grenze von
  **2,5 s für Abbruch einschließlich Aufräumen** bleiben bestehen.
- Die vollständige CI-Suite läuft in vier Gruppen. Jede Testdatei wird genau einmal zugeordnet, auch neu
  hinzukommende Dateien. Jede Gruppe behält das 25-Minuten-Limit; keine Tests oder Golden-Prüfungen entfallen.
  PRs und Push auf `main` werden geprüft, redundante Feature-Push-Läufe entfallen. Bash/`pipefail` bleibt erhalten.

## Scrap-Mischung

Holz nutzt die vorhandenen CC0-Holzklänge; Stein und Beton erhalten eigene synthetische Treffer und Brüche.
Materialdaten werden nur im Ereignisprotokoll ergänzt. Ein Vergleich mit der unbeobachteten V3-Runde prüft
den vollständigen Physikzustand beider Sunny-Grundrisse. Die Archivquellen und Original-Referenzen bleiben erhalten.

Blaster und Raketen erhalten mehr Klangkörper, Explosionen einen längeren Ausklang. Metalltreffer und KOs
werden zurückgenommen; gleichzeitige Deckungsbrüche erhalten einen gemeinsamen Mindestabstand. Die Regler
bleiben unverändert. Ein kürzerer Begrenzer-Rücklauf nur für Scrap vermindert das lange Absenken nach Spitzen.
Naval und Marble behalten ihre bisherigen Klangtabellen und ihren bisherigen Rücklauf. Das Lautheitsziel bleibt −14 LUFS.

## Nachweise

Gezielte lokale Prüfung des echten Server-Abbruchs: bestanden, 28,24 s Gesamtdauer einschließlich Bildexport,
Aufräumen innerhalb der unveränderten 2,5-s-Grenze. Dateierhaltung wird zusätzlich durch Abbruch in allen
Exportphasen und einen absichtlich zu lauten kodierten Ton geprüft. Neue Tests decken Materialauswahl,
Fallback, vorhandene Lautstärkeregler und die Begrenzung gleichzeitig zerstörter Blöcke ab.

Ein zusätzlicher Lauf über 900 Sekunden reine Simulation in 16:9 plus vollständige Tonmischung ergab 23 Runden,
7.983 lückenlos erfasste Ereignisse und 5.975 Klangstimmen. Die erste Fassung mit −2 dBFS hatte seltene
AAC-Spitzen bis −0,4 dBTP, obwohl die kurzen Clips bestanden. Mit der Scrap-Reserve von −3 dBFS erreicht
derselbe Verlauf **−14,02 LUFS im PCM sowie −14,1 LUFS / −1,2 dBTP im AAC**; alle Invarianten bestanden.
Zwei AAC-framegerecht ausgeschnittene Ereignisfenster sichern den Befund als 16-s-Audiotest ab. Mit der
zu geringen Reserve reproduzierte dieser Ausschnitt lokal −0,5 dBTP, mit der Korrektur −1,9 dBTP.
Die Mischung des Ausschnitts verwendet den aufgezeichneten Episodenpegel; sie wird nicht separat normalisiert.

### Vergleich am endgültigen Code `bc0bf61`

Sunny Yard, Seed 42, Standardregler, je 20 Sekunden. In beiden Formaten stimmen Snapshot und Ereignisfolge
mit der vorher gesicherten Fassung überein; nur `material` ist im Ereignisprotokoll hinzugekommen.

| Messung | 16:9 vorher → nachher | 9:16 vorher → nachher |
|---|---|---|
| PCM-Lautheit | −14,07 → −14,01 LUFS | −14,02 → −13,99 LUFS |
| Stärkste Begrenzerabsenkung | 18,37 → 13,03 dB | 19,49 → 10,86 dB |
| PCM-Spitzengrenze | −1,5 → −3 dBFS | −1,5 → −3 dBFS |
| Gemischte Stimmen | 171 → 167 | 168 → 166 |

Die geringere Stimmenzahl entsteht durch die Dichtebegrenzung gleichzeitiger Brüche, nicht durch verlorene
Simulationsereignisse. Die Peak-Werte sind jeweils das Maximum dieses Prüfabschnitts, keine pauschale Aussage
über jedes denkbare Video. Im vollständigen 15-Minuten-Audiolauf lag die stärkste Begrenzung bei 15,73 dB.

Zwei echte Filmproben: je 12 Sekunden aus Sekunde 4–16 derselben 20-s-Episode, 1080p30,
H.264/CRF 18/`fast`, AAC 192 kbit/s. 16:9: 360 Bilder, −13,6 LUFS / −2,6 dBTP im finalen AAC;
9:16: 360 Bilder, −14,1 LUFS / −2,4 dBTP. Die Clips bewahren die Normalisierung der gesamten Episode,
daher muss die Lautheit des ausgewählten Abschnitts nicht genau −14 LUFS sein.

Lokale Artefakte unter `output/scrap-audio/`: `scrap-16x9.mp4`, `scrap-9x16.mp4`, Vorher-/Nachher-WAVs,
`materials.wav` (Holz, Stein, Beton: jeweils Treffer und Bruch), `comparison.json`, `demo.json`, `long.json`.
Der Vergleichsframe bei Filmsekunde 6 wurde visuell geprüft; die Klangbewertung ist durch Messwerte allein
nicht persönlich abgenommen. Die aktuelle Film-/Hör-/Handyabnahme bleibt unter R20 offen.

### Automatisierte Prüfungen

- Windows/Node 22.17.1: komplette Produktionsgruppe **33/33**, 408,66 s, am endgültigen Code.
  Dies umfasst echten HTTP-Abbruch, alle neun Abbruchphasen, Fehler beim Veröffentlichen und CLI-Replay.
- Die Audiogruppe bestand zunächst **16/16**; nach der zusätzlichen Scrap-Reserve bestanden deren
  Material-/Mischungs-/Codec-Tests **3/3**. Die komplette endgültige Audiogruppe bestand zusätzlich in Linux mit **17/17**.
- Archivquellen und Golden-Referenzen wurden nicht verändert. Der isolierte Marble-Prototyp behält SHA256
  `1aba7e335df93cf723297bebf18c40cd645b38c639fa947b43f5a9c88778e24b`.

Der endgültige [Linux-Lauf 43431587775](https://github.com/emfau88/Endless-Battle-Simulator/actions/runs/43431587775)
prüfte PR-Head `bc0bf614a361308cfc6f884f1c4c34d8d37f7bc3` gegen unverändertes `main` / `52b7987`.
**Alle 133 Tests bestanden, keine Fehler, Abbrüche oder übersprungenen Tests.**

| CI-Gruppe | Bestanden | Testlaufzeit |
|---|---:|---:|
| Kern/Referenzen | 54/54 | 486,90 s |
| Audio | 17/17 | 425,73 s |
| Produktion | 33/33 | 932,58 s |
| Scrap | 29/29 | 734,00 s |

Ubuntu 24.04, Node 22.17.1, Playwright 1.60.0, FFmpeg/ffprobe 6.1.1-3ubuntu5, Software-Rendering.
Die Protokolle bestätigen Bash `-e -o pipefail`, die unveränderten Golden-Prüfungen, den zuvor sporadischen
Scrap-UI-Fall und den echten HTTP-Abbruch innerhalb von 2,5 s einschließlich Aufräumen. Letzterer benötigte
86,90 s insgesamt, der größte Anteil entfällt auf den Bildexport davor. Die längste Gruppe bleibt mit
gut 15,5 Minuten Testlaufzeit unter dem unveränderten 25-Minuten-Joblimit.

Der ersetzte [Lauf 43430123736](https://github.com/emfau88/Endless-Battle-Simulator/actions/runs/43430123736)
ist kein Abschlussnachweis: Seine Scrap-Gruppe fand ebenfalls die zu geringe AAC-Reserve (−0,8 dBTP beim
klassischen Rundenwechsel). Der Push der Korrektur beendete die noch laufenden Gruppen durch die bestehende
Concurrency-Regel. Der anschließende vollständige Lauf oben bestand am endgültigen Code.

R02 ist damit abgeschlossen. Die folgende reine Nachweisdokumentation ändert keinen Produktions- oder Testcode;
für sie werden Inhalte, Links und Diff geprüft, kein weiterer identischer Gesamttest erzwungen.

**Übernommen:** [PR #6](https://github.com/emfau88/Endless-Battle-Simulator/pull/6) wurde nach allen vier grünen
Checks am 13.11.2026 in `main` gemergt: `7cfb1fb583118ed058b8693d9b8dd02c7c63c11e`.
Der reguläre Main-Push startet den Workflow erneut; die obige abgeschlossene Abnahme bezieht sich ausdrücklich
auf den geprüften PR-Code. Der anschließende Dokumentationscommit enthält nur diese Nachweise und Roadmap-Pflege.

Kein einzelner Test-Videoexport dauert mehr als 20 Sekunden. Persönliche Hör-/Handyabnahme und die
Dramaturgie eines vollständigen 15-Minuten-Videos werden damit nicht vorweggenommen.
