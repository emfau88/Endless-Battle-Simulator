# Schnecke gegen Stempel · Drehung und Kontakt mit der Windung

Am 24. November 2026 wurde der Transport der linken Bahn korrigiert. In der ersten
Filmprobe wanderten ein wiederholtes Gewindebild und die Kugeln mit getrennten Geschwindigkeiten
bergauf. Beim Nachspielen konnte eine Windung durch eine Kugel laufen. Programmstand für die
ersten Kontaktproben ist `caac7c8`, die Förderregel in den Rezepten heißt `contact-v2`.
Die zweite [Filmprobe bei Normaltempo](#sichtbare-drehung-im-simulator) zeigt die überarbeitete Sicht auf die Welle.

## Mechanik

- Die Welle dreht in festen Lagern. Eine Messingmarke sitzt an einer festen Stelle des Blatts.
  Nach 0,45 Sekunden bei Normaltempo steht die Marke wieder am Ausgangspunkt.
- Die Dosierung gibt jede zweite Tasche frei. Die Kugel fällt vor der Welle in die untere Rinne
  und rollt unter der Schwerkraft kurz zurück. Die bergseitige Fläche der nachlaufenden Windung
  fängt sie auf. Ab dem Kontakt ergibt sich der Weg aus dem Drehwinkel und der Gewindesteigung.
- Die Darstellung berücksichtigt Kugelradius, Stärke des Blatts und die räumliche Neigung der
  Flanke. Beim Auswurf endet das Blatt am letzten Berührpunkt. Die Kugel verlässt es mit ihrer
  Fördergeschwindigkeit und wird durch den Auslauf nach unten geführt.

Das Modell berechnet den freien Lauf und den unelastischen Stoß entlang der Rinne.
Einwurf und Auslauf folgen der Führung. Die neue Regel gilt auch beim Laden einer älteren
Vorlage. Die Rezepte der ersten Filme verweisen auf ihren damaligen Git-Stand.

## Prüfung und Filmproben

- Sieben Simulationstests bestanden. Beim angehaltenen Antrieb rollt die Kugel aus und kehrt
  unter der Schwerkraft an die stehende Flanke zurück. Beim Wiederanfahren schiebt diese sie
  weiter. Die beiden Kontrollrennen, der Gleichstand und die zehnminütige Rennserie sind geprüft.
- Der Browsertest misst in 9:16, 16:9 und 1:1 an je 360 Zeitpunkten den Abstand des
  Kugelmittelpunkts zum Metall. Beim Fördern lag der Abstand innerhalb von 0,2 Prozent eines
  Kugelradius am Sollwert. Einwurf und Auslauf hielten ebenfalls die Kollisionsgrenze ein.
  Sieben Bildpaare bei Wiedergabe und nach Zeitsprung stimmten pixelweise überein.
- In beiden Videoformaten entstanden aus der endgültigen Vorschaukopie und dem Simulator
  je ein Gesamtbild und vier Detailbilder. Alle zehn PNG-Paare waren bytegleich.
  Der Referenzlauf meldete 36 Fälle mit je zwei identischen Hashes. Geprüft wurden die
  betroffenen Tests und die Referenzen.
- Der vollständige Short hat 369 Bilder bei 1080 × 1920 und dauert 12,3 Sekunden.
  Die Querformatprobe hat 210 Bilder bei 1920 × 1080 und zeigt sieben Sekunden bei
  64 Prozent Tempo. Beide Exporte verwenden Seed 42, H.264 mit 30 Bildern pro Sekunde
  und AAC-Stereo mit 48 kHz. Die Nahaufnahme ist ein Bildausschnitt aus dem Querformat.
  Ihre 210 Bilder und die identische AAC-Spur wurden separat geprüft.

Die lokalen Filme liegen im Hauptordner unter `output/foerderduell-schneckenkontakt-2026-11-24/`.
`schnecke-nah.mp4` zeigt den Kontakt, `rennen-hoch.mp4` das vollständige Rennen bei Normaltempo.
Die Querformatquelle `quer-zeitlupe.mp4` und der Short haben je ein JSON-Rezept.

## Sichtbare Drehung im Simulator

Im ersten Film blieb der Deckel am oberen Wellenende starr. Von der Seite sah die gleichförmige
Windung aus, als würde sie längs durch das Glas wandern. Außerdem zeigte die Ideenauswahl ein Standbild.
Seit `26aa7cc` sieht man schräg auf die Stirnseite. Ein messingfarbener Arm läuft innerhalb des
fest verschraubten Lagerrings um. Auf dem Schneckenblatt tragen mehrere Windungen einen Messingstrich.
Er verschwindet hinter der Welle und kommt nach einer Umdrehung vorn wieder zum Vorschein.
Nabe, Blatt und Kugelkontakt verwenden denselben Drehwinkel.

Die Ideenauswahl spielt jetzt beide Zuläufe mit dem Renderer des Simulators. Im Simulator startet ein
Einzelrennen nach der Ergebnisanzeige wieder mit demselben Seed. Sein MP4 endet mit dem ersten Ergebnis.
Der Short und die sechssekündige Querformatprobe liefen bei Normaltempo. Je 180 aufeinanderfolgende
Bilder aus beiden codierten Filmen wurden ausgewertet. Die goldene Speiche rückte in jedem Bild in derselben
Richtung weiter. Aus ihrer gemessenen Winkeländerung ergeben sich in beiden Formaten 0,450 Sekunden pro Umlauf.

| Lokale Datei in `output/foerderduell-drehung-2026-11-24/` | Inhalt |
|---|---|
| `rennen-hoch.mp4` | Ganzes Rennen bei zwei Schüben, 12,3 s, 1080 × 1920, 369 Bilder |
| `drehung-quer.mp4` | Gleichmäßiger Zulauf, Sekunde 2 bis 8, 1920 × 1080, 180 Bilder |
| `schnecke-normaltempo.mp4` | Ausschnitt der Schnecke aus dem Querformat, 960 × 720, alle 180 Bilder mit der AAC-Tonspur der Quelle |

Die sieben Simulationstests und beide Browsertests bestanden. Der Browsertest prüft auch die Lage
der Messingmarken in beiden Formaten, den Neustart des Einzelrennens und die Wiedergabe in der Ideenauswahl.
Die zwölf PNG-Paare aus der Entwurfskopie und dem Simulator waren bytegleich. Die Referenz-Hashes wurden
bei der Änderung des Fördermodells geprüft. Für diese neue Ansicht wurde der Bildvergleich wiederholt.

## Wie nah ist die Bewegung am Vorbild?

Eine rotierende Windung kann eine Kugel in einem festen Rohr bergauf schieben. Im Modell ist die Kugel
nach dem Einfangen unten in der Rinne geführt. Solange sie dort an der Windung anliegt, ergibt sich
geometrisch genau eine Gewindesteigung Vorschub je Umdrehung.

Eine lose Kugel kann an der Rohrwand seitlich mitlaufen, sich um die eigene Achse drehen und
an der Windung gleiten. Dreht sie ein Stück mit der Welle mit, fällt ihr Vorschub je Umdrehung
entsprechend kleiner aus. Reibung, Neigung und Drehzahl beeinflussen die Bewegung. Versuche mit
Schüttgut und eine an Experimenten geprüfte Simulation kugelförmiger Partikel beschreiben solche
Umfangsbewegungen. [Roberts, 1999](https://www.sciencedirect.com/science/article/pii/S003259109900039X) · [Minglani u. a., 2021](https://www.sciencedirect.com/science/article/abs/pii/S0032591020312080)

Die Szene löst den Kontakt und die Schwerkraft längs der Rinne. Die seitliche Führung,
die Vereinzelung am Einlauf und die Bahn im Auslauf sind vorgegeben. Die Eigenrotation der Kugel,
Gleitreibung und Stöße zwischen Kugeln im Rohr sind im Modell unberücksichtigt. Die Prüfung
belegt den Abstand zwischen Kugel und Blatt. Für die tatsächliche Bahn und Förderzeit einer
Glaskugel in diesem Aufbau fehlen Messdaten.
