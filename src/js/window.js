// Generic draggable window
'use strict';

const rcn_window_snap_radius = 16;
let rcn_window_drag = null;

function rcn_window() {
  const window = this;

  this.section = document.createElement('section');
  this.section.id = ((Math.random() * 0x10000000) >>> 0).toString(16);
  this.section.ctor = this.constructor.name;
  this.section.tabIndex = 0;
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
    codepoint: '274C',
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
        rcn_find_editor(rcn_docs_ed, true).lookup(window.docs_link);
      },
    });
  }

  // Create content
  this.content = document.createElement('content');
  this.section.appendChild(this.content);

  // Create content resize observer
  this.observer = new MutationObserver(function(mutations) {
    for(let mutation of mutations) {
      if(mutation.attributeName == 'style') {
        window.section.dispatchEvent(new CustomEvent('rcn_window_resize'));
        window.update_snapping();
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

rcn_window.prototype.add_child = function(node) {
  this.content.appendChild(node);
}

rcn_window.prototype.kill = function() {
  this.section.parentElement.removeChild(this.section);
  rcn_update_toolbox();
}

rcn_window.prototype.foreground = function() {
  // Set window's z-index greater than any other
  this.section.style.zIndex = rcn_window_container.childElementCount+1;
  let z_index = 0;
  Array.from(rcn_window_container.children).sort(function(a, b) { // Sort windows by z-index
    return a.style.zIndex - b.style.zIndex;
  }).forEach(function(window) { // Assign incrementally greater z-indices starting from 0
    window.style.zIndex = z_index++;
  });
}

rcn_window.prototype.update_snapping = function() {
  const this_window = this;
  const other_windows = rcn_get_windows().filter(w => w != this_window);
  const unique = (v, i, a) => a.indexOf(v) == i;
  const guides_x = other_windows
    .map(w => [parseInt(w.section.style.left), parseInt(w.section.style.left) + w.section.clientWidth])
    .flat().filter(unique);
  const guides_y = other_windows
    .map(w => [parseInt(w.section.style.top), parseInt(w.section.style.top) + w.section.clientHeight])
    .flat().filter(unique);
  const container_width = rcn_window_container.clientWidth;
  const container_height = rcn_window_container.clientHeight;

  const snap_pos = function(guides, v, d) {
    let guide = guides.find(g => Math.abs(g - v) <= rcn_window_snap_radius);
    if(guide !== undefined) {
      return guide;
    }
    guide = guides.find(g => Math.abs(g - v - d) <= rcn_window_snap_radius);
    if(guide !== undefined) {
      return guide - d;
    }
    return v;
  }

  let x = parseInt(this.section.style.left);
  let y = parseInt(this.section.style.top);
  const snapped_x = snap_pos(guides_x, x, this.section.clientWidth);
  const snapped_y = snap_pos(guides_y, y, this.section.clientHeight);
  if(this.old_x != x || this.old_y != y) {
    x = Math.max(0, Math.min(snapped_x, container_width - this.section.clientWidth - 2));
    y = Math.max(0, Math.min(snapped_y, container_height - this.section.clientHeight - 2));
    this.section.style.left = `${x}px`;
    this.section.style.top = `${y}px`;
    this.old_x = x;
    this.old_y = y;
  }

  const snap_dim = function(guides, v, d) {
    const guide = guides.find(g => Math.abs(g - v - d) <= rcn_window_snap_radius);
    return guide !== undefined ? guide - v : d;
  }

  let width = this.section.clientWidth;
  let height = this.section.clientHeight;
  const snapped_width = snap_dim(guides_x, x, width);
  const snapped_height = snap_dim(guides_y, y, height);
  if(this.old_width != width || this.old_height != height) {
    const padding_x = this.section.clientWidth - parseInt(this.content.style.width);
    const padding_y = this.section.clientHeight - parseInt(this.content.style.height);
    width = Math.min(snapped_width, container_width - x - 2) - padding_x;
    height = Math.min(snapped_height, container_height - y - 2) - padding_y;

    this.content.style.width = `${width}px`;
    this.content.style.height = `${height}px`;
    this.old_width = width;
    this.old_height = height;
  }
}

function rcn_window_onmousedown() {
  // Focus clicked window
  this.focus();
  this.rcn_window.foreground();
}

function rcn_window_header_onmousedown(e) {
  e = e || window.event;
  e.preventDefault();

  rcn_window_drag = {
    window: this.parentElement.rcn_window,
    dx: this.parentElement.offsetLeft - e.clientX,
    dy: this.parentElement.offsetTop - e.clientY,
  };

  document.body.classList.add('window_dragging')
}

function rcn_get_windows() {
  return Array.from(rcn_window_container.children).map(c => c.rcn_window);
}

function rcn_window_save_layout() {
  const layout = {};

  const to_percent = d => (v, o = 0) => `${(parseFloat(v)+o)*100/d}%`;
  const to_percent_x = to_percent(rcn_window_container.clientWidth);
  const to_percent_y = to_percent(rcn_window_container.clientHeight);

  for(let window of rcn_get_windows()) {
    layout[window.section.id] = {
      ctor: window.constructor.name,
      left: to_percent_x(window.section.style.left),
      top: to_percent_y(window.section.style.top),
      z_index: window.section.style.zIndex,
      width: to_percent_x(window.content.style.width, 2),
      height: to_percent_y(window.content.style.height, 32),
    }
  }
  return layout;
}

let rcn_has_loaded_window_layout_once = false;

function rcn_window_load_layout(layout) {
  // Remove unwanted windows
  for(let i = 0; i < rcn_window_container.childElementCount; i++) {
    const window = rcn_window_container.children[i];
    if(!Object.values(layout).find(w => window.ctor == w.ctor)) {
      rcn_window_container.removeChild(window);
      i--;
    }
  }

  const to_pixel = d => (v, o = 0) => v.endsWith('%') ? `${parseFloat(v)*d/100+o}px` : v;
  const to_pixel_x = to_pixel(rcn_window_container.clientWidth);
  const to_pixel_y = to_pixel(rcn_window_container.clientHeight);

  for(let id in layout) {
    const save = layout[id];
    if(!window[save.ctor]) {
      console.log(`Unable to load window with ctor: ${save.ctor}`);
      continue;
    }
    const editor = rcn_find_editor(window[save.ctor], true);
    editor.section.id = id;
    editor.section.style.left = to_pixel_x(save.left);
    editor.section.style.top = to_pixel_y(save.top);
    editor.section.style.zIndex = save.z_index;
    editor.content.style.width = to_pixel_x(save.width, -2);
    editor.content.style.height = to_pixel_y(save.height, -32);
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

  rcn_update_toolbox();
}

function rcn_window_focus(e) {
  while(e) {
    if(e.rcn_window) {
      return e.focus();
    }
    e = e.parentElement;
  }
}

document.addEventListener('mousemove', function(e) {
  if(rcn_window_drag == null) {
    return;
  }

  e = e || window.event;
  e.preventDefault();

  const section = rcn_window_drag.window.section;
  section.style.left = `${e.clientX + rcn_window_drag.dx}px`;
  section.style.top = `${e.clientY + rcn_window_drag.dy}px`;

  rcn_window_drag.window.update_snapping();
});

document.addEventListener('mouseup', function(e) {
  rcn_window_drag = null;
  document.body.classList.remove('window_dragging')
});
