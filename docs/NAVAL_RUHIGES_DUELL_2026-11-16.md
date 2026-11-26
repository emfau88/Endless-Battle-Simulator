# Naval: Modus „Ruhiges Duell“ (in Arbeit)

Stand: 18.11.2026. Erste sechs Pakete des Naval-Ausbaus (R34, im [Gesamtplan](GESAMTPLAN_2026-11-16.md) Abschnitt 8.4
als N1a und N2a bis N2e geführt). Der Nutzer hat die Richtung anhand von Standbildern und Testclips freigegeben, den Einbau als
neuen Modus beauftragt und danach die Vorschläge zu Lebensanzeige, Runden und Segeln zur Umsetzung freigegeben.

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

Seit dem zweiten Paket enthalten: Runden mit Versenkung, Punktestand und neuem Schiff (Abschnitt 3a).
Seit dem dritten Paket enthalten: die Rakete vom Heck (Abschnitt 3b). Seit dem vierten: der Auftritt der goldenen Kugel
(Abschnitt 3c).
Im Modus „Ruhiges Duell“ aktiviert der Schalter „Finale am Videoende (Vorschau)“ das optionale Finale (Abschnitt 3f).
Noch **nicht** enthalten: Wetter.

## 2 · Werte des Modus

| Größe | Standard | Ruhiges Duell |
|---|---|---|
| Kanonen je Schiff | 4 (Regler 1–6) | fest 2, der Regler ist ausgeblendet |
| Feuerrate | 1 | halb so hoch (der Regler wirkt relativ dazu) |
| Flugtempo der Kugeln | 1 | halb so schnell bei gleichen Bögen |
| Schiffsgröße | 100 % | 75 %, die Kugeln bleiben gleich groß |
| Rückprall der Kugeln | 0,3 | 0,7 |
| Masten nach dem ersten Treffer | durchlässig | durchlässig (unverändert) |
| Schaden je Treffer | rund 0,09 Prozentpunkte, gedämpft, mit Reparatur | fest 2 Prozentpunkte, ohne Dämpfung |
| Ausgang | keiner, Schaden pendelt bei etwa 70 % | bei 100 % Schaden sinkt das Schiff; Punkt, Feuerpause, neues Schiff |
| Segelschäden | keine | vier Stufen, an den Schiffsschaden gekoppelt |
| Ton | Einmessung auf −14 LUFS | feste Mischung mit leisem Meeresrauschen (Abschnitt 3e) |

**Halbes Flugtempo:** Eine nur langsamere Kugel würde das Ziel nicht erreichen. Deshalb sinkt die Schwerkraft mit dem
Quadrat des Tempos und die Mündungsgeschwindigkeit mit dem Tempo; die Bahn bleibt gleich, sie dauert doppelt so
lange. Schwellen für Treffer, Staub, liegengebliebene Kugeln und Platscher sind mit dem Tempo mitskaliert.

## 3 · Segelschäden

- **Durchflug:** Nur gegnerische, schnelle Kugeln reißen ein Loch. Es entsteht genau auf der Flugbahn, ein Stück
  hinter der Eintrittskante; die Kugel fliegt weiter. Die Physik bleibt davon unberührt.
- **Alle Lagen:** Ein Loch geht durch alle Segel, die an dieser Stelle hintereinander liegen.
- **Zweite Lebensanzeige:** Die Abnutzung eines Segels ist der Schiffsschaden mal einem festen Anteil
  (Großsegel 0,72, Großmarssegel 0,95, Focksegel 1,18, Vormarssegel 1,22, Klüver 1,15). Die Bugsegel leiden also
  schneller, das Wappensegel bleibt bis zum Untergang erkennbar.
- **Wachstum:** Durchschüsse setzen neue Löcher, solange die Abnutzung noch welche „hergibt“ (voll bei 60 %). Wie
  groß ein Loch ist und wie weit es aufreißt, folgt danach allein der Abnutzung.
- **Abgeleitet aus der Abnutzung:** ausgefranste Unterkante (ab 35 %), loser Stoffstreifen (ab 60 %, beim Focksegel
  ein zweiter ab 82 %), schiefe Rah am Vormarssegel (ab 80 %).
- **Erkennbarkeit:** Das Wappensegel verliert keinen Streifen und erreicht höchstens 72 % Abnutzung.
  Je Schiff hängt höchstens ein Segel.
- **Stofffetzen:** Bei jedem Durchschuss fliegen ein paar Fetzen mit und trudeln herunter.

Die Simulation hält je Segel nur Trefferzahl, Abnutzung und Lochliste, mit eigenem Zufallsstrom. Der Renderer
leitet alles Sichtbare daraus ab; das Schwingen von Streifen und Rah ist eine reine Funktion der Zeit.

## 3a · Runden

- **Fester Schaden:** Jeder zählende Treffer nimmt 2 Prozentpunkte (bei Standard-Intensität), egal ob Rumpf, Kastell
  oder Mast. Es zählt weiter nur der erste Aufprall einer Kugel; Abpraller danach und Flüge durchs Segel machen
  keinen Schaden. Der Balken zeigt den Treffer: Der Rahmen blitzt, das verlorene Stück leuchtet weiß nach.
- **Versenkung:** Bei 100 % sinkt das Schiff über das Heck und verblasst (7 Sekunden). Wer den letzten Treffer
  gesetzt hat, bekommt einen Punkt. Im Bild steht kurz „BLUE SINKS! · POINT FOR RED“.
- **Feuerpause:** Solange ein Schiff sinkt oder einläuft, schweigen alle Kanonen. Kugeln, die noch fliegen, richten
  keinen Schaden mehr an.
- **Reparatur:** In der Pause flickt die Crew der übrigen Schiffe den Schaden. Der Balken füllt sich, Löcher im Rumpf
  bekommen Planken, die Segel behalten kleine Einschusslöcher als Narben. Jede Runde beginnt bei 100 gegen 100.
- **Neues Schiff:** Es segelt vom Bildrand herein (7 Sekunden), unbeschädigt und mit neu gewürfeltem Feuertakt. Rohr
  und Munition gehören zum Liegeplatz; im Rohr warten die Kugeln, bis wieder ein Schiff angedockt ist.
- **Anzeige:** Punktestand neben den Balken, Rundennummer in der unteren Zeile.

Warum die Reparatur: Ohne sie waren beide Schiffe am Rundenende fast gleich beschädigt, und der Sieger sank im
Schnitt rund 40 Sekunden später selbst. Mit ihr dauert jede Runde etwa gleich lang.

## 3b · Rakete vom Heck

Idee des Nutzers vom 16.11.: eine seltene zweite Attacke neben den Kanonen. Als Vorschau gebaut und von ihm anhand
eines Testclips freigegeben.

- **Takt:** Jedes Schiff startet etwa alle 20 Sekunden eine Rakete; die Schiffe wechseln sich ab, im Duell fliegt also
  etwa alle 10 Sekunden eine.
- **Vorbereitung:** Sechs Sekunden vorher gleitet die Rakete auf die Startschiene am Heck, in den letzten zwei
  Sekunden sprüht die Lunte Funken.
- **Flug:** In 2,6 Sekunden auf fester Bahn mit Rauchfahne bis knapp über die Mastspitzen des Gegners.
- **Splitter:** Dort zerplatzt sie in sieben Splitter. Sie durchschlagen Segel (mit Loch und Stofffetzen) und nehmen
  bei einem Treffer auf Rumpf oder Kastell je 0,5 %; wer daneben fällt, verlischt im Wasser.
- **Nicht Teil des Kugelkreislaufs:** Rakete und Splitter werden nicht recycelt.
- **Feuerpause:** In der Pause wird keine Rakete vorbereitet; Nachzügler richten keinen Schaden an.

Messwerte (reine Simulation, Querformat, fünf Seeds zu je 20 Minuten, 30 Runden): Runden 144 bis 202 s, Median
182 s. Die Rakete verkürzt eine Runde also um rund eine halbe Minute.

Die Klänge für Start und Knall sind vorläufig aus dem Kanonenklang abgeleitet.

## 3c · Goldene Kugel

Idee des Nutzers vom 16.11.: Die goldene Kugel soll etwas Besonderes tun, damit es mehr fürs Auge gibt. Bisher war sie
nur anders gefärbt und wurde gezählt. Als Vorschau gebaut und von ihm anhand eines Testclips freigegeben.

- **Goldtreffer:** Ihr Treffer zählt doppelt (4 % statt 2 %). Dazu ein goldener Blitz, ein Ring, Funkenregen und
  trudelnde Goldsplitter; am Einschlag steigt kurz „GOLDEN HIT!“ auf, und das verlorene Stück des Balkens leuchtet
  golden statt weiß.
- **Im Flug:** Sie zieht eine Glitzerspur hinter sich her.
- **Im Segel:** Beim Durchschuss stieben Goldfunken aus dem Tuch.
- **Fehlschuss:** goldener Platscher mit Ring.
- **Schalter:** Alles hängt am vorhandenen Regler „Goldene Kugel mit Zähler“ und gilt nur im ruhigen Duell; im
  Standardmodus bleibt die goldene Kugel wie bisher.

Messwerte (reine Simulation, Querformat, fünf Seeds zu je 20 Minuten, 33 Runden): Goldtreffer etwa dreimal pro
Minute; Runden 140 bis 204 s, Median 172 s (ohne Goldtreffer 182 s).

Der Klang des Goldtreffers ist vorläufig ein weicher Metallklang aus dem Marble-Works-Satz.

## 3d · Lesbarkeit

Dritter der freigegebenen Vorschläge. Als Vorschau gebaut und vom Nutzer anhand eines Vorher-Nachher-Bilds und eines
Testclips freigegeben.

- **Kanonen 30 % größer.** Es sind nur noch zwei je Schiff; neben den gleich groß gebliebenen Kugeln wirkten sie
  klein. Die Mündung sitzt dadurch etwas weiter vorn.
- **Leuchtspur in voller Länge.** Die Spur hing an der Zeit und war bei halbem Flugtempo nur halb so lang. Sie wird
  jetzt in jedem vierten statt jedem zweiten Schritt fortgeschrieben.
- **Erhöhte Bugkante: gemessen und verworfen.** Eine niedrige Wand am Bug sollte Kugeln länger an Deck halten.

| Reine Simulation, fünf Seeds zu je 10 Minuten | ohne Bugkante | Kante 5 % der Schiffslänge | Kante 9 % |
|---|---|---|---|
| Abpraller je Treffer | 0,56 | 0,97 | 1,14 |
| Kugel bleibt liegen und wird angestoßen | 30-mal | 287-mal | 455-mal |
| Notfall (Kugel verschwindet mit einem Wölkchen) | 1 | 55 | 105 |

Die Kante bringt fast doppelt so viele Abpraller, aber Kugeln verklemmen sich an Deck und müssen dann etwa einmal
pro Minute per Notfall verschwinden. Das sieht schlechter aus als wenige Abpraller.

Rundenlänge mit größeren Kanonen (fünf Seeds zu je 20 Minuten, 34 Runden): 134 bis 196 s, Median 168 s.

## 3e · Ton

Vierter der freigegebenen Vorschläge. Als Vorschau gebaut und vom Nutzer anhand von zwei Hörproben freigegeben.

**Das Problem:** Der Exporter misst jede Tonspur auf −14 LUFS ein. Im ruhigen Duell fallen nur rund 40 Schüsse pro
Minute; die Einmessung hob die Pegel deshalb so weit an, dass der Begrenzer bis zu 20 dB abfangen musste. Als
Notlösung stand die Gesamtlautstärke auf 65 %.

**Die Lösung:** eine feste Mischung nach dem Muster von Pyramide und Wasserpark (Profil `naval-sea-v1`).

- **Meeresrauschen als Grundton.** Dieselbe CC0-Aufnahme, die Pyramide und Wasserpark schon nutzen
  (`pyramid-water-loop.wav`, Nachweis in `assets/audio/PYRAMID_WATER.json`). Es kommt keine neue Datei dazu. Eigener
  Regler „Meeresrauschen“.
- **Feste Pegel.** Jeder Klang behält sein Verhältnis; nichts wird nachträglich auf eine Ziellautheit gezogen.
  100 % Gesamtlautstärke ist wieder der Standard.
- **Neue Klänge:** Segeldurchschuss (weicher Schlag) und Versenkung (tiefes Holzkrachen). Abpraller, Rakete, Knall
  und Goldtreffer wie bisher.

| Messwert | vorher (65 %) | feste Mischung |
|---|---|---|
| Lautheit der 10-Minuten-Episode | −17,7 LUFS | −20,6 LUFS |
| Spitze | −5,7 dBFS | −3,0 dBFS |
| stärkster Eingriff des Begrenzers | bis −20 dB | −6,7 dB, sonst rund −2 dB |
| 20-Sekunden-Probe | −17,8 LUFS (Mischung vor dem Kodieren) | −20,7 LUFS im fertigen AAC, höchstens −2,9 dBTP |

Die Mischung ist damit etwas leiser, aber die Schüsse behalten ihren Anschlag.

## 3f · Finale am Videoende (Vorschau)

Bestehende Einstellungen spielen das ruhige Duell weiter bis zum Ende. Die Vorschau lässt sich mit `--param finaleV1=true` oder über den Schalter im Menü einschalten. Vom Nutzer am 17.11. als nächster Schritt beauftragt.

- **Schlusspfiff:** Kurz vor dem Videoende schweigen Kanonen und Raketen; Kugeln, die noch fliegen, zählen nicht
  mehr. Das Finale dauert 5 % der Videolänge, mindestens 10 und höchstens 20 Sekunden (10 Minuten: ab 9:40).
- **Sieger:** wer mehr Gegner versenkt hat; bei Gleichstand das weniger beschädigte Schiff. Sind auch die
  gleich, steht „DRAW!“ da und beide feiern.
- **Im Bild:** nach anderthalb Sekunden „BLUE WINS!“ mit „FINAL SCORE 1 : 2“, die untere Zeile zeigt „FINAL“.
- **Sieger:** Eine Wimpelkette entrollt sich vom Bugspriet über die Mastspitzen zum Heck, dazu Feuerwerk in
  Teamfarbe, Gold und Weiß bis zum letzten Bild.
- **Verlierer:** hisst die weiße Flagge. Sinkt ein Schiff gerade, wenn der Schlusspfiff kommt, läuft kein neues ein.
- **Kurze Videos:** unter 90 Sekunden gibt es kein Finale.
- **Zeitbezug:** Das Finale hängt an der Videozeit, nicht an der Simulationszeit, und passt damit auch in Zeitlupe.

Der Himmel erreicht das Morgengrauen ohnehin am Videoende; das Finale spielt also im Sonnenaufgang.

Die Klänge sind vorhandene: ein Glockenton zum Sieg und der Feuerwerksknall, den schon die Pyramide nutzt.

Solange kein Finale begonnen hat, bleibt der Zustands-Hash des Modus unverändert; die Zustandsreferenz im Test
gilt weiter.

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

Die Werte der Tabelle stammen aus dem ersten Paket (vor den Runden). Die Segelabnutzung nach Zeit gilt seit dem
zweiten Paket nicht mehr; sie folgt jetzt dem Schiffsschaden.

Ton eines 20-Sekunden-Exports im Querformat: −17,75 LUFS, Spitze −5,74 dBFS, Begrenzer bis −10,6 dB.

**Rundenlänge** (zweites Paket; reine Simulation, Querformat, zehn Seeds zu je 20 Minuten, 50 Runden):

| | Wert |
|---|---|
| kürzeste Runde | 182 s |
| Median | 218 s |
| längste Runde | 254 s |
| erste Versenkung | nach 186 bis 230 s |
| Spielstand nach 20 Minuten | zwischen 3:2 und 5:0 |

Jede Runde ab der zweiten enthält rund 17 Sekunden Feuerpause. Ziel aus dem Gesamtplan waren 3 bis 4 Minuten.

## 6 · Nachweise

| Prüfung | Ergebnis |
|---|---|
| Referenz-Hashes (`npm run golden`) | 36 Fälle × 2 Prüfpunkte, identisch mit der Referenz |
| Zustands-Hash Standardmodus nach 600 s, Seed 42, Querformat | `2af260f5` auf `main` und im Branch |
| `test/sim.test.mjs` | 14 von 14 |
| `test/naval-calm.test.mjs` | 7 von 7: Standardmodus unberührt, Grundwerte des Modus, gleicher Seed = gleicher Ablauf mit Zustandsreferenz, eine ganze Runde (Versenkung, Punkt, Feuerpause, Reparatur, neues Schiff, geschlossener Kugelkreislauf), Zeichnen ändert den Zustand nicht, Hochformat und drei Schiffe, Moduswechsel in der Oberfläche |
| Export 20 s, Quer- und Hochformat, mit Ton | beide vom Exporter geprüft (Codec, Bildzahl, Dauer, Zustand, Pegelspitze) |

Beim ersten Paket liefen vor dem Zusammenführen zusätzlich sechs Testdateien zur Oberfläche und zum Ton (Kern,
Einstellungen, Vorlagen, Atmosphäre, Ton, Konfiguration; 41 Fälle, alle bestanden).

Die Zustandsreferenz des Modus wurde mit dem zweiten Paket bewusst neu eingetragen: Die Runden ändern den Ablauf des
Modus. Der Standardmodus ist davon nicht betroffen.

**Nicht gelaufen:** der vollständige `npm test`.

## 7 · Grenzen

- **Kein Finale.** Am Videoende gibt es noch keinen Sieger mit Abschluss; der Spielstand steht einfach da.
- **Der Sieg einer Runde ist knapp.** Beide Schiffe sind am Rundenende stark beschädigt; wer zuerst sinkt, entscheidet
  sich oft in den letzten Treffern.
- **Abpraller sehen aus wie Treffer, zählen aber nicht.** Sie haben keinen Blitz und keinen Holzsplitter-Regen,
  trotzdem kann das beim Zusehen verwirren.
- **Hochformat und drei oder vier Schiffe** laufen fehlerfrei (auch die Runden), sind aber nicht eigens abgestimmt.
  Bei drei und vier Schiffen tauchen neue Schiffe in der Mitte aus dem Dunst auf, statt hereinzusegeln.
- **Wenig Abpraller.** Das Deck ist zum Bug hin offen; etwa jeder zweite Treffer springt einmal nach. Eine erhöhte
  Bugkante wurde gemessen und verworfen (Abschnitt 3d).
- **Der Ton ist leiser als im Standardmodus.** Die feste Mischung liegt bei −20,6 LUFS statt −14 LUFS. Rakete, Knall
  und Goldtreffer nutzen vorhandene Klänge.
- **Kein Ausschnittsexport.** Die Seek-Regel ist für die Seeschlacht insgesamt noch nicht nachgewiesen.
- **Offen aus dem Plan:** die Prüflücke R21 und die vollständige Aufteilung von `naval.js` (N0).

## 8 · Vorschau-Material

Standbilder und Testclips der Abnahme liegen lokal in `output/naval-segelschaden-vorschau/` (nicht im Repository).
