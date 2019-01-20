// Bins are containers for raccoon software
// They can be saved, shared, and loaded into a raccoon VM

const rcn_paw_byte_size = 24 * 1024;

function rcn_bin() {
  this.name = 'Untitled';
  this.code = '';
  this.rom = new Uint8Array(rcn_paw_byte_size);
}

rcn_bin.prototype.clone = function() {
  var bin_clone = new rcn_bin();
  bin_clone.name = this.name;
  bin_clone.code = this.code;
  bin_clone.rom = this.rom.slice();
  return bin_clone;
}

rcn_bin.prototype.load_from_text = function(text) {
  var bin = JSON.parse(text);
  if(bin.version == 1) {
    this.name = bin.name;
    this.code = bin.code;
    for(var i=0; i<rcn_paw_byte_size; i++) {
      this.rom[i] = parseInt(bin.rom.substr(i*2, 2), 16);
    }
  } else {
    console.log('Unable to read bin with version: '+bin.version);
  }
}

rcn_bin.prototype.save_to_text = function() {
  var romhex = '';

  this.rom.forEach(function(byte) {
    romhex += ('00'+byte.toString(16)).slice(-2);
  });

  return JSON.stringify({
    name: this.name,
    version: 1,
    code: this.code,
    rom: romhex,
  });
}

rcn_bin.prototype.patch_memory = function(bytes, offset) {
  for(var i=0; i<bytes.byteLength; i++) {
    this.rom[offset+i] = bytes[i];
  }
}
