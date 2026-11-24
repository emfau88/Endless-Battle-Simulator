# Schnecke gegen Stempel im Simulator

Am 24. November wurde die Förderschnecke korrigiert. Die neuen Filmproben und Kontaktmessungen
stehen im [Bericht zur rotierenden Windung](FOERDERDUELL_SCHNECKE_2026-11-24.md).

Stand 22. November 2026. Die Szene ist unter `foerderduell` auswählbar. Der Short filmt ein
Einzelrennen mit Ergebnis. In der Rennserie beginnen beide Bahnen jede Runde mit derselben neuen
Lieferfolge. Die [Bildprobe](FOERDERDUELL_BILDPROBE_2026-11-22.md) und die Szene nutzen dieselbe
Zeichnung für Graphitwand, Stahlschnecke, Kupferstempel und Messgläser.

## Rennen

Beide Maschinen erhalten je 24 Kugeln in derselben Farbreihenfolge. Bei wechselnden Portionen
bestimmt der Seed Liefermenge und Abstand. Ein eigener Zufallsstrom färbt die Glaskugeln. Die
Schnecke nimmt pro Maschinentakt eine verfügbare Kugel auf. Der Kolben entleert ab Takt 4 alle
sechs Takte bis zu sieben Kugeln. Die Kugeln passieren Magazin, Zulauf, Maschine und Fallrohr
bis zum tatsächlichen Auftreffen im Glas. Jede Landung erhöht den sichtbaren Zähler.

Die zwölfte Kugel entscheidet. Erreichen beide Bahnen die Marke im selben Maschinentakt, zählt
die Runde als Unentschieden. Angefangene Hübe werden für die Wertung dieses Takts zu Ende gezählt.
Ein Takt dauert bei Normaltempo 0,9 Sekunden. Die Ergebnisanzeige steht im Short danach 1,5 Sekunden.

| Kontrolllauf | Zieltakt Schnecke | Zieltakt Stempel | Ergebnis |
|---|---:|---:|---|
| Seed 42, gleichmäßiger Zulauf | 13 | 16 | Schnecke gewinnt mit 12 zu 11 |
| Seed 42, zweimal zwölf | 13 | 10 | Aus 8 zu 7 wird 9 zu 14 für den Stempel |
| Seed 24, wechselnde Portionen | 22 | 22 | Unentschieden |

Die Tabelle enthält auch den rechnerischen Zieltakt der unterlegenen Bahn. Der Film hält bereits am
Ende des entscheidenden Takts an. In einer Serie folgt auf die Ergebnisanzeige die nächste Runde.

## Bild und Ton

Hochkant stehen die Messgläser nebeneinander, quer unter den äußeren Ausläufen. Die Kugeln folgen
derselben Mittellinie, aus der das jeweilige Rohr gezeichnet wird. Magazin, Messglas und Anschlüsse
liegen als separate Glasschicht vor den Kugeln. Rückwand, Glas, Schneckenwindungen und Kugelmaterial
werden je Renderer vorgezeichnet. Die Bewegung kommt aus der Simulationszeit.

Die Schnecke summt beim Einzug einer Kugel. Der Kolben schlägt beim Erreichen des vorderen
Anschlags, und jede Kugel klingt beim Landen im Glas. Alle drei Klänge sind im Export einzeln
regelbar. Das Motorsurren wird aus Sinusschwingungen erzeugt. Anschlag und Glasklänge verwenden
die vorhandenen CC0-Samples. [Klangquellen und Lizenzen](../assets/audio/README.md)

## Produktionsproben

Beide MP4s wurden vom sauberen Programmstand `ffa01b1` mit Seed 42 erzeugt. Sie liegen mit ihren
JSON-Rezepten im lokalen Hauptordner unter `output/foerderduell-rennen-2026-11-22/`.

| Film | Herkunft | Bild | Ton nach AAC-Kodierung |
|---|---|---|---|
| Einzelrennen, 12,30 s | Short-Vorlage über den Exportknopf, Download bytegleich geprüft | 1080 × 1920, 369 Bilder | −14,0 LUFS, −1,9 dBTP |
| Rennserie, 20,00 s | Querformatvorlage, Ausschnitt ab 7,20 s aus 28 s Serienverlauf | 1920 × 1080, 600 Bilder | −14,0 LUFS, −2,0 dBTP |

Beide Filme sind H.264 mit 30 Bildern pro Sekunde und AAC-Stereo mit 48 kHz. Die Serie zeigt
zuerst den Sieg der Schnecke, dann den des Stempels. Bei der Herstellung gingen keine Tonereignisse
verloren. Die Audiospur des Shorts enthält beide Kolbenanschläge bei 4,80 und 10,20 Sekunden.
Ein Abgleich der dekodierten AAC-Wellenform mit dem jeweiligen Anschlagsample fand beide Treffer
am vorgesehenen Zeitpunkt, mit einer Messauflösung von 1/12 Millisekunde.

## Prüfung

- Fünf Simulationstests prüfen die zwei Referenzrennen, einen Gleichstand, Zeitlupe und eine
  zehnminütige Rennserie. Alle 24 Kugeln jeder Bahn sind bilanziert. Zwei Läufe mit demselben
  Seed liefern dieselben Zustands-Hashes.
- Der Browsertest wählt die Szene über das Menü und lädt beide Produktionsvorlagen. Bei sieben
  Zeitpunkten, darunter ein Rundenwechsel, waren die Bilder nach Wiedergabe und nach Zeitsprung
  pixelgleich. Zeichnen änderte den Simulationszustand nicht. Zusätzlich wurde 1:1 ohne HUD geöffnet.
- Die archivierten Standbilder in beiden Formaten waren nach dem Teilen der Grafik bytegleich mit
  der freigegebenen Graphitfassung. Aus den fertigen Videos wurden die Führungswechsel und
  Ergebnisbilder erneut visuell geprüft.
- Die beiden Vorlagen durchliefen den Exportknopf bis zum MP4- und JSON-Download. Der vollständige
  Short und der Serienausschnitt wurden mit der endgültigen Mischung zusätzlich technisch vermessen.
  Die Referenzprüfung meldete 36 Fälle mit je zwei identischen Hashes.
- Vier bestehende Tests für Registrierung, Szenenwechsel, Produktionsvorlagen und den Umgang mit
  unbekannten Szenarien bestanden. Der vollständige Testlauf entfiel gemäß den Projektregeln.
  Die Zehn-Minuten-Vorlage wurde als Simulationsvorlauf geprüft.

Die [Short-Vorlage](../presets/production/foerderduell-short.json) und die
[Serienvorlage](../presets/production/foerderduell-long.json) sind auch mit `export.mjs` verwendbar.
