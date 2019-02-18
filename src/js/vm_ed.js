// Raccoon vm editor

function rcn_vm_ed() {
  this.__proto__.__proto__ = rcn_window.prototype;
  rcn_window.call(this, 'vm_ed', 'Virtual Machine');
  this.documentation('virtual-machine');

  var vm_ed = this;

  this.vm = new rcn_vm();
  this.vm.canvas.node.addEventListener('keydown', function(e) {
    const key_code = e.keyCode || e.which;

    if(key_code == 32) { // Space key
      vm_ed.vm.paused = !vm_ed.vm.paused;
      vm_ed.paused_checkbox.checked = vm_ed.vm.paused;
    }
  });
  this.add_child(this.vm.canvas.node);

  // Create reboot button
  this.reboot_button = document.createElement('input');
  this.reboot_button.type = 'button';
  this.reboot_button.value = 'Reboot';
  this.reboot_button.onclick = function() {
    vm_ed.reboot();
  }
  this.add_child(this.reboot_button);

  // Create paused checkbox
  var paused_checkbox_id = 'paused_checkbox'; // TODO: this will have to depend on window id
  this.paused_checkbox = document.createElement('input');
  this.paused_checkbox.id = paused_checkbox_id;
  this.paused_checkbox.type = 'checkbox';
  this.paused_checkbox.onchange = function(e) {
    vm_ed.vm.paused = this.checked;
  }
  this.add_child(this.paused_checkbox);
  this.paused_checkbox_label = document.createElement('label');
  this.paused_checkbox_label.htmlFor = paused_checkbox_id;
  this.paused_checkbox_label.innerText = 'Paused';
  this.add_child(this.paused_checkbox_label);

  // Create autoapply checkbox
  var autoapply_checkbox_id = 'autoapply_checkbox'; // TODO: this will have to depend on window id
  this.autoapply_checkbox = document.createElement('input');
  this.autoapply_checkbox.id = autoapply_checkbox_id;
  this.autoapply_checkbox.type = 'checkbox';
  this.autoapply_checkbox.checked = true;
  this.add_child(this.autoapply_checkbox);
  this.autoapply_checkbox_label = document.createElement('label');
  this.autoapply_checkbox_label.htmlFor = autoapply_checkbox_id;
  this.autoapply_checkbox_label.innerText = 'Autoapply';
  this.add_child(this.autoapply_checkbox_label);

  this.addEventListener('rcnbinchange', function(e) {
    if(e.detail.load) {
      // We just loaded a new bin, therefore we reboot
      vm_ed.reboot();
    } else if(vm_ed.autoapply_checkbox.checked) {
      // If autoapply is on, we directly load changed rom into ram
      vm_ed.vm.load_memory_from_bin(e.detail.begin, e.detail.end - e.detail.begin);
    }
  });

  this.addEventListener('rcnbinapply', function(e) {
    if(e.detail.code) {
      vm_ed.vm.load_code_from_bin();
    } else {
      vm_ed.vm.load_memory_from_bin(e.detail.offset, e.detail.size);
    }
  });
}

rcn_vm_ed.prototype.reboot = function() {
  this.vm.load_bin(rcn_global_bin);
  rcn_dispatch_ed_event('rcnreboot');
}
