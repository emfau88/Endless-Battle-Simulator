# Scrap Wars: Langvideo im Dschungel – Bericht (R42)

Stand 25.11.2026. Offene Aufgaben stehen in der [ROADMAP](ROADMAP.md), Erledigtes im [CHANGELOG](CHANGELOG.md).

## Ziel

Wunsch des Nutzers vom 24.11.2026: ein Langvideo von 8 bis 10 Minuten, bei dem ein Drehbuch festlegt, was passiert.
Dazu eine coolere, etwas größere Karte (rund 30 %), im selben Seitenverhältnis weiter herausgezoomt und trotzdem im
Vollbild, gern im Dschungel-Stil. Aus drei Vorschau-Bildern hat der Nutzer Bild 1 gewählt: Tempelruine, Karte 30 %
größer (die Bach-Variante und die Größe +20 % entfallen).

Empfehlung, vom Nutzer übernommen: kein Export direkt aus der Vorschau-Kopie, sondern eine eigene Karte im Projekt,
gemessen und getestet, danach ein Drehbuch-Modus.

| Paket | Inhalt | Stand |
|---|---|---|
| D1 | Karte „Jungle Ruins“ in der Taktik-Arena | **Erledigt** 25.11. |
| D2 | Drehbuch-Modus: je Runde festlegen, was passiert; Rundenzahl frei | Offen, Inhalt des Drehbuchs kommt vom Nutzer |
| D3 | Casting der Runden in Chromium, 20-Sekunden-Probe | Offen |
| D4 | Export des ganzen Videos | Nur auf Auftrag |

## D1 · Karte „Jungle Ruins“ (25.11.2026)

### Umfang

- **Eigene Arena `jungle`** (Arena-Auswahl „Jungle Ruins“). Gibt es nur in der Taktik-Arena `v4` und immer mit den
  Raketen-Regeln (Blaster lädt nach, Raketen nur von den Plattformen). Die Oberfläche sperrt dann „Kampfregeln“ und
  „Waffen“; `normalizeParams` setzt `v4` und `items: 'rockets'` auch, wenn etwas anderes übergeben wird.
- **Karte 1352 × 702** statt 1040 × 540 (30 % größer, gleiches Seitenverhältnis). Ein Viertel ist entworfen und wird an
  beiden Achsen gespiegelt: Tempelecke (L aus Beton), Holz-Barrikade vor dem Seitentor, Felsblock, Holzstapel (L),
  Mauerrest an der Wand. 28 Deckungen (12 Holz, 8 Stein, 8 Beton), engste Durchfahrt 96 AE.
- **Drei Raketen-Plattformen** statt zwei: außen links und rechts, eine umkämpft in der Tempelmitte. Erste Rakete nach
  6, 7,5 und 11 s, danach alle 9 s nach der Aufnahme.
- **Tempo** wie auf der großen Karte (`ARENA_FIGHT`, als eigene Kopie `JUNGLE_FIGHT`): Die Messung zeigt, dass es ohne
  Änderung passt (siehe unten).
- **Bildaufbau:** Die Karte füllt das Bild unter der Kopfleiste wie bisher (quer 1896 Pixel breit), wirkt also weiter
  herausgezoomt. Namensschilder, Lebensbalken und Raketen-Abzeichen sind deshalb 25 % größer. Hochkant wird die Karte
  gedreht gezeigt.
- **Darstellung** in der neuen Datei `src/scenarios/scrap/jungle-art.js`: Gras und Moos, festgefahrene Erdwege durch
  die vier Tore, Steinplatten der Tempelruine, Sonnenrad unter der mittleren Plattform, Steinsockel unter den äußeren,
  Wurzeln, Farne, Blüten, Laub, Sonnenflecken; bewachsene Ruinenmauer als Rand. Ein Blätterdach am Rand liegt über
  Robotern und Effekten, aber unter den Namensschildern. Deckungen sind die Tageslicht-Deckungen von Sunny Yard,
  grüner getönt, mit Moos, Ranken und (Beton als Tempelstein) eingemeißeltem Mäander. Eigene Trümmerfarben; Legende in
  der Kopfleiste WOOD / ROCK / TEMPLE. Effekte, Startkisten, Münzen und Plattformen sind die von Sunny Yard.
- Boden und Blätterdach werden einmal je Kartengröße gezeichnet (fester kosmetischer Zufall, nicht aus der Simulation).

### Messwerte

Node, je Karte 400 Runden quer mit Raketen-Regeln (Seeds 1–400):

| Karte | 1. K.o. | 2. K.o. | Rundenende | Schlussduell | Duell > 20 s | Hänger ≥ 2 s | untätig | Raketen je Runde | Siege E/Az/Am/M |
|---|---|---|---|---|---|---|---|---|---|
| Jungle Ruins | 9,6 s | 21,7 s | 32,8 s | 11,1 s | 7 % | 0 % | 5,2 % | 5,1 | 25/27/25/24 % |
| Sunny Yard (zum Vergleich) | 9,9 s | 18,8 s | 31,2 s | 11,3 s | 4 % | 0 % | 5,1 % | 5,4 | 26/26/21/27 % |

`scripts/scrap-v4-stats.mjs --arena jungle --seeds 120`: kein Unentschieden, festgefahren 0,5 % (quer) und 0,2 %
(hochkant) der Roboterzeit, Trefferpaare in den ersten 15 s gleichmäßig (häufigstes 19,6 %).

Im Browser (Chromium) verläuft Seed 458 genau wie in der Vorschau-Kopie (erste Runde: K.o. bei 8,2, 15,8 und 28,6 s).
Ein Turnier mit acht Runden auf Seed 458 dauert rund 5 Minuten (Kapitel 0:00, 0:32, 1:24, 2:02, 2:37, 3:21, 4:03, 4:30).

### Prüfungen

- Neue Testdatei `test/scrap-jungle.test.mjs` (4 Tests): Parameter, Karte (Spiegelung, Durchfahrten, Erreichbarkeit
  aller Plattformen und Kisten), Runden mit Sieger ohne Hänger, alle drei Plattformen genutzt, Bildaufbau, Wiederholbarkeit.
- `test/scrap-v4`, `scrap`, `scrap-optics`, `scrap-hud`, `scrap-labels`, `scrap-material-art`: 44 von 44 grün.
- `node scripts/scrap-map-hashes.mjs`: 6 × 4 gleich. `npm run golden`: identisch mit der Referenz. Die bisherigen
  Karten rechnen und zeichnen unverändert.
- Seek-Regel im Browser: Bild nach durchgehender Wiedergabe gleich dem Bild nach einem Sprung (quer und hochkant).
- 20-Sekunden-Probe (lokal, nicht im Repository): `output/scrap-long/dschungel-probe-20s-seed458.mp4`, 1920 × 1080,
  30 fps, mit Ton, Prüfung des Exports OK.
- Nicht gelaufen: der volle `npm test` und die Browser-Tests `scrap-browser`, `scrap-short`, `scrap-long` (Sunny Yard
  und die Vorlagen sind unverändert).

### Grenzen

- Das Turnier hat fest acht Runden, rund 5 Minuten. Für 8 bis 10 Minuten braucht es D2 (mehr Runden nach Drehbuch).
- Für die Dschungel-Karte gibt es noch kein Casting; die geprüften Turnier-Seeds gelten für Sunny Yard.
- Hochkant ist möglich, aber nicht abgestimmt (der Schatten der Randmauer fällt dann von rechts).
- MOSS (grün) hebt sich auf dem Gras etwas weniger ab als die anderen.
- Die Vorschau-Kopie und die drei Vorschau-Bilder liegen nur lokal unter `output/scrap-long/dschungel-vorschau/`.

## D2 · Drehbuch-Modus (Vorschlag)

- Das Drehbuch ist eine Liste mit einer Zeile je Runde. Je Zeile lässt sich festlegen: wer gewinnt, wer zuerst
  ausscheidet, ob es knapp wird (Sieger unter 20 % Leben) und ob der letzte K.o. durch eine Rakete fällt.
- Ein Casting-Skript sucht in Chromium für jede Zeile einen Runden-Seed, der genau das liefert, und schreibt die Seeds
  in die Vorlage. Die Kämpfe bleiben echt simuliert und das Video jederzeit gleich wiederholbar.
- Rundenzahl frei (12 bis 14 Runden ergeben 8 bis 10 Minuten), Kapitel je Runde wie bisher, Abschluss mit Gesamtstand.
- Als eigener Modus, damit die bisherigen Turniere unverändert bleiben.
