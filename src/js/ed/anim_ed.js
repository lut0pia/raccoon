// Raccoon anim viewer
'use strict';

function rcn_anim_ed() {
  rcn_anim_ed.prototype.__proto__ = rcn_window.prototype;
  rcn_window.call(this);

  this.sprite_w = 1;
  this.sprite_h = 1;
  this.frame = 0;
  this.interval = 4;
  this.frame_sprites = [];
  this.ping_pong = false;

  const anim_ed = this;

  // Create width input
  this.add_child(this.width_input = rcn_ui_number({
    label: 'Width',
    min: 1,
    max: 16,
    step: 1,
    value: 1,
    onchange: function() {
      anim_ed.set_sprite_width(Number(this.value));
    },
  }));

  // Create height input
  this.add_child(this.height_input = rcn_ui_number({
    label: 'Height',
    min: 1,
    max: 16,
    step: 1,
    value: 1,
    onchange: function() {
      anim_ed.set_sprite_height(Number(this.value));
    },
  }));

  // Create interval input
  this.add_child(this.interval_input = rcn_ui_number({
    label: 'Interval',
    min: 1,
    max: 16,
    step: 1,
    value: 4,
    onchange: function() {
      anim_ed.set_interval(Number(this.value));
    },
  }));

  // Create ping-pong input
  this.add_child(this.ping_pong_input = rcn_ui_checkbox({
    label: 'Ping-pong',
    onchange: function() {
      anim_ed.set_ping_pong(this.checked);
    },
  }));

  // Create canvas
  this.canvas = new rcn_canvas();
  this.add_child(this.canvas.node);

  this.addEventListener('rcn_bin_change', function(e) {
    if(rcn_mem_changed(e, 'spritesheet')) {
      anim_ed.update_canvas();
    }
  });

  this.addEventListener('rcn_current_sprite_change', function(e) {
    anim_ed.update_frame_sprites();
    anim_ed.update_canvas();
  });

  this.addEventListener('rcn_window_resize', function() {
    anim_ed.canvas.flush();
  });

  this.update_frame_sprites();

  this.last_tick = 0;
  const tick = function() {
    const now = performance.now();
    if(now > anim_ed.last_tick + 30) {
      if(anim_ed.canvas.node && !document.body.contains(anim_ed.canvas.node)) {
        return;
      }
      anim_ed.update_canvas();
      anim_ed.frame++;
      anim_ed.last_tick = now;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

rcn_anim_ed.prototype.title = 'Animation Viewer';
rcn_anim_ed.prototype.docs_link = 'animation-viewer';
rcn_anim_ed.prototype.type = 'anim_ed';
rcn_anim_ed.prototype.group = 'visual';

rcn_anim_ed.prototype.set_sprite_width = function(w) {
  this.sprite_w = Math.max(1, Math.min(16, w));
  this.update_frame_sprites();
  this.update_canvas();
}

rcn_anim_ed.prototype.set_sprite_height = function(h) {
  this.sprite_h = Math.max(1, Math.min(16, h));
  this.update_frame_sprites();
  this.update_canvas();
}

rcn_anim_ed.prototype.set_interval = function(i) {
  this.interval = Math.max(1, Math.min(16, i));
  this.update_canvas();
}

rcn_anim_ed.prototype.set_ping_pong = function(ping_pong) {
  this.ping_pong = ping_pong;
  this.update_frame_sprites();
}

rcn_anim_ed.prototype.get_current_frame = function() {
  return (this.frame / this.interval) << 0;
}

rcn_anim_ed.prototype.get_frame_count = function() {
  return ((rcn_current_sprite_columns / this.sprite_w) * (rcn_current_sprite_rows / this.sprite_h)) << 0;
}

rcn_anim_ed.prototype.get_frame_spr = function(i) {
  return this.frame_sprites[i % this.frame_sprites.length];
}

rcn_anim_ed.prototype.update_frame_sprites = function() {
  this.frame_sprites = [];
  const frame_count = this.get_frame_count();
  for(let i = 0; i < frame_count; i++) {
    const span_x = (rcn_current_sprite_columns / this.sprite_w) << 0;
    const span_y = (rcn_current_sprite_rows / this.sprite_h) << 0;
    const frame_x = (i % span_x) * this.sprite_w;
    const frame_y = (((i / span_x) << 0) % span_y) * this.sprite_h;

    this.frame_sprites.push(rcn_current_sprite + frame_x + (frame_y << 4));
  }
  if(this.ping_pong) {
    for(let i = this.frame_sprites.length - 2; i > 0; i--) {
      this.frame_sprites.push(this.frame_sprites[i]);
    }
  }
}

rcn_anim_ed.prototype.update_canvas = function() {
  const spr_w = this.sprite_w << 3;
  const spr_h = this.sprite_h << 3;
  const frame = this.get_current_frame();
  const spr_i = this.get_frame_spr(frame);
  const texel_index = ((spr_i & 0xf) << 2) + ((spr_i >> 4) << 9);
  const row_size = spr_w >> 1;

  this.canvas.set_size(spr_w, spr_h);

  const pixels = this.canvas.pixels;

  for(let i = 0; i < spr_h; i++) {
    const row_index = texel_index + (i << 6);
    pixels.set(rcn_global_bin.rom.slice(row_index, row_index + row_size), i * row_size);
  }

  this.canvas.upload_pixels();
  this.canvas.flush();
}

rcn_editors.push(rcn_anim_ed);
