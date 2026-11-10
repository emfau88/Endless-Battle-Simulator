/*
 * Endless Battle Simulator – Kern (szenarioübergreifend)
 *
 * Enthält alles, was jedes Szenario gemeinsam nutzt:
 *   - fester Physik-Takt (60 Hz), unabhängig von Video-Bildrate und Echtzeit
 *   - Video-Einstellungen (Seitenverhältnis, Auflösung, Bildrate, Qualität)
 *   - versioniertes Konfigurationsschema (inkl. Kompatibilität zum flachen Phase-A-Format)
 *   - Szenario-Registry
 *   - deterministischer Zufall, Partikelpool, Textur-Helfer
 *   - Session: verbindet Szenario-Simulation + Szenario-Renderer mit der PixiJS-Bühne
 *
 * Klassisches Skript (kein ES-Modul), damit index.html auch per file:// läuft.
 * Alles hängt am globalen Objekt window.EBS.
 */
(function (global) {
'use strict';
const EBS = (global.EBS = global.EBS || {});

// =====================================================================
//  Zeit
// =====================================================================
const PHYS_HZ = 60, DT = 1 / PHYS_HZ, DT_MS = 1000 / PHYS_HZ;

// =====================================================================
//  Video-Einstellungen
//  Szenarien rechnen in einer logischen Welt (kurze Seite = 1080 Einheiten).
//  Die Ausgabeauflösung skaliert nur das Bild – die Physik bleibt identisch.
// =====================================================================
const ASPECTS = {
  '9:16': { w: 1080, h: 1920, label: 'Hochkant' },
  '16:9': { w: 1920, h: 1080, label: 'Querformat' },
  '1:1': { w: 1080, h: 1080, label: 'Quadrat' },
};
const RESOLUTIONS = { 720: '720p', 1080: '1080p', 1440: '1440p', 2160: '4K' }; // kurze Bildseite in Pixeln
const FPS_OPTIONS = [30, 60];
const X264_PRESETS = ['ultrafast', 'superfast', 'veryfast', 'faster', 'fast', 'medium', 'slow', 'slower', 'veryslow'];

function videoSize(video) {
  const a = ASPECTS[video.aspect] || ASPECTS['9:16'];
  const scale = (video.resolution || 1080) / 1080;
  const even = (v) => 2 * Math.round(v / 2);
  return { logicalWidth: a.w, logicalHeight: a.h, scale, width: even(a.w * scale), height: even(a.h * scale) };
}

// =====================================================================
//  Hilfsfunktionen
// =====================================================================
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const angleDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const num = (v, d) => (v !== null && v !== '' && Number.isFinite(+v) ? +v : d);
const bool = (v, d) => (v === undefined || v === null || v === '' ? d : !(v === false || v === 'false' || v === 0 || v === '0'));
function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
const hashSeed = (...p) => fnv1a(p.join('|'));
function lerpColor(a, b, t) {
  const ar = a >> 16 & 255, ag = a >> 8 & 255, ab = a & 255, br = b >> 16 & 255, bg = b >> 8 & 255, bb = b & 255;
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
}
function fmtTime(s) {
  s = Math.floor(s); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return (h ? h + ':' + String(m).padStart(2, '0') : String(m).padStart(2, '0')) + ':' + String(x).padStart(2, '0');
}
const fmtInt = (n) => Math.round(n).toLocaleString('de-DE');
const isObj = (o) => o && typeof o === 'object' && !Array.isArray(o);
function deepMerge(a, b) {
  const out = { ...(a || {}) };
  for (const [k, v] of Object.entries(b || {})) out[k] = isObj(v) && isObj(out[k]) ? deepMerge(out[k], v) : v;
  return out;
}

// Deterministischer Zufallsgenerator (mulberry32)
class RNG {
  constructor(seed) { this.s = seed >>> 0; }
  next() {
    let t = (this.s = (this.s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(a, b) { return a + (b - a) * this.next(); }
  int(a, b) { return a + Math.floor(this.next() * (b - a + 1)); }
  normal() { return (this.next() + this.next() + this.next() + this.next() - 2) * 1.7320508; }
}

// =====================================================================
//  Szenario-Registry
//  Ein Szenario liefert:
//    id, title, defaults, controls[], normalizeParams(p),
//    create({ seed, params, world, view }) -> Simulation
//    createRenderer({ app, sim, view, world, renderScale }) -> Renderer
//    panelStats(sim) -> [{ key, label, value }]
//  Simulation:  stepOnce(), t, step, snapshot(), checkInvariants(), stateHash(), destroy(),
//               optional setParam(k, v), events/eventSeq
//  Renderer:    root (PIXI.Container), draw(), destroy()
// =====================================================================
const scenarios = new Map();
let defaultScenario = null;
function registerScenario(def) {
  for (const k of ['id', 'title', 'defaults', 'normalizeParams', 'create', 'createRenderer']) {
    if (!def[k]) throw new Error(`Szenario unvollständig: "${k}" fehlt`);
  }
  def.controls = def.controls || [];
  scenarios.set(def.id, def);
  if (!defaultScenario) defaultScenario = def.id;
  return def;
}
const getScenario = (id) => scenarios.get(id) || scenarios.get(defaultScenario);

// =====================================================================
//  Konfiguration (Schema-Version 1)
//  {
//    version: 1, name?, scenario, seed,
//    params: { ...szenariospezifisch },
//    video:  { aspect, resolution, fps, durationSec, quality: { crf, preset, bitrate } },
//    view:   { hud, camera }
//  }
//  Das flache Phase-A-Format ({ seed, ships, format: 'landscape', hud, ... }) wird weiterhin akzeptiert.
// =====================================================================
const CONFIG_VERSION = 1;
const VIDEO_KEYS = ['aspect', 'resolution', 'fps', 'durationSec'];
const QUALITY_KEYS = ['crf', 'preset', 'bitrate'];
const VIEW_KEYS = ['hud', 'camera'];
const TOP_KEYS = ['version', 'name', 'description', 'scenario', 'seed'];

/** Bringt eine (teilweise, ggf. flache) Konfiguration in die verschachtelte Form – ohne Standardwerte. */
function liftConfig(o) {
  o = o || {};
  const out = {
    params: { ...(o.params || {}) },
    video: { ...(o.video || {}), quality: { ...((o.video && o.video.quality) || {}) } },
    view: { ...(o.view || {}) },
  };
  for (const [k, v] of Object.entries(o)) {
    if (k === 'params' || k === 'video' || k === 'view') continue;
    if (TOP_KEYS.includes(k)) out[k] = v;
    else if (k === 'format') out.video.aspect = v === 'landscape' ? '16:9' : v === 'square' ? '1:1' : '9:16';
    else if (VIDEO_KEYS.includes(k)) out.video[k] = v;
    else if (QUALITY_KEYS.includes(k)) out.video.quality[k] = v;
    else if (VIEW_KEYS.includes(k)) out.view[k] = v;
    else out.params[k] = v;
  }
  return out;
}

/** Bitrate in kbit/s aus Zahl oder Text ("8M", "8000k", "8000"). null = Qualität über CRF. */
function parseBitrate(v) {
  if (v === undefined || v === null || v === '' || v === false) return null;
  const m = String(v).trim().match(/^(\d+(?:\.\d+)?)\s*([kKmM])?/);
  if (!m) return null;
  const n = parseFloat(m[1]) * (/m/i.test(m[2] || '') ? 1000 : 1);
  return n > 0 ? clamp(Math.round(n), 300, 200000) : null;
}

function normalizeConfig(input) {
  const o = liftConfig(input);
  const sc = getScenario(o.scenario);
  if (!sc) throw new Error('Kein Szenario registriert.');
  const v = o.video, q = v.quality;
  return {
    version: CONFIG_VERSION,
    ...(o.name ? { name: String(o.name) } : {}),
    scenario: sc.id,
    seed: Math.abs(Math.floor(num(o.seed, 42))) >>> 0,
    params: sc.normalizeParams({ ...sc.defaults, ...o.params }),
    video: {
      aspect: ASPECTS[v.aspect] ? v.aspect : '9:16',
      resolution: RESOLUTIONS[+v.resolution] ? +v.resolution : 1080,
      fps: FPS_OPTIONS.includes(+v.fps) ? +v.fps : 30,
      durationSec: clamp(num(v.durationSec, 3600), 1, 4 * 3600),
      quality: {
        crf: clamp(Math.round(num(q.crf, 20)), 0, 51),
        preset: X264_PRESETS.includes(q.preset) ? q.preset : 'medium',
        bitrate: parseBitrate(q.bitrate),
      },
    },
    view: { hud: bool(o.view.hud, true), camera: bool(o.view.camera, true) },
  };
}
/** Überschreibt eine bestehende Konfiguration teilweise (flach oder verschachtelt). */
const mergeConfig = (base, override) => normalizeConfig(deepMerge(liftConfig(base), liftConfig(override)));

// =====================================================================
//  Partikel (fester Pool, keine Allokation zur Laufzeit)
// =====================================================================
const FX = {
  T_SOFT: 0, T_SPARK: 1, T_SPLINTER: 2, T_DROP: 3, T_RING: 4, T_BUBBLE: 5,
  F_BUBBLE: 1, F_DROPLET: 2, F_FADEIN: 4,
};
class Particles {
  constructor(cap) {
    const F = Float32Array;
    this.cap = cap;
    for (const k of ['x', 'y', 'vx', 'vy', 'life', 'max', 's0', 's1', 'a0', 'grav', 'drag', 'rot', 'vr']) this[k] = new F(cap);
    this.color = new Uint32Array(cap); this.tex = new Uint8Array(cap); this.add = new Uint8Array(cap);
    this.flags = new Uint8Array(cap); this.alive = new Uint8Array(cap);
    this.head = 0; this.active = 0;
  }
  spawn(x, y, vx, vy, life, s0, s1, a0, color, tex, add, grav, drag, vr, flags) {
    const i = this.head; this.head = (this.head + 1) % this.cap;
    if (!this.alive[i]) this.active++;
    this.alive[i] = 1; this.x[i] = x; this.y[i] = y; this.vx[i] = vx; this.vy[i] = vy;
    this.life[i] = life; this.max[i] = life; this.s0[i] = s0; this.s1[i] = s1; this.a0[i] = a0;
    this.color[i] = color; this.tex[i] = tex; this.add[i] = add; this.grav[i] = grav; this.drag[i] = drag;
    this.rot[i] = 0; this.vr[i] = vr; this.flags[i] = flags;
  }
  /** surface(x) -> y der Wasseroberfläche (optional; nur für Blasen/Tropfen) */
  update(dt, surface) {
    for (let i = 0; i < this.cap; i++) {
      if (!this.alive[i]) continue;
      if ((this.life[i] -= dt) <= 0) { this.alive[i] = 0; this.active--; continue; }
      const d = this.drag[i] ? Math.exp(-this.drag[i] * dt) : 1;
      this.vx[i] *= d; this.vy[i] = this.vy[i] * d + this.grav[i] * dt;
      this.x[i] += this.vx[i] * dt; this.y[i] += this.vy[i] * dt; this.rot[i] += this.vr[i] * dt;
      const fl = this.flags[i];
      if (surface && (fl & (FX.F_BUBBLE | FX.F_DROPLET))) {
        const sy = surface(this.x[i]);
        if (((fl & FX.F_BUBBLE) && this.y[i] < sy + 2) || ((fl & FX.F_DROPLET) && this.vy[i] > 0 && this.y[i] > sy)) {
          this.alive[i] = 0; this.active--;
        }
      }
    }
  }
}

// =====================================================================
//  Grafik-Helfer (PixiJS)
// =====================================================================
/** Textur aus einer 2D-Canvas-Zeichnung. scale > 1 erzeugt mehr Pixel bei gleicher logischer Größe (4K-tauglich). */
function canvasTex(w, h, draw, scale = 1) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w * scale); c.height = Math.ceil(h * scale);
  const g = c.getContext('2d');
  g.scale(scale, scale);
  draw(g, w, h);
  if (scale === 1) return PIXI.Texture.from(c);
  return new PIXI.Texture({ source: new PIXI.CanvasSource({ resource: c, resolution: scale }) });
}
let particleTextures = null;
function getParticleTextures() {
  if (particleTextures) return particleTextures;
  const t = [];
  t[FX.T_SOFT] = canvasTex(64, 64, (g) => {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  });
  t[FX.T_SPARK] = canvasTex(16, 16, (g) => {
    const gr = g.createRadialGradient(8, 8, 0, 8, 8, 8);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 16, 16);
  });
  t[FX.T_SPLINTER] = canvasTex(16, 6, (g) => { g.fillStyle = '#fff'; g.fillRect(0, 1, 16, 4); });
  t[FX.T_DROP] = canvasTex(16, 16, (g) => {
    const gr = g.createRadialGradient(6, 6, 0, 8, 8, 8);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.75, 'rgba(255,255,255,.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(8, 8, 8, 0, 6.283); g.fill();
  });
  t[FX.T_RING] = canvasTex(128, 32, (g) => {
    g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 3;
    g.beginPath(); g.ellipse(64, 16, 60, 12, 0, 0, 6.283); g.stroke();
  });
  t[FX.T_BUBBLE] = canvasTex(16, 16, (g) => {
    g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 1.6; g.beginPath(); g.arc(8, 8, 6.2, 0, 6.283); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.8)'; g.beginPath(); g.arc(6, 6, 1.7, 0, 6.283); g.fill();
  });
  return (particleTextures = t);
}
const TEX_BASE = { [FX.T_RING]: 128, [FX.T_SOFT]: 64 };

/** Zeichnet einen Particles-Pool mit festem Sprite-Pool (zwei Ebenen: normal + additiv). */
class ParticleView {
  constructor(particles) {
    const tex = (this.tex = getParticleTextures());
    this.P = particles;
    this.normal = new PIXI.Container(); this.add = new PIXI.Container();
    this.sprites = [];
    for (let i = 0; i < particles.cap; i++) {
      const n = new PIXI.Sprite(tex[FX.T_SOFT]), a = new PIXI.Sprite(tex[FX.T_SOFT]);
      n.anchor.set(0.5); a.anchor.set(0.5); a.blendMode = 'add'; n.visible = a.visible = false;
      this.normal.addChild(n); this.add.addChild(a);
      this.sprites.push({ n, a, tn: FX.T_SOFT, ta: FX.T_SOFT });
    }
  }
  draw() {
    const P = this.P, tex = this.tex;
    for (let i = 0; i < P.cap; i++) {
      const ps = this.sprites[i];
      if (!P.alive[i]) { if (ps.n.visible) ps.n.visible = false; if (ps.a.visible) ps.a.visible = false; continue; }
      const add = P.add[i], sp = add ? ps.a : ps.n, other = add ? ps.n : ps.a;
      if (other.visible) other.visible = false;
      sp.visible = true;
      const tx = P.tex[i];
      if (add ? ps.ta !== tx : ps.tn !== tx) { sp.texture = tex[tx]; if (add) ps.ta = tx; else ps.tn = tx; }
      const k = P.life[i] / P.max[i], size = P.s0[i] + (P.s1[i] - P.s0[i]) * (1 - k);
      let a = P.a0[i] * (tx === FX.T_SPLINTER || tx === FX.T_DROP ? Math.min(1, k * 3) : k);
      if (P.flags[i] & FX.F_FADEIN) a *= Math.min(1, (1 - k) * P.max[i] / 0.15);
      sp.position.set(P.x[i], P.y[i]); sp.rotation = P.rot[i]; sp.alpha = a; sp.tint = P.color[i];
      sp.scale.set(size / (TEX_BASE[tx] || 16));
    }
  }
}

// =====================================================================
//  Bühne + Session
// =====================================================================
/** Erzeugt die PixiJS-Anwendung: logische Weltgröße, Pixelgröße = logisch × renderScale. */
async function createStage(world, { renderScale = 1, exportMode = false } = {}) {
  const app = new PIXI.Application();
  await app.init({
    width: world.w, height: world.h, resolution: renderScale, autoDensity: false,
    background: 0x04070f, antialias: true, autoStart: false, preference: 'webgl',
    preserveDrawingBuffer: exportMode, powerPreference: 'high-performance', hello: false,
  });
  return app;
}
function glRendererName(app) {
  try {
    const gl = app.renderer.gl, ext = gl.getExtension('WEBGL_debug_renderer_info');
    return String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
  } catch { return 'unbekannt'; }
}

/** Verbindet Szenario-Simulation und -Renderer mit der Bühne. Szenariounabhängig. */
class Session {
  /** renderScale: feste Bildskalierung (Live-Vorschau) oder null = aus cfg.video.resolution ableiten (Export). */
  constructor(app, { renderScale = null } = {}) { this.app = app; this.fixedScale = renderScale; this.renderScale = renderScale || 1; }
  start(cfgIn) {
    const cfg = normalizeConfig(cfgIn);
    this.dispose();
    this.renderScale = this.fixedScale || videoSize(cfg.video).scale;
    const sc = getScenario(cfg.scenario), a = ASPECTS[cfg.video.aspect], world = { w: a.w, h: a.h };
    const r = this.app.renderer;
    if (r.width !== world.w || r.height !== world.h || r.resolution !== this.renderScale) r.resize(world.w, world.h, this.renderScale);
    this.cfg = cfg; this.scenario = sc; this.world = world;
    this.view = { ...cfg.view };
    this.sim = sc.create({ seed: cfg.seed, params: { ...cfg.params }, world, view: this.view });
    this.renderer = sc.createRenderer({ app: this.app, sim: this.sim, view: this.view, world, renderScale: this.renderScale });
    this.app.stage.addChild(this.renderer.root);
    this.render();
    return this;
  }
  step() { this.sim.stepOnce(); }
  /** Rechnet genau die Physikschritte für einen Videoframe bei der Bildrate fps. */
  advanceFrame(fps) { const n = PHYS_HZ / fps; for (let i = 0; i < n; i++) this.sim.stepOnce(); }
  render() { this.renderer.draw(); this.app.renderer.render(this.app.stage); }
  setParam(key, value) {
    this.cfg.params[key] = value;
    if (this.sim.setParam) this.sim.setParam(key, value); else this.sim.cfg[key] = value;
  }
  setView(key, value) { this.cfg.view[key] = value; this.view[key] = value; }
  dispose() {
    if (this.renderer) { this.app.stage.removeChild(this.renderer.root); this.renderer.destroy(); }
    if (this.sim && this.sim.destroy) this.sim.destroy();
    this.renderer = this.sim = null;
  }
}

/** Steuerschnittstelle für den Node-Exporter (window.exportAPI). Szenariounabhängig. */
function installExportAPI(session, extra = {}) {
  const api = global.exportAPI || (global.exportAPI = {});
  Object.assign(api, {
    info: () => {
      const vs = videoSize(session.cfg.video);
      return {
        cfg: session.cfg, scenario: session.cfg.scenario, scenarioTitle: session.scenario.title,
        width: session.app.canvas.width, height: session.app.canvas.height, expected: vs,
        fps: session.cfg.video.fps, physHz: PHYS_HZ, pixi: PIXI.VERSION, matter: global.Matter ? Matter.version : null,
        renderer: session.app.renderer.name, glRenderer: glRendererName(session.app),
      };
    },
    // n Videoframes: je Frame feste Physikschritte, dann Bild als JPEG/PNG (Base64 ohne Präfix)
    renderFrames(n, quality = 0.92, type = 'image/jpeg') {
      const out = new Array(n), fps = session.cfg.video.fps;
      for (let i = 0; i < n; i++) {
        session.advanceFrame(fps);
        session.render();
        const url = session.app.canvas.toDataURL(type, quality);
        out[i] = url.slice(url.indexOf(',') + 1);
      }
      return out;
    },
    simulate(seconds) { const n = Math.round(seconds * PHYS_HZ); for (let i = 0; i < n; i++) session.step(); return session.sim.snapshot(); },
    snapshot: () => session.sim.snapshot(),
    check: () => session.sim.checkInvariants(),
    hash: () => session.sim.stateHash(),
    config: () => session.cfg,
    restart(c) { session.start(mergeConfig(session.cfg, c || {})); return session.sim.snapshot(); },
    heap: () => (performance.memory ? performance.memory.usedJSHeapSize : null),
    events: (since) => (session.sim.events || []).filter((e) => e && e.seq >= since).sort((a, b) => a.seq - b.seq),
    scenarios: () => [...scenarios.values()].map((s) => ({ id: s.id, title: s.title })),
    ...extra,
  });
  return api;
}

Object.assign(EBS, {
  PHYS_HZ, DT, DT_MS, CONFIG_VERSION, ASPECTS, RESOLUTIONS, FPS_OPTIONS, X264_PRESETS, FX,
  videoSize, normalizeConfig, mergeConfig, liftConfig, parseBitrate, deepMerge,
  registerScenario, getScenario, scenarios,
  util: { clamp, lerp, angleDiff, num, bool, fnv1a, hashSeed, lerpColor, fmtTime, fmtInt },
  RNG, Particles, ParticleView, canvasTex, getParticleTextures,
  createStage, glRendererName, Session, installExportAPI,
});
})(window);
