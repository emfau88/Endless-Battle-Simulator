# Cloud Wars · Landschaftsreise am Fluss

Stand 24.11.2026. **Cloud Wars → Ablauf → Landschaftsreise · 9 Minuten** startet die Fahrt. Die Vorlage verwendet Seed 42, 16:9, 1080p und 30 Bilder/s. Die Videolänge ist frei wählbar. Bei acht oder zehn Minuten erreicht die Kamera den See entsprechend früher oder später. Das Hochformat rückt näher an das jeweilige Ufer. „Kamerabewegung“ aus zeigt den Markt von einem festen Standort. Mit „HUD“ lässt sich der kurze englische Anfangstitel *Along the River* zuschalten.

## Orte und Verkehr

| Filmstelle bei neun Minuten | Im Bild |
|---|---|
| 0:14 | Mühlendorf mit abgezweigtem Mühlgraben, laufendem Wasserrad und Obstgärten |
| 2:21 | Ein roter Triebwagen überquert den Fluss auf einem Steinviadukt. |
| 4:30 | Derselbe Zug steht am Bahnhof. An den Marktständen sind Fußgänger unterwegs. Ein gelber Lieferwagen fährt über die Straßenbrücke, ein Fahrrad folgt dem Uferweg. |
| 6:40 | Enten schwimmen am Bootshaus vor der Schilfinsel. |
| 8:39 | Die Fähre hat am Seehafen abgelegt. An der Kaimauer gehen nacheinander die Lampen an. |

Bei Seed 42 liegen 56 Wohnhäuser im Tal, davon 33 im Bereich der Marktstadt. Dort kommen sechs Hausformen vor, darunter Doppel- und Reihenhäuser, Läden mit Markisen, Villen und Häuser mit Seitenflügel. Die sechs Gartennutzungen umfassen Blumenbeete, Gemüse mit Frühbeet, Obstgarten, Terrasse, Wäschegarten und Wirtschaftshof. Die nächste Straße bestimmt den Zugang eines Hauses. Bei engen Parzellen wird der Garten gekürzt.

Über die ganze Strecke verteilen sich 18 Kraftfahrzeuge und zehn Fahrräder. Die Fahrzeuge fahren auf zwei Richtungsfahrstreifen um den Markt. Fahrräder nutzen den Uferweg. Die Position folgt der zurückgelegten Weglänge. Der Verkehr ist für den Film choreografiert. Vorfahrt, Ampeln und Staus werden nicht simuliert. Der Export enthält leises Wasser aus dem vorhandenen lizenzierten Stereo-Loop.

## Integration

`scenario=cloudwars` und `params.mode=landscape` wählen den eigenen Ablauf in `src/scenarios/cloudlandscape/`. Das Menü sowie geladene Einstellungen und der Export benutzen dieselbe Auswahl. Der normale Dateiname für einen Export der Reise beginnt mit `cloudwars-landscape_`. Die bisherigen Cloud-Szenariodateien und die beiden bisherigen Produktionsvorlagen sind bytegleich zum Ausgangsstand `9ad06b7`.

[Vorlage für die Kommandozeile](../presets/production/cloudwars-landscape.json). Ein kurzer Ausschnitt lässt sich so erzeugen:

```bash
node export.mjs --config presets/production/cloudwars-landscape.json --clip-start 263 --clip-duration 16 --out output/landschaftsreise-am-markt.mp4
```

## Prüfung und Nachweise

- `node --test test/cloudwars-landscape.test.mjs` bestand mit fünf Tests. Geprüft wurden der Menüwechsel samt Rückweg zu Short und Runden, Vorlage, Direktlink, Kamera, drei vollständige Simulationsvorläufe (480, 540, 600 Sekunden), Haus- und Gartenvielfalt sowie Verkehrswege. Das PNG nach einem Zeitsprung über mehrere Geländestreifen war in beiden Filmformaten pixelgleich mit der fortlaufenden Wiedergabe.
- `npm run golden` verglich 36 Konfigurationen an je zwei Zeitpunkten. Alle 72 Referenzwerte stimmten überein.
- Bild und Zustand von Cloud-Short und Runden wurden zusätzlich direkt mit dem Ausgangsstand verglichen. Short, Seed 44, hochkant bei 5 Sekunden ergab `6568d2e2`. Runden, Seed 42, quer bei 12 Sekunden ergab `8ef44100`. Die PNGs beider Vergleichspaare waren jeweils bytegleich.
- Der exportierte Marktausschnitt beginnt bei 4:23 und dauert 16 Sekunden. FFprobe bestätigte 480 H.264-Bilder in 1920 × 1080 bei 30 fps und eine AAC-Stereospur mit 48 kHz. Die fertige Tonspur maß −30,0 LUFS und −13,0 dBTP.
- Zwei Exporte dieses Ausschnitts ergaben dieselbe MP4-Datei (SHA-256 `f9c4125b596c7ae1d8ae05045a215a2f278433391bb729377aaab9ef0e8a4fde`). Das ausgelieferte Rezept verweist auf den sauberen Code-Stand `1e0c2aa`. Die lokale Startdatei öffnete im Browser die Neun-Minuten-Vorlage mit aktiver Kamera. Zweimaliges Zeichnen desselben Zustands ließ den Simulations-Hash intakt.
- Standbilder und der kurze Film liegen lokal in `output/cloud-landschaftsreise-2026-11-24/`. Die Prüfung umfasste gezielte Tests und den kurzen MP4-Export. Ein vollständiger Testlauf und ein Langvideoexport wurden nicht ausgeführt.
