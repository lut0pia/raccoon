// Raccoon docs viewer

rcn_docs_ed.prototype = Object.create(rcn_window.prototype);
function rcn_docs_ed() {
  rcn_window.call(this, 'docs_ed', 'Documentation Viewer');
  this.iframe = document.createElement('iframe');
  this.iframe.src = location.protocol=='file:' ? 'docs/README.md' : location.href + '/docs/';
  this.add_child(this.iframe);
}
