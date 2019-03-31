// Raccoon virtual machine
// This is the worker script that gets executed inside a web worker

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

  // Keep parts of the API local
  var _Function = Function;
  var _Math = Math;
  var _postMessage = postMessage;
  var _Uint8Array = Uint8Array;

  // Remove parts of the API
  delete eval;
  delete Function;
  delete Math;
  delete postMessage;
  delete Uint8Array;
  delete Worker;
  delete XMLHttpRequest;

  var ram = new _Uint8Array(rcn_ram_size);

  // Initialize permutation
  for(var i=0; i < 16; i++) {
    ram[rcn_mem_palmod_offset+i] = i;
  }

  // Local helper functions
  var sprite_pixel_index = function(x, y) {
    return (y<<6)+(x>>1);
  }
  var screen_pixel_index = function(x, y) {
    return rcn_mem_screen_offset + sprite_pixel_index(x, y);
  }
  const pset_internal = function(x, y, c) {
    // No bounds-checking, no color palette support
    const index = screen_pixel_index(x, y);
    ram[index] = ((x % 2) < 1)
          ? ((ram[index] & 0xf0) | c)
          : ((ram[index] & 0x0f) | (c << 4));
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
    c = _palmget(c);
    pset_internal(x, y, _palmget(c));
  }
  pget = function(x, y) {
    if(x < 0 || x >= 128 || y < 0 || y >= 128) {
      return 0;
    }
    var pixel = ram[screen_pixel_index(x, y)];
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
  var _spr = spr = function(n, x, y, w, h, flip_x, flip_y) {
    w = w || 1.0;
    h = h || 1.0;

    // Clip
    const iw = _max(0, -x / 8);
    const ih = _max(0, -y / 8);
    w = _min(w, (128 - x) / 8);
    h = _min(h, (128 - y) / 8);

    // Early exit if nothing to draw
    if(w <= iw || h <= ih) {
      return;
    }

    const first_texel_index = ((n & 0xf) << 2) + ((n >> 4) << 9);
    const iwp = iw * 8;
    const ihp = ih * 8;
    const wp = w * 8;
    const hp = h * 8;
    for(var i=iwp; i < wp; i++) {
      for(var j=ihp; j < hp; j++) {
        // Fetch sprite color
        const ti = flip_x ? (wp - i - 1) : i;
        const tj = flip_y ? (hp - j - 1) : j;
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
    return f ? ((flags & (1 << f)) != 0) : flags;
  }
  fset = function(n, f, v) {
    const i = rcn.mem_spriteflags_offset + n;
    ram[i] = f ? (ram[i] & ~(1 << f)) | (v ? (1 << f) : 0) : v;
  }
  var _mget = mget = function(celx, cely) {
    return ram[rcn.mem_map_offset + (cely << 7) + (celx << 0)];
  }
  mset = function(celx, cely, n) {
    ram[rcn.mem_map_offset + (cely << 7) + (celx << 0)] = n;
  }
  map = function(celx, cely, sx, sy, celw, celh, layer) {
    layer = layer || 0xff;

    for(var x = 0; x < celw; x++) {
      for(var y = 0; y < celh; y++) {
        _spr(_mget(celx + x, cely + y), sx + (x << 3), sy + (y << 3));
      }
    }
  }
  const font = {'0':[0,0,1,0,2,0,0,1,2,1,0,2,2,2,0,3,2,3,0,4,1,4,2,4,],'1':[1,0,0,1,1,1,1,2,1,3,0,4,1,4,2,4,],'2':[0,0,1,0,2,0,2,1,0,2,1,2,2,2,0,3,0,4,1,4,2,4,],'3':[0,0,1,0,2,0,2,1,1,2,2,2,2,3,0,4,1,4,2,4,],'4':[0,0,2,0,0,1,2,1,0,2,1,2,2,2,2,3,2,4,],'5':[0,0,1,0,2,0,0,1,0,2,1,2,2,2,2,3,0,4,1,4,2,4,],'6':[0,0,1,0,2,0,0,1,0,2,1,2,2,2,0,3,2,3,0,4,1,4,2,4,],'7':[0,0,1,0,2,0,2,1,2,2,2,3,2,4,],'8':[0,0,1,0,2,0,0,1,2,1,0,2,1,2,2,2,0,3,2,3,0,4,1,4,2,4,],'9':[0,0,1,0,2,0,0,1,2,1,0,2,1,2,2,2,2,3,0,4,1,4,2,4,],A:[1,0,0,1,2,1,0,2,1,2,2,2,0,3,2,3,0,4,2,4,],B:[0,0,1,0,0,1,2,1,0,2,1,2,0,3,2,3,0,4,1,4,],C:[1,0,2,0,0,1,0,2,0,3,1,4,2,4,],D:[0,0,1,0,0,1,2,1,0,2,2,2,0,3,2,3,0,4,1,4,],E:[0,0,1,0,2,0,0,1,0,2,1,2,0,3,0,4,1,4,2,4,],F:[0,0,1,0,2,0,0,1,0,2,1,2,0,3,0,4,],G:[1,0,2,0,0,1,0,2,0,3,2,3,1,4,2,4,],H:[0,0,2,0,0,1,2,1,0,2,1,2,2,2,0,3,2,3,0,4,2,4,],I:[0,0,1,0,2,0,1,1,1,2,1,3,0,4,1,4,2,4,],J:[0,0,1,0,2,0,1,1,1,2,1,3,0,4,1,4,],K:[0,0,2,0,0,1,2,1,0,2,1,2,0,3,2,3,0,4,2,4,],L:[0,0,0,1,0,2,0,3,0,4,1,4,2,4,],M:[0,0,2,0,0,1,1,1,2,1,0,2,2,2,0,3,2,3,0,4,2,4,],N:[0,0,1,0,0,1,2,1,0,2,2,2,0,3,2,3,0,4,2,4,],O:[1,0,0,1,2,1,0,2,2,2,0,3,2,3,1,4,],P:[0,0,1,0,0,1,2,1,0,2,1,2,0,3,0,4,],Q:[1,0,0,1,2,1,0,2,2,2,0,3,1,3,1,4,2,4,],R:[0,0,1,0,0,1,2,1,0,2,1,2,0,3,2,3,0,4,2,4,],S:[1,0,2,0,0,1,1,2,2,3,0,4,1,4,],T:[0,0,1,0,2,0,1,1,1,2,1,3,1,4,],U:[0,0,2,0,0,1,2,1,0,2,2,2,0,3,2,3,1,4,],V:[0,0,2,0,0,1,2,1,0,2,2,2,0,3,1,3,2,3,1,4,],W:[0,0,2,0,0,1,2,1,0,2,2,2,0,3,1,3,2,3,0,4,2,4,],X:[0,0,2,0,0,1,2,1,1,2,0,3,2,3,0,4,2,4,],Y:[0,0,2,0,0,1,2,1,0,2,1,2,2,2,1,3,1,4,],Z:[0,0,1,0,2,0,2,1,1,2,0,3,0,4,1,4,2,4,],a:[1,2,2,2,0,3,2,3,0,4,1,4,2,4,],b:[0,0,0,1,0,2,1,2,0,3,2,3,0,4,1,4,],c:[1,2,2,2,0,3,1,4,2,4,],d:[2,0,2,1,1,2,2,2,0,3,2,3,1,4,2,4,],e:[0,2,1,2,0,3,1,4,3,],f:[1,0,0,1,0,2,1,2,0,3,0,4,3,],g:[1,2,0,3,2,3,1,4,2,4,2,5,1,6,],h:[0,0,0,1,0,2,1,2,0,3,2,3,0,4,2,4,],i:[0,0,0,2,0,3,0,4,2,],j:[1,0,1,2,1,3,1,4,1,5,0,6,3,],k:[0,0,0,1,0,2,2,2,0,3,1,3,0,4,2,4,],l:[0,0,0,1,0,2,0,3,0,4,2,],m:[0,2,1,2,2,2,0,3,2,3,0,4,2,4,],n:[0,2,1,2,0,3,2,3,0,4,2,4,],o:[1,2,0,3,2,3,1,4,],p:[0,2,1,2,0,3,2,3,0,4,1,4,0,5,0,6,],q:[1,2,2,2,0,3,2,3,1,4,2,4,2,5,2,6,],r:[1,2,0,3,0,4,3,],s:[1,2,2,2,1,3,0,4,1,4,],t:[0,0,0,1,1,1,0,2,0,3,1,4,3,],u:[0,2,2,2,0,3,2,3,1,4,],v:[0,2,2,2,0,3,1,3,2,3,1,4,],w:[0,2,2,2,0,3,2,3,0,4,1,4,2,4,],x:[0,2,2,2,1,3,0,4,2,4,],y:[0,2,2,2,0,3,2,3,1,4,2,4,2,5,1,6,],z:[0,2,1,2,1,3,1,4,2,4,],'.':[0,4,2,],',':[0,4,-1,5,2],'!':[0,0,0,1,0,2,0,4,2,],'(':[1,0,0,1,0,2,0,3,0,4,1,5,3,],')':[0,0,1,1,1,2,1,3,1,4,0,5,3,],'-':[0,3,1,3,2,3,],};
  print = function(x, y, text, c) {
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
  line = function(x0, y0, x1, y1, c) {
    x0 = _flr(x0) + 0.5;
    x1 = _flr(x1) + 0.5;
    y0 = _flr(y0) + 0.5;
    y1 = _flr(y1) + 0.5;

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

  // Raccoon sound API
  let sfx_chans = new Array(4);
  const sfx_update = function() {
    for(let i = 0; i < 4; i++) {
      const state = sfx_chans[i];
      if(state === undefined) continue;

      const sreg_offset = rcn_mem_soundreg_offset + i * 3;
      const snd_offset = rcn_mem_sound_offset + state.n * 66;
      const speed = ram[snd_offset + 0];

      if(state.time >= speed) {
        state.time = 0;
        state.i += 1;
      }

      if(state.i >= state.length) {
        ram[sreg_offset + 2] = 0; // Volume and effect
        delete sfx_chans[i];
        continue;
      }
      if(state.time == 0) {
        const note_offset = snd_offset + 2 + (state.offset + state.i) * 2;
        const note_1 = ram[note_offset + 0];
        const note_2 = ram[note_offset + 1];

        ram[sreg_offset + 0] = ram[snd_offset + 1]; // Instrument (shouldn't have to do this every frame)
        ram[sreg_offset + 1] = note_1 & 0x3f; // Pitch
        ram[sreg_offset + 2] = note_2; // Volume and effect
      }
      state.time++;
    }
  }
  const _sfx = sfx = function(n, channel = -1, offset = 0, length = 32) {
    if(channel < 0) {
      channel = _max(sfx_chans.findIndex(function(state) {
        return state === undefined;
      }), 0);
    }
    sfx_chans[channel] = {
      n: n,
      offset: offset,
      length: length,
      i: 0,
      time: 0,
    };
  }
  let mus_state = undefined;
  const mus_update = function() {
    if(mus_state === undefined) return;


    if(mus_state.next && mus_state.time >= mus_state.next) {
      const mus_index = rcn.mem_music_offset + mus_state.n * 4;
      let next_n = 0;
      next_n += (ram[mus_index + 1] >> 6) << 4;
      next_n += (ram[mus_index + 2] >> 6) << 2;
      next_n += (ram[mus_index + 3] >> 6) << 0;
      mus_state.n = next_n;
      mus_state.time = 0;
    }

    if(mus_state.time == 0) {
      const mus_index = rcn.mem_music_offset + mus_state.n * 4;
      const track_count = (ram[mus_index] >> 6) + 1;
      mus_state.next = 0;
      for(let i = 0; i < track_count; i++) {
        const sound_n = ram[mus_index + i] & 0x3f;
        _sfx(sound_n);
        const sound_offset = rcn_mem_sound_offset + sound_n * 66;
        const speed = ram[sound_offset + 0];
        mus_state.next = _max(mus_state.next, speed * 32);
      }
    }

    mus_state.time += 1;
  }
  mus = function(n) {
    if(n < 0) {
      delete mus_state;
    } else {
      mus_state = {
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
        var code = e.data.code;
        // Allow function thing() {} syntax to work as expected
        // by replacing it with thing = function() {}
        code = code.replace(/function ([a-z]+)(\s*)(\([^\)]*\))/gim, '$1 = function$2$3');
        (new _Function(code))();
        break;
      case 'memory':
        ram.set(e.data.bytes, e.data.offset);
        break;
      case 'update':
        if(typeof update !== 'undefined') {
          update(); // This is user-defined
        }
        mus_update();
        sfx_update();
        _postMessage({
          type:'blit', x:0, y:0, w:128, h:128,
          pixels:ram.slice(rcn_mem_screen_offset, rcn_mem_screen_offset + rcn_mem_screen_size),
          palette:ram.slice(rcn_mem_palette_offset, rcn_mem_palette_offset + rcn_mem_palette_size),
          sound:ram.slice(rcn_mem_soundreg_offset, rcn_mem_soundreg_offset + rcn_mem_soundreg_size),
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
