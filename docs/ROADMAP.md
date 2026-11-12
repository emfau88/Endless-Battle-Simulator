# Roadmap

**Stand:** 12.11.2026 · `main` nach `f2f5e6f`
**Zweck:** die **einzige aktive Liste** offener Punkte. Erledigtes steht im [CHANGELOG](CHANGELOG.md), Hintergründe
stehen in den Berichten unter `docs/`. Die Berichte halten ihren Stand fest und werden nicht nachgeführt.

**Grundlage:** Roadmap V1.2 und Planergänzung „Kanalstart und nächste Sitzung“ (beide 10.11.2026, nicht im
Repository). Der daraus abgeleitete Umsetzungsplan vom 11.11.2026 ist in dieser Datei aufgegangen
(alte Fassung: `git show f2f5e6f:docs/UMSETZUNGSPLAN.md`).

IDs: `R..` = Punkt dieser Roadmap, in Klammern die frühere Bezeichnung aus Roadmap V1.2 bzw. Umsetzungsplan.

## 1 · Priorität hoch

- [ ] **R01 · Optik der Seeschlacht: Schiffe** – Rest der Vorgabe vom 12.11.2026. Glasrohre, Anschlüsse, Sammelrinne
      und die drei bekannten Mängel sind erledigt ([NAVAL_MULDEN_LIFT.md](NAVAL_MULDEN_LIFT.md)); offen sind die
      Schiffe selbst. *Quelle:* Vorgabe vom 12.11.2026.
- [ ] **R02 · Tests automatisch bei jedem Push (CI)** (B10) – GitHub Actions mit Node, FFmpeg und Chromium; die
      Suite braucht ≈ 7 Minuten. Bisher laufen Tests nur von Hand und in den letzten Aufträgen nur teilweise.
      *Quelle:* [Audit](AUDIT_2026-11-12.md), Hotzone 3.

## 2 · Priorität mittel

- [ ] **R03 · Kugelfabrik: Entwicklung statt reiner Schleife** (Schritt 5, Kern von B07) – Der Ablauf wiederholt
      sich nach ≈ 40 s; für lange Kugelfabrik-Videos braucht es Anfang, Entwicklung und Abschluss. Zwei bis drei
      Bauteile, nach jedem Bauteil Kreislauf, Sortierung und beide Formate testen; zuerst eine 20–30-s-Probe.
      Braucht Entscheidung **E1**.
- [ ] **R04 · Pilot über vier Wochen** (Schritt 7, Kern von B13) – läuft seit den ersten Uploads. Je Upload
      festhalten: Idee, Szenario, Länge, Titel, Vorschaubild, aktive Arbeitszeit, Renderzeit. Nach 7 und 28 Tagen
      auswerten (Impressionen, Klickrate, Wiedergabedauer, Bindung, Abonnenten), dann Ausbau, Anpassung oder
      Begrenzung. Aus der Planprüfung: Der Engpass ist die Inhaltsidee, nicht die Technik; realistisch sind ein
      langes Video und ein Short pro Woche.
- [ ] **R05 · Zuschauerführung der Seeschlacht** (B08) – Im Hochformat stehen die Schiffe klein in der Mitte. Die
      Wassersäule ist seit dem Lift-Umbau von 39 % auf 23 % der Bildhöhe geschrumpft, darunter liegt Sand. Größere
      Schiffe sind ein Layout-Eingriff und damit ein Eingriff in die Physik (Referenz-Hashes neu setzen).
      *Quelle:* [B01_NAVAL_RECYCLING.md](B01_NAVAL_RECYCLING.md), [NAVAL_MULDEN_LIFT.md](NAVAL_MULDEN_LIFT.md).
- [ ] **R18 · Seeschlacht: Feinschliff nach dem Lift-Umbau** – (1) Ob rechtes Rohr und Munitionsregal im Short unter
      den YouTube-Buttons liegen, ist ungeprüft; eine zuschaltbare Sicherheitszonen-Schablone in der Vorschau würde
      das klären. (2) Querformat mit drei und vier Schiffen: Die Lebensbalken stehen weiter oben in der Mitte, Kugeln
      können dahinter durchfliegen. (3) Sand, Sockel und Rohr sind ein erster Wurf. (4) Die eingebaute Fassung wurde
      nur an Einzelbildern beurteilt, nicht in Echtzeit. *Quelle:* [NAVAL_MULDEN_LIFT.md](NAVAL_MULDEN_LIFT.md).
- [ ] **R19 · Seeschlacht: Atmosphäre und Aufhänger** – Vorschläge vom 12.11.2026: „Tink“ beim Nachladen und „Tock“
      am Grund (Kenney); Mondlicht (Glitzerbahn auf dem Wasser, Lichtbahnen unter Wasser); Mündungsfeuer beleuchtet
      kurz Segel und Rumpf, Schaum am Rumpf; goldene Kugel mit Zähler zum Verfolgen; langsamer Himmelsverlauf und
      seltene Ereignisse für lange Videos. Braucht Entscheidung **E2**.
- [ ] **R06 · Gemeinsame Szenario-Basis** – beim Bau von Szenario 3, nicht vorher: Ereignisring, Matter.js-Auf- und
      Abbau, Zeitschritt und Prüfsumme sind in beiden Szenarien doppelt gebaut. Die Checkliste für neue Szenarien
      steht bereits im Audit (Abschnitt 4). *Quelle:* [Audit](AUDIT_2026-11-12.md), Hotzones 1, 2, 4, 7.
- [ ] **R07 · Oberfläche vervollständigen** (B09) – z. B. fehlen Qualitätswerte (CRF, x264-Preset) in der
      Oberfläche. Genauer Umfang laut Roadmap V1.2 noch zu klären.

## 3 · Priorität niedrig

- [ ] **R08 · Programmstand in der Video-JSON** – Commit mitschreiben, damit alte Videos sicher wiederholbar sind.
      *Quelle:* Audit, Hotzone 6.
- [ ] **R09 · Kugelfabrik: Kleinigkeiten** – Brückenbrecher greift 240–540× je 10 Minuten ein (sichtbares Zucken in
      Echtzeit nicht geprüft); Grün hat bei 35 Kugeln nur 5 statt 6 Kugeln (ausgewogen erst bei 36); rechte Stütze
      steht frei neben dem Zellenrad; Funken und Klirr-Ton haben leicht unterschiedliche Auslöser; falls die
      Sammelschiene in der Shorts-App verdeckt ist, Hochkant-Layout nach oben rücken.
      *Quelle:* [SCHRITT_2](SCHRITT_2_MARBLE_TRICHTER.md), [SCHRITT_3](SCHRITT_3_MARBLE_TON.md), [SCHRITT_4](SCHRITT_4_ERSTES_SHORT.md).
- [ ] **R10 · Ton: Ergänzungen** – Motor- und Rollgeräusch der Kugelfabrik fehlen; die Vorschau im Browser ist
      stumm, die Lautstärkeregler sind nur im Export hörbar.
- [ ] **R11 · Leistung und lange Videos** – 4K-Export ≈ 10 Frames/s wegen JPEG/Base64-Übergabe; ein kompletter
      60-Minuten-Export (Bild und Ton) wurde nie gemacht; Geschwindigkeit der Online-Vorschau am Handy unbekannt.
- [ ] **R12 · Quadrat 1:1 gestalten** – nutzt bei beiden Szenarien das verkleinerte Querformat-Layout.
- [ ] **R13 · Hinweistext im Bedienfeld** nennt „Schiffe, Kanonen“ auch bei der Kugelfabrik (kosmetisch).
      *Quelle:* [SCHRITT_1](SCHRITT_1_BEDIENFEHLER.md).
- [ ] **R14 · Grafik-Playbook** (B04) – reine Dokumentation, spätestens vor einem neuen Szenario.
- [ ] **R15 · 30 gegen 60 fps vergleichen** (B03) – weitgehend überholt, die Bildrate ist wählbar; nur der
      Sichtvergleich fehlt.

## 4 · Deine Aufgaben

Punkte, die nur du erledigen kannst.

- [ ] **Hörprobe nach der Lautheits-Einmessung** (−14 LUFS): `output/naval_lufs_16x9_12s.mp4` und
      `output/marble_lufs_9x16_12s.mp4`. Die Kugelfabrik wird an den lautesten Stellen um bis zu 19 dB begrenzt –
      klingt sie gedrückt oder pumpend? Den Ton der Seeschlacht hat bisher niemand gehört.
- [ ] **Neue Seeschlacht in Echtzeit ansehen** (Hoch- und Querformat, lokal über `start.bat`): rollt, wartet und
      steigt alles stimmig? Im Hochformat am Handy darauf achten, ob das rechte Rohr unter den YouTube-Buttons liegt.
- [ ] **Laufenden Server neu starten** (`start.bat`), damit der Export-Knopf die neuen Ton-Regler nutzt.
- [ ] **Online-Vorschau am Handy prüfen** – Prüfliste in [W1_W2_PLAYLINK_START.md](W1_W2_PLAYLINK_START.md).
- [ ] **Echter Doppelklick auf `start.bat`**, möglichst auch auf einem Rechner ohne vorherige Einrichtung.

## 5 · Offene Entscheidungen

- [ ] **E1 · Variante für das lange Kugelfabrik-Video** (früher Entscheidung B): Überlastungsprobe, Sortierduell
      oder Wachsende Maschine. Empfehlung: Wachsende Maschine, weil sie fünf Minuten am natürlichsten füllt.

- [ ] **E2 · Welche Vorschläge aus R19 umgesetzt werden.** Empfehlung: zuerst Ton („Tink“, „Tock“), dann Mondlicht,
      dann Mündungsfeuer-Licht und Schaum (alle drei ohne Eingriff in die Physik). Goldene Kugel als eigener Schritt
      für Shorts. Himmelsverlauf und seltene Ereignisse zurückstellen, bis lange Videos im Pilot zählen.

Getroffene Entscheidungen stehen im [CHANGELOG](CHANGELOG.md#entscheidungen).

## 6 · Merkliste (frühestens nach dem Pilot)

- **R16 · Factory Wars / Robot Wars** (B11)
- **R17 · Territory Wars** (B12)

## 7 · Arbeitsregeln

- Je Auftrag: Ausgangs-Commit und betroffene Dateien nennen; genau ein Schwerpunkt, keine Nebenfunktionen.
- Eigener Branch und Commit; Push und Merge nach `main` nur, wenn der Auftrag es freigibt.
- Tests: mindestens die betroffenen Testdateien und `npm run golden`; vor größeren Schritten `npm test`.
  Hängende Prozesse abbrechen.
- Keine Exporte über 20 s ohne ausdrücklichen Auftrag.
- Sichtbare Änderung = Vorher/Nachher-Bild oder kurzer Clip, der tatsächlich angesehen wurde.
- Größere Schritte bekommen einen Bericht unter `docs/` (was geändert, was nachweislich besser, Messwerte).
- Schlägt die Abnahme fehl: anhalten, dokumentieren, nicht ausweiten.

## 8 · Pflege

- Neue offene Punkte **nur hier** eintragen, mit nächster freier ID und Quelle.
- Erledigt: Punkt hier entfernen und im [CHANGELOG](CHANGELOG.md) mit Datum, Commit und ggf. Bericht eintragen.
- Berichte unter `docs/` verweisen auf diese Datei, statt eigene Listen weiterzuführen.
