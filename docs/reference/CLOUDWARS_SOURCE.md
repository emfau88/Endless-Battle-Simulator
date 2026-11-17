# Cloud Wars – Quelle

Spielbarer Prototyp „Wolkenflug“ vom 17./18.11.2026. Im Chat mit dem Nutzer entstanden, als Einzeldatei außerhalb des
Repositorys gebaut und hier unverändert als Vorlage abgelegt:
[`cloudwars-prototype.source.html`](cloudwars-prototype.source.html).

- SHA-256: `27b9022d141df58b917f7634d42a96e3005187685cbbf503923a837c5664ed09`
- Läuft direkt im Browser, ohne Server und ohne Bibliotheken. Bedienoberfläche des Prototyps auf Deutsch.
- Nutzt `Math.random` und Echtzeit. Es ist **keine** reproduzierbare Simulation, nur Vorlage für Gelände, Wolken-Optik,
  Effekte und Tageslauf.
- Geprüft per Playwright-Autopilot: 45 s Spiel ohne Fehler auf der Seite, 95 % der Bilder unter 16,8 ms auf dem
  Entwicklungsrechner; Missionen, Abend, Nacht und Nebel als Standbilder (`cloudwars-prototyp-*-2026-11-18.jpg`).

Umsetzungsplan: [CLOUD_WARS_PLAN_2026-11-18.md](../CLOUD_WARS_PLAN_2026-11-18.md).
