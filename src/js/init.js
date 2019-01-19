// Basic functionality, bootstrap, config

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

// Test code
rcn_load_styles(['code_ed','window']);
rcn_load_scripts(['canvas','code_ed','window','vm','vm_worker']).then(function() {
  rcn_global_vm = new rcn_vm();
  rcn_global_vm.canvas = new rcn_canvas();
  
  var code_ed = new rcn_code_ed();
});
