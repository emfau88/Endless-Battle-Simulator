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
| 0:10 / 0:14 | Kopf und Schultern des ersten Riesen kommen am Ostpass zum Vorschein. Er erreicht das erste Spielfeld. Bei 0:28 weicht Jades Garnison aus. |
| 2:03 / 2:11 | Warnung und erster Meteoreinschlag. Der Weg ist bei 2:44 wieder frei. |
| 2:15 | Der erste Riese ist hinter dem Westpass verschwunden. |
| 3:28 / 4:59 | Die ersten beiden Hauptquartiere fallen. |
| 6:27 / 6:35 | Der zweite Meteor trifft einen benutzten Weg an der Front zwischen Azur und Jade. Bei 7:01 ist er wieder offen. |
| 8:08 | Dritter Auftritt des Riesen. |
| 9:55 / 10:04 | Das letzte Hauptquartier fällt. Nach neun Sekunden Ergebnisanzeige endet der Film. |

Die Vorlage enthält insgesamt zwei Einschläge, drei Riesenauftritte und 17 ausgelöste Rückzüge. Das Videoende richtet sich nach dem Sieg. Andere Seeds können erheblich länger laufen. In reinen Vorläufen der Seeds 1 bis 120 erreichten alle eine Entscheidung, Seed 74 erst nach mehr als einer Stunde Videozeit.

## Bergpässe, HQ-Reaktionen und Ton

Der Aufstieg hinter der Felskante beginnt fünf Spielsekunden vor dem ersten betretenen Feld. Beim letzten Feld führt der Weg in einer Schrittlänge um die Rückseite des gegenüberliegenden Bergs. Die Projektion berücksichtigt den Kamerawinkel und die Felsflächen des Geländes. Das erste Spielfeld, die Rückzüge und der Sieg folgen weiter dem gleichen Spielablauf.

Über dem Namensschild eines beteiligten HQs erscheint für 2,2 Videosekunden ein gezeichnetes Gesicht. Zwei Reaktionen liegen mindestens 65 Videosekunden auseinander, beim selben Reich mindestens 95 Sekunden. Ein Riese löst pro Durchquerung höchstens eine Blase aus. Für einen Meteor zählen der versorgte Besitz am Einschlagort und bereits auf diesem Weg marschierende Truppen. Reaktionen sind auch bei einem gefährlichen Angriff auf die eigene Burg, einer knappen Abwehr, einer eroberten Burg oder der Übernahme der Zitadelle von einem größeren Gegner möglich.

| Videozeit in Seed 46 | Wer reagiert und warum |
|---|---|
| 0:28 | Jade blickt zum Riesen, der fünf Einheiten zum Rückzug zwingt. |
| 3:25 | Solar erschrickt über die anrückende Kolonne, die kurz darauf seine Burg einnimmt. |
| 4:42 | Jade beobachtet einen weiteren Rückzug vor dem Riesen. |
| 6:27 | Azur erschrickt über den Meteor am eigenen Nachschubweg. Beim ersten Meteor am leeren Pass bleibt die Karte ruhig. |
| 7:47 | Jade grinst nach der Rückeroberung der Zitadelle vom größeren Azur. |
| 9:52 | Jade sieht die entscheidende Kolonne auf die eigene Burg zukommen. |

Die Großkarte enthält keinen Klang für normale Märsche. Eroberungen haben einen kurzen, weichen Klick. Der schwere Schritt bei einem Rückzug, Wind, Einschlag, Gefechte und Sieg sind weiter hörbar. Die Sprechblasen sind stumm.

## Prüfung der ersten Fassung

- Die 28 Simulationstests für Großkarte, Original und Short bestanden. Sie prüfen unter anderem Einheitenbilanz, geschlossene und wieder geöffnete Wege, den Rundenwechsel, die bestehenden Referenzverläufe und die automatische Länge der neuen Vorlage.
- Der zusätzliche Browsertest wählt die Variante in der Oberfläche, lädt die Filmvorlage und vergleicht vier PNG-Bilder zwischen Wiedergabe und Simulationssprung. Die Bilder und der Simulationszustand stimmten überein.
- `npm run golden` verglich 36 bestehende Referenzfälle mit je zwei Prüfpunkten. Alle stimmten mit der hinterlegten Referenz überein.
- Die lokale 20-Sekunden-Probe enthält 600 Bilder in 1280 × 720 bei 30 fps, H.264 und AAC-Stereo mit 48 kHz. Die Exportprüfung bestätigte Dauer, Codecs, Bildzahl und Simulationszustand. Die Lautheit betrug −14,06 LUFS.
- Der vollständige Verlauf wurde simuliert. Die Bildprüfung nutzte Einzelbilder des Riesen, des anfliegenden Meteors und des Kraters aus der laufenden Variante. Die MP4-Probe umfasst den Filmanfang. Der vollständige Langfilm und die vollständige Testsuite waren nicht Teil der Prüfung.

## Prüfung der Bergpässe, Reaktionen und Tonspur

- Die drei Tests der Großkarte und die drei Territory-Tontests bestanden. Ein zusätzlicher Vergleich mit `ec2b293` ergab für die Seeds 1, 7, 32 und 46 am Rundenende jeweils denselben Simulationszustand und dieselbe Ereignisfolge.
- Der Browsertest öffnete die Langvideo-Vorlage über die Oberfläche. Zehn Standbilder stimmten zwischen Wiedergabe mit Zwischenbildern und direktem Simulationsvorlauf pixelgenau überein. Bildausschnitte am Ost- und Westpass zeigten jeweils die teilweise sichtbare Figur zwischen freiem Feld und vollständiger Verdeckung. Jades und Azurs Blasen wurden an ihren eigenen HQs gezeichnet.
- Der Referenzvergleich bestätigte alle 36 Fälle an je zwei Prüfpunkten. Der Lauf von Seed 46 enthält 2.969 Marschbefehle und null hörbare Marschglocken.
- Die lokale Datei `bergpass-und-hq-20s.mp4` zeigt vier Originalausschnitte aus dem Film. Sie enthält 600 Bilder in 1280 × 720, H.264 bei 30 fps und AAC-Stereo mit 48 kHz. Die fertige Tonspur misst −14 LUFS und −2,8 dBTP. Die Montage umfasst Auftritt, Jades ersten Rückzug, Abgang und Azurs Meteorwarnung.
- Der ganze Verlauf wurde simuliert. Der vollständige Langfilm und die vollständige Testsuite waren nicht Teil dieses Nachtrags.

Die Einzelbilder, die Acht-Bilder-Folge `bergpaesse-ablauf.jpg` und die MP4-Proben liegen in `output/territory-grosskarte/` im Hauptordner.

Der Renderer verwendet für bestehende Karten weiterhin den archivierten Beschriftungsblock. Bei einer HQ-Reaktion auf der Großkarte berücksichtigt die zusätzliche Zeichenroutine auch die Sprechblase bei der Platzierung der Marschzahlen.
