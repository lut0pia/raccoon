// Raccoon selection mechanism
'use strict';

function rcn_selection(canvas) {
  this.canvas = canvas;
  this.requires_shift = false;
  this.x = null;
  this.y = null;
  this.tile_size = 1;

  const selection = this;
  canvas.onpostflush.push(function() {
    selection.draw();
  });
}

rcn_selection.prototype.is_selecting = function() {
  return this.x !== null;
}

rcn_selection.prototype.set = function(x0, y0, x1, y1) {
  this.x = x0;
  this.y = y0;
  this.w = x1 - x0 + 1;
  this.h = y1 - y0 + 1;

  if(this.onchange) {
    this.onchange();
  }
  this.canvas.flush();
}

rcn_selection.prototype.event = function(e, tex_coords) {
  if(this.requires_shift && !e.shiftKey) {
    return false;
  }
  if(e.buttons == 1) { // Left button
    const x = Math.floor(tex_coords.x / this.tile_size);
    const y = Math.floor(tex_coords.y / this.tile_size);
    if(e.type === 'mousedown') {
      this.start_x = this.end_x = x;
      this.start_y = this.end_y = y;
    } else {
      this.end_x = x;
      this.end_y = y;
    }

    this.set(
      Math.min(this.start_x, this.end_x),
      Math.min(this.start_y, this.end_y),
      Math.max(this.start_x, this.end_x),
      Math.max(this.start_y, this.end_y),
    );

    return true;
  }
  return false;
}

rcn_selection.prototype.reset = function() {
  this.x = null;
  this.canvas.flush();
}

rcn_selection.prototype.draw = function() {
  if(!this.is_selecting()) {
    return;
  }
  const vp = this.canvas.compute_viewport();
  this.canvas.draw_outline(
    vp.x + this.x * vp.mul * this.tile_size,
    vp.y + this.y * vp.mul * this.tile_size,
    this.w * vp.mul * this.tile_size,
    this.h * vp.mul * this.tile_size,
    2, 1, 1, 1, 1,
  );
}
