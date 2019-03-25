// Basic functionality, bootstrap, config

document.title = 'raccoon';

var rcn_log = (location.protocol == 'file:') ? console.log : function() {};

const rcn = {
  rom_size: 0x5000, // = 20KiB
  ram_size: 0x8000, // = 32KiB
  mem_spritesheet_offset: 0x0000,
  mem_spritesheet_size: 0x1800, // 6KiB = 128x96x4bits
  mem_map_offset: 0x1800,
  mem_map_size: 0x2000, // 8KiB = 128x64x8bits
  mem_palette_offset: 0x3800,
  mem_palette_size: 0x0018, // 24B = 8x24bits
  mem_spriteflags_offset: 0x3818,
  mem_spriteflags_size: 0x0100, // 256B = 256x8bits
  mem_sound_offset: 0x3918,
  mem_sound_size: 0x1080, // 4224B = 64x(8+8+(32x16))bits
  mem_music_offset: 0x4998,
  mem_music_size: 0x0100, // 256B = 64x(4x6+2+6)bits
  // ... 0x0568
  // RAM/ROM limit
  // ... 0x0fe2
  mem_soundreg_offset: 0x5fd6,
  mem_soundreg_size: 0x000c, // 12B = 4x(8+6+1+3+3)
  mem_palmod_offset: 0x5fe2,
  mem_palmod_size: 0x0010, // 16B = 16x(7+1)bits (4b color + 1b transp)
  mem_gamepad_offset: 0x5ff8,
  mem_gamepad_size: 0x0008, // 8B = 2x4x(4+4)bits (4b directions + 4b buttons)
  mem_screen_offset: 0x6000,
  mem_screen_size: 0x2000, // 8KiB = 128x128x4bits
};

rcn_editors = []; // This gets filled with the constructors of each type of editor
rcn_hosts = {};

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

function rcn_bootstrap_game_mode(params) {
  rcn_log('Bootstrapping game mode');
  (params.export
    ? Promise.resolve()
    : Promise.all([
      rcn_load_styles(['game']),
      rcn_load_scripts(['game']),
    ])).then(function() {
    rcn_start_game_mode(params)
  });
}

function rcn_bootstrap_editor_mode(params) {
  rcn_log('Bootstrapping editor mode');
  Promise.all([
    rcn_load_styles([
      'editor', 'window',
      'ed/bin_ed',
      'ed/code_ed',
      'ed/docs_ed',
      'ed/map_ed',
      'ed/sound_ed',
      'ed/sprite_ed',
      'ed/sprite_select_ed',
      'ed/vm_ed',
    ]),
    rcn_load_scripts([
      'editor', 'ui', 'window',
      'ed/bin_ed',
      'ed/code_ed',
      'ed/docs_ed',
      'ed/map_ed',
      'ed/music_ed',
      'ed/sound_ed',
      'ed/sprite_ed',
      'ed/sprite_select_ed',
      'ed/vm_ed',
    ]),
  ]).then(function() {
    rcn_start_editor_mode(params);
  });
}

if(typeof rcn_static_bin_json !== 'undefined') {
  // We're in an export html
  window.addEventListener('load', function() {
    var static_bin = new rcn_bin();
    static_bin.from_json(rcn_static_bin_json);
    rcn_start_game_mode({
      bin: static_bin,
      export: true,
    });
  });
} else { // Normal path
  Promise.all([
    rcn_load_styles(['reset']),
    rcn_load_scripts([
      // Raccoon core
      'bin','vm','vm_worker',
      // Utility
      'audio','canvas','gl','utility','xhr',
      // Extensions
      'ext/github',
    ]),
  ]).then(function() {
    return rcn_bin_from_env();
  }).then(function(bin) {
    if(bin) {
      rcn_log('Loaded bin from environment');
    }
    if(bin && !rcn_get_parameters.edit) {
      rcn_bootstrap_game_mode({
        bin: bin,
      });
    } else {
      rcn_bootstrap_editor_mode({
        bin: bin,
      });
    }
  });
}
