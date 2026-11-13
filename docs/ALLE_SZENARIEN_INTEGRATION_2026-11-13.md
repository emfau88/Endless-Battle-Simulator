# Gemeinsamer Generator: Integrationsnachweis

## Auftrag und Ausgangspunkt

Naval, Marble, Scrap, Endless Mycelium und Endless Pyramid sollen im selben Generator
auswählbar sein, mit geprüften Einstellungen für Hochformat-Shorts und Querformatvideos.
Die Integration erfolgt nacheinander auf `codex/all-scenarios-production` im separaten
Worktree `output/all-scenarios-worktree`. Ausgangspunkt ist Main
`cc1bc7cfb813fe5b29f660814662dd07c11f7e8f`; die bestehenden Arbeitsstände bleiben erhalten.

Der bekannte Sunny-Yard-Replayfehler ist damit **nicht behoben**. Der letzte vollständige
[Main-Lauf](https://github.com/emfau88/Endless-Battle-Simulator/actions/runs/43462916717)
bestand mit 133/134 Tests. Die separate Linux-Diagnose mit drei gezielten Runden konnte
kein abweichendes Paar sichern. Diagnosebranch und Wiederholungsschleifen werden nicht
übernommen. R02 bleibt offen. Ein grüner Wiederholungslauf wäre kein Ursachenbeweis.

## Schritt 1: Mycelium

Übernommen wird `endless-mycelium` bis `700e4b3`. Bei Konflikten bleibt die aktuelle
typgetreue Behandlung von Auswahllisten aus Main erhalten. Die 24 bisherigen Golden-Fälle
sind unverändert; die zwölf Mycelium-Fälle stammen aus dem bestehenden Featurebranch.
Es werden keine neuen Referenzwerte erzeugt.

Die gezielte Integrationsprüfung fand einen eigenen Audiofehler: Der 2,5-Sekunden-Export
mit Seed 42, 16:9, 720p/30 fps, Softwaredarstellung und `ultrafast` wurde von der aktuellen
AAC-Prüfung bei **−0,5 dBTP** abgewiesen. Der PCM-Eingang lag bei **−2 dBFS**. Das ist
ein anderer Befund als die fehlende Bytegleichheit des Sunny-Yard-Replays.

### Eingrenzung und begründete Anpassung

Die Simulation wurde ohne Renderer mit denselben Ereignissen ausgeführt. Ihre PCM-Datei
wurde unverändert durch verschiedene AAC-Einstellungen kodiert. Bei 2,31946 Sekunden
betrug die größte dekodierte Spitze rechts −0,472 dBFS; der entsprechende PCM-Abtastwert
lag bei −0,707825 (linear), links bei −0,791473. Die Abweichung entsteht in der
AAC-Kodierung/Dekodierung und nicht durch einen abweichenden Simulationsablauf oder
einen Schnitt am Dateiende. SHA-256 der betroffenen PCM-Datei:
`081e88cf7ca6cecbb25b299b2a81ed3df8b2bce4a01d82797752d7387ae0e6a5`.

Die isolierten Kontrollen belegen, warum ein einzelnes blindes Absenken oder das
Abschalten nur eines AAC-Werkzeugs nicht ausreicht:

| Kontrolle | Messung |
|---|---|
| Nur PCM-Grenze −3 dBFS, normale AAC-Optionen | Hochformat 12 s: +0,4 dBTP |
| Nur M/S-Stereo aus, bisherige PCM-Grenze | Hochformat 12 s: +0,9 dBTP |
| M/S und Rauschersatz aus, Intensitätsstereo noch an | dichter Zyklus, Hochformat, Gesamt 200 %: +0,3 dBTP |
| Beide Stereo-Verfahren und Rauschersatz aus, PCM −2 dBFS | derselbe laute Zyklus: −0,9 dBTP |
| Beide Stereo-Verfahren und Rauschersatz aus, PCM −3 dBFS | derselbe laute Zyklus: −2,0 dBTP |

Die übernommene Anpassung ist deshalb ein **auf Mycelium begrenztes Audioprofil**:
unabhängige Kanäle ohne M/S- und Intensitätsstereo, kein synthetischer Rauschersatz,
und 1 dB zusätzliche PCM-Reserve. Die durchschnittliche Standardlautheit bleibt
bei −14 LUFS. Andere Szenarien behalten ihre bisherigen Encoderoptionen und Grenzen.
Die abschließende Prüfung der fertigen AAC-Spur bleibt unverändert streng.

Die Optionen und ihr Zusammenspiel sind in der
[offiziellen FFmpeg-Dokumentation](https://ffmpeg.org/ffmpeg-codecs.html#aac) beschrieben.
Die Messungen belegen den betroffenen Verarbeitungsschritt und die Wirkung des Profils;
sie behaupten keinen nachgewiesenen Fehler einer bestimmten internen FFmpeg-Codezeile
und keine Garantie für sämtliche denkbaren Klangkombinationen.

Lokale Rohbelege (ignoriert, keine Produktbestandteile):
`output/integration/mycelium-audio/`, `mycelium-headroom/`, `mycelium-discrete/`,
`mycelium-final-profile/` mit WAV/AAC-Dateien und JSON-Vergleichen. Alle Proben sind
höchstens 20 Sekunden lang; die Vergleiche kodieren dieselbe gespeicherte PCM-Datei.

### Prüfstand

- Konfiguration 7/7, Core 5/5, Mycelium-Simulation 7/7; darunter zehn Minuten reine
  Simulation in beiden Formaten und begrenzte Extremparameter.
- Mycelium-Browser: Bild-/Zustandsvergleich und Bedienung/Teilen-Link bestanden.
- Golden-Prüfung nach lokaler Installation der unveränderten Lockfile-Abhängigkeiten:
  2/2 bestanden. Der erste Aufruf hatte wegen fehlendem lokalen `node_modules` im
  neuen Worktree keine Referenzprüfung ausgeführt; das war ein Einrichtungsfehler.
- AAC-Profil: acht isolierte Fälle (Anlauf, 12 Sekunden, dichter kompletter Zyklus,
  Gesamtlautstärke 200 %, jeweils beide Formate) bestanden mit −2,6 bis −2,0 dBTP.
- Automatischer Audio-Randtest: 12/12 Konfigurationen bestanden, einschließlich aller
  Lautstärkeregler auf 200 %, beide Formate; −2,7 bis −1,9 dBTP.
- Erneute echte MP4-Prüfung: beide 2,5-Sekunden-Videos bestanden, einschließlich Vergleich
  von Zustand und Audioereignissen mit der Simulation (68 Sekunden Testlauf).

## Noch offen

Pyramid integrieren, gemeinsame Produktionsvorlagen/Bedienung prüfen, gezielte Exporte
aller fünf Szenarien, vollständige Windows-/Linux-Prüfung und Sicht-/Hörabnahme.
Echte Langexports über 20 Sekunden benötigen die zuvor besprochene Erweiterung der
Freigabe. Main-Merge und anschließender Main-Nachlauf sind noch nicht erfolgt.
