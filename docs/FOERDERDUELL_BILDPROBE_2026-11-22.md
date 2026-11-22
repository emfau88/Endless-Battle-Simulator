# Schnecke gegen Stempel · Bildprobe

Am 22. November 2026 als erste der fünf Szenen gewählt. Paket 1 des
[Umsetzungsplans](SZENENPLAN_2026-11-22.md) zeigt den Moment nach Maschinentakt 9 im Versuch mit zwei
Schüben. Die Schnecke führt mit acht zu sieben. Sieben Kugeln liegen am Stempel für den nächsten Hub
bereit. Der goldene Strich an beiden Messgläsern markiert das Ziel von zwölf Kugeln.

| Bestand im Standbild | Schnecke | Stempel |
|---|---:|---:|
| Magazin | 14 | 10 |
| Förderweg bzw. Kolbenkammer | 2 | 7 |
| Zielglas | 8 | 7 |
| Gesamt | 24 | 24 |

**Hochformat, 1080 × 1920.** Die Förderbahnen stehen steil. Die äußeren Fallrohre führen die Kugeln zu
zwei benachbarten Messgläsern. Dazwischen sitzt die gemeinsame Anzeige für den Vergleich auf dem Handy.

**Querformat, 1920 × 1080.** Vom Doppelmagazin in der Mitte führen zwei flachere Maschinen nach außen.
Jedes Messglas steht direkt unter seinem Auslauf. Der eigene Zähler sitzt am Fuß des Glases.

Die [Bildquelle](reference/foerderduell-bildprobe.html) öffnet sich in der Arbeitskopie direkt im Browser.
Beide PNGs lassen sich dort mit diesem Befehl erzeugen.

```bash
node scripts/foerderduell-bildprobe.mjs
```

Die Reviewbilder liegen lokal im Hauptordner unter `output/foerderduell-bildprobe-2026-11-22/` als
`foerderduell-hoch.png` und `foerderduell-quer.png`. Geprüft wurden die Bildmaße, beide Bilder im
Größenvergleich, der Kugelbestand und das erneute Rendern in Chromium. Beim Neuladen waren die PNGs
jeweils bytegleich. Simulationstests, Referenz-Hashes und Videoexport entfielen für die Standbilder.
Rückmeldungen zu den Ansichten gehören zu [R42](ROADMAP.md).
