// Paws are containers for raccoon software
// They can be saved, shared, and loaded into a raccoon VM

const rcn_paw_byte_size = 32 * 1024;

function rcn_paw() {
  this.source = '';
  this.rom = new Uint8Array(rcn_paw_byte_size);
}

rcn_paw.prototype.load_from_text = function(text) {
  // TODO
}

rcn_paw.prototype.save_to_text = function() {
  // TODO
}
