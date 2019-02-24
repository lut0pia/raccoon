// Basic functionality, bootstrap, config

var rcn_log = (location.protocol == 'file:') ? console.log : function() {};

const rcn = {
  rom_size: 0x5000, // = 20KiB
  ram_size: 0x8000, // = 32KiB
  mem_spritesheet_offset: 0x0000,
  mem_spritesheet_size: 0x2000,
  mem_map_offset: 0x2000,
  mem_map_size: 0x2000,
  mem_palette_offset: 0x4000,
  mem_palette_size: 0x0018, // 24B = 8x24bits
  mem_spriteflags_offset: 0x4100,
  mem_spriteflags_size: 0x0100, // 256B = 256x8bits
  mem_palmod_offset: 0x5000,
  mem_palmod_size: 0x0010, // 16B = 16x(7+1)bits (4b color + 1b transp)
  mem_gamepad_offset: 0x5010,
  mem_gamepad_size: 0x0004, // 4B = 4x(4+4)bits (4b directions + 4b buttons)
  mem_screen_offset: 0x6000,
  mem_screen_size: 0x2000,
};

// Raccoon storage
try {
  rcn_storage = JSON.parse(localStorage.rcn);
} catch(e) {
  rcn_log('Could not read localStorage');
  rcn_storage = {};
  console.log(e);
}
window.addEventListener('unload', function() {
  try {
    localStorage.rcn = JSON.stringify(rcn_storage);
  } catch(e) {
    rcn_log('Could not write to localStorage');
    console.log(e);
  }
})

function rcn_add_head_node(name) {
  var new_node = document.createElement(name);
  document.head.appendChild(new_node);
  return new_node;
}
function rcn_load_script(script) {
  // TODO: keep array of script promises
  var path = 'src/js/'+script+'.js';
  var script_node = rcn_add_head_node('script');
  script_node.type = 'text/javascript';
  script_node.src = path;
  return new Promise(function(resolve) {
    script_node.onload = resolve;
  });
}
function rcn_load_scripts(scripts) {
  var script_promises = [];
  scripts.forEach(function(script) {
    script_promises.push(rcn_load_script(script));
  });
  return Promise.all(script_promises);
}
function rcn_load_style(style) {
  // TODO: keep array of style promises
  var path = 'src/css/'+style+'.css';
  var style_node = rcn_add_head_node('link');
  style_node.rel = 'stylesheet';
  style_node.media = 'screen';
  style_node.type = 'text/css';
  style_node.href = path;
}
function rcn_load_styles(styles) {
  var style_promises = [];
  styles.forEach(function(style) {
    style_promises.push(rcn_load_style(style));
  });
  return Promise.all(style_promises);
}

document.title = 'raccoon';

Promise.all([
  rcn_load_styles(['reset']),
  rcn_load_scripts([
    // Raccoon core
    'bin','vm','vm_worker',
    // Utility
    'canvas','github','gl','utility','xhr',
  ]),
]).then(function() {
  return rcn_bin_from_env();
}).then(function(bin) {
  if(bin && !rcn_get_parameters.edit) {
    rcn_log('Starting in game mode');

    rcn_load_styles(['game']);

    var vm = new rcn_vm();
    vm.load_bin(bin);
    document.title = bin.name;
    vm.canvas.node.classList.add('fullscreen');
    document.body.appendChild(vm.canvas.node);
    vm.canvas.node.focus();
  } else {
    rcn_log('Starting in editor mode');
    rcn_editors = []; // This gets filled with the constructors of each type of editor
    document.body.classList.add('editor');

    Promise.all([
      rcn_load_styles(['bin_ed','code_ed','docs_ed','editor','log_ed','map_ed','sprite_ed','vm_ed','window']),
      rcn_load_scripts(['bin_ed','code_ed','docs_ed','log_ed','map_ed','sprite_ed','ui','vm_ed','window']),
    ]).then(function() {
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

      rcn_global_bin = bin ? bin : new rcn_bin();

      rcn_window_load_layout(rcn_storage.window_layout || {
        // Default window layout
        'default_docs_ed': {
          ctor: 'rcn_docs_ed',
          top: '0px', left: '256px',
          width: (window.innerWidth-512)+'px', height: (window.innerHeight-64)+'px',
        },
      });
    });
  }
});
