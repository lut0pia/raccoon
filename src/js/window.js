// Generic draggable window
'use strict';

let rcn_window_drag = null;

function rcn_window() {
  let window = this;

  this.section = document.createElement('section');
  this.section.id = ((Math.random() * 0x10000000) >>> 0).toString(16);
  this.section.classList.add('window');
  this.section.classList.add(this.type);
  this.section.rcn_window = this;
  this.section.onmousedown = rcn_window_onmousedown;
  this.section.style.left = '256px';
  this.section.style.top = '256px';
  this.section.style.zIndex = rcn_window_container.childElementCount;
  rcn_window_container.appendChild(this.section);

  // Create header
  this.header = document.createElement('header');
  this.header.onmousedown = rcn_window_header_onmousedown;
  this.header.innerText = this.title;
  this.section.appendChild(this.header);

  // Create close icon
  this.add_header_icon({
    codepoint: '274E',
    type: 'close',
    onclick: function() {
      window.kill();
    },
  });

  // Create doc icon
  if(this.docs_link) {
    this.add_header_icon({
      codepoint: '2139',
      type: 'doc',
      onclick: function() {
        rcn_dispatch_ed_event('rcndoclookup', {key: window.docs_link});
      },
    });
  }

  // Create content
  this.content = document.createElement('content');
  this.section.appendChild(this.content);

  // Create content resize observer
  this.observer = new MutationObserver(function(mutations) {
    for(let i = 0; i < mutations.length; i++) {
      let mutation = mutations[i];
      if(mutation.attributeName == 'style') {
        window.section.dispatchEvent(new CustomEvent('rcn_window_resize'));
      }
    }
  });
  this.observer.observe(this.content, {
    attributes: true,
  });
}

rcn_window.prototype.add_header_icon = function(arg) {
  const icon = document.createElement('icon');
  icon.innerHTML = '&#x'+arg.codepoint;
  icon.classList.add(arg.type);
  icon.onclick = arg.onclick;
  icon.onmousedown = function(e) {
    e.stopPropagation();
  }
  this.header.appendChild(icon);
}

rcn_window.prototype.addEventListener = function(type, listener, options) {
  this.section.addEventListener(type, listener, options);
}

function rcn_window_onmousedown(e) {
  // Set window's z-index greater than any other
  this.style.zIndex = rcn_window_container.childElementCount+1;
  let z_index = 0;
  Array.from(rcn_window_container.children).sort(function(a, b) { // Sort windows by z-index
    return a.style.zIndex - b.style.zIndex;
  }).forEach(function(window) { // Assign incrementally greater z-indices starting from 0
    window.style.zIndex = z_index++;
  });
}

function rcn_window_header_onmousedown(e) {
  e = e || window.event;
  e.preventDefault();

  rcn_window_drag = {
    node: this.parentElement,
    dx: this.parentElement.offsetLeft - e.clientX,
    dy: this.parentElement.offsetTop - e.clientY,
  };

  document.body.classList.add('window_dragging')
}

rcn_window.prototype.add_child = function(node) {
  this.content.appendChild(node);
}

rcn_window.prototype.kill = function() {
  this.section.parentElement.removeChild(this.section);
}

function rcn_window_save_layout() {
  const layout = {};

  for(let i = 0; i < rcn_window_container.childElementCount; i++) {
    const section = rcn_window_container.children[i];
    const window = section.rcn_window;

    layout[section.id] = {
      ctor: window.constructor.name,
      left: section.style.left,
      top: section.style.top,
      z_index: section.style.zIndex,
      width: window.content.style.width,
      height: window.content.style.height,
    }
  }
  return layout;
}

let rcn_has_loaded_window_layout_once = false;

function rcn_window_load_layout(layout) {
  // Clear all windows
  while(rcn_window_container.firstChild) {
    rcn_window_container.removeChild(rcn_window_container.firstChild);
  }

  for(let id in layout) {
    const save = layout[id];
    const editor = new window[save.ctor]();
    editor.section.id = id;
    editor.section.style.left = save.left;
    editor.section.style.top = save.top;
    editor.section.style.zIndex = save.z_index;
    editor.content.style.width = save.width;
    editor.content.style.height = save.height;
  }

  if(!rcn_has_loaded_window_layout_once) {
    // It's necessary to delay registering this callback until
    // we've actually loaded a window layout, otherwise we may
    // accidentally save an empty layout
    window.addEventListener('beforeunload', function() {
      rcn_storage.window_layout = rcn_window_save_layout();
    });
    rcn_has_loaded_window_layout_once = true;
  }
}

document.addEventListener('mousemove', function(e) {
  if(rcn_window_drag == null) {
    return;
  }

  e = e || window.event;
  e.preventDefault();

  const node = rcn_window_drag.node;
  let new_x = e.clientX + rcn_window_drag.dx;
  let new_y = e.clientY + rcn_window_drag.dy;
  new_x = Math.max(0, Math.min(new_x, rcn_window_container.clientWidth - node.clientWidth - 2));
  new_y = Math.max(0, Math.min(new_y, rcn_window_container.clientHeight - node.clientHeight - 2));

  node.style.left = new_x + "px";
  node.style.top = new_y + "px";
});

document.addEventListener('mouseup', function(e) {
  rcn_window_drag = null;
  document.body.classList.remove('window_dragging')
});
