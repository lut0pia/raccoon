// Raccoon virtual machine
// This is the client that spawns the web worker

function rcn_vm() {
  this.worker = new Worker(rcn_vm_worker_url);
  var vm = this;
  this.worker.onmessage = function(e) { vm.onmessage(e); }
  // This is probably bad because it means vm never dies
  setInterval(function() { vm.update(); }, 1000/30);
}

rcn_vm.prototype.load_paw = function(paw) {
  this.ram = paw.rom.slice();
  this.worker = new Worker(rcn_vm_worker_url);
  this.load_code(paw.code);
}

rcn_vm.prototype.load_code = function(code) {
  this.worker.postMessage({type:'code',code:code});
}

rcn_vm.prototype.update = function() {
  this.worker.postMessage({type:'update'});
}

rcn_vm.prototype.onmessage = function(e) {
  console.log(e);
  switch(e.data.type) {
    case 'blit': this.canvas.blit(e.data.x, e.data.y, e.data.w, e.data.h, e.data.pixels, e.data.palette); break;
  }
}
