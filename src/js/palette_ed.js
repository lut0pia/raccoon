// Raccoon palette editor

function rcn_palette_ed() {
  this.window = new rcn_window('palette_ed', 'Palette Editor');
  
  // Create color inputs
  this.color_inputs = [];
  for(var i=0; i<16; i++) {
    var color_input = document.createElement('input');
    color_input.type = 'color';
    
    this.color_inputs.push(color_input);
    this.window.add_child(color_input);
  }

  // Create apply button
  this.apply_button = document.createElement('input');
  this.apply_button.type = 'button';
  this.apply_button.value = 'Apply';
  this.window.add_child(this.apply_button);

  var palette_ed = this;
  this.apply_button.onclick = function() {
    var palette_bytes = new Uint8Array(16*3); // 16 RGB values
    for(var i=0; i<16; i++) {
      var rgb_int = parseInt(palette_ed.color_inputs[i].value.slice(1), 16);
      palette_bytes[i*3+0] = (rgb_int>>16);
      palette_bytes[i*3+1] = (rgb_int>>8) & 0xff;
      palette_bytes[i*3+2] = rgb_int & 0xff;
    }
    rcn_global_vm.load_memory(palette_bytes, 0x4000);
  }
}
