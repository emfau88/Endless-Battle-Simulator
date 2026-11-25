# Marble Knockout: Gesamtlevel mit Kamerafahrt (Plan)

Stand: 25.11.2026, Basis Branch `murmelrennen/plan` an `54144b4` (R43 M1 bis M9 fertig, PR #54 offen). Verfasst als
Umsetzungsauftrag für Claude Code oder Codex. Roadmap: **R43, Teil 2**. Bericht: wird in
[MARBLE_KNOCKOUT_2026-11-25.md](MARBLE_KNOCKOUT_2026-11-25.md) fortgeschrieben.

**Wunsch des Nutzers vom 25.11.:** „Nichts ganz exportieren, weil wir erstmal ein richtig spannendes Gesamtlevel
jeweils brauchen, am besten mit Kamerafahrt.“ Gemeint ist: statt zehn einzelner Bildschirm-Bahnen mit Schnitt
dazwischen eine große, zusammenhängende Strecke, durch die das Feld am Stück fährt und der die Kamera folgt. Je ein
Level fürs Short (9:16) und eins fürs Langvideo (16:9).

Wo Zahlen stehen, sind es Startwerte. Abweichen ist erlaubt, wenn eine Probe es klar besser zeigt. Die Richtung bleibt
fest.

---

## Kurzfassung

- **Eine Strecke, ein Lauf, kein Schnitt.** Die Murmeln starten oben und fahren durch ein großes Level bis ins Ziel.
  Die Kamera fährt weich mit.
- **Die Regel bleibt ein Satz:** „12 marbles. One course. The last one is out.“ Die Strecke ist in Abschnitte geteilt.
  Am Ende jedes Abschnitts steht eine **Schleuse**: ein Auffangbecken mit Lampenreihe. Wer als Letzte ankommt, landet
  auf dem geschlossenen Deckel und rollt ins Aus. Danach öffnet der Boden, und das Feld fällt gemeinsam in den
  nächsten Abschnitt.
- **Short „THE TOWER“:** ein hoher Turm, rund sechs Bildschirme tief. Acht Murmeln fallen und rollen von oben nach
  unten, zwei Schleusen (`TOP 5`, `TOP 3`), dann das Finale. Rund 35 s, die Kamera fährt nur senkrecht.
- **Langvideo „THE GAUNTLET“:** ein Bergwerk aus Holz, drei Bildschirme breit und sechs tief. Zehn Abschnitte mit den
  bewährten Hauptelementen, dazu große Momente, die nur in einem großen Level gehen: ein freier Fall über zwei
  Bildschirme, ein Rad, das das Feld wieder nach oben hebt, eine Strecke, die hinter dem Feld einstürzt, und eine
  Weiche mit zwei sichtbaren Wegen. Rund 6 bis 7 Minuten.
- **Kamera ruhig und vorausschauend:** Sie zeigt, was vor der Spitze kommt, und an jeder Schleuse das Duell um den
  letzten Platz. Kein Drehen, kein Wackeln, Zoom selten und langsam, die Anzeige bleibt fest. Abschaltbar.
- **Erst sehen, dann bauen:** Zuerst Levelkarten und ein Kamera-Probeclip je Format (G0). Im Querformat zeige ich die
  Kamera in zwei Fassungen, weil du dort bisher keine Kamerafahrt wolltest. Danach baue ich mit den Empfehlungen
  durch.
- **Das Bisherige bleibt:** Die zehn Bahnen und die drei Shorts laufen weiter als Ablauf „Bahn für Bahn“. Ihre
  Elemente sind die Bausteine der neuen Level.

---

## 0 · Leitplanken (nicht verhandelbar)

**Technik**

- Alles bleibt im Szenario `knockout`. Neuer Ablauf `course: 'level'` neben dem bisherigen `course: 'stages'`.
  Der bisherige Ablauf rechnet bit-gleich weiter; seine Tests bleiben unverändert grün. `npm run golden` bleibt
  unverändert.
- Nur Seed-Zufall (`EBS.RNG`), kein `Math.random`, kein `Date.now`.
- **Die Kamera ist Simulationszustand.** Die Simulation rechnet sie in jedem Schritt aus dem Rennstand, der Renderer
  liest sie nur. Damit gilt die **Seek-Regel**: Nach einem Sprung zu t steht die Kamera genau dort, wo sie bei
  durchgehender Wiedergabe stünde.
- Kamera-Rechnung nur mit +, −, ×, ÷ und `Math.sqrt` (wie der Physik-Kern), damit Node und Chromium gleich rechnen.
- Bild in Kacheln: Der Inhalt einer Kachel hängt nur am Level, nie an der Zahl gezeichneter Bilder. Ein Zwischenspeicher
  darf Kacheln verwerfen, das Bild bleibt gleich.

**Inhalt**

- Alles aus dem ersten Plan gilt weiter: lesbar vor prächtig, ruhig statt brutal, faire Physik ohne Boosts, Texte im
  Video englisch, Ton weich und leise, keine nachgebauten Serien.
- **Ausnahme vom ersten Plan:** Dort stand „Querformat ohne Kamerafahrt“. Für das Gesamtlevel wünscht der Nutzer
  ausdrücklich eine Kamerafahrt, auch im Querformat. Weil er Kamerabewegungen im Querformat zweimal abgelehnt hat
  (Scrap am 13.11., Marble XL am 16.11.), gibt es dort zwei Fassungen zur Wahl, und die Wahl fällt in G0.
- **Kein Bild außerhalb der Welt.** Die Kamera bleibt im Level. Am Rand liegt Hintergrund, nie Leere.
- **Jedes Aus ist im Bild.** Die Kamera-Regie sorgt dafür, und ein Test prüft es.

---

## 1 · Die Idee: ein Lauf, eine Strecke

### 1.1 Die Schleuse

Die Schleuse verbindet zwei Abschnitte und ersetzt Ziel, Klappe und Startrinne des bisherigen Ablaufs.

1. **Ankommen:** Am Ende eines Abschnitts rollen die Murmeln durch eine Lichtschranke in ein Becken. Der Beckenboden
   ist 6° zur Ausgangsseite geneigt, die Erste liegt also vorn.
2. **Lampenreihe:** Über dem Becken hängt je Platz ein Lämpchen. Jede Ankunft schaltet eins von Gelb auf Grün, mit
   einem leisen „ding“. Bleibt nur noch ein Lämpchen frei, blinkt es. Man sieht ohne Text, wie viele Plätze noch frei
   sind.
3. **Schließen:**
   - Langvideo: Sind alle bis auf eine drin, klappt der Deckel über den Einlauf (0,25 s).
   - Short: Sind die ersten fünf (bzw. drei) drin, klappt der Deckel sofort zu. Im Short wartet niemand auf
     Nachzügler.
4. **Aus:** Wer danach kommt, rollt über den Deckel in die Aus-Rinne neben dem Becken und fällt aus dem Level. Name in
   der Mitte: `RED IS OUT`.
5. **Freigabe:** 1,2 s nach dem Aus (Short 0,4 s nach dem Schließen) blinken die Lämpchen zweimal grün, der Boden
   klappt auf, und das Feld fällt gemeinsam in den nächsten Abschnitt. Das mischt leicht, die Reihenfolge der
   Ankunft bleibt grob erhalten.

**Gefahren-Abschnitte:** Wer unterwegs abstürzt, ist sofort raus. Dann schließen die Gefahren (`TRAPS CLOSED`), und die
Schleuse lässt alle übrigen hinein. Fallen zwei zugleich, wird der nächste Abschnitt `SAFE STAGE`, wie bisher.

**Warum Schleusen und nicht ein Tor mit Zeitlimit oder ein Verfolger:**

- Das Feld findet sich an jeder Schleuse wieder zusammen. So kann eine Kamera es zeigen, ohne dauernd zwischen Spitze
  und Ende hin- und herzufahren.
- Die Regel bleibt einfach und sicher: genau ein Aus je Abschnitt.
- Der Verfolger, also eine Strecke, die hinter dem Feld einstürzt, kommt trotzdem vor, aber als ein großer Moment
  (Abschnitt 4 im Langvideo), nicht als Regel.

### 1.2 Was das Level spannend macht

Diese Regeln gelten für beide Level und für jedes spätere:

1. **Nie Stillstand.** Die Spitze steht nirgends länger als 3 s (Short 1,5 s). Im Short wartet keine Schleuse auf
   Nachzügler.
2. **Man sieht die Gefahr kommen.** Die Kamera schaut in Fahrtrichtung voraus, Gefahren tragen rote Lämpchen. Der
   Zuschauer weiß früher als die Murmel, dass gleich die Hämmer kommen.
3. **Jede Schleuse ist ein Duell.** Die Lampenreihe zählt mit, die Kamera zeigt die letzten zwei.
4. **Vor jeder Schleuse wird gemischt.** Kurz davor steht ein Element, das die Reihenfolge neu würfelt (Drehkreuz,
   Nagelfeld, Trommel). Niemand ist sicher, und die Letzte hat noch eine Chance.
5. **Schnell und knifflig im Wechsel:** Abfahrt, Hindernis, Abfahrt. Im Langvideo alle 8 bis 12 s etwas Neues, im
   Short alle 4 bis 6 s.
6. **Große Bilder, die nur ein großes Level kann:** freier Fall über zwei Bildschirme, das Rad hebt das Feld wieder
   nach oben, der Einsturz hinter dem Feld, zwei Wege nebeneinander.
7. **Das Ende ist knapp.** Die letzten 3 s vor dem Ziel sind eine offene Gerade ohne Engstelle. Dort ist ein echtes
   Fotofinish möglich (im bisherigen Finale trennte das Drehkreuz kurz vor dem Ziel das Feld, nie knapper als 0,23 s).
8. **Eine Geschichte:** im Langvideo wie in M8 (Außenseiterin aufs Podest, Favorit stürzt am Hammer), im Short die
   Frage aus dem ersten Bild.

---

## 2 · Short „THE TOWER“ (9:16)

**Maße:** Bildbreite 1080 E, Murmelradius 30 E (d = 60), acht Murmeln. Der Turm ist genau so breit wie das Bild und
rund sechs Bildschirme hoch (rund 11 500 E). Die Kamera fährt nur senkrecht.

```
 ┌─────────── 1080 ───────────┐   Bildschirm
 │ START: 8 Murmeln im Käfig  │   0
 │   PICK YOUR COLOR!         │
 │ 1 THE DROP                 │
 │   Nagelfeld, Trichter      │
 │   Zickzack, zwei Drehkreuze│
 │ ═══ SCHLEUSE  TOP 5 ═══    │   2
 │ 2 FALLING FLOORS           │
 │   vier wandernde Böden     │
 │   Sims mit Pendelhammer    │
 │ ═══ SCHLEUSE  TOP 3 ═══    │   4
 │ 3 FINAL                    │
 │   Ringausbruch             │
 │   Steilabfahrt, Drehkreuz  │
 │   offene Zielgerade        │
 │ ZIEL                       │   6
 └────────────────────────────┘
```

| Zeit | Abschnitt | Was passiert | Aus | Moment, den das Casting sucht |
|---|---|---|---|---|
| 0 s | Start | Erstes Bild: acht Murmeln im Käfig, groß `PICK YOUR COLOR!`. Der Boden öffnet nach 0,4 s. | — | sofort Bewegung |
| 0,4 bis 10 s | 1 `THE DROP` | Breites Nagelfeld, Trichter, Zickzack mit zwei Drehkreuzen | Schleuse `TOP 5`: drei raus | Platz 5 und 6 kommen fast gleichzeitig |
| 10 bis 21 s | 2 `FALLING FLOORS` | Vier wandernde Böden übereinander, darunter ein schmaler Sims mit einem Pendelhammer (Sturz = raus) | Schleuse `TOP 3` | Sturz über zwei Böden, die Führung wechselt |
| 21 bis 33 s | 3 `FINAL` | Ringausbruch, Steilabfahrt mit einem Drehkreuz, dann die offene Zielgerade | Sieger | Führungswechsel und Fotofinish mit Zeitlupe |
| 33 bis 36 s | Ende | `GOLD WINS!`, kurzer Halt | — | — |

- **Zweite Frage im Wechsel:** `FOLLOW THE GOLD ONE!` mit GOLD im Feld (Casting: GOLD erreicht das Finale).
- **Kamera:** waagerecht fest auf der Turmmitte, senkrecht mit Vorschau nach unten (Abschnitt 4). An den Schleusen
  zoomt sie höchstens auf 0,85 heraus, damit Becken und die letzten zwei zugleich zu sehen sind.
- **Anzeige:** kein Rahmen. Große Zeile beim Start jedes Abschnitts (`8 → TOP 5`, `5 → TOP 3`, `FINAL`), Namen beim
  Aus, Sieger. Alles in der Bildmitte.
- **Weitere Türme** entstehen später aus demselben Baukasten mit anderen Hauptelementen (Trommel, Kippbrett,
  Labyrinth). Das passt zu Leitlinie 6: gleiche Bildsprache, nicht austauschbar.

---

## 3 · Langvideo „THE GAUNTLET“ (16:9)

**Maße:** Ein Bildschirm (B) sind 1920 × 1080 E. Die Welt ist drei B breit und sechs B tief (rund 5760 × 6480 E).
Murmelradius 24 E statt 22, weil die Kamera nicht mehr eine ganze Bahn auf einmal zeigen muss. Zwölf Murmeln.

**Karte (Startwert, G0 zeichnet sie richtig):**

```
           Spalte 1                    Spalte 2                     Spalte 3
Reihe 1  ▶ 1 THE DROP ───────────────▶ 2 TURNSTILES ──────────────▶ ┐
Reihe 2    4 THE COLLAPSE ◀──────────── hoher Sims ◀──────┐          │ BIG DROP:
           │ (Einsturz über dem Abgrund)                  │          │ freier Fall
Reihe 3    │                           3 THE WHEEL ───────┘ ◀────────┘ über 2 B
           ▼                           (Rad hebt das Feld wieder hoch)
Reihe 4    5 TILT ───────────────────▶ 6 SPLIT + THE DRUM ────────▶ 7 HAMMER ALLEY
                                                                     │
Reihe 5    9 RING ESCAPE ◀──────────── 8 SHIFTING FLOORS ◀───────────┘
           ▼
Reihe 6    10 GRAND FINAL: lange Abfahrt über alle drei Spalten ──────────────▶ ZIEL
```

| Nr. | Titel im Video | Hauptelement | Großer Moment | Aus | Moment fürs Casting | Kamera |
|---|---|---|---|---|---|---|
| 1 | `THE DROP` | Nagelwand A3, Trichter A2 | — | letzte | Gedränge am Trichter | Totale beim Start, dann mit der Spitze |
| 2 | `TURNSTILES` | drei Drehkreuze B1 | danach `BIG DROP`: freier Fall über 2 B mit Stiften und Bumpern | letzte | Die Führende wird am letzten Kreuz ausgebremst | fällt mit dem Feld, Zoom 0,85 |
| 3 | `THE WHEEL` | großes Hebe-Rad (G3), hebt das Feld 1,5 B hoch | Fahrt nach oben | letzte | Zwei kämpfen um die letzte Tasche | fährt mit dem Rad hoch |
| 4 | `THE COLLAPSE` | Einsturz-Strecke (G4) auf dem hohen Sims | Die Strecke bricht hinter dem Feld weg | Gefahr | Die Letzte springt gerade noch oder fällt knapp | Totale 0,8: Einsturz und Feld zugleich |
| 5 | `TILT` | Kippbrett D1, Schiebetor C1 | — | letzte | Führungswechsel durchs Kippen | ruhig, fast fest |
| 6 | `SPLIT & DRUM` | Weiche mit zwei Wegen (G5), dann Drehtrommel B3 | Zwei Wege nebeneinander | letzte | Welcher Weg ist schneller? | Totale 0,8 über beide Wege, dann Trommel |
| 7 | `HAMMER ALLEY` | Pendelhämmer C2 | — | Gefahr | Der Favorit wird getroffen (Drehbuch) | mit der Spitze, Zeitlupe beim Treffer |
| 8 | `SHIFTING FLOORS` | Wandernde Böden D3 | — | letzte | Sturz über zwei Stockwerke | senkrecht mit dem Feld |
| 9 | `RING ESCAPE` | Ringausbruch B4 | — | letzte (4 → 3) | Ausbruch im letzten Moment | nah, Zoom 1,1 |
| 10 | `GRAND FINAL` | Abfahrt über alle drei Spalten: Drehkreuz, Kippbrett, Schanze, offene Zielgerade | — | Platz 1 bis 3 | Fotofinish unter 0,15 s | seitlich mit dem Feld, Zeitlupe, zum Schluss Totale aufs Ziel |

**Ablauf und Länge:**

| Teil | Dauer |
|---|---|
| Einstieg: Die Kamera fliegt in 7 s vom Ziel über das ganze Level zurück zum Start. Dazu die Karte `12 MARBLES. ONE COURSE.` / `THE LAST ONE IS OUT.` | 8 s |
| Abschnitte 1 bis 9, je rund 28 s Fahrt und 4 s Schleuse | rund 4,8 min |
| Finale | rund 40 s |
| Podest | 8 s |
| **Zusammen** | **rund 6 bis 7 min** |

- **Kapitel** je Abschnitt, zur Zeit der Freigabe, mit Titel wie bisher.
- **Mitte des Videos:** Die Weiche in Abschnitt 6 ist das sichtbar Neue zur Halbzeit.
- **Anzeige fest:** oben links `STAGE 4/10` und der Titel, oben rechts `8 LEFT`, rechts die Röhre `OUT`. Neu unten eine
  schlanke **Streckenleiste**: eine Linie mit zehn Strichen für die Schleusen und je einem farbigen Punkt pro Murmel an
  ihrer Stelle im Level. So sieht man auch, wer gerade außerhalb des Bildes ist.

---

## 4 · Kamera-Regie

Die Kamera ist ein kleiner Regisseur in der Simulation. Sie fährt auf einer **Schiene**, die das Level vorgibt, und
schaut auf einen **Brennpunkt**, den der Rennstand bestimmt.

**Schiene:**

- Je Abschnitt eine Liste von Punkten `{ p, x, y, zoom }`. `p` ist die Stelle auf der Ideallinie, `x`, `y` und `zoom`
  die Einstellung dort. Dazwischen wird weich übergeblendet.
- Ohne eigene Punkte folgt die Schiene der Ideallinie, an den Weltrand geklemmt. Eigene Punkte setzt man an den großen
  Momenten, zum Beispiel die Totale über der Weiche.
- So sieht jede Stelle aus wie eingerichtet, und die Kamera zappelt nicht mit jedem Hüpfer.

**Brennpunkt** (Stelle auf der Ideallinie):

| Lage | Brennpunkt |
|---|---|
| Fahrt | Führende plus Vorschau in Fahrtrichtung (Langvideo 25 % der Bildbreite, Short 22 % der Bildhöhe) |
| Erste in der Schleuse | Mitte zwischen den letzten zwei, die noch fehlen; Becken im Bild, solange der Zoom reicht |
| Aus | Halt auf der Aus-Rinne, 1,2 s |
| Freigabe | zurück zur Führenden |
| Gefahr mit Sturz | Halt auf der Absturzstelle, mit Zeitlupe wie bisher |
| Finale, letzte 3 s | Ziellinie und die ersten zwei |

**Bewegung (Startwerte):**

| Größe | Langvideo | Short |
|---|---|---|
| Ruhezone (Brennpunkt darf wandern, ohne dass die Kamera folgt) | ±10 % der Bildbreite | ±8 % der Bildhöhe |
| Nachlauf, kritisch gedämpft | 0,8 s | 0,5 s |
| Höchsttempo | 1,0 Bildbreiten je s | 1,5 Bildhöhen je s |
| Zoom | 0,8 bis 1,15, höchstens 0,1 je s | 0,85 bis 1,0, höchstens 0,15 je s |
| Drehen, Wackeln, Schnitt | nie | nie |

**Zwei Fassungen fürs Querformat** (Schalter „Kamera“ in der Oberfläche, `view.camera`):

- **Fahrt** (Empfehlung): wie oben beschrieben.
- **Abschnitte:** Jeder Abschnitt hat eine feste Einstellung, die ihn ganz zeigt. Die Kamera steht still, solange das
  Feld im Abschnitt ist, und gleitet erst bei der Freigabe in 1,5 s zum nächsten. Nur beim freien Fall und beim
  Hebe-Rad fährt sie mit. Das ist am nächsten an der bisherigen festen Übersicht.

Im Hochformat gibt es nur die Fahrt; ein ganzer Turm passt nicht in ein Bild.

**Ton zur Kamera:** Jedes Ereignis bekommt bei seiner Entstehung die Lage im Bild mit. Daraus kommt das Stereo-Panorama.
Klänge außerhalb des Bildes werden leiser: am Bildrand voll, eine halbe Bildbreite daneben 25 %, weiter weg 10 %.

---

## 5 · Neue Bausteine

| Nr. | Baustein | Was passiert | Startwerte |
|---|---|---|---|
| G1 | **Schleuse** | Becken mit Lichtschranke, Lampenreihe, Deckel, Aus-Rinne und Klappboden (Abschnitt 1.1) | Becken 8 d breit, 2,5 d tief, Boden 6°, Deckel 0,25 s, Boden offen 0,6 s |
| G2 | Fallschacht | Senkrechter Schacht mit versetzten Stiften und Bumpern, das Feld fällt mit Höchsttempo | 2 B tief, 7 d breit, Stifte alle 3 d |
| G3 | Hebe-Rad | Großes Schaufelrad (B2) mit Gehäuse, das das Feld auf eine höhere Ebene hebt | Durchmesser 1,5 B, 12 Taschen, 0,08 U/s |
| G4 | Einsturz-Strecke | Die Brücke (D2) über eine lange Strecke: Die Planken fallen hinter dem Feld, die Bruchkante folgt mit wachsendem Tempo | 40 Planken zu 2 d, Start 2 s nach der Ersten, die Bruchkante läuft mit 300 E/s an und wird bis 650 E/s schneller |
| G5 | Weiche mit zwei Wegen | Flip-Flop (B6) schickt abwechselnd nach links und rechts; links kurz mit Kolben, rechts lang mit Förderband; beide treffen sich vor der Trommel | Wege 60 % und 100 % der Länge |
| G6 | Gerüst | Holzstützen und Querbalken hinter der Bahn, ohne Kollision. Sie lassen das Level wie eine gebaute Maschine aussehen | dunkleres Holz, 60 % Deckkraft |

G1 bis G5 brauchen Kollision und Ereignisse; G6 ist nur Bild. Alle anderen Elemente kommen aus dem bestehenden Baukasten.

---

## 6 · Technik

- **Level aus Abschnitten:** Jeder Abschnitt wird in eigenen Koordinaten gebaut, wie bisher eine Bahn, und beim
  Einfügen um seinen Ursprung verschoben. Jeder Abschnitt nennt seinen Eingang und seinen Ausgang. Der Level-Bau prüft,
  dass der Ausgang eines Abschnitts genau auf dem Eingang des nächsten liegt (höchstens 1 E Abstand).
- **Eine Physikwelt für das ganze Level.** Das bestehende Raster hat keine Größengrenze, die die Level stören würde.
  Grenzen: höchstens 6000 feste Kapseln, 160 bewegte Teile, 12 Murmeln.
- **Bewegte Teile laufen von Anfang an** in ihrem Takt. Der Seed eines Abschnitts setzt nur deren Versatz. Weil die
  Murmeln einen Abschnitt erst erreichen, wenn sie dort sind, ändert ein anderer Abschnitts-Seed nichts davor. Das
  braucht das Casting.
- **Fortschritt:** eine Ideallinie über das ganze Level. Daraus kommen Rangfolge, Krone und roter Ring, Hängenbleiben,
  Streckenleiste und der Brennpunkt der Kamera.
- **Zustand sichern und laden** (`saveState`, `loadState`) für das Casting: Murmeln, Rennstand, Kamera, ausgelöste
  Elemente. Ein Test prüft: Laden und Weiterrechnen ergibt denselben Hash wie das Rennen am Stück.
- **Bild:**
  - Feste Bahnteile in Kacheln zu 512 × 512 E statt einer Textur je Bahn.
  - Bewegte Teile nur zeichnen, wenn sie im Bild sind.
  - Hintergrund in zwei Ebenen, die langsamer mitlaufen als die Bahn: weite Lichtflecken (0,15-fach) und das Gerüst
    G6 (0,5-fach). So liest man die Bewegung der Kamera, ohne dass es unruhig wird.
  - Die Anzeige wird nach der Kamera gezeichnet und bewegt sich nie.
- **Ton:** neues Ereignis `slot` (ein Lämpchen geht an, leiser Glockenton). Deckel und Klappboden nutzen `gate`,
  das Hebe-Rad den vorhandenen Holzklang. Panorama und Dämpfung wie in Abschnitt 4.
- **Dateien:**

  | Datei | Inhalt |
  |---|---|
  | `src/scenarios/knockout/level.js` (neu) | Level-Bau: Abschnitte mit Ursprung, Anschluss-Prüfung, Schleuse, Schiene |
  | `src/scenarios/knockout/camera.js` (neu) | Kamera-Regie, rein rechnend, wird von der Simulation aufgerufen |
  | `src/scenarios/knockout/levels/tower.js`, `levels/gauntlet.js` (neu) | die beiden Level |
  | `simulation.js` | Ablauf `course: 'level'`, Schleusen statt Ziel und Startrinne, Zustand sichern und laden |
  | `renderer.js`, `art.js` | Kacheln, Kamera, Hintergrund-Ebenen, Gerüst, Lampenreihe, Streckenleiste |
  | `knockout.js` | Einstellung „Strecke: Gesamtlevel / Bahn für Bahn“, Kamera-Schalter freigeben |
  | `scripts/knockout-casting.mjs` | `--level tower` und `--level gauntlet` |

---

## 7 · Stil (Ergänzung zur Stilbibel des ersten Plans)

Stil A „Holz & Abendlicht“ bleibt. Neu:

| Ebene | Vorgabe |
|---|---|
| Gerüst | Stützen und Querbalken in dunklem Holz (#6b4a2b bis #4a321d), 60 % Deckkraft, ohne Glanz. Es trägt die Bahn sichtbar, drängt sich aber nicht vor. |
| Tiefe | Der Hintergrund wird mit der Tiefe langsam dunkler und kühler: oben warmes Abendlicht, in der Mitte Petrol, unten tiefes Blau, im Finale ein goldener Schimmer. So spürt man, wie weit das Feld schon ist. |
| Schleuse | Becken aus Holz, Deckel aus Metall, Lämpchen gelb, grün und rot wie die Gefahren-Lämpchen. Über dem Becken ein kleines Schild `LAST ONE OUT` bzw. `TOP 5`. |
| Streckenleiste | Unten mittig, 1600 px breit, 4 px Holzlinie, Punkte mit 9 px Radius in Murmelfarbe, Letzte mit rotem Ring. |
| YELLOW und GOLD | Heute sehen sie sich zu ähnlich (#f5cf2a gegen #e3b23c). YELLOW wird zitronig (Startwert #f2ec3a), GOLD bekommt einen metallischen Glanzstreifen. Gilt für beide Abläufe, ändert nur das Bild. Wird in G0 gezeigt. |

**Kamera: so und nicht so**

- So: weich, vorausschauend, ruhig, solange nichts passiert. Große Momente bekommen eine eingerichtete Totale.
- Nicht so: einzelnen Hüpfern folgen, hinter der Spitze herhinken, schnelle Zooms, Drehen, Wackeln, Schnitte, Bilder
  über den Rand der Welt hinaus.

---

## 8 · Casting und Drehbuch

- **Short:** ganze Läufe je Seed, ohne Bild in Node. Vollständig ist ein Seed, wenn
  - das Video höchstens 40 s dauert,
  - an beiden Schleusen die Letzte, die noch reinkommt, und die Erste, die draußen bleibt, weniger als 1 d
    auseinanderliegen oder auf dem Hammer-Sims jemand stürzt,
  - die Führung im Finale wechselt und das Finale knapp ist (unter 0,3 s),
  - niemand festsitzt oder einen Stoß braucht,
  - bei `FOLLOW THE GOLD ONE!` GOLD das Finale erreicht.
- **Langvideo:** Drehbuch Abschnitt für Abschnitt wie in M8, mit echtem Sichern und Laden an jeder Freigabe statt
  Neuaufbau. Geschichte wie in M8; das Fotofinish soll dank offener Zielgerade unter 0,15 s liegen.
- **Kamera-Kennzahlen** je Lauf: Anteil der Fahrzeit mit der Führenden im Bild (Ziel mindestens 95 %), jedes Aus im
  Bild (Pflicht).

---

## 9 · Pakete

Ein Paket ist ein Commit. Nach jedem Paket werden ROADMAP, CHANGELOG, Gesamtplan Abschnitt 0 und der Bericht
nachgezogen.

| Paket | Inhalt | Abnahme |
|---|---|---|
| **G0** | **Vorschau aus einer Kopie, noch ohne Physik:** Levelkarte von THE TOWER und THE GAUNTLET als Bild im Stil A; je Format ein 20-s-Kameraclip über dem gezeichneten Level, die Murmeln als Punkte entlang der Ideallinie; im Querformat beide Fassungen (Fahrt, Abschnitte); YELLOW alt gegen neu | **Stopp: Der Nutzer gibt die Karten frei und wählt die Kamera fürs Querformat.** |
| G1 | Level-Technik: Abschnitte mit Ursprung, Anschluss-Prüfung, eine Physikwelt, Ideallinie über alles, Schleuse G1, Ablauf `course: 'level'`, Zustand sichern und laden; ein kleines Testlevel aus drei Abschnitten | Tests grün, 100 Läufe Testlevel ohne Hänger, alter Ablauf unverändert |
| G2 | Kamera-Regie und Bild: Schiene, Brennpunkt, Ruhezone, beide Fassungen; Kacheln, Hintergrund-Ebenen, Gerüst, Tiefe, Lampenreihe, Streckenleiste; Ton nach Bildlage | Seek-Prüfung pixelgleich an zwölf Zeitpunkten je Format, Node = Chromium, Kamera-Kennzahlen |
| G3 | THE TOWER komplett, Short-Casting, Vorlage „Short · Turm“ | 20-s-Probe vom Anfang |
| G4 | THE GAUNTLET Abschnitte 1 bis 5 mit Fallschacht, Hebe-Rad und Einsturz-Strecke | 100 Läufe bis zur fünften Schleuse ohne Hänger |
| G5 | Abschnitte 6 bis 10 mit Weiche und Finale, Einstiegsflug, Podest | 100 ganze Läufe ohne Hänger, Länge 6 bis 7 min |
| G6 | Drehbuch-Casting fürs Gesamtlevel, Kapitel, Vorlage „Langvideo · Gesamtlevel“ | 20-s-Proben: Einstieg mit Flug, eine Schleuse, Finale |
| G7 | Bericht, gesammelte Geschmacksfragen, README | — |

**Stopps:** Nur G0 ist ein harter Stopp. Danach wird mit den Empfehlungen durchgebaut. Am Ende liegen dem Nutzer die
20-s-Proben und die gesammelten Fragen vor. Der ganze Export kommt nur auf Auftrag.

**Vorlagen:** Bis G3 bzw. G6 bleiben die bisherigen Vorlagen unverändert. Danach zeigen „Short“ und „Langvideo“ auf
die Gesamtlevel; „Bahn für Bahn“ bleibt über die Einstellung wählbar.

---

## 10 · Prüfung

Nur gezielt, kein voller `npm test`.

- **`test/knockout-level.test.mjs` (neu):**
  - Anschlüsse passen, keine Überschneidung zwischen Abschnitten, alles innerhalb der Welt.
  - Schleuse: Quote im Short, „die Letzte ist raus“ im Langvideo, Sturz mit `TRAPS CLOSED`, `SAFE STAGE`.
  - Invarianten im ganzen Lauf (Turm drei Seeds, Gauntlet ein Seed).
  - Kamera: nie außerhalb der Welt, Tempo- und Zoomgrenzen eingehalten, jedes Aus im Bild, Führende mindestens 95 %
    der Fahrzeit im Bild.
  - Sichern und Laden ergibt denselben Hash wie am Stück.
- **`test/knockout-browser.test.mjs`:** Node = Chromium für beide Level, Seek-Prüfung mit Kamera.
- **Bestehende Knockout-Tests** bleiben unverändert grün (alter Ablauf bit-gleich).
- **`npm run golden`** einmal am Ende, unverändert.
- **Exporte:** nur 20-s-Proben.

---

## 11 · Gesammelte Geschmacksfragen (werden am Ende gestellt)

In G0 entscheidet der Nutzer nur zwei Dinge: Karten in Ordnung? Kamera im Querformat als Fahrt oder in Abschnitten?
Alles andere wird mit der Empfehlung gebaut und am Ende gefragt:

1. Level-Namen im Video: `THE TOWER` und `THE GAUNTLET`, andere Namen, oder gar kein Level-Name?
2. Streckenleiste unten im Langvideo: hilfreich oder zu viel?
3. Lampenreihe an den Schleusen: hilfreich oder zu viel?
4. Länge des Langvideos: 6 bis 7 min in Ordnung?
5. Weitere Türme für Shorts, zum Beispiel einer je Woche mit neuem Hauptelement?
6. Offene Fragen aus dem ersten Plan gelten weiter: Murmelnamen, Feldgröße 12 oder 16, Musik.
