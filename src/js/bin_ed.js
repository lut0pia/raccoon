// Raccoon bin browser

function rcn_bin_ed() {
  this.window = new rcn_window('bin_ed', 'Bin Browser');
  this.onbinchange = [];

  var bin_ed = this;

  // Create new button
  this.new_button = document.createElement('input');
  this.new_button.type = 'button';
  this.new_button.value = 'New';
  this.new_button.onclick = function() {
    bin_ed.change_bin(new rcn_bin());
  };
  this.window.add_child(this.new_button);

  // Create name input
  this.name_input = document.createElement('input');
  this.name_input.type = 'text';
  this.name_input.placeholder = 'Bin name';
  this.name_input.onchange = function() { // Update bin name on input change
    rcn_global_bin.name = this.value;
  }
  this.onbinchange.push(function(bin) { // Update name input on bin change
    bin_ed.name_input.value = bin.name;
  });
  this.window.add_child(this.name_input);

  // Create save button
  this.save_button = document.createElement('input');
  this.save_button.type = 'button';
  this.save_button.value = 'Save';
  this.save_button.onclick = function() {
    bin_ed.save_bin();
  }
  this.window.add_child(this.save_button);

  // Create download button
  this.download_button = document.createElement('input');
  this.download_button.type = 'button';
  this.download_button.value = 'Download';
  this.download_button.onclick = function() {
    var bin_json = rcn_global_bin.save_to_json();
    var bin_text = JSON.stringify(bin_json, null, 2);

    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(bin_text));
    element.setAttribute('download', rcn_global_bin.name+".rcn.json");

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
  }
  this.window.add_child(this.download_button);

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
          bin.load_from_json(JSON.parse(this.result));
          bin_ed.change_bin(bin);
        }
        file_reader.readAsText(file);
      } else {
        alert('Unable to load file: '+file.name);
      }
    }
    this.value = null;
  }
  this.window.add_child(this.file_input);

  this.load_from_storage();
  this.refresh_bins_ui();
}

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
  this.save_to_storage();
}

rcn_bin_ed.prototype.change_bin = function(new_bin) {
  rcn_global_bin = new_bin;
  this.onbinchange.forEach(function(f) { f(new_bin); });
}

rcn_bin_ed.prototype.delete_bin = function(bin_index) {
  this.bins.splice(bin_index, 1);
  this.refresh_bins_ui();
  this.save_to_storage();
}

rcn_bin_ed.prototype.save_to_storage = function() {
  try {
    localStorage.rcn_bins = JSON.stringify(this.bins.map(function(bin) {
      return bin.save_to_json();
    }));
  } catch(e) {
    rcn_log('Could not save bins to storage!');
  }
}

rcn_bin_ed.prototype.load_from_storage = function() {
  try {
    this.bins = JSON.parse(localStorage.rcn_bins || '[]').map(function(bin_json) {
      var bin = new rcn_bin();
      try {
        bin.load_from_json(JSON.parse(bin_json));
      } catch(e) {
        bin.load_from_json(bin_json);
      }
      return bin;
    });
  } catch(e) {
    rcn_log('Could not load bins from storage!');
    this.bins = [];
  }
}

rcn_bin_ed.prototype.refresh_bins_ui = function() {
  if(this.bin_node) {
    this.bin_node.parentNode.removeChild(this.bin_node);
  }

  this.bin_node = document.createElement('div');
  for(var i in this.bins) {
    this.add_bin_ui(i);
  }
  this.window.add_child(this.bin_node);
}

rcn_bin_ed.prototype.add_bin_ui = function(bin_index) {
  var bin_ed = this;
  var bin = this.bins[bin_index];
  var p = document.createElement('p');
  p.innerText = bin.name;
  var load_button = document.createElement('input');
  load_button.type = 'button';
  load_button.value = 'Load';
  load_button.onclick = function() {
    bin_ed.change_bin(bin_ed.bins[bin_index].clone());
  }
  p.appendChild(load_button);
  var delete_button = document.createElement('input');
  delete_button.type = 'button';
  delete_button.value = 'Delete';
  delete_button.onclick = function() {
    bin_ed.delete_bin(bin_index);
  }
  p.appendChild(delete_button);
  this.bin_node.appendChild(p);
}
