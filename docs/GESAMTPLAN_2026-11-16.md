# Gesamtplan: ein Main, sichere Architektur, Ausbau je Szenario

**Zuletzt aktualisiert:** 17.11.2026 (Naval: Ton als Vorschau). **Status:** vom Nutzer am 16.11.2026 freigegeben („freie Hand“),
Umsetzung läuft.

Die [ROADMAP](ROADMAP.md) bleibt die einzige aktive Aufgabenliste; die Vorhaben dieses Plans stehen dort als
R31 bis R36. Dieser Plan liefert Begründung, Reihenfolge und Paketbeschreibungen.

**Pflege:** Abschnitt 0 wird nach jedem abgeschlossenen Paket aktualisiert, im selben Pull Request wie die
Änderung. Abschnitt 2 hält die Ausgangslage vor dem Aufräumen fest und wird nicht fortgeschrieben.

## 0 · Umsetzungsstand

Drei Zustände: **Erledigt**, **Läuft**, **Offen**. Dazu **Entfällt** für gestrichene Schritte.

### Block 0 · Sichern und aufräumen (R31)

| Schritt | Stand | Ergebnis |
|---|---|---|
| 0.1 Wasserpark abwarten | **Erledigt** | Fertig und in `main` (PR #13), Anzeige englisch. |
| 0.2 Komplettsicherung | **Erledigt** | `EBS-Sicherung-2026-11-16.bundle` (86 MB, geprüft) neben dem Projektordner. |
| 0.3 `output/` sichten | **Entfällt** | Entscheidung vom 16.11.: `output/` bleibt lokal, nichts kommt ins Repository, nichts wird gelöscht. |
| 0.4 Scrap-Optik mergen | **Erledigt** | PR #15. Der Scrap-Browsertest bekam eine eigene Prüfgruppe und 90 s Navigationszeit, weil er auf dem GitHub-Rechner sein Zeitlimit riss. |
| 0.5 Kennzeichen „in Arbeit“, Sammelprüfung | **Offen** | Marble XL liegt seit dem 16.11. auf `main` und trägt den Zusatz „(in Arbeit)“ im Titel und in der README. Das Feld `status` aus 3.3 ist noch nicht gebaut; die Sammelprüfung nur, falls der Schutz von `main` gewünscht wird. |
| 0.6 Doku-Paket | **Erledigt** | PR #16: dieser Plan, `AGENTS.md`, `ARCHITEKTUR.md`, neue kurze Roadmap, Abriss/Burrow-Plan, Sunny-Yard-Bericht. Dazu PR #14 (Wasserpark-Merkliste). |
| 0.7 Wasserpark mergen | **Erledigt** | PR #13. |
| 0.8 Erledigte Branches löschen | **Erledigt** | 42 lokale und 35 GitHub-Branches gelöscht (alle vollständig in `main`). Drei Diagnose-Stände als Marken `archive/…` gesichert, dann gelöscht. |
| 0.9 Arbeitskopien entfernen | **Erledigt** | Acht alte Arbeitskopien entfernt, Hauptordner auf `main`. Ihre Review-Medien liegen in `output/aus-arbeitskopien/`. |
| 0.10 `output/` leeren | **Entfällt** | Siehe 0.3. |
| 0.11 Schutz von `main`, Versionsmarke | **Offen** | Entscheidung des Nutzers steht aus. |

### Blöcke 1 bis 5

| Block | Stand | Ergebnis und nächster Schritt |
|---|---|---|
| 1 · Architektur (R32) | **Läuft** | A1 erledigt (`ARCHITEKTUR.md`). A2 Vertragstest offen. A4 bis A7 entstehen mit dem ersten Szenario, das sie braucht. |
| 2 · Abnahme-Mappe (R33) | **Offen** | 16 Clips zu je 20 Sekunden; noch nicht beauftragt. |
| 3 · Verbesserungen je Szenario (R36) | **Läuft** | Territory Wars vorgezogen (R37): Short „Die letzte Krone“ mit kleiner Karte, verdeckter Regie, schlanker Anzeige und leisem Ton ist gebaut und geprüft ([Bericht](TERRITORY_SHORT_2026-11-16.md)); offen sind die Abnahme am Handy und der Export des ganzen Shorts. Die übrigen Szenarien folgen nach der Abnahme-Mappe. |
| 4 · Naval-Langvideo (R34) | **Läuft** | Vom Nutzer am 16.11. vorgezogen. N1a erledigt: Modus „Ruhiges Duell (in Arbeit)“ als eigener Schalter `mode=calm`, Standardmodus bitgleich. N2a erledigt: Runden mit Versenkung, Punktestand, Feuerpause mit Reparatur, Segel am Schiffsschaden ([Bericht](NAVAL_RUHIGES_DUELL_2026-11-16.md)). N2b erledigt: Rakete vom Heck. N2c erledigt: goldene Kugel mit eigenem Auftritt. N2d erledigt: Lesbarkeit (größere Kanonen, längere Leuchtspur). Der Ton (N2e) liegt als Vorschau vor und wartet auf das Hörurteil. Danach: Finale (Abschnitt 8.4). N0 steht weiter aus. |
| 5 · Marble XL (R35) | **Läuft** | M0 und M1 erledigt. Der erste Prototyp (vier gleiche Linien) wurde abgelehnt; das Entwurfsbild der Produktionslinie mit neun Maschinen hat der Nutzer am 16.11. als richtige Richtung bestätigt. Die besprochenen Verbesserungen sind in einer zweiten Fassung umgesetzt (Tiefe im Hintergrund, Lichtzonen, deutlichere Kugelzustände, größere Farbstation, Richtungsmarken, reservierter Platz für Linie 2). Der Nutzer hat die zweite Fassung bestätigt. Seitdem läuft die Linie als bewegter Entwurf (Kugeln folgen einem festen Zeitplan durch alle neun Stationen, noch ohne Warteschlangen und Physik); Die Rückmeldung zum ersten Testclip ist eingearbeitet: im Querformat feste Übersicht ohne Kamerafahrt, weiche Marble-Works-Klänge mit fester, leiserer Mischung (rund −24,8 LUFS), Feuereffekte am Ofen, an der Farbstation ein Sprühstoß je Kugel in ihrer Farbe. Dritte Fassung: Kugeln und Glasrohre 35 % größer, Schilder über einen Schalter abschaltbar und standardmäßig aus. Vierte Fassung: Die Kugeln beginnen im Ofen zu glühen und kühlen im Fallrohr zur Farbstation wieder ab. Fünfte Fassung: Die Kühlstrecke 06 ist jetzt eine Trockenstrecke für die frische Farbe. Sechste Fassung: nasse Farbe deutlicher, kleine Deko-Animationen eingebaut (Ofen-Anzeigen, Lämpchen, Prüfbildschirm, Dampf, Sortierklappen, Zähler). Ein sechster 20-Sekunden-Testclip liegt vor. Offen: Rückmeldung dazu, mehr Kugeln gleichzeitig, eigene Klänge für Trommel, Ofen und Sprühen, Hochformat (auf Wunsch des Nutzers vorerst zurückgestellt), echte Warteschlangen und Physik (M2). Der Stand liegt seit dem 16.11. als Szenario „in Arbeit“ auf `main` (Auftrag des Nutzers), Bericht: `docs/MARBLE_XL_STUFE_1_2026-11-16.md`. Das lange Video wird ganz gerendert statt als wiederholte Schleife (Auftrag des Nutzers: 10 Minuten, 1440p, 60 Bilder pro Sekunde). Dafür läuft die Linie jetzt ohne Neubeginn: Chargen zu 48 Kugeln, die Röhren leeren sich, der Zähler zählt durch. |

---

## 1 · Kurzfassung

1. **Der Code ist in Ordnung, die Ablage nicht.** Der Kern ist sauber gebaut und getestet. Chaotisch wirken
   49 lokale Branches, 10 Arbeitskopien an drei Orten, 9,2 GB in `output/` und eine Roadmap mit 590 Zeilen,
   die in wichtigen Punkten veraltet ist.
2. **Es liegt Arbeit nur auf diesem PC.** 12 Wasserpark-Commits und drei gerade geänderte Wasserpark-Dateien
   sind nicht auf GitHub. Das ist das dringendste Risiko.
3. **Ziel: nur noch `main`.** Jede Änderung läuft über einen kurzen Branch und einen Pull Request und wird danach
   gelöscht. Unfertige Szenarien dürfen auf `main`, tragen dort aber das Kennzeichen „in Arbeit“.
4. **Reihenfolge:** erst sichern und aufräumen (Block 0), dann wenige Architektur-Bausteine (Block 1), dann einmal
   alle Szenarien am Handy ansehen (Block 2), dann die wichtigsten Verbesserungen je Szenario (Block 3) und die
   zwei großen Vorhaben Naval-Langvideo (Block 4) und Marble XL (Block 5).
5. **Immer nur ein großes Paket gleichzeitig**, jedes mit Vorschau-Bildern und einem Stopp bei dir.

---

## 2 · Ausgangslage vor dem Aufräumen (16.11.2026, 17:40 Uhr)

Dieser Abschnitt beschreibt den Stand, der zum Plan geführt hat. Den aktuellen Stand zeigt Abschnitt 0.

### 2.1 GitHub und `main`

| Punkt | Befund |
|---|---|
| `main` lokal und auf GitHub | identisch, Commit `09caa3d` (Merge von PR #12, 14.11.) |
| Szenarien auf `main` | 7: Naval, Kugelfabrik, Marble Works, Scrap Wars, Mycelium, Pyramid, Territory Wars |
| Letzter Prüflauf auf `main` | **grün** (Lauf 43642520946 vom 14.11., 11 min 43 s). Die Roadmap behauptet noch „rot“. |
| Offene Pull Requests | keine; 12 gemergte |
| Schutz von `main` | **keiner**: kein Branch-Schutz, keine Regeln, direkter Push und Force-Push möglich |
| Versionsmarken (Tags) | keine |
| Online-Vorschau | wird bei jedem Push auf `main` automatisch öffentlich aktualisiert |
| Repository | öffentlich |

### 2.2 Was nur lokal liegt

| Was | Wo | Risiko | Empfehlung |
|---|---|---|---|
| 3 geänderte Dateien, nicht committet (`art.js`, `layout.js`, `renderer.js`; zuletzt 17:34 Uhr) | Wasserpark, Hauptordner | **hoch** | Nicht anfassen. Der laufende Auftrag soll committen, dann pushen. |
| `codex/waterpark-mockup`: 12 Commits nicht auf GitHub | Hauptordner | **hoch** | Sofort nach dem Commit pushen (Schritt 0.2). |
| `codex/waterpark-optik` | lokal | keins | Ist vollständig in `waterpark-mockup` enthalten, braucht keinen eigenen Push. |
| `codex/abriss-burrow-plan`: 1 Commit, ein Plan-Dokument | Arbeitskopie unter `.claude/worktrees/` | mittel | Pushen und als reines Dokument mergen. |
| 6 weitere nur lokale Branches | lokal | keins | Alle bereits in `main` enthalten; können gelöscht werden. |
| Marble-Foundry-Prototyp (`index.html` und Bilder) | `output/marble-foundry-prototype/` | mittel | Einzige Kopie des Konzeptversuchs. Bleibt lokal (Entscheidung vom 16.11.). |
| Rezepte veröffentlichter Videos (`youtube_*.json`), Vorschaubilder | `output/` | mittel | Bleiben lokal (Entscheidung vom 16.11.). |
| Fertige Videos (MP4), Musik-Demo „Sidewalk Shuffle“ | `output/` | mittel | Gehören nicht in Git. Auf ein zweites Laufwerk oder in die Cloud sichern. |
| Prüfskripte (`readme-screenshots.mjs`, `scrap-render-review.mjs`, …) | `output/` | niedrig | Was wiederverwendet wird, nach `scripts/`; Rest löschen. |
| `pyramid-recovery-20261114` (6,4 GB, große WAV-Dateien) | `output/` | keins | Die freigegebene Wassermischung liegt bereits in `assets/audio/`. Prüfen, dann löschen. |
| 4 Deploy-Archive (`*.tar.gz`, zusammen 78 MB) | `output/` | keins | Aus Git wiederherstellbar; löschen. |
| Externe Quellen (Roadmap V1.2, Kanalstart-Plan, alte Territory-Fassungen) | `Downloads` | niedrig | Was noch gebraucht wird, nach `docs/reference/`. |

Alle anderen neun Arbeitskopien sind sauber (keine ungespeicherten Änderungen). Es gibt keinen Stash.

### 2.3 Wasserpark

- Der Optik-Plan hat neun Pakete (P1–P9). Für P1–P7 gibt es Commits. Offen sind **P8 Hochformat** und
  **P9 Abend, Nacht, Finale**, danach deine Schlussabnahme.
- Die drei ungespeicherten Dateien sind sehr wahrscheinlich P8 in Arbeit.
- Querformat am Tag ist inzwischen nah am Mockup. Im Hochformat-Short sind Rutschen rechts abgeschnitten und
  das untere Drittel ist leeres Wasser.
- Die Anzeige ist deutsch („FAHRTEN“, „EIN TAG IM WASSERPARK“). Die Projektregel lautet: Texte im Video englisch.
- Der Branch lässt sich konfliktfrei mit `main` zusammenführen. Mit `codex/scrap-optik` kollidiert er nur in
  `docs/CHANGELOG.md`.
- Er ändert auch `pyramid.js` (die Tiergrafik wurde in eine gemeinsame Datei ausgelagert). Dafür gibt es einen
  eigenen Vergleichstest; vor dem Merge muss trotzdem der komplette Prüflauf grün sein.
- Für den Wasserpark fehlt der Vorlagen-Exporttest, den alle anderen Szenarien haben.

### 2.4 Warum es chaotisch wirkt

- **49 lokale Branches**, davon sind 40 längst in `main` enthalten und nie gelöscht worden. Auf GitHub liegen 39.
- **10 Arbeitskopien** an drei Orten: Hauptordner, `.claude/worktrees/`, `output/`.
- Der **Hauptordner steht nicht auf `main`**, sondern auf einem Arbeitsbranch, und mehrere Assistenten arbeiten
  darin.
- **Drei Namensschemata** für Branches (`schritt-…`, `naval-…`, `codex/…`).
- Die **Roadmap** mischt offene Aufgaben mit viel Verlaufsgeschichte (Abschnitt 10).

---

## 3 · Zielbild: ein Main

### 3.1 Sieben Regeln

1. **`main` ist die einzige Wahrheit.** Immer lauffähig, Prüflauf grün.
2. **Jede Änderung:** kurzer Branch vom aktuellen `main`, Pull Request, Prüflauf grün, Merge, Branch wird
   automatisch gelöscht. Ein Branch lebt höchstens wenige Tage.
3. **Große Vorhaben in kleinen Paketen.** Jedes Paket ist ein eigener Pull Request. Unfertiges kommt trotzdem auf
   `main`, markiert als „in Arbeit“ (siehe 3.3).
4. **Ein Assistent, eine Arbeitskopie, ein Branch.** Arbeitskopien nur unter `.claude/worktrees/<name>`, nie zwei Assistenten im selben Ordner. Der Hauptordner bleibt auf `main`
   und dient nur zum Ansehen und Exportieren.
5. **Feierabend-Regel:** Am Ende jeder Sitzung ist alles committet und gepusht, notfalls als Entwurfs-PR.
6. **Nichts Wertvolles nur in `output/`.** Der Ordner darf jederzeit gelöscht werden können.
7. **Jedes veröffentlichte Video** bekommt eine Versionsmarke (`video/2026-11-20-pyramid-short`) und sein Rezept
   im Repository.

Zusammenführen weiterhin als **Merge-Commit** (wie bisher), nicht als Squash. Grund: Roadmap, Changelog und
Berichte verweisen auf einzelne Commit-Nummern; ein Squash würde diese Verweise ins Leere laufen lassen.

### 3.2 Einstellungen auf GitHub (jede einzeln von dir freizugeben)

- Schutz für `main`: nur über Pull Request, Prüflauf Pflicht, kein Force-Push, kein Löschen.
- „Branches nach dem Merge automatisch löschen“ einschalten.
- Eine **Sammelprüfung** `ci-ok` im Prüflauf ergänzen, die nur grün wird, wenn alle Gruppen grün sind. Sie ist
  dann die eine Pflichtprüfung.
- Bricht ein Lauf am Zeitlimit ab: neu starten, nie umgehen.

### 3.3 Kennzeichen „in Arbeit“

Die Szenario-Anmeldung bekommt ein Feld `status` (`stable` oder `beta`). Ein Beta-Szenario erscheint in der
Auswahl und in der README mit dem Zusatz „(in Arbeit)“. Es ist die Voraussetzung dafür, dass Wasserpark,
Naval-Langmodus und Marble XL paketweise auf `main` landen können, ohne als fertig zu gelten. Aufwand: klein.

### 3.4 Regeldatei für Assistenten

Im Repository gibt es keine `AGENTS.md`. Jeder Assistent muss die Regeln aus 590 Zeilen Roadmap herauslesen.
Vorschlag: eine `AGENTS.md` mit höchstens 80 Zeilen:

- die sieben Regeln aus 3.1
- Befehle für Tests und Referenz-Hashes
- kein Export über 20 Sekunden ohne ausdrücklichen Auftrag
- Regeln für Reproduzierbarkeit (nur Seed-Zufall, Darstellung ändert die Simulation nie)
- Texte im Video englisch, Bedienung deutsch
- Optik-Änderungen zuerst als gerenderte Vorschau-Bilder aus einer Kopie
- ein Paket, ein Commit; Roadmap und Changelog im selben Pull Request pflegen
- die Checkliste für neue Szenarien (aus dem Audit, aktualisiert)

---

## 4 · Block 0: Sichern und aufräumen

Jeder Schritt ist umkehrbar oder vorher gesichert. **Start erst, wenn der laufende Wasserpark-Auftrag committet
hat.**

| Nr. | Schritt | Warum sicher |
|---|---|---|
| 0.1 | **Warten**, bis die drei Wasserpark-Dateien committet sind. | Kein Eingriff in fremde Arbeit. |
| 0.2 | **Komplettsicherung** aller Branches in eine Datei außerhalb des Projekts, danach die lokalen Branches pushen (Befehle unten). | Ab hier existiert alles doppelt. |
| 0.3 | **`output/` bleibt lokal** (Entscheidung vom 16.11.): nichts davon kommt ins Repository, nichts wird gelöscht. | Keine Änderung an den Dateien. |
| 0.4 | **`codex/scrap-optik` mergen** (PR, Prüflauf grün, kurzer Blick auf die Vorher/Nachher-Bilder). | Fertig, getestet, konfliktfrei. Scrapyard-Kämpfe verlaufen bewusst anders; Sunny Yard bleibt gleich. |
| 0.5 | **Kleiner Code-PR:** Kennzeichen „in Arbeit“ (3.3), Sammelprüfung `ci-ok`, Vorlagen-Exporttest für den Wasserpark vorbereiten. | Klein, vom Prüflauf abgedeckt. |
| 0.6 | **Doku-PR:** dieser Plan nach `docs/`, `AGENTS.md`, Roadmap und README berichtigt (Abschnitt 10), Abriss/Burrow-Plan, Sunny-Yard-Diagnosebericht. | Nur Dokumente. |
| 0.7 | **Wasserpark mergen**, sobald P9 fertig, die Anzeige englisch und der Prüflauf grün ist. | Neues Szenario, andere bleiben unberührt; Pyramid durch Tests abgedeckt. |
| 0.8 | **Archivmarken** für die drei Diagnose-Branches setzen, dann alle erledigten Branches lokal und auf GitHub löschen. **Stopp: Liste vorher von dir bestätigen.** | `git branch -d` weigert sich bei nicht gemergten Branches; Diagnose bleibt über die Marke abrufbar. |
| 0.9 | **Arbeitskopien entfernen** (alle neun sind sauber), Hauptordner auf `main` stellen. Neue Arbeitskopien künftig an einem Ort: `.claude/worktrees/<name>`. | `git worktree remove` weigert sich bei ungespeicherten Änderungen. |
| 0.10 | Entfällt: `output/` wird nicht geleert (Entscheidung vom 16.11.). | – |
| 0.11 | **GitHub-Einstellungen** aus 3.2 setzen, erste Versionsmarke `v0.8.0`. | Jede Einstellung einzeln freigegeben. |

**Ergebnis-Kontrolle:** `git branch -a` zeigt nur `main` und laufende Arbeit. `git worktree list` zeigt nur den
Hauptordner und laufende Arbeit. Prüflauf auf `main` grün. Online-Vorschau zeigt acht Szenarien, der Wasserpark
mit „(in Arbeit)“.

Befehle für 0.2 (erst ausführen, wenn 0.1 erfüllt ist):

```bash
git bundle create "../EBS-Sicherung-2026-11-16.bundle" --all
```

```bash
git bundle verify "../EBS-Sicherung-2026-11-16.bundle"
```

```bash
git push -u origin codex/waterpark-mockup
```

```bash
git push -u origin codex/abriss-burrow-plan
```

Archivmarken für 0.8 (Beispiel):

```bash
git tag archive/sunny-replay-cause codex/sunny-replay-cause
```

Betroffen sind `codex/ci-minimal-checks`, `codex/scrap-replay-diagnostics` und `codex/sunny-replay-cause`. Sie
werden nicht gemergt: Es sind Fehlersuch-Stände vom 13.11. mit Diagnose-Eingriffen im Exporter, Ergebnis „nicht
eindeutig“.

---

## 5 · Block 1: Architektur absichern

**Was gut ist und bleibt:** szenario-neutraler Kern, Szenario-Anmeldung, fester 60-Hz-Takt, Seed-Zufall,
Einstellungsschema, Exportweg mit Wiederholungsrezept, Prüflauf in 18 Gruppen, Referenz-Hashes. Kein Umbau der
Engine, kein Framework.

**Grundsatz:** Neue Bausteine entstehen als neue Dateien, wenn das erste Szenario sie braucht. Bestehende
Szenarien werden nur umgestellt, wenn man sie ohnehin anfasst. Kein Umbau auf einen Schlag.

| Nr. | Paket | Inhalt | Wann |
|---|---|---|---|
| A1 | **Szenario-Vertrag aufschreiben** | `docs/ARCHITEKTUR.md`: alle Pflicht- und Zusatzfunktionen eines Szenarios an einer Stelle. Heute sind rund zwölf Zusatzfunktionen über den Code verteilt (`reframe`, `supportsClips`, `hasNaturalDuration`, `createExportPlan`, `createAudioMixPlan`, `tempoRange`, …). | Block 0.6 |
| A2 | **Vertragstest für jedes Szenario** | Ein Test, der automatisch jedes angemeldete Szenario prüft: starten, 600 Schritte, gleicher Seed ergibt gleichen Zustand, Zeichnen ändert den Zustand nicht, Aufräumen, 2 Sekunden Export. | nach Block 0 |
| A3 | **Ordner statt Riesendatei** | Regel für Neues: `src/scenarios/<id>/{simulation,renderer,layout,art,story}.js` (Vorbild Wasserpark). `naval.js` (1 593 Zeilen), `marble.js` (1 356) und `pyramid.js` (1 927) werden erst geteilt, wenn dort gebaut wird. Beweis der Gleichheit: Referenz-Hashes und Referenzbilder unverändert. | mit N0 und M0 |
| A4 | **Gemeinsamer Fahrplan** `src/shared/timeline.js` | Kapitel und Ereignisse aus Seed und Videolänge, mit Mindestabstand und „mindestens eins je Viertel“. Heute viermal einzeln gebaut (Naval-Himmel, Pyramid-Tageslauf, Wasserpark-Story, Marble-Works-Meilensteine). | mit N3 |
| A5 | **Gemeinsame 2D-Kamera** `src/shared/camera2d.js` | Übersicht, Verfolgung, Nahaufnahme; weiche Übergänge; rein aus der Simulationszeit berechnet; Anzeige bleibt fest. Dazu Lautstärke und Stereo nach Bildausschnitt (Muster aus Marble Works). | mit M2 |
| A6 | **Gekachelter Hintergrund** `src/shared/tiled-layer.js` | Welten größer als der Bildschirm: Hintergrund in Kacheln bis 2 048 Pixel, nur sichtbare Kacheln zeichnen. | mit M2 |
| A7 | **Langexport in Abschnitten** | 20 bis 30 Minuten in 5-Minuten-Abschnitten exportieren und zusammenfügen, damit ein Abbruch nicht alles kostet. Nutzt den vorhandenen Ausschnittsexport. | vor dem ersten 30-Minuten-Export |

**Hinweis vom 16.11.2026:** Im Querformat wünscht der Nutzer keine Kamerafahrt (bei Scrap Wars und bei Marble XL so entschieden); dort gilt die feste Übersicht. Kamerafahrten kommen nur noch für das Hochformat in Frage.

**Startwerte für die Kamera** (wo eine Fahrt gewünscht ist, am Stil-Checkpoint anzupassen): Schwenk höchstens 150 Einheiten
pro Sekunde, Zoomwechsel mindestens 2 Sekunden, jede Einstellung mindestens 8 Sekunden, Verfolgung höchstens
20 Sekunden, kein harter Schnitt außer beim Kapitelwechsel. Der Modus „nur Übersicht“ ist immer wählbar. Bei
Scrap hast du Schwenks als störend abgelehnt; deshalb langsam und abschaltbar.

**Seek-Regel** (aus dem Scrap-Optik-Plan, künftig für alle): Das Bild zum Zeitpunkt t muss nach einem Sprung
dorthin genauso aussehen wie nach durchgehender Wiedergabe. Nur dann sind Ausschnitte und Abschnittsexport
möglich.

**Renderzeit zur Einordnung:** Der 20-Minuten-Export der Pyramide (1080p60) lief mit rund 21 Bildern pro Sekunde,
also etwa eine Stunde. 30 Minuten wären rund 90 Minuten, mit 30 fps die Hälfte.

---

## 6 · Block 2: Abnahme-Mappe und Kanal

Fast alle offenen Roadmap-Punkte (R18, R20, R17, R25, R30) sind dieselbe Aufgabe: Du hast die laufende Fassung
noch nicht am Handy gesehen und gehört. Meine Bewertung der Szenarien beruht bisher nur auf Standbildern.

**Vorschlag:** einmalig eine Mappe mit **16 Clips zu je 20 Sekunden** (8 Szenarien, hochkant und quer, mit Ton)
vom aufgeräumten `main`. Zusammen gut 5 Minuten Material. Du bewertest jeden Clip mit Daumen hoch oder runter
und einem Satz. Das schließt fünf Roadmap-Punkte auf einmal und legt die Reihenfolge in Block 3 mit echten
Eindrücken fest. Die 20-Sekunden-Grenze der Roadmap bleibt eingehalten.

**Kanalpilot (R04) nicht weiter verschieben.** Pyramid, Naval und Scrap Wars mit Sunny Yard sind produktionsreif.
Ein Short und ein Langvideo pro Woche können parallel zu allen Blöcken laufen.

---

## 7 · Block 3: Die wichtigsten Verbesserungen je Szenario

Vorschlag, nach der Abnahme-Mappe zu bestätigen. Je Szenario höchstens drei Punkte, in dieser Reihenfolge.

| Szenario | 1 | 2 | 3 |
|---|---|---|---|
| **Pyramid** | Seltene Ereignisse (goldene Figur, Delfin, Regen mit Regenbogen, Glühwürmchen), mindestens eins je Videoviertel | Ausschnittsexport freischalten (Abweichung in der Dämmerung beheben), damit das Finale als Short geht | Rennen der Tierchen (später) |
| **Naval** | Siehe Block 4 | | |
| **Scrap Wars** | Optik-Branch mergen (0.4) | Ton und Lesbarkeit am Handy abnehmen | Highlight-Vorschlag: aus dem Ereignisprotokoll die spannendsten 30–45 Sekunden eines Turniers als Short vorschlagen |
| **Marble Works** | Nahaufnahme-Vorlagen für Shorts (Polieren, Farbinfusion, Sortieren) | Auftrag mit 360 Kugeln per Simulationsvorlauf messen: ergibt das ein Video um 20 Minuten? | Kugeln in der Übersicht größer und kontrastreicher |
| **Kugelfabrik** (klassisch) | Bleibt unverändert als Short-Maschine | Kleinigkeiten aus R09 nur nach Sichtbefund | Der Ausbau erfolgt als Marble XL (Block 5) |
| **Territory Wars** | **Erledigt bis auf die Abnahme (R37):** eigener Short-Modus statt nur schnellerer Vorlage, weil Tempo 1,5 für eine ganze Runde nicht reicht ([Bericht](TERRITORY_SHORT_2026-11-16.md)) | **Erledigt im Short:** schlanke Anzeige mit großen Namensschildern | Sieger-Abschluss im Short erledigt; Ausschnittsexport offen |
| **Mycelium** | Short mit vorgewachsenem, hellerem Start | Renderzeit senken | Als ruhiges Langvideo positionieren |
| **Wasserpark** | P8 Hochformat | P9 Abend, Nacht, Finale; Anzeige englisch | Vorlagen-Exporttest, danach deine Schlussabnahme |

---

## 8 · Block 4: Naval-Langvideo (20 bis 30 Minuten)

### 8.1 Ausgangslage

Zwei bis vier Schiffe schießen endlos. Der Schaden pendelt sich bei etwa 70 % ein, weil die Crew repariert und
eine Obergrenze das Sinken verhindert. Der Himmel wandert von Nacht zu Morgengrauen; dazu Sternschnuppen, Wal
und goldene Kugel. Die Kamera atmet nur leicht. Nach etwa einer Minute hat man alles gesehen. Niemand gewinnt.

### 8.2 Idee: „Who survives the night?“

Drei Ebenen laufen gleichzeitig, alle an die Videolänge gekoppelt (wie heute der Himmel):

1. **Runden mit Ausgang.** Ein Schiff sinkt wirklich, das Team bekommt einen Punkt, ein neues Schiff läuft ein.
   Ziel: alle 3 bis 4 Minuten eine Entscheidung.
2. **Wetter und Tageszeit.** Abenddämmerung, klare Mondnacht, Nebel mit Laternen, Sturm mit Regen und
   Wetterleuchten, ruhige Sternennacht, Morgengrauen. Wechsel alle 4 bis 6 Minuten.
3. **Steigerung.** Kanonen 2, dann 3, dann 4; ein drittes und viertes Schiff stoßen dazu; Finale bei
   Sonnenaufgang mit Sieger, Flaggen und Feuerwerk.

Dazu **kleine Gäste** (vorhanden: Sternschnuppen, Wal; neu: Möwen, Delfine, Leuchtturm, Geisterschiff am
Horizont, als seltenes großes Ereignis ein Krake) und eine **breitere See mit Kamera**: einer Kugel im Flug
folgen, Nahaufnahme beim Treffer, Tauchfahrt zum Recycling am Meeresgrund.

Messbares Ziel: **spätestens alle 90 Sekunden passiert etwas sichtbar Neues.** Der Fahrplan wird im reinen
Simulationsvorlauf geprüft, ohne Videoexport.

### 8.3 Pakete

Der Standardmodus bleibt Bit für Bit gleich. Die Referenz-Hashes der Seeschlacht sind das Sicherheitsnetz.
Alles Neue hängt an einem Schalter `mode` (`endless` bleibt Standard).

| Nr. | Paket | Inhalt | Abnahme |
|---|---|---|---|
| N0 | **Absichern** | Prüflücke R21 schließen (Besitz und Reihenfolge der Kugeln im Hash). `naval.js` in einen Ordner teilen. | Referenz-Hashes und Referenzbilder unverändert. |
| N1 | **Vorschau** | Aus einer Kopie: je ein Standbild für Nebel, Sturm, Versenkung, Finale, breite See; hoch und quer. | **Stopp: deine Freigabe des Aussehens.** |
| N2 | **Runden mit Versenken** | Modus `rounds`: Reparatur aus, Schaden linear, Sinken, Punktestand, neues Schiff läuft ein. Short-Vorlage „Who sinks first?“ (30–45 s). | Rundenlänge über 20 Seeds gemessen, Ziel 3–4 Minuten. Kugelbilanz stimmt. Sofort für Shorts nutzbar. |
| N3 | **Wetter-Kapitel** | Gemeinsamer Fahrplan (A4). Zuerst reine Darstellung: Nebel, Regen, Wetterleuchten, Farben. Neue Klänge (Regen, Donner, Wind) mit eigenen Reglern. | Hashes im Rundenmodus unverändert. Fahrplan-Test je Videolänge 20, 25, 30 Minuten. |
| N4 | **Steigerung** | Kanonenstufen je Kapitel, drittes und viertes Schiff laufen ein. Ändert die Physik. | Bilanz und Invarianten erweitert, neue Referenzen begründet. |
| N5 | **Breite See und Kamera** | Welt zwei bis drei Bildschirme breit, gemeinsame Kamera (A5), Ton nach Bildausschnitt, Ausschnittsexport freischalten. | Seek-Regel erfüllt. Ausschnitt gleich dem durchgehenden Lauf. |
| N6 | **Vorlagen 20, 25, 30 Minuten** | Vorlauf-Prüfung des ganzen Films, je Kapitel ein 20-Sekunden-Ausschnitt zum Ansehen. | **Stopp: Langexport erst auf deinen Auftrag.** |

Die offenen Punkte R01 (Schiffsoptik) und R05 (Zuschauerführung) gehen in N1 und N5 auf.

### 8.4 Stand und Präzisierung (16.11.2026)

Der Nutzer hat den Naval-Ausbau vorgezogen und die Richtung anhand gerenderter Standbilder und Testclips festgelegt.
Dieser Abschnitt präzisiert 8.2 und 8.3; er ersetzt sie nicht.

**Entschieden:**

- Die Segel bleiben. Offene Kanonenboote wie beim Vergleichskanal sind verworfen.
- Segelschäden wachsen sichtbar in vier Stufen; Löcher sitzen auf der echten Flugbahn, Stoff wird durchschlagen.
- Wenige, gut verfolgbare Kugeln: zwei Kanonen je Schiff, mehr Rückprall, Masten weiter durchlässig.
- Das Tempo ist deutlich langsamer: halbe Feuerrate, halbes Flugtempo.
- Die Schiffe sind 25 % kleiner.
- Das alles ist als eigener Modus `calm` („Ruhiges Duell“) eingebaut, nicht als Änderung des Standardmodus.

**Neues Paket, erledigt:**

| Nr. | Paket | Inhalt | Stand |
|---|---|---|---|
| N1a | **Ruhiges Duell** | Modus `calm` mit den Werten oben, Segel-Baustein `src/scenarios/naval/sails.js`, eigener Test. Messwerte und Grenzen im [Bericht](NAVAL_RUHIGES_DUELL_2026-11-16.md). | **Erledigt** (PR #22) |
| N2a | **Runden** | Im Modus `calm`: fester Schaden von 2 % je Treffer, Versenkung bei 100 %, Punkt für den Schützen, Feuerpause mit Reparatur des Siegers, neues Schiff läuft ein. Punktestand, Meldung und Trefferanzeige am Balken. Segel folgen dem Schiffsschaden. Rundenlänge über zehn Seeds: 182 bis 254 s, Median 218 s. | **Erledigt** (PR #23) |

| N2b | **Rakete vom Heck** | Seltene zweite Attacke: etwa alle 20 Sekunden je Schiff, sichtbar vorbereitet, zerplatzt über dem Gegner in sieben kurzlebige Splitter (je 0,5 %). Nicht Teil des Kugelkreislaufs. Runden damit im Median 182 s. | **Erledigt**, vom Nutzer freigegeben (PR #25) |

| N2c | **Goldene Kugel** | Goldtreffer zählt doppelt und bekommt einen eigenen Auftritt (Blitz, Ring, Funkenregen, „GOLDEN HIT!“); Glitzerspur im Flug, Goldfunken im Segel, goldener Platscher. Runden damit im Median 172 s. | **Erledigt**, vom Nutzer freigegeben (PR #26) |

| N2d | **Lesbarkeit** | Kanonen 30 % größer, Leuchtspur trotz halbem Flugtempo in voller Länge. Runden damit im Median 168 s. | **Erledigt**, vom Nutzer freigegeben (PR #28) |

| N2e | **Ton** | Feste Mischung mit leisem Meeresrauschen statt Einmessung auf −14 LUFS; Klänge für Segeldurchschuss und Versenkung; 100 % ist wieder Standard. Episode bei −20,6 LUFS, Begrenzer höchstens −6,7 dB. | **Vorschau**, wartet auf das Hörurteil (Branch `naval/ton`) |

Die Runden sind Teil des ruhigen Duells geworden; ein eigener Modus `rounds` wie in 8.3 geplant entfällt damit. Die
Short-Vorlage „Who sinks first?“ aus N2 steht noch aus.

**Freigegeben am 16.11. („Vorschläge so umsetzen“), noch offen:** Ton für wenige Schüsse, Lesbarkeit (Bugkante,
Leuchtspur, Kanonen; vorher als Vorschau). **Ideen des Nutzers:** Die seltene zweite Attacke vom
Heck ist als N2b umgesetzt. Die goldene Kugel mit eigenem Auftritt ist als N2c umgesetzt.

**Noch nicht entschieden (Empfehlung des Assistenten):**

| Punkt | Empfehlung |
|---|---|
| Länge des ersten Films | Etwa 10 Minuten statt 20 bis 30; die längeren Fassungen erst, wenn die Runden tragen. |
| N5 (breite See mit Kamerafahrt) | Für den ersten Film streichen: Im Querformat gilt die feste Übersicht. |
| Abpraller | Die erhöhte Bugkante wurde am 17.11. gemessen und verworfen: 0,97 statt 0,56 Abpraller je Treffer, aber 55 statt 1 Notfall in 50 Minuten, weil sich Kugeln an Deck verklemmen. Wer mehr Abpraller will, braucht eine andere Lösung für liegengebliebene Kugeln. |

---

## 9 · Block 5: Marble XL

### 9.1 Grundentscheidung

Die klassische Kugelfabrik bleibt, wie sie ist. Ihr Layout ist fest auf einen Bildschirm gebaut, und
Referenz-Hashes sowie Short-Vorlage hängen daran. Daneben entsteht ein **neues Szenario** (Arbeitstitel
„Marble XL“), das ihre Bausteine wiederverwendet. Marble Works ist denselben Weg gegangen.

Warum das trägt: Echte Physik läuft in der klassischen Fabrik nur im Behälter. Alles andere sind geführte Bahnen
mit Stau-Logik. Das bleibt mit einigen hundert Kugeln schnell und wiederholbar.

### 9.2 Richtung nach der ersten Vorschau (16.11.2026)

Der erste Prototyp stellte vier Linien der klassischen Fabrik in eine große Halle. Der Nutzer hat ihn als zu
gleichförmig abgelehnt („immer alles dasselbe“, „mehr Maschinen“) und Marble Works als Ideengeber genannt,
ausdrücklich ohne dessen Grafik.

**Neue Richtung:** Marble XL ist eine **Produktionslinie mit verschiedenen Maschinen** im Stil der klassischen
Fabrik. Die Kugel macht eine Reise und verändert sich sichtbar: roh und matt, gewaschen, klar poliert, glühend,
gefärbt, abgekühlt, geprüft, sortiert. Die Fabrik entwickelt sich in Kapiteln; ein Auftragszähler zeigt den
Fortschritt. Die klassische Sortierung ist nur noch die letzte Station.

Stationen des Entwurfs: 01 RAW (Vorrat, Aufzug, Behälter), 02 WASH (Waschtrommel), 03 POLISH (Bürstenräder),
04 KILN (Tunnelofen), 05 COLOUR (sechs Pigmenttanks), 06 COOL (Kühlstrecke mit Lüftern), 07 INSPECT (Prüfung mit
Ausschuss), 08 LIFT (Radaufzug), 09 SORT (sechs hohe Röhren, die sich füllen).

Aus dem ersten Prototyp bleiben die Kamera rein aus der Videozeit, die ausblendende Anzeige und die Tests.

### 9.3 Pakete

| Nr. | Paket | Inhalt | Abnahme |
|---|---|---|---|
| M0 | **Baukasten bereitstellen** | Zeichen- und Bahnhelfer der klassischen Fabrik als `EBS.MarbleClassic.kit`. | Erledigt am 16.11.: Referenz-Hashes unverändert. |
| M1 | **Entwurfsbild der Produktionslinie** | Gezeichnete Halle mit allen neun Stationen, Kugeln von Hand gesetzt; Übersicht und vier Nahansichten. | Erledigt am 16.11., Richtung bestätigt; zweite Fassung mit den besprochenen Verbesserungen am selben Tag. Zweite Fassung vom Nutzer bestätigt. Für das Hochformat liegt als Vorschlag eine Kamerafahrt durch dieselbe Halle vor. |
| M2 | **Grundlinie mit Simulation** | Vorrat, Aufzug, Behälter, Polierer und Sortierröhren laufen wirklich; Kugelzustände, Auftragszähler, Kamera. | **Läuft.** Vorstufe erledigt am 16.11.: bewegter Entwurf nach festem Zeitplan mit Zähler, fester Übersicht im Querformat, weichem Ton und Effekten an Ofen und Farbstation; zweiter 20-Sekunden-Testclip. **Stopp: Rückmeldung zum zweiten Clip.** Offen: Warteschlangen, Physik, eigene Klänge je Station. |
| M3 | **Weitere Stationen** | Je Station ein eigener PR mit Simulation, Grafik, Klang, Test: Waschtrommel, Tunnelofen, Farbstation, Kühlstrecke, Prüfung mit Ausschuss, Radaufzug. | Je Station: Ein- und Ausgang halten die Kugelbilanz. |
| M4 | **Kapitel und Ausbauten** | Stationen gehen nacheinander in Betrieb, später eine zweite Linie; Finale, wenn der Auftrag voll ist. | Fahrplan-Test: alle 2 bis 3 Minuten ein sichtbarer Ausbau. |
| M5 | **Hochformat und Shorts** | Eigene Anordnung für 9:16, Ausschnittsexport. | 20-Sekunden-Proben. |
| M6 | **Vorlagen 20 Minuten** | Vorlauf-Prüfung des ganzen Films. | **Stopp: Langexport erst auf deinen Auftrag.** |
| M7 | **Themen** (später) | Andere Hallen und Farbwelten als Vorlagen. | Je Thema eine Vorschau. |

**Startwerte** (am Checkpoint nach M2 anzupassen): Halle quer 3 840 × 2 160 Einheiten (zwei mal zwei Bildschirme)
mit Zwischendeck; Auftrag im Entwurf 96 Kugeln, endgültig nach Laufzeitmessung; neun Stationen; Zoom 0,5 bis 1,3.

Der Merkposten R24 (Melodie aus Ereignissen) passt zu den Sortierröhren: jede Farbe ein eigener Ton.

---

## 10 · Roadmap-Prüfung

### 10.1 Was nicht mehr stimmt

| Stelle | Steht dort | Tatsächlich |
|---|---|---|
| Kopfzeile | „Stand 13.11.: fünf Szenarien“ | Sieben auf `main`, acht mit Wasserpark. |
| Kopf, R28 | Prüflauf auf `main` rot (174/179) | Letzter Lauf auf `main` am 14.11. grün. |
| R02 | Sunny-Yard-Replay offen | Seit dem 13.11. nicht wieder aufgetreten; drei Diagnosen ohne Ergebnis. |
| Tabelle in Abschnitt 1 | Vier Szenarien, Hex „nur Prototyp“ | Widerspricht R17 weiter unten (integriert). Mycelium, Pyramid, Marble Works fehlen. |
| Marble Works | Kommt in der Roadmap auf `main` nicht vor | Über PR #11 und #12 integriert, Klang am 14.11. von dir freigegeben. |
| R03, E1 | „Variante noch nicht entschieden, Foundry-Versuch isoliert“ | Mit Marble Works faktisch entschieden. |
| R25, R23 | „Branch `endless-mycelium`“, „Branch `endless-pyramid`“ | Beide gemergt. |
| Abschnitt 7 | „Die nächsten drei Schritte“ vom 13.11. | Überholt. |
| README | „Bei Marble Works ist die Klanggestaltung noch offen“ | Am 14.11. freigegeben (PR #12). |
| R30 und Scrap-Optik | Stehen nur auf den jeweiligen Branches | Kommen mit den Merges 0.4 und 0.7 nach `main`. |

### 10.2 Was mit den offenen Punkten geschehen sollte

| Punkt | Empfehlung |
|---|---|
| R04 Kanalpilot | **Behalten, höchste Priorität.** |
| R18, R20, R17, R25, R30 (Abnahmen) | Zu einer Aufgabe bündeln: Abnahme-Mappe (Block 2). |
| R21 Naval-Prüflücke | Behalten, wird N0. |
| R23 Pyramid P4–P6 | Behalten (Block 3). |
| R27 Pyramid-Tonspitzen | Behalten als Beobachtung; Standardfall ist behoben. |
| R10 hörbare Vorschau | Behalten, mittlere Priorität: erleichtert dir jede Abnahme. |
| R01, R05 Naval-Optik und Zuschauerführung | Gehen in Block 4 auf. |
| R03, E1 Kugelfabrik-Entwicklung | Schließen, ersetzt durch Marble XL. |
| R02, R28 Prüflauf | Schließen mit Vermerk; bei erneutem Auftreten neu öffnen. |
| R14 Grafik-Playbook | Geht in `AGENTS.md` und `ARCHITEKTUR.md` auf. |
| R15 30 gegen 60 fps | Ein Vergleichspaar in die Abnahme-Mappe. |
| R07, R09, R11, R13 | Behalten, nachrangig; R13 im Vorbeigehen erledigen. |
| R12 Quadrat 1:1 | Streichen, für YouTube ohne Nutzen. |
| R16, R24, R29, Abriss/Burrow | Als Ideenliste parken. |

### 10.3 Neue Form

Die Roadmap soll wieder das sein, was ihr eigener Kopf verspricht: die eine aktive Liste. Vorschlag: höchstens
rund 120 Zeilen mit drei Teilen: Stand in zehn Zeilen, Tabelle „Jetzt / Danach / Später“, offene Entscheidungen.
Der heutige Text wandert unverändert nach `docs/archiv/ROADMAP_2026-11-16.md`.

Neue Einträge (nächste freie Nummer nach dem Wasserpark-Merge ist R31):

| Nr. | Titel | Block |
|---|---|---|
| R31 | Ein Main: sichern, aufräumen, Schutz einschalten | 0 |
| R32 | Architektur absichern (A1–A7) | 1 |
| R33 | Abnahme-Mappe: alle Szenarien am Handy | 2 |
| R34 | Naval-Langvideo „Who survives the night?“ (N0–N6) | 4 |
| R35 | Marble XL (M0–M7) | 5 |

---

## 11 · Reihenfolge und Stopps

1. **Block 0, Teil A (sofort möglich, berührt den Wasserpark nicht):** Sicherung, Scrap-Optik mergen,
   Doku-Paket mit ausschließlich neuen Dateien (dieser Plan, `AGENTS.md`, Abriss/Burrow-Plan, Foundry-Prototyp,
   Upload-Rezepte), erledigte Branches und Arbeitskopien entfernen. Stopp: Branch-Liste vor dem Löschen.
2. **Marble XL** M0 und M1 (Stopp: Vorschau-Bilder). Läuft in eigener Arbeitskopie parallel zum Wasserpark.
3. **Block 0, Teil B (erst wenn der Wasserpark gemergt ist):** Wasserpark mergen und Anzeige englisch,
   Roadmap und README berichtigen, Sammelprüfung, Hauptordner auf `main`, `output/` leeren, Versionsmarke.
   Diese Schritte ändern Dateien, die der Wasserpark-Branch auch ändert; vorher gäbe es Konflikte.
4. **Marble XL** M2 (Stopp: Gefallen dir Kamera und große Fläche?).
5. **Block 2** Abnahme-Mappe (R33), parallel Kanalpilot mit Pyramid und Scrap.
6. **Block 3** kleine Punkte nach deiner Bewertung, jeweils ein PR.
7. **Naval** N0, N1 (Stopp), N2, danach N3 bis N6. Nutzt Kamera und Kacheln aus M2.
8. **Marble XL** M3 bis M6.

Vor jedem größeren Paket entsteht ein eigener Umsetzungsplan unter `docs/` mit Stilvorgaben, Startwerten und
Checkpoint, wie bei Scrap-Optik und Wasserpark.

---

## 12 · Entscheidungen (Stand 16.11.2026, 18:10 Uhr)

| Frage | Entscheidung |
|---|---|
| Wasserpark | **Bleibt beiseite, bis P9 fertig ist.** Danach normal mergen (Schritt 0.7), ohne Kennzeichen. P8 wurde um 17:58 Uhr committet (`8182eee`), P9 ist in Arbeit. |
| Abriss/Burrow-Plan | **Als Dokument nach `main` übernehmen.** |
| Nach dem Aufräumen zuerst | **Marble XL Stufe 1** (M0, M1, M2), Naval danach. |
| Sprache | **Alle Texte in Videos und Shorts immer englisch**, auch im Wasserpark. Die Bedienoberfläche bleibt deutsch. |
| Branch-Schutz | **Offen.** Empfehlung: nur die leichte Variante (kein Force-Push, kein Löschen von `main`), ohne Pflicht zu Pull Request und Prüflauf. |
| `output/` (Videos, Bilder, Musik) | **Bleibt lokal.** Nichts davon kommt auf GitHub, nichts wird gelöscht. |
| Umsetzung | **Freie Hand** für die Umsetzung dieses Plans (16.11.2026, nach dem Wasserpark-Merge). |

Das Kennzeichen „in Arbeit“ (3.3) wird für den Wasserpark nicht mehr gebraucht. Es bleibt für Marble XL und den
Naval-Langmodus vorgesehen und entsteht mit dem ersten Marble-XL-Paket, das auf `main` landet.
