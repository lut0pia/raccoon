// Bins are containers for raccoon software
// They can be saved, shared, and loaded into a raccoon VM

const rcn_paw_byte_size = 24 * 1024;

function rcn_bin() {
  this.name = 'Untitled';
  this.code = '';
  this.rom = new Uint8Array(rcn_paw_byte_size);
}

rcn_bin.prototype.load_from_text = function(text) {
  // TODO
}

rcn_bin.prototype.save_to_text = function() {
  // TODO
}
