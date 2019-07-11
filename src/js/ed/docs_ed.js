// Raccoon docs viewer
'use strict';

function rcn_docs_ed() {
  rcn_docs_ed.prototype.__proto__ = rcn_window.prototype;
  rcn_window.call(this);
  this.iframe = document.createElement('iframe');
  this.iframe.src = location.protocol=='file:' ? 'docs/README.md' : location.origin + '/docs/';
  this.add_child(this.iframe);

  const docs_ed = this;
  if(location.protocol != 'file:') {
    this.addEventListener('rcndoclookup', function(e) {
      docs_ed.lookup(e.detail.key);
    });
  }
}

rcn_docs_ed.prototype.title = 'Documentation Viewer';
rcn_docs_ed.prototype.type = 'docs_ed';

rcn_docs_ed.prototype.lookup = function(key) {
  this.iframe.src = location.origin + '/docs/#' + key;
}

rcn_editors.push(rcn_docs_ed);
