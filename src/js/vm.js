function rcn_vm() {

}

rcn_vm.prototype.load_paw = function(paw) {
  this.ram = paw.rom.slice();
}
