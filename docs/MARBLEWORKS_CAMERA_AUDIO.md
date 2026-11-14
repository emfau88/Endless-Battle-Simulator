# Marble Works · Kenney-lastige Kameraton-Mischung

Stand: 14. November 2026. Branch `codex/marbleworks-camera-audio`, Basis `f3cb8de`.
Die Änderung betrifft ausschließlich **Marble Works · Progressive Factory**. Classic Marble und die
anderen Szenarien behalten ihre Klangtabellen und ihren bisherigen Mischpfad. Die Live-Vorschau der
Fabrik bleibt stumm; Ton entsteht weiterhin im Videoexport. Die endgültige subjektive Klangabnahme ist offen.

## Klang und Kameraverhalten

Zwölf vorbereitete `mw-soft-*.ogg`-Dateien setzen die gewählte Hörprobe C mit stärkerem Kenney-Anteil um.
Nach Angleichung der Eingangspegel werden die Aufnahmen mit 0,88–0,90 und kurze synthetische Resonanzen
mit 0,12–0,10 gewichtet. Dies sind Amplitudenkoeffizienten, keine Prozente der wahrgenommenen Klanganteile.
Weiche Anschläge, begrenzte Höhen und kurze Nachklänge ersetzen die vorherigen harten Kontaktklänge.
Politur und Beschichtung bleiben ohne Rauschspur. Materialvarianten und die acht Lautstärkeregler bleiben erhalten.

Der Kamera-Mischplan projiziert Quellen mit derselben schrägen Kamera wie der Renderer. Format, Zoom
und Kameraposition bestimmen hörbaren Bereich und dezente Stereoposition. Eine weiche Randzone reicht
etwas über den Bildrand; weiter entfernte Quellen bleiben stumm. Fünf deterministische Abtastpunkte
über 0,7 Sekunden glätten die Kameragewichtung. Diese wird **am Start jedes kurzen Klangs** festgelegt.
Der Klang läuft anschließend natürlich aus; bereits spielende Dateien werden nicht kontinuierlich ein- oder ausgeblendet.
Die maximale Abspieldauer der vorbereiteten Dateien einschließlich der vorgesehenen Tonhöhenvariation beträgt etwa 0,323 Sekunden.

Unhörbare und stummgeschaltete Quellen werden vor der Dichteauswahl ausgeschlossen. In Nahansichten
werden höchstens drei Klangstarts innerhalb von 0,4 Sekunden freigegeben; in der Gesamtübersicht
höchstens zwei innerhalb von 0,7 Sekunden. Der Grundfaktor der Übersicht beträgt 0,42. Zusätzliche
Mindestabstände je Klangtyp sowie die Priorität von Maschinenarbeit gegenüber Rolldetails bleiben wirksam.

Nur das Profil `marbleworks-soft-v1` verwendet feste Verstärkung **0 dB** bezogen auf die vorbereiteten
Samples und Ereignispegel, mit **−6 dBFS** PCM-Spitzenschutz. Es gibt keine nachträgliche Einmessung der
kamerabhängig abgeschwächten Mischung auf −14 LUFS. Die fertige AAC-Spur wird weiterhin gemessen und
gegen die gemeinsame True-Peak-Grenze geprüft. Die vorhandenen Gesamt- und Einzelregler bleiben wirksam.

## Einbindung und Reproduzierbarkeit

- `production-camera.js` enthält die gemeinsam genutzte Kamerafahrt und Projektion; deren Bildverhalten bleibt erhalten.
- `production-audio-plan.js` erzeugt einen separaten Plan aus der vollständigen Ereignisliste. Produktionsmodell,
  Rohereignisse und deren Prüfsumme bleiben unverändert.
- Der optionale Export-Hook ruft den Planer vor dem Schließen des Browsers auf. Der Exporter übergibt seine bereits
  vollständig gesammelten Ereignisse; der begrenzte Ereignispuffer der Simulation wird dafür nicht erneut ausgelesen.
- Der vorhandene Audio-Worker erhält ausschließlich serialisierbare Plandaten. Andere Szenarien aktivieren dieses Profil nicht.
- Kameraauswertung verwendet die Ereigniszeit in Videosekunden, multipliziert mit dem Tempo. Sie hängt nicht von
  Renderbildern oder der Exportbildrate ab. Gleiche Konfiguration und gleicher Seed erzeugen denselben Plan und dieselbe Mischung.
- Für Clips wird weiterhin die vollständige Episodenmischung erstellt und erst danach ausgeschnitten. Ein anderes
  Format oder Kamerarezept verändert bewusst die Tonmischung, jedoch weder Fertigung noch Rohereignisse.

Die JSON-Begleitdatei des Exports hält Profil, Plan-Prüfsumme und Auswahlstatistik fest. Das Reviewskript
legt zusätzlich den vollständigen Plan neben die Videos. Dadurch sind
bewusst stumme oder durch die Dichtebegrenzung ausgelassene Klänge von verlorenen Produktionsereignissen unterscheidbar.

## Quellen

Die unveränderten Kenney-Aufnahmen samt originaler CC0-Lizenz liegen unter `assets/audio/marbleworks-source/`.
Die ergänzende Synthese ist eigener Code. Herkunft, Verarbeitung und Prüfsummen stehen in
[`MARBLEWORKS_AUDIO.json`](../assets/audio/MARBLEWORKS_AUDIO.json); die
[Audio-Dokumentation](../assets/audio/README.md#marble-works--weiche-variante-c) beschreibt den Erzeugungsschritt.

```sh
node scripts/build-marbleworks-audio.mjs
node scripts/build-marbleworks-audio.mjs --check
```

Zwei Erzeugungsläufe mit derselben FFmpeg-Version ergaben identische OGG- und PCM-Prüfsummen für alle
zwölf Dateien. Der zusätzliche Check prüft die Quellen, Zwischenstufe, fertigen Dateien, dekodierten Pegel und Längen.

## Review und Prüfung

Zum dokumentierten Zwischenstand sind 31 gezielte Fälle, 14 bestehende Audiofälle, zwölf Core-/Konfigurationsfälle,
acht zusätzliche Audiofälle für Scrap, Mycelium und Pyramid und ein Marble-Works-Exporttest bestanden (66 Fälle).
Letzterer umfasst drei reale 3-Sekunden-Clips mit vollständiger
84-Sekunden-Episodentonspur. Die restlichen Renderer-/Browserprüfungen und Reviewvideos werden separat
abgeschlossen; frühere 3D-Testzahlen und die Messwerte der alten Tonfassung sind kein Nachweis dieses neuen Mischprofils.

Ein vollständiger gemischter Auftrag mit 24 Produkten enthält 291 Rohereignisse und eine 79 Sekunden lange
Tonspur. Gemessen wurden −36,9 LUFS für die Mischung und −12,1 dBTP für die fertige AAC-Spur, ohne
Begrenzereingriff. Dieser ruhige Pegel folgt der freigegebenen Klangrichtung; die endgültige Hörabnahme bleibt offen.

Die aktuellen Tests prüfen unter anderem Projektion, ruhige Randübergänge, Dichteauswahl, Kamera-/Tempo-
und Bildratenbezug, unveränderte Produktionsereignisse, den optionalen Mischpfad und feste Pegel. Die
Hörqualität wird anschließend mit Bild beurteilt; technische Tests ersetzen diese Abnahme nicht.

`scripts/marbleworks-audio-proof.mjs` erzeugt zwei separate Reviewvideos mit jeweils 24 Sekunden,
720p-Auflösung, 30 Bildern/s, H.264-Bild und AAC-Ton sowie zugehörige JSON-Rezepte:

- `output/marbleworks-camera-audio/marbleworks-audio-16x9.mp4`
- `output/marbleworks-camera-audio/marbleworks-audio-9x16.mp4`

Die früher veröffentlichte Filmgalerie zeigt noch die vorherige Tonfassung. Maßgeblich für die neue
Klangabnahme sind die hier genannten Reviewausgaben nach abgeschlossener Exportprüfung.
