# Marble Factory XL: Stufe 1 (Vorschau)

Stand: 16.11.2026. Branch `marble-xl/stufe-1`. Gehört zu R35 und zum
[Gesamtplan, Abschnitt 9](GESAMTPLAN_2026-11-16.md). **Status: erster Prototyp abgelehnt; Entwurfsbild der
Produktionslinie vom Nutzer als richtige Richtung bestätigt; Bau noch nicht beauftragt.**

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

## Besprochene Verbesserungen (noch nicht umgesetzt)

1. **Tiefe statt Deko:** leere Wandflächen mit einer dunklen, kontrastarmen Hintergrundebene füllen (ferne
   Rohrbrücken, Maschinen, Fenster), nicht mit hellen Einzelteilen.
2. **Ruhige, funktionale Details:** Wandlüfter, Dampf an der Waschtrommel, Hitzeflimmern über dem Ofen,
   Kabel- und Rohrtrassen von den Maschinen zur Decke, Schaltschränke. Höchstens ein bewegtes Detail je leerer
   Fläche, nichts heller als die Kugeln.
3. **Platz freihalten** für die zweite Linie und spätere Ausbauten (unter dem Ofen, rechts unten).
4. **Verwandlung deutlicher:** stärkere Unterschiede zwischen roh, gewaschen und poliert.
5. **Farbstation als Höhepunkt:** größere Glaskammer, sichtbarer Farbstrahl.
6. **Lichtzonen je Station** (Ofen orange, Kühlung blau, Wäsche türkis), die übrige Halle etwas dunkler.
7. **Weg lesbarer:** Richtungsmarken an den Rohren, klare Anschlüsse an Trommel und Radaufzug.
8. **Hochformat** für Shorts fehlt noch (drei Ebenen übereinander).

## Nächster Schritt

Nach Freigabe des Nutzers: Verbesserungen ins Entwurfsbild einarbeiten oder die Grundlinie mit Simulation bauen
(Vorrat, Aufzug, Behälter, Polierer, Sortierröhren) und einen 20-Sekunden-Clip zeigen.
