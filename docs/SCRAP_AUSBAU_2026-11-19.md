# Scrap Wars: Ausbau – Bericht vom 19.11.2026 (R40)

**Bezug:** [Ausbau-Plan](SCRAP_AUSBAU_PLAN_2026-11-19.md). **Stand:** T1 Hörprobe in zwei Runden, E0 erledigt,
E1–E5 als Entwurf zur Stilfreigabe. Branch `scrap/e0-kopfzeile`.

**Kurz:** Die Sunny-Kopfzeile ist englisch und zeigt Waffensymbole. Neue Treffer-, Schuss- und Explosionseffekte
stehen als Vorher/Nachher-Blätter bereit. Der Ton wartet auf die Wahl des Nutzers; daran wird nicht weiter gefeilt.

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
| 2 | B2 sauber (B gekürzt, dunkler) | −22,9 | −6,8 | 3,5 | 0 | offen |
| 2 | B3 comic (Bonk, Puff, Wah-Wah beim K.o.) | −23,0 | −6,6 | 3,5 | 0 | offen |
| 2 | B4 comic mit „Piu“-Blastern | −23,0 | −7,0 | 3,5 | 0 | offen |

Runde 2 nutzt Pegel nach Lautheit statt Spitze (lautestes 50-ms-Fenster), höchstens drei Blaster je Sekunde und ein
leiseres Grundgeräusch (−48 statt −40 LUFS). Keine `mw-soft-*`-Klänge, keine hellen Metall- oder Plattenaufschläge.
**Weiter:** Der Nutzer wählt bei Gelegenheit; T2 (Umsetzung mit Schalter `soundMix`) folgt danach.

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
