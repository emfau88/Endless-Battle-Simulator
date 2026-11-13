# Sounds

Alle Dateien stammen unverändert aus **Kenney – Impact Sounds (1.0)**, www.kenney.nl, Lizenz **Creative Commons Zero
(CC0)**. Der Lizenztext des Pakets liegt als `KENNEY_LICENSE.txt` bei. Quelle lokal:
`Dokumente/kenney/kenney_impact-sounds/Audio/`.

| Datei | Verwendet für |
|---|---|
| `impactGlass_light_000.ogg`, `_001`, `_002` | Kugeln stoßen im Glasbehälter aneinander (`tick`) |
| `impactGlass_medium_000.ogg`, `_001` | Kugel fällt in den Behälter (`hopper`), Aufprall in der Farbröhre (`clink`, je Farbe anders gestimmt) |
| `impactMetal_light_000.ogg` | Zellenrad nimmt eine Kugel auf (`pick`) |
| `impactMetal_light_001.ogg` | Ventil gibt frei (`valve`), Aufzug nimmt eine Kugel auf (`lift`, tiefer gestimmt) |
| `impactPlate_light_000.ogg` | Klappe öffnet (`flap`) |
| `impactSoft_medium_000.ogg` | Kugel landet auf dem Förderband (`belt`) |
| `impactTin_medium_000.ogg` | Kugel fällt auf die Sammelschiene (`rail`) |
| `impactWood_medium_000.ogg`, `_001`, `impactWood_heavy_000.ogg` | Seeschlacht: Treffer am Schiff (`hit`) |
| `impactGeneric_light_000.ogg`, `_001` | Seeschlacht: Kugel setzt am Meeresgrund auf (`land`, „Tock“, etwas tiefer gestimmt) |
| `impactMetal_light_002.ogg`, `_003` | Seeschlacht: Kugel kommt im Munitionsregal an (`reload`, „Tink“, etwas höher gestimmt) |

Zwei Klänge der Seeschlacht stammen nicht aus Dateien, sondern werden in `lib/audio.mjs` erzeugt:
`synth:cannon` (dumpfer Kanonenschuss) und `synth:splash` (Platscher).

Die Zuordnung steht in der Klangtabelle des Szenarios (`audio` in `src/scenarios/marble.js` und `src/scenarios/naval.js`). Motor- und
Rollgeräusche enthält das Paket nicht; sie fehlen vorerst.

## Scrap Wars

Die Klangtabelle in `src/scenarios/scrap.js` verwendet dieselben unveränderten CC0-Dateien:
`impactMetal_light_000/001` für Robotertreffer, `impactPlate_light_000` für Deckungstreffer,
`impactWood_heavy_000` für zerstörte Deckung und `impactTin_medium_000` für Waffenabwurf.
Explosion und KO nutzen den vorhandenen erzeugten Klang `synth:cannon` mit unterschiedlicher Stimmung.

`synth:scrap-blaster`, `synth:scrap-rocket` und `synth:scrap-pickup` werden deterministisch in
`lib/audio.mjs` erzeugt. Die kurzen abfallenden bzw. ansteigenden Oszillatorklänge orientieren sich am
bereitgestellten Scrap-Prototyp; sie sind keine extern geladenen Samples und keine bitgleiche Kopie seiner
WebAudio-Ausgabe. Waffenarten werden aus dem Schussereignis gelesen (der Prototyp unterschied sie anhand
einer Effektgröße, die bei beiden Waffen über seiner Klangschwelle lag). Die vollständige Ereignisfolge
bleibt erhalten; nur dicht aufeinanderfolgende Deckungstreffer werden im Mischer klanglich ausgedünnt.

## Endless Pyramid

Die Klangtabelle in `src/scenarios/pyramid.js` verwendet dieselben unveränderten CC0-Dateien:
`impactSoft_medium_000` (Becher schöpft, höher gestimmt), `impactMetal_light_000` (Becher kippt aus) und
`impactGlass_light_000/001/002` (Leuchtkugel trifft eine Wendekappe). Der Platscher ist der vorhandene
erzeugte Klang `synth:splash`.

Neu in `lib/audio.mjs` und deterministisch im Code erzeugt: `synth:chime` (Glockenton des Lichtimpulses, vier
Teiltöne mit Abklingen; je Farbe um 0/4/7/12 Halbtöne versetzt), `synth:boing` (federnder Ton der Tierchen an
den Wendekappen), `synth:wheee` (auf- und absteigender Pfiff beim Fallen) und `synth:squeak` (kurzes Quieken,
wenn ein Becher ein Tierchen aufnimmt). Die drei Tierchen-Klänge erklingen nur in der Darstellung „Tierchen“.
