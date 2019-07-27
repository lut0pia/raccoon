// Raccoon code editor
'use strict';

function rcn_code_ed() {
  rcn_code_ed.prototype.__proto__ = rcn_window.prototype;
  rcn_window.call(this);
  const code_ed = this;

  this.textmirror = document.createElement('div');
  this.textmirror.classList.add('textmirror');
  this.add_child(this.textmirror);

  this.textarea = document.createElement('textarea');
  this.textarea.setAttribute('wrap', 'off');
  this.textarea.setAttribute('spellcheck', 'false');
  this.textarea.onkeydown = function(e) {
    const key_code = e.keyCode || e.which;
    const tab_size = 2;

    const start = this.selectionStart;
    const end = this.selectionEnd;
    const start_line_beg = this.value.lastIndexOf('\n', start-1)+1;
    const start_line_end = (this.value.indexOf('\n', start) + 1 || this.value.length) - 1;
    const end_line_beg = this.value.lastIndexOf('\n', end-1)+1;
    const line_last_space = Math.max(0, this.value.substr(start_line_beg).search(/[^ ]/))+start_line_beg;

    if(key_code == 13) { // Enter key
      if(e.ctrlKey) { // CTRL + Enter
        code_ed.apply();
      } else if(!e.shiftKey) { // Simple Enter
        e.preventDefault();
        rcn_code_ed_textarea_insert_text(this, '\n'+' '.repeat(line_last_space-start_line_beg));
      }
    } else if (key_code == 9) { // Tab key
      e.preventDefault();

      if(start_line_beg == end_line_beg) { // Same line selection
        if(e.shiftKey) {
          this.selectionEnd = line_last_space;
          this.selectionStart = Math.max(line_last_space - tab_size, start_line_beg);
          const diff = this.selectionStart - this.selectionEnd;
          rcn_code_ed_textarea_insert_text(this, '');
          this.selectionStart = Math.max(start_line_beg, start + diff);
          this.selectionEnd = Math.max(start_line_beg, end + diff);
        } else {
          const chars_offset = tab_size - ((start-start_line_beg) % tab_size);
          rcn_code_ed_textarea_insert_text(this, ' '.repeat(chars_offset));
        }
      }
    }

    code_ed.update_mirror();
  };
  this.textarea.onscroll = function(e) {
    code_ed.textmirror.scrollTop = code_ed.textarea.scrollTop;
    code_ed.textmirror.scrollLeft = code_ed.textarea.scrollLeft;
  }
  this.textarea.oninput = function() {
    rcn_global_bin.code = this.value;
    rcn_dispatch_ed_event('rcn_bin_change', {code: true});
    code_ed.update_token_count_text();
  };
  this.add_child(this.textarea);

  this.add_child(this.apply_button = rcn_ui_button({
    value:'Apply',
    onclick: function() {
      code_ed.apply();
    },
  }));

  // Create token count text
  this.token_count_text = document.createElement('div');
  this.token_count_text.classList.add('token_count');
  this.add_child(this.token_count_text);

  this.addEventListener('rcn_bin_change', function(e) {
    if(e.detail.code) {
      code_ed.update_textarea();
      code_ed.update_token_count_text();
    }
  });

  this.addEventListener('rcn_error', function(e) {
    code_ed.set_error(e.detail);
  });
  this.addEventListener('rcn_reboot', function() {
    code_ed.set_error(null);
  });

  this.update_textarea();
  this.update_token_count_text();
}

rcn_code_ed.prototype.title = 'Code Editor';
rcn_code_ed.prototype.docs_link = 'code-editor';
rcn_code_ed.prototype.type = 'code_ed';

rcn_code_ed.prototype.apply = function() {
  this.set_error(null); // Reset error because it may have been fixed

  rcn_dispatch_ed_event('rcn_bin_apply', {code: true});
}

rcn_code_ed.prototype.update_textarea = function() {
  this.textarea.value = rcn_global_bin.code;
  this.update_mirror();
}

rcn_code_ed.prototype.update_token_count_text = function() {
  this.token_count_text.innerText = rcn_global_bin.token_count() + ' / ' + rcn_bin_token_limit;
}

rcn_code_ed.prototype.update_mirror = function() {
  const keywords = [
    'class', 'const', 'constructor', 'else', 'extends', 'false', 'for', 'function', 'if',
    'in', 'let', 'new', 'null', 'return', 'super', 'this', 'true', 'var', 'while',
  ];
  const keyword_regexp = new RegExp('\\b('+keywords.join('|')+')\\b', 'g');

  const lines = this.textarea.value.split('\n');

  // Remove excess lines
  while(this.textmirror.childElementCount >= lines.length) {
    this.textmirror.removeChild(this.textmirror.lastChild);
  }

  for(let i = 0; i < lines.length; i++) {
    // Add missing line
    if(this.textmirror.childElementCount <= i) {
      this.textmirror.appendChild(document.createElement('line'));
    }

    const line_node = this.textmirror.childNodes[i];
    const line_content_changed = lines[i] != line_node.rcn_line;
    const is_error_line = !!(this.error && this.error.line == i + 1);
    const line_error_changed = is_error_line != line_node.classList.contains('error');
    const regen = line_content_changed || line_error_changed;

    if(regen) {
      let line_html = html_encode(lines[i])
        .replace(/ /gi, '&nbsp;')
        .replace(keyword_regexp, '<span class="keyword">$1</span>')
        .replace(/\b(0x[\da-f]+)\b/gi, '<span class="number hex">$1</span>')
        .replace(/\b(\d[\d.]*)\b/gi, '<span class="number dec">$1</span>')
        .replace(/\/\/.*$/, function(text) {
          text = text.replace(/\<.*?\>/gi, ''); // Remove html
          return '<span class="comment">' + text + '</span>';
        });

      if(is_error_line) {
        line_node.classList.add('error');
        line_node.title = this.error.message;
      } else {
        line_node.classList.remove('error');
      }

      line_node.rcn_line = lines[i];
      line_node.innerHTML = line_html;
    }
  }
}

rcn_code_ed.prototype.set_error = function(e) {
  this.error = e;
  this.update_mirror();

  if(this.error) {
    // Scroll the textarea to the error
    let target = (this.error.line - 1) * 15;
    target -= this.textarea.clientHeight >> 1;

    this.textarea.scrollBy({
      top: target - this.textarea.scrollTop,
      behavior: 'smooth',
    })
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

rcn_editors.push(rcn_code_ed);
