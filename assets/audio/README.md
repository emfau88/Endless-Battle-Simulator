# Sounds

Alle Dateien stammen unverändert aus **Kenney – Impact Sounds (1.0)**, www.kenney.nl, Lizenz **Creative Commons Zero
(CC0)**. Der Lizenztext des Pakets liegt als `KENNEY_LICENSE.txt` bei. Quelle lokal:
`Dokumente/kenney/kenney_impact-sounds/Audio/`.

| Datei | Verwendet für (Kugelfabrik) |
|---|---|
| `impactGlass_light_000.ogg`, `_001`, `_002` | Kugeln stoßen im Glasbehälter aneinander (`tick`) |
| `impactGlass_medium_000.ogg`, `_001` | Kugel fällt in den Behälter (`hopper`), Aufprall in der Farbröhre (`clink`, je Farbe anders gestimmt) |
| `impactMetal_light_000.ogg` | Zellenrad nimmt eine Kugel auf (`pick`) |
| `impactMetal_light_001.ogg` | Ventil gibt frei (`valve`), Aufzug nimmt eine Kugel auf (`lift`, tiefer gestimmt) |
| `impactPlate_light_000.ogg` | Klappe öffnet (`flap`) |
| `impactSoft_medium_000.ogg` | Kugel landet auf dem Förderband (`belt`) |
| `impactTin_medium_000.ogg` | Kugel fällt auf die Sammelschiene (`rail`) |

| `impactWood_medium_000.ogg`, `_001`, `impactWood_heavy_000.ogg` | Seeschlacht: Treffer am Schiff (`hit`) |

Zwei Klänge der Seeschlacht stammen nicht aus Dateien, sondern werden in `lib/audio.mjs` erzeugt:
`synth:cannon` (dumpfer Kanonenschuss) und `synth:splash` (Platscher).

Die Zuordnung steht in der Klangtabelle des Szenarios (`audio` in `src/scenarios/marble.js` und `src/scenarios/naval.js`). Motor- und
Rollgeräusche enthält das Paket nicht; sie fehlen vorerst.
