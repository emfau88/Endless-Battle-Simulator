# Marble Works · 3D-Prüfbericht

Stand: 14. November 2026. Branch: `codex/progressive-marble-v1`, Basis `3586239`. Kein Merge nach `main`.

## Aktueller Stand

Die zuvor abgelehnte flache Darstellung wurde durch eine eigenständige 3D-Anlage ersetzt. Geometrische Maschinen, bewegte Arbeitsköpfe, transparente Glashüllen mit innenliegenden Farbbändern, Metalloberflächen und Schatten bilden ein warmes mechanisches Diorama. Die nachfolgend verlinkten Bilder stammen aus dem tatsächlichen Renderer.

Der Nutzer bewertet die neuen Maschinen als deutlich verbessert. Als nächster Gestaltungsschritt werden Hintergrund/Umgebung, kräftigere Pigmente sowie zusätzliche Kamera- und Klangakzente abgestimmt. Sprühnebel und Partikeleffekte sind in diesem Stand noch nicht enthalten.

## Trennung vom Original

`marbleworks` ist ein siebtes, unabhängiges Szenario. Die ursprüngliche `src/scenarios/marble.js` und beide Classic-Produktionsvorlagen sind bytegleich mit Basis `3586239`. Die ursprünglichen sechs Szenarien behalten ihre Reihenfolge. Nur alte Rezepte der exakten Kombination `scenario=marble` + `factoryMode=progressive` werden auf den neuen Eintrag migriert.

## Produktionsnachweis

| Standardauftrag, Seed 42 | Ergebnis |
|---|---|
| Material / Bestand | Glas, 144 Produkte |
| Farbinfusion freigeschaltet | 12 fertige Produkte, 96,417 s |
| Zweite Bearbeitungslinie | 36 fertige Produkte, 199,117 s |
| Produktionsabschluss | 465,883 s |
| Durch zweite Linie verarbeitet | 49 Produkte |
| Fertige Sammlung | Sechs Behälter mit jeweils 24 Produkten |
| Natürliches Videoende inklusive Finale | 478 s |
| Bilanz | Keine verlorenen oder doppelt zugeordneten Kugeln; alle Stationen und Übergaben geprüft |

Kamera und Ausgabeformat verändern keine Produktionswerte. Die automatische Kamera fährt mehrfach entlang der Linie, fokussiert die beiden Ausbauten und zeigt Anfang/Ende in Übersicht. Ihr schräger Blickwinkel bleibt derzeit gleich. Übersicht und manuelle Position/Vergrößerung sind zusätzlich wählbar.

## Prüfungen

| Bereich | Eindeutige bestandene Fälle | Beleg unter `output/` |
|---|---:|---|
| Produktionsmodell, Ton, separate Registrierung und Migration | 17 | `marbleworks-model-audio-final.log` |
| Finaler optimierter 3D-Renderer, UI, Kamera/Format, Seeking, echter Export/Rezept-Replay | 7 | `marbleworks-browser-optimized.log` |
| Bestehender Core, Konfiguration, Classic, Vorlagen, Golden-Hashes, Vorschau und Settings | 42 | `marbleworks-isolation-browser.log`, `marbleworks-isolation-baseline-extra.log` |
| Neue Produktionsvorlagen mit lokalem Server und MP4-/JSON-Download | 2 | `marbleworks-isolation-preset-export-final.log` |
| Andere Szenarien einschließlich ihrer zehn Produktionsvorlagen | 118 | `non-marble-3d-regression.log`, `non-marble-preset-unsandboxed.log`, `non-marble-scrap-targeted.log` |
| **Gesamt, ohne Wiederholungen und synthetische Datei-Fehler** | **186** | |

Das Seeking vergleicht echte PNGs nach direktem Zeitsprung und fortlaufendem Rendern über Ausbau und Finale. Format-/Kameravergleiche prüfen identische Zustands-Hashes und Tonereignisse. Die vorhandenen Golden-Referenzen wurden nicht verändert.

Die frühen Fehlversuche sind in den Logs erhalten: Ein UI-Test öffnete beim Speichertest erneut eine explizite Classic-URL und wurde korrigiert. Die Sandbox verweigerte lokalen Testservern die Verbindung; alle betroffenen Vorlagen wurden anschließend mit lokalem Netzwerkzugriff erfolgreich geprüft. Umfangreiche Software-Renderläufe erreichten alte Datei-Zeitlimits. Neue 3D-Browser- und Exportprüfungen wurden getrennt, Zeitbudgets für Marble Works angepasst und betroffene Fälle gezielt wiederholt.

## Bilder und Film

- [Gesamtanlage](reference/progressive-marble-v1/overview.png)
- [Farbinfusion und Temperierung](reference/progressive-marble-v1/production.png)
- [Hochkantansicht](reference/progressive-marble-v1/portrait.png)
- [Fertige Kollektion](reference/progressive-marble-v1/collection.png)

Neun Rohbilder mit Snapshots/Hashes: `output/progressive-marble-v1/`.
Film: `progressive-marble-upgrade-test.mp4`, mit gleichnamigem JSON-Rezept.

Die 20-Sekunden-Aufnahme zeigt Sekunden 194–214 der Standardepisode und damit den zweiten Ausbau: **1280 × 720, H.264, 30 fps, 600 Frames, Stereo-AAC 48 kHz**. Zustandshash am Clipende: `4002ad76`. Die vor dem Ausschnitt berechnete vollständige Tonmischung umfasst 1731 Ereignisse; gemessene Lautheit −14,01 LUFS. Reproduktion: `node scripts/progressive-marble-proof.mjs --video --gpu`.

[Private Browservorschau und Filmgalerie](https://simcascade-progressive-marble-v1.voma974568.chatgpt.site/review/)

## Technik und Grenzen

Die Produktion verwendet weiterhin feste 60-Hz-Schritte und geführte Transportbahnen. Three.js 0.160.1 ist mit Lizenz lokal gebündelt; es gibt keine externe Laufzeitabfrage. Pixi-Ausgabe, vorhandener Exporter und Audioarchitektur bleiben erhalten. Wiederholte Rollen/Stützen werden instanziert; Glasbrechung wird erst beim Polieren aktiviert. Eine lokale GPU-Messung nach Optimierung ergab bei ausgebauter Anlage etwa **10,3 ms pro Bild**, 454 Zeichenaufrufe; geräteabhängig, keine allgemeine FPS-Zusage.

Ein kompletter 90-Frame-1080p-Softwareexport der langen Vorlage bestand zusätzlich in **235,455 s**, noch vor der Instanzierungsoptimierung. Software-Rendering ist wesentlich langsamer; die neuen Testbudgets berücksichtigen das. Die Live-Vorschau bleibt stumm, Ton entsteht im Videoexport.

Es gibt eine feste, vollständig ablaufende V1-Fabriktopologie und keinen freien Anlageneditor. Zufälliger Ausschuss und Nacharbeit sind noch keine eigenen Produktionszweige.
