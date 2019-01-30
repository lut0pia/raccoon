// Generic draggable window

function rcn_window(type, title) {
  this.type = type;
  this.title = title;

  this.section = document.createElement('section');
  this.section.classList.add('window');
  this.section.classList.add(type);
  this.section.onmousedown = rcn_window_onmousedown;
  document.body.appendChild(this.section);

  // Create header
  this.header = document.createElement('header');
  this.header.onmousedown = rcn_window_header_onmousedown;
  this.header.innerText = title;
  this.section.appendChild(this.header);

  // Create content
  this.content = document.createElement('content');
  this.section.appendChild(this.content);

  this.load_from_storage();
  rcn_windows.push(this);
}

rcn_window.prototype.save_to_storage = function() {
  try {
    localStorage['rcn_window_'+this.type] = JSON.stringify({
      left: this.section.style.left,
      top: this.section.style.top,
      z_index: this.section.style.zIndex,
      width: this.content.style.width,
      height: this.content.style.height,
    });
  } catch(e) {
    rcn_log('Could not save window to storage')
  }
}

rcn_window.prototype.load_from_storage = function() {
  try {
    var save = JSON.parse(localStorage['rcn_window_'+this.type]);
    this.section.style.left = save.left;
    this.section.style.top = save.top;
    this.section.style.zIndex = save.z_index;
    this.content.style.width = save.width;
    this.content.style.height = save.height;
  } catch(e) {
    rcn_log('Could not load window from storage')
  }
}

function rcn_window_onmousedown(e) {
  // Set window's z-index greater than any other
  this.style.zIndex = rcn_windows.length+1;
  var z_index = 0;
  rcn_windows.slice().sort(function(a, b) { // Sort windows by z-index
    return a.section.style.zIndex - b.section.style.zIndex;
  }).forEach(function(window) { // Assign incrementally greater z-indices starting from 0
    window.section.style.zIndex = z_index++;
  });
}

function rcn_window_header_onmousedown(e) {
  e = e || window.event;
  e.preventDefault();

  rcn_window_drag = {
    node: this.parentElement,
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
  node.style.top = Math.max(0, (node.offsetTop + dy)) + "px";
}

rcn_window.prototype.add_child = function(node) {
  this.content.appendChild(node);
}

rcn_window.prototype.kill = function() {
  this.section.parentElement.removeChild(this.section);
  rcn_windows.splice(rcn_windows.indexOf(this), 1);
}

rcn_windows = [];

document.addEventListener('mousemove', rcn_window_onmousemove);
document.addEventListener('mouseup', rcn_window_onmouseup);
window.addEventListener('unload', function() {
  rcn_windows.forEach(function(window) {
    window.save_to_storage();
  });
})
