/* A quiet, daylight workshop around the production diorama.
 * Static surface detail has its own fixed seed and never touches production RNG. */
(function () {
  'use strict';
  const P = EBS.MarbleProduction, T = THREE;
  P.buildProductionEnvironment3D = function (kit, scene) {
    const owned = [], { box, material } = kit;
    const own = value => { owned.push(value); return value; };
    const grain = document.createElement('canvas'); grain.width = grain.height = 512;
    const g = grain.getContext('2d'), pixels = g.createImageData(512, 512);
    let state = 192783;
    const random = () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 4294967296; };
    for (let i = 0; i < pixels.data.length; i += 4) {
      const shade = 232 + Math.round((random() + random() - 1) * 8);
      pixels.data[i] = shade + 2; pixels.data[i + 1] = shade + 1; pixels.data[i + 2] = shade; pixels.data[i + 3] = 255;
    }
    g.putImageData(pixels, 0, 0);
    // Tiny aggregate grains keep the mineral surface visible without a busy pattern.
    for (let i = 0; i < 550; i++) {
      g.fillStyle = i % 2 ? '#8f877713' : '#fff7df2b';
      g.beginPath(); g.ellipse(random() * 512, random() * 512, .6 + random() * 1.1, .4 + random() * .7, random() * 6.28, 0, Math.PI * 2); g.fill();
    }
    const texture = own(new T.CanvasTexture(grain)); texture.colorSpace = T.SRGBColorSpace;
    texture.wrapS = texture.wrapT = T.RepeatWrapping; texture.repeat.set(24, 24); texture.anisotropy = 4;
    const floorMaterial = material(0xb8ab95, .92, 0, { map: texture, bumpMap: texture, bumpScale: .004 });
    const floor = new T.Mesh(own(new T.PlaneGeometry(180, 180)), floorMaterial);
    floor.rotation.x = -Math.PI / 2; floor.position.y = -.95; floor.receiveShadow = true; scene.add(floor);
    const slabTexture = own(texture.clone()); slabTexture.repeat.set(8, 3); slabTexture.needsUpdate = true;
    const zoneTexture = own(texture.clone()); zoneTexture.repeat.set(2, 4); zoneTexture.needsUpdate = true;
    const slabMaterial = material(0xc8bba5, .78, .02, { map: slabTexture, bumpMap: slabTexture, bumpScale: .003 });
    const zoneMaterial = material(0xc6c5b6, .8, .02, { map: zoneTexture, bumpMap: zoneTexture, bumpScale: .003 });
    const joint = material(0x9c927f, .95);
    for (let x = -78; x <= 78; x += 12) box(scene, .018, .003, 120, x, -.947, -2, joint, 0);
    for (let z = -62; z <= 58; z += 12) box(scene, 168, .003, .018, 0, -.946, z, joint, 0);

    const plasterTexture = own(texture.clone()); plasterTexture.repeat.set(12, 2); plasterTexture.needsUpdate = true;
    const sage = material(0x8b9785, .94, 0, { map: plasterTexture, bumpMap: plasterTexture, bumpScale: .004 });
    const trim = material(0x737f70, .8), sill = material(0xb7aa91, .7);
    const frame = material(0x756b57, .52, .12);
    const wallZ = -20;
    box(scene, 144, 20, .45, 0, 9.05, wallZ, sage, .08);
    box(scene, 144, .38, .65, 0, -.38, wallZ + .15, trim, .03);
    box(scene, 144, .12, .57, 0, 2.3, wallZ + .16, sill, .02);

    const windowCanvas = document.createElement('canvas'); windowCanvas.width = 256; windowCanvas.height = 384;
    const sky = windowCanvas.getContext('2d'), wash = sky.createLinearGradient(0, 0, 0, 384);
    wash.addColorStop(0, '#c0d3cf'); wash.addColorStop(.48, '#e0e3d3'); wash.addColorStop(1, '#e8d8b7');
    sky.fillStyle = wash; sky.fillRect(0, 0, 256, 384);
    const glow = sky.createRadialGradient(70, 80, 0, 70, 80, 300); glow.addColorStop(0, '#fff2ce70'); glow.addColorStop(1, '#fff2ce00');
    sky.fillStyle = glow; sky.fillRect(0, 0, 256, 384);
    const windowMap = own(new T.CanvasTexture(windowCanvas)); windowMap.colorSpace = T.SRGBColorSpace;
    const windowMaterial = own(new T.MeshBasicMaterial({ map: windowMap, toneMapped: false }));
    const windowGeometry = own(new T.PlaneGeometry(10.6, 7.2));
    for (let x = -63; x <= 63; x += 18) {
      // Deep reveals, broad panes and warm frames give a readable architectural scale.
      box(scene, 11.4, 8, .36, x, 8.4, wallZ + .38, trim, .08);
      const pane = new T.Mesh(windowGeometry, windowMaterial); pane.position.set(x, 8.4, wallZ + .6); scene.add(pane);
      for (const dx of [-5.4, 0, 5.4]) box(scene, .14, 7.6, .22, x + dx, 8.4, wallZ + .72, frame, .025);
      for (const dy of [-3.7, .25, 3.7]) box(scene, 10.9, .14, .22, x, 8.4 + dy, wallZ + .72, frame, .025);
      box(scene, 11.7, .24, .95, x, 4.55, wallZ + .63, sill, .04);
      box(scene, .42, 17, .6, x + 8.8, 7.55, wallZ + .36, trim, .04);
    }
    // A very soft pool of daylight along the wall; no moving background effects.
    const lightCanvas = document.createElement('canvas'); lightCanvas.width = lightCanvas.height = 128;
    const lg = lightCanvas.getContext('2d'), fade = lg.createRadialGradient(64, 64, 12, 64, 64, 64);
    fade.addColorStop(0, '#fff1ca32'); fade.addColorStop(.6, '#fff1ca15'); fade.addColorStop(1, '#fff1ca00');
    lg.fillStyle = fade; lg.fillRect(0, 0, 128, 128);
    const lightMap = own(new T.CanvasTexture(lightCanvas));
    const lightMaterial = own(new T.MeshBasicMaterial({ map: lightMap, transparent: true, depthWrite: false, toneMapped: false }));
    const lightGeometry = own(new T.PlaneGeometry(14, 12));
    for (let x = -54; x <= 54; x += 18) {
      const pool = new T.Mesh(lightGeometry, lightMaterial); pool.rotation.x = -Math.PI / 2; pool.rotation.z = -.25;
      pool.position.set(x, -.94, -13); scene.add(pool);
    }
    return { slabMaterial, zoneMaterial, dispose() { owned.forEach(value => value.dispose()); } };
  };
})();
