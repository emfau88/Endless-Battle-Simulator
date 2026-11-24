# Territory Wars · Großkarte mit Meteor und Riese

Stand 24.11.2026. Die zusätzliche Untervariante ist für ein Langvideo im Querformat ausgelegt.
Unter **Territory Wars → Kartenform → Großkarte · Meteor und Riese (Langvideo 16:9) → Karte anwenden** öffnet sich die Karte. **Langvideo · Meteor und Riese** lädt die abgestimmte Vorlage mit Seed 46, 1080p30 und Ton. [Filmvorlage](../presets/territory-meteor-riese-lang.json)

## Die Karte

Die vier Reiche beginnen auf einer Karte mit 221 Hexfeldern. Die bisherige Querformatkarte hat 169 Felder. Die Kamera passt die gesamte Karte mit den vier Burgen in die feste Übersicht ein. Die Fraktionsstände stehen rechts.

Ein wandernder Schatten und ein Ring markieren die Einschlagstelle sechs Spielsekunden vorher. Bereits unterwegs befindliche Kolonnen können ankommen. Neue Märsche weichen aus. Beim Einschlag schließt der Krater das Feld für alle vier Reiche. Auch die Versorgung folgt den verbliebenen Verbindungen. Nach 20 bis 28 Spielsekunden öffnet sich der Durchgang. Zitadelle und Burgen sind von der Zielauswahl ausgenommen.

Der neutrale Steinriese geht über benachbarte Felder. Beim Betreten eines besetzten Felds weichen bis zu 65 Prozent der Garnison auf ein erreichbares eigenes Nachbarfeld aus. Die Einheiten sind als Kolonne unterwegs und zählen weiter zum selben Reich. Isolierte Garnisonen bleiben stehen. Der Riese beansprucht selbst kein Gebiet.

Die Regelversion `territory-wilds-v1` verwendet getrennte Seed-Zufallsströme für Meteor und Riese. Die Originalregeln und die archivierte Kartendarstellung sind weiter über ihre bisherigen Vorlagen erreichbar.

## Filmverlauf der Vorlage

| Videozeit | Ereignis |
|---|---|
| 0:14 | Der erste Riese betritt die Karte. Bei 0:28 weicht die erste Garnison aus. |
| 2:03 / 2:11 | Warnung und erster Meteoreinschlag. Der Weg ist bei 2:44 wieder frei. |
| 3:28 / 4:59 | Die ersten beiden Hauptquartiere fallen. |
| 6:27 / 6:35 | Der zweite Meteor trifft einen benutzten Weg an der Front zwischen Azur und Jade. Bei 7:01 ist er wieder offen. |
| 8:08 | Dritter Auftritt des Riesen. |
| 9:55 / 10:04 | Das letzte Hauptquartier fällt. Nach neun Sekunden Ergebnisanzeige endet der Film. |

Die Vorlage enthält insgesamt zwei Einschläge, drei Riesenauftritte und 17 ausgelöste Rückzüge. Das Videoende richtet sich nach dem Sieg. Andere Seeds können erheblich länger laufen. In reinen Vorläufen der Seeds 1 bis 120 erreichten alle eine Entscheidung, Seed 74 erst nach mehr als einer Stunde Videozeit.

## Prüfung

- Die 28 Simulationstests für Großkarte, Original und Short bestanden. Sie prüfen unter anderem Einheitenbilanz, geschlossene und wieder geöffnete Wege, den Rundenwechsel, die bestehenden Referenzverläufe und die automatische Länge der neuen Vorlage.
- Der zusätzliche Browsertest wählt die Variante in der Oberfläche, lädt die Filmvorlage und vergleicht vier PNG-Bilder zwischen Wiedergabe und Simulationssprung. Die Bilder und der Simulationszustand stimmten überein.
- `npm run golden` verglich 36 bestehende Referenzfälle mit je zwei Prüfpunkten. Alle stimmten mit der hinterlegten Referenz überein.
- Die lokale 20-Sekunden-Probe enthält 600 Bilder in 1280 × 720 bei 30 fps, H.264 und AAC-Stereo mit 48 kHz. Die Exportprüfung bestätigte Dauer, Codecs, Bildzahl und Simulationszustand. Die Lautheit betrug −14,06 LUFS.
- Der vollständige Verlauf wurde simuliert. Die Bildprüfung nutzte Einzelbilder des Riesen, des anfliegenden Meteors und des Kraters aus der laufenden Variante. Die MP4-Probe umfasst den Filmanfang. Der vollständige Langfilm und die vollständige Testsuite waren nicht Teil der Prüfung.

Die lokalen Einzelbilder und die MP4-Probe liegen in `output/territory-grosskarte/` im Hauptordner.
