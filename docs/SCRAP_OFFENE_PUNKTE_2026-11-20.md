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
| L1: Langvideo-Vorlage | Branch `scrap/s1-darstellung`, noch nicht auf `main`. Turnier mit acht Runden in der Taktik-Arena (Seed 42: 5:23 Minuten), Kapitelzeiten der Rundenstarts in der JSON-Begleitdatei ([Bericht](SCRAP_AUSBAU_2026-11-19.md#l1--langvideo-vorlage-im-turniermodus-21112026)) |
| S3: Short-Vorlage | Branch `scrap/s1-darstellung`, noch nicht auf `main`. Vorlage im Short-Bild auf Casting-Seed 61, Länge 34,7 s aus dem Ablauf, 20-Sekunden-Probe lokal ([Bericht](SCRAP_AUSBAU_2026-11-19.md#s3--short-vorlage-und-20-sekunden-probe-21112026)) |
| S2: Verdeckte Regie | Branch `scrap/s1-darstellung`, noch nicht auf `main`. Short-Balance (Eröffnung ×2,5, danach ×1, Schwächerer im Duell −20 %), Zeitlupe beim letzten K.o. als Tempoplan, Casting in Chromium mit 23 geprüften Seeds ([Bericht](SCRAP_AUSBAU_2026-11-19.md#s2--verdeckte-regie-21112026)) |
| S1, Rest: Darstellung des Shorts | Branch `scrap/s1-darstellung`, noch nicht auf `main`. Keine Kopfleiste, Schilder 1,4-fach, Einstiegstext, Sieger groß, Schalter „Bildaufbau“, Tests und Vorschaubilder ([Bericht](SCRAP_AUSBAU_2026-11-19.md#s1-rest--darstellung-des-shorts-21112026)) |

## 2 · Offen in R40

Alle Pakete des Plans sind gebaut. Offen sind nur noch Urteile und Aufträge des Nutzers.

### Short: Urteil und Export

- **Urteil des Nutzers** zur 20-Sekunden-Probe (Bild, Tempo, Ton).
- **Das ganze Short** (Seed 61, 34,7 s) **nur auf Auftrag**:
  `node export.mjs --config presets/production/scrap-short.json --out output/scrap-short.mp4`

### Langvideo: Export

- **Das Turnier-Langvideo** (Seed 42, 5:23 Minuten) **nur auf Auftrag**:
  `node export.mjs --config presets/production/scrap-long.json --out output/scrap-long.mp4`
  Die Kapitelzeiten stehen danach in `output/scrap-long.json` unter `chaptersText`.

### Merge

- Pull Request des Branches `scrap/s1-darstellung` als Merge-Commit nach `main`: braucht die Freigabe des Nutzers.

## 3 · Fragen an den Nutzer

1. **Startecken:** die farbigen Startecken im Boden in `v4` weglassen? Die Roboter starten dort ja nicht mehr.
2. **Kopfzeile:** dieselben Waffensymbole wie am Boden (erst als Vorschau)?
3. **Ton:** Es gibt keinen eigenen Klang für Rundenende und Anfahren, und die dunklen Karten bekommen auch den Wind.
   Passt das so?
4. **R41** (Idee vom 19.11.: Roboter zerfallen in kleinere, daraus springen Puscheltiere mit Keulen): steht nur in
   der Merkliste, noch kein Plan.
5. **Short-Optik:** Einstiegstext weiß und gelb mit dunklem Rand, Sieger in Teamfarbe mit weichem dunklem Band,
   dunkle Streifen oben und unten. Passt das?
6. **Short-Balance:** Schaden ×2,5 bis zum ersten K.o., danach normal. Im Mittel dauert ein Short damit rund 26 s.
   Länger gewünscht (Schaden ×0,8 nach dem ersten K.o., knapp 2 s mehr)?
7. **Zeitlupe:** 0,3 s vor und 0,2 s nach dem letzten K.o., Ton ohne eigenen Akzent. Passt das, oder länger?
8. **Short-Seed:** Die Vorlage nimmt Seed 61 (AMBER gewinnt nach 32 s mit 10 % Rest). Die Liste hat 22 weitere
   geprüfte Seeds, zum Beispiel 516 (28,6 s, MOSS gewinnt mit 2 % Rest). Anderen Seed gewünscht?
9. **Langvideo:** Das Turnier dauert rund 5 statt 10 Minuten (Seed 42: 5:23, MOSS gewinnt 5 von 8 Runden). Passt
   das, oder lieber ein anderer Seed mit engerem Ausgang oder zwei Turniere hintereinander?

## 4 · Aufräumen (jeder Schritt braucht die Freigabe des Nutzers)

- **Branches** lokal und auf GitHub, alle zusammengeführt: `scrap/e0-kopfzeile`, `scrap/v4-taktik`, `scrap/t2-ton`,
  `scrap/s1-short`; nach dem Merge dieses Stands auch `scrap/s1-darstellung`.
- **Arbeitskopien:** `.claude/worktrees/scrap-e0` und `.claude/worktrees/scrap-v4`; nach dem Merge auch
  `.claude/worktrees/scrap-s1`.
- **Nur lokal** in `.claude/worktrees/scrap-s1/output/scrap-short/`: die 20-Sekunden-Probe
  (`scrap-short-probe-20s.mp4` mit JSON), die Vorschaubilder für Seed 42 und Seed 61 und das Casting-Protokoll.
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
