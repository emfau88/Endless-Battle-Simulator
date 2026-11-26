// Marble Knockout (R43/M1): Physik-Kern. Plan: docs/MARBLE_KNOCKOUT_PLAN_2026-11-25.md, Abschnitt 5.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const context = vm.createContext({}); context.window = context; context.EBS = {};
for (const p of ['src/scenarios/knockout/detmath.js', 'src/scenarios/knockout/physics.js']) vm.runInContext(read(p), context, { filename: p });
const { KnockoutMath: KM, KnockoutPhysics: KP } = context.EBS;
const DT = 1 / 60;

test('Winkelfunktionen: so genau wie Math.sin/Math.cos', () => {
  let worst = 0;
  for (let i = -20000; i <= 20000; i++) {
    const x = i * 0.0137 + (i % 7) * 1e-3;
    worst = Math.max(worst, Math.abs(KM.sin(x) - Math.sin(x)), Math.abs(KM.cos(x) - Math.cos(x)));
  }
  assert.ok(worst < 1e-14, `größte Abweichung ${worst}`);
  assert.equal(KM.sin(0), 0); assert.equal(KM.cos(0), 1);
});

/** Lange Rampe mit Neigung deg; die Murmel liegt am oberen Ende auf. */
function ramp(deg, opt) {
  const w = new KP.World(opt), a = deg * Math.PI / 180, L = 4000;
  w.addStatic({ ax: 0, ay: 0, bx: L * Math.cos(a), by: L * Math.sin(a), rad: 8 });
  const r = 22, nx = -Math.sin(a), ny = Math.cos(a);   // Normale nach oben (y wächst nach unten)
  const m = w.addMarble({ x: 200 * Math.cos(a) - nx * (r + 8), y: 200 * Math.sin(a) - ny * (r + 8), r });
  return { w, m, a };
}

test('Rollen auf der Schräge: Beschleunigung 5/7 · g · sin θ, Murmel dreht sich mit', () => {
  for (const deg of [6, 12, 18]) {
    const { w, m, a } = ramp(deg, { linearDamping: 0, angularDamping: 0 });
    for (let i = 0; i < 30; i++) w.step(DT);                // anrollen lassen
    const v0 = Math.hypot(m.vx, m.vy);
    for (let i = 0; i < 60; i++) w.step(DT);
    const acc = Math.hypot(m.vx, m.vy) - v0, want = 5 / 7 * 1600 * Math.sin(a);
    assert.ok(Math.abs(acc / want - 1) < 0.03, `${deg}°: ${acc.toFixed(1)} statt ${want.toFixed(1)}`);
    assert.ok(Math.abs(m.w * m.r - Math.hypot(m.vx, m.vy)) < 0.02 * Math.hypot(m.vx, m.vy), `${deg}°: rutscht statt zu rollen`);
    assert.ok(w.clearance(m) > -1.5, `${deg}°: steckt in der Bahn`);
  }
});

test('Zehn Murmeln fallen in eine Mulde und liegen nach 6 s still, ohne Eindringen', () => {
  const w = new KP.World();
  w.addStatic({ ax: 100, ay: 300, bx: 500, by: 700, rad: 8 });
  w.addStatic({ ax: 500, ay: 700, bx: 900, by: 300, rad: 8 });
  const ms = [];
  for (let i = 0; i < 10; i++) ms.push(w.addMarble({ x: 380 + (i % 5) * 50, y: 100 - Math.floor(i / 5) * 60, r: 22 }));
  for (let i = 0; i < 360; i++) w.step(DT);
  const vmax = Math.max(...ms.map((m) => Math.hypot(m.vx, m.vy)));
  assert.ok(vmax < 4, `noch in Bewegung: ${vmax.toFixed(2)}`);
  for (const m of ms) assert.ok(w.clearance(m) > -1.5, `Murmel ${m.id} steckt in der Bahn`);
  for (const a of ms) for (const b of ms) if (a.id < b.id) assert.ok(Math.hypot(a.x - b.x, a.y - b.y) > a.r + b.r - 1.5, `${a.id}/${b.id} ineinander`);
});

test('Kein Durchfallen: 300 Murmeln mit Höchstgeschwindigkeit gegen eine dünne Bahn', () => {
  let s = 12345; const rnd = () => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296);
  for (let k = 0; k < 300; k++) {
    const w = new KP.World({ gravity: 0 });
    w.addStatic({ ax: -400, ay: 0, bx: 400, by: 0, rad: 6 });
    const ang = Math.PI * (0.15 + 0.7 * rnd());              // von oben schräg hinein
    const m = w.addMarble({ x: -Math.cos(ang) * 200, y: -60 - rnd() * 40, r: 20, vx: Math.cos(ang) * 1500, vy: Math.sin(ang) * 1500 });
    for (let i = 0; i < 30; i++) { w.step(DT); assert.ok(m.y < 0, `Versuch ${k}: durch die Bahn gefallen (y = ${m.y.toFixed(1)})`); }
  }
});

test('Drehendes Kreuz schiebt eine Murmel in Drehrichtung mit', () => {
  const w = new KP.World();
  w.addStatic({ ax: -300, ay: 0, bx: 300, by: 0, rad: 8 });
  const f = 0.5, arm = 80;                                   // halbe Umdrehung pro Sekunde; der untere Arm läuft nach rechts
  const shapes = [0, 1, 2, 3].map((k) => ({ ax: 0, ay: 0, bx: arm * Math.cos(k * Math.PI / 2), by: arm * Math.sin(k * Math.PI / 2), rad: 6 }));
  w.addBody({ shapes, pose: (t) => ({ x: 0, y: -110, a: -KM.TAU * f * t, w: -KM.TAU * f }) });
  const m = w.addMarble({ x: -40, y: -30, r: 22 });
  for (let i = 0; i < 90; i++) w.step(DT);
  assert.ok(m.x > 40, `Murmel nicht mitgenommen: x = ${m.x.toFixed(1)}`);
  assert.ok(w.clearance(m) > -2, 'Murmel steckt im Kreuz oder in der Bahn');
});

test('Förderband trägt eine liegende Murmel mit 2/7 seiner Geschwindigkeit (sie rollt dabei rückwärts)', () => {
  const w = new KP.World({ linearDamping: 0, angularDamping: 0 });
  w.addStatic({ ax: -500, ay: 0, bx: 500, by: 0, rad: 8, speed: 120 });
  const m = w.addMarble({ x: 0, y: -30, r: 22 });
  for (let i = 0; i < 120; i++) w.step(DT);
  assert.ok(Math.abs(m.vx / (120 * 2 / 7) - 1) < 0.05, `vx = ${m.vx.toFixed(1)}`);
  assert.ok(m.w < 0, 'dreht nicht rückwärts');
});

test('Gleicher Aufbau, gleiches Ergebnis (Bits)', () => {
  const run = () => {
    const w = new KP.World();
    w.addStatic({ ax: 0, ay: 400, bx: 1000, by: 520, rad: 8 });
    w.addBody({ shapes: [{ ax: -90, ay: 0, bx: 90, by: 0, rad: 6 }], pose: (t) => ({ x: 500, y: 380, a: 0.9 * KM.sin(3 * t), w: 2.7 * KM.cos(3 * t) }) });
    for (let i = 0; i < 12; i++) w.addMarble({ x: 60 + i * 47, y: 100 + (i % 3) * 30, r: 22 });
    for (let i = 0; i < 600; i++) w.step(DT);
    return KP.hashNumbers(w.marbles.flatMap((m) => [m.x, m.y, m.vx, m.vy, m.a, m.w]));
  };
  assert.equal(run(), run());
});
