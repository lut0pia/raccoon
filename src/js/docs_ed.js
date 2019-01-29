// Raccoon docs viewer

function rcn_docs_ed() {
  this.window = new rcn_window('docs_ed', 'Documentation Viewer');
  this.iframe = document.createElement('iframe');
  this.iframe.src = 'docs';
  this.window.add_child(this.iframe);
}
