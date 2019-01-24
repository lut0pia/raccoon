// Raccoon vm editor

function rcn_vm_ed() {
  this.window = new rcn_window('vm_ed', 'Virtual Machine');

  this.vm = rcn_global_vm = new rcn_vm();
  this.vm.canvas = new rcn_canvas();
  this.window.add_child(this.vm.canvas.node);

  // Create reboot button
  this.reboot_button = document.createElement('input');
  this.reboot_button.type = 'button';
  this.reboot_button.value = 'Reboot';
  this.reboot_button.vm_ed = this;
  this.reboot_button.onclick = function() {
    this.vm_ed.reboot();
  }
  this.window.add_child(this.reboot_button);
}

rcn_vm_ed.prototype.reboot = function() {
  this.vm.load_bin(rcn_global_bin);  
}
