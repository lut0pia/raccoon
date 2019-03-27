// Bins are containers for raccoon software
// They can be saved, shared, and loaded into a raccoon VM

function rcn_bin() {
  this.name = 'Untitled';
  this.code = '';
  this.rom = new Uint8Array(rcn.rom_size);
}

rcn_bin.prototype.clone = function() {
  var bin_clone = new rcn_bin();
  bin_clone.from_json(this.to_json());
  return bin_clone;
}

rcn_bin.prototype.from_json = function(bin) {
  if(bin.version == 2) {
    this.name = bin.name;

    var code = '';
    bin.code.forEach(function(line) {
      code += line + '\n';
    });
    this.code = code;

    const hex_to_rom = function(rom, offset, hex_lines) {
      if(hex_lines) {
        hex_lines.forEach(function(hex_line) {
          for(var j = 0; j < hex_line.length; j += 2) {
            rom[offset++] = parseInt(hex_line.substr(j, 2), 16);
          }
        });
      }
    }
    hex_to_rom(this.rom, rcn.mem_spritesheet_offset, bin.rom.spr);
    hex_to_rom(this.rom, rcn.mem_map_offset, bin.rom.map);
    hex_to_rom(this.rom, rcn.mem_palette_offset, bin.rom.pal);
    hex_to_rom(this.rom, rcn.mem_spriteflags_offset, bin.rom.spf);
    hex_to_rom(this.rom, rcn.mem_sound_offset, bin.rom.snd);
    hex_to_rom(this.rom, rcn.mem_music_offset, bin.rom.mus);

    this.host = bin.host;
    this.link = bin.link;
  } else {
    rcn_log('Unable to read bin with version: '+bin.version);
  }
}

rcn_bin.prototype.to_json = function() {
  const rom_to_hex = function(rom, offset, size) {
    const line_size = 32;
    var hex_lines = [];
    var hex = '';
    for(var i=0; i<size; i++) {
      hex += ('00'+rom[offset+i].toString(16)).slice(-2);

      if(i % line_size == (line_size - 1) || i == size-1) {
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
      snd: rom_to_hex(this.rom, rcn.mem_sound_offset, rcn.mem_sound_size),
      mus: rom_to_hex(this.rom, rcn.mem_music_offset, rcn.mem_music_size),
    },
    host: this.host,
    link: this.link,
  };
}

rcn_bin.prototype.to_json_text = function() {
  var json = this.to_json();
  delete json.host; // Host information should not be saved outside raccoon
  delete json.link;
  return JSON.stringify(json, null, 2);
}

rcn_bin.prototype.to_html = async function() {
  let scripts = await Promise.all([
    rcn_xhr('src/js/init.js'), // This needs to stay at the beginning
    rcn_xhr('src/js/audio.js'),
    rcn_xhr('src/js/bin.js'),
    rcn_xhr('src/js/canvas.js'),
    rcn_xhr('src/js/game.js'),
    rcn_xhr('src/js/gl.js'),
    rcn_xhr('src/js/utility.js'),
    rcn_xhr('src/js/vm.js'),
    rcn_xhr('src/js/vm_worker.js'),
  ]);
  let styles = await Promise.all([
    rcn_xhr('src/css/reset.css'),
    rcn_xhr('src/css/game.css'),
    rcn_xhr('src/css/export.css'),
  ]);

  let script = document.createElement('script');
  script.type = 'text/javascript';
  script.innerHTML = 'const rcn_static_bin_json = ' + JSON.stringify(this.to_json()) + '\n' + scripts.join('\n');

  let style = document.createElement('style');
  style.type = 'text/css';
  style.innerHTML = styles.join('\n');

  let html = document.createElement('html');
  let head = document.createElement('head');
  let charset_meta = document.createElement('meta');
  charset_meta.setAttribute('charset', 'UTF-8');

  head.appendChild(charset_meta);
  head.appendChild(script);
  head.appendChild(style);
  html.appendChild(head);
  return html.outerHTML;
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
      return host.pull_bin_from_link(new rcn_bin(), link);
    }
  }
  return Promise.resolve(null);
}
