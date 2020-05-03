// Raccoon virtual machine
// This is the client that spawns the web worker
'use strict';

const rcn_keycode_to_gamepad = {
  37: 0, 39: 1, 38: 2, 40: 3, // Left Right Up Down
  88: 4, 67: 5, 86: 6, 66: 7, // X C V B
};

function rcn_vm(params = {}) {
  const vm = this;

  if(!params.no_canvas) {
    this.canvas = new rcn_canvas();
    this.canvas.set_size(128, 128);
    this.canvas.node.tabIndex = 0; // Means we can focus the canvas and receive input
    this.canvas.node.addEventListener('keydown', function(e) {
      if(rcn_keycode_to_gamepad[e.keyCode] != undefined) {
        e.preventDefault();
        const player = vm.get_player_for_gamepad_id('keyboard', rcn.gamepad_layout_xcvb, true);
        if(player >= 0) {
          vm.set_gamepad_bit(player, rcn_keycode_to_gamepad[e.keyCode], true);
        }
      }
    });
    this.canvas.node.addEventListener('keyup', function(e) {
      if(rcn_keycode_to_gamepad[e.keyCode] != undefined) {
        e.preventDefault();
        const player = vm.get_player_for_gamepad_id('keyboard', rcn.gamepad_layout_xcvb, true);
        if(player >= 0) {
          vm.set_gamepad_bit(player, rcn_keycode_to_gamepad[e.keyCode], false);
        }
      }
    });
    this.canvas.node.addEventListener('blur', function() {
      // Reset keyboard state
      vm.gamepad_state[0] = 0;
    });
    this.dom_element = this.canvas.node;
  }

  if(params.dom_element) {
    this.dom_element = params.dom_element;
  }

  this.reset();
  this.last_tick = 0;

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
  if(this.dom_element && !document.body.contains(this.dom_element)) {
    // The DOM element was removed from the visible DOM, bail
    this.kill();
    return false;
  }

  if(this.worker && !this.paused) {
    this.update();
  } else if(this.canvas) {
    this.canvas.flush();
  }
  if(this.worker && this.canvas) {
    this.draw();
  }
  return true;
}

rcn_vm.prototype.update = function() {
  this.poll_gamepads();

  this.worker.postMessage({type: 'write', offset: rcn.mem_gamepad_offset, bytes: this.gamepad_state});
  this.worker.postMessage({type: 'update'});
  this.worker.postMessage({type: 'read', name: 'audio', offset: rcn.mem_soundreg_offset, size: rcn.mem_soundreg_size});

  this.gamepad_state.copyWithin(4, 0, 4); // Keep copy of previous frame gamepad state
}

rcn_vm.prototype.draw = function() {
  this.worker.postMessage({type: 'draw'});
  this.worker.postMessage({type: 'read', name: 'palette', offset: rcn.mem_palette_offset, size: rcn.mem_palette_size});
  this.worker.postMessage({type: 'read', name: 'screen', offset: rcn.mem_screen_offset, size: rcn.mem_screen_size});
}

rcn_vm.prototype.reset = function() {
  this.kill();
  this.worker = new Worker(rcn_vm_worker_url);
  const vm = this;
  this.worker.onmessage = function(e) { vm.onmessage(e); }
  this.audio = new rcn_audio();
  this.gamepad_state = new Uint8Array(rcn.mem_gamepad_size);
  this.gamepad_mapping = [];

  // Set default gamepad layouts
  this.set_gamepad_layout(0, rcn.gamepad_layout_xcvb); // Keyboard for first player
  for(let i = 1; i < 4; i++) {
    this.set_gamepad_layout(i, rcn.gamepad_layout_abxy); // Abxy for the rest
  }
}

rcn_vm.prototype.poll_gamepads = function() {
  const gamepads = navigator.getGamepads();
  for(let i = 0; i < gamepads.length; i++) {
    const gamepad = gamepads[i];
    if(!gamepad) {
      continue;
    }
    const state = [
      gamepad.axes[0] < -0.33,
      gamepad.axes[0] > +0.33,
      gamepad.axes[1] < -0.33,
      gamepad.axes[1] > +0.33,
      gamepad.buttons[0].pressed,
      gamepad.buttons[1].pressed,
      gamepad.buttons[2].pressed,
      gamepad.buttons[3].pressed,
    ];

    const create_mapping = state.includes(true);
    const player = this.get_player_for_gamepad_id(gamepad.id, rcn.gamepad_layout_abxy, create_mapping);
    if(player >= 0) {
      for(let i in state) {
        this.set_gamepad_bit(player, i, state[i]);
      }
    }
  }
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

rcn_vm.prototype.load_memory = function(bytes, offset = 0) {
  this.worker.postMessage({type: 'write', offset:offset, bytes:bytes});
}

rcn_vm.prototype.load_memory_from_bin = function(offset, size) {
  this.load_memory(rcn_global_bin.rom.slice(offset, offset + size), offset);
}

rcn_vm.prototype.get_player_for_gamepad_id = function(id, layout, create_mapping = false) {
  let player = this.gamepad_mapping.indexOf(id);
  if(player < 0 && create_mapping && this.gamepad_mapping.length < 4) {
    player = this.gamepad_mapping.length;
    this.gamepad_mapping.push(id);
    this.set_gamepad_layout(player, layout);
  }
  return player;
}

rcn_vm.prototype.set_gamepad_bit = function(player, offset, value) {
  if(value) {
    this.gamepad_state[player] |= (1 << offset);
  } else {
    this.gamepad_state[player] &= ~(1 << offset);
  }
}

rcn_vm.prototype.set_gamepad_layout = function(player, layout) {
  this.gamepad_state[player + 8] = layout;
}

rcn_vm.prototype.set_volume = function(volume) {
  this.audio.set_volume(volume);
}

rcn_vm.prototype.onmessage = function(e) {
  switch(e.data.type) {
    case 'palette':
      this.palette = e.data.bytes;
      break;
    case 'screen':
      if(this.canvas) {
        this.canvas.blit(0, 0, 128, 128, e.data.bytes, this.palette);
        this.canvas.flush();
      }
      break;
    case 'audio':
      this.audio.update(e.data.bytes);
      break;
    case 'error':
      this.kill();
      break;
  }
}
