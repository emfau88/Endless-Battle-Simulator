# Schritt 4 · Erstes Short (B06)

**Datum:** 11.11.2026 · **Ausgangs-Commit:** `4c6709a` (Schritt 3) · **Branch:** `schritt-4-erstes-short`
**Betroffene Dateien:** neu `presets/marble-short-1080p60.json`, dieser Bericht, Plan. Kein Programmcode geändert.

## Idee

Entscheidung nach deiner Vorgabe: **30 Sekunden laufende Kugelfabrik** ohne Sieger und ohne Zusatzmechanik –
die ruhige Variante aus der Planergänzung. Das Video beginnt dank Einlaufphase mit bereits arbeitender Anlage.

## Die beiden Fassungen

| | Fassung A | Fassung B |
|---|---|---|
| Datei (lokal, nicht im Repository) | `output/short_marble_A_seed42_1080p60_30s.mp4` | `output/short_marble_B_seed7_zeitlupe_1080p60_30s.mp4` |
| Unterschied | Seed 42, normales Tempo | Seed 7, Zeitlupe 0,8× |
| Bild | H.264 High, 1080×1920, 60 fps, 30,000 s, 1800 Frames, etwa 11,5 Mbit/s | wie A, etwa 11,1 Mbit/s |
| Ton | AAC, 48 kHz, Stereo, 338 Ereignisse, Spitze −0,6 dBFS, −23,7 LUFS | AAC, 269 Ereignisse, Spitze −1,0 dBFS, −24,4 LUFS |
| Im Clip | 25 Umläufe, 25 Kugeln sortiert | 20 Umläufe, 20 Kugeln sortiert |
| Dateigröße | 41,2 MB | 39,8 MB |
| Renderzeit | 54 s | 61 s |
| Prüfung des Exporters | OK | OK |

Erneut erzeugen: `npm run export -- --config presets/marble-short-1080p60.json`
(Fassung B zusätzlich `--seed 7 --tempo 0.8`).

**Warum 1080p mit 60 fps:** Rollende Kugeln und umlaufende Bandstollen wirken mit 60 Bildern pro Sekunde flüssiger; die
Simulation rechnet ohnehin 60 Schritte je Sekunde, bei 60 fps wird also jeder Schritt gezeigt. Der eigentliche
Vergleich 30 gegen 60 fps (B03) steht noch aus; 4K ist möglich, wurde hier aber nicht gerendert.

## Geprüft

- **Technisch:** Auflösung, Bildrate, Frameanzahl, Dauer, Tonspur und Simulationszustand durch den Exporter und `ffprobe`.
- **Bild:** 15 Einzelbilder aus Fassung A angesehen – Zähler laufen von 0 bis 24, englische Texte, kein Stillstand.
- **Sichtbereich:** Mit angenommenen Bedienflächen der Shorts-Ansicht (unten etwa 18 % der Höhe, rechts ein Streifen
  für die Schaltflächen, oben ein schmaler Rand) liegen Behälter, Zellenrad, Förderband, Zahnräder, Sortierer und
  Aufzug frei. Verdeckt würden die Sammelschiene samt Röhrenausläufen unten und der Schaltschrank rechts.
  Die Flächen sind Näherungen, keine gemessenen Werte der App.

## Nicht geprüft

- **Am Handy angesehen** – das kannst nur du.
- **Klang** – ich kann die Tonspur nicht hören (siehe Schritt 3). Sie ist mit −24 LUFS eher leise.
- **Abspielen in Echtzeit** – beurteilt wurden Einzelbilder und Messwerte.

## Vorschläge für die Veröffentlichung

**Titel (zwei Fassungen):**

1. `This Marble Factory Never Stops`
2. `30 Seconds of Perfectly Sorted Marbles`

**Beschreibung:** `An endless marble factory, simulated and rendered entirely in code. Six colors, one loop.
#shorts #marble #satisfying #simulation`

**Startbild:** `output/short_marble_startbild_1.png` (Sekunde 13, grüne Kugel im Sortierrohr) oder
`output/short_marble_startbild_2.png` (Sekunde 22, Scanner leuchtet orange). Shorts zeigen als Vorschau ohnehin ein Bild aus dem Video.

## Aufwand

Aktive Arbeit für diesen Schritt: Vorlage anlegen, zweimal rendern, prüfen – ohne Programmänderung.
Renderzeit zusammen knapp 2 Minuten.

## Offen

- Entscheidung, welche Fassung hochgeladen wird (oder beide im Abstand, um zu vergleichen).
- Falls die Sammelschiene in der App zu stark verdeckt ist: Hochkant-Layout nach oben rücken (eigener kleiner Auftrag).
- Kein klarer Abschluss im Sinne einer Auflösung – es ist ein Ausschnitt aus einem Endlosbetrieb.
