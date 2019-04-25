// Raccoon sprite selector

let rcn_current_sprite = 0;
let rcn_current_sprite_columns = 1;
let rcn_current_sprite_rows = 1;

function rcn_sprite_select_ed() {
  this.__proto__.__proto__ = rcn_window.prototype;
  rcn_window.call(this);

  const sprite_sel_ed = this;

  // Create sprite index text
  this.sprite_index_text = document.createElement('div');
  this.sprite_index_text.classList.add('sprite_index');
  this.add_child(this.sprite_index_text);

  // Create spritesheet wrapper
  this.spritesheet_wrapper = document.createElement('div');
  this.spritesheet_wrapper.classList.add('wrapper');
  this.add_child(this.spritesheet_wrapper);

  // Create spritesheet canvas
  this.spritesheet_canvas = new rcn_canvas();
  this.spritesheet_canvas.node.classList.add('spritesheet');
  this.spritesheet_canvas.node.tabIndex = 0;
  this.spritesheet_canvas.node.addEventListener('keydown', function(e) {
    // Copy/paste functionality
    if(!(e.ctrlKey || e.metaKey)) return;
    if(e.key == 'c') { // Copy
      e.preventDefault();
      const spr_w = rcn_current_sprite_columns << 3;
      const spr_h = rcn_current_sprite_rows << 3;
      const texel_index = ((rcn_current_sprite & 0xf) << 2) + ((rcn_current_sprite >> 4) << 9);
      const row_size = spr_w >> 1;
      const texel_count = (spr_w * spr_h) >> 1; // Divided by two because texels are 4bits
      let spr_texels = new Uint8Array(texel_count);
      for(let i = 0; i < spr_h; i++) {
        const row_index = texel_index + (i << 6);
        spr_texels.set(rcn_global_bin.rom.slice(row_index, row_index + row_size), i * row_size);
      }
      rcn_clipboard = {
        type: 'texels',
        width: spr_w,
        height: spr_h,
        texels: spr_texels,
      };
    } else if(e.key == 'v') { // Paste
      e.preventDefault();
      if(!rcn_clipboard || rcn_clipboard.type != 'texels') return;
      const texel_index = ((rcn_current_sprite & 0xf) << 2) + ((rcn_current_sprite >> 4) << 9);
      // Clamp copy sizes to spritesheet size
      const cpy_height = Math.min(rcn_clipboard.height, 96 - ((rcn_current_sprite >> 4) << 3));
      const cpy_width = Math.min(rcn_clipboard.width, 128 - ((rcn_current_sprite & 0xf) << 3));
      const row_size = rcn_clipboard.width >> 1;
      const cpy_row_size = cpy_width >> 1;
      for(let i = 0; i < cpy_height; i++) {
        const row_index = texel_index + (i << 6);
        const row_texels = rcn_clipboard.texels.slice(i * row_size, i * row_size + cpy_row_size);
        rcn_global_bin.rom.set(row_texels, row_index);
      }
      rcn_dispatch_ed_event('rcn_bin_change', {
        begin: texel_index,
        end: texel_index + (cpy_height << 6),
      });
    }
  });
  this.spritesheet_canvas.interaction(function(e, tex_coords) {
    const spr_x = tex_coords.x >> 3;
    const spr_y = tex_coords.y >> 3;
    if(e.type === 'mousedown') {
      sprite_sel_ed.set_current_sprite(spr_x, spr_y);
    } else {
      sprite_sel_ed.extend_current_sprite(spr_x, spr_y);
    }
  });
  // Always keep space for selection outline
  this.spritesheet_canvas.padding_x = this.spritesheet_canvas.padding_y = 2;
  this.spritesheet_canvas.onpostflush = function() {
    // Draw selection outline
    const vp = this.compute_viewport();
    const cur_spr = rcn_current_sprite;
    const spr_x = cur_spr & 0xf;
    const spr_y = cur_spr >> 4;
    const x = vp.x + spr_x * vp.mul * 8;
    const y = vp.y + spr_y * vp.mul * 8;
    const width = rcn_current_sprite_columns * vp.mul * 8;
    const height = rcn_current_sprite_rows * vp.mul * 8;
    this.draw_quad(x - 2, y - 2, 2, height + 4, 1, 1, 1, 1);
    this.draw_quad(x + width, y - 2, 2, height + 4, 1, 1, 1, 1);
    this.draw_quad(x, y - 2, width, 2, 1, 1, 1, 1);
    this.draw_quad(x, y + height, width, 2, 1, 1, 1, 1);
  }
  this.spritesheet_wrapper.appendChild(this.spritesheet_canvas.node);

  this.addEventListener('rcn_bin_change', function(e) {
    // Palette update
    const mem_palette_begin = rcn.mem_palette_offset;
    const mem_palette_end = rcn.mem_palette_offset + rcn.mem_palette_size;
    if(e.detail.begin < mem_palette_end && e.detail.end > mem_palette_begin) {
      sprite_sel_ed.update_spritesheet_canvas();
    }

    // Spritesheet update
    const mem_spritesheet_begin = rcn.mem_spritesheet_offset;
    const mem_spritesheet_end = rcn.mem_spritesheet_offset + rcn.mem_spritesheet_size;
    if(e.detail.begin < mem_spritesheet_end && e.detail.end > mem_spritesheet_begin) {
      sprite_sel_ed.update_spritesheet_canvas();
    }
  });

  this.addEventListener('rcn_current_sprite_change', function() {
    sprite_sel_ed.update_sprite_index_text();
    sprite_sel_ed.update_spritesheet_canvas();
  })

  this.addEventListener('rcn_window_resize', function() {
    sprite_sel_ed.spritesheet_canvas.flush();
  });

  this.update_sprite_index_text();
  this.update_spritesheet_canvas();
}

rcn_sprite_select_ed.prototype.title = 'Sprite Selector';
rcn_sprite_select_ed.prototype.docs_link = 'sprite-selector';
rcn_sprite_select_ed.prototype.type = 'sprite_select_ed';

rcn_sprite_select_ed.prototype.set_current_sprite = function(x, y) {
  rcn_current_sprite = x + (y << 4);
  rcn_current_sprite_columns = rcn_current_sprite_rows = 1;
  rcn_dispatch_ed_event('rcn_current_sprite_change');
}

rcn_sprite_select_ed.prototype.extend_current_sprite = function(x, y) {
  const old_x0 = rcn_current_sprite & 0xf;
  const old_y0 = rcn_current_sprite >> 4;
  const new_x0 = Math.min(x, old_x0);
  const new_y0 = Math.min(y, old_y0);
  const new_x1 = Math.max(x + 1, old_x0 + rcn_current_sprite_columns);
  const new_y1 = Math.max(y + 1, old_y0 + rcn_current_sprite_rows);
  rcn_current_sprite = new_x0 + (new_y0 << 4);
  rcn_current_sprite_columns = new_x1 - new_x0;
  rcn_current_sprite_rows = new_y1 - new_y0;
  rcn_dispatch_ed_event('rcn_current_sprite_change');
}

rcn_sprite_select_ed.prototype.update_sprite_index_text = function() {
  this.sprite_index_text.innerText = rcn_current_sprite.toString().padStart(3, '0');
}

rcn_sprite_select_ed.prototype.update_spritesheet_canvas = function() {
  this.spritesheet_canvas.set_aspect_ratio(128, 96);
  this.spritesheet_canvas.set_size(128, 96);
  this.spritesheet_canvas.blit(0, 0, 128, 96, rcn_global_bin.rom.slice(rcn.mem_spritesheet_begin));
  this.spritesheet_canvas.flush();
}

rcn_editors.push(rcn_sprite_select_ed);
