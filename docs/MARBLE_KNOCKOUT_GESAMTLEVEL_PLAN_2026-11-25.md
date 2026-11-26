# Marble Knockout: Gesamtlevel mit Kamerafahrt (Plan)

Stand: 25.11.2026, Basis Branch `murmelrennen/plan` an `13395c9` (R43 M1 bis M9 fertig, PR #54 offen). Verfasst als
Umsetzungsauftrag für Claude Code oder Codex. Roadmap: **R43, Teil 2**. Bericht: wird in
[MARBLE_KNOCKOUT_2026-11-25.md](MARBLE_KNOCKOUT_2026-11-25.md) fortgeschrieben.

**Wünsche des Nutzers vom 25.11.:**

- „Nichts ganz exportieren, weil wir erstmal ein richtig spannendes Gesamtlevel jeweils brauchen, am besten mit
  Kamerafahrt.“ Gemeint ist: statt zehn einzelner Bildschirm-Bahnen mit Schnitt dazwischen eine große,
  zusammenhängende Strecke, durch die das Feld am Stück fährt und der die Kamera folgt. Je ein Level fürs Short (9:16)
  und eins fürs Langvideo (16:9).
- Nach dem ersten Entwurf: „Ich will schon, dass da recht gut Action ist, viele Kugeln, die wetteifern, und dass es
  eben ein spannendes Rennen wird.“ Dazu: „den Plan umsetzen“.

Wo Zahlen stehen, sind es Startwerte. Abweichen ist erlaubt, wenn eine Probe es klar besser zeigt. Die Richtung bleibt
fest.

---

## Kurzfassung

- **Eine Strecke, ein Lauf, kein Schnitt.** Die Murmeln starten oben und fahren durch ein großes Level bis ins Ziel.
  Die Kamera fährt weich mit.
- **Viele Murmeln, viel Gedränge:** 16 im Short, 20 im Langvideo (bisher 8 und 12). Die Strecken sind überwiegend
  offen und breit: Nagelfelder, Mulden, Trommeln, Böden, mehrere Spuren übereinander. Lange Ein-Spur-Rampen gibt es
  nicht mehr. So kämpfen immer viele Murmeln gleichzeitig um Plätze.
- **Nur die Schnellsten kommen weiter.** Am Ende jedes Abschnitts steht eine **Schleuse**: ein Auffangbecken mit einer
  Lampenreihe, eine Lampe je freiem Platz. Ist das Becken voll, klappt der Deckel zu, und alle, die noch kommen,
  rollen ins Aus. Danach öffnet der Boden, und das Feld fällt gemeinsam in den nächsten Abschnitt.
- **Man sieht jederzeit, wer gerade rausfliegen würde:** Alle Murmeln unterhalb der Schnittlinie tragen den roten
  Ring. Die Kamera zeigt den Kampf an der Schnittlinie.
- **Short „THE TOWER“:** ein hoher Turm, rund sechs Bildschirme tief. 16 → 8 → 4 → 1. Rund 35 s, die Kamera fährt nur
  senkrecht.
- **Langvideo „THE GAUNTLET“:** ein Bergwerk aus Holz, drei Bildschirme breit und sechs tief. 20 Murmeln, zehn
  Abschnitte, Finale zu dritt. Dazu große Momente, die nur in einem großen Level gehen: freier Fall über zwei
  Bildschirme, ein Rad, das das Feld wieder nach oben hebt, eine Strecke, die hinter dem Feld einstürzt, und eine
  Weiche mit zwei sichtbaren Wegen. Rund 6 bis 7 Minuten.
- **Kamera ruhig und vorausschauend.** Kein Drehen, kein Wackeln, Zoom selten und langsam, die Anzeige bleibt fest.
  Abschaltbar.
- **Erst echt sehen, dann fertig bauen:** Zuerst baue ich die Technik und je Level den ersten Abschnitt mit echter
  Physik (G1). Dann zeige ich dir je Format einen 20-s-Probeclip, im Querformat in zwei Kamera-Fassungen, und eine
  Farbtafel aller Murmeln. Nach deiner Freigabe baue ich mit den Empfehlungen durch.
- **Das Bisherige bleibt** als Ablauf „Bahn für Bahn“. Die bisherigen Elemente sind die Bausteine der neuen Level.

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
- Obergrenzen im Gesamtlevel: 20 Murmeln, 6000 feste Kapseln, 160 bewegte Teile.

**Inhalt**

- Aus dem ersten Plan gilt weiter: lesbar vor prächtig, ruhig statt brutal (keine Explosionen, kein Wackeln), faire
  Physik ohne Boosts, Texte im Video englisch, Ton weich und leise, keine nachgebauten Serien.
- **Ausnahme vom ersten Plan:** Dort stand „Querformat ohne Kamerafahrt“. Für das Gesamtlevel wünscht der Nutzer
  ausdrücklich eine Kamerafahrt, auch im Querformat. Weil er Kamerabewegungen im Querformat zweimal abgelehnt hat
  (Scrap am 13.11., Marble XL am 16.11.), gibt es dort zwei Fassungen, und er wählt nach dem Probeclip.
- **Kein Bild außerhalb der Welt.** Die Kamera bleibt im Level. Am Rand liegt Hintergrund, nie Leere.
- **Jedes Aus ist im Bild.** Die Kamera-Regie sorgt dafür, und ein Test prüft es.

---

## 1 · Die Idee: ein Lauf, eine Strecke, viele Gegner

### 1.1 Die Schleuse

Die Schleuse verbindet zwei Abschnitte und ersetzt Ziel, Klappe und Startrinne des bisherigen Ablaufs.

1. **Ankommen:** Am Ende eines Abschnitts rollen die Murmeln durch eine Lichtschranke in ein Becken. Der Beckenboden
   ist 6° zur Ausgangsseite geneigt, die Erste liegt also vorn.
2. **Lampenreihe:** Über dem Becken hängt je freiem Platz ein Lämpchen. Jede Ankunft schaltet eins von Gelb auf Grün,
   mit einem leisen „ding“. Sind nur noch drei frei, blinken sie. Man sieht ohne Text, wie eng es wird.
3. **Schließen:** Ist das Becken voll, klappt der Deckel über den Einlauf (0,25 s). Niemand wartet auf Nachzügler.
4. **Aus:** Wer danach kommt, rollt über den Deckel in die Aus-Rinne neben dem Becken und fällt aus dem Level. Namen in
   der Mitte: `RED IS OUT`, bei mehreren `RED, BLUE & PINK ARE OUT` oder `4 ARE OUT`.
5. **Freigabe:** 1,2 s nach dem Schließen (Short 0,5 s) blinken die Lämpchen zweimal grün, der Boden klappt auf, und
   das Feld fällt gemeinsam in den nächsten Abschnitt. Die Reihenfolge der Ankunft bleibt grob erhalten.

**Gefahren-Abschnitte:** Wer unterwegs abstürzt, ist sofort raus und zählt zur Quote dieses Abschnitts. Sind genug
gestürzt, schließen die Gefahren (`TRAPS CLOSED`), und die Schleuse lässt alle übrigen hinein. Stürzen mehr als
nötig, verringert sich die Quote der nächsten Schleuse entsprechend, damit das Finale die geplante Größe behält.

**Warum Schleusen:**

- Das Feld findet sich an jeder Schleuse wieder zusammen. So kann eine Kamera es zeigen, ohne dauernd zwischen Spitze
  und Ende hin- und herzufahren.
- An jeder Schleuse kämpfen mehrere Murmeln gleichzeitig um die letzten Plätze. Das ist der Höhepunkt jedes Abschnitts.
- Die Strecke, die hinter dem Feld einstürzt, kommt trotzdem vor, als ein großer Moment (Abschnitt 4 im Langvideo).

### 1.2 Action: viele Murmeln, die wetteifern

Der Wunsch des Nutzers in Regeln gefasst. Sie gelten für beide Level und für jedes spätere.

1. **Viele Murmeln:** 16 im Short, 20 im Langvideo. Die ersten Schleusen nehmen viele heraus, später wird es enger
   (Abschnitte 2 und 3).
2. **Offene Strecke:** Mindestens die Hälfte jedes Abschnitts sind Stellen, an denen viele Murmeln zugleich
   durcheinanderrollen: Nagelfelder, Mulden, breite Treppen, Trommeln, Kippbretter, wandernde Böden. Eine schmale
   Ein-Spur-Rampe dauert höchstens 2 s am Stück.
3. **Mehrere Spuren:** In jedem Abschnitt mindestens eine Stelle mit zwei oder drei Wegen nebeneinander oder
   übereinander, die sich wieder treffen: Überholspur, Abkürzung mit Risiko, Weiche. Dort wird überholt.
4. **Rempeln erlaubt:** Engstellen (Trichter, Drehkreuz) sind so breit, dass zwei bis drei Murmeln um den Durchgang
   kämpfen, aber nichts dauerhaft verstopft.
5. **Schnittlinie sichtbar:** Wer gerade unterhalb der Quote liegt, trägt den roten Ring. Die Führende trägt die Krone.
   Auf der Streckenleiste im Langvideo trennt eine rote Linie „drin“ von „draußen“.
6. **Nie Stillstand:** Die Spitze steht nirgends länger als 3 s (Short 1,5 s).
7. **Man sieht die Gefahr kommen:** Die Kamera schaut in Fahrtrichtung voraus, Gefahren tragen rote Lämpchen.
8. **Vor jeder Schleuse wird gemischt:** Kurz davor steht ein Element, das die Reihenfolge neu würfelt (Drehkreuz,
   Nagelfeld, Trommel). Niemand ist sicher.
9. **Schnell und knifflig im Wechsel:** Im Langvideo alle 8 bis 12 s etwas Neues, im Short alle 4 bis 6 s.
10. **Kurze Einblendungen** (englisch, klein, sparsam, höchstens eine je 4 s): `NEW LEADER: BLUE`, `+6 PLACES!` bei
    einem großen Sprung, `PHOTO FINISH`.
11. **Das Ende ist knapp:** Die letzten 3 s vor dem Ziel sind eine offene Gerade ohne Engstelle. Dort ist ein echtes
    Fotofinish möglich (im bisherigen Finale trennte das Drehkreuz kurz vor dem Ziel das Feld, nie knapper als 0,23 s).
12. **Eine Geschichte:** im Langvideo wie in M8 (Außenseiterin rettet sich knapp und steht auf dem Podest, ein Favorit
    stürzt am Hammer), im Short die Frage aus dem ersten Bild.

**Das Casting misst Action** (Startwerte, in G1 an den ersten Abschnitten nachgemessen und dann festgelegt):
Platzwechsel je 10 s, Führungswechsel je Abschnitt, Abstand an der Schnittlinie beim Schließen (weniger als 1 d
zwischen der Letzten drinnen und der Ersten draußen), längste Zeit ohne Platzwechsel (höchstens 5 s).

### 1.3 Die Murmeln

| Feld | Farben (Startwerte) |
|---|---|
| Short, 16 | RED, ORANGE, YELLOW, LIME, GREEN, MINT, CYAN, BLUE, NAVY, PURPLE, PINK, BROWN, WHITE, SILVER, BLACK, GOLD |
| Langvideo, 20 | die 16 und dazu TEAL, SKY, LILAC, MAROON |

- Farben, die einen Nachbarn haben, bekommen ein weißes Band um die Mitte: NAVY, SKY, LILAC, MAROON, TEAL.
- SILVER und GOLD glänzen metallisch.
- YELLOW wird zitronig (#f2ec3a statt #f5cf2a), damit sie sich von GOLD abhebt.
- Die Farbtafel aller Murmeln in Videogröße kommt mit den Probeclips.

---

## 2 · Short „THE TOWER“ (9:16)

**Maße:** Bildbreite 1080 E, Murmelradius 28 E (d = 56), 16 Murmeln. Der Turm ist genau so breit wie das Bild und
rund sechs Bildschirme hoch (rund 11 500 E). Die Kamera fährt nur senkrecht.

> **Stand G3 (25.11.):** Gebaut ist der Turm 5560 E hoch (knapp drei Bildschirme). Abschnitt 2 hat drei Böden und
> keinen Hammer, das Finale zwei Ringe. Die Gründe und Messwerte stehen im
> [Bericht](MARBLE_KNOCKOUT_2026-11-25.md#g3--the-tower-komplett-casting-vorlage-short--turm-25112026).

```
 ┌──────────── 1080 ────────────┐   Bildschirm
 │ START: 16 Murmeln im Käfig   │   0
 │   PICK YOUR COLOR!           │
 │ 1 THE DROP                   │
 │   breites Nagelfeld          │
 │   zwei Spuren mit Drehkreuzen│
 │ ════ SCHLEUSE  TOP 8 ════    │   2
 │ 2 FALLING FLOORS             │
 │   vier wandernde Böden       │
 │   Sims mit Pendelhammer      │
 │ ════ SCHLEUSE  TOP 4 ════    │   4
 │ 3 FINAL                      │
 │   Ringausbruch               │
 │   Steilabfahrt mit Mulden    │
 │   offene Zielgerade          │
 │ ZIEL                         │   6
 └──────────────────────────────┘
```

| Zeit | Abschnitt | Was passiert | Weiter | Moment, den das Casting sucht |
|---|---|---|---|---|
| 0 s | Start | Erstes Bild: 16 Murmeln im Käfig, groß `PICK YOUR COLOR!`. Der Boden öffnet nach 0,4 s. | — | sofort Bewegung |
| 0,4 bis 10 s | 1 `THE DROP` | Breites Nagelfeld über die ganze Turmbreite, dann zwei Spuren nebeneinander mit je einem Drehkreuz, die sich im Trichter treffen | Schleuse `TOP 8`: acht raus | Platz 8 und 9 kommen fast gleichzeitig |
| 10 bis 21 s | 2 `FALLING FLOORS` | Vier wandernde Böden übereinander, darunter ein Sims mit einem Pendelhammer (Sturz = raus) | Schleuse `TOP 4` | Sturz über zwei Böden, die Führung wechselt |
| 21 bis 33 s | 3 `FINAL` | Ringausbruch, Steilabfahrt mit zwei Mulden, dann die offene Zielgerade | Sieger | Führungswechsel und Fotofinish mit Zeitlupe |
| 33 bis 36 s | Ende | `GOLD WINS!`, kurzer Halt | — | — |

- **Zweite Frage im Wechsel:** `FOLLOW THE GOLD ONE!` (Casting: GOLD erreicht das Finale).
- **Kamera:** waagerecht fest auf der Turmmitte, senkrecht mit Vorschau nach unten (Abschnitt 4). An den Schleusen
  zoomt sie höchstens auf 0,85 heraus, damit Becken und Schnittlinie zugleich zu sehen sind.
- **Anzeige:** kein Rahmen. Große Zeile beim Start jedes Abschnitts (`16 → TOP 8`, `8 → TOP 4`, `FINAL`), Namen beim
  Aus, Sieger. Alles in der Bildmitte.
- **Weitere Türme** entstehen später aus demselben Baukasten mit anderen Hauptelementen (Trommel, Kippbrett,
  Labyrinth). Das passt zu Leitlinie 6: gleiche Bildsprache, nicht austauschbar.

---

## 3 · Langvideo „THE GAUNTLET“ (16:9)

**Maße:** Ein Bildschirm (B) sind 1920 × 1080 E. Die Welt ist drei B breit und sechs B tief (rund 5760 × 6480 E).
Murmelradius 24 E statt 22, weil die Kamera nicht mehr eine ganze Bahn auf einmal zeigen muss. 20 Murmeln.

**Karte (Startwert):**

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

| Nr. | Titel im Video | Hauptelement | Großer Moment | Weiter | Moment fürs Casting | Kamera |
|---|---|---|---|---|---|---|
| 1 | `THE DROP` | Nagelwand A3 über volle Breite, zwei Trichter | — | 17 von 20 | Gedränge an den Trichtern | Totale beim Start, dann mit der Spitze |
| 2 | `TURNSTILES` | drei Drehkreuze auf zwei Spuren | danach `BIG DROP`: freier Fall über 2 B mit Stiften und Bumpern | 14 | Die Führende wird am letzten Kreuz ausgebremst | fällt mit dem Feld, Zoom 0,85 |
| 3 | `THE WHEEL` | großes Hebe-Rad (G3), hebt das Feld 1,5 B hoch | Fahrt nach oben | 12 | Kampf um die letzten Taschen | fährt mit dem Rad hoch |
| 4 | `THE COLLAPSE` | Einsturz-Strecke (G4) auf dem hohen Sims | Die Strecke bricht hinter dem Feld weg | 10 (Sturz zählt) | Die Letzten springen gerade noch | Totale 0,8: Einsturz und Feld zugleich |
| 5 | `TILT` | zwei Kippbretter übereinander, Schiebetor C1 | — | 8 | Führungswechsel durchs Kippen | ruhig |
| 6 | `SPLIT & DRUM` | Weiche mit zwei Wegen (G5), dann Drehtrommel B3 | Zwei Wege nebeneinander | 7 | Welcher Weg ist schneller? | Totale 0,8 über beide Wege, dann Trommel |
| 7 | `HAMMER ALLEY` | Pendelhämmer C2 über zwei Spuren | — | 6 (Sturz zählt) | Ein Favorit wird getroffen (Drehbuch) | mit der Spitze, Zeitlupe beim Treffer |
| 8 | `SHIFTING FLOORS` | Wandernde Böden D3 | — | 5 | Sturz über zwei Stockwerke | senkrecht mit dem Feld |
| 9 | `RING ESCAPE` | Ringausbruch B4 | — | 3 | Ausbruch im letzten Moment | nah, Zoom 1,1 |
| 10 | `GRAND FINAL` | Abfahrt über alle drei Spalten: Drehkreuz, Kippbrett, Schanze, offene Zielgerade | — | Platz 1 bis 3 | Fotofinish unter 0,15 s | seitlich mit dem Feld, Zeitlupe, zum Schluss Totale aufs Ziel |

**Ablauf und Länge:**

| Teil | Dauer |
|---|---|
| Einstieg: Die Kamera fliegt in 7 s vom Ziel über das ganze Level zurück zum Start. Dazu die Karte `20 MARBLES. ONE COURSE.` / `ONLY THE FASTEST GO ON.` | 8 s |
| Abschnitte 1 bis 9, je rund 28 s Fahrt und 2 s Schleuse | rund 4,5 min |
| Finale | rund 40 s |
| Podest | 8 s |
| **Zusammen** | **rund 6 min** |

- **Kapitel** je Abschnitt, zur Zeit der Freigabe, mit Titel wie bisher.
- **Mitte des Videos:** Die Weiche in Abschnitt 6 ist das sichtbar Neue zur Halbzeit.
- **Anzeige fest:** oben links `STAGE 4/10` und der Titel, oben rechts `12 LEFT · TOP 10`, rechts die Röhre `OUT`.
  Neu unten eine schlanke **Streckenleiste**: eine Linie mit Strichen für die Schleusen und je einem farbigen Punkt pro
  Murmel an ihrer Stelle im Level, dazu die rote Schnittlinie. So sieht man auch, wer gerade außerhalb des Bildes ist.

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
| Erste Hälfte eines Abschnitts | Spitzengruppe (Platz 1 bis 3) plus Vorschau in Fahrtrichtung (Langvideo 25 % der Bildbreite, Short 22 % der Bildhöhe) |
| Zweite Hälfte bis zum Schließen | Schnittlinie: die Murmeln um den letzten freien Platz. Die Kamera zoomt so weit heraus (höchstens bis zur Grenze), dass Becken und Schnittlinie zugleich im Bild sind. |
| Schließen und Aus | Halt auf Deckel und Aus-Rinne, 1,2 s |
| Freigabe | zurück zur Spitze |
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
Klänge außerhalb des Bildes werden leiser: am Bildrand voll, eine halbe Bildbreite daneben 25 %, weiter weg 10 %. Mit
20 Murmeln gilt die Dichtegrenze aus M6 weiter (höchstens drei Klänge je 0,3 s), damit es nicht prasselt.

---

## 5 · Neue Bausteine

| Nr. | Baustein | Was passiert | Startwerte |
|---|---|---|---|
| G1 | **Schleuse** | Becken mit Lichtschranke, Lampenreihe, Deckel, Aus-Rinne und Klappboden (Abschnitt 1.1) | Becken so breit, dass die Quote in zwei bis drei Lagen liegt; Boden 6°, Deckel 0,25 s, Boden offen 0,6 s |
| G2 | Fallschacht | Senkrechter Schacht mit versetzten Stiften und Bumpern, das Feld fällt mit Höchsttempo | 2 B tief, 9 d breit, Stifte alle 3 d |
| G3 | Hebe-Rad | Großes Schaufelrad (B2) mit Gehäuse, das das Feld auf eine höhere Ebene hebt | Durchmesser 1,5 B, 16 Taschen zu je zwei Murmeln, 0,08 U/s |
| G4 | Einsturz-Strecke | Die Brücke (D2) über eine lange Strecke: Die Planken fallen hinter dem Feld, die Bruchkante folgt mit wachsendem Tempo | 40 Planken zu 2 d, Start 2 s nach der Ersten, Bruchkante 300 E/s, wird bis 650 E/s schneller |
| G5 | Weiche mit zwei Wegen | Flip-Flop (B6) schickt abwechselnd nach links und rechts; links kurz mit Kolben, rechts lang mit Förderband; beide treffen sich vor der Trommel | Wege 60 % und 100 % der Länge |
| G6 | Gerüst | Holzstützen und Querbalken hinter der Bahn, ohne Kollision. Sie lassen das Level wie eine gebaute Maschine aussehen | dunkleres Holz, 60 % Deckkraft |
| G7 | Breite Treppe | Mehrere kurze, versetzte Stufen über die ganze Breite: viele Murmeln springen zugleich, ständig wechseln Plätze | Stufe 3 d breit, 1 d tief, Versatz je Reihe |

Alle anderen Elemente kommen aus dem bestehenden Baukasten.

---

## 6 · Technik

- **Level aus Abschnitten:** Jeder Abschnitt wird in eigenen Koordinaten gebaut, wie bisher eine Bahn, und beim
  Einfügen um seinen Ursprung verschoben. Jeder Abschnitt nennt seinen Eingang und seinen Ausgang. Der Level-Bau prüft,
  dass der Ausgang eines Abschnitts genau auf dem Eingang des nächsten liegt (höchstens 1 E Abstand).
- **Eine Physikwelt für das ganze Level.** Das bestehende Raster hat keine Größengrenze, die die Level stören würde.
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
  | `src/scenarios/knockout/levels.js` (neu) | die beiden Level, Abschnitt für Abschnitt |
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
| Schleuse | Becken aus Holz, Deckel aus Metall, Lämpchen gelb, grün und rot wie die Gefahren-Lämpchen. Über dem Becken ein kleines Schild `TOP 8` usw. |
| Roter Ring | für alle Murmeln unterhalb der Schnittlinie, weich pulsierend wie bisher bei der Letzten |
| Streckenleiste | Unten mittig, 1600 px breit, 4 px Holzlinie, Punkte mit 8 px Radius in Murmelfarbe, rote Schnittlinie |
| Murmeln | Farben und Bänder nach Abschnitt 1.3 |

**Kamera: so und nicht so**

- So: weich, vorausschauend, ruhig, solange nichts passiert. Große Momente bekommen eine eingerichtete Totale.
- Nicht so: einzelnen Hüpfern folgen, hinter der Spitze herhinken, schnelle Zooms, Drehen, Wackeln, Schnitte, Bilder
  über den Rand der Welt hinaus.

---

## 8 · Casting und Drehbuch

- **Short:** ganze Läufe je Seed, ohne Bild in Node. Vollständig ist ein Seed, wenn
  - das Video höchstens 40 s dauert,
  - an beiden Schleusen die Letzte drinnen und die Erste draußen weniger als 1 d auseinanderliegen oder auf dem
    Hammer-Sims jemand stürzt,
  - die Action-Werte aus Abschnitt 1.2 erreicht sind,
  - die Führung im Finale wechselt und das Finale knapp ist (unter 0,3 s),
  - niemand festsitzt oder einen Stoß braucht,
  - bei `FOLLOW THE GOLD ONE!` GOLD das Finale erreicht.
- **Langvideo:** Drehbuch Abschnitt für Abschnitt wie in M8, mit echtem Sichern und Laden an jeder Freigabe statt
  Neuaufbau. Geschichte wie in M8; das Fotofinish soll dank offener Zielgerade unter 0,15 s liegen.
- **Kamera-Kennzahlen** je Lauf: Anteil der Fahrzeit mit der Führenden im Bild (Ziel mindestens 90 %), jedes Aus im
  Bild (Pflicht).

---

## 9 · Pakete

Ein Paket ist ein Commit. Nach jedem Paket werden ROADMAP, CHANGELOG, Gesamtplan Abschnitt 0 und der Bericht
nachgezogen.

| Paket | Inhalt | Abnahme |
|---|---|---|
| **G1** | Grundlage: Level aus Abschnitten, Schleuse mit Quote, Ablauf `course: 'level'`, Kamera-Regie in der Simulation (beide Fassungen), Bild mit Kamera, neue Felder mit 16 und 20 Murmeln; je Level der erste Abschnitt mit echter Physik | **Stopp mit Probeclips:** je Format 20 s vom ersten Abschnitt, im Querformat in beiden Kamera-Fassungen, dazu die Farbtafel. Der Nutzer wählt die Kamera fürs Querformat und sagt, ob Action und Feldgröße passen. **Stand 25.11.: erledigt, gewählt ist die Fahrt** ([Bericht](MARBLE_KNOCKOUT_2026-11-25.md#g1--gesamtlevel-grundlage-und-erste-abschnitte-25112026)). |
| G2 | Bild fertig: Kacheln, Hintergrund-Ebenen, Gerüst, Tiefe, Lampenreihe, Streckenleiste, Einblendungen; Ton nach Bildlage; Zustand sichern und laden | Seek-Prüfung pixelgleich an zwölf Zeitpunkten je Format, Node = Chromium, Kamera-Kennzahlen. **Stand 25.11.: erledigt**, Seek-Prüfung an sechs Zeitpunkten je Format ([Bericht](MARBLE_KNOCKOUT_2026-11-25.md#g2--gesamtlevel-bild-fertig-ton-nach-bildlage-sichern-und-laden-25112026)) |
| G3 | THE TOWER komplett, Short-Casting, Vorlage „Short · Turm“ | 20-s-Probe vom Anfang. **Stand 25.11.: erledigt**, mit Abweichungen nach Messung (drei Böden ohne Hammer, zwei Ringe, Turm knapp drei Bildschirme hoch); Proben vom Anfang und vom Finale ([Bericht](MARBLE_KNOCKOUT_2026-11-25.md#g3--the-tower-komplett-casting-vorlage-short--turm-25112026)) |
| G4 | THE GAUNTLET Abschnitte 1 bis 5 mit Fallschacht, Hebe-Rad und Einsturz-Strecke | 100 Läufe bis zur fünften Schleuse ohne Hänger. **Stand 26.11.: erledigt**, mit Abweichungen nach Messung (Riesenrad mit Gondeln statt Schaufelrad, hebt rund 800 E; Brücke mit fester Fangbahn, 15 Planken, Bruchkante bis 800 E/s; Kippbretter mit Grundneigung) ([Bericht](MARBLE_KNOCKOUT_2026-11-25.md#g4--the-gauntlet-abschnitte-1-bis-5-26112026)) |
| G5 | Abschnitte 6 bis 10 mit Weiche und Finale, Einstiegsflug, Podest | 100 ganze Läufe ohne Hänger, Länge rund 6 min. **Stand 26.11.: erledigt**, mit Abweichungen nach Messung (Finale mit Starttor und Nagelfeld für knappe Zieleinläufe; Hammergasse als eine Spur; Ringausbruch mit zwei Ringen; Länge rund 3:15 min) ([Bericht](MARBLE_KNOCKOUT_2026-11-25.md#g5--the-gauntlet-komplett-abschnitte-6-bis-10-einstiegsflug-podest-26112026)) |
| G6 | Drehbuch-Casting fürs Gesamtlevel, Kapitel, Vorlage „Langvideo · Gesamtlevel“ | 20-s-Proben: Einstieg mit Flug, eine Schleuse, Finale. **Stand 26.11.: erledigt** (Geschichte: Außenseiterin im Fotofinish statt nur aufs Podest, weil im Finale nur drei fahren; Proben mit zwei Schleusen) ([Bericht](MARBLE_KNOCKOUT_2026-11-25.md#g6--drehbuch-casting-fürs-gesamtlevel-vorlage-langvideo-26112026)) |
| G7 | Bericht, gesammelte Geschmacksfragen, README | — |

**Stopps:** Nur nach G1 ist ein harter Stopp. Danach wird mit den Empfehlungen durchgebaut. Am Ende liegen dem Nutzer
die 20-s-Proben und die gesammelten Fragen vor. Der ganze Export kommt nur auf Auftrag.

**Vorlagen:** Bis G3 bzw. G6 bleiben die bisherigen Vorlagen unverändert. Danach zeigen „Short“ und „Langvideo“ auf
die Gesamtlevel; „Bahn für Bahn“ bleibt über die Einstellung wählbar.

---

## 10 · Prüfung

Nur gezielt, kein voller `npm test`.

- **`test/knockout-level.test.mjs` (neu):**
  - Anschlüsse passen, keine Überschneidung zwischen Abschnitten, alles innerhalb der Welt.
  - Schleuse: Quote, Sturz mit `TRAPS CLOSED`, zu viele Stürze.
  - Invarianten im ganzen Lauf.
  - Kamera: nie außerhalb der Welt, Tempo- und Zoomgrenzen eingehalten, jedes Aus im Bild.
  - Sichern und Laden ergibt denselben Hash wie am Stück (ab G2).
- **`test/knockout-browser.test.mjs`:** Node = Chromium für beide Level, Seek-Prüfung mit Kamera (ab G2).
- **Bestehende Knockout-Tests** bleiben unverändert grün (alter Ablauf bit-gleich).
- **`npm run golden`** einmal am Ende, unverändert.
- **Exporte:** nur 20-s-Proben.

---

## 11 · Gesammelte Geschmacksfragen (werden am Ende gestellt)

Beim Stopp nach G1 entscheidet der Nutzer nur: Kamera im Querformat als Fahrt oder in Abschnitten? Passen Action und
Feldgröße? Alles andere wird mit der Empfehlung gebaut und am Ende gefragt:

1. Level-Namen im Video: `THE TOWER` und `THE GAUNTLET`, andere Namen, oder gar kein Level-Name?
2. Streckenleiste unten im Langvideo: hilfreich oder zu viel?
3. Lampenreihe an den Schleusen und Einblendungen wie `NEW LEADER`: hilfreich oder zu viel?
4. Länge des Langvideos: rund 6 min in Ordnung?
5. Weitere Türme für Shorts, zum Beispiel einer je Woche mit neuem Hauptelement?
6. Offene Fragen aus dem ersten Plan gelten weiter: Murmelnamen, Musik. Die Feldgröße ist mit „viele Kugeln“
   beantwortet.
