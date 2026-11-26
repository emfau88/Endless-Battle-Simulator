/* Map-scale art for the neutral stone giant and meteor. Every point is
 * projected by the board camera, including the shadow and the warning ring. */
(function () {
  'use strict';
  const clamp = EBS.util.clamp, tau = Math.PI * 2;
  const approachTime = 5;
  function firstStepAt(round) {
    const dt = HexSim.RULES.step, tick = Math.floor(round.nextGiant / dt);
    return (tick * dt < round.nextGiant ? tick + 1 : tick) * dt;
  }

  function polygon(g, points, fill) {
    g.beginPath();
    points.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y));
    g.closePath(); g.fillStyle = fill; g.fill();
  }
  function disk(g, x, y, rx, ry, fill) {
    g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, tau); g.fillStyle = fill; g.fill();
  }
  function glow(g, x, y, radius, hot, cold) {
    const grad = g.createRadialGradient(x, y, 0, x, y, radius);
    grad.addColorStop(0, hot); grad.addColorStop(1, cold);
    disk(g, x, y, radius, radius, grad);
  }

  // The visible trail runs up from a hollow on the far flank of a real rim mountain.
  function passPose(round, tile, open, gait, entering, azimuth) {
    const sign = Math.sign(tile.q || tile.r);
    let ridge = null, best = Infinity;
    for (const t of round.tiles) {
      if (t.terrain !== 'mountain') continue;
      const dq = t.q - tile.q, dr = t.r - tile.r;
      const distance = dq * dq + dq * dr + dr * dr;
      if (distance < best || (distance === best && sign * t.id < sign * ridge.id)) {
        best = distance; ridge = t;
      }
    }
    const dx = tile.x - ridge.x, dz = tile.z - ridge.z;
    const sx = Math.sin(azimuth), sz = Math.cos(azimuth);
    const across = dx * sz - dz * sx, toward = dx * sx + dz * sz;
    // Both ends turn around the *far* flank of their peak, including the
    // mountains on the near side of a rotated map.
    const side = Math.abs(across) > .05 ? Math.sign(across) : sign;
    const turn = Math.max(0, (open - .44) / .56);
    const depth = EBS.util.lerp(-.68, toward, turn * turn);
    const around = Math.max(0, (open - .34) / .66);
    const flank = EBS.util.lerp(-.14 * sz - .05 * sx, across, around * around * (3 - 2*around))
      + side * .4 * Math.sin(Math.PI * around);
    const rise = open * open * (3 - 2 * open), direction = entering ? 1 : -1;
    return {
      x: ridge.x + flank * sz + depth * sx, z: ridge.z - flank * sx + depth * sz,
      floor: tile.height - 3.45 * (1 - rise), ground: tile.height,
      heading: dx / Math.hypot(dx, dz) * direction, gait, ridge
    };
  }

  function giantPose(r, t, azimuth) {
    const g = r.giant;
    if (!g) {
      const time = r.phase === 'running' ? t : r.time;
      const open = 1 - (firstStepAt(r) - time) / approachTime;
      if (open <= 0 || open > 1) return null;
      return passPose(r, r.giantEntryTile(), open, open - 1, true, azimuth);
    }
    const travel = (t - g.start) / g.stride, last = g.route.length - 1;
    if (travel < 0 || travel >= last + 1) return null;
    const i = Math.min(last, Math.floor(travel)), f = travel - i;
    const previous = r.tiles[g.route[Math.max(0, i - 1)]];
    const turn = Math.min(1, f / .24);
    const direction = (from, to) => (to.x-from.x) / Math.hypot(to.x-from.x, to.z-from.z);
    if (i === last) {
      const tile = r.tiles[g.route[last]], pose = passPose(r, tile, 1 - f, travel, false, azimuth);
      pose.heading = EBS.util.lerp(direction(previous, tile), pose.heading, turn);
      return pose;
    }
    const a = r.tiles[g.route[i]], b = r.tiles[g.route[i + 1]];
    const forward = direction(a, b);
    let from = forward;
    if (turn < 1) from = i === 0 ? passPose(r, a, 1, 0, true, azimuth).heading : direction(previous, a);
    return { x: a.x + (b.x - a.x) * f, z: a.z + (b.z - a.z) * f,
      floor: a.height + (b.height - a.height) * f, heading: EBS.util.lerp(from, forward, turn), gait: travel };
  }

  // Keep the part of a solid face on the visible side of a plane.
  function clipFace(points, distance) {
    const visible = [];
    let a = points[points.length - 1], da = distance(a);
    for (const b of points) {
      const db = distance(b);
      if ((da >= 0) !== (db >= 0)) {
        const f = da / (da - db);
        visible.push(a.map((value, i) => value + (b[i] - value) * f));
      }
      if (db >= 0) visible.push(b);
      a = b; da = db;
    }
    return visible;
  }

  // Restore the actual foreground rock faces from the board render. The same
  // cached triangle mesh is available for both the WebGL and Canvas backends.
  function coverWithRidge(g, view, round, pose) {
    const sx = Math.sin(view.camera.azimuth), sz = Math.cos(view.camera.azimuth);
    const foreground = p => (p[0] - pose.x) * sx + (p[2] - pose.z) * sz;
    g.save(); g.beginPath();
    for (const id of [pose.ridge.id, ...pose.ridge.neighbors]) {
      if (round.tiles[id].terrain !== 'mountain') continue;
      const mesh = view.geometryCache.get(id), data = mesh.data;
      for (let i = mesh.baseCount; i < mesh.count; i += 30) {
        const vertices = [i, i + 10, i + 20].map(j => [data[j], data[j+1], data[j+2]]);
        const points = clipFace(vertices, foreground).map(p => view.project(...p));
        if (points.length < 3) continue;
        const [a, b, c] = points;
        // Same winding for the union, even if a back face overlaps a front face.
        if ((b.x-a.x)*(c.y-a.y) < (b.y-a.y)*(c.x-a.x)) points.reverse();
        g.moveTo(points[0].x, points[0].y);
        for (let j = 1; j < points.length; j++) g.lineTo(points[j].x, points[j].y);
        g.closePath();
      }
    }
    g.clip(); g.drawImage(view.canvas, 0, 0, view.width, view.height); g.restore();
  }
  // Drawn faces stay identical on machines with different emoji fonts.
  function faceIcon(g, kind, look) {
    const ink = '#382e2b';
    const line = (x, y, cx, cy, ex, ey) => {
      g.beginPath(); g.moveTo(x,y); g.quadraticCurveTo(cx,cy,ex,ey); g.stroke();
    };
    g.lineWidth = 1.35; g.lineCap = 'round'; g.strokeStyle = ink;
    disk(g, 0, 0, 9.2, 8.7, '#c7832d');
    disk(g, 0, -.55, 8.8, 8.0, '#ffcb57');
    if (kind === 'watch' || kind === 'alarm') {
      for (const x of [-3.6,3.6]) {
        disk(g,x,-1.7,2.95,3.6,'#fff9e8');
        disk(g,x+look*1.15,-1.45,1.35,2.0,ink);
      }
      if (kind === 'watch') line(-2.2,4.0,0,4.5,2.1,3.7);
      else {
        line(-6,-4.8,-4.4,-5.7,-2.5,-6.8); line(2.5,-6.8,4.4,-5.7,6,-4.8);
        disk(g,0,4.25,2.15,1.85,ink);
      }
    } else if (kind === 'relief') {
      line(-6,-2,-4,-.2,-2,-2); line(1.7,-2.1,3.8,-.4,5.7,-2.4);
      line(-3.1,3.2,-.8,5.8,2,2.9);
      disk(g,6,3.2,1.8,1.2,'#fffff0'); disk(g,7.9,2.5,1.2,1.05,'#fffff0');
    } else {
      line(-5.8,-2.5,-3.8,-3.4,-1.9,-2.5); disk(g,-3.8,-1.3,1.05,1.2,ink);
      line(1.8,-1.3,4,-3.5,6.1,-2); line(-4,3.1,-.4,6.6,5.3,1.6);
    }
  }

  function drawHqBubble(g, rect, size, scale, reaction, teamColor, look) {
    const above = rect.y > 29 * scale, flip = above ? 1 : -1;
    const anchorY = above ? rect.y : rect.y + rect.h;
    const uy = anchorY - flip * 17 * scale;
    // Face away from the busy centre; a passing column cannot move the bubble.
    const roomLeft = rect.x > 32*scale, roomRight = rect.x+rect.w+32*scale < size.w;
    const side = roomLeft && (rect.x+rect.w/2 < size.w/2 || !roomRight) ? -1 : 1;
    const ux = rect.x + rect.w * (side === 1 ? .84 : .16) + side * 16 * scale;
    g.save(); g.translate(ux, uy); g.scale(scale, scale);
    // Warm porcelain, with the faction colour at the tip of the tail.
    g.globalAlpha *= reaction.opacity;
    g.scale(reaction.zoom, reaction.zoom);
    g.save(); g.scale(side, flip);
    g.beginPath(); g.moveTo(-8,-11); g.lineTo(7,-11); g.quadraticCurveTo(15,-11,15,-3);
    g.lineTo(15,3); g.quadraticCurveTo(15,10,7,10); g.lineTo(-4,10);
    g.lineTo(-15,16); g.lineTo(-12,8); g.quadraticCurveTo(-15,6,-15,2);
    g.lineTo(-15,-3); g.quadraticCurveTo(-15,-11,-8,-11); g.closePath();
    g.fillStyle = '#fff6db'; g.strokeStyle = '#273840'; g.lineWidth = 1.65; g.lineJoin = 'round';
    g.fill(); g.stroke(); g.beginPath(); g.moveTo(-11,9); g.lineTo(-13,13); g.lineTo(-7,9);
    g.fillStyle = teamColor; g.fill(); g.restore();
    faceIcon(g, reaction.kind, look); g.restore();
    return { x: ux-16*scale, y: uy-16*scale, w: 32*scale, h: 32*scale };
  }

  function drawGiant(g, r, view, t) {
    const pose = giantPose(r, t, view.camera.azimuth);
    if (!pose) return;
    const {x, z, floor, heading, gait} = pose;
    const walk = Math.sin(gait * tau), lip = pose.ridge ? pose.ground - floor : 0;
    if (lip > 3.25) return;
    const yaw = .18 + .52 * heading;
    const co = Math.cos(yaw), si = Math.sin(yaw);
    const project = (u, y, v) => view.project(x + u * co + v * si, floor + y, z - u * si + v * co);
    const foot = project(0, .01, 0), edge = view.project(x + 1.5, floor, z);
    const span = Math.hypot(edge.x - foot.x, edge.y - foot.y);
    g.save();
    if (lip < .15) {
      const shadow = clamp(1 - lip / .15, 0, 1);
      disk(g, foot.x, foot.y, span * .9 * shadow, span * .31 * shadow, '#101e2499');
    }
    const faces = [], stone = [131, 117, 93], light = [174, 159, 119], moss = [104, 127, 77], dark = [84, 78, 70];
    function face(vertices, color) {
      const visible = lip > 0 ? clipFace(vertices, p => p[1] - lip) : vertices;
      const points = visible.map(p => project(...p));
      if (points.length < 3) return;
      faces.push({ points, color, depth: points.reduce((s,p)=>s+p.depth,0)/points.length });
    }
    function rock(cx, y, cz, rx, h, rz, color, twist = 0) {
      const rims = [[0,.66],[.19,1],[.75,.95],[1,.65]].map(([dy,radius]) =>
        Array.from({length:6}, (_, i) => {
          const ang = i*tau/6 + twist;
          return [cx+Math.sin(ang)*rx*radius,y+h*dy,cz+Math.cos(ang)*rz*radius];
        }));
      function shade(gain) { return 'rgb('+color.map(n=>Math.round(n*gain)).join(',')+')'; }
      for(let j=0;j<3;j++) for(let i=0;i<6;i++) {
        const k=(i+1)%6, normal=(i+.5)*tau/6+twist+yaw;
        const sun = Math.cos(normal+.86)*.19 + [0,.08,.19][j];
        face([rims[j][i],rims[j][k],rims[j+1][k],rims[j+1][i]],shade(.78+sun));
      }
      face(rims[3],shade(1.17));
    }
    const bob = Math.abs(walk)*.075;
    for(const side of [-1,1]) {
      const stride=walk*side, leg=side*.37;
      rock(leg,.07+Math.max(0,stride)*.13,.14+stride*.21,.41,.42,.49,dark);
      rock(leg,.37+Math.max(0,stride)*.10,stride*.12,.34,.65,.31,stone,.34);
    }
    rock(0,.92+bob,0,.62,.49,.43,dark,.24);
    rock(0,1.32+bob,0,.86,.98,.46,stone,.18);
    for(const side of [-1,1]) {
      const swing=-walk*side*.19;
      rock(side*.77,1.88+bob,swing*.3,.47,.59,.48,light,.12);
      rock(side*.82,2.29+bob,swing*.3,.40,.19,.39,moss,.12);
      rock(side*1.01,1.21+bob,swing,.34,.65,.33,stone);
      rock(side*1.05,.94+bob,swing+.08,.33,.40,.36,dark,.25);
    }
    rock(0,2.24+bob,0,.37,.31,.32,dark);
    rock(0,2.44+bob,.02,.46,.59,.40,light);
    rock(-.06,2.98+bob,-.01,.36,.15,.32,moss,.1);
    // Small inset amber eyes and the split crystal in the breastplate.
    for(const side of [-1,1]) {
      const u=side*.18;
      face([[u-.075,2.77+bob,.39],[u+.075,2.77+bob,.39],[u+.09,2.71+bob,.40],[u-.07,2.70+bob,.40]],'#ffdd83');
    }
    face([[0,2.13+bob,.48],[.15,1.96+bob,.49],[.01,1.66+bob,.48],[-.13,1.93+bob,.49]],'#fbc16b');
    faces.sort((u,v)=>v.depth-u.depth);
    for(const f of faces) polygon(g,f.points,f.color);
    if (pose.ridge) coverWithRidge(g, view, r, pose);
    g.restore();
  }

  function drawMeteor(g, r, view, t) {
    const m=r.meteor;
    if (!m || t < m.start || t >= m.until) return;
    const tile=r.tiles[m.tile], p=view.project(tile.x,tile.height+.045,tile.z);
    const edge=view.project(tile.x+1,tile.height+.045,tile.z), size=Math.hypot(edge.x-p.x,edge.y-p.y);
    const ring=(radius,color,width) => {
      g.beginPath(); g.ellipse(p.x,p.y,size*radius,size*radius*.65,0,0,tau);
      g.lineWidth=size*width; g.strokeStyle=color; g.stroke();
    };
    g.save();
    const age=t-m.impact;
    if(age<0) {
      const progress=clamp((t-m.start)/(m.impact-m.start),0,1);
      const shadow=view.project(tile.x-2.7*(1-progress),tile.height+.045,tile.z-1.6*(1-progress));
      disk(g,shadow.x,shadow.y,size*(.22+.48*progress),size*(.15+.31*progress),'#29202cb0');
      ring(.84,'#ffb96b',.062); ring(1.3-.43*((t-m.start)%1),'#ffe3acaa',.025);
      // The final descent is spatially continuous with the impact.
      if(age >= -1.65) {
        const u=-age/1.65, head={x:p.x-size*2.35*u,y:p.y-size*4.9*u};
        const tail={x:head.x-size*(.8+u),y:head.y-size*(1.9+u*1.9)};
        const flame=g.createLinearGradient(tail.x,tail.y,head.x,head.y);
        flame.addColorStop(0,'#ff9b3300'); flame.addColorStop(.52,'#ff8134aa'); flame.addColorStop(1,'#ffda77');
        polygon(g,[tail,{x:head.x+size*.22,y:head.y-size*.17},{x:head.x+size*.12,y:head.y+size*.1},{x:head.x-size*.21,y:head.y+size*.07}],flame);
        glow(g,head.x,head.y,size*.48,'#fff5bccc','#ff772000');
        disk(g,head.x,head.y,size*.17,size*.18,'#fff1c2');
      }
    } else {
      const fade=clamp((m.until-t)/2,0,1);
      g.globalAlpha*=fade;
      disk(g,p.x,p.y,size*.87,size*.56,'#775447');
      disk(g,p.x,p.y-size*.02,size*.68,size*.41,'#382f33');
      ring(.61,age<5?'#ed965e':'#ac7460',.045);
      for(let i=0;i<9;i++){
        const a=i*2.4+.12,rad=.58+(i%3)*.10,xx=p.x+Math.cos(a)*size*rad,yy=p.y+Math.sin(a)*size*rad*.61;
        polygon(g,[{x:xx-size*.09,y:yy},{x:xx-size*.02,y:yy-size*.115},{x:xx+size*.10,y:yy-size*.025},{x:xx+size*.05,y:yy+size*.04}],i%2?'#94806e':'#ad795b');
      }
      if(age<1.6) {
        g.globalAlpha*=1-age/1.6;
        ring(.6+age*1.55,'#ffce87',.085);
        glow(g,p.x,p.y,size*(1.05+age*.75),'#ffcf89bf','#ff893000');
        for(let i=0;i<11;i++) {
          const ang=i*2.4,reach=size*age*(.65+(i%3)*.46);
          disk(g,p.x+Math.cos(ang)*reach,p.y+Math.sin(ang)*reach*.68-size*Math.sin(Math.PI*age/1.6)*(.35+(i%4)*.21),size*.044,size*.037,'#ffdb98');
        }
      }
    }
    g.restore();
  }
  EBS.Territory.drawHqBubble = drawHqBubble;
  EBS.Territory.drawWilds = function (g, round, view, time, afterResult = 0) {
    drawMeteor(g,round,view,time);
    drawGiant(g,round,view,time + afterResult);
  };
  EBS.Territory.wildsNotice = function (round, time) {
    if (round.phase !== 'running') return '';
    const m = round.meteor;
    if (m && time < m.impact) return 'METEOR INBOUND';
    if (m && time - m.impact < 5) return 'CRATER BLOCKS THE PASS';
    const untilEntry = firstStepAt(round) - time;
    if (round.giant ? time - round.giant.start < 1.5 : untilEntry >= 0 && untilEntry < approachTime * .74) {
      return 'A STONE GIANT EMERGES';
    }
    return '';
  };
})();
