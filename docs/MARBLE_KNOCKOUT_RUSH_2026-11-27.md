# Marble Knockout Rush · Bericht (R44)

Plan: [MARBLE_KNOCKOUT_RUSH_PLAN_2026-11-27.md](MARBLE_KNOCKOUT_RUSH_PLAN_2026-11-27.md). Dieser Bericht wird mit jedem
Paket fortgeschrieben.

| Paket | Stand | Branch |
|---|---|---|
| R1 · Grundlage und TRAP TOWER Abschnitt 1 | erledigt; nach der Rückmeldung Gefängnis statt Abgrund | `murmelrennen/rush-r1` |
| R2 · TRAP TOWER komplett, Casting, Vorlage | erledigt | `murmelrennen/rush-r2` |
| R3 · THE AVALANCHE Abschnitte 1 bis 5 | offen | – |
| R4 · THE AVALANCHE Abschnitte 6 bis 10, Vorlage | offen | – |
| R5 · Abschluss, Geschmacksfragen, README | offen | – |

---

## R1 · Grundlage und erster Abschnitt von TRAP TOWER (27.11.2026)

### Kurzfassung

- Neue Einstellung **„Level (Gesamtlevel)“**: „Standard“ (THE TOWER / THE GAUNTLET, wie bisher) oder „Rush“.
  Hochkant zeigt Rush **TRAP TOWER**; quer zeigt Rush bis zu Paket R3 noch THE GAUNTLET.
- TRAP TOWER hat seinen ersten Abschnitt **TRAPDOORS** mit echter Physik: 24 Murmeln im Käfig mit zwei Reihen, kurzes
  Nagelfeld, Falltür-Boden über dem Abgrund, Schleuse TOP 14. Danach steht der Platzhalter „TO BE CONTINUED“.
- Im Vergleich mit THE TOWER sind mehr als doppelt so viele Murmeln in Bewegung im Bild (13,9 statt 6,6), es gibt
  keine ruhige Zeit, und in 100 Läufen braucht keine Murmel einen Anstoß.
- Die alten Level rechnen und zeichnen unverändert: Tests grün, Referenz-Hashes identisch, das neue Messskript gibt
  für THE TOWER genau die Ausgangswerte des Plans wieder.

### Was gebaut ist

| Datei | Änderung |
|---|---|
| `src/scenarios/knockout/levels-rush.js` (neu) | TRAP TOWER (`trap`): Abschnitt TRAPDOORS, Platzhalter; acht neue Farben, Felder `FIELD24` und `FIELD28` |
| `src/scenarios/knockout.js` | Schalter `level` (`standard` / `rush`, nur im Gesamtlevel), Auswahlfeld „Level (Gesamtlevel)“ |
| `src/scenarios/knockout/levelsim.js` | Level-Wahl über `params.level`; `spec.cam` (eigene Kamera-Werte je Level); `trapsAt` (Fallen schließen nach so vielen Stürzen); Regel `quietStart` (Ruhe für Einblendungen am Start) |
| `src/scenarios/knockout/elements.js` | `dropShelf({ rows: 2 })`: Käfig mit zwei Reihen, Wände 2 d höher |
| `src/scenarios/knockout/levels.js` | gibt die Helfer `turnstileOn` und `wallNoses` für die Rush-Level frei (sonst unverändert) |
| `index.html`, `scripts/knockout-lab.mjs` | laden `levels-rush.js` |
| `scripts/knockout-action.mjs` (neu) | Aktionswerte je Lauf und je Abschnitt: `--level tower|gauntlet|trap|avalanche --seeds 1-8` |
| `scripts/knockout-frames.mjs` | `--level rush` |
| `scripts/knockout-colors.mjs` | `--level rush --aspect 9:16|16:9`: Farbtafel je Format in Videogröße |

Jeder neue Schalter hat einen Standardwert, der das alte Verhalten ergibt: `rows` 1, ohne `spec.cam` die bisherigen
Kamera-Werte, ohne `trapsAt` schließen die Fallen wie bisher erst bei voller Quote, ohne `quietStart` bleiben es 1,5 s.

### TRAPDOORS (24 → TOP 14, Sturz zählt)

- Käfig 78 bis 1002 E, 24 Plätze im halben Abstand (36,5 E): untere Reihe auf den Klappen, obere 0,8 d höher
  versetzt in den Mulden. Rand 24 E zu den Wänden.
- Nagelfeld mit 6 Reihen (statt 11 im Turm), zwei Bumper, Abweiser an beiden Wänden.
- Falltür-Boden: sieben Platten zu 2,3 d, 8° nach rechts, Takt 1,0 s, Warnblinken 0,5 s, offen 0,6 s. Darunter der
  Abgrund in zwei Stücken (weich gezeichnet wie unter der Brücke in THE GAUNTLET).
- **Nach fünf Stürzen schließen die Falltüren** (`TRAPS CLOSED`), den Rest entscheidet die Schleuse.
- Am Ende des Bodens fällt man rechts in einen Schacht auf die Rampe (10°), die nach links in die Schleuse führt.
- Welt `petrol`; R1 ist 2300 E hoch (Abschnitt 1 und Platzhalter).

### Abweichungen vom Plan

| Plan | Jetzt | Grund (Messung je 8 Läufe) |
|---|---|---|
| 5°, Takt 0,7 s, offen 0,8 s, Fallen zu nach **zehn** Stürzen | 8°, Takt 1,0 s, offen 0,6 s, zu nach **fünf** | Mit den Planwerten fielen in jedem Lauf zehn, um die Schleuse kämpfte niemand mehr, der Abschnitt dauerte 13,7 s. Gnädigere Falltüren allein senkten die Stürze kaum (7 bis 8). |
| Platten 2,6 d | 2,3 d | Sieben Platten zu 2,6 d füllen die ganze Breite; dann bleibt kein Ausgang zur Rampe. |
| Käfigrand 12 E | 24 E | Links klemmte eine Murmel zwischen Wand und erstem Scharnier (Anstoß in 2 von 8 Läufen). |
| – | Regel `quietStart` 3,2 s | Mit 24 Murmeln im Nagelfeld springen die Ränge zufällig; `SAND +18 PLACES!` erschien schon nach 2,5 s über `PICK YOUR COLOR!`. |
| Short-Feld FIELD16 + OLIVE, INDIGO, PEACH, RUST, MAGENTA, SAND, TEAL, SKY | die 20 Farben aus THE GAUNTLET + OLIVE, PEACH, MAGENTA, RUST | Farbtafel: INDIGO mit Band sah im Gedränge aus wie NAVY, SAND liegt nah an PEACH und SILVER. |
| INDIGO mit Band | INDIGO ohne Band | wie oben; NAVY trägt das Band |
| `+N` an der Röhre und `titleInIntro` in R1 | in R3 und R4 | Beides gibt es nur im Langvideo; vorher lässt es sich nicht ansehen. `spec.cam` ist gebaut, wird aber erst von THE AVALANCHE benutzt. |

### Messwerte

Nur Simulation in Node mit `scripts/knockout-action.mjs`. Gezählt wird im Rennen bis zur ersten Schleuse (TRAP TOWER)
bzw. bis zum Sieg (THE TOWER); Platzhalter zählen nicht mit.

| Wert (Median) | THE TOWER, Seeds 1–8 | TRAP TOWER Abschnitt 1, Seeds 1–8 | TRAP TOWER, 100 Läufe | Ziel des Plans |
|---|---|---|---|---|
| Im Spiel | 9,0 | 20,6 | 20,6 | mindestens 13 |
| In Bewegung im Bild | 6,6 | 13,9 | 13,9 | mindestens 9 |
| Ruhige Zeit | 2,5 s | 0 s | 0 s | höchstens 2 s |
| Abschnittsdauer | 12,1 / 10,7 / 11,1 s | 10,3 s | 10,2 s (längster Lauf 11,8 s) | höchstens 13 s |
| Läufe mit Anstoß | 0 / 8 | 0 / 8 | 0 / 100 | höchstens 10 / 100 |
| Stürze im Abschnitt | – | 6 | 6 | mindestens 1 |

Verteilung in 100 Läufen: 5 Stürze in 26 Läufen, 6 in 39, 7 in 26, 8 bis 10 in 9 (Murmeln, die beim Schließen schon
fallen). Zu spät an der Schleuse: meist 3 bis 5; in einem Lauf fielen alle zehn.

Die Werte gelten nur für Abschnitt 1. Wenn TRAP TOWER in R2 komplett ist, sinkt der Schnitt „im Spiel“ (Finale zu
siebt); das Ziel gilt dann für das ganze Rennen.

### Nachweise (lokal in `output/knockout-lab/`, nicht im Repository)

- `rush-colors-9x16.png`, `rush-colors-16x9.png`: Farbtafeln in Videogröße (24 Murmeln hochkant mit r 28, 28 quer mit
  r 20), Startkäfig, ähnliche Nachbarn im Gedränge.
- `trap-r1-probe.mp4`: Probe 9:16, Seed 1, vom Start bis zum Platzhalter, 13,3 s (endet von selbst nach der ersten
  Schleuse), 400 Bilder, Exportprüfung OK. Konfiguration daneben in `trap-r1-probe.json`.
- `trap-r1-seed1.jpg`, `trap-r1-seed2.jpg`, `trap-r1-seed5.jpg`: Bildblätter zu acht Zeitpunkten.

### Gelaufen

- `node --test test/knockout-level.test.mjs`: 19 grün, davon neu: Schalter und Bitgleichheit, Bau von TRAP TOWER (24
  Farben, Käfig ohne Überlappung, sieben Platten, TOP 14), Stürze und `TRAPS CLOSED` ohne Anstoß (Seeds 1 bis 3),
  Zeichnen ändert nichts; der Ablauf-Test mit Kamera läuft zusätzlich für TRAP TOWER (Seeds 1 und 2).
- `node --test test/knockout.test.mjs test/knockout-elements.test.mjs`: 11 grün.
- `npm run golden`: identisch mit der Referenz.
- Oberfläche im Browser (lokaler Server aus der Arbeitskopie): „Level (Gesamtlevel)“ erscheint nur im Gesamtlevel, mit
  „Standard“ vorgewählt; mit „Rush“ startet hochkant TRAP TOWER (24 Murmeln, nach 6 s fünf Stürze, Fallen zu).
- Nicht gelaufen: voller `npm test`, Browser-Tests (Seek-Prüfung für TRAP TOWER kommt mit dem kompletten Level in R2).

### Grenzen

- Rush im Querformat zeigt bis R3 THE GAUNTLET; die Auswahl sagt „(in Arbeit)“.
- Die Kamera bewegt sich in R1 kaum, weil die Welt erst 2300 E hoch ist.
- `+N PLACES!` erscheint mit 24 Murmeln öfter und mit großen Zahlen (z. B. `RED +13 PLACES!` bei 4,4 s). Wenn das
  stört, kann die Schwelle mit der Feldgröße wachsen.

### Fragen an den Nutzer (Stopp nach R1)

1. **Feldgröße:** 24 Murmeln im Short passend?
2. **Farben:** Short mit den 20 Farben aus THE GAUNTLET plus OLIVE, PEACH, MAGENTA, RUST; im Langvideo alle 28, INDIGO
   ohne Band. Einverstanden?
3. **Falltüren:** fünf bis sieben Stürze, dann `TRAPS CLOSED`, danach drei bis fünf zu spät an der Schleuse. Mehr,
   weniger oder so lassen?

**Antwort (27.11.):** „ok soweit gut“; nur die schwarze Leere unter den Falltüren sah komisch aus und sollte
verständlicher werden, „evtl gefängniskäfig“. Zwei Vorschau-Bilder aus einer Kopie (A: Gefangene bleiben sichtbar,
B: Gitter vor dem Dunkel), der Nutzer wählte **A**. Umsetzung im nächsten Abschnitt.

## R1 · Nachtrag: Gefängnis statt Abgrund (27.11.2026)

### Was sich ändert

- Unter dem Falltür-Boden liegt jetzt ein **Gefängnis**: dunkle Steinwand mit Fugen, Gitterstäbe vor den Murmeln, zwei
  Querbänder mit Nieten, Schild `JAIL` in der Mitte. Wer durch eine Klappe fällt, ist raus wie bisher, verschwindet
  aber nicht, sondern liegt bis zum Schluss sichtbar hinter Gittern. Die Zahl im Käfig passt zur Einblendung
  (`5 ARE OUT` = fünf im Käfig).
- Neuer Schalter an der Grube: `pit(…, { jail: true })`. `fell()` erkennt den Sturz in eine solche Grube, setzt
  `u.jailed` und lässt die Murmel aktiv; ihre Ebene wechselt auf 4. Ohne `jail` bleibt alles wie vorher (die alten
  Level haben keine solche Grube, Referenz-Hashes identisch).
- **Ebene 4:** Gefangene stoßen nur noch mit den Wänden des Gefängnisses und mit anderen Murmeln zusammen. Ohne das
  schlug in Seed 3 eine schließende Klappe RUST zurück auf den Boden, und sie rollte als Ausgeschiedene über die Rampe
  bis in die Schleuse.
- Unsichtbare Bahnen: Grund mit 3° nach links (Maske 5, für beide Ebenen), rechte Wand bis unter das Bodenende
  (Maske 5), darüber bis 80 E über das Bodenende und links an der Turmwand nur für Gefangene (Maske 4).
- **Rampe 140 E tiefer** (Grund rechts 1440 statt 1300): Mit dem Gefängnis an der alten Stelle stauten sich die Murmeln
  im Schacht zwischen Gefängnis und Turmwand.
- Zeichnung: `jailBack` in den festen Kacheln, `jailFront` vor den Murmeln aus einem einmal gezeichneten Bild
  (`art.js`, `renderer.js` über `decor` `jail`). Kein Zustand, der von der Bildzahl abhängt.

### Nebenwirkung: Stürze zählen jetzt nur noch durch die Klappen

In R1 waren 51 von 249 Stürzen (Seeds 1 bis 40) gar keine Stürze durch eine Klappe: Die Murmel rollte am Ende des
Bodens in den Schacht, prallte von der Rampe zurück nach links unter den Boden und war im Abgrund „raus“. Die rechte
Wand des Gefängnisses verhindert das. Darum gibt es jetzt im Median **fünf Stürze** statt sechs (fünf in 76 Läufen,
sechs in 24), mehr als sechs nicht mehr.

### Messwerte (100 Läufe, nur Simulation)

| Wert (Median) | R1 mit Abgrund | mit Gefängnis |
|---|---|---|
| Im Spiel | 20,6 | 21,0 |
| In Bewegung im Bild | 13,9 | 14,3 |
| Ruhige Zeit | 0 s | 0,3 s |
| Abschnittsdauer | 10,2 s (längster 11,8 s) | 9,9 s (längster 11,0 s) |
| Läufe mit Anstoß | 0 / 100 | 0 / 100 |
| Stürze | 6 (5 bis 10) | 5 (5 bis 6) |

Zusätzlich geprüft (Seeds 1 bis 100): Am Ende liegt jede Gestürzte aktiv im Gefängnis, zwischen Boden und Grund, und
nur sie; höchstens sechs auf einmal.

### Nachweise (lokal, nicht im Repository)

- Vorschau aus der Kopie: `kaefig-keep.jpg` (A) und `kaefig-dark.jpg` (B) im Notizordner der Sitzung.
- `output/knockout-lab/trap-r1-jail-seed3.jpg`: Bildblatt aus der Arbeitskopie, Seed 3 (der Lauf, in dem RUST vorher
  zurück auf den Boden geschlagen wurde), sechs Zeitpunkte.

### Gelaufen

- `node --test test/knockout-level.test.mjs`: 19 grün; der Sturz-Test prüft jetzt zusätzlich, dass jede Gestürzte am
  Ende im Gefängnis liegt (Seeds 1 bis 3).
- `npm run golden`: identisch mit der Referenz.
- Nicht gelaufen: `knockout` und `knockout-elements` (nur ein Schalter an der Grube dazu), voller `npm test`, keine neue
  Probe als Video.

## R2 · TRAP TOWER komplett, Casting, Vorlage (27.11.2026)

### Kurzfassung

- TRAP TOWER ist komplett: **TRAPDOORS** (24 → TOP 14), **SWEEPERS** (14 → TOP 7), **FINAL** (7 → Sieger). Der
  Platzhalter ist weg.
- In 100 Läufen sind alle Aktionswerte des Plans erreicht, keine Murmel braucht einen Anstoß, ein Video dauert im
  Median 32 s (höchstens 36,5 s).
- Casting über 200 Seeds: 41 vollständig (Ziel: mindestens 8). Die Vorlage nutzt die neun mit echtem Fotofinish.
- Neue Vorlage **„Short · Trap Tower“**: eigener Knopf (nur bei Marble Knockout sichtbar), Datei
  `presets/production/knockout-short-rush.json`. Die Vorlagen „Short“ und „Langvideo“ bleiben unverändert.

### Was gebaut ist

| Datei | Änderung |
|---|---|
| `src/scenarios/knockout/levels-rush.js` | Abschnitte SWEEPERS und FINAL, Welt 6140 E hoch, goldener Schimmer ums Ziel; Platzhalter entfernt |
| `src/scenarios/knockout.js` | Casting-Liste `TRAP_CAST` und `castTrapSeed` |
| `src/production-presets.js` | Vorlage `short-rush` (nur Marble Knockout) |
| `presets/production/knockout-short-rush.json` (neu) | dieselben Werte für die Kommandozeile |
| `index.html`, `src/app.js` | Knopf „Short · Trap Tower (Rush, rund 33 Sekunden)“, nur bei Marble Knockout |
| `scripts/knockout-lab.mjs` | Messung der Aktionswerte als gemeinsame Funktion `measureAction` (vorher nur im Messskript) |
| `scripts/knockout-action.mjs` | nutzt `measureAction`; Ausgabe unverändert (THE TOWER: 9,0 / 6,6 / 2,5 s wie vorher) |
| `scripts/knockout-casting.mjs` | `--level trap`: Rush-Schalter, Finale knapp unter 0,3 s, dazu Prüfpunkt Aktionswerte |

### Die Abschnitte

- **SWEEPERS** (Welt `plum`): zwei Simse über die ganze Breite mit 8°, der obere nach rechts, der untere nach links.
  Jeder hat zwei Lücken zu 1,5 d (Abkürzung auf die Ebene darunter, kein Abgrund) und einen Kehrarm (zwei Arme zu
  3,6 d, 0,25 U/s). Darunter ein Trichter (12°) direkt in einen breiten Mischkasten (innen 320 E) mit fünf Stiften
  (2-1-2, 1,4 d bis zur Wand), dann eine Rampe (10°) nach links in die Schleuse TOP 7.
- **FINAL** (Welt `gold`): Trichter (20°) über die ganze Breite in einen Kanal, innen 2,2 Murmeln breit, von vorn in
  die Drehbühne (R 7 d, ein innerer Ring, drei Speichen, drei Ausgänge, 0,2 U/s). Darunter wie im Turm: Fangbahn,
  Steilabfahrt mit zwei Mulden, offene Zielgerade (5°), Schiene hinter dem Ziel.

### Abweichungen vom Plan

| Plan | Jetzt | Grund (Messung) |
|---|---|---|
| Drehbühne mit Ringen 0,66 und 0,36, zwei Speichen, 0,12 U/s | ein Ring 0,5, drei Speichen, 0,2 U/s | Die Bühne hielt die Erste im Median 2,8 s und bis 16 s fest, das Finale dauerte bis 21 s. Jetzt (24 Läufe): Erste nach 2,2 s heraus, längstens 3,3 s; Finale 10 s, längstens 12,5 s. Der Ersatz (Nagelfeld) war nicht nötig. |
| beide Kehrarme gegenläufig zum Strom | oben mit dem Strom, unten dagegen | Gegen den Strom stand oben eine Schlange aus sieben Murmeln 2 bis 3 s vor dem Arm. Die Zahlen sind in allen vier Richtungs-Paaren fast gleich (16 Läufe je Paar); so ist der Abschnitt am kürzesten (Median 9,4 s, längster 10,1 s), und unten wirft der Arm weiter Führende zurück. |
| Mischkasten vor der Schleuse | Trichter direkt in den breiten Kasten, ohne engen Hals | Regel „Engstellen“ aus Abschnitt 2 des Plans: keine einzelne Spur. |
| Schleuse 1 nach 12 s, Schleuse 2 nach 24 s, Sieg nach 35 s | nach rund 10, 20 und 29,5 s; Video 32 s | Alle Abschnitte sind schneller als geplant; das passt zu Shorts um 30 s. |

### Messwerte (100 Läufe, nur Simulation, `scripts/knockout-action.mjs --level trap --seeds 1-100`)

| Wert (Median) | THE TOWER (8 Läufe) | TRAP TOWER | Ziel des Plans |
|---|---|---|---|
| Im Spiel | 9,0 | 13,7 | mindestens 13 |
| In Bewegung im Bild | 6,6 | 9,5 | mindestens 9 |
| Ruhige Zeit | 2,5 s | 1,0 s | höchstens 2 s |
| Längster Abschnitt je Lauf | 12,7 s | 10,4 s | höchstens 13 s |
| Läufe mit Anstoß | 0 / 8 | 0 / 100 | höchstens 10 / 100 |
| Videolänge | 37,2 s | 32,1 s (höchstens 36,5 s) | höchstens 40 s |

| Abschnitt | Dauer (Median) | längster Lauf | in Bewegung im Bild | Stürze (Median) |
|---|---|---|---|---|
| 1 TRAPDOORS | 9,9 s | 10,9 s | 14,2 | 5 |
| 2 SWEEPERS | 9,5 s | 11,5 s | 8,9 | 0 |
| 3 FINAL | 10,0 s | 12,7 s | 5,6 | 0 |

Platz 1 und 2 trennen im Ziel weniger als 0,3 s in 11 von 100 Läufen.

### Casting

`node scripts/knockout-casting.mjs --level trap --from 1 --to 200 --list --top 24`, nur Simulation. Vollständig
ist ein Seed, wenn alle Punkte aus dem Plan stimmen:

| Prüfpunkt | erfüllt |
|---|---|
| Video höchstens 40 s | 199 von 200 |
| Sturz auf dem Falltür-Boden (oder knappe Schleuse) | 200 von 200 |
| Finale knapp (unter 0,3 s oder Zeitlupe) | 80 von 200 |
| Führungswechsel im Finale | 113 von 200 |
| kein Anstoß, niemand sitzt fest | 199 von 200 |
| Aktionswerte erreicht (im Spiel 13, in Bewegung 9, ruhig 2 s, Abschnitt 13 s) | 193 von 200 |
| **alles zusammen** | **41 von 200 (21 %)** |

Länge im Median 32,2 s, kürzeste 28,4 s; keine verletzte Invariante. Von den besten 24 (kurz und knapp) haben neun
ein echtes Fotofinish mit unter 0,3 s zwischen Platz 1 und 2. Nur diese stehen in `TRAP_CAST`, wie beim Turm:

| Seed | Länge | Abstand 1–2 | Führungswechsel | Stürze | GOLD im Finale | Sieger |
|---|---|---|---|---|---|---|
| 67 (Vorlage) | 33,2 s | 0,16 s | 1 | 5 | ja | BLUE |
| 70 | 33,2 s | 0,19 s | 1 | 5 | – | MAROON |
| 86 | 33,8 s | 0,17 s | 2 | 5 | – | YELLOW |
| 104 | 33,3 s | 0,29 s | 2 | 6 | – | BROWN |
| 110 | 33,3 s | 0,20 s | 2 | 6 | – | MAGENTA |
| 134 | 35,2 s | 0,17 s | 1 | 5 | ja | OLIVE |
| 137 | 33,2 s | 0,19 s | 1 | 5 | ja | GOLD |
| 150 | 32,8 s | 0,17 s | 1 | 5 | – | PURPLE |
| 197 | 31,4 s | 0,23 s | 1 | 5 | ja | PEACH |

Die Vorlage nimmt wie die anderen den nächsten geprüften Seed ab dem eingestellten (Standard 42 → 67).

### Nachweise (lokal in `output/knockout-lab/`, nicht im Repository)

- `trap-r2-anfang-20s.mp4` und `trap-r2-finale-20s.mp4`: Vorlage „Short · Trap Tower“ (Seed 67), Sekunde 0 bis 20 und
  13,2 bis 33,2, je 1080 × 1920, 30 fps, mit Ton; Prüfung des Exports OK. Am Ende `BLUE WINS!` mit `PHOTO FINISH`.
- `trap-r2-proben-bilder.jpg`: je drei Bilder aus beiden Proben (Falltür-Boden mit Gefängnis, Schleuse TOP 7,
  Kehrarme, Mischkasten, Drehbühne, Ziel).
- `trap-r2-seed7.jpg`, `trap-r2-sweepers-seed2.jpg`, `trap-r2-final-seed96.jpg`: Bildblätter beim Bauen.

```bash
node export.mjs --config presets/production/knockout-short-rush.json --clip-start 0 --clip-duration 20 --out output/knockout-lab/trap-r2-anfang-20s.mp4
node export.mjs --config presets/production/knockout-short-rush.json --clip-start 13.2 --clip-duration 20 --out output/knockout-lab/trap-r2-finale-20s.mp4
```

### Gelaufen

- `node --test test/knockout-level.test.mjs`: 20 grün (neu: Vorlage „Short · Trap Tower“; Bau, Sturz- und
  Zeichentest auf das ganze Level erweitert).
- `node --test test/knockout-level-browser.test.mjs`: grün; Chromium rechnet wie Node und die Seek-Regel hält jetzt
  auch für TRAP TOWER (Seed 3, sechs Zeitpunkte bis ins Finale).
- `npm run golden`: identisch mit der Referenz.
- Oberfläche im Browser: Der Knopf erscheint nur bei Marble Knockout und lädt Seed 67 hochkant mit Rush (33,7 s).
- `scripts/knockout-action.mjs` nach dem Umbau auf `measureAction`: THE TOWER unverändert (9,0 / 6,6 / 2,5 s).
- Nicht gelaufen: `knockout` und `knockout-elements` (nicht berührt), Exporttest der Vorlagen, voller `npm test`.

### Grenzen

- Im Finale sind nur noch sieben Murmeln unterwegs; dort bewegen sich im Schnitt 5,6 im Bild. Der Wert für das ganze
  Rennen liegt trotzdem über dem Ziel.
- Rush im Querformat zeigt bis R3 weiter THE GAUNTLET; die Auswahl sagt weiter „(in Arbeit)“.
- Nur 21 % der Seeds sind vollständig (THE TOWER: 23 von 200). Die meisten scheitern an einem nicht knappen Finale
  oder daran, dass die Führung im Finale nicht wechselt; für eine Vorlage reichen 41 gut.
