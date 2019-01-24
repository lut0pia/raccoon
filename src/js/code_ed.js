// Raccoon code editor

function rcn_code_ed() {
  this.window = new rcn_window('code_ed', 'Code Editor');
  this.textarea = document.createElement('textarea');
  this.textarea.onchange = rcn_code_ed_textarea_onchange;
  this.window.add_child(this.textarea);

  this.apply_button = document.createElement('input');
  this.apply_button.type = 'button';
  this.apply_button.value = 'Apply';
  this.window.add_child(this.apply_button);

  var code_ed = this;
  this.apply_button.onclick = function() {
    rcn_global_vm.load_code(code_ed.textarea.value);
  }
  rcn_global_bin_ed.onbinchange.push(function(bin) {
    code_ed.textarea.value = bin.code;
  });
}

function rcn_code_ed_textarea_onchange(e) {
  rcn_global_bin.code = this.value;
}
