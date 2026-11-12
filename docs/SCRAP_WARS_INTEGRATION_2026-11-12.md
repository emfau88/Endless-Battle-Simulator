# Scrap Wars – Integration vom 12.11.2026

## Auftrag und Ausgangslage

Scrap Wars nach R06/R20 schrittweise in den Simulator einbauen. Die Marble-Erweiterung bleibt ausdrücklich
ein isolierter Prototyp. Ausgangspunkt: sauberer Commit `0dfde76`, neuer Branch `codex/scrap-wars`.
Keine `AGENTS.md` im Repository oder in den Elternverzeichnissen. GitHub-`main` beim erneuten Abgleich:
`0f87887bd28cad2e0a4524067b723981f0272857`. Keine fremden lokalen Änderungen überschrieben, kein Push/Merge.

Die Produktionsabsicherung aus `4676d3b` und der CI-Workflow aus `79f4295` waren bereits vorhanden.
Dieser Bericht ergänzt ihre historischen Nachweise; er ersetzt sie nicht. Die aktive Aufgabenliste bleibt
[ROADMAP.md](ROADMAP.md).
Die Integration einschließlich Tests und Vorlagen ist in `2981dd1` gesichert; die Quelle liegt in `3808ebe`.

## 1. Referenz sichern

Commit `3808ebe` sichert die bereitgestellte `04-scrap-arena.html` unverändert unter
`docs/reference/scrap-arena.source.html`, SHA-256
`38e2c7d28c96a78235a44a5d63943666d11c0ee18025065bcfdd6939e18bc130`.
`.gitattributes` verhindert eine nachträgliche CRLF-Umwandlung der Referenzdatei.
Ein gesonderter Versions- oder Lizenztext ist in dieser Projektquelle nicht ausgewiesen.

Die ersten zwei Scriptblöcke sind bis auf Herkunftszeile/Zeilenenden unverändert in
`src/scenarios/scrap/simulation.js` und `renderer.js` übernommen. DOM-Steuerung, Browser-RAF,
WebAudio und WebM-Recorder des dritten Blocks werden nicht gestartet. Herkunft und Regeln:
[SCRAP_SOURCE.md](reference/SCRAP_SOURCE.md).

Die Ausgangs-Seeds 42, 7 und 314 sind vor der Integration mit Zustands- und vollständigen JSON-SHA-256-Werten
gesichert worden. Die erste Runde bleibt einschließlich KI-Zielen, Cooldowns, beiden Zufallszuständen,
Effekten und Meldungen identisch. Seed 42: Ende nach 52,708333 s, EMBER gewinnt, Quell-Hash `d3baa468`.
Die Regeln mit 125 HP, Blaster/Raketen, 14 Deckungen und maximal 90 Simulationssekunden wurden nicht erweitert.

## 2. Konfiguration, Vorschau und Capture

Registrierung als `scrap` / **Scrap Wars**, Einstellungen `repeatRounds` und `endPauseSec` (2–8 s, Standard 3).
Änderungen dieser Regeln starten die Episode neu. Seed, Tempo, HUD/Kamera, Audio und individuelle Lautstärken
nutzen das vorhandene Schema. Oberfläche, Teilen-Link, JSON und CLI behalten diese Werte.
Vorlagen: `presets/scrap-portrait.json` und `scrap-landscape.json`, jeweils kurze 20-s-Konfigurationen.

`src/canvas-scene.js` stellt einen Canvas2D-Frame als Textur auf die bestehende Pixi-Bühne. Dadurch erfasst
derselbe Exporter die Arena, alle vorgesehenen Anzeigen und das Ergebnis. Bedienknöpfe gehören nicht dazu.
Die Physik bleibt in einer 900 × 900 Arena; Format und Auflösung verändern keine Kampfregeln.

Hochkant liegen je zwei Roboterkarten ober- und unterhalb der Arena. Querformat verwendet links Titel,
Rundenuhr und Siege, rechts die vier Roboterkarten. Quadrat besitzt eine kompakte eigene Anordnung.
Die ursprüngliche Arenaoptik bleibt erhalten; ihr Ergebnisbanner wird vergrößert und mittig platziert.
Außerhalb der Arena ersetzt ein lesbares HUD die kleine Quell-Anzeige. Ergebnisfunken dürfen während
der Pause ausblenden, ohne den Simulationszustand zu verändern.

## 3. Vollständiger Ereigniston

Der Episodenadapter beobachtet erfolgreiche Regelaktionen. Er protokolliert Blaster, Raketen, Treffer,
Explosionen, Deckungsschäden/-zerstörung, Waffenaufnahme/-abwurf/-nachschub, KOs und Rundenwechsel.
Die zehn UI-Meldungen und kurzlebigen Partikel des Prototyps sind nicht die Exportquelle.

Sequenzen bleiben über Runden hinweg eindeutig. Ein Puffer von maximal 4096 Ereignissen wird vom Exporter
regelmäßig abgeholt; ausgelassene Sequenzen werden durch dessen bestehende Verlustprüfung sichtbar.
Ein fortlaufender Digest deckt auch bereits aus dem Puffer entfernte Ereignisse ab. Dichtebegrenzung
findet nur bei Deckungstreffer-Stimmen im Mischer statt und entfernt keine Protokolleinträge.

Die Klangzuordnung kombiniert vorhandene unveränderte Kenney-CC0-Samples, den vorhandenen synthetischen
Knall und drei deterministische Oszillatorklänge für Blaster/Rakete/Aufnahme. Details und Herkunft:
[Audio-README](../assets/audio/README.md). Die Waffenart kommt aus dem tatsächlichen Schuss;
die fehleranfällige Klangwahl nach Partikelgröße aus dem Quell-UI wird nicht übernommen.
Die Live-Vorschau bleibt wie Naval und Marble stumm; die Offline-MP4s haben die AAC-Tonspur.

## 4. Wiederholbare Episoden

Die Quelle rechnet mit festen 120-Hz-Schritten. Ein ganzzahliger Akkumulator ordnet ihnen 60 Host-Ticks je
Videosekunde zu. Filmtempo 1/0,8/0,64 wirkt genau einmal. Ereignisse erhalten nötigenfalls gebrochene
Video-Tickwerte; der bestehende Mischer setzt sie über `step / 60` abtastgenau auf die Videospur.

Bei Rundenende gelten weiterhin Sieger bzw. Unentschieden der Quelle. Die Endpause läuft in Videozeit,
unabhängig von Tempo und realer Rendergeschwindigkeit. Sie beginnt mit dem Host-Tick, der das Ende erkennt;
die Differenz zum letzten 120-Hz-Ereignis beträgt weniger als einen 60-Hz-Tick. Mit Wiederholung beginnt
danach die nächste Runde. Seed 42 startet Runde 2 mit Seed `1606261697`; weitere Seeds entstehen aus
`hashSeed('scrap-round-v1', Startseed, Rundennummer)`. Es gibt keine Wanduhr- oder Zufallsneustarts.
Ohne Wiederholung bleibt das Ergebnis sichtbar. Siege und Unentschieden werden über die Episode gezählt.

Videozeit, aktive Simulationszeit und aktuelle Rundenzeit werden getrennt geführt. Der Episodenhash umfasst
den vollständigen Rundenzustand, beide RNGs, Rundenzähler, Pause, Akkumulator, Konfiguration und Ereignisdigest.
Es ist ein Regressionshash, keine kryptografische Identitätszusage. Invarianten prüfen zusätzlich die
Episodenzähler, Ereignisfolge und nicht endliche interne KI-/Physikwerte. Nur geladene Bodenwaffen dürfen
ihre beabsichtigte unendliche Lebensdauer besitzen.

## 5. Kurze Ausschnitte aus derselben Episode

Der gemeinsame Exporter akzeptiert `clip: { startSec, durationSec }`, die CLI
`--clip-start` und `--clip-duration`. `config.video.durationSec` bleibt die Dauer der Originalepisode.
Vorlauf und Audio-Nachlauf werden in kleinen abbrechbaren Schritten simuliert; nur der Ausschnitt wird
als Video gerendert. Jede Framegrenze wird exakt eingehalten, ungültige Grenzen werden abgewiesen.
Der Startversatz steht im Wiederholungsrezept; Standarddateinamen unterscheiden Ausschnitt und volle Episode.

Die Tonmischung einschließlich Lautheitsnormalisierung entsteht aus den Ereignissen der **gesamten** Episode.
Erst danach wird der PCM-Abschnitt für den Clip ausgeschnitten und zu AAC kodiert. Dadurch bleiben
überhängende Klänge, Zufallsvarianten, Dichtebegrenzung und Normalisierung erhalten. Die ausgewiesenen
Mix-/Stimmen-/LUFS-Werte beziehen sich ausdrücklich auf die vollständige Episode. Der kurze Ausschnitt
kann eine andere gemessene Lautheit haben. AAC wird für den Ausschnitt neu kodiert.

Freigegeben ist zunächst **nur Scrap** (`supportsClips`). Die Capture-Frames und der dekodierte Audioteil
werden gegen denselben Abschnitt eines kontinuierlichen Ablaufs verglichen. Bei Naval hängen HUD-Texte
noch von einem Renderaufrufzähler ab; ein reiner Simulationsvorlauf wäre keine vollständige Bildwiederholung.
Die übrigen Szenarien können erst nach Prüfung ihrer Darstellung freigegeben werden. Eine verkürzte
Episodendauer darf später auch Naval-Himmel und Ereignisfahrplan nicht neu planen. Kein Timeline-Editor.

## Prüfstand

- Erster gezielter Durchlauf: **15/15 erfolgreich**, etwa 178 s mit Software-Rendering. Danach wurden
  der Vergleich aller erfassten Ausschnittsframes, zusätzliche Invarianten und der echte UI-Exportweg ergänzt.
- Vollständiger Lauf mit `EBS_GPU=0 npm test`: **111/113 erfolgreich**, 998,95 s. Zwei Ausfälle betrafen
  Testbedingungen: Der neue Scrap-UI-Test hatte noch den Downloadlink des vorherigen Jobs erwischt
  (die Anzeige wechselte gerade zu „Starte Renderer …“); ein bestehender Marble-UI-Test erwartete noch
  genau zwei Szenarien. Der erste wartet jetzt auf Annahme des POST und den neuen Scrap-Link, der zweite
  erwartet die um Scrap erweiterte Auswahl. Beide gezielten Wiederholungen bestanden **je 1/1**
  (31,95 s bzw. 14,66 s). Damit sind alle 113 Fälle abgedeckt; ein erneuter vollständiger 113/113-Lauf
  wurde nicht durchgeführt. Protokolle: `output/scrap-full-tests.log`, `scrap-ui-recheck.log`,
  `scrap-registry-recheck.log`.
- Bestehende Naval-/Marble-Simulationsdateien und `test/fixtures/golden-hashes.json` bleiben unverändert.
- 20 Minuten reine Scrap-Simulation zweimal: gleiche Zustände, lückenlos abgeholte Ereignisse, begrenzter
  Puffer und Objektbestand. Kein 20-Minuten-Video wurde erzeugt.
- Kurze Exporte prüfen H.264/AAC, Abmessungen, Dauer, Bildzahl, Zustand, Ereignisverlust, Rezept-Wiederholung,
  Abbruch im Vorlauf/Audiomix und Dateiübernahme. Quelle/Simulation und Rendern sind getrennt geprüft.

Umgebung: Windows, Node 22.17.1, Playwright 1.60.0, Chromium 148.0.7778.96, Pixi 8.22.0, Matter 0.20.0,
FFmpeg/ffprobe `N-121425-g0bc54cddb1-20251013`, SwiftShader (`EBS_GPU=0`).
Nachweise liegen lokal unter `output/`, einschließlich Testprotokoll und MP4-Sidecars mit Git-/Versionsangaben.
Der erste echte Ubuntu-GitHub-Runnerlauf bleibt R02; er wird durch lokale Tests nicht ersetzt.

## Filmbeurteilung und unveränderter Marble-Prototyp

Exportierte Einzelbilder von Start, Aktion, Ergebnis und Folgerunde wurden auf Beschriftung, Ausschnitt
und Sichtbarkeit geprüft. Drei kurze MP4s wurden aus dem sauberen Stand `f94e856` erzeugt; ihre
Wiederholungsrezepte liegen jeweils daneben. Alle verwenden Seed 42, eine 60-s-Originalepisode,
720p30, H.264/AAC, SwiftShader und `veryfast`. Es gingen keine Tonereignisse verloren; sämtliche
Exportprüfungen bestanden. Die unabhängige FFmpeg-Messung bezieht sich auf den fertigen Clip:

| Lokale Datei unter `output/` | Abschnitt / Bildzahl | Zustands-Hash | Clip-Lautheit / True Peak |
|---|---|---|---|
| `scrap-review-transition.mp4` | 16:9, 50–58 s, 240 Frames | `3e47192f` | −13,6 LUFS / −1,2 dBTP |
| `scrap-review-portrait.mp4` | 9:16, 48–60 s, 360 Frames | `13bce06a` | −13,6 LUFS / −1,0 dBTP |
| `scrap-review-action.mp4` | 16:9, 10–20 s, 300 Frames | `fd41b4b8` | −14,2 LUFS / −1,3 dBTP |

Datei-SHA-256, Versionsangaben und Messwerte: lokal `output/scrap-review-summary.json`.
Die Dateien sind erzeugte, nicht versionierte Nachweise. Kein einzelner Videoexport dieses Auftrags
überschritt 20 Sekunden. Die lokale Simulatorvorschau läuft auf Port 62346; der eigenständige
Marble-Prototyp auf Port 62345 blieb erreichbar. Diese lokalen Prozesse sind keine Veröffentlichung.

Ein tatsächliches subjektives Hörurteil und eine Prüfung auf einem echten Handy sind damit **nicht** behauptet.
Insbesondere die Wirkung von Lautheitsnormalisierung/Begrenzer muss beim Anhören beurteilt werden.
R20 bleibt für diese Filmabnahme offen; die technische Integration ist abgeschlossen.

`src/scenarios/marble.js` und der lokale Versuch `output/marble-foundry-prototype/index.html` wurden nicht
verändert. Der Versuch ist weiterhin separat und nicht in der Szenarioauswahl, Physik oder Exportpipeline
registriert. Weitere Scrap-Spielmechaniken, Marble-Ausbau und Hex-Integration gehören nicht zu dieser Änderung.
