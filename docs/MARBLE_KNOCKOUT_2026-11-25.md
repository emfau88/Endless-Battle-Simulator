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
| M5 bis M9 | **Offen** |

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
