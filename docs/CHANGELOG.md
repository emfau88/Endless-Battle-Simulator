# Changelog

Erledigte Arbeit, neueste zuerst, mit Commit und Bericht. Offene Punkte stehen in der [ROADMAP](ROADMAP.md).

## 13.11.2026

| Was | Commit | Bericht |
|---|---|---|
| Abschluss der regulären Linux-Prüfung: 176 bestanden, zwei Mycelium-Zeitüberschreitungen und eine bei 600 s abgebrochene Scrap-Testdatei. CI bleibt rot; Grenzen und Tests unverändert. Als R28 dokumentiert, keine weitere Reparatur-/Wiederholungsrunde. Der Nachtrag ändert nur Markdown; Freigabe eines Merges trotz CI-Status wird ausdrücklich in PR #8 festgehalten. | `20ba943`; [Lauf](https://github.com/emfau88/Endless-Battle-Simulator/actions/runs/43498607564) | [Endstand und Grenzen](ALLE_SZENARIEN_INTEGRATION_2026-11-13.md#veröffentlichung-und-verbleibende-grenzen) |
| Fünf Szenarien mit gemeinsamen Short-/Langvideo-Vorlagen; Teilen-Oberfläche auf Nutzerwunsch entfernt, Einstellungsdateien erhalten. Mycelium mit gemessenem AAC-Profil. Windows 179/179; Linux-Testaufteilung nach belegtem Dateizeitlimit korrigiert, ohne Grenz- oder Assertionsänderung. Pyramid-Tonspitzen auch bei 100 % als Einschränkung R27 dokumentiert; weitere manuelle Zusatzprüfungen auf Nutzerwunsch beendet. Merge nach regulärer CI freigegeben; tatsächliche Veröffentlichung und Main-Nachlauf in PR #8. R02 bleibt offen. | `43102d9`, Testaufteilung `ef8d34b`; [PR #8](https://github.com/emfau88/Endless-Battle-Simulator/pull/8) | [Integrationsbericht](ALLE_SZENARIEN_INTEGRATION_2026-11-13.md) |
| Browser-Testaufbau korrigiert: Kontextfreigabe auch bei Fehlern, nacheinander geöffnete Teilen-Link-Vorschauen und zusätzlicher Fehler-/Aufräumtest. PR 134/134, Main-Nachlauf 133/134 mit anderem Konfigurationsfall. Dafür einmalige Vorbereitung und vollständige Speichervergleiche ergänzt; finaler Main-Nachweis noch offen. Simulatorcode und Grenzen unverändert. | `50adbce`, Merge `816b3ab`; Ergänzung im Branch `codex/config-test-fixture` | [Browser-Teststabilität](BROWSER_TESTSTABILITAET_2026-11-13.md) |
| Produktionsabsicherung abgeschlossen: finale AAC-Spitzenprüfung vor Veröffentlichung, zusätzliche PCM-Reserve, echter Abbruch mit Laufzeitreserve und vollständige Linux-CI in vier Gruppen (133/133). Scrap mit Materialklängen für Holz/Stein/Beton und neu abgestimmter Kampf-Mischung; 15-Minuten-Tonspur und zwei 12-s-Filmproben geprüft. R02 erledigt, persönliche Hörabnahme bleibt R20. | `9586cdf`, `bc0bf61` | [Audio und Produktion](SCRAP_AUDIO_PRODUKTION_2026-11-13.md) |
| Sunny Yard als sonnigen Betonhof überarbeitet: natürliche Materialien, formgerechte Waffenschatten, Randpflanzen, gemessene Querformat-Anordnung und eigener Hochformat-Grundriss mit Nord-/Südstarts. Feste Gesamtansicht für alle Scrap-Regeln ersetzt die störende Duellkamera. Vier Roboter, Materialwerte und Kampfregeln erhalten; Sunny Yards Formatwechsel darf den Verlauf ändern. | Folgeauftrag auf `2d89cca` im Branch `codex/scrap-video-quality` | [Korrektur und Prüfungen](SCRAP_MATERIALARENA_2026-11-13.md#korrektur--sonniger-betonhof-und-eigene-hochformat-arena) |
| Sunny Yard als vierte Scrap-Karte: eigener symmetrischer Grundriss, türkisfarbener Boden, Sonne, Smiley-Holz, Blumen-Stein, Regenbogen-Beton und Blüten-Nachschub. Bestehende Materialwerte erhalten; sechs Simulations- und zwei Browser-/Exporttests bestanden, bisheriges Scrapyard-Bild pixelgleich. Neue Bilder und kurze Filmprobe. | Folgeauftrag auf `57886f4` im Branch `codex/scrap-video-quality` | [Sunny Yard](SCRAP_MATERIALARENA_2026-11-13.md#nachtrag--sunny-yard) |
| Nach Nutzerfeedback Scrap-Bildaufbau neu gefasst: V3-Rechteckarena mit rund 90 % Bildanteil in 16:9, schmale Kopfzeile, Holz/Stein/Beton mit 2/5/10 direkten Blastertreffern und sichtbarer Wegfreigabe. Drei Karten, Hochformat derselben Physik, Original/V2 erhalten. Neue Vorher/Nachher-Bilder, 12-s-MP4 und gezielte Prüfungen; Replay nach während des Erstlaufs geänderter Darstellung am festen Endstand bytegleich wiederholt. | Nachtrag auf `26fb115` im Branch `codex/scrap-video-quality` | [Materialarena](SCRAP_MATERIALARENA_2026-11-13.md) |
| Abschließende Windows-Prüfung des Scrap-Ausbaus: 119/120 im Gesamtlauf; Test las den Teilen-Link vor Aktualisierung der automatisch berechneten Dauer. Bereitschaftsprüfung ergänzt, unveränderte Inhaltsvergleiche in gezielter Wiederholung 1/1 bestanden. Alle 120 Fälle abgedeckt; kein grüner einzelner Gesamtlauf oder neuer Linux-CI-Nachweis behauptet. | Abschlussstand des Branches `codex/scrap-video-quality` | [Qualitätsbericht](SCRAP_VIDEOQUALITAET_2026-11-13.md) |
| Scrap-Videoqualität in sechs begrenzten Schritten: erkennbare Chassis/HUD, versionierter Kampfablauf, Acht-Runden-Turnier mit berechnetem Abschluss, Schäden/Klang, drei Arenen/Duellkamera und optionale Werkstatt. Vorher/Nachher-Bilder sowie vier kurze Filmproben erstellt; persönliche Hör-/Handyabnahme und breite Werkstatt-Balance bleiben offen. | `3680003`, `2b1b866`, `7449318`, `2fcdbdc`, `3dcfb22`, `dee69cf` | [Qualitätsbericht](SCRAP_VIDEOQUALITAET_2026-11-13.md) |
| Neues Szenario **Endless Mycelium** auf Branch `endless-mycelium`: Myzel wächst, frisst Laub bis aufs Gerippe, bildet Pilze und Sporen, vergeht und keimt in der nächsten Farbe neu. 13 Regler (10 Ablauf, 3 Darstellung ohne Neustart), Hoch-/Querformat, YouTube-Standard 1440p60 CRF 16 über neue optionale `videoDefaults`, weiche erzeugte Töne (−14 LUFS bei 1,7 dB Begrenzung), Short- und 10-Minuten-Vorlage. Bild 1440p60 58–74 ms (anfangs 180–250 ms). Suite 123/123, Seeschlacht/Kugelfabrik-Golden unverändert. Noch nicht in `main`; Handy-Abnahme offen (R23). | `e254ce4` | [Myzel-Bericht](MYCELIUM_2026-11-13.md) |
| Endless Pyramid, R23 P3: Licht-Füllung (900 Glasfelder, voll kurz vor dem Finale, Fortschrittsbalken) und Finale mit Feuerwerk, Fanfare und jubelnden Tierchen; drei neue erzeugte Klänge, vier Regler; Kern übergibt Videoeinstellungen an `create()`. Simulation unverändert. | `endless-pyramid` | [Nachtrag Füllung/Finale](ENDLESS_PYRAMID_2026-11-13.md#nachtrag-licht-füllung-und-finale-r23-p3) |
| Endless Pyramid, R23 P2: Tageslauf über die Videolänge (Morgen bis Nacht, Sonne, Abendrot, Sterne und Mond, Innenlicht, müde Tierchen mit Schlafmützen); sechs neue Regler; reine Darstellung, Simulation unverändert. Ohne P1-Vorschau auf ausdrücklichen Wunsch. | `endless-pyramid` | [Nachtrag Tageslauf](ENDLESS_PYRAMID_2026-11-13.md#nachtrag-tageslauf-r23-p2) |
| Endless Pyramid als viertes Szenario (Branch `endless-pyramid`, isoliert entwickelt): begrünte Glaspyramide mit Becherwerk im Glasschacht, Murmelbahn mit Wendekappen und Lagune; Leuchtkugeln oder testweise Tierchen (Küken, Pinguin, Schweinchen, Frosch) mit Ärmchen und Beinchen; acht Klänge mit eigenen Reglern (vier neu im Code erzeugt), 17 Regler für Physik und Darstellung inklusive Gesamttempo und Einzeltempi bis 0,25×, Hoch-, Quer- und Quadratformat. Andere Szenarien und Golden-Referenzen unverändert; Hör- und Filmabnahme offen. | `endless-pyramid` | [Endless Pyramid](ENDLESS_PYRAMID_2026-11-13.md) |
| Scrap-Integration und Produktionsabsicherung nach gezielter Minimalprüfung über PR #3 in main zusammengeführt. Live-Abbruch bestanden, Audio-Abweichung bereits im bisherigen main vorhanden; vollständige CI-Abnahme bleibt als R02 offen. | `34c63aa` | [CI-Nachtrag](CI_ERSTLAUF_2026-11-13.md) |
| Beauftragte Minimalprüfung: Live-Abbruch bestanden; Audio-Spitzenabweichung −0,7 dBTP im aktuellen Stand und im bisherigen main identisch reproduziert. Kein neu eingeführter Audiofehler, keine gelockerten Grenzen. Vollständige CI-Abnahme bleibt offen. | `13734ac` (Diagnose von `5cec854`), `9d6510e` (Workflow für Baseline `0f87887`) | [CI-Nachtrag](CI_ERSTLAUF_2026-11-13.md#nachtrag--gezielte-minimalprüfung-vor-dem-merge) |
| Vorhandenen Stand gepusht und PR #3 angelegt. Erste GitHub-CI-Läufe ausgewertet: beide am 25-Minuten-Limit abgebrochen, zuvor zwei bzw. drei Einzeltestfehler. Protokolle gesichert; bewusst kein Merge. R02 bleibt vor dem geplanten Ausbau offen. | `5cec854` (geprüfter Stand) | [CI-Erstlauf](CI_ERSTLAUF_2026-11-13.md) |

## 12.11.2026

| Was | Commit | Bericht |
|---|---|---|
| Sechs Scrap-Qualitätspakete mit Umfangsgrenzen und Abschlusskriterien als R22 geplant. Zuerst Roboter/HUD und Treffer/Klang, danach Kampfablauf, Turnier, Arenen/Kamera und kleine optionale Werkstatt. Noch keine Umsetzung dieser Erweiterungen. | `d04e47a` | [ROADMAP](ROADMAP.md) |
| Scrap Wars als drittes Szenario: gesicherter Quellprototyp, Canvas-Capture, Hoch-/Querformat-HUD und Ergebnis, vollständiger Ereigniston, feste 120-Hz-Physik und deterministische Folgerunden. Kurze Ausschnitte bewahren die Originalepisode samt Tonmischung. 113 Fälle durch Gesamtlauf und zwei gezielte Testkorrekturen abgedeckt; Naval-/Marble-Referenzen unverändert. R06 technisch umgesetzt, R20-Film-/Hörabnahme offen. | `2981dd1` (Quelle `3808ebe`) | [Scrap-Integration](SCRAP_WARS_INTEGRATION_2026-11-12.md) |
| R08 abgeschlossen: tatsächliche Encoder-/Capturewerte, Git-/Laufzeitnachweis, Skript- und Audioereignisprüfsummen im Wiederholungsrezept. R11 A/B/C abgeschlossen: abbrechbare Prozesse und Audio-Worker, Phasenstatus, Prüfung vor MP4-/JSON-Übernahme und Wiederherstellung vorhandener Ausgaben. 97 Fälle erfolgreich abgedeckt (Gesamtlauf plus gezielte Live-Wiederholung); Referenzen unverändert. | `4676d3b` | [Produktionsabsicherung](PRODUKTIONSSICHERUNG_2026-11-12.md) |
| R02 vorbereitet: CI für Push/PR, gebundene Node-/Playwright-Versionen, FFmpeg, Software-Rendering, Golden-Prüfung und Protokolle. Lokale Fehlersignalisierung geprüft; erster GitHub-Runnerlauf noch offen. | `79f4295` | [Produktionsabsicherung](PRODUKTIONSSICHERUNG_2026-11-12.md) |
| Seeschlacht: Himmelsverlauf (Morgengrauen am Videoende, mind. 10 min), Sternschnuppen (≈ alle 75 s, jedes Video mindestens eine), Wal am Horizont (≈ alle 3½ min), goldene Kugel mit Zähler „GOLDEN BALL · fired n×“; alles einzeln schalt- und einstellbar, reine Darstellung, Referenz-Hashes unverändert; Vorlagen für YouTube-Short und 10-Minuten-Video (R19 erledigt) | `8c0d9fd` | README, „Seeschlacht: Himmel, seltene Ereignisse und goldene Kugel“ |
| Seeschlacht: Mondlicht (Mond über der Lücke zwischen den Schiffen, Glitzerbahn, Lichtbahnen unter Wasser), Mündungsfeuer beleuchtet kurz Segel und Rumpf, Schaum am Rumpf; reine Darstellung, Referenz-Hashes unverändert (R19, Teil) | `c886008` | README, „Bewertung und bekannte Schwächen“ |
| Seeschlacht: „Tock“, wenn eine Kugel am Grund aufsetzt, „Tink“, wenn sie im Regal ankommt; zwei neue Lautstärkeregler; Klänge nach Kennwerten ausgewählt, noch nicht angehört (R19, Teil) | `4a7347c` | README, Abschnitt „Ton“ |
| Seeschlacht: Mulden am Meeresgrund, Glasrohr durch den Kiel, Beuteprinzip im Duell; Lebensbalken im Querformat in den Ecken; „Hits taken“ gestrichen; Referenz-Hashes der Seeschlacht neu gesetzt (R01, Teil Rohre/Anschlüsse/Rinne) | `33f8eb1` | [NAVAL_MULDEN_LIFT](NAVAL_MULDEN_LIFT.md) |
| Roadmap und Changelog zusammengeführt; Umsetzungsplan darin aufgegangen | – | [ROADMAP](ROADMAP.md) |
| Audit des Gesamtzustands (stabil, keine ernsten Mängel, acht Hotzones, Checkliste für neue Szenarien); README auf aktuellen Stand | `f2f5e6f` | [AUDIT_2026-11-12](AUDIT_2026-11-12.md) |
| Ton: Einmessung jeder Tonspur auf YouTube-Lautheit (−14 LUFS), Spitzenbegrenzer mit Vorausschau, Regler 0–200 % in beide Richtungen | `20ea040` | README, Abschnitt „Ton“ |
| Ton: Lautstärkeregler gesamt und je Klang in Oberfläche, CLI, Teilen-Link und JSON (Hoch- und Querformat) | `9d0c24d` | README, Abschnitt „Ton“ |

**Veröffentlicht (bis 12.11.2026, genaues Datum nicht festgehalten):** erstes Short und erstes Video auf YouTube.

## 11.11.2026

| Was | Commit | Bericht |
|---|---|---|
| Seeschlacht: Sammelrinne reicht von Rohrfuß zu Rohrfuß statt aus dem Bild | `812422e` | – |
| Seeschlacht: Ton aus Schuss, Treffer und Platscher mit Dichtebegrenzung | `6d4e475` | – |
| Seeschlacht: Recycling als gemeinsame Sammelrinne mit Glasrohren und Farbschimmer | `6eb8d17` | – |
| Tempo 0,64×, langsamere Regler der Seeschlacht, Auflösung und Bildrate in der Oberfläche | `940c967` | – |
| Seeschlacht: Querformat für Vollbild-Videos (Schiffe weiter auseinander, mehr Himmel) | `4a29c23` | [NAVAL_QUERFORMAT](NAVAL_QUERFORMAT.md) |
| B01: Recycling der Seeschlacht ruhig gezeichnet | `4ebca00` | [B01_NAVAL_RECYCLING](B01_NAVAL_RECYCLING.md) |
| W1/W2: Online-Vorschau über GitHub Pages, Handybedienung, Teilen-Link, JSON laden/speichern, `start.bat` | `553d0ea`, `4aaac3f`, `9589724` | [W1_W2_PLAYLINK_START](W1_W2_PLAYLINK_START.md) |
| Schritt 4: Vorlage und Bericht für das erste Short (30 s, 1080p60, mit Ton) | `fad2cb4` | [SCHRITT_4_ERSTES_SHORT](SCHRITT_4_ERSTES_SHORT.md) |
| Schritt 3: Ton für die Kugelfabrik (Ereignisprotokoll, Mischer, Stummoption) | `4c6709a` | [SCHRITT_3_MARBLE_TON](SCHRITT_3_MARBLE_TON.md) |
| Schritt 2: Trichterstau der Kugelfabrik konstruktiv entschärft | `cb8a437` | [SCHRITT_2_MARBLE_TRICHTER](SCHRITT_2_MARBLE_TRICHTER.md) |
| Kugelfabrik: Titelrahmen folgt der Schriftbreite | `3e99d9e` | [SCHRITT_1_BEDIENFEHLER](SCHRITT_1_BEDIENFEHLER.md) |
| Schritt 1: Bedienfehler geschlossen (freie Videodauer, kurzer Standard 45 s, unbekanntes Szenario) | `5d91778` | [SCHRITT_1_BEDIENFEHLER](SCHRITT_1_BEDIENFEHLER.md) |
| Schritt 0: Ausgangsbasis (Referenz-Hashes, Referenzbilder, Messwerte); Umsetzungsplan angelegt | `6f77502` | [AUSGANGSBASIS_2026-11-11](AUSGANGSBASIS_2026-11-11.md) |

## 10.11.2026

| Was | Commit |
|---|---|
| `.claude/` ignorieren | `0f13787` |
| Englische Texte im Video, Zeitlupe 0,8× | `b14334c` |
| Zweites Szenario: Endless Marble Factory (visueller Prototyp V0.1) | `d186d25` |
| Phase A: Endless Naval Battle mit deterministischem MP4-Export | `8f4d4d0` |

## Entscheidungen

| Datum | Entscheidung |
|---|---|
| 13.11.2026 | Folgeauftrag: nur die minimal nötigen Audio-/Abbruchtests vor dem Merge. Live-Abbruch besteht; der Audiofall verfehlt die Spitzenreserve in altem und neuem Stand identisch um 0,3 dB. Daher Integration gemergt und bestehende Abweichung als Nacharbeit dokumentiert; keine vollständig grüne CI behauptet, keine Testgrenzen gelockert. |
| 12.11.2026 | Alle sechs Scrap-Qualitätsvorschläge zur begrenzten Umsetzungsplanung angenommen: Roboter/HUD, Treffer/Klang, Kampfablauf, 8-Runden-Turnier, insgesamt drei Arenen mit ruhiger Kamera und kleine optionale Werkstatt. R22 in der ROADMAP ist der einzige aktive Plan; zuerst P1/P2, kein paralleler Hex-/Marble-Ausbau und noch keine Umsetzung dieser Erweiterungen. Bestehenden Stand committen/pushen und bei bestandenen Prüfungen mergen ausdrücklich erlaubt. |
| 12.11.2026 | Folgeauftrag: Scrap Wars jetzt schrittweise nach R06/R20 integrieren. Die Marble-Erweiterung bleibt ausdrücklich als isolierter lokaler Prototyp stehen. Keine neuen Scrap-Spielmechaniken vor der Filmabnahme. |
| 12.11.2026 | Nach gemeldetem Naval-Short und 10-Minuten-Video hat Naval keinen Vorrang vor neuer Inhaltsentwicklung. Produktionsabsicherung ausdrücklich beauftragt und umgesetzt. Marble zunächst als isolierten lokalen Versuch ansehen; noch keine Entscheidung für die Integration. Scrap Arena bleibt der nächste Kandidat für ein eigenständiges Szenario, Hex V0.3 folgt danach. |
| 12.11.2026 | Short: 3 Kanonen statt 2 gegen die Action-Pause am Anfang (vorher 3,3 s ohne Schuss, jetzt höchstens 1,7 s); Feuerrate 0,7 je Kanone und Geschosse 0,8 halten es ruhig (≈ 1,3 statt 1 Schuss pro Sekunde). Das lange Video bleibt bei 2 Kanonen. |
| 12.11.2026 | Himmelsverlauf, Sternschnuppe und Wal nach Vorschau freigegeben („so einbauen“), Himmel an die Videolänge gekoppelt; goldene Kugel für Short und langes Video; alles mit Schaltern, Standard = Empfehlung. Uploads in 1440p60 (YouTube vergibt ab 1440p den besseren VP9-Codec), Festlegung ohne eigene Rückfrage. |
| 12.11.2026 | **E2** – Aus R19 werden zuerst „Tink“/„Tock“, Mondlicht sowie Mündungsfeuer-Licht und Schaum umgesetzt; Mondlicht und Licht nach Vorher/Nachher-Bildern freigegeben („so perfekt“). Goldene Kugel als eigener Schritt, Himmelsverlauf und seltene Ereignisse zurückgestellt (Empfehlung übernommen, nicht eigens bestätigt). |
| 12.11.2026 | Seeschlacht: Umbau mit Physikänderung freigegeben (R01 sah reine Darstellung vor) – Mulden, Lift durch den Kiel, Beuteprinzip im Duell; nach Vorschau bestätigt. Bei drei und vier Schiffen behält jedes Schiff seine Kugeln (Festlegung nach Messung, nicht eigens bestätigt). |
| 12.11.2026 | Ton aller Szenarien wird auf YouTube-Lautheit (−14 LUFS) eingemessen; Regler wirken relativ dazu in beide Richtungen. |
| 12.11.2026 | Offene Punkte werden nur noch in der [ROADMAP](ROADMAP.md) geführt. |
| 11.11.2026 | **A** – Erstes Short: einfacher 30-Sekunden-Clip der laufenden Kugelfabrik. |
| 11.11.2026 | **C** – Kenney Impact Sounds (CC0) dürfen für alle Szenarien verwendet werden; Dateiliste und Lizenznachweis bleiben Pflicht. |
| 11.11.2026 | **D** – GitHub Pages eingeschaltet (öffentliche Online-Vorschau). |
| 11.11.2026 | **E** – Kurzer Standard für die Videolänge: 45 s (Empfehlung übernommen, nicht eigens bestätigt). |
| 11.11.2026 | **F** – Referenzbilder liegen im Repository (Empfehlung übernommen, nicht eigens bestätigt). |
