# Naval: Modus „Ruhiges Duell“ (in Arbeit)

Stand: 16.11.2026. Erstes Paket des Naval-Ausbaus (R34, im [Gesamtplan](GESAMTPLAN_2026-11-16.md) Abschnitt 8.4 als
N1a geführt). Der Nutzer hat die Richtung anhand von Standbildern und sechs Testclips freigegeben und den Einbau als
neuen Modus beauftragt.

## 1 · Umfang

Die Seeschlacht hat jetzt einen Schalter `mode`:

| Wert | Bedeutung |
|---|---|
| `endless` | Standard. Unverändert, Bit für Bit gleich wie vorher. |
| `calm` | „Ruhiges Duell (in Arbeit)“: wenige, gut verfolgbare Kugeln und sichtbar wachsende Segelschäden. |

In der Oberfläche steht der Modus als Auswahl „Modus“ ganz oben bei den Naval-Reglern. Auf der Kommandozeile:

```bash
node export.mjs --scenario naval --param mode=calm --duration 20 --aspect 16:9 --out output/naval_ruhig_20s.mp4
```

Noch **nicht** enthalten: Runden mit Versenkung, Punktestand, neue Schiffe, Wetter, eigene Tonabstimmung.

## 2 · Werte des Modus

| Größe | Standard | Ruhiges Duell |
|---|---|---|
| Kanonen je Schiff | 4 (Regler 1–6) | fest 2, der Regler ist ausgeblendet |
| Feuerrate | 1 | halb so hoch (der Regler wirkt relativ dazu) |
| Flugtempo der Kugeln | 1 | halb so schnell bei gleichen Bögen |
| Schiffsgröße | 100 % | 75 %, die Kugeln bleiben gleich groß |
| Rückprall der Kugeln | 0,3 | 0,7 |
| Masten nach dem ersten Treffer | durchlässig | durchlässig (unverändert) |
| Segelschäden | keine | vier Stufen über etwa 10 Minuten |
| Standardmischung Ton | 100 % | 65 % Gesamtlautstärke, zusätzlicher Klang „Abpraller“ |

**Halbes Flugtempo:** Eine nur langsamere Kugel würde das Ziel nicht erreichen. Deshalb sinkt die Schwerkraft mit dem
Quadrat des Tempos und die Mündungsgeschwindigkeit mit dem Tempo; die Bahn bleibt gleich, sie dauert doppelt so
lange. Schwellen für Treffer, Staub, liegengebliebene Kugeln und Platscher sind mit dem Tempo mitskaliert.

## 3 · Segelschäden

- **Durchflug:** Nur gegnerische, schnelle Kugeln reißen ein Loch. Es entsteht genau auf der Flugbahn, ein Stück
  hinter der Eintrittskante; die Kugel fliegt weiter. Die Physik bleibt davon unberührt.
- **Alle Lagen:** Ein Loch geht durch alle Segel, die an dieser Stelle hintereinander liegen.
- **Wachstum:** Die ersten Durchschüsse setzen neue Löcher (voll bei 60 % Abnutzung). Weitere vergrößern das
  nächstgelegene Loch und reißen es ab 25 % Abnutzung nach unten auf.
- **Abgeleitet aus der Abnutzung:** ausgefranste Unterkante (ab 35 %), loser Stoffstreifen (ab 60 %, beim Focksegel
  ein zweiter ab 82 %), schiefe Rah am Vormarssegel (ab 80 %).
- **Erkennbarkeit:** Das Wappensegel verliert keinen Streifen und erreicht in 10 Minuten nur etwa 60 % Abnutzung.
  Je Schiff hängt höchstens ein Segel.
- **Stofffetzen:** Bei jedem Durchschuss fliegen ein paar Fetzen mit und trudeln herunter.

Die Simulation hält je Segel nur Trefferzahl, Abnutzung und Lochliste, mit eigenem Zufallsstrom. Der Renderer
leitet alles Sichtbare daraus ab; das Schwingen von Streifen und Rah ist eine reine Funktion der Zeit.

## 4 · Aufbau im Code

| Datei | Inhalt |
|---|---|
| `src/scenarios/naval/sails.js` (neu) | Segelgeometrie, ein Durchschuss (`punch`), abgeleitete Schäden, Tuch als Textur mit ausgestanzten Löchern, `View` für die fünf Segel eines Schiffs. Erster Baustein der geplanten Aufteilung von `naval.js`. |
| `src/scenarios/naval.js` | Tabelle `MODES`, Durchflug-Erkennung, Abpraller-Ereignis, Zustand des Modus in `stateHash`, `snapshot` und `checkInvariants`, Regler „Modus“, Klangtabelle des Modus über `audioForParams`. |
| `src/app.js` | Neue Regler-Option `resetMix`: Bringt eine Auswahl eine eigene Standardmischung mit, wird sie beim Umschalten geladen. Nur der Naval-Regler „Modus“ nutzt sie. |
| `test/naval-calm.test.mjs` (neu) | Sechs Fälle, siehe Abschnitt 6. |

Im Standardmodus zeichnet der Renderer die Segel mit dem bisherigen Code; das neue Tuch gibt es nur im ruhigen
Duell. Alle Faktoren des Modus sind im Standardmodus genau 1.

## 5 · Messwerte

Reine Simulationsläufe über 5 Minuten, Querformat, Seed 42:

| | Standard | Ruhiges Duell |
|---|---|---|
| Schüsse je Minute (beide Schiffe) | 160 | 40 |
| Treffer je Schuss | 73 % | 68 % |
| Abpraller nach dem ersten Treffer | 0 | im Schnitt 0,47 |
| Kugeln gleichzeitig in der Luft (Stichprobe) | etwa 12 | etwa 3 |
| Kugel bleibt an Deck liegen und wird angestoßen | 405-mal | 3-mal |
| Schaden nach 5 Minuten | 14 % | 4 % |

Segelabnutzung nach 9½ Minuten (Querformat, Seed 42), in der Reihenfolge Großsegel, Großmarssegel, Focksegel,
Vormarssegel, Klüver: Rot 61 / 74 / 97 / 93 / 89 %, Blau 61 / 76 / 100 / 100 / 100 %.

Ton eines 20-Sekunden-Exports im Querformat: −17,75 LUFS, Spitze −5,74 dBFS, Begrenzer bis −10,6 dB.

## 6 · Nachweise

| Prüfung | Ergebnis |
|---|---|
| Referenz-Hashes (`npm run golden`) | 36 Fälle × 2 Prüfpunkte, identisch mit der Referenz |
| Zustands-Hash Standardmodus nach 600 s, Seed 42, Querformat | `2af260f5` auf `main` und im Branch |
| `test/sim.test.mjs` | 14 von 14 |
| `test/naval-calm.test.mjs` | 6 von 6: Standardmodus unberührt, Grundwerte des Modus, gleicher Seed = gleicher Ablauf mit Zustandsreferenz, Zeichnen ändert den Zustand nicht, Hochformat und drei Schiffe, Moduswechsel in der Oberfläche |
| Export 20 s, Quer- und Hochformat, mit Ton | beide vom Exporter geprüft (Codec, Bildzahl, Dauer, Zustand, Pegelspitze) |

**Nicht gelaufen:** der vollständige `npm test` und die übrigen Oberflächentests (Einstellungen, Konfiguration, Ton).
Die Änderung in `src/app.js` greift nur bei Reglern mit der neuen Option `resetMix`.

## 7 · Grenzen

- **Die Lebensanzeige ist nicht schlüssig.** Der Schaden je Treffer ist unverändert klein (rund 0,09 Prozentpunkte)
  und zählt nur beim ersten Aufprall einer Kugel. Bei einem Viertel der Schüsse bewegt sich der Balken kaum: 4 % in
  5 Minuten. Das ist der wichtigste offene Punkt.
- **Kein Ausgang.** Niemand sinkt; Runden und Punktestand fehlen.
- **Segel werden nicht repariert.** Nach etwa 10 Minuten bleibt der Schaden auf der letzten Stufe stehen.
- **Das Tempo der Segelschäden ist für zwei Schiffe im Querformat eingestellt.** Hochformat und drei oder vier
  Schiffe laufen fehlerfrei, sind aber nicht eigens abgestimmt.
- **Wenig Abpraller.** Das Deck ist zum Bug hin offen; etwa jeder zweite Treffer springt einmal nach.
- **Der Ton ist vorläufig.** Bei so wenigen Schüssen hebt die Einmessung auf −14 LUFS die Pegelspitzen über die
  Prüfgrenze des Exporters. Deshalb steht die Standardmischung auf 65 %. Der Segeldurchschuss ist stumm.
- **Leuchtspuren sind kürzer,** weil sie an der Zeit hängen. Die zwei Kanonen wirken neben den Kugeln klein.
- **Kein Ausschnittsexport.** Die Seek-Regel ist für die Seeschlacht insgesamt noch nicht nachgewiesen.
- **Offen aus dem Plan:** die Prüflücke R21 und die vollständige Aufteilung von `naval.js` (N0).

## 8 · Vorschau-Material

Standbilder und Testclips der Abnahme liegen lokal in `output/naval-segelschaden-vorschau/` (nicht im Repository).
