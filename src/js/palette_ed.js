// Raccoon palette editor

rcn_palette_ed.prototype = Object.create(rcn_window.prototype);
function rcn_palette_ed() {
  rcn_window.call(this, 'palette_ed', 'Palette Editor');

  var palette_ed = this;

  // Create color inputs
  this.color_inputs = [];
  for(var i=0; i<8; i++) {
    var color_input_id = 'color_input_'+i;
    var color_label = document.createElement('label');
    color_label.innerText = i;
    color_label.htmlFor = color_input_id;
    this.add_child(color_label);

    var color_input = document.createElement('input');
    color_input.type = 'color';
    color_input.id = color_input_id;
    color_input.onchange = function() {
      // Update bin's palette with UI palette
      rcn_global_bin.patch_memory(palette_ed.to_palette_bytes(), rcn.ram_palette_offset);
    }

    this.color_inputs.push(color_input);
    this.add_child(color_input);
  }

  // Create apply button
  this.apply_button = document.createElement('input');
  this.apply_button.type = 'button';
  this.apply_button.value = 'Apply';
  this.add_child(this.apply_button);

  this.apply_button.onclick = function() {
    // Update VM palette with UI palette
    rcn_global_vm.load_memory(palette_ed.to_palette_bytes(), rcn.ram_palette_offset);
  }

  this.addEventListener('rcnbinchange', function(e) {
    const ram_palette_begin = rcn.ram_palette_offset;
    const ram_palette_end = rcn.ram_palette_offset + rcn.ram_palette_size;
    if(e.detail.begin < ram_palette_end && e.detail.end > ram_palette_begin) {
      // Update UI palette with bin's palette
      palette_ed.from_palette_bytes(rcn_global_bin.rom.slice(rcn.ram_palette_offset, rcn.ram_palette_offset + rcn.ram_palette_size));
    }
  });
}

rcn_palette_ed.prototype.from_palette_bytes = function(palette_bytes) {
  for(var i=0; i<8; i++) {
    var rgb_str = '#'
    for(var j=0; j<3; j++) {
      rgb_str += ('00'+palette_bytes[i*3+j].toString(16)).slice(-2);
    }
    this.color_inputs[i].value = rgb_str;
  }
}

rcn_palette_ed.prototype.to_palette_bytes = function() {
  var palette_bytes = new Uint8Array(rcn.ram_palette_size); // 8 RGB values
  for(var i=0; i<8; i++) {
    var rgb_int = parseInt(this.color_inputs[i].value.slice(1), 16);
    palette_bytes[i*3+0] = (rgb_int>>16);
    palette_bytes[i*3+1] = (rgb_int>>8) & 0xff;
    palette_bytes[i*3+2] = rgb_int & 0xff;
  }
  return palette_bytes;
}
