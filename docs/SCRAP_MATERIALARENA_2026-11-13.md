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
