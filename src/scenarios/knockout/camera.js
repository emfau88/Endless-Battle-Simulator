/* Marble Knockout · Kamera-Regie (R43 Teil 2, Paket G1)
 *
 * Die Kamera ist Simulationszustand: Die Simulation rechnet sie in jedem Schritt aus dem Rennstand, der Renderer liest
 * sie nur (Seek-Regel). Sie rechnet nur mit +, −, ×, ÷ und Math.sqrt, damit Node und Chromium gleich rechnen.
 *
 * Zustand { x, y, z, vx, vy, gx, gy, gz }: Bildmitte in Welt-Einheiten, Zoom (1 = eine Welt-Einheit je Bildpunkt),
 * Geschwindigkeit und Ziel. Ablauf je Schritt:
 *   1. Ruhezone: Das Ziel folgt dem Brennpunkt erst, wenn er die Ruhezone um das Ziel verlässt (kein Zappeln).
 *   2. Kritisch gedämpfte Feder zum Ziel mit Nachlaufzeit T, Höchsttempo begrenzt.
 *   3. Zoom gleitet zum Wunsch-Zoom, höchstens zrate je Sekunde, innerhalb [zmin, zmax].
 *   4. Klemme an den Rand der Welt: Das Bild zeigt nie etwas außerhalb (ist die Welt schmaler als das Bild, steht
 *      die Kamera auf ihrer Mitte).
 * Kein Drehen, kein Wackeln, kein Schnitt.
 */
(function (global) {
  'use strict';
  const EBS = global.EBS;

  /** Startwerte nach Plan Abschnitt 4 (Langvideo und Short). */
  const PRESETS = {
    long: { dz: [0.10, 0.10], lag: 0.8, vmax: [1.0, 1.0], zmin: 0.8, zmax: 1.15, zrate: 0.1, lockX: false },
    short: { dz: [0, 0.08], lag: 0.5, vmax: [1.5, 1.5], zmin: 0.85, zmax: 1.0, zrate: 0.15, lockX: true },
  };

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  /** Neue Kamera mit Bildgröße (W, H in Bildpunkten), Weltgrenzen bounds { x0, y0, x1, y1 } und Einstellung o. */
  function create({ W, H, bounds, o, x, y, z }) {
    const cam = { W, H, b: bounds, o, x, y, z: z || 1, vx: 0, vy: 0, gx: x, gy: y, gz: z || 1, mode: 'ride' };
    fit(cam);
    cam.gx = cam.x; cam.gy = cam.y;
    return cam;
  }

  /** Klemmt die Bildmitte an den Rand der Welt. */
  function fit(cam) {
    const b = cam.b, hw = cam.W / (2 * cam.z), hh = cam.H / (2 * cam.z);
    cam.x = b.x1 - b.x0 <= 2 * hw ? (b.x0 + b.x1) / 2 : clamp(cam.x, b.x0 + hw, b.x1 - hw);
    cam.y = b.y1 - b.y0 <= 2 * hh ? (b.y0 + b.y1) / 2 : clamp(cam.y, b.y0 + hh, b.y1 - hh);
  }

  /** Ein Schritt: Brennpunkt (fx, fy), Wunsch-Zoom fz, Videozeit dt. hold: Ruhezone aus (fester Bildausschnitt,
   *  zum Beispiel Halt auf der Schleuse oder Fassung „Abschnitte“). lag: Nachlauf für diesen Schritt (sonst o.lag). */
  function update(cam, fx, fy, fz, dt, hold, lag) {
    const o = cam.o, W = cam.W, H = cam.H;
    // 3. Zoom
    const zt = clamp(fz, o.zmin, o.zmax), dzmax = o.zrate * dt;
    let dz = (zt - cam.z) * 2 * dt;
    dz = clamp(dz, -dzmax, dzmax);
    cam.z += dz;
    // 1. Ruhezone um das Ziel (in Welt-Einheiten beim aktuellen Zoom)
    const rx = hold ? 0 : o.dz[0] * W / cam.z, ry = hold ? 0 : o.dz[1] * H / cam.z;
    if (fx > cam.gx + rx) cam.gx = fx - rx; else if (fx < cam.gx - rx) cam.gx = fx + rx;
    if (fy > cam.gy + ry) cam.gy = fy - ry; else if (fy < cam.gy - ry) cam.gy = fy + ry;
    // 2. Feder (kritisch gedämpft): a = w²·(Ziel − x) − 2w·v
    const w = 2 / (lag || o.lag), w2 = w * w;
    cam.vx += (w2 * (cam.gx - cam.x) - 2 * w * cam.vx) * dt;
    cam.vy += (w2 * (cam.gy - cam.y) - 2 * w * cam.vy) * dt;
    const mx = o.vmax[0] * W / cam.z, my = o.vmax[1] * H / cam.z;
    cam.vx = clamp(cam.vx, -mx, mx); cam.vy = clamp(cam.vy, -my, my);
    if (o.lockX) cam.vx = 0;
    const px = cam.x, py = cam.y;
    cam.x += cam.vx * dt; cam.y += cam.vy * dt;
    fit(cam);
    // An der Klemme bleibt keine Geschwindigkeit stehen (sonst „klebt“ die Kamera am Rand und schießt danach los)
    if (dt > 0) { cam.vx = (cam.x - px) / dt; cam.vy = (cam.y - py) / dt; }
  }

  /** Sichtbarer Ausschnitt in Welt-Einheiten. */
  function view(cam, pad = 0) {
    const hw = cam.W / (2 * cam.z) + pad, hh = cam.H / (2 * cam.z) + pad;
    return { x0: cam.x - hw, y0: cam.y - hh, x1: cam.x + hw, y1: cam.y + hh };
  }
  /** Zoom, bei dem ein Rechteck (w × h Welt-Einheiten) mit Rand ins Bild passt. */
  function zoomFor(cam, w, h, margin = 1.15) { return Math.min(cam.W / (w * margin), cam.H / (h * margin)); }
  /** Welt → Bild. */
  function toScreen(cam, x, y) { return [(x - cam.x) * cam.z + cam.W / 2, (y - cam.y) * cam.z + cam.H / 2]; }
  /** Zustand als Zahlen (für Hash und Sichern). */
  function state(cam) { return [cam.x, cam.y, cam.z, cam.vx, cam.vy, cam.gx, cam.gy]; }

  EBS.KnockoutCamera = { PRESETS, create, update, fit, view, zoomFor, toScreen, state };
})(typeof window !== 'undefined' ? window : globalThis);
