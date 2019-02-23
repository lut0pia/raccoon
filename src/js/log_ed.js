// Raccoon log viewer

function rcn_log_ed() {
  this.__proto__.__proto__ = rcn_window.prototype;
  rcn_window.call(this);

  var log_ed = this;

  this.div = document.createElement('div');
  this.add_child(this.div);

  this.addEventListener('rcnerror', function(e) {
    log_ed.log('error', e.detail.message + ' (line: ' + e.detail.line + ', column: ' + e.detail.column + ')');
  });

  this.addEventListener('rcnreboot', function(e) {
    log_ed.clear();
  });
}

rcn_log_ed.prototype.log = function(type, text) {
  var message_wrapper = document.createElement('article');
  message_wrapper.classList.add(type);

  var message_time = document.createElement('time');
  var date = new Date(Date.now());
  message_time.innerText =
    (''+date.getHours()).padStart(2,'0') + ':' +
    (''+date.getMinutes()).padStart(2,'0') + ':' +
    (''+date.getSeconds()).padStart(2,'0') + ':' +
    (''+date.getMilliseconds()).padStart(3,'0');

  var message_text = document.createElement('text');
  message_text.innerText = text;

  message_wrapper.appendChild(message_time);
  message_wrapper.appendChild(message_text);

  // Put in on top
  this.div.insertBefore(message_wrapper, this.div.firstChild);

  // Trim overflow
  while(this.div.childElementCount > 1024) {
    this.div.removeChild(this.div.lastElementChild);
  }
}

rcn_log_ed.prototype.title = 'Log';
rcn_log_ed.prototype.type = 'log_ed';

rcn_log_ed.prototype.clear = function() {
  while (this.div.firstChild) {
    this.div.removeChild(this.div.firstChild);
  }
}

rcn_editors.push(rcn_log_ed);
