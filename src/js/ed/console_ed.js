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
    if(e.key == 'Enter') { // Enter key
      console_ed.execute();
    }
  });

  this.addEventListener('rcn_reboot', function() {
    console_ed.log_text('Rebooting...');
  });
}

rcn_console_ed.prototype.title = 'Console';
rcn_console_ed.prototype.type = 'console_ed';
rcn_console_ed.prototype.group = 'code';
rcn_console_ed.prototype.docs_link = 'console';

rcn_console_ed.prototype.log_element = function(element) {
  const at_end = this.log_container.scrollTop >= this.log_container.scrollHeight - this.log_container.clientHeight;
  this.log_container.appendChild(element);
  if(at_end) {
    this.log_container.scrollTop = this.log_container.scrollHeight;
  }
}

rcn_console_ed.prototype.log_text = function(text) {
  const log_el = document.createElement('article');
  log_el.innerText = text;
  this.log_element(log_el);
  return log_el;
}

rcn_console_ed.prototype.log_error = function(error) {
  const log_el = document.createElement('article');
  log_el.innerHTML = `Error: ${error.message}`;
  log_el.classList.add('error');
  log_el.append(...error.stack.map(l => {
    const line_el = document.createElement('line');
    line_el.innerHTML = `> ${l.func}:${l.line}`;
    line_el.addEventListener('click', () => {
      const code_ed = rcn_find_editor(rcn_code_ed);
      if(code_ed) {
        code_ed.scroll_to_line(l.line);
      }
    });
    return line_el;
  }));
  this.log_element(log_el);
}

rcn_console_ed.prototype.execute = function() {
  const vm_ed = rcn_find_editor(rcn_vm_ed);
  if(vm_ed && vm_ed.vm.worker) {
    this.log_text(`Execute: ${this.input.value}`);
    vm_ed.vm.load_code(this.input.value);
    this.input.value = '';
  }
}

rcn_editors.push(rcn_console_ed);
