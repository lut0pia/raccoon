// Raccoon music editor
'use strict';


function rcn_music_ed() {
  rcn_music_ed.prototype.__proto__ = rcn_window.prototype;
  rcn_window.call(this);

  this.track_select = [];
  this.flag_checkbox = [];

  const music_ed = this;

  // Create music table
  const music_table = document.createElement('table');
  this.add_child(music_table);

  const rcn_music_track_select_options = {};
  rcn_music_track_select_options[-1] = '--';
  for(let i = 0; i < rcn.sound_count; i++) {
    rcn_music_track_select_options[i] = String(i).padStart(2, '0');
  }

  // Create music rows
  for(let music = 0; music < rcn.music_count; music++) {
    const music_row = document.createElement('tr');
    music_table.appendChild(music_row);

    // Create music index
    const music_index = document.createElement('td');
    music_row.appendChild(music_index);
    music_index.innerText = String(music).padStart(2, '0');

    // Create track select
    for(let track = 0; track < rcn.music_track_count; track++) {
      const select_cell = document.createElement('td');
      music_row.appendChild(select_cell);

      const select = rcn_ui_select({
        options: rcn_music_track_select_options,
        onchange: function() {
          music_ed.set_track(music, track, Number(this.value));
        },
      });
      select_cell.appendChild(select);

      this.track_select.push(select);
    }

    // Create music flags
    const set_flag = function(i) {
      return function(e) {
        const flag_offset = rcn.mem_music_offset + music * 4 + i;
        if(e.target.checked) {
          rcn_global_bin.rom[flag_offset] |= 0x80;
        } else {
          rcn_global_bin.rom[flag_offset] &= 0x7f;
        }
        rcn_dispatch_ed_event('rcn_bin_change', {
          begin: flag_offset,
          end: flag_offset + 1,
        });
      };
    }
    const begin_flag = rcn_ui_checkbox({label: '⤵️', onchange: set_flag(0)});
    const end_flag = rcn_ui_checkbox({label: '⤴️', onchange: set_flag(1)});
    const stop_flag = rcn_ui_checkbox({label: '🛑', onchange: set_flag(2)});
    this.flag_checkbox.push(begin_flag.checkbox);
    this.flag_checkbox.push(end_flag.checkbox);
    this.flag_checkbox.push(stop_flag.checkbox);
    music_row.appendChild(begin_flag);
    music_row.appendChild(end_flag);
    music_row.appendChild(stop_flag);
  }

  this.addEventListener('rcn_bin_change', function(e) {
    // Music update
    const mem_music_begin = rcn.mem_music_offset;
    const mem_music_end = rcn.mem_music_offset + rcn.mem_music_size;
    if(e.detail.begin < mem_music_end && e.detail.end > mem_music_begin) {
      music_ed.update_tracks();
    }
  });

  this.update_tracks();
}

rcn_music_ed.prototype.title = 'Music Editor';
rcn_music_ed.prototype.type = 'music_ed';
rcn_editors.push(rcn_music_ed);

rcn_music_ed.prototype.get_music_offset = function(music) {
  return rcn.mem_music_offset + music * 4;
}

rcn_music_ed.prototype.set_track = function(music, track, sound) {
  const music_offset = this.get_music_offset(music);
  rcn_global_bin.rom[music_offset + track] &= 0x80;
  if(sound >= 0) {
    rcn_global_bin.rom[music_offset + track] |= 0x40 | sound;
  }
  rcn_dispatch_ed_event('rcn_bin_change', {
    begin: music_offset + track,
    end: music_offset + track + 1,
  });
}

rcn_music_ed.prototype.get_track = function(music, track) {
  const music_offset = this.get_music_offset(music);
  const track_byte = rcn_global_bin.rom[music_offset + track];
  return track_byte & 0x40 ? track_byte & 0x3f : -1;
}

rcn_music_ed.prototype.update_tracks = function() {
  for(let music = 0; music < rcn.music_count; music++) {
    // Update tracks
    for(let track = 0; track < rcn.music_track_count; track++) {
      const track_index = music * 4 + track;
      this.track_select[track_index].value = this.get_track(music, track);
    }

    // Update flags
    const music_offset = this.get_music_offset(music);
    this.flag_checkbox[music * 3 + 0].checked = rcn_global_bin.rom[music_offset + 0] & 0x80;
    this.flag_checkbox[music * 3 + 1].checked = rcn_global_bin.rom[music_offset + 1] & 0x80;
    this.flag_checkbox[music * 3 + 2].checked = rcn_global_bin.rom[music_offset + 2] & 0x80;
  }
}
