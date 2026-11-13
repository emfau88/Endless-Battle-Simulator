# Roadmap

**Aktueller Stand · 13.11.2026:** R26 vereint die fünf vorhandenen Szenarien in einem
gemeinsamen Produktionsgenerator. Auf Wunsch des Nutzers entfällt die Teilen-Link-Oberfläche;
Seed, Feinjustierungen sowie Speichern/Laden von Einstellungen bleiben erhalten.
[Integrationsbericht und offene Abnahmen](ALLE_SZENARIEN_INTEGRATION_2026-11-13.md).
Der letzte vollständige [Main-Lauf an `72d70f0`](https://github.com/emfau88/Endless-Battle-Simulator/actions/runs/43502140470)
bestand mit **174/179 Tests**: vier Export-Wartezeitüberschreitungen (Myzel/Pyramid) und ein Myzel-Lade-Timeout.
Scrap bestand mit 29/29 einschließlich Sunny-Yard-Replay; dessen historische Ursache bleibt unter **R02 offen**.

**Vorheriger Nachweis:** Produktionsabsicherung und Scrap-Ton an `bc0bf61` abgeschlossen.
Der vollständige [Linux-Lauf](https://github.com/emfau88/Endless-Battle-Simulator/actions/runs/43431587775)
bestand mit **133/133 Tests**; R02 wurde zunächst geschlossen. Eigene Materialklänge, abgestimmte Kampfklänge und
geprüfte AAC-Spitzen sind umgesetzt. 15 Minuten reine Tonproduktion und kurze 1080p-Filmproben sind nachgewiesen;
persönliche Film-/Hör-/Handyabnahme bleibt R20. Details: [Audio-/Produktionsbericht](SCRAP_AUDIO_PRODUKTION_2026-11-13.md).
Über [PR #6](https://github.com/emfau88/Endless-Battle-Simulator/pull/6) in `main` übernommen, Merge `7cfb1fb`.

**Historischer Ausgangspunkt:** ursprüngliche Einarbeitung an `main`, Commit `0f87887bd28cad2e0a4524067b723981f0272857`.
GitHub-`main` entsprach bei dieser Abfrage dem Commit. Die Roadmap wurde anschließend in `c72cf78` aktualisiert.
Die nun ausdrücklich beauftragte Produktionsabsicherung baut auf diesem Stand im Branch `codex/production-safety`
auf; Nachweise stehen im [Produktionsbericht](PRODUKTIONSSICHERUNG_2026-11-12.md). Arbeitsverzeichnis jeweils zu Beginn
sauber; keine anwendbare `AGENTS.md` im Repository oder in den übergeordneten Verzeichnissen gefunden.
Die anschließend beauftragte Scrap-Integration startet an `0dfde76` im Branch `codex/scrap-wars`;
GitHub-`main` wurde erneut mit `0f87887` abgeglichen. Aktueller Anschluss- und Prüfstand:
[Scrap-Bericht](SCRAP_WARS_INTEGRATION_2026-11-12.md). Der anschließend autorisierte Push ist erfolgt:
Die acht vorhandenen Commits bis `5cec854` sind über [PR #3](https://github.com/emfau88/Endless-Battle-Simulator/pull/3)
in `main` gemergt (`34c63aa`). Grundlage war die anschließend beauftragte Minimalprüfung: Live-Abbruch bestanden,
Audio-Spitzenabweichung identisch auf dem alten `main` reproduziert. Die ersten vollständigen CI-Läufe waren
unvollständig; R02 blieb damals offen. Nachweise und Grenzen: [CI-Erstlauf und Nachtrag](CI_ERSTLAUF_2026-11-13.md).
Der Ausbauplan wurde über [PR #4](https://github.com/emfau88/Endless-Battle-Simulator/pull/4) nach `main` übernommen (`247992a`).
Der anschließend ausdrücklich beauftragte Ausbau startet von diesem sauberen, mit origin abgeglichenen Stand
im Branch `codex/scrap-video-quality`. Umsetzung und aktuelle Prüfgrenzen:
[Scrap-Videoqualität](SCRAP_VIDEOQUALITAET_2026-11-13.md).

**Aktueller Nachtrag:** Die erste Bildaufteilung wurde vom Nutzer wegen zu großem HUD und zu wenig
sichtbarer Arena/Deckung abgelehnt. Der gezielte Folgeauftrag ersetzt sie durch ein fast bildfüllendes
Spielfeld und Holz, Stein, Beton mit verschiedener Haltbarkeit. Umsetzung und aktuelle Nachweise:
[Materialarena V3](SCRAP_MATERIALARENA_2026-11-13.md). Keine Maschinenwracks als Arenadekoration.
Die neue Bildaufteilung wurde danach vom Nutzer als „viel besser“ bewertet. Der anschließende Auftrag
ergänzt **Sunny Yard** als vierte Karte. Dessen verspielte erste Gestaltung wurde als zu kitschig abgelehnt.
Die Korrektur gestaltet einen sonnigen Betonhof mit natürlichen Materialien, einheitlichen Schatten und
dezenten Pflanzen am Rand. Nach weiterem Feedback erhält 9:16 einen eigenen Nord-/Süd-Grundriss mit
je zwei Starts oben und unten; 16:9 behält eine offene Mitte. Die Formatvarianten dürfen deshalb jetzt
unterschiedliche Kämpfe und Turnierlängen ergeben. Nachweise im
[Korrektur-Nachtrag](SCRAP_MATERIALARENA_2026-11-13.md#korrektur--sonniger-betonhof-und-eigene-hochformat-arena).
Auf ausdrückliches weiteres Feedback entfallen Scrap-Kamerafahrten vollständig: feste Gesamtansicht in
allen Regelversionen, auch beim letzten Duell. Ton entsteht weiterhin im Export; die Livevorschau ist stumm.
Persönliche Film-/Hör-/Handyprüfung bleibt getrennt davon unter R20.

**Zweck:** Dies bleibt die **einzige aktive Aufgabenliste**. Erledigtes steht im [CHANGELOG](CHANGELOG.md).
Berichte dokumentieren ihren damaligen Stand und werden nicht nachträglich als aktuelle Prüfung umgeschrieben.
Die Marble-Erweiterung bleibt auf ausdrücklichen Wunsch als isolierter lokaler Prototyp stehen.
Scrap Wars wurde dagegen anschließend zur Integration beauftragt. Produktionsabsicherung und
Scrap-Integration sind separate Änderungen; ein Video-Langexport wurde nicht beauftragt.
Der aktuelle Folgeauftrag autorisiert die schrittweise Umsetzung aller sechs Scrap-Pakete und Vorher/Nachher-Bilder.

**Projektziel:** SimCascade soll regelmäßig eigenständige, gut lesbare Simulationsvideos mit sauberem Ton und
reproduzierbarem MP4-Export ermöglichen: Shorts in 9:16 und längere Videos in 16:9. Inhaltsidee, Zuschauerreaktion
und Produktionsaufwand bestimmen die Länge. Der bereits laufende Kanalpilot R04 wird parallel fortgesetzt.

**Reihenfolge des beauftragten Ausbaus:** Lesbarkeit → Kampfablauf → Turnier → Treffer/Klang → Arenen/Kamera → Werkstatt.
Die sechs Schritte sind implementiert; die visuelle Abnahme der ersten Fassung ist ausdrücklich nicht erfolgt.
Die neue Materialarena folgt auf dieses Feedback. Persönliche Film-/Hör-/Handyabnahme bleibt unter R20;
die vollständige Linux-CI-Abnahme unter R02 wird nach den Timeouts des Main-Nachlaufs erneut abgesichert. Sie war durch den ausdrücklichen Folgeauftrag
zuvor nicht mehr zur Vorbedingung für die Umsetzung gemacht worden.
Hex Dominion V0.3/R17 ist auf ausdrücklichen Auftrag als sechstes Szenario integriert;
technische Nachweise und Abnahmegrenzen stehen im [Territory-Bericht](TERRITORY_INTEGRATION_2026-11-13.md).
Naval hat nach dem gemeldeten Short und 10-Minuten-Upload keinen Vorrang; offene Abnahmen und R21 bleiben erhalten.
Allgemeiner Engine-Umbau, Spielmechaniken außerhalb R22, 4K-Optimierung und 60-Minuten-Produktion haben keinen Vorrang.

**IDs:** R01–R19 bleiben vergeben, einschließlich des im CHANGELOG erledigten R19. R17 bleibt Territory Wars;
neu sind **R20 für Scrap Wars / Scrap Arena**, **R21 für Naval-Zustandsabsicherung**,
**R22 für den begrenzten Scrap-Qualitätsausbau**, **R23 für den Pyramiden-Ausbau**,
**R24 als Merkposten (Pyramiden-Melodie)** und **R25 für Endless Mycelium**.
Mycelium hieß im isolierten Featurebranch ebenfalls R23; bei der Integration wird diese Doppelbelegung aufgelöst.
**R26** bezeichnet den gemeinsamen Produktionsgenerator, **R27** den eingegrenzten Pyramid-Audiofall.
**R28** hält die abschließenden Linux-Zeitüberschreitungen fest. Nächste freie ID: R29.
Frühere B-/Schritt-Bezeichnungen sind Herkunftsverweise, keine zweite Aufgabenliste.

## 1 · Quellen und belastbarer Stand

### Verfügbare Projektquellen

Die folgenden externen Dateien wurden unter `C:/Users/madde/Downloads/` gesichtet; Scrap wurde anschließend
unverändert unter `docs/reference/` gesichert, die anderen externen Quellen liegen weiterhin außerhalb des Repositorys.
Ihre früheren Startanweisungen und Prioritäten sind historische Planungsgrundlagen, keine neu auszuführenden Aufträge.

| Quelle | Einordnung |
|---|---|
| `SimCascade_Endless_Battle_Roadmap_V1.2_2026-11-10(1).md` | V1.2 vom 10.11.2026 gefunden und gelesen; ihr Codebezug `0f13787` ist älter. Freie GUI-Dauer, Ton, Teilen und Naval-Recycling sind inzwischen umgesetzt. |
| `02-SimCascade_Kanalstart_Planergaenzung_2026-11-10.md` | Kanalziel, begrenzter Pilot und eigenständige Episodenideen bleiben Grundlage. Die damalige Ausgangslage „kein Video veröffentlicht“ ist laut aktuellem CHANGELOG überholt. Markt- und Monetarisierungsangaben wurden hier nicht neu verifiziert und begründen keine technischen Abnahmen. |
| `04-scrap-arena.html` | Maßgeblicher Scrap-Prototyp, ohne ausgewiesene Versionsnummer. Identisch zu `scrap-arena.html` (SHA-256 beginnt mit `38e2c7d28c96`). Bytegenaue Kopie und Herkunft: [SCRAP_SOURCE](reference/SCRAP_SOURCE.md). |
| `07-Territory_Wars_Hex_Dominion_V0.3.html` | R17-Quelle, erneut bytegleich zur unpräfixierten Datei geprüft. Unverändertes Archiv und volle SHA-256: [TERRITORY_SOURCE](reference/TERRITORY_SOURCE.md). |
| `Territory_Wars_Hex_Dominion_V0.2.html`, `Territory_Wars_Hex_Dominion.html` | Ältere Vergleichsdateien vorhanden; keine Grundlage für aktuelle Funktions- oder Rundendauerbehauptungen. |
| Crystal Front | **Quelle fehlt:** im Repository und unter den gesichteten Download-Quellen nicht gefunden. Bleibt Referenz/Variante innerhalb R17, ohne zugeschriebene Funktionen oder Prüfergebnisse. |

Gelesen wurden außerdem [README](../README.md), [CHANGELOG](CHANGELOG.md),
[Audit](AUDIT_2026-11-12.md), [Ausgangsbasis](AUSGANGSBASIS_2026-11-11.md),
[B01](B01_NAVAL_RECYCLING.md), [Naval-Querformat](NAVAL_QUERFORMAT.md),
[Mulden/Lift](NAVAL_MULDEN_LIFT.md), [Bedienfehler](SCHRITT_1_BEDIENFEHLER.md),
[Marble-Trichter](SCHRITT_2_MARBLE_TRICHTER.md), [Marble-Ton](SCHRITT_3_MARBLE_TON.md),
[erstes Short](SCHRITT_4_ERSTES_SHORT.md) und [Playlink/PC-Start](W1_W2_PLAYLINK_START.md).
Der frühere Umsetzungsplan ist bereits in dieser Roadmap aufgegangen (`git show f2f5e6f:docs/UMSETZUNGSPLAN.md`).

### Vorhanden, integriert, geprüft und abgenommen sind getrennte Zustände

**Im Prototyp vorhanden** bedeutet im externen Quellcode vorhanden. **Im Simulator integriert** verlangt den
gemeinsamen Weg Konfiguration → Vorschau → Export. **Technisch geprüft** benennt immer Umfang und Codefassung.
**Visuell/akustisch abgenommen** verlangt einen tatsächlich betrachteten laufenden Clip und eine gehörte Tonspur;
Standbilder, Hashes und Lautheitswerte ersetzen diese Abnahme nicht.

| Szenario | Vorhandener Stand | Technischer Nachweis | Sicht-/Hörabnahme |
|---|---|---|---|
| Naval | Integriert: 2–4 Schiffe, Mulden, Lifte, Beuteprinzip im Duell; Tink/Tock und sämtliche R19-Effekte einschließlich goldener Kugel. | Bestehende Tests und historische Berichte; aktuelle gezielte Zustandsproben zeigen eine Prüflücke, siehe R21. | Frühere Bild-/Vorschaufreigaben gelten für die dortigen Fassungen. Laufende Gesamtfassung samt aktuellem Ton in beiden Formaten noch offen. Schiffsoptik bleibt R01. |
| Marble | Integriert: Kugelfabrik, konstruktiv entschärfter Trichter, Ereigniston, Lautstärkeregler und MP4-Export. | Historische Kreislauf-, Export- und Lautheitsprüfungen; in diesem Auftrag keine neue Laufzeitabnahme. | Aktuelle Hörprobe, tatsächliche Handyprüfung und einzelne Bewegungsdetails offen. Dramaturgie bleibt R03/E1. |
| Scrap Wars / Scrap Arena | Integriert als `scrap`; zusätzlich zur R22-Ausstattung jetzt V3: große Rechteckarena, schmales HUD, Holz/Stein/Beton. | Originalquelle und drei Original-Seeds unverändert. Aktuelle Arena-Prüfungen im [Materialarena-Bericht](SCRAP_MATERIALARENA_2026-11-13.md); vorheriger Ausbau im [Qualitätsbericht](SCRAP_VIDEOQUALITAET_2026-11-13.md). | Die erste Bildaufteilung wurde abgelehnt. Neue Vorher/Nachher-Bilder und Kurzprobe liegen vor; persönliches Urteil, Hör-/Handyprüfung und breite Werkstatt-Balance bleiben R20. |
| Hex Dominion V0.3 | Nur Prototyp: vier Reiche, beide Ausgabeformate, getrennte Kartenformen, Auto-Framing, Filmtempo 0,25–2×, vier Regelparameter, drei Profile, Garnisons-/Marsch-/Routenanzeigen. WebGL2-Renderer mit Canvas-Fallback. | Je zwei reine 20-s-Simulationsläufe mit Seed 42 und Profil `balanced` pro Kartenform identisch (`2e9531d1` hochkant, `4d38cf6c` quer). Keine Kamera-, Audio- oder Exportprüfung. | Keine neue Sicht-/Hörabnahme; kein MP4-/Audiopfad im Prototyp nachgewiesen. |

**Teststände nicht vermischen:** Der Audit an `20ea040` meldet **72/72**, der Lift-Bericht zur Änderung `33f8eb1`
**74/74**. Die ursprüngliche Roadmap-Aktualisierung führte keine Suite und keine Exporte aus; sie enthielt
Quellcodelektüre und isolierte Node-Simulationsproben. Für die anschließende Produktionsabsicherung wurden die
79 bestehenden Tests als Ausgangsbasis geprüft und weitere Regressionen ergänzt. Aktueller Gesamtlauf,
Umgebung, kurze Exporte und Grenzen sind im [Produktionsbericht](PRODUKTIONSSICHERUNG_2026-11-12.md) festgehalten.
Die Golden-Fälle bleiben 24 Fälle × 2 Prüfpunkte; Referenzen wurden nicht neu geschrieben.
Die anschließenden Scrap- und Ausschnittsprüfungen einschließlich vollständigem Gesamtlauf werden separat
im [Scrap-Bericht](SCRAP_WARS_INTEGRATION_2026-11-12.md) geführt.
**Neuer Stand vom 13.11.:** die ersten GitHub-Läufe sind unvollständig und enthalten Fehler, siehe
[CI-Erstlauf](CI_ERSTLAUF_2026-11-13.md). Daraus folgt keine erfolgreiche plattformübergreifende Abnahme.

### Befunde entlang des Produktionswegs

| Weg / Beleg im aktuellen Code | Konsequenz für die Planung |
|---|---|
| [core.js](../src/core.js): `normalizeConfig`, `TEMPO_OPTIONS`; [app.js](../src/app.js): Format-/Tempo-Regler | Konfiguration, JSON, Teilen-Link, freie Dauer und 0,64/0,8/1× bestehen bereits. Die Probe bestätigt: **0,75 und 2 werden auf 1 normalisiert**. Der Formatregler startet die Simulation neu; beides passt noch nicht zum Hex-Vertrag. |
| [core.js](../src/core.js): `Session.start`, `advanceFrame`, `installExportAPI`; [app.js](../src/app.js): `bootExport` | Registry und Offline-Modus existieren. Session erwartet derzeit eine Pixi-Root; Capture liest ausschließlich `app.canvas`. Externe Canvas-/WebGL-Renderer, zusätzliche Labels und DOM-Anzeigen sind damit noch nicht vollständig angeschlossen. |
| [naval.js](../src/scenarios/naval.js): `_enterLane`, `checkInvariants`, `stateHash`; [sim.test.mjs](../test/sim.test.mjs) | Besitzwechsel und Warteschlangen sind implementiert, Verteilung/Kugelzahlen werden bereits geprüft. Der Hash enthält jedoch weder Kugelbesitzer noch die Reihenfolge in `magBalls`/`lane`. In isolierten Proben blieben **Hash und Invariantenprüfung trotz Besitzeränderung einer fliegenden Kugel bzw. umgedrehter Magazin-/Recyclingreihenfolge unverändert**. Das belegt eine Prüflücke, keinen beobachteten Fehler im normalen Ablauf. |
| Scrap: `episode.js`; Hex: `_event`, `_arrive`, `frame`, `HexPrototype` | Scrap besitzt jetzt ein separates vollständiges Ereignisprotokoll, begrenzten Puffer, globale Sequenzen und deterministische Rundenpausen/Folgeseeds. Die zehn Quell-UI-Meldungen bleiben unverändert. Bei Hex sind die 36 UI-Meldungen und der Echtzeit-Autoloop weiterhin keine geeignete Exportanbindung. |
| [audio.mjs](../lib/audio.mjs): `buildVoices`; [exporter.mjs](../lib/exporter.mjs): Ereignisabholung | Der vorhandene Mischer setzt Audio über `step / 60` in Videozeit. Neue Szenarien brauchen eine ausdrückliche Zuordnung von Simulation, Filmtempo, Runde und Videozeit sowie lückenlose Sequenzen. Vorhandene Verlustprüfung erhalten. |
| [exporter.mjs](../lib/exporter.mjs), [provenance.mjs](../lib/provenance.mjs): Exportrezept | R08 geschlossen: wirksame Encoderwerte sind Teil der normalisierten Konfiguration; JPEG-/Rendererwahl, Git-Status, Laufzeitversionen und Skriptprüfsummen werden gespeichert. Die CLI übernimmt Capturewerte; die Oberfläche lädt nur die Szenario-/Videoeinstellungen. Ein geänderter Quellstand wird kenntlich gemacht, aber nicht archiviert. |
| [exporter.mjs](../lib/exporter.mjs), [audio-job.mjs](../lib/audio-job.mjs), [output.mjs](../lib/output.mjs); [server.mjs](../server.mjs) | R11 A/B/C geschlossen: Phasenfortschritt, Audiomix im Worker, abbrechbare Kindprozesse und Prüfung vor Dateiübernahme. Vorhandene Ergebnisse werden bei gewöhnlichen Fehlern/Abbruch wiederhergestellt. Regressionen und Grenzen (u. a. kein Stromausfallschutz) im Produktionsbericht. |
| [naval.js](../src/scenarios/naval.js): `eventPlan`, `skyProgress` | Himmel und seltene Ereignisse hängen von `video.durationSec` ab. Ein kurzer Ausschnitt aus einer längeren Episode darf nicht durch Verkürzen dieser Dauer einen neuen Fahrplan erhalten. |

## 2 · Produktionsabsicherung: umgesetzt und noch abzunehmen

R08 (Wiederholungsrezept) und R11 A/B/C (Status, abbrechbarer Audiomix, geprüfte Dateiübernahme) sind umgesetzt;
Nachweis und Grenzen stehen im [Produktionsbericht](PRODUKTIONSSICHERUNG_2026-11-12.md) und im [CHANGELOG](CHANGELOG.md).
Die Szenarien und Referenz-Hashes wurden dafür nicht verändert. Weitere Mechaniken sind kein Teil dieser Umsetzung.

- [ ] **R02 · Main-Nachlauf der Browser-Prüfungen absichern (früher B10).**
  **Aktuell:** Der letzte Main-Lauf an `cc1bc7c` bestand mit 133/134; offen ist der bytegenaue
  Sunny-Yard-MP4-Replay. Die früheren Lade- und Konfigurationsfälle bestanden dort. Drei gezielte
  Linux-Diagnosen konnten kein abweichendes Paar sichern. Im Integrationslauf an `43102d9` bestand
  der Replay, was die frühere Ursache nicht erklärt. Fehlerpaare werden künftig nach Abschluss
  beider Exporte gesichert. R02 bleibt offen, auch wenn eine Wiederholung grün ist.
  Die entfernte Teilen-Oberfläche wird durch vollständige Datei-Roundtrips in `test/settings.test.mjs`
  abgedeckt. Grenzen, Assertions und Referenzen bleiben erhalten.
  [Historischer Nachweis](BROWSER_TESTSTABILITAET_2026-11-13.md),
  [aktueller Integrationsstand](ALLE_SZENARIEN_INTEGRATION_2026-11-13.md).
  **Vorheriger Abschluss 13.11.2026 an `bc0bf61`:** vollständiger Linux-Lauf mit **133/133 Tests** in vier Gruppen,
  einschließlich Golden-Referenzen, früher fehlerhaftem Marble-AAC-Fall, Scrap-UI und echtem HTTP-Abbruch.
  Node 22.17.1, Playwright 1.60.0, FFmpeg 6.1.1-3ubuntu5, Ubuntu 24.04, Software-Rendering und Protokolle gesichert.
  `pipefail`, zehn Minuten Testdatei-Limit, 25 Minuten je Job und 2,5 s für Abbruch/Aufräumen bleiben erhalten.
  AAC wird vor Veröffentlichung nachgemessen; zu hohe Spitzen oder Messfehler bewahren vorhandene Dateien.
  Die gemeinsame PCM-Reserve beträgt −2 dBFS, Scrap und inzwischen auch Mycelium benötigen −3 dBFS.
  Die AAC-Grenze bleibt **−1 dBTP**.
  Alle Testdateien werden ausgeführt; keine Golden-Referenzen neu gesetzt. Lokal zusätzlich Produktionsgruppe 33/33.
  Nachweis und begrenzte 15-Minuten-Audioprüfung: [Abschlussbericht](SCRAP_AUDIO_PRODUKTION_2026-11-13.md).
  Frühere fehlgeschlagene/unvollständige Läufe bleiben historische Nachweise im [CI-Erstbericht](CI_ERSTLAUF_2026-11-13.md).

## 3 · Szenarien: Scrap anschließen, gezielt ausbauen, danach Hex

- [x] **R06 · Für Scrap benötigte Szenario-Anbindung technisch umgesetzt.**
  **Ziel:** vorhandene Simulationen und Renderer durch den gemeinsamen Produktionsweg führen.
  **Abhängigkeit:** erster konkreter Bedarf aus Scrap; R17 prüft anschließend denselben Vertrag an Hex.
  **Umgesetzt:** [Canvas-Adapter](../src/canvas-scene.js), Scrap-Episodensteuerung, vollständige Ereignisse,
  Konfiguration und kurzer Ausschnitt über den gemeinsamen Exporter. Keine neue Physik-Engine.
  Nachweise: [Scrap-Bericht](SCRAP_WARS_INTEGRATION_2026-11-12.md). Die folgende Beschreibung bleibt
  der Anschlussvertrag für weitere Szenarien; Hex ist damit noch nicht integriert.
  **Umfang in kleinen Schritten:** Capture-/Renderer-Adapter, Zeit-/Rundenvertrag, Ereignis-/Konfigurationsvertrag.
  Bestehende Canvas-, Pixi- und WebGL-Renderer weiterverwenden; keine neue Engine und keine allgemeine Matter.js-Pflicht.
  Erforderlich sind:

  - Vollständiges Capture von Welt, Labels, beabsichtigtem HUD und Ergebnisanzeige; Bedienknöpfe gehören nicht ins Video.
  - Feste Simulationsschritte je Szenario mit Akkumulator und **genau einmal** angewandtem Filmtempo.
    Videozeit, Simulationszeit und Rundenzustand unterscheiden; vorhandenes Naval-/Marble-Verhalten erhalten.
  - Eine deterministische Rundenfolge mit lesbarer, festgelegter Endpause und aus Startseed/Rundennummer abgeleiteten
    Folgeseeds. Pausen und Rundenwechsel folgen Videozeit, nicht Wanduhr oder Browser-Zufall.
  - Vollständige Ereignisse für Audio und Auswertung mit über Runden hinweg eindeutiger Sequenz und präziser
    Videozeit-Zuordnung; UI-Meldungen dürfen weiterhin verdichtet werden. Pufferverlust erkennen, Audio-Dichte separat steuern.
  - Konfigurations-Roundtrip für Regeln, Darstellung, Tempo und Wiederholung sowie passende Zustands-/Invariantenprüfungen;
    Quellen-/Klangzuordnung und Lizenzen dokumentieren, Parameternamenskollisionen im Teilen-Link vermeiden.

  **Abnahme:** gleicher Startzustand liefert bei 30/60 fps dieselbe Simulation, Ereignisfolge und Rundenfolge zu
  denselben Videozeitpunkten; Rendern verändert den Simulationszustand nicht. JSON/Teilen-Link bewahren alle Werte,
  alle vorgesehenen Bildebenen erscheinen im kurzen MP4, Naval-/Marble-Regressionen bleiben abgesichert.

  **Ausschnittsexport (zunächst Scrap):** Episodendauer, Startversatz und Cliplänge sind getrennt; Vorlauf behält Regeln,
  Seed und Fahrplan der gewählten Episode. Die vollständige Episodenmischung wird passend zum Startversatz
  ausgeschnitten; Frames und Ton werden gegen den kontinuierlichen Abschnitt geprüft. Andere Szenarien müssen
  nach Prüfung ihres Darstellungszustands ausdrücklich freigegeben werden (`supportsClips`). Bei Naval darf eine
  kürzere Cliplänge `eventPlan`/`skyProgress` nicht neu planen. Ein Ausschnitt ist mit demselben Abschnitt eines
  durchgehend simulierten Ablaufs zu vergleichen. Dafür keinen Timeline-Editor bauen.

- [ ] **R20 · Scrap Wars ist integriert – kurze Film-/Hörabnahme abschließen.**
  **Ziel:** ein vollständiger Durchlauf Konfiguration → Vorschau → MP4 mit Ton und lesbarem Ergebnis.
  **Abhängigkeit:** Produktionsabsicherung aus Abschnitt 2; R06 entsteht gemeinsam mit dieser Integration.
  **Quelle:** `04-scrap-arena.html` / identisches `scrap-arena.html`; eigenständiges Arenaszenario, getrennt von R16.
  **Umfang:** zuerst Registrierung, gemeinsame Konfiguration und Adapter für den vorhandenen Canvas-Renderer;
  Bildgestaltung in 9:16/16:9 statt bloßer Übernahme der quadratischen WebM-Aufnahme. Vorhandenes Canvas-HUD und
  Ergebnisbanner weiterverwenden. Danach vollständige Ereignis-/Audioanbindung an den MP4-Mischer und deterministische
  Wiederholung mehrerer Runden. Browserklänge/MediaRecorder sind bereits vorhanden, aber kein Ersatz für Offline-Audio.
  Das vorhandene Rundenende einschließlich Unentschieden übernehmen; nach der Endpause folgt die nächste Runde,
  statt für den Rest eines langen Videos ein Standbild auszugeben. Zusätzliche Spielmechaniken folgen erst nach Abnahme.

  **Anschlussplan umgesetzt; Stand je Paket:**

  | Paket | Ergebnis vor dem nächsten Paket |
  |---|---|
  | 1 · Prototyp als Referenz sichern | Erledigt in `3808ebe`: unveränderte Quelle mit SHA-256, extrahierte Simulation/Renderer, drei Ausgangs-Seeds samt vollständigem Zustandsnachweis. |
  | 2 · Ein Durchlauf im Simulator | Erledigt: `scrap` in Registry, Regeln/Neustart/Teilen/JSON, kleiner Canvas-Adapter. Vorschau, reine Simulation und kurzer stummer MP4-Export liefern denselben Zustand. |
  | 3 · Bild und Ton vollständig | Erledigt: bewusstes 9:16-/16:9-HUD, vergrößertes Quell-Ergebnisbanner, vollständige semantische Ereignisse und Offline-Klänge mit Reglern. |
  | 4 · Wiederholbare Episoden | Erledigt: feste 120-Hz-Simulation, Tempo genau einmal, 2–8 s Ergebnis-Pause in Videozeit, stabile Folgeseeds und Siegzähler. |
  | 5 · Abnahme | Technische Prüfungen und kurze MP4s vorhanden: Bild-/Audioabschnitt, Wiederholung, Konfiguration, Abbruch und 20 Minuten reine Simulation. Einzelbilder betrachtet. Laufende Sicht-/Hörbeurteilung durch den Nutzer bleibt offen; zusätzliche Mechaniken folgen erst danach. |

  **Abnahme:** kurze tatsächlich betrachtete und gehörte MP4-Proben beider Formate mit vollständigem HUD/Ergebnis und
  synchronem Ton; Konfiguration erneut laden und reproduzieren. Rundenende, Endpause und Folgerunde gezielt prüfen,
  gegebenenfalls per Simulationsvorlauf und ≤20-s-Clip; mehrere Runden ohne Video-Langexport auf Invarianten,
  Ereignisvollständigkeit und begrenzte Objektzahl prüfen.

- [x] **R22 · Scrap Wars: sechs begrenzte Qualitätspakete technisch umgesetzt.**
  **Ziel:** auf kleinem Bildschirm nachvollziehbare Kämpfe, spürbare Treffer und eine abgeschlossene Episode.
  Umsetzung in sechs getrennten Commits ab `247992a`; Ergebnisse und Prüfungen im
  [Qualitätsbericht](SCRAP_VIDEOQUALITAET_2026-11-13.md). Originalregeln und Quellreferenzen bleiben erhalten.
  Vorherbilder stammen vom unveränderten Ausgangsstand. Persönliche Hör-/Handyurteile bleiben R20,
  eine breite Werkstatt-Balance ist nicht nachgewiesen; die Variante bleibt ausdrücklich experimentell.

  **Beauftragte Bildkorrektur nach P1–P6:** V3 mit echter 1040×540-Arena, rund 90 % Bildanteil in 16:9,
  schmaler Kopfzeile, spiegelgleichen Deckungsgruppen und drei Materialien (Holz 38 HP, Stein 95 HP,
  Beton 190 HP). Keine Wrack-Dekoration, zusätzlichen Waffen oder Maschinen. Die drei Karten behalten
  einen passierbaren Mittelweg und Außenring; Original/V2 bleiben auswählbar. Geänderte Geometrie und HP
  verändern bewusst den Verlauf, deshalb eigene Regelversion. Technische Nachweise im
  [Materialarena-Bericht](SCRAP_MATERIALARENA_2026-11-13.md). Bildaufbau positiv bewertet;
  persönliche Film-/Hör-/Handyprüfung bleibt R20.

  **Folgeauftrag Sunny Yard, nach Nutzerkorrektur:** vierte auswählbare Karte als heller Betonhof mit
  Holzmaserung, rauem Stein, gegossenem Beton, festen Schatten und kleinen Pflanztrögen am Rand.
  Smilies, Regenbögen und Blumenbemalung der abgelehnten ersten Fassung entfallen. Die Materialwerte bleiben
  38/95/190 HP. Querformat mit vier Deckungsgruppen; Hochformat mit eigenem Grundriss, zwei Startzonen an den
  Enden und versetzten Deckungen über die Bildhöhe. Weiterhin vier Gegner, keine neuen Waffen oder KI-Regeln.
  Die neuen Aufträge erweitern die frühere P5-Grenze auf vier Karten und heben für Sunny Yard die zuvor
  gewollte Gleichheit des Kampfverlaufs zwischen den Formaten auf. Technische Nachweise und Messgrenzen:
  [Korrektur-Nachtrag](SCRAP_MATERIALARENA_2026-11-13.md#korrektur--sonniger-betonhof-und-eigene-hochformat-arena).
  Nach störenden Schwenks/Zooms wurde außerdem eine feste Gesamtansicht für alle Scrap-Regelversionen
  beauftragt und umgesetzt; die frühere Duellkamera ist damit abgelöst. Persönliches Gefallen an dieser
  Fassung ist noch nicht bestätigt.

  **Basis vor diesem Ausbau:** vier benannte Roboter, Teamfarben, HP-/Waffenanzeigen, Rückstoß, Mündungslicht,
  Treffer-/Explosions-/Wrackdarstellung, zwei Waffentypen und Nachschubstationen. Rundenfolge, Siegzähler,
  Ergebnis-Pause und Ereigniston sind integriert. Der Ausbau verfeinert diese Basis.
  Die damalige Arena war quadratisch; ein kleineres HUD allein vergrößerte sie im Querformat nicht.
  Die aktuelle V3-Rechteckarena setzt deshalb den ausdrücklich geänderten Folgeauftrag um.
  Die damalige Duellkamera wurde nach erneutem Nutzerfeedback vollständig durch eine feste Gesamtansicht ersetzt.

  **Umgesetzt in der vom Nutzer bestätigten Reihenfolge P1 → P3 → P4 → P2 → P5 → P6.**
  Jedes Paket wurde separat geprüft und committed. Paketgrenzen sind Lieferstände, keine zusätzliche pauschale
  Freigabeschleife. P6 bleibt eine optionale Versuchsvariante und kein Muss für das erste gute Scrap-Video.

  Die Tabelle bewahrt den vereinbarten Umfang und die Prüfziele; erreichte Nachweise und offene persönliche
  Abnahmen sind im Qualitätsbericht bzw. R20 unterschieden.

  | Paket | Begrenzter Lieferumfang | Abschlusskriterium |
  |---|---|---|
  | **P1 · Roboter und Bildaufteilung** | Ein Material-/Kontrastdurchgang: größere Farbflächen, helle Kanten, vier erkennbare kosmetische Chassisvarianten innerhalb der bisherigen Kollisionskontur. Kompaktere Anzeigen für Name, HP, Waffe/Munition und Stand in 9:16/16:9; Industrieoptik erhalten. | In kurzen Vorher/Nachher-Proben sind alle vier Roboter und ihre Zustände bei etwa 390 px Bildbreite unterscheidbar; kein HUD verdeckt wichtige Aktion. Kampfverlauf und Physik-RNG bleiben identisch. Echte Handyprüfung separat dokumentieren. |
  | **P2 · Treffer, Schaden und Klang** | Drei sichtbare Schadensstufen, wenige Funken/Rauch bei starkem Schaden, gezielte Panzerungsdetails. Bestehende Schuss-, Raketen- und KO-Klänge in Gewicht/Dichte abstimmen; vorhandenen Mischer und Effekte weiterverwenden. | Schaden ist ohne Blick auf Zahlen erkennbar; Effekte verdecken weder Roboter noch Geschosse. Vorher/Nachher tatsächlich anhören, Spitzen/Lautheit und Ausschnittskontinuität prüfen. Keine Änderung an Schaden, Rückstoßphysik oder Siegerfolge. |
  | **P3 · Waffen- und Kampfablauf** | Zuerst Leerlauf und unbewaffnete Suchzeit messen. Danach höchstens **zwei** gezielte Regelkorrekturen: verlässlicheres Erreichen vorhandener Waffen und/oder Platzierung/Takt des vorhandenen Nachschubs. Ruhige Annäherung bleibt erlaubt. | Vor der Änderung einen belegten Stillstandsfall samt Messziel festhalten. Dieser verbessert sich; keine neuen unerreichbaren Waffen, Dauerblockaden oder erzwungenen Sieger. Läufe enden weiterhin regelgerecht. |
  | **P4 · Abgeschlossenes Turnier** | Genau ein optionales **8-Runden-Format** mit bestehendem Siegzähler, Zwischenstand, letzter Runde und Gesamtergebnis; Gleichstand ergibt geteilten Sieg. Die bisherige freie Rundenfolge bleibt verfügbar. | Runde acht endet mit Ergebnis und kurzem Abschluss statt mitten im Kampf. Ein reiner deterministischer Vorlauf ermittelt die tatsächliche Dauer einschließlich Pausen/Abschluss; Oberfläche, MP4, Ton und Rezept verwenden dieselbe Dauer. |
  | **P5 · Drei Arenen und ruhige Kamera** | Vorhandener Schrottplatz plus **zwei** handgebaute Varianten: Deckungslager und umkämpfte Mitte. Gleiche quadratische Welt und Grundregeln. Ein optionaler Kameramodus: Übersicht, bei zwei Überlebenden langsames gemeinsames Heranfahren. | Sichere Startplätze und erreichbarer Nachschub auf allen drei Karten. Kamera hält beide Kämpfer und relevante Geschosse/Ziele sichtbar, HUD bleibt fest. Ausschnitt nach Vorlauf stimmt mit kontinuierlicher Aufnahme überein. |
  | **P6 · Kleine Scrap-Werkstatt** | Nur als zuschaltbare Turniervariante: Scrap aus vorhandenen Rundenergebnissen, eine kurze Werkstattanzeige in der bestehenden Pause. Drei feste Module für Panzerung, Waffenaufsatz oder Antrieb mit jeweiligen Nachteilen; **ein aktiver Platz und höchstens eine Aufrüstung je Roboter/Turnier**. | Entwicklung ist am Roboter und in der Pause sichtbar; Werte bleiben begrenzt und werden nach dem Turnier zurückgesetzt. Gleicher Seed reproduziert Module/Ergebnis. Kein dauerhaft übermächtiger Sieger im begrenzten Vergleich; bei ungeklärter Balance bleibt die Variante experimentell. |

  **Technische Leitplanken je Paket:**

  Einstiegspunkte sind [HUD/Registrierung](../src/scenarios/scrap.js),
  [Renderer](../src/scenarios/scrap/renderer.js), [Rundenregeln](../src/scenarios/scrap/simulation.js),
  [Episode/Ereignisse](../src/scenarios/scrap/episode.js) und für P2/P4/P5 der bestehende Audio-/Exportweg.

  - **P1/P2:** Darstellung aus vorhandenem Zustand bzw. eigenem deterministischem Kosmetik-Zufall ableiten;
    keine zusätzlichen Ziehungen aus dem Kampf-RNG. Partikel und Textur-Caches begrenzen.
    Im bisherigen Export betrug die maximale Limiter-Absenkung etwa 20–21 dB: Anlass für die Hörprüfung,
    kein nachgewiesener Klangfehler. Quellpegel/Überlagerung zuerst abstimmen, keinen neuen Audiomischer bauen.
  - **P3:** Seeds 42, 7 und 314 als Ausgangsvergleich; längste aktive Phase ohne Schuss/Treffer und Suchzeiten
    getrennt von Ergebnispausen erfassen. Bestehende Zielwahl/Lenkung korrigieren, kein Navigationssystem entwickeln.
    Wenn kein reproduzierbares Problem besteht, endet das Paket mit dokumentiertem Befund statt künstlicher Regeländerung.
  - **P4:** ein Format, keine Turnierkonfiguration mit beliebigen Rundenzahlen, Ligen oder K.-o.-Bäumen.
    Acht Runden garantieren keine zehn Minuten: die Episode bestimmt die Länge. Dauerermittlung abbrechbar halten;
    Ausschnittsgrenzen, vollständige Episodenmischung und Rezept-Roundtrip an das endliche Format anpassen.
  - **P5:** erst Karten, danach Kamera innerhalb desselben Pakets prüfen. Kein Karteneditor, keine prozeduralen
    Arenen. Die damalige Grenze „keine rechteckige Physikwelt“ ist durch den gezielten Folgeauftrag zur
    bildfüllenden Materialarena ersetzt; sie erlaubt keinen allgemeinen Engine-Umbau. Kamera folgt festen Video-Ticks oder rein ableitbarem Zustand;
    Renderaufrufe verändern sie nicht. Audio-Panorama muss zum sichtbaren Ausschnitt passen.
  - **P6:** Module deterministisch vergeben; keine Auswahl-KI, zusätzlichen Waffenklassen oder physisch
    einzusammelnden Schrottobjekte. Zum Beispiel mehr Schutz gegen weniger Tempo; konkrete Werte erst im Paket.
    Keine persistenten Währungen, Inventare, Fabriken oder Verknüpfung mit Factory Wars/R16.

  **Gemeinsamer Prüfumfang:** drei Ausgangs-Seeds, beide Videoformate und relevante Grenzfälle; gezielte
  30/60-fps-, Tempo-, Konfigurations- und Exportprüfungen passend zur jeweiligen Änderung. Kurze vergleichbare
  Clips mit gleichem Seed, Abschnitt und Einstellungen, jeweils **höchstens 20 s**. Für Rundenfolgen längere
  reine Simulation verwenden; daraus entsteht kein Auftrag für einen 10-/20-Minuten-Videoexport.
  P3/P4/P6 und neue Karten verändern absichtlich Regeln/Ablauf: Regelversion im Rezept kenntlich machen,
  bisherigen Modus erhalten und Referenzänderungen begründen. Rohquelle und ursprüngliche Referenzfälle bleiben gesichert.
  P1/P2 sowie Kamerabewegung dürfen den Kampfverlauf nicht verändern. Naval-/Marble-Regressionen bleiben bestehen.

  **Umfangsgrenze:** ein Paket gleichzeitig, höchstens zwei Gestaltungs-/Balancevarianten pro Paket vergleichen.
  Neue Mechaniken oder zusätzliche Optionen werden als Folgeidee vermerkt und erweitern das laufende Paket nicht.
  Notwendige Fehlerkorrekturen und Prüfungen zählen nicht als neue Gestaltungsvarianten. Kein Engine-/3D-Umbau,
  allgemeines Grafikframework, 4K-Leistungsprojekt oder paralleler Hex-/Marble-Ausbau. Einen guten Clip bereits
  nach P1/P2 veröffentlichungsreif beurteilen; die Werkstatt darf die erste Produktion nicht blockieren.

- [x] **R26 · Technische Integration aller fünf Szenarien in einem gemeinsamen Produktionsgenerator.**
  **Auftrag:** vorhandene Szenarien nacheinander integrieren, gemeinsame Short-/Langvideo-Vorlagen,
  Bedienung und Export prüfen. Keine neuen Szenariomechaniken. Arbeitsbranch: `codex/all-scenarios-production`.
  **Umgesetzt:** Mycelium und Pyramid zusammengeführt; Vorlagen für alle fünf Szenarien; auf ausdrücklichen
  Nutzerwunsch Teilen-Link-Oberfläche entfernt, Einstellungsdateien erhalten.
  **Prüfstand:** Windows 179/179; neuer Linux-Nachweis nach Aufteilung der unveränderten Exportfälle
  je Szenario. Kurze echte Exporte beider Formate sind nachgewiesen. Der vollständige Pyramid-Film
  und die Standard-Tonkontrolle bestätigen einen verbleibenden Tonfehler, siehe R27.
  **Freigabeumfang:** Auf ausdrücklichen Nutzerwunsch weitere manuelle Film-/Extremprüfungen beendet,
  kein 60-Sekunden-Mycelium-Nachlauf und keine fünf 10-Minuten-Testvideos. Nach dem abschließenden
  Linux-Lauf wurde der Merge ausdrücklich trotz der dokumentierten Zeitüberschreitungen freigegeben.
  R02, R27 und R28 bleiben offen; Main-Nachlauf wird abgewartet. Dessen tatsächlicher Stand wird in
  [PR #8](https://github.com/emfau88/Endless-Battle-Simulator/pull/8) festgehalten.
  Die ursprüngliche 20-Sekunden-Grenze wurde für die Filmabnahme ausdrücklich erweitert.
  [Messungen und Grenzen](ALLE_SZENARIEN_INTEGRATION_2026-11-13.md).

<a id="r27-pruefstand"></a>

- [ ] **R27 · Pyramid: AAC-Standardfall korrigiert, Grenzen weiterer Klangkombinationen.**
  **Beleg:** Seed 42, Tierchen, 9:16, 60 s, 1-Minuten-Tag: Standardmischung −14,1 LUFS,
  PCM −1,7 dBTP, fertiges AAC +0,5 dBTP statt maximal −1 dBTP. Der Export kann deshalb abbrechen.
  Die identische PCM-Datei mit ausgeschaltetem AAC-Rauschersatz ergab −1,4 dBTP; eine allgemeine
  Korrektur war bei der Integration noch nicht abgenommen. Pyramid-Code und Schutzgrenze blieben damals unverändert.
  **Damals getroffene Entscheidung:** als bekannte Einschränkung für die Integration akzeptiert;
  weitere Zusatzdiagnosen oder vorsorgliche Reparaturen wurden in diesem Auftrag beendet.
  [Belege und genaue Abgrenzung](ALLE_SZENARIEN_INTEGRATION_2026-11-13.md#filmabnahme-und-akzeptierte-einschränkung).
  **Gezielter Folgeauftrag:** Nur Pyramid deaktiviert nun den AAC-Rauschersatz (`-aac_pns 0`);
  Klangpegel, −14-LUFS-Einmessung und −1-dBTP-Schutzgrenze bleiben erhalten. Der vollständige bekannte
  60-s-Export mit Tierchen, Seed 42, 9:16, 1080p30, CRF 20/medium und allen Reglern auf 100 % besteht
  unter Windows: 1.800 Bilder, 409 Tonereignisse ohne Verlust, −14,1 LUFS / −1,4 dBTP; rund 91 s Laufzeit.
  Vier vollständige 60-s-Tonmischungen (Kugeln/Tierchen × hoch/quer) bestehen lokal mit −1,7 bis −1,2 dBTP
  und laufen künftig als Regression in der CI. Keine Langfilm- oder beliebige Extremparameterfreigabe.
  Lokale Belege: `output/targeted-export-fixes-20261113/`; GitHub-Prüfstatus am jeweiligen Fix-Commit beachten.

- [ ] **R28 · Linux-Prüfung der Integration bleibt wegen Zeitgrenzen rot.**
  [Lauf an `20ba943`](https://github.com/emfau88/Endless-Battle-Simulator/actions/runs/43498607564):
  176 bestanden, zwei Mycelium-Exportfälle nach 180 s fehlgeschlagen, eine Scrap-Testdatei nach
  600 s abgebrochen. Mycelium renderte noch bei 60/90 bzw. 70/90 Bildern; der Test brach die Jobs ab.
  Keine neue Abweichung des Sunny-Yard-Bytevergleichs. Windows zuvor 179/179 am unveränderten
  Generatorcode. Auf Nutzerwunsch keine weitere Reparatur-/Testreihe, keine gelockerten Prüfungen.
  Der Nutzer hat die Ausnahme von der früheren CI-Bedingung ausdrücklich mit
  „CI-Zeitüberschreitungen akzeptieren und mergen“ freigegeben. Der CI-Lauf bleibt als fehlgeschlagen dokumentiert.
  **Gezielter Folgeauftrag:** Pausierte Vorschauen rendern nur bei Bildänderungen; Myzel verwirft dabei
  veraltete Farb-/Leuchtcaches. Der Myzel-Einstellungsdateitest schließt den Quellkontext vor dem Zielkontext.
  Exportpfad, Testzeitgrenzen und bestehende Assertions bleiben erhalten. Der vollständige GitHub-Lauf
  entscheidet über die verbleibenden Linux-Zeitüberschreitungen; lokale Erfolge ersetzen ihn nicht.

- [ ] **R25 · Endless Mycelium ist im Integrationsbranch enthalten – Sicht-/Hörabnahme am Gerät abschließen.**
  **Ziel:** ruhiges Satisfying-Szenario (Myzel wächst, frisst Laub, Pilze, Sporen, nächste Generation in neuer Farbe)
  als Short und als langes Video produzieren.
  **Stand:** Branch `endless-mycelium` mit Simulation, Renderer, 13 Reglern, Ton, YouTube-Standard 1440p60 und zwei
  Vorlagen; Prüfungen und Messwerte im [Myzel-Bericht](MYCELIUM_2026-11-13.md).
  Gemeinsame Veröffentlichung und Prüfstand über [PR #8](https://github.com/emfau88/Endless-Battle-Simulator/pull/8).
  **Abnahme:** Short-Vorlage und ein kurzer Querformat-Ausschnitt am Handy angesehen und angehört (insbesondere
  Lautstärke der Nachtluft und Größe der Pilze); danach Merge-Entscheidung. Ein Export über 20 s braucht einen
  gesonderten Auftrag.

- [ ] **R17 · Territory Wars / Hex Dominion V0.3 integriert; persönliche Sicht-/Hörabnahme bleibt offen (früher B12).**
  **Umgesetzt am 13.11.2026:** sechstes Szenario, Originalsimulation und Renderer, getrennte Ausgabe-/Kartenform,
  Originalprofile und Filmtempo 0,25–2×, vollständige Kamera-/Anzeigeeinstellungen, deterministische Folgerunden,
  Canvas-/HUD-Capture und Ereigniston über den bestehenden MP4-Weg. Technische Abnahme und konkrete Grenzen:
  [Territory-Bericht](TERRITORY_INTEGRATION_2026-11-13.md). Ausschnittsexport bleibt gesperrt;
  keine vollständigen 60-/600-Sekunden-Filme oder persönliche Hörabnahme behauptet.
  Die folgenden Punkte halten den ursprünglichen Integrationsvertrag als Herkunft fest:
  **Ziel:** den vorhandenen Gebietskrieg mit seinen Anzeigen und Einstellmöglichkeiten reproduzierbar exportieren.
  **Abhängigkeit:** abgenommener Scrap-Produktionsweg/R06; Crystal Front bleibt vorerst zusätzliche Referenz/Variante.
  **Vorhandenes übernehmen:** 9:16/16:9, eigenständige Hoch-/Quer-Kartenformen, Auto-Framing, Filmtempo 0,25–2×,
  `incomeMultiplier`, `aggression`, `offensiveInterval`, `marchDuration`, Profile `calm`/`balanced`/`intense` sowie
  Garnisons-, Marsch- und Routenanzeigen. Diese Funktionen sind keine neu zu entwickelnden Spielmechaniken.
  **Drei begrenzte Integrationsschritte:**

  1. **Konfiguration und Zeit:** Ausgabeformat und Kartenform getrennt halten. Ausgabewechsel erhält die laufende Welt;
     „Karte anwenden“ startet bewusst neu. `0,75×` und der übrige Prototypbereich müssen verlustfrei durch Oberfläche,
     JSON/Teilen-Link, Vorschau und Export gehen. `HexPrototype.advanceFrame(videoDelta)` multipliziert bereits mit
     Tempo; der Adapter darf es nicht erneut anwenden. Normale Echtzeitschleife während Offline-Berechnung stilllegen.
  2. **Darstellung und Capture:** Welt-Canvas, Label-Canvas und beabsichtigte DOM-Anzeigen (z. B. Fraktionsstände,
     Uhr/Runde, Sieger) vollständig erfassen. Auto-Framing, Kameramodus/-werte und Anzeigeoptionen in den
     Konfigurationsvertrag aufnehmen; englische Texte im Video, deutsche Bedienung erhalten. Kamera-/Formatprüfungen
     müssen auch eine Ausgabe mit abweichender Kartenform berücksichtigen.
  3. **Runden, Ereignisse und Audio:** den Echtzeit-Autoloop mit Zufallsseeds durch R06-Endpause/Folgeseeds ersetzen;
     vollständige Ereignisse und eine passende Tonspur ergänzen. Der vorhandene Hex-Hash erfasst u. a. RNG-Zustand,
     Entscheidungszeiten der Fraktionen und Marschzeiten nicht vollständig: Zustandsprüfung erweitern und Invarianten
     für Besitz, HQs, Versorgung, Einheiten und Märsche ergänzen.

  **Reproduktionsgrenze:** Export beginnt aus festgelegter Startkonfiguration neu. Der aktuelle Konfigurationsgetter
  speichert keine Historie zwischenzeitlicher Regeländerungen; diese Historie aufzuzeichnen ist vorerst kein Auftrag.
  **Abnahme:** kurze tatsächlich betrachtete und gehörte MP4s beider Formate; vollständige Labels/HUD/Ergebnis,
  Kamera-Roundtrip und Welt-Erhalt bei Ausgabewechsel nachgewiesen. `0,75×` bei 30/60 fps, Pause der Echtzeitschleife,
  identische Wiederholung, Ereigniszeiten und Rundenübergang gezielt prüfen. Rundendauern für V0.3 neu bestimmen;
  keine alten V0.2-Dauern übernehmen. Vorlauf statt Exporten über 20 s verwenden.

- [ ] **R23 · Endless Pyramid: Ausbau für längere Videos (5, 10, 20 Minuten).**
  **Quelle:** Auftrag vom 13.11.2026 nach Abnahme des Szenarios (Branch `endless-pyramid`,
  [Bericht](ENDLESS_PYRAMID_2026-11-13.md)). **Ziel:** sichtbarer Fortschritt und Abwechslung über die ganze
  Videolänge, damit man bis zum Ende dranbleibt. **Grundsätze:** Der Verlauf koppelt an die Videolänge
  (`video.durationSec`, wie der Naval-Himmel; wählbar „automatisch (Videolänge)“ oder fest 5/10/20 Minuten);
  in der Vorschau läuft er in Schleife. Alles ist reine Darstellung oder aus dem Seed abgeleitet. Die
  Kreislauf-Physik bleibt bei Standardreglern unverändert (gleicher Zustands-Hash); einzige Ausnahme ist P5
  bei eingeschaltetem Rennen. Jedes Element bekommt einen eigenen Schalter oder Regler, jeder neue Klang einen
  eigenen Lautstärkeregler. Hoch- und Querformat gleichwertig.

  | Paket | Inhalt | Abnahme |
  |---|---|---|
  | P1 · Vorschau | Aus einer Kopie: vier Standbilder eines 10-Minuten-Videos (Anfang, Mitte, Sonnenuntergang, Finale), hoch und quer, Kugeln und Tierchen. | **Stopp:** Freigabe des Aussehens durch den Nutzer. |
  | P2 · Tag → Nacht ✓ (13.11., siehe CHANGELOG) | Vier Phasen über die Videolänge: Morgen, Mittag, Sonnenuntergang, Nacht. Himmel, Wasser, Spiegelung und Licht färben sich mit; nachts Sterne, stärkeres Leuchten, innen beleuchtete Pyramide. Tierchen gähnen in der Dämmerung und tragen nachts Schlafmützen. Regler: Tageslauf an/aus, Dauer. | Standbilder an den Phasengrenzen für 5/10/20 min; Hash unverändert; 20-s-Probe mit `durationSec` 20 zeigt den ganzen Tag im Zeitraffer. |
  | P3 · Licht-Füllung + Finale ✓ (13.11., siehe CHANGELOG) | Jeder Lichtimpuls schaltet Glasfelder dauerhaft ein. Der Füllstand folgt der Videozeit, damit die letzte Scheibe in den letzten Sekunden aufleuchtet; danach Feuerwerk über der Spitze (neuer erzeugter Klang). In der Vorschau Neubeginn nach dem Finale. Regler: Füllung an/aus, Feuerwerk an/aus, Stärke. | Füllstand bei 25/50/75/100 % der Länge; Finale genau am Ende bei 5/10/20 min (nur Simulation, kein Langexport); kurze Hörprobe Feuerwerk. |
  | P4 · Seltene Ereignisse | Goldene Figur mit Krone und Zähler, Delfinsprung in der Lagune, Regenschauer mit Regenbogen, nachts Sternschnuppen und Glühwürmchen. Fahrplan aus dem Seed mit mindestens einem Ereignis je Videoviertel (5 min ≈ 3, 10 min ≈ 5, 20 min ≈ 9). Häufigkeit selten/mittel/oft, jedes Ereignis einzeln schaltbar, Klänge mit Reglern. | Fahrplan-Test (Anzahl und Abstände je Länge und Seed); Standbild je Ereignis; Hash unverändert. |
  | P5 · Tierchen-Rennen | Gleich große Teams (Farben reihum), Runden je Art, Rangliste im HUD, Meldung bei Führungswechsel, Siegerpodest am Videoende. Damit überholt werden kann: im Renn-Modus zweispurige Lagune, jede Figur paddelt je Runde mit eigenem, aus dem Seed abgeleitetem Tempo; am Tunnel Einfädeln nach fester Regel. | Rangfolge je Seed reproduzierbar; mehrere Führungswechsel in 10 min bei typischen Seeds; keine Überlappung; Rennen aus = bisheriger Hash. |
  | P6 · Vorlagen und Proben | Vorlagen für 5/10/20 min, hoch und quer, Kugeln und Tierchen. Ausschnittsexport (`supportsClips`) für die Pyramide prüfen und freigeben, damit z. B. das Finale eines 10-Minuten-Videos als 20-s-Ausschnitt angesehen werden kann. | Ausschnitt bildgleich zum durchgehenden Lauf; Kurzproben höchstens 20 s; Langexport nur auf gesonderten Auftrag. **Befund 13.11.:** Erster Freigabeversuch zurückgenommen – bei Dämmerung (`dayStart` 0,8, Tag 1 min) weichen 42 Himmelspixel (max. 16 Stufen) nach reinem Vorlauf ab; tagsüber bildgleich. Ursache offen. |

  **Reihenfolge:** P1 → Freigabe → P2 → P3 → P4 → P5 → P6, je Paket eigener Commit mit Tests; am Ende ein
  datierter Bericht. Nicht enthalten: Melodie (R24), neue Kulissen, Weichen und andere Bahnelemente.

## 4 · Parallel: Kanalpilot und begrenzte Nacharbeiten

- [ ] **R04 · Vierwöchigen Kanalpilot fortsetzen (Schritt 7, früher B13).**
  **Ziel:** aus fertigen Videos und Zuschauerdaten lernen; erste Uploads sind im CHANGELOG vermerkt.
  **Abhängigkeit:** verfügbare abgenommene Videos, kein Warten auf neue Szenarien oder alle kosmetischen Aufgaben.
  **Umfang:** realistisch ein längeres Video und ein Short pro Woche; je Upload Idee, Szenario, Länge, Titel,
  Vorschaubild, aktive Arbeitszeit und Renderzeit festhalten. Nach 7/28 Tagen Impressionen, Klickrate,
  Wiedergabedauer, Bindung, Abonnenten und verfügbare Shorts-Kennzahlen auswerten; ein anderer Seed allein ist
  keine neue Inhaltsidee. Aktuelle [20-s-Short-Vorlage](../presets/naval-youtube-short.json) (Seed 50, drei Kanonen)
  und [10-Minuten-Vorlage](../presets/naval-youtube-10min.json) (Seed 314, zwei Kanonen) erhalten.
  1440p60 ist ein verfügbares Profil; Qualitätsgewinn, Renderzeit und tatsächlich ausgelieferte YouTube-Fassung
  vergleichen. Die VP9-Begründung in historischen Entscheidungen/Vorlagen gilt hier **nicht als verifizierte Garantie**.
  Länge nach Inhaltsidee und Daten wählen; das Vorhandensein einer langen Vorlage autorisiert keinen Langexport.
  **Abnahme:** eine dokumentierte Pilot-Auswertung entscheidet Ausbau, Anpassung oder Begrenzung; neue Szenarien
  verschieben den Pilot nicht erneut auf unbestimmte Zeit.

Die folgenden Naval-Arbeiten haben nach den gemeldeten Uploads eines Shorts und eines 10-Minuten-Videos
keinen Vorrang vor einer neuen Inhaltsidee. R18 bei konkretem Bild-/Tonbefund oder vor dem nächsten Naval-Ausbau
aufgreifen; R21 spätestens vor Änderungen an Besitz-/Recyclingmechanik schließen. Die Prüflücke bleibt ausdrücklich offen.

- [ ] **R18 · Aktuelle Naval-Fassung in Bewegung und mit Ton abnehmen.**
  **Ziel:** belastbare Mängelliste zur aktuellen Fassung statt neuer pauschaler Umbau.
  **Abhängigkeit:** aktuelle Konfiguration und eindeutig benannte Prüffassung.
  **Umfang:** kurze laufende MP4-Proben, jeweils höchstens 20 s, in 9:16 und 16:9. Kugelwege, Warteschlangen,
  Rollen/Steigen, Sand/Sockel/Rohre, Lesbarkeit und rechte Shorts-Sicherheitszone beurteilen; HUD bei drei und vier
  Schiffen zusätzlich prüfen. Schuss/Treffer/Platscher/Tink/Tock als tatsächliche Mischung anhören, ebenso das
  Zusammenspiel mit Mondlicht, Mündungsfeuer, Schaum, Himmel, Sternschnuppe, Wal und goldener Kugel ansehen.
  Späte Ereignisse gegebenenfalls nach Simulationsvorlauf kurz aufnehmen; ursprüngliche Episodendauer beibehalten.
  Eine Sicherheitszonen-Schablone ist nur ein Prüfmittel, keine Behauptung über alle Handy-/YouTube-Oberflächen.
  **Abnahme:** protokollierte Sicht- und Hörurteile mit Clip, Seed, Konfiguration, Commit und Zeitmarken; echte
  Handyprüfung gesondert benennen. Nur reproduzierte Mängel als begrenzte Korrekturen unter R18, R01 oder R05 verfolgen.

- [ ] **R21 · Naval: Besitzwechsel und Recyclingreihenfolge gezielt absichern.**
  **Ziel:** die belegte Lücke in Hash und Zustandsprüfung schließen, ohne die Spielphysik umzubauen.
  **Abhängigkeit:** aktueller Lift-/Beute-Stand; unabhängig von einer gestalterischen Entscheidung.
  **Umfang:** kleine Regressionen für jeden Übergang vom Wasser über Mulde/Lift ins Magazin und zum nächsten Schuss;
  Kugelidentitäten, eindeutige Mitgliedschaft, Besitzerwechsel im Duell, Besitzererhalt bei drei/vier Schiffen,
  geordnete Warteschlange und tatsächliche Entnahmefolge prüfen. Bestehende Verteilungs-/Langlauftests ergänzen.
  **Abnahme:** gezielt vertauschte Besitzer oder Reihenfolgen werden erkannt; reguläre Läufe beider Formate und
  2–4 Schiffe bestehen. Hash-Erweiterungen sind begründet und versioniert; veränderte Fingerabdrücke werden von
  verändertem Verhalten unterschieden. Golden-Hashes allein genügen nicht, Referenzen werden nicht blind neu gesetzt.

- [ ] **R01 · Verbleibende Schiffsoptik.** Ziel: die Schiffe selbst gezielt verbessern. Abhängigkeit: R18 und ein
  konkreter Bildbefund. Umfang: jeweils ein begrenzter Darstellungsschritt; Mulden/Lifte/Beuteprinzip und R19 sind
  umgesetzt. Abnahme: betrachteter Vorher/Nachher-Kurzclip bei gleicher Konfiguration, kein unbeabsichtigter
  Einfluss auf Physik oder Lesbarkeit. Eine neue Spielmechanik ist nicht Teil dieser Restaufgabe.
- [ ] **R05 · Zuschauerführung der Seeschlacht (früher B08).** Ziel: Schüsse, Recycling und Fortschritt gut verfolgen
  können. Abhängigkeit: R18-Befunde und konkrete Episodenidee aus R04. Umfang: nur belegte Kompositions-/HUD-Mängel
  korrigieren; keine pauschale Vergrößerung der Schiffe oder Physiküberarbeitung. Der Lift-Umbau hat die frühere
  Bildaufteilung bereits verändert. Abnahme: lesbarer laufender Hoch-/Querclip; bei bewusst nötigem Layout-/Physikeingriff
  vorher/nachher Zustände und Verhalten vergleichen und Referenzänderungen begründen.
- [ ] **R03 · Kugelfabrik: Entwicklung statt reiner Schleife (Schritt 5, früher B07).** Ziel: eine längere Episode
  trägt Anfang, Entwicklung und Abschluss. Abhängigkeit: Entscheidung E1. Umfang: höchstens zwei bis drei wirksame
  Bauteile, einzeln mit Kreislauf/Sortierung und beiden Formaten prüfen. Abnahme: zuerst ≤20-s-Probe mit erkennbarem
  Fortschritt; ein längerer Videoexport braucht einen gesonderten Auftrag.
  Ein isolierter lokaler Konzeptversuch „Marble Foundry“ ist vorhanden und im Produktionsbericht beschrieben;
  er ist kein integriertes Szenario und noch kein Nachweis für eine 10–20-Minuten-Episode.
- [ ] **R14 · Grafik-Playbook (früher B04).** Ziel: vorhandene Grafikqualität nachvollziehbar wiederverwenden.
  Abhängigkeit: tatsächlicher Marble-/Szenariocode. Der für R20 benötigte Canvas-/Capture- und Layoutweg ist
  im [Scrap-Bericht](SCRAP_WARS_INTEGRATION_2026-11-12.md) dokumentiert; das breitere Playbook bleibt offen.
  Umfang: Layer, Canvas-Texturen, Material/Licht, mechanische Anschlüsse, Handy-Lesbarkeit und Capture-Regeln.
  Abnahme: konkrete Codebeispiele und kurze Renderer-Checkliste; kein vorgezogener Grafikframework-Umbau.

## 5 · Nachrangige offene Punkte und Merkliste

- [ ] **R07 · Oberfläche vervollständigen (früher B09).** Nach Sichtung von V1.2 begrenzt auf noch fehlende
  Qualitätswerte/-profile (CRF, x264-Preset, Bitrate) und ggf. 1:1-Auswahl. Freie Dauer, Auflösung/FPS,
  Speichern/Laden/Teilen und Lautstärkeregler sind vorhanden. Exportstatus/Abbruch und Metadaten wurden mit R11 A/B/C
  bzw. R08 ergänzt und sind keine offenen Oberflächenaufgaben mehr.
- [ ] **R09 · Kugelfabrik: Kleinigkeiten.** Historisch 240–540 Brückenbrecher-Eingriffe je zehn Minuten; sichtbares
  Zucken erst im laufenden Clip prüfen. Grün hat bei 35 Kugeln fünf statt sechs Kugeln; 36 erfordert eine bewusste
  Parameteränderung. Freistehende rechte Stütze, unterschiedliche Funken-/Klirr-Auslöser und mögliche Verdeckung
  der Sammelschiene bleiben einzeln zu prüfen. Quellen: Schritt 2–4, keine neuen Messwerte aus diesem Auftrag.
- [ ] **R10 · Ton-Ergänzungen.** Motor-/Rollgeräusch der Kugelfabrik und hörbare Simulator-Vorschau fehlen.
  Die Browserklänge des Scrap-Prototyps sind noch keine integrierte Vorschauvertonung. Bestehenden MP4-Ton erhalten.
- [ ] **R11 · Verbleibende Export-Leistungsprüfung.** Status/Abbruch, Worker-Mix und sichere Dateiübernahme
  (A/B/C) sind erledigt. Offen bleiben der JPEG/Base64-Engpass bei 4K, ein ausdrücklich beauftragter vollständiger
  60-Minuten-Export mit Ton und Leistung am echten Handy. Bisherige Durchsatzwerte sind historische Messungen;
  diese Restpunkte blockieren R20/R17 nicht und autorisieren keinen Langexport.
- [ ] **R12 · Quadrat 1:1 gestalten.** Naval/Marble nutzen bisher ein verkleinertes Querformat-Layout; nachrangig
  gegenüber guter 9:16-/16:9-Produktion.
- [ ] **R13 · Hinweistext im Bedienfeld.** Nennt auch bei Marble „Schiffe, Kanonen“; kosmetischer Rest aus Schritt 1.
- [ ] **R15 · 30 gegen 60 fps vergleichen (früher B03).** Auswahl ist vorhanden; Sichtvergleich bei gleichem
  Seed/Ausschnitt mit Renderzeit, Dateigröße und Bildqualität fehlt. Mit R04-Profilbewertung bündeln, keine neue Engine.
- [ ] **R16 · Factory Wars / Robot Wars (früher B11).** Frühestens nach dem Pilot: späteres Konzept mit zwei
  Fabriken, zwei Robotertypen, Produktion und Schrottkreislauf. Eigener Gegenstand, nicht mit Scrap Arena/R20 zusammenlegen.
- [ ] **R24 · Endless Pyramid: Melodie aus Lichtimpulsen (Merkposten, nicht beauftragt).** Jeder Lichtimpuls
  spielt den nächsten Ton einer ruhigen Tonfolge statt des festen Glockentons, sodass endlos Musik entsteht.
  Passt zu einem späteren Ruhemodus für Hintergrundvideos. Quelle: Rückmeldung vom 13.11.2026 („sehr interessant,
  mal vermerken“).

## 6 · Offene Entscheidungen und Abnahmen am Gerät

- [ ] **E1 · Variante für das lange Kugelfabrik-Video:** Überlastungsprobe, Sortierduell oder Wachsende Maschine.
  Konkretisierte Empfehlung: Wachsende Fabrik mit neuen Materialtypen, freigeschalteten Maschinen und geänderten
  Wegen. Isolierter Versuch erstellt; noch keine Entscheidung für die Simulatorintegration. R03 hängt daran,
  R04/R20/R17 nicht.
- **Naval sehen/hören:** aktuelle Proben aus R18 einschließlich rechter Sicherheitszone und 3-/4-Schiff-HUD;
  alte lokale Clipnamen sind kein Nachweis für die neue Fassung.
- **Marble hören:** aktuelle Lautheitsmischung auf gedrückten/pumpenden Klang prüfen. Die frühere Messung von bis
  zu 19 dB Begrenzung ist ein Hinweis für die Hörprobe, keine aktuelle klangliche Abnahme.
- **Handy/PC:** echte Handyprüfung nach [W1/W2](W1_W2_PLAYLINK_START.md) und Doppelklick auf `start.bat`, möglichst
  auch auf einem frisch eingerichteten Rechner. Bei veraltetem laufendem Server für den jeweiligen Test neu starten.

Getroffene Entscheidungen einschließlich E2 und der Umsetzung von R19 stehen im [CHANGELOG](CHANGELOG.md#entscheidungen).

## 7 · Die nächsten drei Schritte

**Vorausgehend:** R02 mit der gezielten Browser-Testkorrektur und einem erfolgreichen Main-Nachlauf abschließen.

1. **R20 – aktuelle Scrap-Proben sehen und hören:** Quer-/Hochformat, feste Kamera, Materialwirkung und neue
   Mischung auf PC/Kopfhörer sowie Handy beurteilen. Nur konkret auffällige Stellen gezielt korrigieren.
2. **R04 – Scrap als nächste Kanalprobe:** nach dieser Abnahme ein Short und ein längeres Format auswählen.
   Die geprüfte 15-Minuten-Tonspur ersetzt keine Sichtung eines vollständigen langen Films; einen Langexport separat beauftragen.
3. **R17 – integrierte Hex-Proben persönlich beurteilen:** kurze Hoch-/Querformatproben sehen und hören;
   technische Nachweise stehen im Territory-Bericht. Weitere Mechaniken und Langfilme benötigen einen eigenen Auftrag.

Die sechs R22-Pakete sind technisch umgesetzt; R02 wird nachgeprüft, die persönliche Qualitätsabnahme bleibt gesondert.
Der zusätzliche Marble-Foundry-Versuch bleibt isoliert; Hex V0.3 wurde separat und ohne neue Spielmechaniken integriert.

R04 läuft mit den vorhandenen Uploads weiter. Naval wird gezielt bei Bedarf verbessert; aus einer offenen
Abnahme oder Prüflücke folgt kein pauschaler Vorrang vor allen weiteren Szenarien.

## 8 · Arbeitsregeln und Pflege

- Je Auftrag Ausgangs-Commit und betroffene Dateien nennen, genau einen begrenzten Schwerpunkt bearbeiten und
  bestehende lokale Änderungen erhalten. Eigener Branch und Commit; Push/Merge nur im autorisierten Umfang.
- Für Codeänderungen betroffene Tests und Referenzvergleich ausführen, vor größeren Integrationsschritten die
  vollständige Suite; tatsächliche Ergebnisse mit Version/Commit berichten. Für reine Dokumentationsänderungen
  Inhalte, Verweise und Diff prüfen. Hängende Prozesse beenden, keine Referenzen blind neu schreiben.
- **Keine Exporte über 20 s ohne gesonderten Auftrag.** Das gilt auch für vorhandene 30-s-/10-Minuten-/60-Minuten-Presets.
  Reine Simulationsvorläufe sind davon zu unterscheiden; sie ersetzen keine laufende Sicht-/Hörprobe.
- Sichtbare/akustische Änderungen mit tatsächlich betrachtetem/gehörtem Kurzclip abnehmen; fehlende Urteile
  ausdrücklich offenlassen. Technische Tests, Standbilder und Freigaben älterer Fassungen getrennt benennen.
- Größere Schritte erhalten einen datierten Bericht unter `docs/` mit Umfang, Messwerten, Grenzen und Nachweisen.
  Berichte verweisen für offene Arbeit auf diese Datei und bilden keine zusätzliche aktive Aufgabenliste.
- Bei fehlgeschlagener Abnahme den abgegrenzten Schritt dokumentieren und korrigieren, nicht unkontrolliert ausweiten.
- Neue offene Punkte nur hier mit nächster freier ID und Quelle eintragen. Erledigtes mit Datum, Commit und ggf.
  Bericht in den CHANGELOG übertragen; IDs nie wiederverwenden, auch nicht R18/R19.
