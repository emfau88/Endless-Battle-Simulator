# Marble Knockout: Bericht

Roadmap-Nummer **R43**. Plan: [MARBLE_KNOCKOUT_PLAN_2026-11-25.md](MARBLE_KNOCKOUT_PLAN_2026-11-25.md).
Dieser Bericht wird je Paket fortgeschrieben.

| Paket | Stand |
|---|---|
| Plan | **Erledigt** (25.11.) |
| V0 Vorschau-Bilder | **Erledigt** (25.11.). Die Stilwahl des Nutzers steht aus. |
| M1 bis M9 | **Offen** |

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

### Frage an den Nutzer

Welcher Stil: **A** (Empfehlung), **B** oder **C**? Ebenso möglich sind Mischungen, zum Beispiel A mit dem
Leuchten aus C.
