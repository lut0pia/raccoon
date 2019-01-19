// Raccoon virtual machine
// This is the worker script that gets executed inside a web worker

function rcn_vm_worker_function() {
  const rcn_vm_ram_size = 32 * 1024; // = 32KiB
  const rcn_vm_ram_palette_offset = 0x4000;
  const rcn_vm_ram_screen_offset = 0x6000;

  // Keep parts of the API local
  var _Function = Function;
  var _postMessage = postMessage;

  // Remove parts of the API
  delete eval;
  delete Function;
  delete postMessage;
  delete Worker;
  delete XMLHttpRequest;

  var ram = new Uint8Array(rcn_vm_ram_size);

  // Implement raccoon API
  pset = function(x, y, p) {
    var pixel_index = rcn_vm_ram_screen_offset+y*64+(x>>1);
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
  palset = function(i, r, g, b) {
    ram[rcn_vm_ram_palette_offset+i*3+0] = r;
    ram[rcn_vm_ram_palette_offset+i*3+1] = g;
    ram[rcn_vm_ram_palette_offset+i*3+2] = b;
  }

  onmessage = function(e) {
    switch(e.data.type) {
      case 'code':
        // Allow function thing() {} syntax to work as expected
        // by replacing it with thing = function() {}
        e.data.code = e.data.code.replace(/function ([a-z]+)(\s*)(\([^\)]*\))/gim, '$1 = function$2$3');
        (new _Function(e.data.code))();
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
