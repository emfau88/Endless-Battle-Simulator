# Changelog

Erledigte Arbeit, neueste zuerst, mit Commit und Bericht. Offene Punkte stehen in der [ROADMAP](ROADMAP.md).

## 12.11.2026

| Was | Commit | Bericht |
|---|---|---|
| Seeschlacht: Mulden am Meeresgrund, Glasrohr durch den Kiel, Beuteprinzip im Duell; Lebensbalken im Querformat in den Ecken; „Hits taken“ gestrichen; Referenz-Hashes der Seeschlacht neu gesetzt (R01, Teil Rohre/Anschlüsse/Rinne) | `33f8eb1` | [NAVAL_MULDEN_LIFT](NAVAL_MULDEN_LIFT.md) |
| Roadmap und Changelog zusammengeführt; Umsetzungsplan darin aufgegangen | – | [ROADMAP](ROADMAP.md) |
| Audit des Gesamtzustands (stabil, keine ernsten Mängel, acht Hotzones, Checkliste für neue Szenarien); README auf aktuellen Stand | `f2f5e6f` | [AUDIT_2026-11-12](AUDIT_2026-11-12.md) |
| Ton: Einmessung jeder Tonspur auf YouTube-Lautheit (−14 LUFS), Spitzenbegrenzer mit Vorausschau, Regler 0–200 % in beide Richtungen | `20ea040` | README, Abschnitt „Ton“ |
| Ton: Lautstärkeregler gesamt und je Klang in Oberfläche, CLI, Teilen-Link und JSON (Hoch- und Querformat) | `9d0c24d` | README, Abschnitt „Ton“ |

**Veröffentlicht (bis 12.11.2026, genaues Datum nicht festgehalten):** erstes Short und erstes Video auf YouTube.

## 11.11.2026

| Was | Commit | Bericht |
|---|---|---|
| Seeschlacht: Sammelrinne reicht von Rohrfuß zu Rohrfuß statt aus dem Bild | `812422e` | – |
| Seeschlacht: Ton aus Schuss, Treffer und Platscher mit Dichtebegrenzung | `6d4e475` | – |
| Seeschlacht: Recycling als gemeinsame Sammelrinne mit Glasrohren und Farbschimmer | `6eb8d17` | – |
| Tempo 0,64×, langsamere Regler der Seeschlacht, Auflösung und Bildrate in der Oberfläche | `940c967` | – |
| Seeschlacht: Querformat für Vollbild-Videos (Schiffe weiter auseinander, mehr Himmel) | `4a29c23` | [NAVAL_QUERFORMAT](NAVAL_QUERFORMAT.md) |
| B01: Recycling der Seeschlacht ruhig gezeichnet | `4ebca00` | [B01_NAVAL_RECYCLING](B01_NAVAL_RECYCLING.md) |
| W1/W2: Online-Vorschau über GitHub Pages, Handybedienung, Teilen-Link, JSON laden/speichern, `start.bat` | `553d0ea`, `4aaac3f`, `9589724` | [W1_W2_PLAYLINK_START](W1_W2_PLAYLINK_START.md) |
| Schritt 4: Vorlage und Bericht für das erste Short (30 s, 1080p60, mit Ton) | `fad2cb4` | [SCHRITT_4_ERSTES_SHORT](SCHRITT_4_ERSTES_SHORT.md) |
| Schritt 3: Ton für die Kugelfabrik (Ereignisprotokoll, Mischer, Stummoption) | `4c6709a` | [SCHRITT_3_MARBLE_TON](SCHRITT_3_MARBLE_TON.md) |
| Schritt 2: Trichterstau der Kugelfabrik konstruktiv entschärft | `cb8a437` | [SCHRITT_2_MARBLE_TRICHTER](SCHRITT_2_MARBLE_TRICHTER.md) |
| Kugelfabrik: Titelrahmen folgt der Schriftbreite | `3e99d9e` | [SCHRITT_1_BEDIENFEHLER](SCHRITT_1_BEDIENFEHLER.md) |
| Schritt 1: Bedienfehler geschlossen (freie Videodauer, kurzer Standard 45 s, unbekanntes Szenario) | `5d91778` | [SCHRITT_1_BEDIENFEHLER](SCHRITT_1_BEDIENFEHLER.md) |
| Schritt 0: Ausgangsbasis (Referenz-Hashes, Referenzbilder, Messwerte); Umsetzungsplan angelegt | `6f77502` | [AUSGANGSBASIS_2026-11-11](AUSGANGSBASIS_2026-11-11.md) |

## 10.11.2026

| Was | Commit |
|---|---|
| `.claude/` ignorieren | `0f13787` |
| Englische Texte im Video, Zeitlupe 0,8× | `b14334c` |
| Zweites Szenario: Endless Marble Factory (visueller Prototyp V0.1) | `d186d25` |
| Phase A: Endless Naval Battle mit deterministischem MP4-Export | `8f4d4d0` |

## Entscheidungen

| Datum | Entscheidung |
|---|---|
| 12.11.2026 | Seeschlacht: Umbau mit Physikänderung freigegeben (R01 sah reine Darstellung vor) – Mulden, Lift durch den Kiel, Beuteprinzip im Duell; nach Vorschau bestätigt. Bei drei und vier Schiffen behält jedes Schiff seine Kugeln (Festlegung nach Messung, nicht eigens bestätigt). |
| 12.11.2026 | Ton aller Szenarien wird auf YouTube-Lautheit (−14 LUFS) eingemessen; Regler wirken relativ dazu in beide Richtungen. |
| 12.11.2026 | Offene Punkte werden nur noch in der [ROADMAP](ROADMAP.md) geführt. |
| 11.11.2026 | **A** – Erstes Short: einfacher 30-Sekunden-Clip der laufenden Kugelfabrik. |
| 11.11.2026 | **C** – Kenney Impact Sounds (CC0) dürfen für alle Szenarien verwendet werden; Dateiliste und Lizenznachweis bleiben Pflicht. |
| 11.11.2026 | **D** – GitHub Pages eingeschaltet (öffentliche Online-Vorschau). |
| 11.11.2026 | **E** – Kurzer Standard für die Videolänge: 45 s (Empfehlung übernommen, nicht eigens bestätigt). |
| 11.11.2026 | **F** – Referenzbilder liegen im Repository (Empfehlung übernommen, nicht eigens bestätigt). |
