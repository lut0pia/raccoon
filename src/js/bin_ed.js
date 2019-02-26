// Raccoon bin browser

function rcn_bin_ed() {
  this.__proto__.__proto__ = rcn_window.prototype;
  rcn_window.call(this);

  var bin_ed = this;

  // Create new button
  this.add_child(this.new_button = rcn_ui_button({
    value: 'New',
    onclick: function() {
      bin_ed.change_bin(new rcn_bin());
    },
  }));

  // Create name input
  this.name_input = document.createElement('input');
  this.name_input.type = 'text';
  this.name_input.placeholder = 'Bin name';
  this.name_input.onchange = function() { // Update bin name on input change
    rcn_global_bin.name = this.value;
  }
  this.addEventListener('rcnbinchange', function() { // Update name input on bin change
    bin_ed.update_bin_name();
  });
  this.add_child(this.name_input);

  // Create save button
  this.add_child(this.save_button = rcn_ui_button({
    value: 'Save',
    onclick: function() {
      bin_ed.save_bin();
    },
  }));

  // Create download as json button
  this.add_child(this.download_json_button = rcn_ui_button({
    value: 'Download as json',
    onclick: function() {
      rcn_download_file({
        file_name: rcn_global_bin.name + '.rcn.json',
        content: JSON.stringify(rcn_global_bin.to_json(), null, 2),
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

  this.load_bins_from_storage();
  this.update_bin_name();
  this.refresh_bins_ui();
}

rcn_bin_ed.prototype.title = 'Bin Browser';
rcn_bin_ed.prototype.docs_link = 'bin-browser';
rcn_bin_ed.prototype.type = 'bin_ed';
rcn_bin_ed.prototype.unique = true;

rcn_bin_ed.prototype.save_bin = function() {
  var bin_clone = rcn_global_bin.clone();
  rcn_log('Saving bin: '+bin_clone.name);
  var save_index = this.bins.findIndex(function(bin) {
    return bin.name == rcn_global_bin.name;
  });
  if(save_index < 0) {
    rcn_log('Creating new saved bin: '+bin_clone.name);
    this.bins.push(bin_clone);
    this.add_bin_ui(this.bins.length-1);
  }
  else {
    rcn_log('Overwriting old bin: '+bin_clone.name);
    this.bins[save_index] = bin_clone;
  }
  this.save_bins_to_storage();
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

rcn_bin_ed.prototype.delete_bin = function(bin_index) {
  this.bins.splice(bin_index, 1);
  this.refresh_bins_ui();
  this.save_bins_to_storage();
}

rcn_bin_ed.prototype.save_bins_to_storage = function() {
  rcn_storage.bins = this.bins.map(function(bin) {
    return bin.to_json();
  });
}

rcn_bin_ed.prototype.load_bins_from_storage = function() {
  var json_bins = rcn_storage.bins;
  if(!json_bins) {
    // Try old path
    try {
      json_bins = JSON.parse(localStorage.rcn_bins || '[]')
    } catch(e) {
      json_bins = [];
    }
  }

  this.bins = json_bins.map(function(bin_json) {
    var bin = new rcn_bin();
    try {
      bin_json = JSON.parse(bin_json);
    } catch(e) {}
    bin.from_json(bin_json);
    return bin;
  });
}

rcn_bin_ed.prototype.refresh_bins_ui = function() {
  if(this.bin_node) {
    this.bin_node.parentNode.removeChild(this.bin_node);
  }

  this.bin_node = document.createElement('div');
  for(var i in this.bins) {
    this.add_bin_ui(i);
  }
  this.add_child(this.bin_node);
}

rcn_bin_ed.prototype.add_bin_ui = function(bin_index) {
  var bin_ed = this;
  var bin = this.bins[bin_index];
  var p = document.createElement('p');
  p.innerText = bin.name;
  p.appendChild(rcn_ui_button({
    value: 'Load',
    onclick: function() {
      bin_ed.change_bin(bin_ed.bins[bin_index].clone());
    },
  }));
  p.appendChild(rcn_ui_button({
    value: 'Delete',
    onclick: function() {
      if(confirm('Are you sure you want to delete '+bin.name+'?')) {
        bin_ed.delete_bin(bin_index);
      }
    },
  }));
  this.bin_node.appendChild(p);
}

rcn_bin_ed.prototype.update_bin_name = function() {
  this.name_input.value = rcn_global_bin.name;
}

rcn_editors.push(rcn_bin_ed);
