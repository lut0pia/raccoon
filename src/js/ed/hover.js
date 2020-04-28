// Raccoon hover mechanism
'use strict';

function rcn_hover(canvas) {
  this.canvas = canvas;
  this.current_x = null;
  this.current_y = null;
  this.tile_size = 1;

  const hover = this;
  canvas.node.addEventListener('mousemove', function(e) {
    hover.mouse_x = e.clientX;
    hover.mouse_y = e.clientY;
    hover.refresh_hovering();
  });
  canvas.node.addEventListener('mouseout', function(e) {
    hover.update_hovering(null);
  });
  canvas.onpostflush.push(function() {
    hover.draw();
  });
}

rcn_hover.prototype.is_hovering = function() {
  return this.current_x !== null;
}

rcn_hover.prototype.refresh_hovering = function() {
  const canvas_coords = this.canvas.node.getBoundingClientRect();
  const tex_coords = this.canvas.client_to_texture_coords(this.mouse_x - canvas_coords.x, this.mouse_y - canvas_coords.y);
  this.update_hovering(tex_coords);
}

rcn_hover.prototype.update_hovering = function(tex_coords) {
  if(tex_coords) {
    const rel_tile_x = Math.floor(tex_coords.x / this.tile_size);
    const rel_tile_y = Math.floor(tex_coords.y / this.tile_size);

    if(rel_tile_x !== this.current_x || rel_tile_y !== this.current_y) {
      this.current_x = rel_tile_x;
      this.current_y = rel_tile_y;
      if(this.onchange) {
        this.onchange();
      }
      this.canvas.flush();
    }
  } else if(this.is_hovering()) {
    this.current_x = null;
    this.current_y = null;
    if(this.onchange) {
      this.onchange();
    }
    this.canvas.flush();
  }
}

rcn_hover.prototype.draw = function() {
  if(!this.is_hovering()) {
    return;
  }
  const vp = this.canvas.compute_viewport();
  this.canvas.draw_outline(
    vp.x + this.current_x * vp.mul * this.tile_size,
    vp.y + this.current_y * vp.mul * this.tile_size,
    vp.mul * this.tile_size, vp.mul * this.tile_size,
    1, 1, 1, 1, 0.7,
  );
}
