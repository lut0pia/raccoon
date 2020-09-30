// Raccoon palette editor
'use strict';

const rcn_default_palettes = {
  'Raccoon': [
    0x80000000,
    0x00ffffff,
    0x00fd4637,
    0x00eeba59,
    0x00eee209,
    0x0064d838,
    0x005840e3,
    0x00925484,
    0x00000000,
    0x00adadad,
    0x00cb0e12,
    0x00d2844a,
    0x00dfd346,
    0x005fb630,
    0x00383889,
    0x00513342,
  ],
  'Apple II': [
    0x80000000,
    0x00843d52,
    0x00514888,
    0x00e85def,
    0x00006752,
    0x00919191,
    0x0000a6f0,
    0x00c8c1f7,
    0x00515c16,
    0x00ea7d27,
    0x00919191,
    0x00f5b7c9,
    0x0000c82c,
    0x00c9d199,
    0x0098dbc9,
    0x00ffffff,
  ],
  'C-64': [
    0x80000000,
    0x00ffffff,
    0x00883932,
    0x0067b6bd,
    0x008b3f96,
    0x0055a049,
    0x0040318d,
    0x00bfce72,
    0x008b5429,
    0x00574200,
    0x00b86962,
    0x00505050,
    0x00787878,
    0x0094e089,
    0x007869c4,
    0x009f9f9f,
  ],
  'Game Boy': [
    0x000f380f,
    0x00306230,
    0x008bac0f,
    0x009bbc0f,
  ],
  'MSX': [
    0x80000000,
    0x00000000,
    0x003eb849,
    0x0074d07d,
    0x005955e0,
    0x008076f1,
    0x00b95e51,
    0x0065dbef,
    0x00db6559,
    0x00ff897d,
    0x00ccc35e,
    0x00ded087,
    0x003aa241,
    0x00b766b5,
    0x00cccccc,
    0x00ffffff,
  ],
  'PICO-8': [
    0x80000000,
    0x001d2b53,
    0x007e2553,
    0x00008751,
    0x00ab5236,
    0x005f574f,
    0x00c2c3c7,
    0x00fff1e8,
    0x00ff004d,
    0x00ffa300,
    0x00ffec27,
    0x0000e436,
    0x0029adff,
    0x0083769c,
    0x00ff77a8,
    0x00ffccaa,
  ],
  'VIC-20': [
    0x80000000,
    0x00ffffff,
    0x00782922,
    0x0087d6dd,
    0x00aa5fb6,
    0x0055a049,
    0x0040318d,
    0x00bfce72,
    0x00aa7449,
    0x00eab489,
    0x00b86962,
    0x00c7ffff,
    0x00ea9ff6,
    0x0094e089,
    0x008071cc,
    0x00ffffb2,
  ],
};

for(let pal_id in rcn_default_palettes) {
  const bytes = new Uint8Array(rcn.mem_palette_size);
  const palette = rcn_default_palettes[pal_id];
  for(let i = 0; i < 16; i++) {
    const color = i < palette.length ? palette[i] : 0x80000000;
    bytes[i*4+0] = (color >> 16) & 0xff;
    bytes[i*4+1] = (color >> 8) & 0xff;
    bytes[i*4+2] = color & 0xff;
    bytes[i*4+3] = (color >> 24) | i;
  }
  rcn_default_palettes[pal_id] = bytes;
}

function rcn_palette_ed() {
  rcn_palette_ed.prototype.__proto__ = rcn_window.prototype;
  rcn_window.call(this);

  const palette_ed = this;

  const palette_select_label = document.createElement('label');
  palette_select_label.innerText = 'Palette: ';
  this.add_child(palette_select_label);
  this.add_child(this.palette_select = rcn_ui_select({
    options: Object.assign(...[{Custom:'Custom'}].concat(Object.keys(rcn_default_palettes).map(i => ({[i]: i})))),
    onchange: function() {
      if(this.value != 'Custom') {
        palette_ed.set_current_palette(this.value);
      }
    },
  }));

  this.addEventListener('rcn_bin_change', function(e) {
    if(rcn_mem_changed(e, 'palette')) {
      palette_ed.update_palette_select();
    }
  });

  this.update_palette_select();
}

rcn_palette_ed.prototype.title = 'Palette Editor';
rcn_palette_ed.prototype.type = 'palette_ed';
rcn_palette_ed.prototype.group = 'visual';
rcn_editors.push(rcn_palette_ed);

rcn_palette_ed.prototype.update_palette_select = function() {
  const bin_bytes = rcn_global_bin.rom.slice(rcn.mem_palette_offset, rcn.mem_palette_offset + rcn.mem_palette_size);
  for(let pal_id in rcn_default_palettes) {
    const bytes = rcn_default_palettes[pal_id]
    if(bin_bytes.every((v, i) => v === bytes[i])) {
      this.palette_select.value = pal_id;
      return;
    }
  }
  this.palette_select.value = 'Custom';
}

rcn_palette_ed.prototype.set_current_palette = function(pal_id) {
  rcn_global_bin.rom.set(rcn_default_palettes[pal_id], rcn.mem_palette_offset);
  rcn_dispatch_ed_event('rcn_bin_change', {
    begin: rcn.mem_palette_offset,
    end: rcn.mem_palette_offset + rcn.mem_palette_size,
  });
}
