// Gemeinsame Helfer: Chromium starten und die Simulationsseite im Export-Modus öffnen.
import { chromium } from 'playwright';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const INDEX = join(ROOT, 'index.html');

/**
 * Startet Chromium headless. Standard ist der Software-Renderer (SwiftShader):
 * langsamer, aber auf jedem Rechner gleich. Mit gpu=true wird die Grafikkarte genutzt.
 */
export async function launchBrowser({ gpu = process.env.EBS_GPU === '1' } = {}) {
  const args = [
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
    '--enable-precise-memory-info',
    '--ignore-gpu-blocklist',
  ];
  if (gpu) args.push('--enable-gpu', '--use-angle=d3d11');
  else args.push('--use-angle=swiftshader', '--enable-unsafe-swiftshader');
  return chromium.launch({ headless: true, args });
}

/** Startet Chromium mit GPU, falls dort WebGL in Hardware läuft – sonst Software-Renderer. */
export async function launchAuto() {
  if (process.env.EBS_GPU === '0') return launchBrowser({ gpu: false });
  try {
    const b = await launchBrowser({ gpu: true });
    const p = await b.newPage();
    const name = await p.evaluate(() => {
      const gl = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl');
      if (!gl) return '';
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      return String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
    });
    await p.close();
    if (name && !/swiftshader|llvmpipe|software/i.test(name)) return b;
    await b.close();
  } catch { /* Fallback */ }
  return launchBrowser({ gpu: false });
}

export function exportPageUrl(cfg, base) {
  const q = `?mode=export&cfg=${encodeURIComponent(JSON.stringify(cfg))}`;
  return (base ? base.replace(/\/$/, '') + '/index.html' : pathToFileURL(INDEX).href) + q;
}

/**
 * Öffnet eine neue Seite im Export-Modus und wartet, bis window.exportAPI bereit ist.
 * scripts: zusätzliche Szenario-Dateien, die nachgeladen werden (Erweiterung ohne index.html zu ändern).
 */
export async function openExportPage(browser, cfg, { base, scripts = [] } = {}) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(new Error(m.text())); });
  // Nachgeladene Szenarien sind beim ersten Start noch unbekannt: zunächst ohne Szenario-Angabe öffnen
  const { scenario: _later, ...withoutScenario } = cfg || {};
  await page.goto(exportPageUrl(scripts.length ? withoutScenario : cfg, base));
  await page.waitForFunction(() => window.exportAPI && (window.exportAPI.ready || window.exportAPI.error), null, { timeout: 60000 });
  const { err, code } = await page.evaluate(() => ({ err: window.exportAPI.error, code: window.exportAPI.errorCode || null }));
  // code gesetzt = Fehler in der Konfiguration (z. B. unbekanntes Szenario): Meldung unverändert weitergeben
  if (err) throw Object.assign(new Error(code ? err : 'Simulationsseite konnte nicht starten: ' + err), { code });
  if (scripts.length) {
    for (const path of scripts) await page.addScriptTag({ path });
    const bad = await page.evaluate((c) => {
      try { window.exportAPI.restart(c); return null; } catch (e) { return { message: e.message, code: e.code || null }; }
    }, cfg);
    if (bad) throw Object.assign(new Error(bad.code ? bad.message : 'Szenario konnte nicht gestartet werden: ' + bad.message), { code: bad.code });
  }
  const info = await page.evaluate(() => window.exportAPI.info());
  // Seitengröße = Bildgröße (nur kosmetisch; die Canvas-Größe hängt davon nicht ab)
  await page.setViewportSize({ width: Math.min(info.width, 3840), height: Math.min(info.height, 3840) });
  return { page, errors, info };
}
