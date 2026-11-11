# SimCascade – Umsetzungsplan

**Stand:** 11.11.2026 · geprüft an `main` · `0f13787` (Arbeitsverzeichnis sauber, kein Server läuft)
**Grundlage:** Roadmap V1.2 (10.11.2026) und Planergänzung „Kanalstart und nächste Sitzung“ (10.11.2026)
**Status:** Plan zur Freigabe – es wurde noch nichts umgesetzt.

## 1 · Ergebnis der Prüfung

**Urteil: Beide Dokumente passen zum aktuellen Projekt und sind sinnvoll umsetzbar.** Die Planergänzung verbessert die
Roadmap an der richtigen Stelle (erst Marble bis zum ersten Video, Naval später). Dieser Plan folgt deshalb der
Reihenfolge der Ergänzung und übernimmt die Bulk-Inhalte der Roadmap, mit den Korrekturen aus Abschnitt 1.2.

### 1.1 Am Code nachgeprüft

| Aussage der Dokumente | Befund |
|---|---|
| Marble-PR #1 ist in `main` | Stimmt. Danach kamen zwei Commits: englische Videotexte + Zeitlupe 0,8× (`b14334c`), `.claude/` ignorieren (`0f13787`). |
| GUI: Dauer außerhalb der Auswahlliste springt still auf 3600 s | Stimmt, `src/app.js:168–169`. |
| Unbekannte Szenario-ID fällt still auf Naval zurück | Stimmt, `src/core.js:114`. Ein Kerntest erwartet dieses Verhalten derzeit ausdrücklich. |
| 0,8× gilt auch im Export, 2×–10× nur in der Vorschau | Stimmt und steht bereits als Hinweis im Bedienfeld – dieser B00-Punkt ist erledigt. |
| CLI: freie Dauer 1 s bis 4 h, 720p–4K, 30/60 FPS | Stimmt. |
| Naval: `_drawRecycling(t)` als Ansatzpunkt für B01 | Vorhanden, `src/scenarios/naval.js:1089`. |
| Marble: Helfer `lin`, `rad`, `plate`, `bolt`, `band`, `tubesBack`, `tubesFront`, `drawGear`, `drawBall` | Alle vorhanden (Grundlage für B04). |
| Marble: Rütteln und Vorrang im Trichter | Vorhanden in `_agitate()`, `src/scenarios/marble.js:320`. |
| Kenney Impact Sounds unter `Dokumente/kenney/kenney_impact-sounds` | Vorhanden: 130 OGG-Dateien, `License.txt` nennt CC0. Enthält Glas-, Metall-, Blech- und Holzaufschläge. |
| GitHub Pages kann die Simulation ausliefern | Plausibel: Das Repository ist öffentlich, `vendor/` ist eingecheckt, `index.html` läuft ohne Server. Pages ist noch nicht eingeschaltet. |

### 1.2 Korrekturen und Ergänzungen

1. **Es gibt keine Referenz-Hashes.** Die Roadmap verlangt in B01, „bestehende“ Hashes unverändert zu halten. Die
   Tests vergleichen aber nur zwei Läufe derselben Version. Die Ergänzung hat recht: Die Hashes müssen zuerst
   angelegt werden (Schritt 0). Das gilt schon jetzt, denn `b14334c` hat beide Szenarien angefasst.
2. **Marble protokolliert keine Ereignisse.** Naval schreibt `shot`, `hit`, `splash`, `clink`, `reload` mit; Marble
   hat kein Ereignisprotokoll. Für Ton (B05) ist das der erste Arbeitsschritt.
3. **Der heutige Marble-Kreislauf trägt etwa 30–45 Sekunden, keine fünf Minuten.** Er wiederholt sich nach rund
   40 Sekunden. Ein Fünf-Minuten-Video braucht eine Entwicklung (Kern von B07). Die Ergänzung nennt das frühe
   lange Video, ohne diese Abhängigkeit auszusprechen – deshalb steht B07 hier vor dem ersten langen Video.
4. **Der kurze Standard für die Dauer betrifft Tests und Vorlagen.** Heute ist 3600 s der Standard im Kern, in einem
   Kerntest und in `presets/naval-standard.json`. Die Änderung ist richtig (schützt vor versehentlichen
   60-Minuten-Exporten), muss aber an diesen drei Stellen zusammen erfolgen.
5. **Szenario-ID:** fehlende ID → Standard-Szenario wie bisher; ausdrücklich angegebene, unbekannte ID → Fehler.
   In der Live-Ansicht darf eine veraltete gespeicherte Konfiguration die Seite nicht unbenutzbar machen.
6. **Ton nicht über FFmpeg-Filterketten mischen.** Ein Fünf-Minuten-Video hat mehrere tausend Ereignisse. Sinnvoll:
   wenige Samples einmal dekodieren, in Node zu einer WAV-Spur summieren, dann muxen.
7. **Kenney-Sounds sind eine neue Entscheidung.** Die Vorgabe „ausschließlich Code“ galt der Grafik. CC0-Sounds sind
   rechtlich unkritisch; Motor- und Rollgeräusche fehlen im Paket und müssten synthetisch erzeugt oder weggelassen werden.
8. **Vergleichswerte für B02** – am aktuellen Commit in Schritt 0 neu gemessen (8 Seeds je Format, je 10 Minuten,
   Tempo 1): Rütteln 7–18× quer und 4–62× hochkant, längste Verweildauer im Behälter 40–72 s, 430–475 von
   theoretisch 500 Umläufen. Einzelwerte in [AUSGANGSBASIS_2026-11-11.md](AUSGANGSBASIS_2026-11-11.md).

### 1.3 Ehrliche Einschätzung des Kanalplans

- **Der Engpass ist die Inhaltsidee, nicht die Technik.** Rendern kostet wenig (5 Minuten 1080p30 ≈ 3–5 Minuten).
  Vier lange Videos mit je eigener Idee in vier Wochen verlangen vier unterscheidbare Abläufe aus einer Maschine.
  Realistisch ist die in der Ergänzung genannte kleinere Stufe (ein langes Video und ein Short pro Woche).
- **Die drei Varianten der Ergänzung (Überlastungsprobe, Sortierduell, Wachsende Maschine) sind jeweils neue
  Mechanik**, nicht nur Einstellungen. Für den ersten Test reicht eine davon.
- **Nicht geprüft:** YouTube-Schwellen, die angekündigte Änderung zum 1.2.2027 und die Marktzahlen. Sie stammen aus
  den verlinkten Quellen der Ergänzung; ich habe nur die technischen Aussagen am Code kontrolliert.

## 2 · Reihenfolge

```
0 Ausgangsbasis → 1 Bedienfehler (B00) → 2 Marble-Trichter (B02) → 3 Marble-Ton (B05) → 4 Erstes Short (B06)
                       └→ W1 Playlink + Handy · W2 Doppelklick-Start   (jederzeit nach Schritt 1, je ein eigener Auftrag)
→ 5 Marble-Entwicklung (B07-Kern) → 6 Erstes 5-Minuten-Video → 7 Pilot vier Wochen (B13-Kern) → Entscheidung
```

Zurückgestellt bis nach dem Pilot oder bis zum ersten Naval-Upload: B01, B08, B03, B04, B09, B10, B11, B12.

## 3 · Schritte

Jeder Schritt ist ein eigener Auftrag mit eigenem Commit. Danach anhalten und abnehmen.

### Schritt 0 · Ausgangsbasis sichern (Teil von B00) · klein · erledigt am 11.11.2026

- [x] `main`, Commit, Arbeitsverzeichnis und laufende Prozesse prüfen; nichts überschreiben.
- [x] Tests ausführen und Ergebnis protokollieren (jede Testdatei einzeln, höchstens 2 Minuten je Lauf).
- [x] Referenz-Hashes anlegen: Naval und Marble, je 9:16 und 16:9, Seeds 42 und 7, Zeitpunkte 20 s und 120 s, Tempo 1 und 0,8.
- [x] Hashes mit Playwright-, PixiJS- und Matter.js-Version in `test/fixtures/` ablegen; ein Test vergleicht dagegen.
- [x] Vier Referenzbilder erzeugen (Naval und Marble, je 9:16 und 16:9) mit `scripts/screenshot.mjs`.
- [x] Marble-Messwerte am aktuellen Commit neu erheben (Rütteln, Verweildauer, Umläufe; 8 Seeds je Format).

**Abnahme:** Hashes sind bei zwei Läufen identisch; Bilder wurden angesehen; Messwerte stehen im Bericht.
**Nachweise:** Testprotokoll, Hash-Datei, vier Bilder, Messtabelle, Commit. Keine Exporte über 20 s.
**Ergebnis:** [AUSGANGSBASIS_2026-11-11.md](AUSGANGSBASIS_2026-11-11.md) – 47 von 47 Tests bestanden, 32 Referenz-Hashes, vier Bilder, Messwerte für beide Tempi.

### Schritt 1 · Bedienfehler schließen (Rest von B00) · klein

- [ ] Freie Dauer als Eingabe (Sekunden oder `45s`, `5m`), Grenzen 1 s bis 4 h sichtbar; Schnellwahl bleibt.
- [ ] Gültige Dauer außerhalb der Schnellwahl bleibt beim Laden, Szenariowechsel und Neustart erhalten.
- [ ] Kurzen Standard festlegen (Vorschlag 45 s) – Kern, Kerntest und `presets/naval-standard.json` gemeinsam anpassen.
- [ ] Ausdrücklich unbekannte Szenario-ID: verständliche Fehlermeldung in CLI, Server und Export-Seite.
- [ ] Live-Ansicht: veraltete gespeicherte Konfiguration meldet sich sichtbar und startet das Standard-Szenario.
- [ ] Tests ergänzen: eigene Dauer, unbekanntes Szenario, gespeicherte Konfiguration.
- [ ] Hinweis zu 0,8× und 2×–10× nur kontrollieren (ist bereits vorhanden).

**Abnahme:** 45 s bleibt 45 s; Fehlkonfiguration ist sichtbar; Referenz-Hashes aus Schritt 0 unverändert.
**Nachweise:** Testprotokoll, zwei Bildschirmfotos des Bedienfelds, Commit.

### Schritt 2 · Marble: Trichterstau konstruktiv entschärfen (B02) · mittel

- [ ] Stau und tote Zone mit festen Seeds nachstellen und dokumentieren (Ort, Häufigkeit, Format).
- [ ] Eine konstruktive Änderung wählen und umsetzen, z. B. einseitig geneigter Behälterboden mit Einzelzuführung
      oder mittiger Einlauf – nicht die Rüttelstärke erhöhen.
- [ ] Rüttler und Vorrang als seltene Sicherung behalten und weiter zählen.
- [ ] Vorher/Nachher mit denselben Seeds messen: Rütteln, Verweildauer, Umläufe, längste Pause.
- [ ] Messingmanschette unter dem Zellenrad gerade setzen.
- [ ] Ausgewogene Farbverteilung nur prüfen (36 Kugeln = 6 × 6 läge knapp über der bisherigen Obergrenze 35).

**Zielwerte (Vorschlag):** Rütteln höchstens 2× je 10 Minuten in beiden Formaten, Verweildauer unter 40 s,
mindestens 470 Umläufe je 10 Minuten, keine Kugel mit null Umläufen, größter Schritt weiter unter 20 Einheiten.
**Abnahme:** Zielwerte über 8 Seeds je Format erreicht oder Abweichung offen benannt; Marble-Hashes werden bewusst neu gesetzt, Naval-Hashes bleiben gleich.
**Nachweise:** Messtabelle, je ein 8–12-s-Clip hochkant und quer, Testprotokoll, Commit.

### Schritt 3 · Marble: Ton (B05, zunächst nur Marble) · mittel

- [ ] Ereignisprotokoll in Marble ergänzen: Aufnahme am Zellenrad, Landung auf dem Band, Scanner, Klappe, Aufprall in
      der Röhre, Ventil, Aufnahme im Aufzug, Fall in den Behälter – ohne die Simulation zu verändern.
- [ ] 6–10 Kenney-Dateien auswählen; Dateinamen und CC0-Nachweis in `docs/` festhalten.
- [ ] Tonspur aus den Ereignissen in Node mischen (WAV), Lautstärke nach Aufprallstärke, leichte Tonhöhenvariation,
      Begrenzer gegen Übersteuern; anschließend mit FFmpeg ins MP4 muxen.
- [ ] Stummoption; Synchronität bei Tempo 1 und 0,8 prüfen.
- [ ] Entscheiden, ob Motor- und Rollgeräusch synthetisch entstehen oder entfallen.

**Abnahme:** 8–15-s-Clips in beiden Formaten mit sauberem, synchronem Ton; gleicher Seed ergibt dieselbe Tonspur; Hashes unverändert.
**Nachweise:** zwei kurze MP4, `ffprobe`-Daten (Audiostream, Spitzenpegel), Lizenzliste, Commit.

### Schritt 4 · Erstes Short (B06) · klein bis mittel

- [ ] Eine Idee festlegen (siehe Abschnitt 4, Entscheidung A).
- [ ] 9:16-Bildaufbau, englische Texte, Lesbarkeit im mobilen Sichtfeld, klarer Anfang und Abschluss.
- [ ] 30–45 s in 1080p rendern (30 FPS, solange B03 nichts anderes ergibt) und am Handy ansehen.
- [ ] Zwei Fassungen für Startbild und Titel vorbereiten; höchstens zwei bewusst unterschiedliche Varianten.

**Abnahme:** ein uploadfertiges Short mit Bild, Ton und erkennbarer Dramaturgie.
**Nachweise:** MP4, Startbild, Titelvorschläge, aktive Arbeitszeit und Renderzeit notiert.

### Schritt W1 · Playlink und Handybedienung · klein (eigener Auftrag, nach Schritt 1)

- [ ] GitHub Pages aus `main` einschalten (öffentliche Veröffentlichung – nur nach deiner Freigabe).
- [ ] Online zeigt der Exportknopf klar: Export nur am eigenen PC; Vorschau und Regler funktionieren.
- [ ] Bedienfeld auf dem Handy prüfen und nachbessern (Layout unter 900 px existiert bereits).
- [ ] Teilen-Link: aktuelle Einstellungen als Adresse; Einstellungen als JSON laden und speichern.
- [ ] Geschwindigkeit am echten Gerät prüfen (deine Aufgabe; ich liefere eine Prüfliste).

**Abnahme:** Link öffnet auf PC und Handy die laufende Vorschau; ein geteilter Link stellt dieselbe Szene her.

### Schritt W2 · Start per Doppelklick · sehr klein (eigener Auftrag)

- [ ] `start.bat`: Server starten, Browser öffnen, fehlendes Node oder FFmpeg verständlich melden.
- [ ] Kurzer Abschnitt in der README.

**Abnahme:** Doppelklick öffnet die Oberfläche, Export per Knopf funktioniert, kein Terminalbefehl nötig.

### Schritt 5 · Marble: Entwicklung statt reiner Schleife (Kern von B07) · groß

- [ ] Eine Variante aus der Ergänzung wählen (Entscheidung B) und auf zwei bis drei Bauteile begrenzen.
- [ ] Jede Erweiterung verändert sichtbar Weg oder Durchsatz; Kreislauf, Sortierung und beide Formate nach jedem Bauteil testen.
- [ ] Zuerst eine 20–30-s-Probe, erst nach Sichtprüfung weiter.

**Abnahme:** nachvollziehbarer Anfang, Entwicklung und Abschluss bei stabiler Simulation.

### Schritt 6 · Erstes Fünf-Minuten-Video · klein

- [ ] Ein vollständiger Export 16:9, 1080p, mit Ton; komplett ansehen.
- [ ] Titel, Vorschaubild, Beschreibung; Arbeitszeit und Renderzeit notieren.

**Abnahme:** ein uploadfertiges langes Video. Acht bis zehn Minuten erst, wenn die Idee das trägt.

### Schritt 7 · Pilot (Kern von B13) · vier Wochen

- [ ] Takt festlegen: Start mit einem langen Video und einem Short pro Woche; zweites Short nur bei wenig Aufwand.
- [ ] Je Upload festhalten: Idee, Szenario, Länge, Titel, Vorschaubild, aktive Arbeitszeit, Renderzeit.
- [ ] Nach 7 und 28 Tagen auswerten: Impressionen, Klickrate, Wiedergabedauer, Bindung, Abonnenten.
- [ ] Entscheidung nach den Kriterien der Ergänzung: Ausbau, Anpassung oder Begrenzung.

### Zurückgestellt

- [ ] **B01 Naval-Recycling beruhigen** – vor dem ersten Naval-Upload; setzt die Hashes aus Schritt 0 voraus.
- [ ] **B08 Naval-Zuschauerführung** – nach B01.
- [ ] **B03 30 gegen 60 FPS** – kurzer Vergleich, kann vor Schritt 4 eingeschoben werden, verzögert ihn aber nicht.
- [ ] **B04 Grafik-Playbook** – reine Dokumentation, jederzeit möglich; spätestens vor einem neuen Szenario.
- [ ] **B09 GUI vervollständigen**, **B10 CI** – nach dem ersten veröffentlichten Video.
- [ ] **B11 Factory Wars / Robot Wars**, **B12 Territory Wars** – Merkliste, erst nach dem Pilot.

## 4 · Entscheidungen, die du treffen musst

- [ ] **A – Idee für das erste Short.** Empfehlung: Farbrennen mit der vorhandenen Technik („Which color reaches 10
      first?“ – Zähler und Sortierung existieren, es fehlen nur Ziel, Abschluss und Einblendung). Alternative: ruhiger
      Maschinenablauf ohne Sieger. Beides aus derselben Maschine ergibt den Vergleich, den die Ergänzung vorschlägt.
- [ ] **B – Variante für das lange Video:** Überlastungsprobe, Sortierduell oder Wachsende Maschine. Empfehlung:
      Wachsende Maschine, weil sie die fünf Minuten am natürlichsten füllt.
- [ ] **C – Kenney-Sounds verwenden?** Empfehlung: ja, mit Dateiliste und CC0-Nachweis.
- [ ] **D – GitHub Pages einschalten?** Die Vorschau wird damit öffentlich erreichbar.
- [ ] **E – Kurzer Standard für die Dauer:** Vorschlag 45 s.
- [ ] **F – Referenzbilder ins Repository?** Empfehlung: ja, in 720p unter `docs/reference/` (rund 1 MB je Bild).

## 5 · Regeln für jeden Auftrag

- [ ] Ausgangs-Commit und betroffene Dateien nennen; genau ein Schwerpunkt, keine Nebenfunktionen.
- [ ] Tests einzeln, höchstens 2 Minuten je Lauf; hängende Prozesse werden abgebrochen.
- [ ] Keine Exporte über 20 s ohne ausdrücklichen Auftrag; nie versehentlich 5 oder 60 Minuten.
- [ ] Sichtbare Änderung = Vorher/Nachher-Bild oder kurzer Clip, der tatsächlich angesehen wurde.
- [ ] Bericht: Was geändert, was nachweislich besser, was offen, welche Messwerte.
- [ ] Eigener Commit; Pull Request bei größeren Änderungen; kein Merge ohne Freigabe.
- [ ] Schlägt die Abnahme fehl: anhalten, dokumentieren, nicht ausweiten.
