/* A separate production scenario. Classic Marble is never read or modified here. */
(function () {
  'use strict';
  const P = EBS.MarbleProduction;
  const sc = { id: 'marbleworks', title: 'Marble Works · Progressive Factory' };
  const { clamp, num, fmtInt } = EBS.util;
  const choice = (v, values, fallback) => values.includes(v) ? v : fallback;
  const defaults = {
    material: 'glass', product: 'swirl', palette: 'spectrum', exportLength: 'order',
    orderSize: 144, productionSpeed: 1, intensity: 1,
    cameraMode: 'auto', cameraPosition: 50, cameraZoom: 1,
  };
  sc.defaults = defaults;
  sc.controls = [
    { key: 'material', label: 'Material', type: 'select', restart: true,
      options: [['glass', 'Glas'], ['steel', 'Stahl'], ['rubber', 'Gummi'], ['mixed', 'Materialvergleich']] },
    { key: 'product', label: 'Veredelung', type: 'select', restart: true,
      options: [['swirl', 'Farbspirale'], ['clear', 'Klarglas / Vollton'], ['pearl', 'Perlmutt']] },
    { key: 'palette', label: 'Kollektion', type: 'select', restart: true,
      options: [['spectrum', 'Spektrum'], ['ocean', 'Ozean'], ['ember', 'Glut']] },
    { key: 'orderSize', label: 'Produktionsauftrag · Kugeln', type: 'range', restart: true, min: 24, max: 360, step: 6, format: String },
    { key: 'productionSpeed', label: 'Maschinengeschwindigkeit', type: 'range', restart: true, min: .5, max: 2, step: .1, format: v => v.toFixed(1) + '×' },
    { key: 'intensity', label: 'Zuführung / Produktionsdruck', type: 'range', restart: true, min: .5, max: 2, step: .1, format: v => v.toFixed(1) + '×' },
    { key: 'exportLength', label: 'Videoende', type: 'select', affectsDuration: true,
      options: [['order', 'Vollständiger Auftrag + Finale (automatisch)'], ['duration', 'Eingestellte Videolänge (Test / Ausschnitt)']] },
    { key: 'cameraMode', label: 'Kameraführung', type: 'select',
      options: [['auto', 'Automatisch · Cinematisch'], ['overview', 'Gesamtübersicht'], ['manual', 'Manuell']] },
    { key: 'cameraPosition', label: 'Kamera · Position entlang der Anlage', type: 'range', min: 0, max: 100, step: 1,
      enabled: p => p.cameraMode === 'manual', format: v => v + ' %' },
    { key: 'cameraZoom', label: 'Kamera · Ausschnitt', type: 'range', min: .7, max: 1.7, step: .05,
      enabled: p => p.cameraMode === 'manual', format: v => v.toFixed(2) + '×' },
  ];
  sc.normalizeParams = p => ({
    material: choice(p.material, ['glass', 'steel', 'rubber', 'mixed'], 'glass'),
    product: choice(p.product, ['swirl', 'clear', 'pearl'], 'swirl'),
    palette: choice(p.palette, ['spectrum', 'ocean', 'ember'], 'spectrum'),
    exportLength: choice(p.exportLength, ['order', 'duration'], 'order'),
    orderSize: clamp(Math.round(num(p.orderSize, 144)), 24, 360),
    productionSpeed: clamp(num(p.productionSpeed, 1), .5, 2),
    intensity: clamp(num(p.intensity, 1), .5, 2),
    cameraMode: choice(p.cameraMode, ['auto', 'overview', 'manual'], 'auto'),
    cameraPosition: clamp(num(p.cameraPosition, 50), 0, 100),
    cameraZoom: clamp(num(p.cameraZoom, 1), .7, 1.7),
  });
  sc.create = ctx => new P.Simulation(ctx);
  sc.createRenderer = ctx => new P.Renderer(ctx);
  sc.reframe = (renderer, ctx) => renderer.resize(ctx.world, ctx.renderScale);
  sc.hasNaturalDuration = cfg => cfg.params.exportLength === 'order';
  sc.durationLabel = { pending: 'Produktionsdauer wird berechnet …', complete: 'Automatisch: vollständiger Auftrag und 12 Sekunden Fabrikfinale (bei Zeitlupe entsprechend länger).' };
  sc.supportsClips = true;
  // Plan the real order using the same model and fixed ticks; video length never drives unlocks.
  sc.createExportPlan = cfg => {
    if (!sc.hasNaturalDuration(cfg)) return null;
    const sim = new P.Simulation({ seed: cfg.seed, params: cfg.params, timeScale: cfg.video.tempo });
    return { advance() {
      for (let i = 0; i < 1800 && sim.completedAt == null; i++) sim.stepOnce();
      if (sim.step * EBS.DT > EBS.MAX_DURATION - 12) throw new Error('Produktionsauftrag überschreitet die maximale Videolänge.');
      if (sim.completedAt == null) return { done: false };
      const durationSec = Math.ceil(sim.step * EBS.DT + 12 / cfg.video.tempo);
      sim.destroy();
      return { done: true, durationSec };
    } };
  };
  P.preset = (kind, seed = 42) => ({ version: 1, scenario: sc.id, seed,
    name: kind === 'short' ? 'Progressive Glassworks · Mini-Auftrag' : 'Progressive Glassworks · Von der Rohkugel zur Kollektion',
    params: { exportLength: 'order', material: 'glass', product: 'swirl', palette: 'spectrum',
      orderSize: kind === 'short' ? 24 : 144, productionSpeed: kind === 'short' ? 2 : 1, intensity: kind === 'short' ? 2 : 1,
      cameraMode: 'auto' },
    video: { aspect: kind === 'short' ? '9:16' : '16:9', resolution: 1080, fps: 30,
      durationSec: kind === 'short' ? 90 : 480, tempo: 1, audio: true, quality: { crf: 20, preset: 'medium' } },
    view: { hud: true, camera: true } });
  sc.panelStats = sim => {
    const s = sim.snapshot();
    return [
      { key: 'completed', label: 'Fertiger Auftrag', value: `${fmtInt(s.completed)} / ${fmtInt(sim.orderSize)}` },
      { key: 'raw', label: 'Rohmaterial', value: fmtInt(s.counts.raw || 0) },
      { key: 'polished', label: 'Poliert', value: fmtInt(s.polished) },
      { key: 'inspected', label: 'Qualitätsgeprüft', value: fmtInt(s.inspected) },
      { key: 'level', label: 'Ausbaustufe', value: `${sim.level + 1} / 3` },
      { key: 'queue', label: 'Größter Rückstau', value: fmtInt(s.maxQueue) },
    ];
  };
  sc.panelNote = sim => sim.snapshot().summary;
  sc.audio = { events: P.audioEvents };
  EBS.registerScenario(sc);
})();
