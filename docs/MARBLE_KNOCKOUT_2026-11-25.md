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
| G1 Gesamtlevel: Grundlage und erste Abschnitte | **Erledigt** (25.11.). Der Nutzer hat für das Querformat die Kamera **„Fahrt“** gewählt. |
| G2 Bild fertig, Ton nach Bildlage, Sichern und Laden | **Erledigt** (25.11.) |
| G3 THE TOWER komplett, Casting, Vorlage „Short · Turm“ | **Erledigt** (25.11.) |
| G4 THE GAUNTLET Abschnitte 1 bis 5 | **Erledigt** (26.11.) |
| G5 THE GAUNTLET komplett, Einstiegsflug, Podest | **Erledigt** (26.11.) |
| G6 Drehbuch-Casting, Vorlage „Langvideo“ | **Erledigt** (26.11.) |
| G7 Abschluss Teil 2, Geschmacksfragen | **Erledigt** (26.11.). Offen: Antworten des Nutzers, ganzer Export nur auf Auftrag. |
| G8 Gruben: OUT-Kiste, Schacht mit Rahmen, Abgrund | **Erledigt** (26.11.) |
| CI: Knockout-Prüfungen im Zeitbudget | **Erledigt** (26.11.), CI-Lauf nach dem Push entscheidet |

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
  Seit G3 heißt der Short-Knopf „Short · Turm“ und startet das Gesamtlevel THE TOWER (siehe Abschnitt G3).
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

**Entscheidung (25.11.):** Kamera im Querformat ist die **Fahrt**. „Abschnitte“ bleibt als Schalter erhalten. Zu
Action und Feldgröße gab es keine Antwort; es bleibt bei der Empfehlung (16 und 20 Murmeln).

---

## G2 · Gesamtlevel: Bild fertig, Ton nach Bildlage, Sichern und Laden (25.11.2026)

**Umfang:**

- **Hintergrund in drei Ebenen** (Plan Teil 2, Abschnitt 6). Alle hängen nur an der Lage, nie an der Bildzahl:
  - Tiefe in Welt-Koordinaten: oben warmes Abendlicht, unten tiefes Blau. Ein goldener Schimmer ist für das Finale
    vorbereitet (`level.gold`).
  - Weite Ebene, läuft 0,15-fach mit: Punktraster und weiche Lichtflecken.
  - Gerüst, läuft 0,5-fach mit: Stützen, Querbalken und Streben aus dunklem Holz, Lage aus der Hash-Funktion. Es
    steht mit 38 % Deckkraft hinter der Bahn; mit den 60 % aus dem Plan lenkte es zu sehr ab.
  - Die Kacheln tragen jetzt nur noch die Bahn und sind sonst durchsichtig.
- **Streckenleiste** (nur Querformat) unten über die Bildbreite: ein Punkt je Murmel auf der Ideallinie, ein Strich je
  Schleuse, eine rote Linie zwischen dem letzten Platz der Quote und dem ersten Platz draußen.
- **Einblendungen** im Rennen, englisch:
  - `NEW LEADER: MINT`: nur wenn die neue Führende die Spitze 1 s hält. Verliert sie sie vorher wieder, verschwindet
    die Zeile.
  - `GOLD +12 PLACES!`: wer in 2 s mindestens 5 Plätze gutmacht (Hochformat: 4).
  - Höchstens eine Zeile je 4 s und nur, solange die Schleuse offen ist.
- **Ton nach Bildlage:**
  - Jedes Ereignis trägt seine Lage im Bild und in der Welt. Das Stereo-Panorama kommt aus der Lage im Bild.
  - Außerhalb des Bildes wird es leiser: bis eine halbe Bildbreite daneben 25 %, weiter weg 10 %.
  - Die Dichtegrenze aus M6 bleibt (höchstens drei Klänge je 0,3 s).
  - Abweichung vom Plan: kein neues Ereignis `slot`. Jedes Lämpchen der Schleuse klingt mit dem vorhandenen
    Ziel-Glockenton, je Platz einen Ton tiefer.
- **Seed je Abschnitt** (für das Drehbuch-Casting in G6):
  - Jeder Abschnitt baut mit einem eigenen Zufallsstrom. Der Seed kommt aus Grund-Seed, Abschnitts-Name, Nummer und
    dem Drehbuch-Wert `params.script[i]`.
  - Ein anderer Seed für einen späteren Abschnitt ändert nichts davor.
- **Zustand sichern und laden** (`saveState`, `loadState`):
  - Gesichert werden Rennstand, Murmeln, Lage der bewegten Körper, Zustand der Bausteine, Kamera und Ereignisse.
  - Bausteine mit Zustand ohne Eintrag in der Liste `STATE_KEYS` lösen einen Fehler aus. So geht beim Bau neuer
    Bausteine nichts unbemerkt verloren.

**Messwerte (Labor, 12 Läufe je Format, Seeds 1 bis 12, Kamera „Fahrt“):**

| | Turm (9:16) | Gauntlet (16:9) |
|---|---|---|
| Schleuse zu (Median) | 11,9 s | 16,1 s |
| Abstand Letzte drinnen zu Erster draußen (Median, in Murmelbreiten) | 3,0 | 4,0 |
| Platzwechsel je 10 s (Median) | 248 | 297 |
| Längste Zeit ohne Platzwechsel (größter Wert) | 1,5 s | 3,5 s |
| Führende im Bild (Median) | 100 % | 100 % |
| Aus im Bild | 96 von 96 | 36 von 36 |
| Stöße / festgefahren / Fehler | 5 / 0 / 0 | 0 / 0 / 0 |

- Die Turm-Werte haben sich gegenüber G1 leicht verschoben, weil jeder Abschnitt jetzt seinen eigenen Zufallsstrom
  hat. Der Gauntlet ist gleich geblieben.
- Ein Bild im Gesamtlevel kostet im Browser ohne Grafikkarte knapp 3 s, im alten Ablauf 1,5 s. Grund sind die
  bildfüllenden Ebenen. Beim Export mit Grafikkarte fällt das nicht ins Gewicht.

**Bildblatt:** `output/knockout-lab/g2-tower.jpg` und `g2-gauntlet.jpg` (lokal, Seed 2):

```bash
node scripts/knockout-frames.mjs --mode level --aspect 16:9 --seed 2 --times 2,5,8,11,14,16.5,18,19.5 --out output/knockout-lab/g2-gauntlet.jpg
```

**Grenzen:**

- Die Seek-Prüfung im Browser läuft an sechs statt zwölf Zeitpunkten je Format. Mit zwölf hätte der Test ohne
  Grafikkarte über 20 Minuten gedauert.
- Noch kein neuer Probeclip. Die nächste 20-s-Probe kommt mit dem fertigen Turm (G3).
- Weiter offen aus G1: Nachzügler rollen nach dem Schließen langsam über den Deckel; die Vorlagen-Knöpfe zeigen noch
  auf „Bahn für Bahn“.

**Nachweise:**

- `test/knockout-level.test.mjs`: 9 Tests grün. Neu:
  - Sichern bei 6 s, weiter bis 13 s. Laden in eine neue Simulation und in dieselbe ergibt denselben Hash, dieselben
    Ausgeschiedenen, Einblendungen und Abschnitte wie das Rennen am Stück.
  - Drehbuch: Ein anderer Seed für Abschnitt 2 ändert bei 9 s nichts.
- `test/knockout-browser.test.mjs`, neuer Test „Gesamtlevel (G2)“, grün in rund 4 min:
  - Chromium rechnet in beiden Formaten bei 5 und 12 s denselben Hash wie Node.
  - Seek-Regel mit Kamera: An sechs Zeitpunkten je Format gleicht das Bild nach einem Sprung dem Bild nach
    durchgehender Wiedergabe.
- `test/knockout.test.mjs`: 8 Tests grün, der alte Ablauf ist unverändert.
- Nicht gelaufen: die übrigen Browser-Tests (alter Ablauf unberührt), `npm run golden` (keine Änderung an Physik
  oder altem Ablauf), Scrap-Hashes, voller `npm test`.

---

## G3 · THE TOWER komplett, Casting, Vorlage „Short · Turm“ (25.11.2026)

**Umfang:**

- **Abschnitt 2 `FALLING FLOORS` (8 → TOP 4):**
  - Drei wandernde Böden zwischen zwei inneren Wänden. Jeder fällt zu einer Wand hin ab und endet dort offen. Die
    oberen zwei haben ein Loch als Abkürzung.
  - Darunter ein Sims mit einem Loch (Sturz = raus) und einer flachen Kante, dann die Schleuse links.
- **Abschnitt 3 `FINAL` (4 → 1):**
  - Trichter über die ganze Breite in einen Kanal, der von vorn in zwei Drehringe führt (Ringausbruch).
  - Darunter eine Fangbahn, dann eine Steilabfahrt mit zwei Mulden und die offene Zielgerade mit Ziellinie.
- **Ziel und Sieger im Ablauf:**
  - Wer die Ziellinie kreuzt, bekommt seinen Platz. Platz 1 ist Sieger, das Video endet 2,6 s danach.
  - Liegt Platz 2 weniger als 0,3 s dahinter, erscheint `PHOTO FINISH`.
  - Zeitlupe, wenn die beiden Ersten kurz vor dem Ziel dicht beieinander liegen. Die Kamera hält am Ende auf dem Ziel.
- **Bild:**
  - Ziellinie, Glitzern beim Zieldurchgang.
  - Karte `FINAL` mit `4 MARBLES. ONE WINNER.`, dann `PINK WINS!` und gegebenenfalls `PHOTO FINISH`.
  - Unter dem Ziel liegen rund 500 Einheiten frei. So steht das Ziel am Ende bei drei Vierteln der Bildhöhe statt am
    unteren Rand.
- **Startregal:** Die äußeren Startplätze haben jetzt einen kleinen Rand zur Wand. Vorher klemmte in zwei von drei
  Läufen die Murmel ganz links am Scharnier der ersten Klappe und brauchte nach 3,6 s einen Anstoß.
- **Gerüst im Hintergrund:** Die schrägen Streben sind jetzt gefüllte Vierecke statt dicker Striche (gleiche Form).
  Einen dicken Strich glättete Chromium im ersten Bild einer neuen Gegend etwas anders als in den Bildern danach. Die
  Seek-Prüfung im Finale hat das gezeigt (Abweichung höchstens 20 von 255 an den Kanten der Streben).
- **Casting:** `scripts/knockout-casting.mjs --level tower` prüft ganze Läufe. Ein Seed ist vollständig, wenn:
  - das Video höchstens 40 s lang ist;
  - eine Schleuse knapp schließt (unter 1,5 Murmelbreiten) oder jemand stürzt;
  - das Finale knapp ist (unter 0,8 s oder Zeitlupe);
  - die Führung im Finale wechselt;
  - niemand einen Anstoß braucht.
- **Vorlage:** Der Knopf „Short“ heißt jetzt „Short · Turm (rund 38 Sekunden)“ und startet den Turm.
  - Seeds kommen aus der Liste `TOWER_CAST`: die acht vollständigen Seeds mit echtem Fotofinish.
  - Die Vorlage nimmt Seed 59.
  - Das Rennen „Bahn für Bahn“ bleibt über „Ablauf“ wählbar.

**Abweichungen vom Plan (nach Messung, je 8 Läufe):**

| Plan | Messung | Jetzt |
|---|---|---|
| Vier wandernde Böden | Abschnitt 2 dauerte im Median 28 s statt rund 10 | drei Böden mit 10° |
| Pendelhammer über dem Sims | staute in jeder Fassung das Feld und warf immer genau die ersten vier ins Loch | kein Hammer; flache Kante am Loch, meist ein bis zwei Stürze |
| Drei Ringe im Finale | hielten die Spitze 4 bis 8 s fest | zwei Ringe, der äußere mit zwei Schlitzen |
| Zielgerade mit 3° | Finale gut 1 s länger, selten knapp | 5°, Ziel etwas weiter vorn |
| Turm rund 11 500 Einheiten hoch | — | 5560 Einheiten (knapp drei Bildschirme) |

**Messwerte (Labor, 12 Läufe, Seeds 1 bis 12):**

| | Turm (9:16) |
|---|---|
| Schleuse 1 zu (Median) | 11,6 s |
| Abstand an der Schnittlinie, Schleuse 1 / Schleuse 2 (Median) | 3,2 / 4,6 Murmelbreiten |
| Sieg (Median, längster) | 33,9 s, 37,0 s |
| Abstand Platz 1 zu 2 (Median), unter 0,3 s | 1,39 s, 3 von 12 |
| Platzwechsel je 10 s (Median) | 270 |
| Längste Zeit ohne Platzwechsel (größter Wert) | 6,5 s |
| Führende im Bild / Aus im Bild | 100 % / 144 von 144 |
| Stöße / festgefahren / Fehler | 0 / 0 / 0 |

**Casting (Seeds 1 bis 200):** 23 vollständig (12 %).

| Prüfpunkt | erfüllt |
|---|---|
| Länge bis 40 s | 95 % |
| knappe Schleuse oder Sturz | 84 % |
| Finale knapp | 25 % |
| Führungswechsel im Finale | 61 % |
| ohne Anstoß | 99 % |

Die Länge liegt im Median bei 37,4 s. Fotofinish unter 0,3 s haben die Seeds 4, 9, 59, 109, 125, 137, 149 und 182.

**Proben (lokal, Seed 59 aus der Vorlage):**

- `output/knockout-lab/g3-tower-start-20s.mp4`: die ersten 20 s.
- `output/knockout-lab/g3-tower-end-20s.mp4`: 19,5 bis 39,5 s, das Finale mit `PINK WINS!` und `PHOTO FINISH`.
- Dazu die Bildblätter `g3-tower-sheet.jpg` und `g3-tower-end.jpg`.

```bash
node export.mjs --scenario knockout --seed 59 --param mode=level --param videoEnd=free --duration 20 --aspect 9:16 --out output/knockout-lab/g3-tower-start-20s.mp4
node export.mjs --config presets/production/knockout-short.json --clip-start 19.5 --clip-duration 20 --out output/knockout-lab/g3-tower-end-20s.mp4
```

**Grenzen:**

- Das ganze Short wurde nicht exportiert (nur auf Auftrag).
- Nur jeder vierte Lauf hat ein knappes Finale. Das Casting gleicht das aus: Die Vorlage nimmt nur Seeds mit
  Fotofinish.
- Die Schnittlinie an Schleuse 1 ist nie knapper als 1 Murmelbreite. Spannung an den Schleusen kommt eher über Stürze
  und die Zeitlupe.
- Weiter offen aus G1: Nachzügler rollen nach dem Schließen langsam über den Deckel.

**Nachweise:**

- `test/knockout-level.test.mjs`: 10 Tests grün. Neu:
  - Der Turm läuft bis zum Sieger, das Ende kommt 2,6 s nach dem Sieg, höchstens 45 s.
  - Die Vorlage „Short“ gleicht der Datei. Ihr Seed steht in `TOWER_CAST`, endet mit Fotofinish und braucht keinen
    Anstoß.
  - Das Zeichnen verändert den Zustand auch im Finale nicht.
- `test/knockout-browser.test.mjs`, Tests „Gesamtlevel (G2)“ und „Short (M7)“: grün in gut 3 min.
  - Die Seek-Prüfung im Turm hat jetzt zwei Zeitpunkte im Finale (26 s und 31,4 s, kurz nach dem Sieg). Das Bild
    nach einem Sprung gleicht dem nach durchgehender Wiedergabe.
  - Die Vorlagen-Dateien gleichen der Oberfläche.
- `test/knockout.test.mjs`: 8 Tests grün, der alte Ablauf ist unverändert.
- `npm run golden`: identisch mit der Referenz. Neue Schalter an Ringen und Startregal (`slots`, `pad`) ändern ohne
  Angabe nichts.
- Nicht gelaufen: Scrap-Hashes (Scrap unberührt), voller `npm test`.

## G4 · THE GAUNTLET Abschnitte 1 bis 5 (26.11.2026)

**Umfang:**

- **Abschnitt 2 `TURNSTILES` (17 → TOP 14):**
  - Ein Grat unter der Schleuse teilt das Feld auf zwei Spuren nach rechts (7°). Oben zwei Drehkreuze, unten eins.
  - Beide Spuren enden über dem **BIG DROP**: ein Schacht, rund 1650 E tief und 9,6 d breit, mit Stiften alle 3 d,
    vier Bumpern und Abweisern an beiden Wänden. Der Boden fällt mit 12° nach links in die Schleuse.
  - Die Naben der Drehkreuze sitzen 0,15 d höher als im Turm. Mit 20 Murmeln stand vor den Kreuzen eine Schlange, und
    die herabkommenden Armspitzen stießen die Erste immer wieder zurück (16 Läufe: 3 bis 8 Anstöße, jetzt keiner).
- **Abschnitt 3 `THE WHEEL` (14 → TOP 12):**
  - Neuer Baustein **Riesenrad** (`ferris`, im Plan das Hebe-Rad G3): 16 Gondeln auf einem Kreis mit 18 d Radius,
    0,07 Umdrehungen je Sekunde.
  - Der Zulauf (5°) endet über der Gondelbahn ganz rechts, wo die Gondeln senkrecht steigen. Wer am Anschlag wartet,
    wird mitgenommen, vier bis fünf je Gondel. Hinter dem Scheitel laufen die Gondeln durch eine Rinne; die Murmeln
    rollen nach links in die Schleuse.
  - Das Rad hebt das Feld rund 800 E. Die Kamera fährt mit, auch in der Fassung „Abschnitte“.
- **Abschnitt 4 `THE COLLAPSE` (12 → TOP 10, Sturz zählt):**
  - Unter der Schleuse eine feste Fangbahn (9°), dann eine Brücke mit 15 Planken über 1400 E nach links.
  - 3 s nachdem die Erste die Brücke betritt, bricht sie von hinten weg. Die Bruchkante wird von 300 auf 800 E/s
    schneller (neuer Schalter `speed` an der Brücke) und holt die Langsamen irgendwo auf der Brücke ein.
  - Darunter der Abgrund in vier überlappenden Stücken (eine Grube ist ein Rechteck, die Brücke ist geneigt).
  - Am Ende eine Kehre hinab auf die untere Bahn nach rechts in die Schleuse.
- **Abschnitt 5 `TILT` (10 → TOP 8):**
  - Fangbahn mit Schiebetor (1,6 s von 2,6 s offen), dann zwei Kippbretter übereinander, je 20 d lang.
  - Oben ist rechts ein mitkippender Rand, unten reicht das Brettende links in die Außenwand.
  - Beide Bretter haben eine Grundneigung von 0,1 zum offenen Ende (neuer Schalter `bias` am Kippbrett).
- Danach wie bisher die Auffangschale `TO BE CONTINUED`.
- **Bild:** Das Riesenrad hat Kranz, Speichen, zwei Stützen, Seile und Holzgondeln. Die Gondeln liegen in der Physik
  auf dem Kreis; gezeichnet wird das Rad 1,7 d höher, so hängt jede Gondel sichtbar an ihrem Drehpunkt.
- **Prüfregeln:**
  - Die Gondel hebt eine Murmel beim Einsteigen gewollt durch die feste Plattform. Für wenige Schritte steckt sie dabei
    in der Bahn. Die Invarianten-Prüfung erlaubt das jetzt, solange die Murmel in einer Gondel liegt.
  - Kamera-Kennzahl „Aus im Bild“: Schließt eine Schleuse, zählt das als ein Aus, nämlich die Erste draußen (der Kampf
    um den letzten Platz). Nachzügler weit dahinter, etwa noch im Rad, passen nicht mit ins Bild.

**Abweichungen vom Plan (nach Messung):**

| Plan | Messung | Jetzt |
|---|---|---|
| Hebe-Rad als großes Schaufelrad mit Gehäuse, Ø 1,5 B, hebt 1,5 B | Ein Schaufelrad dreht das Feld um; zwischen Rad und Schacht war dann kein Platz mehr. Erste Gondel-Fassung mit Einstieg bei 37°: Die Gondeln fuhren schräg in die Schlange und schoben sie zurück, 36 bis 50 s und Anstöße | Riesenrad mit Gondeln, Ø 1728 E, hebt rund 800 E; Einstieg ganz rechts, Schleuse im Median nach 11,7 s zu |
| Einsturz-Strecke mit 40 Planken, Start 2 s nach der Ersten, Bruchkante 300 → 650 E/s | Die zwei Langsamsten lagen beim Losbrechen noch unter der Schleuse und stürzten in jedem Lauf gleich am Anfang | feste Fangbahn, 15 Planken, 3 s, 300 → 800 E/s; Stürze überall auf der Brücke, 0 bis 3 je Lauf |
| Zwei Kippbretter ohne Zusatz | Murmeln rollten auf dem unteren Brett 30 s und länger hin und her; zwischen Wand und Brettende klemmte eine Murmel ein | Grundneigung 0,1, Brettende in der Wand, mitkippender Rand statt fester Wand |
| Welt 3 × 6 Bildschirme (5760 × 6480 E) | — | 5300 × 7600 E |
| Totale 0,8 beim Einsturz, Zoom 0,85 im Schacht | — | noch nicht; die Kamera folgt der Spitze und zeigt in der zweiten Hälfte Becken und Schnittlinie |

**Messwerte (Labor, 12 Läufe, Seeds 1 bis 12):**

| Abschnitt | Schleuse zu nach (Median, längster) | Abstand an der Schnittlinie (Median) | Stürze |
|---|---|---|---|
| 1 `THE DROP` | 15,9 s, 17,1 s | 3,7 Murmelbreiten | 0 |
| 2 `TURNSTILES` | 17,0 s, 18,2 s | 4,0 | 0 |
| 3 `THE WHEEL` | 11,7 s, 13,4 s | 7,9 | 0 |
| 4 `THE COLLAPSE` | 11,5 s, 13,5 s | 8,6 (2 von 10 unter 1,5) | 13 |
| 5 `TILT` | 26,4 s, 30,2 s | 24,2 | 0 |

| | Gauntlet (16:9) |
|---|---|
| Fünfte Schleuse offen (Median, längster) | 89,3 s, 95,4 s |
| Führungswechsel je Minute (Median) | 18,4 |
| Führende im Bild / Aus im Bild | 95 % / 68 von 71 |
| Stöße / festgefahren / Zeit um | 0 / 0 / 0 |

**Abnahme (Seeds 1 bis 100, bis zur fünften Schleuse):** 100 von 100 Läufen kommen durch, niemand bleibt hängen,
kein Zeitlimit. In 7 Läufen braucht eine Murmel einen Anstoß, sonst keinen. Die fünfte Schleuse öffnet nach 87 bis
95 s.

**Bildblatt (lokal):** `output/knockout-lab/g4-blatt.jpg`, Seed 2: Schacht, Rad, Einsturz, Kippbretter, Auffangschale.

```bash
node scripts/knockout-frames.mjs --mode level --seed 2 --times 26,39,43,52,55,67,76,86 --aspect 16:9 --out output/knockout-lab/g4-blatt.jpg
```

**Grenzen:**

- `TILT` dauert am längsten (Median 26 s), und die Schnittlinie ist dort nie knapp. Entschieden wird auf den Brettern.
- Auch am Rad ist die Schnittlinie nie knapp: Wer eine Gondel später einsteigt, liegt gleich weit zurück.
- 3 von 71 Aus waren nicht im Bild: zweimal lag die Erste draußen noch im Rad, einmal stürzte eine Murmel ganz links
  von der Brücke, während die Kamera schon an der Schleuse war.
- Eigene Kamerapunkte (Totale beim Einsturz) fehlen noch.
- Das Riesenrad steht noch nicht in der Element-Galerie.
- Keine Videoprobe exportiert; die Abnahme für G4 sind die 100 Läufe.

**Nachweise:**

- `test/knockout-level.test.mjs`: 10 Tests grün. Angepasst:
  - Ein Lauf darf jetzt bis 300 s dauern; ein noch unfertiges Level höchstens 24 s je Schleuse.
  - Die Invarianten erlauben die Murmel in der Gondel (siehe oben).
- `test/knockout-browser.test.mjs`, Tests „Gesamtlevel (G2)“ und „Beide Formate“: grün. Die Seek-Prüfung im
  Querformat prüft jetzt auch das Rad (42 s) und die einbrechende Brücke (54 s). Die übrigen Browser-Tests betreffen
  den alten Ablauf; „Node = Chromium“ und „Short (M7)“ liefen grün, die alte Seek-Prüfung habe ich nach 10 min
  abgebrochen (unberührt).
- `test/knockout.test.mjs`: 8 Tests grün, der alte Ablauf ist unverändert.
- `npm run golden`: identisch mit der Referenz. Die neuen Schalter `bias` (Kippbrett) und `speed` (Brücke) ändern ohne
  Angabe nichts.
- Nicht gelaufen: Scrap-Hashes (Scrap unberührt), voller `npm test`.

## G5 · THE GAUNTLET komplett: Abschnitte 6 bis 10, Einstiegsflug, Podest (26.11.2026)

**Umfang:**

- **Abschnitt 6 `SPLIT & DRUM` (8 → TOP 7):**
  - Trichter unter der Schleuse auf eine Weiche (Flip-Flop): Sie schickt die Murmeln abwechselnd nach rechts und links.
  - Rechts eine lange Bahn (5°) mit zwei Schiebetoren im Wechseltakt, links ein kurzer Weg an eine Wand, darunter eine
    Bahn mit Förderband zurück nach rechts. Beide Wege treffen sich vor der **Drehtrommel** (Radius 4,4 d, zwei
    Öffnungen, zwei Schaufeln, wiegt hin und her). Darunter die Fangbahn in die Schleuse.
- **Abschnitt 7 `HAMMER ALLEY` (7 → TOP 6, Sturz zählt):**
  - Bahn nach links, zuerst 9° steil, dann 4°. Drei Löcher mit Deckel (der Deckel schließt, sobald einer raus ist),
    vier Pendelhämmer über der Bahn im versetzten Takt.
- **Abschnitt 8 `SHIFTING FLOORS` (6 → TOP 5):** drei wandernde Böden wie im Turm, dann die Fangbahn in die Schleuse.
- **Abschnitt 9 `RING ESCAPE` (5 → TOP 3):** Trichter (20°) in einen Kanal, der von vorn in zwei gegenläufige Ringe
  führt (innen ein Schlitz, außen zwei), darunter die Fangbahn in die Schleuse.
- **Abschnitt 10 `GRAND FINAL` (3 → Platz 1 bis 3):**
  - Lange Abfahrt über alle drei Spalten: Bahn nach links mit Drehkreuz, Wippe an der Wand, Bahn nach rechts mit
    Schanze.
  - **Starttor:** Es öffnet erst, wenn alle drei davor warten (dann 1,2 s Pause), spätestens 10 s nach der Ersten.
    Dazu groß `FINAL SPRINT`. Die Kamera zeigt die Wartenden und die Letzte, die noch kommt.
  - Hinter dem Tor eine kurze Rampe, ein **Nagelfeld** (vier Reihen) über einem Trichter, dann die offene Zielgerade
    mit Ziel, Schiene und Wand.
- **Podest** (nur Langvideo): 1,5 s nach Platz 3 erscheint das Podest (`CHAMPION`, Gold, Silber, Bronze) und steht
  8 s. Kommen Platz 2 oder 3 nicht an, erscheint es spätestens 10 s nach dem Sieg. Kapitel `Winner` und `Podium`.
- **Einstiegsflug** (nur Langvideo, Schalter „Einstiegsflug übers Level“, an): Die Kamera fliegt in 7 s vom Ziel
  rückwärts über die Mitte jedes Abschnitts zum Start, unterwegs bis 0,6 herausgezoomt, weich an- und abgebremst. Dazu
  die Karte `20 MARBLES. ONE COURSE.` / `ONLY THE FASTEST GO ON.`, danach die Titelkarte `THE GAUNTLET` /
  `10 STAGES. ONE CHAMPION.` Die Welt steht während des Flugs still. Kapitel `Intro` bei 0:00, `Stage 1` nach dem Flug.
- **Kamera:**
  - In der zweiten Hälfte eines Abschnitts zeigt sie jetzt auch die Murmeln um die Schnittlinie selbst (mit Rand), nicht
    nur ihre Stelle auf der Ideallinie. Auf den Böden lag die Ideallinie weit neben der Murmel.
  - Fassung „Abschnitte“: Abschnitte, die auch ganz herausgezoomt nicht ins Bild passen (6 bis 10), fahren mit.
- **Behoben:**
  - Nach der Trommel in Abschnitt 6 blieben Murmeln außen auf den Ringen von Abschnitt 9 liegen, weil sie die
    Trommel-Ebene behielten. Jetzt beginnt jeder Abschnitt mit der Grundebene.
  - Hammergasse: Mit 4° rollten die sieben als Kette mit rund 90 E/s an, und der erste Hammer schob die ganze Kette
    immer wieder bergauf zurück (erste Abnahme: 16 von 100 Läufen mit Anstößen, ein Abschnitt bis 44 s). Jetzt 6° nach
    dem steilen Anfang.
  - Volles Becken: Sind nach einem Sturz genau so viele übrig, wie weiterkommen, muss jede ins Becken. Die Letzte lag
    dann oben auf den anderen, genau auf der Lichtschranke, und wurde nie gezählt (ein Lauf festgefahren). Liegt eine
    Murmel still im Becken über der Lichtschranke, zählt sie jetzt als angekommen statt einen Stoß zu bekommen. Läufe
    ohne Stoß ändert das nicht, der Turm bleibt also gleich.

**Abweichungen vom Plan (nach Messung):**

| Plan | Messung | Jetzt |
|---|---|---|
| Ringausbruch wie im Turm (Trichter 12°, Kanal 1,6 d) | Am Hals verkeilten sich Murmeln zu einem Bogen. Mit Kanal 2,1 d klemmten sich zwei schräg übereinander an den Wänden fest (2 von 12 ganzen Läufen) | Trichter 20°, Kanal innen 2,2 Murmeln breit: Breiter als zwei Murmeln hält kein Keil |
| Ringausbruch mit drei Ringen | Nicht alle fünf passten hinein, Schlange im Kanal, Anstöße | zwei Ringe, der innere 2,8 d |
| Hammergasse über zwei Spuren | Gebaut als eine Spur. Der Sturz lag zuerst immer am ersten Loch gleich am Anfang; ein zusätzlicher Hammer über fester Bahn am Anfang hielt das ganze Feld 26 s auf. Mit 4° danach staute sich das Feld vor dem ersten Hammer (siehe Behoben) | eine Spur mit steilem Anfang (9°), dann 6°, drei Löcher mit Deckel, vier Hämmer |
| Finale: Drehkreuz, Kippbrett, Schanze, offene Zielgerade | Platz 2 im Median 1,2 s, Platz 3 6,5 s zurück; Wippe und Drehkreuz trennen das Feld um ganze Takte. Fotofinish (unter 0,3 s) in 1 von 16 Finals | dazu Starttor und Nagelfeld mit Trichter: Fotofinish in 10 von 16 Finals |
| Länge rund 6 min | Abschnitte dauern 8 bis 28 s (Median) statt rund 28 s | rund 3:15 min mit Flug und Podest |
| Totale beim Einsturz und über der Weiche, Zoom 1,1 in den Ringen | — | noch nicht; die Kamera folgt wie bisher |

**Abnahme (Seeds 1 bis 100, ganze Läufe mit Einstiegsflug und Podest):**

- 100 von 100 Läufen enden mit Sieger und Podest zu dritt. Niemand bleibt hängen, kein Zeitlimit.
- 7 Läufe brauchen je einen Anstoß: viermal auf den Kippbrettern, zweimal am Rad (beides G4), einmal im Finale an
  der Wippe. Das Casting nimmt nur Läufe ohne Anstoß.
- Die erste Abnahme vor den beiden Korrekturen oben hatte einen festgefahrenen Lauf und 16 Läufe mit Anstößen (28
  Stück, davon 10 Läufe in der Hammergasse).

**Messwerte (dieselben 100 Läufe):**

| | Median | Spanne |
|---|---|---|
| Videolänge bis zum Ende des Podests | 196 s (3:16 min) | 179 bis 224 s |
| Finale beginnt nach | 155 s | |
| Sieg nach Beginn des Finales | 29,9 s | bis 35,7 s |
| Abstand Platz 2 hinter Platz 1 | 0,72 s | unter 0,3 s (`PHOTO FINISH`): 35 von 100; unter 0,15 s: 27 |
| Abstand Platz 3 hinter Platz 1 | 2,68 s | alle drei unter 1,5 s: 18 von 100 |
| Alle drei warten am Starttor (sonst öffnet es nach 10 s) | | 94 von 100 |
| Führungswechsel je Lauf / im Finale / je Minute | 57 / 3 / 17,9 | |
| Stürze je Lauf | 2 | zusammen 196 |
| Führende im Bild / Aus im Bild | 93,7 % | 965 von 974 Aus |

| Abschnitt | Dauer bis zur Freigabe (Median, längste) |
|---|---|
| 1 `THE DROP` (ab Startschuss) | 13,9 s, 15,4 s |
| 2 `TURNSTILES` | 18,2 s, 20,0 s |
| 3 `THE WHEEL` | 13,4 s, 17,3 s |
| 4 `THE COLLAPSE` | 13,2 s, 19,0 s |
| 5 `TILT` | 27,6 s, 36,9 s |
| 6 `SPLIT & DRUM` | 23,6 s, 37,0 s |
| 7 `HAMMER ALLEY` | 14,5 s, 33,9 s |
| 8 `SHIFTING FLOORS` | 10,4 s, 14,3 s |
| 9 `RING ESCAPE` | 8,5 s, 11,4 s |
| 10 `GRAND FINAL` | rund 30 s bis zum Sieg, dann Podest |

**Bildblatt (lokal):** `output/knockout-lab/g5-blatt.jpg`, Seed 2: Einstiegsflug mit Karte, Titelkarte, Hammergasse
mit Sturz und `TRAPS CLOSED`, zwei warten am Starttor, `FINAL SPRINT`, `CYAN WINS!`, Podest CYAN, MAROON, RED.

```bash
node scripts/knockout-frames.mjs --mode level --seed 2 --times 0.3,3.5,9.0,121,165,173.3,180.3,187 --aspect 16:9 --cols 2 --scale 0.5 --out output/knockout-lab/g5-blatt.jpg
```

**Grenzen:**

- Das Video dauert rund 3:15 min statt 6 min. Die Abschnitte sind kürzer als geplant, weil 20 Murmeln sie schnell
  füllen. Längere Abschnitte oder mehr Abschnitte wären möglich (Geschmacksfrage am Ende).
- Ein echtes Fotofinish (unter 0,3 s) gibt es von selbst in 35 von 100 Läufen; Platz 3 liegt meist weit zurück. Die
  Vorlage soll darum einen gecasteten Lauf nehmen (G6).
- In den Final-Proben gewann meist die, die als Erste am Tor lag (12 von 16).
- Das Rennen mit Einstiegsflug ist nicht bitgleich mit dem ohne Flug (die Zeit ist um 7 s verschoben, Rundungen in
  Zeitvergleichen kippen einzelne Schritte). Gecastet wird mit Flug.
- Eigene Kamerapunkte (Totale beim Einsturz und über der Weiche, Zoom in den Ringen) fehlen noch. Die Fassung
  „Abschnitte“ fährt in den Abschnitten mit, die ganz herausgezoomt nicht ins Bild passen.
- Das Riesenrad steht noch nicht in der Element-Galerie.
- Im Ausscheider-Rohr oben rechts steht der oberste Name dicht unter `OUT`, wenn 17 Murmeln draußen sind.
- Keine Videoprobe exportiert; die 20-s-Proben kommen mit G6.

**Nachweise:**

- `test/knockout-level.test.mjs`: 11 Tests grün. Neu: „Einstiegsflug (G5)“ (Flug rund 7 s, Ziel im ersten Bild, Welt
  steht still, Übergang ohne Sprung, Kapitel). Das Ende prüft mit Podest: drei auf dem Podest, Siegerin oben, Ende
  nach dem Podest. Die Zeichenprobe zeichnet auch Starttor, Podest und Ende.
- `test/knockout-browser.test.mjs`, Tests „Gesamtlevel (G2)“ und „Beide Formate“: grün. Die Seek-Zeitpunkte im
  Querformat sind um den Flug verschoben (0,4 s im Flug, dann 4,1 bis 61 s). Gelaufen vor der Korrektur der
  Hammergasse; alle Zeitpunkte liegen davor.
- `test/knockout.test.mjs`: 8 Tests grün, der alte Ablauf ist unverändert.
- `npm run golden`: identisch mit der Referenz.
- Nicht gelaufen: Scrap-Hashes (Scrap unberührt), voller `npm test`, kein Videoexport.

## G6 · Drehbuch-Casting fürs Gesamtlevel, Vorlage „Langvideo“ (26.11.2026)

**Umfang:**

- **Drehbuch-Casting** für THE GAUNTLET (`scripts/knockout-casting.mjs --story`). Die Geschichte ist die aus M8,
  aufs Gesamtlevel übertragen:
  - **Außenseiterin:** die erste, die in Abschnitt 1 bis 3 als Letzte ins Becken kommt und weniger als 2,5
    Murmelbreiten vor der Ersten draußen liegt. Danach entkommt sie noch zweimal so knapp und kämpft im Finale im
    Fotofinish um den Sieg (Platz 1 oder 2).
  - **Spitzenreiter:** eine der drei besten Platzsummen in Abschnitt 1 bis 3; er stürzt in der Hammergasse.
  - **Fotofinish:** Platz 1 und 2 weniger als 0,15 s auseinander (Plan, Abschnitt 8).
  - **Pflicht in jedem Abschnitt:** kein Anstoß, niemand sitzt fest, kein Zeitlimit.
- **Sichern und Laden statt Neuaufbau:** Ein Kandidat rechnet nur seinen Abschnitt. Der Zustand an der Freigabe wird
  gesichert und in eine neue Simulation mit dem Kandidaten-Seed für diesen Abschnitt geladen. Das Ende eines
  Kandidaten ist gleich der Anfang des nächsten Abschnitts. Rückschau wie in M8: Vor der Hammergasse und vor dem
  Finale bleiben mehrere Varianten offen. Höchstens 900 Probeläufe je Grund-Seed. Am Ende rechnet eine Gegenprobe das
  ganze Rennen am Stück und prüft die Geschichte noch einmal.
- **Drehbuch-Wert 0 heißt Grund-Seed** (vorher war 0 ein eigener Seed). Das Casting probiert in jedem Abschnitt
  zuerst 0, so bleibt ein Abschnitt, der schon passt, wie ohne Drehbuch. Kein bestehender Lauf ist betroffen: Der Turm
  läuft ohne Drehbuch.
- **Ganzlauf-Casting** `--level gauntlet` rechnet jetzt bis 400 s; `--photo` setzt die Grenze fürs knappe Finale.
- **Vorlage „Langvideo“** zeigt jetzt auf THE GAUNTLET: Grund-Seed 1 mit Drehbuch, Kamera „Fahrt“, Einstiegsflug an,
  Länge automatisch bis zum Ende des Podests. Das Rennen Bahn für Bahn bleibt über „Ablauf“ wählbar, seine Drehbücher
  (`LONG_CAST`) bleiben erhalten. Die Anzeige „Drehbuch“ in der Seitenleiste kennt jetzt beide Listen.
- **Kapitel** (seit G5) für die Vorlage, wie sie der Export schreibt: 0:00 Intro, 0:07 Stage 1, 0:25 Stage 2,
  0:44 Stage 3, 0:56 Stage 4, 1:11 Stage 5, 1:36 Stage 6, 1:58 Stage 7, 2:15 Stage 8, 2:26 Stage 9, 2:36 Stage 10,
  3:06 Winner, 3:12 Podium. Das Video endet nach 3:21 min.

**Casting (Grund-Seeds 1 bis 8 parallel, je Abschnitt bis zu 16 Kandidaten):**

| Grund-Seed | Ergebnis | Probeläufe |
|---|---|---|
| **1 (Vorlage)** | GREEN entkommt in Abschnitt 2, 8 und 9 knapp (1,9 / 1,9 / 2,3 Breiten) und gewinnt; LIME stürzt in der Hammergasse; Fotofinish 0,125 s; Podest GREEN, PINK, YELLOW; 3:21 min | 153 |
| 4 | GREEN entkommt in Abschnitt 2, 3 und 5 (2,2 / 1,5 / unter 0,1 Breiten) und gewinnt; NAVY stürzt; Fotofinish 0,124 s; 3:31 min, `TILT` dauert 40 s | 109 |
| 2 | SILVER entkommt in Abschnitt 2, 3 und 9 (2,5 / 1,5 / 2,3) und wird Zweite; MINT stürzt; Fotofinish 0,150 s; Sieger BLACK; 3:14 min | 125 |
| 3, 8 | scheitern in Abschnitt 4: keiner der 16 Kandidaten erfüllt die Pflichten | 62, 50 |
| 5, 6, 7 | abgebrochen, als drei Drehbücher fertig waren (sie standen im Finale mit erst einer knappen Rettung) | – |

Alle drei Gegenproben am Stück: Die Geschichte hält. Rechenzeit: ein Probelauf rund 5 s, die ersten drei Drehbücher
nach rund 20 min (acht Prozesse parallel).

Empfehlung für die Vorlage ist Grund-Seed 1: Die knappen Rettungen verteilen sich übers Video, die letzten zwei kommen
kurz vor dem Finale, und kein Abschnitt zieht sich. GREEN ist in diesem Lauf sechsmal die Letzte im Becken.

**Proben (lokal, je 20 s, aus der Vorlage):**

| Probe | Datei unter `output/knockout-lab/` |
|---|---|
| Einstiegsflug, Titelkarte, Start und THE DROP | `g6-gauntlet-start-20s.mp4` |
| Zwei knappe Schleusen vor dem Finale: GREEN als Letzte rein in `SHIFTING FLOORS` und `RING ESCAPE` | `g6-gauntlet-schleusen-20s.mp4` |
| Finale: `FINAL SPRINT`, Nagelfeld, Fotofinish mit Zeitlupe, `GREEN WINS!`, Podest | `g6-gauntlet-finale-20s.mp4` |

```bash
node export.mjs --config presets/production/knockout-long.json --clip-start 0 --clip-duration 20 --out output/knockout-lab/g6-gauntlet-start-20s.mp4
node export.mjs --config presets/production/knockout-long.json --clip-start 138 --clip-duration 20 --out output/knockout-lab/g6-gauntlet-schleusen-20s.mp4
node export.mjs --config presets/production/knockout-long.json --clip-start 176 --clip-duration 20 --out output/knockout-lab/g6-gauntlet-finale-20s.mp4
```

**Grenzen:**

- Das Drehbuch gilt nur mit den Einstellungen der Vorlage. Mit Einstiegsflug aus oder Zeitlupe aus rechnet das Rennen
  anders, und die Geschichte hält nicht mehr.
- Die Geschichte erzählt sich nur durch das Rennen. Es gibt keine Einblendung wie `UNDERDOG`.
- Zwei von acht Grund-Seeds finden in Abschnitt 4 keine Fortsetzung; ein Casting braucht je Grund-Seed 110 bis 150
  Probeläufe.
- Der kleine Unterschied beim Laden: Der Bandlauf des Förderbands in Abschnitt 6 (nur fürs Bild) behält den Wert des
  gesicherten Laufs. Die Physik ist gleich, die Gegenprobe rechnet ohnehin am Stück.
- Das ganze Langvideo ist nicht exportiert (nur auf Auftrag).

**Nachweise:**

- `test/knockout-level.test.mjs`: 12 Tests grün. Neu: „Vorlage Langvideo (seit G6)“ (Datei gleich Oberfläche, ganzer
  Lauf: Außenseiterin im Fotofinish, Spitzenreiter stürzt in der Hammergasse, unter 0,15 s, kein Anstoß).
- `npm run golden`: identisch mit der Referenz.
- Die drei Proben bestehen die Prüfung des Exports (Codec, Auflösung, Bildrate, Bildzahl, Dauer, Simulationszustand).
- Nicht gelaufen: Scrap-Hashes (Scrap unberührt), voller `npm test`, ganzer Export.
- `test/knockout.test.mjs`: 8 Tests grün. Der Test des alten Drehbuchs prüft die Vorlage nicht mehr, nur noch das
  Rennen mit Drehbuch.
- `test/knockout-browser.test.mjs`, Test „Short (M7)“: grün, mit beiden Vorlagen-Dateien gleich Oberfläche und der
  Langvideo-Vorlage aus `GAUNTLET_CAST`.

## G7 · Abschluss Teil 2 und gesammelte Geschmacksfragen (26.11.2026)

**Was jetzt da ist:**

- Ablauf „Gesamtlevel mit Kamerafahrt“ (ohne „in Arbeit“, beide Level sind fertig):
  - **THE TOWER** (9:16): 16 Murmeln, drei Abschnitte, Ziel mit Fotofinish, rund 38 s.
  - **THE GAUNTLET** (16:9): 20 Murmeln, zehn Abschnitte, Einstiegsflug, Kamera „Fahrt“ (oder „Abschnitte“), Finale
    mit Starttor, Podest, rund 3:20 min.
- Vorlagen-Knöpfe „Short · Turm (rund 38 Sekunden)“ und jetzt „Langvideo · The Gauntlet (rund 3½ Minuten)“. Beide
  nehmen gecastete Läufe: der Turm einen Seed mit Fotofinish, THE GAUNTLET ein Drehbuch mit Geschichte.
- Das Rennen Bahn für Bahn (Teil 1) mit seinen Short-Fassungen und Drehbüchern bleibt über „Ablauf“ wählbar.
- Kommandozeile, der ganze Export nur auf Auftrag:

  ```bash
  node export.mjs --config presets/production/knockout-short.json --out output/knockout-short.mp4
  ```

  ```bash
  node export.mjs --config presets/production/knockout-long.json --out output/knockout-long.mp4
  ```

- Casting: `node scripts/knockout-casting.mjs --level tower` (Short) und `--story` (Drehbuch fürs Langvideo).

**Proben von Teil 2 (lokal, je 20 s, unter `output/knockout-lab/`):**

| Probe | Datei |
|---|---|
| Turm, erster Abschnitt (G1) | `g1-tower-20s.mp4` |
| Gauntlet, erster Abschnitt, Kamera „Fahrt“ und „Abschnitte“ (G1) | `g1-gauntlet-fahrt-20s.mp4`, `g1-gauntlet-abschnitte-20s.mp4` |
| Turm aus der Vorlage: Anfang und Finale (G3) | `g3-tower-start-20s.mp4`, `g3-tower-end-20s.mp4` |
| Gauntlet aus der Vorlage: Einstieg, zwei Schleusen, Finale (G6) | `g6-gauntlet-start-20s.mp4`, `g6-gauntlet-schleusen-20s.mp4`, `g6-gauntlet-finale-20s.mp4` |

**Gesammelte Geschmacksfragen** (mit Empfehlung; gebaut ist jeweils die Empfehlung):

1. **Länge Langvideo:** rund 3:20 min statt der geplanten 6 min. Mit 20 Murmeln sind die Abschnitte schnell voll.
   Empfehlung: so lassen, das Video hat keinen Leerlauf. Länger ginge mit zwei, drei weiteren Abschnitten (etwa der
   breiten Treppe aus dem Plan).
2. **Geschichte im Langvideo:** Welches Drehbuch? Seed 1 (GREEN gewinnt, die letzten Rettungen kurz vor dem Finale;
   Empfehlung, in der Vorlage), Seed 4 (GREEN gewinnt, eine Rettung um Haaresbreite, dafür zieht sich `TILT` 40 s) oder
   Seed 2 (SILVER wird knapp Zweite).
3. **Finale mit Starttor und Nagelfeld:** Ohne das lag Platz 2 im Median 1,2 s zurück. Mit Tor wartet das Feld kurz
   (`FINAL SPRINT`), dann entscheidet das Nagelfeld. Empfehlung: so lassen.
4. **Texte am Anfang:** Flug mit `20 MARBLES. ONE COURSE.` / `ONLY THE FASTEST GO ON.`, dann `THE GAUNTLET` /
   `10 STAGES. ONE CHAMPION.` Empfehlung: so lassen.
5. **Einblendung für die Geschichte:** Bisher erzählt sich die Außenseiterin nur durchs Rennen. Eine kleine
   Einblendung bei der dritten knappen Rettung (etwa `GREEN SURVIVES AGAIN!`) wäre möglich. Empfehlung: erst das
   Video ansehen.
6. **Podest:** 8 s mit `CHAMPION`. Empfehlung: so lassen.
7. **Level-Namen** im Video (`THE TOWER`, `THE GAUNTLET`), **Streckenleiste** unten, **Lampen** an den Schleusen und
   Einblendungen wie `NEW LEADER`: Empfehlung: alles so lassen.
8. **Standard-Ablauf:** Öffnet man das Szenario ohne Vorlage, startet noch das Rennen Bahn für Bahn. Empfehlung: nach
   der Abnahme das Gesamtlevel zum Standard machen.
9. **Weitere Türme für Shorts**, etwa einer je Woche mit neuem Hauptelement? Empfehlung: erst Short und Langvideo ganz
   exportieren und ansehen.
10. **Aus dem ersten Plan:** Murmelnamen als Farbwörter, keine Musik. Empfehlung: so lassen.
11. **Nächster Schritt:** ganzer Export von Short (THE TOWER, rund 38 s) und Langvideo (THE GAUNTLET, rund 3:21 min),
    nur auf Auftrag.

**Grenzen:**

- Der Szenario-Name trägt weiter „(in Arbeit)“, bis der Nutzer Short und Langvideo abgenommen hat.
- Eigene Kamerapunkte (Totale beim Einsturz und über der Weiche, Zoom in den Ringen) fehlen; die Kamera folgt dem Feld.
- Das Riesenrad steht noch nicht in der Element-Galerie.
- Das Drehbuch gilt nur mit den Einstellungen der Vorlage (Einstiegsflug an, Zeitlupe an).
- 7 von 100 freien Läufen brauchen einen Anstoß; die Vorlagen nehmen nur Läufe ohne.

**Nachweise:**

- Die Beschriftung des Langvideo-Knopfs hieß noch „10 Bahnen“; nachgezogen. Sonst nur Text.
- Gelaufen: Browser-Test „Short (M7)“ (Vorlagen, Oberfläche). Die Rechnung ist seit G6 unverändert.
- Nicht gelaufen: voller `npm test`, ganzer Export.

## G8 · Gruben: OUT-Kiste, Schacht mit Rahmen, Abgrund (26.11.2026)

**Wunsch:** Die schwarzen Gruben sollen hochwertiger aussehen und zum Holz-Stil passen. Umgesetzt ist die Empfehlung
vom 26.11., die der Nutzer freigegeben hat.

**Was jetzt da ist (nur im Gesamtlevel, beide Formate):**

- **OUT-Kiste** an jeder Schleuse: offene Holzkiste mit Latten, schräger Strebe, Eckpfosten und Nägeln, innen warmes
  Dunkel. Wer zu spät kommt, fällt sichtbar hinein und verschwindet hinter der vorderen Latte.
- **Schacht mit Rahmen** an den Fallstellen (drei Löcher der Hammergasse, Loch im Turm): Holzpfosten links und rechts,
  unter den Bahn-Enden ein Balken mit schmalem Warnband, innen ein Verlauf von warm-dunkel zu schwarz, unten weich
  auslaufend.
- **Abgrund** unter der Einsturz-Brücke: Die vier Grubenstücke werden als ein Stück gezeichnet, das der schrägen Brücke
  folgt. Unter den Planken warm-dunkel, nach unten lichter; die untere Bahn bleibt sichtbar. Kein schwarzer Block mehr.
- Je ein Teil liegt hinter den Murmeln (in den festen Kacheln), einer davor. Der vordere Teil verdeckt eine fallende
  Murmel ganz, bevor die Simulation sie herausnimmt.
- Zwei neue Angaben an einer Grube, nur für die Zeichnung: `look: 'out'` (Schleuse) und `mouth` (Bahn-Enden an der
  Öffnung eines Schachts). Die Simulation liest sie nicht; die Rechnung bleibt gleich.

**Nachweise:**

- Vorher-/Nachher-Bilder lokal unter `output/knockout-lab/`: `gruben-vorher-long.jpg`, `gruben-nachher-long.jpg`,
  `gruben-schacht-long.jpg` (Nahaufnahme Hammergasse), `gruben-vorher-short.jpg`, `gruben-nachher-short.jpg`.
- Gelaufen: `knockout-level` 12 grün, `knockout` 8 grün (altes Rennen unverändert), Browser-Tests „Seek-Regel“, „Gesamtlevel (G2)“ (Seek mit Kamera, beide Formate) und „Beide Formate“ grün, Referenz-Hashes identisch.
- Nicht gelaufen: voller `npm test`, ganzer Export.

**Grenzen:**

- Das Rennen Bahn für Bahn (Teil 1) zeichnet weiter den weichen Abgrund von M5.
- Der Schacht ist innen zu gut zwei Dritteln dunkel: Eine Murmel muss im Dunkel verschwunden sein, bevor sie in
  1,1 Murmelbreiten Tiefe herausgenommen wird.

## CI · Knockout-Prüfungen wieder im Zeitbudget (26.11.2026)

**Befund:** Seit M7 waren in der CI auf dem Branch die Jobs `knockout` und `export-knockout` rot, beide wegen
Zeitgrenzen, nicht wegen falscher Ergebnisse (lokal war alles grün):

- `knockout`: Die Datei `test/knockout-browser.test.mjs` brauchte länger als die 600 s je Datei. Allein die
  Seek-Prüfung des Rennens Bahn für Bahn zeichnete vor jedem der zwölf Zeitpunkte 30 Bilder und lief über 9 Minuten.
  Die Gesamtlevel-Prüfung kam in der CI nie an die Reihe.
- `export-knockout`: Der 3-s-Export des Shorts (Turm, 1080 × 1920) brauchte mehr als die erlaubten 420 s. Ein Rennbild
  im Gesamtlevel kostet ohne Grafikkarte lokal rund 2,5 s, die meiste Zeit für die Murmeln mit weichem Schatten.

**Geändert:**

- Seek-Prüfung des Rennens: 0,2 s Vorlauf (sechs Bilder) statt einer Sekunde je Zeitpunkt.
- Die Gesamtlevel-Prüfung im Browser steht in einer eigenen Datei `test/knockout-level-browser.test.mjs`.
- Zwei eigene CI-Jobs `knockout-browser` und `knockout-level-browser` mit 1200 s je Datei, wie bei `scrap-browser`.
- Export-Prüfung: Wartezeit für Knockout 900 s statt 420 s.

**Nachweise:**

- Lokal grün: Seek-Prüfung des Rennens (174 s), Gesamtlevel-Prüfung aus der neuen Datei (125 s); Zuordnung der Testdateien zu den Jobs mit `node scripts/test-ci.mjs --list` geprüft (67 von 67 Dateien).
- Ob die Zeitgrenzen in der CI reichen, zeigt erst der Lauf nach dem Push.

**Grenze:** Ein Rennbild bleibt ohne Grafikkarte teuer. Schneller ginge es mit vorgezeichneten Murmeln; das ändert die
Optik leicht und gehört nicht zu diesem Schritt.
