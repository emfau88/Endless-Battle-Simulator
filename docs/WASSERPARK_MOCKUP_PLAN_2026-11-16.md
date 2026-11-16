# Endless Waterpark: Optik-Plan „so gut wie das Mockup“

Stand: 16.11.2026, Basis `codex/waterpark-optik` an `5f9df35` (noch nicht in `main`).
Auftrag des Nutzers: „Also auf den mockups sieht alles viel besser aus, bitte mach einen Plan um das zu erreichen.“
Verfasst als Umsetzungsauftrag, egal ob Codex oder Claude umsetzt.

Dieser Plan legt fest, **wie** es aussehen soll, nicht nur **was** zu tun ist. Zahlen sind Startwerte. Abweichen
ist erlaubt, wenn das Vorher/Nachher-Bild klar besser aussieht. Die Richtung steht fest: **Maßstab ist das Mockup.**

**Vor dem Lesen ansehen:**

- [Mockup und Ist-Stand mit Nummern](reference/waterpark-mockup-vs-ist-2026-11-16.jpg): Die Nummern 1–8 stehen
  für die Lücken, die unten behandelt werden.
- [Farben Ist gegen Ziel](reference/waterpark-palette-2026-11-16.jpg): Die Werte wurden am Mockup und am
  gerenderten Bild gemessen.
- [Mockup in voller Größe](nachweise/waterpark_mockup_16x9_2026-11-16.png) und
  [Prompt dazu](nachweise/waterpark_mockup_16x9_2026-11-16.prompt.txt). Der Prompt beschreibt Aufbau und Absicht.
- [Vorschau-Patch für die Wippe](reference/waterpark-wippe-vorschau-2026-11-16.patch), siehe P1.
- Bisherige Fassung: [Optikbericht vom 16.11.](WASSERPARK_OPTIK_2026-11-16.md)

## Warum das Mockup besser aussieht

Der Ist-Stand ist eine **Totale im Pyramiden-Stil**: kleine Tiere, dunkle und matte Farben, flache Formen.
Vieles schwebt ohne sichtbaren Halt. Das Mockup ist eine **Halbtotale** und unterscheidet sich in fünf Punkten:

1. **Näher dran.** Es gibt wenige große Formen. Die Tiere sind etwa 6,5 % der Bildhöhe groß, vorn in der
   Lagune etwa 10 %. Im Ist-Stand sind es 5,2 %.
2. **Volumen.** Jedes Bauteil hat eine Oberseite und eine sichtbare Vorderseite. Rinnen sind offene Schalen mit
   Wand, das Wippenbrett ist ein Balken, Decks und Beckenrand haben Stirnseiten.
3. **Helle, satte Farben.** Azurhimmel, türkise Lagune ohne Marineblau, honigfarbenes Holz, lindgrünes Laub
   und Creme statt Beige.
4. **Alles steht auf etwas.** Ein durchgehender Beckenrand trägt den Turmfuß, den Wippenbock, den
   Sprungbrettsockel und die Auslaufbecken der Rutschen.
5. **Wasser spielt die Hauptrolle.** Weiße Strömungsstreifen in den Rinnen, Schaum an jeder Übergabe,
   Spritzer an den Tieren, Lichtnetz und Glitzer in der Lagune, Wellenringe um die Schwimmer.

---

## 0 · Leitplanken (nicht verhandelbar)

**Technik**

- **Unverändert bleiben:**
  - Die Pyramide und die gemeinsame Tiergrafik, also `src/scenarios/pyramid.js` und
    `src/scenarios/shared/critter-art.js`. Die Tests `test/pyramid*.test.mjs` und `test/critter-art.test.mjs`
    müssen weiter bestehen.
  - `npm run golden`. Der Wasserpark ist nicht im Golden-Satz. Ändert sich dort ein Hash, wurde ein anderes
    Szenario berührt: zurückbauen.
- **Simulation:** Änderungen nur in **P1** (Wippe) und **P3** (Grundriss, Größe, Abstände). Alle anderen Pakete
  sind reine Darstellung.
  - Neue Zustandsfelder kommen in `stateHash()` (`simulation.js`).
  - Wiederholbarkeit gilt je Format, Seed und Konfiguration.
- **Renderer:** Er liest nur Simulationszustand und Zeit. Er baut keinen Zustand auf, der vom vorigen Bild abhängt.
  Spritzer, Schaum und Glitzer sind Funktionen von `t`, Ereignisprotokoll und Pose. So bleibt ein späterer
  Ausschnittsexport möglich (`supportsClips` steht weiter auf `false`).
- **Zwischenspeicher:** Statische Teile werden wie bisher einmal in Ebenen gezeichnet (`art.js`, `layer()`).
- **Zeitbudget** bei 1080p, gemessen mit `renderFrames(300)` vor und nach jedem Paket:
  - Tag höchstens **2,5 ms** pro Bild (jetzt 1,1 ms)
  - Finale höchstens **4 ms** (jetzt 2,2 ms)
- **Beide Formate:** Jedes Paket hält das Hochformat lauffähig und ansehnlich. Den eigenen Hochformat-Grundriss
  baut P8.

**Früher festgelegt, nicht wieder ändern**

- Feste Gesamtansicht: kein Zoom, kein Schwenk, kein Wackeln.
- Nur vier Tierarten (Küken, Pinguin, Schwein, Frosch). Keine Menschen, keine Wertung, kein Sieger.
- Die Tiere kommen aus der gemeinsamen Pyramiden-Tiergrafik (Körper, Gesicht, Kontur). Ändern dürfen sich
  nur Größe, Wahl der Pose (`mode`, `mood`) und die Posenlogik im Wasserpark-Renderer.
- Anzeige im Pyramiden-Stil (Titel, Fahrtenzähler). Die Sprachfrage Deutsch/Englisch ist getrennt offen (R30).
- Tageslauf, Abend, Nacht, Finale, Himmelsgäste, Fische, Sprechblasen, Ton und Parkprogramm bleiben in
  Funktion. Der Ton ändert sich nur bei der Wippe.
- Der Short beginnt mit den vier Freunden im Becherwerk. Der Tagesablauf (`story.js`) bleibt.

---

## 1 · Stilbibel: so soll es aussehen

**Charakter:** heller, freundlicher 2D-Vektorstil mit leichter Draufsicht („2,5D“). Jedes Bauteil zeigt
Oberseite und Vorderseite. Weiche Stufenschattierung in 2–3 Tönen, durchgehende dunkle Kontur. Hochsommer am
Nachmittag, reich gefüllt, aber aufgeräumt. Wie ein gut gemachtes Mobile-Spiel: nicht realistisch, nicht
gemalt, keine Spielzeug-Diorama-Optik.

| Regel | Festlegung |
|---|---|
| Bildausschnitt | Halbtotale. Die Anlage füllt x ≈ 0,02–0,98. Himmel oben ≈ 18–20 %, Lagune unten ≈ 27 % (`waterY` 0,72 bleibt). Wenige große Formen statt vieler kleiner. |
| Tiergröße | Am Bauwerk `R` = 36, also ≈ 6,7 % der kurzen Bildseite als Durchmesser. In der Lagune wachsen sie perspektivisch nach vorn bis ×1,45 (vorderste Reihe ≈ 9,5 %). Short: `R` = 38. |
| Licht | Von oben links. Schatten fallen weich nach unten rechts, in dunklem Türkis (`#0e4a55`) oder Braun (`#5a3c22`) statt Schwarz, Deckkraft 20–30 %. Kein Bloom. Sonnenstrahlen am Tag höchstens halb so stark wie jetzt (das Mockup zeigt keine Sonne). |
| Himmel | Verlauf `#2499fe` (oben) → `#32a3fd` → `#6ac9fd` (Horizont). Wolken weiß mit Schatten `#cbe8fd`. |
| Lagune | Am Rand `#4bdce2`, vorn unten `#14cad7`. **Nie Marineblau.** Schaum `#effbfb`. Spiegelung der Bauten höchstens 25 % Deckkraft, nach 120 px ausgeblendet. |
| Rinnenwasser | Fläche `#30e3ec`, Tiefe/Kern `#1abacb`, Streifen und Schaum weiß. |
| Creme (Rinnen, Decks, Trichter) | Oberseite `#efe4d3`, Glanzkante `#fef5d9`, Vorderseite `#d7bea0`, Schatten `#c8ae85`. |
| Holz | `#f1a353`, Schattenseite `#e3944a`, Kontur `#8a5426`. Honigfarben, **nicht** Dunkelbraun. |
| Stein | Beckenrand Oberseite `#e6d4bb`, Stirnseite `#ddc6aa`, Fugen `#c4ab8a`. Stützmauer `#bfa792`, graue Sockelsteine `#8d97a3`. |
| Grün | hell `#94c71f`, mittel `#4f9a2a`, dunkel `#216921`. Blüten `#f07aa0` und `#ffd34d`. |
| Glas und Metall | Glas `#399fbb` mit 35–45 % Deckkraft, Kanten `#e4fbf6`, Rahmen `#2b6571`. Becher `#a5bacb` mit Rand `#e8f0f6`. Sprungbrett `#f7e332`. |
| Kontur | Bauteile 2–2,5 px in `#6f5638` (vorhandenes `C.outline`), Glas `#2b6571`. Die Tiere behalten ihre Kontur. |
| Volumen | Die Vorderseite ist 12–18 % dunkler als die Oberseite. Tiefe: Rinnen 0,42 `R`, Wippenbrett ≥ 0,6 `R`, Decks 10–12 px, Beckenrand 14–18 px. |
| Wasser | Fließt überall sichtbar und ist überall weiß gezeichnet: Streifen, Schaum, Spritzer, Lichtnetz und Glitzer (siehe P5). |
| Hierarchie | Tiere > bewegtes Wasser > Attraktionen > Gerüst und Decks > Kulisse > Himmel. Die Kulisse ist etwas heller und kontrastärmer (Luftperspektive). |

**Nicht tun:** Fotostrukturen, Grunge, Neon, harte schwarze Schatten, dunkle Lagune, dünne Gittergerüste,
schwebende Teile ohne Stütze, Text im Bild außer der Anzeige, neue Tierarten, Menschen, Bloom über das ganze Bild.

**Bleibt so (nicht „mitoptimieren“):** Tiergrafik, Anzeige, Tageslauf-Logik und Farbabstufung über den Tag
(`grade()`), Himmelsgäste, Fische, Sprechblasen, Parkprogramm, Klänge außer der Wippe.

---

## 2 · Arbeitspakete in Reihenfolge

Reihenfolge: P1 → P2 → P3 → **Stil-Checkpoint** → P4 → P5 → P6 → P7 → P8 → P9 → Schlussabnahme.
Aufwand grob: P1 und P2 klein, P3 bis P6 groß, P7 bis P9 mittel.

### P1 · Wippe physikalisch, Rutschen mit Seitenwand (Nr. 3 und 8, vorab geprüft)

**Ist:**
- Das Brett kippt nach `sin(π·u)` immer zur Ausgangsseite, auch wenn das Tier noch am Einstieg steht.
- Am Ende ist es wieder waagerecht, obwohl das Tier noch auf dem Rand sitzt.
- Das Tier bleibt bis zu 2,5 s mitten auf dem schrägen Brett stehen. Grund: Die Landereservierung liegt
  `4·GAP` vor dem Routenende und damit auf dem Brett.
- Der Bock schwebt über der Hecke. Die Rinnen sind flache Bänder.

**Umsetzung:** [Vorschau-Patch](reference/waterpark-wippe-vorschau-2026-11-16.patch) anwenden
(`git apply`, auf `5f9df35` sauber). Er enthält:

- **Brett mit Gegengewicht** (`simulation.js`):
  - Neue Zustände `seesawAngle` und `seesawVel`. Zielwinkel `1,3·m·tanh(4·(2u−1))`, Feder K = 60, Dämpfung 5,4.
  - Gummianschläge bei ±`maxAngle`. Ein Aufschlag mit mehr als 0,25 rad/s löst Ereignis `seesaw` aus
    (Stärke 0,5–1).
  - Ohne Tier pendelt das Brett gedämpft zurück in die Waagerechte.
- **Tempo nach Neigung:** bergauf langsamer, bergab schneller, Faktor `clamp(0,6 + 3·Winkel, 0,28, 1,3)`.
- **Warten vor dem Ausguss:** Für Route 2 liegt der Wartepunkt jetzt vor dem Ausguss (`feature.leadS − R`).
- **Pose:** Die Pose rechnet mit dem Anteil `u` statt mit der absoluten Weglänge.
- **Abstieg vom Anschlag** (`layout.js`): Das Tier verlässt das Brett am gekippten Ende `boardTipped`.
  Die Abstände zu Ausguss und Auffangrinne zählen die Seitenwand mit (`rim + round(0,42·R)`).
- **Zeichnung** (`art.js`, `renderer.js`):
  - Seitenwand unter jeder Rinne, Tiefe `D = round(0,42·R)`.
  - Der Wippenbock reicht bis auf den Beckenrand.
  - Die Strömungsstreifen auf dem Brett laufen zum tieferen Ende.
  - Der Guss in die Auffangrinne folgt der Neigung.
- **Klang** (`waterpark.js`): `impactWood_medium_000/001` (Kenney, CC0, liegt schon in `assets/audio`) statt `synth:boing`.

**Zusätzlich:**
- `seesawAngle` und `seesawVel` in `stateHash()` aufnehmen.
- Simulationstest „Wippe folgt dem Gewicht“: kein Halt auf dem Brett, zwei Anschläge je Fahrt, beim Abstieg
  am Anschlag, in beiden Formaten.

**Abnahme:**
- In 10 Minuten Parktag (Seed 42, quer) dauern alle Wippfahrten 2,0–2,4 s auf dem Brett, ohne Stillstand.
  So in der Vorschau gemessen: 38 Fahrten, 76 Anschläge.
- Ausguss, Brett und Auffangrinne überdecken sich auch bei voller Neigung nicht.
- Vorschau als Maßstab: `output/waterpark-dev/waterpark_vorschau_wippe_v2_15s.mp4`.

### P2 · Farben und Licht (Nr. 2)

**Ist:** Himmel `#4b72ac`, Lagune vorn `#18528c`, Holz `#946a3e`/`#5a3c22`, Laub `#126321`–`#56af3e`.
Das ergibt einen dunklen, kühlen Pyramiden-Look.

**Umsetzung:**
- `art.js`: `C` auf die Werte der Stilbibel umstellen. Das betrifft Holz, Creme, Stein, Grün sowie Glas und
  Metall. Dazu `paintSky` (Verlauf, Wolkenschatten) und `paintBack` (Laub, Mauer, Felsen).
- `renderer.js`:
  - `drawWater`: Lagunenverlauf auf `#4bdce2` → `#14cad7`, Spiegelung höchstens 25 % mit Ausblendung nach unten.
  - `drawRays`/`drawSun`: Strahlen tagsüber höchstens halb so stark.
- `grade()` und `DAY_KEYS` bleiben. Prüfen, dass Abend und Nacht mit der helleren Grundpalette noch stimmen.
  Nur wenn nötig die Stärke von Nacht und Abend nachregeln, nicht den Tag.

**Abnahme:**
- Mittags (Bild A) liegen die Messpunkte aus dem [Farbvergleich](reference/waterpark-palette-2026-11-16.jpg)
  je Kanal höchstens ±16 vom Zielwert entfernt.
- Bild C (Abend) wirkt weiter warm, Bild D (Nacht) weiter dunkel, und die Gesichter bleiben lesbar.

### P3 · Grundriss als Halbtotale: Größe, Formen, Boden (Nr. 1, 3, 4, 6)

Das ist der größte Schritt. Danach muss das Bild A in Aufbau und Maßstab dem Mockup entsprechen.

**Größe:**
- Standard `size` 28 → **36**, Short 30 → **38**.
- Regler `r('size', 18, 30)` → `r('size', 24, 44)`, auch die Reglerdefinition in `waterpark.js`.
- Ebenfalls anpassen: die sechs Vorlagen `presets/waterpark-*.json`, die zwei Vorlagen
  `presets/production/waterpark-*.json` und `src/production-presets.js`.

**Rinnenbreite:** `TROUGH(R)` von `2R+30 / 2R+8` auf **`3,2R / 2,5R`** (bei R 36: 115 / 90 px).
Breite offene Schale wie im Mockup. Alle Abstände in `layout.js`, die mit `R + 15` rechnen, aus `TROUGH` ableiten.

**Grundriss quer** (`PLANS.land`, Anteile von Breite/Höhe, Startwerte nach Mockup gemessen):

| Bauteil | Mockup | Vorgabe |
|---|---|---|
| Turm | x 0,295–0,39, Dach oben 0,03, Deck 0,19 | `lift.x` 0,34 bleibt. Turmbreite ≈ 0,09 W (≈ 175 px) statt jetzt ≈ 70 px. |
| Deck | 0,39–0,65 auf y 0,19–0,22, zweite Ebene y 0,36 | Deck bleibt bei y 0,19. Eine zweite, nur dekorative Ebene bei y ≈ 0,36 zwischen Turm und Trichter. |
| Panoramarutsche | 1½ große S-Bögen von (0,29 / 0,21) bis Auslauf (0,25 / 0,72) | **Zwei große Bögen statt fünf Kehren.** Wendepunkte bei x ≈ 0,12 und 0,27. |
| Trichter | Mitte (0,66 / 0,31), rx 0,12, ry 0,065 | Wie Mockup. Ablaufrohr senkrecht bei x ≈ 0,655 bis zum Auslaufbecken. |
| Wippe | Drehpunkt (0,48 / 0,585), Länge 0,22 W | Tiefer und länger als jetzt (0,50 / 0,52 / 0,19). Bock steht auf dem Beckenrand. |
| Sprungrutsche | Gerade steil von (0,78 / 0,20) nach (0,92 / 0,68) | Runder Steinsockel auf dem Rand. Sprungbrett bei (0,885 / 0,65), Landung bei x ≈ 0,87. |
| Beckenrand | durchgehend y 0,68–0,73, zwei Steinlagen | Neu als eigenes Bauteil. Alle Füße stehen darauf. |
| Auslaufbecken | kurze cremefarbene Schalen auf dem Rand | Jede Route endet in einem kurzen Auslaufbecken auf dem Rand, das in die Lagune gießt (`mouths`). |

**Pulks:**
- Auf der Panoramarutsche Startabstand mindestens `3,5·GAP` und höchstens drei Tiere gleichzeitig
  (`_routeFree(0)`).
- Kein Tier darf auf einem Gefälle stehen bleiben. Wartepunkte nur auf Deck, im Lift oder vor einem Ausguss.

**Lagune:**
- Abstand im Becken für die Perspektive aus P7: `GAP_pool = 2·R·1,45 + 18`.
- Plätze prüfen: Querformat ≥ 24, Hochformat ≥ 16. Reicht es im Hochformat nicht, den Faktor dort auf 1,25 senken.

**Abnahme:**
- Bild A neben dem Mockup: Turm, vier Attraktionen und Beckenrand liegen höchstens ±3 % der Bildbreite
  daneben. Tiere am Bauwerk ≈ 6,5 % der Bildhöhe.
- Simulationstests: Die Tierzahl bleibt konstant. Bei 24 Tieren und langsamstem Tempo gibt es keine
  Dauerblockade.
- Der Short-Ablauf bei 8, 22 und 29 s stimmt (`scripts/waterpark-review.mjs`).

### Stil-Checkpoint (nach P1–P3)

Dem Nutzer vier Standbilder zeigen: A Tag quer, C Abend quer, E Short hoch bei 8 s und 29 s, jeweils neben dem
Mockup bzw. dem bisherigen Stand. Dazu ein 15-Sekunden-Clip mit Wippe. **Erst nach Freigabe weiter.**
Hier fällt die Entscheidung über Maßstab und Farben. Danach wird nur noch verfeinert.

### P4 · Bauteile in 2,5D (Nr. 3, 5, 6, 8)

| Bauteil | Vorgabe |
|---|---|
| Gerüst (`paintFrame`) | Statt des dünnen Gitters **wenige dicke Pfosten** (18–22 px) im Abstand von ≈ 0,1 W, Andreaskreuze nur zwischen Hauptpfosten. Holz mit Kontur und schmaler Schattenseite rechts. Unter Rinnen nur dort Stützen, wo sie tragen. |
| Decks (`paintDeck`) | Cremefarbene Planken: Oberseite `#efe4d3`, Stirnseite `#d7bea0` 10–12 px, Fugen alle ≈ 28 px. Holzgeländer: Pfosten 6 px, Handlauf 5 px. Blumenkästen und herabhängende Ranken an den Deckkanten. Die Tiere stehen am Geländer. |
| Turm (`paintTower`, `paintTowerFront`) | Glaskörper mit senkrechten Rahmenstreben alle ≈ 30 px und einem Glanzstreifen links. Cremefarbene Ringbänder oben und unten. **Facettiertes Pyramidendach** mit 4–5 Flächen, hell `#bff3f8` bis `#5cc8de`. Kette als Schleife mit zwei Zahnrädern (r ≈ 0,7 R, grau, Speichen). **Metallbecher** je Platz, Vorderkante vor dem Tierbauch. |
| Rinnen (`trough`) | Hinter dem Wasser sieht man die hintere Innenwand als helles Cremeband. Die Wasserrinne ist in der Mitte heller. Seitenwand aus P1. Die Glanzkante oben bleibt. |
| Trichter (`paintFunnel`, `paintFunnelFront`) | Dicker weißer Rand (8 px, `#fefdfc`). Außenschale mit senkrechten Paneelfugen (`#c8ae85`). Innen Wasser mit Strudelringen. Ablauf als Glasrohr wie bisher. |
| Wippe (`paintSeesawStand`, `drawSeesaw`) | Brett als Kastenbalken: Oberseite creme, Stirnseite ≥ 0,6 R, sichtbare Endkappen, Wasser oben. Große Nabe mit Speichen auf einem A-Bock mit Querstrebe, der auf einem Steinsockel am Beckenrand steht. |
| Sprungbrett (`paintSpringStand`, `drawSpring`) | Runder Steinsockel (Ellipse mit Stirnseite) auf dem Beckenrand, graue Schraubenfeder, gelbes Brett `#f7e332` mit Kontur. |
| Auslaufbecken | Kurze Cremeschalen mit Stirnseite auf dem Rand, Wasser gießt nach vorn in die Lagune. |

**Abnahme:** Für jedes Bauteil eine 2×-Nahaufnahme neben dem passenden Mockup-Ausschnitt.

### P5 · Wasser als Hauptdarsteller (Nr. 7)

- **Rinnen** (`drawFlow`):
  - Weiße Strömungsstriche entlang der Fahrtrichtung, auf steilen Stücken heller und schneller
    (Tempo ∝ `rollSpeed`).
  - Bei Tieren auf steilen Stücken und in Kurven 4–8 Spritzer, abhängig von `t` und Tier-ID.
- **Übergaben:** An jeder Übergabe weiße Schaumkappe mit zwei wachsenden Ringen und Spritzern, als Funktion
  von `t`. Das betrifft:
  - Rinne → Auslaufbecken → Lagune
  - Trichterrohr → Lagune
  - Wippe → Auffangrinne
  - Sprunglandung
  Vorhandene `pour()` dafür wiederverwenden.
- **Lagune** (`drawWater`):
  - Lichtnetz: vorberechnete Kachel mit hellen Linien (1–1,5 px, 10–18 % Deckkraft), die langsam treibt.
  - 8–14 funkelnde Glitzersterne.
  - Wellenringe (zwei je Schwimmer).
  - Feine Wellenlinien im Vordergrund.
  - Spiegelung nach P2.
- **Wasserfall rechts:** weiße Streifen und Schaum am Fuß.

**Abnahme:** Auf Standbildern liest sich das Wasser als fließend. Zeitbudget eingehalten.

### P6 · Kulisse und Tiefe

- **Ebenen von hinten nach vorn:**
  1. Himmel
  2. ferne Dschungelsilhouette, hell und kontrastarm
  3. Palmenreihe
  4. Felswand mit Wasserfall rechts
  5. Stützmauer aus beigen Blöcken (y ≈ 0,50–0,68), mit Terrassen links und rechts (Schirm, Liegen,
     Laterne) und Pflanzkästen
  6. Büsche und Blüten vor der Mauer
  7. Beckenrand
- **Links:** Rücklaufkanal mit Wasserrad und Holzbrücke gut sichtbar, wie im Mockup (Bausteine gibt es in `paintBack`).
- **Rahmenpalmen:** groß in den oberen Ecken, ohne Attraktionen oder Landungen zu verdecken.
- **Luftperspektive:** Ebenen 2 bis 4 sind ≈ 10 % heller und ≈ 20 % kontrastärmer als die Attraktionen.

**Abnahme:** In Bild A liest sich die Kulisse als Park, die Attraktionen stehen klar davor.

### P7 · Tiere: Größe, Posen, Lagune (Nr. 1)

- **Perspektive:** In der Lagune wächst der Maßstab von 1,0 am Beckenrand auf 1,45 am vorderen Bildrand.
  Das erledigt nur der Renderer. Die Abstände kommen aus P3.
- **Schwimmer:**
  - Halb eingetaucht: Ein Wasserband mit Wellenkante liegt über dem unteren Körperdrittel.
  - Wellenringe aus P5.
  - Abwechselnd winken über die vorhandene Pose `mood.cheer`, je Tier mit eigener Phase, etwa 30 % der Zeit.
    **Keine Änderung an `critter-art.js`.**
- **Auf dem Deck:** stehen in einer Reihe am Geländer und winken ab und zu.
- **Auf den Rutschen:** auf steilen Stücken und im Fall Arme hoch (gibt es schon), dazu Spritzer aus P5.
  Im Trichter Spiralaugen.
- **Im Lift:** sitzen im Metallbecher aus P4.

**Abnahme:** Bei 390 px Vorschaubreite ist jede Art erkennbar. Kein Gesicht wird von Schaum, Becher oder
Geländer verdeckt.

### P8 · Hochformat

- Eigener Grundriss in derselben Bildsprache:
  - Der Turm bildet die mittlere Achse.
  - Panoramarutsche links in zwei großen Bögen.
  - Trichter oben rechts, Wippe darunter, Sprungrutsche ganz rechts.
  - Beckenrand bei y ≈ 0,66–0,70, Lagune im unteren Viertel bis Drittel.
  - Tiere `R` 38.
- Text, Gesichter und Landungen bleiben außerhalb der Randbereiche für Videooberflächen.
- **Entscheidung des Nutzers vorab:** Soll zuerst mit dem Prompt des 16:9-Mockups ein 9:16-Mockup als Vorlage
  erzeugt werden?

**Abnahme:** Bilder E bei 8, 22 und 29 s, Lesbarkeit bei 390 px Breite.

### P9 · Abend, Nacht, Finale nachziehen

- Mit der neuen Palette prüfen:
  - Abendlicht warm
  - Lampen und Lichterkette
  - Nacht nicht schwarz, Lagune nachts tiefes Türkis
  - Mondglitzer
  - Finale mit farbigen Fontänen und Feuerwerk
- Nur nachregeln, was durch P2 bis P7 schlechter geworden ist.

**Abnahme:** Bilder C und D sowie das Finale im Vergleich zum bisherigen Stand.

---

## 3 · Prüfung und Nachweise

- **Tests nach jedem Paket:**
  ```bash
  node --test --test-concurrency=1 --test-timeout=1200000 test/waterpark-simulation.test.mjs test/waterpark-integration.test.mjs test/waterpark-browser.test.mjs test/critter-art.test.mjs test/pyramid.test.mjs test/pyramid-short.test.mjs
  ```
  Dazu `npm run golden` (unverändert) und `node scripts/waterpark-review.mjs`.
- **Zum Schluss:** einmal `npm test` vollständig.
- **Feste Referenzbilder**, Seed 42, Anzeige an, jeweils vorher/nachher als Sheet:

| Bild | Konfiguration | Zeigt |
|---|---|---|
| A | `presets/production/waterpark-long.json`, 16:9, t = 240 | Tag, Gesamteindruck neben dem Mockup |
| B | wie A, Ausschnitt um die Wippe während einer Fahrt | Wippe, Übergaben, Schaum |
| C | wie A, t = 570 | Abend, „Die letzte Runde“ |
| D | Parktag mit `ending: 'show'` | Nacht und Finale |
| E | `presets/production/waterpark-short.json`, 9:16, t = 8 / 22 / 29 | Hochformat, Short-Ablauf |
| F | A und E auf 390 px Breite verkleinert | Lesbarkeit auf dem Handy |

- Ablage:
  - Vollbilder unter `output/waterpark-mockup/`.
  - Sheets klein (JPEG, ≤ 400 KB) unter `docs/reference/`.
- Zeitmessung und Farbmessung (P2) im Bericht festhalten.

## 4 · Ablauf und Lieferung

- **Branch:** `codex/waterpark-mockup` von `codex/waterpark-optik`, oder von `main`, falls dieser Stand bis dahin
  dort angekommen ist.
- **Ein Commit pro Paket**, jedes Paket einzeln prüfen. Nach P3 der Stil-Checkpoint beim Nutzer.
- **Bericht** am Ende: `docs/WASSERPARK_MOCKUP_<Datum>.md` mit Sheets, Messwerten und Grenzen. Dazu ein Eintrag
  in `docs/CHANGELOG.md` und Nachführen von R30 in `docs/ROADMAP.md`.
- Kein Push und kein PR ohne Freigabe des Nutzers.
- **Bei Zweifeln** gilt das Mockup. Wo es nichts zeigt (Abend, Nacht, Hochformat), gilt die Stilbibel.
  Die Hierarchie aus Abschnitt 1 ist wichtiger als jeder Einzelwert.
