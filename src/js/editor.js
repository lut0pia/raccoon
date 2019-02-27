// Raccoon editor functionality

function rcn_start_editor_mode(params) {
  rcn_log('Starting editor mode');

  // Create toolbar
  var toolbar_div = document.createElement('div');
  toolbar_div.id = 'toolbar';
  rcn_editors.forEach(function(ed) {
    var editor_button = document.createElement('div');
    editor_button.classList.add('editor_button');
    editor_button.innerText = ed.prototype.title;
    editor_button.onclick = function() {
      new ed();
    }
    toolbar_div.appendChild(editor_button);
  });
  document.body.appendChild(toolbar_div);

  rcn_global_bin = params.bin ? params.bin : new rcn_bin();

  rcn_window_load_layout(rcn_storage.window_layout || {
    // Default window layout
    'default_docs_ed': {
      ctor: 'rcn_docs_ed',
      top: '0px', left: '256px',
      width: (window.innerWidth-512)+'px', height: (window.innerHeight-64)+'px',
    },
  });
}

const rcn_window_container = document.createElement('main');
document.body.appendChild(rcn_window_container);

function rcn_dispatch_ed_event(type, detail) {
  var event = new CustomEvent(type, {detail: detail});
  for(var i=0; i<rcn_window_container.childElementCount; i++) {
    rcn_window_container.children[i].dispatchEvent(event);
  }
}
