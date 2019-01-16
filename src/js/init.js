// Basic functionality, bootstrap, config

function rcn_add_head_node(name)
{
  var new_node = document.createElement(name);
  document.head.appendChild(new_node);
  return new_node;
}
function rcn_load_script(script)
{
  // TODO: keep array of script promises
  var path = 'src/js/'+script+'.js';
  var script_node = rcn_add_head_node('script');
  script_node.type = 'text/javascript';
  script_node.src = path;
  return new Promise(function(resolve)
  {
    script_node.onload = resolve;
  });
}
function rcn_load_scripts(scripts)
{
  var script_promises = [];
  scripts.forEach(function(script)
  {
    script_promises.push(rcn_load_script(script));  
  });
  return Promise.all(script_promises);
}
function rcn_load_style(name)
{
  // TODO: keep array of style promises
  var path = 'src/css/'+style+'.css';
  var style_node = rcn_add_head_node('link');
  style_node.rel = 'stylesheet';
  style_node.media = 'screen';
  style_node.type = 'text/css';
  style_node.href = path;
}

document.title = 'raccoon';
