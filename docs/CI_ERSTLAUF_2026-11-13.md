# Erster GitHub-CI-Lauf · 13.11.2026

Der vorhandene Scrap-/Produktionsstand `5cec854c262d5a5f24e88cdc1689491677a445c4` wurde wie beauftragt
gepusht und in [PR #3](https://github.com/emfau88/Endless-Battle-Simulator/pull/3) zur Zusammenführung vorbereitet.
**Keine CI-Abnahme und kein Merge:** beide Ubuntu-Läufe endeten am 25-Minuten-Joblimit, nachdem bereits
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
