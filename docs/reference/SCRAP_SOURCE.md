# Scrap Arena – gesicherte Referenz

Quelle: vom Nutzer bereitgestellte `04-scrap-arena.html`, ohne ausgewiesene Versionsnummer.
Die Datei `scrap-arena.source.html` ist die unveränderte Kopie (101616 Bytes).
SHA-256: `38e2c7d28c96a78235a44a5d63943666d11c0ee18025065bcfdd6939e18bc130`.
Ein gesonderter Lizenztext ist in dieser Projektquelle nicht ausgewiesen; sie ist keine CC0-Soundquelle.

Die ersten beiden Scriptblöcke wurden nach `src/scenarios/scrap/simulation.js` und `renderer.js`
übernommen, lediglich mit Herkunftszeile und vereinheitlichten Zeilenenden. Der dritte Block mit
DOM-Bedienung, Echtzeitloop, Browserklängen und MediaRecorder wird nicht geladen. Adapter und
Episodensteuerung liegen daneben und ändern die gesicherte Simulation nicht.

Regeln: vier Roboter mit je 125 Lebenspunkten, 14 zerstörbare Deckungen, Blaster mit neun Schuss,
Raketenwerfer mit drei Schuss, Waffenaufnahme/-abwurf und zwei Nachschubfelder. Die Arena bleibt
900 × 900 Einheiten groß. Nach spätestens 90 Simulationssekunden endet eine Runde; ein alleiniger
Überlebender gewinnt, sonst bleibt das ursprüngliche Unentschieden bestehen. Keine neuen Waffen
oder KI-Regeln in dieser Integration.

`test/fixtures/scrap-prototype.json` sichert die Seeds 42, 7 und 314 bei 20/40 Sekunden und am
Rundenende (angefordert bei 90 Sekunden), einschließlich SHA-256 des vollständigen serialisierten
Originalzustands. Die bekannte erste Runde von Seed 42 endet nach ca. 52,7083 Sekunden mit EMBER
als Sieger und dem ursprünglichen Hash `d3baa468`. Die Tests vergleichen auch die extrahierten
Scriptblöcke direkt mit dem HTML. Diese Referenzen wurden vor der Integration erzeugt.
