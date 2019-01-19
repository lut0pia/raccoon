// Generic draggable window

function rcn_window(type) {
  this.node = document.createElement('section');
  this.node.classList.add('window');
  this.node.classList.add(type);
  document.body.appendChild(this.node);
}

rcn_window.prototype.add_child = function(node) {
  this.node.appendChild(node);
}

rcn_window.prototype.kill = function() {
  this.node.parentElement.removeChild(this.node);
}
