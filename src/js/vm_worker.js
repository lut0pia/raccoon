// Raccoon virtual machine
// This is the worker script that gets executed inside a web worker

function rcn_vm_worker_function() {
  const rcn_vm_ram_size = 32 * 1024; // = 32KiB
  const rcn_vm_ram_palette_offset = 0x4000;
  const rcn_vm_ram_screen_offset = 0x6000;
  const rcn_vm_ram_screen_size = 0x2000;

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

  var ram = new _Uint8Array(rcn_vm_ram_size);

  // Local helper functions
  var screen_pixel_index = function(x, y) {
    return rcn_vm_ram_screen_offset+(y<<6)+(x>>1);
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
  rnd = function(x) {
    if(x) {
      return _Math.floor(_Math.random()*x);
    } else {
      return _Math.random;
    }
  }
  sin = _Math.sin;
  cos = _Math.cos;
  atan2 = _Math.atan2;

  // Raccoon rendering API
  pset = function(x, y, p) {
    var pixel_index = screen_pixel_index(x, y);
    var pixel = ram[pixel_index];
    if((x % 2) == 0) {
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
    if((x % 2) == 0) {
      return pixel & 0xf;
    } else {
      return pixel >> 4;
    }
  }
  palset = function(i, r, g, b) {
    ram[rcn_vm_ram_palette_offset+i*3+0] = r;
    ram[rcn_vm_ram_palette_offset+i*3+1] = g;
    ram[rcn_vm_ram_palette_offset+i*3+2] = b;
  }
  cls = function(c) {
    c = c || 0; // Default color is 0
    c |= c<<4; // Left and right pixel to same color
    ram.fill(c, rcn_vm_ram_screen_offset, rcn_vm_ram_screen_offset + rcn_vm_ram_screen_size);
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
        var offset = e.data.offset;
        var bytes = e.data.bytes;
        for(var i=0; i<bytes.byteLength; i++) {
          ram[offset+i] = bytes[i];
        }
        break;
      case 'update':
        if(typeof update !== 'undefined') {
          update(); // This is user-defined
        }
        _postMessage({
          type:'blit', x:0, y:0, w:128, h:128,
          pixels:ram.slice(rcn_vm_ram_screen_offset, rcn_vm_ram_screen_offset+0x2000),
          palette:ram.slice(rcn_vm_ram_palette_offset, rcn_vm_ram_palette_offset+0x30),
        });
        break;
    }
  }
}

const rcn_vm_worker_url = URL.createObjectURL(new Blob(['('+rcn_vm_worker_function.toString()+')()'], {type: 'text/javascript'}));
