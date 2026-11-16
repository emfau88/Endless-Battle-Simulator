# Scrap Wars: Optik-Plan „eine Nummer hochwertiger“

Stand: 14.11.2026, Basis `main` an `e2e07bc`. Verfasst als Umsetzungsauftrag für Codex.
Ziel: Der bestehende Stil bleibt, er wird nur **fertiger**. Keine neue Spielmechanik, kein neuer Look.
Dieser Plan legt fest, *wie* es aussehen soll, nicht nur *was* zu tun ist. Wo Zahlen stehen, sind sie
Startwerte. Abweichen ist erlaubt, wenn das Vorher/Nachher-Bild es klar besser zeigt. Die Richtung bleibt fest.

Einheit „AE“ = Arena-Einheit der V3-Welt (1040×540). Bei 1080p im Querformat ist 1 AE ≈ 1,76 px.

**Ist-Stand ansehen (wichtig, vor dem Lesen):**

- [Ist-Analyse mit Nummern](reference/scrap-optik-ist-2026-11-14.jpg): die Nummern 1–10 entsprechen den Punkten unten
- [Alle vier Karten quer](reference/scrap-karten-quer-2026-11-14.jpg)
- [Hochformat: gedrehte Karte vs. eigener Grundriss](reference/scrap-karten-hoch-2026-11-14.jpg)

---

## 0 · Leitplanken (nicht verhandelbar)

**Technik**

- `src/scenarios/scrap/simulation.js`, `src/scenarios/scrap/renderer.js` und
  `docs/reference/scrap-arena.source.html` bleiben **bytegleich** (Test „Quelle … unverändert“).
  Alles Neue kommt als Override in `src/scenarios/scrap.js` (Klasse `ArenaRenderer` / `ScrapRenderer`),
  in `material-art.js` (dunkle Karten) oder `daylight-art.js` (Sunny Yard).
- Pakete P1–P5 sind **reine Darstellung**. `npm run golden` muss unverändert bestehen. Ändert sich ein Hash,
  wurde die Simulation berührt: zurückbauen, nicht neu schreiben.
- Der Renderer ruft keinen Kampf-RNG auf. Variation nur über die zustandslose `noise(seed, i)`.
- **Clip-/Seek-Sicherheit:** `supportsClips` ist aktiv. Ein Bild nach `simulate(t)` muss pixelgleich sein mit
  dem Bild nach durchgehender Wiedergabe bis `t`. Deshalb keinen Zustand im Renderer aufbauen, der von
  vorherigen Frames abhängt (kein Akkumulieren von Brandflecken, kein „Geister-HP-Balken“ usw.).
  Alles Dauerhafte wird aus Simulationszustand oder Ereignisprotokoll (`episode.events`) abgeleitet.
- Texturen cachen wie bisher (`_bodies`, `_blocks`, Bodentextur). Effekt- und Decal-Zahl begrenzen.
  Die Renderzeit pro Frame darf um höchstens 15 % steigen (messen: `renderFrames(300)` bei 1080p, vorher/nachher).

**Vom Nutzer früher abgelehnt, nicht wieder einführen**

- Kamerafahrten, Zoom oder Wackeln (feste Gesamtansicht bleibt, auch kein Screenshake bei Explosionen)
- Maschinenwracks oder Schrott-Requisiten als Arenadeko
- Smilies, Regenbögen, Blumenbemalung (abgelehnte erste Sunny-Fassung)
- Kleinere Arena: Das Spielfeld belegt weiterhin ≈ 90 % des 16:9-Bildes, keine breiten Seitenpaneele

---

## 1 · Stilbibel: so soll es aussehen

**Charakter:** sauberer, leicht plastischer Top-down-Vektorstil („2,5D“: Oberseite plus sichtbare Seitenfläche
unten/rechts), kräftige Teamfarben auf einer ruhigen, entsättigten Umgebung. Wie ein gut gemachtes
Mobile-/Indie-Spiel, nicht realistisch, nicht grungy, nicht neon.

**Qualitätsmaßstab im eigenen Projekt:** Holzkisten, Steinblöcke, Waffenstationen und **Sunny Yard**
(Rand, Schatten, liegende Waffen) sind schon auf dem Zielniveau. Alles Neue muss so aussehen,
als käme es aus derselben Hand.

| Regel | Festlegung |
|---|---|
| Licht | Von **oben links**. Schatten fallen nach unten rechts, Versatz ≈ (+5, +8) AE, Unschärfe ≈ 8 AE, Farbe `#03090e` mit 45–70 % Deckkraft. Gilt für **alles**, auch Waffen am Boden und Trümmer. |
| Sättigung | Gesättigt sind nur Teamfarben (`#ff725e #54dce8 #ffce63 #b0e779`), Mündungsfeuer, Projektile und Explosionen. Boden, Rand und Markierungen bleiben entsättigt. |
| Kontrast-Hierarchie | Roboter > Projektile/Effekte > Deckung > Waffen/Stationen > Bodenmarkierungen > Boden. Nichts Neues darf eine Stufe überspringen. |
| Bodendetails | Höchstens 8–15 % Deckkraft. Nichts darf wie ein Hindernis oder ein Aufsammel-Objekt aussehen. |
| Formsprache | Kompakte Formen, Ecken 2–4 AE gerundet, 1,5–2,5 AE dunkle Außenkontur (`#0a1218`), kleine Schrauben als Akzent. Große Flächen bekommen **keinen** weißen Verlauf, Glanz nur als schmale Kante. |
| Akzentfarbe Bodenfarbe | Abgenutzte Markierungsfarbe `#cdbd8c` (Scrapyard). Foundry: `#e08a3c`, Crossroads: `#e8e6dc`. |
| Abnutzung | Über ein Fleckenmuster mit `destination-out` (200–400 Flecken à 1–3 AE), statt Linien zu stricheln. |

**Nicht tun:** Fotostrukturen, Grunge-Overlays, Bloom über das ganze Bild, neue Teamfarben,
bunte Bodenflächen, Text am Boden, „Cartoon“-Gesichter, dekorative Objekte im Spielfeld.

**Bleibt so (nicht „mitoptimieren“):** Blockgrafiken Holz/Stein/Beton, Grundaufbau der Stationen,
vier Silhouetten und Akzentmotive der Roboter (Ember Lufteinlass, Azure Fenster, Amber Warnplatten,
Moss Ring), Kopfzeilen-Aufbau, Arenagröße, Sunny-Yard-Boden.

---

## 2 · Arbeitspakete in Reihenfolge

Gültigkeit: **Roboter, Effekte, Schilder** gelten für alle Regelversionen und auch für Sunny Yard
(gemeinsamer `ArenaRenderer`). **Boden, Rand, Stationen, liegende Waffen, Trümmer und HUD** betreffen nur die
dunklen V3-Karten (Scrapyard, Foundry, Crossroads). Sunny behält seine eigene Kunst, muss aber mit den neuen
Robotern und Effekten auf hellem Boden gut aussehen. Das gehört jeweils zur Prüfung.

### P1 · Explosionen, Treffer, Projektile (Nr. 1)

*Ist:* Ein Raketeneinschlag ist ein blasser Ring mit Strichen, Blaster-Schüsse sind kaum sichtbare Punkte.
Danach bleibt keine Spur.

*Umsetzung* (Override `_effect` / `_projectile` in `scrap.js`; `u = age/ttl`, `ttl` kommt aus der
Simulation und bleibt unverändert):

- **Explosion (`blast`, `ko` ×1,25), Ebenen von unten nach oben:**
  1. Rauch: 6 Wolken `#2c2e2d`, normales Überblenden, Deckkraft 0,40 → 0, Radius 0,20·s → 0,45·s,
     driften 12 AE nach oben und leicht nach außen, über die ganze `ttl`.
  2. Feuerball (`screen`, nur u < 0,35): radial `#ffb347` → `#ff7a2e` → transparent, Radius 0,35·s → 0,65·s, Deckkraft 0,85 → 0.
  3. Blitz (`screen`, nur u < 0,12): Kern `#fff4d6`, Radius 0,30·s, Deckkraft 1 → 0.
  4. Druckwelle (u < 0,4): Ring 0,4·s → 1,1·s, Linienbreite 2 → 0,5 AE, `#ffe2b0`, Deckkraft 0,45 → 0.
  5. Funken: die vorhandenen 11 Linien beibehalten.
  - Zusätzlich bei `ko`: 6 Metallsplitter in abgedunkelter Teamfarbe (−30 %), fliegen 30–50 AE nach außen, drehen sich, verblassen.
- **Treffer am Roboter (`hit`):** weißer Blitz r = 6 AE, Deckkraft 0,7 für u < 0,25; dazu 5–6 Funken
  à 6–10 AE `#ffe5aa` mit kleinem Glühen (r = 10, Deckkraft 0,3).
- **Blaster-Bolzen:** 26–34 AE lang, Kern 3 AE `#f2fdff`, äußerer Strich 7 AE `#6fd3ef` mit 0,25 (`screen`),
  Kopfglühen r = 10, Deckkraft 0,35.
- **Rakete:** Form bleibt, Rauchspur 8 statt 6 Wolken, Deckkraft ×1,6.
- **Brandflecken (neu, dauerhaft pro Runde):** aus `this.sim.events` alle `blast`/`ko` mit
  `round === sim.roundNumber`, Position `arenaX/arenaY` (im Hochformat durch `mapPoint`). In der Bodenebene
  zeichnen (nach dem Boden, vor Trümmern und Stationen): unregelmäßiger Fleck r ≈ 22 AE (`ko` 28),
  radial `#0a0c0d` mit 0,38 → 0, dazu 7 kurze Strahlen aus `noise(seq, i)` mit 0,18.
  Einblenden über 0,15 s Rundenzeit, nach 15 s auf 0,28 absenken. Höchstens 24 (die neuesten).
  Sunny: Farbe `#2a2620`, Deckkraft ×0,65.

*Abnahme:* Ein Einschlag liest sich im Standbild als Explosion. Nach der Runde sieht man, wo gekämpft wurde.
Das Bild nach Seek ist pixelgleich zur durchgehenden Wiedergabe.

### P2 · Boden, Rand und Kartenidentität (Nr. 2, dazu Map-Design M1)

*Ist:* flaches Grau, schwaches Raster, Platzhalter-Schriftzug „SCRAP WARS“ in der Mitte, Startecken als
getönte Rechtecke mit UI-Winkeln, Rand als Linie mit Punkten. Alle drei dunklen Karten sehen gleich aus.

*Umsetzung* in `material-art.js → floor()` (nur die dunklen Karten):

- **Fester Boden-Seed pro Karte** (z. B. `hashSeed('scrap-floor-' + arena)`) statt Runden-Seed: Die Arena ist
  ein Ort und sieht jede Runde gleich aus. Cache-Schlüssel ohne `r.seed`.
- **Platten:** Das vorhandene 130-AE-Raster bleibt. Jede Platte bekommt ±3 % Helligkeit (`noise`).
  Fugen 1 AE dunkel plus 0,5 AE helle Kante darunter (Fase).
- **Mitte:** Schriftzug entfernen. Dafür eine abgewetzte Bodenmarkierung: Ring r = 67 AE (3 AE breit),
  Innenring r = 52 AE (1,5 AE), 8 Teilstriche, Farbe `#cdbd8c` mit 0,12, mit Abnutzungsmaske.
- **Fahrspuren:** Die gestrichelten UI-Linien werden zu durchgehenden, abgenutzten Farbstreifen
  (3 AE, `#cdbd8c`, 0,14), die 80 AE vor der Wand enden.
- **Startecken** (Ersatz für Tönung und L-Winkel): gemaltes Startfeld 120×120 AE. Teamfarbe 0,07 als Fläche,
  an den beiden Innenkanten ein 10-AE-Warnstreifenband (45°, Streifen 8 AE, Teamfarbe 0,20),
  ein kleiner Pfeil (Chevron) zur Mitte mit 0,25. Mit Abnutzungsmaske.
- **Nachschubmarken:** Unter den festen Startpositionen der liegenden Waffen eine gestrichelte Bodenmarke
  44×44 AE mit Eckstrichen (`#cdbd8c`, 0,12). Die Koordinaten aus `materials.js` exportieren,
  nicht duplizieren.
- **Gebrauchsspuren** (fester Seed): 8 Ölflecken (je 3–5 überlappende Ellipsen, `#0b0f12`, 0,18–0,28,
  18–55 AE), 3 Reifenspur-Paare (zwei parallele Bögen im Abstand von 6 AE, 1,5 AE breit, 0,08,
  150–260 AE lang, vor allem in den Fahrspuren), 6 warme Rostflecken nahe der Wand (`#7a5532`, 0,05).
  Nichts innerhalb von 30 AE um die Stationen.
- **Licht und Tiefe:** Die Wand oben und links wirft 14 AE Schatten nach innen (`#000`, 0,35 → 0).
  Unten und rechts eine helle Innenkante (1 AE, `#7d8b90`, 0,5). Die Ecken leicht abdunkeln (radiale Vignette, 0,14).
- **Rand** (bleibt im vorhandenen 18-AE-Band, keine Größenänderung): Stahlkante mit Fase, Oberseite
  `#2b3740` → `#1d272f`, dunkle Außenkontur. Bündige Schrauben alle 80 AE **auf** dem Rand
  (r = 2,2, `#5c6d76`, Glanzpunkt oben links). An den beiden Stationsachsen (oben/unten Mitte) je ein
  60 AE langes Warnstreifen-Segment (`#d9b14a`/schwarz, 0,55). Gleiche Bauweise wie der Sunny-Rand, nur dunkel.
- **Blöcke erden:** Der vorhandene Schatten bleibt. Dazu ein 3-AE-Kontaktschatten direkt am Fuß (0,3).
- **Kartenidentität, nur über den Boden:**
  - *Scrapyard:* Betonplatten wie oben, Ölflecken, Rost. Akzent `#cdbd8c`.
  - *Foundry:* Stahlplatten (Raster 104 AE, Grundton kühler und dunkler `#3a4247` → `#262f35`),
    Riffelblech-Felder in Startecken und Mittelkreuz (Muster aus kurzen Diagonalstrichen, 0,07).
    Entlang der beiden Fahrspuren je eine flache Gitterrinne mit kaum sichtbarem Glühen
    (`#ff8a3d`, 0,06). Akzent `#e08a3c`. Etwas mehr Rost.
  - *Crossroads:* Asphalt (neutraler `#3b3f42` → `#2a3034`, feinere Körnung, kein Plattenraster, nur zwei Dehnfugen).
    Straßenmarkierungen in `#e8e6dc` (0,16): gestrichelte Mittellinien im Kreuz, durchgezogene Haltelinien
    (4 AE) vor dem Zentrum, je Spur ein Zebra-Feld (6 Balken à 6×30 AE).
  - Für alle gilt: Blöcke bleiben die hellsten Flächen. Jede Karte muss in einem Thumbnail sofort
    erkennbar anders sein.

*Abnahme:* Ohne Roboter sieht die leere Arena wie ein benutzter Ort aus und nicht wie ein UI-Raster.
Die drei Karten sind auf den ersten Blick unterscheidbar, und die Lesbarkeit der Deckung ist unverändert.

### P3 · Roboter: Körper, Halterung, Schaden, Wrack (Nr. 3, 4, 5, 9)

*Umsetzung* in `scrap.js`: `_bodyTexture` und `_robot` vollständig im Adapter (ohne `super._robot`),
damit Schilder und Fahrwerk passen. Hilfsfunktionen lokal nachbauen, die Quelle bleibt unberührt.

- **Texturauflösung:** 4× statt 2× (Canvas 416 px), damit es auch in 4K scharf bleibt.
- **Ketten sichtbar machen:** zwei Ketten bei y −29…−19 und 19…29 AE, x −27…23 AE.
  Grund `#141c22`, Kontur `#0a1015`, Glieder alle 5 AE (`#34434d`, 2 AE breit), Glanzlinie oben `#6c7e88` (0,6),
  Kettenräder an den Enden (r = 4, `#26333c`). Die Rumpf-Polygone in y auf ±21 stauchen, damit links und rechts
  ≈ 8 AE Kette zu sehen sind. Die Silhouetten bleiben erkennbar dieselben. Laufglanz bei Fahrt auf die neuen Ketten legen.
- **Lack statt Plastik:** den Verlauf Weiß → Akzent → Dunkel ersetzen durch
  `mix(akzent, weiß, .18)` → Akzent (0,35) → Akzent (0,7) → `mix(akzent, #0d1a22, .35)`.
  Außenkontur 2,5 AE `#0a1218`. Fase: 1 AE helle Linie oben/links `mix(akzent, weiß, .45)`, 1 AE dunkle Linie unten/rechts.
- **Details:** je Rumpf 2 Plattenfugen (1 AE, Schwarz mit 0,3), die der Form folgen, 3 kurze Lüftungsschlitze
  hinten. Schrauben und Akzentmotive bleiben.
- **Leere Halterung (Nr. 4):** keinen Kreis mit Querstrich mehr. Stattdessen eine runde Montageplatte r = 9 AE
  (`#22323c`, Kontur `#5d727d`), 4 Schraubenlöcher (r = 1,2, `#0b151c`) unter 45°, Drehzapfen r = 2,5 (`#3b4d58`).
- **Raketenwerfer (Nr. 9):** `_weapon('rocket')` im Adapter überschreiben. Etwa 80 % der heutigen Größe,
  **Doppelrohr**: zwei Rohre à 22×7 AE (`#5c6a70` → `#2c383e`, 1 AE Kontur), vorne dunkle Öffnungen (`#0b0f12`),
  geladen mit orangem Innenrand `#d88459`, hinten ein kleiner Kasten mit 2-AE-Streifen in Teamfarbe.
  Gilt auch für liegende Waffen, Stationen und Symbole. Der Blaster bleibt, wie er ist.
- **Schaden (Nr. 5), fest in der Textur** (Cache-Schlüssel mit Stufe; 4 Farben × 3 Stufen + Wrack):
  - Stufe 1: 2 Dellen (abgedunkelter Fleck `mix(akzent, #0d1a22, .4)`, 6×4 AE, helle Unterkante 1 AE),
    3–4 Kratzer 5–9 AE lang, 1 AE breit, blankes Metall `#d9e2e4` (0,8), etwa 20° schräg.
    **Keine schwarzen Zickzacklinien.**
  - Stufe 2: zusätzlich ein Brandfleck hinten (radial `#12161a`, 0,55, r = 10 AE), die vorhandene offene Klappe mit
    orangem Kabel und mehr Kratzer. Rauch wie bisher (höchstens 3 Wolken). Dazu alle 1,1–1,6 s
    (deterministisch aus `t` und `id`) 3 kleine Funken `#ffd38a` für 0,12 s.
  - Positionen fest pro Roboter (`noise(id, i)`), so wird jeder Roboter auf seine eigene Weise beschädigt.
- **Wrack (Nr. 5):** Lack `mix(akzent, #1c2226, .75)`, Brandfleck über ~60 % der Fläche, eine Kette um 3 AE
  verschoben (abgesprungen), Halterung ohne Zapfen, Auge ohne Glanzpunkt. **Kein Schrägstrich bzw. ⊘.**
  Die ersten 6 s nach dem KO (Zeit aus dem `ko`-Ereignis) 2 dünne Rauchfäden (0,18), danach nichts mehr.
  Das vorhandene schwache Glühen bleibt.
- Werkstatt-Anbauteile an die neuen Ketten anpassen, nicht neu gestalten.

*Abnahme:* In einer 4K-Nahaufnahme sehen die Roboter wie kleine Maschinen aus und nicht wie Spielsteine.
Die vier Roboter sind weiterhin auf Handygröße an Farbe und Silhouette unterscheidbar. Schaden liest sich als Schaden.

> **Stil-Checkpoint nach P3:** Vorher/Nachher-Sheet (siehe Abschnitt 4) dem Nutzer vorlegen und auf ein OK warten,
> bevor P4 beginnt. Bei Kritik zuerst P1–P3 korrigieren.

### P4 · Lesbarkeit im Spielfeld (Nr. 6, 7, 8)

- **Schilder:** eigener Durchgang **nach** allen Robotern, Projektilen und Effekten (in `paintMaterialArena`),
  damit nichts verdeckt wird. Schild 58×13 AE (`#0c1820`, 0,88, r = 3), Name 9 AE fett in Teamfarbe.
  Darunter, direkt anliegend, ein HP-Balken 48×3,5 AE (Spur `#050c11`, unter 25 % in `#f48562`).
  Abstand zum Rumpf 6 AE. Platzierung: oben; unten (r + 10 AE), wenn der Roboter am oberen Rand ist **oder**
  sich das Schild mit einem schon platzierten überschneidet (Roboter nach y sortiert abarbeiten).
  Wracks bekommen kein Schild.
- **„UNARMED“ entfernen**, das zeigt die Montageplatte. Munitionspunkte bleiben, auf 80 % verkleinert.
- **Stationen (dunkle Karten):** den Aufbau der Sunny-Station übernehmen (große Restzahl plus Waffenname im Kreis),
  aber in den dunklen Farben. Das Wort „RECHARGE“ und die Unterzeile „01 / ROCKET“ entfallen. Liegt eine Waffe
  auf der Station, zeigt sie nur noch den Fortschrittsring und keinen Text.
- **Liegende Waffen (Nr. 8):** das Sunny-Prinzip übernehmen (`daylight-art.js → pickup`): Die Waffen-**Silhouette**
  wirft den Schatten, Versatz (+3, +5) AE, 0,45, leicht unscharf, immer gleiche Lichtrichtung. **Keine Ellipse.**
  Ausgeschossene, liegende Waffen: entsättigt, ohne Glühen und ohne Zahl, Deckkraft 0,5 → 0,3.
- **Trümmer (Nr. 7):** dunkler und ruhiger. Holz `#6e4c2c`/`#8a6238` (statt `#a9753e`/`#d39c59`),
  Stein `#4f5f69`/`#66757e`, Beton `#8c928d`/`#a5a99f`. 14 Teile à 2–6 AE plus 2 größere Stücke
  (Holz: Bretter 14×3 AE; Stein/Beton: Brocken 8 AE), jedes mit dunkler Unterseite (+1/+1,5 AE).
  Der Staubfleck bleibt. Die fliegenden Bruchteile bekommen dieselben Farben.
  Der geöffnete Weg soll sich lesen lassen, aber nicht leuchten.
- *Optional:* Stein-Oberseite um ≈ 20 % entsättigen, falls er neben dem neuen Boden wie Eis wirkt.
  Nur übernehmen, wenn das Vorher/Nachher es klar zeigt.

### P5 · Kopfzeile und Siegerbanner (Nr. 10)

- Alles im Video auf Englisch: Legende `WOOD · STONE · CONCRETE` (nur die Anzeige zuordnen,
  die Schlüssel in `materials.js` bleiben).
- Statt `BLST 5`/`RKT 2`/`SEARCH`: Mini-Waffensymbol (`_weapon` verkleinert) plus Zahl.
  Ohne Waffe ein hohles Umrisssymbol plus „—“. Statt `0 W`: Stern plus Zahl (`★ 2`).
  Im Querformat ist auch `2 WINS` möglich.
- HP-Balken in der Kopfzeile 7 statt 5 px, gerundet. Ausgeschiedene Karten grau mit `KNOCKED OUT`.
- **Siegerbanner:** links das Robotersymbol des Siegers (Körpertextur, 64 px), daneben „AZURE WINS“ und darunter
  „ROUND 1 · NEXT ROUND IN 3s“. 2 px Rahmen in Teamfarbe, äußeres Glühen in Teamfarbe (Unschärfe 18, 0,35).
  Einblendung: Skalierung 0,94 → 1 und Deckkraft 0 → 1 über 0,25 s, berechnet aus `pauseUntil − step`
  (deterministisch). Das Turnierfinale an dieselbe Gestaltung angleichen, nicht umbauen.

### P6 · Optional, nur nach Freigabe: eigene Schrift

Eine OFL-Schrift mitliefern (Vorschlag: *Barlow Condensed* SemiBold/Bold) unter `assets/fonts/`, mit Lizenzdatei.
Nur für Titel, Namen und Zahlen; Segoe UI bleibt der Rückfall. Vor dem ersten Bild in Vorschau **und** Export auf
`document.fonts.load` warten, sonst unterscheiden sich die ersten Frames. Nur mit ausdrücklicher Freigabe,
weil das den Ladeablauf berührt.

---

## 3 · Map-Design: Einschätzung und Verbesserungen

**Was gut ist:** fair durch Spiegelung, klare Wege (Mittelkreuz, Außenring), jede Deckungsgruppe mischt alle
drei Materialien, die Stationen sitzen an gut lesbaren Achsen und das 16:9-Bild wird gut genutzt.

**Schwächen:**

1. **Immer dasselbe Gerüst.** Alle drei dunklen Karten haben einen Block-Cluster in der Mitte
   (x ≈ 230–810 AE) und links/rechts ein leeres Band von ≈ 220 AE. Fast die Hälfte der Fläche hat keine Deckung.
   Die Startecken sind nackt. Im Video wirkt der Rand ungenutzt, und die Roboter fahren lange durchs Leere.
2. **Gleichförmige Blöcke.** Fast alle Blöcke sind 64–86 × 42–64 AE groß und stehen auf denselben Zeilen.
   Das wirkt wie ein Parkplatz oder Brettspiel. Foundry zeigt mit den hohen Betonplatten, wie viel ein anderes Format bringt.
3. **Kein Charakter.** Scrapyard und Crossroads sind im Thumbnail kaum zu unterscheiden.
4. **Hochformat der dunklen Karten:** Die Querkarte wird nur gedreht. Oberes und unteres Drittel sind leer
   (siehe [Hochformat-Vergleich](reference/scrap-karten-hoch-2026-11-14.jpg)). Sunny Yard mit eigenem
   Grundriss wirkt deutlich besser.
5. Die liegenden Waffen am Rand schweben ohne Bezug im Leeren.

**Verbesserungen:**

- **M1 · nur Optik, ohne Simulationsänderung:** in P2 enthalten: Bodenidentität pro Karte,
  Startfelder, Nachschubmarken, Rand. Die visuelle Asymmetrie (Flecken, Spuren) kommt nur vom Boden;
  die Fairness bleibt unberührt. **Das zuerst.**
- **M2 · Geometrie (ändert die V3-Ergebnisse, nur nach Freigabe):** je Quadrant ein kleines Deckungselement im
  leeren Seitenband, gespiegelt. Startwert Scrapyard (oberes linkes Viertel, wird wie bisher gespiegelt):
  Holzkiste 40×40 AE bei (114, 150). Das lässt je 96 AE zur Wand und zum Steinblock, liegt nicht auf dem
  Anfahrtsweg vom Start (106, 84) zur Mitte und hält 80 AE Abstand zur Seitenwaffe (140, 270).
  Für Foundry und Crossroads selbst Positionen finden: Bei Foundry ist das Seitenband neben der hohen
  Betonplatte zu schmal für einen Quader. Dort eher ein flaches Element oberhalb oder unterhalb ihrer
  y-Spanne oder ganz verzichten. Pro Cluster höchstens einen Block in ein anderes Format bringen
  (lange flache Barriere statt Quader). Regeln: Durchgänge ≥ 2 Roboterdurchmesser (bei r = 24 also ≥ 96 AE,
  Radius im Code prüfen) zu Wand und Nachbarblock, auch diagonal an Ecken; ≥ 40 AE Abstand zu Startpunkten und
  Waffenpositionen; Spiegelung bleibt; Begehbarkeitstest aller Karten grün.
  Scrap-Kartenreferenzen danach bewusst mit `node scripts/scrap-map-hashes.mjs --write` setzen und im Bericht begründen.
  Die gemeinsame Golden-Fixture deckt andere Szenarien ab und bleibt unverändert. Vorher und nachher
  3 Seeds Rundenverlauf vergleichen (Dauer, Leerlauf, Sieger), wie im
  [Qualitätsbericht](SCRAP_VIDEOQUALITAET_2026-11-13.md).
- **M3 · eigener Hochformat-Grundriss für Scrapyard (nur nach Freigabe):** nach dem Vorbild
  `portraitHalf` in `materials.js`. Bis dahin für 9:16-Produktionen Sunny Yard empfehlen.

**Stand 15.11.2026:** M3 und M2 sind nach ausdrücklicher Nutzerfreigabe umgesetzt.
M2 bleibt auf Scrapyard begrenzt; Foundry und Crossroads behalten ihre bisherigen Wege.
[Umsetzung, Vorher/Nachher und Prüfungen](SCRAP_GEOMETRIE_2026-11-15.md).

---

## 4 · Prüfung und Nachweise

- `npm test` (bzw. `node scripts/test-ci.mjs scrap` und `export-scrap`), `npm run golden` unverändert (P1–P6).
- **Seek-Gleichheit** zusätzlich einzeln prüfen: PNG nach `simulate(35)` gegen `simulate(20)` + durchgehendes
  Rendern bis 35 s → pixelgleich (Brandflecken, Rauch, Schilder).
- `scripts/screenshot.mjs` um `--params '<json>'` erweitern (für Arena/Regelversion). Das ist ein kleiner Werkzeugschritt.
- **Feste Referenzbilder, Seed 42, HUD an, Kamera aus,** jeweils vorher/nachher als nebeneinanderliegendes Sheet:

| Bild | Konfiguration | Zeigt |
|---|---|---|
| A | Scrapyard 16:9, t = 8 | Ausgangslage, intakte Deckung, 4K-Nahaufnahme (`--resolution 2160`) der Roboter |
| B | Scrapyard 16:9, t = 7,33 | erste Explosion (Einschlag bei 7,23 s) |
| C | Scrapyard 16:9, t = 50 | Gedränge, Schilder, Schadensstufen, Trümmer, Brandflecken |
| D | Scrapyard 16:9, Rundenende ≈ 24,7 s + 0,7 s | Siegerbanner, Wracks |
| E | Scrapyard 9:16, t = 20 | Hochformat |
| F | Foundry und Crossroads 16:9, t = 1 | Kartenidentität |
| G | Sunny Yard 16:9 t = 14 und 9:16 t = 1 | neue Roboter/Effekte auf hellem Boden |

- Bilder lokal unter `output/scrap-optik/`. Sheets klein (JPEG, ≤ 400 KB) unter `docs/reference/`.

---

## 5 · Ablauf und Lieferung

- Branch `codex/scrap-optik` von `main`. **Ein Commit pro Paket** (P1 … P5), jedes Paket einzeln prüfen.
- Reihenfolge P1 → P2 → P3 → **Stil-Checkpoint** → P4 → P5. P6, M2 und M3 nur nach ausdrücklicher Freigabe.
- Am Ende ein Bericht `docs/SCRAP_OPTIK_<Datum>.md` mit Sheets, Messwerten (Renderzeit) und Grenzen,
  dazu ein Eintrag in `docs/ROADMAP.md` (offene Punkte) und `docs/CHANGELOG.md`.
- Kein Push und kein PR ohne Freigabe des Nutzers.
- Bei Zweifeln am Stil gilt: lieber zurückhaltender. Die Hierarchie aus Abschnitt 1 ist wichtiger als jeder Einzelwert.
