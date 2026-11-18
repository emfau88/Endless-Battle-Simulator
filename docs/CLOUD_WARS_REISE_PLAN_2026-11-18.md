# Cloud Wars: Wolkenreise – Plan (Langvideo, rund 5 Minuten)

**Stand:** 18.11.2026, nur Plan, kein Code geändert. **Roadmap:** R39. **Bezug:** Szenario Cloud Wars (R38,
[Plan](CLOUD_WARS_PLAN_2026-11-18.md), [Bericht](CLOUD_WARS_2026-11-18.md)).

**Auftrag des Nutzers (18.11.):** Ein ruhiges Langvideo von rund 5 Minuten, gern bis 7: eine Wolke als Hauptfigur, die
Kamera bleibt auf ihr, darunter zieht eine große Landschaft vorbei, „als großes Ganzes stimmig, keine harten Kanten“.
Erst die Minimalfassung, ohne neuen Ton und ohne Musik.

**Kurz:** Die Landschaft von Cloud Wars ist schon heute eine unendlich große Welt; das Short zeigt nur einen Ausschnitt
davon. Für die Reise wandert dieser Ausschnitt mit. Dazu braucht es drei Dinge: ein Bodenbild aus nachgeladenen
Kacheln, einen eigenen Modus „Reise“ in der Simulation (Hauptfigur, Strecke, Kamera) und eine Vorlage für 5 Minuten.

## 0 · Leitplanken (nicht verhandelbar)

1. **Eigener Modus `journey`.** Short und Runden bleiben bit-genau gleich: Zustands-Hash von Short (Seed 44) und Runden
   (Seed 42) vor und nach jedem Paket identisch.
2. **Nur Seed-Zufall.** Die Kamera ist Teil der Simulation, der Renderer liest sie nur. Der Kachel-Zwischenspeicher
   spart nur Rechenzeit und darf das Bild nie verändern (Seek-Regel: Sprung = durchgehende Wiedergabe).
3. **Kamera ruhig:** folgt der Wolke weich und gleichmäßig. Kein Zoom, kein Schwenk, keine Schnitte, kein Ruck.
   Hinweis: Im Querformat hat der Nutzer Kamerafahrten bei Scrap Wars und Marble XL abgelehnt; dort waren es Schwenks
   und Zooms im Kampf. Hier ist die Fahrt ausdrücklich gewünscht. Deshalb vor dem langen Export ein Probeclip.
4. **Keine harten Kanten:** keine sichtbaren Kachelfugen, kein Aufploppen von Gelände am Rand, kein Springen des Bodens.
5. **Kein neuer Ton, keine Musik.** Vorhandene Klänge bleiben: leiser „Plopp“ beim Einsammeln, ab und zu Wind.
6. **Texte im Video englisch**, Oberfläche und Doku deutsch. **Exporte über 20 Sekunden nur auf Auftrag.**

## 1 · Zielbild

Querformat 16:9, 1080p, 30 Bilder/s, 5 Minuten (Länge frei einstellbar).

- Eine kleine weiße Wolke mit Gesicht und hellblauem Rand (Team CIRRUS) treibt von links nach rechts über das Land,
  in sanften Bögen. Die Kamera hält sie nahe der Bildmitte.
- Vor ihr tauchen kleine Wolken auf, oft als Gruppe. Sie sammelt sie ein (Mund auf, Plopp) und wächst etwas; durch
  Verdunsten bleibt sie in einer angenehmen Größe.
- Darunter wechseln sich Felder, Wälder, Dörfer, Flüsse und Seen ab. Etwa alle 50 Sekunden ist ein ganz neues Bild
  zu sehen.
- Das Licht wandert vom hellen Tag in den goldenen Abend.
- Text nur am Anfang: „A CLOUD'S JOURNEY“ (rund 4 Sekunden). Am Ende blendet das Bild in 3 Sekunden ab.

## 2 · Was schon da ist und was fehlt

| Baustein | Stand | Für die Reise |
|---|---|---|
| Gelände als unendliche Welt (`terrain.js`, Rauschen und Gitter je Weltkoordinate) | vorhanden | nutzen |
| Kacheln 256 × 256 GE, 3 Pixel Überlappung, keine Fugen (`renderChunk`) | vorhanden | nutzen, mit Zwischenspeicher |
| Wolken, Schatten, Gesichter, Mund beim Einsammeln, Puffs (`art.js`) | vorhanden | nutzen, Ursprung verschieben |
| Tageslicht (`story.js`: `light`, `atmosphere.js`: `tint`) | vorhanden | eigener Verlauf |
| Kamera, wandernder Ausschnitt | fehlt | **neu** |
| Bodenbild aus Kacheln während der Fahrt | fehlt | **neu** |
| Strecke mit Abwechslung | fehlt | **neu** |
| Leben am Boden, Autos, Boote, Vögel, Lichter, Feuer, Rauch, Regen, Gewitter | an einen festen Ausschnitt gebunden | in der Minimalfassung **aus** (Wahlpakete) |

**Gemessen (18.11., Software-Chromium, 1080p Querformat, 1,4 Pixel je GE):** eine Kachel (358 × 358 Pixel) im Median
67 ms; das ganze Bild (rund 28 Kacheln) 970 ms. Die erste Kachel braucht einmalig etwa 2 s (Aufwärmen). Bei 28 GE/s
kommt alle 9 Sekunden eine neue Kachelspalte (4 Kacheln) dazu; das fällt im Export nicht ins Gewicht.

## 3 · Simulation: Modus „Reise“ (Startwerte)

Ort: `src/scenarios/cloudwars/simulation.js` (Zweig für `mode === 'journey'`) und neue Datei
`src/scenarios/cloudwars/journey.js` (Strecke, Bewertung, Kamera).

**Koordinaten.** Wie bisher in GE relativ zum Startausschnitt, aber ohne Rand. Neu `sim.view = { x, y, w, h }`: der
Bildausschnitt (Kamera) in denselben Koordinaten. Gelände-Abfragen rechnen wie heute `area.x + x`.

**Hauptfigur.** Eine Team-Wolke (Team 1, CIRRUS), Startmasse 6, ohne Namensschild. Keine anderen Teams.

**Strecke.** Vorberechnet beim Start, als Punktliste je Sekunde für Dauer + 30 s Reserve:

- Grundrichtung nach rechts (Osten) mit Abweichung höchstens ±35°. Die Richtung schwingt langsam aus Seed-Rauschen
  (Periode rund 80 s, Ausschlag ±25°), gedeckelt auf ±35°.
- Startpunkt und Grundrichtung: der beste von 48 Kandidaten nach der Bewertung in Abschnitt 5.
- Ein Zielpunkt läuft mit **28 GE/s** die Strecke entlang (eine Bildbreite von 1371 GE in rund 50 s; Bild:
  39 Pixel je Sekunde, 1,3 Pixel je Bild).

**Bewegung der Hauptfigur.** Federzug zum Zielpunkt (Abstand höchstens 120 GE). Kleine Umwege zu neutralen Wolken nur
nach vorn (Winkel unter 70° zur Fahrtrichtung, seitlich höchstens 160 GE), danach zurück zur Strecke. Drehrate und
Höchstgeschwindigkeit wie heute (`turnRate`, `speedOf`). Kein Ausweichen am Rand, keine Flucht, kein Tanken über
Wasser.

**Kamera.** Kritisch gedämpfte Feder auf die Position der Hauptfigur, Eigenfrequenz 1,2 je Sekunde. Geschwindigkeit
höchstens 45 GE/s, Beschleunigung höchstens 20 GE/s². Startet genau zentriert. Erwartung: Hauptfigur bleibt innerhalb
von ±10 % der Bildbreite um die Mitte.

**Neutrale Wolken.** Ziel 16 Stück im Bild plus Rand. Masse 0,3 bis 1,4, 60 % als Gruppe aus 3 bis 5 (Werte wie im
Short). Sie entstehen außerhalb des Bildes in Fahrtrichtung (Bildrand + 80 GE, verteilt über die Bildhöhe) und
treiben mit dem Wind (10 GE/s, Richtung = Fahrtrichtung ±40°). Die Hauptfigur holt sie langsam ein. Entfernt werden
sie 400 GE hinter dem Bildrand.

**Größe der Hauptfigur.** Verdunsten ab Masse 10 mit Rate 0,02 je Sekunde, Obergrenze 30. Ziel: Masse im Mittel 15
bis 22, Radius im Bild etwa 65 bis 80 Pixel. In J2 nachmessen und einstellen. Einsammeln: 6 bis 12 kleine Wolken je
Minute.

**Abgeschaltet im Reisemodus:** Gewitter, Blitze, Feuer, Feuerwehr, Wasserraster und Tanken, Rand-Klammer, Runden,
Sieg und Regie des Shorts. Ereignisse bleiben `absorb` und `gust`.

**Zustands-Hash** enthält im Reisemodus zusätzlich `view`. Short- und Runden-Hash bleiben unverändert (Leitplanke 1).

## 4 · Darstellung

**Bodenbild aus Kacheln** (Ort: `terrain.js` neue Funktion `renderTile`, Zwischenspeicher im Renderer):

- Jede Kachel bekommt eine eigene kleine Leinwand. Das Pixelmaß wird so gerundet, dass eine Kachel ganze Pixel breit
  ist: `k' = round(256 · k) / 256` (1080p: 358 Pixel statt 358,4). Plus 3 Pixel Überlappung wie heute.
- **Bodenbild:** Ausschnitt plus eine Kachel Rand ringsum, in fester Reihenfolge (Zeile für Zeile, links nach rechts)
  aus den Kacheln zusammengesetzt, an ganzzahligen Positionen. Neu zusammengesetzt wird nur, wenn sich die Kachel
  links oben ändert. Das Bodenbild hängt damit nur von dieser Kachel ab, nie vom Verlauf.
- Gezeichnet wird das Bodenbild mit Subpixel-Versatz und dem Faktor `k / k'`. Ergebnis: keine Fugen zwischen Kacheln,
  kein Stufenruckeln bei 1,3 Pixeln je Bild.
- Zwischenspeicher bis 64 Kacheln, die entfernteste fällt zuerst heraus.
- Vorschau im Browser: höchstens eine neue Kachel je Bild vorausrechnen (eine Spalte Vorlauf in Fahrtrichtung),
  damit nichts stockt. Im Export spielt das keine Rolle.

**Ebenen.** Alles, was heute im Ausschnitt mit `g.scale(k, k)` zeichnet, bekommt im Reisemodus zusätzlich
`g.translate(-view.x, -view.y)`: Wolken, Schatten, Gesichter, Puffs, Sog. Aus bleiben: `GroundLife`, `Atmosphere`
außer `tint`, `Effects` (Narben, Feuer, Rauch, Regen, Blitze), Namensschilder. Anzeige im Reisemodus immer „nur
Einblendungen“.

**Licht.** Eigener Verlauf `dayAt(t, 'journey')`: von 0,25 (heller Tag) bis 0,52 (goldener Abend), gleichmäßig über
die Videolänge. Schattenlänge wie heute aus dem Licht.

**Einblendungen.** Titel „A CLOUD'S JOURNEY“ von 0,5 bis 4,5 s im bestehenden Stil (Querformat bei 18 % der Höhe).
Abblende auf Schwarz in den letzten 3 Sekunden (Dauer aus der Vorlage).

**Ton.** Keine neuen Klänge. Die Stereo-Lage kommt aus der Position im Bild (`x - view.x`), nicht aus der
Weltposition; sonst wandert der Ton mit der Zeit ganz nach rechts.

## 5 · Strecke mit Abwechslung

Ort: `journey.js`, Bewertung einer Kandidaten-Strecke. Abgetastet wird ein Streifen entlang der Strecke, ±300 GE
quer, alle 40 GE längs:

- Anteile Wald, Wasser, Feld, Wiese (`isForestAt`, `isWaterAt`, `groundAt`), Dörfer im Streifen (`villagesIn`),
  Fluss- und Seequerungen auf der Mittellinie.
- **Ziele für 5 Minuten (8400 GE):** mindestens 5 Dörfer, mindestens 2 Fluss- oder Seequerungen, Waldanteil 20 bis
  55 %, kein Stück nur Wald oder nur Wasser länger als 25 Sekunden (700 GE).
- Punkte: erfüllte Ziele zuerst, dann Abwechslung (Wechsel der Bodenart je Minute). Der beste von 48 Kandidaten wird
  genommen; so ist jeder Seed brauchbar.
- Skript `scripts/cloudwars-journey-route.mjs --seed N` zeigt die Werte einer Strecke und mit `--list` die besten
  Seeds (wie beim Short-Casting).

## 6 · Arbeitspakete

Jedes Paket ein Commit, gemeinsame Branch je Sitzung, Bericht unter `docs/CLOUD_WARS_REISE_<Datum>.md`.

### J1 · Kamera und Gelände-Kacheln (Darstellung)
- Ist: Bodenbild einmal für den festen Ausschnitt (`T.renderArea`).
- Umsetzung: `renderTile`, Zwischenspeicher, Bodenbild nach Abschnitt 4, Verschiebung aller Ebenen um `view`.
  Zum Prüfen zuerst eine Testkamera, die geradeaus fährt (noch ohne Hauptfigur).
- Abnahme: Bodenbild aus Kacheln gleicht `T.renderArea` an derselben Stelle (Pixelvergleich, höchstens 1 Grauwert
  Abweichung). Vergrößerte Ausschnitte an Kachelgrenzen ohne Linie. Seek-Test. Bildzeit gemessen.

### J2 · Reisemodus in der Simulation
- Umsetzung nach Abschnitt 3: Hauptfigur, Zielpunkt, Kamera, neutrale Wolken vorn erzeugen und hinten entfernen,
  Verdunsten, Abschaltungen.
- Abnahme: Determinismus und Seek-Test im Reisemodus; Short- und Runden-Hash unverändert. Gemessen und im Bericht:
  Masse der Hauptfigur über die Zeit, Einsammeln je Minute, Abstand zur Bildmitte, Kamerabeschleunigung.

### J3 · Strecke, Licht, Titel
- Umsetzung nach Abschnitt 4 und 5: Bewertung und Auswahl der Strecke, Lichtverlauf, Titel, Abblende, Stereo-Lage,
  Skript für die Strecke.
- Abnahme: Werte der Strecke für Seed 42 und die zehn besten Seeds; Standbilder alle 30 Sekunden einer Reise als
  Bildstreifen an den Nutzer.

### J4 · Vorlage und Probeclip
- Umsetzung: Auswahl „Reise (Langvideo, ruhig)“ im Schalter „Ablauf“, Vorlage
  `presets/production/cloudwars-journey.json` (16:9, 1080p, 30 Bilder/s, 300 s), README, ROADMAP, CHANGELOG,
  Gesamtplan Abschnitt 0.
- Abnahme: 20-Sekunden-Probeclip aus der Mitte (ab 2:00) mit Ton.
- **Checkpoint beim Nutzer:** Fluggefühl, Tempo, Größe der Wolke, Abwechslung. Erst danach der 5-Minuten-Export auf
  Auftrag (Dauer etwa 12 Minuten bei rund 12 Bildern je Sekunde).

### Wahlpakete (nur auf Auftrag, nach dem Probeclip)
- **W1 Leben am Boden entlang der Strecke:** strömendes Wasser, Boote, Traktor, Tiere, Schornsteinrauch, Autos;
  Erzeugung je Kachel statt je Ausschnitt. Größter Gewinn für die Lebendigkeit.
- **W2 Regenschauer als Rhythmus:** Wird die Wolke groß, regnet sie sich ab und wird klein; das Feld darunter wird
  grüner.
- **W3 Feuer löschen:** ein fernes Gewitter setzt Wald in Brand, die Wolke fliegt hin und löscht; Feuerwehr dazu.
- **W4 Nacht mit Lichtern, W5 Begleitwolken, W6 Naturgeräusche und Musik, W7 Reise im Hochformat.**

## 7 · Prüfung

- `node --test test/cloudwars.test.mjs` und neu `test/cloudwars-journey.test.mjs`: Determinismus, Seek-Bild, Kamera
  stetig (Beschleunigung unter dem Deckel), Kachel-Bodenbild gleich `renderArea`, Hash von Short und Runden gleich.
- Leistung im Export: im Mittel nicht langsamer als der Runden-Modus heute; in der Vorschau kein Bild über 400 ms
  nach dem Aufwärmen.
- Kein vollständiger `npm test`; Referenz-Hashes (`npm run golden`) nicht betroffen, Cloud Wars ist dort nicht
  enthalten.

## 8 · Fragen für das Ende (mit Empfehlung entschieden, Nutzer justiert nach)

1. **Hauptfigur:** CIRRUS (weiß mit hellblauem Rand), ohne Namensschild.
2. **Tempo:** 28 GE/s, eine neue Bildbreite in rund 50 Sekunden.
3. **Richtung:** von links nach rechts, in sanften Bögen.
4. **Licht:** vom hellen Tag bis zum goldenen Abend; keine Nacht in der Minimalfassung.
5. **Titel und Ende:** „A CLOUD'S JOURNEY“ am Anfang, Abblende am Ende.
6. **Länge:** 5 Minuten als Vorlage; 7 Minuten oder länger gehen mit derselben Vorlage, die Strecke wird nur länger.
