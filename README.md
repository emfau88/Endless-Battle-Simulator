# Endless Battle Simulator

Acht deterministische Simulationen für Battle- und „Satisfying“-Videos mit Browser-Vorschau und MP4-Export inklusive Ton. Mit 2D-Szenen und einer 3D-Produktionsanlage in Marble Works.

**[▶ Online-Vorschau öffnen](https://emfau88.github.io/Endless-Battle-Simulator/)** · [Produktionsvorlagen](presets/production/) · [Roadmap](docs/ROADMAP.md) · [Changelog](docs/CHANGELOG.md)

[![Aktuelle Szenen: Naval Battle, klassische Kugelfabrik, Marble Works, Scrap Wars, Mycelium, Pyramid in der Lagune, Territory Wars und Pyramid in der Wüste](docs/images/scenarios.jpg)](docs/images/scenarios.jpg)

*Echte Aufnahmen aus dem Projekt. Zum Vergrößern anklicken; die Wüsten-Baustelle ist eine Variante von Pyramid.*

[![Endless Waterpark im Querformat (Parktag) und im Hochformat (Vier-Tiere-Short)](docs/images/waterpark.jpg)](docs/images/waterpark.jpg)

*Neu: **Endless Waterpark**, das achte Szenario. Links der Parktag im Querformat, rechts der Short im Hochformat.*

## Szenarien und Varianten

Die folgenden Szenarien und Varianten sind im aktuellen Code vorhanden. Weitere Regler steuern Mengen, Tempo, Kamera, Effekte und Ton.

| Szenario | Inhalt und wählbare Varianten | Videoende / Ausschnitte |
|---|---|---|
| **Endless Naval Battle**<br>`naval` | Seeschlacht mit **2, 3 oder 4 Schiffen** und Kanonenkugel-Kreislauf. Optional: goldene Kugel, Himmelsverlauf, Sternschnuppen und Wal.<br>**Modi:** Endlos (Standard); Ruhiges Duell (in Arbeit, `--param mode=calm`) mit zwei Kanonen je Schiff, halbem Tempo, kleineren Schiffen und Segelschäden; gespielt in Runden mit Versenkung und Punktestand. Im ruhigen Duell lässt sich ab 90 Sekunden „Finale am Videoende (Vorschau)“ zuschalten. | Freie Dauer |
| **Endless Marble Factory**<br>`marble` | Klassische Kugelfabrik mit geschlossenem Sortierkreislauf; eigenes Hoch- und Querformatlayout. **20–35 Kugeln**, 1–3 Kugeln je Farbröhre. | Freie Dauer |
| **Marble Works · Progressive Factory**<br>`marbleworks` | 3D-Fabrik mit Produktionsauftrag und zwei Ausbauten.<br>**Material:** Glas, Stahl, Gummi, Materialvergleich.<br>**Veredelung:** Farbspirale, Klarglas / Vollton, Perlmutt.<br>**Kollektion:** Spektrum, Ozean, Glut.<br>Aufträge mit 24–360 Kugeln; automatische Kamera, Übersicht oder manuelle Ansicht. | Auftrag + Finale oder freie Dauer; **Clip-Export** |
| **Scrap Wars**<br>`scrap` | Roboterkämpfe.<br>**Arenen:** Scrapyard, Foundry, Crossroads, Sunny Yard. Scrapyard und Sunny Yard haben in V3 einen eigenen Hochformat-Grundriss.<br>**Regeln:** Taktik-Arena (`v4`: Startkisten, Zielwahl, Wegfindung; Vorlagen nutzen sie), Materialarena (`v3`), bisherige Arena (`v2`), Originalprototyp (`classic`); Sunny Yard nutzt V3 oder V4.<br>**Modi:** freie Videolänge mit optionalen Folgerunden oder Turnier mit insgesamt 8 Runden.<br>Experimentelle Turnier-Werkstatt mit Plating, Drive oder Capacitor.<br>**Bildaufbau:** normal oder Short (nur Hochformat, Taktik-Arena auf Sunny Yard): kleine Karte ohne Kopfleiste, eine Runde, der Blaster lädt von selbst nach, Raketen kommen als drehende Münzen nur von den zwei Plattformen, das Video endet 2,5 Sekunden nach dem Sieg.<br>**Waffen** (nur Taktik-Arena): klassisch oder nur Raketen wie im Short (`items=rockets`); die Langvideo-Vorlage nutzt die Raketen-Regeln auf einem geprüften Turnier-Seed.<br>**Ton:** weich mit leisem Wind (`soft-v1`, Vorlagen nutzen ihn) oder bisheriger Ton. | Freie Dauer oder vollständiges Turnier; **Clip-Export** |
| **Endless Mycelium**<br>`mycelium` | Wachstumszyklus aus Myzel, Laub, Pilzen und Sporen mit neuen Generationen.<br>**Farben:** Wechselnd (Mint, Violett, Bernstein, Blau), Nur Mint, Kühle Töne, Warme Töne. | Freie Dauer |
| **Endless Pyramid**<br>`pyramid` | **Kulissen:** Glaspyramide in der Lagune oder Wüsten-Baustelle mit wachsender Pyramide.<br>**Figuren:** Leuchtkugeln oder Tierchen (Küken, Pinguin, Schweinchen, Frosch).<br>Tageslauf, Lichtfüllung / Aufbau und Feuerwerk einstellbar. | Freie Dauer; Tageslauf und Finale konfigurierbar |
| **Territory Wars · Hex Dominion**<br>`territory` | Vier Reiche auf einer Hexkarte.<br>**Profile:** Ruhiger Aufbau, Gebietskrieg, Intensive Front, Blitz (Short), Eigene Einstellungen.<br>**Karten:** Querformat, Hochformat und eine kleine Short-Karte mit Drehbuch „Die letzte Krone“ (ein ganzer Krieg in rund 30 Sekunden).<br>**Anzeige:** voll, schlank für Shorts oder aus. **Einheiten:** Panzer wie im Original oder Speerträger. Perspektive oder Draufsicht; optionale Folgerunden. | Freie Dauer oder bis zum Sieg |
| **Endless Waterpark**<br>`waterpark` | Die vier Pyramid-Tierchen (Küken, Pinguin, Schweinchen, Frosch) in einem hellen Oasen-Wasserpark. Ein gläserner Becherlift bringt sie auf das Startdeck.<br>**Vier Attraktionen:** Panoramarutsche, Trichter mit Glasrohr, Wippe mit Gegengewicht und Anschlägen, steile Rutsche mit Sprungbrett. Alle enden in der Lagune, der Rücklauf zum Lift ist sichtbar.<br>**Eigener Grundriss je Format:** Halbtotale im Querformat; im Hochformat steht der Turm in der Mitte und jede Attraktion hat ihre eigene Spur.<br>Tageslauf bis in die Nacht, Öffnungsprogramm, Wasserspiele in der Lagune, UFO und weitere Himmelsgäste, springende Fische, Sprechblasen, ruhiger Wasserklang. Anzeige im Video englisch; der Titel ist abschaltbar und standardmäßig aus. | Vier-Tiere-Short, Parktag mit Fontänenshow in bunten Farben oder Abendruhe, oder Dauerbetrieb; Vorprüfung für endliche Filme |
| **Cloud Wars** (in Arbeit)<br>`cloudwars` | Vier Team-Wolken (Nimbus, Cirrus, Cumulus, Stratus) über einer Landschaft von oben: Sie fressen kleinere Wolken, wachsen, werden zu Gewittern, schießen Blitze und setzen Wälder in Brand; die Feuerwehr rückt aus.<br>**Short** „Which cloud rules the sky?“ mit verdeckter Regie (meist 30–40 s, hochkant). **Langvideo** in Runden mit Punktestand, Tageslauf bis in die Nacht und Wetter (Morgennebel, Hitzewelle, Sturmfront).<br>Beim Fressen zieht ein Sog in Teamfarbe das Opfer zum Stärkeren, Gesichter zeigen Hunger und Schreck. Dörfer mit Dorfplatz und Gärten, strömender Fluss mit Booten, Traktor auf dem Feld, Schafe und Kühe, Autos, Vögel und Lichter bei Nacht; Anzeige voll, schlank, nur Einblendungen (hochkant) oder aus; Texte im Video englisch. [Plan](docs/CLOUD_WARS_PLAN_2026-11-18.md) · [Bericht](docs/CLOUD_WARS_2026-11-18.md) | Short bis zum Sieg (24–60 s) oder freie Dauer; **Clip-Export** |
| **Endless Burrow** (in Arbeit)<br>`burrow` | Würmer graben sich durch die Erde, von oben gesehen: Sie fressen Gartenfutter (Samen, Beeren, Blätter, Pilze, Larven) und kleinere Würmer und wachsen. Groß frisst Klein; die Beute bleibt als Bröckchen in ihrer Farbe liegen und schlüpft bald klein wieder. Acht Wurmarten mit eigenem Muster, Augen und Extras (Tigerstreifen mit Hörnern, Panzerplatten mit Zangen, Borstenbeine mit Stielaugen …), frische Tunnel verblassen langsam, der Größte trägt eine Krone.<br>**Regler:** Würmer (8–20), Futtermenge, Wachstum. Querformat mit Rangliste „BIGGEST WORMS“, Hochformat ohne Rahmen. Noch ohne Ton und Vorlagen. [Bericht](docs/BURROW_2026-11-25.md) | Freie Dauer; **Clip-Export** |

[![Cloud Wars im Querformat (Runden mit Morgennebel) und im Hochformat (Short)](docs/images/cloudwars.jpg)](docs/images/cloudwars.jpg)

**In Arbeit:** **Marble Factory XL** (`marblexl`) ist eine Produktionslinie mit neun Stationen im Stil der klassischen Kugelfabrik (Waschen, Polieren, Ofen, Farbe, Trocknen, Prüfen, Sortieren). Bewegter Entwurf im Querformat mit fester Übersicht, läuft in Chargen zu 48 Kugeln beliebig lange durch, noch ohne Warteschlangen, Kapitel und Vorlagen; Schalter „Schilder zeigen“ (Standard aus). Stand und Grenzen: [docs/MARBLE_XL_STUFE_1_2026-11-16.md](docs/MARBLE_XL_STUFE_1_2026-11-16.md).

**In Arbeit:** **Marble Knockout** (`knockout`) ist ein Murmel-Ausscheidungsrennen im Stil „Holz & Abendlicht“: 12 Murmeln, 10 Bahnen, auf jeder scheidet die Letzte aus, das Finale zu dritt endet mit Podest. Die Bahnen: The Drop, Turnstiles, The Wheel, Crumbling Bridge, Tilt, The Drum, Hammer Alley, Shifting Floors, Ring Escape, Grand Final. Eigener Physik-Kern mit gleichem Ergebnis in Node und Chromium. Ablauf „Ganzes Rennen“ (Querformat, Länge automatisch bis zum Podest, Kapitelzeiten), „Eine Bahn“ und „Galerie der Bausteine“ (21 Elemente). Zeitlupe bei knappen Entscheidungen. Ton aus weichen Marble-Works-Klängen mit fester, leiser Mischung (rund −24 LUFS). Shorts im Hochformat mit 8 Murmeln auf 3 Bahnen in drei Fassungen (A „Pick your color!“, B „Follow the gold one!“, C „Who survives the floors?“), geprüfte Seeds aus `scripts/knockout-casting.mjs`. Das Rennen Bahn für Bahn hat eigene gecastete Drehbücher (ein Seed je Bahn: Außenseiterin aufs Podest, Sturz auf Bahn 7, Fotofinish). Ablauf „Gesamtlevel mit Kamerafahrt“: ein großes zusammenhängendes Level je Format mit Quoten-Schleusen und mitfahrender Kamera. Fertig ist das Hochformat „THE TOWER“ (16 Murmeln, drei Abschnitte, Ziel mit Fotofinish, rund 37 s; die Short-Vorlage nimmt einen geprüften Seed aus `scripts/knockout-casting.mjs --level tower`). Ebenfalls spielbar ist das Querformat „THE GAUNTLET“ (20 Murmeln, Kamera wahlweise „Fahrt“ oder „Abschnitte“) mit zehn Abschnitten: Nagelwand, Drehkreuze mit freiem Fall durch einen Schacht, Riesenrad, einstürzende Brücke, Kippbretter, Weiche mit Drehtrommel, Hammergasse, wandernde Böden, Ringausbruch und ein Finale zu dritt mit Starttor („FINAL SPRINT“), Nagelfeld und Fotofinish. Zu Beginn fliegt die Kamera einmal über das ganze Level (abschaltbar), am Ende steht das Podest; rund 3:20 min. Vorlagen: „Short“ ist THE TOWER, „Langvideo“ sind zwei Rennen durch THE GAUNTLET mit Gesamtwertung (Punkte 25 bis 1 für die ersten zehn, Tabelle nach Rennen 1 und am Schluss, Podest der Gesamtwertung, rund 7 min, Export in 1440p mit 60 fps). Jedes Rennen folgt einem gecasteten Drehbuch (`scripts/knockout-casting.mjs --story`, ein Seed je Abschnitt: Die Außenseiterin entkommt dreimal knapp und kämpft im Fotofinish um den Sieg, ein Favorit stürzt in der Hammergasse), die Paarung kommt aus `scripts/knockout-casting.mjs --series`. Ein einzelnes Rennen bleibt über „Rennen im Querformat“ wählbar ([Gesamtlevel-Plan](docs/MARBLE_KNOCKOUT_GESAMTLEVEL_PLAN_2026-11-25.md)). Das Rennen „Bahn für Bahn“ mit den Short-Fassungen A bis C bleibt über „Ablauf“ wählbar. [Plan](docs/MARBLE_KNOCKOUT_PLAN_2026-11-25.md) · [Bericht](docs/MARBLE_KNOCKOUT_2026-11-25.md)

## Was lässt sich exportieren?

**Alle acht Szenarien samt Varianten** unterstützen den Videoexport.

| Ausgabe | Möglichkeiten |
|---|---|
| **Video** | MP4 / H.264, optional mit AAC-Ton (48 kHz, Stereo); Lautstärke gesamt und je Klang einstellbar |
| **Bildformat** | 9:16 und 16:9; zusätzlich 1:1 (nur per Konfiguration / Kommandozeile). Quadrat nutzt teils ein eingepasstes Querformatlayout. |
| **Qualität** | 720p, 1080p, 1440p oder 4K (kurze Bildseite); 30 oder 60 fps. |
| **Länge** | Frei von 1 Sekunde bis 4 Stunden. Marble Works kann bis zum Auftragsende + 12 Sekunden Fabrikfinale laufen (bei Zeitlupe länger); Scrap-Turniere enden nach 8 Runden + 5 Sekunden Ergebnisanzeige, Scrap-Shorts 2,5 Sekunden nach dem Sieg. |
| **Ausschnitte** | Nur **Scrap Wars, Marble Works, Waterpark, Cloud Wars, Marble Knockout und Endless Burrow** (Kommandozeilenfunktion). Der Ton stammt aus der vollständigen Episodenmischung. |
| **Einzelbild** | PNG (Skriptfunktion, kein eigener Button in der Oberfläche) |
| **Einstellungen / Wiederholung** | Einstellungen als JSON speicherbar. Jedes MP4 erhält außerdem eine JSON mit Konfiguration, Seed, Aufnahmeparametern, Prüfsummen und Programmstand. |

Die Online-Vorschau ist stumm und exportiert keine Videos. Gleiche Einstellungen und gleicher Programmstand ermöglichen reproduzierbare Simulationsabläufe; identische Pixel über verschiedene Renderer oder Versionen sind nicht garantiert.

### Fertige Video-Vorlagen

Für jedes Szenario gibt es **Short- und Langvideo-Vorlagen**: normalerweise **1 Minute hochkant** bzw. **10 Minuten quer**, jeweils **1080p30 mit Ton**. **Marble Works** verwendet stattdessen einen Mini-Auftrag mit **24** bzw. einen vollständigen Auftrag mit **144 Kugeln**; die Laufzeit ergibt sich aus der Produktion. Der **Scrap-Short** zeigt eine Runde im Short-Bild auf einem geprüften Seed und endet 2,5 Sekunden nach dem Sieg (rund 30 Sekunden); das **Scrap-Langvideo** ist ein Turnier mit acht Runden (rund 5 Minuten), und der Export schreibt die Kapitelzeiten der Runden in die JSON-Begleitdatei. Pyramid-Vorlagen nutzen die Tierchen. **Waterpark** bietet einen 30-s-Short und einen 10-Minuten-Parktag in **1080p60**; seine Vorschau startet im Dauerbetrieb. Endliche Wasserpark-Filme werden vor dem Export auf einen vollständigen Abschluss geprüft.

<details>
<summary>Alle 18 Produktionsvorlagen und zusätzliche Varianten</summary>

| Szenario | Short | Langvideo |
|---|---|---|
| Naval Battle | [Short](presets/production/naval-short.json) | [Langvideo](presets/production/naval-long.json) |
| Klassische Kugelfabrik | [Short](presets/production/marble-short.json) | [Langvideo](presets/production/marble-long.json) |
| Marble Works | [Mini-Auftrag](presets/production/marbleworks-short.json) | [Vollständiger Auftrag](presets/production/marbleworks-long.json) |
| Scrap Wars | [Short](presets/production/scrap-short.json) | [Langvideo](presets/production/scrap-long.json) |
| Mycelium | [Short](presets/production/mycelium-short.json) | [Langvideo](presets/production/mycelium-long.json) |
| Pyramid | [Short](presets/production/pyramid-short.json) | [Langvideo](presets/production/pyramid-long.json) |
| Territory Wars | [Short „Die letzte Krone“](presets/production/territory-short.json) | [Langvideo](presets/production/territory-long.json) |
| Waterpark | [30-s-Short](presets/production/waterpark-short.json) | [10-Minuten-Parktag](presets/production/waterpark-long.json) |
| Cloud Wars | [Short „Which cloud rules the sky?“](presets/production/cloudwars-short.json) | [10 Minuten Runden](presets/production/cloudwars-long.json) |

Zusätzlich unter [presets/](presets/): [Scrap-Turnier](presets/scrap-tournament.json), [Werkstatt](presets/scrap-workshop.json), [Materialarena](presets/scrap-materials.json), [Sunny Yard](presets/scrap-sunny-yard.json), [Marble-Materialvergleich](presets/marble-progressive-materials.json), [Perlmutt](presets/marble-progressive-pearls.json) und Pyramid-Wüste als [Short](presets/pyramid-desert-short.json) oder [20-Minuten-Video](presets/pyramid-desert-long-20min.json).

Pyramid startet mit der freigegebenen ruhigen Mischung: durchgehender Wasserloop mit weichen
Übergängen und leise abgestimmte Aktionsgeräusche. Die Wasserdatei liegt fest in `assets/audio/`.
Neue Pyramiden-Vorlagen und „Lautstärke zurücksetzen“ laden diese Mischung; ausdrücklich gespeicherte
eigene Lautstärken bleiben erhalten. Der Wasserregler passt nur den Hintergrund an.

</details>

Weitere Wasserpark-Vorlagen: Parktag mit [5](presets/waterpark-day-5min.json), [10](presets/waterpark-day-10min.json) oder [20 Minuten](presets/waterpark-day-20min.json), ruhiger Dauerbetrieb mit [10](presets/waterpark-relax-10min.json) oder [20 Minuten](presets/waterpark-relax-20min.json). Der Parktag endet mit der Fontänenshow; Abendruhe ist wählbar, Feuerwerk und Wasserspiele sind separat schaltbar. [Umsetzung und geprüfter Stand](docs/WASSERPARK_UMSETZUNG_2026-11-16.md) · [Optik nach dem Mockup, Hochformat und Vorschläge](docs/WASSERPARK_MOCKUP_2026-11-16.md) · [Wasserspiele, Show und Trichter-Einlauf](docs/WASSERPARK_WASSERSPIELE_2026-11-17.md).

## Details und Entwicklungsstand

[Marble Works](docs/PROGRESSIVE_MARBLE_V1.md) · [Scrap Wars](docs/SCRAP_WARS_INTEGRATION_2026-11-12.md) · [Mycelium](docs/MYCELIUM_2026-11-13.md) · [Pyramid](docs/ENDLESS_PYRAMID_2026-11-13.md) · [Territory Wars](docs/TERRITORY_INTEGRATION_2026-11-13.md) · [Waterpark](docs/WASSERPARK_MOCKUP_2026-11-16.md) · [Integrations- und Exportprüfungen](docs/ALLE_SZENARIEN_INTEGRATION_2026-11-13.md)

Vorhandene Exportoptionen bedeuten keine vollständige Abnahme jeder Kombination und Filmlänge. Den Klang von Marble Works hat der Nutzer am 14.11.2026 anhand der Reviewvideos freigegeben ([Kameraton](docs/MARBLEWORKS_CAMERA_AUDIO.md)).

Wie es weitergeht: [Gesamtplan](docs/GESAMTPLAN_2026-11-16.md) · Aufbau: [Architektur](docs/ARCHITEKTUR.md) · Regeln für Assistenten: [AGENTS.md](AGENTS.md)

Technik: JavaScript, PixiJS, Matter.js, Three.js; Videoexport über Playwright und FFmpeg. Szenarien liegen in `src/scenarios/`, die Exportpipeline in `lib/`. Bestehende Tests: `npm test`, Simulationsreferenzen: `npm run golden`.
