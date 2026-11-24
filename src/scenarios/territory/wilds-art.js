/* Map-scale art for the neutral stone giant and meteor. Every point is
 * projected by the board camera, including the shadow and the warning ring. */
(function () {
  'use strict';
  const clamp = EBS.util.clamp, tau = Math.PI * 2;

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

  function drawGiant(g, r, view, t) {
    const giant = r.giant;
    if (!giant || t < giant.start) return;
    const travel = (t - giant.start) / giant.stride, last = giant.route.length - 1;
    if (travel >= last + 1) return;
    const idx = Math.min(last - 1, Math.floor(travel)), f = clamp(travel - idx, 0, 1);
    const a = r.tiles[giant.route[idx]], b = r.tiles[giant.route[idx + 1]];
    const walk = Math.sin(travel * tau), x = a.x + (b.x - a.x) * f, z = a.z + (b.z - a.z) * f;
    const floor = a.height + (b.height - a.height) * f;
    const yaw = .18 + .52 * (b.x - a.x) / Math.hypot(b.x - a.x, b.z - a.z);
    const co = Math.cos(yaw), si = Math.sin(yaw);
    const project = (u, y, v) => view.project(x + u * co + v * si, floor + y, z - u * si + v * co);
    const foot = project(0, .01, 0), edge = view.project(x + 1.5, floor, z);
    const span = Math.hypot(edge.x - foot.x, edge.y - foot.y);
    g.save();
    g.globalAlpha *= Math.min(1, (t-giant.start+.1)/1.2, (last+1-travel)*giant.stride/1.2);
    disk(g, foot.x, foot.y, span * .9, span * .31, '#101e2499');
    const faces = [], stone = [131, 117, 93], light = [174, 159, 119], moss = [104, 127, 77], dark = [84, 78, 70];
    function face(vertices, color) {
      const points = vertices.map(p => project(...p));
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
  EBS.Territory.drawWilds = function (g, round, view, time) {
    drawMeteor(g,round,view,time);
    drawGiant(g,round,view,time);
  };
  EBS.Territory.wildsNotice = function (round, time) {
    if (round.phase !== 'running') return '';
    const m = round.meteor;
    if (m && time < m.impact) return 'METEOR INBOUND';
    if (m && time - m.impact < 5) return 'CRATER BLOCKS THE PASS';
    if (round.giant && time - round.giant.start < 5) return 'A STONE GIANT APPEARS';
    return '';
  };
})();
