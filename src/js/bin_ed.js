// Raccoon bin browser

function rcn_bin_ed() {
  this.__proto__.__proto__ = rcn_window.prototype;
  rcn_window.call(this);

  var bin_ed = this;

  // Create name input
  this.name_input = document.createElement('input');
  this.name_input.type = 'text';
  this.name_input.placeholder = 'Bin name';
  this.name_input.onchange = function() { // Update bin name on input change
    rcn_global_bin.name = this.value;
  }
  this.add_child(this.name_input);

  // Create host select
  this.host_select = document.createElement('select');
  this.host_select.onchange = function() {
    rcn_global_bin.host = this.value == 'undefined' ? undefined : this.value;
    rcn_dispatch_ed_event('rcnbinchange');
  }
  var none_option = document.createElement('option');
  none_option.innerText = 'None';
  none_option.value = 'undefined';
  this.host_select.appendChild(none_option);
  for(var host_id in rcn_hosts) {
    var option = document.createElement('option');
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
    rcn_dispatch_ed_event('rcnbinchange');
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
    onclick: function() {
      rcn_global_bin.to_html().then(function(html) {
        rcn_download_file({
          file_name: rcn_global_bin.name + '.rcn.html',
          content: html,
        });
      });
    },
  }));

  // Create file input
  this.file_input = document.createElement('input');
  this.file_input.type = 'file';
  this.file_input.onchange = function(e) {
    if(this.files.length>0) {
      var file = this.files[0];
      if(file.name.match(/\.rcn\.json$/i)) { // It's a text format
        var file_reader = new FileReader();
        file_reader.onload = function() {
          var bin = new rcn_bin();
          bin.from_json(JSON.parse(this.result));
          bin_ed.change_bin(bin);
        }
        file_reader.readAsText(file);
      } else {
        alert('Unable to load file: '+file.name);
      }
    }
    this.value = null;
  }
  this.add_child(this.file_input);

  this.addEventListener('rcnbinchange', function() { // Update name input on bin change
    bin_ed.update_name_input();
    bin_ed.update_host_select();
    bin_ed.update_link_input();
  });
  this.addEventListener('rcnbinschange', function() {
    bin_ed.refresh_bins_ui();
  });

  this.update_name_input();
  this.update_host_select();
  this.update_link_input();
  this.refresh_bins_ui();
}

rcn_bin_ed.prototype.title = 'Bin Browser';
rcn_bin_ed.prototype.docs_link = 'bin-browser';
rcn_bin_ed.prototype.type = 'bin_ed';
rcn_bin_ed.prototype.unique = true;

rcn_bin_ed.prototype.save_bin = function() {
  rcn_log('Saving bin: '+rcn_global_bin.name);
  if(!rcn_storage.bins) {
    rcn_storage.bins = [];
  }
  const save_index = rcn_storage.bins.findIndex(function(bin) {
    return bin.name == rcn_global_bin.name;
  });
  if(save_index < 0) {
    rcn_log('Creating new saved bin: '+rcn_global_bin.name);
    rcn_storage.bins.push(rcn_global_bin.to_json());
  }
  else {
    rcn_log('Overwriting old bin: '+rcn_global_bin.name);
    rcn_storage.bins[save_index] = rcn_global_bin.to_json();
  }
  rcn_dispatch_ed_event('rcnbinschange');
}

rcn_bin_ed.prototype.change_bin = function(new_bin) {
  rcn_global_bin = new_bin;
  rcn_dispatch_ed_event('rcnbinchange',{
    begin: 0,
    end: rcn.rom_size,
    code: true,
    load: true,
  });
}

rcn_bin_ed.prototype.check_host_for_bin = function(bin) {
  let host = null;
  for(let host_id in rcn_hosts) {
    if(bin.host == host_id) {
      host = rcn_hosts[host_id];
    }
  }

  if(!host) {
    alert('No valid host for bin '+bin.name);
  } else if(!bin.link) {
    alert('No valid link for bin '+bin.name);
    host = null;
  }

  return host;
}

rcn_bin_ed.prototype.sync_bin = function() {
  let host = this.check_host_for_bin(rcn_global_bin);
  if(!host) return;

  rcn_overlay_push();

  let bin_ed = this;
  host.sync_bin_with_link(rcn_global_bin).then(function() {
    bin_ed.change_bin(rcn_global_bin); // Simple way to force complete bin reload
  }).catch(function(reason) {
    alert('Failed to sync bin '+rcn_global_bin.name+': '+reason);
  }).finally(function() {
    rcn_overlay_pop();
  });
}

rcn_bin_ed.prototype.pull_bin = function() {
  let host = this.check_host_for_bin(rcn_global_bin);
  if(!host) return;

  rcn_overlay_push();

  let bin_ed = this;
  host.pull_bin_from_link(rcn_global_bin, rcn_global_bin.link).then(function() {
    bin_ed.change_bin(rcn_global_bin); // Simple way to force complete bin reload
  }).catch(function(reason) {
    alert('Failed to pull bin '+rcn_global_bin.name+': '+reason);
  }).finally(function() {
    rcn_overlay_pop();
  });
}

rcn_bin_ed.prototype.delete_bin = function(bin_name) {
  const bin_index = rcn_storage.bins.findIndex(function(bin) {
    return bin.name == bin_name;
  });
  rcn_storage.bins.splice(bin_index, 1);
  rcn_dispatch_ed_event('rcnbinschange');
}

rcn_bin_ed.prototype.refresh_bins_ui = function() {
  // Clear bin UI container
  if(this.bin_node) {
    this.bin_node.parentNode.removeChild(this.bin_node);
  }

  var bin_ed = this;
  this.bin_node = document.createElement('div');
  (rcn_storage.bins || []).forEach(function(stored_bin) {
    var bin_node = document.createElement('article');

    var bin_name = document.createElement('span');
    bin_name.innerText = stored_bin.name;
    bin_node.appendChild(bin_name);

    bin_node.appendChild(rcn_ui_button({
      value: 'Load',
      onclick: function() {
        var bin = new rcn_bin();
        bin.from_json(stored_bin);
        bin_ed.change_bin(bin);
      },
    }));
    bin_node.appendChild(rcn_ui_button({
      value: 'Delete',
      onclick: function() {
        if(confirm('Are you sure you want to delete '+stored_bin.name+'?')) {
          bin_ed.delete_bin(stored_bin.name);
        }
      },
    }));

    if(stored_bin.host && stored_bin.link) {
      // This is a hosted bin
      var bin_host = document.createElement('span');
      bin_host.classList.add('host');
      bin_host.innerText += '('+stored_bin.host+'/'+stored_bin.link+')';
      bin_node.appendChild(bin_host);
    }

    bin_ed.bin_node.appendChild(bin_node);
  });
  this.add_child(this.bin_node);
}

rcn_bin_ed.prototype.update_name_input = function() {
  this.name_input.value = rcn_global_bin.name;
}

rcn_bin_ed.prototype.update_host_select = function() {
  this.host_select.value = rcn_global_bin.host || 'undefined';
}

rcn_bin_ed.prototype.update_link_input = function() {
  this.link_input.value = rcn_global_bin.link || '';
}

rcn_editors.push(rcn_bin_ed);
