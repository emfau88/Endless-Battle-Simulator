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
  mit dunklem Rand, blendet 0,2 s ein und 0,3 s aus. Die Zeit folgt aus dem Episodenschritt.
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

`node scripts/scrap-short-casting.mjs --from 1 --to 1200 --list` rechnet **in Chromium**, also dort, wo auch der
Export rechnet. Bedingungen in Videosekunden: erster K.o. 5–10 s, zweiter 12–20 s, Schlussduell mindestens 6 s,
beide Duellanten beim Start des Duells unter 40 % Leben, Länge 26–38 s. Bevorzugt gewinnt nicht der Roboter, der
zuerst bewaffnet war.

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
