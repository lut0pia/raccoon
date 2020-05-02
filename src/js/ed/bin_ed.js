// Raccoon bin browser
'use strict';

function rcn_bin_ed() {
  rcn_bin_ed.prototype.__proto__ = rcn_window.prototype;
  rcn_window.call(this);

  const bin_ed = this;

  // Create name input
  this.name_input = document.createElement('input');
  this.name_input.type = 'text';
  this.name_input.placeholder = 'Save name';
  this.name_input.oninput = function() {
    rcn_global_bin.name = this.value;
    bin_ed.update_bin_save_status();
  }
  this.add_child(this.name_input);

  // Create name input
  this.display_name_input = document.createElement('input');
  this.display_name_input.type = 'text';
  this.display_name_input.placeholder = 'Display name';
  this.display_name_input.oninput = function() {
    rcn_global_bin.display_name = this.value;
    bin_ed.update_bin_save_status();
  }
  this.add_child(this.display_name_input);

  // Create host select
  this.host_select = document.createElement('select');
  this.host_select.onchange = function() {
    rcn_global_bin.host = this.value == 'undefined' ? undefined : this.value;
    rcn_dispatch_ed_event('rcn_bin_change');
  }
  const none_option = document.createElement('option');
  none_option.innerText = 'None';
  none_option.value = 'undefined';
  this.host_select.appendChild(none_option);
  for(let host_id in rcn_hosts) {
    const option = document.createElement('option');
    option.innerText = host_id;
    option.value = host_id;
    this.host_select.appendChild(option);
  }
  this.add_child(this.host_select);

  // Create link input
  this.link_input = document.createElement('input');
  this.link_input.type = 'text';
  this.link_input.placeholder = 'Link';
  this.link_input.onchange = function() {
    rcn_global_bin.link = this.value == '' ? undefined : this.value;
    rcn_dispatch_ed_event('rcn_bin_change');
  }
  this.add_child(this.link_input);

  this.add_child(document.createElement('br'));

  // Create new button
  this.add_child(this.new_button = rcn_ui_button({
    value: 'New',
    onclick: function() {
      bin_ed.change_bin(new rcn_bin());
    },
  }));

  // Create save button
  this.add_child(this.save_button = rcn_ui_button({
    value: 'Save',
    onclick: function() {
      bin_ed.save_bin();
    },
  }));

  // Create sync button
  this.add_child(this.sync_button = rcn_ui_button({
    value: 'Sync',
    onclick: function() {
      bin_ed.sync_bin();
    },
  }));

  // Create push button
  this.add_child(this.push_button = rcn_ui_button({
    value: 'Push',
    onclick: function() {
      bin_ed.push_bin();
    },
  }));

  // Create pull button
  this.add_child(this.pull_button = rcn_ui_button({
    value: 'Pull',
    onclick: function() {
      bin_ed.pull_bin();
    },
  }));

  // Create download as json button
  this.add_child(this.download_json_button = rcn_ui_button({
    value: 'Download as json',
    onclick: function() {
      rcn_download_file({
        file_name: rcn_global_bin.name + '.rcn.json',
        content: rcn_global_bin.to_json_text(),
      });
    },
  }));

  // Create download as html button
  this.add_child(this.download_html_button = rcn_ui_button({
    value: 'Download as html',
    onclick: async function() {
      rcn_download_file({
        file_name: rcn_global_bin.name + '.rcn.html',
        content: await bin_ed.bin_to_html(),
      });
    },
  }));

  // Create file input
  this.file_input = document.createElement('input');
  this.file_input.type = 'file';
  this.file_input.onchange = async function(e) {
    if(this.files.length>0) {
      const file = this.files[0];
      if(file.name.match(/\.rcn\.json$/i)) { // It's a text format
        const file_reader = new FileReader();
        file_reader.onload = function() {
          const bin = new rcn_bin();
          bin.from_json(JSON.parse(this.result));
          bin_ed.change_bin(bin);
        }
        file_reader.readAsText(file);
      } else {
        await rcn_ui_alert('Unable to load file: '+file.name);
      }
    }
    this.value = null;
  }
  this.add_child(this.file_input);

  this.addEventListener('rcn_bin_change', function() { // Update name input on bin change
    bin_ed.update_bin_save_status();
    bin_ed.update_name_input();
    bin_ed.update_host_select();
    bin_ed.update_link_input();
  });
  this.addEventListener('rcn_bins_change', function() {
    bin_ed.update_bin_save_status();
    bin_ed.refresh_bins_ui();
  });

  this.update_bin_save_status();
  this.update_name_input();
  this.update_host_select();
  this.update_link_input();
  this.refresh_bins_ui();
}

rcn_bin_ed.prototype.title = 'Bin Browser';
rcn_bin_ed.prototype.docs_link = 'bin-browser';
rcn_bin_ed.prototype.type = 'bin_ed';

rcn_bin_ed.prototype.save_bin = function() {
  rcn_log('Saving bin: '+rcn_global_bin.name);
  rcn_storage.bins[rcn_global_bin.name] = rcn_global_bin.to_json();
  rcn_dispatch_ed_event('rcn_bins_change');
}

rcn_bin_ed.prototype.change_bin = async function(new_bin) {
  if(rcn_global_bin != new_bin && !await rcn_confirm_bin_override()) {
    return;
  }
  rcn_global_bin = new_bin;
  rcn_dispatch_ed_event('rcn_bin_change',{
    begin: 0,
    end: rcn.rom_size,
    code: true,
    load: true,
  });
}

rcn_bin_ed.prototype.check_host_for_bin = async function(bin) {
  let host = null;
  for(let host_id in rcn_hosts) {
    if(bin.host == host_id) {
      host = rcn_hosts[host_id];
    }
  }

  if(!host) {
    await rcn_ui_alert('No valid host for bin '+bin.name);
  } else if(!bin.link) {
    await rcn_ui_alert('No valid link for bin '+bin.name);
    host = null;
  }

  return host;
}

rcn_bin_ed.prototype.sync_bin = async function() {
  let host = await this.check_host_for_bin(rcn_global_bin);
  if(!host) return;

  rcn_overlay_push();
  try {
    const bin_name = rcn_global_bin.name;
    await host.sync_bin(rcn_global_bin);
    rcn_global_bin.name = bin_name;
    this.change_bin(rcn_global_bin); // Simple way to force complete bin reload
  } catch(e) {
    await rcn_ui_alert('Failed to sync bin ' + rcn_global_bin.name + ': ' + e);
  } finally {
    rcn_overlay_pop();
  }
}

rcn_bin_ed.prototype.push_bin = async function() {
  let host = await this.check_host_for_bin(rcn_global_bin);
  if(!host) return;

  if(!await rcn_ui_confirm(
  'Are you sure you want to push bin ' + rcn_global_bin.name + ' to ' + rcn_global_bin.link + '? '
  +'This is a destructive action.')) {
    return;
  }
  rcn_overlay_push();
  try {
    const bin = await host.push_bin(rcn_global_bin);
    bin.name = rcn_global_bin.name;
    this.change_bin(bin);
  } catch(e) {
    await rcn_ui_alert('Failed to push bin ' + rcn_global_bin.name + ': ' + e);
  } finally {
    rcn_overlay_pop();
  }
}

rcn_bin_ed.prototype.pull_bin = async function() {
  let host = await this.check_host_for_bin(rcn_global_bin);
  if(!host) return;

  rcn_overlay_push();
  try {
    const bin = await host.pull_bin(rcn_global_bin.link);
    bin.name = rcn_global_bin.name;
    this.change_bin(bin);
  } catch(e) {
    await rcn_ui_alert('Failed to pull bin ' + rcn_global_bin.name + ': ' + e);
  } finally {
    rcn_overlay_pop();
  }
}

rcn_bin_ed.prototype.delete_bin = function(bin_name) {
  delete rcn_storage.bins[bin_name];
  rcn_dispatch_ed_event('rcn_bins_change');
}

rcn_bin_ed.prototype.bin_to_html = async function() {
  let scripts = await Promise.all([
    rcn_xhr('src/js/init.js'), // This needs to stay at the beginning
    rcn_xhr('src/js/audio.js'),
    rcn_xhr('src/js/bin.js'),
    rcn_xhr('src/js/canvas.js'),
    rcn_xhr('src/js/game.js'),
    rcn_xhr('src/js/gl.js'),
    rcn_xhr('src/js/utility.js'),
    rcn_xhr('src/js/vm.js'),
    rcn_xhr('src/js/vm_worker.js'),
  ]);
  let styles = await Promise.all([
    rcn_xhr('src/css/reset.css'),
    rcn_xhr('src/css/game.css'),
    rcn_xhr('src/css/export.css'),
  ]);

  let resources = await Promise.all([
    'src/img/control_axes.svg',
    'src/img/control_buttons.svg',
  ].map(async function(url) {
    const mime = {
      svg: 'image/svg+xml',
    }[url.split('.').pop()];
    return 'rcn_resources[' + JSON.stringify(url) + '] = '
    + 'URL.createObjectURL(new Blob('
    + '[' + JSON.stringify(await rcn_xhr(url)) + '],'
    + '{type: ' + JSON.stringify(mime) + '}));';
  }));

  let script = document.createElement('script');
  script.type = 'text/javascript';
  script.innerHTML =
    'const rcn_static_bin_json = ' + JSON.stringify(rcn_global_bin.to_json()) + '\n'
    + scripts.join('\n') + '\n'
    + resources.join('\n');

  let style = document.createElement('style');
  style.type = 'text/css';
  style.innerHTML = styles.join('\n');

  let html = document.createElement('html');
  let head = document.createElement('head');
  let charset_meta = document.createElement('meta');
  charset_meta.setAttribute('charset', 'UTF-8');

  head.appendChild(charset_meta);
  head.appendChild(script);
  head.appendChild(style);
  html.appendChild(head);
  return html.outerHTML;
}

rcn_bin_ed.prototype.refresh_bins_ui = function() {
  // Clear bin UI container
  if(this.bin_node) {
    this.bin_node.parentNode.removeChild(this.bin_node);
  }

  const bin_ed = this;
  this.bin_node = document.createElement('div');
  for(let stored_bin of Object.values(rcn_storage.bins)) {
    const bin_node = document.createElement('article');

    const bin_name = document.createElement('span');
    bin_name.innerText = stored_bin.name;
    bin_node.appendChild(bin_name);

    bin_node.appendChild(rcn_ui_button({
      value: 'Load',
      onclick: function() {
        const bin = new rcn_bin();
        bin.from_json(stored_bin);
        bin_ed.change_bin(bin);
      },
    }));
    bin_node.appendChild(rcn_ui_button({
      value: 'Delete',
      onclick: async function() {
        if(await rcn_ui_confirm('Are you sure you want to delete '+stored_bin.name+'?')) {
          bin_ed.delete_bin(stored_bin.name);
        }
      },
    }));

    if(stored_bin.host && stored_bin.link) {
      // This is a hosted bin
      const bin_host = document.createElement('span');
      bin_host.classList.add('host');
      bin_host.innerText += '('+stored_bin.host+'/'+stored_bin.link+')';
      bin_node.appendChild(bin_host);
    }

    bin_ed.bin_node.appendChild(bin_node);
  }
  this.add_child(this.bin_node);
}

rcn_bin_ed.prototype.update_name_input = function() {
  this.name_input.value = rcn_global_bin.name;
  this.display_name_input.value = rcn_global_bin.display_name;
}

rcn_bin_ed.prototype.update_bin_save_status = function() {
  const save_status = rcn_bin_save_status();
  this.name_input.style.backgroundColor = {
    saved: 'white',
    unsaved: '#faa',
    new: '#faa',
    default: 'white',
  }[save_status];

  this.save_button.style.fontWeight = {
    saved: 'normal',
    unsaved: 'normal',
    new: 'bold',
    default: 'normal',
  }[save_status];
}

rcn_bin_ed.prototype.update_host_select = function() {
  this.host_select.value = rcn_global_bin.host || 'undefined';
}

rcn_bin_ed.prototype.update_link_input = function() {
  this.link_input.value = rcn_global_bin.link || '';
}

rcn_editors.push(rcn_bin_ed);
