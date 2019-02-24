// Raccoon virtual machine
// This is the client that spawns the web worker

const rcn_keycode_to_gamepad = {
  37: 0, 39: 1, 38: 2, 40: 3, // Left Right Up Down
  88: 4, 67: 5, 86: 6, 66: 7, // X C V B
};

function rcn_vm() {
  this.gamepad_state = new Uint8Array(rcn.mem_gamepad_size);

  this.canvas = new rcn_canvas();
  this.canvas.set_size(128, 128);
  this.canvas.node.tabIndex = 0; // Means we can focus the canvas and receive input
  this.canvas.node.vm = this;
  this.canvas.node.addEventListener('keydown', function(e) {
    if(rcn_keycode_to_gamepad[e.keyCode] != undefined) {
      this.vm.set_gamepad_bit(0, rcn_keycode_to_gamepad[e.keyCode], true);
    }
  });
  this.canvas.node.addEventListener('keyup', function(e) {
    if(rcn_keycode_to_gamepad[e.keyCode] != undefined) {
      this.vm.set_gamepad_bit(0, rcn_keycode_to_gamepad[e.keyCode], false);
    }
  });
  this.canvas.node.addEventListener('blur', function() {
    // Reset keyboard state
    this.vm.gamepad_state[0] = 0;
  });

  this.new_worker();
  this.tick();
}

rcn_vm.prototype.kill = function() {
  if(this.worker) {
    this.worker.onmessage = null;
    this.worker.terminate();
  }
}

rcn_vm.prototype.tick = function() {
  this.removed_counter = this.removed_counter || 0;
  if(!document.body.contains(this.canvas.node) && ++this.removed_counter > 3) {
    // The canvas was removed from the visible DOM, bail
    this.kill();
    return;
  }

  if(this.worker && !this.paused) {
    this.update();
  }

  var vm = this;
  setTimeout(function() { vm.tick(); }, 1000/30);
}

rcn_vm.prototype.update = function() {
  this.worker.postMessage({type:'memory', offset:rcn.mem_gamepad_offset, bytes:this.gamepad_state});
  this.worker.postMessage({type:'update'});
}

rcn_vm.prototype.new_worker = function() {
  this.kill();
  this.worker = new Worker(rcn_vm_worker_url);
  var vm = this;
  this.worker.onmessage = function(e) { vm.onmessage(e); }
}

rcn_vm.prototype.load_bin = function(bin) {
  this.new_worker();
  this.load_memory(bin.rom);
  this.load_code(bin.code);
}

rcn_vm.prototype.load_code = function(code) {
  this.worker.postMessage({type:'code', code:code});
}

rcn_vm.prototype.load_code_from_bin = function() {
  this.load_code(rcn_global_bin.code);
}

rcn_vm.prototype.load_memory = function(bytes, offset) {
  offset = offset || 0;
  this.worker.postMessage({type:'memory', offset:offset, bytes:bytes});
}

rcn_vm.prototype.load_memory_from_bin = function(offset, size) {
  this.load_memory(rcn_global_bin.rom.slice(offset, offset + size), offset);
}

rcn_vm.prototype.set_gamepad_bit = function(player, offset, value) {
  if(value) {
    this.gamepad_state[player] |= (1 << offset);
  } else {
    this.gamepad_state[player] &= ~(1 << offset);
  }
}

rcn_vm.prototype.onmessage = function(e) {
  switch(e.data.type) {
    case 'blit':
      this.canvas.blit(e.data.x, e.data.y, e.data.w, e.data.h, e.data.pixels, e.data.palette);
      this.canvas.flush();
      break;
    case 'exception':
      rcn_dispatch_ed_event('rcnerror', e.data);
      break;
    default:
      rcn_log('Unhandled VM message: ', e.data);
      break;
  }
}
