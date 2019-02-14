// Raccoon docs viewer

function rcn_docs_ed() {
  this.__proto__.__proto__ = rcn_window.prototype;
  rcn_window.call(this, 'docs_ed', 'Documentation Viewer');
  this.iframe = document.createElement('iframe');
  this.iframe.src = location.protocol=='file:' ? 'docs/README.md' : location.origin + '/docs/';
  this.add_child(this.iframe);

  var docs_ed = this;
  if(location.protocol != 'file:') {
    this.addEventListener('rcndoclookup', function(e) {
      docs_ed.lookup(e.detail.key);
    });
  }
}

rcn_docs_ed.prototype.lookup = function(key) {
  this.iframe.src = location.origin + '/docs/#' + rcn_doc_lookup[key];
}
