# Scrap Wars: sechs begrenzte Qualitätsschritte

Stand: 13.11.2026. Ausgangspunkt: sauberes `main`/`origin/main` an `247992a`;
Arbeitsbranch `codex/scrap-video-quality`. Keine anwendbare AGENTS.md gefunden.
Der Nutzer hat alle sechs Schritte ausdrücklich zur Umsetzung freigegeben, mit Vorher/Nachher-Bildern.
Die bisherige CI-Nacharbeit ist damit keine vorgeschaltete Freigabeschleife; ihr offener Stand bleibt R02.
Dieser Bericht dokumentiert Nachweise. Offene Arbeit wird ausschließlich in der [ROADMAP](ROADMAP.md) geführt.

## Gelieferter Umfang

Die Paketnummern stammen aus dem ursprünglichen Plan; umgesetzt wurde die später bestätigte Reihenfolge:

| Schritt | Commit | Ergebnis |
|---|---|---|
| P1 Roboter/HUD | `3680003` | Vier farbige, kosmetisch verschiedene Chassis; feste Kollisionskontur; kompaktere Anzeigen in allen Formaten. |
| P3 Kampfablauf | `2b1b866` | Genau zwei Änderungen in `rulesVersion=v2`: Waffen-/Stationsziel nach Entfernung, Wartezeit und Hindernis wählen; Nachschubzyklen 25 % kürzer. Original bleibt verfügbar. |
| P4 Turnier | `7449318` | Optional acht Runden, sortierter Zwischenstand, geteilte Sieger bei Gleichstand, fünf Sekunden Gesamtergebnis. Ein deterministischer, abbrechbarer Vorlauf berechnet die Dauer für UI, Video, Ton und Rezept. |
| P2 Schäden/Klang | `2fcdbdc` | Intakt (>⅔ HP), beschädigt (>⅓ HP), kritisch (≤⅓ HP); feste Kratzer und höchstens drei analytische Rauchpartikel pro kritischem Roboter. Weniger doppelte Schussfunken, abgestimmte Klangpegel/-dichte. |
| P5 Arenen/Kamera | `3dcfb22` | Scrapyard plus Foundry und Crossroads, keine neuen Waffen. Duellkamera bis 1,4× folgt festen Videoticks; HUD/Ergebnis bleiben fest. |
| P6 Werkstatt | `dee69cf` | Optionales Turnierexperiment: drei Module mit Nachteilen, ein Slot, eine Aufrüstung je Roboter. Anzeige in bestehender Pause, sichtbare Anbauteile ab Folgerunde, Reset beim Neustart. |

Keine Änderungen an der gesicherten HTML-Quelle, extrahierter Simulation oder extrahiertem Renderer.
Neue Regeln stehen in `src/scenarios/scrap/rules.js`; Darstellung bleibt im Adapter `src/scenarios/scrap.js`.
Bestehende Konfigurationen ohne Regelversion verwenden weiterhin `classic`, freie Videolänge und Scrapyard.
Neue Parameter werden durch Oberfläche, Link, JSON und CLI erhalten. `scrap-episode-v2` kennzeichnet den
erweiterten Zustandshash; geänderte Episoden-Hashes sind kein Beleg für geänderte Originalphysik.

## Kampfablauf: gemessene Wirkung

Messung: jeweils erste vollständige Runde, Seeds 42/7/314, feste 120 Hz. Ergebnispausen zählen nicht als Leerlauf.
Unbewaffneter Anteil = unbewaffnete lebende Robotersekunden / alle lebenden Robotersekunden.
Zwei Zielwahlvarianten wurden verglichen; die erste wurde wegen eines 26,7-s-Suchwegs verworfen.

| Seed | Längste Feuerpause alt → v2 | Längste Trefferpause alt → v2 | Unbewaffneter Anteil alt → v2 | Längste individuelle Suche alt → v2 |
|---|---|---|---|---|
| 42 | 4,41 → 1,76 s | 4,82 → 2,19 s | 54,7 → 46,7 % | 19,37 → 8,02 s |
| 7 | 4,68 → 1,84 s | 6,99 → 4,83 s | 52,7 → 45,5 % | 11,17 → 11,17 s |
| 314 | 7,29 → 2,51 s | 7,04 → 4,45 s | 57,9 → 51,3 % | 16,66 → 18,94 s |

Der Gesamtkampf wird in diesen Fällen kontinuierlicher. Nicht jeder einzelne Suchweg verbessert sich:
Seed 314 bleibt ausdrücklich eine Grenze. Es wurde kein neues Navigationssystem gebaut und kein Sieger erzwungen.
Messdaten lokal unter `output/scrap-upgrade/flow-classic.json` und `flow-v2.json`.

## Turnier und Werkstatt

Freie Videolänge bleibt Standard. Im Acht-Runden-Modus ersetzt die berechnete Gesamtdauer `video.durationSec`;
ein willkürlich kurzer Dauerwert schneidet das Turnier nicht ab. Kurze Tests verwenden explizite Clips.
Der Vorlauf erstellt weder Bilder noch Ton; Export sammelt später alle Ereignisse für die vollständige Mischung.
Maximale Laufzeit ist begrenzt (acht Runden à höchstens 90 Simulationssekunden, sieben Pausen, fünf Sekunden Schluss).

Werkstatt: ein Punkt pro abgeschlossener Runde, ein weiterer ab 100 verursachtem Schaden. Vier Punkte
installieren ein deterministisch bestimmtes Modul: Plating +15 % HP/−8 % Tempo, Drive +12 % Tempo/−10 % HP,
Capacitor −12 % Schusspause/−8 % HP. Danach keine weiteren Punkte/Upgrades. Keine persistenten Werte.

Vergleich auf Scrapyard, v2, 1×, drei Sekunden Pause. Siege in Reihenfolge Ember/Azure/Amber/Moss:

| Seed | Ohne Werkstatt | Mit Werkstatt | Episodendauer ohne → mit |
|---|---|---|---|
| 42 | 3/3/0/2 | 2/1/0/5 | 417,23 → 466,82 s |
| 7 | 1/3/1/3 | 2/0/4/2 | 430,95 → 434,35 s |
| 314 | 3/3/1/1 | 3/1/4/0 | 463,35 → 462,47 s |

Alle Läufe gültig, alle Roboter genau einmal aufgerüstet. Das ist kein breiter Balance-Nachweis;
insbesondere die Verteilung 5/8 bei Seed 42 rechtfertigt noch kein Urteil über dauerhafte Dominanz.
Die Werkstatt ist deshalb optional und in der Oberfläche als experimentell gekennzeichnet.

## Bilder und Tonmessung

Vorher: `247992a`, nachher: neue Fassung mit Originalregeln, Seed 42, Kamera aus.
Die Bilder bei 12 s besitzen in Hoch- und Querformat denselben Rundenzustand `6aa0be4d`.
Bei 501,2333 s (eine Sekunde nach Runde acht) lautet der Rundenzustand beider Fassungen `dfe21012`;
die neue Fassung zeigt zusätzlich das Turniergesamtergebnis. Die Episodenkonfiguration ist dafür bewusst verschieden.

Lokale Dateien unter `output/scrap-upgrade/` (bewusst nicht ins Repository aufgenommen):

- `before-action-landscape.png` / `after-action-landscape.png`
- `before-action-portrait.png` / `after-action-portrait.png`
- `before-round-eight.png` / `after-round-eight.png`
- `foundry.png`, `crossroads.png`, `duel-camera.png`, `workshop-award.png`, `workshop-installed.png`
- JSON-Manifeste mit Konfiguration, Zeitpunkt, Hash und Zustandsprüfung sowie ausführbare Capture-Helfer.

Die Bilder wurden betrachtet; sie ersetzen keine Film-/Hör- oder echte Handyabnahme.
Tonvergleich am selben 20-s-Verlauf (v2, Seed 42), nur Klangtabelle gewechselt:
179 → 146 Stimmen, nach AAC jeweils −14,1 LUFS und −1,2 dBTP. Die Limiterabsenkung bleibt groß
(rund 18,9 dB); die technische Messung behauptet keine gehörte Klangqualität. Mischer und andere Szenarien unverändert.

Vier echte 1080p30-Proben wurden mit Chromium/SwiftShader und FFmpeg erzeugt; kein Video länger als zwölf Sekunden:

| Lokale MP4 | Dauer / Frames | AAC-Lautheit / True Peak | Ergebnis |
|---|---|---|---|
| `quality-portrait.mp4` | 12 s / 360 | −14,1 LUFS / −1,1 dBTP | Hochformat, v2, ab Beginn |
| `duel-landscape.mp4` | 8 s / 240 | −15,5 LUFS / −1,3 dBTP | Duell und Rundenende, Episode 36–44 s |
| `workshop-transition.mp4` | 9 s / 270 | −13,3 LUFS / −1,3 dBTP | Modulvergabe und Folgerunde, Episode 92–101 s |
| `tournament-finale.mp4` | 6 s / 180 | −13,2 LUFS / −1,5 dBTP | Letzte Sekunde der achten Runde plus fünf Sekunden Gesamtergebnis |

Format, Dauer, Bildzahl und Simulationsprüfung bestanden, null verlorene Tonereignisse. Die Turnierclips
verwenden alle 2.958 Ereignisse der vollständigen Episode (2.393 Stimmen, −14,05 LUFS vor Ausschnitt).
Die Lautheit eines Ausschnitts darf von der vollständig normalisierten Episode abweichen; er wird nicht
nachträglich anders gemischt. Die Testencoder-Voreinstellung ist `ultrafast`, keine abschließende Produktionswahl.

## Prüfstand

Gezielte Schritte bestanden: Originalquellvergleich und drei vollständige Originalzustände;
v2 ohne lange Feuerpausen in den drei Prüfseeds; alle Tempi; acht Runden mit fünf Sekunden Schluss;
UI-/Exportdauer einschließlich Abbruch; alle neuen Parameter über Link/JSON;
Erreichbarkeitsprüfung und neun Runden auf drei Karten; identische Kamera-Captures bei Vorlauf und 30/60 fps;
Werkstattgrenzen, Folgerundenwirkung, Reset und Reproduktion bei Zeitlupe; kurze echte MP4s und bitgleiche Wiederholung.

Der erste gezielte Teilen-Test lief beim Laden eines zweiten gleichzeitigen Live-Tabs ins 30-s-Zeitlimit.
Der Test lädt den Link jetzt im selben Tab; sämtliche Konfigurations-/JSON-Vergleiche bleiben erhalten.
Damit entfällt ein unnötiger zweiter laufender Software-Renderer. Die gezielte Wiederholung bestand;
ein neuer Linux-CI-Lauf wurde damit nicht ersetzt. Es wurden keine Grenzwerte gelockert.

Abschließender Windows-Gesamtlauf: **120 Tests, 119 bestanden, ein fehlgeschlagener UI-Test**, keine abgebrochenen
oder übersprungenen Fälle; 1.080,91 s Laufzeit. Der konkrete Unterschied war ausschließlich der noch alte
Teilen-Link-Dauerwert **45 statt 551,0333 s**. Der neue automatische Vorlauf war bereits fertig, das getrennt
aktualisierte Linkfeld noch nicht. Der Test wartet nun zusätzlich auf sämtliche neuen Parameter und die
berechnete Dauer. Alle Inhaltsvergleiche bleiben unverändert. **Gezielte Wiederholung: 1/1 bestanden**
(45,15 s einschließlich Browserstart/-ende). Damit sind alle 120 Fälle durch Gesamtlauf und Nachtest abgedeckt;
es wird kein vollständig grüner einzelner Gesamtlauf behauptet. Logs: `output/scrap-upgrade/full-suite.log`
und `ui-repeat.tap`.

Enthalten sind die vollständige Turnier-Tonmischung samt vier Modulen und bitgleichem Exportrezept,
der echte Live-Abbruch während Audio (52,55 s einschließlich vorherigem Rendern; Aufräumen innerhalb der
unveränderten 2,5-s-Grenze) sowie die Naval-/Marble-Golden- und Langlaufprüfungen.
Umgebung: Windows, Node 22.17.1, Playwright 1.60.0, Chromium 148.0.7778.96/SwiftShader,
FFmpeg N-121425-g0bc54cddb1-20251013. Die bekannte Linux-/FFmpeg-6.1.1-Abweichung und ein vollständiger
GitHub-CI-Nachweis bleiben R02; diese Umgebung wurde hier nicht erneut geprüft.

Naval-/Marble-Goldenreferenzen wurden nicht neu geschrieben. Der isolierte Marble-Prototyp ist unverändert:
SHA-256 `1ABA7E335DF93CF723297BEBF18C40CD645B38C639FA947B43F5A9C88778E24B`.
