// Raccoon docs viewer

function rcn_docs_ed() {
  this.__proto__.__proto__ = rcn_window.prototype;
  rcn_window.call(this, 'docs_ed', 'Documentation Viewer');
  this.iframe = document.createElement('iframe');
  this.iframe.src = location.protocol=='file:' ? 'docs/README.md' : location.href + '/docs/';
  this.add_child(this.iframe);
}
