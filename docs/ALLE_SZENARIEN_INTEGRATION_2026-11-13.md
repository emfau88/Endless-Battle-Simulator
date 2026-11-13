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

## Schritt 2: Pyramid

Übernommen wird `endless-pyramid` bis `a83f15f`. Der Szenariocode bleibt bytegleich mit
dem Featurebranch. Beide neuen Szenarien sind gemeinsam registriert; die gemeinsame
Klangdatei enthält beide Ergänzungen. 14 synthetisierte Klänge wurden vor/nach der
Zusammenführung bytegleich verglichen. Die doppelte Roadmap-ID wird aufgelöst:
Pyramid bleibt R23/R24, Mycelium erhält R25; historische Berichte bleiben unverändert.

Gezielte Prüfung: **33/33 bestanden** (Pyramid 21, Core 5, Konfiguration 7), einschließlich
Kreisläufen über mehrere Minuten, Tag/Nacht, Füllung/Finale, beiden Darstellungen,
Reglergrenzen und echtem 3-Sekunden-MP4 mit Ton. Log: `output/integration/pyramid.log`.

### Offener Audio-Befund, keine Pyramid-Korrektur übernommen

Eine zusätzliche lokale Diagnose mischte die letzten 20 Sekunden eines simulierten
60-Sekunden-Tages separat auf −14 LUFS ein. Bei Gesamtlautstärke 200 % überschritt
diese Stressprobe die AAC-Grenze (z. B. Kugeln, 9:16: −0,8 dBTP). Das ist **kein
nachgewiesener Fehler eines vollständigen 60-Sekunden-Exports**: Die unabhängige
Einmessung des Fensters verändert die Verstärkung gegenüber dem vollständigen Film.
Pyramid unterstützt bisher keinen solchen Ausschnittsexport.

Drei gezielte Diagnosegruppen (zusätzliche PCM-Reserve, AAC-Werkzeuge am identischen
PCM, Kombination samt allen Reglern auf 200 %) lieferten keine belastbare, durchgehend
wirksame Korrektur: selbst bei −4 dBFS PCM und abgeschalteten Stereo-/Rauschwerkzeugen
lag eine Tierchen-Probe noch bei −0,9 dBTP. Die versuchsweise Pyramid-Option wurde
vollständig zurückgenommen. Keine Änderungen an Szenarioregeln, keine gelockerten
Assertions und keine weiteren Parametersuchen. Das lokale Diagnoseprogramm samt
seiner weiterhin strengen, fehlgeschlagenen Prüfung bleibt unter
`output/integration/pyramid-finale-stress.test.mjs`; es wird nicht als regulärer
Produkt- oder Ausschnittstest ausgegeben.

Rohbelege: `output/integration/pyramid-audio/`, `pyramid-final-profile/` und zugehörige
Logs. **Genau der nächste benötigte Nachweis:** ein echter vollständiger 60-Sekunden-
Pyramid-Export, Seed 42, 9:16, Tierchen, `dayMinutes: 1`, Ton mit Gesamt 200 %, mit
vollständiger normaler Einmessung und Messung der fertigen AAC-Spur. Er entscheidet,
ob die beobachtete Spitze den unterstützten Produktionsweg tatsächlich betrifft.
Dieser Nachweis benötigte die inzwischen erteilte Erweiterung der bisherigen 20-Sekunden-Exportgrenze.
Das tatsächliche Ergebnis und die anschließend akzeptierte Einschränkung stehen unten.

## Schritt 3: Produktionsvorlagen und vereinfachte Bedienung

`src/production-presets.js` und zehn entsprechende JSON-Dateien unter `presets/production/`
bieten pro Szenario ein Short (60 s, 9:16) und ein Langvideo (600 s, 16:9): 1080p30,
CRF 20/medium, Ton und Standardlautstärke. Die UI-Knöpfe erhalten den Seed und setzen
die übrigen Einstellungen auf die ausdrücklich beschriebenen Vorlagenwerte. Sie lösen
keinen Export aus. Pyramid erhält für das Short einen 1-Minuten-Tag; Scrap Sunny Yard
im Endlosmodus. Bestehende Spezialvorlagen bleiben erhalten.

**Änderung durch den Nutzer während der Umsetzung:** Die bereits vorhandene
Teilen-Link-Funktion wird nicht benötigt. Deshalb sind Linkfeld, Kopierknopf und
laufende Linkerzeugung entfernt. Es entsteht keine neue Teilen-Funktion und keine
Reparatur dieser Funktion. Das zuvor beobachtete Wegfallen der Qualitätswerte im
Link ist nur ein Befund am verworfenen Bedienweg (`presets-before.log`).
Direktaufrufe mit URL-Parametern bleiben aus Kompatibilitätsgründen lesbar.

Speichern/Laden von Einstellungsdateien bleibt erhalten. Die bisherigen Übertragungs-
prüfungen verwenden nun diesen tatsächlichen Bedienweg und vergleichen weiterhin
vollständige Konfigurationen bzw. den Simulationszustand. Der MP4-Bytevergleich im
Sunny-Yard-Test bleibt unverändert streng. Bei einem Fehlschlag werden Original,
Replay, beide JSON-Dateien und Hashes erst **nach** den Exports gesichert; keine
Diagnosewiederholungen oder Änderungen am Capture-/Kodierablauf.

Der lokale PC-Befehl übernimmt jetzt auch CRF, Encoder-Preset und gegebenenfalls die
Bitrate, damit eine gewählte Produktionsvorlage beim Export über diesen Weg erhalten
bleibt. Das ist besonders für den Mycelium-Standard CRF 16 gegenüber der gemeinsamen
Vorlage CRF 20 relevant.

**Gezielte Bedienprüfung: 11/11 bestanden**, einschließlich beider Vorlagen für alle
fünf Szenarien, vollständigem JSON-Roundtrip, Handyansicht, Fehlereingaben und dem
weiterhin bytegenauen Sunny-Yard-Replay. Das Bestehen des Replays erklärt dessen
historischen Linux-Fehler nicht. Log: `output/integration/settings-presets.log`.

## Schritt 4: vollständiger Produktionsweg und CI

`test/presets-export-*.test.mjs` prüft alle fünf Szenarien in beiden Vorlagen über
einen eigenen lokalen Server: UI-Auswahl → vollständiger API-Auftrag → MP4/JSON →
Nachmessung → bytegleicher Download. Nur die Dauer wird auf drei Sekunden verkürzt.
MP4, JSON, extrahiertes Bild, Serverlog und Jobstatus werden als Belege gesichert.
Damit wird nicht behauptet, bereits komplette 60-/600-Sekunden-Filme geprüft zu haben.

**Gezielte Produktionsprüfung unter Windows: 10/10 bestanden** (541 Sekunden Testlauf).
Alle zehn Dateien enthalten 90 Bilder bei 1080p/30 fps und eine geprüfte AAC-Tonspur;
der HTTP-Download stimmt bytegenau mit der geprüften MP4 überein. Die Bildstichproben
bei 2,5 Sekunden zeigen die erwarteten Szenen. Das ist keine vollständige Sicht- oder
Hörabnahme. Log: `output/integration/production-paths.log`; MP4-/JSON-/Bildbelege:
`output/production-checks/1794596464826/`.

**Vollständige Windows-Prüfung an `43102d9`: 179/179 bestanden**, ohne Abbruch oder
übersprungene Tests, in 1.845 Sekunden. Log: `output/integration/full-windows-43102d9.log`.

Der erste vollständige [Linux-Lauf an `43102d9`](https://github.com/emfau88/Endless-Battle-Simulator/actions/runs/43490389709)
bestand in sechs Gruppen: Core 55/55, Audio 17/17, Produktion 33/33, Scrap 29/29,
Mycelium 11/11 und Pyramid 21/21. Auch der strenge Sunny-Yard-Replay bestand; seine
historische Fehlerursache ist damit nicht geklärt.

Die neue Kataloggruppe wurde **nicht bestanden**: Alle zehn Exportfälle waren zunächst
in einer Testdatei zusammengefasst. Die ersten drei fertigen Fälle dauerten unter Linux
164, 160 und 182 Sekunden. Bei 600 Sekunden beendete Node die gesamte Testdatei während
des vierten Falls; sieben Exportfälle erhielten damit keinen vollständigen Nachweis.
Die drei zusätzlichen Bedienprüfungen bestanden. Logs und fertige MP4-/JSON-Dateien
sind als CI-Artefakte sowie unter `output/integration/linux-43102d9/` gesichert.

Die einzelne begründete Korrektur betrifft deshalb ausschließlich die **Testaufteilung**:
ein Einstieg und ein CI-Job pro Szenario, jeweils beide Formate; der gemeinsame
Prüfablauf liegt unverändert in `test/helpers/production-preset-export.mjs`. Die drei
reinen Vorlagen-/Bedientests gehören zur Core-Gruppe. Insgesamt bleiben es 179 Tests.
Keine kürzeren Testvideos, gelockerten Assertions, Retries oder erhöhten Zeitgrenzen:
weiterhin drei Sekunden Video, 180 Sekunden für die Exportanzeige, 600 Sekunden je
Testdatei und 25 Minuten je CI-Job. Der Generatorcode wird hierfür nicht verändert.
Die neue Aufteilung wurde unter Windows gezielt am Seeschlacht-Einstieg geprüft:
beide unveränderten Exportfälle bestanden (2/2, 84 Sekunden;
`output/integration/export-shard-naval.log`). Der gemeinsame Prüfablauf wurde zusätzlich
mit der bisherigen Fassung verglichen: nur Registrierung/Dateiablage und Importpfade ändern sich.
Fehlerpaare und Produktionsbelege werden zusätzlich zu den Test-/Versionslogs als
Artefakte hochgeladen.

Prüfergebnisse des vollständigen Windows-/Linux-Laufs werden am Arbeitsbranch bzw.
im zugehörigen Pull Request und im Abschlussbericht mit dem tatsächlich geprüften
Commit festgehalten. Dieser Bericht dokumentiert die Umsetzung vor dieser Gesamtfreigabe.

## Filmabnahme und akzeptierte Einschränkung

Der Nutzer hat die ursprüngliche 20-Sekunden-Grenze ausdrücklich erweitert. Auf seinen
anschließenden Einwand wird die Abnahme auf **je einen 60-Sekunden-Film für Pyramid und
Mycelium** begrenzt: Pyramid mit Tierchen, 1-Minuten-Tag und Gesamtlautstärke 200 % zur
Klärung des Finale-Befunds, Mycelium mit der gemeinsamen Short-Vorlage für vollständige
Generationswechsel. Die vorgesehene Qualität ist 1080p30, CRF 20/medium und Ton. Es werden **keine fünf
10-Minuten-Testvideos** erzeugt. Längere Abläufe werden zusätzlich durch die vorhandenen
reinen Simulationstests geprüft; das ersetzt keinen tatsächlich kodierten Langfilm.

Der vollständige Pyramid-Film an `ef8d34b` berechnete alle 1.800 Bilder in etwa 77 Sekunden
mit dem vorhandenen AMD-Hardware-Renderer. Bei Gesamtlautstärke 200 % wurde die fertige
AAC-Spur mit **+1,3 dBTP** abgewiesen; die unkodierte PCM-Datei hatte **−1,4 dBTP**.
Beide Dateien wurden nach der Kodierung gesichert, bevor die unveränderte Schutzprüfung
den Export beendete. Belege:
`output/production-acceptance/pyramid-finale-master200-1794599506551/`.

Der Nutzer akzeptierte den 200-%-Randfall ausdrücklich und legte die Standardlautstärke
100 % / −14 LUFS als maßgeblich fest. Eine einzelne Tonkontrolle verwendete denselben
vollständigen Ablauf und die bereits berechneten Bilder. Bei 100 % lagen PCM und AAC
bei **−14,1 LUFS**; PCM-True-Peak **−1,7 dBTP**, AAC-True-Peak jedoch **+0,5 dBTP**.
Die Standardkontrolle besteht damit ebenfalls nicht. Sie ist eine Tonkontrolle mit
wiederverwendetem Bildmaterial, kein zweiter vollständig gerenderter Export.
Dateien, Ereignisse und Messwerte: `standard100-control/` im genannten Belegordner.

Der Vergleich derselben Standard-PCM-Datei grenzt die Spitze auf die AAC-Verarbeitung
ein: unveränderte Kodierung +0,5 dBTP; nur M/S aus +0,2; nur Intensitätsstereo aus −0,1;
nur Rauschersatz (PNS) aus −1,4; alle drei aus −1,3 dBTP. Die Lautheit blieb −14,1 LUFS.
PCM-SHA-256: `0840b67d11bdb6a462de8a71de291fcd376396d1da1245a13c2ff0932864c255`.
Das ist ein eingegrenzter Befund, keine allgemein validierte Pyramid-Korrektur.

**Abschließende Nutzerentscheidung:** Weitere Zusatzdiagnosen, Filmproben und vorsorgliche
Reparaturen werden beendet; die bekannten Einschränkungen sollen dokumentiert und die
Integration bei bestandener regulärer CI gemergt werden. Deshalb wurde **keine** zusätzliche
Pyramid-Audioänderung übernommen und kein 60-Sekunden-Mycelium-Film mehr gestartet.
Der Pyramid-Szenariocode bleibt unverändert gegenüber seinem Featurebranch.
Die Ton-Schutzprüfung bleibt wirksam; der Generator wird nicht als vollständig abbruchfrei
bezeichnet. Der Folgepunkt ist in der Roadmap unter R27 festgehalten.

## Veröffentlichung und verbleibende Grenzen

Die reguläre Linux-CI mit der korrigierten Testaufteilung muss vor dem Merge bestehen.
Die explizite Mergefreigabe liegt vor. Anschließend wird der tatsächliche Main-Nachlauf
abgewartet; Ergebnis, Commit und Lauf-Links werden in
[PR #8](https://github.com/emfau88/Endless-Battle-Simulator/pull/8) und im Abschlussbericht
festgehalten. Dieser Bericht nimmt deren Ergebnis nicht vorweg.
R02 (historischer Replayfehler), R27 (Pyramid-Tonspitzen) und persönliche Hörabnahmen
bleiben offen. Lange fertige Videos sind mit dieser Integration nicht vollständig abgenommen.
