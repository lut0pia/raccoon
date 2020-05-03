// Raccoon console
'use strict';

function rcn_console_ed() {
  rcn_console_ed.prototype.__proto__ = rcn_window.prototype;
  rcn_window.call(this);

  const console_ed = this;

  this.add_child(this.log_container = document.createElement('div'));

  this.add_child(this.input = document.createElement('input'));
  this.input.type = 'text';
  this.input.addEventListener('keydown', function(e) {
    if(e.keyCode === 13) { // Enter key
      console_ed.execute();
    }
  });

  this.addEventListener('rcn_reboot', function() {
    console_ed.log('Rebooting...');
  });
}

rcn_console_ed.prototype.title = 'Console';
rcn_console_ed.prototype.type = 'console_ed';
rcn_console_ed.prototype.docs_link = 'console';

rcn_console_ed.prototype.log = function(text) {
  const at_end = this.log_container.scrollTop >= this.log_container.scrollHeight - this.log_container.clientHeight;
  const log_el = document.createElement('article');
  log_el.innerText = text;
  this.log_container.appendChild(log_el);
  if(at_end) {
    this.log_container.scrollTop = this.log_container.scrollHeight;
  }
  return log_el;
}

rcn_console_ed.prototype.log_error = function(error) {
  const text = `Error: ${error.message}
    ${error.stack.map(l => `${l.func}:${l.line}`).join('\n')}`;
  const log_el = this.log(text);
  log_el.classList.add('error');
}

rcn_console_ed.prototype.execute = function() {
  const vm_ed = rcn_find_editor(rcn_vm_ed);
  if(vm_ed && vm_ed.vm.worker) {
    this.log(`Execute: ${this.input.value}`);
    vm_ed.vm.load_code(this.input.value);
    this.input.value = '';
  }
}

rcn_editors.push(rcn_console_ed);
