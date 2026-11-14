# SimCascade · Progressive Marble Factory V1

Der neue Modus erweitert Marble um einen abgeschlossenen Produktionsauftrag in einer festen **6000 × 1500** großen Fabrikwelt. Classic bleibt Standard und behält seinen Kreislauf, seine Physik und seine Klangtabelle. Die großen Fabrikschriftzüge entfallen im neuen Modus.

## Start und Export

```sh
npm start
# http://localhost:8080/?scenario=marble&factoryMode=progressive&aspect=16:9&seed=42
node export.mjs --config presets/marble-progressive-long.json --out output/glassworks.mp4
node export.mjs --config presets/marble-progressive-short.json --out output/glassworks-short.mp4
node export.mjs --config presets/marble-progressive-materials.json --out output/materials.mp4
```

In der Oberfläche: **Endless Marble Factory → Fabrikmodus → Progressive**. Short und Langvideo laden dann Produktionsvorlagen. Einstellungen lassen sich wie bisher als JSON speichern/laden. Der Online-Vorschaulink zeigt die Simulation; MP4-Export mit Ton erfolgt weiterhin auf dem lokalen Node-/FFmpeg-Server. Die Live-Vorschau bleibt wie im Bestand stumm.

`exportLength=order` berechnet die Videolänge aus dem realen Produktionsabschluss plus zwölf Sekunden Finale. Zeitlupe verlängert beides. `exportLength=duration` verwendet die eingestellte Videolänge, etwa für kurze technische Proben. Die Zeit steuert niemals Freischaltungen. Seed 42 mit dem Standardauftrag (144 Glasprodukte) schließt die Herstellung nach etwa **465,88 s** ab; einschließlich Finale ergibt sich ein **478-s-Video**.

## Was tatsächlich produziert wird

1. Das endliche Rohmaterial wird aus dem Magazin vereinzelt. Rückstau stoppt die Zuführung.
2. Eine besetzte Maschine poliert Glas/Stahl oder presst elastische Gummikugeln. Die rohe, matte Oberfläche verändert sich sichtbar.
3. Die erste Serie erhält eine klare Grundveredelung. Nach zwölf fertigen Produkten des Standardauftrags wird die Farbinfusion samt innerem Muster aktiviert.
4. Eine sichtbare Temperierstrecke kühlt jedes Produkt vor der Prüfung. Materialabhängige Verweilzeiten verändern den Durchsatz.
5. Der Scanner prüft jedes Produkt; mechanische Weichen und ein Magnet für Stahl führen es in den passenden Farbbehälter.
6. Nach 36 fertigen Produkten des Standardauftrags öffnet eine zweite komplette Bearbeitungslinie. Beide Linien teilen sich Prüfung und Ausgabe. Am Ende liegen genau 144 Produkte in sechs Behältern.

Die Schwellen skalieren mit der Auftragsgröße. Kleine Aufträge halten ein zweites Rohmateriallos zurück, damit der zweite Ausbau tatsächlich produziert. Bis zu 360 Kugeln bleiben vom Rohbestand bis zur fertigen Sammlung eindeutig identifizierbar. Keine Kugel wird während der Episode erzeugt, gelöscht oder automatisch als fertig gezählt.

## Varianten

| Einstellung | Wirkung |
|---|---|
| Glas / Stahl / Gummi / Gemischt | Andere Laufgeschwindigkeit, Bearbeitungs- und Kühlzeiten, Oberflächen und Geräusche; Magnetführung bei Stahl, Pressbewegung und Rückprall bei Gummi |
| Klar / Farbspirale / Perlmutt | Anderes Finish und andere Veredelungsdauer |
| Spektrum / Ozean / Glut | Sechs aufeinander abgestimmte Sammlerfarben |
| Auftragsgröße 24–360 | Endlicher Bestand, skalierende Ausbauziele und Episodenlänge |
| Maschinengeschwindigkeit 0,5–2× | Transport und Bearbeitung |
| Produktionsdruck 0,5–2× | Zuführung, sichtbare Warteschlangen und Engpässe |
| Automatisch / Übersicht / Manuell | Ereignisorientierte Kamerafahrten oder frei gewählter Ausschnitt |

Die vier Dateien `presets/marble-progressive-*.json` liefern einen Glas-Langfilm, einen kleinen Hochkantauftrag, einen Materialvergleich und eine langsamere Perlmutt-Kollektion. Unterschiede betreffen Bearbeitung, Materialreaktionen, Engpässe und Produktionsziel; Paletten sind zusätzlich wählbar.

## Architektur und Reproduzierbarkeit

`src/scenarios/marble/production-simulation.js` enthält ausschließlich das feste 60-Hz-Modell, abgerundete Transportbahnen, Abstandshaltung, Maschinenbelegung, Auftragsbilanz und Ereignisse. Es verwendet vorhandene EBS-Zeit-/Seed-Helfer. Geführte Bahnen entsprechen dem bewährten Ansatz der Classic-Anlage; es wurde kein zusätzliches Physiksystem installiert.

`production-renderer.js` projiziert denselben Zustand über den vorhandenen CanvasScene-/Pixi-Adapter. Die Kamera ist eine reine Funktion von Zeit, Produktionsereignissen und Ansicht. Direkte Sprünge zu einer Videostelle liefern dasselbe Bild wie laufendes Rendern. Formatwechsel erhalten den laufenden Produktionszustand. Kamerawerte, Bildrate und Auflösung verändern weder Zustandshash noch Produktionsereignisse.

`production-audio.js` verwendet vorhandene Samples und Syntheseklänge mit materialabhängigen Varianten, Mindestabständen und zurückhaltenden Maschinenimpulsen. Die bestehende Audio-/AAC-Pipeline übernimmt Mischung und Lautheitsmessung. Stereo richtet sich nach der festen Fabrikbreite, unabhängig vom Videoformat. `production.js` verbindet Moduswahl, Konfiguration und natürlichen Exportplan mit der vorhandenen Marble-Registrierung.

Neue Core-Hooks sind optional: `canReframe`, `audioForParams`, funktionales `supportsClips`. Ohne diese Hooks bleibt das bisherige Verhalten bestehen. Andere Szenariodateien und Abhängigkeiten wurden nicht verändert.

## Shorts aus einer Episode

Der progressive Modus unterstützt die vorhandene Clip-Ausgabe. Dabei wird die Tonmischung aus der vollständigen Episode ausgeschnitten:

```sh
node export.mjs --config presets/marble-progressive-long.json --aspect 9:16 --clip-start 195 --clip-duration 30 --out output/parallel-upgrade-short.mp4
```

Der Export nutzt dasselbe Seed-/Auftragsmodell. Der direkte Kamerawechsel auf Hochkant hat keine Auswirkungen auf die Fertigung. Für ganz bestimmte Bildausschnitte können `--param cameraMode=manual --param cameraPosition=45 --param cameraZoom=1.1` ergänzt werden.

## Prüfungen und Review-Artefakte

```sh
node --test test/production-marble-simulation.test.mjs
node --test test/marble-production-browser.test.mjs test/marble-production-audio.test.mjs
node scripts/progressive-marble-proof.mjs --video
```

Das Proof-Skript erzeugt sieben Screenshots, Zustandshashes und einen 20-sekündigen MP4-Testclip um den zweiten Ausbau samt JSON-Rezept unter `output/progressive-marble-v1/`. Mit `--full-video` entsteht stattdessen die vollständige kleine Glasproduktion. Tests prüfen vollständige Episoden, exakte Bilanz, reale Ausbauten, minimalen/maximalen Bestand, alle Materialien, Seed-/Format-/Kameraunabhängigkeit, Zeitlupe, UI, natürliches Videoende, Seeking, H.264/AAC und Rezept-Replay. Die Abschlussmessungen und Regressionsergebnisse stehen im begleitenden Abnahmebericht.

## Bewusster V1-Umfang

Es gibt eine ausgearbeitete Fabriktopologie mit variabler Produktion, keine frei baubare Wirtschaftssimulation. Geprüfte Kugeln werden nach Farbe gesammelt; Ausschuss und Nacharbeit sind noch kein eigener Produktionszweig. Das Modell prüft den ordnungsgemäßen Durchlauf aller Stationen. Die Gesamtübersicht zeigt in 9:16 die volle breite Anlage entsprechend klein; automatische Nahansichten und die kompakte Ablaufkarte erklären anschließend die Stationen.
