// Raccoon map editor
'use strict';

function rcn_map_ed() {
  rcn_map_ed.prototype.__proto__ = rcn_window.prototype;
  rcn_window.call(this);

  // Init map editing state
  this.offset_x = 0;
  this.offset_y = 0;
  this.zoom = 0;

  const map_ed = this;

  // Create map coords text
  this.map_coords_text = document.createElement('div');
  this.map_coords_text.classList.add('map_coords');
  this.add_child(this.map_coords_text);

  // Create map canvas
  this.map_canvas = new rcn_canvas();
  this.map_canvas.node.classList.add('map');
  let shift_start_client_x, shift_start_client_y, shift_start_offset_x, shift_start_offset_y;
  this.map_canvas.interaction(function(e, tex_coords) {
    if(map_ed.selection.event(e, tex_coords)) {
      return;
    }
    if(e.buttons == 1) { // Left button: draw
      map_ed.set_tile(tex_coords.x >> 3, tex_coords.y >> 3);
    } else if(e.buttons == 2) { // Right button: tile pick
      rcn_current_sprite = map_ed.get_tile(tex_coords.x >> 3, tex_coords.y >> 3);
      rcn_current_sprite_columns = rcn_current_sprite_rows = 1;
      map_ed.update_map_canvas();
      rcn_dispatch_ed_event('rcn_current_sprite_change');
    } else if(e.buttons == 4) { // Middle button: shift map
      if(e.type == 'mousedown') {
        shift_start_client_x = e.clientX;
        shift_start_client_y = e.clientY;
        shift_start_offset_x = map_ed.offset_x;
        shift_start_offset_y = map_ed.offset_y;
        e.preventDefault();
      }
      if(shift_start_client_x != undefined && shift_start_offset_y != undefined) {
        const vp = map_ed.map_canvas.compute_viewport();
        map_ed.offset_x = shift_start_offset_x + (shift_start_client_x - e.clientX) / (vp.mul * 8);
        map_ed.offset_y = shift_start_offset_y + (shift_start_client_y - e.clientY) / (vp.mul * 8);
        map_ed.update_map_canvas();
        map_ed.selection.reset();
        e.preventDefault();
      }
    }
  });
  this.map_canvas.node.addEventListener('wheel', function(e) {
    map_ed.change_zoom(-Math.sign(e.deltaY))
    e.preventDefault();
  });
  this.selection = new rcn_selection(this.map_canvas);
  this.selection.requires_shift = true;
  this.selection.tile_size = 8;
  this.hover = new rcn_hover(this.map_canvas);
  this.hover.tile_size = 8;
  this.hover.onchange = function() {
    if(this.is_hovering()) {
      const abs_tile_x = this.current_x + map_ed.offset_x;
      const abs_tile_y = this.current_y + map_ed.offset_y;

      map_ed.map_coords_text.innerText =
        abs_tile_x.toString().padStart(3, '0') + ';' +
        abs_tile_y.toString().padStart(3, '0');
    } else {
      map_ed.map_coords_text.innerText = '???;???';
    }
    map_ed.update_map_canvas();
  }
  this.add_child(this.map_canvas.node);

  this.addEventListener('rcn_bin_change', function(e) {
    // Map data update
    const mem_map_begin = rcn.mem_map_offset;
    const mem_map_end = rcn.mem_map_offset + rcn.mem_map_size;
    if(e.detail.begin < mem_map_end && e.detail.end > mem_map_begin) {
      map_ed.update_map_canvas();
    }

    // Palette update
    const mem_palette_begin = rcn.mem_palette_offset;
    const mem_palette_end = rcn.mem_palette_offset + rcn.mem_palette_size;
    if(e.detail.begin < mem_palette_end && e.detail.end > mem_palette_begin) {
      map_ed.update_map_canvas();
    }

    // Spritesheet data update
    const mem_spritesheet_begin = rcn.mem_spritesheet_offset;
    const mem_spritesheet_end = rcn.mem_spritesheet_offset + rcn.mem_spritesheet_size;
    if(e.detail.begin < mem_spritesheet_end && e.detail.end > mem_spritesheet_begin) {
      map_ed.update_map_canvas();
    }
  });

  this.addEventListener('rcn_window_resize', function() {
    map_ed.map_canvas.flush();
  });
  this.addEventListener('keydown', function(e) {
    const ctrl = e.ctrlKey || e.metaKey;
    if(e.key == 'ArrowLeft') {
      map_ed.move_selection(-1, 0);
    } else if(e.key == 'ArrowRight') {
      map_ed.move_selection(1, 0);
    } else if(e.key == 'ArrowUp') {
      map_ed.move_selection(0, -1);
    } else if(e.key == 'ArrowDown') {
      map_ed.move_selection(0, 1);
    } else if(ctrl && e.key == 'c') {
      map_ed.copy_selection();
    } else if(ctrl && e.key == 'v') {
      map_ed.paste_selection();
    }
  });
  this.addEventListener('blur', function(e) {
    map_ed.selection.reset();
  });

  this.hover.onchange();
  this.update_map_canvas();
}

rcn_map_ed.prototype.title = 'Map Editor';
rcn_map_ed.prototype.docs_link = 'map-editor';
rcn_map_ed.prototype.type = 'map_ed';
rcn_editors.push(rcn_map_ed);

rcn_map_ed.prototype.get_tile_index = function(rel_x, rel_y) {
  const x = this.offset_x + rel_x;
  const y = this.offset_y + rel_y;
  return rcn.mem_map_offset + (y << 7) + (x << 0);
}

rcn_map_ed.prototype.set_tile = function(map_x, map_y) {
  const tile_index = this.get_tile_index(map_x, map_y);
  rcn_global_bin.rom[tile_index] = rcn_current_sprite;

  rcn_dispatch_ed_event('rcn_bin_change', {
    begin: tile_index,
    end: tile_index+1,
  });
}

rcn_map_ed.prototype.get_tile = function(map_x, map_y) {
  const tile_index = this.get_tile_index(map_x, map_y);
  return rcn_global_bin.rom[tile_index];
}

rcn_map_ed.prototype.get_viewport_width = function() {
  return rcn.map_width >> this.zoom;
}

rcn_map_ed.prototype.get_viewport_height = function() {
  return Math.min(rcn.map_height, this.get_viewport_width())
}

rcn_map_ed.prototype.update_map_canvas = function() {
  const vp_w = this.get_viewport_width();
  const vp_h = this.get_viewport_height();

  // Enforce offset validity
  this.offset_x = Math.max(0, Math.min(rcn.map_width - vp_w, this.offset_x)) << 0;
  this.offset_y = Math.max(0, Math.min(rcn.map_height - vp_h, this.offset_y)) << 0;

  const pixels = new Uint8Array(((vp_w * vp_h) << 6) >> 1);
  const map_row_size = (vp_w << 3) >> 1;

  const draw_tile = function(pixels, mx, my, spr) {
    const pix_x = mx << 3;
    const pix_y = my << 3;
    const pix_index = (pix_y * vp_w * 4) + (pix_x >> 1);
    const spr_tex_index = ((spr & 0xf) << 2) + ((spr >> 4) << 9);
    const spr_row_size = 4;

    for(let i = 0; i < 8; i++) {
      const spr_row_index = spr_tex_index + (i << 6);
      pixels.set(rcn_global_bin.rom.slice(spr_row_index, spr_row_index + spr_row_size), pix_index + i * map_row_size);
    }
  }

  for(let mx = 0; mx < vp_w; mx++) {
    for(let my = 0; my < vp_h; my++) {
      draw_tile(pixels, mx, my, this.get_tile(mx, my));
    }
  }

  // Draw hovered tile with stamp
  if(this.hover.is_hovering()) {
    draw_tile(pixels, this.hover.current_x, this.hover.current_y, rcn_current_sprite);
  }

  this.map_canvas.set_size(vp_w << 3, vp_h << 3);
  this.map_canvas.blit(0, 0, vp_w << 3, vp_h << 3, pixels);
  this.map_canvas.flush();
}

rcn_map_ed.prototype.change_zoom = function(delta) {
  this.zoom += delta;
  this.zoom = Math.min(Math.max(this.zoom, 0), 4);
  if(this.hover.is_hovering()) {
    const center_x = this.hover.current_x + this.offset_x;
    const center_y = this.hover.current_y + this.offset_y;

    // Center viewport based on hovered tile
    this.offset_x = center_x - this.get_viewport_width() / 2;
    this.offset_y = center_y - this.get_viewport_height() / 2;
  }
  this.hover.update_hovering(null);
  this.selection.reset();
  this.update_map_canvas();
  this.hover.refresh_hovering();
}

rcn_map_ed.prototype.move_selection = function(dx, dy) {
  if(!this.selection.is_selecting()) return;

  const new_x = Math.min(Math.max(this.selection.x + dx, 0), rcn.map_width - this.selection.w);
  const new_y = Math.min(Math.max(this.selection.y + dy, 0), rcn.map_height - this.selection.h);

  if(this.selection.x == new_x && this.selection.y == new_y) return;

  rcn_move_map_region(
    this.offset_x + this.selection.x,
    this.offset_y + this.selection.y,
    this.selection.w, this.selection.h,
    this.offset_x + new_x,
    this.offset_y + new_y,
  );

  this.selection.x = new_x;
  this.selection.y = new_y;
  this.update_map_canvas();
}

rcn_map_ed.prototype.copy_selection = function() {
  if(this.selection.is_selecting()) {
    rcn_copy_map_region(
      this.offset_x + this.selection.x,
      this.offset_y + this.selection.y,
      this.selection.w,
      this.selection.h,
    );
    this.selection.reset();
  }
}

rcn_map_ed.prototype.paste_selection = function() {
  if(this.hover.is_hovering()) {
    rcn_paste_map_region(
      this.offset_x + this.hover.current_x,
      this.offset_y + this.hover.current_y,
      128, 128,
    );
  }
}

function rcn_copy_map_region(x, y, w, h) {
  const tile_count = w * h;
  let tiles = new Uint8Array(tile_count);
  for(let i = 0; i < w; i++) {
    for(let j = 0; j < h; j++) {
      tiles[i + j * w] = rcn_get_map_tile(x + i, y + j);
    }
  }
  rcn_clipboard = {
    type: 'tiles',
    width: w,
    height: h,
    tiles: tiles,
  };
}

function rcn_paste_map_region(x, y, w, h) {
  if(!rcn_clipboard || rcn_clipboard.type != 'tiles') return;
  // Clamp copy sizes to map size
  w = Math.min(w, rcn_clipboard.width, 128 - x);
  h = Math.min(h, rcn_clipboard.height, 64 - y);
  for(let i = 0; i < w; i++) {
    for(let j = 0; j < h; j++) {
      rcn_set_map_tile(
        x + i, y + j,
        rcn_clipboard.tiles[i + j * rcn_clipboard.width],
      );
    }
  }
  rcn_dispatch_ed_event('rcn_bin_change', {
    begin: rcn.mem_map_offset + (y << 7) + (x << 0),
    end: rcn.mem_map_offset + ((y + h) << 7) + ((x + w) << 0) + 1,
  });
}

function rcn_set_map_tile(x, y, t) {
  rcn_global_bin.rom[rcn.mem_map_offset + (y << 7) + (x << 0)] = t;
}

function rcn_get_map_tile(x, y) {
  return rcn_global_bin.rom[rcn.mem_map_offset + (y << 7) + (x << 0)];
}

function rcn_move_map_region(x, y, w, h, nx, ny) {
  const dx = nx - x;
  const dy = ny - y;
  const si = dx < 0 ? x : x + w - 1;
  const sj = dy < 0 ? y : y + h - 1;
  const ei = dx < 0 ? x + w : x - 1;
  const ej = dy < 0 ? y + h : y - 1;
  const di = dx < 0 ? 1 : -1;
  const dj = dy < 0 ? 1 : -1;
  for(let i = si; i != ei; i += di) {
    for(let j = sj; j != ej; j += dj) {
      rcn_set_map_tile(i + dx, j + dy, rcn_get_map_tile(i, j));
      if(i < nx || i >= nx + w || j < ny || j >= ny + h) {
        rcn_set_map_tile(i, j, 0);
      }
    }
  }
  rcn_dispatch_ed_event('rcn_bin_change', {
    begin: rcn.mem_map_offset + Math.min((y << 7) + (x << 0), (ny << 7) + (nx << 0)),
    end: rcn.mem_map_offset + Math.max(((y + h) << 7) + ((x + w) << 0), ((ny + h) << 7) + ((nx + w) << 0)) + 1,
  });
}
