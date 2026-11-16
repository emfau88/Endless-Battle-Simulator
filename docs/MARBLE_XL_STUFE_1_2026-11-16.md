# Marble Factory XL: Stufe 1 (Vorschau)

Stand: 16.11.2026. Branch `marble-xl/stufe-1`. Gehört zu R35 und zum
[Gesamtplan, Abschnitt 9](GESAMTPLAN_2026-11-16.md). **Status: Entwurfsbild in zweiter Fassung vom Nutzer
bestätigt; bewegter Entwurf mit 20-Sekunden-Testclips liegt vor; Rückmeldung zu den Clips steht aus.**

## Was es ist

Ein neues Szenario `marblexl` („Marble Factory XL (in Arbeit)“). Eine große Halle mit **vier Linien der
klassischen Kugelfabrik** und zusammen **132 Kugeln**. Die Kamera zeigt die Übersicht, fährt in einzelne Räume
und an den hohen Linien entlang.

| Format | Halle | Anordnung |
|---|---|---|
| Querformat | 4 080 × 2 295 Einheiten | Zwei hohe Linien außen, zwei Querformat-Linien auf zwei Etagen in der Mitte |
| Hochformat | 2 430 × 4 320 Einheiten | Zwei hohe Linien oben nebeneinander, zwei Querformat-Linien darunter gestapelt |

Die Linien heißen ALPHA, BETA, GAMMA und DELTA und tragen ein eigenes Leuchtschild mit Zählern. In der Übersicht
steht oben zusätzlich eine Leiste `MARBLE FACTORY XL · 132 MARBLES · SORTED … · Zeit`; in den Nahaufnahmen blendet sie
sich aus. Alle Texte im Video sind englisch.

## Wie es gebaut ist

- **Die klassische Kugelfabrik bleibt unverändert.** Jede Linie ist eine normale `MarbleFactory` in ihrem
  bewährten Hoch- oder Querformat-Layout. `marble.js` hat nur drei kleine Ergänzungen: einen eingebetteten Betrieb
  des Renderers (keine eigene Kamera, keine Vignette, Schildtext wählbar) und die Bereitstellung der Bausteine als
  `EBS.MarbleClassic`. Die Referenz-Hashes der klassischen Fabrik sind unverändert.
- **`src/scenarios/marblexl.js`** enthält Hallenplan, Kamera, die zusammengesetzte Simulation und den Renderer.
- **Kamera:** feste Folge ruhiger Einstellungen, rein aus der Videozeit berechnet. Übersicht 8 s, Übergang 4 s,
  Raum 12 s, Fahrt 16 s; ein Durchlauf dauert 94 s und beginnt dann von vorn. Zoom in den Räumen = 1, also genau
  die Größe des bekannten Einzelvideos. Über den Regler „Kamera“ lässt sich „Nur Übersicht“ wählen.
- **Ton:** Klangtabelle der klassischen Fabrik; die Ereignisse aller Linien liegen in Hallen-Koordinaten vor.
  Die Lautstärke folgt noch nicht dem Bildausschnitt.

## Bewusste Grenzen dieser Stufe

- Die vier Linien tauschen **noch keine Kugeln** aus; es sind vier Kreisläufe in einer Halle.
- Zwei der vier Linien sehen gleich aus wie die anderen zwei (je zwei hohe, zwei breite).
- Kein Wachstum, keine neuen Stationen, keine goldene Kugel, kein Finale.
- Keine Vorlagen und kein Eintrag in README und Produktionsvorlagen, solange das Aussehen nicht freigegeben ist.
- Bei 4K wird die Hallen-Rückwand nur in einfacher Schärfe gezeichnet (Kacheln folgen mit dem nächsten Paket).

## Prüfung

`test/marblexl.test.mjs`: beide Formate zwei Minuten ohne verlorene Kugel, gleicher Seed = gleicher Zustand,
Zeichnen und Kamera verändern die Simulation nicht, Seek-Regel während einer Kamerafahrt. Dazu einmal die
Referenz-Hashes (`npm run golden`). Kein vollständiger `npm test`.

## Vorschau

Sechs Standbilder liegen lokal unter `output/marblexl-vorschau/` (nicht im Repository):

- Querformat: Übersicht (Sekunde 4), Nahaufnahme BETA (18), Fahrt am Turm DELTA (36)
- Hochformat: Übersicht (4), Nahaufnahme ALPHA (18), Fahrt über GAMMA (36)

## Rückmeldung des Nutzers (16.11.2026)

„Das sieht so aus, als wäre das immer alles dasselbe. Ich möchte ja auch mehr Maschinen.“ Als Ideengeber nennt er
Marble Works, ausdrücklich ohne dessen Grafik: der Stil der klassischen Kugelfabrik bleibt.

**Folge:** Vier gleiche Sortier-Linien sind nicht das Ziel. Marble XL wird eine **Produktionslinie mit
verschiedenen Maschinen**, an denen die Kugel sichtbar etwas erlebt (roh, poliert, gefärbt, gekühlt, geprüft,
sortiert), mit Kapiteln und Ausbauten wie in Marble Works. Die klassische Sortieranlage ist darin nur noch die
letzte Station.

## Was aus diesem Prototyp bleibt

- Große Halle mit Kamera rein aus der Videozeit (Übersicht, Nahaufnahme, Fahrt) und ausblendender Anzeige.
- Eingebetteter Betrieb der klassischen Bausteine (`EBS.MarbleClassic`), ohne die klassische Fabrik zu ändern.
- Die vier Prüfungen in `test/marblexl.test.mjs` als Muster.

## Entwurfsbild der Produktionslinie (16.11.2026)

`src/scenarios/marblexl/concept.js` zeichnet die Halle mit Zwischendeck und neun Stationen im Stil der klassischen
Fabrik; `scripts/marblexl-concept.mjs` rendert Übersicht und vier Nahansichten. Die Kugeln sind von Hand gesetzt,
es läuft keine Simulation. Bilder lokal unter `output/marblexl-vorschau/konzept-produktionslinie/`.

| Nr. | Station | Was mit der Kugel geschieht |
|---|---|---|
| 01 RAW | Vorratskasten, Kettenaufzug, Behälter mit Zellenrad | matte, gesprenkelte Rohkugel |
| 02 WASH | Glastrommel mit Schaufeln und Wasser | wird sauber und nass glänzend |
| 03 POLISH | zwei Bürstenräder, Funken | wird klar und glänzend |
| 04 KILN | Tunnelofen mit Sichtfenster und Abzügen | glüht orange bis weiß |
| 05 COLOUR | sechs Pigmenttanks, Injektor, Glaskammer | bekommt Farbe und Wirbel |
| 06 COOL | geschwungene Glasrohrstrecke vor drei Lüftern | das Glühen klingt ab |
| 07 INSPECT | Prüfring, Bildschirm, Ausschusskasten | wird geprüft, Ausschuss fällt heraus |
| 08 LIFT | großes Rad mit zehn Taschen | wird zur Sortierung gehoben |
| 09 SORT | sechs hohe Röhren | sammelt sich nach Farbe, die Röhren füllen sich |

**Rückmeldung des Nutzers:** „Das geht in die richtige Richtung, gefällt mir gut.“ Weiterbauen erst nach
gesonderter Freigabe.

## Verbesserungen am Entwurfsbild (16.11.2026, zweite Fassung)

Vom Nutzer beauftragt („setz die Verbesserungen um“). Bilder lokal unter
`output/marblexl-vorschau/konzept-produktionslinie-v2/`, darunter ein Vorher/Nachher der Übersicht.

| Nr. | Verbesserung | Stand |
|---|---|---|
| 1 | Tiefe statt Deko: Bogenfenster mit Nachtlicht, ferne Rohrtrassen, alles kontrastarm | **Erledigt** |
| 2 | Ruhige, funktionale Details: Wandlüfter, Wasserversorgung der Waschtrommel, Absaugung am Polierer, Schaltwand, Dampf, Hitzeflimmern | **Erledigt** |
| 3 | Platz für die zweite Linie freihalten: markierter Bereich „BAY 2 · RESERVED · LINE 2“ mit Kisten | **Erledigt** |
| 4 | Verwandlung deutlicher: roh erdig und matt, gewaschen nass mit Tropfen, poliert klar mit Glanzstern | **Erledigt** |
| 5 | Farbstation als Höhepunkt: Glaskuppel, Farbstrahl aus der Düse, Farbring um die Kugel | **Erledigt** |
| 6 | Lichtzonen je Station (Wäsche türkis, Ofen orange, Kühlung blau, Farbe violett), Halle etwas dunkler | **Erledigt** |
| 7 | Weg lesbarer: Richtungsmarken an den Rohren, Messingflansche an Trommel und Radaufzug | **Erledigt** |
| 8 | Hochformat für Shorts | **Offen**: braucht eine eigene Anordnung in fünf Ebenen, weil Halle und Laufrichtungen anders sind. |

## Bewegter Entwurf und Testclip (16.11.2026)

Der Nutzer hat die zweite Fassung bestätigt („finde ich gut soweit“) und einen 20-Sekunden-Testclip verlangt.

**Was jetzt läuft:** Das Szenario `marblexl` zeigt die Produktionslinie in Bewegung. Die vier gleichen Linien des
ersten Prototyps sind ersetzt. Der Ablauf ist bewusst einfach: Alle 1,6 Sekunden startet eine Kugel und folgt
demselben Zeitplan durch alle neun Stationen (rund 50 Sekunden vom Zellenrad bis in die Röhre). Ort, Zustand und
Zähler hängen nur von der Zeit ab. Es gibt **noch keine Warteschlangen und keine echte Physik**; die Trommel, der
Polierer und die Farbstation sind immer genau passend belegt.

| Teil | Stand |
|---|---|
| Kugeln durchlaufen alle neun Stationen und wechseln sichtbar den Zustand | **Erledigt** (Zeitplan) |
| Drehende Teile: Aufzugskette, Zellenrad, Trommel, Zahnräder, Bürsten, Lüfter, Radaufzug | **Erledigt** |
| Zähler „… / 96“ zählt mit | **Erledigt** |
| Kamera quer: Übersicht, obere Ebene, untere Ebene, zurück (20 s, Zoom 0,5 bis 0,75) | **Erledigt** |
| Kamera hoch: volle Hallenhöhe, langsame Fahrt die Linie entlang | **Erledigt** (Vorschlag statt eigener Hochformat-Halle) |
| Ton | **Vorläufig**: Klänge der klassischen Fabrik an neun Stellen |
| Warteschlangen, echte Physik in Behälter und Trommel, Ausschuss | **Offen** |
| Kapitel und Ausbauten, zweite Linie, Finale | **Offen** |
| Neubeginn in der Vorschau nach 76,8 s | sichtbarer Sprung, bis der Auftrag ein echtes Ende hat |

**Testclips** (lokal, `output/marblexl-vorschau/testclip-2026-11-16/`): Querformat und Hochformat, je 20 s,
1080p30 mit Ton. Renderzeit je 56 s (10,7 Bilder pro Sekunde).

### Ton: Messwerte, kein Hörurteil

| Wert | Marble XL (20 s) | Klassische Fabrik (20 s, zum Vergleich) |
|---|---|---|
| Tonereignisse | 125 | 222 |
| Lautheit | −14,1 LUFS (Ziel −14) | −14,1 LUFS |
| Spitze nach AAC | −1 dBTP | – |
| Anhebung beim Einmessen | +35,9 dB | – |
| Stärkster Eingriff des Begrenzers | −36,4 dB | −23,6 dB |

Lautheit und Spitzen stimmen formal. Der Weg dorthin ist aber grob: Wenige, kurze Klänge werden um fast 36 dB
angehoben und die Spitzen wieder weggedrückt. Das kann gepresst oder pumpend klingen. Abgehört hat das noch
niemand. Für Trommel (Wasser, Purzeln), Ofen, Farbstation und Kühlung gibt es noch keine eigenen Klänge, und die
Lautstärke folgt nicht dem Bildausschnitt.

**Empfehlung:** wie bei Marble Works weiche Klänge mit fester Mischung statt Einmessen auf −14 LUFS, ein leiser
Dauerklang der Halle, je Station ein eigener Klang, Lautstärke nach Bildausschnitt.

### Beschriftungen: Einschätzung

Die neun Leuchtschilder helfen bei der Reihenfolge, sind aber so hell wie der Titel und konkurrieren mit den
Kugeln. Vorschlag: Nummer hell, Wort gedämpft, insgesamt kleiner; nur das Schild der Station, an der die Kamera
gerade ist, leuchtet voll. Die kleinen Messingschilder sind am Handy nicht lesbar und bleiben reine Zierde.
Schreibweise vereinheitlichen: derzeit „COLOUR“ (Schild) neben „COLOR SORTER“ (Messingschild).

## Nächster Schritt

Rückmeldung des Nutzers zu den Testclips abwarten (Bewegung, Kamera, Ton, Beschriftung, Hochformat als Fahrt).
Danach: Ton nach der Empfehlung oben, Beschriftungen beruhigen, dann echte Warteschlangen und Physik.
