// Raccoon palette editor

function rcn_palette_ed() {
  this.window = new rcn_window('palette_ed', 'Palette Editor');
  
  var palette_ed = this;

  // Create color inputs
  this.color_inputs = [];
  for(var i=0; i<8; i++) {
    var color_input = document.createElement('input');
    color_input.type = 'color';
    color_input.onchange = function() {
      // Update bin's palette with UI palette
      rcn_global_bin.patch_memory(palette_ed.to_palette_bytes(), rcn_const.ram_palette_offset);
    }
    color_input.setAttribute('data-content', i); // Use for overlay number
    
    this.color_inputs.push(color_input);
    this.window.add_child(color_input);
  }

  // Create apply button
  this.apply_button = document.createElement('input');
  this.apply_button.type = 'button';
  this.apply_button.value = 'Apply';
  this.window.add_child(this.apply_button);

  this.apply_button.onclick = function() {
    // Update VM palette with UI palette
    rcn_global_vm.load_memory(palette_ed.to_palette_bytes(), rcn_const.ram_palette_offset);
  }

  rcn_global_bin_ed.onbinchange.push(function(bin) {
    // Update UI palette with bin's palette
    palette_ed.from_palette_bytes(bin.rom.slice(rcn_const.ram_palette_offset, rcn_const.ram_palette_offset + rcn_const.ram_palette_size));
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
  var palette_bytes = new Uint8Array(rcn_const.ram_palette_size); // 8 RGB values
  for(var i=0; i<8; i++) {
    var rgb_int = parseInt(this.color_inputs[i].value.slice(1), 16);
    palette_bytes[i*3+0] = (rgb_int>>16);
    palette_bytes[i*3+1] = (rgb_int>>8) & 0xff;
    palette_bytes[i*3+2] = rgb_int & 0xff;
  }
  return palette_bytes;
}
