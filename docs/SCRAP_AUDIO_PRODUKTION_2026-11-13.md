# Scrap-Ton und Produktionsabsicherung · 13.11.2026

Ausgangspunkt: `main` / `52b7987b37a75bf85d9325354ad26ddb54d250de`, sauber und mit GitHub abgeglichen.
Der Folgeauftrag umfasst Produktionsabsicherung und Ton. Umsetzung im Branch `codex/scrap-audio-production`.
Karten, Kampfregeln, Kamera und der isolierte Marble-Prototyp bleiben unverändert.

## Ursachen und Änderung

Der vollständige [Main-Lauf 43419722141](https://github.com/emfau88/Endless-Battle-Simulator/actions/runs/43419722141)
brach nach 25 Minuten ab. Zuvor scheiterten der Marble-Audiofall bei Tempo 0,8 und das Warten auf die
Audiomischphase im Live-Abbruchtest. Der ältere [Minimalnachweis](CI_ERSTLAUF_2026-11-13.md) zeigte bereits
−0,7 dBTP im AAC statt höchstens −1 dBTP, auch auf dem damaligen Hauptbranch.

- PCM-Reserve von −1,5 auf **−2 dBFS** erhöht, für Scrap auf **−3 dBFS**. Nach jedem AAC-Mux misst FFmpeg `ebur128=peak=true` die
  tatsächliche Ausgabespur. Fehlende/ungültige Messung oder True Peak über −1 dBTP verhindern die Veröffentlichung.
  `audio.encoded` enthält die kodierten Werte; ein Clip wird separat gemessen, seine Mischung bleibt aus der
  gesamten Originalepisode abgeleitet. Stille ist als solche gekennzeichnet. Die neue Phase ist abbrechbar.
- Der echte HTTP-Abbruchtest rendert acht statt zwanzig Sekunden vor dem Audiomix. Er verlangt jetzt außerdem
  bereits gemeldeten Worker-Fortschritt. Die 110-s-Frist zum Erreichen der Audiophase und die strenge Grenze von
  **2,5 s für Abbruch einschließlich Aufräumen** bleiben bestehen.
- Die vollständige CI-Suite läuft in vier Gruppen. Jede Testdatei wird genau einmal zugeordnet, auch neu
  hinzukommende Dateien. Jede Gruppe behält das 25-Minuten-Limit; keine Tests oder Golden-Prüfungen entfallen.
  PRs und Push auf `main` werden geprüft, redundante Feature-Push-Läufe entfallen. Bash/`pipefail` bleibt erhalten.

## Scrap-Mischung

Holz nutzt die vorhandenen CC0-Holzklänge; Stein und Beton erhalten eigene synthetische Treffer und Brüche.
Materialdaten werden nur im Ereignisprotokoll ergänzt. Ein Vergleich mit der unbeobachteten V3-Runde prüft
den vollständigen Physikzustand beider Sunny-Grundrisse. Die Archivquellen und Original-Referenzen bleiben erhalten.

Blaster und Raketen erhalten mehr Klangkörper, Explosionen einen längeren Ausklang. Metalltreffer und KOs
werden zurückgenommen; gleichzeitige Deckungsbrüche erhalten einen gemeinsamen Mindestabstand. Die Regler
bleiben unverändert. Ein kürzerer Begrenzer-Rücklauf nur für Scrap vermindert das lange Absenken nach Spitzen.
Naval und Marble behalten ihre bisherigen Klangtabellen und ihren bisherigen Rücklauf. Das Lautheitsziel bleibt −14 LUFS.

## Nachweise

Gezielte lokale Prüfung des echten Server-Abbruchs: bestanden, 28,24 s Gesamtdauer einschließlich Bildexport,
Aufräumen innerhalb der unveränderten 2,5-s-Grenze. Dateierhaltung wird zusätzlich durch Abbruch in allen
Exportphasen und einen absichtlich zu lauten kodierten Ton geprüft. Neue Tests decken Materialauswahl,
Fallback, vorhandene Lautstärkeregler und die Begrenzung gleichzeitig zerstörter Blöcke ab.

Ein zusätzlicher Lauf über 900 Sekunden reine Simulation plus vollständige Tonmischung ergab 23 Runden,
7.983 lückenlos erfasste Ereignisse und 5.975 Klangstimmen. Die erste Fassung mit −2 dBFS hatte seltene
AAC-Spitzen bis −0,4 dBTP, obwohl die kurzen Clips bestanden. Mit der Scrap-Reserve von −3 dBFS erreicht
derselbe Verlauf **−14,02 LUFS im PCM sowie −14,1 LUFS / −1,2 dBTP im AAC**; alle Invarianten bestanden.
Zwei AAC-framegerecht ausgeschnittene Ereignisfenster sichern den Befund als 16-s-Audiotest ab. Mit der
zu geringen Reserve reproduzierte dieser Ausschnitt lokal −0,5 dBTP, mit der Korrektur −1,9 dBTP.
Die Mischung des Ausschnitts verwendet den aufgezeichneten Episodenpegel; sie wird nicht separat normalisiert.

Die abschließenden kurzen Mischwerte, Filmproben und vollständigen lokalen/Linux-Prüfungen werden nach
Abschluss unten ergänzt. **Dieser Zwischenstand ist noch keine grüne Gesamtabnahme.**

Kein einzelner Test-Videoexport dauert mehr als 20 Sekunden. Persönliche Hör-/Handyabnahme und die
Dramaturgie eines vollständigen 15-Minuten-Videos werden damit nicht vorweggenommen.
