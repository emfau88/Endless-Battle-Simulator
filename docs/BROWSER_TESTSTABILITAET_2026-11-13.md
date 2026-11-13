# Browser-Teststabilität · 13.11.2026

Ausgangsstand: `main` / `a25152078ade47ecaf70613e80417f9372568bc8`, lokal sauber und mit GitHub abgeglichen.
Die Korrektur betrifft ausschließlich `test/share.test.mjs` und die Nachweisdokumentation.

## Befund

Der vollständige [PR-Lauf 43431587775](https://github.com/emfau88/Endless-Battle-Simulator/actions/runs/43431587775)
hatte 133/133 Tests bestanden. Im anschließenden [Main-Lauf 43434908849](https://github.com/emfau88/Endless-Battle-Simulator/actions/runs/43434908849)
bestanden Audio 17/17, Produktion 33/33 und Scrap 29/29, die Kerngruppe aber nur 51/54.
Teilen-Link, JSON-Einstellungen und Handyansicht scheiterten jeweils an `page.goto`, 30 Sekunden Wartezeit bis `load`.
Der Programmcode war gegenüber dem geprüften PR unverändert; `a251520` ergänzte lediglich Dokumentation.

Im Teilen-Link-Test liefen zwei vollständige Vorschauen gleichzeitig über Software-WebGL. Außerdem wurden
die Browserkontexte nur am erfolgreichen Testende geschlossen. Scheiterte Navigation oder eine Assertion,
blieben Vorschau und Kontext bis zum Ende der Testdatei erhalten und konnten die nachfolgenden Tests belasten.
Das sind konkrete Schwächen des Testaufbaus; eine vollständige Laufzeitprofilierung des fehlgeschlagenen
GitHub-Runners liegt nicht vor. Die drei Timeouts sind kein belegter Simulations- oder Audiofehler.

## Begrenzte Korrektur

- Jeder Kontext registriert sofort einen Test-Abschlusshook. Er wird auch bei einer fehlgeschlagenen Assertion
  geschlossen. Bei einem Navigations-/Bereitschaftsfehler schließt der Helfer den Kontext bereits vor Rückgabe.
- Der Teilen-Link-Test speichert Konfiguration und Zustand nach 300 Schritten, schließt den Quellkontext und
  öffnet den Link erst dann in einem frischen Kontext. Konfigurationsvergleich, Zustands-Hash und Prüfung auf
  Browserfehler bleiben vollständig erhalten; höchstens eine Vorschau rendert gleichzeitig.
- Ein zusätzlicher Fehlerfall prüft einen echten fehlgeschlagenen Navigationsaufruf: kein Kontext bleibt übrig,
  die danach regulär gestartete Vorschau funktioniert. Er prüft außerdem, dass vorherige Tests aufgeräumt haben.

Die Prüfung auf das vollständige `load`-Ereignis und die vorhandenen 30-Sekunden-Grenzen bleiben unverändert.
Keine Retries im Test, keine übersprungenen Fälle, keine höheren Limits oder geänderten Golden-Referenzen.
Szenarien, Darstellung, Ton und Exportcode werden nicht verändert.

## Prüfung

Erster lokaler Lauf unter Windows, Node 22.17.1, Playwright 1.60.0, Software-Rendering: **5/5 bestanden**, 38,49 s.
Zwei weitere frische lokale Testprozesse sowie die Linux-CI und der Main-Nachlauf folgen vor Abschluss.
Die vollständige CI-Abnahme R02 ist bis dahin erneut offen. Protokolle: `output/browser-test-stability/`.
