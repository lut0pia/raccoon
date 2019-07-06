// Bins are containers for raccoon software
// They can be saved, shared, and loaded into a raccoon VM
'use strict';

function rcn_bin() {
  this.name = 'Untitled';
  this.code = '';
  this.rom = new Uint8Array(rcn.rom_size);
}

rcn_bin.prototype.clone = function() {
  const bin_clone = new rcn_bin();
  bin_clone.from_json(this.to_json());
  return bin_clone;
}

rcn_bin.prototype.from_json = function(bin) {
  if(bin.version == 2) {
    this.name = bin.name;

    let code = '';
    bin.code.forEach(function(line) {
      code += line + '\n';
    });
    this.code = code;

    const hex_to_rom = function(rom, offset, hex_lines) {
      if(hex_lines) {
        hex_lines.forEach(function(hex_line) {
          for(let j = 0; j < hex_line.length; j += 2) {
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
    let hex_lines = [];
    let hex = '';
    for(let i = 0; i < size; i++) {
      hex += ('00'+rom[offset+i].toString(16)).slice(-2);

      if(i % line_size == (line_size - 1) || i == size-1) {
        hex_lines.push(hex);
        hex = '';
      }
    }

    return hex_lines;
  }

  let code_lines = this.code.split('\n');

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
  const json = this.to_json();
  delete json.host; // Host information should not be saved outside raccoon
  delete json.link;
  return JSON.stringify(json, null, 2);
}

async function rcn_bin_from_env() {
  for(let i in rcn_hosts) {
    const host = rcn_hosts[i];
    const link = rcn_get_parameters[host.get_param];
    if(link) {
      return await host.pull_bin_from_link(new rcn_bin(), link);
    }
  }
  return null;
}
