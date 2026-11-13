/* Rectangular material arena (v3). The archived 900×900 rules and v2 stay intact.
 * Only the arena geometry/bounds and cover change; weapons, steering, damage,
 * supply limits and fixed-step scheduling still come from the reference. */
(function () {
  'use strict';
  const { clamp } = EBS.util;
  const WIDTH = 1040, HEIGHT = 540, EDGE = 18;
  const materials = {
    wood: { name: 'HOLZ', hp: 38, color: '#c98a46' },
    stone: { name: 'STEIN', hp: 95, color: '#768b9c' },
    concrete: { name: 'BETON', hp: 190, color: '#d0ccc0' },
  };
  // Each quadrant mirrors the same cover budget. The central cross and outer
  // circuit stay passable at full robot radius, before anything is destroyed.
  const quadrants = {
    yard: [[250,112,82,64,'stone'],[342,112,64,64,'wood'],[250,186,82,42,'concrete'],[424,186,64,42,'wood']],
    foundry: [[234,108,58,104,'concrete'],[304,108,64,64,'wood'],[390,108,72,64,'stone'],[390,182,72,42,'wood']],
    crossroads: [[232,100,86,60,'stone'],[328,100,64,60,'wood'],[328,170,64,56,'concrete'],[418,184,64,42,'wood']],
  };
  function cover(arena) {
    const blocks = [];
    for (const [mx,my] of [[false,false],[true,false],[true,true],[false,true]]) {
      for (const [x,y,w,h,material] of quadrants[arena] || quadrants.yard) {
        const hp = materials[material].hp;
        blocks.push({ id: blocks.length, x: mx ? WIDTH-x-w : x, y: my ? HEIGHT-y-h : y,
          w,h,material,hp,maxHp:hp,alive:true });
      }
    }
    return blocks;
  }
  const distanceToBox = (x,y,b) => Math.hypot(x-clamp(x,b.x,b.x+b.w),y-clamp(y,b.y,b.y+b.h));
  // Swept intersections match the source equations; wider bounds cannot turn
  // high-speed bullets into point samples or permit tunnelling through cover.
  function segmentBox(x0,y0,x1,y1,b,pad) {
    let near=0,far=1;
    for (const [p,d,lo,hi] of [[x0,x1-x0,b.x-pad,b.x+b.w+pad],[y0,y1-y0,b.y-pad,b.y+b.h+pad]]) {
      if (Math.abs(d)<1e-9) { if (p<lo || p>hi) return null; }
      else { let a=(lo-p)/d,z=(hi-p)/d; if(a>z) [a,z]=[z,a]; near=Math.max(near,a);far=Math.min(far,z);if(near>far)return null; }
    }
    return near>=0 && near<=1 ? near : null;
  }
  function segmentCircle(x0,y0,x1,y1,r,pad) {
    const dx=x1-x0,dy=y1-y0,fx=x0-r.x,fy=y0-r.y,a=dx*dx+dy*dy,c=fx*fx+fy*fy-(r.r+pad)**2;
    if(c<=0)return 0;if(a<1e-12)return null;
    const b=2*(fx*dx+fy*dy),d=b*b-4*a*c;if(d<0)return null;
    const t=(-b-Math.sqrt(d))/(2*a);return t>=0&&t<=1?t:null;
  }
  class MaterialRound extends EBS.ScrapRules.Round {
    constructor(options) {
      super({ ...options, rulesVersion:'v2' });
      this.rulesVersion='v3'; this.bounds={w:WIDTH,h:HEIGHT,edge:EDGE};
      this.blocks=cover(this.arena);
      const starts=[[106,84],[WIDTH-106,84],[WIDTH-106,HEIGHT-84],[106,HEIGHT-84]];
      for(const r of this.robots) {
        [r.x,r.y]=starts[r.id];r.lastX=r.x;r.lastY=r.y;
        r.goalX=WIDTH/2;r.goalY=HEIGHT/2;
        r.angle=Math.atan2(r.goalY-r.y,r.goalX-r.x);
        r.vx=Math.cos(r.angle)*r.speed;r.vy=Math.sin(r.angle)*r.speed;
      }
      this.pads[0].x=this.pads[1].x=WIDTH/2;
      this.pads[0].y=96;this.pads[1].y=HEIGHT-96;
      [[140,HEIGHT/2],[WIDTH-140,HEIGHT/2],[420,HEIGHT/2],[WIDTH-420,HEIGHT/2]].forEach(([x,y],i)=>{
        this.pickups[i].x=x;this.pickups[i].y=y;
      });
    }
    _think(r) {
      // Same v2 choice of supply, same reference circling, with rectangular clamps.
      r.thinkIn=.38+this.rng.next()*.22;
      if(!r.weapon) {
        let best=Infinity,goal=null;
        for(const p of this.pickups.filter(p=>!p.empty&&p.ammo>0).concat(this.pads)) {
          const cost=Math.hypot(p.x-r.x,p.y-r.y)+Math.max(0,p.readyIn||0)*r.speed+(this._blocked(r.x,r.y,p.x,p.y,r.r)?450:0);
          if(cost<best){best=cost;goal=p;}
        }
        if(goal){r.goalX=goal.x;r.goalY=goal.y;}
      } else {
        const enemy=this._nearestEnemy(r);if(!enemy)return;
        const dx=enemy.x-r.x,dy=enemy.y-r.y,d=Math.hypot(dx,dy)||1;
        const chase=d>350?.85:d<165?-.8:.18,side=.65*r.turnBias;
        r.goalX=r.x+(dx*chase-dy*side)/d*160;r.goalY=r.y+(dy*chase+dx*side)/d*160;
      }
      r.goalX=clamp(r.goalX,EDGE+r.r+5,WIDTH-EDGE-r.r-5);
      r.goalY=clamp(r.goalY,EDGE+r.r+5,HEIGHT-EDGE-r.r-5);
    }
    _safeDrop(r) {
      for(let i=0;i<8;i++) {
        const a=r.angle+Math.PI/2+i*Math.PI/4,x=r.x+Math.cos(a)*27,y=r.y+Math.sin(a)*27;
        if(x>EDGE+12&&x<WIDTH-EDGE-12&&y>EDGE+12&&y<HEIGHT-EDGE-12&&!this.blocks.some(b=>b.alive&&distanceToBox(x,y,b)<13))return{x,y};
      }
      return{x:r.x,y:r.y};
    }
    _resolveRobot(r) {
      const lo=EDGE+r.r;
      if(r.x<lo){r.x=lo;this._reflect(r,1,0);}if(r.x>WIDTH-lo){r.x=WIDTH-lo;this._reflect(r,-1,0);}
      if(r.y<lo){r.y=lo;this._reflect(r,0,1);}if(r.y>HEIGHT-lo){r.y=HEIGHT-lo;this._reflect(r,0,-1);}
      for(let pass=0;pass<2;pass++)for(const b of this.blocks)if(b.alive) {
        let dx=r.x-clamp(r.x,b.x,b.x+b.w),dy=r.y-clamp(r.y,b.y,b.y+b.h),d=Math.hypot(dx,dy),penetration;
        if(d>=r.r)continue;
        if(d<.0001) {
          const sides=[[r.x-b.x,-1,0],[b.x+b.w-r.x,1,0],[r.y-b.y,0,-1],[b.y+b.h-r.y,0,1]].sort((a,z)=>a[0]-z[0]);
          dx=sides[0][1];dy=sides[0][2];penetration=r.r+sides[0][0]+.01;
        } else {dx/=d;dy/=d;penetration=r.r-d+.01;}
        r.x+=dx*penetration;r.y+=dy*penetration;this._reflect(r,dx,dy);
      }
    }
    _hurtBlock(b,amount,color) {
      const alive=b.alive;
      super._hurtBlock(b,amount,materials[b.material]?.color||color);
      if(alive&&!b.alive) {
        const effect=this.effects.at(-1);
        if(effect?.type==='break')effect.material=b.material;
      }
    }
    _moveProjectiles(dt) {
      const keep=[];
      for(const p of this.projectiles) {
        p.px=p.x;p.py=p.y;
        const nx=p.x+p.vx*dt,ny=p.y+p.vy*dt,lo=EDGE+p.radius,hiX=WIDTH-lo,hiY=HEIGHT-lo;
        let hitT=1.00001,robot=null,block=null,hit=false;
        if(nx<lo||nx>hiX||ny<lo||ny>hiY) {
          const candidates=[];
          if(nx<lo)candidates.push((lo-p.x)/(nx-p.x));if(nx>hiX)candidates.push((hiX-p.x)/(nx-p.x));
          if(ny<lo)candidates.push((lo-p.y)/(ny-p.y));if(ny>hiY)candidates.push((hiY-p.y)/(ny-p.y));
          hitT=Math.max(0,Math.min(...candidates));hit=true;
        }
        for(const b of this.blocks)if(b.alive) {
          const t=segmentBox(p.x,p.y,nx,ny,b,p.radius);
          if(t!==null&&t<hitT){hitT=t;block=b;robot=null;hit=true;}
        }
        for(const r of this.robots)if(r.alive&&r.id!==p.owner) {
          const t=segmentCircle(p.x,p.y,nx,ny,r,p.radius);
          if(t!==null&&t<hitT){hitT=t;robot=r;block=null;hit=true;}
        }
        p.life-=dt;
        if(hit) {
          p.x+=(nx-p.x)*hitT;p.y+=(ny-p.y)*hitT;
          if(p.kind==='rocket')this._explode(p,robot?.id??null,block?.id??null);
          else {
            const spec=ScrapArena.WEAPONS.blaster,color=this.robots[p.owner].color;
            if(robot)this._hurtRobot(robot,spec.damage,p.owner,p.x,p.y);
            if(block)this._hurtBlock(block,spec.blockDamage,color);
            this._effect('hit',p.x,p.y,color,17,.28);
          }
        } else {
          p.x=nx;p.y=ny;
          if(p.life<=0&&p.kind==='rocket')this._explode(p);else if(p.life>0)keep.push(p);
        }
      }
      this.projectiles=keep;
    }
    checkInvariants() {
      const result=super.checkInvariants();
      // Replace only the reference square boundary assertion with the actual
      // rectangle. All health, cover, weapon and pool assertions still apply.
      result.errors=result.errors.filter(e=>!/^Robot \d+: outside arena$/.test(e));
      for(const r of this.robots)if(r.x<EDGE+r.r-.05||r.x>WIDTH-EDGE-r.r+.05||r.y<EDGE+r.r-.05||r.y>HEIGHT-EDGE-r.r+.05)result.errors.push(`Robot ${r.id}: outside material arena`);
      for(const b of this.blocks)if(!materials[b.material]||b.maxHp!==materials[b.material].hp||b.x<EDGE||b.y<EDGE||b.x+b.w>WIDTH-EDGE||b.y+b.h>HEIGHT-EDGE)result.errors.push(`Block ${b.id}: invalid material/geometry`);
      for(const p of this.pickups)if(!p.empty&&(p.x<EDGE||p.y<EDGE||p.x>WIDTH-EDGE||p.y>HEIGHT-EDGE||this.blocks.some(b=>b.alive&&distanceToBox(p.x,p.y,b)<13)))result.errors.push(`Pickup ${p.id}: unreachable placement`);
      result.ok=!result.errors.length;return result;
    }
  }
  EBS.ScrapMaterials={Round:MaterialRound,materials,width:WIDTH,height:HEIGHT,edge:EDGE};
})();
