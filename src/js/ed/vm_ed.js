// Raccoon vm editor
'use strict';

function rcn_vm_ed() {
  rcn_vm_ed.prototype.__proto__ = rcn_window.prototype;
  rcn_window.call(this);

  const vm_ed = this;

  this.vm = new rcn_vm();
  this.vm.canvas.node.addEventListener('keydown', function(e) {
    const key_code = e.keyCode || e.which;

    if(key_code == 32) { // Space key
      vm_ed.set_paused(!vm_ed.vm.paused)
    }
  });
  this.add_child(this.vm.canvas.node);

  // Create reboot button
  this.add_child(this.reboot_button = rcn_ui_button({
    value: 'Reboot',
    onclick: function() {
      vm_ed.reboot();
    },
  }));

  // Create step button
  this.add_child(this.step_button = rcn_ui_button({
    value: 'Step',
    onclick: function() {
      vm_ed.vm.update();
    },
  }));

  // Create paused checkbox
  this.add_child(this.paused_checkbox = rcn_ui_checkbox({
    label: 'Paused',
    onchange: function(e) {
      vm_ed.set_paused(this.checked);
    },
  }));

  // Create autoapply checkbox
  this.add_child(this.autoapply_checkbox = rcn_ui_checkbox({
    label: 'Autoapply',
    checked: true,
  }));

  // Create mute checkbox
  this.add_child(this.muted_checkbox = rcn_ui_checkbox({
    label: 'Muted',
    onchange: function(e) {
      vm_ed.update_volume();
    },
  }));

  this.addEventListener('rcn_bin_change', function(e) {
    if(e.detail.load) {
      // We just loaded a new bin, therefore we reboot
      vm_ed.reboot();
    } else if(vm_ed.autoapply_checkbox.checkbox.checked && e.detail.begin < e.detail.end) {
      if(vm_ed.vm.worker) { // Unless VM crashed earlier
        // If autoapply is on, we directly load changed rom into ram
        vm_ed.vm.load_memory_from_bin(e.detail.begin, e.detail.end - e.detail.begin);
      }
    }
  });

  this.addEventListener('rcn_bin_apply', function(e) {
    if(!vm_ed.vm.worker) { // VM crashed earlier
      vm_ed.reboot();
    } else {
      if(e.detail.code) {
        vm_ed.vm.load_code_from_bin();
      } else {
        vm_ed.vm.load_memory_from_bin(e.detail.offset, e.detail.size);
      }
    }
  });

  this.vm.load_bin(rcn_global_bin);
  this.set_paused(false);
}

rcn_vm_ed.prototype.title = 'Virtual Machine';
rcn_vm_ed.prototype.docs_link = 'virtual-machine';
rcn_vm_ed.prototype.type = 'vm_ed';

rcn_vm_ed.prototype.set_paused = function(paused) {
  this.vm.paused = paused;
  this.paused_checkbox.checkbox.checked = paused;
  if(paused) {
    this.step_button.removeAttribute('disabled');
  } else {
    this.step_button.setAttribute('disabled', '');
  }
}

rcn_vm_ed.prototype.update_volume = function() {
  this.vm.set_volume(this.muted_checkbox.checkbox.checked ? 0 : 1);
}

rcn_vm_ed.prototype.reboot = function() {
  this.vm.load_bin(rcn_global_bin);
  this.update_volume();
  rcn_dispatch_ed_event('rcn_reboot');
}

rcn_editors.push(rcn_vm_ed);
