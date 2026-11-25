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
| D2 | Drehbuch-Modus: je Runde festlegen, was passiert; Rundenzahl frei | **Erledigt** 25.11. (Vorschlag „Comeback“ vom Nutzer freigegeben) |
| D3 | Casting der Runden in Chromium, 20-Sekunden-Probe | **Erledigt** 25.11. |
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
  Erledigt mit D2.
- Für die Dschungel-Karte gibt es noch kein Casting; die geprüften Turnier-Seeds gelten für Sunny Yard. Erledigt mit D3
  (Casting je Runde fürs Drehbuch).
- Hochkant ist möglich, aber nicht abgestimmt (der Schatten der Randmauer fällt dann von rechts).
- MOSS (grün) hebt sich auf dem Gras etwas weniger ab als die anderen.
- Die Vorschau-Kopie und die drei Vorschau-Bilder liegen nur lokal unter `output/scrap-long/dschungel-vorschau/`.

## D2 · Drehbuch-Modus (25.11.2026)

### Umfang

- **Neuer Schalter „Drehbuch“** (nur im Turnier auf Jungle Ruins): „Ohne“ oder „Comeback“. Die Episode kennt den
  Schlüssel `script` nur, wenn ein Drehbuch an ist; die Werkstatt ist dann aus. Bisherige Turniere rechnen unverändert.
- **Das Drehbuch** ist eine Liste in `src/scenarios/scrap/episode.js` (`SCRIPTS`), eine Zeile je Runde. Je Zeile lässt
  sich festlegen: wer gewinnt, wer als Letzter ausscheidet (Schlussduell), wer zuerst ausscheidet, ob es knapp wird
  (Sieger am Ende unter 20 % Leben) und ob der letzte K.o. durch eine Rakete fällt. Dazu steht der Runden-Seed aus dem
  Casting. Jede Runde ist echt simuliert; der Seed ist so gewählt, dass sie genau so ausgeht.
- **Rundenzahl aus dem Drehbuch:** Kopfleiste „ROUND 7/12“, Kapitel „Round 12 – Final“, Abspann „12 ROUNDS“. Im
  Abspann steht jetzt auch „1 WIN“ statt „1 WINS“ (gilt ebenso für Sunny Yard).
- **Vorlage** `presets/scrap-jungle-drehbuch.json`: quer 1080p, 30 fps, Ton „Weich“, 4 s Ergebnis zwischen den Runden.
  Das Video endet 5 s nach dem Finale.
- **Casting-Skript** `scripts/scrap-script-casting.mjs`: sucht je Zeile einen passenden Seed und prüft mit `--check`
  das ganze Drehbuch als Episode.

### Drehbuch „Comeback“

| Runde | Sieger | Festgelegt | Seed | Stand danach (E/Az/Am/M) |
|---|---|---|---|---|
| 1 | EMBER | – | 2695 | 1/0/0/0 |
| 2 | AZURE | – | 37 | 1/1/0/0 |
| 3 | MOSS | – | 1684 | 1/1/0/1 |
| 4 | EMBER | knapp | 1154 | 2/1/0/1 |
| 5 | AZURE | letzter K.o. per Rakete | 1941 | 2/2/0/1 |
| 6 | EMBER | AMBER scheidet zuerst aus | 516 | 3/2/0/1 |
| 7 | AMBER | EMBER scheidet zuerst aus | 1842 | 3/2/1/1 |
| 8 | AMBER | knapp | 2937 | 3/2/2/1 |
| 9 | AMBER | Schlussduell gegen EMBER, Rakete | 2628 | 3/2/3/1 |
| 10 | EMBER | AMBER scheidet zuerst aus | 2508 | 4/2/3/1 |
| 11 | AMBER | Schlussduell gegen AZURE, knapp | 2848 | 4/2/4/1 |
| 12 (Finale) | AMBER | Schlussduell gegen EMBER, knapp, Rakete | 1892 | 4/2/5/1 |

Kapitel: 0:00, 0:44, 1:28, 2:12, 2:56, 3:39, 4:23, 5:07, 5:51, 6:35, 7:19, 8:03 (Finale). Video 8:57.

## D3 · Casting und Probe (25.11.2026)

### Messwerte

Chromium 148, Seeds 1–3000, je eine Runde quer mit den Optionen der Episode:

- Grundbedingungen erfüllt (ein Sieger, Runde 24–56 s, erster K.o. ab 6 s, Schlussduell ab 5 s, kein Hänger ab
  1,5 s): 72,5 %. Davon knapp 44,2 %, letzter K.o. per Rakete 49,7 %. Runde im Median 32,9 s.
- Passende Seeds je Zeile: 40 (Finale) bis 592. Gewählt ist je Zeile der Seed, der am nächsten an 40 s liegt
  (Finale 48 s); so kommt das Video auf rund 9 Minuten.
- `--check`: Alle zwölf Runden gehen in der Episode aus wie ihre Zeile, Endstand AMBER 5, EMBER 4, AZURE 2, MOSS 1.

### Prüfungen

- Neue Testdatei `test/scrap-script.test.mjs` (4 Tests): Schalter und Schlüssel, Drehbuch und Spielstand, Episode mit
  zwölf Runden und Seeds aus dem Drehbuch (ohne Drehbuch weiter acht), im Browser jede Runde gegen ihre Zeile,
  Endstand, Kapitel und Videolänge.
- `scrap-script`, `scrap-jungle`, `scrap`, `scrap-hud`, `scrap-long`: 36 von 36 grün; nach der Korrektur im Abspann
  `scrap` und `scrap-hud` noch einmal grün.
- `node scripts/scrap-map-hashes.mjs`: 6 × 4 gleich. `npm run golden`: identisch (vor und nach der Korrektur im Abspann).
- 20-Sekunden-Probe vom Ende des Finales mit Abspann (lokal, nicht im Repository):
  `output/scrap-long/drehbuch-probe-20s-finale.mp4` (Sekunde 516 bis 536), 1920 × 1080, 30 fps, mit Ton, Prüfung OK.
- Nicht gelaufen: der volle `npm test` und die Browser-Tests `scrap-browser`, `scrap-short`.

### Grenzen

- Das Drehbuch gilt nur quer. Hochkant werden die Startkisten anders gepaart, die Runden laufen dann anders.
- Nach jeder Änderung an der Taktik-Arena, den Raketen-Regeln oder der Karte muss neu gecastet werden; der
  Browser-Test zeigt dann, welche Runde nicht mehr passt.
- Festgelegt ist, wie eine Runde ausgeht, nicht jeder Schuss. Alle Runden dauern rund 40 s; das ergibt einen
  gleichmäßigen Takt.
- Ein neues Drehbuch: Zeilen in `SCRIPTS` eintragen, Casting laufen lassen, Seeds eintragen, Schalter ergänzen.

## Fragen an den Nutzer

1. **Ablauf „Comeback“:** AMBER bleibt sechs Runden ohne Sieg, holt dann auf und gewinnt das Finale knapp per Rakete.
   Passt das, oder soll das Drehbuch anders laufen (anderer Sieger, mehr oder weniger Runden)?
2. **Takt:** Alle Runden dauern rund 40 s. Lieber gemischt, also ein paar kurze Runden und längere Höhepunkte?
3. **MOSS** gewinnt nur eine Runde. Soll MOSS mehr Rollen bekommen?
4. **Karte:** MOSS (grün) hebt sich auf dem Gras etwas weniger ab; Legende WOOD / ROCK / TEMPLE. Passt das?
5. **Export:** das ganze Video (8:57) auf Auftrag:
   `node export.mjs --config presets/scrap-jungle-drehbuch.json --out output/scrap-jungle-drehbuch.mp4`
   Die Kapitelzeiten stehen danach in der JSON-Datei daneben unter `chaptersText`.
