# Scrap Wars: Ausbau-Plan – Ton, Startkisten, Taktik, Effekte, Short

**Stand:** 19.11.2026, nur Plan, kein Code geändert. Basis `main` an `e5f44d3`. **Roadmap:** R40.
Verfasst als Umsetzungsauftrag, auch für Codex. **Bezug:** [Optik-Plan](SCRAP_OPTIK_PLAN_2026-11-14.md) mit
P1–P5, [Geometrie M2/M3](SCRAP_GEOMETRIE_2026-11-15.md), [Leitlinien für Shorts](SHORTS_LEITLINIEN.md),
[Territory-Short](TERRITORY_SHORT_2026-11-16.md) als Vorbild für Short-Regie und leise Mischung.

**Auftrag des Nutzers (19.11.):** Die Klänge sind „furchtbar“. Die Routenfindung wirkt nicht optimal. Im Querformat
gehen sofort die Nachbarn aufeinander los; mehr Zufall, etwa durch „Boxen“, aus denen die Roboter ausbrechen.
Treffer- und Schusseffekte sind nicht hochwertig genug. Die Vorschläge dazu sollen als Umsetzungsplan festgehalten
werden.

**Kurz:** Vier Gruppen von Paketen in dieser Reihenfolge: **T** Ton, **E** Effekte (nur Darstellung), **K** neue
Regelversion `v4` (Startkisten, Zielwahl, Wegfindung, Fahren, Kampf) und **S** Short. Wo Zahlen stehen, sind es
Startwerte. Abweichen ist erlaubt, wenn Messung oder Vorher/Nachher-Bild es klar besser zeigen; die Richtung bleibt.

Einheit „AE“ = Arena-Einheit der V3-Welt (1040 × 540). Bei 1080p quer ist 1 AE ≈ 1,76 Pixel.

**Ist-Stand ansehen:** [hochkant Start und 15 s, quer 15 s](reference/scrap-ausbau-ist-2026-11-19.jpg)
(Sunny Yard, Seed 42, Produktionsvorlagen, aktueller `main`).

---

## 0 · Leitplanken (nicht verhandelbar)

**Technik**

1. **Archivquellen bleiben bytegleich:** `src/scenarios/scrap/simulation.js`, `src/scenarios/scrap/renderer.js`,
   `docs/reference/scrap-arena.source.html` (bestehender Test). Neues kommt als Override oder neue Datei.
2. **`classic`, `v2` und `v3` bleiben bit-gleich.** Alle Änderungen am Ablauf leben in der neuen Regelversion
   `v4`. Prüfung: `node scripts/scrap-map-hashes.mjs`, die Scrap-Testdateien und einmal `npm run golden`
   bestehen unverändert. Referenzen nie neu schreiben.
3. **T und E ändern die Simulation nicht.** Zustands- und Ereignis-Hashes aller Seeds bleiben gleich.
4. **Wiederholbarkeit des Tons:** Gespeicherte Konfigurationen ohne den neuen Ton-Schalter klingen wie bisher.
   Oberfläche und Vorlagen setzen den neuen Ton ausdrücklich.
5. **Seek-Regel und Seed-Zufall:** Der Renderer baut keinen Zustand über Bilder hinweg auf. Alles Dauerhafte
   (Splitter am Boden, Rauch nach K.o., Einschusslöcher) wird aus Simulationszustand und Ereignisprotokoll
   (`episode.events`, mit `step`) berechnet, Abwechslung nur über `noise(seed, i)`. Kein `Math.random`, kein `Date.now`.
6. **Renderzeit:** höchstens 15 % mehr als heute (Bezug: 22,1 ms je Bild, 1080p, Messmethode aus
   [P4/P5](SCRAP_OPTIK_P4_P5_2026-11-15.md#renderzeit)). Die Simulation in `v4` darf je Sekunde Video höchstens
   30 % länger rechnen als `v3`.

**Gestaltung**

7. **Texte im Video englisch.** Bedienung und Doku deutsch.
8. **Vom Nutzer abgelehnt, nicht wieder einführen:** Kamerafahrt, Zoom, Wackeln oder Screenshake (auch nicht bei
   Explosionen), Maschinenwracks oder Schrott als Deko, Smileys und Regenbögen, kleinere Arena im Querformat,
   klirrende helle Aufprallklänge, Einmessung auf −14 LUFS.
9. **Bleibt so:** vier Roboter-Silhouetten und Teamfarben, Blockgrafiken Holz/Stein/Beton, Sunny-Yard-Boden,
   Stationen, Schilder mit Lebensbalken, feste Gesamtansicht.

**Ablauf**

10. Ein Paket = ein Commit. Bericht unter `docs/SCRAP_AUSBAU_<Datum>.md` mit Messwerten und Grenzen.
    ROADMAP, CHANGELOG und Gesamtplan Abschnitt 0 im selben Pull Request nachziehen.
11. **Kein Export über 20 Sekunden ohne Auftrag.** Reine Simulationsläufe sind frei.
12. **Echte Stopps nur drei:** Hörprobe (T1), Vorschaubilder der Effekte (E0) und Testclip v4 (K5). Alle anderen
    Geschmacksfragen werden mit Empfehlung entschieden und am Ende gesammelt (Abschnitt 8).

---

## 1 · Befund (gemessen am 19.11.2026)

| Bereich | Ist | Folge |
|---|---|---|
| Ton | Fast alles im Code erzeugt (`lib/audio.mjs`, `synth:scrap-*`): Blaster = Dreieckston von 650 auf 260 Hz („Piu“), Rakete und Explosion = tiefe Sinustöne mit Rauschen, Treffer = Kenney-Metall. Kein Grundgeräusch, kein Motor. 20 s hochkant: 229 Tonereignisse, 166 hörbare Klänge (8 je Sekunde), auf −14 LUFS eingemessen, Begrenzer bis −10,9 dB. | Retro-Spielklang, dicht und gepresst; zwischen den Schüssen Stille. |
| Wegfindung | Keine echte. Ein Roboter prüft nur 76 AE geradeaus und weicht dem *einen* Block davor über eine Ecke aus (`_steer`). Bei Berührung prallt er ab (Faktor 1,65, `_reflect`) und fährt nie langsamer als 55 %. | Eiern und Abprallen an Deckungen, kein Anhalten. |
| Zielwahl | Immer der nächste Gegner (±6 % Seed-Zufall), geschossen wird auch durch Wände. Quer liegen die Starts oben/unten 372 AE auseinander, links/rechts 660 AE. | 40 Seeds, quer, erste 15 s: **78 % aller Treffer** auf Amber–Azure (39 %) und Ember–Moss (39 %). Der Seed ändert daran fast nichts. |
| Tempo | Blaster 3 Schaden bei 125 Leben, also 42 Treffer bis zum K.o. | 30 Seeds hochkant: erster K.o. im Median nach 26 s (16 bis 42 s); Rundenende nach 34 bis 56 s, ein Seed über 60 s. |
| Effekte | Treffer = weißer Punkt und 6 Funken für 0,3 s; Blaster = dünner Strich; Explosion = runder Verlauf mit Ring. Alles „aufhellend“ (`screen`) gezeichnet. Chassis-Richtung folgt der Geschwindigkeit und springt beim Abprallen. | Auf dem hellen Sunny-Boden kaum sichtbar; nichts bleibt liegen außer Brandflecken. |
| Anzeige | Sunny-Kopfzeile zeigt „HOLZ · STEIN · BETON“ und Kürzel „BLST“, „RKT“. | Verstößt gegen „Texte englisch“, am Handy unlesbar. |

---

## 2 · Ton (T)

### Stilbibel Ton

**Richtung „Spielzeug-Roboter in einer Halle“:** rund, wuchtig, gedämpft. Kein Retro-Piepsen, kein Klirren, kein
Militär-Realismus. Maßstab sind die freigegebenen Marble-Works-Klänge und die abgenommene Cloud-Wars-Mischung.

| Ereignis | Soll-Klang | Startwerte |
|---|---|---|
| `blaster` | gedämpfter Plasma-Puff („thup“), kein Pfeifen | 80–150 ms, Grundton unter 300 Hz plus leiser Luftanteil; 3–4 Varianten; je Roboter feste Tonlage (Ember −2, Azure +2, Amber 0, Moss −1 Halbton) |
| `rocket` | kurzes Fauchen beim Start | 0,3–0,5 s, ansteigend |
| `blast` | weiches „Bumpf“ mit nachrieselndem Geröll | Tiefton 60–90 Hz, kurzer Anschlag, 0,6–1,0 s Ausklang, keine Verzerrung |
| `hit` (Roboter) | dumpfer Blechschlag | Kenney `impactPunch_*`, `impactPlate_heavy_*`, 3–5 Halbtöne tiefer |
| `cover_hit` | je Material: Holz „tock“, Stein dumpfes Klacken, Beton Schlag mit Rieseln | vorhandene Materialaufteilung behalten |
| `break` | Holz splittert, Stein bricht, Beton sackt mit Staub zusammen | 0,3–0,6 s |
| `ko` | **Erkennungsklang:** tiefer Schlag, weich scheppernde Blechteile, kurzes „Strom aus“ (Ton fällt eine Oktave in 0,4 s) | lautester Einzelklang der Runde |
| `pickup` | mechanisches Einrasten („klack-tschk“) statt Sinus-Piep | 0,15 s |
| `drop` | Blech auf Boden, leise | – |
| `round_start` | drei leise Pieptöne, beim Ausbruch Holzkrachen (K1) | – |
| `round_end` | kurze weiche Siegerfanfare oder Glockenton | ≤ 1,2 s |
| `drive` (nur v4) | kurzes Kettenrasseln beim Anfahren | sehr leise |
| Grundgeräusch | dunkle Karten: Hallenbrummen und ferne Lüftung; Sunny Yard: leiser Wind | Schleife über `background` wie bei Naval, ohne hörbaren Übergang |

**Klangbau:** jeder Klang in drei Schichten (Anschlag, Körper, Ausklang), 3–4 Varianten, ±1 Halbton Zufall aus
`rand01(seq)`. Ein kurzer gemeinsamer Raumhall (unter 0,4 s) darf eingerechnet werden.

**Mischung:** Profil `marbleworks-soft-v1` mit eigenem Mischplan wie `shortMixPlan` in
`src/scenarios/territory.js` (Hooks `audioForParams`, `createAudioMixPlan`). Fester Pegel, `ceilingDb: -6`,
Ziel **−21 bis −23 LUFS**, der Begrenzer greift im Normalfall nicht ein.

- Rangfolge: `ko` > `round_end` > `blast` > `break` > `hit` > `rocket` > `blaster` > `cover_hit` > Rest.
- Dichte: höchstens 2 Klänge je 0,5 s, außer `ko`, `round_end`, `blast`. Blaster höchstens 4 je Sekunde gesamt,
  je Roboter mindestens 0,18 s Abstand.
- Nach `blast` oder `ko` 0,3 s lang Blaster und Treffer −6 dB (im Plan über `gain`).
- Stereo ±0,35 aus der Bildposition.
- Neuer Schalter `soundMix`: `soft-v1` (neu) und `classic` (bisher). Fehlt er, gilt `classic` (Leitplanke 4).

**Quellen:**

1. Lokal vorhanden: Kenney Impact Sounds (CC0), vor allem `impactPunch`, `impactSoft_heavy`, `impactPlate_heavy`,
   `impactMetal_medium/heavy`, `impactMining`, `impactWood_heavy`, dazu `mw-soft-*` aus `assets/audio/`.
2. Kenney „Sci-Fi Sounds“ (CC0; Laser, Explosionen, Triebwerke): **Download nur nach Freigabe des Nutzers**, Lizenz
   im Paket prüfen.
3. Verbesserte eigene Synthese in Schichten, wo kein Sample passt.

Nur Dateien ohne Namensnennungs- oder Weitergabe-Pflicht, weil das Repository öffentlich ist. Verwendete Dateien
nach `assets/audio/` mit Eintrag in `assets/audio/README.md`.

### T1 · Hörprobe (Stopp)

- Drei Richtungen bauen, jeweils als eigene Tabelle:
  - **A „Weich-Comic“:** nah an Marble Works, `impactPunch`/`impactSoft`, weiche Puffs.
  - **B „Sci-Fi-Spielzeug“:** Plasma-Puffs, Fauchen, runde Explosionen aus dem Sci-Fi-Paket.
  - **C „Mechanisch“:** Blech, Kettenrasseln, dumpfe Explosionen.
- Jeweils derselbe Clip, Sunny Yard quer, Seed 42, Sekunde 15 bis 30 (zwei K.o. bei 19,1 s und 27,4 s), mit
  `--clip-start 15 --clip-duration 15`. Dazu die heutige Mischung als Vergleich. Ablage lokal unter
  `output/scrap-hoerprobe/`.
- Je Clip Messwerte nennen: LUFS, Spitze, Eingriff des Begrenzers, hörbare Klänge je Sekunde.
- **Der Nutzer wählt die Richtung.** Mischformen sind erlaubt („Explosion aus B, Rest aus A“).

### T2 · Ton umsetzen

- Gewählte Richtung als `soft-v1`, Mischplan, Grundgeräusch, Schalter `soundMix`, Regler-Beschriftungen deutsch.
- Prüfung: Audio-Test für Scrap mit festen Erwartungen (Profil, Dichte, Rangfolge), Exportprüfung True Peak,
  20-Sekunden-Probe in beiden Formaten.

---

## 3 · Effekte (E, nur Darstellung)

### Stilbibel Effekte

- **Auf hellem und dunklem Boden lesbar.** Helle Karten (Sunny Yard): feste Farben mit dunkler Kontur
  (1,5–2 AE, `#0a1218`, 60 %) und Kontaktschatten; Leuchten nur als Zusatz mit höchstens 30 % Deckkraft. Dunkle Karten:
  zusätzlich Leuchten wie bisher.
- **Teamfarbe zeigt, wer schießt:** Mündungsfeuer und Blaster-Geschoss tragen die Farbe des Schützen.
- Licht von oben links, Schatten nach unten rechts, Versatz (+5, +8) AE, wie in der bestehenden Stilbibel.
- Dauer: Treffer höchstens 0,35 s, Feuerball höchstens 0,3 s, Rauch 2–3 s. Kein Vollbild-Blitz, kein Bloom,
  kein Wackeln.
- Deckelung: höchstens 40 liegende Splitter und Trümmer je Runde (die neuesten), höchstens 6 Rauchsäulen.

### E0 · Sofortkorrektur und Vorschau (Stopp)

- Legende englisch: „WOOD · STONE · CONCRETE“. Nur über eine Anzeigetabelle im Renderer; `materials.js` bleibt
  unverändert, damit kein Hash wandert.
- Sunny-Kopfzeile: Waffensymbol und Munitionszahl statt „BLST“ und „RKT“, wie auf den dunklen Karten.
- Danach **Vorschaubilder aus einer Kopie** (Projektregel): Schuss, Treffer am Roboter, Treffer an Holz, Stein und
  Beton, Explosion in drei Phasen, K.o. Jeweils Sunny Yard und Scrapyard, vorher/nachher, als Vergleichsblatt unter
  `docs/reference/`. Der Nutzer gibt den Stil frei, dann E1 bis E5.

### E1 · Schuss und Geschoss

- **Mündungsfeuer**, 0,1 s: vierzackiger Stern 14 × 8 AE, Kern `#fff4d6`, Rand Teamfarbe, Kontur. Ersetzt den
  heutigen Blitz in `_robot` (`flashUntil`).
- **Rückstoß:** Turm 6 AE zurück (heute bis 4 Pixel), Chassis 1,5 AE, beides über 0,12 s zurückfedernd.
- **Rauchwölkchen** an der Mündung: r 4 → 10 AE, `#9a9890`, 35 % → 0 in 0,5 s. Zeit aus dem Schuss-Ereignis.
- **Blaster-Geschoss:** Kapsel 18 × 6 AE, weißer Kern, Rand Teamfarbe, auf hellen Karten 1 AE dunkle Kontur;
  drei verblassende Nachzieher hinter dem Kopf (aus Richtung und Geschwindigkeit, nicht aus früheren Bildern).
- **Rakete:** Form bleibt; beim Start drei Rauchwolken, Rauchspur auf hellen Karten dunkler (`#6d6a62`).

### E2 · Treffer am Roboter

- Weißes Aufblitzen der Roboter-Silhouette 0,06 s (`source-atop`, 70 %).
- 6–8 Funken mit dunkler Kontur, fliegen 10–18 AE; 2–3 Blechsplitter in abgedunkelter Teamfarbe (−30 %), fliegen
  12–20 AE und bleiben bis Rundenende liegen (aus `hit`-Ereignissen, Deckel aus der Stilbibel).
- Kleiner Schubs in der Darstellung: 2 AE vom Treffer weg über 0,1 s, berechnet aus `hit`-Ereignis und Zeit.
- Die Schadensstufen aus P3 bleiben.

### E3 · Treffer an Deckung, je Material

| Material | Treffer | Bruch |
|---|---|---|
| Holz | 4–6 Splitter `#c98a46`/`#8a5a2b` mit Kontur, 12–24 AE, heller Staub | vorhandener Bruch, dazu 6 liegende Bretter |
| Stein | 4 Brocken `#768b9c`, grauer Staub `#b9bdb7` 40 % → 0 in 0,6 s | Brocken bleiben liegen |
| Beton | Staubwolke r 14 → 30 AE `#d8d2c4` 50 % → 0 in 0,6 s, 3 Brocken | große Staubwolke 1 s |

**Einschusslöcher:** höchstens 6 je Block, dunkle Punkte 2 AE mit hellem Rand. Das Ereignis `cover_hit` trägt heute
nur die Blockmitte. Die genaue Trefferstelle bekommt das Ereignis erst in `v4` (`hitX`, `hitY`); unter `v3` entfallen
die Löcher.

### E4 · Explosion in Stufen

| Stufe | Zeit | Startwerte |
|---|---|---|
| Blitz | 0–0,05 s | weiße Scheibe r 0,3·s |
| Feuerball | 0–0,3 s | 5–7 überlappende Kreise (`noise`-Versatz), `#ffd36b` → `#ff8a3d` → `#d9472b`, auf hellen Karten mit dunkler Kontur, Größe 0,3·s → 0,6·s |
| Staubring am Boden | 0–0,5 s | Ring `#cfc6b0`, 35 % → 0 |
| Trümmer | 0–0,5 s Flug | 6–10 Brocken mit Schatten, 30–60 AE weit, bleiben liegen |
| Rauch | 0,1–2,5 s | 6–8 Wolken `#3a3936`, 50 % → 0, steigen 25 AE, treiben 8 AE nach rechts |
| Brandfleck | bleibt | wie heute |

Rauch und Trümmer leben länger als der Effekt in der Simulation (0,8 s). Sie werden deshalb aus den `blast`-Ereignissen
der laufenden Runde berechnet, wie heute die Brandflecken.

### E5 · K.o.

- Der Turm löst sich, dreht sich 0,6 s lang, fliegt 30–50 AE und bleibt neben dem Wrack liegen.
- Das Wrack (P3) raucht bis Rundenende: drei Wölkchen je Sekunde, steigen 40 AE, `#3a3936` 35 %. Alles aus der
  Zeit seit dem `ko`-Ereignis.
- 12 Funken und die Explosion aus E4 in 1,25-facher Größe.

**Abnahme E:** Vergleichsblätter vorher/nachher; Seek-Bildvergleich über einen K.o. hinweg; Renderzeit gemessen;
Zustands- und Ereignis-Hashes unverändert.

---

## 4 · Regelversion v4 (K)

**Ort:** neue Datei `src/scenarios/scrap/tactics.js` mit `class TacticalRound extends EBS.ScrapMaterials.Round`,
geladen nach `materials.js` (in `index.html`, im Export und in den Skripten mit Dateiliste, z. B.
`scripts/scrap-map-hashes.mjs`). In `episode.js`: `normalizeParams` erlaubt `v4`, auch für Sunny Yard (dort heute
fest `v3`); `_startRound` nimmt `observe(TacticalRound)`; Zustandsversion `scrap-episode-v4`. In der Oberfläche heißt
die Auswahl „Taktik-Arena (v4, in Arbeit)“. Die Vorlagen wechseln erst nach K5 auf `v4`.

### K1 · Startkisten statt fester Ecken

- **Ablauf:** Von 0 bis 1,2 s wachsen vier Schatten an den Landepunkten (r 10 → 48 AE, 0 → 35 %). Bei 1,2 s schlagen
  Holzkisten (64 × 64 AE) auf, mit Staubring und Ton. Jede Kiste bricht zu ihrer eigenen Zeit auf:
  **1,6 s + Seed-Zufall 0 bis 2,4 s**, mindestens 0,4 s Abstand zwischen zwei Ausbrüchen. Holzsplitter wie bei E3.
- **Bis zum Ausbruch** ist eine Kiste ein Hindernis für Roboter und Geschosse, nimmt aber keinen Schaden. Danach
  verschwindet sie aus der Kollision.
- **Landepunkte:** Kandidaten auf einem 20-AE-Raster der freien Fläche: mindestens 60 AE zu Deckung und Wand,
  90 AE zu Waffen und Stationen. Der Seed zieht vier Punkte mit diesen Regeln:
  - paarweise mindestens 260 AE Abstand (hochkant 240 AE),
  - Fairness: Weg zur nächsten Waffe je Roboter zwischen 0,6- und 1,6-mal dem Median,
  - höchstens 200 Versuche, sonst die heutigen Startpunkte.
- Der Roboter fährt in Richtung Arenamitte heraus.
- Neue Ereignisse `crate_land` und `crate_break` (nur `v4`).
- Für Shorts ist das der Einstieg: Im ersten Bild fallen schon die Schatten.

### K2 · Zielwahl und Schusslinie

- **Ziel nach Punkten** statt nur Nähe, kleinster Wert gewinnt, bei jeder Denkpause neu (0,38–0,60 s wie heute):

  | Anteil | Startwert |
  |---|---|
  | Entfernung | Weglänge / 600 |
  | freie Sicht | −0,35 |
  | Gegner geschwächt | −0,25 · (1 − Leben/max) |
  | Rache (hat mich in den letzten 4 s getroffen) | −0,30 |
  | Treue zum aktuellen Ziel (mindestens 1,5 s) | −0,20 |
  | Seed-Rauschen je Denkpause | ±0,10 |

- **Schießen nur bei freier Linie** (Strecke gegen lebende Blöcke mit Geschossradius). Ausnahme: Ein Holzblock
  liegt in der Linie und das Ziel ist weniger als 300 AE entfernt; dann wird absichtlich durchgeschossen. Raketen
  dürfen auf Deckung neben dem Ziel gehen, wenn der Explosionsradius es erreicht (Abstand unter 0,8 · 106 AE).
- **Zielen sichtbar:** Der Turm dreht höchstens 5 rad/s. Geschossen wird erst, wenn der Turm weniger als 0,08 rad
  vom Vorhaltepunkt abweicht.
- **Kampftempo:** Blaster 6 statt 3 Schaden, Rakete direkt 30 statt 18. Startwerte für K5.

### K3 · Wegfindung

- Raster mit 16 AE (65 × 34 Zellen). Eine Zelle ist frei, wenn sie mindestens Roboterradius + 4 AE von jedem
  lebenden Block, jeder Kiste und der Wand entfernt ist. Neu berechnen nach `break` und `crate_break`.
- A* mit 8 Nachbarn, Diagonale √2, ohne Ecken zu schneiden. Gleichstand wird fest aufgelöst (erst f, dann h, dann
  Zellnummer), damit alles wiederholbar bleibt. Danach den Weg glätten (Abkürzung, sobald freie Sicht besteht).
- Neuer Weg nur, wenn das Ziel mehr als 40 AE gewandert ist oder 0,6 s vergangen sind. Wegpunkt erreicht unter 20 AE.
- Roboter untereinander: sanfte Abstoßung unter 70 AE.
- **Gleiten statt Abprallen:** An Wand und Block wird die Geschwindigkeit auf die Kante umgelenkt, 30 % Verlust.
  `_reflect` mit Faktor 1,65 entfällt in `v4`.
- Festgefahren (unter 6 AE in 1 s bei Ziel über 40 AE): 0,4 s zurücksetzen, neuen Weg suchen.
- Messen: Zeit je Suche (Ziel unter 0,3 ms), Suchen je Sekunde.

### K4 · Fahren und Kampfverhalten

- **Fahren wie ein Panzer:** eigene Fahrtrichtung `heading`, Drehung höchstens 3,2 rad/s. Liegt das Ziel mehr als
  60° daneben, wird erst auf der Stelle gedreht (30 % Tempo). Beschleunigen 260 AE/s², Bremsen 420 AE/s²,
  Höchsttempo wie heute (118–132 AE/s). **Anhalten ist erlaubt**; die Mindestgeschwindigkeit von 55 % entfällt.
- **Darstellung:** In `_robot` (`src/scenarios/scrap.js`) zeigt das Chassis `heading`, sofern vorhanden, und der Turm
  wie heute `angle`. `v3` bleibt beim bisherigen Verhalten.
- **Verhalten:**
  - *Suchen* (ohne Waffe): Weg zur Waffe mit den geringsten Kosten (Weglänge + Wartezeit).
  - *Angreifen:* Wunschabstand Blaster 220–340 AE, Rakete 260–420 AE. Gewählt wird einer von 12 Punkten auf
    einem Kreis um das Ziel, nach freier Sicht, Deckung in der Nähe und Wegkosten.
  - *Deckung:* bei weniger als 35 % Leben oder höchstens 2 Schuss Munition ein Punkt hinter Deckung, vom
    stärksten Gegner aus gesehen; nach 3 s wieder hervorkommen.
  - *Flanke:* ist das Ziel 2 s lang verdeckt, einen Punkt seitlich davon ansteuern.
- **Charaktere** (fest je Roboter, auch im Turnier wiedererkennbar):

  | Roboter | Spielweise | Startwerte |
  |---|---|---|
  | Ember | Draufgänger | Wunschabstand −30 %, Deckung erst unter 20 % Leben |
  | Azure | Scharfschütze | Wunschabstand +25 %, schießt erst unter 0,04 rad Abweichung |
  | Amber | Sammler | Raketen 25 % günstiger in der Waffenwahl |
  | Moss | Flankierer | Flanke schon nach 1 s Verdeckung |

### K5 · Abstimmen, messen, Testclip (Stopp)

- Neues Skript `scripts/scrap-v4-stats.mjs`: 100 Seeds je Format, nur Simulation. Zielwerte:

  | Messgröße | Ziel |
  |---|---|
  | erster K.o. | Median 10–16 s |
  | Rundendauer | Median 30–45 s, keine über 75 s |
  | Trefferpaare in den ersten 15 s | kein Paar über 30 %, die zwei häufigsten zusammen unter 50 % |
  | Schüsse ohne freie Linie | unter 10 % (absichtliche Holzschüsse ausgenommen) |
  | festgefahren | unter 1 % der Roboterzeit |
  | Siegquote je Roboter | 20–30 % |
  | Unentschieden | unter 5 % |

- Neue Testdatei `test/scrap-v4.test.mjs`: Determinismus, Invarianten, Seek-Bild, Kisten-Platzierung, Gleichstand
  im A*. Dazu unverändert bestehend: `scripts/scrap-map-hashes.mjs`, Scrap-Testdateien, einmal `npm run golden`.
- **Testclip:** 20 s je Format mit Ton → Nutzer beurteilt Fahrgefühl und Spannung. Danach wechseln
  `presets/production/scrap-short.json` und `scrap-long.json` auf `v4`.

---

## 5 · Short (S, baut auf v4)

Vorbild ist das Territory-Short: eigener Modus, schlanke Anzeige, verdeckte Regie, leiser Ton.

### S1 · Short-Layout

- Parameter `layout: 'short'`, nur hochkant. **Keine Kopfleiste.** Nur Namensschilder (1,4-fach) mit Lebensbalken
  am Roboter.
- **Kleinere Short-Karte:** 540 × 700 AE statt 540 × 1040, 12 Deckungen (6 Holz, 3 Stein, 3 Beton), gleiche Waffen
  und Stationen. Die Arena füllt die Bildbreite (2,0 Pixel je AE, Roboter rund 9 % der Bildbreite) und liegt
  zwischen 8 % und 81 % der Bildhöhe. Wichtiges bleibt in der Mitte; unten und rechts liegt die Bedienung der
  Plattform.
- **Einstiegstext** 0–2,5 s bei 22 % Höhe: „4 BOTS · 1 SURVIVOR“, darunter „PICK YOUR COLOR“.
- **Ende:** großer Sieger „AZURE WINS“ in der Mitte, 2,5 s, danach Schluss.

### S2 · Verdeckte Regie

- **Casting:** `scripts/scrap-short-casting.mjs` sucht Seeds, in denen der erste K.o. bei 5–10 s fällt, der zweite
  bei 12–20 s, das Schlussduell mindestens 6 s dauert und beide dann unter 40 % Leben haben. Gesamtlänge 26–38 s.
  Bevorzugt gewinnt nicht der Roboter, der zuerst bewaffnet war.
- **Short-Balance** (nur im Short): Schaden ×1,5. Im Schlussduell nimmt der Schwächere 20 % weniger Schaden, damit
  es knapp wird. Alles reproduzierbar per Seed.
- **Zeitlupe** beim letzten K.o.: 0,5 s Videozeit mit Tempo 0,35. Umsetzung als vorab berechneter Tempoplan der
  Episode (wie die Siegplanung im Territory-Short), Ton gleich gedehnt oder mit eigenem Akzent. Im Langvideo aus.

### S3 · Vorlage und Export

- `presets/production/scrap-short.json`: `v4`, `layout: 'short'`, `soundMix: 'soft-v1'`, Seed aus dem Casting,
  Dauer bis Sieg + 2,5 s.
- 20-Sekunden-Probe, danach das ganze Short (rund 32 s) **nur auf Auftrag**.

### L1 · Langvideo-Vorlage

- `presets/production/scrap-long.json` auf **Turniermodus** (8 Runden mit Rangliste) statt Dauerlauf, `v4`,
  `soft-v1`. Gibt einen Bogen mit Ziel und Finale.
- Kapitelzeiten aus den `round_start`-Ereignissen in die JSON-Begleitdatei schreiben, damit sie in die
  Videobeschreibung übernommen werden können.

---

## 6 · Reihenfolge und Stopps

| Schritt | Inhalt | Stopp |
|---|---|---|
| 1 | T1 Hörprobe | **ja:** Nutzer wählt die Klangrichtung |
| 2 | T2 Ton umsetzen | – |
| 3 | E0 Sofortkorrektur und Vorschaubilder | **ja:** Stil freigeben |
| 4 | E1–E5 Effekte | – |
| 5 | K1–K4 Regelversion v4 | – |
| 6 | K5 Messung und Testclip | **ja:** Fahrgefühl und Spannung |
| 7 | S1–S3 Short, L1 Langvideo-Vorlage | Export nur auf Auftrag |

T und E sind voneinander unabhängig und könnten parallel laufen. K hängt für Einschusslöcher und Kisten-Splitter an E.

---

## 7 · Prüfung (aufs Nötige beschränkt)

- **T:** Scrap-Audiotest, Exportprüfung (True Peak, Lautheit), Hörprobe-Clips mit Messwerten.
- **E:** Bildvergleich vorher/nachher, Seek-Bildvergleich, Renderzeit, Hashes unverändert.
- **K:** `node --test test/scrap-v4.test.mjs`, `node scripts/scrap-map-hashes.mjs`, betroffene Scrap-Testdateien,
  einmal `npm run golden`, Statistik-Skript.
- **S:** Casting-Skript, Short-Test (Länge, Sieger, kein Text am Rand), 20-Sekunden-Probe.
- Kein vollständiger `npm test` ohne ausdrücklichen Wunsch. Im Bericht sagen, was gelaufen ist und was nicht.

---

## 8 · Fragen für das Ende (mit Empfehlung entschieden, Nutzer justiert nach)

1. **Start:** fallende Holzkisten statt Startgaragen in der Wand.
2. **Charaktere:** ja, fest je Roboter (Draufgänger, Scharfschütze, Sammler, Flankierer).
3. **Erzfeind je Runde:** nein; der Rache-Bonus reicht.
4. **Kampftempo:** Blaster 6, Rakete 30, eingestellt über die Zielwerte in K5.
5. **Zeitlupe:** nur im Short beim letzten K.o.
6. **Langvideo:** Turniermodus statt Dauerlauf.
7. **Karte für Shorts:** Sunny Yard (hell und freundlich). Deshalb müssen alle Effekte auf hellem Boden wirken.
8. **Musik:** keine im Video. Populäre Musik höchstens als Test beim Hochladen in der YouTube-App (siehe
   [Leitlinien](SHORTS_LEITLINIEN.md)), Shorts mit solcher Musik unter 60 s.
