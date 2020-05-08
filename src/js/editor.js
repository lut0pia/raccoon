// Raccoon editor functionality
'use strict';

async function rcn_start_editor_mode(params) {
  rcn_log('Starting editor mode');

  document.body.classList.add('editor');

  // Sort editors alphabetically
  rcn_editors.sort(function(a, b) {
    return a.prototype.title > b.prototype.title ? 1 : -1;
  });

  const create_editor_button = (ed) => {
    const editor_el = document.createElement('article');
    editor_el.innerText = ed.prototype.title;
    editor_el.ed = ed;
    editor_el.addEventListener('click', function() {
      rcn_find_editor(ed, true);
      rcn_update_toolbox();
    });
    return editor_el;
  };

  const create_editor_group = (group) => {
    const group_el = document.createElement('section');
    group_el.className = group;
    for(let ed of rcn_editors) {
      if(ed.prototype.group == group) {
        group_el.appendChild(create_editor_button(ed));
      }
    }
    return group_el;
  };

  // Editor groups
  const editor_groups = rcn_editors
    .map(e => e.prototype.group)
    .filter((v, i, a) => v && a.indexOf(v) == i)
    .sort();

  // Fill toolbox
  for(let group of editor_groups) {
    rcn_toolbox.appendChild(create_editor_group(group));
  }
  rcn_toolbox.appendChild(create_editor_group());

  // Fill layout box
  rcn_update_layoutbox();

  rcn_global_bin = new rcn_bin();
  if(rcn_storage.working_bin) {
    // Load bin from last session
    rcn_global_bin.from_json(rcn_storage.working_bin);
  }

  if(params.bin && await rcn_confirm_bin_override()) {
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
    const prev_event = event_index > 0 && event_stack[event_index - 1];

    if(prev_event && prev_event.last_time > now - 500 && prev_event.first_time > now - 5000) {
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

  // Global keyboard shortcuts
  document.body.addEventListener('keydown', function(e) {
    if((e.ctrlKey || e.metaKey) && e.altKey && e.key == 'Enter') {
      const vm_ed = rcn_find_editor(rcn_vm_ed);
      vm_ed && vm_ed.reboot();
      e.preventDefault();
    }
  });
}

const rcn_side_panel = document.createElement('aside');
document.body.appendChild(rcn_side_panel);

const rcn_toolbox = document.createElement('div');
rcn_toolbox.id = 'toolbox';
rcn_side_panel.appendChild(rcn_toolbox);

const rcn_layoutbox = document.createElement('div');
rcn_layoutbox.id = 'layoutbox';
rcn_side_panel.appendChild(rcn_layoutbox);

const rcn_window_container = document.createElement('main');
document.body.appendChild(rcn_window_container);

function rcn_update_toolbox() {
  for(let i = 0; i < rcn_toolbox.childElementCount; i++) {
    const child = rcn_toolbox.children[i];
    child.classList.toggle('active', !!rcn_find_editor(child.ed));
  }
}

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
  const saved_bin = rcn_storage.bins[rcn_global_bin.name];
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

async function rcn_confirm_bin_override() {
  const save_status = rcn_bin_save_status();
  return (save_status != 'unsaved' && save_status != 'new') ||
    await rcn_ui_confirm(`Are you sure you want to overwrite your working bin ${rcn_global_bin.name}? You have unsaved changes.`);
}

// Create defaults in rcn_storage
if(!rcn_storage.bins) {
  rcn_storage.bins = {};
}

// Move from old bin array to new bin map
if(rcn_storage.bins instanceof Array) {
  if(rcn_storage.bins.length > 0) {
    rcn_storage.bins = Object.assign(...Object.values(rcn_storage.bins).map(bin => ({[bin.name]: bin})));
  } else {
    rcn_storage.bins = {};
  }
}

if(!rcn_storage.window_layouts) {
  rcn_storage.window_layouts = {};
}

function rcn_find_editor(ed, create = false) {
  for(let i = 0; i < rcn_window_container.childElementCount; i++) {
    const section = rcn_window_container.children[i];
    const window = section.rcn_window;
    if(window.constructor == ed) {
      if(create) {
        window.foreground();
      }
      return window;
    }
  }
  if(create) {
    return new ed();
  }
  return null;
}
