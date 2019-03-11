// Raccoon sprite selector

var rcn_current_sprite = 0;
var rcn_current_sprite_width = 8;
var rcn_current_sprite_height = 8;

function rcn_sprite_select_ed() {
  this.__proto__.__proto__ = rcn_window.prototype;
  rcn_window.call(this);

  this.current_sprite_page = 0;

  var sprite_sel_ed = this;

  // Create sprite index text
  this.sprite_index_text = document.createElement('div');
  this.sprite_index_text.classList.add('sprite_index');
  this.add_child(this.sprite_index_text);

  // Create spritesheet canvas
  this.spritesheet_canvas = new rcn_canvas();
  this.spritesheet_canvas.node.classList.add('spritesheet');
  var sheet_mouse_callback = function(e) {
    if(e.buttons === 1) { // Left button: select sprite
      var canvas_coords = this.getBoundingClientRect();
      var tex_coords = sprite_sel_ed.spritesheet_canvas.client_to_texture_coords(e.clientX - canvas_coords.x, e.clientY - canvas_coords.y);
      if(tex_coords) {
        sprite_sel_ed.set_current_sprite((sprite_sel_ed.current_sprite_page << 6) + (tex_coords.x >> 3) + ((tex_coords.y >> 3) << 4));
      }
    }
  }
  this.spritesheet_canvas.node.addEventListener('mousedown', sheet_mouse_callback);
  this.spritesheet_canvas.node.addEventListener('mousemove', sheet_mouse_callback);
  this.spritesheet_canvas.onpostflush = function() {
    var vp = this.compute_viewport();
    var cur_spr = rcn_current_sprite;
    if((cur_spr >> 6) == sprite_sel_ed.current_sprite_page) {
      cur_spr = cur_spr & 0x3f;
      var spr_x = cur_spr & 0xf;
      var spr_y = cur_spr >> 4;
      var x = vp.x + spr_x*vp.mul*8;
      var y = vp.y + spr_y*vp.mul*8;
      var width = rcn_current_sprite_width * vp.mul;
      var height = rcn_current_sprite_height * vp.mul;
      this.draw_quad(x, y, width, height, 1, 1, 1, 0.5);
    }
  }
  this.add_child(this.spritesheet_canvas.node);

  // Create sprite page range
  this.sprite_page_range = document.createElement('input');
  this.sprite_page_range.type = 'range';
  this.sprite_page_range.value = 0
  this.sprite_page_range.min = 0;
  this.sprite_page_range.max = 3;
  this.sprite_page_range.step = 1;
  this.sprite_page_range.oninput = function(e) {
    sprite_sel_ed.current_sprite_page = this.value;
    sprite_sel_ed.update_spritesheet_canvas();
  };
  this.add_child(this.sprite_page_range);

  // Create sprite size range
  this.sprite_size_range = document.createElement('input');
  this.sprite_size_range.type = 'range';
  this.sprite_size_range.value = 8;
  this.sprite_size_range.min = 8;
  this.sprite_size_range.max = 32;
  this.sprite_size_range.step = 8;
  this.sprite_size_range.oninput = function() {
    rcn_current_sprite_width = rcn_current_sprite_height = this.value;
    rcn_dispatch_ed_event('rcn_current_sprite_change');
  };
  this.add_child(this.sprite_size_range);

  this.addEventListener('rcn_bin_change', function(e) {
    // Spritesheet update
    const mem_spritesheet_begin = rcn.mem_spritesheet_offset;
    const mem_spritesheet_end = rcn.mem_spritesheet_offset + rcn.mem_spritesheet_size;
    if(e.detail.begin < mem_spritesheet_end && e.detail.end > mem_spritesheet_begin) {
      sprite_sel_ed.update_spritesheet_canvas();
    }
  });

  this.addEventListener('rcn_current_sprite_change', function() {
    sprite_sel_ed.current_sprite_page = rcn_current_sprite >> 6;
    sprite_sel_ed.update_page_range();
    sprite_sel_ed.update_size_range();
    sprite_sel_ed.update_sprite_index_text();
    sprite_sel_ed.update_spritesheet_canvas();
  })

  this.update_sprite_index_text();
  this.update_spritesheet_canvas();
}

rcn_sprite_select_ed.prototype.title = 'Sprite Selector';
rcn_sprite_select_ed.prototype.docs_link = 'sprite-selector';
rcn_sprite_select_ed.prototype.type = 'sprite_select_ed';

rcn_sprite_select_ed.prototype.set_current_sprite = function(new_sprite) {
  rcn_current_sprite = new_sprite;
  rcn_dispatch_ed_event('rcn_current_sprite_change');
}

rcn_sprite_select_ed.prototype.update_sprite_index_text = function() {
  this.sprite_index_text.innerText = rcn_current_sprite.toString().padStart(3, '0');
}

rcn_sprite_select_ed.prototype.update_spritesheet_canvas = function() {
  var page_index = this.current_sprite_page << 11;
  this.spritesheet_canvas.set_aspect_ratio(4, 1);
  this.spritesheet_canvas.set_size(128, 32);
  this.spritesheet_canvas.blit(0, 0, 128, 32, rcn_global_bin.rom.slice(page_index));
  this.spritesheet_canvas.flush();
}

rcn_sprite_select_ed.prototype.update_page_range = function() {
  this.sprite_page_range.value = this.current_sprite_page;
}

rcn_sprite_select_ed.prototype.update_size_range = function() {
  // TODO: This is bad
  this.sprite_size_range.value = rcn_current_sprite_height;
}

rcn_editors.push(rcn_sprite_select_ed);
