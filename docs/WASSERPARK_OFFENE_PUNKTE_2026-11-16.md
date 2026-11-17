# Endless Waterpark: offene Punkte und Vorschläge

Stand: 16.11.2026. Der Wasserpark liegt seit [PR 13](https://github.com/emfau88/Endless-Battle-Simulator/pull/13)
in `main`. Diese Datei ist eine Merkliste. **Nichts davon ist beauftragt.**

Grundlage: [Abschlussbericht](WASSERPARK_MOCKUP_2026-11-16.md) mit Messwerten und Bildern.

## 1 · Entscheidungen (am 17.11.2026 getroffen und umgesetzt)

| Frage | Entscheidung |
|---|---|
| Wasserspiele tagsüber? | Ja, durchgehend und bewegt |
| Ende mit Brunnenshow? | Ja, alle Fontänen mit bunten Farbverläufen und asynchron |
| Titel im Bild? | Standardmäßig aus |

Umsetzung: [Bericht](WASSERPARK_WASSERSPIELE_2026-11-17.md). Die Sprache der Anzeige ist entschieden: im Video immer englisch.

## 2 · Noch nicht geprüft

- Der vollständige `npm test` lief am Ende nicht (auf Wunsch nur gezielte Prüfungen).
- Der CI-Lauf auf `main` nach dem Merge wurde nicht angesehen.
- Kein MP4-Export des Endstands in voller Auflösung, weder Short noch Parktag.
- Keine Hör- und Handyabnahme. Alle Aussagen zum Ton sind gemessen, nicht gehört.
- Die Lage der Bedienleiste von Shorts ist geschätzt, nicht nachgemessen.

## 3 · Bekannte Schwächen

**Ablauf**

- Im Short sind alle vier Fahrten nach 13 von 30 Sekunden vorbei. Danach treiben die Tiere nur noch.
- Das Langvideo hat kein sichtbares Ziel. Die Pyramide hat dafür ihren Fortschrittsbalken.

**Ton**

- Der Short hat 22 Klangereignisse in 30 Sekunden, die Wüsten-Pyramide 103 in 25 Sekunden.
- Die Aktionsklänge liegen 12 LU unter denen der Pyramide (−43,8 gegen −31,8 LUFS). Der Short klingt fast nur
  nach Wasser.
- Es fehlen die Stimmen der Pyramide: „Juhu“ im Fall, „Boing“ und ein Rutschgeräusch.

**Wippe**

- Hochformat: Das Brett ist nur 2,2 Tierbreiten lang, die Fahrt dauert 0,75 Sekunden. Es wirkt eher wie eine Klappe.
  Mehr Länge braucht schmalere Rinnen im Hochformat.
- Das Tier fällt senkrecht auf das Brett und rutscht sofort mit vollem Tempo seitwärts.
- Die Neigung beträgt 9°. Das ist zurückhaltend.
- Auf dem Brett sitzt das Tier ruhig, ohne Reaktion auf das Kippen.
- Die Auffangrinne im Querformat wirkt wie ein kurzer schräger Stummel.

**Darstellung und Grundriss**

- Der Abstand der Schwimmer im Querformat ist noch für die 1,45-fache Größe ausgelegt. Mit 1,2-fach schwimmen sie
  weiter auseinander als nötig.
- Das Hochformat ist für Tiergröße 36–38 ausgelegt. Bei 44 berühren sich Rinnen.
- Die Panoramarutsche hat im Hochformat fünf kleine Bögen statt zwei großer, weil die Breite fehlt.
- In der Lagune liegt unten viel ruhige Fläche.

**Dokumentation**

- Die Vergleichsblätter in `docs/reference/waterpark-mockup-*.jpg` zeigen noch die deutschen Texte.
- Das Sammelbild `docs/images/scenarios.jpg` im README enthält den Wasserpark nicht. Er hat ein eigenes Bild.
- Die Farbmessung aus Paket P2 liegt nicht vor.

## 4 · Vorschläge, nach erwarteter Wirkung sortiert

1. **Short straffen.** Zweite Runde, alle vier gleichzeitig oder ein gemeinsamer Schlusssprung. Das Ende sollte
   nahtlos in den Anfang übergehen.
2. **Ton füllen.** „Juhu“ auf steilen Stücken und im Sprung, Rutschgeräusch während der Fahrt, lauterer Platscher,
   Aktionsklänge insgesamt etwa 6 dB lauter.
3. **Sichtbares Ziel im Langvideo.** Zähler „Rides until the show“ mit Balken, dazu alle 50 Fahrten ein kleines
   Ereignis. Die Show selbst ist seit dem 17.11. Standard; der Zähler mit Ziel fehlt noch.
4. **Mehr Ausdruck.** Offene Münder im Fall, größerer Platscher bei der Landung, Sprechblase nach dem Trichter,
   Arme hoch beim Kippen der Wippe. Das geht über die Posenwahl im Renderer, ohne die gemeinsame Tiergrafik zu ändern.
5. **Lagune beleben.** Schwimmreifen, Wasserball, kleine Wellen.
6. **Wippe verbessern.** Im Hochformat verlängern, Ausguss schräg in Fahrtrichtung, Neigung 12–14°, Auffangrinne im
   Querformat als kurzes Becken wie beim Trichter.

## 5 · Handlung für 15–20 Minuten: „Ein Tag im Wasserpark“

| Zeit | Kapitel | Was passiert |
|---|---|---|
| 0:00–0:20 | Einstieg | Sofort ein Sprung vom Brett, dann erst der Titel |
| 0:20–4:00 | Morgen | Der Lift läuft an, die vier Attraktionen öffnen nacheinander |
| 4:00–9:00 | Hochbetrieb | Zähler „Rides until the show“, alle 50 Fahrten ein kleines Ereignis (Ballon, Vögel, Fisch) |
| 9:00–11:00 | Besuch | Das UFO hält über dem Trichter und leuchtet hinein |
| 11:00–14:00 | Nachmittag | „Polonaise“: alle Tiere nacheinander über dieselbe Rutsche, danach Wasserspiele |
| 14:00–16:30 | Abend | Goldenes Licht, Lampen gehen an, „Last rides of the day“ |
| 16:30–18:30 | Show | Brunnenshow mit Feuerwerk als Lohn für den Zähler |
| 18:30–20:00 | Nacht | Alle sammeln sich, Schlafmützen, „Good night, little friends“ |

**Roter Faden:** ein schüchterner Pinguin. Er geht tagsüber dreimal zum Sprungbrett und kehrt wieder um. Bei der
Show springt er endlich. Das gibt einen Grund, bis zum Ende zu schauen, ohne Wertung und ohne Sieger.

Vorhanden sind bereits: Öffnungsprogramm, Tageslauf, UFO und andere Himmelsgäste, „Last rides“, Brunnenshow,
Feuerwerk und Schlafmützen. Neu wären: Einstieg vor dem Titel, Zähler mit Ziel, Polonaise, Wasserspiele am Tag und
der Pinguin.

## 6 · Regeln für eine spätere Umsetzung

- `src/scenarios/shared/critter-art.js` und die Pyramide bleiben unverändert. `npm run golden` muss „identisch“
  bleiben.
- Änderungen an `layout.js` oder `simulation.js` ändern den Ablauf und die Zustands-Hashes. Reine Darstellung
  (`art.js`, `renderer.js`) nicht.
- Der Renderer bleibt zustandslos. Zeitbudget: höchstens 2,5 ms je Bild am Tag, 4 ms im Finale
  (zuletzt 1,4 und 2,4 ms).
- Alle sichtbaren Texte im Video sind englisch.
- Nur vier Tierarten, keine Menschen, keine Wertung, kein Sieger.
- Optik-Vorschläge zuerst als echte gerenderte Bilder zeigen.
