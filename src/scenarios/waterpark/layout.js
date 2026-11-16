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
WP.createLayout = function (world, size = 24) {
  const W = world.w, H = world.h, land = W > H * 1.2, R = size, GAP = 2 * R + 18;
  const pt = (x, y) => [x * W, y * H], points = a => a.map(p => pt(...p));
  const waterY = H * (land ? .75 : .73), xLift = W * (land ? .36 : .46), top = H * (land ? .25 : .20), bottom = H * .79;
  const origin = [W * (land ? .52 : .78), top];
  const liftPath = makePath([{ points: [[xLift, bottom], [xLift, top]], smooth: false }]);
  const platformPath = makePath([{ points: [[xLift, top], origin], smooth: false }]);
  const funnel = { x: W * (land ? .78 : .72), y: H * (land ? .40 : .38), rx: W * (land ? .13 : .18), ry: H * (land ? .07 : .05) };
  const spiral = [];
  const spiralRx=Math.max(R*2,funnel.rx-R*1.4),spiralRy=Math.max(R,funnel.ry-R*.7);
  for (let j = 0; j <= 160; j++) { const f = j / 160, a = f * Math.PI * 5, r = 1 - .94 * f; spiral.push([funnel.x + Math.cos(a) * spiralRx * r, funnel.y + Math.sin(a) * spiralRy * r]); }
  const seesaw = { x: W * (land ? .51 : .45), y: H * (land ? .59 : .54), length: W * (land ? .17 : .24), maxAngle: .16 };
  const boardStart = [seesaw.x - seesaw.length / 2, seesaw.y], boardEnd = [seesaw.x + seesaw.length / 2, seesaw.y];
  const jumpMouth=land?.77:.75;
  const jump = { x: W * (land ? .84 : .82), y: H * (land ? .59 : .60), landing: pt(jumpMouth, land ? .75 : .73) };
  const flight = [];
  for (let j = 0; j <= 40; j++) { const f = j / 40; flight.push([jump.x + (jump.landing[0] - jump.x) * f, jump.y + (jump.landing[1] - jump.y) * f - Math.sin(Math.PI * f) * H * .09]); }
  const mouths = land ? [.32, .64, .48, jumpMouth] : [.20, .67, .44, jumpMouth];
  const routes = [];
  function route(id, name, color, parts, feature) {
    const path = makePath(parts), r = { id, name, color, path, drawSegments: path.drawSegments, feature, start: origin, end: [mouths[id] * W, waterY] };
    if (feature) { const part = parts.find(p => p.hidden); feature.entryS = part.startS; feature.exitS = part.endS; feature.start = part.points[0]; feature.end = part.points[part.points.length - 1]; }
    routes.push(r);
  }
  route(0, 'Panorama', '#69d9d2', [{ points: [origin, ...points(land ? [[.33,.29],[.13,.32],[.08,.40],[.22,.44],[.29,.48],[.24,.55],[.11,.59],[.24,.66],[.32,.75]] : [[.55,.24],[.23,.27],[.13,.35],[.30,.39],[.35,.43],[.21,.49],[.10,.55],[.27,.61],[.20,.73]])] }]);
  route(1, 'Trichter', '#80bdec', [
    { points: [origin, ...points(land ? [[.62,.27],[.75,.29]] : [[.89,.28]]), spiral[0]] },
    { points: spiral, smooth: false, kind: 'funnel', hidden: true },
    { points: [spiral[spiral.length - 1], ...points(land ? [[.76,.53],[.64,.60],[.64,.75]] : [[.74,.48],[.89,.54],[.76,.62],[.67,.73]])], kind: 'tube' }
  ], funnel);
  route(2, 'Wippe', '#efc98a', [
    { points: [origin, ...points(land ? [[.48,.36],[.54,.43],[.44,.48]] : [[.53,.27],[.54,.40],[.40,.47]]), boardStart] },
    { points: [boardStart, boardEnd], smooth: false, kind: 'seesaw', hidden: true },
    { points: [boardEnd, ...points(land ? [[.60,.66],[.48,.75]] : [[.58,.63],[.44,.73]])] }
  ], seesaw);
  route(3, 'Sprung', '#f2a9b5', [
    { points: [origin, ...points(land ? [[.66,.23],[.90,.30],[.94,.42],[.88,.54]] : [[.94,.25],[.95,.43],[.94,.52]]), [jump.x, jump.y]] },
    { points: flight, smooth: false, kind: 'flight', hidden: true }
  ], jump);
  // The four bays share one directed water lane. Smooth each section separately so the bay joins stay exact.
  const topXs = [...new Set(mouths)].sort((a,b) => b-a), poolParts = [];
  for (let i = 0; i < topXs.length - 1; i++) poolParts.push({ points: [[topXs[i]*W,waterY],[topXs[i+1]*W,waterY]], smooth: false, kind: 'pool' });
  poolParts.push({ points: [[topXs[topXs.length-1]*W,waterY], ...points([[.09,.80],[.12,.89],[.40,.94],[.76,.93],[.92,.87],[.74,.84],[.55,.87],[.44,.86]]), [xLift,bottom]], kind:'pool' });
  const poolPath = makePath(poolParts), joinS = mouths.map(x => {
    const p = poolPath.points.find(p => Math.abs(p.x-x*W)<1e-5 && Math.abs(p.y-waterY)<1e-5); return p.s;
  });
  const parkingPoints=[[xLift,bottom]];
  const parkingTurn=(x,cy,r,left)=>{for(let j=0;j<=32;j++){const a=-Math.PI/2+(left?-1:1)*Math.PI*j/32;parkingPoints.push([x+Math.cos(a)*r,cy+Math.sin(a)*r]);}};
  if(land){
    parkingPoints.push(pt(.15,.79));parkingTurn(W*.15,H*.835,H*.045,true);
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
  return { W,H,R,GAP,land,horizon:H*(land?.30:.25),waterY,origin,start:origin,
    lift:{x:xLift,top,bottom,path:liftPath},platformPath,routes,
    pool:{path:poolPath,joinS,pickup:{x:xLift,y:bottom}},gather,funnel,seesaw,jump };
};
})();
