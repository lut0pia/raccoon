// Raccoon editor functionality

function rcn_start_editor_mode(params) {
  rcn_log('Starting editor mode');

  document.body.classList.add('editor');

  // Sort editors alphabetically
  rcn_editors.sort(function(a, b) {
    return a.prototype.title > b.prototype.title;
  });

  // Create toolbar
  const toolbar_div = document.createElement('div');
  toolbar_div.id = 'toolbar';
  rcn_editors.forEach(function(ed) {
    const editor_button = document.createElement('div');
    editor_button.classList.add('editor_button');
    editor_button.innerText = ed.prototype.title;
    editor_button.onclick = function() {
      new ed();
    }
    toolbar_div.appendChild(editor_button);
  });
  document.body.appendChild(toolbar_div);

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
  const canvases = document.getElementsByTagName('canvas');
  for(let i = 0; i < canvases.length; i++) {
    const canvas = canvases[i];
    if(canvas.rcn_canvas) {
      canvas.rcn_canvas.flush();
    }
  }

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

const rcn_window_container = document.createElement('main');
document.body.appendChild(rcn_window_container);

function rcn_dispatch_ed_event(type, detail) {
  const event = new CustomEvent(type, {detail: detail || {}});

  for(let i = 0; i < rcn_window_container.childElementCount; i++) {
    rcn_window_container.children[i].dispatchEvent(event);
  }

  // Useful for global mechanisms, such as undo stack
  document.body.dispatchEvent(event);
}

function rcn_confirm_bin_override() {
  const saved_bin = rcn_storage.bins.find(function(bin) {
    return bin.name == rcn_global_bin.name;
  });
  const current_json = JSON.stringify(rcn_global_bin.to_json());
  const default_json = JSON.stringify((new rcn_bin()).to_json());
  const saved_json = saved_bin ? JSON.stringify(saved_bin) : '';
  return current_json == saved_json || current_json == default_json ||
    confirm('Are you sure you want to overwrite your working bin? You have unsaved changes.');
}

// Make sure that rcn_storage.bins is an array
if(!rcn_storage.bins) {
  rcn_storage.bins = [];
}

// Clipboard functionality
let rcn_clipboard;
