# Cloud Wars: Umsetzungsplan für ein neues Szenario

Stand: 18.11.2026, Basis `main` an `18ebdad`. Verfasst als Umsetzungsauftrag (für Codex oder Claude Code).
Roadmap-Nummer: **R38**. Szenario-Kennung: `cloudwars`, Anzeigename „Cloud Wars (in Arbeit)“, bis der Nutzer
es abnimmt.

**Worum es geht:** Vier Team-Wolken treiben über eine Landschaft aus Wäldern, Feldern, Dörfern, Straßen und Seen,
von oben gesehen. Sie fressen kleine Wolken und wachsen. Wer zu groß wird, wird zur Gewitterwolke, schießt Blitze
und setzt Wälder in Brand. Am Ende beherrscht eine Wolke den Himmel. Alles läuft von selbst; niemand steuert.

Wo Zahlen stehen, sind es Startwerte. Abweichen ist erlaubt, wenn ein Vorher/Nachher-Bild oder eine Messung es
klar besser zeigt. Die Richtung bleibt fest.

**Vorlage ansehen (wichtig, vor dem Lesen):**

- Prototyp „Wolkenflug“ als spielbare Einzeldatei: [cloudwars-prototype.source.html](reference/cloudwars-prototype.source.html)
  (im Browser öffnen; Steuerung per Finger oder Maus, Taste „Regen“). Herkunft: [CLOUDWARS_SOURCE.md](reference/CLOUDWARS_SOURCE.md).
- Standbilder des Prototyps: [Felder am Tag](reference/cloudwars-prototyp-tag-felder-2026-11-18.jpg),
  [Dorf in Gefahr](reference/cloudwars-prototyp-dorf-mission-2026-11-18.jpg),
  [Abend](reference/cloudwars-prototyp-abend-2026-11-18.jpg), [Nacht](reference/cloudwars-prototyp-nacht-2026-11-18.jpg),
  [Nebel am Morgen](reference/cloudwars-prototyp-nebel-2026-11-18.jpg).

---

## 0 · Leitplanken (nicht verhandelbar)

**Technik**

- Neuer Ordner `src/scenarios/cloudwars/`, Anmeldung in `src/scenarios/cloudwars.js`. Kein bestehendes Szenario wird
  angefasst. `npm run golden` bleibt unverändert.
- **Kein `Math.random`, kein `Date.now`, kein `performance.now`** in Simulation und Darstellung. Der Prototyp nutzt
  `Math.random` an 64 Stellen. Alle werden ersetzt: Ablauf über `EBS.RNG`, Aussehen über eine zustandslose
  Hash-Funktion `h(seed, id, k)`.
- **Seek-Regel:** Partikel (Regen, Rauch, Funken, Vögel, Autos, Nebel) werden aus der Zeit `t` berechnet, nicht
  fortgeschrieben. Der Renderer speichert nur Caches, die er aus dem Simulationszustand jederzeit neu bauen kann.
- Der Renderer liest die Simulation nur. Ton entsteht aus dem Ereignisprotokoll.
- Zeichnen über den Canvas-Adapter `src/canvas-scene.js` (wie Scrap, Territory, Mycelium). Der Prototyp ist reines
  Canvas 2D und lässt sich so fast unverändert übernehmen.
- Feste Obergrenzen (Pools): höchstens 4 Teams × 3 Team-Wolken, 28 neutrale Wolken, 40 Brandzellen gleichzeitig,
  4 Feuerwehrautos, 24 Autos, 4 Boote. Nichts wächst mit der Laufzeit.

**Gestaltung (Arbeitsregeln und frühere Entscheidungen des Nutzers)**

- Alle Texte im Video englisch. Bedienfeld und Dokumentation deutsch.
- Querformat 16:9: **feste Übersicht, keine Kamerafahrt.** Hochformat 9:16: ebenfalls feste Ansicht als Standard.
  Eine langsame Verfolgung ist nur ein späteres Wahlpaket und muss abschaltbar sein.
- Shorts ohne Rahmen und ohne HUD am Rand, rund 30 Sekunden, mit verdeckter Regie für Spannung.
- Ton weich und leise, feste Mischung (kein Einmessen auf −14 LUFS). Das Hörurteil liegt beim Nutzer.
- Kein Bildschirmwackeln bei Blitzen. Blitze hellen das Bild kurz auf, mehr nicht.
- Optik-Änderungen erst als gerenderte Vorschau-Bilder, dann umsetzen.
- **Kein Export über 20 Sekunden ohne ausdrücklichen Auftrag.**

---

## 1 · Zielbild

### Short (9:16, rund 30 Sekunden): „Which cloud rules the sky?“

| Zeit | Was man sieht |
|---|---|
| 0–2 s | Vier kleine Team-Wolken sind schon in Bewegung und fressen die ersten Wölkchen. Große Frage oben: **WHICH CLOUD RULES THE SKY?** (blendet nach 2,5 s aus). |
| 3–10 s | Die Wolken wachsen sichtbar, die Puffs fliegen in die Fresserin. Eine Wolke wird zur ersten Gewitterwolke: **NIMBUS IS A STORM!** |
| 10–20 s | Blitze. Ein Wald brennt, ein Feuerwehrauto fährt über die Straße hin. Die Gewitterwolke trifft eine schwache Gegnerin; die zerfällt in kleine Wölkchen: **STRATUS IS GONE**. |
| 20–30 s | Die Gewitterwolke regnet sich klein. Die Außenseiterin hat heimlich gefressen und verschluckt sie: **CIRRUS RULES THE SKY!** Danach noch 1,5 s ruhiges Bild, damit der Ton ausklingt. |

### Langvideo (16:9, 10 bis 30 Minuten): „Cloud Wars“

- Runden wie beim Naval-Modus „Ruhiges Duell“. Eine Runde endet, wenn nur ein Team übrig ist, spätestens nach 6 Minuten.
  Dann gewinnt die größte Gesamtmasse.
- Punktestand oben links, klein. Danach eine Pause von 4 s, ein neuer Morgen und neue Wolken.
- Ein Tageslauf von 12 Minuten (Morgen mit Nebel, Mittag, Abendlicht, Nacht mit Dorflichtern).
- Wetterphasen alle 60–120 s: klar, Hitzewelle, Gewitterfront, Nebel.

---

## 2 · Was aus dem Prototyp übernommen wird

| Baustein im Prototyp | Übernahme | Anpassung |
|---|---|---|
| Rauschen und Gelände (`hash2`, `vnoise`, `fbm`, `sampleT`, Schwellen `LAKE 0.35`, `RIVW 0.0065`, `FOREST 0.565`) | ja, nach `terrain.js` | Hash mit Seed und Ganzzahl-Arithmetik (`Math.imul`) statt Gleitkomma-Sinus |
| Felder (`fieldCell`, `cellField`), Straßennetz (`RS 560`, `getEdge`, Bézier-Polylinien), Dörfer (`getVillage`, Kirche ab 18 Häusern) | ja | Nur für den sichtbaren Ausschnitt, einmal vorgezeichnet |
| Stückweises Zeichnen in Kacheln (`renderChunk`, LRU) | nein | Der Ausschnitt ist fest, also einmal als ganze Textur vorzeichnen |
| Wolken-Sprites (`puffLayout`, `buildSprite`, Weichzeichnen über Schatten, `source-atop`-Lichtseite, `PAL`) | ja, nach `art.js` | Teamfarbe dazu (Abschnitt 4), Puff-Anordnung aus dem Seed der Wolke |
| Absorbieren mit fliegenden Puffs (`startEat`, `eatPuffPos`, Federn `wob`) | ja | Flugbahn aus dem Fress-Ereignis und `t − t0`, nicht fortgeschrieben |
| Gewitter, Blitz (`strike`, `zap`), Feuer mit Brandring und Rauch, Löschen durch Regen | ja | Feuer als Raster in der Simulation, Rauch aus `t` berechnet |
| Feuerwehrauto (`dispatchTruck`), Autos, Boote mit Kielwasser | ja | Autos und Boote rein aus `t` (Darstellung), Feuerwehr in der Simulation, weil sie Feuer dämpft |
| Tageslauf (`SKY`-Stützpunkte, längere Schatten am Abend), Nebelbänke, Nachtlichter | ja | Aus `t` und Wetterplan, keine eigenen Zähler |
| Missionen, dürre Felder, Punkte, Steuerung, Regen-Taste, Wald-Leiste | nein | Spielmechanik. Ersatz: Wetterphasen und englische Einblendungen |
| Kamera-Zoom nach Wolkengröße, Schrägblick `TILT` | nein | Feste Ansicht; die Höhe der Wolken wird durch Versatz und Schatten gezeigt (Abschnitt 4) |
| Synthetischer WebAudio-Ton | nein | Klangtabelle des Simulators (Abschnitt 6) |

---

## 3 · Regeln der Simulation (Startwerte)

Einheit: **GE** = Geländeeinheit des Prototyps. Takt 60 Schritte je Sekunde, `dt = 1/60 × timeScale`.

### Welt und Ausschnitt

- Maßstab: **1 GE = 1,4 logische Einheiten.** Hochformat 1 080 × 1 920 → Ausschnitt 771 × 1 371 GE, Querformat
  umgekehrt.
- Ausschnitt-Wahl aus dem Seed. Bis zu 64 Kandidaten-Ursprünge werden geprüft, der erste gültige wird genommen:
  - Wasser 8–22 %, Wald 25–50 %, Felder mindestens 12 %
  - mindestens ein Dorf mit 8+ Häusern, ganz im Bild
  - mindestens zwei Straßenstücke
- Wind: Richtung `w0 + 0,6 · sin(t / 90 s)`, Stärke 10 GE/s, in der Gewitterfront 16 GE/s. `w0` kommt aus dem Seed.

### Wolken

| Größe | Startwert |
|---|---|
| Radius | `R = 12 · √masse` GE |
| Team-Wolken am Start | Masse 4, `cloudsPerTeam` 1 (Short) oder 2 (Langvideo), gleichmäßig am Rand verteilt |
| Neutrale Wolken | 14–22 gleichzeitig, Masse 0,6–3. Sie entstehen außerhalb des Bildes auf der Windseite, treiben mit dem Wind und verschwinden auf der anderen Seite. |
| Höchstgeschwindigkeit | `v = 70 / √(1 + 0,04 · masse)` GE/s, dazu der Wind |
| Fressen | Wenn `A.masse ≥ 1,1 · B.masse` und Abstand `< R_A + 0,25 · R_B`. Dauer 0,7 s. Gewinn `0,85 · B.masse · clamp(40 / A.masse, 0,35, 1)` (große Wolken wachsen langsamer). |
| Verdunsten | `(masse − 12) · 0,004` je Sekunde, in der Hitzewelle doppelt |
| Über Wasser | +0,3 Masse/s, nur bis Masse 20 |
| Obergrenze | Masse 120. Wird sie erreicht, regnet die Wolke stärker ab. |

Im Prototyp gemessen: Ohne die Bremse im Gewinn wuchs die Spielerwolke in 45 s auf Masse 695. Die Bildrate brach
dabei ein (95 % der Bilder unter 50 ms, schlimmstes Bild 433 ms). Mit der Bremse waren es Masse 51 und 95 % der
Bilder unter 16,8 ms. Darum ist die Bremse Pflicht.

**Steuerung jeder Team-Wolke** (einmal je 0,25 s neu entscheiden, dazwischen weich lenken mit höchstens 90°/s):

1. **Flucht:** Ein Gegner mit mindestens 1,1-facher Masse ist näher als `3 · R_gegner`. Dann weg von ihm, mit einem
   Seitenanteil, damit die Wolke nicht in die Ecke flieht. Der Bildrand stößt weich ab, 60 GE vor dem Rand.
2. **Beute:** Sonst das Ziel mit der höchsten Bewertung `masse / (abstand + 80)` unter allen fressbaren Wolken. Für
   Gegner-Wolken zählt die Bewertung ×1,5.
3. **Tanken:** Masse unter 8 und keine Beute näher als 300 GE → zum nächsten See.
4. **Treiben:** sonst mit dem Wind und einem leichten Wandern (Rauschen aus dem Ablauf-Zufall).

### Gewitter

- Ab Masse 45 wird eine Wolke zur Gewitterwolke, unter 36 wieder weiß (Hysterese).
- Eine Gewitterwolke regnet dauernd. Das kostet 0,6 Masse/s.
- Blitz alle 4–7 s. Ziel ist ein Gegner innerhalb von `2,2 · R`, sonst der Boden.
  - **Treffer auf einen Gegner:** Der Gegner verliert 18 % seiner Masse. Diese Masse fliegt als 2–4 neutrale Wölkchen
    nach außen weg.
  - **Treffer auf Wald:** Mit Wahrscheinlichkeit 0,7 bricht ein Feuer aus.
- Neutrale Gewitterwolken wie im Prototyp: 1–2 gleichzeitig, in der Gewitterfront 3–4. Wer größer ist, frisst sie
  und bekommt 20 s „aufgeladen“: Die Blitze kommen doppelt so oft.

### Feuer

- Raster mit Zellen von 16 GE, nur Waldzellen brennen.
- Je Zelle: Stärke 0–1, Brenndauer 20–40 s, danach dauerhafte Brandfläche.
- Ausbreitung zu einer Nachbarzelle mit 0,05 je Sekunde, mit dem Wind ×2, gegen den Wind ×0,3.
- Regen über einer Zelle senkt die Stärke um 0,5 je Sekunde. Ab Stärke 0 ist die Zelle gelöscht, ohne Brandfläche,
  wenn sie weniger als 40 % ihrer Brenndauer gebrannt hat.
- **Feuerwehr:** Sie fährt vom nächsten Straßenpunkt im Umkreis von 260 GE los, mit 55 GE/s auf der Straße. Am Brand
  spritzt sie, das hält die Stärke der nächsten Zelle bei höchstens 0,08. Danach fährt sie weg. Höchstens 4
  Feuerwehrautos gleichzeitig.
- Jede Zelle, die brennt oder gelöscht wird, kommt ins Brandprotokoll `burnLog`. Der Renderer zeichnet die
  Brandflächen nur daraus (Abschnitt 7).

### Runden, Wetter, Ende

- Ein Team scheidet aus, wenn seine letzte Wolke gefressen ist. Dabei entsteht das Ereignis `eliminated`.
- **Short:** Die Runde endet mit dem letzten Team; danach kommen noch 1,5 s Ausklang. Die Länge bestimmt das Szenario
  selbst (`hasNaturalDuration`). Die Vorprüfung erzwingt 24–38 s, sonst wird ein anderer Seed gewählt.
- **Langvideo:** Runden wie oben, Punktestand je Team, Neustart der Wolken nach 4 s. Brandflächen bleiben bis zum
  nächsten Morgen. Danach wächst der Wald in 30 s nach (sichtbar über die Zeit, aus `t` berechnet).
- Wetterplan aus dem Seed in `story.js`. Abschnitte von 60–120 s, nie zweimal dieselbe Phase hintereinander:
  - **Klar:** keine Änderung.
  - **Hitzewelle:** Verdunsten ×2, Felder vergilben.
  - **Gewitterfront:** mehr neutrale Gewitter, mehr Wind.
  - **Nebel:** nur Darstellung, nur morgens.

### Verdeckte Regie für das Short

Wie beim Territory-Short: Aus dem Seed werden vier Rollen verteilt.

| Rolle | Aufgabe |
|---|---|
| Riese | Wird früh zur Gewitterwolke |
| Außenseiter | Gewinnt am Ende |
| Opfer | Scheidet als Erstes aus |
| Mitläufer | Füllt das Bild |

Die Regie ändert nur Faktoren je Team, nie die Regeln:

- **Riese:** neutrale Wolken entstehen eher auf seiner Windseite (bis zu 60 % der Neuen in einem Kegel von 40° um ihn).
- **Außenseiter:** Fluchtabstand ×1,3, Bewertung von Beute ×1,2.
- **Riese ab Sekunde 18:** Regenverlust ×1,6, damit er sich klein regnet.
- **Opfer:** Tempo ×0,9.

Ein Skript `scripts/cloudwars-short-casting.mjs` prüft 300 Seeds und meldet, wie oft die Geschichte vollständig
ist. Vollständig heißt:

1. Erstes Gewitter vor Sekunde 12
2. Ein Ausscheiden vor Sekunde 22
3. Der Außenseiter gewinnt
4. Länge 24–38 s

Ziel: mindestens 85 % der Seeds.

---

## 4 · Stilbibel: so soll es aussehen

**Charakter:** wie im Prototyp. Weiche, plastische Haufenwolken über einer ruhigen, leicht gemalten Landschaft. Von
oben gesehen, Licht von oben links, freundlich, nicht realistisch und nicht grell. Die Landschaft ist Bühne, die
Wolken sind die Darsteller.

| Regel | Festlegung |
|---|---|
| Hierarchie | Team-Wolken > Blitze und Feuer > Gewitterwolken > neutrale Wolken > Fahrzeuge > Dörfer und Straßen > Gelände. Nichts Neues darf eine Stufe überspringen. |
| Teamfarben | Nimbus `#ff725e`, Cirrus `#54dce8`, Cumulus `#ffce63`, Stratus `#b0e779` (dieselben Farbtöne wie bei Scrap Wars). Die Wolke bleibt weiß. Die Farbe sitzt als 25–35 % Tönung auf der Schattenseite (`source-atop` auf den unteren Puffs) und als 3 GE breiter Saum unten rechts. Dazu kommt ein kleines Namensschild über der Wolke, weiß mit Rand in der Teamfarbe (Schrift wie in Territory, fett, Versalien). |
| Gesicht | Die zwei Augen des Prototyps bleiben, aber nur bei Team-Wolken. Gewitterwolken schauen grimmig (Augenlid schräg). Neutrale Wolken haben kein Gesicht. Über einen Schalter abschaltbar, Standard an. **Muss im Stil-Checkpoint bestätigt werden** (Scrap-Gesichter wurden früher abgelehnt). |
| Wolkenpalette | Weiß: Grund `#d5deea`, Fläche `rgba(255,255,255,0.95)`, Licht `#ffffff`. Gewitter: Grund `#474e60`, Fläche `rgba(104,112,132,0.55)`, Licht `rgba(150,160,184,0.35)`, Kern `rgba(18,20,28,0.6)`. Aufgeladen: Grund `#aeb8c8`. Alles wie `PAL` im Prototyp. |
| Höhe | Wolken werden 34 logische Einheiten über ihrem Bodenpunkt gezeichnet. Der Schatten liegt am Bodenpunkt plus Sonnenversatz (58, 92) GE × Wolkengröße × Tagesfaktor, mit 22 % Deckkraft, nachts 6 %. Regen fällt sichtbar vom Wolkenboden zum Bodenpunkt. |
| Gelände | Farben und Schwellen wie im Prototyp. Bodendetails (Ackerfurchen, Baumkronen) mit höchstens 15 % Kontrast zur Fläche. Kein Text am Boden. |
| Licht im Tageslauf | Die `SKY`-Stützpunkte des Prototyps (Multiplikation, Glühen, Nachtanteil) übernehmen. Die Nacht wird nie schwärzer als der Prototyp bei Tagesanteil 0,8. |
| Blitz | Weißer Kern 2 px, blauer Schein `#9fd0ff`, 0,35 s sichtbar. Das ganze Bild hellt sich einmal kurz um höchstens 12 % auf. Gezeichnet über den Wolken. |
| Feuer | Flackernder Brandring statt Fläche, Rauch hell `#cfc8c0` bis grau. Die Glut leuchtet nur nachts. |
| Einblendungen | Englisch, Versalien, fett, weiß mit weichem dunklem Schatten. Teamnamen in Teamfarbe. Höchstens eine Einblendung gleichzeitig, mindestens 1,8 s sichtbar. |

**Nicht tun:** Kamerawackeln, Bloom über das ganze Bild, neue Teamfarben, Neon, farbige Wolkenkörper, Text am Boden,
Comic-Sprechblasen, Explosionen statt Blitze, Partikelwolken, die die Landschaft zudecken.

**Bleibt wie im Prototyp:** Weichheit der Wolken, Puff-Anordnung, Felder, Dörfer, Wald, Abendlicht, Nachtlichter,
Feuerwehr mit Blaulicht.

---

## 5 · Layout je Format

| | 9:16 (Short) | 16:9 (Langvideo) |
|---|---|---|
| Ansicht | Fest, ganzer Ausschnitt 771 × 1 371 GE | Fest, ganzer Ausschnitt 1 371 × 771 GE |
| Freier Bereich | Wichtiges zwischen 12 % und 78 % der Höhe; rechte 14 % frei halten (Bedienung der Plattform) | ganzes Bild |
| Anzeige | Kein Rahmen. Oben vier kleine Farbpunkte mit Massebalken, 64 logische Einheiten hoch | Punktestand oben links (Teamname, Siege, Massebalken), Runde und Uhrzeit oben rechts, klein |
| Einblendungen | Bei 30 % der Höhe, mittig, 64–80 logische Einheiten Schrift | Bei 18 % der Höhe, mittig, 56 logische Einheiten Schrift |
| Ausschnitt-Wahl | Dorf und See möglichst in der mittleren Hälfte | Dorf, See und Wald je in einem anderen Drittel |

---

## 6 · Ton

Feste Mischung wie bei Naval „Ruhiges Duell“, Ziel rund −24 LUFS. Ereignisse mit `minGap`, damit es nicht prasselt.

| Ereignis | Klang (Startwert) | Hinweis |
|---|---|---|
| `absorb` | `synth:myco-pop`, leise, Tonhöhe nach Masse | häufigstes Ereignis, `minGap` 0,12 s |
| `storm` (wird Gewitter) | `synth:myco-night`, tief | einmal je Wechsel |
| `strike` / `zap` | weicher, tiefer Donner (neuer synthetischer Klang `synth:thunder`, sonst `synth:cannon` −12 Halbtöne, stark gedämpft) | kein Knall, eher Grollen |
| `fire` | leises Knistern (`synth:scrap-pickup` tief) | `minGap` 1 s |
| `extinguish` | `synth:splash`, sehr leise | |
| `eliminated` | `synth:chime`, tief | |
| `win` | `synth:fanfare`, leise | einmal am Ende |
| Hintergrund | leiser Wind. Erst `synth:myco-breeze` prüfen; sonst eine neue CC0-Aufnahme mit Nachweis in `assets/audio/README.md` | eigener Regler |

Neue Klänge nur mit Lizenznachweis. Nach dem Paket liegt ein 20-Sekunden-Clip mit Ton beim Nutzer zum Anhören.

---

## 7 · Technischer Aufbau

### Dateien

| Datei | Inhalt |
|---|---|
| `src/scenarios/cloudwars.js` | Anmeldung, `defaults`, `normalizeParams`, `controls`, Klangtabelle, `panelStats`, `hasNaturalDuration` für das Short |
| `cloudwars/terrain.js` | Rauschen mit Seed, `sampleT`, Felder, Straßen, Dörfer, Ausschnitt-Wahl. Reine Funktionen, von Simulation und Renderer genutzt |
| `cloudwars/simulation.js` | Wolken, Steuerung, Fressen, Gewitter, Feuerraster, Feuerwehr, Runden, Ereignisse, `stateHash`, `checkInvariants` |
| `cloudwars/story.js` | Wetterplan, Tageslauf, Rollen der verdeckten Regie, Einblendungen (alles aus Seed und `t`) |
| `cloudwars/art.js` | Paletten, Wolken-Sprites, Bodenvorzeichnung, Sprites für Glühen und Licht |
| `cloudwars/life.js` | Autos, Boote, Vögel, Nebel, Regen- und Rauchpartikel, alle als Funktion von `t` |
| `cloudwars/layout.js` | Maße, Anzeige und Einblendungen je Format |
| `cloudwars/renderer.js` | Zusammenbau der Ebenen über `EBS.CanvasScene` |

### Zufall und Seek

- Zwei Ströme in der Simulation: `rngFlow` (Entstehen, Steuerung, Blitze, Feuer) und `rngFx` (nur Werte, die die
  Simulation für spätere Darstellung festhält, z. B. die Puff-Anordnung einer neuen Wolke).
- Der Renderer zieht keinen Zufall. Er nutzt `h(seed, id, k)` (Ganzzahl-Hash → 0..1).
- **Fliegende Puffs:** Das Fress-Ereignis speichert `{t0, fromId, toId, masse, puffSeed}`. Die Position eines Puffs
  ist `eatPuffPos(ereignis, t − t0)`. Ereignisse älter als 1 s fallen aus der Liste.
- **Brandflächen:** Der Renderer hält eine Brand-Textur und merkt sich, bis zu welchem Eintrag von `burnLog` sie
  gezeichnet ist. Ist das Protokoll kürzer als gemerkt (Sprung zurück, Neustart) oder stammt es aus einer anderen
  Runde, wird die Textur aus dem ganzen Protokoll neu gebaut. Das Ergebnis hängt so nur vom Zustand ab.
- **Autos und Boote:** Feste Routen auf den Straßen und Seen des Ausschnitts, beim Aufbau aus dem Seed gewählt.
  Position = `(s0 + v · t) mod Länge`. Kein Zustand.
- **Sprites:** Cache je Wolke und Größenstufe (Stufen von 8 %). Neubau höchstens 3 je Bild wie im Prototyp, aber
  ohne dass sich das Bild unterscheidet: Bis zum Neubau wird das alte Sprite skaliert. Für den Export gilt:
  Größenstufe und Puffzahl sind reine Funktionen der Masse, also bei Seek und Wiedergabe gleich. Die
  Neubau-Grenze darf das Ergebnis nicht ändern; im Export wird sie deshalb aufgehoben.

### Leistung

- Gelände einmal je Ausschnitt vorzeichnen. Ziel bei 1080p unter 1,5 s, bei 1440p unter 3 s.
- Zeichnen eines Bildes bei 1080p: Mittel unter 12 ms, schlimmstes Bild unter 40 ms, gemessen mit
  `renderFrames(300)` in der Mitte einer Gewitterphase.
- Nachtlichter der Dörfer einmal beim Aufbau sammeln, nicht je Bild suchen. Im Prototyp war genau diese Suche je
  Bild teuer.

---

## 8 · Arbeitspakete in Reihenfolge

Ein Paket = ein Commit. Jedes Paket aktualisiert ROADMAP (R38), CHANGELOG und Abschnitt 0 des Gesamtplans. Die mit
**Stopp** markierten Pakete enden mit Bildern oder einem Clip beim Nutzer und gehen erst nach seiner Antwort weiter.

### C0 · Gerüst und Gelände-Grundlage

- **Ist:** Prototyp als Einzeldatei, Gelände mit festem Hash ohne Seed.
- **Umsetzung:**
  - `cloudwars.js` mit Anmeldung „Cloud Wars (in Arbeit)“, Reglern Seed, Modus (`short`, `rounds`) und Format.
  - `terrain.js`: Rauschen aus dem Prototyp übernehmen, mit Seed und Ganzzahl-Hash; dazu die Ausschnitt-Wahl.
  - Renderer zeigt nur das vorgezeichnete Gelände mit Straßen, Dörfern und Feldern.
  - `<script>`-Zeilen in `index.html`; Testdatei `test/cloudwars.test.mjs` und Gruppe in `scripts/test-ci.mjs` sowie
    `.github/workflows/ci.yml`.
- **Abnahme:**
  - gleicher Seed ergibt ein pixelgleiches Gelände (Prüfsumme über die Textur)
  - drei Seeds je Format als Standbild neben dem Prototyp-Bild
  - Vorzeichnen unter 1,5 s bei 1080p
  - **Stopp:** Bilder an den Nutzer (Maßstab 1,4 bestätigen oder ändern)

### C1 · Wolken in der Simulation

- **Umsetzung:**
  - Team-Wolken und neutrale Wolken, Wind, Steuerung, Fressen mit Bremse, Verdunsten, Tanken über Wasser
  - Ausscheiden und Rundenende
  - Ereignisse `absorb`, `eliminated`, `win`
  - `stateHash` über alle Wolken, Zufallsstände und Fress-Ereignisse; `checkInvariants`:
    - Masse endlich und > 0
    - Pools eingehalten
    - keine Wolke weiter als 200 GE außerhalb
    - Summe der Team-Wolken passt zu den Teams
- **Abnahme:**
  - gleicher Seed, gleicher Hash
  - 10 Minuten Vorlauf ohne Verletzung der Invarianten
  - größte Masse über 20 Seeds unter 120
  - Rundenlänge im Langvideo-Modus: Median 3–5 min (gemessen, ohne Bilder)

### C2 · Wolken zeichnen

- **Umsetzung:** `art.js` mit Sprites aus dem Prototyp, Teamtönung und Saum, Gesichtern, Namensschildern, Höhe und
  Schatten, fliegenden Puffs und dem Nachfedern beim Fressen.
- **Abnahme:**
  - Bildvergleich: Zeichnen ändert den Zustands-Hash nicht
  - Sprung zu `t = 37 s` ergibt dasselbe Bild wie durchgehende Wiedergabe bis 37 s (Pixelvergleich)
  - **Stopp, Stil-Checkpoint:** vier Bilder (Start, Fressen in Nahsicht, große Wolke, vier Teams im Gedränge) in
    beiden Formaten. Der Nutzer entscheidet über Gesichter und die Stärke der Teamfarbe.

### C3 · Gewitter, Blitze, Feuer, Feuerwehr

- **Umsetzung:**
  - Gewitterwechsel mit Hysterese, Regen
  - Blitz auf Gegner und Boden, Feuerraster mit Ausbreitung und Löschen, `burnLog`
  - Feuerwehr auf den Straßen
  - Ereignisse `storm`, `strike`, `zap`, `fire`, `extinguish`
  - Darstellung:
    - Blitz über den Wolken
    - Brandring, Rauch aus `t`
    - Brandflächen aus dem Protokoll
    - Feuerwehr mit Wasserstrahl und Blaulicht
- **Abnahme:**
  - Seek-Test mit einem Zeitpunkt mitten in einem Brand
  - nie mehr als 40 brennende Zellen
  - Waldverlust je Runde 2–15 % (über 20 Seeds gemessen)
  - Standbilder Blitz und Brand

### C4 · Tag, Wetter, Leben am Boden

- **Umsetzung:**
  - `story.js` mit Tageslauf und Wetterplan; Hitzewelle und Gewitterfront wirken in der Simulation über Faktoren
  - Nebelbänke, Abendlicht, Nacht mit Dorf-, Auto- und Feuerlichtern
  - Autos, Boote mit Kielwasser, Vögel
- **Abnahme:**
  - Bilder zu Morgen mit Nebel, Mittag, Abend und Nacht in beiden Formaten
  - Seek-Test bei Abendlicht
  - Leistungsmessung nach Abschnitt 7

### C5 · Anzeige und Einblendungen

- **Umsetzung:**
  - `layout.js` mit Anzeige je Format nach Abschnitt 5
  - Einblendungen aus Ereignissen: `IS A STORM!`, `IS GONE`, `RULES THE SKY!`, im Langvideo `ROUND 3`, `HEAT WAVE`,
    `STORM FRONT`
  - Schalter „Anzeige“ (voll, schlank, aus), ähnlich dem Territory-Regler
- **Abnahme:**
  - Bilder mit jeder Einblendung in beiden Formaten
  - Hochformat-Bild mit eingezeichneter Plattform-Bedienung
  - **Stopp:** 20-Sekunden-Clip ohne Ton im Querformat an den Nutzer

### C6 · Ton

- **Umsetzung:** Klangtabelle nach Abschnitt 6, feste Mischung, Hintergrundklang, bei Bedarf `synth:thunder` in `lib/`.
- **Abnahme:**
  - Lautheit und Spitzen gemessen
  - Klänge je Sekunde gezählt (Ziel unter 3)
  - **Stopp:** 20-Sekunden-Clip mit Ton an den Nutzer, Hörurteil

### C7 · Short mit verdeckter Regie

- **Umsetzung:**
  - Rollen und Faktoren in `story.js`
  - Casting-Skript
  - natürliche Länge mit Vorprüfung
  - Frage am Anfang, Ausklang am Ende
  - Short-Vorlage in `src/production-presets.js` und `presets/production/`
- **Abnahme:**
  - Casting-Ergebnis über 300 Seeds (Ziel ≥ 85 %)
  - Vorlagen-Exporttest
  - drei Seeds als Standbildfolge
  - **Stopp:** Ein ganzes Short (rund 30 s) wird erst nach ausdrücklichem Auftrag exportiert

### C8 · Langvideo-Vorlage und Abschluss

- **Umsetzung:**
  - Runden-Modus mit Punktestand und Neustart am Morgen, Nachwachsen des Waldes
  - Vorlage 16:9 für 10 Minuten
  - README-Zeile mit Bild
  - Bericht `docs/CLOUD_WARS_<datum>.md` mit Messwerten
- **Abnahme:**
  - 30 Minuten Vorlauf ohne Bilder ohne Verletzung der Invarianten
  - Vorlagen-Exporttest
  - ein 20-Sekunden-Clip aus Minute 8 als Ausschnittsexport (setzt `supportsClips` voraus)

### C9 · Wahlpakete (nur nach Auftrag)

- langsame Verfolgung im Hochformat (abschaltbar, Werte aus `ARCHITEKTUR.md` Abschnitt 10)
- dürre Felder, die unter Regen grün werden, als reines Wetterbild der Hitzewelle
- „Village in danger“ als Kapitel im Langvideo: Feuer am Dorfrand, Feuerwehrkolonne, Einblendung

---

## 9 · Prüfung und Nachweise

- Je Paket nur die eigene Testdatei (`node --test test/cloudwars*.test.mjs`) und einmal `npm run golden` (muss
  unverändert grün sein). Kein vollständiger `npm test` ohne Auftrag.
- Pflichttests nach `ARCHITEKTUR.md` Abschnitt 8:
  - gleicher Seed = gleicher Ablauf
  - Zeichnen ändert den Zustand nicht
  - Invarianten im Langlauf
  - kurzer Export mit Ton
  - Vorlagen-Export
- Zusätzlich hier:
  - Seek-Pixeltest an drei Zeitpunkten (Fressen, Brand, Abend)
  - Gelände-Prüfsumme
- Standbilder für Stopps als kleine JPEGs unter `docs/reference/cloudwars-*`, Clips nur unter `output/` (lokal).
- Bericht: was gelaufen ist, was nicht, mit Programmstand.

---

## 10 · Entscheidungen beim Nutzer

| Wann | Frage |
|---|---|
| nach C0 | Passt der Maßstab (Häuser, Wald und Straßen gut erkennbar am Handy)? |
| nach C2 | Gesichter an oder aus? Wie kräftig die Teamfarbe? Passen die Namen Nimbus, Cirrus, Cumulus, Stratus? |
| nach C5 | Passt der Ablauf im 20-Sekunden-Clip? |
| nach C6 | Passt der Ton? |
| nach C7 | Ganzes Short exportieren und hochladen? |
| nach C8 | Langvideo rendern (Länge, Auflösung)? |

Der spielbare Prototyp bleibt nur Vorlage. Er wird im Simulator nicht ausgeliefert und nicht weitergepflegt.
