// Raccoon sprite editor

function rcn_sprite_ed() {
  this.__proto__.__proto__ = rcn_window.prototype;
  rcn_window.call(this);

  this.current_color = 0;

  var sprite_ed = this;

  // Create panel
  this.panel_div = document.createElement('div');
  this.panel_div.classList.add('panel');
  this.add_child(this.panel_div);

  // Create color inputs
  this.color_inputs = [];
  this.color_radios = [];
  for(var i=0; i<8; i++) {
    var color_wrapper = document.createElement('div');
    var color_radio = document.createElement('input');
    color_radio.type = 'radio';
    color_radio.name = 'sprite_ed_color_radio';
    color_radio.color_index = i;
    color_radio.checked = (this.current_color == i);
    color_radio.onchange = function() {
      sprite_ed.current_color = this.color_index;
    }
    this.color_radios.push(color_radio);
    color_wrapper.appendChild(color_radio);

    var color_input_id = 'color_input_'+i;
    var color_label = document.createElement('label');
    color_label.innerText = i;
    color_label.htmlFor = color_input_id;
    color_wrapper.appendChild(color_label);

    var color_input = document.createElement('input');
    color_input.type = 'color';
    color_input.id = color_input_id;
    color_input.onchange = function() {
      // Update bin's palette with UI palette
      rcn_global_bin.patch_memory(sprite_ed.get_palette_bytes(), rcn.mem_palette_offset);
      rcn_dispatch_ed_event('rcn_bin_change', {
        begin: rcn.mem_palette_offset,
        end: rcn.mem_palette_offset+rcn.mem_palette_size,
      });
    }
    this.color_inputs.push(color_input);
    color_wrapper.appendChild(color_input);

    this.panel_div.appendChild(color_wrapper);
  }

  // Create sprite flags inputs
  this.flag_inputs = [];
  for(var i=0; i<8; i++) {
    var flag_wrapper = document.createElement('div');
    var flag_checkbox = document.createElement('input');
    flag_checkbox.id = this.id+'_flag_'+i;
    flag_checkbox.type = 'checkbox';
    flag_checkbox.flag_index = i;
    flag_checkbox.onchange = function() {
      sprite_ed.set_flag(this.flag_index, this.checked);
    }
    this.flag_inputs.push(flag_checkbox);
    flag_wrapper.appendChild(flag_checkbox);

    var flag_label = document.createElement('label');
    flag_label.innerText = i;
    flag_label.htmlFor = flag_checkbox.id;
    flag_wrapper.appendChild(flag_label);

    this.panel_div.appendChild(flag_wrapper);
  }

  // Create draw canvas
  this.draw_canvas = new rcn_canvas();
  this.draw_canvas.node.classList.add('draw');
  var draw_mouse_callback = function(e) {
    if(e.buttons > 0) {
      var canvas_coords = this.getBoundingClientRect();
      var tex_coords = sprite_ed.draw_canvas.client_to_texture_coords(e.clientX - canvas_coords.x, e.clientY - canvas_coords.y);
      if(tex_coords) {
        if(e.buttons == 1) { // Left button: draw
          sprite_ed.set_pixel(tex_coords.x, tex_coords.y);
        } else if(e.buttons == 2) { // Right button: color pick
          sprite_ed.set_current_color(sprite_ed.get_pixel(tex_coords.x, tex_coords.y))
        }
      }
    }
  }
  this.draw_canvas.node.addEventListener('contextmenu', function(e){e.preventDefault()});
  this.draw_canvas.node.addEventListener('mousedown', draw_mouse_callback);
  this.draw_canvas.node.addEventListener('mousemove', draw_mouse_callback);
  this.add_child(this.draw_canvas.node);

  // Create apply button
  this.add_child(this.apply_button = rcn_ui_button({
    value: 'Apply',
    onclick: function() {
      // Update VM spritesheet with bin spritesheet
      rcn_dispatch_ed_event('rcn_bin_apply', {offset: rcn.mem_spritesheet_offset, size: rcn.mem_spritesheet_size});
      // Update VM palette with bin palette
      rcn_dispatch_ed_event('rcn_bin_apply', {offset: rcn.mem_palette_offset, size: rcn.mem_palette_size});
    },
  }));

  this.addEventListener('rcn_bin_change', function(e) {
    // Palette update
    const mem_palette_begin = rcn.mem_palette_offset;
    const mem_palette_end = rcn.mem_palette_offset + rcn.mem_palette_size;
    if(e.detail.begin < mem_palette_end && e.detail.end > mem_palette_begin) {
      sprite_ed.update_color_inputs();
      sprite_ed.update_draw_canvas();
    }

    // Spritesheet update
    const mem_spritesheet_begin = rcn.mem_spritesheet_offset;
    const mem_spritesheet_end = rcn.mem_spritesheet_offset + rcn.mem_spritesheet_size;
    if(e.detail.begin < mem_spritesheet_end && e.detail.end > mem_spritesheet_begin) {
      sprite_ed.update_draw_canvas();
    }

    // Sprite flags update
    const mem_spriteflags_begin = rcn.mem_spriteflags_offset;
    const mem_spriteflags_end = rcn.mem_spriteflags_offset + rcn.mem_spriteflags_size;
    if(e.detail.begin < mem_spriteflags_end && e.detail.end > mem_spriteflags_begin) {
      sprite_ed.update_flag_inputs();
    }
  });

  this.addEventListener('rcn_current_sprite_change', function(e) {
    sprite_ed.update_flag_inputs();
    sprite_ed.update_draw_canvas();
  });

  this.addEventListener('rcn_window_resize', function() {
    sprite_ed.draw_canvas.flush();
  });

  this.update_color_inputs();
  this.update_flag_inputs();
  this.update_draw_canvas();
}

rcn_sprite_ed.prototype.title = 'Sprite Editor';
rcn_sprite_ed.prototype.docs_link = 'sprite-editor';
rcn_sprite_ed.prototype.type = 'sprite_ed';

rcn_sprite_ed.prototype.update_color_inputs = function() {
  var palette_bytes = rcn_global_bin.rom.slice(rcn.mem_palette_offset, rcn.mem_palette_offset + rcn.mem_palette_size);
  for(var i=0; i<8; i++) {
    var rgb_str = '#';
    for(var j=0; j<3; j++) {
      rgb_str += ('00'+palette_bytes[i*3+j].toString(16)).slice(-2);
    }
    this.color_inputs[i].value = rgb_str;
  }
}

rcn_sprite_ed.prototype.get_palette_bytes = function() {
  var palette_bytes = new Uint8Array(rcn.mem_palette_size); // 8 RGB values
  for(var i=0; i<8; i++) {
    var rgb_int = parseInt(this.color_inputs[i].value.slice(1), 16);
    palette_bytes[i*3+0] = (rgb_int>>16);
    palette_bytes[i*3+1] = (rgb_int>>8) & 0xff;
    palette_bytes[i*3+2] = rgb_int & 0xff;
  }
  return palette_bytes;
}

rcn_sprite_ed.prototype.get_texel_index = function(draw_x, draw_y) {
  var spritesheet_offset_x = (rcn_current_sprite & 0xf) << 3;
  var spritesheet_offset_y = (rcn_current_sprite >> 4) << 3;
  var x = draw_x + spritesheet_offset_x;
  var y = draw_y + spritesheet_offset_y;
  return rcn.mem_spritesheet_offset+(y<<6)+(x>>1);
}

rcn_sprite_ed.prototype.set_pixel = function(draw_x, draw_y) {
  var texel_index = this.get_texel_index(draw_x, draw_y);
  var texel = rcn_global_bin.rom[texel_index];
  if((draw_x % 2) < 1) {
    texel &= 0xf0;
    texel |= this.current_color;
  } else {
    texel &= 0xf;
    texel |= this.current_color << 4;
  }
  rcn_global_bin.rom[texel_index] = texel;

  rcn_dispatch_ed_event('rcn_bin_change', {
    begin: texel_index,
    end: texel_index+1,
  });
}

rcn_sprite_ed.prototype.get_pixel = function(draw_x, draw_y) {
  var texel_index = this.get_texel_index(draw_x, draw_y);
  var texel = rcn_global_bin.rom[texel_index];
  if((draw_x % 2) < 1) {
    return texel & 0xf;
  } else {
    return texel >> 4;
  }
}

rcn_sprite_ed.prototype.set_current_color = function(color) {
  this.current_color = color;
  this.color_radios[color].checked = true;
}

rcn_sprite_ed.prototype.set_flag = function(i, value) {
  // Set flag for all selected sprites
  for(let x = 0; x < rcn_current_sprite_columns; x++) {
    for(let y = 0; y < rcn_current_sprite_rows; y++) {
      const sprite_index = rcn_current_sprite + x + (y << 4);
      const flag_index = rcn.mem_spriteflags_offset + sprite_index;
      rcn_global_bin.rom[flag_index] &= ~(1 << i);
      rcn_global_bin.rom[flag_index] |= (value ? (1 << i) : 0);

      rcn_dispatch_ed_event('rcn_bin_change', {
        begin: flag_index,
        end: flag_index + 1,
      });
    }
  }
}

rcn_sprite_ed.prototype.update_flag_inputs = function() {
  // Collect flags for all selected sprites
  let flag_totals = [0, 0, 0, 0, 0, 0, 0, 0];
  for(let x = 0; x < rcn_current_sprite_columns; x++) {
    for(let y = 0; y < rcn_current_sprite_rows; y++) {
      const sprite_index = rcn_current_sprite + x + (y << 4);
      const flags = rcn_global_bin.rom[rcn.mem_spriteflags_offset + sprite_index];
      for(let i = 0; i < 8; i++) {
        flag_totals[i] += (flags & (1 << i)) ? 1 : 0;
      }
    }
  }

  // Check flag totals to see whether all or some sprites have a specific flag
  let sprite_count = rcn_current_sprite_columns * rcn_current_sprite_rows;
  for(let i = 0; i < 8; i++) {
    this.flag_inputs[i].checked = flag_totals[i] == sprite_count;
    this.flag_inputs[i].indeterminate = flag_totals[i] > 0 && flag_totals[i] < sprite_count;
  }
}

rcn_sprite_ed.prototype.update_draw_canvas = function() {
  const spr_w = rcn_current_sprite_columns << 3;
  const spr_h = rcn_current_sprite_rows << 3;
  const texel_index = ((rcn_current_sprite & 0xf) << 2) + ((rcn_current_sprite >> 4) << 9);
  const row_size = spr_w >> 1;
  let pixels = new Uint8Array((spr_w * spr_h) >> 1);

  for(var i=0; i < spr_h; i++) {
    var row_index = texel_index + (i << 6);
    pixels.set(rcn_global_bin.rom.slice(row_index, row_index + row_size), i * row_size);
  }

  this.draw_canvas.set_aspect_ratio(1, 1);
  this.draw_canvas.set_size(spr_w, spr_h);
  this.draw_canvas.blit(0, 0, spr_w, spr_h, pixels);
  this.draw_canvas.flush();
}

rcn_editors.push(rcn_sprite_ed);
