/* Shared, cached solid geometry for Marble Works. No simulation state lives here. */
(function () {
  'use strict';
  const P = EBS.MarbleProduction, T = THREE;
  // Display-only pigment concentration. Keep the production palette and hue
  // identity intact while making small reservoirs and glass inserts readable.
  P.pigmentColor = function (hex) {
    const color = new T.Color(hex), hsl = {};
    color.getHSL(hsl, T.SRGBColorSpace);
    return color.setHSL(hsl.h, Math.min(.98, Math.max(.82, hsl.s + .1)),
      T.MathUtils.clamp(hsl.l * .83, .42, .59), T.SRGBColorSpace);
  };
  P.createDioramaKit = function () {
    const geometry = new Map(), materials = new Set(), textures = new Set();
    const material = (color, roughness = .35, metalness = 0, extra = {}) => {
      const m = new T.MeshStandardMaterial({ color, roughness, metalness, ...extra }); materials.add(m); return m;
    };
    const mat = {
      ivory: material(0xeee9dc, .28, .15), white: material(0xfffaf0, .3),
      teal: material(0x24565b, .29, .55), tealLight: material(0x50858a, .3, .4),
      navy: material(0x183038, .33, .3), brass: material(0xbd9556, .25, .78),
      steel: material(0xa4b5bd, .23, .86), dark: material(0x1c282e, .48, .1),
      rubber: material(0x354248, .85), orange: material(0xd8753e, .35, .2),
    };
    mat.glass = new T.MeshPhysicalMaterial({ color: 0xd2e9e7, roughness: .08, metalness: 0,
      transparent: true, opacity: .15, side: T.DoubleSide, depthWrite: false, clearcoat: 1 });
    materials.add(mat.glass);
    const cached = (key, create) => { if (!geometry.has(key)) geometry.set(key, create()); return geometry.get(key); };
    function mesh(parent, geo, m, x, y, z) {
      const obj = new T.Mesh(geo, m); obj.position.set(x, y, z); obj.castShadow = !(m.transparent && m.opacity < .5); obj.receiveShadow = true;
      parent.add(obj); return obj;
    }
    function group(parent, x = 0, y = 0, z = 0) { const g = new T.Group(); g.position.set(x, y, z); parent.add(g); return g; }
    function box(parent, w, h, d, x, y, z, m = mat.ivory, bevel = .08) {
      const r = Math.min(bevel, w / 3, h / 3, d / 3);
      const geo = cached(`b${w},${h},${d},${r}`, () => {
        const g = new T.BoxGeometry(w, h, d, r ? 4 : 1, r ? 4 : 1, r ? 4 : 1), pos = g.attributes.position, normal = g.attributes.normal;
        if (r) for (let i = 0; i < pos.count; i++) {
          const v = new T.Vector3().fromBufferAttribute(pos, i);
          const c = new T.Vector3(T.MathUtils.clamp(v.x, -w / 2 + r, w / 2 - r), T.MathUtils.clamp(v.y, -h / 2 + r, h / 2 - r), T.MathUtils.clamp(v.z, -d / 2 + r, d / 2 - r));
          const n = v.clone().sub(c).normalize(); v.copy(c).addScaledVector(n, r); pos.setXYZ(i, v.x, v.y, v.z); normal.setXYZ(i, n.x, n.y, n.z);
        }
        return g;
      });
      return mesh(parent, geo, m, x, y, z);
    }
    function cylinder(parent, rt, rb, h, x, y, z, m = mat.steel, axis = 'y') {
      const o = mesh(parent, cached(`c${rt},${rb},${h}`, () => new T.CylinderGeometry(rt, rb, h, 32)), m, x, y, z);
      if (axis === 'x') o.rotation.z = Math.PI / 2; if (axis === 'z') o.rotation.x = Math.PI / 2; return o;
    }
    function sphere(parent, r, x, y, z, m = mat.steel) {
      return mesh(parent, cached(`s${r}`, () => new T.SphereGeometry(r, 32, 20)), m, x, y, z);
    }
    function torus(parent, r, tube, x, y, z, m = mat.brass, axis = 'z') {
      const o = mesh(parent, cached(`t${r},${tube}`, () => new T.TorusGeometry(r, tube, 10, 40)), m, x, y, z);
      if (axis === 'x') o.rotation.y = Math.PI / 2; if (axis === 'y') o.rotation.x = Math.PI / 2; return o;
    }
    function pipe(parent, points, radius = .07, m = mat.steel) {
      const curve = new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p)), false, 'centripetal');
      const geo = new T.TubeGeometry(curve, Math.max(12, points.length * 6), radius, 8, false); geometry.set(Symbol(), geo);
      return mesh(parent, geo, m, 0, 0, 0);
    }
    function label(parent, title, x, y, z, w = .9, h = .23, background = '#f4eee0', color = '#193c43') {
      const canvas = document.createElement('canvas'); canvas.width = Math.max(256, Math.round(w * 180)); canvas.height = Math.max(64, Math.round(h * 180));
      const g = canvas.getContext('2d'); g.fillStyle = background; g.fillRect(0, 0, canvas.width, canvas.height);
      g.fillStyle = color; g.font = `600 ${Math.round(canvas.height * .48)}px Arial`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(title, canvas.width / 2, canvas.height * .53, canvas.width * .9);
      const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace; textures.add(map);
      const m = new T.MeshBasicMaterial({ map, side: T.DoubleSide }); materials.add(m);
      const o = mesh(parent, cached(`p${w},${h}`, () => new T.PlaneGeometry(w, h)), m, x, y, z); o.castShadow = false; return o;
    }
    const kit = { T, mat, material, group, box, cylinder, sphere, torus, pipe, label,
      dispose() { geometry.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose()); } };
    return kit;
  };
})();
