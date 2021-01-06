// Raccoon code editor
'use strict';

const rcn_code_ed_keywords = [
  'break', 'case', 'class', 'const', 'constructor', 'continue', 'delete', 'else', 'extends', 'false', 'for',
  'function', 'if', 'in', 'let', 'new', 'null', 'of', 'return', 'super', 'switch', 'this', 'true', 'var', 'while',
];

const rcn_code_ed_doc_functions = {
  'rendering': [
    'cls', 'cam', 'palset', 'pset', 'pget', 'palm', 'palt', 'fget', 'fset', 'mget', 'mset',
    'spr', 'map', 'print', 'line', 'rect', 'rectfill', 'circ', 'circfill'],
  'sound': ['sfx', 'mus'],
  'math': ['flr', 'ceil', 'abs', 'sign', 'max', 'min', 'mid', 'sqrt', 'rnd', 'sin', 'cos', 'atan2'],
  'input': ['btn', 'btnp', 'btns'],
  'memory': ['memcpy', 'memset', 'read', 'write'],
  'debug': ['debug'],
};


function rcn_code_ed() {
  rcn_code_ed.prototype.__proto__ = rcn_window.prototype;
  rcn_window.call(this);
  const code_ed = this;

  this.linenumbers = document.createElement('div');
  this.linenumbers.classList.add('linenumbers');
  this.add_child(this.linenumbers);

  this.textmirror = document.createElement('div');
  this.textmirror.classList.add('textmirror');
  this.add_child(this.textmirror);

  this.textoverlay = document.createElement('div');
  this.textoverlay.classList.add('textmirror');
  this.textoverlay.classList.add('textoverlay');
  this.textoverlay.addEventListener('mousedown', function() {
    // Give focus back to text area
    setTimeout(function() {
      code_ed.textarea.focus();
    }, 0);
  });
  this.add_child(this.textoverlay);

  this.textarea = document.createElement('textarea');
  this.textarea.setAttribute('wrap', 'off');
  this.textarea.setAttribute('spellcheck', 'false');
  this.textarea.addEventListener('keydown', function(e) {
    const tab_size = 2;

    const start = this.selectionStart;
    const end = this.selectionEnd;
    const start_line_beg = this.value.lastIndexOf('\n', start-1)+1;
    const start_line_end = (this.value.indexOf('\n', start) + 1 || this.value.length) - 1;
    const start_line_last_space = Math.max(0, this.value.substr(start_line_beg).search(/[^ ]/))+start_line_beg;

    if(e.key == 'Enter') {
      if(e.ctrlKey) { // CTRL + Enter
        code_ed.apply();
      } else if(!e.shiftKey) { // Simple Enter
        e.preventDefault();
        let next_line_indent = start_line_last_space-start_line_beg;
        if(this.value[start_line_end - 1] == '{') {
          next_line_indent += tab_size;
        }
        rcn_code_ed_textarea_insert_text(this, '\n'+' '.repeat(next_line_indent));
      }
    } else if (e.key == 'Tab') {
      e.preventDefault();

      const line_begs = [start_line_beg];
      while(true) {
        const line_end = this.value.indexOf('\n', line_begs[0]);
        if(line_end < 0 ||
          line_end == this.value.length - 1 ||
          line_end >= end) {
          break;
        } else {
          line_begs.unshift(line_end + 1);
        }
      }
      let start_offset = 0;
      let end_offset = 0;
      while(line_begs.length > 0) {
        const line_beg = line_begs.shift();
        const line_last_space = Math.max(0, this.value.substr(line_beg).search(/[^ ]/)) + line_beg;
        const current_indent = line_last_space - line_beg;
        const chars_offset = tab_size - current_indent % tab_size;
        const new_indent = Math.max(0, e.shiftKey
          ? current_indent - chars_offset
          : current_indent + chars_offset);

        this.selectionStart = line_beg;
        this.selectionEnd = line_last_space;
        rcn_code_ed_textarea_insert_text(this, ' '.repeat(new_indent));

        const delta = new_indent - current_indent
        if(start >= line_beg) {
          start_offset += delta;
        }
        if(end >= line_beg) {
          end_offset += delta;
        }
      }

      this.selectionStart = start + start_offset;
      this.selectionEnd = end + end_offset;
    }

    rcn_global_bin.code = this.value;
    rcn_dispatch_ed_event('rcn_bin_change', {code: true});
  });
  this.textarea.onscroll = function(e) {
    code_ed.textmirror.scrollTop = code_ed.textoverlay.scrollTop = code_ed.linenumbers.scrollTop = code_ed.textarea.scrollTop;
    code_ed.textmirror.scrollLeft = code_ed.textoverlay.scrollLeft = code_ed.textarea.scrollLeft;
  }
  this.textarea.oninput = function() {
    rcn_global_bin.code = this.value;
    rcn_dispatch_ed_event('rcn_bin_change', {code: true});
    code_ed.update_token_count_text();
  };
  const textoverlay_onevent = function(e) {
    const active = !!e.ctrlKey;
    if(active) {
      code_ed.update_keyword_link();
    }
    code_ed.textoverlay.classList.toggle('active', active);
    this.onscroll();
  }
  this.textarea.addEventListener('keydown', textoverlay_onevent);
  this.textarea.addEventListener('keyup', textoverlay_onevent);
  this.textarea.addEventListener('blur', textoverlay_onevent)
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

  this.addEventListener('rcn_reboot', function() {
    code_ed.set_error(null);
  });

  this.update_textarea();
  this.update_token_count_text();
}

rcn_code_ed.prototype.title = 'Code Editor';
rcn_code_ed.prototype.docs_link = 'code-editor';
rcn_code_ed.prototype.type = 'code_ed';
rcn_code_ed.prototype.group = 'code';

rcn_code_ed.prototype.apply = function() {
  this.set_error(null); // Reset error because it may have been fixed

  const vm_ed = rcn_find_editor(rcn_vm_ed);
  if(vm_ed) {
    if(!vm_ed.vm.worker) {
      vm_ed.vm.load_bin(rcn_global_bin);
    } else {
      vm_ed.vm.load_code(rcn_global_bin.code);
    }
  }
}

rcn_code_ed.prototype.update_textarea = function() {
  this.textarea.value = rcn_global_bin.code;
  this.update_mirror();
  this.update_overlay();
}

rcn_code_ed.prototype.update_token_count_text = function() {
  this.token_count_text.innerText = rcn_global_bin.token_count() + ' / ' + rcn_bin_token_limit;
}

rcn_code_ed.prototype.update_mirror = function() {
  const keyword_regexp = new RegExp('\\b('+rcn_code_ed_keywords.join('|')+')\\b', 'g');
  const classify = function(class_name) {
    return function(text) {
      text = text.replace(/\<.*?\>/gi, ''); // Remove html
      return '<span class="' + class_name + '">' + text + '</span>';
    };
  }

  const lines = this.textarea.value.split('\n');

  // Remove excess lines
  while(this.textmirror.childElementCount >= lines.length) {
    this.textmirror.removeChild(this.textmirror.lastChild);
  }
  while(this.linenumbers.childElementCount >= lines.length) {
    this.linenumbers.removeChild(this.linenumbers.lastChild);
  }

  for(let i = 0; i < lines.length; i++) {
    // Add missing line
    if(this.textmirror.childElementCount <= i) {
      this.textmirror.appendChild(document.createElement('line'));
    }
    if(this.linenumbers.childElementCount <= i) {
      const line_number = document.createElement('line');
      line_number.innerHTML = (new String(i + 1)).padStart(4, 0);
      this.linenumbers.appendChild(line_number);
    }

    const line_node = this.textmirror.childNodes[i];
    const line_content_changed = lines[i] != line_node.rcn_line;
    const is_error_line = !!(this.error && this.error.line == i + 1);
    const line_error_changed = is_error_line != line_node.classList.contains('error');
    const regen = line_content_changed || line_error_changed;

    if(regen) {
      let line_html = html_encode(lines[i])
        .replace(/ /gi, '&nbsp;')
        .replace(keyword_regexp, classify('keyword'))
        .replace(/\b0x[\da-f]+\b/gi, classify('number hex'))
        .replace(/\b\d[\d.]*\b/gi, classify('number dec'))
        .replace(/&quot;(\\&quot;|.)*?&quot;/gi, classify('string'))
        .replace(/\/\/.*$/, classify('comment'));

      if(is_error_line) {
        line_node.classList.add('error');
        line_html += `<span class="error_message">${this.error.message}</span>`;
      } else {
        line_node.classList.remove('error');
      }

      line_node.rcn_line = lines[i];
      line_node.innerHTML = line_html;
    }
  }
}

rcn_code_ed.prototype.update_overlay = function() {
  const lines = this.textarea.value.split('\n');

  // Remove excess lines
  while(this.textoverlay.childElementCount >= lines.length) {
    this.textoverlay.removeChild(this.textoverlay.lastChild);
  }

  for(let i = 0; i < lines.length; i++) {
    // Add missing line
    if(this.textoverlay.childElementCount <= i) {
      this.textoverlay.appendChild(document.createElement('line'));
    }

    const line_node = this.textoverlay.childNodes[i];
    const line_content_changed = lines[i] != line_node.rcn_line;

    if(line_content_changed) {
      const line_html = html_encode(lines[i])
        .replace(/ /gi, '&nbsp;')
        .replace(/\/\/.*$/, '')
        .replace(/(&?)\b([a-z]\w*)\b(;?)/gi, function(full, amp, keyword, semi) {
          if(!amp || !semi) {
            return `${amp}<span class="keyword_link" data-line="${i}">${keyword}</span>${semi}`;
          } else {
            return full;
          }
        });

      line_node.rcn_line = lines[i];
      line_node.innerHTML = line_html;
    }
  }
}

rcn_code_ed.prototype.update_keyword_link = function() {
  const keyword_link = {};

  // Link keywords to native raccoon functions
  for(let doc_section in rcn_code_ed_doc_functions) {
    for(let func of rcn_code_ed_doc_functions[doc_section]) {
      keyword_link[func] = doc_section;
    }
  }

  // Link keywords to globals declared in code
  const globals = rcn_code_ed_parse_globals();
  for(let name in globals) {
    keyword_link[name] = globals[name].line;
  }

  const code_ed = this;
  for(let keyword_span of document.getElementsByClassName('keyword_link')) {
    const keyword = keyword_span.textContent;
    const link = keyword_link[keyword];

    if(typeof link === 'number' && parseInt(keyword_span.getAttribute('data-line')) + 1 != link) {
      keyword_span.onmousedown = function() {
        code_ed.scroll_to_line(link);
      }
      keyword_span.style.visibility = 'visible';
    } else if(typeof link === 'string') {
      keyword_span.onmousedown = function() {
        // It's quick, it's easy and it's free: pouring river water in your socks
        // We need to delay docs viewer creation or it will be backgrounded
        // by the code editor's return to focus
        setTimeout(function() {
          rcn_find_editor(rcn_docs_ed, true).lookup(link + '-functions');
        }, 0);
      }
      keyword_span.style.visibility = 'visible';
    } else {
      keyword_span.onmousedown = null;
      keyword_span.style.visibility = 'hidden';
    }
  }
}

rcn_code_ed.prototype.set_error = function(e) {
  this.error = e;
  this.update_mirror();

  if(this.error) {
    this.scroll_to_line(this.error.line);
  }
}

rcn_code_ed.prototype.scroll_to_line = function(line) {
  // Remove highlight from every line
  for(let line_node of [...this.textmirror.childNodes]) {
    line_node.classList.remove('highlight');
  }

  // Highlight line if not an error line (already highlighted)
  const is_error_line = !!(this.error && this.error.line == line);
  if(!is_error_line) {
    // Slight delay needed for animation to trigger on same line (class off and on again)
    setTimeout(() => this.textmirror.childNodes[line - 1].classList.add('highlight'), 0);
  }

  // Move textarea cursor to line to avoid focus scrolling back
  const lines = this.textarea.value.split('\n');
  let line_start = 0;
  for(let i = 0; i < line - 1; i++) {
    line_start += lines[i].length + 1;
  }
  this.textarea.selectionStart = this.textarea.selectionEnd = line_start;

  // Compute y coordinate of line
  let target = (line - 1) * 20;
  target -= this.textarea.clientHeight >> 1;
  this.textarea.scrollTo({top: target});
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

function rcn_code_ed_parse_globals() {
  const lines = rcn_global_bin.code.split('\n');
  let globals = {};
  let scope = 0;
  for(let i = 0; i < lines.length; i++) {
    if(scope == 0) {
      const function_match = lines[i].match(/^[^{]*(const|function|let|var)\s+(\w+).*$/);
      if(function_match) {
        globals[function_match[2]] = {
          type: function_match[1],
          line: i + 1,
        };
      }
    }
    scope += (lines[i].match(/{/g) || []).length;
    scope -= (lines[i].match(/}/g) || []).length;
  }
  return globals;
}

rcn_editors.push(rcn_code_ed);
