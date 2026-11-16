# Marble Factory XL: Stufe 1 (Vorschau)

Stand: 16.11.2026. Branch `marble-xl/stufe-1`. Gehört zu R35 und zum
[Gesamtplan, Abschnitt 9](GESAMTPLAN_2026-11-16.md). **Status: lauffähiger Prototyp; inhaltlich vom Nutzer nicht
freigegeben (siehe Rückmeldung unten).**

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

## Nächster Schritt

Vorschau-Bild einer Produktionslinie mit neuen Maschinen im klassischen Stil, danach Stopp für die Freigabe.
