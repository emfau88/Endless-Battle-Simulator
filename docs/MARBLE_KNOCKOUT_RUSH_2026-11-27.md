# Marble Knockout Rush · Bericht (R44)

Plan: [MARBLE_KNOCKOUT_RUSH_PLAN_2026-11-27.md](MARBLE_KNOCKOUT_RUSH_PLAN_2026-11-27.md). Dieser Bericht wird mit jedem
Paket fortgeschrieben.

| Paket | Stand | Branch |
|---|---|---|
| R1 · Grundlage und TRAP TOWER Abschnitt 1 | erledigt; nach der Rückmeldung Gefängnis statt Abgrund | `murmelrennen/rush-r1` |
| R2 · TRAP TOWER komplett, Casting, Vorlage | erledigt | `murmelrennen/rush-r2` |
| R3 · THE AVALANCHE Abschnitte 1 bis 5 | erledigt; SWEEPERS und Anstöße knapp über dem Ziel (vermerkt) | `murmelrennen/rush-r3` |
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

---

## R3 · THE AVALANCHE Abschnitte 1 bis 5 (28.11.2026)

### Kurzfassung

- Rush im Querformat zeigt jetzt **THE AVALANCHE** statt THE GAUNTLET: 28 Murmeln, Kamera mit fester Breite, die
  Abschnitte 1 bis 5 mit echter Physik (28 → 25 → 22 → 19 → 16 → 14), danach ein Platzhalter („TO BE CONTINUED“).
  Die Auswahl sagt weiter „(in Arbeit)“.
- In 100 Läufen bis zur fünften Schleuse: kein Zeitlimit, niemand sitzt fest. Im Spiel, in Bewegung im Bild und
  ruhige Zeit liegen klar im Ziel. Knapp verfehlt: **SWEEPERS dauert im Median 17,1 s** (Ziel höchstens 15 s,
  längster Lauf 22,8 s statt 18 s), und **11 von 100 Läufen** brauchen einen Anstoß (Ziel höchstens 10),
  fast alle in SWEEPERS. Auf Wunsch des Nutzers bleibt SWEEPERS so und ist hier vermerkt (Ideen dazu unter
  „Grenzen“).
- Neu im Baukasten: Ein Kehrarm kann beim Schließen der Fallen parken (`turnstile({ …, park: true })`). Alle bisherigen
  Level bleiben bitgleich (Referenz-Hashes identisch).

### Was gebaut ist

| Datei | Änderung |
|---|---|
| `src/scenarios/knockout/levels-rush.js` | THE AVALANCHE: fünf Abschnitte, Platzhalter, Level-Beschreibung (`LEVELS.avalanche`, Welt 2256 × 8700 E, eigene Kamera-Werte `cam`) |
| `src/scenarios/knockout/elements.js` | Kehrarm mit `park`: dreht nach dem Schließen der Fallen bis zur nächsten schrägen Lage (0,5 rad, unterer Arm gegen die Laufrichtung) und bleibt dort |
| `src/scenarios/knockout/levelsim.js` | Ein Level mit eigener Kamera fährt immer mit (die Einstellung „Abschnitte“ wirkt dort nicht); Sichern und Laden kennt den Zustand des Kehrarms |
| `src/scenarios/knockout.js` | Die Serie aus zwei Rennen gibt es für Rush erst ab R4 (THE AVALANCHE hat noch kein Ziel); bis dahin ein einzelnes Rennen |
| `test/knockout-level.test.mjs` | THE AVALANCHE: Aufbau, Ablauf bis zur fünften Schleuse, Stürze, geparkter Kehrarm mit Sichern, Laden und Zeichnen; Level-Bau auch für Rush |
| `test/knockout-level-browser.test.mjs` | Seek-Regel und Chromium gleich Node auch für THE AVALANCHE (Seed 2, sechs Zeitpunkte) |

### Die Abschnitte

- **Kamera:** Zoom fest 0,85, die ganze Breite (2256 E) ist immer im Bild, waagerecht steht die Kamera still und
  gleitet nur senkrecht mit.
- **1 · THE AVALANCHE** (Welt `night`, 28 → TOP 25): Käfig mit zwei Reihen zu je 14, Nagelwand mit 5 Reihen und vier
  Bumpern, Abweiser an den Wänden. Drei Trichter (Hälse innen 2,6 d); die äußeren fallen auf eine Spur im V (9°) zur
  Mitte, der mittlere direkt in den Mischkasten (Stifte 2-1, Boden 18°). Aus dem Kasten über zwei kurze Rampen (11°,
  hin und zurück) in die Schleuse.
- **2 · TRAPDOORS** (Welt `petrol`, Sturz zählt, → TOP 22): Fangbahn unter der Schleuse, dann zwei Falltür-Böden im
  Zickzack (je 8 Platten, 7°), unter jedem ein Gefängnis wie in TRAP TOWER. `TRAPS CLOSED` nach drei Stürzen.
- **3 · THE STAIRS** (Welt `sand`, → TOP 19): fünf Reihen kurzer, versetzter Stufen über die ganze Breite (Stufe 3 d,
  Lücke 1,4 d); wer durch eine Lücke fällt, landet eine Reihe tiefer. Darunter die Sammelbahn in die Schleuse.
- **4 · BIG DROP** (Welt `forest`, → TOP 16): Fallschacht 14 d breit und rund zwei Bildhöhen tief, Stifte alle 3 d,
  sechs Bumper, Abweiser. Boden 12° in die Schleuse neben dem Schacht.
- **5 · SWEEPERS** (Welt `slate`, Sturz zählt, → TOP 14): zwei Simse (7°, gegenläufig) mit drei Löchern und Deckeln.
  Oben ein Kehrarm mit dem Strom, das Loch, kurz vor dem Ende ein Kehrarm gegen den Strom, der Murmeln zurück ins Loch
  wirft; unten zwei Löcher und ein Kehrarm mit dem Strom. Nach zwei Stürzen schließen die Deckel, der Arm gegen den
  Strom parkt schräg.

### Abweichungen vom Plan (nach Messung)

| Plan | Jetzt | Grund (Messung) |
|---|---|---|
| Nagelwand 8 Reihen, Hälse 2,3 d, eine breite Fangbahn, Mischkasten, Rampe | 5 Reihen, Hälse 2,6 d, Spur im V zur Mitte, Kasten unter dem mittleren Trichter, zwei kurze Rampen (11°) | Mit dem Plan dauerte der Abschnitt im Median 20,6 s. Die Murmeln aus dem linken Trichter brauchten allein 6,5 s über die Spur; danach bremste der Kasten, weil alle 25 einzeln durch die Öffnung mussten. Jetzt im Median 14,4 s. |
| Wartezeit vor dem Start 3,2 s (wie THE GAUNTLET) | 1,5 s | So steht es im Plan („Start nach 1,5 s“). Die Dauer von Abschnitt 1 zählt ab Sekunde 0, die Wartezeit ist darin enthalten. |
| TRAPDOORS: 5°, Platten 2,6 d, Takt 0,6 s | 7°, Platten 2,4 d, Takt 0,8 s | Bei 2,6 d bliebe an der Wand kein Spalt für den Weg nach unten. |
| SWEEPERS: drei Kehrarme gegen den Strom | einer gegen den Strom (parkt), zwei mit dem Strom | Gegen den Strom ließen die Arme 16 Murmeln kaum durch: Vor dem unteren stand eine Schlange aus acht, und eine einzelne Murmel wurde im Takt des Arms immer wieder zurückgeworfen. Ergebnis war das Zeitlimit von 90 s in 7 bis 8 von 8 Läufen. Ein Arm gegen den Strom, der nach den zwei Stürzen parkt, löst das. Waagerecht geparkt blieben Murmeln oben auf dem Arm liegen, mit dem unteren Arm zur Wand klemmten sie dort; darum schräg und weg von der Wand. |
| Bahnen direkt unter den Schleusen | Fangbahnen und Simse 200 bis 230 E tiefer | Die offenen Klappen einer Schleuse hängen gut 100 E unter den Boden und hielten Murmeln auf der Bahn darunter fest (bis zu acht auf einmal). |
| Serie aus zwei Rennen auch mit Rush | erst ab R4 | THE AVALANCHE hat noch kein Ziel. |

### Messwerte (100 Läufe bis zur fünften Schleuse, nur Simulation, `scripts/knockout-action.mjs --level avalanche --seeds 1-100`)

Gezählt wird nur bis zum Platzhalter, also die Abschnitte 1 bis 5.

| Wert (Median) | THE GAUNTLET (Messung im Plan) | THE AVALANCHE bis Abschnitt 5 | Ziel des Plans |
|---|---|---|---|
| Im Spiel | 9,6 | 20,6 | mindestens 15 |
| In Bewegung im Bild | 5,4 | 11,9 | mindestens 8 |
| Ruhige Zeit | 29 s | 5,0 s | höchstens 12 s |
| Längster Abschnitt je Lauf | 28 s | 17,1 s | höchstens 15 s |
| Läufe mit Anstoß | 7 / 100 | 11 / 100 | höchstens 10 / 100 |
| Zeitlimit oder festgesessen | – | keine | keine |

| Abschnitt | Dauer (Median) | längster Lauf | in Bewegung im Bild | Stürze (Median) |
|---|---|---|---|---|
| 1 THE AVALANCHE | 14,4 s | 15,4 s | 16,2 | 0 |
| 2 TRAPDOORS | 14,4 s | 16,1 s | 13,7 | 4 |
| 3 THE STAIRS | 13,5 s | 15,3 s | 9,5 | 0 |
| 4 BIG DROP | 10,0 s | 11,7 s | 12,5 | 0 |
| 5 SWEEPERS | 17,1 s | 22,8 s | 8,9 | 2 |

Die ruhige Zeit ist für fünf Abschnitte gezählt; für das ganze Rennen kommt in R4 der Rest dazu.

### Nachweise (lokal in `output/knockout-lab/`, nicht im Repository)

- `av-r3-bilder.jpg`: sechs Bilder aus Seed 2 (Start, Trichter, Falltüren mit Gefängnis, Treppe, Fallschacht,
  Kehrarme).
- `av-r3-anfang-20s.mp4` und `av-r3-sweepers-20s.mp4`: Seed 2, Sekunde 0 bis 20 und 51 bis 71, 1920 × 1080, 30 fps,
  mit Ton.
- `av-r3-ganz-73s.mp4`: versehentlich ganz gerendert (72,8 s bis zum Platzhalter), weil die Einstellung
  `videoEnd=finish` die Dauer von 20 s überstimmt. Die beiden 20-s-Proben sind daraus geschnitten. Prüfung des
  Exports OK.
- `av-r3-100.txt`: die 100 Läufe der Messung.
- `av-r3-overview.jpg`, `av-r3-s1v2.jpg`, `av-s2-seed6.jpg`: Übersichten beim Bauen.

### Gelaufen

- `node --test test/knockout-level.test.mjs`: 23 grün. Neu sind Aufbau und Ablauf von THE AVALANCHE mit geparktem
  Kehrarm, Sichern, Laden und Zeichnen; dazu der Level-Bau für Rush in beiden Formaten und der Schalter-Test. Der
  Ablauf-Test von THE AVALANCHE erwartete zuerst genau 14 Murmeln am Ende; in Seed 2 stürzen beim Schließen zwei fast
  gleichzeitig, dann sind es 13. Die Erwartung ist jetzt 12 bis 14, der Test einzeln wiederholt.
- `node --test test/knockout-level-browser.test.mjs`: grün. Chromium rechnet wie Node, und die Seek-Regel hält auch
  für THE AVALANCHE (bis zum geparkten Kehrarm bei 58 s).
- `node --test test/knockout-elements.test.mjs`: 3 grün (Kehrarm umgebaut).
- `npm run golden`: identisch mit der Referenz.
- Nicht gelaufen: voller `npm test`, `knockout` und `knockout-physics`, Exporttest der Vorlagen.

### Grenzen

- **SWEEPERS dauert im Median 17,1 s** statt höchstens 15 s. Die Simse sind lang (gut 1100 und 1400 E bei 7°),
  und vor jedem geschlossenen Loch bildet die kleine Kante eine flache Mulde, in der eine langsame Murmel kurz liegen
  bleibt. Nicht mehr ausprobiert: flachere Kante, Simse mit 8° wie in TRAP TOWER, unterer Sims 200 E kürzer.
- **11 von 100 Läufen mit Anstoß** statt höchstens 10. In diesen Läufen gab es 11 Anstöße: neun in SWEEPERS
  (Murmeln, die vor einer Kante oder am Arm kurz liegen bleiben), zwei auf THE STAIRS. Kein Lauf braucht das
  Zeitlimit, keine Murmel sitzt fest.
- Nach dem Platzhalter endet das Video; Einstiegsflug, Titel, Abschnitte 6 bis 10, Ziel, Podest und die Serie aus zwei
  Rennen folgen in R4.
- Im Querformat wirkt die Kamera-Einstellung „Abschnitte“ für THE AVALANCHE nicht (feste Breite).
