# Scrap Wars: offene Punkte – Stand 21.11.2026 (R40)

Angelegt als Übergabe nach dem Stopp am 20.11.2026, seit dem 21.11. je Paket nachgezogen: was fertig ist, was offen ist und wo es weitergeht. Die aktive
Aufgabenliste bleibt die [ROADMAP](ROADMAP.md); hier stehen die Einzelheiten. Bezug: [Ausbau-Plan](SCRAP_AUSBAU_PLAN_2026-11-19.md),
[Ausbau-Bericht](SCRAP_AUSBAU_2026-11-19.md).

## 1 · Fertig

| Paket | Stand |
|---|---|
| T1 Hörprobe | abgeschlossen, gewählt: B2 „sauber“ |
| E0–E5 Kopfzeile und Effekte | PR #44 |
| K1–K5 Taktik-Arena `v4`, Waffen als Symbol-Marken, Vorlagen auf `v4` | PR #45, vom Nutzer angenommen |
| T2 Ton `soft-v1` | PR #46, Hörurteil des Nutzers: „Passt“ |
| S1, Teil 1: Short-Karte und Ablauf | PR #47 ([Bericht](SCRAP_AUSBAU_2026-11-19.md#s1-teil-1--short-karte-und-ablauf-in-arbeit)) |
| S1, Rest: Darstellung des Shorts | Branch `scrap/s1-darstellung`, noch nicht auf `main`. Keine Kopfleiste, Schilder 1,4-fach, Einstiegstext, Sieger groß, Schalter „Bildaufbau“, Tests und Vorschaubilder ([Bericht](SCRAP_AUSBAU_2026-11-19.md#s1-rest--darstellung-des-shorts-21112026)) |

## 2 · Offen in R40, in dieser Reihenfolge

### S2: Verdeckte Regie

- **Casting-Skript** `scripts/scrap-short-casting.mjs`: erster K.o. bei 5–10 s, zweiter bei 12–20 s, Schlussduell
  mindestens 6 s mit beiden unter 40 % Leben, Gesamtlänge 26–38 s. Bevorzugt gewinnt nicht der zuerst Bewaffnete.
- **Short-Balance** nur im Short: Schaden ×1,5, im Schlussduell nimmt der Schwächere 20 % weniger Schaden. Nur bei
  `layout: 'short'`, damit `v4` ohne Short gleich bleibt.
- **Zeitlupe** beim letzten K.o.: 0,5 s Videozeit mit Tempo 0,35, als vorab berechneter Tempoplan der Episode
  (Vorbild: Territory-Short). Im Langvideo aus.
- **Achtung:** Der erste K.o. liegt heute bei 14,4 s im Median, also über dem Ziel 5–10 s; das muss die Balance
  schaffen. Das Casting im Browser (Chromium) rechnen oder dort gegenprüfen: `sin` und `cos` liefern in Node und
  Chromium leicht andere Werte, `v4`-Runden laufen deshalb verschieden. Der Export rechnet im Browser.

### S3: Vorlage und Export

- `presets/production/scrap-short.json` und die Vorlage in `src/production-presets.js`: `layout: 'short'`, Seed aus
  dem Casting. Die Länge „bis Sieg + 2,5 s“ ergibt sich schon von selbst (Export-Vorplanung ist da).
- 20-Sekunden-Probe; das ganze Short (rund 32 s) **nur auf Auftrag**.

### L1: Langvideo-Vorlage

- `presets/production/scrap-long.json` auf Turniermodus (8 Runden mit Rangliste), `v4`, `soft-v1`.
- Kapitelzeiten aus den `round_start`-Ereignissen in die JSON-Begleitdatei schreiben.

## 3 · Fragen an den Nutzer

1. **Startecken:** die farbigen Startecken im Boden in `v4` weglassen? Die Roboter starten dort ja nicht mehr.
2. **Kopfzeile:** dieselben Waffensymbole wie am Boden (erst als Vorschau)?
3. **Ton:** Es gibt keinen eigenen Klang für Rundenende und Anfahren, und die dunklen Karten bekommen auch den Wind.
   Passt das so?
4. **R41** (Idee vom 19.11.: Roboter zerfallen in kleinere, daraus springen Puscheltiere mit Keulen): steht nur in
   der Merkliste, noch kein Plan.

## 4 · Aufräumen (jeder Schritt braucht die Freigabe des Nutzers)

- **Branches** lokal und auf GitHub, alle zusammengeführt: `scrap/e0-kopfzeile`, `scrap/v4-taktik`, `scrap/t2-ton`,
  nach dem Merge dieses Stands auch `scrap/s1-short`.
- **Arbeitskopien:** `.claude/worktrees/scrap-e0` und `.claude/worktrees/scrap-v4`.
- **Nur lokal:** In `.claude/worktrees/scrap-v4/output/` liegen die zwei Hörproben (`scrap-t2/t2-probe-hoch.mp4`,
  `t2-probe-quer.mp4` mit JSON) sowie Prüfbilder und Protokolle unter `scrap-v4/`. Vor dem Löschen der Arbeitskopie
  in den `output/`-Ordner des Hauptordners verschieben, falls sie noch gebraucht werden.
- **Nicht aus R40**, Stand unbekannt: Arbeitskopien `cloudwars-plan`, `marble-xl`, `naval-ruhig`,
  `waterpark-wippe-sprung`, `youtube-audit-2026-11-18`, `youtube-kanalwissen`; lokale Branches
  `cloudwars/c3-gewitter` und `cloudwars/short-laenge` (auf GitHub schon gelöscht); im Hauptordner der ungesicherte
  Ordner `.codex-attachments/`.

## 5 · Prüflauf

- Auf PR #46 brach „Production checks“ ab (`live.test`: Zeitüberschreitung beim Seitenaufruf, „FPS-Anzeige leer“);
  lokal liefen dieselben Tests 8 von 8. Im Lauf auf `main` nach dem Merge war `production` grün; `core`, `scrap` und
  `marbleworks` liefen beim Schreiben noch. Ergebnis beim nächsten Mal ansehen; bei erneutem Abbruch R28 wieder öffnen.

## 6 · Übrige offene Punkte im Projekt

Einzelheiten nur in der [ROADMAP](ROADMAP.md); hier die Nummern als Überblick.

- **Jetzt:** R31 Ordnung (Schutz von `main`, Versionsmarke `v0.8.0`), R35 Marble XL (10-Minuten-Video in 1440p60),
  R37 Territory-Short (Urteil am Handy, Upload, Champions), R04 Kanalpilot, R33 Abnahme-Mappe.
- **Danach:** R38 Cloud Wars (Abstimmung), R39 Wolkenreise (J1), R34 Naval-Langvideo, R35 Marble XL weitere Pakete,
  R36 Verbesserungen je Szenario, R32 Architektur (A2), R23 Pyramid (P4–P6), R30 Waterpark (Urteil, Probe, Short).
- **Merkliste:** R10, R27, R07, R09, R11, R13, R16, R24, R41, R29.
- **Offene Entscheidungen:** ROADMAP Abschnitt 6, Punkte 1 bis 6.
