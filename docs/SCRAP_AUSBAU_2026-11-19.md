# Scrap Wars: Ausbau – Bericht vom 19.11.2026 (R40)

**Bezug:** [Ausbau-Plan](SCRAP_AUSBAU_PLAN_2026-11-19.md). **Stand:** T1 Hörprobe abgeschlossen (B2 gewählt), E0–E5 auf `main` (PR #44), K1–K5 Taktik-Arena `v4` gebaut,
gemessen und vom Nutzer angenommen („soweit ganz ok“); Waffen auf Sunny Yard als Symbol-Marken, Vorlagen auf `v4`
(PR #45 auf `main`). T2 Ton `soft-v1` vom Nutzer angenommen („Passt“, PR #46). S1 Teil 1 (Short-Karte und Ablauf)
gebaut, danach auf Wunsch des Nutzers gestoppt; alles Offene steht in [SCRAP_OFFENE_PUNKTE_2026-11-20.md](SCRAP_OFFENE_PUNKTE_2026-11-20.md).

**Kurz:** Die Sunny-Kopfzeile ist englisch und zeigt Waffensymbole. Neue Treffer-, Schuss- und Explosionseffekte
stehen als Vorher/Nachher-Blätter bereit. Beim Ton ist Variante B2 „sauber“ gewählt und als Schalter `soundMix: 'soft-v1'` eingebaut; die Vorlagen nutzen ihn. Die Taktik-Arena `v4` ist
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

---

## T2 · Ton „soft-v1“ (Stopp: Hörurteil)

**Umfang:** Die gewählte Hörprobe B2 „sauber“ ist fest im Repository, genau nach dem Rezept der angenommenen
v4-Testclips (B2 mit Kistenklängen und Fauch-Rakete).

- **Klänge:** 21 gebackene Dateien `assets/audio/scrap-b2-*.ogg` (zusammen 196 KB) und die Windschleife
  `scrap-wind-loop.ogg` (Stereo, 1 s Vorlauf und 30 s Schleife, 278 KB). Quellen: 17 unveränderte Kenney-Dateien
  (CC0) in `assets/audio/scrap-source/` mit beiden Lizenztexten. Bau und Prüfung: `scripts/build-scrap-audio.mjs`
  (`--check` baut im Speicher nach und vergleicht alle Prüfsummen), Nachweis in `assets/audio/SCRAP_AUDIO.json`.
- **Schalter `soundMix`** in der Oberfläche „Ton“: „Weich · klare Klänge, leiser Wind, feste Mischung“ (`soft-v1`) oder
  „Bisheriger Ton“ (`classic`). Fehlt er, gilt `classic`; der bisherige Ton ist unverändert. Die Simulation sieht den
  Schalter nicht, ihre Hashes bleiben gleich.
- **Mischung:** Profil `marbleworks-soft-v1` mit festem Pegel +4,5 dB, Grenze −6 dBFS. Der Mischplan entscheidet für
  jedes Ereignis: K.o. und Explosion immer hörbar, sonst höchstens zwei Klänge je halbe Sekunde in der Rangfolge
  Zerstörung > Treffer > Rakete > Blaster > Deckungstreffer > Rest; höchstens drei Blaster je Sekunde, je Roboter
  0,23 s Abstand; nach K.o. oder Explosion 0,3 s lang Blaster und Treffer halb so laut; Stereo ±0,35 nach Bildposition.
  Jeder Roboter feuert in seiner eigenen Tonlage.
- **Wind:** über den vorhandenen Hintergrund-Weg (wie Wasser bei Pyramid und Naval), bei −48 LUFS, mit eigenem
  Regler „Wind“. Die Regler der Klänge behalten ihre deutschen Namen.
- **Vorlagen:** Short und Langvideo (`presets/production/scrap-*.json` und Oberfläche) nutzen `soft-v1`.

**Abweichungen vom Plan:** höchstens drei statt vier Blaster je Sekunde und 0,23 s statt 0,18 s Abstand je Roboter,
weil die gewählte Hörprobe so klang. Kein eigener Klang für Rundenende und Anfahren; die dunklen Karten bekommen
ebenfalls den Wind statt eines Hallenbrummens.

**Einmessen des Pegels** (Simulation im Browser, Mischung wie im Export, Sunny Yard `v4`, je 60 s, Seeds 1–4 und 42):

| Format | Lautheit mit Wind bei +5,5 dB | Begrenzer, stärkster Eingriff |
|---|---|---|
| quer | −22,0 bis −24,2 LUFS | −2,9 bis −8,4 dB |
| hochkant | −21,6 bis −22,9 LUFS | −3,7 bis −6,1 dB |

Gewählt ist 1 dB weniger, also +4,5 dB: Median etwa −23 LUFS, und die Spitzen werden weniger stark begrenzt.

**20-s-Proben** (lokal unter `output/scrap-t2/`, Vorlagen Short und Langvideo mit den Seeds der Testclips):

| Probe | Klänge hörbar | Mischung | fertige AAC-Spur | echte Spitze | Begrenzer |
|---|---|---|---|---|---|
| hochkant, Seed 7 | 58 von 148 (2,9 je s) | −23,6 LUFS | −23,8 LUFS | −6,0 dBTP | −1,6 dB |
| quer, Seed 13 | 46 von 121 (2,3 je s) | −22,2 LUFS | −24,7 LUFS | −5,9 dBTP | −3,7 dB |

| Prüfung | Ergebnis |
|---|---|
| `node scripts/build-scrap-audio.mjs --check` | alle Prüfsummen gleich |
| `node --test test/audio-scrap-soft.test.mjs` (neu) | 4 von 4: Schalter, Dateien, Rangfolge, Dichte, Ducking, Stereo, Stummschalten, Pegel, Wind −48 LUFS |
| `node --test test/scrap.test.mjs test/audio-materials.test.mjs test/presets.test.mjs test/scrap-labels.test.mjs` | 30 von 30 |
| `node --test test/presets-export-scrap.test.mjs` | 2 von 2, beide Vorlagen exportieren mit `soft-v1` und Wind |

**Nicht gelaufen:** kein vollständiger `npm test`, keine Referenz-Hashes (Simulation unverändert, im Test über den
Zustands-Hash nachgewiesen).

**Grenzen:**

- Die Lautheit misst mit Wind niedriger als ohne: Der Wind füllt die Pausen, und die Messung zählt sie dann mit.
  In den ersten 20 s ist es wegen der Kistenphase noch leiser, über eine Minute liegt der Median bei −23 LUFS.
- Der Begrenzer fängt dichte K.o.- und Explosionsmomente ab, in der Messung bis etwa −7 dB (die angenommenen
  Testclips hatten bis −6,7 dB).
- Bitgleiches Neubauen der OGG-Dateien gilt nur mit der dokumentierten FFmpeg-Version.

**Stopp:** Hörurteil des Nutzers zu den zwei Proben. **Ergebnis (19.11.):** „Passt, mergen“, PR #46 auf `main`.

---

## S1, Teil 1 · Short-Karte und Ablauf (in Arbeit)

**Umfang:** der Simulationsteil des Short-Layouts. In der Oberfläche ist er noch nicht wählbar und deshalb unsichtbar;
die Darstellung (keine Kopfleiste, große Namensschilder, Einstiegstext, Sieger groß) folgt. Die offenen Schritte
stehen in [SCRAP_OFFENE_PUNKTE_2026-11-20.md](SCRAP_OFFENE_PUNKTE_2026-11-20.md).

- **Parameter `layout: 'short'`:** gilt nur mit `v4` auf Sunny Yard und nur hochkant. Ohne ihn fehlt der Schlüssel in
  den Parametern, die Zustands-Hashes bleiben gleich.
- **Short-Karte** 540 × 700 AE (hochkant gesehen) statt 540 × 1040: 12 Deckungen (6 Holz, 3 Stein, 3 Beton),
  punktsymmetrisch, gleiche Waffen und Stationen, Startkisten wie in `v4`. Die Arena füllt die Bildbreite (2 Pixel
  je AE bei 1080) und liegt zwischen 8 % und 81 % der Bildhöhe.
- **Ablauf:** nach dem Sieg 2,5 s Abspann, dann Schluss, keine zweite Runde. Das Video endet von selbst; die
  Export-Vorplanung rechnet die Länge vorab wie beim Turnier.
- Die Material-Arena liest Breite und Höhe jetzt aus `this.bounds` statt aus festen Zahlen; in `v3` und `v4` sind das
  dieselben Werte.
- Statistik: `node scripts/scrap-v4-stats.mjs --layout short`.

| Messung (100 Seeds, hochkant, Node) | Wert |
|---|---|
| erster K.o. | Median 14,4 s |
| Rundenlänge | Median 27,0 s, längste 46,4 s |
| häufigstes Paar in den ersten 15 s | 19,4 % |
| festgefahren | 0,6 % der Roboterzeit |
| Siege EMBER / AZURE / AMBER / MOSS | 27 / 31 / 18 / 24 %, kein Unentschieden |
| Kisten-Ersatzaufstellung | 0 |
| Rechenzeit | 6,5 ms je Simulationssekunde |

| Prüfung | Ergebnis |
|---|---|
| `node --test test/scrap-v4.test.mjs test/scrap.test.mjs` | 25 von 25, neu: Short-Test (Karte, Abspann 150 Schritte, Exportlänge, Parameter) |
| `node scripts/scrap-map-hashes.mjs` | 6 Fälle × 4 Prüfpunkte gleich |
| `npm run golden` | 36 Fälle × 2 Prüfpunkte identisch mit der Referenz |
| `node --test test/presets.test.mjs` | 4 von 4 |
| `v3` und `v4` ohne Short gegen `main`, 24 Fälle über 45 s | kein Unterschied |

**Nicht gelaufen:** kein vollständiger `npm test`, keine Bilder, kein Export.

**Grenzen:** Der erste K.o. liegt über dem Ziel aus S2 (5–10 s); das soll die Short-Balance in S2 lösen. Die Werte
sind in Node gemessen; im Browser laufen `v4`-Runden wegen leicht anderer `sin`/`cos`-Werte etwas anders.

**Stopp** am 20.11. auf Wunsch des Nutzers nach diesem Teil. Fortsetzung am 21.11. im nächsten Abschnitt.

---

## S1, Rest · Darstellung des Shorts (21.11.2026)

**Umfang:** nur Darstellung und Bedienung; die Simulation ist unverändert. Der Short ist jetzt in der Oberfläche
wählbar.

- **Keine Kopfleiste:** Bei `layout: 'short'` hochkant zeichnet der Short weder Kopfleiste noch Rundenbanner. Oben
  bleiben 8 %, unten 19 % des Bildes einfarbig frei (dort liegt die Bedienung der Plattform).
- **Namensschilder 1,4-fach** mit Lebensbalken; die Munitionspunkte wachsen mit. Die Schilder haben dafür einen
  Maßstab bekommen; im normalen Bild ist er 1 und alle Zahlen sind wie bisher.
- **Einstiegstext** 0–2,5 s: „4 BOTS · 1 SURVIVOR“ bei 22 % der Bildhöhe, darunter „PICK YOUR COLOR“. Weiße Schrift
  mit dunklem Rand, ab dem ersten Bild voll sichtbar, blendet 0,3 s aus. Die Zeit folgt aus dem Episodenschritt.
- **Abspann:** groß „<NAME> WINS“ in der Teamfarbe mit weichem dunklem Band dahinter, in der Mitte der Arena. Steht
  der Sieger selbst in der Mitte, rückt die Schrift knapp über oder unter ihn. Kein „NEXT ROUND“, kein „ROUND
  COMPLETE“. Die letzte Explosion klingt im Abspann aus, statt einzufrieren.
- **Sunny-Boden bei 540 × 700:** geprüft, passt ohne Änderung (Platten, Mittelstreifen, Abläufe und Pflanztröge
  sitzen richtig).
- **Schalter „Bildaufbau“** in der Oberfläche: „Normal · Kopfleiste, ganze Arena“ oder „Short · kleine Karte, ohne
  Kopfleiste, eine Runde (nur Hochformat)“. Wählbar nur mit Taktik-Arena auf Sunny Yard. Im Hochformat endet das
  Video dann von selbst; die Längenanzeige sagt „eine Runde bis zum Sieg und 2,5 Sekunden Abspann“.
- **Vorschau-Skript** `scripts/scrap-short-preview.mjs`: Einstieg, Kampf und Sieger als Einzelbilder und als ein
  Blatt (lokal unter `output/scrap-short/`).

| Prüfung | Ergebnis |
|---|---|
| `node --test test/scrap-short.test.mjs` (neu) | 3 von 3: kein Text am Rand (oben 8 %, unten 19 % einfarbig, acht Zeitpunkte), Einstiegstext bei 22 %, Sieger groß ohne „NEXT ROUND“; Seek-Bild an fünf Stellen pixelgleich; Schalter „Bildaufbau“ |
| `node --test test/scrap-labels.test.mjs test/scrap-optics.test.mjs test/scrap-hud.test.mjs test/audio-scrap-soft.test.mjs` | 15 von 15 |
| Bildvergleich gegen `main` ohne Short (`classic`, `v2`, `v3`, `v4`; quer und hochkant; je 5 Bilder bis 30 s) | 10 Fälle × 5 Bilder pixelgleich, Zustands-Hash gleich |
| Vorschaubilder Seed 42 (Einstieg 1,0 s, Kampf 10,6 s, Sieger 22,4 s) | dem Nutzer gezeigt |

**Nicht gelaufen:** kein vollständiger `npm test`, kein Export.

**Grenzen:** Die farbigen Startecken im Boden sind auch im Short zu sehen (offene Frage an den Nutzer). Die Regie
(Schaden, Zeitlupe, Casting) folgt in S2; bis dahin dauert eine Runde so lange wie in `v4`.

---

## S2 · Verdeckte Regie (21.11.2026)

**Umfang:** Short-Balance, Zeitlupe beim letzten K.o. und Casting. Alles gilt nur bei `layout: 'short'` hochkant;
`classic` bis `v4` ohne Short rechnen wie bisher.

### Short-Balance

> Stand vor der ersten Probe. Seit dem [Nachtrag](#nachtrag-zum-short-nach-der-ersten-probe-21112026) gilt nach dem
> ersten K.o. Schaden ×0,55 und eine kürzere Deckung.

Der Startwert aus dem Plan war „Schaden überall ×1,5“. Gemessen brachte das den ersten K.o. nur von 14,4 s auf 11,6 s
und verkürzte zugleich die ganze Runde auf rund 25 s. Deshalb wirkt der Zuschlag jetzt nur in der Eröffnung:

- **Solange alle vier leben: Schaden an Robotern ×2,5.** Danach normaler Schaden (×1).
- **Im Schlussduell nimmt der Schwächere 20 % weniger Schaden** (wie im Plan).
- **Die Startkisten brechen innerhalb von 1,2 s auf** statt 2,4 s (der Mindestabstand von 0,4 s bleibt).

| Einstellung (200 Seeds, Node) | erster K.o. | zweiter K.o. | Schlussduell | Videolänge |
|---|---|---|---|---|
| ohne Balance (Stand S1, 100 Seeds) | 14,4 s | – | – | 29,5 s |
| überall ×1,5 (Startwert) | 11,6 s | 14,7 s | 7,0 s | 25,3 s |
| Eröffnung ×2,0, danach ×1,5 | 9,5 s | 13,9 s | 5,6 s | 23,4 s |
| Eröffnung ×2,5, danach ×1,5, Kisten 1,2 s | 8,0 s | 12,3 s | 6,6 s | 22,6 s |
| **Eröffnung ×2,5, danach ×1, Kisten 1,2 s (gewählt)** | **8,0 s** | **13,4 s** | **8,6 s** | **26,4 s** |
| Eröffnung ×2,5, danach ×0,8, Kisten 1,2 s | 8,0 s | 14,7 s | 8,7 s | 28,3 s |

Alle Werte sind Mediane. Zielwerte: erster K.o. 5–10 s, zweiter 12–20 s, Schlussduell ab 6 s, Länge 26–38 s. Mit
der gewählten Einstellung liegt der erste K.o. bei 90 % der Seeds im Ziel (mit „überall ×1,5“ waren es 35 %). Die Siege bleiben verteilt (EMBER 22 %, AZURE 28 %,
AMBER 27 %, MOSS 23 % über 1200 Seeds, kein Unentschieden).

### Zeitlupe beim letzten K.o.

- 0,5 s Videozeit mit Tempo 0,35: **0,3 s vor dem letzten Treffer** läuft die Simulation langsamer, **0,2 s danach**
  laufen Explosion, Trümmer und Rauch langsamer. Der Sieger-Schriftzug erscheint erst 0,3 s nach dem K.o.
- **Vorab berechneter Tempoplan:** Beim Start rechnet die Episode eine zweite, unbeobachtete Runde mit demselben
  Seed bis zum Ende und kennt damit den Schritt des letzten K.o. Der Plan steht fest, bevor das erste Bild entsteht.
- **Seek-Regel:** Der Renderer hält keinen eigenen Zustand. Das Alter der Effekte rechnet er über die neue
  Szenenzeit der Episode (`sceneTime`), die in der Zeitlupe langsamer läuft.
- Das Video wird durch die Zeitlupe rund 0,2 s länger; die Export-Vorplanung rechnet das mit.
- **Ton:** Die Klänge liegen zeitlich richtig, werden aber nicht gedehnt und bekommen keinen eigenen Akzent.
- Im Langvideo und ohne Short gibt es keinen Plan (`slow` ist dort leer), die Zustands-Hashes bleiben gleich.

### Casting

> Die Zahlen und die Seed-Liste dieses Abschnitts sind überholt: Nach der ersten Probe wurde neu gerechnet
> ([Nachtrag](#nachtrag-zum-short-nach-der-ersten-probe-21112026), jetzt 29 Seeds, Vorlage auf Seed 84).

`node scripts/scrap-short-casting.mjs --from 1 --to 1200 --list` rechnet **in Chromium**, also dort, wo auch der
Export rechnet. Bedingungen in Videosekunden: erster K.o. 5–10 s, zweiter 12–20 s, Schlussduell mindestens 6 s,
beide Duellanten beim Start des Duells unter 40 % Leben, Länge 26–38 s. Bevorzugt gewinnt nicht der Roboter, der
zuerst bewaffnet war. In `v4` starten alle vier mit einem Blaster (9 Schuss); „zuerst bewaffnet“ heißt hier deshalb:
Er nimmt als Erster eine neue Waffe vom Boden auf.

| Messung (Seeds 1–1200, Chromium 148) | Wert |
|---|---|
| erster K.o. 5–10 s | 89,3 % der Seeds, Median 8,0 s |
| zweiter K.o. 12–20 s | 59,5 %, Median 13,1 s |
| Schlussduell mindestens 6 s | 62,1 %, Median 8,6 s |
| beide beim Duellstart unter 40 % Leben | 36,3 % |
| Länge 26–38 s | 35,8 %, Median 25,8 s |
| Bogen vollständig | 32 Seeds (2,7 %) |
| davon gewinnt nicht der zuerst Bewaffnete | **23 Seeds**, als Liste `SHORT_SEEDS` in `src/scenarios/scrap/episode.js` |
| Vergleich Node | 33 vollständige Seeds statt 32: Einzelne Runden laufen in Node anders, wie angekündigt |

Die Vorlage nimmt den nächsten geprüften Seed ab dem gewünschten (`EBS.Scrap.castSeed`). Für Seed 42 ist das
**Seed 61**: erster K.o. 7,8 s (EMBER), zweiter 18,1 s (AZURE), Sieg nach 32,1 s, Schlussduell 14,1 s mit 33 % und
11 % Leben, AMBER gewinnt mit 10 % Rest, zuerst bewaffnet war MOSS. Videolänge 34,6 s.

| Prüfung | Ergebnis |
|---|---|
| `node --test test/scrap-v4.test.mjs test/scrap.test.mjs` | 27 von 27, neu: Balance (Schadensstufen, Kistenzeiten) und Zeitlupe (Plan, letzter K.o. am geplanten Schritt, Szenenzeit stetig, Exportlänge) |
| `node --test test/scrap-short.test.mjs` | 4 von 4, neu: alle 23 Casting-Seeds halten in Chromium den Bogen ein; Seek-Bild an sieben Stellen pixelgleich, zwei davon in der Zeitlupe |
| `node scripts/scrap-map-hashes.mjs` | 6 Fälle × 4 Prüfpunkte gleich |
| `classic` bis `v4` ohne Short gegen `main` (Node, 24 Fälle über 45 s, zwei Turniere, Short-Parameter im Querformat) | 27 Fälle gleich |
| `node scripts/scrap-v4-stats.mjs --layout short` (100 Seeds) | festgefahren 0,7 %, häufigstes Paar 19,3 %, kein Unentschieden, 5,5 ms je Simulationssekunde |

**Nicht gelaufen:** kein vollständiger `npm test`, kein Export. `npm run golden` läuft einmal am Ende der Pakete.

**Grenzen:**

- Die Liste gilt für den heutigen Stand von `v4`, die Short-Balance und Chromium 148. Nach Änderungen daran neu
  rechnen; der Test im Browser meldet es.
- Im Mittel sind Shorts rund 26 s lang, am unteren Rand des Ziels. Die geprüften Seeds liegen bei 26–35 s. Mit
  Schaden ×0,8 nach dem ersten K.o. wären es im Mittel knapp 2 s mehr (Frage an den Nutzer).
- Der Startvorgang eines Shorts rechnet die Runde einmal vorab (rund 0,2 s).

---

## S3 · Short-Vorlage und 20-Sekunden-Probe (21.11.2026)

**Umfang:** Die Short-Vorlage von Scrap Wars nutzt jetzt das Short-Bild mit Regie.

> Seed, Länge und Probe dieses Abschnitts sind der Stand vor der Rückmeldung des Nutzers. Aktuell: Seed 84, 26,5 s,
> neue Probe ([Nachtrag](#nachtrag-zum-short-nach-der-ersten-probe-21112026)).

- **Vorlage** `presets/production/scrap-short.json` und `src/production-presets.js`: „Scrap Wars – Short (4 Bots,
  1 Survivor)“, Taktik-Arena `v4` auf Sunny Yard, `layout: 'short'`, Ton `soft-v1`, 9:16 in 1080p30. Bisher war es
  eine Minute Dauerlauf im normalen Bild.
- **Seed aus dem Casting:** Die Vorlage nimmt den nächsten geprüften Seed ab dem eingestellten. Für Seed 42 ist das
  **Seed 61**. Das ist die eine Stelle, an der ein Vorlagenknopf den Seed ändert (wie bei Cloud Wars).
- **Länge:** ergibt sich aus dem Ablauf, für Seed 61 **34,7 s** (Sieg nach 32,1 s, 2,5 s Abspann). In der Datei
  stehen 35 s nur als Startwert.
- Der Knopf heißt bei Scrap Wars „Short · eine Runde (rund 30 Sekunden)“.

**20-Sekunden-Probe** (lokal, nicht im Repository): `output/scrap-short/scrap-short-probe-20s.mp4` in der
Arbeitskopie `scrap-s1`, die ersten 20 s als Ausschnitt der ganzen Episode:

```bash
node export.mjs --config presets/production/scrap-short.json --clip-start 0 --clip-duration 20 --out output/scrap-short/scrap-short-probe-20s.mp4
```

| Messung | Wert |
|---|---|
| Bild | 1080 × 1920, 30 Bilder je Sekunde, 600 Bilder, 5,0 MB |
| Ton der ganzen Episode | 155 Ereignisse, davon 59 hörbar; −20,8 LUFS, Spitze −6 dBFS, Begrenzer bis −3,3 dB |
| Ton des Ausschnitts (AAC) | −24,5 LUFS, True Peak −5,9 dBTP |
| Exportzeit | 24 s |

| Prüfung | Ergebnis |
|---|---|
| `node --test test/scrap-short.test.mjs` | 5 von 5, neu: Vorlage (Casting-Seed, geplante Länge im Ziel, Export der letzten zwei Sekunden mit Sieger über den echten Exportweg) |
| `node --test test/presets.test.mjs test/audio-scrap-soft.test.mjs` | 8 von 8; die Vorlagen-Tests kennen den Casting-Seed und die geplante Länge |
| `node --test test/presets-export-scrap.test.mjs` | 2 von 2 (3-Sekunden-Exporte über die Oberfläche) |

**Nicht gelaufen:** kein vollständiger `npm test`; **kein ganzes Short** (nur auf Auftrag des Nutzers).

**Grenzen:**

- Die ganze Episode ist mit −20,8 LUFS etwas lauter als der Richtwert −23 von `soft-v1`, weil ein Short dichter ist
  als ein Dauerlauf; die Spitzen bleiben bei −6 dBFS. Das Hörurteil liegt beim Nutzer.
- Der 3-Sekunden-Test über die Oberfläche schaltet für die freie Länge auf das normale Bild zurück; das Short-Bild
  selbst prüft der Export der letzten zwei Sekunden.

---

## L1 · Langvideo-Vorlage im Turniermodus (21.11.2026)

**Umfang:** Die Langvideo-Vorlage von Scrap Wars ist jetzt ein Turnier statt eines Dauerlaufs; der Export schreibt
Kapitelzeiten in die Begleitdatei.

- **Vorlage** `presets/production/scrap-long.json` und `src/production-presets.js`: „Scrap Wars – Langvideo (Turnier,
  8 Runden)“, Taktik-Arena `v4` auf Sunny Yard, Ton `soft-v1`, 16:9 in 1080p30, feste Übersicht. Acht Runden mit
  Punktestand, danach 5 s Rangliste; das Video endet von selbst.
- **Länge:** aus dem Ablauf. Gemessen an sechs Seeds 4:02 bis 5:23 Minuten, für Seed 42 **5:23** (322,7 s, MOSS
  gewinnt mit 5 von 8 Runden). In der Datei stehen 300 s nur als Startwert. Der Knopf heißt „Langvideo · Turnier
  (8 Runden)“.
- **Kapitelzeiten:** Die Episode merkt sich den Videoschritt jedes Rundenstarts (dieselbe Zeit wie das Ereignis
  `round_start`). Der Export schreibt daraus in die JSON-Begleitdatei `chapters` (Zeit in Sekunden, Zeitmarke,
  Titel) und `chaptersText` als fertigen Block für die Videobeschreibung:

  ```text
  0:00 Round 1
  0:41 Round 2
  1:25 Round 3
  2:06 Round 4
  2:46 Round 5
  3:26 Round 6
  4:12 Round 7
  4:50 Round 8 – Final
  ```

  Das sind die Zeiten der Vorlage mit Seed 42, in Chromium gerechnet. Titel englisch. Bei einem Ausschnitt gelten die Zeiten für die ganze Episode (`chaptersScope`). Auch ein
  Dauerlauf mit Folgerunden bekommt Kapitel; ein Short mit einer Runde nicht.
- Die neue Schnittstelle `chapters(sim, cfg)` steht allen Szenarien offen ([ARCHITEKTUR](ARCHITEKTUR.md)).

| Prüfung | Ergebnis |
|---|---|
| `node --test test/scrap-long.test.mjs` (neu) | 3 von 3: Zeitmarken der Kapitelliste; Vorlage als Turnier mit acht Kapiteln auf den Rundenstarts, Short ohne Kapitel; Export der letzten zwei Sekunden schreibt `chapters` und `chaptersText` in die Begleitdatei |
| `node --test test/presets.test.mjs` | 4 von 4; die Vorlagen-Tests kennen das Turnier und die geplante Länge |
| `node --test` mit `scrap-v4`, `scrap`, `scrap-short`, `audio-scrap-soft`, `presets-export-scrap`, `scrap-labels`, `scrap-hud` | 45 von 45 |
| `node --test test/export.test.mjs` (Exporter geändert) | 7 von 7 |
| `node scripts/scrap-map-hashes.mjs` | 6 Fälle × 4 Prüfpunkte gleich |
| `npm run golden` (einmal, am Ende aller Pakete) | 36 Fälle × 2 Prüfpunkte identisch mit der Referenz |
| `classic` bis `v4` ohne Short gegen `main`: Zustand (Node, 27 Fälle) und Bilder (Chromium, 10 Fälle × 5 Bilder) | alle gleich |

**Nicht gelaufen:** kein vollständiger `npm test`; **kein ganzes Langvideo** (über 20 s nur auf Auftrag).

**Grenzen:**

- Die Vorlage nimmt den eingestellten Seed, ein Casting gibt es für das Turnier nicht. Bei Seed 314 endet es
  zum Beispiel 2 : 2 : 2 : 2 („TIED FOR FIRST“).
- Das Langvideo ist rund 5 statt 10 Minuten lang (acht Runden sind fest).
- Die Rangliste am Ende ist 5 s lang und bekommt kein eigenes Kapitel, weil YouTube Kapitel unter 10 s ablehnt.
- Die Rundenliste ist kein Teil des Zustands-Hashes; `classic` bis `v4` bleiben bit-gleich.

---

## Nachtrag zum Short nach der ersten Probe (21.11.2026)

**Rückmeldung des Nutzers zur 20-Sekunden-Probe:** Die Roboter hängen ab etwa der Hälfte des Videos. Die Waffen
sollen erst nach den Robotern kommen, gern vom Himmel fallen. Die Bretter der Startkisten sollen nach 1 bis 2
Sekunden ausblenden, sonst ist das Bild zu unruhig. Alle drei Punkte gelten nur im Short (`layout: 'short'`
hochkant); `classic` bis `v4` ohne Short rechnen und zeichnen wie bisher.

### Hänger

**Ursache:** die Deckung. Wer unter 35 % Leben hat oder nur noch zwei Schuss, fährt hinter einen Block und wartet
dort 3 s. Durch den hohen Schaden der Eröffnung sind nach dem ersten K.o. meist alle angeschlagen und warten
gleichzeitig. Bei Seed 61 standen von 10,2 bis 13,5 s alle drei still, im Schlussduell noch zweimal je 3 s.

**Lösung:** Im Short warten die Roboter in der Deckung nur 0,5 s (höchstens 2,5 s unterwegs, danach 6 s Pause).
Ohne das Warten wäre die Runde nach 22 s vorbei; deshalb zählt Schaden nach dem ersten K.o. jetzt ×0,55 statt ×1.
Die Eröffnung (×2,5) und der Schutz des Schwächeren im Duell (−20 %) bleiben.

Hänger heißt hier: Alle lebenden Roboter stehen (unter 8 AE/s) und niemand schießt, mindestens 1 s lang.

| Einstellung (150 Seeds, Node, Mediane) | zweiter K.o. | Schlussduell | Videolänge | Seeds mit Hänger | Hänger über 2 s |
|---|---|---|---|---|---|
| bisher: 3 s Deckung, Schaden ×1 | 13,5 s | 7,9 s | 25,7 s | 51 % | 31 % |
| keine Deckung, ×1 | 11,8 s | 5,0 s | 20,3 s | 7 % | 1 % |
| keine Deckung, ×0,55 | 13,8 s | 7,3 s | 26,8 s | 5 % | 0 % |
| 0,5 s Deckung, ×1 | 12,9 s | 5,7 s | 22,5 s | 4 % | 0 % |
| 0,5 s Deckung, ×0,6 | 15,0 s | 8,0 s | 27,8 s | 3 % | 0 % |
| 0,5 s Deckung, ×0,5 | 15,5 s | 9,0 s | 31,7 s | 3 % | 0 % |
| **0,5 s Deckung, ×0,55 (gewählt)** | siehe Casting | | | | |

Der erste K.o. bleibt in allen Zeilen bei 8,0 s. Die kurze Deckung bleibt als Bewegung erhalten (ein Roboter duckt
sich kurz weg), ganz ohne Deckung wären die Duelle kürzer und einförmiger.

### Waffen fallen vom Himmel

> **Überholt am 22.11.2026:** Der Abwurf ist wieder ausgebaut, die Waffen stehen als drehende Münzen von Anfang
> an da. Siehe den [zweiten Nachtrag](#zweiter-nachtrag-zum-short-waffen-als-drehende-münzen-22112026).

- Am Start liegt **keine Waffe** mehr auf der Karte. Die vier Waffen fallen, wenn alle Roboter aus den Kisten sind:
  die erste 0,8 s nach dem letzten Ausbruch, dann alle 0,4 s eine. Die Reihenfolge kommt aus einem eigenen
  Seed-Zufallsstrom. Bei Seed 84 landen sie bei 3,7 / 4,1 / 4,5 / 4,9 s.
- **Der Fall dauert 0,45 s:** Ein Schatten wächst am Zielpunkt, die Marke kommt von oben und wird kleiner, bei der
  Landung gibt es einen kleinen Staubring. Solange die Waffe fällt, kann sie niemand aufnehmen.
- Auch der Nachschub der zwei Stationen fällt so, zum ersten Mal erst nach den vier Waffen.
- Alle Roboter starten weiter mit einem Blaster (9 Schuss). Die ersten Magazine sind nach rund 7,5 s leer; die
  Waffen liegen also rechtzeitig da.
- **Ton:** Bei der Landung spielt der vorhandene leise Klang „Waffenabwurf“ (kein neuer Regler).
- **Technik:** Der Nachschubplan (`supply`) ist Teil des Rundenzustands. Eine fallende Waffe hat ein negatives
  Alter; der Renderer liest nur dieses Alter und hält keinen eigenen Zustand (Seek-Regel).

### Bretter der Startkisten

Die Bretter fliegen wie bisher 0,45 s, bleiben bis 1,0 s liegen und blenden bis 1,8 s aus. Danach ist der Boden
frei. Splitter und Trümmer aus dem Kampf bleiben wie bisher liegen.

### Casting neu gerechnet

Weil sich der Ablauf des Shorts geändert hat, gilt die alte Seed-Liste nicht mehr. Das Casting hat eine sechste
Bedingung: **kein Hänger ab 1,5 s**.

| Messung (Seeds 1–1200, Chromium 148) | Wert | vorher |
|---|---|---|
| erster K.o. 5–10 s | 89,4 %, Median 8,0 s | 89,3 %, 8,0 s |
| zweiter K.o. 12–20 s | 69,3 %, Median 15,2 s | 59,5 %, 13,1 s |
| Schlussduell mindestens 6 s | 62,5 %, Median 10,3 s | 62,1 %, 8,6 s |
| beide beim Duellstart unter 40 % Leben | 38,4 % | 36,3 % |
| Länge 26–38 s | 23,2 %, Median 32,1 s | 35,8 %, 25,8 s |
| kein Hänger ab 1,5 s | 98,8 % | nicht gemessen |
| Bogen vollständig | 36 Seeds (3,0 %) | 32 Seeds |
| davon gewinnt nicht der zuerst Bewaffnete | **29 Seeds** (neue Liste `SHORT_SEEDS`) | 23 Seeds |

Siege über 1200 Seeds: EMBER 283, AZURE 335, AMBER 316, MOSS 264, zwei Runden ohne Sieger.

Die Vorlage nimmt für Seed 42 jetzt **Seed 84** (vorher 61): erster K.o. 8,5 s (AZURE), zweiter 14,9 s (AMBER),
Sieg nach 24,0 s, Schlussduell 9,1 s mit 23 % und 16 % Leben, EMBER gewinnt mit 5 % Rest, längster Hänger 1,0 s.
Videolänge **26,5 s**.

### Neue 20-Sekunden-Probe

Lokal, nicht im Repository: `output/scrap-short/scrap-short-probe-20s-v2.mp4` in der Arbeitskopie `scrap-s1`
(derselbe Befehl wie bei S3). Dazu die Vorschaubilder `seed84-blatt.jpg` und `seed84-nachschub.jpg`.

| Messung | Wert |
|---|---|
| Bild | 1080 × 1920, 30 Bilder je Sekunde, 600 Bilder, 5,2 MB |
| Ton der ganzen Episode | 186 Ereignisse, 67 hörbar; −22,2 LUFS (vorher −20,8), Spitze −6 dBFS, Begrenzer bis −3,5 dB |
| Exportzeit | 30 s |

| Prüfung | Ergebnis |
|---|---|
| `node --test test/scrap-v4.test.mjs` | 9 von 9, neu: Deckung im Short (höchstens 3 von 30 Seeds mit Hänger, kein Roboter länger als erlaubt in Deckung) und Nachschub (keine Waffe am Start, Landezeiten, im Fall nicht aufnehmbar, ohne Short unverändert) |
| `node --test test/scrap-short.test.mjs` | 6 von 6, neu: Bretter blenden aus, Waffen fallen sichtbar; Seek-Bild an zehn Stellen pixelgleich (neu: Bretter beim Ausblenden, Waffe im Fall und kurz nach der Landung); alle 29 Casting-Seeds halten den Bogen |
| `node --test` mit `scrap`, `scrap-optics`, `audio-scrap-soft`, `presets`, `presets-export-scrap`, `scrap-long` | alle bestanden (zusammen mit den beiden Dateien oben 52 Tests) |
| `node scripts/scrap-map-hashes.mjs` | 6 Fälle × 4 Prüfpunkte gleich |
| `npm run golden` (einmal) | 36 Fälle × 2 Prüfpunkte identisch mit der Referenz |

**Nicht gelaufen:** kein vollständiger `npm test`, kein Export über 20 s.

**Grenzen:**

- Einzelne Roboter stehen weiterhin kurz, wenn sie von ihrem Platz aus schießen; das ist kein Hänger. Dass alle
  stehen und niemand schießt, kommt bei den geprüften Seeds höchstens 1,0 s lang vor.
- Die Shorts sind im Mittel länger geworden (32 s statt 26 s) und streuen stärker; nur 23 % aller Seeds liegen bei
  26–38 s. Das Casting wählt deshalb strenger aus.
- Seed 84 ist mit 26,5 s am unteren Rand. Längere geprüfte Seeds stehen in der Liste, zum Beispiel 349 (29,2 s)
  oder 983 (32,1 s).
- Die ältere Probe (`scrap-short-probe-20s.mp4`, Seed 61) zeigt den Stand vor diesem Nachtrag.
- Im Langvideo (Turnier, normales Bild) liegen die Waffen weiter von Anfang an da, die Bretter bleiben liegen und
  die Deckung dauert 3 s. Ob das dort auch geändert werden soll, ist eine Frage an den Nutzer.

---

## Zweiter Nachtrag zum Short: Waffen als drehende Münzen (22.11.2026)

> **Teilweise überholt am selben Tag:** Die vier freien Startwaffen und die Blitz-Münzen gibt es im Short nicht
> mehr, siehe den [dritten Nachtrag](#dritter-nachtrag-zum-short-raketen-als-einziges-item-22112026). Die Münze
> selbst (Drehung, Aufwachsen) ist geblieben.

**Rückmeldung des Nutzers zur zweiten Probe:** Erst fallen die Kisten, dann ein Haufen Waffen; das ist für den
Zuschauer schlecht lesbar. Die Waffen sollen nicht auch noch fallen, sondern von Anfang an da sein, wie drehende
Münzen.

### Umsetzung

- **Der Abwurf vom Himmel ist ausgebaut.** Die vier Waffen liegen im Short wieder ab dem ersten Bild auf der Karte,
  die zwei Stationen liefern wie ohne Short (zum ersten Mal nach 3 s und 5 s). Der Nachschubplan (`supply`), die
  fallenden Waffen und das Ereignis bei der Landung gibt es nicht mehr.
- **Geladene Waffen sind im Short drehende Münzen:** eine aufrechte Scheibe mit dem Waffensymbol, farbigem Ring
  (Rakete orange, Blitz blau) und dunklem Rand. Sie dreht sich um die Hochachse, eine Umdrehung in 1,8 s, alle im
  Gleichtakt; von der Seite sieht man kurz nur den Rand. Beide Seiten zeigen dasselbe Symbol. Radius 19 statt
  16,5 AE.
- **Neue Waffen an den Stationen** wachsen in 0,3 s auf (mit leichtem Überschwingen), statt zu fallen.
- **Leere, abgelegte Waffen** bleiben die flache, blasse Marke; sie drehen sich nicht.
- Außerhalb des Shorts bleiben die flachen Marken, wie sie waren.
- **Technik:** Drehung und Schweben hängen nur an der Rundenzeit, das Aufwachsen am Alter der Waffe in der
  Simulation. Der Renderer hält keinen eigenen Zustand (Seek-Regel).
- Kurze Deckung (0,5 s), Schaden ×0,55 nach dem ersten K.o. und ausblendende Bretter aus dem ersten Nachtrag
  bleiben.

### Casting

Neu gerechnet, weil die Waffen wieder früher da sind. **Die Liste der 29 geprüften Seeds ist dieselbe geblieben**,
die Vorlage bleibt auf **Seed 84** (26,5 s, K.o. bei 8,5 / 14,9 / 24,0 s, EMBER gewinnt). Alle Roboter starten mit
einem Blaster und holen neue Waffen erst später; deshalb ändern sich nur wenige Runden.

| Messung (Seeds 1–1200, Chromium 148) | Wert | mit Abwurf |
|---|---|---|
| erster K.o. 5–10 s | 89,4 %, Median 8,0 s | 89,4 %, 8,0 s |
| zweiter K.o. 12–20 s | 69,3 %, Median 15,1 s | 69,3 %, 15,2 s |
| Schlussduell mindestens 6 s | 62,1 %, Median 10,3 s | 62,5 %, 10,3 s |
| beide beim Duellstart unter 40 % Leben | 38,3 % | 38,4 % |
| Länge 26–38 s | 22,9 %, Median 31,9 s | 23,2 %, 32,1 s |
| kein Hänger ab 1,5 s | 98,7 % | 98,8 % |
| Bogen vollständig | 36 Seeds (3,0 %) | 36 Seeds |
| davon gewinnt nicht der zuerst Bewaffnete | 29 Seeds (Liste unverändert) | 29 Seeds |

Siege über 1200 Seeds: EMBER 283, AZURE 329, AMBER 314, MOSS 272, zwei Runden ohne Sieger.

### Neue 20-Sekunden-Probe

Lokal, nicht im Repository: `output/scrap-short/scrap-short-probe-20s-v3.mp4` in der Arbeitskopie `scrap-s1`
(Befehl wie bei S3, mit `--clip-start 0 --clip-duration 20`). Dazu `probe-20s-v3-bilder.jpg` (fünf Bilder).

| Messung | Wert |
|---|---|
| Bild | 1080 × 1920, 30 Bilder je Sekunde, 600 Bilder, 5,7 MB |
| Ton der ganzen Episode | 175 Ereignisse, 67 hörbar; −21,9 LUFS, Spitze −6 dBFS, Begrenzer bis −4,1 dB |

| Prüfung | Ergebnis |
|---|---|
| `node --test test/scrap-v4.test.mjs` | 9 von 9; der Test zum Nachschub ist ersetzt: vier Waffen ab dem Start, Stationen bei 3 s und 5 s, nichts fällt |
| `node --test test/scrap-short.test.mjs` | 6 von 6; Seek-Bild an zehn Stellen pixelgleich (neu: Münze fast von der Seite, neue Münze beim Aufwachsen); jede Waffe wird im Short als Münze gezeichnet, ohne Short keine; alle 29 Casting-Seeds halten den Bogen |
| `node --test` mit `scrap`, `scrap-optics`, `audio-scrap-soft`, `presets`, `presets-export-scrap`, `scrap-long` | alle bestanden (zusammen mit den beiden Dateien oben 52 Tests) |
| `node scripts/scrap-map-hashes.mjs` | 6 Fälle × 4 Prüfpunkte gleich |
| `npm run golden` (einmal) | 36 Fälle × 2 Prüfpunkte identisch mit der Referenz |

**Nicht gelaufen:** kein vollständiger `npm test`.

**Fehler beim Export, offen gesagt:** Der erste Aufruf für die Probe nutzte `--duration 20` statt
`--clip-duration 20`. Die Vorlage bestimmt ihre Länge selbst, deshalb entstand das ganze Short (26,5 s), ohne
Auftrag. Die Datei wurde sofort gelöscht; die Probe ist danach mit dem richtigen Befehl entstanden. Der Lauf davor
hat einen Zeichenfehler gezeigt (Radius knapp unter null im ersten Bild einer neuen Münze); er ist behoben.

**Grenzen:**

- Für etwa ein Siebtel jeder Umdrehung steht die Münze fast von der Seite, das Symbol ist dann kurz nicht zu lesen.
- Eine Rakete liegt am Anfang hinter der zweiten Zeile des Einstiegstexts (wie vor dem ersten Nachtrag).
- Farben, Größe und Drehtempo der Münzen sind Startwerte; das Urteil liegt beim Nutzer.
- Die Proben `scrap-short-probe-20s.mp4` (Seed 61) und `…-v2.mp4` (Abwurf vom Himmel) zeigen ältere Stände.
- Im Langvideo (Turnier, normales Bild) bleiben die flachen Marken, liegende Bretter und 3 s Deckung.

---

## Dritter Nachtrag zum Short: Raketen als einziges Item (22.11.2026)

**Rückmeldung des Nutzers zur dritten Probe:** nicht schlecht, aber für ein Short fast zu viele Items. Und warum
haben zwei Items eine Plattform und die anderen nicht? Nach einer Vorschau (Bilder, Messwerte, 20-Sekunden-Probe)
hat der Nutzer den Umbau freigegeben („so ist es viel besser“).

### Was vorher nicht stimmte (200 Runden, Node)

| Messung | Wert |
|---|---|
| geladene Waffen gleichzeitig am Boden | im Mittel 4,6, in der Spitze 7 |
| erste Aufnahme einer Waffe | nach 9,8 s (Median); bis dahin drehen sich die Münzen unbenutzt |
| Startwaffen, die bis zum Ende unberührt liegen | 0,8 von 4 |
| Zeit ohne Waffe je lebendem Roboter | 12 % |

Dazu kamen zwei Regeln für dieselbe Sache: vier freie Startwaffen und zwei Plattformen mit Nachschub, ein Erbe der
großen Arena. Und wer eine Blitz-Münze holte, bekam die Waffe, die er schon hatte.

### Neue Regeln (nur im Short)

- **Der Blaster ist die Grundwaffe und lädt von selbst nach:** Nach dem neunten Schuss ist er 1,4 s gesperrt, dann
  wieder voll. Niemand ist je unbewaffnet, leere Waffen fallen nicht mehr zu Boden (auch nicht beim K.o.).
- **Die Rakete ist das einzige Item und kommt nur von den zwei Plattformen.** Die erste erscheint nach 6 s, die
  zweite nach 7,5 s; vorher füllt sich der Ring der Plattform. Eine Plattform lädt erst wieder, wenn ihre Rakete
  geholt ist, dann 9 s lang. Es liegen also höchstens zwei Münzen auf der Karte.
- **Holen:** Wer nur den Blaster hat, fährt zu einer geladenen (oder in 1,2 s fertigen) Plattform, wenn der Weg
  höchstens 320 AE lang ist und kein anderer Holer näher dran ist. Der Blaster wird gegen drei Raketen getauscht;
  danach ist nach 0,5 s wieder der volle Blaster da.
- **Schaden:** ×2,5, solange alle vier leben, zu dritt ×0,5 (vorher ×0,55), im Schlussduell ×0,9 (vorher ×0,55);
  der Schwächere im Duell nimmt weiter 20 % weniger.
- **Fairness:** Ambers Vorliebe für Raketen gilt im Short nicht. Mit ihr gewann Amber 360 von 1200 Shorts, Moss
  nur 248.
- **Technik:** Die Regeln hängen an der Short-Karte (`SHORT_ITEMS` in `tactics.js`). Das Ereignis `pickup` meldet
  jetzt den Wechsel der Waffe; ohne Short ist das dasselbe wie bisher. `classic` bis `v4` ohne Short rechnen
  unverändert.

### Darstellung (nur im Short)

- **Aufnahme:** Ring in Teamfarbe um den Roboter und eine aufsteigende Münze, 0,7 s.
- **Abzeichen:** Wer Raketen trägt, hat die Raketen-Münze links an seinem Namensschild.
- **Nachladen:** Die Magazinpunkte unter dem Roboter füllen sich während der 1,4 s wieder.
- **Startkisten:** Deckel ganz in Teamfarbe mit hellem Rahmen, Seitenwände und Bretter ebenfalls in Teamfarbe. So
  sehen sie nicht mehr wie die Holz-Deckung aus.
- Alles folgt aus Rundenzeit, Ereignisalter und Roboterzustand; der Renderer hält keinen eigenen Zustand.

### Balance gemessen (je 150 Runden, Node, Rundenzeit)

| Einstellung | erster K.o. | zweiter K.o. | Ende | Schlussduell | beide unter 40 % | Raketen je Short |
|---|---|---|---|---|---|---|
| erste Rakete 3 / 4,5 s, Schaden ×0,55 | 7,2 s | 15,7 s | 30,2 s | 12,8 s | 6 % | 6,0 |
| erste Rakete 6 / 7,5 s, ×0,55 | 8,3 s | 13,1 s | 29,9 s | 13,7 s | 19 % | 5,3 |
| erste Rakete 6 / 7,5 s, ×0,7 | 8,3 s | 12,5 s | 26,6 s | 12,1 s | 19 % | 4,6 |
| **erste Rakete 6 / 7,5 s, zu dritt ×0,5, Duell ×0,9 (gewählt)** | 8,3 s | 13,2 s | 25,8 s | 10,1 s | 19 % | 4,4 |
| ohne Holen (Raketen nur im Vorbeifahren) | 8,0 s | 14,6 s | 31,0 s | 11,6 s | 41 % | 1,8 |

Kommen die Raketen schon nach 3 s, trifft es in der Eröffnung (Schaden ×2,5) früh einen einzelnen Roboter hart;
die anderen bleiben fast unverletzt, und das Schlussduell beginnt ungleich. Mit 6 s gehört die Eröffnung dem
Blaster, die Raketen kommen zum ersten K.o.

### Casting

| Messung (Seeds 1–2400, Chromium 148) | Wert | vorher (Seeds 1–1200) |
|---|---|---|
| erster K.o. 5–10 s | 88,4 %, Median 8,1 s | 89,4 %, 8,0 s |
| zweiter K.o. 12–20 s | 57,9 %, Median 14,0–14,3 s | 69,3 %, 15,1 s |
| Schlussduell mindestens 6 s | 67,0 %, Median 9,3–10,0 s | 62,1 %, 10,3 s |
| beide beim Duellstart unter 40 % Leben | 19,4 % | 38,3 % |
| Länge 26–38 s | 59,0 %, Median 28,2–28,7 s | 22,9 %, 31,9 s |
| kein Hänger ab 1,5 s | 98,4 % | 98,7 % |
| Bogen vollständig | 17 Seeds (0,7 %) | 36 Seeds (3,0 %) |
| davon gewinnt nicht, wer die erste Rakete holt | **11 Seeds** (neue Liste `SHORT_SEEDS`) | 29 Seeds |

Siege über 2400 Seeds: EMBER 616, AZURE 650, AMBER 623, MOSS 510, eine Runde ohne Sieger.

| Seed | 1. K.o. | 2. K.o. | Sieg | Duell | Leben im Duell | Länge | Sieger (Rest) |
|---|---|---|---|---|---|---|---|
| 318 (Vorlage) | 7,8 s | 19,6 s | 30,4 s | 10,8 s | 38 % / 37 % | 32,9 s | MOSS (24 %) |
| **1601 (Empfehlung)** | 8,5 s | 16,0 s | 29,6 s | 13,6 s | 16 % / 35 % | 32,1 s | AZURE (1 %) |
| 2261 | 8,8 s | 15,9 s | 24,0 s | 8,0 s | 16 % / 16 % | 26,5 s | AZURE (1 %) |
| 2216 | 10,0 s | 18,1 s | 30,8 s | 12,6 s | 21 % / 23 % | 33,3 s | EMBER (14 %) |

Die Vorlage nimmt wie bisher den nächsten geprüften Seed ab 42, das ist jetzt **318**. Am knappsten endet
**Seed 1601** (AZURE gewinnt mit 1 % Rest); für den Export genügt `--seed 1601`.

### Vorschau und Probe

Lokal, nicht im Repository, in `output/scrap-short/` der Arbeitskopie `scrap-s1`:

- `scrap-short-probe-20s-v5-seed1601.mp4`: 20-Sekunden-Probe des endgültigen Stands (Seed 1601), 1080 × 1920,
  600 Bilder, 5,3 MB; Ton der ganzen Episode 152 Ereignisse, −21,8 LUFS, Spitze −6 dBFS, Begrenzer bis −5,3 dB.
- `scrap-short-probe-20s-v4-raketen.mp4`, `seed946-raketen-blatt.jpg`, `seed946-raketen-8s.png`: die Vorschau, die
  der Nutzer gesehen hat (Seed 946, noch mit Ambers Raketen-Vorliebe). Seed 946 steht nicht mehr in der Liste.

| Prüfung | Ergebnis |
|---|---|
| `node --test test/scrap-v4.test.mjs` | 9 von 9; der Waffen-Test ist neu: nie unbewaffnet, nur Raketen an den Plattformen, Plattform lädt erst nach der Aufnahme, Nachladen und Wechsel zurück zum Blaster, kein Abwurf; Balance-Test mit ×0,5 und ×0,9 |
| `node --test test/scrap-short.test.mjs` | 6 von 6; Seek-Bild an elf Stellen pixelgleich (neu: Kisten in Teamfarbe, Ring und Abzeichen kurz nach der Aufnahme); alle 11 Casting-Seeds halten den Bogen |
| `node --test` mit `scrap`, `scrap-optics`, `audio-scrap-soft`, `presets`, `presets-export-scrap`, `scrap-long` | alle bestanden (zusammen mit den beiden Dateien oben 52 Tests) |
| `node scripts/scrap-map-hashes.mjs` | 6 Fälle × 4 Prüfpunkte gleich |
| `npm run golden` (einmal) | 36 Fälle × 2 Prüfpunkte identisch mit der Referenz |

**Nicht gelaufen:** kein vollständiger `npm test`, kein Export über 20 s.

**Grenzen:**

- **Wenige Seeds:** 11 von 2400. Hauptgrund ist die Bedingung „beide beim Duellstart unter 40 % Leben“ (19 % statt
  38 %), weil Raketen einzelne Roboter schnell herausnehmen.
- **Moss gewinnt seltener** als die anderen (510 von 2400, die anderen 616 bis 650). Nicht ausgeglichen.
- Das Nachladen sieht man nur an den Magazinpunkten; einen eigenen Klang gibt es nicht.
- **Langvideo:** Das Turnier (normales Bild) hat weiter vier Startwaffen, Blitz-Münzen als flache Marken, braune
  Startkisten, liegende Bretter und 3 s Deckung. Die neuen Regeln hängen an der Short-Karte.
