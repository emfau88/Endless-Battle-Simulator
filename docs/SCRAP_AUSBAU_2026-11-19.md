# Scrap Wars: Ausbau – Bericht vom 19.11.2026 (R40)

**Bezug:** [Ausbau-Plan](SCRAP_AUSBAU_PLAN_2026-11-19.md). **Stand:** T1 Hörprobe abgeschlossen (B2 gewählt), E0–E5 auf `main` (PR #44), K1–K5 Taktik-Arena `v4` gebaut,
gemessen und vom Nutzer angenommen („soweit ganz ok“); Waffen auf Sunny Yard als Symbol-Marken, Vorlagen auf `v4`.
Branch `scrap/v4-taktik`.

**Kurz:** Die Sunny-Kopfzeile ist englisch und zeigt Waffensymbole. Neue Treffer-, Schuss- und Explosionseffekte
stehen als Vorher/Nachher-Blätter bereit. Beim Ton ist Variante B2 „sauber“ gewählt. Die Taktik-Arena `v4` ist
gebaut: Roboter starten aus fallenden Kisten, wählen Ziele nach Sicht und Lage, finden Wege mit A* und fahren wie
Panzer. Im Querformat treffen sich in den ersten 15 s nicht mehr immer dieselben Nachbarn (häufigstes Paar 20 % statt 40 %).

---

## T1 · Hörprobe (lokal, nicht im Repository)

Clips aus Sunny Yard quer, Seed 42, Sekunde 15–30, alle auf denselben Tonereignissen (Ereignis-Hash wie der Export).
Erzeugt mit einem Skript unter `output/scrap-hoerprobe/` (von Git ignoriert). Quelle der neuen Klänge: Kenney
„Sci-Fi Sounds“ (CC0, lokal), dazu eigene Synthese.

| Runde | Clip | Lautheit | True Peak | Klänge je s | Begrenzer | Urteil des Nutzers |
|---|---|---|---|---|---|---|
| 1 | heutiger Ton | −14,3 LUFS | −2,1 dBFS | 8,4 | – | „zu klirrend und hell und hart“ |
| 1 | A weich-comic (Marble-Klänge) | −23,0 | – | 3,5 | −2,8 dB | wie oben, „Murmel-Geräusche … total unpassend“ |
| 1 | B Sci-Fi-Spielzeug | −22,9 | – | 3,5 | −0,9 dB | am besten, aber „nicht clean genug“, „zu wenig comic“ |
| 1 | C mechanisch | −23,1 | – | 3,5 | −2,5 dB | – |
| 2 | B2 sauber (B gekürzt, dunkler) | −22,9 | −6,8 | 3,5 | 0 | **gewählt** |
| 2 | B3 comic (Bonk, Puff, Wah-Wah beim K.o.) | −23,0 | −6,6 | 3,5 | 0 | offen |
| 2 | B4 comic mit „Piu“-Blastern | −23,0 | −7,0 | 3,5 | 0 | offen |

Runde 2 nutzt Pegel nach Lautheit statt Spitze (lautestes 50-ms-Fenster), höchstens drei Blaster je Sekunde und ein
leiseres Grundgeräusch (−48 statt −40 LUFS). Keine `mw-soft-*`-Klänge, keine hellen Metall- oder Plattenaufschläge.
**Gewählt:** B2 „sauber“ (Rückmeldung am 19.11.). T2 setzt sie mit Schalter `soundMix` im Repository um; bis dahin klingt Scrap wie bisher.

---

## E0 · Sofortkorrektur und Vorschau

**Kopfzeile Sunny Yard** (Commit „Scrap E0: Sunny-Kopfzeile englisch …“): Legende „WOOD · STONE · CONCRETE“ über den
Schlüssel im Renderer, `materials.js` unverändert. Statt „BLST 4“, „RKT 2“ und „SEARCH“ Waffensymbol und
Munitionszahl wie auf den dunklen Karten (gemeinsame Methode `_hudWeapon`). Geprüft per Bildvergleich quer und
hochkant.

**Vorschau-Werkzeug** `scripts/scrap-effects-preview.mjs`: sucht in einer Runde die ersten Ereignisse je Moment
(Schuss, Rakete, Treffer am Roboter, Blaster-Treffer an Holz, Stein und Beton, Explosion, K.o.) und schneidet je fünf
Zeitpunkte aus. Mit `--before <Ordner>` wird derselbe Moment aus einem anderen Stand (hier: Hauptordner auf `main`)
direkt darüber gezeigt. Das Skript bricht ab, wenn beide Stände unterschiedliche Ereignisse erzeugen.

```bash
node scripts/scrap-effects-preview.mjs --before "<Ordner auf main>" --arena sunshine --out output/scrap-effekte/sunny.jpg
```

**Vergleichsblätter** (Seed 42, 1080p quer):
[Sunny Yard](reference/scrap-effekte-sunny-2026-11-19.jpg) ·
[Scrapyard](reference/scrap-effekte-scrapyard-2026-11-19.jpg)

---

## E1–E5 · Entwurf der neuen Effekte (Stopp: Stilfreigabe)

Neue Datei `src/scenarios/scrap/effects-art.js` (`EBS.ScrapEffectsArt`), eingebunden in `index.html` und
`test/scrap.test.mjs`. Startwerte aus der Stilbibel des Plans; Abweichungen unten.

| Paket | Umgesetzt |
|---|---|
| E1 Schuss | Vierzackiges Mündungsfeuer 0,1 s in Teamfarbe mit Kontur; Rückstoß Turm 6 AE, Chassis 1,5 AE über 0,12 s; Rauchwölkchen an der Mündung 0,5 s; Blaster-Geschoss als Kapsel 18 × 6 AE mit weißem Kern und drei Nachziehern; Raketenrauch auf hellen Karten dunkler, drei Startwolken |
| E2 Treffer am Roboter | weißes Aufblitzen der Silhouette 0,06 s (70 %); Kontaktstern und 6–8 Funken mit Kontur; 2–3 Blechsplitter in abgedunkelter Teamfarbe bleiben liegen; Schubs 2 AE über 0,1 s; heutiger Trefferring entfällt |
| E3 Deckung | je Material Splitter, Brocken und Staub, weg von der getroffenen Seite |
| E4 Explosion | Blitz, Feuerball aus 5–7 Kreisen mit Kontur (gelb → orange → rot), Staubring am Boden, 6–10 Trümmer bleiben liegen, 6–8 Rauchwolken bis 2,5 s, Brandfleck wie bisher |
| E5 K.o. | Explosion 1,25-fach mit 12 Funken; Turm fliegt 30–50 AE drehend weg und bleibt liegen; Wrack raucht bis Rundenende (drei Wölkchen je Sekunde) |

Alles Dauerhafte (Splitter, Trümmer, Turm, Rauch, Schubs) wird aus dem Ereignisprotokoll der laufenden Runde berechnet,
höchstens 40 liegende Teile und 6 Rauchsäulen. Die neuen Explosionen gelten in der Material-Arena (`v3`, alle Karten);
die älteren Arenen behalten die bisherige Explosion, bekommen aber Geschoss, Mündungsfeuer und Treffer neu.

**Abweichungen vom Plan, mit Grund**

- Feuerball kleiner als geplant (Halbmesser 0,18·s → 0,34·s statt 0,3·s → 0,6·s), Blitz 0,2·s statt 0,3·s. In der
  ersten Vorschau verdeckten Feuerball und Blitz die Roboter ganz.
- Deckungstreffer leben nur 0,28 s statt 0,6 s: Unter `v3` kennt das Ereignis `cover_hit` nur die Blockmitte, die
  Trefferstelle steht nur im kurzlebigen Effekt der Simulation. Mit `hitX`/`hitY` in `v4` (K2) geht mehr. Einschusslöcher
  entfallen bis dahin, wie im Plan vorgesehen.

### Vergleichsclips (lokal)

Der Nutzer kann den Stil an Einzelbildern schwer beurteilen. Deshalb gibt es zwei Clips mit derselben Szene vorher (oben bzw.
links, Stand `main`) und nachher, je 15 s mit dem gewählten Ton B2 (−23 LUFS, Spitze ≤ −6 dBFS):

- quer: Produktionsvorlage `scrap-long`, Sekunde 7–22 (Raketen, Explosionen, K.o. bei 19,1 s)
- hochkant: Produktionsvorlage `scrap-short`, Sekunde 10–25 (Explosionen, K.o. bei 22,5 s)

Vorher und nachher haben denselben Zustands-Hash (quer `a5c8ebbc`, hochkant `1b70e6c2`); der Export hat beide
geprüft. Die Clips liegen unter `output/scrap-effekte-clips/` und sind nicht im Repository.

### Messwerte

| Prüfung | Ergebnis |
|---|---|
| `node --test test/scrap.test.mjs` | 20 von 20 bestanden |
| Ereignisse vorher/nachher (90 s Simulation, Sunny Yard und Scrapyard) | gleich |
| Seek: Bild nach Sprung = Bild nach 30 durchgehenden Bildern (Explosion und K.o., beide Karten) | 4 von 4 pixelgleich, Zustands-Hash gleich |
| Renderzeit je Bild (90 Bilder ab 6 s, JPEG, bester von drei Läufen) | Sunny Yard 33,7 → 35,0 ms (+3,8 %), Scrapyard 69,8 → 69,6 ms (±0) |

Die Renderzeit ist mit Bildkodierung gemessen, daher höher als der Bezugswert 22,1 ms im Plan; verglichen wird nur
vorher gegen nachher.

**Dabei gefunden und behoben:** Im Querformat gibt die Darstellung die Roboter der Simulation direkt weiter (keine
Kopie). Ein erster Entwurf schrieb dort Hilfsfelder für Schubs und Rauch hinein; die Physik blieb gleich, der
Zustands-Hash wich nach Treffern ab. Die Felder liegen jetzt nur auf Kopien; die Seek-Prüfung hat das aufgedeckt.

### Nicht gelaufen

- Kein `npm run golden`, kein vollständiger `npm test` (reine Darstellung; Ereignisse per Vorschau-Skript verglichen).
- Kein Video-Export. Hochformat nur als Stichprobe (zwei Einzelbilder).

### Grenzen

- Stil ist ein Entwurf: Größen, Farben und Dauer sind Startwerte und warten auf die Freigabe des Nutzers.
- Liegende Blechsplitter nehmen eine zufällige Richtung, weil das Treffer-Ereignis die Lage des Roboters nicht kennt.

---

## K1–K5 · Regelversion v4 „Taktik-Arena“ (Stopp: Testclip)

Neue Datei `src/scenarios/scrap/tactics.js` (`EBS.ScrapTactics`), Auswahl „Taktik-Arena (v4, in Arbeit)“. Die
Vorlagen bleiben auf `v3`, bis der Nutzer die Testclips abnimmt. `classic`, `v2` und `v3` sind unverändert.

| Paket | Umgesetzt |
|---|---|
| K1 Startkisten | Schatten bis 1,2 s, Aufschlag mit Staubring, Ausbruch einzeln ab 1,6 s plus Seed-Zufall (mindestens 0,4 s Abstand); Seitenwände fliegen weg, Bretter bleiben liegen, Teamband auf dem Deckel. Eigener Zufallsstrom nur für die Aufstellung. In der Kiste ist der Roboter unverwundbar und steht still. Ereignisse `crate_land` und `crate_break` mit Ton |
| K2 Zielwahl und Schusslinie | Ziel nach Weg, Sicht, Schwäche, Rache, Treue und Seed-Rauschen; Schuss nur bei freier Linie (Ausnahmen: Holz unter 300 AE, Rakete auf Deckung neben dem Ziel); Turm dreht höchstens 5 rad/s; `cover_hit` nennt in `v4` die Trefferstelle |
| K3 Wegfindung | A* auf 8-AE-Raster mit festem Gleichstand (f, h, Zellnummer), geglättete Wege, bei freier Fahrt Luftlinie; Gleiten an Kanten mit 30 % Verlust; Befreien nach 1 s Stillstand |
| K4 Fahren und Verhalten | Panzerfahren: Chassis zeigt die Fahrtrichtung, Turm das Ziel. Suchen, Angreifen, Deckung, Flanke. Charaktere: Ember Draufgänger, Azure Scharfschütze, Amber Sammler, Moss Flankierer |
| K5 Abstimmung | Kampftempo und Charakterwerte nach Messung über 100 Seeds je Format; Testdatei, Messskript, zwei Testclips |

**Abweichungen vom Plan, mit Grund**

- Raster 8 AE, frei ab Roboterradius + 1 AE (Plan: 16 AE und + 4 AE). Mit den Planwerten fielen die 60 AE breiten
  Gassen der Karten weg; Teile der Arena waren nicht erreichbar.
- A* sucht nur, wenn die Luftlinie verstellt ist. Ein erster Entwurf mit einer Suche für alle Ziele zugleich
  (Dijkstra) machte `v4` 2,4-mal so teuer wie `v3`.
- Rakete 26 statt 30 Schaden. Ember: Wunschabstand −15 % statt −30 %, Deckung ab 25 % statt 20 % Leben. Amber:
  Raketen 15 % statt 25 % günstiger. Mit den Startwerten gewann Ember hochkant selten und Amber zu oft.
- Angreifen: Hat kein Punkt auf dem Kreis freie Sicht, werden zwei engere Kreise geprüft, sonst fährt der Roboter
  heran. Vorher standen sich Roboter hinter Deckung gegenüber (hochkant 57 % Unentschieden).
- Zusätzlich gegen Staus: Der Roboter mit der höheren Nummer weicht 0,5 s zurück; eine Waffe, die schon ein anderer
  ansteuert, zählt 300 AE weiter weg; um stehende Roboter wird seitlich herumgefahren; ein Wegpunkt gilt erst als
  erreicht, wenn der nächste frei erreichbar ist.

### Messwerte

`node scripts/scrap-v4-stats.mjs` (neu), 100 Seeds je Format, Sunny Yard, nur Simulation. Zum Vergleich dieselbe
Messung mit `--rules v3`.

| Messgröße | Ziel | `v3` quer | `v4` quer | `v3` hochkant | `v4` hochkant |
|---|---|---|---|---|---|
| erster K.o. (Median) | 10–16 s | 18,9 s | 15,5 s | 25,1 s | 16,2 s |
| Rundendauer (Median / längste) | 30–45 s / ≤ 75 s | 34,6 / 48,4 s | 30,9 / 48,2 s | 42,0 / 76,7 s | 27,8 / 47,3 s |
| häufigstes Trefferpaar (erste 15 s) | < 30 % | 39,8 % | 20,4 % | 41,4 % | 19,3 % |
| zwei häufigste Paare zusammen | < 50 % | 79,4 % | 40,1 % | 82,3 % | 38,4 % |
| freie Schüsse, die doch Deckung treffen | < 10 % | – | 5,5 % | – | 6,6 % |
| festgefahren (Anteil der Roboterzeit) | < 1 % | 0,1 % | 0,9 % | 0,6 % | 0,9 % |
| Siege Ember / Azure / Amber / Moss | je 20–30 % | 24 / 23 / 20 / 33 % | 25 / 20 / 37 / 18 % | 26 / 14 / 33 / 27 % | 33 / 23 / 23 / 21 % |
| Unentschieden | < 5 % | 0 % | 0 % | 0 % | 0 % |
| Rechenzeit je Simulationssekunde | höchstens `v3` + 30 % | 9,0 ms | 7,4 ms (−18 %) | 9,1 ms | 9,7 ms (+6 %) |

- Gegenprobe mit Seeds 101–200: Siege quer 19 / 21 / 31 / 28 % (1 Unentschieden), hochkant 21 / 23 / 31 / 25 %.
- A* (30 Seeds): 14,5 bzw. 16,9 Suchen je Simulationssekunde, im Mittel 0,07 bzw. 0,14 ms (Ziel unter 0,3 ms),
  95 % der Suchen unter 0,23 bzw. 0,49 ms.
- Renderzeit je Bild (1080p mit JPEG, ohne Grafikkarte, Seed 7, 90 Bilder ab 6 s, bester von drei Läufen): quer
  133,5 → 145,6 ms (+9 %), hochkant 151,8 → 145,7 ms (−4 %); Ziel höchstens +15 %. Export 20 s quer: `v3` 44 s, `v4` 43 s.

### Prüfungen

| Prüfung | Ergebnis |
|---|---|
| `node --test test/scrap-v4.test.mjs` (neu) | 4 von 4: Kisten-Platzierung und eigener Zufallsstrom; Kiste schützt und hält fest; A* so kurz wie eine Dijkstra-Gegenrechnung, fester Gleichstand, geglättete Wege frei; drei Seeds je Format gültig, reproduzierbar und mit Sieger, Ereignisbeobachtung ändert den Zustand nicht |
| `node --test --test-name-pattern=Seek test/scrap-optics.test.mjs` | bestanden, jetzt auch `v4` quer und hochkant (Kistenlandung, erster Ausbruch, Explosion, Rundenende, nächste Runde): Bild nach Sprung pixelgleich |
| `node --test test/scrap.test.mjs` | 20 von 20 |
| `node scripts/scrap-map-hashes.mjs` | 6 Karten × 4 Prüfpunkte gleich |
| `npm run golden` | identisch mit der Referenz (36 Fälle) |

### Testclips (lokal, Stopp)

Zwei Clips je 20 s, Sunny Yard, nachträglich mit dem gewählten Ton B2 gemischt (−23 LUFS, Spitze −6 dBFS); die
Kistenklänge sind aus denselben Bausteinen gebaut. In beiden Clips startet kein Roboter in seiner früheren Ecke.

- quer: Seed 13, erster K.o. nach gut 11 s – `output/scrap-v4/v4-testclip-quer.mp4`
- hochkant: Seed 7, erster K.o. nach gut 12 s – `output/scrap-v4/v4-testclip-hoch.mp4`

Die Clips liegen nicht im Repository. Der Nutzer beurteilt Fahrgefühl und Spannung; danach wechseln die Vorlagen auf `v4`.

### Nicht gelaufen

- Kein vollständiger `npm test`; aus der Optik-Datei nur der Seek-Test.
- `v4` auf Scrapyard, Foundry und Crossroads nur in einzelnen Vorschaubildern angesehen, nicht gemessen.
- Keine Vorlage umgestellt, kein Export über 20 s.

### Grenzen und offene Fragen

- **Kisten je Viertel:** Auf Sunny Yard landet in 200 von 200 Seeds genau eine Kiste je Viertel. Die Mitte ist voll
  Deckung und Nachschub. Zufällig sind, wer wo landet, die genaue Stelle und die Ausbruchszeit. Lockerere Abstände
  (44 / 70 AE oder 40 / 60 AE) brachten quer unter 8 % der Kisten in die Mitte, dafür mehr Feststecken. Mehr Mitte
  ginge nur mit einer anderen Aufteilung der Karte.
- **Startecken im Boden:** Die farbigen Ecken passen nicht mehr zu den Kisten. Vorschlag: in `v4` weglassen.
- **Ausgleich:** Amber gewinnt quer 37 % (Seeds 1–100) bzw. 31 % (Seeds 101–200), Ember hochkant 33 %. Ambers
  Raketenrabatt bewegt das kaum (ohne Rabatt 29 %). Rundendauer hochkant 27,8 s knapp unter, erster K.o. hochkant
  16,2 s knapp über dem Ziel.
- **Node und Browser:** `Math.sin` und `Math.cos` liefern in Node 22 und Chromium 148 teils andere letzte Stellen.
  `v4` braucht sie in jedem Schritt für die Fahrtrichtung, deshalb trennt sich ein Lauf in Node nach einigen
  Sekunden vom Export. Maßgeblich ist der Browser: Export, Seek-Test und Referenz-Hashes laufen dort und sind
  reproduzierbar. Die Kennzahlen aus Node sind statistisch gleichwertig.
- Die Kistenklänge im Repository sind noch Kenney-Holzklänge; die B2-Fassung kommt mit T2.

---

## Nachtrag: Waffen als Symbol-Marken, Vorlagen auf v4

**Rückmeldung des Nutzers zu den Testclips:** „soweit ganz ok“. Gestört haben die Waffen am Boden: Die dunklen
Felder mit Zahlen sind schwer lesbar, wenn man nicht weiß, was sie bedeuten.

**Vorschau:** Drei Varianten als gerenderte Bilder, quer im Nahbild und hochkant als ganzes Bild (lokal unter
`output/scrap-v4/vorschau-waffen-*.png`): A Symbol, B Symbol mit Wort, C leuchtende Waffe. Der Nutzer wählt **A**.

**Umgesetzt (nur Sunny Yard, `v3` und `v4`, nur Darstellung):**

- Eine Waffe am Boden ist eine weiße runde Marke mit dunklem Rand und großem Symbol: Rakete für Raketen, Blitz für
  den Blaster. Sie schwebt leicht. Das Schweben hängt nur an der Rundenzeit, ein Sprung liefert also dasselbe Bild.
  Leere Waffen bleiben als blasse graue Marke liegen und verblassen.
- Die Waffenstation ist ein heller Ring. Beim Aufladen füllt er sich, und das kommende Symbol steht blass in der
  Mitte. Liegt eine Waffe darauf, sieht man nur die Marke.
- Munitionszahl, Countdown („02“, „READY“) und das Wort auf der Station entfallen.
- Die anderen Karten behalten ihre bisherigen Waffen.

**Vorlagen:** `presets/production/scrap-short.json` und `scrap-long.json` sowie die Vorlagen der Oberfläche nutzen
jetzt `v4`. In der Auswahl heißt die Regelversion „Taktik-Arena · Startkisten, Zielwahl, Wegfindung“, ohne
„in Arbeit“.

| Prüfung | Ergebnis |
|---|---|
| Bild aus dem Code gegen Vorschau A (quer, 9 s) | gleich |
| `node --test --test-name-pattern=Seek test/scrap-optics.test.mjs` | bestanden (Sunny `v3` und `v4`, quer und hochkant) |
| `node --test test/scrap-material-art.test.mjs test/scrap-labels.test.mjs` | 5 von 5 |
| `node --test test/presets.test.mjs test/presets-export-scrap.test.mjs` | 6 von 6, Short und Langvideo exportieren mit `v4` |
| Renderzeit je Bild (wie oben gemessen) | quer `v3` 127,2 ms, `v4` 130,2 ms; hochkant `v3` 141,9 ms, `v4` 136,0 ms; nicht langsamer als vorher |

**Nicht gelaufen:** kein vollständiger `npm test`, kein neuer Export mit Ton. Die Simulation ist unverändert.

**Offen:** Die Kopfzeile zeigt noch die alte Waffenform mit Munitionszahl. Sie könnte dieselben Symbole bekommen;
das kommt erst nach einer Vorschau. Ebenfalls offen: die farbigen Startecken im Boden.
