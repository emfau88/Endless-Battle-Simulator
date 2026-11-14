/* Sparse process effects, analytically reconstructed from production state.
 * No particle clock, random source or event consumer can influence the model. */
(function () {
  'use strict';
  const P = EBS.MarbleProduction;
  const TAU = Math.PI * 2;
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
  const fract = x => x - Math.floor(x);

  P.buildProductionEffects3D = function (kit, scene, initialState) {
    const { T } = kit;
    const root = new T.Group();
    root.name = 'Production process effects';
    root.userData.factoryEffects = true;
    scene.add(root);
    const resources = [];
    const stats = { sprayParticles: 0, glints: 0, heatRibbons: 0, activeSprayers: 0, activeAnnealers: 0 };
    const white = new T.Color(0xfff6dd);
    const tint = new T.Color(), right = new T.Vector3(), up = new T.Vector3(), towardsCamera = new T.Vector3();
    const vertexShader = [
      'attribute vec3 effectOffset;',
      'attribute vec2 effectSize;',
      'attribute vec3 effectColour;',
      'attribute float effectAlpha;',
      'attribute float effectRotation;',
      'attribute float effectPhase;',
      'varying vec2 vUv;',
      'varying vec3 vColour;',
      'varying float vAlpha;',
      'varying float vPhase;',
      'void main() {',
      '  vUv = uv; vColour = effectColour; vAlpha = effectAlpha; vPhase = effectPhase;',
      '  vec2 local = position.xy * effectSize;',
      '  float c = cos(effectRotation), s = sin(effectRotation);',
      '  vec4 centre = modelViewMatrix * vec4(effectOffset, 1.0);',
      '  centre.xy += mat2(c, -s, s, c) * local;',
      '  gl_Position = projectionMatrix * centre;',
      '}'
    ].join('\n');
    const fragmentShader = [
      'uniform float kind;',
      'varying vec2 vUv;',
      'varying vec3 vColour;',
      'varying float vAlpha;',
      'varying float vPhase;',
      'void main() {',
      '  vec2 p = vUv - 0.5;',
      '  float a;',
      '  if (kind < 0.5) {',
      '    a = exp(-dot(p,p) * 19.0) * (1.0-smoothstep(0.34,0.5,length(p)));',
      '  } else if (kind < 1.5) {',
      '    vec2 q = max(vec2(0.0), 1.0-abs(p)*2.0);',
      '    a = pow(q.x,20.0)*pow(q.y,2.5) + pow(q.y,20.0)*pow(q.x,2.5);',
      '    a += 0.12*exp(-dot(p,p)*60.0);',
      '  } else {',
      '    float wave = 0.18*sin(vUv.y*8.0+vPhase);',
      '    float d = p.x-wave;',
      '    a = exp(-d*d*115.0) * pow(max(0.0,sin(vUv.y*3.14159265)),1.5);',
      '  }',
      '  gl_FragColor = vec4(vColour, clamp(a*vAlpha,0.0,1.0));',
      '  if (gl_FragColor.a < 0.002) discard;',
      '  #include <tonemapping_fragment>',
      '  #include <colorspace_fragment>',
      '}'
    ].join('\n');

    function batch(capacity, kind, name) {
      const base = new T.PlaneGeometry(1, 1);
      const geometry = new T.InstancedBufferGeometry();
      geometry.setIndex(base.index.clone());
      geometry.setAttribute('position', base.attributes.position.clone());
      geometry.setAttribute('uv', base.attributes.uv.clone());
      base.dispose();
      const attrs = {};
      for (const [key, width] of [['Offset', 3], ['Size', 2], ['Colour', 3], ['Alpha', 1], ['Rotation', 1], ['Phase', 1]]) {
        const attribute = new T.InstancedBufferAttribute(new Float32Array(capacity * width), width);
        attribute.setUsage(T.DynamicDrawUsage);
        geometry.setAttribute('effect' + key, attribute); attrs[key] = attribute;
      }
      const material = new T.ShaderMaterial({
        vertexShader, fragmentShader, uniforms: { kind: { value: kind } },
        transparent: true, depthWrite: false, depthTest: true, side: T.DoubleSide,
        blending: T.NormalBlending, toneMapped: true
      });
      const mesh = new T.Mesh(geometry, material); mesh.frustumCulled = false;
      mesh.name = name; mesh.renderOrder = 5; root.add(mesh);
      resources.push(geometry, material);
      return {
        mesh, attrs, used: 0,
        begin() { this.used = 0; },
        add(x, y, z, w, h, colour, alpha, rotation = 0, phase = 0) {
          if (this.used >= capacity || alpha <= .002) return;
          const i = this.used++;
          attrs.Offset.setXYZ(i, x, y, z); attrs.Size.setXY(i, w, h);
          attrs.Colour.setXYZ(i, colour.r, colour.g, colour.b); attrs.Alpha.setX(i, alpha);
          attrs.Rotation.setX(i, rotation); attrs.Phase.setX(i, phase);
        },
        end() {
          geometry.instanceCount = this.used; mesh.visible = this.used > 0;
          for (const a of Object.values(attrs)) a.needsUpdate = true;
        }
      };
    }
    const spray = batch(44, 0, 'Short pigment mist');
    const glints = batch(2, 1, 'Polished marble glints');
    const warmth = batch(8, 2, 'Localized thermal shimmer');

    function update(sim, ballMeshes, camera) {
      spray.begin(); glints.begin(); warmth.begin();
      stats.activeSprayers = stats.activeAnnealers = 0;
      const colours = sim.colors || P.COLORS;
      const lastPolish = [null, null];
      // Release events remain in the model's bounded log. Reading them makes the
      // glint expire even if the freshly polished marble subsequently queues.
      for (const e of sim.events) {
        if (!e || e.type !== 'factoryRoll' || e.x !== 1500 || Math.abs(e.p - .7) > 1e-6) continue;
        const lane = e.y === 1050 ? 1 : e.y === 650 ? 0 : -1;
        if (lane >= 0 && (!lastPolish[lane] || e.step > lastPolish[lane].step)) lastPolish[lane] = e;
      }
      if (camera) {
        camera.updateMatrixWorld();
        right.setFromMatrixColumn(camera.matrixWorld, 0);
        up.setFromMatrixColumn(camera.matrixWorld, 1);
        towardsCamera.setFromMatrixColumn(camera.matrixWorld, 2);
      } else {
        right.set(1, 0, 0); up.set(0, 1, 0); towardsCamera.set(0, 0, 1);
      }
      for (let lane = 0; lane < 2; lane++) {
        if (lane && sim.level < 2) continue;
        const z = lane ? 3.6 : -3.6;
        const coat = sim.stations.coat[lane], p = coat.progress;
        if (sim.level > 0 && coat.ball?.finishLevel > 0 && p > .18 && p < .48) {
          const envelope = smooth((p - .18) / .045) * (1 - smooth((p - .41) / .07));
          const nozzleY = 4.395 - .12 * Math.sin(Math.PI * p);
          tint.setHex(colours[coat.ball.color].hex).lerp(white, .59);
          stats.activeSprayers++;
          for (let i = 0; i < 22; i++) {
            const q = fract(coat.elapsed * 3.7 + i * .61803398875 + coat.ball.id * .137);
            const angle = i * 2.39996323 + q * .65;
            const radius = .013 + q * (.12 + .055 * fract(i * .371));
            const size = .055 + q * .105;
            const fade = Math.sin(Math.PI * q);
            spray.add(-2.16 + Math.cos(angle) * radius, nozzleY - q * (nozzleY - 4.015),
              z + Math.sin(angle) * radius, size, size * .82, tint, envelope * fade * .43);
          }
        }
        const cooling = sim.stations.anneal[lane], hot = cooling.ball?.temperature || 0;
        if (cooling.ball && hot > .08 && cooling.progress < 1) {
          const envelope = smooth(cooling.elapsed / .22) * smooth((hot - .08) / .25);
          stats.activeAnnealers++;
          tint.setHex(0xffdeb4);
          for (let i = 0; i < 4; i++) {
            const phase = cooling.elapsed * 2.0 + i * 1.7 + cooling.ball.id * .31;
            const rise = fract(cooling.elapsed * .72 + i * .25);
            warmth.add(7.02 + Math.sin(phase) * .13, 4.08 + rise * .12,
              z + (i - 1.5) * .085, .18, .34, tint,
              envelope * hot * Math.sin(Math.PI * rise) * .16, .07 * Math.sin(phase), phase);
          }
        }
        const event = lastPolish[lane];
        const age = event ? (sim.step - event.step) * sim.dt : Infinity;
        if (age < 0 || age > .58) continue;
        const queue = sim.tracks.coat[lane].balls;
        const ball = queue[queue.length - 1];
        if (!ball || ball.material === 'rubber' || ball.color !== event.c || ball.material !== event.material) continue;
        const model = ballMeshes?.[ball.id]?.group;
        if (!model) continue;
        const fade = Math.sin(Math.PI * age / .58), size = .21 + .08 * fade;
        const pos = model.position;
        glints.add(pos.x - right.x * .11 + up.x * .12 + towardsCamera.x * .15,
          pos.y - right.y * .11 + up.y * .12 + towardsCamera.y * .15,
          pos.z - right.z * .11 + up.z * .12 + towardsCamera.z * .15,
          size, size, white, fade * .88, .24 + age * .32);
      }
      spray.end(); glints.end(); warmth.end();
      stats.sprayParticles = spray.used; stats.glints = glints.used; stats.heatRibbons = warmth.used;
      root.visible = spray.used + glints.used + warmth.used > 0;
    }

    update(initialState, null, null);
    return { root, stats, update, dispose() {
      scene.remove(root); resources.forEach(resource => resource.dispose()); root.clear();
    } };
  };
})();
