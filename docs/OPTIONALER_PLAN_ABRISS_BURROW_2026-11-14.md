# Optionaler Umsetzungsplan: Abriss-Karten und Burrow im Endless Battle Simulator

**Status: Recherche gesichert; Umsetzung nicht beauftragt und nicht priorisiert.**

**Nachtrag 25.11.2026:** Burrow wird als eigenes Szenario in Draufsicht umgesetzt (R42, abweichend von der
Seitenansicht unten). Stand: [Bericht Endless Burrow](BURROW_2026-11-25.md). Die Abriss-Karten bleiben unbeauftragt.

Stand: 14.11.2026. Dieses Dokument hält die bereits durchgeführte Recherche und
einen möglichen Integrationsweg fest. Es ist eine Entscheidungsgrundlage für
später, keine zweite aktive Aufgabenliste. Die [Roadmap](ROADMAP.md) bleibt die
einzige aktive Aufgabenliste. Aus diesem Plan folgt weder ein Implementierungs-
noch ein Export-, Veröffentlichungs- oder Merge-Auftrag.

Die Planung liegt im isolierten Branch `codex/abriss-burrow-plan`. Ausgangspunkt
ist der lokale Simulator-Commit `3586239fa058af5b7bf0e900f550c492631380ce`.
Die bereits vorhandenen uncommitteten Änderungen in `lib/audio.mjs` und
`src/scenarios/pyramid.js` der ursprünglichen Arbeitskopie wurden nicht in die
Planungsarbeitskopie übernommen und nicht verändert.

## 1. Zielbild und Empfehlung

Gewünscht sind automatisch ablaufende, gut lesbare Videos von ungefähr
20 Minuten. Die untersuchten Vorbilder liefern drei mögliche Inhalte:

| Inhalt | Gewünschtes Zuschauererlebnis | Empfohlene Einordnung |
|---|---|---|
| Artilleriekampf auf zerstörbarem Terrain | Figuren kämpfen selbstständig auf farbenfrohen Karten; Explosionen verändern Deckung, Wege und Standflächen. | Eigenes Artillerie-Szenario; zunächst nur Terrain und Testprojektile. |
| Burrow: Untergrundjagd und Wachstum | Ein kleiner Wurm frisst Nahrung und andere Würmer und wird sichtbar länger, größer und stärker. | Eigenes Burrow-Szenario mit Profil „Untergrundjagd“. |
| Burrow: Oberflächenangriffe | Himmel und Untergrund sind in einer Seitenansicht erkennbar; der Wurm durchbricht die Oberfläche, trifft Ziele und taucht wieder ein. | Zweites Profil desselben Burrow-Szenarios. |

**Empfehlung:** Karten, abgegrenzte Simulationsbausteine und passende visuelle
Prinzipien lokal übernehmen und an den Simulator anpassen. Seine Oberfläche,
Konfiguration, Zeitsteuerung, Tonverarbeitung und MP4-Ausgabe weiterverwenden.
Die beiden Burrow-Profile teilen Bewegung, Wachstum und Körperdarstellung.
Die vollständige Kampf- und Wurmlogik bleiben getrennte Systeme.

Worms/Worms Armageddon beziehungsweise Effin Worms beschreiben hier die gewünschte
Richtung. Eine vollständige Nachbildung ihrer Mechaniken gehört nicht zum ersten
Umfang. Die Abriss-Figuren sind ausdrücklich nicht Gegenstand der ersten
Kartenübernahme; spätere Figuren sind noch festzulegen.

## 2. Quellenstand und Grenzen der Recherche

Das im Gespräch als „Apris“ bezeichnete Repository ist
[`emfau88/abriss`](https://github.com/emfau88/abriss). Untersucht wurde dessen
`main` am Commit **`edbec0b3ba9eec631745ea1fa252458bf4e3099d`**.
Die Quellenlinks in diesem Dokument sind auf diesen Stand festgelegt.

Zum Recherchezeitpunkt wurden zwei Remote-Branches gefunden: `main` und
`feature/menu-crew-weapon-presentation`. Letzterer lag 18 Commits hinter `main`
und enthielt keine darüber hinausgehenden Commits. Ein eigener aktueller
Burrow-Branch wurde nicht gefunden. Burrow liegt bereits unter `src/burrow/`
im selben Repository, mit getrenntem Einstieg `burrow.html`.

Gelesen wurden Code, Dokumentation und Konfiguration. Die Karten-Vorschaubilder
wurden betrachtet; für Burrow zusätzlich das ältere
[Prüfbild zum Oberflächendurchbruch aus Task 043][burrow-qa043]. Dieses Bild
belegt nicht den gesamten aktuellen Feed–Grow-Stand.
Ein aktueller Live-Spieltest, eine Leistungsmessung und ein vollständiger
20-Minuten-Export wurden für diese Recherche nicht durchgeführt.

Die Abriss-README beschreibt Burrow teilweise noch anhand von Task 046.
Für den aktuellen Funktionsumfang wurden auch Code und Task 048 berücksichtigt.
Vor einer späteren Umsetzung müssen Zielbasis, Quellenstand und relevante
Projektregeln erneut geprüft werden. Dieser Plan behauptet keinen dauerhaft
aktuellen Stand der verlinkten Repositories.

## 3. Was in Abriss bereits vorhanden ist

### Zwei reguläre Karten

| Karte | Gestaltung und Aufbau |
|---|---|
| Sonneninseln (`good-mood`) | Freundliche Cartoon-Landschaft mit farbigen Erdschichten, einer großen unteren Landform und zwei schwebenden Inseln. |
| Orbitaler Urlaub (`space-resort`) | Asteroidenterrain mit drei schwebenden Inseln, unterschiedlichen Bodenniveaus, großer Senke und kleinen Urlaubsdetails. |

Beide Karten verwenden einen Hintergrund und eine Terrain-Grafik mit Transparenz
in 3200 × 1800 Bildpunkten. Aus der Transparenz des Terrainbilds wird eine
1600 × 900 Zellen große Kollisionsmaske abgeleitet. Die sichtbare Textur bleibt
in voller Weltauflösung erhalten. Details: [Kartenassets][maps-assets] und
[Kartenkatalog][maps-catalog].

Die `BinaryTerrainMask` kann Boden abfragen, kreisförmige Bereiche entfernen,
Standflächen suchen und die geänderten Bereiche melden. Zerstörung verändert
damit die tatsächliche Kollisionsgrundlage. Der Renderer verwendet dieselbe
Maske und zeichnet Kraterränder. Das ist eine geeignete Basis für organische
Krater und später auch Tunnel. [Terrainmaske][terrain-mask],
[Bildimport][terrain-import], [Darstellung][terrain-renderer].

Der Name `TerrainFall` bezeichnet die Fallauflösung von Figuren nach Wegfall
ihres Bodens. Daraus folgt keine allgemeine Physik für einstürzende Erdblöcke.
Eine umfassende Material-, Sand-, Flüssigkeits- oder Einsturzsimulation ist
nicht Teil der nachgewiesenen Basis.

### Für spätere Kämpfe nutzbare Grundlagen

Abriss besitzt bereits autonome Aktionsplanung, Ballistik, lokale Bewegung,
Explosionseffekte auf Figuren und eine unabhängig von der Darstellung ausführbare
Matchlogik. Diese können später gezielt untersucht und übernommen werden.
Der erste Terrain-Schritt benötigt weder den kompletten Teammanager noch dessen
Menüs, Freischaltungen, Spielerkommandos und Figurenkader.

## 4. Was in Burrow bereits vorhanden ist

Der aktuelle Prototyp verbindet Untergrundjagd und Oberflächenaktionen bereits
in einer **2D-Seitenansicht**. Die recherchierte Welt ist 2560 × 1280 Einheiten
groß; unter einer leicht welligen Oberfläche liegt ein zusammenhängender Boden.
Der aktive Lauf beginnt im Boden, ohne vorbereiteten Starttunnel.

Vorhanden sind unter anderem:

- Nahrung, aufbrechbare Futterobjekte und mehrere Rollen unterirdischer Wurmbeute.
- Biomasse, die Körperlänge und Breite verändert; höhere Stufen erhöhen Tempo
  und Macht. Das Wachstum ist im vorhandenen Prototyp begrenzt.
- Die Mutationen Sogschlund, Donnerrachen und Bebenherz.
- Grabbewegung, Bewegung in freien Bereichen, Flug mit Schwerkraft und Eintauchen.
- Durchbrüche und Einschläge an der Oberfläche sowie Kutschen als Oberflächenziele.
- Ein Abschluss des Laufs und ein Neustart.

Ältere Module für Hütten, Stützen, Tiere und Schreine sind vorhanden, gehören aber
nicht sämtlich zur aktiven Feed–Grow-Session. Der Drei-Level-Plan ist ebenfalls
kein Beleg dafür, dass alle geplanten Level spielbar sind.
[Aktueller Ausbau][burrow-task48], [aktive Session][burrow-session],
[Bewegung][burrow-motion].

### Die beiden Terrainvarianten nicht verwechseln

| Variante | Tatsächliches Verhalten | Möglicher Nutzen im Simulator |
|---|---|---|
| A: `persistent` | Normales Graben entfernt dauerhaft Boden aus der Maske. Heute für technische Regressionstests erhalten. | Sichtbar wachsende Tunnelnetze; benötigt eine begrenzte Episode oder neue Weltabschnitte. |
| B: `recovering` | Aktive Variante. Normales Graben erzeugt eine zehn Sekunden aktive Schnellspur, ohne die Bodenmaske dauerhaft auszuhöhlen. Durchbruch und schneller Einschlag können bleibende Krater erzeugen. | Gute Ausgangsbasis für längere Jagd- und Wachstumsläufe. |

„Recovering“ bedeutet hier nicht, dass beliebige Krater durch eine allgemeine
Weltphysik wieder zuwachsen. Temporäre Bewegungsspuren und dauerhafte
Oberflächenzerstörung sind getrennte Mechaniken. Burststart allein erzeugt in
der aktiven Variante kein Loch. [Variantenentscheid][burrow-variants],
[Terrainimplementierung][burrow-terrain].

Ein vorhandener automatischer Testfahrer steuert vollständige Runs mit normalen
Richtungs-, Burst- und Mutationseingaben. Er ist eine nützliche Ausgangsbasis,
aber noch kein für Zuschauer abgestimmter Autopilot. Die bisherigen Start-,
Mutations- und Abschlussdialoge müssten für Videos automatisch abgewickelt werden.
[Testfahrer][burrow-driver].

## 5. Was „übernehmen“ technisch bedeutet

Die Integration wäre eine **lokale, versionierte Übernahme ausgewählter Dateien**:

1. Geeignete Kartenbilder und Simulationsmodule aus einem festgelegten
   Abriss-Commit auswählen und ihre Abhängigkeiten prüfen.
2. Herkunft, ursprünglichen Pfad und Quell-Commit dokumentieren; bei Assets
   zusätzlich Prüfsummen und vorhandene Herkunfts-/Nutzungshinweise festhalten.
3. Die ausgewählten Teile in den Simulator übernehmen und ihre Schnittstellen
   sowie Darstellung an dessen Architektur anpassen.
4. Verhalten mit geeigneten Originalfällen vergleichen und die neue Einbindung
   im Simulator prüfen.

Während Vorschau und Videoexport würden diese Dateien aus unserem Projekt
geladen. Es wäre kein laufender GitHub-Zugriff und kein Nachladen aus Abriss
erforderlich. Änderungen in Abriss würden nicht automatisch in unseren Simulator
gelangen. Eine spätere Aktualisierung wäre eine bewusste, überprüfbare Änderung.
Ein Git-Submodul oder die Einbettung der kompletten Abriss-Webanwendung wird für
diesen Umfang nicht empfohlen.

Abriss verwendet TypeScript und Phaser; der Simulator verwendet JavaScript,
PixiJS/Matter.js und bereits einen Canvas2D-Adapter. Daher sind Kartenbilder und
darstellungsunabhängige Fachlogik die geeigneten Übernahmestellen. Die
Phaser-Szenen und ihre Spielschleife würden durch Simulator-Adapter ersetzt.
Für den begrenzten ersten Schritt ist eine kleine JavaScript-Portierung der
benötigten Module naheliegend. Eine umfassende Umstellung des Simulators auf
TypeScript oder Phaser ist keine Voraussetzung.

## 6. Anschluss an den vorhandenen Simulator

| Bestehender Bereich | Empfohlene Verwendung |
|---|---|
| `src/core.js`: Szenario-Registry | Neue IDs für Artillerie und Burrow mit eigenen Standardwerten und Reglern registrieren. |
| Simulationsvertrag | `stepOnce`, `t`, `step`, `snapshot`, `checkInvariants`, `stateHash` und `destroy` vollständig erfüllen. |
| `src/canvas-scene.js` | Karten und Wurm über den bestehenden Canvas2D-/Pixi-Anschluss zeichnen; Zeichnen darf die Simulation nicht fortschreiben. |
| `src/scenarios/scrap/episode.js` | Ableitung von Folgeseeds, Ergebnispausen und Punkteständen als Muster verwenden. Keine Abhängigkeit von Scrap-Roboterregeln aufbauen. |
| Reframe-Hook im Kern | Kartenkoordinaten von Ausgabeformat und Kamera trennen; Formatwechsel soll bei diesen neuen Szenarien die Welt erhalten. |
| `lib/exporter.mjs` und vorhandene Audioanbindung | Bestehenden MP4-Weg sowie zeitgestempelte Klangereignisse weiterverwenden. |
| Konfiguration und Export-Metadaten | Seed, Karten-ID, Terrainvariante, Profil und Regelversion nachvollziehbar speichern. |

Der Host liefert feste 60-Hz-Schritte. Burrows Bewegungslogik erwartet ebenfalls
60 Hz; die 120-Hz-Unterteilung von Scrap ist eine Besonderheit dieses Szenarios,
keine allgemeine Hostvorgabe. Filmtempo muss genau einmal im Adapter berücksichtigt
werden. Zufall, Bewegung, Kameraereignisse und Effekte dürfen für reproduzierbare
Exporte nicht von der realen Uhrzeit oder der Renderbildrate abhängen.

Neue Logik soll in eigenen Szenarioordnern liegen. Zunächst reicht ein kleines
Terrainmodul bei der Artillerie. Wenn Burrow tatsächlich hinzukommt, können
gemeinsam benötigte Bodenabfragen und Zerstörungsoperationen in ein gemeinsames
Modul gezogen werden. Es braucht vorab kein allgemeines Terrainframework.
Burrows temporäres Spurenfeld bleibt eine eigene Funktion.

Die heutigen Scrap-Deckungen sind ganze rechteckige Objekte mit Trefferpunkten.
Sie werden bei Zerstörung entfernt. Diese Regeln müssen für organische Krater
und Tunnel nicht umgebaut werden.

## 7. Projektgröße, Leistung und Schutz vorhandener Szenarien

Mehr Szenarien bedeuten mehr Code und Assets. Daraus folgt nicht automatisch eine
langsamere laufende Simulation; entscheidend sind Laden, aktive Ressourcen und
gemeinsame Abhängigkeiten. Wartungsaufwand entsteht dennoch und muss begrenzt werden.

- **Assets bedarfsgerecht laden:** Große Karten und Wurmgrafiken erst beim
  ausgewählten Szenario laden. Inaktive Szenarien sollen keine eigenen
  Simulationen, Timer oder großen Texturen im Hintergrund behalten.
- **Ressourcen freigeben:** Beim Szenariowechsel Texturen, Masken, Listener und
  Ereignispuffer über den vorgesehenen Lebenszyklus aufräumen.
- **Terrain effizient berechnen:** Veränderte Bereiche beziehungsweise Kacheln
  aktualisieren, statt nach jedem Treffer die ganze Maske neu zu erzeugen.
  Kein eigener Matter-Körper pro Bodenpixel.
- **Tatsächliche Renderkosten messen:** `CanvasScene` lädt derzeit bei jedem
  Zeichnen die vollständige Canvastextur neu hoch. Lokale Terrainänderungen
  sparen Berechnungen, garantieren aber noch keinen teilweisen GPU-Upload.
  Einen aufwendigeren Renderer erst bei nachgewiesenem Bedarf vorsehen.
- **Wachstum begrenzen:** Wurmsegmente, Partikel, Trümmer, Beute und Spuren brauchen
  nachvollziehbare Obergrenzen. Wachstum darf die Speicherbelegung nicht
  unkontrolliert vergrößern.
- **Klangereignisse bündeln:** Ereignisse je Explosion, Fang oder Durchbruch
  erzeugen, nicht je entferntem Bodenpixel. Der Export sammelt Ereignisse über
  die Episode; ein zu dichtes Protokoll kann bei langen Videos teuer werden.
- **Kernänderungen klein halten:** Gemeinsame APIs nur erweitern, wenn eine
  konkrete Anforderung es verlangt. Bestehende Standards und Regeln erhalten.

Ein isolierter Branch mit eigener Arbeitskopie schützt den aktuellen
Arbeitsstand während der Entwicklung. Er ist keine Garantie gegen Fehler nach
einem späteren Merge. Deshalb sind Vergleichsprüfungen und eine getrennte
Übernahmeentscheidung weiterhin nötig.

## 8. Wie eine ungefähr 20-minütige Episode entstehen könnte

Der Export akzeptiert bereits `20m` beziehungsweise 1200 Sekunden. Die gemeinsamen
Langvideo-Vorlagen setzen bislang 600 Sekunden. Eine neue Vorlage wäre somit
eine begrenzte Konfigurationsänderung; ein neuer Videoencoder ist nicht nötig.
20 Minuten bei 30 fps ergeben 36.000 Einzelbilder. Exportdauer, Speicherbedarf
und Bildqualität der neuen Szenarien sind noch nicht gemessen.

### Artillerie

Als erster Videomodus empfiehlt sich eine Folge abgeschlossener Kämpfe mit
wechselnden Karten oder Startkonstellationen, fortlaufendem Punktestand und
einem Gesamtergebnis. Die Karten können zwischen Runden zurückgesetzt werden.
Dadurch bleibt nicht nach wenigen Minuten nur noch eine leere Landschaft übrig.

Eine Episodensteuerung muss mit frühen Siegen, unentschiedenen Situationen und
dem nahenden Videoende umgehen. Eine feste Rundenzahl allein garantiert keine
20 Minuten. Vor Umsetzung ist festzulegen, ob eine ungefähre Länge genügt oder
ein zeitlich genaues Ende mit vorher beginnender Schlussphase nötig ist.
Die Länge sollte nicht durch lange Wartezeiten oder extrem hohe Lebenspunkte
erzwungen werden.

### Burrow

Der bisherige Spielbogen ist für kurze Durchläufe gedacht; Nahrung und Beute
sind endlich, Wachstum hat Grenzen und die Schlusskutsche beendet den Run.
Einfach die Exportdauer zu erhöhen erzeugt noch kein tragfähiges Langvideo.

Der kleinere erste Ausbau wären mehrere automatische Läufe mit wechselnden
Mutationen und Varianten. Ein einzelner durchgehender 20-Minuten-Aufstieg wäre
ein zusätzlicher Umfang: abgestimmter Nachschub, neue Wachstumsstufen,
anspruchsvollere Beute, stärkere Oberflächenziele und ein Abschluss.
Bei permanenten Tunneln braucht es außerdem neue Weltabschnitte oder einen
bewusst begrenzten Zerstörungsverlauf.

Für die Seitenansicht empfiehlt sich eine ruhige Grundansicht mit sichtbarer
Erdoberfläche, ergänzt durch zurückhaltende Fahrten zu wichtigen Ereignissen.
Der vorhandene direkte Kamerafokus auf den Wurmkopf zeigt bei großer Tiefe nicht
immer Himmel und Boden zugleich. Ständiges Herauszoomen darf das wahrnehmbare
Wachstum nicht aufheben. Eine feste Übersicht oder eine Kamera mit weicher
Nachführung bleibt eine gestalterische Entscheidung.

## 9. Mögliche Etappen nach einem späteren Umsetzungsauftrag

Die folgende Reihenfolge ist eine Empfehlung. Welche Etappen umgesetzt werden,
richtet sich nach dem später vereinbarten Auftrag; sie können einzeln oder
zusammen beauftragt werden.

| Etappe | Begrenzter Umfang | Entscheidungskriterium |
|---|---|---|
| A: Ausgangsbasis festlegen | Dann aktuellen Simulatorstand und Quell-Commit prüfen; isolierten Implementierungsbranch anlegen; relevante bestehende Prüfungen als Vergleich erfassen. | Arbeitsbasis und vorhandene Einschränkungen sind klar dokumentiert. |
| B: Eine Karte und Zerstörung | Sonneninseln als neues Terrain-Demoszenario, Hintergrund, Maske, deterministische Testprojektile, Krater und einfache Standflächenprüfung. | Bild und Kollision stimmen überein; Vorschau und kurzer Export funktionieren. |
| C: Kartenbasis abschließen | Zweite vorhandene Karte, Kartenwahl, Reset, Framing, Ressourcenfreigabe und Quellenverzeichnis. | Beide Karten funktionieren; Wechsel lässt keine großen Altressourcen zurück. |
| D: Kurzer automatischer Kampf | Einfache Platzhalterfiguren, begrenzte Waffen, Bewegung/Fallen und klarer Rundenausgang; passende Abriss-Logik gezielt übernehmen. | Mehrere Seeds ergeben verständliche Kämpfe ohne dauerhaften Stillstand. |
| E: Burrow als eigener Ausbau | Bewegung, Körper und Wachstum portieren, Autopilot sowie zunächst ein Profil anschließen; zweites Profil danach ergänzen. | Fressen, Wachstum, Ausbruch, Einschlag und Eintauchen funktionieren automatisch und sind lesbar. |
| F: Episoden und Ton | Nach gewähltem Inhalt Folgerunden beziehungsweise Wachstumsläufe, Nachschub, Kamera, Klangereignisse und Abschluss ergänzen. | Der gewählte Ablauf trägt die gewünschte Videolänge ohne Bedienpausen. |
| G: Produktionsprüfung | Nach kurzen Nachweisen und im dafür vereinbarten Umfang Langlauf sowie einen vollständigen repräsentativen 20-Minuten-Export prüfen. | Tatsächliches Video, Ton, Dauer und Ressourcenverhalten sind nachgewiesen. |

Artillerie und Burrow sind eigenständig wählbar. Burrow muss nicht warten, bis
ein vollständiger Artilleriemodus fertig ist. Für eine erste Beurteilung des
Kartentransfers genügt Etappe B; Figuren und die gesamte 20-Minuten-Dramaturgie
sind dafür noch nicht erforderlich.

## 10. Prüfungen für eine spätere Umsetzung

Prüfungen sollen die tatsächlichen Risiken abdecken und vorhandene Fehler vom
neu eingeführten Verhalten unterscheiden. Die aktuelle Dokumentationsarbeit
führt diese zukünftigen Prüfungen nicht aus.

| Bereich | Aussage, die später belegt werden sollte |
|---|---|
| Terrain | Entfernte Zellen sind sichtbar und kollisionsfrei; unveränderte Bereiche bleiben erhalten; Maskengrenzen sind korrekt. |
| Bewegung | Figuren fallen nach Bodenverlust; schnelle Projektile und Würmer überspringen keine relevanten Kollisionen; Eintauchen funktioniert. |
| Burrow-Varianten | Temporäre Spuren laufen korrekt ab; permanente Tunnel beziehungsweise Krater entsprechen dem gewählten Profil. |
| Reproduzierbarkeit | Gleicher Seed, gleiche Regeln und gleiche Simulationszeit ergeben gleiche Zustände und Ereignisse bei 30/60-fps-Ausgabe. Keine Zusage identischer Pixel über unterschiedliche Renderer oder Versionen hinweg. |
| Konfiguration | Speichern/Laden erhält Karte, Profil, Terrainvariante, Tempo und Seed; Formatwechsel verändert bei den neuen Szenarien nur die Darstellung. |
| Lebenszyklus | Wiederholtes Laden, Zurücksetzen und Wechseln zwischen alten und neuen Szenarien hinterlässt keine laufenden Altinstanzen oder wachsenden Texturbestände. |
| Bestehende Funktionen | Relevante bestehende Szenario-, Konfigurations-, Golden- und Exportprüfungen bleiben im vorher erfassten Rahmen erfolgreich; erwartete Registry-Ergänzungen sind ausdrücklich dokumentiert. |
| Video und Ton | Kurze Proben zeigen Krater, Wachstum, Durchbruch, Wiedereintritt und Übergang; Ereigniston passt zur Videozeit. |
| Langlauf | Eine vollständige Episodensimulation prüft Stillstände und Ressourcen; ein separat durchgeführter voller Export prüft den tatsächlichen Film. Beides getrennt berichten. |

Ausschnittsexport für die neuen Szenarien zunächst nicht anbieten. Erst wenn
Vorwärtssimulation und Einstieg in einen Ausschnitt denselben relevanten Bild-,
Kamera- und Tonzustand herstellen, ist diese Funktion abgesichert.
Bestehende Tests nicht durch pauschales Erhöhen von Zeitlimits, Abschalten oder
ungeprüftes Ersetzen von Referenzwerten passend machen.

Die bestehenden Integrationsberichte unterscheiden bereits kurze Filmproben,
reine Simulationsläufe und vollständige Langfilmabnahmen. Dieser Maßstab gilt
auch hier. Eine akzeptierte Dauerangabe ist noch kein Produktionsnachweis.

## 11. Bewusst offene Entscheidungen

Vor Umsetzung der jeweils betroffenen Etappe reichen wenige konkrete Festlegungen:

- Zuerst nur Terrain, anschließend Artillerie, oder Burrow als nächstes Szenario?
- Bei Burrow dauerhafte Tunnel, temporäre Schnellspuren oder beide als Varianten?
- Ein durchgehender Aufstieg beziehungsweise Kampf oder mehrere Läufe/Runden pro Video?
- Ungefähr 20 Minuten oder ein exakt terminierter Abschluss?
- Feste Übersicht oder ruhige automatische Kamera; zuerst 16:9 oder gleich weitere Formate?
- Welche Figuren und Oberflächenziele sollen später hinzukommen?

Bis dahin bleiben diese Punkte offen. Es wird kein umfassender Engine-Umbau,
keine neue Physikengine und keine vollständige Materialsimulation eingeplant.

## 12. Wiederaufnahme und Quellen

Für eine Wiederaufnahme zuerst dieses Dokument, die dann aktuelle Roadmap und
die Projektregeln lesen. Danach den gewünschten Teilumfang benennen und die
damaligen Quellen mit dem aktuellen Stand vergleichen. Keine vollständigen
Repositories ungeprüft zusammenführen. Den Plan bei neuen Erkenntnissen als
Plan aktualisieren; tatsächliche Implementierung und Prüfungen später in einem
eigenen Integrationsbericht festhalten.

Lokale Einstiegspunkte:

- [Simulator-README](../README.md)
- [Aktive Roadmap](ROADMAP.md)
- [Gemeinsamer Integrationsbericht](ALLE_SZENARIEN_INTEGRATION_2026-11-13.md)
- [Territory-Integration als Adapterbeispiel](TERRITORY_INTEGRATION_2026-11-13.md)
- [Szenariokern](../src/core.js)
- [Canvas-Adapter](../src/canvas-scene.js)
- [Scrap-Episodensteuerung](../src/scenarios/scrap/episode.js)

Die folgenden Quellverweise halten den recherchierten Abriss-Stand fest. Sie
dienen der Nachvollziehbarkeit und sind keine Laufzeitabhängigkeiten.

[maps-assets]: https://github.com/emfau88/abriss/blob/edbec0b3ba9eec631745ea1fa252458bf4e3099d/public/assets/maps/README.md
[maps-catalog]: https://github.com/emfau88/abriss/blob/edbec0b3ba9eec631745ea1fa252458bf4e3099d/src/content/maps/mapCatalog.ts
[terrain-mask]: https://github.com/emfau88/abriss/blob/edbec0b3ba9eec631745ea1fa252458bf4e3099d/src/simulation/terrain/TerrainMask.ts
[terrain-import]: https://github.com/emfau88/abriss/blob/edbec0b3ba9eec631745ea1fa252458bf4e3099d/src/content/maps/terrainMaskFromImage.ts
[terrain-renderer]: https://github.com/emfau88/abriss/blob/edbec0b3ba9eec631745ea1fa252458bf4e3099d/src/game/rendering/TerrainMaskRenderer.ts
[burrow-task48]: https://github.com/emfau88/abriss/blob/edbec0b3ba9eec631745ea1fa252458bf4e3099d/tasks/048_BURROW_POWER_FANTASY_SLICE.md
[burrow-session]: https://github.com/emfau88/abriss/blob/edbec0b3ba9eec631745ea1fa252458bf4e3099d/src/burrow/simulation/BurrowFeedingSession.ts
[burrow-motion]: https://github.com/emfau88/abriss/blob/edbec0b3ba9eec631745ea1fa252458bf4e3099d/src/burrow/simulation/BurrowMotion.ts
[burrow-variants]: https://github.com/emfau88/abriss/blob/edbec0b3ba9eec631745ea1fa252458bf4e3099d/docs/burrow/TERRAIN_PLAYTEST.md
[burrow-terrain]: https://github.com/emfau88/abriss/blob/edbec0b3ba9eec631745ea1fa252458bf4e3099d/src/burrow/simulation/BurrowTerrain.ts
[burrow-driver]: https://github.com/emfau88/abriss/blob/edbec0b3ba9eec631745ea1fa252458bf4e3099d/src/burrow/simulation/BurrowFeedingSession.test.ts
[burrow-qa043]: https://github.com/emfau88/abriss/blob/edbec0b3ba9eec631745ea1fa252458bf4e3099d/docs/burrow/qa/task-043/desktop-recovering-breach.png
