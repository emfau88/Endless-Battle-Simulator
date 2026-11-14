# Marble Works · 3D-Prüfbericht

Stand: 14. November 2026. Die 3D-Fassung wurde mit [PR #11](https://github.com/emfau88/Endless-Battle-Simulator/pull/11) nach `main` gemergt. Die aktuelle Kamera-/Klangüberarbeitung liegt auf `codex/marbleworks-camera-audio`, Basis `f3cb8de`; der Nutzer hat ihre Reviewvideos und den Merge nach erfolgreicher CI in [PR #12](https://github.com/emfau88/Endless-Battle-Simulator/pull/12) freigegeben.

## Aktueller Stand

Die zuvor abgelehnte flache Darstellung wurde durch eine eigenständige 3D-Anlage ersetzt. Geometrische Maschinen, bewegte Arbeitsköpfe, transparente Glashüllen mit innenliegenden Farbbändern, Metalloberflächen und Schatten bilden ein warmes mechanisches Diorama. Die nachfolgend verlinkten Bilder stammen aus dem tatsächlichen Renderer.

Die Fabrik besitzt einen warmen, fein texturierten Werkstattboden, salbeifarbene Wände und große Fenster. Sattere Pigmentfüllungen, klarere Patronenhüllen und deutlichere innere Farbbänder stärken die Lesbarkeit der Glasprodukte. Kurzer Sprühnebel an der aktiven Farbinfusion, Glanzpunkte nach dem Polieren und lokale Wärmeschleier an belegten Temperierstationen folgen tatsächlichen Produktionsvorgängen. Die Kameraführung ist unverändert.

Die Klangzuordnungen `factoryPolish` und `factoryCoat` bleiben entfernt, ihre Produktionsereignisse bestehen weiter. Die acht übrigen Klangrollen verwenden jetzt die weichere, Kenney-lastige Variante C. Ein separater Kamera-Mischplan wählt hörbare Vorgänge aus, senkt entfernte Quellen ab und begrenzt die Geräuschdichte. Die Live-Vorschau bleibt stumm; die Änderung betrifft den Videoexport ausschließlich von Marble Works. [Technik, Quellen und aktuelle Prüfnachweise](MARBLEWORKS_CAMERA_AUDIO.md).

## Freigegebene Klangfassung

Die vorherige Tonfassung wurde wegen harter Glas- und Kontaktgeräusche abgelehnt. Der Nutzer hat für die Überarbeitung die separate Hörprobe C mit stärkerem Kenney-Anteil gewählt und die daraus erzeugten Videos mit Kamerafahrt am 14. November 2026 mit „Ok, klingt gut so“ freigegeben. Bestandene Audio- und Exporttests prüfen zusätzlich Reproduzierbarkeit, Format und Pegelgrenzen; die ästhetische Hörabnahme ist damit ebenfalls erfolgt.

Die frühere Episodenmischung meldete bis zu 40,5 dB Begrenzung. Dieser historische Messwert gehört zur alten, auf Lautheit normalisierten Fassung. Das neue Marble-Works-Profil verwendet vorbereitete kurze Klänge, einen festen Grundpegel und kamerabhängige Abschwächung; es normalisiert leise Bereiche nicht auf −14 LUFS zurück. Die neuen Exportmessungen und Reviewclips werden im [Kameraton-Nachweis](MARBLEWORKS_CAMERA_AUDIO.md#review-und-prüfung) getrennt geführt.

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

Die aktuelle Kamera-/Klangüberarbeitung besitzt einen [separaten Prüfstand](MARBLEWORKS_CAMERA_AUDIO.md#review-und-prüfung). Die folgenden Tabellen dokumentieren vorherige Fassungen.

### Vorherige Werkstatt-/Effektüberarbeitung: 26 bestandene Fälle

| Bereich | Bestandene Fälle | Beleg unter `output/` |
|---|---:|---|
| Produktionsmodell, 3D-Browser, Kamera/Format, Seeking, natürliches Exportende, separate Registrierung und Migration | 19 | `manufactory-regression.log` |
| Reale Effektauslöser, feste Obergrenzen, Zustands-/Ereignistreue und reproduzierbare Shaderausgabe | 2 | `manufactory-effects-regression.log` |
| Materialklänge, deterministische Mischung, entfernte Rauschzuordnungen einschließlich alter Lautstärkerezepte, Classic-Isolation und AAC | 5 | `manufactory-audio-no-hiss.log` |
| **In dieser vorherigen Fassung gezielt geprüft** | **26** | |

Der neue Effekttest lässt einen Auftrag mit 24 Produkten und doppelter Produktionsgeschwindigkeit vollständig durchlaufen. Alle drei Effektarten treten bei passender Maschinenbelegung auf; die Farbinfusion sprüht erst nach ihrem verdienten Ausbau. Die Belegung bleibt auf 44 Nebelpartikel, zwei Glanzpunkte und acht Wärmeschleier begrenzt, alle aktiven Shaderwerte bleiben endlich, und nach Produktionsende sind die Effekte abgeschaltet. Effektupdates und Rendering lassen Zustands-Hash, Ereignisse und Zähler unverändert.

Gezielte aktive Effektbilder vergleichen echte PNGs nach direktem Seeking und nach mehreren Zwischenbildern. Wiederholtes Rendern ohne Physikschritt liefert ebenfalls identische PNGs. Die Prüfung umfasst 16:9 und 9:16 und weist durch isoliertes Ein-/Ausblenden zusätzlich nach, dass jede Effektart tatsächlich sichtbare Pixel verändert. Beide Effekttests bestanden mit lokaler Hardwaregrafik in 7,50 s; Standard des Tests bleibt Software-Rendering.

### Frühere CI-Prüfung für PR #11

Der erste vollständige [PR-Prüflauf](https://github.com/emfau88/Endless-Battle-Simulator/actions/runs/43628367934) bestand 13 von 14 Jobs. Im Core bestanden 83 Fälle; die neue Browser-Testdatei wurde nach dem dort gültigen Limit von 600 Sekunden abgebrochen. Allein ihr Format-/Bildratenvergleich hatte mit Software-Rendering 502,8 Sekunden benötigt. Es gab in diesem Core-Lauf keine fehlgeschlagene Assertion, aber die abgebrochene Datei war kein vollständiger Prüfnachweis.

Die aufwendigen Marble-Works-Prüfungen wurden deshalb in einen eigenen parallelen CI-Job mit 1.200 Sekunden pro Datei ausgelagert. Der Formatvergleich rendert 12 statt 120 Bilder bei weiterhin echten 60/30 fps, denselben drei Formaten/Auflösungen und gleicher Simulationsdauer zwischen den Varianten. Seeking behält seine vier PNG-/Hash-Kontrollpunkte und prüft zusätzlich gerenderte Zwischenzustände um die tatsächlichen Ausbauten. Die eigenständigen Videoexporttests werden nicht verkürzt. Maßgeblich für den Merge ist das erfolgreiche Gesamtergebnis des aktualisierten [PR #11](https://github.com/emfau88/Endless-Battle-Simulator/pull/11).

### Vorherige 3D-Basisprüfung: 186 Fälle

Die folgende Tabelle dokumentiert die bereits abgeschlossene Prüfung der vorherigen 3D-Fassung. Diese 186 Fälle wurden für die damalige Werkstatt-/Effektüberarbeitung **nicht vollständig erneut ausgeführt**; sie sind auch keine zusätzlichen Testläufe der jetzigen Kameraton-Änderung.

| Bereich | Eindeutige bestandene Fälle | Beleg unter `output/` |
|---|---:|---|
| Produktionsmodell, Ton, separate Registrierung und Migration | 17 | `marbleworks-model-audio-final.log` |
| Finaler optimierter 3D-Renderer, UI, Kamera/Format, Seeking, echter Export/Rezept-Replay | 7 | `marbleworks-browser-optimized.log` |
| Bestehender Core, Konfiguration, Classic, Vorlagen, Golden-Hashes, Vorschau und Settings | 42 | `marbleworks-isolation-browser.log`, `marbleworks-isolation-baseline-extra.log` |
| Neue Produktionsvorlagen mit lokalem Server und MP4-/JSON-Download | 2 | `marbleworks-isolation-preset-export-final.log` |
| Andere Szenarien einschließlich ihrer zehn Produktionsvorlagen | 118 | `non-marble-3d-regression.log`, `non-marble-preset-unsandboxed.log`, `non-marble-scrap-targeted.log` |
| **Vorherige Basis, ohne Wiederholungen und synthetische Datei-Fehler** | **186** | |

Das Seeking vergleicht echte PNGs nach direktem Zeitsprung und fortlaufendem Rendern über Ausbau und Finale. Format-/Kameravergleiche prüfen identische Zustands-Hashes und Tonereignisse. Die vorhandenen Golden-Referenzen wurden nicht verändert.

Die frühen Fehlversuche sind in den Logs erhalten: Ein UI-Test öffnete beim Speichertest erneut eine explizite Classic-URL und wurde korrigiert. Die Sandbox verweigerte lokalen Testservern die Verbindung; alle betroffenen Vorlagen wurden anschließend mit lokalem Netzwerkzugriff erfolgreich geprüft. Umfangreiche Software-Renderläufe erreichten alte Datei-Zeitlimits. Neue 3D-Browser- und Exportprüfungen wurden getrennt, Zeitbudgets für Marble Works angepasst und betroffene Fälle gezielt wiederholt.

## Bilder und Film

- [Gesamtanlage](reference/progressive-marble-v1/overview.png)
- [Farbinfusion und Temperierung](reference/progressive-marble-v1/production.png)
- [Hochkantansicht](reference/progressive-marble-v1/portrait.png)
- [Fertige Kollektion](reference/progressive-marble-v1/collection.png)

Elf Rohbilder der Werkstatt-/Effektfassung mit Snapshots/Hashes liegen unter `output/progressive-marble-v1/`, darunter die aktiven Prozesseffekte in 16:9 und 9:16. Die folgenden beiden Testfilme besitzen ein gleichnamiges JSON-Rezept und gehören zur **vorherigen Tonfassung**, nicht zur neuen kamerabhängigen Mischung.

| Film | Inhalt | Format | Zustandshash am Clipende |
|---|---|---|---|
| `marbleworks-process-test.mp4` | 360–380 s, ausgebaute Verarbeitung; manuelle Kameraposition 46, Zoom 1,2 | 1920 × 1080, H.264, 30 fps, 600 Frames, Stereo-AAC 48 kHz | `b39e197e` |
| `progressive-marble-upgrade-test.mp4` | 194–214 s, zweiter Ausbau; aktualisierte Umgebung und Tonmischung | 1280 × 720, H.264, 30 fps, 600 Frames, Stereo-AAC 48 kHz | `4002ad76` |

Die damalige vollständige Tonmischung vor dem Ausschneiden umfasste nach Entfernen der beiden Rauschzuordnungen 1731 Produktionsereignisse und 1236 abgespielte Stimmen. Der damalige Exportlog maß −15,9 LUFS für die vollständige Episode; dies ist keine gesonderte Lautheitsmessung jedes 20-Sekunden-Ausschnitts und kein Messwert der neuen Kameraton-Fassung. Belege: `output/manufactory-process-1080-export.log` und `output/manufactory-upgrade-export.log`.

Reproduktion:

```sh
node --test test/marbleworks-effects.test.mjs
node scripts/progressive-marble-proof.mjs --process-video --gpu
node scripts/progressive-marble-proof.mjs --video --gpu
```

[Private Browservorschau und Filmgalerie](https://simcascade-progressive-marble-v1.voma974568.chatgpt.site/review/)

## Technik und Grenzen

Die Produktion verwendet weiterhin feste 60-Hz-Schritte und geführte Transportbahnen. Three.js 0.160.1 ist mit Lizenz lokal gebündelt; es gibt keine externe Laufzeitabfrage. Pixi-Ausgabe, vorhandener Exporter und Audioarchitektur bleiben erhalten. Wiederholte Rollen/Stützen werden instanziert; Glasbrechung wird erst beim Polieren aktiviert. Eine lokale GPU-Messung der vorherigen 3D-Basis nach Instanzierungsoptimierung ergab bei ausgebauter Anlage etwa **10,3 ms pro Bild**, 454 Zeichenaufrufe. Sie wurde vor Ergänzung der Werkstatt und Prozesseffekte aufgenommen und ist keine aktuelle Leistungszusage.

Ein kompletter 90-Frame-1080p-Softwareexport der langen Vorlage bestand zusätzlich in **235,455 s**, noch vor der Instanzierungsoptimierung. Software-Rendering ist wesentlich langsamer; die neuen Testbudgets berücksichtigen das. Die Live-Vorschau bleibt stumm, Ton entsteht im Videoexport.

Es gibt eine feste, vollständig ablaufende V1-Fabriktopologie und keinen freien Anlageneditor. Zufälliger Ausschuss und Nacharbeit sind noch keine eigenen Produktionszweige.
