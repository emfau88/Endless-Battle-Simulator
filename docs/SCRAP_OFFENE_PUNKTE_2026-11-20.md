# Scrap Wars: offene Punkte – Stand 22.11.2026 (R40)

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
| Dritter Nachtrag zum Short: Raketen als einziges Item | Branch `scrap/s1-darstellung`, noch nicht auf `main`. Nach einer Vorschau vom Nutzer freigegeben („viel besser“): Blaster lädt von selbst nach, Raketen kommen nur von den zwei Plattformen (höchstens zwei Münzen), Roboter holen sie gezielt; Ring und Abzeichen bei der Aufnahme, Startkisten in Teamfarbe. Balance neu (zu dritt ×0,5, Duell ×0,9), Casting über 2400 Seeds: 11 geprüfte, Vorlage auf Seed 318 ([Bericht](SCRAP_AUSBAU_2026-11-19.md#dritter-nachtrag-zum-short-raketen-als-einziges-item-22112026)) |
| Zweiter Nachtrag zum Short: Waffen als Münzen | Branch `scrap/s1-darstellung`, noch nicht auf `main`. Rückmeldung zur zweiten Probe umgesetzt: Der Abwurf vom Himmel ist wieder ausgebaut; die Waffen stehen von Anfang an als drehende Münzen da (Ring orange für Rakete, blau für Blitz), neue Waffen an den Stationen wachsen auf. Casting neu gerechnet, Liste und Seed 84 unverändert; dritte 20-Sekunden-Probe lokal ([Bericht](SCRAP_AUSBAU_2026-11-19.md#zweiter-nachtrag-zum-short-waffen-als-drehende-münzen-22112026)) |
| Nachtrag zum Short nach der ersten Probe | Branch `scrap/s1-darstellung`, noch nicht auf `main`. Rückmeldung des Nutzers umgesetzt: keine Hänger mehr (Deckung im Short 0,5 s statt 3 s, Schaden nach dem ersten K.o. ×0,55), Waffen fielen zunächst erst nach den Robotern vom Himmel (am 22.11. wieder ausgebaut), Bretter der Startkisten blenden nach 1 bis 1,8 s aus. Casting neu gerechnet (29 Seeds, Vorlage auf Seed 84, 26,5 s), neue 20-Sekunden-Probe lokal ([Bericht](SCRAP_AUSBAU_2026-11-19.md#nachtrag-zum-short-nach-der-ersten-probe-21112026)) |
| S3: Short-Vorlage | Branch `scrap/s1-darstellung`, noch nicht auf `main`. Vorlage im Short-Bild auf einem Casting-Seed (zuerst 61, seit dem Nachtrag 84), Länge aus dem Ablauf, 20-Sekunden-Probe lokal ([Bericht](SCRAP_AUSBAU_2026-11-19.md#s3--short-vorlage-und-20-sekunden-probe-21112026)) |
| S2: Verdeckte Regie | Branch `scrap/s1-darstellung`, noch nicht auf `main`. Short-Balance (Eröffnung ×2,5, danach zuerst ×1, seit dem Nachtrag ×0,55, Schwächerer im Duell −20 %), Zeitlupe beim letzten K.o. als Tempoplan, Casting in Chromium ([Bericht](SCRAP_AUSBAU_2026-11-19.md#s2--verdeckte-regie-21112026)) |
| S1, Rest: Darstellung des Shorts | Branch `scrap/s1-darstellung`, noch nicht auf `main`. Keine Kopfleiste, Schilder 1,4-fach, Einstiegstext, Sieger groß, Schalter „Bildaufbau“, Tests und Vorschaubilder ([Bericht](SCRAP_AUSBAU_2026-11-19.md#s1-rest--darstellung-des-shorts-21112026)) |

## 2 · Offen in R40

Alle Pakete des Plans sind gebaut. Offen sind nur noch Urteile und Aufträge des Nutzers.

### Short: Urteil und Export

- Die Proben eins bis drei und die Vorschau der Raketen-Regeln sind beurteilt; die Punkte daraus sind umgesetzt.
  Die 20-Sekunden-Probe des endgültigen Stands ist `scrap-short-probe-20s-v5-seed1601.mp4`.
- **Das ganze Short nur auf Auftrag.** Vorlage (Seed 318, 32,9 s):
  `node export.mjs --config presets/production/scrap-short.json --out output/scrap-short.mp4`;
  knappstes Ende (Seed 1601, 32,1 s): derselbe Befehl mit `--seed 1601`.

### Langvideo: Export

- **Das Turnier-Langvideo** (Seed 42, 5:23 Minuten) **nur auf Auftrag**:
  `node export.mjs --config presets/production/scrap-long.json --out output/scrap-long.mp4`
  Die Kapitelzeiten stehen danach in `output/scrap-long.json` unter `chaptersText`.

### Merge

- Pull Request #48 (Branch `scrap/s1-darstellung`) als Merge-Commit nach `main`: braucht die Freigabe des Nutzers.

## 3 · Fragen an den Nutzer

1. **Startecken:** die farbigen Startecken im Boden in `v4` weglassen? Die Roboter starten dort ja nicht mehr.
2. **Kopfzeile:** dieselben Waffensymbole wie am Boden (erst als Vorschau)?
3. **Ton:** Es gibt keinen eigenen Klang für Rundenende und Anfahren, und die dunklen Karten bekommen auch den Wind.
   Passt das so?
4. **R41** (Idee vom 19.11.: Roboter zerfallen in kleinere, daraus springen Puscheltiere mit Keulen): steht nur in
   der Merkliste, noch kein Plan.
5. **Short-Optik:** Einstiegstext weiß und gelb mit dunklem Rand, Sieger in Teamfarbe mit weichem dunklem Band,
   dunkle Streifen oben und unten. Passt das?
6. **Short-Balance:** Schaden ×2,5 bis zum ersten K.o., zu dritt ×0,5, im Duell ×0,9, Deckung nur 0,5 s. Im Mittel
   dauert ein Short damit rund 28 s, ohne Hänger. Passt das Tempo?
7. **Zeitlupe:** 0,3 s vor und 0,2 s nach dem letzten K.o., Ton ohne eigenen Akzent. Passt das, oder länger?
8. **Short-Seed:** Die Vorlage nimmt Seed 318 (32,9 s, MOSS gewinnt mit 24 % Rest). Empfehlung für den Export:
   Seed 1601 (32,1 s, AZURE gewinnt mit 1 % Rest). Die Liste hat neun weitere geprüfte Seeds. Welcher soll es sein?
9. **Langvideo:** Das Turnier dauert rund 5 statt 10 Minuten (Seed 42: 5:23, MOSS gewinnt 5 von 8 Runden). Passt
   das, oder lieber ein anderer Seed mit engerem Ausgang oder zwei Turniere hintereinander?
10. **Langvideo wie der Short?** Raketen als einziges Item, selbst nachladender Blaster, Münzen, Ring und Abzeichen,
    Startkisten in Teamfarbe, ausblendende Bretter und die kurze Deckung gelten bisher nur im Short. Für das
    Turnier-Langvideo (normales Bild, große Karte) braucht es einen eigenen Schalter, eine eigene Messung und eine
    Seed-Auswahl.
11. **Moss:** gewinnt im Short seltener als die anderen (510 von 2400). Ausgleichen?

## 4 · Aufräumen (jeder Schritt braucht die Freigabe des Nutzers)

- **Branches** lokal und auf GitHub, alle zusammengeführt: `scrap/e0-kopfzeile`, `scrap/v4-taktik`, `scrap/t2-ton`,
  `scrap/s1-short`; nach dem Merge dieses Stands auch `scrap/s1-darstellung`.
- **Arbeitskopien:** `.claude/worktrees/scrap-e0` und `.claude/worktrees/scrap-v4`; nach dem Merge auch
  `.claude/worktrees/scrap-s1`.
- **Nur lokal** in `.claude/worktrees/scrap-s1/output/scrap-short/`: die 20-Sekunden-Probe des endgültigen Stands
  (`scrap-short-probe-20s-v5-seed1601.mp4` mit JSON), die Vorschau der Raketen-Regeln (`…-v4-raketen.mp4`,
  Seed 946) und die drei älteren Proben (`…-v3.mp4`, `…-v2.mp4`, `scrap-short-probe-20s.mp4`), alle alter Stand, die Vorschaubilder für Seed 42, 61 und 84 und die Casting-Protokolle.
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
