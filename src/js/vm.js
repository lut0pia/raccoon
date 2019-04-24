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
      e.preventDefault();
      this.vm.set_gamepad_bit(0, rcn_keycode_to_gamepad[e.keyCode], true);
    }
  });
  this.canvas.node.addEventListener('keyup', function(e) {
    if(rcn_keycode_to_gamepad[e.keyCode] != undefined) {
      e.preventDefault();
      this.vm.set_gamepad_bit(0, rcn_keycode_to_gamepad[e.keyCode], false);
    }
  });
  this.canvas.node.addEventListener('blur', function() {
    // Reset keyboard state
    this.vm.gamepad_state[0] = 0;
  });

  this.reset();
  this.last_tick = 0;

  const vm = this;
  const tick = function() {
    const now = performance.now();
    if(now > vm.last_tick + 30) {
      if(!vm.tick()) {
        return;
      }
      vm.last_tick = now;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

rcn_vm.prototype.kill = function() {
  if(this.worker) {
    this.worker.onmessage = null;
    this.worker.terminate();
    this.worker = null;
  }
  if(this.audio) {
    this.audio.kill();
    this.audio = null;
  }
}

rcn_vm.prototype.tick = function() {
  if(!document.body.contains(this.canvas.node)) {
    // The canvas was removed from the visible DOM, bail
    this.kill();
    return false;
  }

  if(this.worker && !this.paused) {
    this.update();
  } else {
    this.canvas.flush();
  }
  return true;
}

rcn_vm.prototype.update = function() {
  // Keep audio time at beginning of frame for later audio update
  this.audio_frame_time = rcn_audio_context.currentTime;

  const gamepads = navigator.getGamepads();
  for(let i = 0; i < gamepads.length; i++) {
    let gamepad = gamepads[i];
    if(!gamepad) continue;
    this.set_gamepad_bit(gamepad.index, 0, gamepad.axes[0] < -0.33);
    this.set_gamepad_bit(gamepad.index, 1, gamepad.axes[0] > +0.33);
    this.set_gamepad_bit(gamepad.index, 2, gamepad.axes[1] < -0.33);
    this.set_gamepad_bit(gamepad.index, 3, gamepad.axes[1] > +0.33);
    this.set_gamepad_bit(gamepad.index, 4, gamepad.buttons[0].pressed);
    this.set_gamepad_bit(gamepad.index, 5, gamepad.buttons[1].pressed);
    this.set_gamepad_bit(gamepad.index, 6, gamepad.buttons[2].pressed);
    this.set_gamepad_bit(gamepad.index, 7, gamepad.buttons[3].pressed);
  }

  this.worker.postMessage({type:'memory', offset: rcn.mem_gamepad_offset, bytes: this.gamepad_state});
  this.worker.postMessage({type: 'update'});

  this.gamepad_state.copyWithin(4, 0, 4); // Keep copy of previous frame gamepad state
}

rcn_vm.prototype.reset = function() {
  this.kill();
  this.worker = new Worker(rcn_vm_worker_url);
  const vm = this;
  this.worker.onmessage = function(e) { vm.onmessage(e); }
  this.audio = new rcn_audio();
}

rcn_vm.prototype.load_bin = function(bin) {
  this.reset();
  this.load_memory(bin.rom);
  this.load_code(bin.code);
  this.worker.postMessage({type: 'init'});
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
      this.audio.update(this.audio_frame_time, e.data.sound);
      this.canvas.flush();
      break;
    case 'error':
      this.kill();
      rcn_dispatch_ed_event('rcn_error', e.data);
      break;
    default:
      rcn_log('Unhandled VM message: ', e.data);
      break;
  }
}
