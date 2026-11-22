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

## Graphit, Stahl und Kupfer

Die matte Graphitrückwand bekommt weiches Licht von links oben. Auf der Schnecke folgen feine
Schliffspuren den silbernen Windungen. Schwungrad und Kolbenfassung tragen satiniertes Kupfer.
Schmale weiße Reflexe zeigen den Verlauf der Glasrohre. Eine Metallfassung verbindet jedes Rohr mit
der Maschine. Blau, Honig, Koralle und Elfenbein machen die Kugeln vor der dunklen Fläche erkennbar.

Die Kolbenkammer hat im Bild rund 23 % mehr Innendurchmesser als im ersten Entwurf. Das Schauglas
vergrößert die sieben bereitliegenden Kugeln um den Faktor 1,18. Eine kleine warme Aufhellung sitzt
direkt hinter der Ladung. So lässt sich schon beim Stand von 8 zu 7 der nächste Hub erahnen.

Die [Bildquelle](reference/foerderduell-bildprobe.html) wählt beim Öffnen das zum Fenster passende Format.
Dieser Befehl rendert aus der Arbeitskopie beide PNGs in den lokalen Vergleichsordner im Hauptprojekt.

```bash
node scripts/foerderduell-bildprobe.mjs ../../../output/foerderduell-graphit-2026-11-22
```

Die Dateien heißen `foerderduell-hoch.png` und `foerderduell-quer.png`. Die erste Bildfassung aus
Commit `f14c919` liegt zum Vergleich unter `output/foerderduell-bildprobe-2026-11-22/`.

**Bildprüfung.** Beide Formate wurden in Originalgröße und als verkleinerte Übersicht verglichen. An
je drei freien Stellen der Rückwand lagen Rot und Grün im neuen Bild gleichauf. Die Bildquelle zeichnete
in jedem Format alle 24 Kugeln je Bahn genau einmal, mit dem Bestand aus der Tabelle. Nach dem Neuladen
und bei automatischer Formatwahl in einem Handy- bzw. Querformatfenster entstanden bytegleiche PNGs.
Simulationstests, Referenz-Hashes und Videoexport entfielen bei dieser Standbildprobe.
