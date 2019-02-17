// Raccoon map editor

function rcn_map_ed() {
  this.__proto__.__proto__ = rcn_window.prototype;
  rcn_window.call(this, 'map_ed', 'Map Editor');

  // Init map editing state
  this.current_tile = 0;
  this.current_offset_x = 0;
  this.current_offset_y = 0;
  this.current_sprite_page = 0;

  var map_ed = this;

  // Create map canvas
  this.map_canvas = new rcn_canvas();
  this.map_canvas.node.classList.add('map');
  var draw_mouse_callback = function(e) {
    if(e.buttons > 0) {
      var canvas_coords = this.getBoundingClientRect();
      var tex_coords = map_ed.map_canvas.client_to_texture_coords(e.clientX - canvas_coords.x, e.clientY - canvas_coords.y);
      if(tex_coords) {
        if(e.buttons == 1) { // Left button: draw
          map_ed.set_tile(tex_coords.x >> 3, tex_coords.y >> 3);
        } else if(e.buttons == 2) { // Right button: tile pick
          map_ed.current_tile = map_ed.get_tile(tex_coords.x >> 3, tex_coords.y >> 3);
          map_ed.update_spritesheet_canvas();
        }
      }
    }
  }
  this.map_canvas.node.addEventListener('contextmenu', function(e){e.preventDefault()});
  this.map_canvas.node.addEventListener('mousedown', draw_mouse_callback);
  this.map_canvas.node.addEventListener('mousemove', draw_mouse_callback);
  this.add_child(this.map_canvas.node);

  // Create spritesheet canvas
  this.spritesheet_canvas = new rcn_canvas();
  this.spritesheet_canvas.node.classList.add('spritesheet');
  this.spritesheet_canvas.set_size(128, 32);
  var sheet_mouse_callback = function(e) {
    if(e.buttons === 1) { // Left button: select sprite
      var canvas_coords = this.getBoundingClientRect();
      var tex_coords = map_ed.spritesheet_canvas.client_to_texture_coords(e.clientX - canvas_coords.x, e.clientY - canvas_coords.y);
      if(tex_coords) {
        map_ed.current_tile = (map_ed.current_sprite_page << 6) + (tex_coords.x >> 3) + ((tex_coords.y >> 3) << 4);
        map_ed.update_spritesheet_canvas();
      }
    }
  }
  this.spritesheet_canvas.node.addEventListener('mousedown', sheet_mouse_callback);
  this.spritesheet_canvas.node.addEventListener('mousemove', sheet_mouse_callback);
  this.spritesheet_canvas.onpostflush = function() {
    var vp = this.compute_viewport();
    var cur_spr = map_ed.current_tile;
    if((cur_spr >> 6) == map_ed.current_sprite_page) {
      cur_spr = cur_spr & 0x3f;
      var spr_x = cur_spr & 0xf;
      var spr_y = cur_spr >> 4;
      var x = vp.x + spr_x*vp.mul*8;
      var y = vp.y + spr_y*vp.mul*8;
      var width = vp.mul * 8;
      var height = vp.mul * 8;
      this.draw_quad(x, y, width, height, 1, 1, 1, 0.5);
    }
  }
  this.add_child(this.spritesheet_canvas.node);

  // Create apply button
  this.apply_button = rcn_ui_button({
    window: this,
    value:'Apply',
    onclick: function() {
      // Update VM map with bin map
      rcn_global_vm.load_memory_from_bin(rcn.mem_map_offset, rcn.mem_map_size);
    },
  });

  this.addEventListener('rcnbinchange', function(e) {
    // Map data update
    const mem_map_begin = rcn.mem_map_offset;
    const mem_map_end = rcn.mem_map_offset + rcn.mem_map_size;
    if(e.detail.begin < mem_map_end && e.detail.end > mem_map_begin) {
      map_ed.update_map_canvas();
    }

    // Spritesheet data update
    const mem_spritesheet_begin = rcn.mem_spritesheet_offset;
    const mem_spritesheet_end = rcn.mem_spritesheet_offset + rcn.mem_spritesheet_size;
    if(e.detail.begin < mem_spritesheet_end && e.detail.end > mem_spritesheet_begin) {
      map_ed.update_map_canvas();
      map_ed.update_spritesheet_canvas();
    }
  });
}

rcn_map_ed.prototype.get_tile_index = function(map_x, map_y) {
  var x = map_x + this.current_offset_x;
  var y = map_y + this.current_offset_y;
  return rcn.mem_map_offset + (y << 7) + x;
}

rcn_map_ed.prototype.set_tile = function(map_x, map_y) {
  var tile_index = this.get_tile_index(map_x, map_y);
  rcn_global_bin.rom[tile_index] = this.current_tile;

  rcn_dispatch_ed_event('rcnbinchange', {
    begin: tile_index,
    end: tile_index+1,
  });
}

rcn_map_ed.prototype.get_tile = function(map_x, map_y) {
  var tile_index = this.get_tile_index(map_x, map_y);
  return rcn_global_bin.rom[tile_index];
}

rcn_map_ed.prototype.update_map_canvas = function() {
  var map_w = 16;
  var map_h = 16;
  var pixels = new Uint8Array(((map_w * map_h) << 6) >> 1);
  var map_row_size = (map_w << 3) >> 1;

  for(var mx=0; mx < map_w; mx++) {
    for(var my=0; my < map_h; my++) {
      var pix_x = mx << 3;
      var pix_y = my << 3;
      var pix_index = (pix_y<<6)+(pix_x>>1);
      var spr = this.get_tile(mx + this.current_offset_x, my + this.current_offset_y);
      var spr_tex_index = ((spr & 0xf) << 2) + ((spr >> 4) << 9);
      var spr_row_size = 4;

      for(var i=0; i < 8; i++) {
        var spr_row_index = spr_tex_index + (i << 6);
        pixels.set(rcn_global_bin.rom.slice(spr_row_index, spr_row_index + spr_row_size), pix_index + i * map_row_size);
      }
    }
  }

  this.map_canvas.set_aspect_ratio(1, 1);
  this.map_canvas.set_size(map_w << 3, map_h << 3);
  this.map_canvas.blit(0, 0, map_w << 3, map_h << 3, pixels);
  this.map_canvas.flush();
}

rcn_map_ed.prototype.update_spritesheet_canvas = function() {
  var page_index = this.current_sprite_page << 11;
  this.spritesheet_canvas.set_aspect_ratio(4, 1);
  this.spritesheet_canvas.blit(0, 0, 128, 32, rcn_global_bin.rom.slice(page_index));
  this.spritesheet_canvas.flush();
}
