# Scrap Wars: große Arena und drei Materialien

Stand: 13.11.2026, Folgeauftrag auf `26fb115`, Branch `codex/scrap-video-quality`.
Dieser Bericht dokumentiert die gezielte Korrektur nach dem abgelehnten ersten Bildaufbau.
Der frühere [Qualitätsbericht](SCRAP_VIDEOQUALITAET_2026-11-13.md) bleibt historischer Nachweis;
offene Aufgaben bleiben ausschließlich in der [ROADMAP](ROADMAP.md), R20/R22.

## Auftrag und Ergebnis

Der Nutzer verlangte ein fast bildfüllendes Spielfeld, klare Bildkomposition und drei verschieden
haltbare Materialien: Holzkisten, Steinblöcke, Beton. Maschinenwracks als Arenadekoration wurden verworfen.

- V3 verwendet eine echte **1040×540-Physikwelt**. Die Arena einschließlich schmalem Rand belegt
  **90,0 % des 1920×1080-Bildes**, zuvor belegte die quadratische Arena 48,2 %.
- Die beiden großen Seitenbereiche entfallen. Name, HP, Munition und Siege stehen in einer schmalen
  Kopfzeile; zusätzliche Roboterzustände bleiben direkt an der Figur erkennbar.
- Spiegelgleiche Deckungsgruppen, ein passierbarer Mittelweg und ein Außenring ordnen alle drei Karten.
  Keine neuen Waffen, Maschinen, Karteneditoren oder Navigationssysteme.
- Holz hat Bretter und Kreuzstreben, Stein kantige Flächen, Beton einen hellen massiven Körper.
  Feste Schadensrisse vertiefen sich; Splitter, Staub und flache Trümmer unterscheiden den geöffneten Weg
  von intakter Deckung. Trümmer sind keine neuen Kollisionsobjekte.
- Hochformat dreht dieselbe Arena um 90°. Roboterbeschriftung und HUD bleiben aufrecht, der Verlauf
  bleibt gleich. Quadrat zeigt die ganze Arena mit freien Rändern; die Komposition priorisiert 16:9.
- Ruhiger Duellzoom höchstens 1,25×, feste Video-Ticks, gemeinsames Bild-/Audio-Koordinatensystem.

| Material | HP | Direkte Blastertreffer | Direkte Raketentreffer |
|---|---:|---:|---:|
| Holzkiste | 38 | 2 | 1 |
| Steinblock | 95 | 5 | 1 |
| Betonblock | 190 | 10 | 2 |

Die Raketenwerte gelten für direkte Treffer; der vorhandene Flächenschaden nimmt mit Entfernung ab.
Waffenschaden und Nachschubregeln bleiben gegenüber V2 unverändert. Die Material-Haltbarkeit und die
kleinere rechteckige Fläche ändern absichtlich Rundenverlauf und Siegerfolge.

## Kompatibilität und Aufbau

`rulesVersion=v3` ist der neue Standard für neue Konfigurationen ohne ausdrückliche Regelversion.
`classic` und `v2` bleiben auswählbar und behalten ihre bisherige Simulation und Darstellung.
Alte externe Links/JSON ohne Regelversion müssen für Originalresultate ausdrücklich `classic` setzen;
die zwei vorhandenen 20-s-Referenzvorlagen wurden entsprechend festgeschrieben.
Turnier-/Werkstattvorlagen verwenden jetzt V3; neue kurze Vorlage: `presets/scrap-materials.json`.

Die archivierten Dateien `simulation.js`, `renderer.js` und die HTML-Quelle bleiben unverändert.
`materials.js` erweitert die bestehende Runde um Geometrie und die notwendigen Rechteckgrenzen bei
Zielwahl, Kollision, Waffenablage und durchgehender Projektilkollision. Die entsprechenden lokalen
Gleichungen stammen aus der Referenz; Lebenspunkte, Kontakte, Schießen, Rundenende und Versorgung
verwenden weiterhin die Basisklasse. Es gibt keinen allgemeinen Engine-Umbau.
`material-art.js` zeichnet aus Zustand und zustandslosem Texturrauschen. Der Kampf-RNG wird nicht aus
dem Renderer aufgerufen. Textur-/Effektpuffer bleiben begrenzt. Der vollständige Episodenhash kennzeichnet V3.

## Prüfung

- Bisherige 13 reine Scrap-Tests bestanden, einschließlich unveränderter Quelle und vollständiger
  Original-Rundenzustände der Seeds 42, 7 und 314.
- Drei zusätzliche V3-Tests bestanden: tatsächliche schnelle Projektilkollision, Trefferzahlen,
  Wegfreigabe nach Zerstörung, neue Außenwand, unabhängige Begehbarkeitsprüfung aller drei Karten,
  neun vollständige Runden mit Invarianten/Kamera, Acht-Runden-Turnier mit Modulen,
  Hoch-/Querformat, Tempo 0,64 und gleiche UI-/Exportplanung.
- Browser-/Golden-Lauf: 11/12 bestanden. Der MP4-Replayvergleich eines Ausschnitts fiel während noch
  laufender Rendereränderungen auf; Zustand, Audio und kontinuierliche Clipbilder waren bereits gleich.
  Der betroffene Vergleich sowie Canvas-/Kameraprüfung bestanden am anschließend eingefrorenen Stand
  **3/3**, einschließlich bytegleicher MP4-Wiederholung. Damit sind alle betroffenen Fälle abgedeckt;
  ein einzelner grüner 12/12-Lauf wird nicht behauptet. Siehe `output/scrap-materials/stable-render-repeat.tap`.
- Naval-/Marble-Goldenwerte unverändert, keine Referenzdateien neu gesetzt.
- UI-Regler, Teilen-Link und JSON für V3, kurze MP4s beider Formate, Rundenwechsel/Abbruch sowie
  vollständiger Turnierton/Module der bisherigen V2-Variante geprüft.
- Neue V3-Kamerabilder stimmen bei kontinuierlichem Rendern, Vorlauf und 30/60 fps auf allen drei
  Karten in beiden Videoformaten exakt überein. Rendereraufrufe verändern die Simulation nicht.

Dies ist eine gezielte Änderung mit betroffenen Tests, kein neuer vollständiger Projekt-/Linux-CI-Lauf.
Protokolle: `output/scrap-materials/material-tests.tap`, `browser-golden.tap`, `stable-render-repeat.tap`.
Der isolierte Marble-Prototyp ist unverändert (SHA-256
`1aba7e335df93cf723297bebf18c40cd645b38c639fa947b43f5a9c88778e24b`).

## Verlauf und Bildnachweise

Neun reine Erstrundenproben: drei Karten × Seeds 42/7/314. Rundendauer 24,81–55,93 s;
8–13 von 16 Deckungen zerstört. Sie sind kein breiter Balancenachweis. Längste Schusspause
1,32–4,72 s, davon der höchste Wert bei Crossroads/Seed 7. In diesem Folgeauftrag wurde keine
weitere KI-/Nachschubkorrektur vorgenommen. Rohdaten: `output/scrap-materials/metrics.json`.

Vorher/Nachher: Seed 42, Scrapyard, 16:9, Turnier, Tempo 1, HUD an, Kamera aus, jeweils bei 12 s.
Vorher ist die bisherige V2-Arena; nachher V3. Aufgrund der gewollten Geometrie-/Materialänderung sind
dies gleiche Aufnahmebedingungen, keine identischen Kampfpositionen.

- `output/scrap-materials/before.png` und `after.png`: direkte Bildgegenüberstellung.
- `start.png`, `later.png`: Anfang und 20 s derselben neuen Runde; echte zunehmende Zerstörung.
- `portrait.png`, `square.png`, `foundry.png`, `crossroads.png`, `finale.png`: weitere Ansichten.
- `preview-manifest.json`: Konfiguration, Zeitpunkt, Snapshot, Hash und Invarianten je Bild.
- `material-arena-12s.mp4`, zugehöriges Exportrezept und `export-report.json`: kurze echte 1080p-Probe mit Ton.

Die Probe enthält 360 Frames bei 30 fps, 142 Audioereignisse, 98 gemischte Stimmen, keine verlorenen
Ereignisse und gültige Simulationsinvarianten. Die fertige AAC-Spur misst −14,1 LUFS / −1,3 dBTP.
Der vorhandene Mischer begrenzt weiterhin stark (maximal 20,1 dB); in diesem Auftrag wurden keine
neuen Klänge oder Mischregeln eingeführt. Eine persönliche Hörabnahme wird daraus nicht abgeleitet.

Alle Dateien liegen unter `output/scrap-materials/` und sind generierte lokale Prüfartefakte.
Einzelbilder wurden visuell angesehen. Persönliches Gefallen, Hörurteil und echte Handybetrachtung sind
damit nicht vorweggenommen. Kein Videoexport über 20 Sekunden und keine Erweiterung des Marble-Prototyps.

## Nachtrag – Sunny Yard

Ausgangsstand dieses Folgeauftrags: `57886f4`, Arbeitsverzeichnis sauber. Der Nutzer bewertete den
großen Bildaufbau als „viel besser“ und beauftragte zusätzlich eine Gute-Laune-Karte.

**Sunny Yard** (`arena=sunshine`) ergänzt die vorhandenen drei Karten um einen eigenen spiegelgleichen
Grundriss. Türkisfarbener Boden, flach aufgemalte Sonne, Wimpelrand, Smiley-Holzkisten,
Blumen-Steinblöcke, Regenbogen-Beton und blütenförmige Nachschubfelder bilden den neuen Stil.
Die Bemalung liegt unter den Schadensrissen; Splitter übernehmen die Materialfarben.
Haltbarkeit bleibt 38/95/190 HP, Waffen und Nachschub unverändert. Keine zusätzlichen Physikobjekte,
Musik oder Spielmechaniken. Mittelwege und Außenring bleiben frei.

Die Auswahl aktiviert V3; der Regelwähler ist für diese ausschließlich rechteckige Karte gesperrt.
Nach Wechsel zu einer der bisherigen Karten sind Original/V2 wieder auswählbar. Der Standard bleibt
Scrapyard. Kurzvorlage: `presets/scrap-sunny-yard.json`.

**Gezielt geprüft:** sechs Simulationstests und zwei Browser-/Exporttests bestanden. Darin enthalten:
alle vier Karten × drei Seeds mit unabhängiger Wegprüfung, Kollisionen und Kamera; unveränderte
Originalquelle und drei vollständige Original-Rundenzustände; Turnier-/Tempovertrag; pixelgleiche
Kamerabilder aus Vorlauf und 30/60 fps auf vier Karten in beiden Formaten; Auswahl aus Originalregeln,
Teilen-Link und bytegleicher 2-s-MP4-Replay mit Ton. Kein neuer vollständiger Projekt- oder Linux-CI-Lauf.

Zusätzlich stimmt das Scrapyard-Bild bei Seed 42 / 12 s pixelgenau mit dem vorigen Lieferstand überein.
Start, Kampf, spätere Zerstörung und Hochformat von Sunny Yard wurden als Bilder gerendert und visuell
angesehen. Bilder, Konfigurationen, Snapshots und Hashes stehen in `output/scrap-sunny/manifest.json`;
Prüfprotokolle in `simulation.tap` und `browser.tap` desselben Verzeichnisses. Die zusätzliche
`sunny-yard-12s.mp4` ist eine kurze 1080p-Probe; ihr Messprotokoll heißt `export-report.json`.
Sie enthält 360 Frames, 139 Audioereignisse ohne Verlust und eine geprüfte AAC-Spur mit
−14,1 LUFS / −1,3 dBTP. Eine neue persönliche Hörabnahme ist damit nicht behauptet.
Der isolierte Marble-Prototyp ist weiterhin unverändert.

## Korrektur – sonniger Betonhof und eigene Hochformat-Arena

Ausgangsstand: `2d89cca`, Branch `codex/scrap-video-quality`, Arbeitsverzeichnis zu Beginn sauber.
Die verspielte Sunny-Yard-Fassung im vorigen Nachtrag wurde vom Nutzer als zu kitschig abgelehnt.
Weitere Rückmeldungen betrafen verdrehte Waffenschatten, ungenutzte Bildhöhe in 9:16, Pflanzen am Rand
und störende Kamerafahrten. Die folgenden Änderungen ersetzen diesen Stil; die vorigen Nachweise
beschreiben weiterhin ihren damaligen Stand. Commit, Push und anschließender Merge wurden ausdrücklich beauftragt.

### Darstellung und Grundrisse

- Heller, warmer Mineralboden mit Fugen und dezenten Markierungen. Holz mit Brettern, Maserung und
  Metallbändern, rauer Stein mit Facetten, gegossener Beton mit Poren und Hebeöffnungen. Tiefenkanten,
  feste Risse und materialspezifische Trümmer zeigen intakte und zerstörte Deckung.
- Kleine bepflanzte Tröge mit wenigen hellen Blüten sitzen auf dem Arenarand außerhalb der Spielfläche.
  Die Dekoration fügt keine Kollisionskörper hinzu. Sonne/Smilies, Regenbögen und Blumenbemalung entfallen.
- Deckungsschatten liegen unter sämtlichen Blöcken und Waffen. Die alte dunkle Ellipse unter Waffen
  drehte sich mit dem Gegenstand. Nun wirft die tatsächliche Waffenform einen kleinen, stets nach
  rechts unten versetzten Schatten; auch Trümmer haben eine feste Schattenrichtung. Aufnahmemarkierungen
  sind davon getrennte feine Bögen. Texturen sind begrenzt zwischengespeichert, ohne Kampf-RNG.
- **16:9:** vier gespiegelte Gruppen, 92 Einheiten freier horizontaler Mittelweg und 164 Einheiten
  breite vertikale Mitte. Starts und Bodenwaffen liegen weiter innen. Weiterhin 16 Deckungen:
  acht Holz-, vier Stein- und vier Betonblöcke, unverändert 38/95/190 HP.
- **9:16:** separat in Hochformatkoordinaten entworfener Grundriss. Je zwei Roboter starten oben und
  unten; Trennblöcke am Start, versetzte Deckungen über die Bildhöhe und zwei mittige Nachschubplätze
  schaffen mehrere Laufwege. Es bleibt jeder gegen jeden, keine neue Team- oder Zweiroboterregel.
  Die Koordinaten werden einmal in das vorhandene Physiksystem umgerechnet. Es wird weder der
  Querformat-Grundriss gestaucht noch dessen Kampf unverändert übernommen.
- Sunny Yard darf beim Formatwechsel ausdrücklich andere Siegerfolgen und Turnierlängen liefern.
  Seed, Grundriss und Tempo bleiben reproduzierbar. Die drei bisherigen Karten behalten beim
  Formatwechsel ihre bisherige Physik; quadratisches Sunny Yard verwendet den breiten Grundriss.
- **Feste Kamera für ganz Scrap:** keine Schwenks, Zooms oder abrupten Ausschnittkorrekturen mehr,
  auch bei zwei Überlebenden und beim Rundenwechsel. `supportsCamera=false` normalisiert alte
  `camera=true`-Angaben und deaktiviert den Schalter. Andere Szenarien behalten ihre Kameraoption.
- Waffen, KI-Regeln, Nachschubintervalle, Module und Audiomischung wurden nicht erweitert. Die Livevorschau
  ist weiterhin stumm; der vorhandene Ereigniston wird im Videoexport erzeugt.

### Grundrissvergleich und Grenzen

Für 16:9 wurden fünf Anordnungen auf 16 Seeds verglichen. Nach Auswahl der jetzigen Kombination aus
Deckungen, Starts und Waffenpositionen wurden 16 weitere Seeds mit dem bisherigen Sunny-Grundriss
verglichen. Die Prozentwerte sind Mittelwerte der jeweiligen Erstrunden, keine Zuschauerbewertung.

| Messung | 16 Auswahl-Seeds vorher → nachher | 16 weitere Seeds vorher → nachher |
|---|---:|---:|
| Zeit lebender Roboter ohne Waffe | 43,0 % → 34,3 % | 42,5 % → 37,2 % |
| Ein-Sekunden-Intervalle mit weniger als 12 Einheiten Ortsänderung | 6,8 % → 1,6 % | 7,7 % → 2,5 % |
| Roboter-Treffer im festen Zentrum x=180…860 / y=70…470 | 55,8 % → 60,7 % | 54,7 % → 61,6 % |

Eine verworfene Alternative hatte eine Schusspause von 54,85 Sekunden. Bei der gewählten Anordnung
beträgt die längste Schusspause über alle 32 Seeds 3,90 Sekunden, zuvor 4,05 Sekunden. Der Median der
je Runde längsten Pause ist jedoch nicht besser; ein durchgehend schnellerer Schussrhythmus wird nicht
behauptet. Niedrige Ortsänderung ist ebenfalls kein Beweis für dauerhaftes Feststecken.

Für 9:16 fiel die erste Anordnung beim unabhängigen Wegtest durch: Eine Kette zu enger Durchgänge
teilte die begehbaren Zellen in zwei Hälften. Die Korrektur öffnet die Engstellen und zieht die
Nachschubplätze nach innen. Alle 2.320 freien Rasterzellen sind jetzt miteinander verbunden.
Die gewählte Variante wurde auf acht Auswahl-Seeds und acht weiteren Seeds simuliert:

| Messung | 8 Auswahl-Seeds | 8 weitere Seeds |
|---|---:|---:|
| Mittlere Rundendauer | 37,43 s | 42,42 s |
| Längste Schusspause | 4,00 s | 2,13 s |
| Zeit ohne Waffe | 40,8 % | 36,5 % |
| Intervalle mit geringer Ortsänderung | 5,1 % | 2,9 % |

Diese begrenzten Stichproben belegen keine optimale oder allgemein ausgeglichene Arena. Die
Hochformat-Validierung hatte Siege 1/0/5/2; breite Balance- und Zuschauerabnahme bleiben offen.
Rohdaten: `output/scrap-sunlit/layout-study.json`, `layout-validation.json`, `portrait-candidates.json`
und `portrait-validation.json`. `portrait-study.json` dokumentiert die verworfene erste Hochformatfassung.

### Abschlussprüfung und Filmproben

- **8/8 betroffene Simulationstests** am korrigierten Stand bestanden: sämtliche Grundrisse und Starts
  erreichbar, Kollisionen/Kamera über vollständige Runden, Materialtreffer und Wegfreigabe, beide Sunny-
  Turniere mit Zeitlupe und Exportplanung, unveränderte Originaldateien und drei vollständige
  Original-Rundenzustände, Normalisierung alter Kameraangaben und feste Übersicht auch unter V2.
- **3/3 Browser-/Exporttests** bestanden: identische Bilder bei Vorlauf/30/60 fps auf allen vier Karten,
  beide Formate bis ins letzte Duell, Auswahl aus Originalregeln, Teilen-Link, deaktivierter Scrap-
  Kameraschalter und wieder aktivierbare Kamera bei Naval, jeweils bytegleicher 2-s-MP4-Replay mit Ton.
- **18 betroffene gemeinsame Fälle abgedeckt:** Konfiguration, Registry, Exportgrößen, Teilen/JSON/
  Handyansicht und unveränderte Naval-/Marble-Goldenwerte. Der erste gemeinsame Lauf bestand 15/18;
  drei localhost-Tests wurden von der Netzwerksandbox abgewehrt. Die vier Teilen-Tests bestanden
  anschließend außerhalb dieser Einschränkung 4/4. Der zuvor fehlende Browserpfad wurde durch die
  vorhandene lokale Playwright-Installation behoben; keine Referenzen oder Grenzwerte gelockert.
- Das Scrapyard-Bild Seed 42 / 12 s / Kamera aus stimmt weiterhin bytegenau mit dem akzeptierten
  Materialarena-Bild überein. Der isolierte Marble-Prototyp hat unverändert SHA-256
  `1aba7e335df93cf723297bebf18c40cd645b38c639fa947b43f5a9c88778e24b`.

Protokolle unter `output/scrap-sunlit/`: `simulation-complete.tap`, `browser-complete.tap`,
`shared-checks.tap`, `share-host.tap`. Dies sind gezielte Prüfungen, kein neuer vollständiger
Projekt-/Linux-CI-Nachweis. R02 und die persönliche Film-/Hörabnahme R20 bleiben getrennt offen.

`manifest.json` enthält Konfiguration, Zeitpunkt, Snapshot, Hash und Invarianten der abschließend
gerenderten Bilder `start.png`, `action.png`, `later.png`, `portrait-start.png`, `portrait.png` sowie
des Scrapyard-Vergleichs. Die Bilder wurden visuell geprüft. Die früheren Vergleichsbilder bleiben
unter `before-start.png` und `before-action.png` erhalten.

Zwei echte MP4-Proben mit je 360 Frames / 12 Sekunden / 1080p30 liegen unter
`sunlit-courtyard-12s.mp4` und `sunlit-portrait-12s.mp4`, jeweils mit Exportrezept. `export-report.json`
belegt gültige Invarianten, 139/145 Audioereignisse, 94/103 gemischte Stimmen und keinen Ereignisverlust.
Die fertigen AAC-Spuren messen beide −14,1 LUFS, Spitzen −1,3 bzw. −1,2 dBTP. Der bestehende Mischer
begrenzt maximal 16,3 bzw. 20,77 dB; eine persönliche Hörabnahme wird aus diesen Messungen nicht abgeleitet.
Kein einzelner Videoexport überschritt 20 Sekunden. Alle Film-/Bilddateien sind lokale generierte Artefakte.
