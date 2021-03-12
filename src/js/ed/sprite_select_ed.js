// Raccoon sprite selector
'use strict';

let rcn_current_sprite = 0;
let rcn_current_sprite_columns = 1;
let rcn_current_sprite_rows = 1;

function rcn_sprite_select_ed() {
  rcn_sprite_select_ed.prototype.__proto__ = rcn_window.prototype;
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
  this.spritesheet_canvas.interaction(function(e, tex_coords) {
    if(sprite_sel_ed.selection.event(e, tex_coords)) {
      rcn_current_sprite = sprite_sel_ed.selection.x + (sprite_sel_ed.selection.y << 4);
      rcn_current_sprite_columns = sprite_sel_ed.selection.w;
      rcn_current_sprite_rows = sprite_sel_ed.selection.h;
      rcn_dispatch_ed_event('rcn_current_sprite_change');
      return;
    }
  });
  // Always keep space for selection outline
  this.spritesheet_canvas.padding_x = this.spritesheet_canvas.padding_y = 2;
  this.selection = new rcn_selection(this.spritesheet_canvas);
  this.selection.tile_size = 8;
  this.hover = new rcn_hover(this.spritesheet_canvas);
  this.hover.tile_size = 8;
  this.spritesheet_wrapper.appendChild(this.spritesheet_canvas.node);

  this.addEventListener('rcn_bin_change', function(e) {
    if(rcn_mem_changed(e, 'spritesheet')) {
      sprite_sel_ed.update_spritesheet_canvas();
    }
  });

  this.addEventListener('rcn_current_sprite_change', function() {
    sprite_sel_ed.update_selection();
    sprite_sel_ed.update_sprite_index_text();
    sprite_sel_ed.update_spritesheet_canvas();
  })

  this.addEventListener('rcn_window_resize', function() {
    sprite_sel_ed.spritesheet_canvas.flush();
  });

  this.addEventListener('keydown', function(e) {
    if(!e.target.rcn_window) {
      return;
    }
    // Copy/paste functionality
    if(!(e.ctrlKey || e.metaKey)) return;
    if(e.key == 'c') { // Copy
      e.preventDefault();
      rcn_copy_sprite_region(
        sprite_sel_ed.selection.x << 3,
        sprite_sel_ed.selection.y << 3,
        sprite_sel_ed.selection.w << 3,
        sprite_sel_ed.selection.h << 3,
      );
    } else if(e.key == 'v' && sprite_sel_ed.hover.is_hovering()) { // Paste
      e.preventDefault();
      rcn_paste_sprite_region(
        sprite_sel_ed.hover.current_x << 3,
        sprite_sel_ed.hover.current_y << 3,
        256, 256,
      );
    }
  });

  this.update_selection();
  this.update_sprite_index_text();
  this.update_spritesheet_canvas();
}

rcn_sprite_select_ed.prototype.title = 'Sprite Selector';
rcn_sprite_select_ed.prototype.docs_link = 'sprite-selector';
rcn_sprite_select_ed.prototype.type = 'sprite_select_ed';
rcn_sprite_select_ed.prototype.group = 'visual';

rcn_sprite_select_ed.prototype.update_selection = function() {
  const spr_x = rcn_current_sprite & 0xf;
  const spr_y = rcn_current_sprite >> 4;
  this.selection.set(
    spr_x, spr_y,
    spr_x + rcn_current_sprite_columns - 1,
    spr_y + rcn_current_sprite_rows - 1,
  );
}

rcn_sprite_select_ed.prototype.update_sprite_index_text = function() {
  this.sprite_index_text.innerText = rcn_current_sprite.toString().padStart(3, '0');
}

rcn_sprite_select_ed.prototype.update_spritesheet_canvas = function() {
  this.spritesheet_canvas.set_size(128, 96);
  this.spritesheet_canvas.upload_pixels(rcn_global_bin.rom.slice(rcn.mem_spritesheet_begin));
  this.spritesheet_canvas.flush();
}

rcn_editors.push(rcn_sprite_select_ed);
