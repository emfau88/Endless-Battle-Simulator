# Sounds

## Pyramid · ruhiger Wasserhintergrund

`pyramid-water-loop.wav` enthält die freigegebene, bereits bearbeitete Stereo-Aufnahme
**Waves Lapping Shore.** von **Tom_Kaszuba**, [Freesound](https://freesound.org/people/Tom_Kaszuba/sounds/659002/), **CC0**.
Quelle, Verarbeitung und Prüfsummen stehen in `PYRAMID_WATER.json`.
Die Datei gehört zum Projekt; Exporte benötigen weder den Downloads-Ordner noch alte Exportdateien.

Die ersten 4 Sekunden laufen einmal, danach wiederholt sich der Bereich 4–67,2 Sekunden.
Er enthält bereits den 4-Sekunden-Übergang zum nächsten Durchlauf. Der Hintergrund bleibt Stereo
und wird vor einem eventuellen Videoausschnitt über die vollständige Episode gemischt.
Das Pyramiden-Profil verwendet die freigegebenen festen Pegel ohne anschließende Lautheitsanhebung.
Gesamtlautstärke wirkt auf Aktionen und Wasser; der zusätzliche Wasserregler nur auf den Hintergrund.
„Ton aus“ exportiert weiterhin ohne Tonspur. Andere Szenarien verwenden dieses Profil nicht.

Die ursprünglichen `impact*.ogg`-Dateien stammen unverändert aus **Kenney – Impact Sounds (1.0)**, www.kenney.nl, Lizenz **Creative Commons Zero
(CC0)**. Der Lizenztext des Pakets liegt als `KENNEY_LICENSE.txt` bei. Quelle lokal:
`Dokumente/kenney/kenney_impact-sounds/Audio/`.

## Marble Works · weiche Variante C

Marble Works verwendet die zwölf vorbereiteten `mw-soft-*.ogg`-Dateien; die Short-Karte von Territory Wars nutzt
daraus Holz, weichen Körper und mechanischen Kontakt (Marsch, Gefecht, Eroberung, Bunkerbau) mit demselben festen
Mischprofil, dazu die vorhandenen Syntheseklänge `synth:myco-pop`, `synth:myco-breeze` und `synth:myco-pling`. Die ursprünglichen
Samples bleiben unverändert. Als Basis dienen zwölf lokale Kenney-Aufnahmen aus dem Impact-Sounds-Paket;
ihre unveränderten Kopien und der originale CC0-Lizenztext liegen in `marbleworks-source/`.

Die Verarbeitung entfernt den harten Anschlag, senkt die Tonhöhe leicht, begrenzt Höhen und Klangdauer
und blendet die Enden weich aus. Gedämpfte Sinusresonanzen ergänzen den Körper ohne Rauschgenerator,
Hall oder lange Schleifen. Nach Angleichung der RMS-Pegel werden Glasquellen mit den Amplitudenfaktoren
0,88 Kenney / 0,12 Synthese gemischt, die übrigen Klänge mit 0,90 / 0,10. Diese Koeffizienten beschreiben
die Mischung, keine objektiven Prozentwerte der gehörten Klanganteile. Das Ergebnis bleibt Kenney-lastiger
als die erste separate Hörprobe C.

| Gruppe | Dateien | Verwendung |
|---|---|---|
| Glas | `mw-soft-glass-0/1/2.ogg` | Leise Kontakte, Rollen auf der Bahn, kurzer Abschluss |
| Holz | `mw-soft-wood-0/1/2.ogg` | Vereinzelung, Presse, Weiche und Ausbau |
| Mechanischer Kontakt | `mw-soft-switch-0/1.ogg` | Prüfung und Sortierung |
| Weicher Körper | `mw-soft-body-0/1.ogg` | Gummiprodukte |
| Gedämpftes Metall | `mw-soft-metal-0/1.ogg` | Stahlprodukte, ohne die bisherigen hellen Metallschläge |

`MARBLEWORKS_AUDIO.json` dokumentiert jede Quelle, Bearbeitung, Prüfsumme und den tatsächlich dekodierten
Pegel. Die Quellenlizenz ist CC0; Kenney verlangt keine Namensnennung, wird hier dennoch genannt.
Die ergänzende Synthese ist eigener Code in diesem Repository. Der Erzeugungsschritt verwendet
ausschließlich Node und das vorhandene FFmpeg; im Export werden die fertigen Dateien geladen.

```sh
node scripts/build-marbleworks-audio.mjs
node scripts/build-marbleworks-audio.mjs --check
```

`--check` erzeugt die PCM-Vorstufe erneut im Speicher und prüft Quellen-, PCM-, OGG- und dekodierte
PCM-Prüfsummen sowie Länge und Spitzenpegel. Bitgleiche Wiedererzeugung ist mit derselben dokumentierten
FFmpeg-Version geprüft; Encoder-/Decoder-Versionen können Unterschiede in komprimierten Dateien bewirken.
Die acht vorhandenen Klangrollen und Lautstärkeregler bleiben erhalten. Politur und Beschichtung erhalten
weiterhin keine Rauschspur. Die Kameraauswahl und der zurückhaltende Gesamtpegel werden separat im
Marble-Works-Mischprofil angewendet.

## Bestehende Originalklänge

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

### Scrap Wars · Ton „soft-v1“ (B2 „sauber“, mit Wind)

Mit dem Schalter `soundMix: 'soft-v1'` (Vorlagen Short und Langvideo) nutzt Scrap 21 gebackene Klänge
`scrap-b2-*.ogg` und die Windschleife `scrap-wind-loop.ogg`. Ohne Schalter bleibt der Ton oben unverändert.

Quellen sind 17 unveränderte Kenney-Dateien in `scrap-source/`: 14 aus „Sci-Fi Sounds“ (Laser, Kraftfeld,
tiefe Explosionen, Metallschläge) und 3 aus „Impact Sounds“ (schweres und mittleres Holz). Beide Pakete stehen
unter CC0; die originalen Lizenztexte liegen daneben (`KENNEY_SCIFI_LICENSE.txt`, `KENNEY_IMPACT_LICENSE.txt`).
Dazu kommt eigene Synthese ohne Zufall: Einrasten beim Aufheben, „Strom aus“ beim K.o., Fauchen der Rakete,
Bröseln der Kiste und der Wind.

| Gruppe | Dateien | Quelle und Bearbeitung |
|---|---|---|
| Blaster | `scrap-b2-blaster-0/1/2` | `laserSmall_000/004/003`, tiefer, dunkel gefiltert, gekürzt; je Roboter eigene Tonlage |
| Raketenstart | `scrap-b2-rocket-0/1` | `forceField_001`; Fauchen mit `forceField_003` |
| Explosion | `scrap-b2-blast-0/1` | `lowFrequency_explosion_001` mit gefiltertem `explosionCrunch_000/003` |
| Robotertreffer | `scrap-b2-hit-0/1/2` | `impactMetal_001/002`, gekürzt |
| Deckungstreffer | `scrap-b2-wood`, `-stone`, `-concrete` | `impactWood_heavy_000`, `impactMetal_004/000` gefiltert |
| Deckung zerstört | `scrap-b2-break-wood`, `-stone`, `-concrete` | `impactWood_heavy_002`, `explosionCrunch_002` gefiltert |
| K.o. | `scrap-b2-ko` | `lowFrequency_explosion_000` + `impactMetal_001` + „Strom aus“ |
| Aufnahme, Abwurf | `scrap-b2-pickup`, `scrap-b2-drop` | Einrasten (Synthese); `impactMetal_004` tief und gedämpft |
| Kisten | `scrap-b2-crate-land`, `scrap-b2-crate-break` | `impactWood_heavy_000` tief; `impactWood_medium_001` mit Bröseln |
| Wind | `scrap-wind-loop.ogg` | Synthese, Stereo, 1 s Vorlauf und 30 s nahtlose Schleife (4 s Überblendung) |

Jeder Klang wird lautheitsgleich gemacht und dann mit einem gemeinsamen Speicherfaktor abgelegt; die Pegel
stehen als Dezibel-Stufen in der Klangtabelle. Der Wind ist Stereo, weil FFmpeg sonst die ganze Mischung auf
Mono bringt. `SCRAP_AUDIO.json` verzeichnet Quellen-, PCM- und OGG-Prüfsummen, Längen, Spitzen und den
Exportpegel des Windes (−48 LUFS).

```sh
node scripts/build-scrap-audio.mjs
node scripts/build-scrap-audio.mjs --check
```

## Endless Mycelium

Die Klangtabelle in `src/scenarios/mycelium.js` nutzt aus dem Kenney-Paket nur `impactSoft_medium_000` (Blatt landet,
etwas höher gestimmt). Alle übrigen Klänge werden deterministisch in `lib/audio.mjs` erzeugt, weil kurze Glasklänge
bei den seltenen Ereignissen eines ruhigen Videos bis zu 24 dB Begrenzung erzwangen:
`synth:myco-seed` (Spore landet: schwebender Dur-Dreiklang), `synth:myco-pling` (Blatt aufgefressen: weicher
Glockenton, je Blatt einen Ton weiter auf der Dur-Pentatonik), `synth:myco-pop` (Pilz ploppt auf),
`synth:myco-breeze` (Sporenwolke: an- und abschwellendes Rauschen) und `synth:myco-night` (leise Nachtluft, 12 s mit
weicher Ein-/Ausblendung, alle 10 s ausgelöst und dadurch nahtlos).

Bei der Integration in den aktuellen Exporter wurde für Mycelium ein eigenes AAC-Profil gemessen:
keine M/S-/Intensitätsstereo-Kodierung und kein Rauschersatz, PCM-Grenze −3 dBFS. Die Einmessung auf
−14 LUFS und die strenge Nachprüfung des fertigen AAC bleiben erhalten. Dies gilt nur für Mycelium;
[Messung und gezielte Tests](../../docs/ALLE_SZENARIEN_INTEGRATION_2026-11-13.md).

## Endless Pyramid

Historischer Befund R27: Beim vollständigen 60-Sekunden-Tierchenablauf wurden bei
Standardlautstärke −14,1 LUFS einzelne AAC-Spitzen von +0,5 dBTP gemessen (PCM: −1,7 dBTP).
Für die damalige Integration wurde die Einschränkung akzeptiert;
[historischer Nachweis](../../docs/ALLE_SZENARIEN_INTEGRATION_2026-11-13.md).
Inzwischen verwendet Pyramid das oben beschriebene Profil `pyramid-water-v1` mit festem Pegel,
ruhigem Wasserhintergrund und Nachmessung des fertigen AAC. Der aktuelle R27-Stand steht in der
[Roadmap](../../docs/ROADMAP.md).

Die Klangtabelle in `src/scenarios/pyramid.js` verwendet dieselben unveränderten CC0-Dateien:
`impactSoft_medium_000` (Becher schöpft, höher gestimmt), `impactMetal_light_000` (Becher kippt aus) und
`impactGlass_light_000/001/002` (Leuchtkugel trifft eine Wendekappe). Der Platscher ist der vorhandene
erzeugte Klang `synth:splash`.

Neu in `lib/audio.mjs` und deterministisch im Code erzeugt: `synth:chime` (Glockenton des Lichtimpulses, vier
Teiltöne mit Abklingen; je Farbe um 0/4/7/12 Halbtöne versetzt), `synth:boing` (federnder Ton der Tierchen an
den Wendekappen), `synth:wheee` (auf- und absteigender Pfiff beim Fallen) und `synth:squeak` (kurzes Quieken,
wenn ein Becher ein Tierchen aufnimmt). Die drei Tierchen-Klänge erklingen nur in der Darstellung „Tierchen“.

Für Licht-Füllung und Finale, ebenfalls im Code erzeugt: `synth:fanfare` (aufsteigender Dur-Akkord aus vier
Glockentönen, wenn die Pyramide voll ist), `synth:launch` (leises Pfeifen der aufsteigenden Rakete) und
`synth:firework` (Knall mit Knistern; die große Schlussrakete klingt lauter).

## Endless Naval Battle · Modus „Ruhiges Duell“

Das Profil `naval-sea-v1` verwendet den vorhandenen `pyramid-water-loop.wav` als leises Meeresrauschen und
ausschließlich vorhandene CC0- und Syntheseklänge für Schuss, Treffer, Abpraller, Rakete, Goldtreffer,
Segeldurchschuss und Versenkung. Feste Pegel, keine Einmessung auf −14 LUFS, keine Musik. Die 10-Minuten-Episode
liegt bei −20,6 LUFS; Messwerte im [Bericht](../../docs/NAVAL_RUHIGES_DUELL_2026-11-16.md), Abschnitt 3e.

## Endless Waterpark

Das eigene Profil `waterpark-water-v1` verwendet den vorhandenen `pyramid-water-loop.wav`
als ruhigen Hintergrund und dieselben vorhandenen CC0-/Syntheseklänge für Lift, Rutschen,
Wippe, Sprung, Landung und Dekoration. Wasser und einzelne Ereignisse sind getrennt regelbar;
es kommt keine Musik hinzu. Die 20-s-Proben beider Formate erreichen im fertigen AAC −24,3 LUFS
und höchstens −7,0 dBTP. Konfiguration, Messwerte und Grenzen stehen im
[Wasserpark-Bericht](../../docs/WASSERPARK_UMSETZUNG_2026-11-16.md).
