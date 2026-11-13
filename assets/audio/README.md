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
`impactWood_heavy_000` für zerstörte Holzdeckung und `impactTin_medium_000` für Waffenabwurf.
Deckungstreffer ohne Materialangabe behalten den Plattenklang; Holz verwendet `impactWood_medium_000/001`.
KOs verwenden `impactMetal_light_003` fünf Halbtöne tiefer.
Die Werkstatt verwendet den vorhandenen Pickup-Klang zwei Halbtöne tiefer.

`synth:scrap-blaster`, `synth:scrap-rocket`, `synth:scrap-blast` und `synth:scrap-pickup` werden deterministisch in
`lib/audio.mjs` erzeugt. Blaster und Raketen haben einen abfallenden Klangkörper mit gefiltertem Rauschen,
Explosionen einen längeren dumpfen Ausklang. Der Pickup behält den kurzen ansteigenden Prototypklang.
Es sind keine extern geladenen Samples und keine bitgleiche Kopie seiner WebAudio-Ausgabe.
Waffenarten werden aus dem Schussereignis gelesen (der Prototyp unterschied sie anhand
einer Effektgröße, die bei beiden Waffen über seiner Klangschwelle lag). Die vollständige Ereignisfolge
bleibt erhalten; dicht aufeinanderfolgende Blaster-, Treffer-, Deckungs-, Explosions- und Modulklänge
werden je Klangtyp im vorhandenen Mischer begrenzt. Auch Brüche haben nun einen gemeinsamen Mindestabstand
von 55 ms, damit mehrere zugleich zerstörte Blöcke keine Lautstärkespitze vervielfachen. KOs werden nicht unterdrückt.

V3-Treffer und -Brüche tragen `material`. Stein verwendet kurze, hellere Schlag-/Splitterklänge
(`synth:scrap-stone-hit/break`), Beton einen tieferen Körper mit längerem körnigem Ausklang
(`synth:scrap-concrete-hit/break`). Diese vier Klänge entstehen ebenfalls deterministisch aus Code, ohne neue
Fremdassets. Die vorhandenen Regler für Deckungstreffer und Zerstörung steuern weiterhin alle Materialien.
Fehlende oder unbekannte Materialien verwenden den bisherigen Fallback.

Die Pegel sind zugunsten lesbarer Waffenklänge neu abgestimmt; Metalltreffer und KOs überragen die Mischung
weniger. Nur Scrap verwendet 20 ms Begrenzer-Rücklauf statt 60 ms, damit kurze Kampfeffekte schneller ausklingen,
ohne eine lange Pegelabsenkung auf folgende Klänge zu übertragen. Die PCM-Grenze liegt für Scrap bei −3 dBFS:
Ein 15-Minuten-Audiolauf zeigte seltene AAC-Spitzen, die in den kurzen Clips nicht vorkamen. Das Ziel −14 LUFS
und die gemeinsame AAC-Spitzengrenze −1 dBTP bleiben erhalten. Messnachweise: `docs/SCRAP_AUDIO_PRODUKTION_2026-11-13.md`.

## Endless Mycelium

Die Klangtabelle in `src/scenarios/mycelium.js` nutzt aus dem Kenney-Paket nur `impactSoft_medium_000` (Blatt landet,
etwas höher gestimmt). Alle übrigen Klänge werden deterministisch in `lib/audio.mjs` erzeugt, weil kurze Glasklänge
bei den seltenen Ereignissen eines ruhigen Videos bis zu 24 dB Begrenzung erzwangen:
`synth:myco-seed` (Spore landet: schwebender Dur-Dreiklang), `synth:myco-pling` (Blatt aufgefressen: weicher
Glockenton, je Blatt einen Ton weiter auf der Dur-Pentatonik), `synth:myco-pop` (Pilz ploppt auf),
`synth:myco-breeze` (Sporenwolke: an- und abschwellendes Rauschen) und `synth:myco-night` (leise Nachtluft, 12 s mit
weicher Ein-/Ausblendung, alle 10 s ausgelöst und dadurch nahtlos).
