# Territory Wars / Hex Dominion V0.3 – Integration und Prüfgrenzen

Territory ist als sechstes Szenario im gemeinsamen Generator integriert. Der Ausgangspunkt war
`bd4f9904af7292e3df4b43581ceaf17f3c12051b`, am 13.11.2026 lokal und gegen `origin/main` geprüft.
Der Arbeitsbaum war sauber. Die Arbeit liegt auf `codex/territory-integration`; ein Merge ist nicht beauftragt.
Der [vollständige Main-Prüflauf](https://github.com/emfau88/Endless-Battle-Simulator/actions/runs/43511206515)
war bereits erfolgreich. Der endgültige Integrationsnachweis ist der vollständige Prüflauf am PR-Head.

## Quelle und Umfang

Beide Download-Dateien wurden erneut verglichen: bytegleich, SHA-256
`4bdee96025a22bab270c2575eaf71c49a81bb50938f90d1ad11c1d4028c91ea8`.
Das Original liegt unverändert in `docs/reference/`; [Herkunft und Referenzen](reference/TERRITORY_SOURCE.md).

`simulation.js` enthält exakt das originale erste Inline-Skript; `renderer.js` das zweite Skript.
Die ursprünglichen Garnisons-/Marsch-/Routenfunktionen sind in `presentation.js` erhalten. Die
Quellparität wird getestet. `episode.js` ergänzt ausschließlich Generatorzeit, passive Beobachtung,
Zustandsprüfungen und Folgerunden. `territory.js` komponiert Weltcanvas, Labelcanvas und die gewünschten
Fraktionsstände/Uhr/Siegeranzeige auf die bestehende CanvasScene-/Pixi-Capturebühne. Die ursprüngliche
Echtzeit-Anwendung mit eigener requestAnimationFrame-Schleife wird nicht gestartet.

Die Dateien der bestehenden fünf Szenarien und der gemeinsame Audio-/MP4-Exporter wurden nicht geändert.
Im gemeinsamen Generator sind begrenzte optionale Erweiterungen hinzugekommen: szenariospezifischer
Tempobereich, explizites Anwenden eines Reglers, originale Konfigurationsprofile und ein Reframe-Hook.
Ohne diese Angaben gelten die bisherigen Standards und das bisherige Neustartverhalten.
Bestehende Registry-Tests erwarten nun sechs Szenarien; vorhandene Golden-Werte bleiben unverändert.

## Verhalten

- Hex rechnet weiterhin ausschließlich mit 0,1 Sekunden. Der Host liefert 60 Videozeitschritte pro Sekunde;
  das Filmtempo wird genau einmal in den Territory-Akkumulator eingerechnet. 0,25–2× einschließlich
  0,75× bleiben in UI, JSON und Export erhalten. Die drei Originalprofile ändern Regeln und Tempo live.
- `params.layout` ist unabhängig von `video.aspect`. Ausgabewechsel erhält Simulation und Renderer;
  erst **Karte anwenden** übernimmt die gewählte Kartenform und startet bewusst neu. Auto-Framing,
  Kameramodus/-werte, Qualität, Garnisonen und HUD-Optionen sind gespeichert.
- Folgeseeds werden aus Ausgangsseed und Rundennummer abgeleitet. Die originale Ergebnisdauer von
  neun Sekunden ist Standard und läuft in Videozeit, auch bei geändertem Filmtempo.
- Beide Produktionsvorlagen verwenden 1080p30, H.264/CRF20/medium und AAC: 60 Sekunden hochkant bzw.
  600 Sekunden quer, jeweils passender Originalkartenform und 0,75×.
- Ein vollständiges Ereignisprotokoll erfasst Abmarsch, Ankunft, Gefecht, jede Eroberung und die
  ursprünglichen Meilensteine. Globale Sequenzen und fraktionale `step / 60`-Videozeiten bleiben über
  Runden erhalten. Die gekürzte Original-Meldungsliste dient weiterhin nur der Quellpräsentation.
- Sechs Klänge verwenden vorhandene Samples/Synthesen: Marsch, Gefecht, Eroberung, Bau, HQ und Sieg.
  Kein minGap verwirft diese Klänge. Reglerstandard 100 %, Ziel −14 LUFS und abschließende AAC-Prüfung
  bleiben erhalten. Ein anfänglich zu stark begrenzter Marsch-Impact wurde vor der finalen Abnahme durch
  die bestehende Chime-Synthese eine Oktave tiefer ersetzt; der allgemeine Mischer bleibt unverändert.

## Gezielte Nachweise

| Prüfung | Ergebnis |
|---|---|
| Originalvergleich | Sechs vor Anpassung gesicherte Vollzustandsreferenzen: Seeds 42/7/2026, beide Karten, bei 2026 intensive Regeln. Vergleich aller Zustandsfelder während der Verläufe und bis zum natürlichen Sieg; keine alleinige Hex-Hash-Abnahme. |
| Simulation | 16 Tests bestanden: Originalparität, 30/60 fps und mehrere Tempi, laufende Tempo-/Regeländerungen, Invarianten, vollständige Ereignisse, deterministischer Rundenwechsel und 600 Sekunden reine Simulation. |
| Browser/Produktion | Sieben Tests bestanden: Tempo, gleiche Bilder bei gleichem Frameraster, Ausgabewechsel/Karte anwenden, Originalprofile, Kamera-/Anzeige-/Regel-JSON, Pause/Fortsetzen, alle Captureebenen, natürlich erspielte Siegeranzeige und beide echten MP4s. |
| Audio | Drei Tests bestanden: jede konfigurierte Sequenz an exakter Sampleposition, kurze und 120-s-Mischungen, echte AAC-Gefechtsfenster aus Videozeit 100–120 s. |
| Längere Tonprüfung | 120-s-Simulation/Mix: −14,01 LUFS, 522/532 Stimmen, maximale Begrenzung 6,65/7,94 dB. Die 20-s-AAC-Gefechtsfenster: −14,0 LUFS, −2,9/−2,8 dBTP. Kein Langfilm. |
| Bestehende Referenzen | 41 lokale Regressionstests bestanden: Golden-Verläufe für Naval/Marble/Myzel unverändert; Generator, Konfiguration, Marble, Vorlagen, Vorschau und Einstellungen. |
| GitHub-CI | Bestehende Gruppen plus `territory` und `export-territory`; keine deaktivierten Tests, gelockerten Grenzen oder erhöhten Zeitlimits. Finale Ergebnisse stehen am PR-Head. |

Die Zustandsprüfung umfasst insbesondere RNG, beide Zeitakkumulatoren, Entscheidungszeiten und Ziele,
Besitz/HQs, unabhängig nachgerechnete Versorgung, Einheitenbilanz und sämtliche Marschdaten.
Die Klangbeobachtung wird gegen die Originalverläufe und die vollständigen Simulationszähler geprüft.

## Tatsächliche kurze MP4s

Die finalen lokalen Dateien liegen unter `output/production-checks/1794609406460/`:

| Datei | Bild | Dauer/Frames | Finale AAC-Messung | Ereignisverlust |
|---|---|---|---|---|
| `territory-short.mp4` | 1080×1920, 30 fps | 3 s / 90 | −14,0 LUFS, −3,3 dBTP | 0 |
| `territory-long.mp4` | 1920×1080, 30 fps | 3 s / 90 | −14,0 LUFS, −3,3 dBTP | 0 |

Die Namen `short`/`long` bezeichnen die gekürzten Produktionsvorlagen, nicht die tatsächliche Filmdauer.
Jeweils vier Klangstimmen aus fünf vollständigen Beobachtungsereignissen, ohne Limiter-Eingriff.
JSON-Begleitdateien, Status und JPGs aus Videozeit 2,5 s liegen daneben. Die beiden finalen JPGs wurden
betrachtet: Welt, alle vier HQs, Garnisonen, Marschlabels/Routen, Uhr und Fraktionsstände sind sichtbar.
Die Tests prüfen außerdem den Weg über Exportknopf, Server, Metadaten und bytegleichen Download.
Der CI-Job `export-territory` erzeugt dieselben Proben und lädt sie als Workflow-Artefakt hoch.

## Verbleibende Grenzen

Keine persönliche Hörabnahme und keine vollständige Langfilmabnahme. Die kurzen Exportstandbilder
ersetzen keine manuelle Sichtung sämtlicher Filmframes oder eine Handyabnahme. Es wurden keine
vollständigen 60-/600-Sekunden-Territory-Testfilme erzeugt.

Ausschnittsexport ist ausdrücklich gesperrt. Originale Farbübergänge und Labelpositionen besitzen
Renderhistorie: derselbe Start mit demselben Frameraster ist reproduzierbar; Simulation und Ereignisse
sind bei 30/60 fps gleich, einzelne Übergangspixel/Labelpositionen müssen es nicht sein. Formatwechsel
erhält diese Caches und setzt Labeloffsets wie das Original beim Resize zurück.

Konfigurationen beschreiben einen neuen Export ab dem gespeicherten Seed. Zwischenzeitliche manuelle
Regel-/Tempoänderungen werden nicht als Eingabehistorie aufgezeichnet. Die Vorschau bleibt wie im
gemeinsamen Generator stumm; Ereigniston entsteht im Export. Offene persönliche Abnahme: [R17](ROADMAP.md).
