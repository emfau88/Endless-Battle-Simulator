# Endless Waterpark: Optik nach dem Mockup – Abschlussbericht

Stand: 16.11.2026, Branch `codex/waterpark-mockup` (gepusht, nicht in `main`, kein PR).
Grundlage: [Optik-Plan „so gut wie das Mockup“](WASSERPARK_MOCKUP_PLAN_2026-11-16.md), Pakete P1–P9.

Dieser Bericht beschreibt P7–P9 und die Schlussabnahme im Detail. P1–P6 stammen aus einer früheren
Sitzung und sind hier nur über ihre Commits aufgeführt.

## Ergebnis in Bildern

| Blatt | Zeigt |
|---|---|
| [Mockup und Endstand](reference/waterpark-mockup-nachher-tag-2026-11-16.jpg) | Tag im Querformat neben dem Mockup |
| [Tiergröße in der Lagune](reference/waterpark-mockup-tiergroesse-2026-11-16.jpg) | Mockup, 1,45-fach, gewählt 1,2-fach, ohne Vergrößerung |
| [Hochformat vorher/nachher](reference/waterpark-mockup-hochformat-2026-11-16.jpg) | alter und neuer Grundriss, Short bei 8 s und 29 s, Parktag |
| [Abend, Nacht, Finale](reference/waterpark-mockup-abend-nacht-2026-11-16.jpg) | Dämmerung vorher/nachher, Nacht, Brunnenshow |
| [Lesbarkeit bei 390 px](reference/waterpark-mockup-handy-390px-2026-11-16.jpg) | beide Formate auf Handybreite |

Vollbilder liegen unter `output/waterpark-mockup/final/` (nicht im Repository).

## Pakete und Commits

| Paket | Inhalt | Commit |
|---|---|---|
| P1 | Wippe mit Gegengewicht und Anschlägen, Rinnen mit Seitenwand | `6078d68` |
| P2 | Palette des Mockups | `6d7f841` |
| P3 | Halbtotale, Tiergröße 36/38, breite Rinnen | `07f377a` |
| P4 | Bauteile in 2,5D | `a591406` |
| P5 | Wasser als Hauptdarsteller | `c36ca2f` |
| P6 | Kulisse mit Tiefe | `15be041` |
| P7 | Tiere in Lagune, auf dem Deck und im Becher | `23f28b7` |
| P8 | Hochformat mit Turm als Mittelachse | `8182eee` |
| P9 | Abend, Dämmerung und Nacht für die helle Palette | `8490f14` |

## P7 · Tiere

- **Größe geprüft.** Am Bauwerk sind die Tiere 72 px groß, das sind 6,7 % der Bildhöhe (Mockup etwa 7 %).
  Das Verhältnis Tier zu Rinnenbreite ist mit 63 % dasselbe wie im Mockup. In der Pyramide sind es 36 px (3,3 %).
  Am Bauwerk sind die Tiere also nicht zu groß.
- **Lagune.** Der Plan sah vorn eine Vergrößerung bis 1,45 vor (104 px). Das wirkte neben normal großen Tieren
  wie „Riesenkugeln“. Nach Vorschau hat der Nutzer **1,2-fach** gewählt (höchstens 86 px).
- Wasserband mit bewegter Wellenkante über dem unteren Körperdrittel, Winken in der Lagune (30 % der Zeit) und
  auf dem Deck (20 %), Becherkante im Lift tiefer, damit sie kein Gesicht verdeckt.

## P8 · Hochformat

Auf Wunsch des Nutzers ohne 9:16-Mockup, direkt in der Bildsprache des 16:9-Mockups.

**Neuer Grundriss:** Der Turm steht auf der Mittelachse. Jede Attraktion hat ihre eigene Spur, nichts kreuzt sich.

- Links außen die Panoramarutsche als Serpentine mit fünf Bögen.
- Links und rechts am Turm je eine steile Rinne: die Sprungrutsche und der Zulauf zum Trichter.
- Rechts oben hängt die Wippe unter dem Deck. Ihr Auslauf läuft außen um den Trichter herum.
- Der Trichter sitzt eine Etage tiefer, sein Glasrohr führt in einem Bogen zum Auffangbecken.

**Die vier bekannten Probleme:**

| Problem | Lösung |
|---|---|
| Wippen-Zulauf kreuzt den Trichter | Wippe sitzt jetzt über dem Trichter und braucht keinen langen Zulauf mehr |
| Panoramarutsche und Trichterrohr ragen in den Turm | eigene Spuren, die Rinnen am Turm halten knapp 20 px Abstand |
| Zu wenige Trichterfahrten | Wasserlauf taucht zwischen zwei Buchten in die Lagune ab (siehe unten) |
| Sprungsockel zu hoch | Sockel 39 px hoch (vorher 122 px, Querformat 35 px) |

**Fahrten im Hochformat** (Parktag, 16 Tiere, 600 s, Seed 42; Panorama / Trichter / Wippe / Sprung):

| | Fahrten | je Attraktion |
|---|---|---|
| vorher | 211 | 138 / 11 / 34 / 28 |
| nachher | 234 | 120 / 47 / 43 / 24 |
| zum Vergleich Querformat | 212 | 104 / 39 / 40 / 29 |

Ursache waren die eng liegenden Landebuchten: Die Simulation reserviert eine Bucht nur, wenn im Wasserlauf
2,5 Tierabstände frei sind. Im schmalen Hochformat blockierten sich benachbarte Buchten. Jetzt taucht der
Wasserlauf zwischen zwei Buchten in einem Bogen in die Lagune ab. So ist der Weg von Bucht zu Bucht lang genug.
Die Panoramabucht bleibt wie im Querformat die letzte im Wasserlauf, weil dort bis zu drei Tiere hintereinander landen.

**Abweichungen vom Plan, mit Grund:**

- Der Plan wollte die Sprungrutsche ganz rechts und die Wippe unter dem Trichter. Das passt bei 1080 px Breite
  und 122 px breiten Rinnen nicht ohne Kreuzung. Außerdem läge der Sprung rechts unten unter der Bedienleiste
  von Shorts.
- Statt „zwei großer Bögen“ hat die Panoramarutsche fünf kleinere. Für große Bögen fehlt die Breite.
- Der Fahrtenzähler steht im Hochformat links oben statt in der Mitte, der Mond rechts oben. In der Mitte steht
  jetzt das Turmdach.
- P8 ändert `layout.js` (nur den Hochformat-Grundriss). Das Querformat ist unverändert: gleiche Zustands-Hashes,
  Bilder nach P8 pixelgleich.

## P9 · Abend und Nacht

- **Dämmerung war rosa.** Unter dem alten Magenta-Ton wurden die cremefarbenen Rinnen, Decks und Mauern
  bonbonrosa. Jetzt: Sonnenuntergang als schwächeres Goldpfirsich, Dämmerung als weiches Lavendelblau.
- **Schaum bleibt weiß.** Das Nachtlicht ist blau statt violett.
- **Lagune nachts tiefes Türkis** statt Marineblau.
- Morgen und Tag sind unverändert.

## Messwerte

Zeichenzeit bei 1080p, Mittel über 300 Bilder, nur `paint()`:

| Szene | Zeit je Bild | Budget |
|---|---|---|
| Tag quer | 1,44 ms | 2,5 ms |
| Nacht quer | 2,40 ms | 4 ms |
| Finale quer mit Show und Feuerwerk | 2,10 ms | 4 ms |
| Short hoch, Tag | 1,28 ms | 2,5 ms |
| Short hoch, Finale | 1,91 ms | 4 ms |

## Prüfungen

- Nach P7 und nach P8: Wasserpark-Tests und `critter-art` bestanden (30 von 30, nach P8 zusätzlich ein neuer
  Hochformat-Test), `npm run golden` „identisch mit der Referenz“, `scripts/waterpark-review.mjs` bestanden.
- Eigene Prüfung in jedem Simulationsschritt (statt alle zwei Sekunden) für fünf Hochformat-Einstellungen:
  keine Prüffehler.
- Nach P9 (reine Darstellung): nur `waterpark-review.mjs --waterpark-only` und die Zeitmessung.
- **Nicht gelaufen:** der vollständige `npm test` am Ende. Der Nutzer hat während der Arbeit verlangt, die Tests
  auf das Nötigste zu beschränken.
- **Nicht gemacht:** kein MP4-Export des Endstands, keine Hör- und Handyabnahme. Die Farbmessung aus P2 liegt aus
  der früheren Sitzung nicht vor und wurde nicht wiederholt.

## Grenzen

- Der Abstand der Schwimmer im Querformat ist noch für die 1,45-fache Größe ausgelegt (Simulation, P3).
  Mit 1,2-fach schwimmen sie etwas weiter auseinander als nötig.
- Das Hochformat ist für Tiergröße 36–38 ausgelegt. Bei 44 berühren sich Rinnen.
- Im Hochformat schwimmen die Tiere am Beckenrand in Bögen von Bucht zu Bucht.
- Im Short sind alle vier Fahrten nach etwa 13 Sekunden vorbei. Die zweite Hälfte zeigt nur noch Treiben,
  Abend und „Gute Nacht“.

## Einschätzung und Vorschläge

**Gegenüber der Pyramide:** Der Wasserpark ist heller, bunter und lebendiger, und die Tiere sind doppelt so groß.
Auf dem Handy ist das ein klarer Vorteil. Der Pyramide fehlt dafür nichts an Ruhe: Sie hat eine einzige große Form
und ein sichtbares Ziel (Fortschrittsbalken). Beides fehlt dem Wasserpark noch.

Vorschläge, nach erwarteter Wirkung auf YouTube sortiert:

1. **Short straffen.** Die Handlung endet bei 13 von 30 Sekunden. Besser: zweite Runde, alle vier gleichzeitig
   oder ein gemeinsamer Schlusssprung, und ein Ende, das nahtlos in den Anfang übergeht.
2. **Sichtbares Ziel im Langvideo.** Zum Beispiel „Fahrten bis zur Show“ mit Balken oder ein kleines Ereignis alle
   50 Fahrten. Das gibt einen Grund, dranzubleiben.
3. **Anzeige auf Englisch** wie in der Pyramide. Der Kanal richtet sich nicht nur an deutsche Zuschauer.
4. **Brunnenshow am Ende: ja.** Sie ist der Lohn für das Zuschauen. Wasserspiele tagsüber: ja, aber kurz und
   selten (alle 40–60 Sekunden ein Stoß), als Rhythmus für lange Videos.
5. **Mehr Ausdruck auf den Rutschen.** Offene Münder im Fall, größerer Platscher bei der Landung, eine Sprechblase
   nach dem Trichter. Das geht über die Posenwahl im Renderer, ohne die gemeinsame Tiergrafik anzufassen.
6. **Lagune beleben.** Unten liegt viel ruhige Fläche: Schwimmreifen, Wasserball oder kleine Wellen.
7. **Auffangrinne der Wippe im Querformat** wirkt als kurzer schräger Stummel fremd. Ein kurzes Becken wie beim
   Trichter wäre sauberer.

## Offene Entscheidungen des Nutzers

- Wasserspiele tagsüber
- Ende mit Brunnenshow
- Sprache der Anzeige (Deutsch oder Englisch)
- Zusammenführen nach `main`
