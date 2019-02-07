// Raccoon virtual machine
// This is the worker script that gets executed inside a web worker

function rcn_vm_worker_function(rcn) {
  const rcn_ram_size = rcn.ram_size;
  const rcn_mem_palette_offset = rcn.mem_palette_offset;
  const rcn_mem_palette_size = rcn.mem_palette_size;
  const rcn_mem_gamepad_offset = rcn.mem_gamepad_offset;
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

  // Local helper functions
  var send_exception = function(e) {
    // e.lineNumber is off by 2 for some reason
    _postMessage({type:'exception', message:e.message, line:e.lineNumber-2, column:e.columnNumber});
  }
  var sprite_pixel_index = function(x, y) {
    return (y<<6)+(x>>1);
  }
  var screen_pixel_index = function(x, y) {
    return rcn_mem_screen_offset + sprite_pixel_index(x, y);
  }

  // Raccoon math API
  flr = _Math.floor;
  ceil = _Math.ceil;
  abs = _Math.abs;
  sign = _Math.sign;
  max = _Math.max;
  min = _Math.min;
  mid = function(a, b, c) {
    return _Math.max(_Math.min(a, b), _Math.min(_Math.max(a, b), c));
  }
  sqrt = _Math.sqrt;
  rnd = r = function(x) {
    if(x) {
      return _Math.floor(_Math.random()*x);
    } else {
      return _Math.random();
    }
  }
  sin = _Math.sin;
  cos = _Math.cos;
  atan2 = _Math.atan2;

  // Raccoon rendering API
  pset = p = function(x, y, p) {
    var pixel_index = screen_pixel_index(x, y);
    var pixel = ram[pixel_index];
    if((x % 2) < 1) {
      pixel &= 0xf0;
      pixel |= p;
    } else {
      pixel &= 0xf;
      pixel |= p<<4;
    }
    ram[pixel_index] = pixel;
  }
  pget = function(x, y) {
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
  cls = c = function(c) {
    c = c || 0; // Default color is 0
    c |= c<<4; // Left and right pixel to same color
    ram.fill(c, rcn_mem_screen_offset, rcn_mem_screen_offset + rcn_mem_screen_size);
  }
  spr = function(n, x, y, w, h, flip_x, flip_y) {
    w = w || 1.0;
    h = h || 1.0;

    var first_texel_index = ((n & 0xf) << 2) + ((n >> 4) << 9);
    if((x & 1) == 0 && !flip_x && !flip_y) { // Fast path
      var pixel_index = screen_pixel_index(x, y);
      for(var r=0; r<h*8; r++) {
        var row_texel_index = first_texel_index + (r << 6);
        var row_size = w << 2;
        ram.copyWithin(pixel_index + (r << 6), row_texel_index, row_texel_index + row_size);
      }
    } else { // Slow path
      for(var i=0; i<w*8; i++) {
        for(var j=0; j<h*8; j++) {
          // Fetch sprite color
          var tex_index = first_texel_index + sprite_pixel_index(i, j);
          var color = ((i % 2) < 1)
            ? (ram[tex_index] & 0xf)
            : (ram[tex_index] >> 4);

          // Apply color to screen
          var scr_x = x + i;
          var scr_y = y + j;
          var scr_index = screen_pixel_index(scr_x, scr_y);
          ram[scr_index] = ((scr_x % 2) < 1)
            ? ((ram[scr_index] & 0xf0) | color)
            : ((ram[scr_index] & 0xf) | (color << 4));
        }
      }
    }
  }

  // Raccoon input API
  btn = b = function(i, p) {
    p = p || 0; // First player by default
    return (ram[rcn_mem_gamepad_offset+p] & (1 << i)) != 0;
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
        try {
          (new _Function(code))();
        } catch(e) {
          send_exception(e);
        }
        break;
      case 'memory':
        ram.set(e.data.bytes, e.data.offset);
        break;
      case 'update':
        if(typeof update !== 'undefined') {
          try {
            update(); // This is user-defined
          }
          catch(e) {
            send_exception(e);
          }
        }
        _postMessage({
          type:'blit', x:0, y:0, w:128, h:128,
          pixels:ram.slice(rcn_mem_screen_offset, rcn_mem_screen_offset + rcn_mem_screen_size),
          palette:ram.slice(rcn_mem_palette_offset, rcn_mem_palette_offset + rcn_mem_palette_size),
        });
        break;
    }
  }
}

const rcn_vm_worker_url = URL.createObjectURL(new Blob(
  ['('+rcn_vm_worker_function.toString()+')('+JSON.stringify(rcn)+')'],
  {type: 'text/javascript'}));
