/* Canvas2D scenes use the same Pixi stage/capture as the existing scenarios.
 * The scene paints the entire logical frame, including its intended HUD.
 * Only this adapter owns the upload texture; rendering must not advance physics. */
(function () {
  'use strict';
  EBS.CanvasScene = class CanvasScene {
    constructor({ world, renderScale }) {
      this.world = world; this.scale = renderScale;
      this.canvas = document.createElement('canvas');
      this.canvas.width = Math.round(world.w * renderScale);
      this.canvas.height = Math.round(world.h * renderScale);
      this.ctx = this.canvas.getContext('2d', { alpha: false });
      this.texture = PIXI.Texture.from(this.canvas);
      const sprite = new PIXI.Sprite(this.texture);
      sprite.width = world.w; sprite.height = world.h;
      this.root = new PIXI.Container(); this.root.addChild(sprite);
    }
    draw() {
      this.ctx.save();
      this.ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
      this.paint(this.ctx);
      this.ctx.restore();
      this.texture.source.update();
    }
    destroy() {
      this.root.destroy({ children: true });
      this.texture.destroy(true);
      this.canvas.width = this.canvas.height = 1;
    }
  };
})();
