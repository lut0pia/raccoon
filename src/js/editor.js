// Raccoon editor functionality
'use strict';

function rcn_start_editor_mode(params) {
  rcn_log('Starting editor mode');

  document.body.classList.add('editor');

  // Sort editors alphabetically
  rcn_editors.sort(function(a, b) {
    return a.prototype.title > b.prototype.title ? 1 : -1;
  });

  // Fill toolbox
  for(let ed of rcn_editors) {
    const tool = document.createElement('article');
    tool.innerText = ed.prototype.title;
    tool.onclick = function() {
      new ed();
    }
    toolbox_div.appendChild(tool);
  }

  // Fill layout box
  rcn_update_layoutbox();

  rcn_global_bin = new rcn_bin();
  if(rcn_storage.working_bin) {
    // Load bin from last session
    rcn_global_bin.from_json(rcn_storage.working_bin);
  }

  if(params.bin && rcn_confirm_bin_override()) {
    rcn_global_bin = params.bin;
  }

  window.addEventListener('beforeunload', function() {
    // Save bin for next session
    rcn_storage.working_bin = rcn_global_bin.to_json();
  });

  rcn_window_load_layout(rcn_storage.window_layout || {
    // Default window layout
    'default_docs_ed': {
      ctor: 'rcn_docs_ed',
      top: '0px', left: '256px',
      width: (window.innerWidth-512)+'px', height: (window.innerHeight-64)+'px',
    },
  });

  // Flush all canvases
  // Need to wait a bit because we just created the DOM elements
  // and layout may not have kicked in yet
  setTimeout(function() {
    const canvases = document.getElementsByTagName('canvas');
    for(let i = 0; i < canvases.length; i++) {
      const canvas = canvases[i];
      if(canvas.rcn_canvas) {
        canvas.rcn_canvas.flush();
      }
    }
  }, 100);

  // Event history (undo/redo)
  let event_stack = [];
  let event_index = 0;
  let event_mirror = rcn_global_bin.rom.slice();
  document.body.addEventListener('keydown', function(e) {
    if(!(e.ctrlKey || e.metaKey)) return;
    if(e.target.type == 'text' || e.target.type == 'textarea') return;

    let offset;
    let patch;

    if(e.key == 'z' && event_index > 0) { // Undo
      offset = event_stack[--event_index].offset;
      patch = event_stack[event_index].before;
    } else if(e.key == 'y' && event_index < event_stack.length) { // Redo
      offset = event_stack[event_index].offset;
      patch = event_stack[event_index++].after;
    } else {
      return;
    }

    rcn_global_bin.rom.set(patch, offset);
    event_mirror.set(patch, offset);

    rcn_dispatch_ed_event('rcn_bin_change', {
      begin: offset,
      end: offset + patch.length,
      undo_redo: true,
    });
  });
  document.body.addEventListener('rcn_bin_change', function(e) {
    if(e.detail.undo_redo) return; // This event was trigger by an undo/redo
    if(e.detail.load) { // Complete bin load, clear undo stack
      event_stack = [];
      event_index = 0;
      event_mirror = rcn_global_bin.rom.slice();
      return;
    }

    const mem_begin = e.detail.begin;
    const mem_end = e.detail.end;

    if(mem_begin == mem_end) return; // This event does not concern bin rom

    const now = Date.now();
    let event = {
      offset: mem_begin,
      after: rcn_global_bin.rom.slice(mem_begin, mem_end),
      before: event_mirror.slice(mem_begin, mem_end),
      first_time: now,
      last_time: now,
    };

    if(event.after.join() === event.before.join()) return; // Nothing changed

    event_stack.splice(event_index);
    let prev_event = event_index > 0 && event_stack[event_index - 1];

    if(prev_event && prev_event.last_time > now - 1000) {
      // Extend previous event
      let new_begin = Math.min(prev_event.offset, mem_begin);
      let new_end = Math.max(prev_event.offset + prev_event.before.length, mem_end)
      event.offset = new_begin;
      event.first_time = prev_event.first_time;
      event.after = rcn_global_bin.rom.slice(new_begin, new_end);
      event.before = event_mirror.slice(new_begin, new_end);
      event.before.set(prev_event.before, prev_event.offset - new_begin);
      event_stack[event_index - 1] = event;
    } else {
      // Create new event
      event_stack.push(event);
      event_index++;
    }

    event_mirror.set(event.after, event.offset);
  });
}

const rcn_overlay = document.createElement('div');
rcn_overlay.id = 'overlay';
rcn_overlay.stack = 0;
document.body.appendChild(rcn_overlay);

function rcn_overlay_push() {
  if(++rcn_overlay.stack > 0) {
    rcn_overlay.classList.add('active');
  }
}

function rcn_overlay_pop() {
  if(--rcn_overlay.stack <= 0) {
    rcn_overlay.classList.remove('active');
  }
}

const rcn_side_panel = document.createElement('aside');
document.body.appendChild(rcn_side_panel);

const toolbox_div = document.createElement('div');
toolbox_div.id = 'toolbox';
rcn_side_panel.appendChild(toolbox_div);

const rcn_layoutbox = document.createElement('div');
rcn_layoutbox.id = 'layoutbox';
rcn_side_panel.appendChild(rcn_layoutbox);

const rcn_window_container = document.createElement('main');
document.body.appendChild(rcn_window_container);

function rcn_update_layoutbox() {
  // Clear
  while(rcn_layoutbox.firstChild) {
    rcn_layoutbox.removeChild(rcn_layoutbox.firstChild);
  }

  for(const layout_name in rcn_storage.window_layouts) {
    const layout_article = document.createElement('article');
    layout_article.innerText = layout_name;
    rcn_layoutbox.appendChild(layout_article);

    layout_article.appendChild(rcn_ui_button({
      value: 'Load',
      onclick: function() {
        rcn_window_load_layout(rcn_storage.window_layouts[layout_name]);
      },
    }));

    layout_article.appendChild(rcn_ui_button({
      value: 'Delete',
      onclick: function() {
        delete rcn_storage.window_layouts[layout_name];
        rcn_update_layoutbox();
      },
    }));
  }
  rcn_layoutbox.appendChild(rcn_ui_button({
    value: 'Save',
    onclick: function() {
      const layout_name = prompt('Layout name:');
      if(layout_name) {
        rcn_storage.window_layouts[layout_name] = rcn_window_save_layout();
        rcn_update_layoutbox();
      }
    },
  }));
}

function rcn_dispatch_ed_event(type, detail) {
  const event = new CustomEvent(type, {detail: detail || {}});

  for(let i = 0; i < rcn_window_container.childElementCount; i++) {
    rcn_window_container.children[i].dispatchEvent(event);
  }

  // Useful for global mechanisms, such as undo stack
  document.body.dispatchEvent(event);
}

function rcn_bin_save_status() {
  const saved_bin = rcn_storage.bins.find(function(bin) {
    return bin.name == rcn_global_bin.name;
  });
  const current_json = JSON.stringify(rcn_global_bin.to_json());
  const default_json = JSON.stringify((new rcn_bin()).to_json());
  const saved_json = saved_bin ? JSON.stringify(saved_bin) : '';
  if(current_json == default_json) {
    return 'default';
  } else if(!saved_json) {
    return 'new';
  } else if(current_json != saved_json) {
    return 'unsaved';
  } else {
    return 'saved';
  }
}

function rcn_confirm_bin_override() {
  const save_status = rcn_bin_save_status();
  return (save_status != 'unsaved' && save_status != 'new') ||
    confirm('Are you sure you want to overwrite your working bin? You have unsaved changes.');
}

// Create defaults in rcn_storage
if(!rcn_storage.bins) {
  rcn_storage.bins = [];
}

if(!rcn_storage.window_layouts) {
  rcn_storage.window_layouts = {};
}

// Clipboard functionality
let rcn_clipboard;

function rcn_copy_sprite_region(x, y, w, h) {
  const texel_count = w * h;
  let texels = new Uint8Array(texel_count);
  for(let i = 0; i < w; i++) {
    for(let j = 0; j < h; j++) {
      texels[i + j * w] = rcn_get_sprite_texel(x + i, y + j);
    }
  }
  rcn_clipboard = {
    type: 'texels',
    width: w,
    height: h,
    texels: texels,
  };
}

function rcn_paste_sprite_region(x, y, w, h) {
  if(!rcn_clipboard || rcn_clipboard.type != 'texels') return;
  // Clamp copy sizes to spritesheet size
  w = Math.min(rcn_clipboard.width, 128 - x);
  h = Math.min(rcn_clipboard.height, 96 - y);
  for(let i = 0; i < w; i++) {
    for(let j = 0; j < h; j++) {
      rcn_set_sprite_texel(
        x + i, y + j,
        rcn_clipboard.texels[i + j * rcn_clipboard.width],
      );
    }
  }
  rcn_dispatch_ed_event('rcn_bin_change', {
    begin: (y << 6) + (x >> 1),
    end: ((y + h) << 6) + ((x + w) >> 1) + 1,
  });
}

// Editor utility

function rcn_set_sprite_texel(x, y, c) {
  const texel_index = (y << 6) + (x >> 1);
  const texel = rcn_global_bin.rom[texel_index];
  rcn_global_bin.rom[texel_index] = ((x % 2) < 1)
    ? ((texel & 0xf0) | c)
    : ((texel & 0x0f) | (c << 4));
}

function rcn_get_sprite_texel(x, y) {
  const texel_index = (y << 6) + (x >> 1);
  let texel = rcn_global_bin.rom[texel_index];
  return ((x % 2) < 1) ? (texel & 0xf) : (texel >> 4);
}

function rcn_clear_sprite_region(x, y, w, h, c) {
  for(let i = 0; i < w; i++) {
    for(let j = 0; j < h; j++) {
      rcn_set_sprite_texel(x + i, y + j, c);
    }
  }
  rcn_dispatch_ed_event('rcn_bin_change', {
    begin: (y << 6) + (x >> 1),
    end: ((y + h) << 6) + ((x + w) >> 1) + 1,
  });
}
