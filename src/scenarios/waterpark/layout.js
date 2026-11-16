(function () {
'use strict';
const WP = (EBS.Waterpark = EBS.Waterpark || {});
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function smooth(a, steps = 12) {
  const out = [];
  for (let i = 0; i < a.length - 1; i++) {
    const p0 = a[Math.max(0, i - 1)], p1 = a[i], p2 = a[i + 1], p3 = a[Math.min(a.length - 1, i + 2)];
    for (let j = 0; j < steps; j++) {
      const t = j / steps, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map(k => .5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
    }
  }
  out.push(a[a.length - 1]); return out;
}
function makePath(parts) {
  const points = [], drawSegments = []; let length = 0;
  for (const part of parts) {
    const a = part.smooth === false ? part.points : smooth(part.points), start = length, visible = [];
    for (let i = 0; i < a.length; i++) {
      const xy = a[i], prev = points[points.length - 1];
      if (prev) length += Math.hypot(xy[0] - prev.x, xy[1] - prev.y);
      const p = { x: xy[0], y: xy[1], s: length, kind: part.kind || 'rail' };
      points.push(p); visible.push(p);
    }
    part.startS = start; part.endS = length;
    if (!part.hidden) { visible.kind = part.kind || 'rail'; drawSegments.push(visible); }
  }
  return { points, length, len: length, drawSegments, parts };
}
WP.samplePath = function (path, s) {
  const a = path.points; s = clamp(s, 0, path.length); let lo = 0, hi = a.length - 1;
  while (lo + 1 < hi) { const mid = (lo + hi) >> 1; if (a[mid].s <= s) lo = mid; else hi = mid; }
  const p = a[lo], q = a[hi], ds = q.s - p.s, f = ds > 1e-9 ? (s - p.s) / ds : 0;
  const d = Math.hypot(q.x - p.x, q.y - p.y) || 1, tx = (q.x - p.x) / d, ty = (q.y - p.y) / d;
  return { x: p.x + (q.x - p.x) * f, y: p.y + (q.y - p.y) * f, tx, ty, angle: Math.atan2(ty, tx), kind: q.kind };
};
WP.makePath = makePath;
/** Open slide trough: outer rim width and water channel width (wide shell as in the mockup). */
WP.troughSize = R => ({ out: 3.2 * R, inner: 2.5 * R });

/*
 * Grundriss nach dem Designmockup: gläserner Aufzugturm links der Mitte, ein Startdeck auf Turmhöhe,
 * von dem alle vier Attraktionen abgehen. Die Tiere steigen oben aus dem Becher, laufen über das Deck
 * zu ihrer Rutsche (Teilstück "deck") und landen in vier getrennten Buchten der Lagune.
 * Koordinaten als Anteil von Breite/Höhe; jeder Formatgrundriss ist eigenständig gestaltet.
 */
const PLANS = {
  // Halbtotale nach dem Mockup (Plan P3): zwei große Bögen links, Trichter rechts der Mitte, Wippe tief über dem
  // Beckenrand, gerade steile Sprungrutsche ganz rechts.
  land: {
    waterY: .72, horizon: .30, lift: { x: .34, deck: .19, bottom: .80 }, towerW: .092,
    mouths: [.235, .675, .55, .94],
    funnel: { x: .67, y: .31, rx: .112, ry: .065 },
    seesaw: { x: .505, y: .52, length: .17 },
    jump: { x: .878, y: .625 },
    panorama: { deckTo: .255, pts: [[.205,.203],[.14,.232],[.103,.28],[.108,.333],[.15,.37],[.215,.393],[.255,.43],[.262,.478],[.225,.52],[.165,.548],[.128,.592],[.135,.64],[.18,.675],[.222,.70]] },
    funnelIn: { deckTo: .522, pts: [[.537,.232],[.55,.282]] },
    tube: [[.672,.45],[.674,.56],[.675,.66]],
    seesawIn: { deckTo: .445, pts: [[.457,.245],[.45,.30],[.43,.345]] },
    seesawOut: [],
    jumpIn: { deckTo: .79, pts: [[.806,.232],[.826,.33],[.852,.48]] },
    pool: [[.09,.80],[.12,.89],[.40,.94],[.76,.93],[.92,.87],[.74,.84],[.55,.87],[.44,.86]],
  },
  port: {
    waterY: .70, horizon: .25, lift: { x: .36, deck: .165, bottom: .77 },
    mouths: [.16, .485, .62, .77],
    funnel: { x: .68, y: .285, rx: .19, ry: .034 },
    seesaw: { x: .715, y: .47, length: .26, leftward: true },
    jump: { x: .875, y: .60 },
    panorama: { deckTo: .24, pts: [[.215,.198],[.13,.222],[.075,.268],[.10,.318],[.19,.35],[.228,.40],[.165,.44],[.088,.48],[.085,.54],[.17,.572],[.228,.612],[.21,.66]] },
    funnelIn: { deckTo: .48, pts: [[.495,.20],[.505,.245]] },
    tube: [[.685,.34],[.665,.39],[.60,.418],[.515,.435],[.477,.48],[.468,.57],[.475,.645]],
    seesawIn: { deckTo: .74, pts: [[.765,.21],[.80,.29],[.835,.35]] },
    seesawOut: [[.58,.60],[.607,.655]],
    jumpIn: { deckTo: .93, pts: [[.95,.22],[.957,.33],[.952,.45],[.932,.53],[.90,.578]] },
    pool: [[.09,.80],[.12,.89],[.40,.94],[.76,.93],[.92,.87],[.74,.84],[.55,.87],[.44,.86]],
  },
};

WP.createLayout = function (world, size = 36) {
  const W = world.w, H = world.h, land = W > H * 1.2, R = size, GAP = 2 * R + 18, P = land ? PLANS.land : PLANS.port;
  // Swimmers grow towards the front of the lagoon (perspective), so they keep a wider distance there.
  const poolGap = 2 * R * (land ? 1.45 : 1.25) + 18, towerHW = Math.round(Math.max(R + 34, W * (P.towerW || 0) / 2));
  const pt = (x, y) => [x * W, y * H], points = a => a.map(p => pt(...p));
  const waterY = H * P.waterY, xLift = W * P.lift.x, deckY = H * P.lift.deck, top = deckY + R + 6, bottom = H * P.lift.bottom;
  const origin = [xLift, deckY];
  const liftPath = makePath([{ points: [[xLift, bottom], [xLift, top]], smooth: false }]);
  // Aus dem Becher steigt das Tier auf das Deck; die Warteschlange bleibt im Becherwerk.
  const platformPath = makePath([{ points: [[xLift, top], origin], smooth: false }]);
  const mouths = P.mouths, deckTo = x => ({ points: [origin, [x * W, deckY]], smooth: false, kind: 'deck' });

  const funnel = { x: W * P.funnel.x, y: H * P.funnel.y, rx: W * P.funnel.rx, ry: H * P.funnel.ry };
  const spiralRx = Math.max(R * 2, funnel.rx - R * 1.4), spiralRy = Math.max(R, funnel.ry - R * .7), spiral = [];
  // Einfahrt links am Rand, gegen den Uhrzeigersinn nach unten weiter, zweieinhalb Runden bis zum Abfluss.
  for (let j = 0; j <= 160; j++) { const f = j / 160, a = Math.PI - f * Math.PI * 5, r = 1 - .94 * f; spiral.push([funnel.x + Math.cos(a) * spiralRx * r, funnel.y + Math.sin(a) * spiralRy * r]); }
  const seesaw = { x: W * P.seesaw.x, y: H * P.seesaw.y, length: W * P.seesaw.length, maxAngle: .16 };
  const dir = P.seesaw.leftward ? -1 : 1;
  const boardStart = [seesaw.x - dir * seesaw.length / 2, seesaw.y], boardEnd = [seesaw.x + dir * seesaw.length / 2, seesaw.y];
  seesaw.dir = dir;
  // Übergaben wie im Mockup: Die Zulaufrinne endet als Ausguss über dem Einstiegsende, das Ausstiegsende gießt in eine
  // Auffangrinne. Abstände aus Rinnenbreite (2R+30, siehe art.js) und größter Neigung, damit sich nichts überdeckt.
  const tilt = seesaw.length / 2 * Math.sin(seesaw.maxAngle), rim = WP.troughSize(R).out + Math.round(R * .42);
  const spout = [boardStart[0], boardStart[1] - (rim + tilt + 8)], catchTop = [boardEnd[0] + dir * R * .5, boardEnd[1] + rim + tilt + 12];
  seesaw.spout = spout; seesaw.catchTop = catchTop;
  const boardTipped = [seesaw.x + dir * Math.cos(seesaw.maxAngle) * seesaw.length / 2, seesaw.y + Math.sin(seesaw.maxAngle) * seesaw.length / 2];
  const jump = { x: W * P.jump.x, y: H * P.jump.y, landing: [mouths[3] * W, waterY] };
  const flight = [];
  for (let j = 0; j <= 40; j++) { const f = j / 40; flight.push([jump.x + (jump.landing[0] - jump.x) * f, jump.y + (jump.landing[1] - jump.y) * f - Math.sin(Math.PI * f) * H * (land ? .09 : .07)]); }

  const routes = [];
  function route(id, name, color, parts, feature) {
    const path = makePath(parts), r = { id, name, color, path, drawSegments: path.drawSegments, feature, start: origin, end: [mouths[id] * W, waterY] };
    if (feature) { const part = parts.find(p => p.hidden && p.kind !== 'drop'); feature.entryS = part.startS; feature.exitS = part.endS; feature.start = part.points[0]; feature.end = part.points[part.points.length - 1]; feature.leadS = parts.find(p => p.hidden).startS; }
    const first = parts.find(p => p.kind !== 'deck'); r.launch = first.points[0]; r.launchS = first.startS;
    routes.push(r);
  }
  route(0, 'Panorama', '#69d9d2', [deckTo(P.panorama.deckTo),
    { points: [[P.panorama.deckTo * W, deckY], ...points(P.panorama.pts), [mouths[0] * W, waterY]] }]);
  route(1, 'Trichter', '#80bdec', [deckTo(P.funnelIn.deckTo),
    { points: [[P.funnelIn.deckTo * W, deckY], ...points(P.funnelIn.pts), spiral[0]] },
    { points: spiral, smooth: false, kind: 'funnel', hidden: true },
    { points: [spiral[spiral.length - 1], ...points(P.tube), [mouths[1] * W, waterY]], kind: 'tube' }
  ], funnel);
  route(2, 'Wippe', '#efc98a', [deckTo(P.seesawIn.deckTo),
    { points: [[P.seesawIn.deckTo * W, deckY], ...points(P.seesawIn.pts), spout] },
    { points: [spout, boardStart], smooth: false, kind: 'drop', hidden: true },
    { points: [boardStart, boardTipped], smooth: false, kind: 'seesaw', hidden: true },
    { points: [boardTipped, catchTop], smooth: false, kind: 'drop', hidden: true },
    { points: [catchTop, ...points(P.seesawOut), [mouths[2] * W, waterY]] }
  ], seesaw);
  route(3, 'Sprung', '#f2a9b5', [deckTo(P.jumpIn.deckTo),
    { points: [[P.jumpIn.deckTo * W, deckY], ...points(P.jumpIn.pts), [jump.x, jump.y]] },
    { points: flight, smooth: false, kind: 'flight', hidden: true }
  ], jump);
  // Die vier Buchten münden in einen gemeinsamen Wasserlauf. Abschnitte einzeln glätten, damit die Einmündungen exakt bleiben.
  const topXs = [...new Set(mouths)].sort((a,b) => b-a), poolParts = [];
  for (let i = 0; i < topXs.length - 1; i++) poolParts.push({ points: [[topXs[i]*W,waterY],[topXs[i+1]*W,waterY]], smooth: false, kind: 'pool' });
  poolParts.push({ points: [[topXs[topXs.length-1]*W,waterY], ...points(P.pool), [xLift,bottom]], kind:'pool' });
  const poolPath = makePath(poolParts), joinS = mouths.map(x => {
    const p = poolPath.points.find(p => Math.abs(p.x-x*W)<1e-5 && Math.abs(p.y-waterY)<1e-5); return p.s;
  });
  const parkingPoints=[[xLift,bottom]];
  const parkingTurn=(x,cy,r,left)=>{for(let j=0;j<=32;j++){const a=-Math.PI/2+(left?-1:1)*Math.PI*j/32;parkingPoints.push([x+Math.cos(a)*r,cy+Math.sin(a)*r]);}};
  if(land){
    parkingPoints.push(pt(.15,.80));parkingTurn(W*.15,H*.84,H*.04,true);
    parkingPoints.push(pt(.85,.88));parkingTurn(W*.85,H*.92,H*.04,false);parkingPoints.push(pt(.15,.96));
  } else {
    parkingPoints.push(pt(.15,.77));parkingTurn(W*.15,H*.80,H*.03,true);
    parkingPoints.push(pt(.85,.83));parkingTurn(W*.85,H*.86,H*.03,false);
    parkingPoints.push(pt(.15,.89));parkingTurn(W*.15,H*.92,H*.03,true);parkingPoints.push(pt(.85,.95));
  }
  const parkingPath=makePath([{points:parkingPoints,smooth:false,kind:'pool'}]);
  const gather = { spots: [], paths: [],path:parkingPath };
  for (let i = 0; i < 24; i++) {
    const spot=WP.samplePath(parkingPath,parkingPath.length-i*GAP);gather.spots.push({x:spot.x,y:spot.y});
    gather.paths.push(parkingPath);
  }
  // Deckflächen für die Darstellung: Lauffläche (Füße) liegt R unter der Tiermitte.
  const deckXs = routes.map(r => r.launch[0]);
  const deck = { y: deckY + R, x0: Math.min(...deckXs) - R * 1.6, x1: Math.max(...deckXs) + R * 1.6, centerY: deckY };
  return { W,H,R,GAP,poolGap,towerHW,land,horizon:H*P.horizon,waterY,origin,start:origin,deck,
    lift:{x:xLift,top,bottom,deckY,path:liftPath},platformPath,routes,
    pool:{path:poolPath,joinS,pickup:{x:xLift,y:bottom}},gather,funnel,seesaw,jump };
};
})();
