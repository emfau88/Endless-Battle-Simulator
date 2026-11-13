# Territory Wars / Hex Dominion V0.3 – Quelle

Am 13.11.2026 erneut geprüft und unverändert nach
[`territory-wars-hex-dominion-v0.3.source.html`](territory-wars-hex-dominion-v0.3.source.html) kopiert.

- Maßgebliche Datei: `C:/Users/madde/Downloads/07-Territory_Wars_Hex_Dominion_V0.3.html`
- Vergleichsdatei: `C:/Users/madde/Downloads/Territory_Wars_Hex_Dominion_V0.3.html`
- Beide Dateien sind bytegleich. SHA-256:
  `4bdee96025a22bab270c2575eaf71c49a81bb50938f90d1ad11c1d4028c91ea8`
- Integrationsbasis: Main `bd4f9904af7292e3df4b43581ceaf17f3c12051b`, lokal und auf GitHub geprüft;
  sauberer Arbeitsbaum, Branch `codex/territory-integration`.

Vor der Anpassung wurden sechs Referenzverläufe direkt aus dem unveränderten ersten Inline-Skript
gesichert: Seeds 42, 7 und 2026, jeweils Quer-/Hochformatkarte; Seed 2026 verwendet das intensive Profil.
[`territory-prototype.json`](../../test/fixtures/territory-prototype.json) enthält SHA-256-Werte über
sämtliche eigenen Simulationsfelder einschließlich Map-Einträgen, RNG, Akkumulator, Entscheidungen,
Versorgung und vollständigen Märschen. Der kurze Original-Hex-Hash dient nicht als Abnahmegrundlage.
[`territory-reference.mjs`](../../scripts/territory-reference.mjs) dokumentiert die Erzeugung.

Simulation und WebGL-/Canvas-Renderer sind als originale Skriptblöcke in eigenen Dateien erhalten.
Beobachtung, Episodensteuerung, Generatoradapter und Canvas-HUD liegen separat. Die ursprüngliche
DOM-/requestAnimationFrame-Anwendung wird nicht gestartet. Details und tatsächliche Abnahme:
[`TERRITORY_INTEGRATION_2026-11-13.md`](../TERRITORY_INTEGRATION_2026-11-13.md).
