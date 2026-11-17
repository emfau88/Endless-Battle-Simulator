# Endless Waterpark: Wasserspiele, Fontänenshow, Trichter-Einlauf, Titel aus

Stand: 17.11.2026, Branch `waterpark/wasserspiele`. Grundlage sind vier Wünsche des Nutzers vom 17.11.2026 nach
Standbildern des 10-Minuten-Parktags. Sie schließen die beiden offenen Entscheidungen aus der
[Merkliste](WASSERPARK_OFFENE_PUNKTE_2026-11-16.md) (Wasserspiele am Tag, Ende mit Brunnenshow).

## Vorschau

Standbilder und kurze stumme Clips liegen lokal unter `output/waterpark-dev/wasserspiele/` (nicht im Repository).
Bildblätter für `docs/reference/` und das README-Bild mit dem neuen Stand fehlen noch.

## Umfang

| Wunsch | Umsetzung |
|---|---|
| Wasserspiele an und bewegt | Fontänen in der Lagune laufen den ganzen Tag (Schalter „Wasserspiele in der Lagune“, Standard an) |
| Titel „Endless Waterpark“ standardmäßig aus | Schalter „Titel im Bild“, Standard aus; Zähler und Abendzeile bleiben |
| Übergang von der Rutsche in den Trichter | Rutsche und Schale sind eine Form; im Querformat fährt das Tier ohne Knick ein |
| Brunnenshow am Ende, bunte Verläufe, asynchron | Show ist Standard für den Parktag; jede Fontäne hat ihren eigenen Farbverlauf und Takt |

## Wasserspiele am Tag

- **Wo:** im freien Wasser zwischen den Attraktionen und neben den Schwimmbahnen. Querformat: zwei Gruppen mit drei
  und vier Düsen am Beckenrand. Hochformat: vier größere Düsen in der sonst leeren unteren Lagune.
- **Bewegung:** Jede Gruppe spielt ein langsames An- und Abschwellen, eine Welle von Düse zu Düse und alle 8,5 bis
  10,4 Sekunden einen Stoß, der reihum läuft. Die Höhe schwankt zwischen etwa einem Viertel und dem Anderthalbfachen.
- **Effekte:** Mittelstrahl mit Krone, je zwei Bögen nach beiden Seiten, fallende Tropfen, Ringe am Auftreffpunkt,
  Schaum an der Düse, feiner Sprühnebel. Abends bekommen die Strahlen ein blasses Licht.
- **Tiefe:** Die Fontänen sind zwischen die Schwimmer einsortiert. Wer hinter einer Düse schwimmt, wird zuerst gezeichnet.
- **Seek-Regel:** Höhe, Tropfen und Farben sind reine Funktionen der Videozeit. Der Renderer hält dafür keinen Zustand.

## Fontänenshow am Ende

- **Standard:** `ending: show` ist jetzt Vorgabe und steht in den Parktag-Vorlagen (Produktionsvorlage lang, 5, 10 und
  20 Minuten) zusammen mit dem Feuerwerk. Der Vier-Tiere-Short behält sein ruhiges Ende.
- **Beginn:** sobald alle Tiere versammelt sind, frühestens 5 % der Videolänge vor Schluss, höchstens 30 und
  mindestens 8 Sekunden (vorher fest 8 Sekunden). Beim 10-Minuten-Parktag mit Seed 42 beginnt sie bei 9:30.
- **Farben:** Jede Fontäne trägt einen Verlauf aus vier Farbtönen von der Düse bis zur Krone. Der Verlauf wandert mit
  der Zeit, bei jeder Düse in eigenem Tempo (26 bis 40 Grad Farbton je Sekunde).
- **Takt:** In der Show hat jede Düse eigene Schwingungen und einen eigenen Stoß alle 5,3 bis 8,9 Sekunden. Drei
  (hochkant zwei) große Düsen kommen nur in der Show dazu. In den letzten drei Sekunden steigen alle gemeinsam.
- **Feuerwerk:** eine Rakete alle drei Sekunden über die ganze Show (vorher drei Raketen in sechs Sekunden).
- **Anzeige:** „WHAT A DAY!“ erscheint mit der ersten Fontäne. Zwischen der letzten Fahrt und der Show bleibt die
  Zeile leer; die Tiere dösen und wachen mit der Show auf.

## Trichter-Einlauf

- **Vorher:** Die Zulaufrinne verschwand hinter der Schale, das Tier tauchte in der Schale wieder auf. Im Querformat
  knickte die Fahrt an der Einfahrt um 46 Grad.
- **Nachher:** Rinne und Schale werden stufenweise gemeinsam gemalt (erst alle Umrisse, dann alle Ränder, dann das
  Wasser). So geht der Rand der Rinne in den Schalenrand über, und der Kanal öffnet sich ohne Linie in die Schale.
  Das Kanalwasser läuft auf dem Schalenwasser aus und folgt dem ersten Stück der Spirale; beim Einfahren spritzt es.
- **Fahrweg:** Im Querformat beginnt die Spirale jetzt vorn links in Verlängerung der Rinne (Knick 6 statt 46 Grad).
  Die Trichterfahrt wird dort 47 Pixel länger (1982 statt 1935), damit ändern sich die Zustands-Hashes im Querformat.
  Das Hochformat ist unverändert. Für den Wasserpark gibt es keine Referenz-Hashes; `npm run golden` prüft Naval,
  Kugelfabrik und Myzel.
- Eine erste Fassung mit gerader Schnittkante am Rinnenende hat der Nutzer als „zu abgehackt“ abgelehnt.

## Ausschnittsexport

- Der Wasserpark kann jetzt Ausschnitte exportieren (`--clip-start`, `--clip-duration`), zum Beispiel eine Minute aus
  der Mitte des 10-Minuten-Parktags, ohne die ganze Episode zu rendern.
- Voraussetzung war die Seek-Regel: Die Stellung der Liftkette hing bisher von der Zahl gezeichneter Bilder ab. Sie
  kommt jetzt aus der Simulation (`beltTravel`, nicht Teil des Zustands-Hashs).
- Neuer Test: Ein Bild nach einem Zeitsprung ist pixelgleich mit dem Bild bei durchgehender Wiedergabe.

## Testvideos vom 17.11.2026 (auf Wunsch des Nutzers, lokal in `output/`)

| Datei | Inhalt |
|---|---|
| `waterpark_short_test_20s.mp4` | Hochformat 1080×1920, 60 Bilder/s, 20 s aus dem Dauerbetrieb ab 1:05 mit 16 Tieren, ohne Anzeige, fester heller Tag; −23,9 LUFS, Spitze −7,1 dBFS |
| `waterpark_long_test_60s.mp4` | Querformat 2560×1440, 60 Bilder/s, Minute 4:00 bis 5:00 des 10-Minuten-Parktags mit Zähler; −25,5 LUFS, Spitze −6,6 dBFS; 122 MB, Renderzeit 3:56 |

Der Startmoment des Shorts wurde gesucht: Im gewählten Fenster sind fast durchgehend alle vier Attraktionen belegt,
neun Fahrten enden in 20 Sekunden.

## Kleinigkeiten

- Der Fahrtenzähler hat einen dunklen Rand und bleibt vor einer weißen Wolke lesbar.
- Absperrungen und Wimpel werden nach der Schale gezeichnet, weil das Rinnenende jetzt zur Schalen-Ebene gehört.

## Messwerte

Zeichenzeit bei 1080p, Mittel über 300 Bilder, nur `paint()`, Software-Chromium. Die Werte „vorher“ stammen aus dem
[Bericht vom 16.11.](WASSERPARK_MOCKUP_2026-11-16.md) und wurden nicht neu gemessen.

| Szene | vorher (16.11.) | nachher | Budget |
|---|---|---|---|
| Tag quer (4:00) | 1,44 ms | 1,88 ms | 2,5 ms |
| Finale quer mit Show und Feuerwerk | 2,10 ms | 2,83 ms | 4 ms |
| Short hoch, Tag | 1,28 ms | 1,53 ms | 2,5 ms |
| Parktag hoch, Show und Feuerwerk | nicht gemessen | 2,48 ms | 4 ms |

Fahrten beim 10-Minuten-Parktag quer, Seed 42: 212, wie vorher.

## Prüfungen

- Gelaufen: `node --test test/waterpark-simulation.test.mjs` (22 von 22, darunter zwei neue Tests für Show und
  Einfahrt), `node --test test/waterpark-browser.test.mjs` (3 von 3, darunter der neue Test zur Seek-Regel),
  Standbilder und Nahaufnahmen in beiden Formaten bei 1080p und 720p, Zeitmessung, zwei Testexporte mit Ton.
- Gelaufen: `node --test test/waterpark-integration.test.mjs` (7 von 7, mit kleinem MP4-Export).
- **Nicht gelaufen:** `npm run golden` und der vollständige `npm test`. Geändert wurden nur Dateien des Wasserparks;
  die Referenz-Hashes decken Naval, Kugelfabrik und Myzel ab.
- Die Abnahme der Vorschau und der Testvideos durch den Nutzer steht aus.

## Grenzen

- Kein Export über 20 Sekunden, keine Hör- und Handyabnahme. Der Ton ist unverändert bis auf mehr Raketen in der Show.
- Die Wasserspiele haben keinen eigenen Klang.
- Im Hochformat stehen die Fontänen vor den zwei hinteren Schlafreihen; mit 24 Tieren verdecken sie dort Tiere teilweise.
- Die Schwächen des Shorts aus der Merkliste (Handlung nach 13 Sekunden vorbei) sind nicht Teil dieses Pakets.
