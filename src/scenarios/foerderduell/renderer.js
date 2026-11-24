(function () {
  'use strict';
  const F=EBS.Foerderduell;
  const english={steady:'SINGLE FEED',bursts:'TWO WAVES',packets:'MIXED BATCHES'};
  const titles={auger:'AUGER WINS',piston:'PISTON WINS',tie:'TIE AT THE LINE'};

  function surface(w,h,scale) {
    const canvas=document.createElement('canvas');
    canvas.width=Math.ceil(w*scale); canvas.height=Math.ceil(h*scale);
    const g=canvas.getContext('2d');
    g.setTransform(scale,0,0,scale,0,0); g.lineCap=g.lineJoin='round';
    return {canvas,g};
  }
  function marbleSprites(r,scale) {
    const half=r+3, size=half*2;
    return Array.from({length:4},(_,i)=>{
      const layer=surface(size,size,scale);
      F.art(layer.g).marble(half,half,r,i);
      return {canvas:layer.canvas,half,size:layer.canvas.width/scale};
    });
  }

  class Renderer extends EBS.CanvasScene {
    constructor(ctx) {
      super(ctx);
      this.sim=ctx.sim; this.view=ctx.view; this.layout=F.layout(ctx.world);
      const {frame}=this.layout;
      this.fit=Math.min(ctx.world.w/frame.w,ctx.world.h/frame.h);
      const scale=this.fit*ctx.renderScale;
      this.board=surface(frame.w,frame.h,scale);
      this.glass=surface(frame.w,frame.h,scale);
      this.paintBoard(this.board.g,this.glass.g);
      this.art=F.art(this.ctx);
      this.beads=marbleSprites(frame.r,scale*F.chamberLens);
    }
    paintBoard(g,front) {
      const {frame,lanes}=this.layout, {r,w,h}=frame, art=F.art(g), cover=F.art(front);
      art.background(w,h); art.drive(frame);
      for(const [i,l] of lanes.entries()) {
        const {lane,side,axes,rad,inlet,outlet}=l;
        art.mount(lane.root[0],lane.root[1]+15,r*4.3);
        art.mount(...axes.at(axes.length*.80,side*(rad+4)),r*2.5);
        for(const track of [inlet,outlet]) art.glassPipe(track.points,track.diameter,track.path);
        if(i===0) {
          g.save(); g.translate(...lane.root); g.rotate(axes.angle);
          art.augerMachine(axes.length,r,null,false);
          g.restore();
        }
        front.save(); front.translate(...lane.root); front.rotate(axes.angle);
        if(i) cover.pressCover(axes.length,rad,.35*Math.sin(axes.angle)-.94*Math.cos(axes.angle)>0?1:-1);
        else cover.augerCover(axes.length,rad);
        cover.port(l.inletU,-side*rad,r,F.materials[i]); cover.port(l.outletU,side*(rad+2.7),r,F.materials[i]);
        front.restore();
        art.target(frame,lane,side,null,'back'); cover.target(frame,lane,side,null,'front');
      }
      art.feedUnit(frame,null,2.8*r,'back'); cover.feedUnit(frame,null,2.8*r,'front');
    }
    paint(g) {
      const {frame,lanes,portrait}=this.layout, {w,h,r}=frame, {sim,art}=this;
      g.translate((this.world.w-this.fit*w)/2,(this.world.h-this.fit*h)/2);
      g.scale(this.fit,this.fit); g.lineJoin=g.lineCap='round';
      g.drawImage(this.board.canvas,0,0,w,h);
      const beat=sim.beat, turns=F.Auger.turnsAt(beat);
      for(const [i,l] of lanes.entries()) {
        g.save(); g.translate(...l.lane.root); g.rotate(l.axes.angle);
        if(i===0) {
          F.drawAugerHalf(g,l.screw,turns,false);
        } else {
          const phase=((beat-3.86)%6+6)%6;
          const angle=phase<.46 ? Math.PI*F.smooth(phase/.46) : Math.PI*(1+F.smooth((phase-.46)/.62));
          const push=(1-Math.cos(angle))/2;
          const gate=F.smooth(phase/.34)*(1-F.smooth((phase-.64)/.31));
          art.pressMachine(l.axes.length,r,null,angle,push,gate,false);
        }
        g.restore();
        const balls=sim.round.lanes[i], shifted=F.discharged(balls,beat);
        const foreground=[];
        for(const ball of balls) {
          const pos=F.position(ball,balls,i,beat,l,r,shifted);
          if(!pos) continue;
          const sprite=this.beads[sim.round.colors[ball.id]];
          if(!i && pos[3]>r) foreground.push([pos,sprite]);
          else this.drawMarble(g,pos,sprite);
        }
        if(i===0) {
          g.save(); g.translate(...l.lane.root); g.rotate(l.axes.angle);
          F.drawAugerHalf(g,l.screw,turns,true);
          g.restore();
          for(const [pos,sprite] of foreground) this.drawMarble(g,pos,sprite);
        }
      }
      g.drawImage(this.glass.canvas,0,0,w,h);
      if(!this.view.hud) return;
      const [x,y,size]=frame.title;
      g.textAlign='center'; g.textBaseline='alphabetic';
      g.fillStyle='#bab9b9'; g.font='600 '+Math.round(size*.29)+'px Bahnschrift, Arial, sans-serif';
      g.fillText('ROUND '+(sim.roundIndex+1)+'   ·   '+english[sim.round.profile],x,y-size*1.04);
      if(sim.result) {
        g.font='700 '+Math.round(size*.90)+'px Bahnschrift, Arial, sans-serif';
        g.fillStyle=sim.result==='piston'?'#f8c5a1':'#f3f2ef'; g.fillText(titles[sim.result],x,y);
      } else art.title(frame.title);
      if(portrait) art.portraitStand(frame,sim.scores);
      else for(const [i,l] of lanes.entries()) art.score(l.lane.cup[0],l.floor+49,l.side,sim.scores[i],.95);
    }
    destroy() {
      for(const layer of [this.board,this.glass,...this.beads]) layer.canvas.width=layer.canvas.height=1;
      super.destroy();
    }
    drawMarble(g,pos,sprite) {
      const zoom=pos[2]/this.layout.frame.r;
      g.drawImage(sprite.canvas,pos[0]-sprite.half*zoom,pos[1]-sprite.half*zoom,sprite.size*zoom,sprite.size*zoom);
    }
  }
  F.Renderer=Renderer;
})();
