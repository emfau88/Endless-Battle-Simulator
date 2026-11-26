# Marble Knockout: Plan für ein Murmel-Ausscheidungsrennen

Stand: 25.11.2026, Basis `main` an `8f9d2b3`. Verfasst als Umsetzungsauftrag (für Claude Code oder Codex).
Roadmap-Nummer: **R43**. Szenario-Kennung: `knockout`, Anzeigename „Marble Knockout (in Arbeit)“, bis der Nutzer
es abnimmt. Der Name im Video ist ein Arbeitstitel (Frage 1 in Abschnitt 11).

**Wunsch des Nutzers vom 25.11.:** ein Murmel-Ausscheidungsrennen als neues Szenario, „richtig cool“, aber nicht
verkünstelt. Die Stärke sollen die Mechaniken und Bahnen sein, die das Rennen antreiben: Drehtüren, Level, die
sich verändern oder verschieben, und viel Abwechslung.

Wo Zahlen stehen, sind es Startwerte. Abweichen ist erlaubt, wenn eine Probe oder Messung es klar besser zeigt.
Die Richtung bleibt fest.

---

## Kurzfassung

- **Die Regel passt in einen Satz:** „12 marbles. 10 stages. The last one is out.“ Auf jeder Bahn scheidet genau
  eine Murmel aus. Am Ende fahren drei Murmeln das Finale um Gold, Silber und Bronze.
- **Jede Bahn hat ihr eigenes Hauptelement:** Drehkreuze, ein Schaufelrad, eine Brücke, die hinter dem Feld
  einstürzt, ein Kippbrett, eine Drehtrommel, Pendelhämmer, wandernde Böden und Ringe, aus denen man ausbrechen
  muss. Vier der zehn Bahnen verändern sich während des Laufs.
- **Einfacher Look:** Holzbahn vor ruhigem, dunklem Hintergrund und glänzende, kräftig farbige Murmeln. Jede Bahn
  bekommt ihre eigene Hintergrundfarbe. Drei Stile zeige ich vorher als echte Vorschau-Bilder.
- **Spannung ohne Schummeln:** Die Physik ist echt. Wie bei Scrap sucht ein Casting die Startwerte aus, bei denen
  es knapp wird. Das Finale soll per Fotofinish entschieden werden.
- **Zwei Formate:**
  - Langvideo in 16:9, rund 9 Minuten, mit Kapiteln je Bahn.
  - Shorts in 9:16, rund 30 Sekunden: acht Murmeln, drei Bahnen, „Pick your color!“ oder „Follow the gold one!“.
- **Reihenfolge:**
  1. Vorschau-Bilder, dann wählst du den Stil.
  2. Danach baue ich alles durch.
  3. Am Ende gibt es Proben von 20 Sekunden und die gesammelten Geschmacksfragen.

---

## 0 · Leitplanken (nicht verhandelbar)

**Technik**

- Neuer Ordner `src/scenarios/knockout/`, Anmeldung in `src/scenarios/knockout.js`. Kein bestehendes Szenario wird
  angefasst. `npm run golden` bleibt unverändert.
- Nur Seed-Zufall (`EBS.RNG`), kein `Math.random`, kein `Date.now`, kein `performance.now`.
- **Seek-Regel:** Alles Bewegte ist Simulationszustand oder eine reine Funktion der Bahnzeit. Blinken, Pulsieren und
  Glanz rechnet der Renderer aus `t`. Spuren hinter den Murmeln nur aus einem Positionspuffer der Simulation.
- Der Renderer liest die Simulation nur. Ton entsteht aus dem Ereignisprotokoll.
- Zeichnen über den Canvas-Adapter `src/canvas-scene.js` (wie Scrap und Cloud Wars). Statische Bahnteile werden je
  Bahn einmal in eine Textur gezeichnet.
- Feste Obergrenzen: 12 Murmeln, je Bahn höchstens 400 Kollisionsteile und 24 bewegte Elemente, Ereignispuffer 512.

**Inhalt**

- **Lesbar vor prächtig.** Ein Hauptelement je Bahn, höchstens zwei Nebenelemente. Die Murmeln sind die hellsten
  Dinge im Bild.
- **Ruhig und befriedigend, nicht brutal.** Keine Explosionen, kein Wackeln des Bildes, keine Waffen. Wer
  ausscheidet, fällt sanft durch eine Klappe.
- **Fair sichtbar.** Alle Murmeln sind physikalisch gleich, es gibt keine Boosts und keine Power-ups. Glück und
  Bahn entscheiden, und das sieht man.
- **Alle Texte im Video englisch**, Bedienung und Dokumentation deutsch.
- **Querformat ohne Kamerafahrt.** Jede Bahn passt als feste Übersicht ins Bild, auch im Hochformat. Es gibt keine
  Kamera; der Wechsel zur nächsten Bahn ist ein Schnitt.
- **Shorts nach den [Leitlinien](SHORTS_LEITLINIEN.md):**
  - Im ersten Bild ist schon Bewegung und eine Frage zu sehen.
  - Kein Rahmen am Rand.
  - Texte in der Bildmitte.
  - Länge 25 bis 35 s.
- **Ton weich und leise:** feste Mischung wie bei Marble Works, nichts Klirrendes.
- **Eigenständig:** Es werden keine Namen, Teams, Strecken oder Grafiken bekannter Murmelrennen-Serien
  nachgebaut. Farben, Namen und Bahnen sind eigene.

---

## 1 · Das Format

### 1.1 Langvideo (16:9, rund 9 Minuten)

- **Das Feld:** 12 Murmeln und 10 Bahnen.
- **Bahn 1 bis 9:** Auf jeder scheidet die letzte Murmel aus (12 → 3).
- **Bahn 10 ist das Finale:** Drei Murmeln fahren um Platz 1 bis 3, danach kommt das Siegerpodest.
- **Länge:** Jede Bahn dauert 40 bis 60 s. Dazu kommen 4 s Aufstellung zu Beginn, je Bahnwechsel 2 s Zwischenstand
  und 8 s Podest. Zusammen sind das 8,5 bis 10 Minuten.
- **Kapitel** je Bahn mit Namen, zum Beispiel `Stage 4 – Crumbling Bridge` und `Stage 10 – Grand Final`.

### 1.2 Short (9:16, 25 bis 35 Sekunden)

- **Das Feld:** acht Murmeln auf drei Bahnen zu je 8 bis 12 s.
- **Ausscheiden:** Nach Bahn 1 bleiben die besten fünf, nach Bahn 2 die besten drei, Bahn 3 entscheidet den Sieger.
- **Zwei Fragen im ersten Bild, im Wechsel:**
  - `PICK YOUR COLOR!`
  - `FOLLOW THE GOLD ONE!`: Eine der acht ist golden. Das knüpft an den bewährten Einstieg mit der goldenen Kugel an.
- **Jedes Short mischt drei andere Bahnen** aus dem Baukasten. Die Bildsprache bleibt gleich, aber kein Short sieht
  aus wie das vorige (Leitlinie 6).
- **Verbindung zum Langvideo:** Ein Short kann über die Plattform-Funktion „Verwandtes Video“ auf das Langvideo
  zeigen. Die Bahnen dafür sind eigene Hochformat-Fassungen, kein Ausschnitt aus dem Querformat.

### 1.3 Ablauf einer Bahn

1. **Aufstellung:** Die Murmeln stehen in einer Startrinne hinter einem Tor, in der Zielreihenfolge der vorigen
   Bahn. Der Führende steht vorn. Auf Bahn 1 entscheidet der Seed die Reihenfolge.
2. **Start:** Das Tor öffnet mit einem weichen „klonk“ nach 0,6 s (Langvideo) oder 0,3 s (Short).
3. **Rennen:** Am Ziel kommt die Lichtschranke. Die Zielzeit wird innerhalb des Teilschritts genau gerechnet, damit
   ein Fotofinish sauber aufgelöst wird.
4. **Ausscheiden:** Sobald alle anderen durch sind, schließt das Zieltor. Unter der letzten Murmel öffnet eine
   Klappe, und sie fällt in die Röhre `OUT`.
5. **Zwischenstand** für 2 s, dann ein Schnitt zur nächsten Bahn.

**Gefahren-Bahnen:**

- Fällt eine Murmel unterwegs in eine Gefahr, etwa wenn die Brücke einstürzt oder ein Hammer trifft, ist sie die
  Ausgeschiedene dieser Bahn.
- Danach schließen alle Gefahren: Die Lämpchen springen von Rot auf Grün und `TRAPS CLOSED` erscheint. Das Zieltor
  lässt dann alle durch.
- Fallen im selben Augenblick zwei, scheiden beide aus. Die nächste Bahn wird dann zur `SAFE STAGE` ohne Ausscheiden.
  Im Drehbuch-Modus verwirft das Casting solche Seeds.

**Fangnetze:** An Stellen, die keine Gefahr sein sollen, fängt ein Netz die Murmel auf und bringt sie über einen
langsamen Umweg zurück. Das ist eine Strafe, aber kein Aus.

**Hängenbleiben:**

- Bewegt sich eine Murmel 3 s lang weniger als 5 Einheiten vorwärts, rüttelt das Bahnteil unter ihr sichtbar und
  gibt einen kleinen Stoß.
- Nach 12 s gilt sie als Letzte.
- Das Casting verwirft Seeds, in denen es überhaupt so weit kommt.

### 1.4 Die Murmeln

- **12 klar unterscheidbare Farben**, im Video mit englischen Farbnamen. Als Startwert:
  `RED, ORANGE, YELLOW, LIME, GREEN, CYAN, BLUE, PURPLE, PINK, WHITE, BLACK, GOLD`.
  Das Short nutzt acht davon. In der Variante „Follow the gold one“ ist GOLD immer dabei.
- **Glasmurmel-Look:** Grundfarbe, dunklerer Rand, weißer Glanzpunkt oben links und eine helle Schliere im Inneren.
  Die Schliere dreht sich mit, so sieht man das Rollen. Darunter ein weicher Schatten.
- **Größe:**
  - Short: Radius 30 Einheiten, bei 1080 Einheiten Breite.
  - Langvideo: Radius 22 Einheiten, bei 1080 Einheiten Höhe.
- **Hilfen zum Mitfiebern** (Empfehlung, Frage 4):
  - Die Murmel auf dem letzten Platz trägt einen weich pulsierenden roten Ring, „in danger“.
  - Die führende Murmel trägt eine kleine goldene Krone.
  - Beides wird aus dem Simulationszustand berechnet.

---

## 2 · Der Baukasten

Der Kern des Szenarios. Jedes Element ist ein Datenbaustein mit Parametern. Bewegte Teile sind kinematisch: Ihre
Lage ist eine reine Funktion der Bahnzeit, oder sie wird durch ein Ereignis ausgelöst, wie bei der Weiche oder den
fallenden Planken. Sie stoßen Murmeln, werden aber selbst nie von ihnen bewegt.

Maße in Murmel-Durchmessern **d**. Drehzahlen in Umdrehungen pro Sekunde (U/s).

### A · Grundbahn (Fluss und Rhythmus zwischen den Höhepunkten)

| Nr. | Element | Was passiert | Warum es das Rennen antreibt | Startwerte |
|---|---|---|---|---|
| A1 | Rampe, Zickzack | Schräge Bahnen mit Kehren | Das Feld zieht sich auseinander, es gibt ruhige Strecken zwischen den Höhepunkten | Neigung 8–14°, Bahnstärke 16 E, Kehre mit Bande |
| A2 | Trichter | Die Bahn verengt sich auf eine Spur | Stau, Gedränge, plötzliche Überholungen | Engstelle 1,3 d |
| A3 | Nagelfeld | Murmeln prallen durch versetzte Stifte | Reines Glück, viele kleine Positionswechsel, schöne Klick-Geräusche | Stift-Radius 0,3 d, Abstand 1,6 d, Dreiecksraster |
| A4 | Weiche mit Abkürzung | Ein Stift teilt das Feld: kurzer, riskanter Weg oder langer, sicherer Weg | „Lohnt sich das Risiko?“, das Feld trennt sich und trifft sich wieder | Kurz: 60 % der Länge, mit Klappe oder Hammer |
| A5 | Sprungschanze | Absprung über eine Lücke | „Schafft sie es?“ Zu langsame Murmeln landen im Fangnetz | Absprung 25°, Lücke 2,5–4 d |
| A6 | Bumper | Runde Pilze, die Murmeln wegschleudern | Wilde, lustige Ablenkungen | Rückprall 1,15, Höchstgeschwindigkeit begrenzt |

### B · Drehen

| Nr. | Element | Was passiert | Warum es das Rennen antreibt | Startwerte |
|---|---|---|---|---|
| B1 | **Drehkreuz** (Drehtür) | Ein Kreuz mit vier Armen dreht sich in einer Engstelle und lässt Murmeln nur portionsweise durch | Schlange davor, der Führende kann ausgebremst werden, „klack-klack-klack“ | Armlänge 2,2 d, Durchgang 1,2 d, 0,5 U/s |
| B2 | Schaufelrad | Ein Rad mit Taschen hebt die Murmeln auf die nächste Ebene | Wer bekommt die nächste Tasche? Die Reihenfolge wird neu gemischt | 8 Taschen zu je 1 Murmel, 0,15 U/s, Durchmesser 9 d |
| B3 | Drehtrommel | Murmeln purzeln in einer Trommel mit einem Ausgang | Raus kommt nur, wer im richtigen Moment unten liegt | Innen-Durchmesser 10 d, Ausgang 1,4 d, 0,12 U/s |
| B4 | **Ringausbruch** | Drei ineinanderliegende Ringe mit je einem Schlitz drehen gegeneinander | Stehen die Schlitze kurz in einer Linie, fällt eine Murmel durch alle auf einmal. Ein starker Short-Moment | Schlitz 1,5 d, +0,20 / −0,15 / +0,10 U/s |
| B5 | Kehrarm | Ein Balken streicht über eine Plattform mit Löchern | Er schiebt das Feld vor sich her, Murmeln kippen in Löcher (Fangnetz oder Gefahr) | Länge 8 d, 0,25 U/s |
| B6 | Flip-Flop-Weiche | Eine Wippe kippt bei jeder Murmel um und schickt sie abwechselnd links und rechts | Das Feld teilt sich gerecht, die beiden Spuren sind verschieden: Welche ist schneller? | Umschlag in 0,15 s |

Der Ringausbruch übernimmt die Idee „Ringwerk“ aus der Ideenauswahl vom 22.11. (Branch `konzept/kippkaskade`,
`docs/SZENENIDEEN_2026-11-22.md`).

### C · Takt und Bewegung

| Nr. | Element | Was passiert | Warum es das Rennen antreibt | Startwerte |
|---|---|---|---|---|
| C1 | Schiebetor | Ein Tor öffnet im Takt, wie bei „Rotes Licht, grünes Licht“ | Das Feld schließt auf, wer vorn wartet, kommt zuerst weiter | Offen 1,2 s alle 3 s, Lämpchen rot und grün |
| C2 | **Pendelhammer** | Hämmer schwingen über einem schmalen Sims | Ein Treffer wirft zurück oder hinunter, die großen Überraschungen | Pendellänge 6 d, Ausschlag ±50°, Takt 2,4 s, versetzt |
| C3 | Kolben | Stempel schieben von der Seite | Sie stoßen Murmeln auf eine langsamere untere Spur | 1 Hub pro Sekunde, Hub 2 d |
| C4 | Plattform-Aufzug | Zwei Plattformen fahren gegenläufig über eine Lücke | Warten auf die nächste Fahrt, das Feld wird gebündelt | Fahrt 2,5 s, Halt 0,8 s |
| C5 | Förderband | Ein Band, das alle 4 s die Richtung wechselt | Mal Rückenwind, mal Gegenwind, das Glück wechselt sichtbar | ±120 E/s |
| C6 | Falltüren-Feld | Ein Boden aus sechs Platten, die nacheinander aufklappen | Gefahr mit Vorwarnung: Die Platte blinkt 0,6 s, dann klappt sie auf | Reihenfolge aus dem Seed, Abstand 0,9 s |

### D · Das Level verändert sich

Die Bahnen, die der Nutzer ausdrücklich will: Die Strecke selbst bewegt sich.

| Nr. | Element | Was passiert | Warum es das Rennen antreibt | Startwerte |
|---|---|---|---|---|
| D1 | **Kippbrett** | Eine große Plattform kippt im Takt nach links und rechts, an beiden Enden geht es weiter | Das Feld rollt hin und her, die Führung wechselt mit jeder Neigung | ±12°, alle 3,5 s, Breite 70 % des Bildes |
| D2 | **Einstürzende Brücke** | Ab einem festen Moment fallen die Planken von hinten nach vorn, eine nach der anderen | Das Feld flieht vor dem Einsturz, der Letzte springt vielleicht gerade noch | 10 Planken, Wackeln 0,4 s, dann alle 0,5 s eine |
| D3 | **Wandernde Böden** | Vier Böden übereinander mit je einer Lücke, die im eigenen Takt hin und her gleiten | Liegen zwei Lücken übereinander, fällt eine Murmel gleich zwei Stockwerke tief | Takte 2,0 / 2,6 / 3,1 / 3,7 s, Weg 3 d |
| D4 | Drehende Bühne | Ein Labyrinth in einem großen Kreis dreht sich langsam, die Murmeln suchen den Ausgang | Sehr „satisfying“: Mit der Drehung öffnen sich immer neue Wege | 7 × 7 Felder, 0,05 U/s |
| D5 | Drehweichen-Raster (später) | Ein Raster aus Weichenkacheln, jede dreht sich alle 2 s um 90° | Die Strecke baut sich ständig um | Erst nach einer Probe; Kanten zwischen den Kacheln sind heikel |

### E · Ausscheiden und Wertung

| Nr. | Element | Aufgabe |
|---|---|---|
| E1 | Ziellinie | Lichtschranke mit genauer Zeit, Rangfolge und Abstand zum Vorigen |
| E2 | Knockout-Klappe `LAST ONE OUT` | Schließt das Zieltor, wenn alle bis auf einen durch sind, und öffnet die Klappe unter dem Letzten |
| E3 | Quoten-Tor `TOP 5` | Short: zählt die ersten N durch, dann schließt es und der Wartebereich klappt weg |
| E4 | Gefahr mit Deckel | Gefahren schließen, sobald die Quote der Bahn erfüllt ist (`TRAPS CLOSED`, Lämpchen grün) |
| E5 | Röhre `OUT` | Langvideo: Glasröhre am rechten Rand, in der sich die Ausgeschiedenen der Reihe nach stapeln, mit Namen |
| E6 | Fangnetz | Fängt Stürze ohne Aus ab und führt über einen langsamen Umweg zurück |

### Bewusst nicht dabei

Folgendes bleibt draußen:

- **Teleporter und Portale:** Man kann den Weg nicht mehr verfolgen.
- **Schwerkraft-Umkehr:** Sie ist nicht lesbar.
- **Boosts und Power-ups:** Das sieht unfair aus.
- **Kamerafahrten**
- **Schütteln des Bildes**
- **Partikel-Feuerwerk**

---

## 3 · Die Bahnen

**Regeln für die Abwechslung:**

- Kein Hauptelement kommt in einem Video zweimal vor.
- Mindestens vier Bahnen verändern sich während des Laufs.
- Ruhige Bahnen wechseln sich mit wilden ab.
- Etwa in der Mitte des Videos kommt sichtbar etwas Neues.

### 3.1 Langvideo (16:9)

| Bahn | Titel im Video | Hauptelement | Neben | Ausscheiden | Moment, den das Casting sucht |
|---|---|---|---|---|---|
| 1 | `THE DROP` | Nagelfeld A3 | Trichter A2, Zickzack A1 | letzte | Alle 12 fallen auf einmal; Gedränge am Trichter |
| 2 | `TURNSTILES` | Drei Drehkreuze B1 | Zickzack A1 | letzte | Der Führende wird am letzten Kreuz ausgebremst |
| 3 | `THE WHEEL` | Schaufelrad B2 | Bumper A6 | letzte | Zwei Murmeln kämpfen um die letzte Tasche |
| 4 | `CRUMBLING BRIDGE` | Einstürzende Brücke D2 | Sprungschanze A5 | Gefahr | Die Letzte springt gerade noch oder fällt knapp |
| 5 | `TILT` | Kippbrett D1 | Schiebetor C1 | letzte | Mehrere Führungswechsel durch das Kippen |
| 6 | `THE DRUM` | Drehtrommel B3 | Flip-Flop B6 | letzte | Eine Murmel kreist lange, kommt aber noch raus |
| 7 | `HAMMER ALLEY` | Pendelhämmer C2 | Fangnetz E6 | Gefahr | Ein Favorit wird kurz vor dem Ziel getroffen |
| 8 | `SHIFTING FLOORS` | Wandernde Böden D3 | Förderband C5 | letzte | Ein Sturz über zwei Stockwerke wirbelt alles durcheinander |
| 9 | `RING ESCAPE` | Ringausbruch B4 | — | letzte (4 → 3) | Die Letzte bricht im letzten Moment aus |
| 10 | `GRAND FINAL` | Lange Strecke mit Drehkreuz, Kippbrett, Brücke und Schanze | — | Platz 1 bis 3 | Fotofinish mit Zeitlupe, danach Podest |

**Hintergrundfarben,** je eine Welt pro Bahn: Nachtblau, Waldgrün, Sand, Petrol, Abendrot, Pflaume, Schiefer,
Eisblau, Tiefviolett, Gold-Dunkel fürs Finale. Holzbahn, Metallteile und Murmeln bleiben überall gleich.

### 3.2 Short (9:16), erste drei Fassungen

| Short | Frage im ersten Bild | Bahn 1 (8 → 5) | Bahn 2 (5 → 3) | Bahn 3 (3 → 1) |
|---|---|---|---|---|
| S-A | `PICK YOUR COLOR!` | Nagelfeld + Drehkreuz | Einstürzende Brücke | Ringausbruch, Fotofinish |
| S-B | `FOLLOW THE GOLD ONE!` | Drehtrommel | Pendelhämmer | Kippbrett zum Ziel |
| S-C | `WHO SURVIVES THE FLOORS?` | Zickzack + Schiebetor | Wandernde Böden | Drehende Bühne (Labyrinth) |

Im Short steht über jeder Bahn groß in der Mitte `8 → TOP 5`, `5 → TOP 3` und `FINAL`. Wer ausscheidet, fällt aus
dem Bild; sein Name erscheint kurz in der Mitte, zum Beispiel `RED IS OUT`. Am Ende steht `PINK WINS!` mit einer
kurzen Zeitlupe davor.

---

## 4 · Spannung: Drehbuch und Casting

Das Prinzip aus Scrap D2: Die Physik bleibt echt. Gesucht wird nur, welcher Seed eine gute Geschichte ergibt.

- **Was der Seed einer Bahn bestimmt:**
  - kleine Abweichungen in der Startrinne (±1,5 E) und im Startmoment (±2 Schritte),
  - den Takt-Versatz der bewegten Elemente (±10 % der Periode),
  - die Reihenfolge der Falltüren.
- **Bahn für Bahn (sequenziell):** Bahn n wird mit den tatsächlichen Überlebenden und ihrer Reihenfolge aus Bahn
  n−1 gecastet. Je Bahn wird ein Seed festgelegt. Wie bei Scrap wird das Drehbuch zu einer Liste
  `{ stage, seed, … }`.
- **Was eine Zeile festlegen kann:**
  - wer ausscheidet (wahlweise),
  - `close`: Die Letzte ist weniger als 0,3 s hinter der Vorletzten,
  - `nearMiss`: Eine Gefahr verfehlt eine Murmel um weniger als 0,2 s,
  - `leadChanges`: mindestens N Führungswechsel,
  - `photo`: Platz 1 und 2 trennen weniger als 0,1 s.
- **Geschichte des ersten Langvideos** (Startwert, Frage 3): Eine Außenseiterin entkommt dreimal knapp und steht am
  Ende auf dem Podest. Der frühe Dauerführende fällt auf Bahn 7 dem Hammer zum Opfer. Das Finale entscheidet ein
  Fotofinish.
- **Freier Modus** ohne Drehbuch läuft immer: Jeder Seed ergibt ein gültiges Rennen.
- **Zeitlupe** wird aus dem Simulationszustand ausgelöst, nicht aus der Zukunft. Das hält die Seek-Regel ein.
  - Auslöser: Zwei Murmeln sind weniger als 3 d vor der Ziellinie und weniger als 0,15 s auseinander, oder eine
    Murmel steht auf der vorletzten Brückenplanke.
  - Tempo 0,35, höchstens 2 s, höchstens dreimal pro Video.

---

## 5 · Physik

**Empfehlung: ein eigener kleiner Physik-Kern statt Matter.js.** Matter.js bleibt in der Kugelfabrik und in Naval.

**Gründe:**

1. Bewegte Teile brauchen eine genaue Oberflächengeschwindigkeit. Ein Drehkreuz soll eine Murmel wirklich schieben
   und nicht nur wegdrücken. Bei Matter.js zittern von Hand bewegte, statische Körper.
2. In einem Rennen kommt es auf jede Kollision an. Mit festen Teilschritten und einer Geschwindigkeitsgrenze kann
   keine Murmel durch die Bahn fallen.
3. **Node und Chromium rechnen gleich.** Der Kern nutzt nur +, −, ×, ÷ und `Math.sqrt`, dazu eigene Funktionen
   `sin`, `cos` und `atan2` in `detmath.js`. Diese Funktionen nutzen ein Polynom mit Bereichsreduktion. Bei Scrap
   lief das Casting nur in Chromium, weil `Math.sin` dort andere Werte liefert als in Node. Hier können Casting und
   Tests schnell und parallel in Node laufen. Ein Test prüft, dass Node und Chromium denselben Zustands-Hash
   ergeben.

**Aufbau**

- **Formen:**
  - Kreis: Murmel, Stift, Bumper.
  - Kapsel: Strecke mit Radius, zum Beispiel ein Bahnstück, ein Arm, eine Planke.
  - Bögen und Ringe als Kapselketten mit 48 Teilen pro Vollkreis.
- **Kinematische Teile:** Lage, Winkel und Geschwindigkeit sind eine Funktion `pose(tStage)` oder eine
  ereignisgesteuerte Animation. Ereignisse sind etwa das Umschlagen der Weiche oder das Lösen einer Planke. Der
  Zustand dazu, also Auslösezeit und Seite, ist Simulationszustand und gehört in den Hash.
- **Takt:** 60 Schritte je Sekunde × 4 Teilschritte (240 Hz). Halbimpliziter Euler.
- **Stöße:** sequenzielle Impulse mit 6 Durchgängen und Lagekorrektur von 0,2 je Teilschritt.
- **Startwerte:**

  | Größe | Wert |
  |---|---|
  | Schwerkraft | 1600 E/s² |
  | Höchstgeschwindigkeit | 1500 E/s, also höchstens 6,3 E je Teilschritt bei mindestens 16 E Bahnstärke |
  | Rückprall Bahn | 0,25 |
  | Rückprall Murmel gegen Murmel | 0,45 |
  | Reibung | 0,12 |
  | Rollen | Winkelgeschwindigkeit aus Bahngeschwindigkeit / r, nur für die Darstellung |
- **Breitphase:** festes Raster mit 4 d Kantenlänge, Paare nach Kennung sortiert, damit die Reihenfolge fest ist.
- **Ideallinie je Bahn:** Eine Polylinie misst den Fortschritt jeder Murmel. Daraus kommen:
  - die Live-Rangfolge, also Krone und roter Ring,
  - Beinahe-Treffer,
  - die Erkennung des Hängenbleibens,
  - die Werte für das Casting.
- **Invarianten:**
  - Zahl der Lebenden + Zahl der Ausgeschiedenen = 12.
  - Keine Murmel außerhalb der Welt.
  - Keine Murmel steckt in der Bahn: Abstand zur nächsten Kapsel ≥ r − 1.
  - Jede Bahn endet nach höchstens 90 s.
  - Je Bahn genau ein Aus, außer bei `SAFE STAGE`.

---

## 6 · Stilbibel

**Grundidee (Empfehlung, Variante A): „Holzbahn im Abendlicht“.** Einfach, warm und hochwertig.

| Ebene | Vorgabe |
|---|---|
| Hintergrund | Dunkler Verlauf in der Farbe der Bahn (Werte um #13202b bis #1d3340), leichte Vignette, ganz feine Holzmaserung oder Punkte bei 4 % Deckkraft. Nichts, was mit den Murmeln konkurriert. |
| Bahn | Helles Honigholz (#d9a35b bis #b97f3c), Oberkante 2 E heller, Unterseite 3 E dunkler, weicher Schatten 6 E nach unten rechts. Banden in derselben Farbe, etwas dunkler. |
| Bewegte Teile | Gebürstetes Metall (#c9d1d6 bis #7d8a93) mit einem Messingakzent (#d4a537) an der Achse. So sieht man sofort, was sich bewegt. |
| Gefahren | Gelb-schwarze Streifen am Rand, ein Lämpchen: Rot heißt aktiv, Grün heißt sicher. |
| Murmeln | Satte Farben, Glanzpunkt, Schliere, Schatten (Abschnitt 1.4). Sie sind das Hellste und Bunteste im Bild. |
| Texte | Fett, weiß, weicher dunkler Schatten, englisch, mittig. Im Short nie in den äußeren 12 % unten und rechts. |
| Anzeige im Langvideo | Oben links klein `STAGE 4/10 · CRUMBLING BRIDGE`, oben rechts `8 LEFT`, rechts die Röhre `OUT`. Sonst nichts. |
| Anzeige im Short | Kein Rahmen. Nur die große Zeile zu Beginn jeder Bahn und der Name beim Ausscheiden. |
| Effekte | Leise: Staubwölkchen beim Fallen einer Planke, kurzes Leuchten des Rings beim Durchbruch, kleines Glitzern im Ziel. Kein Wackeln, keine Explosionen. |

**Drei Varianten für die Vorschau (V0):**

| Variante | Look |
|---|---|
| A „Holz & Abendlicht“ | wie oben (Empfehlung) |
| B „Hell & clean“ | weißer bis hellgrauer Hintergrund, Bahn aus mattem Pastell-Kunststoff, weiche Schatten; die Art, die viele erfolgreiche Simulationskanäle zeigen |
| C „Glas & Nacht“ | Bahnen als Glasröhren und Glasplatten mit hellen Kanten vor Nachtblau; nah an Marble Works |

Gezeigt wird jede Variante mit derselben Szene, einmal im Hochformat und einmal im Querformat: die einstürzende
Brücke mitten im Rennen. Kleine JPEG-Fassungen kommen nach der Wahl unter `docs/reference/`.

---

## 7 · Ton

Der Ton ist eine feste, leise Mischung wie bei Marble Works (rund −24 LUFS) und kommt aus Ereignissen.

| Ereignis | Klang | Regel |
|---|---|---|
| `hit_track` | weiches Holz-„tock“ | Lautstärke nach Aufprallstärke, unter einer Schwelle stumm, mindestens 30 ms Abstand |
| `hit_marble` | leises Glas-„klick“ | gedämpft, höchstens 12 pro Sekunde |
| `peg` | heller, sehr leiser Tick | Nagelfeld, mit leichter Tonhöhenstreuung aus `c` |
| `gate` | weiches „klonk“ | Start- und Zieltor |
| `turnstile` | Ratschen-Tick je Vierteldrehung | nur wenn eine Murmel anliegt |
| `plank` | Knarzen, dann dumpfer Fall | Brücke |
| `knockout` | sanftes „plopp“ und ein tiefer, kurzer Ton | ein Aus |
| `finish` | kleiner Glockenton, je Platz etwas tiefer | Ziel |
| `winner` | weicher Akkord aus drei Glocken | Finale und Short-Ende |
| Hintergrund | sehr leises Raumrauschen | gleichbleibend |

Quellen sind die weichen Marble-Works-Klänge, die CC0-Impact-Sounds von Kenney (freigegeben) und neue Dateien mit
Lizenznachweis in `assets/audio/README.md`. Am Ende gibt es eine Hörprobe, das Urteil darüber liegt beim Nutzer.

---

## 8 · Pakete

Ein Paket ist ein Commit. Gearbeitet wird auf kurzen Branches mit Pull Request und Merge-Commit, das Mergen erst
nach Freigabe. Nach jedem Paket werden ROADMAP, CHANGELOG, Gesamtplan Abschnitt 0 und der Bericht
[`docs/MARBLE_KNOCKOUT_2026-11-25.md`](MARBLE_KNOCKOUT_2026-11-25.md) nachgezogen.

| Paket | Inhalt | Abnahme |
|---|---|---|
| **V0** | Vorschau-Bilder der drei Stile, je 9:16 und 16:9, gerendert aus einer Kopie | **Stopp: Der Nutzer wählt den Stil.** |
| M1 | Physik-Kern `knockout/physics.js` und `detmath.js` mit Tests: Rollen, Liegen, Stapeln, bewegte Oberfläche, kein Durchfallen, Node = Chromium | Tests grün |
| M2 | Baukasten A, B, E1, E2 und eine **Element-Galerie** in der Oberfläche: Jedes Element läuft einzeln mit sechs Murmeln in Schleife | Jedes Element läuft 60 s ohne Hänger |
| M3 | Baukasten C, D (ohne D5), E3 bis E6 | wie M2 |
| M4 | Rennablauf: Bahnen als Daten, Aufstellung, Tore, Ausscheiden, Röhre, Wackeln bei Hängern, Zwischenstand, Ereignisse; Szenario „Marble Knockout (in Arbeit)“ angemeldet; zehn Bahnen im Querformat | 100 freie Läufe ohne Fehler, Länge im Ziel |
| M5 | Darstellung nach der gewählten Stilbibel, Layouts 9:16 und 16:9, Texte, Krone und roter Ring, Zeitlupe, Podest | Bildvergleich Wiedergabe gegen Sprung |
| M6 | Ton nach Abschnitt 7 | Export-Prüfung, Hörprobe |
| M7 | Short: drei Hochformat-Bahnen je Fassung S-A bis S-C, Casting-Skript `scripts/knockout-casting.mjs`, Vorlagen | 20-Sekunden-Probe lokal |
| M8 | Langvideo: Drehbuch-Modus, sequenzielles Casting, Kapitel, Vorlage | 20-Sekunden-Probe vom Finale lokal; der ganze Export nur auf Auftrag |
| M9 | Bericht, gesammelte Geschmacksfragen, README-Zeile | — |

**Stopps:** Nur V0 ist ein harter Stopp. Danach wird mit den Empfehlungen dieses Plans durchgebaut. Am Ende liegen
dem Nutzer vor:

- je eine 20-Sekunden-Probe von Short und Langvideo,
- ein 20-Sekunden-Clip aus der Element-Galerie,
- die gesammelten Fragen.

---

## 9 · Prüfung

Nur gezielt, kein voller `npm test`.

- **`test/knockout-physics.test.mjs`:**
  - gleicher Seed, gleicher Hash,
  - eine Murmel auf der Schräge rollt mit der erwarteten Beschleunigung (±3 %),
  - zehn Murmeln liegen nach 5 s ruhig in einer Mulde,
  - ein Drehkreuz schiebt sie mit,
  - 10 000 Stöße ohne Durchfallen.
- **`test/knockout.test.mjs`:**
  - Invarianten aus Abschnitt 5 im Langlauf,
  - jede Bahn endet,
  - je Bahn genau ein Aus,
  - das Zeichnen ändert den Zustand nicht,
  - Drehbuch-Zeilen werden eingehalten.
- **`test/knockout-browser.test.mjs`:**
  - Chromium-Hash gleich Node-Hash,
  - Seek-Regel an zwölf Zeitpunkten pixelgleich,
  - beide Layouts,
  - kurzer Export mit Ton.
- **Vorlagen-Exporttest**, Gruppe in `scripts/test-ci.mjs` und `.github/workflows/ci.yml`.
- **`npm run golden`** einmal am Ende: Es muss unverändert bleiben, weil kein anderes Szenario angefasst wird.
- **Exporte:** nur 20-Sekunden-Proben, alles Längere auf Auftrag.

---

## 10 · Bezug zu anderen Vorhaben

- **Ringwerk** aus der Ideenauswahl vom 22.11. geht als Element B4 hier auf.
- Das **Tierchen-Rennen** (R29) und das **Pyramid-Rennen** (R23, P5) können später den Physik-Kern und den Baukasten
  nutzen. Es wird hier nicht doppelt geplant.
- **Marble XL** (R35) bleibt unberührt. Ein ruhiges 10-Minuten-Video von dort wäre die Ergänzung zum Rennen.

---

## 11 · Gesammelte Geschmacksfragen (werden am Ende gestellt)

1. Name im Video: „Marble Knockout“ oder ein anderer Titel?
2. Murmelnamen: Farbwörter (`RED`) oder Fantasienamen (`RUBY`, `JADE`)?
3. Geschichte des ersten Langvideos: Außenseiterin aufs Podest, oder lieber offen?
4. Krone für den Führenden und roter Ring für den Letzten: hilfreich oder zu viel?
5. Feldgröße: 12 Murmeln (klar lesbar) oder 16 (mehr Gewusel, dann zwei Aus je Bahn am Anfang)?
6. Hintergrundmusik: keine (Empfehlung) oder sehr leise?
7. Welche Bahnen und Shorts danach als Nächstes?
