# Schritt 1 · Bedienfehler schließen (Rest von B00)

**Datum:** 11.11.2026 · **Ausgangs-Commit:** `6f77502` (Schritt 0) · **Branch:** `schritt-1-bedienfehler`
**Betroffene Dateien:** `src/core.js`, `src/app.js`, `index.html`, `lib/browser.mjs`, `lib/exporter.mjs`, `README.md`,
`test/core.test.mjs`, `test/live.test.mjs`, neu `test/config.test.mjs`. Szenarien (`naval.js`, `marble.js`) unverändert.

## Was geändert wurde

| Thema | Vorher | Jetzt |
|---|---|---|
| Videolänge in der Oberfläche | nur sechs feste Werte | freie Eingabe (`45`, `45s`, `5m`, `1h`, auch `2,5 min`) plus Schnellwahl; Anzeige als Zeit (`00:37`) |
| Dauer außerhalb der Auswahlliste | sprang beim Laden still auf 3600 s | bleibt bei Neuladen, Szenariowechsel, Neustart und Formatwechsel erhalten |
| Grenzen | nicht sichtbar | 1 s bis 4 h im Hinweis; größere Werte werden begrenzt und gemeldet |
| Ungültige Eingabe | – | rot markiert, Meldung nennt Beispiele, der bisherige Wert gilt weiter |
| Standarddauer | 3600 s | 45 s (`DEFAULT_DURATION` in `src/core.js`); Schnellwahl um „45 Sekunden (Short)“ ergänzt |
| Unbekannte Szenario-ID | stiller Rückfall auf Naval | Fehler `Unbekanntes Szenario "…". Verfügbar: naval, marble` in Kommandozeile (Exit-Code 1), Export-API und Export-Seite |
| Fehlende Szenario-Angabe | Standard-Szenario | unverändert Standard-Szenario |
| Live-Ansicht mit veralteter gespeicherter Konfiguration oder falschem Link | stiller Wechsel auf Naval | sichtbare Meldung, Standard-Szenario startet, übrige Werte (Seed, Dauer, Format) bleiben |
| Export bei Konfigurationsfehler | zweiter Startversuch ohne GPU mit irreführender Meldung | bricht sofort mit der klaren Meldung ab |

Der Hinweis zu 0,8× (gilt auch im Export) und 2×–10× (nur Vorschau) war bereits vorhanden und wurde nur kontrolliert.

## Abnahme

- **Eigene Videolänge bleibt erhalten:** 37 s bleibt nach Neuladen, Szenariowechsel, Neustart und Formatwechsel 37 s
  und steht in der gespeicherten Konfiguration.
- **Fehlkonfiguration ist sichtbar:** Meldung im Bedienfeld bzw. Fehlertext in CLI, Export-API und Export.
- **Referenz-Hashes aus Schritt 0 unverändert:** `test/golden.test.mjs` besteht, die Simulation ist also bitgleich.

## Tests

Jede Testdatei einzeln, je Lauf auf 2 Minuten begrenzt.

| Lauf | Ergebnis | Dauer |
|---|---|---|
| `test/core.test.mjs` + `test/sim.test.mjs` + `test/golden.test.mjs` | 19/19 | 84 s |
| `test/marble.test.mjs` | 17/17 | 79 s |
| `test/export.test.mjs` + `test/live.test.mjs` | 12/12 | 54 s |
| `test/config.test.mjs` (neu) | 7/7 | 22 s |

Neu abgedeckt: kurzer Standard, eigene Dauer über Neuladen und Wechsel hinweg, Einheiten und Grenzen, ungültige
Eingaben, veraltete gespeicherte Konfiguration, Link mit unbekanntem Szenario, Export und Kommandozeile mit
unbekanntem Szenario, Export-API des Servers, falsch geschriebene ID bei nachgeladenem Szenario.
Angepasst: der Kerntest erwartete bisher ausdrücklich den stillen Rückfall und 3600 s als Standard.

## Nachweise

- [Eigene Dauer nach Neuladen](nachweise/schritt1_eigene_dauer_nach_neuladen.png)
- [Ungültige Eingabe](nachweise/schritt1_ungueltige_dauer.png)
- [Meldung bei unbekanntem Szenario](nachweise/schritt1_meldung_unbekanntes_szenario.png)

Alle drei wurden angesehen. Es wurde kein Video exportiert außer den kurzen Exporten der vorhandenen Tests (höchstens 20 s).

## Offen und bewusst nicht geändert

> Stand dieses Berichts. Offene Punkte werden seit 12.11.2026 nur noch in der [ROADMAP](ROADMAP.md) geführt.

- **Zwei Standardwerte:** Die Kommandozeile nimmt ohne Vorlage weiterhin 20 s, Kern und Oberfläche 45 s.
- **`presets/naval-standard.json` bleibt bei 3600 s** – die Datei ist ausdrücklich die 60-Minuten-Vorlage.
- **45 s als Standard** folgt der Empfehlung im Plan und wurde nicht eigens bestätigt.
- **Wer schon 3600 s gespeichert hat**, behält diesen Wert; der neue Standard gilt nur ohne gespeicherte Einstellung.
- Der Hinweistext im Bedienfeld nennt „Schiffe, Kanonen“ auch bei der Kugelfabrik (kosmetisch, nicht Teil dieses Schritts).

## Zusätzlich in diesem Branch (eigener Commit `3e99d9e`)

Der Schriftzug „ENDLESS MARBLE FACTORY“ ragte im Querformat über seinen Rahmen hinaus. Die Rahmenbreite folgt jetzt
der gemessenen Schriftbreite; beide Marble-Referenzbilder wurden neu erzeugt. Die Simulation ist davon nicht berührt.
