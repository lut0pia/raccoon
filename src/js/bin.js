// Bins are containers for raccoon software
// They can be saved, shared, and loaded into a raccoon VM

function rcn_bin() {
  this.name = 'Untitled';
  this.code = '';
  this.rom = new Uint8Array(rcn.rom_size);
}

rcn_bin.prototype.clone = function() {
  var bin_clone = new rcn_bin();
  bin_clone.name = this.name;
  bin_clone.code = this.code;
  bin_clone.rom = this.rom.slice();
  return bin_clone;
}

rcn_bin.prototype.from_json = function(bin) {
  if(bin.version <= 2) {
    this.name = bin.name;

    if(typeof bin.code == 'string') { // Old one string version
      this.code = bin.code;
    } else { // Array of lines version
      var code = '';
      bin.code.forEach(function(line) {
        code += line + '\n';
      });
      this.code = code;
    }

    var hex_to_rom = function(rom, offset, size, hex_lines) {
      for(var i=0; i<size; i++) {
        rom[offset+i] = parseInt(hex_lines[Math.floor(i/64)].substr((i%64)*2, 2), 16);
      }
    }
    if(typeof bin.rom == 'string') { // Old one string version
      for(var i=0; i<rcn.rom_size; i++) {
        this.rom[i] = parseInt(bin.rom.substr(i*2, 2), 16);
      }
    } else {
      if(bin.rom.spr) {
        hex_to_rom(this.rom, rcn.mem_spritesheet_offset, rcn.mem_spritesheet_size, bin.rom.spr);
      }
      if(bin.rom.map) {
        hex_to_rom(this.rom, rcn.mem_map_offset, rcn.mem_map_size, bin.rom.map);
      }
      if(bin.rom.pal) {
        hex_to_rom(this.rom, rcn.mem_palette_offset, rcn.mem_palette_size, bin.rom.pal);
      }
      if(bin.rom.spf) {
        hex_to_rom(this.rom, rcn.mem_spriteflags_offset, rcn.mem_spriteflags_size, bin.rom.spf);
      }
    }
  } else {
    rcn_log('Unable to read bin with version: '+bin.version);
  }
}

rcn_bin.prototype.to_json = function() {
  var rom_to_hex = function(rom, offset, size) {
    var hex_lines = [];
    var hex = '';
    for(var i=0; i<size; i++) {
      hex += ('00'+rom[offset+i].toString(16)).slice(-2);

      if(i % 64 == 63 || i == size-1) {
        hex_lines.push(hex);
        hex = '';
      }
    }

    return hex_lines;
  }

  var code_lines = this.code.split('\n');

  // Remove trailing empty lines
  while(code_lines.length>0 && code_lines[code_lines.length-1].match(/^\s*$/)) {
    code_lines.pop();
  }

  return {
    name: this.name,
    version: 2,
    code: code_lines,
    rom: {
      spr: rom_to_hex(this.rom, rcn.mem_spritesheet_offset, rcn.mem_spritesheet_size),
      map: rom_to_hex(this.rom, rcn.mem_map_offset, rcn.mem_map_size),
      pal: rom_to_hex(this.rom, rcn.mem_palette_offset, rcn.mem_palette_size),
      spf: rom_to_hex(this.rom, rcn.mem_spriteflags_offset, rcn.mem_spriteflags_size),
    },
  };
}

rcn_bin.prototype.to_html = function() {
  const bin_json = this.to_json();
  return Promise.all([
    'js',
    rcn_xhr('src/js/init.js'), // This needs to stay at the beginning
    rcn_xhr('src/js/bin.js'),
    rcn_xhr('src/js/canvas.js'),
    rcn_xhr('src/js/gl.js'),
    rcn_xhr('src/js/vm.js'),
    rcn_xhr('src/js/vm_worker.js'),
    'css',
    rcn_xhr('src/css/reset.css'),
    rcn_xhr('src/css/game.css'),
    rcn_xhr('src/css/export.css'),
  ]).then(function(files) {
    var html = document.createElement('html');
    var head = document.createElement('head');
    html.appendChild(head);

    var charset_meta = document.createElement('meta');
    charset_meta.setAttribute('charset', 'UTF-8');
    head.appendChild(charset_meta);

    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.innerHTML = 'var rcn_static_bin_json = '+JSON.stringify(bin_json);
    head.appendChild(script);

    var type = '';
    files.forEach(function(file) {
      if(file.length<=3) {
        type = file;
      } else if(type == 'js') {
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.innerHTML = file;
        head.appendChild(script);
      } else if(type == 'css') {
        var style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = file;
        head.appendChild(style);
      }
    });

    return html.outerHTML;
  });
}

rcn_bin.prototype.patch_memory = function(bytes, offset) {
  for(var i=0; i<bytes.byteLength; i++) {
    this.rom[offset+i] = bytes[i];
  }
}

function rcn_bin_from_env() {
  for(var i in rcn_hosts) {
    const host = rcn_hosts[i];
    const link = rcn_get_parameters[host.get_param];
    if(link) {
      return host.load_bin_from_link(link);
    }
  }
  return Promise.resolve(null);
}
