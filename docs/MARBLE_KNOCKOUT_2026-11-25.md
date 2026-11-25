# Marble Knockout: Bericht

Roadmap-Nummer **R43**. Plan: [MARBLE_KNOCKOUT_PLAN_2026-11-25.md](MARBLE_KNOCKOUT_PLAN_2026-11-25.md).
Dieser Bericht wird je Paket fortgeschrieben.

| Paket | Stand |
|---|---|
| Plan | **Erledigt** (25.11.) |
| V0 Vorschau-Bilder | **Erledigt** (25.11.). Der Nutzer hat **Stil A „Holz & Abendlicht“** gewählt. |
| M1 Physik-Kern | **Erledigt** (25.11.) |
| M2/M3 Baukasten und Galerie | **Erledigt** (25.11.) |
| M4 bis M9 | **Offen** |

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

- In der Oberfläche erscheint die Galerie erst mit der Anmeldung des Szenarios (M4).
- D5 (Drehweichen-Raster) ist wie geplant nicht gebaut.
- Kolben und Fähre kommen in den geplanten Bahnen nicht vor. Sie stehen für spätere Bahnen bereit.
- In der Drehtrommel kann eine Murmel lange kreisen (bis 51 s in der Galerie). Für Bahn 6 wird das abgestimmt.

**Nachweise:**

- `test/knockout-elements.test.mjs`, 3 Tests grün:
  - Jedes Element läuft 60 s.
  - Gleicher Seed ergibt denselben Hash.
  - Simulation und Bahnen nutzen keine Winkelfunktionen des Browsers, also gleiche Bits in Node und Chromium.
- `test/knockout-physics.test.mjs` bleibt grün (7 Tests).
