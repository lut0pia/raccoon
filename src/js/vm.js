// Raccoon virtual machine
// This is the client that spawns the web worker

const rcn_keycode_to_gamepad = {
  37: 0, 39: 1, 38: 2, 40: 3, // Left Right Up Down
  88: 4, 67: 5, 86: 6, 66: 7, // X C V B
};

function rcn_vm() {
  this.gamepad_state = new Uint8Array(rcn_const.ram_gamepad_size);

  this.canvas = new rcn_canvas();
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
}

rcn_vm.prototype.new_worker = function() {
  if(this.worker) {
    this.worker.onmessage = null;
    this.worker.terminate();
  }
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

rcn_vm.prototype.load_memory = function(bytes, offset) {
  offset = offset || 0;
  this.worker.postMessage({type:'memory', offset:offset, bytes:bytes});
}

rcn_vm.prototype.update = function() {
  this.worker.postMessage({type:'memory', offset:rcn_const.ram_gamepad_offset, bytes:this.gamepad_state});
  this.worker.postMessage({type:'update'});
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
      if(this.onexception) {
        this.onexception(e.data);
      }
      break;
    default:
      rcn_log('Unhandled VM message: ', e.data);
      break;
  }
}
