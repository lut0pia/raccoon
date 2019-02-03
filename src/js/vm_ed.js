// Raccoon vm editor

rcn_vm_ed.prototype = Object.create(rcn_window.prototype);
function rcn_vm_ed() {
  rcn_window.call(this, 'vm_ed', 'Virtual Machine');

  this.vm = rcn_global_vm = new rcn_vm();
  this.add_child(this.vm.canvas.node);

  // Create reboot button
  this.reboot_button = document.createElement('input');
  this.reboot_button.type = 'button';
  this.reboot_button.value = 'Reboot';
  this.reboot_button.vm_ed = this;
  this.reboot_button.onclick = function() {
    this.vm_ed.reboot();
  }
  this.add_child(this.reboot_button);

  // Create error log
  this.error_log = document.createElement('div');
  this.error_log.classList.add('error_log');
  this.vm.vm_ed = this;
  this.vm.onexception = function(e) {
    var error_message = document.createElement('p');
    error_message.innerText = 'Error: ' + e.message + ' (line: ' + e.line + ', column: ' + e.column + ')';
    this.vm_ed.error_log.appendChild(error_message);
  }
  this.add_child(this.error_log);

  var vm_ed = this;
  this.addEventListener('rcnbinchange', function(e) {
    if(e.detail.load) {
      vm_ed.reboot();
    }
  });
}

rcn_vm_ed.prototype.reboot = function() {
  while (this.error_log.firstChild) {
    this.error_log.removeChild(this.error_log.firstChild);
  }
  this.vm.load_bin(rcn_global_bin);
}
