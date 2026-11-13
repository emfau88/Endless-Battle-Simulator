# Browser-Teststabilität · 13.11.2026

Ausgangsstand: `main` / `a25152078ade47ecaf70613e80417f9372568bc8`, lokal sauber und mit GitHub abgeglichen.
Die Korrekturen betreffen ausschließlich `test/share.test.mjs`, `test/config.test.mjs` und die Nachweisdokumentation.

## Befund

Der vollständige [PR-Lauf 43431587775](https://github.com/emfau88/Endless-Battle-Simulator/actions/runs/43431587775)
hatte 133/133 Tests bestanden. Im anschließenden [Main-Lauf 43434908849](https://github.com/emfau88/Endless-Battle-Simulator/actions/runs/43434908849)
bestanden Audio 17/17, Produktion 33/33 und Scrap 29/29, die Kerngruppe aber nur 51/54.
Teilen-Link, JSON-Einstellungen und Handyansicht scheiterten jeweils an `page.goto`, 30 Sekunden Wartezeit bis `load`.
Der Programmcode war gegenüber dem geprüften PR unverändert; `a251520` ergänzte lediglich Dokumentation.

Im Teilen-Link-Test liefen zwei vollständige Vorschauen gleichzeitig über Software-WebGL. Außerdem wurden
die Browserkontexte nur am erfolgreichen Testende geschlossen. Scheiterte Navigation oder eine Assertion,
blieben Vorschau und Kontext bis zum Ende der Testdatei erhalten und konnten die nachfolgenden Tests belasten.
Das sind konkrete Schwächen des Testaufbaus; eine vollständige Laufzeitprofilierung des fehlgeschlagenen
GitHub-Runners liegt nicht vor. Die drei Timeouts sind kein belegter Simulations- oder Audiofehler.

## Begrenzte Korrektur

- Jeder Kontext registriert sofort einen Test-Abschlusshook. Er wird auch bei einer fehlgeschlagenen Assertion
  geschlossen. Bei einem Navigations-/Bereitschaftsfehler schließt der Helfer den Kontext bereits vor Rückgabe.
- Der Teilen-Link-Test speichert Konfiguration und Zustand nach 300 Schritten, schließt den Quellkontext und
  öffnet den Link erst dann in einem frischen Kontext. Konfigurationsvergleich, Zustands-Hash und Prüfung auf
  Browserfehler bleiben vollständig erhalten; höchstens eine Vorschau rendert gleichzeitig.
- Ein zusätzlicher Fehlerfall prüft einen echten fehlgeschlagenen Navigationsaufruf: kein Kontext bleibt übrig,
  die danach regulär gestartete Vorschau funktioniert. Er prüft außerdem, dass vorherige Tests aufgeräumt haben.

Die Prüfung auf das vollständige `load`-Ereignis und die vorhandenen 30-Sekunden-Grenzen bleiben unverändert.
Keine Retries im Test, keine übersprungenen Fälle, keine höheren Limits oder geänderten Golden-Referenzen.
Szenarien, Darstellung, Ton und Exportcode werden nicht verändert.

## Prüfung

Drei unabhängige lokale Testprozesse unter Windows, Node 22.17.1, Playwright 1.60.0 und Software-Rendering:

| Lauf | Ergebnis | Gesamtdauer |
|---|---|---|
| 1 | 5/5 bestanden | 38,49 s |
| 2 | 5/5 bestanden | 38,13 s |
| 3 | 5/5 bestanden | 35,09 s |

Lokale Protokolle: `output/browser-test-stability/local-1.log` bis `local-3.log`.
Die Zeiten verschiedener Betriebssysteme/Runner werden nicht als Leistungssteigerung miteinander verglichen.

Die Korrektur `50adbce3b885e3602db208fe69b37142c3019966` bestand den vollständigen
[PR-Lauf 43456537366](https://github.com/emfau88/Endless-Battle-Simulator/actions/runs/43456537366)
unter Ubuntu 24.04.5 mit Node 22.17.1, Playwright 1.60.0, FFmpeg 6.1.1-3ubuntu5 und Software-Rendering:

| Gruppe | PR-Ergebnis |
|---|---|
| Core | 55/55 |
| Audio | 17/17 |
| Produktion | 33/33 |
| Scrap | 29/29 |
| **Gesamt** | **134/134** |

Keine Fehler, abgebrochenen oder übersprungenen Fälle. Die drei zuvor fehlgeschlagenen Browserfälle und
der neue Fehler-/Aufräumtest sind ausdrücklich bestanden. Die übrigen Export-, Audio- und Golden-Prüfungen
laufen weiterhin unverändert mit.

Über [PR #7](https://github.com/emfau88/Endless-Battle-Simulator/pull/7) nach `main` übernommen,
Merge `816b3ab5a5621de8c754e8a73bd108b2952402f2`. Der automatische
[Main-Nachlauf 43459693445](https://github.com/emfau88/Endless-Battle-Simulator/actions/runs/43459693445)
bestand mit **133/134**: Core 54/55, Audio 17/17, Produktion 33/33, Scrap 29/29.
Alle fünf Fälle aus `test/share.test.mjs` bestanden erneut. Ein anderer Browserfall schlug fehl; R02 blieb offen.
Die [Pages-Auslieferung](https://github.com/emfau88/Endless-Battle-Simulator/actions/runs/43459693342)
für denselben Merge war erfolgreich. Die Gruppenprotokolle beider Läufe sind unter
`output/browser-test-stability/pr-*.log` und `main-*.log` lokal gesichert.

## Nachtrag: gespeicherte Konfiguration

Der zusätzliche Main-Fehler lag in `test/config.test.mjs`: Nach dem Neuladen blieb die Meldung zur veralteten
Konfiguration sichtbar. Der Test bereitete die Daten mit einem bei jeder Navigation ausgeführten Init-Skript
und einem `sessionStorage`-Marker vor. Der fehlgeschlagene Runner protokollierte die Speicherinhalte nicht;
eine erneut ausgeführte Vorbereitung ist deshalb eine plausible, aber nicht belegte Ursache.
Lokal bestanden der unveränderte Einzelfall und zehn Diagnose-Läufe mit protokollierten Speicherzuständen.

Die Vorbereitung schreibt die alte Konfiguration jetzt genau einmal im tatsächlichen Datei-Ursprung und
lädt die Anwendung anschließend neu. Beim zweiten Neuladen existiert kein Startskript mehr, das den Speicher
überschreiben könnte. Zusätzlich zu allen bisherigen Prüfungen wird die vollständige bereinigte Konfiguration
im `localStorage` vor und nach dem zweiten Neuladen mit dem tatsächlichen Anwendungszustand verglichen.
Damit bleiben auch Fehler der echten Speicherung sichtbar; sie werden nicht durch nachträgliches Schreiben
eines erwarteten Wertes verdeckt. Die Konfigurationstests räumen ihre Kontexte ebenfalls bei jedem Testausgang auf.
Anwendungscode, Prüfgrenzen und Testbestand bleiben unverändert.

Lokale Prüfung der Ergänzung: `config.test.mjs` und `share.test.mjs` zusammen **12/12**, 70,64 s;
anschließend `config.test.mjs` in einem frischen Prozess **7/7**, 33,18 s. Protokolle:
`output/browser-test-stability/config-share-1.log` und `config-2.log`. Kein Fall übersprungen oder abgebrochen.
Die Ergänzung wird nach dieser gezielten Prüfung per Fast-forward vom eigenen Branch `codex/config-test-fixture`
nach `main` übernommen. Der dadurch gestartete vollständige Main-Nachlauf wird vor Abschluss ausgewertet.

## Verifizierter Anschlussstand

Der anschließende [Main-Lauf an `cc1bc7c`](https://github.com/emfau88/Endless-Battle-Simulator/actions/runs/43462916717)
bestand mit 133/134 Tests: Die früheren Lade- und Konfigurationsfälle bestanden; abweichend war
der vollständige MP4-Bytevergleich des Sunny-Yard-Replays. Simulationszustand und Audioereignis-Hash
stimmten überein. Die damaligen Dateien fehlen; die Ursache bleibt ungeklärt. R02 bleibt offen.

Die spätere Zusammenführung aller fünf Szenarien entfernt auf Nutzerwunsch die Teilen-Oberfläche.
Die Übertragungsprüfungen verwenden Einstellungsdateien (`test/settings.test.mjs`); der strenge
Sunny-Yard-Bytevergleich bleibt erhalten. Ein grüner Replay-Lauf ist kein Ursachenbeweis.
Aktuelle Prüfungen und Grenzen: [Integrationsbericht](ALLE_SZENARIEN_INTEGRATION_2026-11-13.md).
