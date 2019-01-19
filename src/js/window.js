// Generic draggable window

function rcn_window(type, title) {
  this.section = document.createElement('section');
  this.section.classList.add('window');
  this.section.classList.add(type);
  document.body.appendChild(this.section);

  // Create header
  this.header = document.createElement('header');
  this.header.onmousedown = rcn_window_onmousedown;
  this.header.innerText = title;
  this.section.appendChild(this.header);

  // Create content
  this.content = document.createElement('content');
  this.section.appendChild(this.content);
}

function rcn_window_onmousedown(e) {
  e = e || window.event;
  e.preventDefault();

  rcn_window_drag = {
    node: e.srcElement.parentElement,
    x: e.clientX,
    y: e.clientY,
  }
}

function rcn_window_onmouseup(e) {
  delete rcn_window_drag;
}

function rcn_window_onmousemove(e) {
  if(typeof rcn_window_drag === 'undefined') {
    return;
  }

  e = e || window.event;
  e.preventDefault();

  var dx = e.clientX - rcn_window_drag.x;
  var dy = e.clientY - rcn_window_drag.y;
  rcn_window_drag.x = e.clientX;
  rcn_window_drag.y = e.clientY;

  var node = rcn_window_drag.node;
  node.style.left = (node.offsetLeft + dx) + "px";
  node.style.top = (node.offsetTop + dy) + "px";
}

rcn_window.prototype.add_child = function(node) {
  this.content.appendChild(node);
}

rcn_window.prototype.kill = function() {
  this.section.parentElement.removeChild(this.section);
}

document.addEventListener('mousemove', rcn_window_onmousemove);
document.addEventListener('mouseup', rcn_window_onmouseup);
