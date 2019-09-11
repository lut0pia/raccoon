// Raccoon sprite editor
'use strict';

function rcn_sprite_ed() {
  rcn_sprite_ed.prototype.__proto__ = rcn_window.prototype;
  rcn_window.call(this);

  this.current_color = 0;
  this.selection = null;
  this.current_hover_x = null;
  this.current_hover_y = null;

  const sprite_ed = this;

  // Create panel
  this.panel_div = document.createElement('div');
  this.panel_div.classList.add('panel');
  this.add_child(this.panel_div);

  // Create color selection
  this.color_select_div = document.createElement('div');
  this.color_select_div.classList.add('color_select');
  this.panel_div.appendChild(this.color_select_div);

  // Create color inputs
  this.color_inputs = [];
  this.color_radios = [];
  this.color_labels = [];
  for(let i = 0; i < 16; i++) {
    const color_wrapper = document.createElement('div');
    const radio_id = 'radio_' + Math.random().toString().substr(2);
    const color_radio = document.createElement('input');
    color_radio.type = 'radio';
    color_radio.name = 'sprite_ed_color_radio';
    color_radio.id = radio_id;
    color_radio.color_index = i;
    color_radio.checked = (this.current_color == i);
    color_radio.onchange = function() {
      sprite_ed.current_color = this.color_index;
    }
    this.color_radios.push(color_radio);
    color_wrapper.appendChild(color_radio);

    const color_label = document.createElement('label');
    color_label.innerText = i;
    color_label.htmlFor = radio_id;
    color_label.addEventListener('mousedown', function(e) {
      // Avoid selecting text
      e.preventDefault();
    });
    color_label.addEventListener('dblclick', function(e) {
      e.preventDefault();
      sprite_ed.color_inputs[i].click();
    })
    this.color_labels.push(color_label);
    color_wrapper.appendChild(color_label);

    const color_input = document.createElement('input');
    color_input.type = 'color';
    color_input.oninput = function() {
      // Update bin's palette with UI palette
      rcn_global_bin.rom.set(sprite_ed.get_palette_bytes(), rcn.mem_palette_offset);
      rcn_dispatch_ed_event('rcn_bin_change', {
        begin: rcn.mem_palette_offset,
        end: rcn.mem_palette_offset+rcn.mem_palette_size,
      });
    }
    this.color_inputs.push(color_input);
    color_wrapper.appendChild(color_input);

    this.color_select_div.appendChild(color_wrapper);
  }

  // Create sprite flags inputs
  this.flag_inputs = [];
  for(let i = 0; i < 8; i++) {
    const flag_wrapper = document.createElement('div');
    const flag_checkbox = document.createElement('input');
    flag_checkbox.id = this.id+'_flag_'+i;
    flag_checkbox.type = 'checkbox';
    flag_checkbox.flag_index = i;
    flag_checkbox.onchange = function() {
      sprite_ed.set_flag(this.flag_index, this.checked);
    }
    this.flag_inputs.push(flag_checkbox);
    flag_wrapper.appendChild(flag_checkbox);

    const flag_label = document.createElement('label');
    flag_label.innerText = i;
    flag_label.htmlFor = flag_checkbox.id;
    flag_wrapper.appendChild(flag_label);

    this.panel_div.appendChild(flag_wrapper);
  }

  // Create draw canvas
  this.draw_canvas = new rcn_canvas();
  this.draw_canvas.node.classList.add('draw');
  this.draw_canvas.interaction(function(e, tex_coords) {
    let mode = 'normal';
    if(e.shiftKey) {
      mode = 'selection';
    } else if(e.ctrlKey) {
      mode = 'fill';
    }
    switch(mode) {
      case 'normal':
        if(e.buttons == 1) { // Left button: draw
          sprite_ed.set_pixel(tex_coords.x, tex_coords.y);
          sprite_ed.reset_selection();
        } else if(e.buttons == 2) { // Right button: color pick
          sprite_ed.set_current_color(sprite_ed.get_pixel(tex_coords.x, tex_coords.y))
          sprite_ed.reset_selection();
        }
        break;
      case 'selection':
        if(e.buttons == 1) { // Left button: select
          if(e.type === 'mousedown') {
            sprite_ed.reset_selection();
          } else {
            sprite_ed.extend_selection(tex_coords.x, tex_coords.y);
          }
        }
        break;
      case 'fill':
        if(e.buttons == 1) { // Left button: select
          sprite_ed.fill_pixel(tex_coords.x, tex_coords.y);
          sprite_ed.reset_selection();
        }
        break;
    }
  });

  this.draw_canvas.node.addEventListener('mousemove', function(e) {
    const canvas_coords = this.getBoundingClientRect();
    const tex_coords = sprite_ed.draw_canvas.client_to_texture_coords(e.clientX - canvas_coords.x, e.clientY - canvas_coords.y);
    sprite_ed.update_hovering(tex_coords);
  });

  this.draw_canvas.node.addEventListener('mouseout', function(e) {
    sprite_ed.update_hovering(null);
  });

  // Always keep space for outlines
  this.draw_canvas.padding_x = this.draw_canvas.padding_y = 2;
  this.draw_canvas.onpostflush = function() {
    if(sprite_ed.selection) {
      // Draw selection outline
      const vp = this.compute_viewport();
      this.draw_outline(
        vp.x + sprite_ed.selection.x * vp.mul,
        vp.y + sprite_ed.selection.y * vp.mul,
        sprite_ed.selection.w * vp.mul,
        sprite_ed.selection.h * vp.mul,
        2, 1, 1, 1, 1,
      );
    }

    if(sprite_ed.current_hover_x !== null) {
      // Draw hover outline
      const vp = this.compute_viewport();
      this.draw_outline(
        vp.x + sprite_ed.current_hover_x * vp.mul,
        vp.y + sprite_ed.current_hover_y * vp.mul,
        vp.mul, vp.mul,
        2, 1, 1, 1, 1,
      );
    }
  }
  this.add_child(this.draw_canvas.node);

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

  this.addEventListener('keydown', function(e) {
    const ctrl = e.ctrlKey || e.metaKey;
    if(e.key == 'ArrowLeft') {
      sprite_ed.move_selection(-1, 0);
    } else if(e.key == 'ArrowRight') {
      sprite_ed.move_selection(1, 0);
    } else if(e.key == 'ArrowUp') {
      sprite_ed.move_selection(0, -1);
    } else if(e.key == 'ArrowDown') {
      sprite_ed.move_selection(0, 1);
    } else if(ctrl && e.key == 'c') {
      sprite_ed.copy_selection();
    } else if(ctrl && e.key == 'v') {
      sprite_ed.paste_selection();
    } else if (e.keyCode >= 49 && e.keyCode <= 56) {
      let new_color = e.keyCode - 49;
      if(e.shiftKey) {
        new_color += 8;
      }
      sprite_ed.set_current_color(new_color);
      e.preventDefault();
    }
  });
  this.addEventListener('blur', function(e) {
    sprite_ed.reset_selection();
  });

  this.update_color_inputs();
  this.update_flag_inputs();
  this.update_draw_canvas();
}

rcn_sprite_ed.prototype.title = 'Sprite Editor';
rcn_sprite_ed.prototype.docs_link = 'sprite-editor';
rcn_sprite_ed.prototype.type = 'sprite_ed';

rcn_sprite_ed.prototype.reset_selection = function() {
  this.selection = null;
  this.update_draw_canvas();
}

rcn_sprite_ed.prototype.extend_selection = function(x, y) {
  if(this.selection) {
    const old_x = this.selection.x;
    const old_y = this.selection.y;
    this.selection.x = Math.min(x, old_x);
    this.selection.y = Math.min(y, old_y);
    this.selection.w = Math.max(x + 1, old_x + this.selection.w) - this.selection.x;
    this.selection.h = Math.max(y + 1, old_y + this.selection.h) - this.selection.y;
  } else {
    this.selection = {
      x: x,
      y: y,
      w: 1,
      h: 1,
    };
  }
  this.update_draw_canvas();
}

rcn_sprite_ed.prototype.move_selection = function(dx, dy) {
  if(!this.selection) return;

  const spr_w = rcn_current_sprite_columns << 3;
  const spr_h = rcn_current_sprite_rows << 3;
  const new_x = Math.min(Math.max(this.selection.x + dx, 0), spr_w - this.selection.w);
  const new_y = Math.min(Math.max(this.selection.y + dy, 0), spr_h - this.selection.h);

  if(this.selection.x == new_x && this.selection.y == new_y) return;

  const spr_x = (rcn_current_sprite & 0xf) << 3;
  const spr_y = (rcn_current_sprite >> 4) << 3;

  rcn_move_sprite_region(
    spr_x + this.selection.x, spr_y + this.selection.y,
    this.selection.w, this.selection.h,
    spr_x + new_x, spr_y + new_y,
  );

  this.selection.x = new_x;
  this.selection.y = new_y;
  this.update_draw_canvas();
}

rcn_sprite_ed.prototype.copy_selection = function() {
  if(this.selection) {
    const spr_x = (rcn_current_sprite & 0xf) << 3;
    const spr_y = (rcn_current_sprite >> 4) << 3;
    rcn_copy_sprite_region(
      this.selection.x + spr_x,
      this.selection.y + spr_y,
      this.selection.w,
      this.selection.h,
    );
    this.reset_selection();
  }
}

rcn_sprite_ed.prototype.paste_selection = function() {
  let dst_x = (rcn_current_sprite & 0xf) << 3;
  let dst_y = (rcn_current_sprite >> 4) << 3;
  if(this.selection) {
    dst_x += this.selection.x;
    dst_y += this.selection.y;
  }
  rcn_paste_sprite_region(dst_x, dst_y, 128, 128);
}

rcn_sprite_ed.prototype.update_color_inputs = function() {
  const palette_bytes = rcn_global_bin.rom.slice(rcn.mem_palette_offset, rcn.mem_palette_offset + rcn.mem_palette_size);
  for(let i = 0; i < this.color_inputs.length; i++) {
    let rgb_str = '#';
    let max = 0;
    for(let j = 0; j < 3; j++) {
      const component = palette_bytes[i*3+j];
      max = Math.max(max, component);
      rgb_str += ('00'+component.toString(16)).slice(-2);
    }
    this.color_inputs[i].value = rgb_str;
    this.color_labels[i].style.backgroundColor = rgb_str;
    this.color_labels[i].style.color = max >= 128 ? 'black' : 'lightgrey';
  }
}

rcn_sprite_ed.prototype.get_palette_bytes = function() {
  const palette_bytes = new Uint8Array(rcn.mem_palette_size); // 16 RGB values
  for(let i = 0; i < this.color_inputs.length; i++) {
    const rgb_int = parseInt(this.color_inputs[i].value.slice(1), 16);
    palette_bytes[i*3+0] = (rgb_int>>16);
    palette_bytes[i*3+1] = (rgb_int>>8) & 0xff;
    palette_bytes[i*3+2] = rgb_int & 0xff;
  }
  return palette_bytes;
}

rcn_sprite_ed.prototype.get_texel_index = function(draw_x, draw_y) {
  const spritesheet_offset_x = (rcn_current_sprite & 0xf) << 3;
  const spritesheet_offset_y = (rcn_current_sprite >> 4) << 3;
  const x = draw_x + spritesheet_offset_x;
  const y = draw_y + spritesheet_offset_y;
  return rcn.mem_spritesheet_offset+(y<<6)+(x>>1);
}

rcn_sprite_ed.prototype.set_pixel = function(draw_x, draw_y) {
  const texel_index = this.get_texel_index(draw_x, draw_y);
  let texel = rcn_global_bin.rom[texel_index];
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

rcn_sprite_ed.prototype.fill_pixel = function(start_x, start_y) {
  const visited = new Set();
  const queue = [];
  queue.push({x: start_x, y: start_y});
  const color_cmp = this.get_pixel(start_x, start_y);

  while(queue.length > 0) {
    const node = queue.pop();
    const x = node.x;
    const y = node.y;
    const key = x + (y << 8);
    if(visited.has(key)) continue; // Already visited this pixel
    visited.add(key);
    if(x < 0 || y < 0 || x >= (rcn_current_sprite_columns << 3) || y >= (rcn_current_sprite_rows << 3)) continue; // Outside sprite selection
    if(this.get_pixel(x, y) != color_cmp) continue; // Outside wanted area
    this.set_pixel(x, y, this.current_color);
    queue.push(
      {x: x, y: y - 1},
      {x: x, y: y + 1},
      {x: x - 1, y: y},
      {x: x + 1, y: y},
    );
  }
}

rcn_sprite_ed.prototype.get_pixel = function(draw_x, draw_y) {
  const texel_index = this.get_texel_index(draw_x, draw_y);
  const texel = rcn_global_bin.rom[texel_index];
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

  for(let i = 0; i < spr_h; i++) {
    const row_index = texel_index + (i << 6);
    pixels.set(rcn_global_bin.rom.slice(row_index, row_index + row_size), i * row_size);
  }

  this.draw_canvas.set_size(spr_w, spr_h);
  this.draw_canvas.blit(0, 0, spr_w, spr_h, pixels);
  this.draw_canvas.flush();
}

rcn_sprite_ed.prototype.update_hovering = function(tex_coords) {
  if(tex_coords) {
    if(tex_coords.x !== this.current_hover_x || tex_coords.y !== this.current_hover_y) {
      this.current_hover_x = tex_coords.x;
      this.current_hover_y = tex_coords.y;
      this.update_draw_canvas();
    }
  } else if(this.current_hover_x !== null) {
    this.current_hover_x = null;
    this.current_hover_y = null;
    this.update_draw_canvas();
  }
}

function rcn_copy_sprite_region(x, y, w, h) {
  const texel_count = w * h;
  let texels = new Uint8Array(texel_count);
  for(let i = 0; i < w; i++) {
    for(let j = 0; j < h; j++) {
      texels[i + j * w] = rcn_get_sprite_texel(x + i, y + j);
    }
  }
  rcn_clipboard = {
    type: 'texels',
    width: w,
    height: h,
    texels: texels,
  };
}

function rcn_paste_sprite_region(x, y, w, h) {
  if(!rcn_clipboard || rcn_clipboard.type != 'texels') return;
  // Clamp copy sizes to spritesheet size
  w = Math.min(w, rcn_clipboard.width, 128 - x);
  h = Math.min(h, rcn_clipboard.height, 96 - y);
  for(let i = 0; i < w; i++) {
    for(let j = 0; j < h; j++) {
      rcn_set_sprite_texel(
        x + i, y + j,
        rcn_clipboard.texels[i + j * rcn_clipboard.width],
      );
    }
  }
  rcn_dispatch_ed_event('rcn_bin_change', {
    begin: (y << 6) + (x >> 1),
    end: ((y + h) << 6) + ((x + w) >> 1) + 1,
  });
}

function rcn_set_sprite_texel(x, y, c) {
  const texel_index = (y << 6) + (x >> 1);
  const texel = rcn_global_bin.rom[texel_index];
  rcn_global_bin.rom[texel_index] = ((x % 2) < 1)
    ? ((texel & 0xf0) | c)
    : ((texel & 0x0f) | (c << 4));
}

function rcn_get_sprite_texel(x, y) {
  const texel_index = (y << 6) + (x >> 1);
  let texel = rcn_global_bin.rom[texel_index];
  return ((x % 2) < 1) ? (texel & 0xf) : (texel >> 4);
}

function rcn_clear_sprite_region(x, y, w, h, c) {
  for(let i = 0; i < w; i++) {
    for(let j = 0; j < h; j++) {
      rcn_set_sprite_texel(x + i, y + j, c);
    }
  }
  rcn_dispatch_ed_event('rcn_bin_change', {
    begin: (y << 6) + (x >> 1),
    end: ((y + h) << 6) + ((x + w) >> 1) + 1,
  });
}

function rcn_move_sprite_region(x, y, w, h, nx, ny) {
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
      rcn_set_sprite_texel(i + dx, j + dy, rcn_get_sprite_texel(i, j));
      if(i < nx || i >= nx + w || j < ny || j >= ny + h) {
        rcn_set_sprite_texel(i, j, 0);
      }
    }
  }
  rcn_dispatch_ed_event('rcn_bin_change', {
    begin: Math.min((y << 6) + (x >> 1), (ny << 6) + (nx >> 1)),
    end: Math.max(((y + h) << 6) + ((x + w) >> 1), ((ny + h) << 6) + ((nx + w) >> 1)) + 1,
  });
}

rcn_editors.push(rcn_sprite_ed);
