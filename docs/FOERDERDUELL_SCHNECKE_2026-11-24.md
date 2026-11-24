# Schnecke gegen Stempel · Kontakt mit der Windung

Am 24. November 2026 wurde der Transport der linken Bahn korrigiert. In der ersten
Filmprobe wanderten ein wiederholtes Gewindebild und die Kugeln mit getrennten Geschwindigkeiten
bergauf. Beim Nachspielen konnte eine Windung durch eine Kugel laufen. Programmstand für die
neuen Filme ist `caac7c8`, die Förderregel in den Rezepten heißt `contact-v2`.

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
