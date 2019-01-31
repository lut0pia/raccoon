// Basic functionality, bootstrap, config

var rcn_log = (location.protocol == 'file:') ? console.log : function() {};

const rcn = {
  rom_size: 0x6000, // = 24KiB
  ram_size: 0x8000, // = 32KiB
  ram_palette_offset: 0x4000,
  ram_palette_size: 0x0018, // 24B = 8x24bits
  ram_gamepad_offset: 0x5010,
  ram_gamepad_size: 0x0004, // 4B = 4x(4+4)bits (4b directions + 4b buttons)
  ram_screen_offset: 0x6000,
  ram_screen_size: 0x2000,
};

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

rcn_load_styles(['bin_ed','code_ed','docs_ed','palette_ed','vm_ed','window']);
rcn_load_scripts(['bin','bin_ed','canvas','code_ed','docs_ed','gl','palette_ed','window','vm','vm_ed','vm_worker']).then(function() {
  rcn_global_bin_ed = new rcn_bin_ed();
  rcn_global_vm_ed = new rcn_vm_ed();
  rcn_global_code_ed = new rcn_code_ed();
  rcn_global_docs_ed = new rcn_docs_ed();
  rcn_global_palette_ed = new rcn_palette_ed();

  rcn_global_bin_ed.change_bin(new rcn_bin());

  setInterval(function() { rcn_global_vm.update(); }, 1000/30);
});
