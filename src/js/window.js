// Generic draggable window

function rcn_window(type, title) {
  this.type = type;
  this.title = title;

  this.section = document.createElement('section');
  this.section.classList.add('window');
  this.section.classList.add(type);
  this.section.rcn_window = this;
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
  if(!rcn_storage.window) {
    rcn_storage.window = {};
  }
  rcn_storage.window[this.type] = {
    left: this.section.style.left,
    top: this.section.style.top,
    z_index: this.section.style.zIndex,
    width: this.content.style.width,
    height: this.content.style.height,
  };
}

rcn_window.prototype.load_from_storage = function() {
  try {
    var save = rcn_storage.window[this.type];
    this.section.style.left = save.left;
    this.section.style.top = save.top;
    this.section.style.zIndex = save.z_index;
    this.content.style.width = save.width;
    this.content.style.height = save.height;
  } catch(e) {
    rcn_log('Could not load '+this.type+' window from storage')
    console.log(e);
  }
}

rcn_window.prototype.documentation = function(key) {
  var info_icon = document.createElement('icon');
  info_icon.innerHTML = '&#x2139';
  info_icon.onclick = function() {
    rcn_dispatch_ed_event('rcndoclookup', {key:key});
  }
  info_icon.onmousedown = function(e) {
    e.stopPropagation();
  }
  this.header.appendChild(info_icon);
}

rcn_window.prototype.addEventListener = function(type, listener, options) {
  this.section.addEventListener(type, listener, options);
}

function rcn_window_onmousedown(e) {
  // Set window's z-index greater than any other
  this.style.zIndex = rcn_windows.length+1;
  var z_index = 0;
  rcn_windows.slice().sort(function(a, b) { // Sort windows by z-index
    return a.section.style.zIndex - b.section.style.zIndex;
  }).forEach(function(window) { // Assign incrementally greater z-indices starting from 0
    window.section.style.zIndex = z_index++;
    window.save_to_storage();
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

  node.rcn_window.save_to_storage();
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

function rcn_dispatch_ed_event(type, detail) {
  var event = new CustomEvent(type, {detail: detail});
  for(var i=0; i<document.body.childElementCount; i++) {
    document.body.children[i].dispatchEvent(event);
  }
}
