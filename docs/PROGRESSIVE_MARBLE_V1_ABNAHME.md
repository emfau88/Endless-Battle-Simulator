# Progressive Marble Factory V1 · Abnahme

Stand: 14. November 2026. Branch: `codex/progressive-marble-v1`. Basis: `3586239`. Kein Merge nach `main`.

## Ergebnis

Die optisch helle, warme Fabrik verarbeitet einen endlichen Rohbestand über Polieren/Pressen, Veredeln, Temperieren und Prüfen bis zur sortierten Sammlung. Die Welt ist 6000 × 1500 Einheiten groß. Neue Beschichtung und zweite Fertigungslinie werden durch fertige Produkte freigeschaltet. Classic und die fünf anderen Szenarien bleiben erhalten.

Standardauftrag, Seed 42, Glas, 144 Produkte:

| Nachweis | Ergebnis |
|---|---|
| Erste funktionale Erweiterung | 12 fertige Produkte, 96,417 s |
| Zweite funktionale Erweiterung | 36 fertige Produkte, 199,117 s |
| Produktionsabschluss | 144 Produkte nach 465,883 s |
| Parallel bearbeitet | 49 Produkte |
| Sammlung | 6 Behälter mit jeweils 24 Produkten |
| Vollständiges Video inklusive Finale | 478 s, etwa 7:58 min |
| Bestand / Übergaben / Zähler | Kein Verlust, keine doppelte Zuordnung, keine falschen Zähler; Abstand auch über Maschinenübergaben geprüft |

## Automatisierte Prüfungen

| Bereich | Bestandene Tests | Beleg im lokalen `output/` |
|---|---:|---|
| Neue Produktionslogik | 10 | `progressive-simulation-final.log` |
| Neuer Modus im Browser / echter Export | 7 | `progressive-browser-final.log` |
| Neuer Material-/Maschinenklang und AAC | 4 | `progressive-audio-final-spacing.log` |
| Bestehender Core, Konfiguration, Einstellungen, Vorlagen, Golden-Hashes, Classic-Marble | 39 | `progressive-regression.log`, `progressive-settings.log` |
| Bestehender Audio-/Exportpfad | 24 | `progressive-audio-export-regression.log`, `progressive-audio-ui-recheck.log` |
| Atmosphäre, Naval, Mycelium, Pyramid, Scrap, Territory | 81 | `progressive-other-scenarios.log` |
| **Gesamt, eindeutige Testfälle** | **165** | |

Die neuen Prüfungen umfassen vollständige Standard-, Minimal- und Maximalaufträge (360 Kugeln), alle vier Materialmodi, zusätzliche Seeds und ungerade Auftragsgrößen, reale Nutzung der Parallelstraße, konstante Transportabstände, Fehlererkennung bei manipulierten Zählern/Behältern, unabhängige Kamera-/Format-/Bildratenwahl, UI-Speicherung, Reframing ohne Simulationsneustart, bildgleiches Seeking und natürliches Videoende auch bei Tempo 0,64. Echte H.264-/AAC-Exporte in beiden Formaten und Replay aus gespeicherten JSON-Rezepten wurden geprüft.

Die vorhandenen Golden-Referenzen wurden **nicht aktualisiert**. Classic, Naval und Mycelium entsprechen weiterhin ihren Referenzabläufen. Die bestehenden Exporttests decken unter anderem 4K, 720p60, variable Bitrate und Abbruch/Aufräumen ab.

Zusätzlich erfolgreich: lokaler UI-Exportpfad `POST /api/export` → Chromium → FFmpeg → `state=done`. Die zweisekündige Probe enthält 60 Frames in 720 × 1280, inklusive Ton. Der Server meldet einen fehlerfreien Abschluss; Details: `output/progressive-api-export.json`.

Ein erster Lauf der lokalen HTTP-Settings-Tests wurde durch die Socket-Sandbox blockiert; alle fünf Tests bestanden anschließend mit freigegebenem lokalen Netzwerkzugriff. Ein gefundener Classic-Reglerfehler (zusätzliche Produktionsklänge im Classic-Modus) wurde durch getrennte Klangtabellen behoben und erfolgreich nachgetestet. Der bei der Bildkontrolle entdeckte Übergabeabstand wurde korrigiert und als zusätzlicher Regressionstest aufgenommen.

## Audio

Die abschließende vollständige gemischte Mini-Produktion erzeugte 291 Ereignisse ohne Verlust. Beide Seitenverhältnisse liefern dieselbe Ereignisfolge. Messung nach AAC-Kodierung: **−14,1 LUFS und −1,4 dBTP**. Die bestehenden Samples und die vorhandene Export-/Lautheitsarchitektur bleiben erhalten.

## Bilder und Video

Die Screenshots zeigen den abschließend gewünschten hellgrauen, warmen Werkhallenstil mit klaren Konturen und farbigen Kugeln. Der große Fabrikschriftzug ist entfernt.

- [Gesamtanlage](reference/progressive-marble-v1/overview.png)
- [Bearbeitung und Ausbau](reference/progressive-marble-v1/production.png)
- [Hochkant / Temperierung](reference/progressive-marble-v1/portrait.png)

Alle sieben Bilder einschließlich Auftakt, Materialvergleich und fertiger Sammlung liegen mit Snapshots/Hashes in `output/progressive-marble-v1/`. Dort liegt auch die finale kurze Video-Testaufnahme `progressive-marble-upgrade-test.mp4` mit ihrem wiederverwendbaren JSON-Rezept. Reproduktion: `node scripts/progressive-marble-proof.mjs --video`.

## Grenzen

Die Anlagengeometrie ist eine ausgearbeitete V1-Topologie, kein freier Fabrikeditor. Mechanik verwendet kontrollierte Transportbahnen und Belegungslogik, wie bereits die Classic-Fabrik. Der Scanner validiert den Produktionsdurchlauf; zufälliger Ausschuss und Nacharbeit sind noch nicht implementiert. Die Webvorschau ist stumm; Ton entsteht wie bisher beim lokalen Videoexport. Die breite Gesamtübersicht wird in Hochkant klein dargestellt, bevor die automatische Kamera lesbare Stationsansichten zeigt.
