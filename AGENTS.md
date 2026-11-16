# Arbeitsregeln für Assistenten

Gilt für jeden Assistenten (Codex, Claude Code und andere) und für jede Sitzung. Kurz halten; Begründungen stehen im
[Gesamtplan](docs/GESAMTPLAN_2026-11-16.md), der Aufbau in [docs/ARCHITEKTUR.md](docs/ARCHITEKTUR.md), offene Aufgaben
nur in der [ROADMAP](docs/ROADMAP.md).

## Zweck

Der Simulator erzeugt reproduzierbare Simulationsvideos für den YouTube-Kanal SimCascade: Shorts in 9:16, längere
Videos in 16:9, als MP4 mit Ton.

## Git: ein Main

1. `main` ist die einzige Wahrheit und bleibt lauffähig.
2. Jede Änderung: kurzer Branch vom aktuellen `main`, Pull Request, zusammenführen als **Merge-Commit** (kein Squash,
   weil Berichte auf einzelne Commits verweisen), Branch danach löschen.
3. Große Vorhaben in kleinen Paketen, **ein Paket = ein Commit**. Unfertiges darf auf `main`, wenn es in der
   Oberfläche als „in Arbeit“ erkennbar ist.
4. **Ein Assistent, eine Arbeitskopie, ein Branch.** Arbeitskopien nur unter `.claude/worktrees/<name>`. Der
   Hauptordner bleibt auf `main` und dient zum Ansehen und Exportieren. Nie in einer Arbeitskopie arbeiten, in der
   fremde ungespeicherte Änderungen liegen.
5. Am Ende jeder Sitzung ist alles committet und gepusht. Wenn etwas nur lokal liegt, sag es ausdrücklich.
6. Merge nach `main`, Push auf `main` und das Löschen von Branches sind eigene Freigaben des Nutzers.
7. Roadmap und Changelog im selben Pull Request pflegen wie die Änderung.

## Dateien

- `output/` wird von Git ignoriert und bleibt lokal. Videos, Bilder und Musik von dort nie ins Repository laden.
- Neue Sounddateien nach `assets/audio/` mit Lizenznachweis in `assets/audio/README.md`.
- Größere Schritte bekommen einen datierten Bericht unter `docs/` (Umfang, Messwerte, Grenzen, Nachweise).

## Reproduzierbarkeit

- Nur Seed-Zufall (`EBS.RNG`); kein `Math.random`, kein `Date.now` in Simulation oder Darstellung.
- Die Darstellung liest die Simulation nur und verändert sie nie. Kosmetischer Zufall läuft über einen eigenen Strom.
- **Seek-Regel:** Das Bild zum Zeitpunkt t sieht nach einem Sprung dorthin genauso aus wie nach durchgehender
  Wiedergabe. Kein Zustand im Renderer, der von der Anzahl gezeichneter Bilder abhängt.
- Referenz-Hashes nie blind neu schreiben. Eine gewollte Verhaltensänderung bekommt einen eigenen Modus oder eine
  Regelversion und wird im Pull Request begründet.

## Prüfen

- Tests aufs Nötige beschränken: bei reiner Darstellung ein Bildvergleich, bei Änderungen an der Simulation die
  betroffene Testdatei und einmal die Referenz-Hashes. Kein vollständiger `npm test` ohne ausdrücklichen Wunsch.
- Im Bericht klar sagen, was gelaufen ist und was nicht.
- **Kein Export über 20 Sekunden ohne ausdrücklichen Auftrag.** Reine Simulationsvorläufe sind erlaubt.

```bash
node --test test/<datei>.test.mjs
```

```bash
npm run golden
```

```bash
node export.mjs --scenario <id> --duration 20 --aspect 9:16 --out output/probe.mp4
```

## Gestaltung

- **Alle Texte im Video englisch.** Die Bedienoberfläche und die Dokumentation bleiben deutsch.
- Optik-Änderungen zuerst als gerenderte Vorschau-Bilder aus einer Kopie zeigen, dann umsetzen.
- Hoch- und Querformat sind gleichwertig und bekommen je ein eigenes Layout.
- Kamerafahrten langsam und abschaltbar; die Anzeige (HUD) bleibt fest.
- Erklärungen an den Nutzer kurz und in einfachen Worten.

## Neues Szenario oder neuer Baustein

Checkliste und Schnittstelle: [docs/ARCHITEKTUR.md](docs/ARCHITEKTUR.md). Neue Szenarien liegen in einem eigenen Ordner
`src/scenarios/<id>/`. Bestehende Szenarien werden nur umgebaut, wenn man sie ohnehin anfasst.
