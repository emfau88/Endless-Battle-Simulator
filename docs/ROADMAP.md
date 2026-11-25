# Roadmap

Die **einzige aktive Aufgabenliste** des Projekts. Kurz gehalten: Stand, was jetzt läuft, was danach kommt.

- Erledigtes steht im [CHANGELOG](CHANGELOG.md).
- Begründung, Reihenfolge und Paketbeschreibungen stehen im [Gesamtplan](GESAMTPLAN_2026-11-16.md).
- Arbeitsregeln stehen in [AGENTS.md](../AGENTS.md), der Aufbau in [ARCHITEKTUR.md](ARCHITEKTUR.md).
- Die frühere ausführliche Roadmap liegt unverändert im [Archiv](archiv/ROADMAP_2026-11-16.md).

**Projektziel:** SimCascade veröffentlicht regelmäßig eigenständige, gut lesbare Simulationsvideos mit sauberem Ton:
Shorts in 9:16 und längere Videos in 16:9. Alle Texte im Video sind englisch.

## 1 · Stand am 16.11.2026

| Punkt | Stand |
|---|---|
| Szenarien auf `main` | Acht: Naval, Kugelfabrik, Marble Works, Scrap Wars, Mycelium, Pyramid, Territory Wars, Waterpark |
| Veröffentlicht | Ein Naval-Short und ein 10-Minuten-Naval-Video (bis 12.11.) |
| Prüflauf | Letzter abgeschlossener Lauf auf `main` grün (14.11.). Der Lauf nach dem Wasserpark-Merge war beim Schreiben noch nicht fertig. |
| Ordnung | Ein Main. Erledigte Branches und alte Arbeitskopien sind entfernt, drei Diagnose-Stände als Marken `archive/…` gesichert. |
| Abnahme am Handy | Für fast alle Szenarien noch offen (siehe R33). |
| Shorts | [Leitlinien für Shorts](SHORTS_LEITLINIEN.md); erstes Short nach diesen Regeln: Territory „Die letzte Krone“ (R37). |

Vier Zustände bleiben getrennt: **vorhanden** (im Code), **integriert** (Einstellung, Vorschau, Export), **technisch
geprüft** (mit Umfang und Programmstand) und **abgenommen** (laufender Clip wirklich angesehen und angehört).

## 2 · Jetzt

| Nr. | Aufgabe | Nächster Schritt | Fertig, wenn |
|---|---|---|---|
| **R43** | **Marble Knockout: Murmel-Ausscheidungsrennen** (neues Szenario `knockout`, [Plan](MARBLE_KNOCKOUT_PLAN_2026-11-25.md)) | Wunsch des Nutzers vom 25.11.: Ausscheidungsrennen mit abwechslungsreichen Bahnen (Drehkreuze, Level, die sich verändern), einfach statt verkünstelt. Plan steht: Langvideo mit 12 Murmeln auf 10 Bahnen, je Bahn scheidet die Letzte aus, Finale zu dritt mit Podest; Shorts mit 8 Murmeln auf 3 Bahnen („Pick your color“, „Follow the gold one“); Baukasten aus 29 Elementen in fünf Familien; eigener Physik-Kern, der in Node und Chromium gleich rechnet; Casting wie bei Scrap. Nächster Schritt: V0 Vorschau-Bilder in drei Stilen (Stopp für die Stilwahl), danach M1 bis M9. | Short und Langvideo vom Nutzer abgenommen |
| **R31** | **Ein Main: Ordnung halten** | Aufräumen ist erledigt ([Stand im Gesamtplan](GESAMTPLAN_2026-11-16.md#0--umsetzungsstand)). Offen: Entscheidung zum leichten Schutz von `main`, erste Versionsmarke `v0.8.0` | Nur `main` und laufende Arbeit sichtbar; Regeln aus [AGENTS.md](../AGENTS.md) gelten |
| **R35** | **Marble XL als Produktionslinie** ([Gesamtplan, Abschnitt 9](GESAMTPLAN_2026-11-16.md#9--block-5-marble-xl)) | Liegt als Szenario „in Arbeit“ auf `main`. Die Linie läuft ohne Neubeginn (Chargen, Röhren leeren sich, Zähler zählt durch). Nächster Schritt: 10-Minuten-Video in 1440p60 rendern und ansehen; danach sichtbarer Abtransport unter den Röhren. Die Linie läuft als bewegter Entwurf; die Rückmeldung zum ersten Testclip ist eingearbeitet (feste Übersicht, weicher leiserer Ton, Ofen- und Farbeffekte), dazu größere Kugeln und abschaltbare Schilder (Standard aus); Glühen nur noch zwischen Ofen und Farbstation; die Kühlstrecke ist jetzt eine Trockenstrecke; kleine Deko-Animationen sind eingebaut; ein sechster Testclip liegt vor. Offen: Rückmeldung dazu, mehr Kugeln gleichzeitig, eigene Klänge je Station, danach Warteschlangen und Physik (M2) | M2: Grundlinie läuft, keine Kugel geht verloren, 20-Sekunden-Clip abgenommen |
| **R37** | **Territory-Short „Die letzte Krone“** ([Bericht](TERRITORY_SHORT_2026-11-16.md)) | Short-Karte, verdeckte Regie, schlanke Anzeige, leiser Ton und neue Short-Vorlage sind gebaut und geprüft; ein 20-Sekunden-Clip mit Ton liegt vor; in `main` seit PR #24. Speerträger statt Panzer sind freigegeben und in der Short-Vorlage; das erste ganze Short (Seed 42, rund 32 Sekunden) ist exportiert. Offen: dein Urteil zu Bild und Ton am Handy, der Upload und die Entscheidung zu Champions | Short von dir abgenommen und hochgeladen |
| **R04** | **Kanalpilot fortsetzen** | Ein Short und ein Langvideo pro Woche aus Pyramid, Naval oder Scrap Wars; Regeln in den [Leitlinien für Shorts](SHORTS_LEITLINIEN.md) | Auswertung nach 7 und 28 Tagen entscheidet über Ausbau |
| **R33** | **Abnahme-Mappe** | 16 Clips zu je 20 Sekunden (acht Szenarien, hochkant und quer, mit Ton) | Jeder Clip von dir bewertet; daraus folgt die Reihenfolge für R36 |

R33 bündelt die bisherigen Einzelabnahmen **R18** (Naval), **R20** (Scrap Wars), **R17** (Territory Wars),
**R25** (Mycelium) und **R30** (Waterpark). Dazu ein Vergleichspaar 30 gegen 60 fps (**R15**).

## 3 · Danach

| Nr. | Aufgabe | Hinweis |
|---|---|---|
| **R38** | **Neues Szenario Cloud Wars** ([Plan](CLOUD_WARS_PLAN_2026-11-18.md)) | C0 bis C8 sind gebaut: Gelände, Wolken, Gewitter und Feuer, Tag und Wetter, Anzeige, Ton, Short mit verdeckter Regie, Vorlagen für Short und Langvideo ([Bericht](CLOUD_WARS_2026-11-18.md)). Nach der ersten Rückmeldung: mehr kleine Wolken zum Einsammeln und mehr Leben am Boden (Dörfer, strömender Fluss, Boote, Traktor, Tiere). Nach der zweiten: Sog beim Fressen mit Gesichtern, hochkant keine Leisten, Meldungen höher; der Ton ist abgenommen. Offen ist nur die Abstimmung: die übrigen gesammelten Stil- und Abwägungsfragen am Ende des Berichts, danach der Export von Short und Langvideo auf Auftrag. Bis dahin heißt das Szenario „Cloud Wars (in Arbeit)“. | Short und Langvideo-Vorlage vom Nutzer abgenommen |
| **R39** | **Cloud Wars: Wolkenreise** (Langvideo, rund 5 Minuten, ruhig) ([Plan](CLOUD_WARS_REISE_PLAN_2026-11-18.md)) | Wunsch des Nutzers vom 18.11.: eine Wolke als Hauptfigur, Kamera folgt ihr über eine große, stimmige Landschaft, ohne neuen Ton. Plan mit Paketen J1 bis J4 steht; nächster Schritt J1 (Kamera und Gelände-Kacheln). Checkpoint: 20-Sekunden-Probeclip, danach 5-Minuten-Export auf Auftrag. | Probeclip vom Nutzer abgenommen |
| **R40** | **Scrap Wars: Ausbau** (Ton, Startkisten, Taktik, Effekte, Short) ([Plan](SCRAP_AUSBAU_PLAN_2026-11-19.md)) | Rückmeldung des Nutzers vom 19.11.: Klänge „furchtbar“, Wegfindung schwach, im Querformat kämpfen immer dieselben Nachbarn, Effekte nicht hochwertig genug. Plan mit Paketen T (Ton), E (Effekte), K (Regelversion `v4`: fallende Startkisten, Zielwahl mit Schusslinie, A*-Wegfindung, Panzerfahren, Charaktere) und S (Short-Modus, Turnier-Vorlage fürs Langvideo). Stand 19.11.: Hörprobe abgeschlossen (B2 „sauber“), E0–E5 und K1–K5 Taktik-Arena `v4` auf `main`, Waffen als Symbol-Marken, Vorlagen auf `v4`. T2 Ton `soft-v1` angenommen und auf `main`. Stand 20.11.: S1 Teil 1 (Short-Karte 540 × 700, Abspann, Video endet von selbst) auf `main`. Stand 21.11.: S1 Darstellung fertig (keine Kopfleiste, große Namensschilder, Einstiegstext, Sieger groß, Schalter „Bildaufbau“); S2 verdeckte Regie fertig (Short-Balance, Zeitlupe beim letzten K.o., Casting in Chromium mit 23 geprüften Seeds); S3 Short-Vorlage auf einem Casting-Seed mit 20-Sekunden-Probe; L1 Langvideo-Vorlage als Turnier mit Kapitelzeiten in der Begleitdatei. Alle Pakete des Plans sind gebaut. Nachtrag nach der ersten Probe: keine Hänger mehr (Deckung im Short 0,5 s), Bretter der Startkisten blenden aus; Casting neu (29 Seeds, Vorlage auf Seed 84, 26,5 s). Stand 22.11., Nachtrag nach der zweiten Probe: Waffen fallen doch nicht vom Himmel, sie stehen von Anfang an als drehende Münzen da. Nachtrag nach der dritten Probe, nach Vorschau freigegeben: Blaster lädt von selbst nach, Raketen sind das einzige Item und kommen nur von den zwei Plattformen, Aufnahme mit Ring und Abzeichen, Startkisten in Teamfarbe; Casting über 2400 Seeds (11 geprüfte, Vorlage auf Seed 318, Empfehlung 1601). Das ganze Short ist auf Auftrag exportiert (Seed 1601, 60 fps). L2: Die Raketen-Regeln gelten als Schalter „Waffen“ auch im Turnier-Langvideo, Tempo auf der großen Karte gemessen, neues Turnier-Casting, Turnier offen bis zur letzten Runde. S4: Roboter fahren entschlossener (Gegner und Stellung halten, ohne Schusslinie sofort umsetzen, beim Nachladen weiterfahren); untätige Zeit 5 % statt 13 %, im Casting keine Hänger mehr; Seeds neu (Short 78, Turnier 458 mit 4:59 Minuten). Das Short muss neu exportiert werden, das Langvideo ist noch nicht exportiert. **Offen: [offene Punkte](SCRAP_OFFENE_PUNKTE_2026-11-20.md)** (Urteil zur Probe, Exporte auf Auftrag, gesammelte Fragen, Aufräumen). | Short vom Nutzer abgenommen |
| **R34** | **Naval-Langvideo „Who survives the night?“** (20 bis 30 Minuten) | Pakete N0 bis N6 im [Gesamtplan, Abschnitt 8](GESAMTPLAN_2026-11-16.md#8--block-4-naval-langvideo-20-bis-30-minuten). N0 schließt zuerst die Prüflücke **R21** (Besitz und Reihenfolge der Kugeln im Zustands-Hash). **R01** und **R05** gehen darin auf. **Läuft seit 16.11.:** Auf Wunsch des Nutzers vorgezogen. Erledigt sind N1a, der Modus „Ruhiges Duell (in Arbeit)“, und N2a, Runden mit Versenkung, Punktestand und schlüssiger Lebensanzeige ([Bericht](NAVAL_RUHIGES_DUELL_2026-11-16.md)). Erledigt ist auch N2b, die Rakete vom Heck (Idee des Nutzers). Erledigt ist auch N2c, der eigene Auftritt der goldenen Kugel (Idee des Nutzers). Erledigt ist auch N2d, die Lesbarkeit (größere Kanonen, längere Leuchtspur); die erhöhte Bugkante wurde gemessen und verworfen. Erledigt ist auch N2e, der Ton als feste Mischung mit Meeresrauschen; damit sind die vier freigegebenen Vorschläge umgesetzt. Als Nächstes offen: Finale am Videoende; N0 steht weiter aus. |
| **R35** | **Marble XL, weitere Pakete** | Weitere Stationen, Kapitel und Ausbauten, Hochformat, 20-Minuten-Vorlagen (M3 bis M7). |
| **R36** | **Wichtigste Verbesserungen je Szenario** | Höchstens drei je Szenario, Vorschlag im [Gesamtplan, Abschnitt 7](GESAMTPLAN_2026-11-16.md#7--block-3-die-wichtigsten-verbesserungen-je-szenario); Reihenfolge nach R33. |
| **R32** | **Architektur absichern** | A1 (Beschreibung) ist erledigt. A2 Vertragstest für jedes Szenario; A4 bis A7 entstehen mit dem ersten Szenario, das sie braucht. |
| **R23** | **Pyramid: Ausbau für lange Videos** | P2 und P3 erledigt. Offen: P4 seltene Ereignisse, P5 Rennen, P6 Ausschnittsexport (Abweichung in der Dämmerung). |
| **R30** | **Waterpark: Abnahme und Short** | Wasserspiele am Tag, Fontänenshow am Ende, Trichter-Einlauf und „Titel aus“ sind gebaut ([Bericht](WASSERPARK_WASSERSPIELE_2026-11-17.md)). Offen: dein Urteil zu den Vorschau-Clips, 20-Sekunden-Probe mit Ton, danach der 10-Minuten-Export. Der Short braucht noch ein Drehbuch; weitere Vorschläge in der [Merkliste](WASSERPARK_OFFENE_PUNKTE_2026-11-16.md). Vorlagen-Exporttest fehlt noch. |

## 4 · Später und Merkliste

| Nr. | Punkt |
|---|---|
| R10 | Hörbare Vorschau im Simulator (würde jede Abnahme erleichtern) |
| R27 | Pyramid-Tonspitzen: Standardfall behoben, weitere Klangkombinationen beobachten |
| R07 | Oberfläche: Qualitätswerte (CRF, Preset, Bitrate) einstellbar |
| R09 | Kugelfabrik-Kleinigkeiten, nur nach Sichtbefund |
| R11 | Exportleistung bei 4K; vollständiger 60-Minuten-Export nie gemacht |
| R13 | Hinweistext im Bedienfeld nennt bei allen Szenarien „Schiffe, Kanonen“ |
| R16 | Factory Wars / Robot Wars (Konzept) |
| R24 | Pyramid-Melodie aus Lichtimpulsen; die Idee lebt in der Klangtreppe von Marble XL weiter |
| R41 | Scrap-Idee des Nutzers (19.11.): Ein zerstörter Roboter zerfällt in zwei etwas kleinere; wird einer davon zerstört, springen zwei witzige Puscheltiere heraus, die mit Keulen kämpfen. Soll das Ganze witziger und chaotischer machen. Passt als eigener Modus nach dem Scrap-Ausbau (R40), nicht in `v4`. |
| R29 | [Tierchen-Videoideen](TIERCHEN_VIDEOIDEEN_2026-11-15.md): Rennen, Plinko, Waschstraße, Dorfaufbau, Olympiade |
| – | [Abriss-Karten und Burrow](OPTIONALER_PLAN_ABRISS_BURROW_2026-11-14.md): Recherche gesichert, nicht beauftragt |

## 5 · Mit dieser Überarbeitung geschlossen

| Nr. | Ergebnis |
|---|---|
| R02 | Sunny-Yard-Replay: seit dem 13.11. nicht wieder aufgetreten, drei Diagnosen ohne Ergebnis ([Bericht](SUNNY_YARD_EXPORTDIAGNOSE_2026-11-13.md), Skripte unter der Marke `archive/sunny-replay-cause`). Bei erneutem Auftreten neu öffnen. |
| R28 | Zeitüberschreitungen im Linux-Prüflauf: letzter abgeschlossener Lauf auf `main` grün. Bei erneutem Abbruch neu öffnen. |
| R03, E1 | Kugelfabrik „Entwicklung statt Schleife“: mit Marble Works umgesetzt; der weitere Ausbau ist R35. |
| R12 | Quadrat 1:1 eigens gestalten: gestrichen, für YouTube ohne Nutzen. |
| R14 | Grafik-Playbook: aufgegangen in [AGENTS.md](../AGENTS.md) und [ARCHITEKTUR.md](ARCHITEKTUR.md). |
| R01, R05 | Naval-Schiffsoptik und Zuschauerführung: aufgegangen in R34. |
| R06, R19, R22, R26 | Bereits früher erledigt, siehe [CHANGELOG](CHANGELOG.md). |

## 6 · Offene Entscheidungen

1. **Leichter Schutz für `main`:** Überschreiben und Löschen von `main` auf GitHub verbieten, ohne Pflicht zu
   Pull Request und Prüflauf? Empfehlung: ja.
2. **Waterpark:** Passen Wasserspiele, Show und Trichter-Einlauf in den Vorschau-Clips? Dann 20-Sekunden-Probe mit Ton.
3. **Abnahme-Mappe (R33):** Wann sollen die 16 Clips entstehen?
4. **Territory-Short (R37):** Passt Bild und Ton im exportierten Short? Dann hochladen.
5. **Territory-Short (R37):** Je Fraktion ein großer Champion als nächster Schritt?
6. **Scrap-Ausbau (R40), Taktik-Arena `v4`:** Die farbigen Startecken im Boden in `v4` weglassen? Soll die Kopfzeile
   dieselben Waffensymbole bekommen wie der Boden (erst als Vorschau)? Ton ohne eigenen Klang für Rundenende und
   Anfahren, Wind auch auf dunklen Karten: passt das? Dazu das Aufräumen der Scrap-Branches ([offene Punkte](SCRAP_OFFENE_PUNKTE_2026-11-20.md)).
7. **Scrap-Short und Langvideo (R40):** Passt die 20-Sekunden-Probe (Bild, Tempo, Ton)? Dann das ganze Short und das
   Turnier-Langvideo exportieren? Dazu Geschmacksfragen zu Short-Optik, Balance, Zeitlupe, Seed und Länge des
   Langvideos ([offene Punkte](SCRAP_OFFENE_PUNKTE_2026-11-20.md), Abschnitt 3).

Getroffene Entscheidungen stehen im [CHANGELOG](CHANGELOG.md#entscheidungen).

## 7 · Pflege

- IDs werden nie wiederverwendet. **Nächste freie ID: R42.**
- Neue offene Punkte nur hier eintragen. Erledigtes mit Datum, Commit und Bericht in den CHANGELOG übertragen.
- Der Fortschritt der einzelnen Schritte steht in [Abschnitt 0 des Gesamtplans](GESAMTPLAN_2026-11-16.md#0--umsetzungsstand) und wird mit jedem Paket nachgezogen.
- Diese Datei bleibt kurz. Verlauf, Messwerte und Begründungen gehören in datierte Berichte unter `docs/`.
- **Kein Export über 20 Sekunden ohne ausdrücklichen Auftrag.** Reine Simulationsvorläufe sind davon ausgenommen.
