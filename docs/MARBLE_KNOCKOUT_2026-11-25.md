# Marble Knockout: Bericht

Roadmap-Nummer **R43**. Plan: [MARBLE_KNOCKOUT_PLAN_2026-11-25.md](MARBLE_KNOCKOUT_PLAN_2026-11-25.md).
Dieser Bericht wird je Paket fortgeschrieben.

| Paket | Stand |
|---|---|
| Plan | **Erledigt** (25.11.) |
| V0 Vorschau-Bilder | **Erledigt** (25.11.). Der Nutzer hat **Stil A „Holz & Abendlicht“** gewählt. |
| M1 Physik-Kern | **Erledigt** (25.11.) |
| M2/M3 Baukasten und Galerie | **Erledigt** (25.11.) |
| M4 Rennablauf, zehn Bahnen, Anmeldung | **Erledigt** (25.11.) |
| M5 Darstellung, Zeitlupe, Seek-Prüfung | **Erledigt** (25.11.) |
| M6 Ton | **Erledigt** (25.11.) |
| M7 Short-Bahnen, Casting, Vorlagen | **Erledigt** (25.11.) |
| M8 Langvideo-Drehbuch, Vorlage, Finalprobe | **Erledigt** (25.11.) |
| M9 Abschluss und Geschmacksfragen | **Erledigt** (25.11.) |
| Teil 2: Gesamtlevel mit Kamerafahrt | **Plan erledigt** (25.11.): [MARBLE_KNOCKOUT_GESAMTLEVEL_PLAN_2026-11-25.md](MARBLE_KNOCKOUT_GESAMTLEVEL_PLAN_2026-11-25.md). Der Nutzer will vor dem ganzen Export je ein spannendes Gesamtlevel mit viel Action. |
| G1 Gesamtlevel: Grundlage und erste Abschnitte | **Erledigt** (25.11.), Stopp: Der Nutzer wählt die Kamera fürs Querformat. G2 bis G7 offen. |

---

## V0 · Vorschau-Bilder in drei Stilen (25.11.2026)

**Umfang:**

- Eine Szene in drei Stilen, je im Querformat 1920 × 1080 und im Hochformat 1080 × 1920. Die Szene ist Bahn 4
  „Crumbling Bridge“ mitten im Rennen.
- Gerendert in Chromium aus einer Kopie. Das ist eine reine Zeichnung, noch ohne Simulation.
- Die Werte entsprechen der Stilbibel (Plan, Abschnitt 6).

| Stil | Look |
|---|---|
| A · Holz & Abendlicht (Empfehlung) | Honigholz-Bahn, Petrol-Hintergrund mit warmem Licht oben links, feine Punkte, Vignette |
| B · Hell & clean | Heller Hintergrund mit feinem Raster, Bahn aus mattem blauem Kunststoff, weiche Schatten |
| C · Glas & Nacht | Glasbahnen mit hellen Kanten und Leuchten, Nachthimmel mit Sternen, Murmeln leuchten leicht |

**Was jedes Bild zeigt:**

- **Brücke:**
  - Die drei hinteren Planken fallen bereits.
  - Die vierte wackelt und ist rot umrandet, darunter steigt Staub auf.
  - An den Pfosten hängen gelb-schwarze Gefahrenstreifen und rote Lämpchen.
  - Die abgerissenen Seile hängen lose herunter.
- **Murmeln:**
  - Die Letzte trägt den roten Ring „in danger“, der Führende die Krone.
  - Zwei Murmeln sind im Sprung über der Lücke, mit Bewegungsspur.
- **Querformat:**
  - Kopfzeile `STAGE 4/10 · CRUMBLING BRIDGE` und `9 LEFT`.
  - Röhre `OUT` mit den drei Ausgeschiedenen samt Namen.
  - Zielflagge und Knockout-Klappe am Ziel.
- **Hochformat:**
  - Große Zeile `5 → TOP 3` in der Mitte oben.
  - Abgrund mit Gefahrenstreifen als Boden.
  - Fallrohr rechts, Ziel und Tor `TOP 3` unten.
  - Die unteren 12 % bleiben frei.

**Dateien:**

- Zeichnung: [`docs/reference/knockout-vorschau.js`](reference/knockout-vorschau.js).
- Aufruf:

  ```bash
  node scripts/knockout-vorschau.mjs --out output/knockout-vorschau
  ```

- Ergebnis nur lokal in `output/knockout-vorschau/`:
  - je Stil und Format ein PNG (`stil-A-16x9.png` …),
  - je Stil ein Blatt (`blatt-A.jpg` …),
  - ein Gesamtblatt `alle-stile.jpg`.
- Nach der Wahl kommen kleine JPEG-Fassungen des gewählten Stils unter `docs/reference/`.

**Grenzen:**

- Die Lagen der Murmeln und Planken sind von Hand gesetzt und nicht simuliert.
- Die Schrift ist „Segoe UI“ (Windows). Die Schrift des Szenarios wird in M5 festgelegt.
- Die Bewegungsspur ist hier gezeichnet. Im Szenario kommt sie aus einem Positionspuffer der Simulation
  (Seek-Regel).

**Geprüft:**

- Beide Renderläufe ohne Fehler in Chromium.
- Alle sechs Bilder und drei Blätter angesehen.
- Nach dem ersten Lauf geändert:
  - Der Abgrund läuft jetzt seitlich weich aus; vorher wirkte er wie ein dunkler Kasten.
  - Ein missverständlicher Starttor-Arm ist entfernt.
- Keine Tests und kein Export, weil kein Szenario-Code geändert wurde.

### Stilwahl

Am 25.11. hat der Nutzer **Stil A** gewählt („Ja Stil A“). Die Referenzbilder liegen unter `docs/reference/`:
[Querformat](reference/knockout-stil-a-16x9.jpg) und [Hochformat](reference/knockout-stil-a-9x16.jpg).

---

## M1 · Physik-Kern (25.11.2026)

**Umfang:**

- `src/scenarios/knockout/detmath.js`: Sinus und Kosinus mit festem Ergebnis, nur aus Grundrechenarten.
  - Bereichsreduktion mit geteiltem π/2.
  - Polynome aus fdlibm.
  - Abweichung zu `Math.sin` und `Math.cos` unter 1e-14.
- `src/scenarios/knockout/physics.js`: Kreise gegen Kapseln und Kreise untereinander.
  - 4 Teilschritte je Simulationsschritt, also 240 Hz.
  - Spekulative Kontakte und sequenzielle Impulse mit 8 Durchgängen.
  - Rückprall nur bei echten Stößen.
  - Lagekorrektur nach dem Bewegen.
  - Rollreibung einer Vollkugel.
  - Kinematische Körper mit `pose(t)`.
  - Förderband über die Oberflächengeschwindigkeit.
  - Raster für feste Bahnteile.
  - Liste der harten Stöße für den Ton.

**Startwerte:**

| Größe | Wert |
|---|---|
| Schwerkraft | 1600 E/s² |
| Höchstgeschwindigkeit | 1500 E/s |
| Rückprall Bahn | 0,25 |
| Rückprall Murmel gegen Murmel | 0,45 |
| Reibung | 0,25 |
| Rückprall erst ab | 70 E/s |

**Messung (`test/knockout-physics.test.mjs`, 7 Tests grün):**

- Rollen auf 6°, 12° und 18°: Die Beschleunigung liegt innerhalb von 3 % bei 5/7 · g · sin θ, die Murmel rollt ohne
  zu rutschen.
- Zehn Murmeln in einer Mulde: Nach 6 s schneller als 4 E/s ist keine mehr. Keine dringt in die Bahn oder in eine
  andere ein.
- 300 Schüsse mit 1500 E/s schräg gegen eine Bahn von 12 E Stärke: Keiner geht durch.
- Ein drehendes Kreuz schiebt eine Murmel mit.
- Förderband: Die Murmel fährt physikalisch richtig mit 2/7 der Bandgeschwindigkeit und rollt dabei rückwärts.
  Für die Bahnen gilt deshalb: Ein Band muss etwa 3,5-mal so schnell laufen, wie die Murmeln fahren sollen.
- Gleicher Aufbau ergibt dieselben Bits.
- Der Vergleich Node gegen Chromium folgt im Browser-Test, sobald das Szenario angemeldet ist.

---

## M2/M3 · Baukasten und Element-Galerie (25.11.2026)

**Umfang:**

- `src/scenarios/knockout/elements.js`: ein Builder, der eine Bahn aus Bausteinen zusammensetzt. Feste Teile sind
  Kapseln im Physik-Kern. Bewegte Teile sind kinematische Körper, deren Lage eine reine Funktion der Bahnzeit ist
  oder an einem Ereignis hängt (Zeitpunkt im Zustand). Ihre Geschwindigkeit kommt aus der Ableitung der Lage.
- 21 Elemente:

  | Familie | Elemente |
  |---|---|
  | A Grundbahn | Rampe und Zickzack, Trichter, Nagelfeld, Sprungschanze mit Fangnetz, Bumper |
  | B Drehen | Drehkreuz, Schaufelrad (hebt die Murmeln an), Drehtrommel, Ringausbruch, Kehrarm, Flip-Flop-Weiche |
  | C Takt | Tor aus der Bahn (Takt oder von Hand), Pendelhammer, Kolben (Katapult-Becher), Plattform nach Schlüsselbildern (Fähre), Förderband mit Richtungswechsel, Falltüren in Seed-Reihenfolge |
  | D Level verändert sich | Kippbrett, einstürzende Brücke (Zeit oder Auslöser), wandernde Böden, drehende Bühne (Labyrinth) |
  | E Wertung | Startrinne mit Tor, Ziellinie mit Zieltor; Klappe, Quote, Röhre und Fallen-Schließen folgen mit dem Rennablauf (M4) |

- Physik-Kern ergänzt:
  - **Ebenen:** Trommel, Ringe und Labyrinth liegen auf einer eigenen Ebene. Eine Murmel fällt „von vorn“ hinein und
    stößt erst innen mit ihnen zusammen. So gibt es keinen Engpass am Eingang.
  - **Bumper-Stoß:** eine Mindest-Abprallgeschwindigkeit je Teil.
- `src/scenarios/knockout/gallery.js`: 21 kleine Bühnen. Murmeln kommen oben herein, laufen durch das Element und
  fallen unten hinaus; danach kommen sie wieder.
- Erste Fassung der Zeichnung im Stil A (`art.js`, `renderer.js`).
- Werkzeuge:
  - `scripts/knockout-lab.mjs`: Simulation in Node, ohne Browser.
  - `scripts/knockout-frames.mjs`: Bildblatt aus Chromium, nur nach `output/`.

**Messung (60 s je Element, sechs Murmeln, Seed 1):**

| Element | Runden je Murmel | längste Runde |
|---|---|---|
| Nagelfeld | 4–10 | 16 s |
| Zickzack | 3 | 19 s |
| Trichter | 31–32 | 4 s |
| Bumper | 17–19 | 7 s |
| Sprungschanze | 15–16 | 6 s |
| Drehkreuz | 4–5 | 19 s |
| Schaufelrad | 6 | 12 s |
| Drehtrommel | 2–10 | 51 s |
| Ringausbruch | 4–5 | 20 s |
| Kehrarm | 16–17 | 6 s |
| Flip-Flop | 17 | 6 s |
| Tor | 6–8 | 10 s |
| Pendelhammer | 3–14 | 22 s |
| Kolben | 5–7 | 18 s |
| Fähre | 5–7 | 15 s |
| Förderband | 17–18 | 6 s |
| Falltüren | 12–13 | 9 s |
| Kippbrett | 6–14 | 27 s |
| Brücke (baut sich alle 9 s neu auf) | 1–2 je Aufbau | 5 s |
| Wandernde Böden | 6–7 | 13 s |
| Labyrinth | 4–6 | 13 s |

**Grenzen:**

- In der Oberfläche erscheint die Galerie erst mit der Anmeldung des Szenarios (M4, inzwischen erledigt).
- D5 (Drehweichen-Raster) ist wie geplant nicht gebaut.
- Kolben und Fähre kommen in den geplanten Bahnen nicht vor. Sie stehen für spätere Bahnen bereit.
- In der Drehtrommel kann eine Murmel lange kreisen (bis 51 s in der Galerie). Für Bahn 6 wird das abgestimmt.

**Nachweise:**

- `test/knockout-elements.test.mjs`, 3 Tests grün:
  - Jedes Element läuft 60 s.
  - Gleicher Seed ergibt denselben Hash.
  - Simulation und Bahnen nutzen keine Winkelfunktionen des Browsers, also gleiche Bits in Node und Chromium.
- `test/knockout-physics.test.mjs` bleibt grün (7 Tests).

---

## M4 · Rennablauf, zehn Bahnen, Anmeldung (25.11.2026)

**Umfang:**

- `src/scenarios/knockout/stages.js`: die zehn Bahnen des Langvideos als Daten. Jede Bahn hat eine eigene
  Hintergrundwelt, eine Ideallinie für den Fortschritt und ein Ziel.

  | Bahn | Hauptelement | Aufbau |
  |---|---|---|
  | 1 `THE DROP` | Nagelfeld | Regal mit Klappen über dem Nagelfeld, Trichter, zwei Reihen zum Zielbehälter |
  | 2 `TURNSTILES` | vier Drehkreuze | drei Kreuze in Reihe 1, eins in Reihe 4 (Gegenrichtung), Zickzack |
  | 3 `THE WHEEL` | Schaufelrad | Bumper-Kasten, dann hebt das Rad die Murmeln zum Ausgang |
  | 4 `CRUMBLING BRIDGE` | einstürzende Brücke (Gefahr) | Schanze auf die Brücke; sie stürzt hinter dem Feld ein, wenn alle bis auf zwei drüber sind |
  | 5 `TILT` | Kippbrett | zwei Ampeltore, dann ein langes Kippbrett mit Löchern an beiden Enden |
  | 6 `THE DRUM` | Drehtrommel | Flip-Flop teilt das Feld, beide Wege münden von vorn in die schaukelnde Trommel |
  | 7 `HAMMER ALLEY` | Pendelhämmer (Gefahr) | Sims mit drei Löchern, zwei führen ins Aus, eins ins Fangnetz; Deckel schließen nach dem Aus |
  | 8 `SHIFTING FLOORS` | wandernde Böden | Förderband mit Richtungswechsel, dann ein Turm aus drei Böden |
  | 9 `RING ESCAPE` | drei gegenläufige Ringe | Eintritt von vorn in die Mitte, Ausbruch durch drei Schlitze |
  | 10 `GRAND FINAL` | Strecke aus allem | zwei Drehkreuze, Schanze auf die Brücke, Wippe, Drehkreuz vor dem Ziel |

- `src/scenarios/knockout/simulation.js`: der Ablauf eines ganzen Videos.
  - Einstieg (4 s), je Bahn Aufstellung in der Zielreihenfolge der vorigen Bahn, Start, Rennen, Zwischenstand.
  - Sind alle bis auf die Letzte durch, schließt das Zieltor und die Letzte fällt durch eine Klappe in die Röhre `OUT`.
  - Gefahren-Bahnen: Wer in die Grube fällt, ist raus; danach schließen die Fallen (`TRAPS CLOSED`). Fallen zwei
    zugleich, wird die nächste Bahn zur `SAFE STAGE`.
  - Hängenbleiben: Nach 3 s ohne Fortschritt ein kleiner Stoß (höchstens drei), nach 12 s gilt die Murmel als Letzte.
    In Trommel, Ringen und Labyrinth zählt Kreisen nicht als Hängen.
  - Finale zu dritt: Platz 1 bis 3 nach Zielzeit, ein Sturz zählt als letzter Platz; danach das Podest.
  - Kapitelzeiten je Bahn für die Videobeschreibung (englisch, zum Beispiel `Stage 4: Crumbling Bridge`).
- `src/scenarios/knockout.js`: Szenario **„Marble Knockout (in Arbeit)“** in der Oberfläche.
  - Ablauf: ganzes Rennen, eine Bahn oder Galerie der Bausteine.
  - Schalter: Short-Bahnen (hochkant), Bahn, Baustein, Zeitlupe, Krone und Warnring, Anzeige, Videoende.
  - Videoende „mit dem Rennende“: Die Länge wird vor dem Export aus dem Ablauf berechnet (bis zum Ende des Podests).
  - Ausschnitte (`--clip-start`, `--clip-duration`) sind freigegeben, weil der Renderer keinen Zustand zwischen
    Bildern hält.
  - Quadrat 1:1 zeigt das Querformat mit Rand oben und unten. Hochkant zeigt bis zu den Short-Bahnen (M7) die
    Galerie.
- Werkzeug: `node scripts/knockout-lab.mjs check --runs 100` fährt viele freie Rennen und fasst sie zusammen.

**Unterwegs behoben:**

- **Finale:** Zwischen Schanze und Brücke lag eine Lücke von gut einer Murmelbreite über der Grube. Alle drei fielen
  hinein, bevor die Brücke überhaupt einstürzte. Jetzt beginnt die Brücke wie auf Bahn 4 direkt hinter einer flachen
  Kante. Die Wippe hat keine Pfosten mehr und kippt stärker (0,26 rad, 6 s Takt); vorher pendelte eine einzelne
  Murmel bis zu 25 s. Die Zielgerade hat 5° statt 3°, sonst schob das Drehkreuz eine langsame Murmel im Takt immer
  wieder zurück.
- **Schlag der Planken:** Die Geschwindigkeit bewegter Teile wird aus der Lage kurz davor und danach geschätzt.
  Springt die Lage genau dazwischen (Planke: Wackeln → Fallen), ergab das über 200 rad/s, und die Planke schlug eine
  Murmel quer über die Bahn in den Zielbehälter. Jetzt gilt bei einem Sprung die glatte Seite. Für glatte Bewegungen
  bleibt jede Zahl gleich.
- **Bahn 1 (`THE DROP`):** Bei der ersten Prüfung mit 100 Rennen blieb in jedem zweiten Rennen eine Murmel hängen.
  - Fünf breite Klappen ragten offen bis kurz über die erste Stiftreihe. Eine Murmel klemmte zwischen Klappe und
    Stift. Jetzt sind es zehn schmale Klappen.
  - Unter dem Trichter staute sich das Feld auf der flachen Reihe. Die Murmel ganz links wartete über 3 s und bekam
    einen Stoß. Jetzt fällt die Reihe unter dem Trichter mit 12° und wird erst danach flach. Der Trichter endet
    etwas höher.
  - In 100 Rennen hängt hier keine Murmel mehr (vorher 51). Die Bahn dauert im Mittel 21 s statt 25 s.
- **Bahn 7 (`HAMMER ALLEY`):** Die zweite Prüfung zeigte 6 Hänger in 100 Rennen.
  - Beim Schließen der Fallen schwenken die Hämmer hoch. Dabei nahm einer manchmal eine Murmel mit; sie lag dann
    für immer in der Ecke zwischen Stiel und Kopf. Jetzt stößt ein Hammer 1,2 s nach dem Schließen nicht mehr, die
    Murmel fällt zurück auf den Sims.
  - Eine Murmel, die schräg durch ein Loch fiel, verfehlte die schmale Grube und landete ohne Zieldurchgang im
    Zielbehälter. Die Gruben unter den Löchern sind jetzt so breit wie 4,4 Murmeln.
  - Nach der Kehre links blieb oft ein Paar übereinander liegen. Die Landestelle fällt jetzt mit 7°.

**Messung (100 freie Rennen, Seeds 1–100, Querformat):**

| Bahn | Bahnzeit min / Median / max | Aus | davon Sturz |
|---|---|---|---|
| 1 `THE DROP` | 19,8 / 20,8 / 22,7 s | 100 | 0 |
| 2 `TURNSTILES` | 32,8 / 35,6 / 43,9 s | 100 | 0 |
| 3 `THE WHEEL` | 27,0 / 28,1 / 30,4 s | 100 | 0 |
| 4 `CRUMBLING BRIDGE` | 27,0 / 28,3 / 32,8 s | 101 | 101 |
| 5 `TILT` | 25,1 / 28,9 / 34,9 s | 99 | 0 |
| 6 `THE DRUM` | 17,4 / 22,8 / 29,7 s | 100 | 0 |
| 7 `HAMMER ALLEY` | 19,1 / 21,5 / 32,3 s | 106 | 106 |
| 8 `SHIFTING FLOORS` | 14,4 / 17,6 / 21,3 s | 94 | 0 |
| 9 `RING ESCAPE` | 11,0 / 17,2 / 19,0 s | 100 | 0 |
| 10 `GRAND FINAL` | 21,5 / 23,1 / 34,1 s | – | – |

- In jedem Rennen scheiden genau neun Murmeln aus. Die Spalte „Aus“ schwankt je Bahn, weil ein Sturz auf einer
  Gefahren-Bahn die nächste Bahn zur `SAFE STAGE` macht.
- Festgefahren 0, Zeitlimit 0, Fehler 0. 230 kleine Stöße in 100 Rennen (2,3 je Rennen).
- Videolänge 266 / 277 / 290 s (min / Median / max). Prüfung in 406 s.
- Finale: Abstand zwischen Platz 1 und 2 im Median 0,80 s, in 58 von 100 Rennen unter 1 s.
- Verlauf: erste Prüfung 51 Hänger auf Bahn 1, zweite 6 auf Bahn 7, dritte keiner.

**Grenzen:**

- Ein Rennen dauert rund 4,6 Minuten. Der Plan nannte rund 9 Minuten als Startwert. Längere Bahnen oder mehr Reihen
  sind möglich; das ist eine der Fragen am Ende.
- Die Zeitlupe löst in freien Rennen fast nie aus. Ihre Schwelle wird mit der Darstellung (M5) eingestellt.
- Steht eine Murmel auf einer anderen in einer Ecke, ruht das Paar bis zum ersten Stoß nach 3 s.
- Short-Bahnen, Ton, Drehbuch und Vorlagen folgen in M6 bis M8.

**Nachweise:**

- `test/knockout.test.mjs`, 5 Tests grün: Anmeldung und Einstellungen, ganzes Rennen mit 10 Bahnen, 9 Aus, Podest
  und Kapiteln, gleicher Seed gleiches Rennen, Zeichnen ändert den Zustand nicht, Länge aus dem Ablauf.
- `test/knockout-elements.test.mjs` bleibt grün (3 Tests).
- Export über die echte Oberfläche: 4 s, 720p, ohne Fehler (lokal `output/knockout-lab/app-probe.mp4`).
- Szenario-Listen in vier Browser-Tests um `knockout` ergänzt; diese Tests liefen hier nicht.

---

## M5 · Darstellung, Zeitlupe, Seek-Prüfung (25.11.2026)

**Umfang:**

- Abgrund: Gruben, in denen man ausscheidet, sind kein hartes schwarzes Rechteck mehr, sondern ein weicher Schacht,
  der nach unten dunkel wird. Ein vorderer Rand liegt über den Murmeln, damit sie sichtbar hineinfallen.
- Brücke: Pfosten an beiden Enden, Seil mit Hängern, Planken mit Maserung, Staub beim Lösen einer Planke, Lampen an
  den Pfosten (rot, solange die Fallen offen sind, grün nach `TRAPS CLOSED`).
- Murmeln: kurze Spur hinter schnellen Murmeln, je schneller, desto länger; in der Zeitlupe passend kürzer.
- Rütteln: Bekommt eine Murmel einen Stoß, zittern 0,45 s lang kleine Striche links und rechts unter ihr.
- Ziel: kurzes Glitzern an der Ziellinie für jede Murmel, die durch ist.
- Zeitlupe: weicher dunkler Rand, im Langvideo klein `SLOW MOTION` oben in der Mitte. Sie wirkt nur während des
  Rennens; im Zwischenstand läuft alles wieder normal.
- Einzelne Bahn: Die Anzeige zeigt die Nummer im ganzen Rennen (zum Beispiel `STAGE 4/10`) statt `1/1`.
- Feste Teile werden je Bahn einmal in zwei Ebenen gezeichnet (hinter und vor den Murmeln). Ihr Inhalt hängt nur an
  der Bahn, nicht an der Zahl gezeichneter Bilder.
- Alle neuen Effekte lesen nur den Zustand der Simulation (Geschwindigkeit, Zeit seit Stoß, Zielzeit). Kein Zustand
  im Renderer, die Seek-Regel gilt.

**Zeitlupe, abweichend vom Plan:**

- Plan: letzte zwei Murmeln innerhalb von 3 Murmelbreiten vor dem Ziel und weniger als 0,15 s auseinander. Damit
  löste sie in zehn Rennen kein einziges Mal aus.
- Jetzt: Zielbereich 4 Murmelbreiten, Abstand unter 0,35 s, höchstens drei je Video.
- Finale: eigene Zeitlupe mit Abstand unter 0,8 s (Platz 1 und 2 liegen im Median 0,8 s auseinander). Sie zählt
  nicht zu den drei.

**Unterwegs behoben:**

- Stürzte im Finale eine Murmel, zählte das wie ein Zieleinlauf. Die Zeitlupe für den Kampf um Platz 1 war damit
  abgeschaltet. Jetzt zählt nur ein echter Zieldurchgang.

**Messung (30 freie Rennen, Seeds 1–30, Querformat):**

- Zeitlupen: 44 in 30 Rennen, je Rennen 0 / 1 / 4 (min / Median / max), 5 Rennen ohne.
- Verteilung: Finale 15, Bahn 9 10, Bahn 8 7, Bahn 6 6, Bahn 3 5, Bahn 2 1.
- Vorher (Plan-Schwellen): 0 in 10 Rennen; mit 4 Breiten und 0,35 s, aber ohne Finale-Regel: 30 in 30 Rennen, davon
  1 im Finale.

**Grenzen:**

- Die Zeitlupe verlangsamt die Physik. Ein Rennen mit Zeitlupe dauert deshalb ein paar Sekunden länger.
- Auf Bahnen 1, 4, 5 und 7 löst sie selten aus, weil dort das Feld vor dem Ziel weit auseinanderliegt.
- Die Bilder wurden als Bildbögen geprüft (lokal `output/knockout-lab/m5-*.jpg`), nicht als ganzes Video.

**Nachweise:**

- `test/knockout-browser.test.mjs` (neu), 3 Tests grün in 12,5 min:
  - Chromium rechnet dasselbe Rennen wie Node (Zustands-Hash nach 20, 95 und 170 s, Seed 4).
  - Seek-Regel: Sprung und durchgehende Wiedergabe ergeben an zwölf Zeitpunkten dasselbe Bild (Seed 2).
  - Querformat, Hochformat und Quadrat zeichnen ohne Fehler; mit Anzeige aus bleibt nur die Bahn stehen.

---

## M6 · Ton (25.11.2026)

**Umfang:**

- Weiche Marble-Works-Klänge und erzeugte Glockentöne, feste Mischung ohne Einmessung (Profil
  `marbleworks-soft-v1`, fester Pegel +1 dB, Spitze höchstens −6 dBFS). Keine neuen Sounddateien.

  | Ereignis | Klang |
  |---|---|
  | `winner` | aufsteigende Glocken (Fanfare), tiefer gestimmt |
  | `knockout`, `fall` | weiches „Plopp“ |
  | `finish` | kleiner Glockenton, je Platz etwas tiefer |
  | `gate` | weiches Holz-„Klonk“ |
  | `plank` | Holz, tief gestimmt |
  | `traps` | heller Glockenton |
  | `podium` | weicher Dur-Akkord |
  | `hit_track`, `hit_marble`, `peg`, `bumper` | Holz, Glas und Körper nach Aufprallstärke |
  | `flip`, `nudge` | leises Klicken |

- Mischplan: höchstens drei Klänge je 0,3 s. Die ersten acht Ereignisse haben Vorrang, Aufprälle füllen auf.
  Stereo nach Ort im Bild.
- Das Ziel-Ereignis trägt jetzt den Platz (c = Platz − 1), damit der Glockenton je Platz tiefer wird.

**Messung (20-s-Probe, Sekunde 10 bis 30 des Langvideos, Seed 1):**

- 475 Ereignisse, 134 Stimmen in 30 s.
- Mit +3 dB: −22,2 LUFS, Begrenzer bis −2,5 dB. Mit +1 dB: −24,0 LUFS, Begrenzer bis −0,5 dB. Gewählt: +1 dB.
- Lokal: `output/knockout-lab/m6-ton-long.mp4`.

**Grenzen:**

- Das Hörurteil liegt beim Nutzer. Ich kann nur messen.
- Ratschen am Drehkreuz und leises Raumrauschen aus dem Plan fehlen noch; dafür gibt es kein Ereignis.

**Nachweise:**

- `test/knockout.test.mjs`, neuer Test „Ton“: alle Klangdateien vorhanden, Zielton-Platz, höchstens drei Klänge je
  0,3 s, Starttor und Aus hörbar. 6 Tests grün.
- `test/knockout.test.mjs`, `test/knockout-elements.test.mjs`, `test/knockout-physics.test.mjs`: 15 Tests grün.

---

## M7 · Short-Bahnen, Casting, Vorlagen (25.11.2026)

**Umfang:**

- Drei Short-Fassungen im Hochformat (1080 × 1920, Murmeln mit 60 px Durchmesser), je drei Bahnen, 8 → 5 → 3 → 1.
  Jede Bahn dauert rund 10 s. Das Ziel ist eine Lichtschranke mit kleinem Becher.

  | Fassung | Lockruf am Anfang | Bahn 1 (8 → 5) | Bahn 2 (5 → 3) | Finale (3 → 1) |
  |---|---|---|---|---|
  | A | `PICK YOUR COLOR!` | THE DROP: Regal, Nagelfeld, Trichter, Drehkreuz | CRUMBLING BRIDGE: Schanze auf die Brücke über dem Abgrund | RING ESCAPE: drei gegenläufige Ringe |
  | B | `FOLLOW THE GOLD ONE!` | THE DRUM: Weiche, schaukelnde Trommel | HAMMER ALLEY: zwei Löcher unter Pendelhämmern | TILT: Wippe |
  | C | `WHO SURVIVES THE FLOORS?` | RED LIGHT, GREEN LIGHT: Schiebetor | SHIFTING FLOORS: drei wandernde Böden | ROTATING MAZE: drehendes Labyrinth |

- Das Hochformat zeigt jetzt das Rennen. Die Umleitung auf die Galerie ist entfernt.
- Lange Zeilen (Lockruf, `… IS OUT`, `… WINS!`, Bahntitel) werden auf 90 % der Bildbreite verkleinert.
- Casting-Skript `scripts/knockout-casting.mjs`: ganze Short-Rennen je Seed ohne Bild und Ton. Ein Seed ist
  vollständig, wenn
  - das Video höchstens 40 s lang ist,
  - das Finale knapp ist (Platz 1 und 2 unter 0,8 s oder Zeitlupe),
  - die Führung im Finale mindestens einmal wechselt (die neue Spitze muss 1 s vorn bleiben),
  - auf der Gefahrenbahn mindestens eine Murmel abstürzt (A, B),
  - bei B die goldene Murmel das Finale erreicht,
  - keine Murmel einen Stoß braucht oder festsitzt.
- Die geprüften Seeds stehen in `SHORT_CAST` (`src/scenarios/knockout.js`).
- Vorlagen:
  - Knöpfe „Short · drei Bahnen (rund 35 Sekunden)“ und „Langvideo · 10 Bahnen (rund 5 Minuten)“.
  - Dateien `presets/production/knockout-short.json` (Fassung A, Seed 47) und `knockout-long.json`.
  - Der Short nimmt den nächsten geprüften Seed der Fassung A. Beide enden mit dem Podest; die Länge ergibt sich aus
    dem Rennen.
- CI: neue Gruppe `export-knockout` mit dem Vorlagen-Exporttest (`test/presets-export-knockout.test.mjs`).

**Maßregeln aus den Proben (Hochformat):**

- Zwischen Reihenende und Kehrwand mindestens 1,7 Murmelbreiten.
- Zwischen äußerem Stift und Wand gut 1,4 Murmelbreiten.
- Unter einem Trichterhals rund 2 Murmelbreiten Luft bis zur nächsten Bahn.
- Die Ziellinie liegt vor jeder Stelle, an der eine Murmel in den Becher fallen kann.
- Schnelle Ausgänge (Labyrinth, Wippe, Turmwand) brauchen Seitenwände, sonst fliegen Murmeln aus dem Bild.

**Unterwegs behoben:**

- Brücke: Nach `TRAPS CLOSED` schnellten gefallene Planken von weit unten zurück und warfen eine Murmel über das
  Ziel. Der Fall endet jetzt in der Grube, die Planke kehrt von dort zurück.
- THE DRUM: Wer links aus der Trommel flog, landete ohne Bahn direkt im Becher, ohne die Ziellinie zu kreuzen, und
  bekam dort Stöße. Die Lichtschranke erfasst jetzt unsichtbar bis unter die linke Zulaufbahn. Ein Dach über dem
  Becher war der erste Versuch; daran klemmten die Murmeln an der Trommel.

**Messung (Casting, Seeds 1–200 je Fassung):**

| Fassung | vollständig | Länge Median (kürzeste) | Finale knapp | Führungswechsel | Sturz auf Gefahrenbahn | ohne Stoß |
|---|---|---|---|---|---|---|
| A | 134 (67 %) | 37,0 s (29,9 s) | 78 % | 94 % | 93 % | 100 % |
| B | 15 (8 %) | 38,3 s (32,6 s) | 82 % | 28 % | 100 % | 98 % |
| C | 23 (12 %) | 44,6 s (34,5 s) | 89 % | 87 % | – | 100 % |

- B: Die goldene Murmel erreicht das Finale in 44 % der Seeds.
- C: Nur 25 % der Rennen sind höchstens 40 s lang.
- In der Vorlage: A die besten 24, B alle 15, C alle 23.

**Langvideo nach dem Planken-Fix (100 Rennen, Seeds 1–100):**

- Bahnzeiten unverändert, Video 267 / 278 / 291 s (min / Median / max).
- Ein Hänger: Seed 55, im Finale bleibt eine Murmel vor dem zweiten Drehkreuz liegen und scheidet nach 12 s als
  Letzte aus. Die Stelle liegt vor der Brücke, der Fix ist also nicht die Ursache. Ohne Zeitlupe kommt sie nach drei
  Stößen frei. Das Drehbuch-Casting in M8 verwirft solche Seeds.

**20-s-Probe (Short A, Seed 47, 1080 × 1920, 30 fps, mit Ton):**

- Lockruf, THE DROP und der Anfang von CRUMBLING BRIDGE.
- 324 Ereignisse, −26,3 LUFS, Spitze −7,0 dBFS. Prüfung OK.
- Lokal: `output/knockout-lab/m7-short-A-seed47.mp4`, Bildbogen `m7-short-A-sheet.jpg`.

**Grenzen:**

- Alle Shorts sind länger als im Plan (25–35 s): A und B im Median 37–38 s, C 45 s. Das ist eine Geschmacksfrage.
- B: Die Wippe im Finale ergibt selten einen Führungswechsel; darum sind nur 15 Seeds vollständig.
- B, HAMMER ALLEY: Selten bleibt eine langsame Murmel vor der Lochkante liegen und braucht einen Stoß (4 von 200).
- Der Short ist mit −26 LUFS etwas leiser als das Langvideo (−24 LUFS), weil weniger klingt.
- Die Vorlage nimmt Fassung A. B und C wählt man über „Short-Bahnen“ und einen Seed aus `SHORT_CAST`.

**Nachweise:**

- `test/knockout.test.mjs`, neuer Test „Short“: je Fassung drei Bahnen mit 8, 5 und 3 Murmeln, Lockruf, Rennen
  endet unter 45 s, niemand sitzt fest, Invarianten. 7 Tests grün; mit `knockout-elements` 10 Tests grün.
- `test/knockout-browser.test.mjs`, neuer Test: Chromium rechnet dieselben Short-Rennen wie Node (A, B, C), die
  Vorlagen-Dateien gleichen der Oberfläche, die Short-Vorlage nimmt einen Casting-Seed. 4 Tests grün in 12,5 min.
- `test/presets-export-knockout.test.mjs` (neu): ganzer Produktionsweg über Knopf, Server und Download, je 3 s mit
  Ton. 2 Tests grün. Ohne Grafikkarte (wie in der CI) braucht das Querformat 244 s für 90 Bilder; die Zeitgrenze
  ist darum wie bei Marble Works 420 s.
- Casting: `node scripts/knockout-casting.mjs --short A --from 1 --to 200 --list` (ebenso B und C).

---

## M8 · Langvideo-Drehbuch, Vorlage, Finalprobe (25.11.2026)

**Umfang:**

- **Drehbuch:** Ein Drehbuch ist eine Liste mit einem Seed je Bahn (`params.script`). Es gilt nur zusammen mit seinem
  Grund-Seed, weil der die Aufstellung festlegt. Die Seitenleiste zeigt `Drehbuch: an`, `an (anderer Seed)` oder `aus`.
  Ohne Drehbuch läuft jeder Seed wie bisher als freies Rennen.
- **Geschichte** (Plan, Abschnitt 4):
  - Eine Außenseiterin entkommt dreimal knapp und steht am Ende auf dem Podest. Knapp heißt: Sie kommt als Letzte
    durch, weniger als 2,5 Murmelbreiten vor der Murmel, die ausscheidet. Außenseiterin ist die erste so knapp
    Gerettete auf Bahn 1 bis 3.
  - Der frühe Spitzenreiter stürzt auf Bahn 7 am Hammer. Spitzenreiter ist eine der drei besten Platzsummen auf
    Bahn 1 bis 3; mindestens einer davon bleibt bis Bahn 6 im Rennen.
  - Das Finale entscheidet ein Fotofinish: Platz 1 und 2 trennen weniger als 0,3 s.
  - Auf jeder Bahn: niemand sitzt fest, kein Zeitlimit, höchstens ein Stoß.
- **Casting** `node scripts/knockout-casting.mjs --long --from 1 --to 3 --tries 30`:
  - Bahn für Bahn. Für jede Bahn rechnet das Skript das Rennen mit dem bisherigen Drehbuch bis zum Beginn dieser
    Bahn und probiert von dort aus Kandidaten-Seeds. Zwischen den Bahnen trägt das Rennen nur Aufstellung,
    Ausgeschiedene, Zeit und Zeitlupen-Zähler, darum kann jeder Kandidat an dieser Stelle weiterrechnen.
  - Scheitern Bahn 7 oder das Finale, geht die Suche zurück auf Bahn 6 bzw. Bahn 9 und probiert dort andere gültige
    Varianten. Höchstens 2500 Probeläufe je Grund-Seed.
  - Zum Schluss rechnet eine Gegenprobe das ganze Rennen am Stück und prüft die Geschichte noch einmal.
- **Gecastete Drehbücher** in `LONG_CAST` (`src/scenarios/knockout.js`). Der erste Eintrag ist die Empfehlung.
- **Vorlage** „Langvideo · 10 Bahnen“: Grund-Seed 3 mit Drehbuch, Name „Marble Knockout – Langvideo (10 Bahnen,
  Drehbuch)“. Datei und Oberfläche sind gleich. Die Kapitel kommen wie seit M4 aus dem Ablauf.

**Messung: Wie knapp wird ein Finale?**

- 80 Finals (Grund-Seeds 1 und 7, je 40 Final-Seeds): Abstand Platz 1–2 kleinster Wert 0,234 s, 10 % unter 0,33 s,
  Median 0,96 bis 1,12 s. Keins unter 0,15 s, 5 % unter 0,3 s.
- Grund: Das zweite Drehkreuz kurz vor dem Ziel lässt die Murmeln nur einzeln durch und zieht das Feld auseinander.
- Mit der Plan-Schwelle 0,1 s (im Skript zuerst 0,15 s) fand die Suche darum nichts: Grund-Seed 1 scheiterte nach
  2500 Probeläufen in rund 20 min am Finale. Mit 0,3 s klappt es in 1 bis 2 min.

**Ergebnis (Grund-Seeds 1 bis 3, alle drei vollständig):**

| Grund-Seed | Probeläufe | Außenseiterin, knapp auf Bahn | stürzt auf Bahn 7 | Fotofinish | Podest | Video | Stöße |
|---|---|---|---|---|---|---|---|
| **3** (Vorlage) | 182 | YELLOW: 1, 2, 6 | RED | 0,277 s | GOLD, ORANGE, YELLOW | 281,7 s | 0 |
| 2 | 156 | GREEN: 1, 2, 3 | RED | 0,257 s | BLACK, GREEN, PINK | 275,5 s | 0 |
| 1 | 206 | GOLD: 1, 3, 6 | CYAN | 0,234 s | PURPLE, LIME, GOLD | 269,2 s | 1 (Bahn 1) |

- Empfehlung Seed 3: kein Stoß, und die dritte knappe Rettung kommt erst in der Mitte des Videos.
- Rechenzeit: Seed 1 in 116 s, Seeds 2 und 3 zusammen in 195 s.
- Kapitel von Seed 3: 0:00 The Drop, 0:24 Turnstiles, 1:02 The Wheel, 1:33 Crumbling Bridge, 2:04 Tilt, 2:34 The Drum,
  3:02 Hammer Alley, 3:27 Shifting Floors, 3:48 Ring Escape, 4:07 Grand Final, 4:33 Podium.

**20-s-Probe vom Finale (Vorlage, Seed 3, Sekunde 254 bis 274, 1920 × 1080, 30 fps, mit Ton):**

- Die drei Finalisten fahren dicht zusammen über Brücke, Kippbrett und Drehkreuz. Zeitlupe am Drehkreuz und im Ziel,
  dann `GOLD WINS!`.
- Ton der ganzen Episode: −26,8 LUFS, Spitze −6 dBFS, Begrenzer bis −0,4 dB. Prüfung OK. Export in 29 s (21 Bilder/s).
- Lokal: `output/knockout-lab/m8-finale-20s.mp4`, Bildbogen `m8-finale-sheet.jpg`.
- Dazu eine 20-s-Probe der Galerie (Schanze, Drehkreuze, Schaufelrad): `output/knockout-lab/m8-galerie-20s.mp4`.

**Grenzen:**

- Fotofinish heißt hier unter 0,3 s, nicht unter 0,1 s wie im Plan. Knapper ginge es nur mit einem anderen Zieleinlauf
  im Finale (ohne Drehkreuz kurz vor dem Ziel). Das ist eine Geschmacksfrage.
- Ein Drehbuch hängt an den Bahnen und der Physik. Jede Änderung dort kann es brechen; dann muss neu gecastet werden.
  Der Test „Drehbuch“ meldet das.
- In Seed 3 fahren GOLD und YELLOW zusammen im Finale. Die beiden Farben sehen sich klein im Bild sehr ähnlich.
- Das Langvideo dauert 4,5 bis 4,7 min statt der geplanten 9 min (wie seit M4).
- Der ganze Export lief nicht; der kommt nur auf Auftrag.

**Nachweise:**

- `test/knockout.test.mjs`, neuer Test „Drehbuch“: Seed 3 mit Drehbuch am Stück, niemand sitzt fest, YELLOW auf dem
  Podest, RED stürzt auf Bahn 7, Fotofinish unter 0,3 s, Vorlagen-Datei gleich der Oberfläche. 8 Tests grün in 26 s.
- Gegenprobe im Casting-Skript für alle drei Drehbücher: „Geschichte hält“.
- Nicht erneut gelaufen: Browser-Test (der Vorlagen-Vergleich steckt jetzt auch im Node-Test), Vorlagen-Exporttest,
  `npm run golden` und die Scrap-Hashes. M8 ändert kein anderes Szenario; beide liefen in M7 unverändert.

---

## M9 · Abschluss und gesammelte Geschmacksfragen (25.11.2026)

**Was jetzt da ist:**

- Szenario „Marble Knockout (in Arbeit)“ in der Oberfläche. Ablauf: ganzes Rennen, eine Bahn oder Galerie der
  Bausteine. Querformat: Langvideo mit 12 Murmeln auf 10 Bahnen. Hochformat: Short mit 8 Murmeln auf 3 Bahnen,
  Fassung A, B oder C.
- Vorlagen-Knöpfe „Short · drei Bahnen“ (Fassung A, Seed 47) und „Langvideo · 10 Bahnen“ (Seed 3 mit Drehbuch).
- Kommandozeile, der ganze Export nur auf Auftrag:

  ```bash
  node export.mjs --config presets/production/knockout-short.json --out output/knockout-short.mp4
  ```

  ```bash
  node export.mjs --config presets/production/knockout-long.json --out output/knockout-long.mp4
  ```

- Casting für neue Seeds: `node scripts/knockout-casting.mjs --short A` und `--long`.
- Tests: `test/knockout-physics`, `knockout-elements`, `knockout`, `knockout-browser`, `presets-export-knockout`.

**Proben (lokal, je 20 s):**

| Probe | Datei unter `output/knockout-lab/` |
|---|---|
| Short A, Seed 47, Lockruf und erste Bahnen | `m7-short-A-seed47.mp4` |
| Langvideo, Finale mit Fotofinish und Sieg | `m8-finale-20s.mp4` |
| Galerie: Schanze, Drehkreuze, Schaufelrad | `m8-galerie-20s.mp4` |

**Gesammelte Geschmacksfragen** (mit Empfehlung; gebaut ist jeweils die Empfehlung):

1. **Name im Video:** „Marble Knockout“ oder ein anderer Titel? Empfehlung: so lassen.
2. **Murmelnamen:** Farbwörter (`RED`) oder Fantasienamen (`RUBY`, `JADE`)? Empfehlung: Farbwörter, die liest man sofort.
3. **Geschichte im Langvideo:** Außenseiterin aufs Podest (gebaut) oder lieber offen? Welche der drei Fassungen:
   Seed 3 (YELLOW, Empfehlung), Seed 2 (GREEN) oder Seed 1 (GOLD)?
4. **Krone und roter Ring:** Krone für die Führende, roter Ring für die Letzte. Hilfreich oder zu viel? Empfehlung:
   lassen.
5. **Feldgröße:** 12 Murmeln (gebaut) oder 16? Empfehlung: 12, das bleibt lesbar.
6. **Musik:** keine (gebaut) oder sehr leise? Empfehlung: keine.
7. **Länge Langvideo:** 4,5 bis 4,7 min statt der geplanten 9 min. Empfehlung: so lassen; länger ginge mit
   16 Murmeln oder einer zweiten Runde.
8. **Länge Shorts:** A und B rund 37 s, C rund 45 s (Plan: 25 bis 35 s). Empfehlung: A und B so lassen, C kürzen.
9. **Fotofinish:** unter 0,3 s statt unter 0,1 s. Knapper ginge es nur mit einem anderen Zieleinlauf im Finale.
   Empfehlung: so lassen, die Zeitlupe zeigt den Abstand.
10. **GOLD und YELLOW** sehen sich klein im Bild sehr ähnlich. Empfehlung: YELLOW heller und zitroniger machen, vorher
    als Vorschau-Bild zeigen.
11. **Lautstärke:** Short −26 LUFS, Langvideo als Ganzes −27 LUFS, feste leise Mischung. Empfehlung: erst anhören;
    bei Bedarf +2 dB.
12. **Ton-Ergänzungen:** Ratschen am Drehkreuz und leises Raumrauschen fehlen noch. Empfehlung: nur nachrüsten,
    wenn beim Anhören etwas fehlt.
13. **Nächste Schritte:** ganzer Export von Short und Langvideo (nur auf Auftrag); danach neue Bahnen oder weitere
    Short-Fassungen.

**Grenzen:**

- Der Name in der Oberfläche trägt noch „(in Arbeit)“, bis der Nutzer Short und Langvideo abgenommen hat.
- Weder Short noch Langvideo sind ganz exportiert; es gibt nur die 20-s-Proben.

---

## G1 · Gesamtlevel: Grundlage und erste Abschnitte (25.11.2026)

Teil 2 nach dem [Gesamtlevel-Plan](MARBLE_KNOCKOUT_GESAMTLEVEL_PLAN_2026-11-25.md). Wunsch des Nutzers: vor dem ganzen
Export je ein spannendes Gesamtlevel mit Kamerafahrt, mit viel Action und vielen Murmeln.

**Umfang:**

- **Neuer Ablauf** „Gesamtlevel mit Kamerafahrt (in Arbeit)“ (`mode=level`) in eigener Datei
  `src/scenarios/knockout/levelsim.js`. Das Format wählt das Level: Hochformat **THE TOWER** (16 Murmeln, r 28),
  Querformat **THE GAUNTLET** (20 Murmeln, r 24).
  - Abweichung vom Plan: Dort stand `course: 'level'` in `simulation.js`. Als eigene Klasse bleibt der alte Ablauf
    „Bahn für Bahn“ sicher unverändert. Physik, Ton, Zeitlupe und Stöße übernimmt die neue Klasse vom alten Ablauf.
- **Level-Bau** (`level.js`): Alle Abschnitte stehen in einer Physikwelt und werden in Welt-Koordinaten gebaut. Der
  Bau prüft, dass jeder Abschnitt an den vorigen anschließt (höchstens 1 E Versatz), und legt eine Ideallinie über das
  ganze Level.
- **Schleuse** am Ende jedes Abschnitts: Becken mit Lichtschranke, eine Lampe je Platz, Rückwand, Deckel, Aus-Rinne mit
  Grube `OUT`, Klappboden.
  - Wer durch die Lichtschranke fällt, ist weiter. Quote = kleinerer Wert aus Plätzen und Feld minus Stürze.
  - Ist die Quote voll, fährt der Deckel in 0,3 s zu. Alle anderen sind raus und rollen über den Deckel ins Aus.
  - Nach 0,5 s (Turm) bzw. 1,2 s (Gauntlet) klappt der Boden in 0,25 s auf, das Feld fällt in den nächsten Abschnitt.
  - Nachzügler, die 5 bzw. 6 s nach dem Schließen noch rollen, verschwinden durch eine Klappe.
  - Planwerte waren Deckel 0,25 s und Boden 0,6 s offen; gebaut ist, was in den Proben ruhig aussah.
- **Kamera** (`camera.js`) als Simulationszustand (Seek-Regel): Ruhezone, kritisch gedämpfte Feder, Höchsttempo,
  langsamer und begrenzter Zoom, nie außerhalb der Welt. Regie:
  - Start auf dem Regal.
  - Erste Hälfte eines Abschnitts: Spitzengruppe mit Vorschau nach vorn.
  - Zweite Hälfte: Kampf um den letzten freien Platz zusammen mit dem Becken.
  - Beim Schließen hält sie auf der Schleuse.
  - Querformat mit Schalter „Kamera“: **Fahrt** (folgt dem Feld) oder **Abschnitte** (ganzer Abschnitt fest im Bild,
    gleitet bei der Freigabe weiter, darf dafür bis Zoom 0,62 heraus). Das Short hat nur die Fahrt, ohne
    Seitwärtsbewegung.
- **Bild** (`LevelPainter` in `renderer.js`):
  - Hintergrund, Bahnen und Stifte liegen in Welt-Kacheln zu 512 E, bewegte Teile werden je Bild gezeichnet.
  - Einblendungen englisch: Lockruf, Titelkarte, `STAGE 1`, `20 LEFT · TOP 17`, `RED, NAVY & BROWN ARE OUT`,
    `8 ARE OUT`.
  - Roter Ring für alle unter der Schnittlinie, Krone für die Führende.
- **Ton:** Ereignisse tragen Bild- und Weltlage. Klänge außerhalb des Bildes sind leiser: ×0,25 bis eine halbe
  Bildbreite daneben, sonst ×0,1.
- **Murmeln:** 20 Farben.
  - Fünf tragen ein weißes Band (NAVY, SKY, LILAC, MAROON, TEAL), SILVER ist metallisch.
  - YELLOW ist heller und zitroniger (`#f2ec3a`). Das beantwortet Frage 10 aus M9, gilt aber nur im Gesamtlevel.
- **Erster Abschnitt „THE DROP“ je Level:**
  - Turm: Regal, Nagelfeld über die ganze Breite mit drei Bumpern, Dach mit zwei Drehkreuzen, zwei Rückläufe, Rampe
    (10°) in die Schleuse `TOP 8`.
  - Gauntlet: Regal, Nagelwand mit drei Bumpern, zwei Trichter auf eine gemeinsame Spur, Nagelkasten, Rampe (7°) in
    die Schleuse `TOP 17`.
  - Danach je eine Auffangschale „TO BE CONTINUED“, bis die übrigen Abschnitte gebaut sind.
- **Abweiser an den Wänden der Nagelfelder:** kurze Schrägen in jeder versetzten Reihe.
  - Ohne sie fielen im Turm in jedem Lauf die zwei äußeren Murmeln an der Wand entlang durch, ohne einen Stift zu
    berühren (24 von 24 in 12 Läufen).
  - Mit Abweisern: 0. Von der Spitze bis zum nächsten Stift bleibt über 1,4 d frei.
- **Werkzeuge:**
  - `node scripts/knockout-lab.mjs level --runs 12 --aspect 9:16` (Messwerte je Lauf, `--cam sections` fürs
    Querformat).
  - `scripts/knockout-frames.mjs --mode level --cam ride|sections`.
  - Neu: `scripts/knockout-colors.mjs` (Farbtafel).

**In den Proben gefunden und geändert:**

- Turm: Mit 6° Rampe stauten sich die Murmeln unter dem Trichterhals. Jetzt 10°.
- Gauntlet: Ein Drehkreuz auf der gemeinsamen Spur ließ die Murmeln nur einzeln durch; das Feld stand rund 10 s in
  einer Reihe. Jetzt ein Nagelkasten statt des Drehkreuzes (Abweichung vom Plan).
- Gauntlet: Das Regal lag unter der Anzeige oben. Die Welt reicht jetzt höher, die Start-Kamera steht tiefer.
- Gauntlet: Eine schon qualifizierte Murmel sprang aus der Auffangschale. Die Schale hat links jetzt eine hohe Wand.

**Messwerte (Labor, 12 Läufe je Format, Seeds 1 bis 12, Kamera „Fahrt“):**

| | Turm (9:16) | Gauntlet (16:9) |
|---|---|---|
| Schleuse zu (Median) | 11,6 s | 16,1 s |
| Abstand Letzte drinnen zu Erster draußen (Median, in Murmelbreiten) | 3,5 | 4,0 |
| Platzwechsel je 10 s (Median) | 264 | 297 |
| Längste Zeit ohne Platzwechsel (größter Wert) | 1,0 s | 3,5 s |
| Führende im Bild (Median) | 100 % | 100 % |
| Aus im Bild | 96 von 96 | 36 von 36 |
| Stöße / festgefahren / Fehler | 5 / 0 / 0 | 0 / 0 / 0 |

- Platzwechsel: alle 0,5 s die Summe der Rangänderungen, halbiert.
- Führungswechsel je Lauf (Stichprobe aus je 6 Läufen): Turm 11 bis 24, Gauntlet 13 bis 20.
- Die Physik hängt nicht an der Kamera. Mit „Abschnitte“ sind alle Werte gleich, auch Führende und jedes Aus im Bild.

**Probeclips (lokal unter `output/knockout-lab/`, Seed 1, mit Ton):**

| Clip | Datei | Länge | Ton |
|---|---|---|---|
| Turm, 9:16, Fahrt | `g1-tower-20s.mp4` | 14,8 s (der Lauf endet nach dem ersten Abschnitt) | −23,3 LUFS |
| Gauntlet, 16:9, Fahrt | `g1-gauntlet-fahrt-20s.mp4` | 20 s | −23,6 LUFS |
| Gauntlet, 16:9, Abschnitte | `g1-gauntlet-abschnitte-20s.mp4` | 20 s | −23,6 LUFS |
| Farbtafel aller Murmeln in Videogröße | `g1-colors.png` | | |

Befehl, zum Beispiel für die Fassung „Abschnitte“ (`videoEnd=free` begrenzt den Clip auf `--duration`):

```bash
node export.mjs --scenario knockout --seed 1 --param mode=level --param cam=sections --param videoEnd=free --duration 20 --aspect 16:9 --out output/knockout-lab/g1-gauntlet-abschnitte-20s.mp4
```

**Grenzen:**

- Je Level steht nur der erste Abschnitt, danach die Auffangschale. Der Turm-Lauf endet darum nach rund 15 s.
- Der Kampf um den letzten Platz ist noch nicht knapp: im Median 3,5 bzw. 4 Murmelbreiten Abstand, nie unter 1.
  Knappe Entscheidungen kommen mit dem Casting (G3, G6).
- In G2 folgen: Tiefen-Ebenen, Streckenleiste, Ton nach Bildlage im Stereo, Sichern und Laden, Node = Chromium und
  die Seek-Prüfung mit Kamera.
- Nachzügler rollen nach dem Schließen langsam über den Deckel; im Clip sind einige am Ende noch zu sehen.
- Die Vorlagen-Knöpfe zeigen weiter auf „Bahn für Bahn“ (Plan: bis G3 bzw. G6).

**Nachweise:**

- `test/knockout-level.test.mjs`, neu, 7 Tests grün in rund 24 s:
  - Einstellungen und Level-Bau.
  - Ablauf Turm (Seeds 1 und 2) und Gauntlet in beiden Kamera-Fassungen. In jedem Schritt geprüft: Zoom im Rahmen
    und langsam, Tempo begrenzt, Bild nie außerhalb der Welt. Dazu Quote, Freigabe, jedes Aus im Bild, kein Hänger.
  - Gleicher Seed ergibt denselben Hash samt Kamera.
  - Zeichnen verändert den Zustand nicht.
- `test/knockout.test.mjs`: 8 Tests grün, der alte Ablauf ist unverändert.
- `npm run golden`: identisch mit der Referenz (36 Fälle).
- Nicht gelaufen: Browser-Test mit Kamera (kommt in G2), Scrap-Hashes (Scrap unberührt), voller `npm test`.

**Stopp:** Der Nutzer wählt die Kamera fürs Querformat (Fahrt oder Abschnitte) und sagt, ob Action und Feldgröße
passen. Danach geht es mit G2 weiter.
