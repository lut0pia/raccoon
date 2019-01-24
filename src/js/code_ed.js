// Raccoon code editor

function rcn_code_ed() {
  this.window = new rcn_window('code_ed', 'Code Editor');
  this.textarea = document.createElement('textarea');
  this.textarea.onkeydown = rcn_code_ed_textarea_onkeydown;
  this.textarea.onchange = function() {
    rcn_global_bin.code = this.value;
  };
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

function rcn_code_ed_textarea_onkeydown(e) {
  const key_code = e.keyCode || e.which;
  const tab_size = 2;

  if (key_code == 9) { // Tab key
    e.preventDefault();

    const start = this.selectionStart;
    const end = this.selectionEnd;
    const start_line_beg = this.value.lastIndexOf('\n', start-1)+1;
    const end_line_beg = this.value.lastIndexOf('\n', end-1)+1;

    const chars_offset = tab_size - ((start-start_line_beg) % tab_size);

    if(start_line_beg == end_line_beg) { // Same line selection
      rcn_code_ed_textarea_insert_text(this, ' '.repeat(chars_offset));
    }
  }
}

function rcn_code_ed_textarea_insert_text(textarea, text) {
  if(!document.execCommand('insertText', false, text)) {
    // It didn't work with insertText, fallback to shitty slicing
    const previous_selection_start = textarea.selectionStart;
    const previous_selection_end = textarea.selectionEnd;
    const before = textarea.value.slice(0, textarea.selectionStart);
    const after = textarea.value.slice(textarea.selectionEnd);
    textarea.value = before + text + after;
    textarea.selectionStart = previous_selection_start + text.length;
    textarea.selectionEnd = textarea.selectionStart;
  }
}
