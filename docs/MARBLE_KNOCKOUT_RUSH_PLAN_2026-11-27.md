# Marble Knockout Rush: zwei neue Level mit mehr Murmeln und weniger Pausen (Plan)

Stand: 27.11.2026, Basis `main` an `33f6f16`. Verfasst als Umsetzungsauftrag für Claude Code oder Codex. Roadmap:
**R44**. Bericht: wird mit Paket R1 als `docs/MARBLE_KNOCKOUT_RUSH_<Datum>.md` angelegt und fortgeschrieben.
Vorgänger: [Gesamtlevel-Plan](MARBLE_KNOCKOUT_GESAMTLEVEL_PLAN_2026-11-25.md) und
[Bericht R43](MARBLE_KNOCKOUT_2026-11-25.md).

**Wunsch des Nutzers vom 27.11.:** „wie wir da effizient und mit möglichst geringem Aufwand eine andere Variation
reinbringen können, also quasi ein anderes Level, mit mehr Ereignissen, mehr Action, mehr Murmeln, weniger
langsame Phasen/Pausen […] ohne die aktuelle Version zu ändern“. Nach dem Vorschlag: „Ja, Plan schreiben“.

Wo Zahlen stehen, sind es Startwerte. Abweichen ist erlaubt, wenn eine Probe oder Messung es klar besser zeigt. Die
Richtung bleibt fest.

---

## Kurzfassung

- **Zwei neue Level nach dem Vorbild des Turms**, gebaut nur aus dem vorhandenen Baukasten:
  - Short **„TRAP TOWER“** (9:16): 24 Murmeln, 24 → 14 → 7 → Sieger, rund 37 s.
  - Langvideo **„THE AVALANCHE“** (16:9): 28 Murmeln, zehn Abschnitte, Finale zu sechst, rund 2½ min je Rennen,
    als zwei Rennen mit Gesamtwertung rund 5 min.
- **Das Feld bleibt groß:** im Schnitt rund 15 statt 9,6 Murmeln im Spiel, Finale zu sechst bzw. siebt statt zu dritt
  bzw. viert.
- **Die Pausen fliegen raus:** erste rollende Murmel nach rund 5 s statt 10 s, Freigabe 0,6 s statt 1,2 s, Starttor
  im Finale höchstens 4 s statt 10 s, kein Abschnitt länger als 15 s im Median.
- **Mehr Ereignisse:** drei Gefahren-Abschnitte im Langvideo, einer im Short, mit Falltüren, Kehrarmen und Löchern.
- **Nur breite Strecken.** Die Messung zeigt: Der Turm verträgt mehr Murmeln, THE GAUNTLET verstopft.
- **Bestehendes bleibt bitgleich.** Neue Einstellung „Level“ (`standard` / `rush`), ohne Angabe wie bisher. THE TOWER,
  THE GAUNTLET, beide Vorlagen, Referenz-Hashes und Knockout-Tests bleiben unverändert.
- **Ein Stopp:** nach R1 mit Farbtafel und 20-s-Probe des ersten Trap-Tower-Abschnitts. Danach wird mit den
  Empfehlungen durchgebaut; Geschmacksfragen kommen gesammelt am Ende.

---

## 0 · Leitplanken (nicht verhandelbar)

**Technik**

- Alles bleibt im Szenario `knockout`, Ablauf `mode: 'level'`. Neue Level kommen in eine eigene Datei
  `src/scenarios/knockout/levels-rush.js` und melden sich in `EBS.KnockoutLevels.LEVELS` an.
- **Ohne `level` oder mit `level: 'standard'` rechnet und zeichnet alles bitgleich wie heute.** Jeder neue Schalter an
  einem Baustein hat einen Standardwert, der genau das alte Verhalten ergibt. `npm run golden` bleibt unverändert.
- Nur Seed-Zufall (`EBS.RNG`), kein `Math.random`, kein `Date.now`. Die Kamera bleibt Simulationszustand,
  Seek-Regel wie bisher.
- Obergrenzen im Gesamtlevel: 28 Murmeln, 6000 feste Kapseln, 160 bewegte Teile.
- Kein Export über 20 s ohne ausdrücklichen Auftrag. Reine Simulationsläufe sind erlaubt.

**Inhalt**

- Aus den bisherigen Plänen gilt weiter: lesbar vor prächtig, ruhig statt brutal (keine Explosionen, kein Wackeln),
  faire Physik ohne Boosts, alle Texte im Video englisch, Ton weich und leise, keine nachgebauten Serien.
- Querformat mit Kamerafahrt (Wahl des Nutzers vom 25.11.). Shorts ohne Rahmen, Texte in der Bildmitte.
- **Nicht verwenden**, weil gemessen langsam oder verstopfend: Kippbretter, Förderband als Hauptweg, Hammergasse mit
  einer Spur, Ringausbruch mit mehr als fünf Murmeln, Kolben-Becher (eine Murmel nach der anderen), Fähre. Das
  Riesenrad bleibt das Erkennungszeichen von THE GAUNTLET und kommt nicht vor.

---

## 1 · Ausgangslage: Messung vom 27.11.

Nur Simulation in Node, je 8 Läufe (Seeds 1 bis 8), Varianten nur im Speicher; das Repository war unverändert.

- **Im Spiel:** Murmeln, die noch nicht ausgeschieden sind (Durchschnitt über das Rennen bis zum Sieg).
- **In Bewegung im Bild:** davon im Bildausschnitt der Kamera und schneller als 120 E/s (nicht im Becken).
- **Ruhige Zeit:** Summe der halben Sekunden im Rennen, in denen sich weniger als zwei Murmeln im Bild bewegen.

| Lauf | Murmeln | Im Spiel | In Bewegung im Bild | Ruhige Zeit | Läufe mit Anstoß |
|---|---|---|---|---|---|
| THE TOWER, wie heute | 16 | 9,0 | 6,6 | 2,5 s | 0 / 8 |
| Turm, Quote 11 / 6 / 1 | 16 | 10,9 | 7,5 | 2,0 s | 0 / 8 |
| **Turm mit 24 Murmeln, Quote 14 / 7 / 1, Startkäfig in zwei Reihen** | 24 | **14,6** | **10,1** | **1,5 s** | 2 / 8 |
| Turm mit 28 Murmeln | 28 | 16,7 | 10,4 | 3,5 s | 8 / 8, festgefahren |
| THE GAUNTLET, wie heute | 20 | 9,6 | 5,4 | 29 s | 0 / 8 |
| Gauntlet, flache Quote (Finale zu sechst), kurze Pausen | 20 | 11,8 | 6,5 | 24,5 s | 5 / 8 |
| Gauntlet mit 24 Murmeln | 24 | 11,7 | 6,5 | 24 s | 8 / 8 |
| Gauntlet mit 28 Murmeln | 28 | 14,9 | 5,5 | 66 s | 8 / 8, 8 bis 10 festgefahren |

Die Länge des Turms blieb mit 24 Murmeln gleich (Median 39 s statt 37,8 s).

**Woher die Pausen kommen** (THE GAUNTLET, Rennen 1 der Vorlage, Seed 2 mit Drehbuch):

- **Das Feld schrumpft zu schnell.** In Bewegung im Bild: Abschnitt 1 elf Murmeln, Abschnitt 9 nur 2,6, Finale 1,5.
  Ab Abschnitt 5 (rund 1:10) sind höchstens zehn übrig.
- **Das Finale zu dritt dauert rund 30 s**, davon mehrere Sekunden Warten am Starttor.
- **Die langsamsten Abschnitte liegen hinten:** TILT rund 28 s, SPLIT & DRUM rund 22 s (Median der 100 Läufe aus G5:
  27,6 s und 23,6 s).
- **10 s am Anfang ohne rollende Murmel:** Einstiegsflug 7 s und Startkarte 3,2 s.
- **Die Bausteine sind nicht schuld:** In jedem Abschnitt bewegt sich gut die Hälfte des Feldes (49 bis 62 %).

**Folgerungen**

1. Breite Strecken (Nagelfeld über die ganze Breite, wandernde Böden) vertragen mehr Murmeln, schmale Stellen
   (Drehkreuze in einer Spur, Hammergasse, Weiche, Ringe) nicht.
2. 24 Murmeln sind im Hochformat die richtige Zahl: Mit 28 bewegen sich kaum mehr im Bild, aber es klemmt.
3. Mehr Murmeln auf THE GAUNTLET bringt nichts. Die Abschnitte umzusortieren hilft auch nicht: Sie stehen in festen
   Weltkoordinaten, ein Umbau kostet so viel wie neu bauen.
4. Darum: neue Level nach dem Turm-Prinzip, auch im Querformat.

---

## 2 · Rush-Regeln (gelten für beide neuen Level)

Stehen in der Level-Beschreibung (`rules`, `quota`, `field`); die alten Level behalten ihre Werte.

| Regel | THE TOWER / THE GAUNTLET heute | TRAP TOWER / THE AVALANCHE |
|---|---|---|
| Murmeln | 16 / 20 | **24 / 28** |
| Quote | 8, 4, 1 / 17, 14, 12, 10, 8, 7, 6, 5, 3, 1 | **14, 7, 1 / 25, 22, 19, 16, 14, 12, 10, 8, 6, 1** |
| Im Finale | 4 / 3 | **7 / 6** |
| Einstieg (Langvideo) | Flug 7 s, dann Startkarte 3,2 s | **Flug 4 s mit beiden Karten, Start nach 1,5 s** |
| Freigabe nach dem Schließen | 0,5 s / 1,2 s | 0,5 s / **0,6 s** |
| Nachzügler verschwinden nach | 5 s / 6 s | **4 s** |
| Starttor im Finale (Langvideo) | höchstens 10 s, Pause 1,2 s | **höchstens 4 s, Pause 0,6 s** |
| Abschnittsdauer | 8 bis 28 s | **Median höchstens 13 s (Short) bzw. 15 s, längster Lauf 18 s** |
| Gefahren (Sturz zählt) | 1 / 2 Abschnitte | **1 / 3 Abschnitte** |
| Engstellen | teils eine Spur | **innen mindestens 2,2 d breit oder zwei Wege nebeneinander; eine Spur höchstens 1,5 s am Stück** |

Weiter gilt aus dem Gesamtlevel-Plan, Abschnitt 1.2: vor jeder Schleuse ein Mischer, Schnittlinie mit rotem Ring,
Krone für die Führende, offene Zielgerade für knappe Einläufe, kurze Einblendungen höchstens alle 4 s.

**Aktionswerte als Abnahme** (gemessen mit dem neuen Skript `scripts/knockout-action.mjs`, Abschnitt 6):

| Wert | THE TOWER heute | TRAP TOWER Ziel | THE GAUNTLET heute | THE AVALANCHE Ziel |
|---|---|---|---|---|
| Im Spiel (Durchschnitt) | 9,0 | mindestens 13 | 9,6 | mindestens 15 |
| In Bewegung im Bild | 6,6 | mindestens 9 | 5,4 | mindestens 8 |
| Ruhige Zeit je Rennen | 2,5 s | höchstens 2 s | 29 s | höchstens 12 s |
| Längster Abschnitt (Median) | 12,1 s | höchstens 13 s | 28 s | höchstens 15 s |
| Freie Läufe mit Anstoß (je 100 Läufe) | rund 1 | höchstens 10 | 7 | höchstens 10 |

---

## 3 · Short „TRAP TOWER“ (9:16)

**Maße wie THE TOWER:** Bildbreite 1080 E, Wände bei 20 und 1060, Murmelradius 28 E (d = 56), Turm rund 5600 E hoch.
Kamera wie im Turm (nur senkrecht, Zoom 0,85 bis 1,0). Erstes Bild: 24 Murmeln im Käfig, groß `PICK YOUR COLOR!`.

```
 ┌──────────── 1080 ────────────┐
 │ START: 24 Murmeln, 2 Reihen  │   PICK YOUR COLOR!
 │ 1 TRAPDOORS                  │
 │   kurzes Nagelfeld           │
 │   Falltür-Boden, Sturz = raus│
 │ ════ SCHLEUSE  TOP 14 ════   │
 │ 2 SWEEPERS                   │
 │   zwei Simse mit Kehrarmen   │
 │   Abkürzungen nach unten     │
 │ ════ SCHLEUSE  TOP 7 ════    │
 │ 3 FINAL                      │
 │   Drehbühne, Steilabfahrt    │
 │   offene Zielgerade          │
 │ ZIEL                         │
 └──────────────────────────────┘
```

| Nr. | Titel | Inhalt (Startwerte) | Quote | Moment fürs Casting | Welt |
|---|---|---|---|---|---|
| 1 | `TRAPDOORS` (Sturz zählt) | Startregal mit zwei Reihen zu je 12 (neuer Schalter `rows: 2`, Käfigwände um 2 d höher). Nagelfeld mit 6 statt 11 Reihen und zwei Bumpern, Abweiser an den Wänden. Darunter ein **Falltür-Boden** über die ganze Breite: 7 Platten zu 2,6 d, 5° Gefälle, `interval` 0,7 s, `blink` 0,5 s, `open` 0,8 s. Darunter der Abgrund (weich gezeichnet wie unter der Brücke). Am Ende des Bodens Rampe 10° in die Schleuse. Sind zehn gestürzt: `TRAPS CLOSED`. | 24 → 14 | Mindestens ein Sturz; eine Favoritin fällt kurz vor dem Ende des Bodens | `petrol` |
| 2 | `SWEEPERS` | Zwei Simse übereinander über die ganze Breite, gegenläufig mit 8° Gefälle. Jeder Sims hat zwei Lücken (Abkürzung auf den Sims darunter, kein Abgrund) und einen **Kehrarm** (zwei Arme zu 3,6 d, 0,25 U/s, gegenläufig). Vor der Schleuse ein Mischkasten aus fünf Stiften. | 14 → 7 | Platz 7 und 8 kommen fast gleichzeitig; der Kehrarm wirft eine Führende zurück | `plum` |
| 3 | `FINAL` | Trichter über die ganze Breite (20°) in einen Kanal (innen 2,2 Murmeln breit) von vorn in die **Drehbühne** (R 7 d, Ringe 0,66 und 0,36, drei Ausgänge, 0,12 U/s), Seitenwände an der Bühne. Darunter Fangbahn, Steilabfahrt mit zwei Mulden und die offene Zielgerade (5°) wie im Turm. | 7 → 1 | Führungswechsel und Fotofinish unter 0,3 s | `gold` |

- **Ersatz**, falls die Drehbühne die Spitze länger als 3 s festhält oder eine Schlange entsteht: Nagelfeld mit fünf
  Reihen über einem Trichter (wie im Finale von THE GAUNTLET).
- **Zeitplan:** 0 s Käfig, nach 0,4 s auf; Schleuse 1 nach rund 12 s, Schleuse 2 nach rund 24 s, Sieg nach rund
  35 s, Ende 2,6 s danach.
- **Anzeige** wie im Turm: `24 → TOP 14`, `14 → TOP 7`, `FINAL` mit `7 MARBLES. ONE WINNER.`, Namen beim Aus, Sieger.
- **Casting** (`scripts/knockout-casting.mjs --level trap`), vollständig ist ein Seed, wenn:
  - das Video höchstens 40 s dauert;
  - auf dem Falltür-Boden mindestens eine Murmel stürzt;
  - die Führung im Finale wechselt;
  - das Finale knapp ist (unter 0,3 s oder Zeitlupe);
  - niemand einen Anstoß braucht;
  - die Aktionswerte aus Abschnitt 2 erreicht sind.

---

## 4 · Langvideo „THE AVALANCHE“ (16:9)

**Turm-Prinzip quer:** Die Welt ist rund 2260 E breit, so breit wie das Bild bei Zoom 0,85. Die Abschnitte liegen
übereinander, jeder etwa eine Bildhöhe (rund 1270 E), BIG DROP zwei. Gesamthöhe rund 14 000 E. Murmelradius 24 E
(d = 48) wie in THE GAUNTLET, 28 Murmeln.

- **Kamera:** feste Breite (Zoom 0,85, waagerecht fest), senkrecht mit Vorschau nach unten und dem bisherigen Wechsel
  zur Schnittlinie in der zweiten Hälfte. So ist fast immer ein ganzer Abschnitt im Bild, jedes Aus auch, und die
  Kamera gleitet nur nach unten. Das kommt der festen Übersicht nahe, die der Nutzer im Querformat bevorzugt.
  Technisch: eigene Kamera-Werte je Level (`spec.cam`), ohne Angabe gelten die bisherigen Werte.

```
 ┌────────────────────── 2260 ──────────────────────┐
 │ START: 28 Murmeln, 2 Reihen                      │
 │ 1  THE AVALANCHE  Nagelwand, drei Trichter       │  TOP 25
 │ 2  TRAPDOORS      zwei Falltür-Böden (Sturz)     │  TOP 22
 │ 3  THE STAIRS     breite Treppe                  │  TOP 19
 │ 4  BIG DROP       Fallschacht, 2 Bildhöhen       │  TOP 16
 │ 5  SWEEPERS       Sims mit Löchern (Sturz)       │  TOP 14
 │ 6  PINBALL        Bumperfeld                     │  TOP 12
 │ 7  FLOORS         vier Böden, Loch (Sturz)       │  TOP 10
 │ 8  ROTATING MAZE  Drehbühne                      │  TOP 8
 │ 9  SPLIT          Weiche, zwei Spiegelwege       │  TOP 6
 │ 10 GRAND FINAL    Starttor, Nagelfeld, Zielgerade│  Podest
 └──────────────────────────────────────────────────┘
```

| Nr. | Titel | Inhalt (Startwerte) | Quote | Moment fürs Casting | Welt |
|---|---|---|---|---|---|
| 1 | `THE AVALANCHE` | Regal mit zwei Reihen zu je 14 über fast die ganze Breite. Nagelwand mit 8 Reihen (Abstand 72 × 54 wie in THE GAUNTLET) und vier Bumpern, Abweiser an den Wänden. **Drei** Trichter (Hälse innen 2,3 d) auf eine breite Fangbahn, Mischkasten, Rampe in die Schleuse. | 28 → 25 | Gedränge an drei Hälsen | `night` |
| 2 | `TRAPDOORS` (Sturz zählt) | Zwei Falltür-Böden übereinander, gegenläufig, je 8 Platten zu 2,6 d, 5° Gefälle, `interval` 0,6 s, `blink` 0,5 s. Darunter der Abgrund. `TRAPS CLOSED` nach drei Stürzen. | → 22 | Sturz auf dem unteren Boden kurz vor dem Ende | `petrol` |
| 3 | `THE STAIRS` | **Breite Treppe** (Baustein G7 aus dem Gesamtlevel-Plan, nie gebaut, nur Bahnstücke): fünf Reihen kurzer, versetzter Stufen über die ganze Breite, Stufe 3 d breit und 1 d tief, Lücke 1,4 d. Viele Murmeln springen gleichzeitig. | → 19 | `+N PLACES!` | `sand` |
| 4 | `BIG DROP` | Fallschacht wie in THE GAUNTLET, aber 14 d statt 9,6 d breit, zwei Bildhöhen tief, Stifte alle 3 d, sechs Bumper, Abweiser. Kamera fährt mit (`ride`). | → 16 | Freier Fall, Schnittkampf am Boden | `forest` |
| 5 | `SWEEPERS` (Sturz zählt) | Zwei Simse übereinander (7°, gegenläufig), drei Löcher mit Deckel über dem Abgrund, drei **Kehrarme** (Arme 3,6 d, gegenläufig). Deckel schließen nach zwei Stürzen. | → 14 | Ein Favorit wird ins Loch gekehrt (Drehbuch) | `slate` |
| 6 | `PINBALL` | Bumperfeld zwischen schrägen Wänden über die ganze Breite: 12 Bumper in versetzten Reihen, darunter Trichter mit zwei Hälsen. | → 12 | Viele Platzwechsel | `dusk` |
| 7 | `SHIFTING FLOORS` (Sturz zählt) | Vier wandernde Böden über die ganze Breite (`travel` 3 d, Perioden 1,8 bis 2,8 s, zwei mit Loch), darunter ein Sims mit Loch und flacher Kante wie im Turm. | → 10 | Sturz über zwei Böden | `ice` |
| 8 | `ROTATING MAZE` | Trichter (20°) in einen Kanal (innen 2,2 Murmeln breit) von vorn in die **Drehbühne** (R 8 d, drei Ausgänge, 0,12 U/s), Seitenwände. | → 8 | Ausbruch im letzten Moment | `violet` |
| 9 | `SPLIT` | Flip-Flop schickt abwechselnd auf zwei gleich lange Spiegelwege mit je einem Ampeltor (Takt gegenläufig); beide treffen sich vor der Schleuse. | → 6 | Welcher Weg ist schneller? | `plum` |
| 10 | `GRAND FINAL` | Kurze Abfahrt mit einem Kehrarm, Starttor (höchstens 4 s, Pause 0,6 s, `FINAL SPRINT`), Nagelfeld mit fünf Reihen über einem Trichter (Hals 2,2 d), offene Zielgerade 5°, Schiene. | 6 → Platz 1 bis 3 | Fotofinish unter 0,15 s | `gold` |

- **Ersatz:** für die Drehbühne ein Nagelfeld über einem Doppeltrichter; für die Treppe eine zweite Nagelwand.
- **Ablauf:** Flug 4 s mit `28 MARBLES. ONE COURSE.` und danach `THE AVALANCHE` / `10 STAGES. ONE CHAMPION.`
  (neue Regel `titleInIntro`), Start nach 1,5 s, Abschnitte rund 10 bis 14 s, Finale rund 25 s, Podest 8 s.
  Zusammen rund 2:20 bis 2:40 min.
- **Zwei Rennen** mit Gesamtwertung wie in G9 funktionieren unverändert; Titel und Zahl der Abschnitte kommen aus der
  Level-Beschreibung statt fest `THE GAUNTLET` / `10 STAGES`. Zusammen rund 5 min.
- **Anzeige** wie in THE GAUNTLET: `STAGE n/10`, Titel, `n LEFT · TOP k`, Streckenleiste. Die Röhre `OUT` zeigt bis zu
  16 Murmeln mit Namen; bei mehr als 20 Murmeln steht darüber `+N` (nur dann, die alten Level zeichnen gleich).
- **Drehbuch** wie in G6: Außenseiterin entkommt dreimal knapp und kämpft im Fotofinish um den Sieg, ein früher
  Spitzenreiter stürzt in `SWEEPERS` oder `SHIFTING FLOORS`, Fotofinish unter 0,15 s, in jedem Abschnitt kein Anstoß.
  Die Gefahren-Abschnitte für den Sturz kommen aus der Level-Beschreibung (`story`), nicht mehr fest aus dem Code.

---

## 5 · Bausteine: vorhanden, nur neu zusammengesetzt

| Baustein | Stand | Kommt vor in | Ersatz |
|---|---|---|---|
| C6 Falltüren | fertig und gezeichnet (Galerie: 12 bis 13 Runden je Murmel, längste 9 s), im Gesamtlevel nie benutzt | TRAP TOWER 1, AVALANCHE 2 | – |
| B5 Kehrarm | fertig (16 bis 17 Runden, längste 6 s), im Gesamtlevel nie benutzt | TRAP TOWER 2, AVALANCHE 5 und 10 | – |
| D4 Drehbühne | fertig, im alten Short C mit drei Murmeln (4 bis 6 Runden, längste 13 s) | TRAP TOWER 3, AVALANCHE 8 | Nagelfeld über Trichter |
| G7 Breite Treppe | im Gesamtlevel-Plan beschrieben, nie gebaut; nur Bahnstücke | AVALANCHE 3 | zweite Nagelwand |
| A6 Bumper, A3 Nagelfeld, D3 Böden, B6 Flip-Flop, C1 Tor, G1 Schleuse, G2 Fallschacht, Starttor, Zielgerade | bewährt in THE TOWER und THE GAUNTLET | beide Level | – |

**Neue Schalter** (Standardwert = altes Verhalten):

| Ort | Schalter | Zweck |
|---|---|---|
| `elements.js`, `dropShelf` | `rows` (1) | Startkäfig mit zwei Reihen |
| `levelsim.js` | `params.level` (`standard`) | wählt `rush`: Hochformat `trap`, Querformat `avalanche` |
| Level-Beschreibung | `cam` (keine) | eigene Kamera-Werte (feste Breite in THE AVALANCHE) |
| Level-Beschreibung | `rules.titleInIntro` (aus) | beide Karten im Flug, kurzer Start |
| Level-Beschreibung | `story` (keine) | Gefahren-Abschnitte und Rückschau fürs Drehbuch-Casting |
| `art.js`, `outTube` | – | `+N` über der Röhre nur bei mehr als 20 Murmeln |

**Maßregeln aus den bisherigen Proben** (Bericht R43) gelten weiter und sparen die meisten Probeschleifen: zwischen
Stift und Wand gut 1,4 d, zwischen Reihenende und Kehrwand 1,7 d, unter einem Trichterhals rund 2 d Luft, Kanäle
innen breiter als zwei Murmeln (sonst Keile), Drehkreuze unter Beregnung mit Dach, Zulauf in eine Kette mindestens 6°,
kein Hammer gleich am Anfang einer Bahn, schnelle Ausgänge mit Seitenwänden, unter einer Schleuse eine feste
Fangbahn, Bahnenden mindestens 90 E vor der Wand.

---

## 6 · Technik

| Datei | Inhalt |
|---|---|
| `src/scenarios/knockout/levels-rush.js` (neu) | TRAP TOWER und THE AVALANCHE Abschnitt für Abschnitt, acht neue Farben, Anmeldung in `LEVELS` (`trap`, `avalanche`) |
| `index.html`, `scripts/knockout-lab.mjs` | neue Datei nach `levels.js` laden |
| `levelsim.js` | Level-Wahl über `params.level`, `spec.cam`, `titleInIntro` |
| `elements.js` | `dropShelf({ rows })` |
| `renderer.js`, `art.js` | Karten im Flug, `+N` an der Röhre |
| `series.js` | Titel, Zahl der Abschnitte und Feldgröße aus der Level-Beschreibung |
| `knockout.js` | Einstellung „Level (Gesamtlevel)“: „Standard (The Tower / The Gauntlet)“ und „Rush (Trap Tower / The Avalanche)“; Casting-Listen `TRAP_CAST`, `AVALANCHE_CAST`; Vorlagen-Knöpfe |
| `scripts/knockout-casting.mjs` | `--level trap`, `--level avalanche`, `--story --level avalanche` |
| `scripts/knockout-action.mjs` (neu) | Aktionswerte je Lauf und je Abschnitt (Abschnitt 1 und 2); gibt für die alten Level die Zahlen aus Abschnitt 1 wieder |
| `presets/production/knockout-short-rush.json`, `knockout-long-rush.json` (neu) | Short 1080p30, Langvideo 1440p60 wie die bisherigen Vorlagen |

**Neue Farben** (Startwerte, die Farbtafel entscheidet): OLIVE `#7a8a24`, INDIGO `#4338b0` (Band), PEACH `#f7b98b`,
RUST `#b5531c` (Band), MAGENTA `#c2188f`, SAND `#d8c59a`, FOREST `#2d5a2f` (Band), ROSE `#e8889f` (Band). Das Short
nimmt die 16 bisherigen und OLIVE, INDIGO, PEACH, RUST, MAGENTA, SAND, TEAL, SKY; das Langvideo alle 28.

**Kosten:** Mit rund 15 statt 10 Murmeln im Bild dauert ein Bild länger (die Murmeln mit weichem Schatten sind der
teuerste Teil). Ganze Exporte mit Grafikkarte; der CI-Exporttest der neuen Vorlagen rendert 1 s wie beim Langvideo.

---

## 7 · Stil (Ergänzung zur Stilbibel)

- Stil A „Holz & Abendlicht“ bleibt: Gerüst, Tiefe, OUT-Kiste, Schacht mit Rahmen, Lampen, Streckenleiste wie bisher.
- **Falltüren:** Holzplatten mit Metallscharnier, rotes Lämpchen blinkt vor dem Öffnen (vorhanden). Darunter weicher
  Abgrund, kein schwarzer Block.
- **Kehrarm:** Metallarm mit Holznabe (vorhanden), ruhig drehend, kein Wackeln.
- **Drehbühne:** wie im alten Short C, Ringe aus Holz.
- **Breite Treppe:** Stufen aus hellem Holz mit dunkler Kante, damit man die Sprünge liest.
- **Hintergrund je Abschnitt** nach der Spalte „Welt“ in Abschnitt 3 und 4; im Finale goldener Schimmer.
- **Murmeln:** Bänder für INDIGO, RUST, FOREST und ROSE zusätzlich zu den bisherigen fünf.
- So nicht: mehr Effekte statt mehr Murmeln, Schütteln bei Stürzen, Kamera, die einzelnen Hüpfern folgt.

---

## 8 · Pakete

Ein Paket ist ein Commit. Nach jedem Paket werden ROADMAP, CHANGELOG, Gesamtplan Abschnitt 0 und der Bericht
nachgezogen.

| Paket | Inhalt | Abnahme |
|---|---|---|
| **R1** | Grundlage: Level-Wahl, Rush-Regeln, `rows`, `spec.cam`, `+N` an der Röhre, acht Farben, Aktionswerte-Skript; TRAP TOWER Abschnitt 1 mit echter Physik | **Stopp:** Farbtafel aller 28 Murmeln in Videogröße (beide Formate), 20-s-Probe 9:16 vom Start bis zur ersten Schleuse, Aktionswerte gegen THE TOWER. Der Nutzer sagt, ob Feldgröße, Farben und Falltüren passen. Alte Level bitgleich (Tests, Referenz-Hashes). |
| R2 | TRAP TOWER komplett, Casting, Vorlage „Short · Trap Tower“ | Aktionswerte erreicht, mindestens 8 vollständige Seeds aus 200, 20-s-Proben Anfang und Finale |
| R3 | THE AVALANCHE Abschnitte 1 bis 5, Kamera mit fester Breite | 100 Läufe bis zur fünften Schleuse ohne Hänger, Aktionswerte bis dorthin |
| R4 | Abschnitte 6 bis 10, Flug mit beiden Karten, Podest, zwei Rennen, Drehbuch-Casting, Vorlage „Langvideo · The Avalanche“ | 100 ganze Läufe ohne Hänger, Aktionswerte erreicht, drei 20-s-Proben (Einstieg, eine Schleuse, Finale) |
| R5 | Bericht, gesammelte Geschmacksfragen, README | – |

**Stopps:** nur nach R1 (Optik zuerst als echte Vorschau). Danach mit den Empfehlungen durchbauen. Der ganze Export
kommt nur auf Auftrag.

**Vorlagen:** Die bisherigen Vorlagen „Short“ und „Langvideo“ bleiben unverändert auf THE TOWER und THE GAUNTLET. Die
Rush-Level bekommen eigene Knöpfe.

---

## 9 · Prüfung

Nur gezielt, kein voller `npm test`.

- `test/knockout-level.test.mjs`, neue Tests für `trap` und `avalanche`:
  - Anschlüsse passen, alles innerhalb der Welt, Quote und `TRAPS CLOSED`.
  - Invarianten im ganzen Lauf, Ende mit Sieger bzw. Podest.
  - Kamera nie außerhalb der Welt, jedes Aus im Bild.
  - Sichern und Laden ergibt denselben Hash wie am Stück.
  - Neue Vorlagen gleichen der Oberfläche.
- `test/knockout-level-browser.test.mjs`: Seek-Prüfung mit Kamera für beide neuen Level, Node = Chromium.
- Bestehende Tests `knockout-level` und `knockout` unverändert grün. `npm run golden` einmal am Ende, unverändert.
- Exporte nur als 20-s-Proben.

---

## 10 · Risiken

| Risiko | Gegenmittel |
|---|---|
| Drehbühne mit 7 bis 10 Murmeln unerprobt | Ersatz Nagelfeld über Trichter (Abschnitt 3 und 4) |
| Falltüren entscheiden zu viel durch Glück | gewollt als Gefahr; das Casting wählt Läufe mit Geschichte; `interval` und Plattenzahl anpassen |
| 28 Farben sind schwer zu unterscheiden | Bänder, Farbtafel beim Stopp; notfalls 24 Murmeln auch im Langvideo |
| Murmeln wirken bei Zoom 0,85 klein | 20-s-Probe in R3; notfalls Welt 2100 E breit und Zoom 0,9 |
| Export dauert länger | Grafikkarte; CI-Exporttest mit 1 s |
| Langvideo kürzer als THE GAUNTLET | zwei Rennen (rund 5 min); länger mit zwei weiteren Abschnitten |

---

## 11 · Gesammelte Geschmacksfragen (werden am Ende gestellt)

1. Level-Namen im Video: `TRAP TOWER` und `THE AVALANCHE`, andere Namen?
2. Feldgröße: 24 und 28 Murmeln passend, oder im Langvideo auch 24?
3. Länge des Langvideos: ein Rennen rund 2½ min, zwei Rennen rund 5 min, oder zwei Abschnitte mehr?
4. Anteil der Gefahren: ein Abschnitt im Short, drei im Langvideo, mehr oder weniger?
5. Röhre `OUT` mit `+N` über 16 Namen: so lassen?
6. Karten im Flug statt danach: auch für THE GAUNTLET übernehmen? (Das wäre eine eigene Regelversion, weil sich das
   Rennen dann verschiebt.)
