// Raccoon virtual machine
// This is the client that spawns the web worker

function rcn_vm() {
  this.gamepad_state = new Uint8Array(rcn_const.ram_gamepad_size);

  this.canvas = new rcn_canvas();
  this.canvas.node.tabIndex = 0; // Means we can focus the canvas and receive input
  this.canvas.node.vm = this;
  this.canvas.node.addEventListener('keydown', function(e) {
    if(e.keyCode == 37) this.vm.set_gamepad_bit(0, 0, true); // Left
    if(e.keyCode == 39) this.vm.set_gamepad_bit(0, 1, true); // Right
    if(e.keyCode == 38) this.vm.set_gamepad_bit(0, 2, true); // Up
    if(e.keyCode == 40) this.vm.set_gamepad_bit(0, 3, true); // Down
  });
  this.canvas.node.addEventListener('keyup', function(e) {
    if(e.keyCode == 37) this.vm.set_gamepad_bit(0, 0, false); // Left
    if(e.keyCode == 39) this.vm.set_gamepad_bit(0, 1, false); // Right
    if(e.keyCode == 38) this.vm.set_gamepad_bit(0, 2, false); // Up
    if(e.keyCode == 40) this.vm.set_gamepad_bit(0, 3, false); // Down
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
  }
}
