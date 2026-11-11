# Naval Battle: Querformat für Vollbild-Videos

**Datum:** 12.11.2026 · **Ausgangs-Commit:** `4ebca00` (B01) · **Branch:** `naval-querformat`
**Betroffene Datei:** `src/scenarios/naval.js`, Funktion `computeLayout()`. Gilt nur für Querformat mit zwei Schiffen;
Hochkant, Quadrat und Aufstellungen mit drei oder vier Schiffen sind unverändert.

## Ziel

Im Vollbild sollen Proportionen und Flächen angenehm sein und die Schüsse gut zu verfolgen. Dass sich die Physik in
diesem Format verschiebt, war ausdrücklich erlaubt.

## Was geändert wurde

| Größe | vorher | nachher | Wirkung |
|---|---|---|---|
| Abstand der Schiffsmitten | 46 % der Bildbreite (883) | 62 % (1190) | offene Bildmitte, in der die Flugbahnen liegen |
| Rumpflänge | 430 | 400 | etwas mehr Luft über den Masten |
| Wasserlinie | 60 % der Bildhöhe | 66 % | mehr Himmel für die Bögen, weniger Unterwasserfläche |
| Abflachung der Schüsse | Faktor 0,95 | 0,90 | Bögen bleiben trotz größerem Abstand im Bild |

Die Schussgeschwindigkeit hängt am Abstand und passt sich von selbst an.

## Bildaufteilung (aus den Bildern abgelesen, gerundet)

| Bereich | vorher | nachher |
|---|---|---|
| Lücke zwischen den Bugspitzen | etwa 14 % der Breite | etwa 34 % |
| Freier Rand je Seite | etwa 14 % | etwa 5 % |
| Himmel über der Wasserlinie | 60 % der Höhe | 66 % |

Bilder: [vorher](nachweise/naval_quer_vorher.png) · [nachher](nachweise/naval_quer_nachher.png)
(1920×1080, Seed 42, nach 20 s). Clip (lokal): `output/naval_querformat_nachher_10s.mp4`.

## Messwerte (3 Seeds, je 5 Minuten Simulationszeit)

| | vorher | nachher |
|---|---|---|
| Trefferquote | 71–75 % | 69–77 % |
| Flugzeit oberhalb des Bildrands | 0,11–0,15 % | 0,05–0,18 % |
| Flugzeit seitlich außerhalb | 0,04–0,11 % | 0,37–0,42 % |
| Notfall-Rückführungen in 5 Minuten | 11–15 | 13–21 |
| Schaden nach 5 Minuten | 13–14 % | 13–14 % |

## Tests

| Lauf | Ergebnis | Dauer |
|---|---|---|
| `test/sim.test.mjs` + `test/golden.test.mjs` + `test/core.test.mjs` | 19/19 | 91 s |
| `test/export.test.mjs` + `test/live.test.mjs` + `test/config.test.mjs` | 19/19 | 84 s |

**Referenz-Hashes:** Vor dem Neuschreiben wichen genau die acht Einträge für Naval 16:9 ab; Naval 9:16 und alle
Marble-Einträge waren identisch. Die acht Einträge wurden bewusst neu gesetzt.

## Offen

- Kugeln fliegen gelegentlich hinter den Lebensbalken am oberen Rand durch.
- Etwas mehr Kugeln verlassen das Bild kurz seitlich (hinter den Schiffen), weil die Schiffe näher am Rand stehen.
- Die Aufzugsrohre stehen jetzt nah an den Bildrändern.
- Den Clip habe ich nicht in Echtzeit angesehen; beurteilt wurden Einzelbilder und Messwerte.
- Die Vorlage `presets/naval-landscape-10min.json` nutzt das neue Layout automatisch; ein langes Video habe ich nicht gerendert.
