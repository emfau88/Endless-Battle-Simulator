/* Solid mechanical silhouettes for the Marble Works diorama.
 * Every moving work head is driven by the corresponding production station.
 * This module only creates and poses meshes; it never advances the model. */
(function () {
  'use strict';
  const P = EBS.MarbleProduction;
  const TAU = Math.PI * 2;
  const ease = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };

  P.buildMachines3D = function (kit, root, sim) {
    const { T, mat: m, group, box, cylinder, sphere, torus, pipe, label } = kit;
    const owns = [], animation = [], secondLine = [];
    const palettes = sim.colors || P.COLORS;
    const pigments = palettes.map(c => {
      const material = new T.MeshPhysicalMaterial({ color: P.pigmentColor(c.hex), roughness: .2,
        metalness: .025, clearcoat: 1, clearcoatRoughness: .09, envMapIntensity: .55,
        iridescence: .08, iridescenceIOR: 1.3, iridescenceThicknessRange: [180, 270] });
      owns.push(material); return material;
    });
    const copper = new T.MeshStandardMaterial({ color: 0xba7848, metalness: .78, roughness: .3 });
    const glass = new T.MeshPhysicalMaterial({ color: 0xe6f8f3, metalness: 0, roughness: .08,
      transparent: true, opacity: .23, depthWrite: false, side: T.DoubleSide, clearcoat: 1 });
    const cartridgeGlass = new T.MeshPhysicalMaterial({ color: 0xe1f4ef, roughness: .035,
      transparent: true, opacity: .10, depthWrite: false, side: T.DoubleSide, clearcoat: .9 });
    const amber = new T.MeshStandardMaterial({ color: 0xeab45e, roughness: .25, metalness: .25 });
    const green = new T.MeshStandardMaterial({ color: 0x54a98b, roughness: .22, metalness: .1 });
    owns.push(copper, glass, cartridgeGlass, amber, green);
    const boltGeometry = new T.CylinderGeometry(.06, .06, .055, 6);
    owns.push(boltGeometry);

    function gear(parent, radius, thickness, x, y, z, teeth = 18, material = m.brass) {
      const holder = group(parent, x, y, z), shape = new T.Shape();
      for (let i = 0; i < teeth * 4; i++) {
        const a = i / (teeth * 4) * TAU;
        const r = radius * (i % 4 === 0 || i % 4 === 3 ? .85 : 1);
        const xx = Math.cos(a) * r, yy = Math.sin(a) * r;
        if (i) shape.lineTo(xx, yy); else shape.moveTo(xx, yy);
      }
      shape.closePath();
      const axle = new T.Path(); axle.absarc(0, 0, radius * .16, 0, TAU, true); shape.holes.push(axle);
      for (let i = 0; i < 5; i++) {
        const a = TAU * i / 5, hole = new T.Path();
        hole.absarc(Math.cos(a) * radius * .48, Math.sin(a) * radius * .48, radius * .12, 0, TAU, true);
        shape.holes.push(hole);
      }
      const geometry = new T.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: true,
        bevelSize: .025, bevelThickness: .025, bevelSegments: 2, steps: 1, curveSegments: 8 });
      geometry.translate(0, 0, -thickness / 2);
      const wheel = new T.Mesh(geometry, material); wheel.castShadow = true; wheel.receiveShadow = true;
      holder.add(wheel); owns.push(geometry);
      cylinder(holder, radius * .24, radius * .24, thickness + .1, 0, 0, 0, m.steel, 'z');
      cylinder(holder, radius * .095, radius * .095, thickness + .14, 0, 0, 0, m.dark, 'z');
      return holder;
    }

    function bolts(parent, width, height, z, y = 0, material = m.steel) {
      const fasteners = new T.InstancedMesh(boltGeometry, material, 4);
      fasteners.castShadow = true; fasteners.receiveShadow = true;
      let index = 0;
      for (const x of [-width / 2, width / 2]) for (const yy of [-height / 2, height / 2]) {
        const matrix = new T.Matrix4().makeRotationX(Math.PI / 2);
        matrix.setPosition(x, y + yy, z); fasteners.setMatrixAt(index++, matrix);
      }
      parent.add(fasteners);
    }

    function feet(parent, width, depth) {
      for (const x of [-width / 2 + .3, width / 2 - .3]) for (const z of [-depth / 2 + .27, depth / 2 - .27]) {
        box(parent, .5, .13, .55, x, .61, z, m.dark, .06);
        cylinder(parent, .11, .14, .25, x, .79, z, m.steel);
      }
    }

    function cabinet(parent, width, depth, name, number, color = m.teal) {
      feet(parent, width, depth);
      box(parent, width, 1.5, depth, 0, 1.58, 0, color, .18);
      box(parent, width + .12, .25, depth + .15, 0, 2.45, 0, m.ivory, .08);
      box(parent, width - .5, .83, .1, 0, 1.5, depth / 2 + .03, m.navy, .05);
      bolts(parent, width - .84, .66, depth / 2 + .1, 1.5);
      label(parent, name, -.12, 1.65, depth / 2 + .097, Math.min(width - .72, 2.35), .28, '#183f45', '#f2e9d4');
      label(parent, number, -.12, 1.31, depth / 2 + .099, 1.35, .16, '#183f45', '#a9c6bf');
      cylinder(parent, .1, .1, .13, width / 2 - .26, 1.55, depth / 2 + .1, m.brass, 'z');
      return parent;
    }

    function servicePanel(parent, x, y, z) {
      const panel = group(parent, x, y, z);
      box(panel, .7, 1.0, .26, 0, 0, 0, m.ivory, .08);
      box(panel, .43, .3, .035, 0, .21, .15, m.navy, .03);
      label(panel, 'READY', 0, .21, .173, .33, .12, '#183f45', '#cbded1');
      cylinder(panel, .075, .075, .08, -.16, -.2, .17, m.brass, 'z');
      cylinder(panel, .075, .075, .08, .16, -.2, .17, green, 'z');
      return panel;
    }

    function pressureDial(parent, x, y, z, radius = .27) {
      cylinder(parent, radius, radius, .12, x, y, z, m.steel, 'z');
      cylinder(parent, radius * .83, radius * .83, .025, x, y, z + .075, m.ivory, 'z');
      const needle = group(parent, x, y, z + .097);
      box(needle, .025, radius * .6, .013, 0, radius * .23, 0, m.dark, 0);
      cylinder(needle, .045, .045, .025, 0, 0, .01, m.brass, 'z');
      needle.rotation.z = -.8;
      return needle;
    }

    function withSecondLine(build, x, lane) {
      const z = lane ? 3.6 : -3.6;
      if (lane) {
        const foundation = group(root, x, 0, z);
        box(foundation, 4.9, .13, 4.15, 0, .51, 0, m.tealLight, .12);
        for (const xx of [-2.1, 2.1]) for (const zz of [-1.6, 1.6]) cylinder(foundation, .09, .09, .08, xx, .62, zz, m.brass);
        label(foundation, 'RESERVED / LINE 02', 0, .7, 1.94, 2.4, .2, '#d3e2db', '#57766d');
      }
      const machine = group(root, x, 0, z);
      build(machine, lane);
      if (lane) secondLine.push(machine);
      return machine;
    }

    // Bulk storage is a raised, curved glass hopper with a separate brass metering drive.
    const hopper = group(root, -28.1, 0, -3.6);
    for (const x of [-1.48, 1.48]) for (const z of [-1.45, 1.45]) {
      box(hopper, .25, 4.6, .25, x, 2.85, z, m.teal, .045);
      box(hopper, .6, .16, .6, x, .61, z, m.ivory, .055);
    }
    box(hopper, 3.6, .27, 3.6, 0, 5.16, 0, m.ivory, .12);
    cylinder(hopper, 1.64, 1.64, 2.18, 0, 6.3, 0, glass);
    torus(hopper, 1.67, .11, 0, 7.42, 0, m.steel, 'y');
    torus(hopper, 1.67, .08, 0, 5.21, 0, m.brass, 'y');
    cylinder(hopper, 1.53, .42, .4, 0, 5.08, 0, m.ivory);
    cylinder(hopper, .42, .42, .3, 0, 4.75, 0, m.brass);
    box(hopper, 2.5, .22, 1.2, .9, 4.42, 0, m.teal, .1);
    pipe(hopper, [[0, 4.9, 0], [.7, 4.9, 0], [1.75, 4.9, 0], [2.72, 4.9, 0]], .28, glass);
    cylinder(hopper, .28, .28, 1.12, 2.72, 4.35, 0, glass);
    for (const y of [3.8, 4.9]) torus(hopper, .29, .045, 2.72, y, 0, m.steel, 'y');
    cylinder(hopper, .11, .11, 1.3, .08, 4.4, .65, m.steel, 'z');
    const feederGear = gear(hopper, .7, .18, .08, 4.4, 1.25, 24, m.brass);
    const feederPinion = gear(hopper, .31, .19, .99, 4.4, 1.25, 12, m.steel);
    box(hopper, .83, .72, .9, 1.09, 3.86, .7, m.teal, .14);
    pipe(hopper, [[1.1, 3.92, .25], [1.1, 1.1, .25], [-1.45, 1.1, .25]], .05, m.dark);
    label(hopper, 'RAW MATERIAL', -.03, 5.21, 1.84, 2.3, .27);
    label(hopper, 'METERING', 1.09, 3.86, 1.165, .68, .13, '#183f45', '#f2e9d4');
    animation.push(s => {
      const pickup = s.pickup, fraction = pickup?.route ? ease(pickup.s / pickup.route.len) : 0;
      const fed = (s.stats?.released || 0) - (pickup ? 1 - fraction : 0);
      feederGear.rotation.z = -fed * TAU / 6;
      feederPinion.rotation.z = fed * TAU / 3;
    });

    function buildPolisher(machine, lane) {
      cabinet(machine, 3.8, 3.12, 'PRECISION POLISH', `P-0${lane + 1} / CAST IRON`);
      // Stepped cast bed and exposed slide rails make this a lathe, not another box.
      box(machine, 3.55, .37, 2.65, 0, 2.78, 0, m.tealLight, .12);
      for (const z of [-.83, .83]) cylinder(machine, .1, .1, 3.7, 0, 3.12, z, m.steel, 'x');
      box(machine, .7, 1.0, 1.25, -1.46, 3.1, -.55, m.ivory, .13);
      box(machine, .7, 1.0, 1.25, 1.46, 3.1, -.55, m.ivory, .13);
      const brushHeads = [];
      for (const side of [-1, 1]) {
        const carriage = group(machine, side * .76, 0, 0);
        cylinder(carriage, .12, .12, 1.8, 0, 4.04, -.7, m.steel, 'z');
        cylinder(carriage, .22, .22, .2, 0, 4.04, -1.15, m.brass, 'z');
        const brush = group(carriage, 0, 4.04, 0);
        cylinder(brush, .33, .33, .91, 0, 0, 0, m.brass, 'z');
        for (let i = 0; i < 6; i++) torus(brush, .325, .027, 0, 0, -.39 + i * .155, m.dark, 'z');
        cylinder(brush, .38, .38, .08, 0, 0, .49, m.ivory, 'z');
        cylinder(brush, .09, .09, .13, 0, 0, .55, m.steel, 'z');
        brushHeads.push({ carriage, brush, side });
      }
      const rear = group(machine, 0, 0, -1.0);
      box(rear, 2.9, .24, .65, 0, 4.76, 0, m.ivory, .08);
      box(rear, 2.75, .56, .45, 0, 4.04, -.35, m.ivory, .09);
      for (const x of [-1.35, 1.35]) box(rear, .19, 1.9, .34, x, 3.86, 0, m.teal, .04);
      pressureDial(machine, 1.36, 4.5, -.67, .23);
      const drive = gear(machine, .49, .15, -.97, 2.63, 1.72, 20, m.brass);
      const driven = gear(machine, .24, .14, -.33, 2.63, 1.72, 10, m.steel);
      box(machine, .7, .6, .8, .65, 2.98, -1.28, m.teal, .1);
      // Clear front shields protect without hiding the marble or moving brushes.
      box(machine, 1.13, .8, .035, -1.29, 3.8, .78, glass, .015);
      box(machine, 1.13, .8, .035, 1.29, 3.8, .78, glass, .015);
      servicePanel(machine, 2.05, 3.43, -.13);
      animation.push(s => {
        const station = s.stations.polish[lane], p = station.ball ? station.progress : 0;
        const press = station.ball?.material === 'rubber';
        const closing = Math.sin(Math.PI * p);
        brushHeads.forEach(({ carriage, brush, side }) => {
          carriage.position.x = side * (.82 - closing * (press ? .38 : .32));
          brush.rotation.z = side * TAU * ease(p) * (press ? 1 : 5);
        });
        drive.rotation.z = -TAU * ease(p) * 3; driven.rotation.z = TAU * ease(p) * 6;
      });
    }

    function buildInfuser(machine, lane) {
      cabinet(machine, 3.42, 3.2, 'CHROMATIC INFUSION', `I-0${lane + 1} / SIX PIGMENTS`, m.ivory);
      box(machine, 3.05, .26, 2.77, 0, 2.81, 0, m.teal, .12);
      // Tall open portal; the product is visible from every useful camera angle.
      for (const x of [-1.42, 1.42]) {
        box(machine, .34, 3.77, .64, x, 4.61, -.65, m.teal, .075);
        box(machine, .13, 3.2, .12, x, 4.83, -.26, m.steel, .03);
      }
      box(machine, 3.45, .53, 1.17, 0, 6.61, -.65, m.ivory, .14);
      label(machine, 'COLOUR HOUSE', 0, 6.63, -.043, 2.32, .25);
      const reservoirRack = group(machine, 0, 0, -.6);
      box(reservoirRack, 3.9, .2, .94, 0, 7.15, 0, m.teal, .06);
      for (const x of [-1.42, 1.42]) cylinder(reservoirRack, .12, .12, .35, x, 6.96, 0, m.steel);
      const reservoirs = [];
      for (let i = 0; i < 6; i++) {
        const x = (i - 2.5) * .59;
        cylinder(reservoirRack, .205, .205, 1.38, x, 7.95, 0, cartridgeGlass);
        const liquid = cylinder(reservoirRack, .165, .165, 1.15, x, 7.89, 0, pigments[i]);
        cylinder(reservoirRack, .235, .235, .13, x, 8.7, 0, m.ivory);
        cylinder(reservoirRack, .22, .22, .13, x, 7.24, 0, m.brass);
        pipe(reservoirRack, [[x, 7.15, 0], [x, 6.91, -.26], [x * .3, 6.91, -.7], [x * .3, 5.8, -.7]], .045, m.steel);
        reservoirs.push(liquid);
      }
      box(machine, 1.37, .4, .66, 0, 5.75, -1.3, m.brass, .09);
      const head = group(machine, 0, 0, 0);
      cylinder(head, .48, .48, .33, 0, 4.92, 0, m.ivory);
      cylinder(head, .35, .15, .37, 0, 4.58, 0, m.brass);
      const collar = group(head, 0, 3.85, 0);
      torus(collar, .62, .055, 0, 0, 0, m.steel, 'y');
      for (let i = 0; i < 3; i++) {
        const a = i * TAU / 3;
        sphere(collar, .11, Math.cos(a) * .62, 0, Math.sin(a) * .62, m.brass);
        pipe(collar, [[Math.cos(a) * .62, 0, Math.sin(a) * .62],
          [Math.cos(a) * .5, .43, Math.sin(a) * .5], [Math.cos(a) * .26, .78, Math.sin(a) * .26]], .025, m.steel);
      }
      for (const x of [-.54, .54]) pipe(machine, [[x, 5.65, -1.3], [x, 5.65, -.2], [x * .6, 5.02, 0]], .07, m.steel);
      // Two small pneumatic cylinders drive the coating carriage.
      box(head, 2.48, .18, .34, 0, 4.5, -.55, m.teal, .055);
      pipe(head, [[0, 4.5, -.55], [0, 4.7, -.35], [0, 4.92, 0]], .15, m.steel);
      const pistonRods = [];
      for (const x of [-1.15, 1.15]) {
        cylinder(machine, .16, .16, .83, x, 5.6, -.55, m.ivory);
        pistonRods.push(cylinder(machine, .055, .055, .84, x, 4.88, -.55, m.steel));
      }
      servicePanel(machine, 1.9, 3.62, .16);
      const indicator = cylinder(machine, .1, .1, .13, -1.43, 6.67, -.02, amber, 'z');
      const dial = pressureDial(machine, -.91, 2.37, 1.68, .2);
      animation.push(s => {
        const station = s.stations.coat[lane], p = station.ball ? station.progress : 0;
        const engaged = Math.sin(Math.PI * p);
        head.position.y = -.12 * engaged;
        pistonRods.forEach(rod => { rod.position.y = 4.88 - .12 * engaged; });
        collar.position.y = 3.85 + .12 * engaged;
        collar.rotation.y = TAU * ease(p) * 3;
        indicator.material = s.level ? green : amber;
        reservoirRack.visible = s.level > 0;
        const activation = s.milestones.find(e => e.type === 'coating');
        const deployed = activation ? ease((s.t - activation.time) / 2.2) : s.level > 0 ? 1 : 0;
        reservoirRack.scale.y = Math.max(.001, deployed);
        reservoirRack.position.y = 6.85 * (1 - deployed);
        dial.rotation.z = -.8 + engaged * 1.4;
        reservoirs.forEach((liquid, i) => {
          const pulse = station.ball?.color === i && s.level > 0 ? engaged : 0;
          liquid.scale.y = 1 - pulse * .13;
        });
      });
    }

    function buildAnnealer(machine, lane) {
      cabinet(machine, 4.35, 3.08, 'THERMAL FINISH', `T-0${lane + 1} / CONTROLLED COOLING`);
      box(machine, 4.3, .32, 2.65, 0, 2.8, 0, m.ivory, .1);
      for (const z of [-1.04, 1.04]) {
        box(machine, 2.82, .63, .2, .6, 3.26, z, m.teal, .06);
        for (const x of [-.79, 1.99]) box(machine, .2, .93, .2, x, 3.34, z, m.ivory, .045);
      }
      for (let i = 0; i < 6; i++) box(machine, .19, .29, .025, -.52 + i * .44, 3.26, 1.15, m.dark, .025);
      const heat = copper.clone(); owns.push(heat);
      const arches = group(machine, 0, 0, 0);
      for (let i = 0; i < 5; i++) {
        const x = -.52 + i * .55, points = [];
        for (let j = 0; j <= 20; j++) {
          const a = -Math.PI / 2 + j / 20 * Math.PI;
          points.push([x, 3.8 + Math.cos(a) * .91, Math.sin(a) * .91]);
        }
        pipe(arches, points, .057, heat);
      }
      const hoodGeometry = new T.CylinderGeometry(1.03, 1.03, 2.76, 32, 1, true, 0, Math.PI);
      const hood = new T.Mesh(hoodGeometry, glass); hood.rotation.z = Math.PI / 2; hood.position.set(.6, 3.8, 0);
      machine.add(hood); owns.push(hoodGeometry);
      for (const x of [-.79, 1.99]) {
        const points = [];
        for (let j = 0; j <= 24; j++) { const a = -Math.PI / 2 + j / 24 * Math.PI; points.push([x, 3.8 + Math.cos(a) * 1.04, Math.sin(a) * 1.04]); }
        pipe(machine, points, .1, m.ivory);
      }
      box(machine, 2.56, .21, .78, .6, 4.96, 0, m.ivory, .085);
      for (const z of [-1.04, 1.04]) box(machine, 2.84, .18, .15, .6, 3.8, z, m.steel, .03);
      // Front centrifugal fan, readable as a machine even in the wide shot.
      cylinder(machine, .57, .57, .24, 1.0, 1.58, 1.7, m.navy, 'z');
      const fan = group(machine, 1.0, 1.58, 1.85);
      for (let i = 0; i < 6; i++) {
        const blade = box(fan, .18, .38, .055, 0, .25, 0, m.steel, .045);
        const pivot = group(fan); fan.remove(blade); pivot.add(blade); pivot.rotation.z = i * TAU / 6;
      }
      cylinder(fan, .12, .12, .09, 0, 0, .04, m.brass, 'z');
      torus(machine, .58, .06, 1, 1.58, 1.89, m.steel, 'z');
      for (const x of [-.3, .3]) pipe(machine, [[1 + x, 1.04, 1.97], [1 + x, 2.12, 1.97]], .018, m.dark);
      pipe(machine, [[-1.5, 3.0, -.98], [-1.5, 5.47, -.98], [.8, 5.47, -.98], [.8, 4.94, -.98]], .095, m.steel);
      cylinder(machine, .32, .32, .74, -1.5, 5.83, -.98, m.ivory);
      cylinder(machine, .09, .09, .2, -1.5, 6.3, -.98, m.brass);
      const gauge = pressureDial(machine, -1.08, 2.44, 1.66, .24);
      animation.push(s => {
        const station = s.stations.anneal[lane], p = station.ball ? station.progress : 0;
        fan.rotation.z = -TAU * ease(p) * 7;
        gauge.rotation.z = -.85 + (station.ball ? 1 - p : 0) * 1.7;
        heat.emissive.setHex(0x7e2606); heat.emissiveIntensity = station.ball ? .12 * (1 - p) : 0;
      });
    }

    for (const lane of [0, 1]) {
      withSecondLine(buildPolisher, -16.2, lane);
      withSecondLine(buildInfuser, -2.16, lane);
      withSecondLine(buildAnnealer, 7.02, lane);
    }

    // Optical control: a compact inspection portal and separate mechanical diverter.
    const inspector = group(root, 15.12, 0, -3.6);
    cabinet(inspector, 3.22, 2.9, 'OPTICAL CONTROL', 'Q-01 / EVERY SPHERE COUNTS', m.ivory);
    box(inspector, 3.1, .29, 2.5, 0, 2.79, 0, m.teal, .1);
    for (const x of [-1.27, 1.27]) box(inspector, .28, 2.73, .5, x, 4.0, -.66, m.teal, .08);
    box(inspector, 3.05, .42, 1.0, 0, 5.42, -.6, m.ivory, .13);
    const optics = group(inspector, 0, 4.25, -1.04);
    box(optics, 1.09, .84, .76, 0, 0, 0, m.navy, .14);
    cylinder(optics, .32, .32, .47, 0, -.15, .52, m.steel, 'z');
    cylinder(optics, .26, .26, .12, 0, -.15, .8, m.dark, 'z');
    cylinder(optics, .2, .2, .035, 0, -.15, .88, glass, 'z');
    torus(optics, .26, .035, 0, -.15, .87, m.brass, 'z');
    pipe(inspector, [[0, 4.66, -1.3], [0, 5.9, -1.3], [1.35, 5.9, -1.3], [1.35, 2.0, -1.3]], .055, m.dark);
    const scanBar = group(inspector, 0, 0, 0);
    box(scanBar, .06, .77, .75, 0, 3.9, 0, glass, .015);
    const status = cylinder(inspector, .105, .105, .17, 1.08, 5.43, -.02, amber, 'z');
    const control = servicePanel(inspector, 1.8, 3.62, .12);
    const lever = group(inspector, 1.8, 3.5, .1);
    box(lever, .93, .09, .1, .45, .12, 0, m.brass, .03);
    cylinder(lever, .1, .1, .19, 0, .12, 0, m.steel, 'y');
    label(inspector, 'CALIBRATED', -.65, 2.44, 1.55, 1.2, .16, '#d7e2d9', '#376451');
    animation.push(s => {
      const station = s.stations.inspect, p = station.ball ? station.progress : 0;
      scanBar.visible = !!station.ball;
      scanBar.position.x = station.ball ? -.39 + .78 * ease(p) : 0;
      status.material = station.ball && p > .65 ? green : amber;
      lever.rotation.y = station.ball ? Math.sin(Math.PI * p) * .45 : 0;
      control.rotation.y = -.13;
    });

    const update = state => {
      const expansion = state.milestones.find(e => e.type === 'parallel');
      const deployed = expansion ? ease((state.t - expansion.time) / 3.2) : 0;
      secondLine.forEach(machine => {
        machine.visible = state.level >= 2;
        machine.scale.y = Math.max(.001, deployed);
        machine.position.y = .5 * (1 - deployed);
      });
      animation.forEach(fn => fn(state));
    };
    update(sim);
    return { update, dispose() { owns.forEach(resource => resource.dispose()); } };
  };
})();
