// Raccoon sprite editor
'use strict';

function rcn_sprite_ed() {
  rcn_sprite_ed.prototype.__proto__ = rcn_window.prototype;
  rcn_window.call(this);

  this.current_color = 0;

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
    let color_change_timeout = null;
    color_input.oninput = e => {
      // This event gets spammed in Chrome
      // Using a timeout to make sure we don't spam in return
      if(!color_change_timeout) {
        color_change_timeout = setTimeout(() => {
          // Update bin's palette with new color
          const rgb_int = parseInt(color_input.value.slice(1), 16);
          const rgb_bytes = new Uint8Array(3);
          rgb_bytes[0] = (rgb_int>>16);
          rgb_bytes[1] = (rgb_int>>8) & 0xff;
          rgb_bytes[2] = rgb_int & 0xff;
          rcn_global_bin.rom.set(rgb_bytes, rcn.mem_palette_offset + i*4);
          rcn_dispatch_ed_event('rcn_bin_change', {
            begin: rcn.mem_palette_offset + i*4,
            end: rcn.mem_palette_offset + i*4+3,
          });
          color_change_timeout = null;
        }, 0);
      }
    }
    this.color_inputs.push(color_input);
    color_wrapper.appendChild(color_input);

    this.color_select_div.appendChild(color_wrapper);
  }

  // Create sprite flags inputs
  this.flag_inputs = [];
  for(let i = 0; i < 8; i++) {
    const flag = rcn_ui_checkbox({
      label: i,
      onchange: function() {
        sprite_ed.set_flag(i, this.checked);
      },
    });
    this.flag_inputs.push(flag.checkbox);

    this.panel_div.appendChild(flag);
    this.panel_div.appendChild(document.createElement('br'));
  }

  // Create draw canvas
  this.draw_canvas = new rcn_canvas();
  this.draw_canvas.node.classList.add('draw');
  this.draw_canvas.interaction(function(e, tex_coords) {
    if(sprite_ed.selection.event(e, tex_coords)) {
      return;
    }
    let mode = 'normal';
    if(e.ctrlKey) {
      mode = 'fill';
    }
    switch(mode) {
      case 'normal':
        if(e.buttons == 1) { // Left button: draw
          sprite_ed.set_pixel(tex_coords.x, tex_coords.y);
          sprite_ed.selection.reset();
        } else if(e.buttons == 2) { // Right button: color pick
          sprite_ed.set_current_color(sprite_ed.get_pixel(tex_coords.x, tex_coords.y))
          sprite_ed.selection.reset();
        }
        break;
      case 'fill':
        if(e.buttons == 1) { // Left button: select
          sprite_ed.fill_pixel(tex_coords.x, tex_coords.y);
          sprite_ed.selection.reset();
        }
        break;
    }
  });

  // Always keep space for outlines
  this.draw_canvas.padding_x = this.draw_canvas.padding_y = 2;
  this.selection = new rcn_selection(this.draw_canvas);
  this.selection.requires_shift = true;
  this.hover = new rcn_hover(this.draw_canvas);
  this.add_child(this.draw_canvas.node);

  this.addEventListener('rcn_bin_change', function(e) {
    if(rcn_mem_changed(e, 'palette')) {
      sprite_ed.update_color_inputs();
    }

    if(rcn_mem_changed(e, 'spritesheet')) {
      sprite_ed.update_draw_canvas();
    }

    if(rcn_mem_changed(e, 'spriteflags')) {
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
    const digits = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8'];
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
    } else if (digits.includes(e.code)) {
      let new_color = digits.indexOf(e.code);
      if(e.shiftKey) {
        new_color += 8;
      }
      sprite_ed.set_current_color(new_color);
      e.preventDefault();
    }
  });
  this.addEventListener('blur', function(e) {
    sprite_ed.selection.reset();
  });

  this.update_color_inputs();
  this.update_flag_inputs();
  this.update_draw_canvas();
}

rcn_sprite_ed.prototype.title = 'Sprite Editor';
rcn_sprite_ed.prototype.docs_link = 'sprite-editor';
rcn_sprite_ed.prototype.type = 'sprite_ed';
rcn_sprite_ed.prototype.group = 'visual';

rcn_sprite_ed.prototype.move_selection = function(dx, dy) {
  if(!this.selection.is_selecting()) return;

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
  if(this.selection.is_selecting()) {
    const spr_x = (rcn_current_sprite & 0xf) << 3;
    const spr_y = (rcn_current_sprite >> 4) << 3;
    rcn_copy_sprite_region(
      this.selection.x + spr_x,
      this.selection.y + spr_y,
      this.selection.w,
      this.selection.h,
    );
    this.selection.reset();
  }
}

rcn_sprite_ed.prototype.paste_selection = function() {
  if(this.hover.is_hovering()) {
    let dst_x = (rcn_current_sprite & 0xf) << 3;
    let dst_y = (rcn_current_sprite >> 4) << 3;
    dst_x += this.hover.current_x;
    dst_y += this.hover.current_y;
    rcn_paste_sprite_region(dst_x, dst_y, 128, 128);
  }
}

rcn_sprite_ed.prototype.update_color_inputs = function() {
  const palette_bytes = rcn_global_bin.rom.slice(rcn.mem_palette_offset, rcn.mem_palette_offset + rcn.mem_palette_size);
  for(let i = 0; i < this.color_inputs.length; i++) {
    let rgb_str = '#';
    let max = 0;
    for(let j = 0; j < 3; j++) {
      const component = palette_bytes[i*4+j];
      max = Math.max(max, component);
      rgb_str += ('00'+component.toString(16)).slice(-2);
    }
    this.color_inputs[i].value = rgb_str;
    this.color_labels[i].style.backgroundColor = rgb_str;
    this.color_labels[i].style.color = max >= 128 ? 'black' : 'lightgrey';
  }
}

rcn_sprite_ed.prototype.get_texel_index = function(draw_x, draw_y) {
  const spritesheet_offset_x = (rcn_current_sprite & 0xf) << 3;
  const spritesheet_offset_y = (rcn_current_sprite >> 4) << 3;
  const x = draw_x + spritesheet_offset_x;
  const y = draw_y + spritesheet_offset_y;
  return rcn.mem_spritesheet_offset+(y<<6)+(x>>1);
}

rcn_sprite_ed.prototype.set_pixel = function(x, y) {
  const texel_index = this.set_pixel_internal(x, y);

  rcn_dispatch_ed_event('rcn_bin_change', {
    begin: texel_index,
    end: texel_index+1,
  });
}

rcn_sprite_ed.prototype.set_pixel_internal = function(x, y) {
  const texel_index = this.get_texel_index(x, y);
  let texel = rcn_global_bin.rom[texel_index];
  if((x % 2) < 1) {
    texel &= 0xf0;
    texel |= this.current_color;
  } else {
    texel &= 0xf;
    texel |= this.current_color << 4;
  }
  rcn_global_bin.rom[texel_index] = texel;
  return texel_index;
}

rcn_sprite_ed.prototype.fill_pixel = function(x, y) {
  const sprite_ed = this;
  rcn_editor_fill({
    start_x: x,
    start_y: y,
    get_value: (x, y) => sprite_ed.get_pixel(x, y),
    set_value: (x, y) => sprite_ed.set_pixel_internal(x, y),
    is_in_selection: (x, y) => x >= 0 && y >= 0 && x < (rcn_current_sprite_columns << 3) && y < (rcn_current_sprite_rows << 3),
  });
}

rcn_sprite_ed.prototype.get_pixel = function(x, y) {
  const texel_index = this.get_texel_index(x, y);
  const texel = rcn_global_bin.rom[texel_index];
  return (x&1) ? (texel >> 4) : (texel & 0xf);
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

  this.draw_canvas.set_size(spr_w, spr_h);

  const pixels = this.draw_canvas.pixels;
  for(let i = 0; i < spr_h; i++) {
    const row_index = texel_index + (i << 6);
    pixels.set(rcn_global_bin.rom.slice(row_index, row_index + row_size), i * row_size);
  }

  this.draw_canvas.upload_pixels();
  this.draw_canvas.flush();
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
