// Basic functionality, bootstrap, config
'use strict';

document.title = 'raccoon';

const rcn_log = (location.protocol == 'file:') ? console.log : function() {};

const rcn = {
  rom_size: 0x5000, // = 20KiB
  ram_size: 0x8000, // = 32KiB
  mem_spritesheet_offset: 0x0000,
  mem_spritesheet_size: 0x1800, // 6KiB = 128x96x4bits
  mem_map_offset: 0x1800,
  mem_map_size: 0x2000, // 8KiB = 128x64x8bits
  mem_palette_offset: 0x3800,
  mem_palette_size: 0x0040, // 64B = 16x(24+1+3+4)bits (24bit RGB color + 1b transp + 3b reserved + 4b redir)
  mem_spriteflags_offset: 0x3840,
  mem_spriteflags_size: 0x00c0, // 192B = 192x8bits
  mem_sound_offset: 0x3900,
  mem_sound_size: 0x1080, // 4224B = 64x(8+8+(32x16))bits
  mem_music_offset: 0x4980,
  mem_music_size: 0x0100, // 256B = 64x(4x6+2+6)bits
  // ... 0x0580
  // RAM/ROM limit
  // ... 0x0fd2
  mem_cam_offset: 0x5fb5,
  mem_cam_size: 0x0004, // 4B = 2x16bits
  mem_musicstate_offset: 0x5fb9,
  mem_musicstate_size: 0x0005, // 5B = 1+7+16+16bits (1b playing + 7b index + 16b time + 16b max_time)
  mem_soundstate_offset: 0x5fbe,
  mem_soundstate_size: 0x0014, // 20B = 4x(8+8+8+16)bits (8b index + 8b offset + 8b length + 16b time)
  mem_soundreg_offset: 0x5fd2,
  mem_soundreg_size: 0x0010, // 16B = 4x(8+8+6+1+3+3)
  mem_gamepad_offset: 0x5ff4,
  mem_gamepad_size: 0x000c, // 12B = 2x4x(4+4)+4x8bits (4b directions + 4b buttons)
  mem_screen_offset: 0x6000,
  mem_screen_size: 0x2000, // 8KiB = 128x128x4bits

  map_width: 128,
  map_height: 64,
  music_count: 64,
  music_track_count: 4,
  sound_count: 64,
  sound_pitch_count: 64,

  gamepad_layout_xcvb: 0,
  gamepad_layout_abxy: 1,
};

let rcn_global_bin;
const rcn_editors = []; // This gets filled with the constructors of each type of editor
const rcn_hosts = {};
const rcn_resources = {}; // This can be used to redirect URLs to ObjectURLs
let rcn_clipboard;

// Raccoon storage
let rcn_storage = {}
try {
  rcn_storage = JSON.parse(localStorage.rcn);
} catch(e) {
  rcn_log('Could not read localStorage');
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

function rcn_resource(url) {
  return rcn_resources[url] || url;
}

function rcn_load_scripts(scripts) {
  return Promise.all(scripts.map(function(script) {
    const script_node = document.createElement('script');
    script_node.type = 'text/javascript';
    script_node.src = 'src/js/'+script+'.js';
    document.head.appendChild(script_node);
    return new Promise(function(resolve) {
      script_node.onload = resolve;
    });
  }));
}
function rcn_load_styles(styles) {
  return Promise.all(styles.map(function(style) {
    const style_node = document.createElement('link');
    style_node.rel = 'stylesheet';
    style_node.media = 'screen';
    style_node.type = 'text/css';
    style_node.href = 'src/css/'+style+'.css';
    document.head.appendChild(style_node);
    return new Promise(function(resolve) {
      style_node.onload = resolve;
    });
  }));
}

async function rcn_bootstrap_game_mode(params) {
  rcn_log('Bootstrapping game mode');
  if(!params.export) {
    await Promise.all([
      rcn_load_styles(['game']),
      rcn_load_scripts(['game']),
    ]);
  }
  rcn_start_game_mode(params);
}

async function rcn_bootstrap_editor_mode(params) {
  rcn_log('Bootstrapping editor mode');
  await Promise.all([
    rcn_load_styles([
      'editor', 'window',
      'ed/bin_ed',
      'ed/code_ed',
      'ed/console_ed',
      'ed/docs_ed',
      'ed/map_ed',
      'ed/music_ed',
      'ed/sound_ed',
      'ed/sprite_ed',
      'ed/sprite_select_ed',
      'ed/vm_ed',
    ]),
    rcn_load_scripts([
      'editor', 'ui', 'window',
      'ed/bin_ed',
      'ed/code_ed',
      'ed/console_ed',
      'ed/docs_ed',
      'ed/hover',
      'ed/map_ed',
      'ed/music_ed',
      'ed/palette_ed',
      'ed/selection',
      'ed/sound_ed',
      'ed/sprite_ed',
      'ed/sprite_select_ed',
      'ed/vm_ed',
    ]),
  ]);
  rcn_start_editor_mode(params);
}

window.addEventListener('load', async function() {
  if(typeof rcn_static_bin_json !== 'undefined') {
    // We're in an export html
    let static_bin = new rcn_bin();
    static_bin.from_json(rcn_static_bin_json);
    return rcn_start_game_mode({
      bin: static_bin,
      export: true,
    });
  }

  await Promise.all([
    rcn_load_styles(['reset']),
    rcn_load_scripts([
      // Raccoon core
      'bin','vm','vm_worker',
      // Utility
      'audio','canvas','gl','utility','xhr',
      // Extensions
      'ext/github',
    ]),
  ]);

  let bin = await rcn_bin_from_env();
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
