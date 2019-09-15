// Raccoon virtual machine
// This is the worker script that gets executed inside a web worker
'use strict';

function rcn_vm_worker_function(rcn) {
  const rcn_ram_size = rcn.ram_size;
  const rcn_mem_palette_offset = rcn.mem_palette_offset;
  const rcn_mem_palette_size = rcn.mem_palette_size;
  const rcn_mem_sound_offset = rcn.mem_sound_offset;
  const rcn_mem_palmod_offset = rcn.mem_palmod_offset;
  const rcn_mem_gamepad_offset = rcn.mem_gamepad_offset;
  const rcn_mem_soundreg_offset = rcn.mem_soundreg_offset;
  const rcn_mem_soundreg_size = rcn.mem_soundreg_size;
  const rcn_mem_screen_offset = rcn.mem_screen_offset;
  const rcn_mem_screen_size = rcn.mem_screen_size;

  const ram_buffer = new ArrayBuffer(rcn_ram_size);
  const ram_view = new DataView(ram_buffer);
  const ram = new Uint8Array(ram_buffer);

  // Keep parts of the API local
  const _Function = Function;
  const _Math = Math;
  const _postMessage = postMessage;
  const _self = self;
  const _String = String;

  // Remove parts of the API
  Object.getOwnPropertyNames(_self).forEach(function(key) {
    if(key != 'onmessage') {
      delete _self[key];
    }
  });

  // Initialize permutation
  for(let i = 0; i < 16; i++) {
    ram[rcn_mem_palmod_offset+i] = i;
  }

  // Local helper functions
  const sprite_pixel_index = function(x, y) {
    return (y<<6)+(x>>1);
  }
  const screen_pixel_index = function(x, y) {
    return rcn_mem_screen_offset + sprite_pixel_index(x, y);
  }
  const pset_internal = function(x, y, c) {
    // No bounds-checking, no color palette support
    const index = screen_pixel_index(x, y);
    ram[index] = ((x % 2) < 1)
          ? ((ram[index] & 0xf0) | c)
          : ((ram[index] & 0x0f) | (c << 4));
  }
  const cam_x = function() {
    return ram_view.getInt16(rcn.mem_cam_offset + 0);
  }
  const cam_y = function() {
    return ram_view.getInt16(rcn.mem_cam_offset + 2);
  }

  // Raccoon math API
  const _flr = flr = _Math.floor;
  const _ceil = ceil = _Math.ceil;
  const _abs = abs = _Math.abs;
  const _sign = sign = _Math.sign;
  const _max = max = _Math.max;
  const _min = min = _Math.min;
  mid = function(a, b, c) {
    return _max(_min(a, b), _min(_max(a, b), c));
  }
  sqrt = _Math.sqrt;
  rnd = r = function(x) {
    return x ? _Math.floor(_Math.random()*x) : _Math.random();
  }
  sin = _Math.sin;
  cos = _Math.cos;
  atan2 = _Math.atan2;

  // Raccoon rendering API
  const _pset = pset = p = function(x, y, c) {
    if(x < 0 || x >= 128 || y < 0 || y >= 128) {
      return;
    }
    pset_internal(x, y, _palmget(c));
  }
  pget = function(x, y) {
    if(x < 0 || x >= 128 || y < 0 || y >= 128) {
      return 0;
    }
    const pixel = ram[screen_pixel_index(x, y)];
    if((x % 2) < 1) {
      return pixel & 0xf;
    } else {
      return pixel >> 4;
    }
  }
  palset = function(i, r, g, b) {
    ram[rcn_mem_palette_offset+i*3+0] = r;
    ram[rcn_mem_palette_offset+i*3+1] = g;
    ram[rcn_mem_palette_offset+i*3+2] = b;
  }
  const _palmget = function(c) {
    return ram[rcn_mem_palmod_offset+c] & 0xf;
  }
  palm = function(src, dst) {
    ram[rcn_mem_palmod_offset+src] = (ram[rcn_mem_palmod_offset+src] & 0xf0) | dst;
  }
  const _paltget = function(c) {
    return (ram[rcn_mem_palmod_offset+c] >> 7) != 0;
  }
  palt = function(c, t) {
    ram[rcn_mem_palmod_offset+c] = (ram[rcn_mem_palmod_offset+c] & 0x0f) | (t ? 0x80 : 0x00);
  }
  cls = c = function(c) {
    c = c || 0; // Default color is 0
    c |= c<<4; // Left and right pixel to same color
    ram.fill(c, rcn_mem_screen_offset, rcn_mem_screen_offset + rcn_mem_screen_size);
  }
  cam = function(x, y) {
    ram_view.setInt16(rcn.mem_cam_offset + 0, x);
    ram_view.setInt16(rcn.mem_cam_offset + 2, y);
  }
  const _spr = spr = function(n, x, y, ow, oh, fx, fy) {
    // Default width and height
    ow = ow || 1.0;
    oh = oh || 1.0;

    // Camera
    x -= cam_x();
    y -= cam_y();

    // Clip
    const iw = _max(0, -x / 8);
    const ih = _max(0, -y / 8);
    const w = _min(ow, (128 - x) / 8);
    const h = _min(oh, (128 - y) / 8);

    // Early exit if nothing to draw
    if(w <= iw || h <= ih) {
      return;
    }

    const first_texel_index = ((n & 0xf) << 2) + ((n >> 4) << 9);
    const owp = ow * 8;
    const ohp = oh * 8;
    const iwp = iw * 8;
    const ihp = ih * 8;
    const wp = w * 8;
    const hp = h * 8;
    for(let i = iwp; i < wp; i++) {
      for(let j = ihp; j < hp; j++) {
        // Fetch sprite color
        const ti = fx ? (owp - i - 1) : i;
        const tj = fy ? (ohp - j - 1) : j;
        const tex_index = first_texel_index + sprite_pixel_index(ti, tj);
        const c = ((ti % 2) < 1)
          ? (ram[tex_index] & 0xf)
          : (ram[tex_index] >> 4);

        if(!_paltget(c)) {
          pset_internal(x + i, y + j, _palmget(c));
        }
      }
    }
  }
  const _fget = fget = function(n, f) {
    const flags = ram[rcn.mem_spriteflags_offset + n];
    return f !== undefined ? ((flags & (1 << f)) != 0) : flags;
  }
  fset = function(n, f, v) {
    const i = rcn.mem_spriteflags_offset + n;
    ram[i] = v !== undefined ? (ram[i] & ~(1 << f)) | (v ? (1 << f) : 0) : f;
  }
  const _mget = mget = function(celx, cely) {
    return ram[rcn.mem_map_offset + (cely << 7) + (celx << 0)];
  }
  mset = function(celx, cely, n) {
    ram[rcn.mem_map_offset + (cely << 7) + (celx << 0)] = n;
  }
  map = function(celx, cely, sx, sy, celw, celh, layer) {
    layer = layer || 0xff;

    for(let x = 0; x < celw; x++) {
      for(let y = 0; y < celh; y++) {
        _spr(_mget(celx + x, cely + y), sx + (x << 3), sy + (y << 3));
      }
    }
  }
  const font = {'0':[0,0,1,0,2,0,0,1,2,1,0,2,2,2,0,3,2,3,0,4,1,4,2,4,],'1':[1,0,0,1,1,1,1,2,1,3,0,4,1,4,2,4,],'2':[0,0,1,0,2,0,2,1,0,2,1,2,2,2,0,3,0,4,1,4,2,4,],'3':[0,0,1,0,2,0,2,1,1,2,2,2,2,3,0,4,1,4,2,4,],'4':[0,0,2,0,0,1,2,1,0,2,1,2,2,2,2,3,2,4,],'5':[0,0,1,0,2,0,0,1,0,2,1,2,2,2,2,3,0,4,1,4,2,4,],'6':[0,0,1,0,2,0,0,1,0,2,1,2,2,2,0,3,2,3,0,4,1,4,2,4,],'7':[0,0,1,0,2,0,2,1,2,2,2,3,2,4,],'8':[0,0,1,0,2,0,0,1,2,1,0,2,1,2,2,2,0,3,2,3,0,4,1,4,2,4,],'9':[0,0,1,0,2,0,0,1,2,1,0,2,1,2,2,2,2,3,0,4,1,4,2,4,],A:[1,0,0,1,2,1,0,2,1,2,2,2,0,3,2,3,0,4,2,4,],B:[0,0,1,0,0,1,2,1,0,2,1,2,0,3,2,3,0,4,1,4,],C:[1,0,2,0,0,1,0,2,0,3,1,4,2,4,],D:[0,0,1,0,0,1,2,1,0,2,2,2,0,3,2,3,0,4,1,4,],E:[0,0,1,0,2,0,0,1,0,2,1,2,0,3,0,4,1,4,2,4,],F:[0,0,1,0,2,0,0,1,0,2,1,2,0,3,0,4,],G:[1,0,2,0,0,1,0,2,0,3,2,3,1,4,2,4,],H:[0,0,2,0,0,1,2,1,0,2,1,2,2,2,0,3,2,3,0,4,2,4,],I:[0,0,1,0,2,0,1,1,1,2,1,3,0,4,1,4,2,4,],J:[0,0,1,0,2,0,1,1,1,2,1,3,0,4,1,4,],K:[0,0,2,0,0,1,2,1,0,2,1,2,0,3,2,3,0,4,2,4,],L:[0,0,0,1,0,2,0,3,0,4,1,4,2,4,],M:[0,0,2,0,0,1,1,1,2,1,0,2,2,2,0,3,2,3,0,4,2,4,],N:[0,0,1,0,0,1,2,1,0,2,2,2,0,3,2,3,0,4,2,4,],O:[1,0,0,1,2,1,0,2,2,2,0,3,2,3,1,4,],P:[0,0,1,0,0,1,2,1,0,2,1,2,0,3,0,4,],Q:[1,0,0,1,2,1,0,2,2,2,0,3,1,3,1,4,2,4,],R:[0,0,1,0,0,1,2,1,0,2,1,2,0,3,2,3,0,4,2,4,],S:[1,0,2,0,0,1,1,2,2,3,0,4,1,4,],T:[0,0,1,0,2,0,1,1,1,2,1,3,1,4,],U:[0,0,2,0,0,1,2,1,0,2,2,2,0,3,2,3,1,4,],V:[0,0,2,0,0,1,2,1,0,2,2,2,0,3,1,3,2,3,1,4,],W:[0,0,2,0,0,1,2,1,0,2,2,2,0,3,1,3,2,3,0,4,2,4,],X:[0,0,2,0,0,1,2,1,1,2,0,3,2,3,0,4,2,4,],Y:[0,0,2,0,0,1,2,1,0,2,1,2,2,2,1,3,1,4,],Z:[0,0,1,0,2,0,2,1,1,2,0,3,0,4,1,4,2,4,],a:[1,2,2,2,0,3,2,3,0,4,1,4,2,4,],b:[0,0,0,1,0,2,1,2,0,3,2,3,0,4,1,4,],c:[1,2,2,2,0,3,1,4,2,4,],d:[2,0,2,1,1,2,2,2,0,3,2,3,1,4,2,4,],e:[0,2,1,2,0,3,1,4,3,],f:[1,0,0,1,0,2,1,2,0,3,0,4,3,],g:[1,2,0,3,2,3,1,4,2,4,2,5,1,6,],h:[0,0,0,1,0,2,1,2,0,3,2,3,0,4,2,4,],i:[0,0,0,2,0,3,0,4,2,],j:[1,0,1,2,1,3,1,4,1,5,0,6,3,],k:[0,0,0,1,0,2,2,2,0,3,1,3,0,4,2,4,],l:[0,0,0,1,0,2,0,3,0,4,2,],m:[0,2,1,2,2,2,0,3,2,3,0,4,2,4,],n:[0,2,1,2,0,3,2,3,0,4,2,4,],o:[1,2,0,3,2,3,1,4,],p:[0,2,1,2,0,3,2,3,0,4,1,4,0,5,0,6,],q:[1,2,2,2,0,3,2,3,1,4,2,4,2,5,2,6,],r:[1,2,0,3,0,4,3,],s:[1,2,2,2,1,3,0,4,1,4,],t:[0,0,0,1,1,1,0,2,0,3,1,4,3,],u:[0,2,2,2,0,3,2,3,1,4,],v:[0,2,2,2,0,3,1,3,2,3,1,4,],w:[0,2,2,2,0,3,2,3,0,4,1,4,2,4,],x:[0,2,2,2,1,3,0,4,2,4,],y:[0,2,2,2,0,3,2,3,1,4,2,4,2,5,1,6,],z:[0,2,1,2,1,3,1,4,2,4,],'.':[0,4,2,],',':[0,4,-1,5,2],'!':[0,0,0,1,0,2,0,4,2,],'(':[1,0,0,1,0,2,0,3,0,4,1,5,3,],')':[0,0,1,1,1,2,1,3,1,4,0,5,3,],'-':[0,3,1,3,2,3,],};
  print = function(x, y, text, c) {
    // Camera
    x -= cam_x();
    y -= cam_y();

    text = _String(text);

    const ox = x;

    for(let i = 0; i < text.length; i++) {
      const char = text.charAt(i);

      if(char == '\n') {
        x = ox;
        y += 8;
        continue;
      }

      const glyph = font[char];
      if(glyph) {
        for(let j = 0; j < glyph.length - 1; j += 2) {
          const gx = glyph[j+0] + x;
          const gy = glyph[j+1] + y;
          _pset(gx, gy, c);
        }
      }
      if(glyph && glyph.length % 2 == 1) {
        x += glyph[glyph.length - 1];
      } else {
        x += 4;
      }
    }
  }
  const hline = function(x, y, w, c) {
    // No bounds-checking, no color palette support
    const cc = c | (c << 4);
    const x2 = x + (x & 1);
    if(x != x2) {
      pset_internal(x, y, c);
      w -= 1;
    }
    if((w & 1) != 0) {
      pset_internal(x2 + w - 1, y, c);
    }
    const index = screen_pixel_index(x2, y);
    ram.fill(cc, index, index + (w >> 1));
  }
  const hline_safe = function(x, y, w, c) {
    if(y >= 0 && y < 128) {
      w += _min(0, x);
      x = _max(0, x);
      w -= _max(128, x + w) - 128;
      hline(x, y, w, c);
    }
  }
  line = function(x0, y0, x1, y1, c) {
    x0 = _flr(x0) + 0.5;
    x1 = _flr(x1) + 0.5;
    y0 = _flr(y0) + 0.5;
    y1 = _flr(y1) + 0.5;

    // Camera
    x0 -= cam_x();
    y0 -= cam_y();
    x1 -= cam_x();
    y1 -= cam_y();

    const dx = _flr(x1 - x0);
    const dy = _flr(y1 - y0);
    if(dx == 0 && dy == 0) {
      _pset(x0, y0, c);
    } else if(_abs(dx) >= _abs(dy)) {
      if(x1 < x0) {
        let tmp = x1;
        x1 = x0;
        x0 = tmp;
        tmp = y1
        y1 = y0
        y0 = tmp
      }
      const de = dy / dx;
      let y = y0;
      for(let x = x0; x <= x1; x++) {
        _pset(x, y, c);
        y += de;
      }
    } else {
      if(y1 < y0) {
        let tmp = x1;
        x1 = x0;
        x0 = tmp;
        tmp = y1
        y1 = y0
        y0 = tmp
      }
      const de = dx / dy;
      let x = x0;
      for(let y = y0; y <= y1; y++) {
        _pset(x, y, c);
        x += de;
      }
    }
  }
  rect = function(x, y, w, h, c) {
    // Camera
    x -= cam_x();
    y -= cam_y();

    x <<= 0;
    y <<= 0;
    w <<= 0;
    h <<= 0;
    for(let i = 0; i < w; i++) {
      _pset(x + i, y, c);
      _pset(x + i, y + h - 1, c);
    }
    for(let i = 1; i < h - 1; i++) {
      _pset(x, y + i, c);
      _pset(x + w - 1, y + i, c);
    }
  }
  rectfill = function(x, y, w, h, c) {
    // Camera
    x -= cam_x();
    y -= cam_y();

    x <<= 0;
    y <<= 0;
    w <<= 0;
    h <<= 0;
    w += _min(0, x);
    x = _max(0, x);
    h += _min(0, y);
    y = _max(0, y);
    w -= _max(128, x + w) - 128;
    h -= _max(128, y + h) - 128;
    if(w > 0 && h > 0) {
      c = _palmget(c);
      for(let i = 0; i < h; i++) {
        hline(x, y + i, w, c);
      }
    }
  }
  circ = function(x, y, r, c) {
    // Camera
    x -= cam_x();
    y -= cam_y();

    x <<= 0;
    y <<= 0;
    r <<= 0;

    // Bresenham
    let d = 3 - (2 * r);
    let ox = 0;
    let oy = r;

    while(ox <= oy) {
      _pset(x + ox, y + oy, c);
      _pset(x + ox, y - oy, c);
      _pset(x - ox, y + oy, c);
      _pset(x - ox, y - oy, c);
      _pset(x + oy, y + ox, c);
      _pset(x + oy, y - ox, c);
      _pset(x - oy, y + ox, c);
      _pset(x - oy, y - ox, c);

      ox++;
      if(d < 0) {
        d += 4 * ox + 6;
      } else {
        d += 4 * (ox - oy) + 10;
        oy--;
      }
    }
  }
  circfill = function(x, y, r, c) {
    // Camera
    x -= cam_x();
    y -= cam_y();

    x <<= 0;
    y <<= 0;
    r <<= 0;

    // Bresenham
    let d = 3 - (2 * r);
    let ox = 0;
    let oy = r;
    c = _palmget(c);

    while(ox <= oy) {
      hline_safe(x - ox, y + oy, (ox << 1) + 1, c);
      hline_safe(x - ox, y - oy, (ox << 1) + 1, c);
      hline_safe(x - oy, y + ox, (oy << 1) + 1, c);
      hline_safe(x - oy, y - ox, (oy << 1) + 1, c);

      ox++;
      if(d < 0) {
        d += 4 * ox + 6;
      } else {
        d += 4 * (ox - oy) + 10;
        oy--;
      }
    }
  }

  // Raccoon sound API
  let sfx_chans = [null, null, null, null];
  const sfx_update = function() {
    for(let i = 0; i < 4; i++) {
      const sreg_offset = rcn_mem_soundreg_offset + i * 4;
      const state = sfx_chans[i];
      if(state == null) {
        ram[sreg_offset + 0] &= 0x7f; // Switch off
        continue;
      }

      const snd_offset = rcn_mem_sound_offset + state.n * 66;
      const period = ram[snd_offset + 0] + 4; // In audio frames

      const next_note_index = _ceil(state.time / period);
      const next_note_time = next_note_index * period;
      if(state.time <= next_note_time && next_note_time < state.time + 4) {
        // Next note should be triggered in the next frame
        const offset = next_note_time - state.time;

        if(next_note_index >= state.length) {
          // We've reached the end of the sfx, stop
          ram[sreg_offset + 0] = 0x80; // Switch on and period 0
          ram[sreg_offset + 2] = (offset << 6); // Offset and pitch
          ram[sreg_offset + 3] = 0; // Volume and effect
          sfx_chans[i] = null;
          continue;
        } else {
          const note_offset = snd_offset + 2 + (state.offset + next_note_index) * 2;
          const note_1 = ram[note_offset + 0];
          const note_2 = ram[note_offset + 1];
          ram[sreg_offset + 0] = 0x80 | period; // Switch on and period
          ram[sreg_offset + 1] = ram[snd_offset + 1]; // Envelope and instrument
          ram[sreg_offset + 2] = (offset << 6) | (note_1 & 0x3f); // Offset and pitch
          ram[sreg_offset + 3] = note_2; // Volume and effect
        }
      } else {
        ram[sreg_offset + 0] &= 0x7f; // Switch off
      }

      state.time += 4;
    }
  }
  const _sfx = sfx = function(n, channel = -1, offset = 0, length = 32) {
    if(channel < 0) {
      channel = _max(sfx_chans.findIndex(function(state) {
        return state == null;
      }), 0);
    }
    sfx_chans[channel] = {
      n: n, // Sfx index
      offset: offset, // In notes
      length: length, // In notes
      time: 0, // In audio frames (120 per second)
    };
  }
  let _mus_state = null;
  const _mus_update = function() {
    if(_mus_state == null) return;

    if(_mus_state.max_time && _mus_state.time >= _mus_state.max_time) {
      const mus_index = rcn.mem_music_offset + _mus_state.n * 4;
      if(ram[mus_index + 1] & 0x80) { // End flag
        for(let i = _mus_state.n; i >= 0; i--) {
          if(ram[rcn.mem_music_offset + i * 4 + 0] & 0x80) { // Begin flag
            _mus_state.n = i;
            break;
          }
        }
      } else if(ram[mus_index + 2] & 0x80) { // Stop flag
        _mus_state = null;
        return;
      } else {
        _mus_state.n = (_mus_state.n + 1) % rcn.music_count;
      }
      _mus_state.time = 0;
    }

    if(_mus_state.time == 0) {
      const mus_index = rcn.mem_music_offset + _mus_state.n * 4;
      _mus_state.max_time = 0;
      for(let track = 0; track < rcn.music_track_count; track++) {
        if(ram[mus_index + track] & 0x40) {
          const track_sound = ram[mus_index + track] & 0x3f;
          _sfx(track_sound, track);
          const sound_offset = rcn_mem_sound_offset + track_sound * 66;
          const period = ram[sound_offset + 0] + 4;
          _mus_state.max_time = _max(_mus_state.max_time, period * 32);
        }
      }
    }

    _mus_state.time += 4;
  }
  mus = function(n) {
    if(n < 0) {
      _mus_state = null;
    } else {
      _mus_state = {
        n: n,
        time: 0,
      };
    }
  }

  // Raccoon input API
  btn = b = function(i, p) {
    p = p || 0; // First player by default
    return (ram[rcn_mem_gamepad_offset+p] & (1 << i)) != 0;
  }
  btnp = function(i, p) {
    p = p || 0; // First player by default
    return (ram[rcn_mem_gamepad_offset+p] & (1 << i)) != 0 &&
      (ram[rcn_mem_gamepad_offset+p+4] & (1 << i)) == 0;
  }

  // Raccoon memory API
  memcpy = function(dst, src, len) {
    ram.copyWithin(dst, src, src + len);
  }
  memset = function(dst, val, len) {
    ram.fill(val, dst, dst + len);
  }
  read = function(addr) {
    return ram[addr];
  }
  write = function(addr, val) {
    ram[addr] = val;
  }

  onmessage = function(e) {
    switch(e.data.type) {
      case 'code':
        let code = e.data.code;
        // Allow function thing() {} syntax to work as expected
        // by replacing it with thing = function() {}
        // Also create an indirection to allow hot reload to work
        // even when function has been saved somewhere as a value
        code = code.replace(/function (\w+)(\s*)(\([^\)]*\))/gim, '$1 = function$3 { return __$1$3; }; __$1 = function$3');
        (new _Function(code))();
        break;
      case 'init':
        if(typeof init !== 'undefined') {
          init(); // This is user-defined
        }
        break;
      case 'update':
        if(typeof update !== 'undefined') {
          update(); // This is user-defined
        }
        _mus_update();
        sfx_update();
        break;
      case 'draw':
        if(typeof draw !== 'undefined') {
          draw(); // This is user-defined
        }
        break;
      case 'write':
        ram.set(e.data.bytes, e.data.offset);
        break;
      case 'read':
        _postMessage({
          type: e.data.name,
          bytes: ram.slice(e.data.offset, e.data.offset + e.data.size),
        });
        break;
    }
  }

  addEventListener('error', function(e) {
    _postMessage({type: 'error', message: e.message, line: e.lineno - 2, column: e.colno});
  });
}

const rcn_vm_worker_url = URL.createObjectURL(new Blob(
  ['('+rcn_vm_worker_function.toString()+')('+JSON.stringify(rcn)+')'],
  {type: 'text/javascript'}));
