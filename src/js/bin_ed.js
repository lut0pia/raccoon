// Raccoon bin browser

rcn_bin_ed.prototype = Object.create(rcn_window.prototype);
function rcn_bin_ed() {
  rcn_window.call(this, 'bin_ed', 'Bin Browser');

  var bin_ed = this;

  // Create new button
  this.new_button = document.createElement('input');
  this.new_button.type = 'button';
  this.new_button.value = 'New';
  this.new_button.onclick = function() {
    bin_ed.change_bin(new rcn_bin());
  };
  this.add_child(this.new_button);

  // Create name input
  this.name_input = document.createElement('input');
  this.name_input.type = 'text';
  this.name_input.placeholder = 'Bin name';
  this.name_input.onchange = function() { // Update bin name on input change
    rcn_global_bin.name = this.value;
  }
  this.addEventListener('rcnbinchange', function() { // Update name input on bin change
    bin_ed.name_input.value = rcn_global_bin.name;
  });
  this.add_child(this.name_input);

  // Create save button
  this.save_button = document.createElement('input');
  this.save_button.type = 'button';
  this.save_button.value = 'Save';
  this.save_button.onclick = function() {
    bin_ed.save_bin();
  }
  this.add_child(this.save_button);

  // Create download button
  this.download_button = document.createElement('input');
  this.download_button.type = 'button';
  this.download_button.value = 'Download';
  this.download_button.onclick = function() {
    var bin_json = rcn_global_bin.to_json();
    var bin_text = JSON.stringify(bin_json, null, 2);

    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(bin_text));
    element.setAttribute('download', rcn_global_bin.name+".rcn.json");

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
  }
  this.add_child(this.download_button);

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
  try {
    localStorage.rcn_bins = JSON.stringify(this.bins.map(function(bin) {
      return bin.to_json();
    }));
  } catch(e) {
    rcn_log('Could not save bins to storage!');
    console.log(e);
  }
}

rcn_bin_ed.prototype.load_bins_from_storage = function() {
  try {
    this.bins = JSON.parse(localStorage.rcn_bins || '[]').map(function(bin_json) {
      var bin = new rcn_bin();
      try {
        bin_json = JSON.parse(bin_json);
      } catch(e) {}
      bin.from_json(bin_json);
      return bin;
    });
  } catch(e) {
    rcn_log('Could not load bins from storage!');
    console.log(e);
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
  this.add_child(this.bin_node);
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
    if(confirm('Are you sure you want to delete '+bin.name+'?')) {
      bin_ed.delete_bin(bin_index);
    }
  }
  p.appendChild(delete_button);
  this.bin_node.appendChild(p);
}
