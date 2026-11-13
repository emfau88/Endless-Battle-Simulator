# Erster GitHub-CI-Lauf · 13.11.2026

**Späterer Abschluss:** R02 wurde im Folgeauftrag an `bc0bf61` mit einem vollständigen grünen Linux-Lauf
(133/133 Tests) abgeschlossen. Aktueller Nachweis: [Audio-/Produktionsbericht](SCRAP_AUDIO_PRODUKTION_2026-11-13.md).
Die folgenden Befunde bleiben als historischer Erstlauf erhalten.

Der vorhandene Scrap-/Produktionsstand `5cec854c262d5a5f24e88cdc1689491677a445c4` wurde wie beauftragt
gepusht und in [PR #3](https://github.com/emfau88/Endless-Battle-Simulator/pull/3) zur Zusammenführung vorbereitet.
**Zum Zeitpunkt des Erstlaufs keine CI-Abnahme und kein Merge:** beide Ubuntu-Läufe endeten am 25-Minuten-Joblimit, nachdem bereits
einzelne Tests fehlgeschlagen waren. Die Umsetzung wurde in diesem Planungsauftrag nicht verändert.

| Lauf | Tatsächlich protokollierter Teilstand |
|---|---|
| [Push · 43322357319](https://github.com/emfau88/Endless-Battle-Simulator/actions/runs/43322357319) | 95 erfolgreiche und 2 fehlgeschlagene Testmeldungen; anschließend Abbruch, kein vollständiges Suite-Ergebnis. |
| [PR · 43322457575](https://github.com/emfau88/Endless-Battle-Simulator/actions/runs/43322457575) | 80 erfolgreiche und 3 fehlgeschlagene Testmeldungen; anschließend Abbruch, kein vollständiges Suite-Ergebnis. |

Die Zählungen stammen aus den vorhandenen `✔`-/`✖`-Meldungen, nicht aus einer abschließenden Testzusammenfassung.
GitHub bestätigt als Abbruchgrund das überschrittene Joblimit von 25 Minuten. Beide Artefakt-Uploads gelangen.
Der PR-Lauf prüfte den temporären Merge-Commit `888822184e068e1106f95209d5b75d34cfbdfb69` gegen `main`;
dieser ist kein ausgeführter Merge in den Hauptbranch.

## Konkrete Befunde

- In beiden Läufen: **Audioexport mit Tempo 0,8**, [audio.test.mjs](../test/audio.test.mjs), Test ab Zeile 122.
  Die Prüfung umfasst Format, Dauer, Ereignisse, Lautheit/Spitzen und Synchronität. Welche Assertion scheiterte,
  ist im vorzeitig beendeten Spec-Protokoll nicht enthalten; ein hörbarer Fehler ist damit nicht nachgewiesen.
- In beiden Läufen: **echter Serverstatus und Abbruch während des Audiomischens**,
  [live.test.mjs](../test/live.test.mjs), Zeile 207, jeweils etwa 110 Sekunden.
  Der Test wartet höchstens 110 Sekunden auf die Audiophase. Die Dauer ist ein Hinweis auf diese Grenze,
  aber ohne vollständige Fehlermeldung noch keine bestätigte Ursache und kein Beleg für einen defekten Abbruch.
- Nur im PR-Lauf: **Scrap-Regler, Teilen-Link und JSON**, [scrap-browser.test.mjs](../test/scrap-browser.test.mjs),
  Zeile 47. Derselbe Fall bestand im Push-Lauf; Ursache noch ungeklärt.

Die Laufzeitgrenze allein erklärt die bereits protokollierten Einzeltestfehler nicht. Ein bloß höheres Joblimit
wäre daher noch keine ausreichende Korrektur. Die lokalen Windows-Ergebnisse aus dem
[Scrap-Bericht](SCRAP_WARS_INTEGRATION_2026-11-12.md) bleiben historische Nachweise dieser Umgebung.

## Umgebung und Nachweise

Ubuntu 24.04, Node 22.17.1, Playwright 1.60.0, FFmpeg/ffprobe `6.1.1-3ubuntu5`, Software-Rendering (`EBS_GPU=0`).
Das Jobprotokoll bestätigt Bash mit `-e -o pipefail`; eine absichtlich fehlschlagende Runner-Probe wurde nicht gestartet.
Test- und Versionsprotokolle wurden aus beiden GitHub-Artefakten lokal unter
`output/ci-push-43322357319/` und `output/ci-pr3-43322457575/` gesichert. Sie sind erzeugte, nicht versionierte Dateien.

Die begrenzte Nacharbeit und die Reihenfolge bleiben ausschließlich unter **R02** in der [ROADMAP](ROADMAP.md).
R22 enthält den angefragten Ausbauplan; neue Scrap-Funktionen wurden nicht implementiert, Marble bleibt isoliert.

## Nachtrag · gezielte Minimalprüfung vor dem Merge

Auf den Folgeauftrag wurden ausschließlich Audioexport und Live-Abbruch isoliert unter Ubuntu geprüft.
Nach dem konkreten Audiofehler folgte ein einzelner Vergleich mit dem bisherigen `main`.
Die Testbedingungen und der Simulatorcode wurden dafür nicht verändert; nur der separate Diagnosebranch
`codex/ci-minimal-checks` verwendet eine begrenzte Testauswahl und TAP für sofortige Fehlerdetails.

| Prüfung | Ergebnis |
|---|---|
| [Aktueller Stand · Lauf 43328624267](https://github.com/emfau88/Endless-Battle-Simulator/actions/runs/43328624267) | Zwei Fälle, 140,56 s: Live-Abbruch bestanden (107,76 s einschließlich Render-Vorlauf), Audioexport wegen True Peak −0,7 dBTP statt höchstens −1 dBTP fehlgeschlagen. Kein Job-Timeout. |
| [Bisheriger main · Lauf 43329470295](https://github.com/emfau88/Endless-Battle-Simulator/actions/runs/43329470295) | Derselbe unveränderte Audiotest scheitert ebenfalls mit **−0,7 dBTP**. Ein Fall, 42,43 s; ausgecheckter Quellstand `0f87887bd28cad2e0a4524067b723981f0272857`. |

Der erste Lauf stammt aus Diagnosecommit `13734ac`; dessen einziger Unterschied zu PR-Head `5cec854`
ist der Workflow. Der zweite Workflow stammt aus `9d6510e`, prüft aber ausdrücklich den alten Hauptbranch.
Beide Umgebungen verwenden Ubuntu 24.04, Node 22.17.1, Playwright 1.60.0 und FFmpeg/ffprobe 6.1.1-3ubuntu5.
Der Audiofall ist Marble, Seed 42, fünf Sekunden, Tempo 0,8, 720p30/16:9.

**Einordnung:** Der konkrete Audiofehler besteht bereits auf `main` und ist keine durch diesen PR neu
eingeführte Abweichung. Die Spitzenreserve verfehlt das Projektziel um 0,3 dB; der gemessene Wert liegt
weiterhin unter 0 dBTP. Das ist keine vollständige Klangabnahme und kein bestandener Audiotest.
Die nachfolgenden Synchronitäts-/Sidecar-Assertions dieses Tests wurden wegen des vorherigen Fehlers nicht erreicht.
Format, Dauer, Ereignisverlust und Lautheitsprüfungen vor der Spitzenprüfung bestanden.

Der Live-Test bestätigt erreichbaren Serverstatus, angenommenen Abbruch, Aufräumen und Rückmeldung
`cancelled` innerhalb von 2,5 s nach der Anforderung. Seine 110-s-Wartefrist **vor** der Audiophase bleibt
mit 107,76 s Gesamtdauer knapp; die frühen Gesamtläufe belegen weiterhin keine robuste CI-Laufzeitreserve.
Der sporadische Scrap-UI-Fall wurde in diesem Minimalauftrag nicht erneut ausgeführt.

**Merge-Bewertung:** Für die Integration ist die verbleibende, bereits vorhandene Audio-Abweichung kein
neuer Regressionsbefund. Zusammen mit dem bestandenen Live-Abbruch ist der zuvor autorisierte Merge
vertretbar; R02 bleibt für Audioreserve, UI-Zuverlässigkeit und einen vollständigen CI-Lauf offen.
Die gezielten Läufe bleiben korrekt als fehlgeschlagen sichtbar, da der Audiogrenzwert nicht erreicht wird.
Keine Grenzwerte wurden gelockert, keine Referenzen neu geschrieben und keine Erweiterungen implementiert.

Zusätzliche lokale Artefakte: `output/ci-minimal-43328624267/` und `output/ci-baseline-43329470295/`.
Die Diagnose-Workflowänderungen werden nicht in den Hauptbranch übernommen. Ein weiterer unveränderter
Volltestlauf wird für diesen ausdrücklich begrenzten Auftrag nicht gestartet.

**Ausgeführter Merge:** PR #3 wurde anschließend am 13.11.2026 (Europe/Berlin) ohne Konflikte oder offene
Review-Einwände in `main` zusammengeführt, Commit `34c63aa37d6ce16fe8c3c8c14dc32bafd5be6515`.
Es wurden keine verpflichtenden Branch-Prüfungen umgangen. Der Merge-Commit verwendet `[skip ci]`, um
im ausdrücklich begrenzten Auftrag keinen erneuten unveränderten Volltestlauf zu starten; R02 bleibt offen.
