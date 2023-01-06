// Bins are containers for raccoon software
// They can be saved, shared, and loaded into a raccoon VM
'use strict';

const rcn_bin_token_regexp = /(\/\/.+|"((?:\\.|[^\\"])*)"|(\w+))/gm;
const rcn_bin_non_tokens = {
  const: true, let: true,
};
const rcn_bin_token_limit = 4096;
const rcn_bin_current_version = 4;

function rcn_bin() {
  this.name = 'Untitled';
  this.display_name = 'Untitled';
  this.code = '';
  this.rom = new Uint8Array(rcn.rom_size);

  // Set default palette if in editor
  if(typeof rcn_default_palettes !== 'undefined') {
    this.rom.set(rcn_default_palettes.Raccoon, rcn.mem_palette_offset);
  }
}

rcn_bin.prototype.clone = function() {
  const bin_clone = new rcn_bin();
  bin_clone.from_json(this.to_json());
  return bin_clone;
}

rcn_bin.prototype.token_count = function() {
  return [...this.code.matchAll(rcn_bin_token_regexp)]
  .filter(function(m) {
    return !m[0].startsWith('//') && !rcn_bin_non_tokens[m[0]];
  }).length;
}

rcn_bin.prototype.from_json = function(bin) {
  if(bin.version > 1 && bin.version <= rcn_bin_current_version) {
    this.name = bin.name;
    this.display_name = bin.display_name || bin.name;

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

    // Change from music track count and next to used bit and flags
    if(bin.version < 3) {
      for(let music = 0; music < rcn.music_count; music++) {
        const music_offset = rcn.mem_music_offset + music * 4;
        const track_count = (this.rom[music_offset] >> 6) + 1;
        const next =
            ((this.rom[music_offset + 1] >> 6) << 4)
          + ((this.rom[music_offset + 2] >> 6) << 2)
          + ((this.rom[music_offset + 3] >> 6) << 0);
        for(let track = 0; track < rcn.music_track_count; track++) {
          this.rom[music_offset + track] &= 0x3f;
          if(track < track_count) {
            this.rom[music_offset + track] |= 0x40; // Mark used
          }
        }
        if(next <= music) {
          const next_offset = rcn.mem_music_offset + next * 4;
          this.rom[music_offset + 1] |= 0x80; // End loop
          this.rom[next_offset + 0] |= 0x80; // Begin loop
        }
      }
    }

    // Change from palette mod in RAM to everything palette in ROM
    if(bin.version < 4) {
      const pal_off = rcn.mem_palette_offset;
      for(let c = 15; c >= 0; c--) {
        this.rom[pal_off+c*4+3] = c;
        this.rom[pal_off+c*4+2] = this.rom[pal_off+c*3+2];
        this.rom[pal_off+c*4+1] = this.rom[pal_off+c*3+1];
        this.rom[pal_off+c*4+0] = this.rom[pal_off+c*3+0];
      }
    }

    this.host = bin.host;
    this.link = bin.link;
  } else {
    console.log('Unable to read bin with version: '+bin.version);
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

  let code_lines = this.code.split('\n')
    // Remove trailing spaces
    .map(line => line.trimEnd());

  // Remove trailing empty lines
  while(code_lines.length > 0 && code_lines[code_lines.length-1].length == 0) {
    code_lines.pop();
  }

  return {
    name: this.name,
    display_name: this.display_name,
    version: rcn_bin_current_version,
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
  delete json.name; // Only keep display name
  delete json.host; // Host information should not be saved outside raccoon
  delete json.link;
  return JSON.stringify(json, null, 2);
}

async function rcn_bin_from_env() {
  for(let host_id in rcn_hosts) {
    const host = rcn_hosts[host_id];
    const link = rcn_get_parameters[host.get_param];
    if(link) {
      const data = await host.read({
        link: link,
        any: true,
      });
      if(data) {
        const bin = new rcn_bin();
        bin.from_json(JSON.parse(data.text));
        bin.host = host_id;
        bin.link = data.link;
        return bin;
      }
    }
  }
  return null;
}
