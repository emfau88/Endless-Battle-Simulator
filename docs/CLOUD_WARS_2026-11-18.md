# Cloud Wars: Umsetzungsbericht

Laufender Bericht zu R38. Plan und Startwerte: [CLOUD_WARS_PLAN_2026-11-18.md](CLOUD_WARS_PLAN_2026-11-18.md).

## C0 · Gerüst und Gelände (18.11.2026)

**Umfang**

- Neues Szenario `cloudwars` mit dem Anzeigenamen „Cloud Wars (in Arbeit)“. Regler „Ablauf“ (Short oder Runden),
  bisher ohne Wirkung.
- `src/scenarios/cloudwars/terrain.js`: Gelände aus dem Prototyp (Zeilen 101–466), fast unverändert.
  - Rauschen, Wasser, Wald, Felder, Straßen und Dörfer hängen nur von der Weltposition ab (Ganzzahl-Hash).
  - Der Seed wählt nur den Ausschnitt.
  - `renderChunk` zeichnet jetzt mit wählbarer Schärfe direkt ins Zielbild. Jede Kachel ragt 3 Pixel in die nächste,
    damit keine Fugen entstehen. Die erste Fassung hatte sichtbare dunkle Linien an den Kachelgrenzen.
- Ausschnitt-Wahl `pickArea`: bis zu 256 Kandidaten, jeder um ein passendes Dorf gelegt. Der erste, der alle Regeln
  erfüllt, wird genommen. Regeln:
  - Wasser 8–22 %, Wald 25–50 %, Felder ≥ 12 %
  - ein Dorf mit 8+ Häusern ganz im Bild, zwei Straßenstücke
  - freie Wiese höchstens 30 %. Diese Regel ist neu gegenüber dem Plan, weil Seed 42 sonst eine halbe Bildseite
    leere Wiese zeigte.
- Maßstab je Format nach Entscheidung des Nutzers („auf Handy und PC jeweils passend“): hochkant 1 GE = 2,0 logische
  Einheiten (näher), quer 1,4 (mehr Landschaft). Mit dem kleineren Hochformat-Ausschnitt fand die Zufallssuche bei
  6 von 12 Seeds keinen gültigen Ausschnitt; seit die Kandidaten um ein Dorf gelegt werden, sind es 0 von 40
  (Seeds 1–20, beide Formate).
- Der Renderer zeichnet das Gelände einmal vor, in der Schärfe des Ausgabebilds.
- Verdrahtung:
  - `index.html`
  - Prüfgruppe `cloudwars` in `scripts/test-ci.mjs` und `.github/workflows/ci.yml`
  - Szenario-Listen in `test/core.test.mjs` und `test/presets.test.mjs`

**Messwerte** (ohne Grafikkarte, 1080p, Seite öffnen bis erstes Bild):

- 1,1–1,7 s je Seed, einschließlich der Ausschnitt-Wahl.
- 40 Prüffälle (Seeds 1–20, je hoch und quer): alle Regeln erfüllt.

**Vorschau**

- [Hochformat](reference/cloudwars-c0-hochformat-2026-11-18.jpg): Seeds 1 bis 4 mit Maßstab 2,0.
- [Querformat](reference/cloudwars-c0-querformat-2026-11-18.jpg): Seeds 42, 7, 3 und 5.

**Geprüft**

- `node --test test/cloudwars.test.mjs`, zwei Tests:
  - Geländeregeln für drei Seeds in beiden Formaten
  - gleicher Seed ergibt ein pixelgleiches Bild, ein anderer Seed ein anderes
  - Zeichnen ändert den Zustand nicht
- Die beiden angepassten Listen-Tests in `core.test.mjs` und `presets.test.mjs` (nur diese zwei Tests).
- `npm run golden`: identisch mit der Referenz.
- Kein vollständiger `npm test`, kein Export.

**Grenzen und Befund**

- Zwei gleichzeitig zeichnende Seiten wichen ohne Grafikkarte in Einzelpixeln voneinander ab; nacheinander
  geöffnet sind die Bilder gleich (dreimal geprüft). Der Test öffnet die Seiten deshalb nacheinander. Für den Export
  spielt das keine Rolle, weil dort eine Seite allein zeichnet.
- Noch keine Wolken, kein Ton, keine Anzeige.
- Entschieden: Maßstab je Format (siehe oben).

## C1 · Wolken in der Simulation (18.11.2026)

**Umfang**

- `src/scenarios/cloudwars/simulation.js` mit den Regeln aus Abschnitt 3 des Plans:
  - vier Teams (Nimbus, Cirrus, Cumulus, Stratus), eine Wolke je Team im Short, zwei im Runden-Modus
  - neutrale Wolken, die auf der Windseite nachkommen; ihre Zahl richtet sich nach der Fläche (hochkant 10, quer 18)
  - Wind mit langsam drehender Richtung
  - Steuerung alle 0,25 s: Flucht, Beute, Tanken über dem See, Treiben; weich vom Rand abgestoßen
  - Fressen mit Bremse für große Wolken, Verdunsten, Obergrenze
  - Ausscheiden, Rundenende, im Runden-Modus Punktestand und neue Runde nach 4 s
  - Ereignisse `absorb`, `eliminated`, `win`
  - Fress-Aufzeichnungen (`eats`) für die fliegenden Puffs in C2
- Zwei Zufallsströme (Ablauf und festgehaltene Aussehenswerte); `stateHash` deckt Wolken, Zufallsstände und
  Fress-Aufzeichnungen ab.
- Bis C2 zeichnet der Renderer die Wolken nur als einfache Scheiben mit Teamfarbe.

**Abweichungen von den Startwerten (gemessen)**

Runden-Modus quer über 6 bis 20 Seeds, je 20 Minuten Vorlauf ohne Bilder:

| Einstellung | Median einer Runde | größte Masse |
|---|---|---|
| Plan (Team gegen Team ab 1,1-facher Masse, Bremse ab 40, Verdunsten 0,004) | 64 s | 90 |
| Team gegen Team ab 1,35 | 109 s | 113 |
| 1,5 / Bremse ab 25 / Verdunsten 0,006 (**gewählt**) | 156 s (20 Seeds); nach der Randänderung aus C2 132 s | 93 |
| 1,6 / 25 / 0,006 | 360 s (fast jede Runde läuft in die Zeitgrenze) | 91 |
| 1,7 / 25 / 0,006 | 360 s | 77 |

- Zwischen 1,5 und 1,6 liegt eine Kante: Darüber holt der Führende die anderen nicht mehr ein. Gewählt ist 1,5.
  Das ergibt im Median 2,6 Minuten statt der geplanten 3 bis 5. Mit den Blitzen aus C3 ändert sich das Gleichgewicht
  ohnehin, deshalb wird dort neu gemessen.
- Im Short bleibt Team gegen Team bei 1,1. Hochkant, Seeds 1–10: Sieger im Median nach 24 s (13–42 s), erstes
  Ausscheiden nach 5–19 s. Das ist eine gute Grundlage für die Regie in C7.
- Hochkant im Runden-Modus sind die Runden kürzer (Median 69 s), weil das Bild kleiner ist. Das Langvideo ist quer.

**Geprüft:** `node --test test/cloudwars.test.mjs`, fünf Tests:

- gleicher Seed, gleicher Ablauf
- 10 Minuten Runden-Modus ohne Verletzung der Invarianten, Ereignisfolge ohne Lücke, Masse unter 120,
  mindestens eine beendete Runde
- Short mit Sieger innerhalb von 2 Minuten

Kein vollständiger `npm test`, kein Export.

## C2 · Wolken zeichnen (18.11.2026)

**Umfang**

- `src/scenarios/cloudwars/art.js`: Wolken-Sprites aus dem Prototyp (weicher Grundkörper, Lichtseiten, Glanzlichter),
  dazu neu:
  - Teamfarbe als Tönung der Schattenseite (30 %) und als Saum unten rechts
  - Augen mit Blick in Fahrtrichtung und Blinzeln (aus Zeit und Kennung)
  - Namensschild über jeder Team-Wolke, feste Schriftgröße in beiden Formaten
  - Schatten am Boden, Wolke 34 logische Einheiten darüber
  - fliegende Puffs beim Fressen und ein kurzes Nachfedern
- Puffs, Federn und Blinzeln werden aus den Fress-Aufzeichnungen und der Simulationszeit berechnet. Der Renderer hat
  keinen eigenen Zustand außer dem Sprite-Zwischenspeicher, und der hängt nur von Seed, Größenstufe, Art und Team ab.
- Sprite-Neubau, wenn sich der Radius um mehr als eine Stufe (8 %) ändert. Die Grenze von drei Neubauten je Bild aus
  dem Prototyp ist weggefallen, damit das Bild nicht vom Verlauf abhängt.
- Simulation: Team-Wolken bleiben großteils im Bild (Mittelpunkt mindestens 0,7 Radien vom Rand). Vorher ragten große
  Wolken halb hinaus. Dadurch fällt der Median einer Runde im Runden-Modus von 156 auf 132 s (20 Seeds).

**Messwerte:** Ohne Grafikkarte, 1080p, je Bild einschließlich JPEG-Kodierung: Median 82–83 ms, höchstens 97–121 ms.
Das ist nicht mit dem Plan-Ziel (nur Zeichnen, mit Grafikkarte) vergleichbar. Gemessen wird erneut in C4.

**Vorschau:** [Hochformat](reference/cloudwars-c2-hochformat-2026-11-18.jpg) und
[Querformat](reference/cloudwars-c2-querformat-2026-11-18.jpg). Je vier Bilder: Start, Fressen in Nahsicht, große
Wolke, Gedränge.

**Geprüft:** `node --test test/cloudwars.test.mjs`, sechs Tests. Neu ist der Seek-Test: Das Bild bei Sekunde 8 ist nach
einem Sprung pixelgleich mit dem Bild nach 239 gezeichneten Bildern, mit mehreren Fress-Vorgängen dazwischen. Kein
vollständiger `npm test`, kein Export.

**Bekannt und offen**

- Zwei Wolken desselben Teams können sich überdecken (Runden-Modus), dann überlappen auch die Namensschilder.
- Die Runden sind mit 2,2 Minuten im Median kürzer als geplant. Neu messen mit den Blitzen in C3.
- **Stopp, Stil-Checkpoint beim Nutzer:** Gesichter an oder aus? Teamfarbe kräftiger oder schwächer? Passen die Namen?

## C3 · Gewitter, Blitze, Feuer, Feuerwehr (18.11.2026)

**Umfang**

- `src/scenarios/cloudwars/storms.js` ergänzt die Simulation:
  - Gewitterwechsel mit Hysterese; Gewitter regnen und verlieren dabei 0,6 Masse je Sekunde
  - Blitze alle 4–7 s: auf Gegner in Reichweite (−18 % Masse, die als 2–4 Wölkchen wegfliegt), sonst auf den Boden
  - neutrale Gewitterwolken, die nur Kleinere treffen; wer eine frisst, ist 20 s „aufgeladen“
  - Feuerraster mit 16 GE, Ausbreitung mit dem Wind, Löschen durch Regen, Brandprotokoll
  - Feuerwehr auf den Straßen des Ausschnitts mit Anfahrt, Spritzen und Abfahrt
  - Ereignisse `storm`, `strike`, `zap`, `fire`, `extinguish`, `charged`, `truck`
  - Team-Wolken fliehen auch vor größeren neutralen Gewittern
- `src/scenarios/cloudwars/effects.js` zeichnet:
  - Regen, Blitze mit Abzweig und kurzem Aufhellen (höchstens 12 %)
  - Glut, Flammen und Rauch
  - Brandflächen als Textur aus dem Protokoll
  - Feuerwehr mit Blaulicht und Wasserstrahl
- Gewitterwolken haben grimmige Brauen (wie im Prototyp).
- Neue Runde im Runden-Modus: Feuer aus, Brandflächen weg. Der Plan sah ein Nachwachsen am nächsten Morgen vor; das
  wird mit dem Tageslauf in C4 nicht gebraucht, weil jede Runde mit frischem Wald beginnt.

**Abweichungen von den Startwerten (gemessen, ohne Bilder)**

- **Gewitter ab Masse 30 statt 45** (weiß unter 22 statt 36). Mit der Bremse aus C1 wurden Wolken kaum größer als 45.
  Mit 45 gab es im Runden-Modus das erste Gewitter oft erst nach 2–6 Minuten und im Short fast nie.
- **Bodenblitze schlagen seitlich ein** (0,9–1,6 Radien neben der Wolke). Unter der eigenen Regenwolke gingen die
  Brände sofort wieder aus. Damit liegt der Waldverlust je Runde bei 4–10 % (6 Seeds), Ziel 2–15 %.
- **Team gegen Team im Runden-Modus ab 1,7-facher Masse.** Getroffene Wolken schrumpfen und werden leichter gefressen.
  Gemessen über 12 Seeds und 20 Minuten:

  | Schwelle | Median einer Runde |
  |---|---|
  | 1,6 | 101 s |
  | 1,7 (gewählt) | 137 s |
  | 1,9 | 126 s |
  | 2,2 | 159 s |

  Mehr als rund 2,5 Minuten sind über diese Schwelle nicht zu holen. **Offene Frage am Ende:** kürzere Runden so
  lassen (mehr Abwechslung im Langvideo) oder über andere Regeln verlängern?
- Die Feuer erreichen oft die Obergrenze von 40 gleichzeitig brennenden Zellen.

**Vorschau:** [Gewitter und Brände](reference/cloudwars-c3-gewitter-2026-11-18.jpg) (Seed 2, Runden-Modus,
Sekunde 146): zwei Team-Gewitter, ein Blitz, Brände mit Brandflächen im Wald rechts.

**Geprüft:** `node --test test/cloudwars.test.mjs`, acht Tests. Neu:

- Gewitter, Blitze und Brände entstehen, höchstens 40 Brände, Waldverlust zwischen 0,5 und 20 %
- Seek-Test mitten im Brand: Sprung auf Sekunde 150 gegen 300 gezeichnete Bilder ab Sekunde 140

Kein vollständiger `npm test`, kein Export.

## C4 · Tag, Wetter, Leben am Boden (18.11.2026)

**Umfang**

- `src/scenarios/cloudwars/story.js`: Tageslauf und Wetterplan als reine Funktionen aus Seed, Zeit und Modus.
  - Runden-Modus: ein Tag dauert 12 Minuten, Start am frühen Morgen. Licht nach den Farbstufen des Prototyps.
  - Wetterabschnitte von 60–120 s, nie zweimal dieselbe Phase hintereinander: klar, Hitzewelle (doppeltes
    Verdunsten, nur vormittags bis mittags), Sturmfront (Wind ×1,6, zwei neutrale Gewitter mehr), Morgennebel
    (Wind ×0,7, nur morgens). Das Langvideo beginnt immer mit Morgennebel.
  - Short: heller Nachmittag, immer klar (das Drehbuch in C7 soll nicht vom Wetter abhängen).
- `src/scenarios/cloudwars/atmosphere.js` zeichnet, alles nur aus der Zeit berechnet:
  - Autos auf den Straßen (höchstens 24), Boote auf den Seen mit Kielwasser (höchstens 4), alle 45 s ein
    Vogelschwarm
  - Nebelbänke, die mit dem Wind treiben, dazu leichter Dunst
  - nachts Fenster, Scheinwerfer, Rücklichter, Bootslaternen und Blaulicht der Feuerwehr
  - Tageslicht als Farbfilter über dem ganzen Bild; Blitze und Feuer leuchten danach noch hell
- Wolkenschatten werden am Abend länger und nachts schwächer; Hitzewelle als leichter warmer Schleier.
- **Neue Bremse für Waldbrände:** Mit dem Wetter (Hitze, Sturmfronten) brannten bei einzelnen Seeds bis zu 32 % des
  Waldes. Jetzt zünden Bodenblitze ab 14 % verbranntem Wald nicht mehr, und die Ausbreitung wird zwischen 14 % und
  20 % bis auf null gebremst.

**Messwerte (ohne Bilder, 16:9, 8 Seeds, 15 Minuten)**

- Runden im Median **169 s** (vorher 137 s; die Wetterwechsel verlängern die Runden). 9:16 im Runden-Modus: 82 s.
- Waldverlust je Runde höchstens 20 %, meist 8–16 %.
- Ein Bild 1080p mit JPEG in Software: Median 91 ms (Short 9:16) und 105 ms (Runden 16:9), vorher etwa 82 ms.

**Vorschau:** [Tageslauf](reference/cloudwars-c4-tageslauf-2026-11-18.jpg) (Seed 2, Runden-Modus): Morgennebel
(Sekunde 20), Hitzewelle am Vormittag (150), Abendlicht (390), Nacht mit Lichtern (520).

**Geprüft:** `node --test test/cloudwars.test.mjs`, zehn Tests. Neu:

- Tageslauf und Wetter: Short immer klar, Runden beginnen mit Nebel, keine Phase zweimal hintereinander
- Seek-Test bei Nacht: Sprung auf Sekunde 520 gegen 150 gezeichnete Bilder ab Sekunde 515

Kein vollständiger `npm test`, kein Export, keine Referenz-Hashes (kein anderes Szenario berührt).

**Offene Fragen für später:** Abendlicht kräftig genug oder zu braun? Soll der Short doch Wetter bekommen?

## C5 · Anzeige und Einblendungen (18.11.2026)

**Umfang**

- `src/scenarios/cloudwars/layout.js` mit eigenem Layout je Format:
  - Hochformat (schlank): kein Rahmen, oben vier Farbpunkte mit Massebalken, die rechten 14 % bleiben frei.
  - Querformat (voll): Punktestand oben links (Name, Siege als Punkte, Anteil an der Gesamtmasse), oben rechts Runde
    und Uhrzeit (Tag von 06:00 bis 06:00).
- Einblendungen, alle englisch, mit kurzem Aufpoppen und Ausblenden:
  - Short: `WHICH CLOUD RULES THE SKY?` zu Beginn
  - `NIMBUS IS A STORM!` (je Team höchstens alle 25 s), `NIMBUS IS GONE`, `NIMBUS RULES THE SKY!`
  - Langvideo: `ROUND 2`, `MORNING FOG`, `HEAT WAVE`, `STORM FRONT`
  - Treffen zwei gleichzeitig ein, rückt die zweite nach; wer über 4 s warten müsste, fällt weg (außer dem Sieger).
- Die Simulation merkt sich die Anlässe in `sim.notes`; das ändert keinen Ablauf und keinen Hash. Die Einblendungen
  werden in jedem Bild aus `t` und dieser Liste berechnet, also seek-fest.
- Schalter „Anzeige“: automatisch (hochkant schlank, quer voll), voll, schlank, aus. Die Namensschilder an den
  Wolken bleiben immer.
- Momentaufnahme mit `banners` (Text und Alter), für Tests und Vorschau.

**Vorschau:** [Anzeige](reference/cloudwars-c5-anzeige-2026-11-18.jpg): links Short mit Eingangsfrage und mit
eingezeichneter Plattform-Bedienung (rot: Knöpfe rechts und Textbereich unten, gelb: 12 % von oben), rechts
Langvideo mit `CUMULUS IS A STORM!` im Morgennebel und `CUMULUS RULES THE SKY!` nach Runde 2.

**Geprüft:** neuer Test „Einblendungen“ (Short beginnt mit der Frage, endet mit dem Sieger, nur Großbuchstaben
englisch), dazu die Seek- und Gleichheitstests. Kein vollständiger `npm test`, kein Export. Den 20-Sekunden-Clip
aus dem Plan liefere ich mit Ton nach C6 zusammen.

**Offene Fragen für später:** Im Short treiben Wolken zeitweise in den unteren Textbereich der Plattform (unter 78 %
der Höhe); das löst die Regie in C7. Einblendung pro Gewitter oder seltener?

## C6 · Ton (18.11.2026)

**Umfang**

- Klangtabelle in `src/scenarios/cloudwars.js`, nur im Code erzeugte Klänge (keine neuen Dateien, kein
  Lizenznachweis nötig):

  | Ereignis | Klang | Hinweis |
  |---|---|---|
  | `win` | `synth:fanfare`, 3 Halbtöne tiefer | leise |
  | `eliminated` | `synth:chime`, tief | |
  | `storm` | `synth:myco-night`, tief | höchstens alle 2 s |
  | `strike`, `zap` | **neu** `synth:thunder`: weiches, fernes Grollen ohne Knall | höchstens alle 1,2 s |
  | `absorb` | `synth:myco-pop`, Tonhöhe je Team | höchstens alle 0,25 s |
  | `charged` | `synth:myco-pling`, tief | |
  | `fire`, `extinguish`, `truck` | Knistern, Platscher, Hupe, alle sehr leise | höchstens alle 1,5–4 s |
  | `gust` | **neu** `synth:wind`: 6 s Windhauch | alle 4 s, überlappend = Windteppich |

- Hintergrundwind: Die Simulation meldet alle 4 s einen Windstoß (`gust`, Stärke nach Wetter). Es gibt keine
  Wind-Aufnahme im Repository; so bleibt der Wind ohne neue Datei und folgt der Sturmfront.
- Feste Mischung wie Marble XL (`marbleworks-soft-v1`, fester Grundpegel 3 dB, Decke −6 dB, kein
  Nachnormalisieren). Eigener Mischplan: höchstens zwei Klänge je 0,6 s, der Wind zählt nicht mit; Stereo nach Ort
  im Ausschnitt.
- `supportsClips` ist an (der Renderer hält keinen Zustand), damit Probeclips aus der Mitte möglich sind.

**Messwerte:** Probeclip Seed 2, Runden-Modus, 16:9, Sekunde 22–42 (Episode 45 s): −22,8 LUFS, Spitze −6 dBFS,
Begrenzer greift höchstens 0,7 dB ein. Etwa 1,5 Klänge je Sekunde einschließlich Wind (Ziel unter 3). Der Clip liegt
nur lokal unter `output/cloudwars-c6-probe.mp4`.

**Geprüft:** neuer Test „Ton“ (alle Klänge vorhanden, nie mehr als zwei Klänge je 0,6 s, unter 3 je Sekunde, Wind
alle 4 s), dazu `test/audio.test.mjs` und `test/audio-camera-plan.test.mjs` (20 Tests, weil `lib/audio.mjs` zwei neue
Klänge bekommt). Ein Export von 20 s, kein vollständiger `npm test`.

**Offene Frage für später:** Hörurteil zum Probeclip (Donner, Wind, Lautstärke).

## C7 · Short mit verdeckter Regie (18.11.2026)

**Umfang**

- Rollen aus dem Seed in `story.js`: Riese, Außenseiter, Opfer, Mitläufer. Die Regie ändert nur Faktoren je Team
  (Tempo, Fluchtabstand, Beutewahl, Zugewinn, Regen, Verdunsten), nie die Regeln. Drei Phasen:
  - **Bis Sekunde 12:** Der Riese startet 2,5-mal so groß, wächst 1,8-mal so schnell und wird nicht gejagt. Neue
    neutrale Wolken entstehen zu 70 % außerhalb des Bildes auf seiner Windseite und treiben ihm zu. Er jagt bevorzugt
    das Opfer, das auf derselben Bildhälfte startet, langsamer ist (×0,85) und schlechter flieht.
  - **Ab Sekunde 18:** Der Riese regnet sich klein (Regen ×3, Verdunsten ×15, Zugewinn ×0,5, Tempo ×0,8). Die neuen
    Wolken treiben jetzt dem Außenseiter zu.
  - **Ab Sekunde 20 (Schlussphase):** Der Außenseiter (Zugewinn ×2) jagt Riese und Mitläufer und ist ×1,3 schneller.
    Mutig wird er erst, wenn er stärker ist als der Riese. Den ganzen Lauf über jagt ihn niemand.
- **Gewitterschwelle im Short 18 statt 30** (weiß unter 13). Mit einer Wolke je Team erreichte kaum eine Wolke 30.
  Das ist eine eigene Schwelle je Modus wie die Fress-Schwelle aus C1; der Runden-Modus bleibt unverändert.
- Casting-Skript `scripts/cloudwars-short-casting.mjs` (ohne Browser, etwa 0,5 s je Seed). Mit `--off` zum
  Vergleich ohne Regie, mit `--list` die Liste der vollständigen Seeds.
- Natürliche Länge: Sieg plus 1,5 s Ausklang. Die Vorprüfung beim Export bricht außerhalb von 24–38 s mit einem
  Hinweis auf einen passenden Seed ab. Schalter „Short-Ende“ (mit dem Sieg / freie Länge) und „Regie“ (an/aus).
- Vorlagen „Short“ und „Langvideo“ in `src/production-presets.js` und `presets/production/cloudwars-*.json`. Die
  Short-Vorlage nimmt den nächsten geprüften Seed ab dem eingestellten (aus 42 wird 44).
- Namensschilder bleiben am oberen Bildrand im Bild.

**Casting über 300 Seeds** (Seeds 1–300, 9:16):

| Bedingung | ohne Regie | mit Regie |
|---|---|---|
| Gewitter vor Sekunde 12 | 0 % | 79 % |
| Ausscheiden vor Sekunde 22 | 89 % | 98 % |
| Der Außenseiter gewinnt | 21 % | 85 % |
| Länge 24–38 s | 25 % | 59 % |
| **Geschichte vollständig** | **0 %** | **42 % (126 Seeds)** |

Das Ziel von 85 % ist nicht erreicht. Meist wird das Short zu lang (97 von 300 über 38 s), weil sich die letzten
Wolken lange jagen. Noch stärkere Faktoren machen die Regie sichtbar (Wolken, die einander ignorieren). Deshalb
nimmt die Vorlage nur geprüfte Seeds; davon gibt es genug. **Offene Frage am Ende:** so lassen, die erlaubte
Länge auf bis zu 45 s erweitern oder die Regie weiter verschärfen?

**Vorschau:** [Short, drei Seeds](reference/cloudwars-c7-short-2026-11-18.jpg) (44, 2, 5; je Frage, erstes
Gewitter, Sekunde 21, Sieg).

**Geprüft:**

- neue Datei `test/cloudwars-short.test.mjs` (sechs Tests ohne Browser, darunter 30 Minuten Runden-Modus: Rollen, die ersten fünf geprüften Seeds
  erzählen die Geschichte, Regie aus, Vorprüfung, Vorlagen gleich den JSON-Dateien)
- `test/presets-export-cloudwars.test.mjs` (Produktionsweg Short und Langvideo mit je 3 s Export, auch im CI)
- `test/cloudwars.test.mjs` (12 Tests), `test/presets.test.mjs`, `test/core.test.mjs`, einmal `npm run golden`

Kein ganzes Short exportiert (nur auf ausdrücklichen Auftrag).

## C8 · Langvideo-Vorlage und Abschluss (18.11.2026)

**Umfang**

- Vorlage „Langvideo“: 16:9, 1080p30, 10 Minuten, Runden-Modus mit Punktestand, Tageslauf und Wetter, feste
  Übersicht ohne Kamerafahrt (`presets/production/cloudwars-long.json`, seit C7 auch in der Oberfläche).
- Neue Runde 4 s nach dem Sieg, mit frischem Wald. Abweichung vom Plan: kein Warten auf den nächsten Morgen und kein
  sichtbares Nachwachsen. Mit Runden von rund 2,8 Minuten und einem Tag von 12 Minuten müsste man sonst oft minutenlang
  auf verbrannte Flächen schauen.
- README: Zeile in der Szenariotabelle, Bild, Vorlagen, Clip-Export.
- **Korrektur zu C3:** Im Code steht seit C3 die Fress-Schwelle Team gegen Team **2,2** (nicht 1,7 wie oben in der
  Tabelle als „gewählt“ markiert). Alle Messwerte ab C4 gelten für 2,2.

**Messwerte Langvideo (16:9, ohne Bilder):** Runden im Median 169 s (8 Seeds, 15 Minuten), Waldverlust je Runde
höchstens 20 %, größte Wolke höchstens 76. 30 Minuten Seed 42 ohne Verletzung der Invarianten.

**Geprüft:** 30-Minuten-Lauf als Test in `test/cloudwars-short.test.mjs`, Produktionsweg Langvideo in
`test/presets-export-cloudwars.test.mjs`. Kein Export über 20 s.

## Gesammelte Fragen für die Abstimmung am Ende

Alles ist nach den Empfehlungen gebaut. Diese Punkte sind Geschmack oder Abwägung und warten auf das Urteil des
Nutzers:

1. **Gesichter, Teamtönung und Namen:** Augen an, Tönung wie jetzt, Namen NIMBUS, CIRRUS, CUMULUS, STRATUS?
2. **Rundenlänge im Langvideo:** im Mittel rund 2,8 Minuten (Plan: 3–5). So lassen oder länger?
3. **Short-Regie:** Die ganze Geschichte gelingt bei 42 % der Seeds, die Vorlage nimmt nur diese. Erlaubte Länge
   auf 45 s erweitern oder die Regie weiter verschärfen?
4. **Abendlicht:** kräftig genug oder zu braun? Soll das Short auch Wetter bekommen (jetzt immer klar)?
5. **Einblendungen:** bei jedem Gewitter (höchstens alle 25 s je Team) oder seltener?
6. **Ton:** Hörurteil zum Probeclip (`output/cloudwars-c6-probe.mp4`, nur lokal): Donner, Wind, Lautstärke.
7. **Überlappungen:** Wolken desselben Teams und Namensschilder überdecken sich manchmal.
8. **Short-Bildbereich:** Wolken treiben zeitweise in den unteren Textbereich der Plattform.
9. **Langvideo:** Neue Runde sofort mit frischem Wald (so gebaut) oder erst am nächsten Morgen?
10. **Freigabe:** ganzes Short (rund 30 s) und Langvideo (10 Minuten) exportieren?
