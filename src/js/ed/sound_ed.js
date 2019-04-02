// Raccoon sound editor

function rcn_sound_ed() {
  this.__proto__.__proto__ = rcn_window.prototype;
  rcn_window.call(this);

  let sound_ed = this;

  // Create sound select
  this.sound_select = document.createElement('select');
  this.sound_select.onchange = function() {
    sound_ed.set_current_sound(Number(this.value));
  }
  for(let i = 0; i < 64; i++) {
    let option = document.createElement('option');
    option.innerText = i;
    option.value = i;
    this.sound_select.appendChild(option);
  }
  this.add_child(this.sound_select);

  // Create speed select
  this.speed_select = document.createElement('select');
  this.speed_select.onchange = function() {
    sound_ed.set_speed(Number(this.value));
  }
  for(let i = 0; i < 256; i++) {
    let option = document.createElement('option');
    option.innerText = i;
    option.value = i;
    this.speed_select.appendChild(option);
  }
  this.add_child(this.speed_select);

  // Create note table
  this.note_table = document.createElement('table');
  this.add_child(this.note_table);

  this.addEventListener('rcn_bin_change', function(e) {
    // Sound update
    const mem_sound_begin = rcn.mem_sound_offset;
    const mem_sound_end = rcn.mem_sound_offset + rcn.mem_sound_size;
    if(e.detail.begin < mem_sound_end && e.detail.end > mem_sound_begin) {
      sound_ed.update_speed();
      sound_ed.update_notes();
    }
  });

  this.set_current_sound(0);
}

rcn_sound_ed.prototype.set_current_sound = function(i) {
  this.current_sound = i;
  this.update_speed();
  this.update_notes();
}

rcn_sound_ed.prototype.get_current_sound_offset = function() {
  return rcn.mem_sound_offset + this.current_sound * 66;
}

rcn_sound_ed.prototype.set_speed = function(speed) {
  const sound_offset = this.get_current_sound_offset();
  rcn_global_bin.rom[sound_offset] = speed;
  rcn_dispatch_ed_event('rcn_bin_change', {
    begin: sound_offset,
    end: sound_offset + 1,
  });
}

rcn_sound_ed.prototype.update_speed = function() {
  const sound_offset = this.get_current_sound_offset();
  this.speed_select.value = rcn_global_bin.rom[sound_offset];
}

rcn_sound_ed.prototype.update_notes = function() {
  // Clear table
  while(this.note_table.childElementCount > 0) {
    this.note_table.removeChild(this.note_table.firstChild);
  }

  const sound_offset = this.get_current_sound_offset();

  for(let pitch = 63; pitch >= 0; pitch--) {
    let row = document.createElement('tr');
    this.note_table.appendChild(row);
    let row_header = document.createElement('th');
    row.appendChild(row_header);
    row_header.innerText = rcn_pitch_to_name(pitch);

    for(let note = 0; note < 32; note++) {
      const note_offset = sound_offset + 2 + note * 2;
      const note_1 = rcn_global_bin.rom[note_offset + 0];
      const note_2 = rcn_global_bin.rom[note_offset + 1];
      const current_pitch = note_1 & 0x3f; // Pitch
      const volume = note_2 & 0x7;
      let cell = document.createElement('td');
      row.appendChild(cell);
      if(pitch == current_pitch && volume > 0) {
        cell.classList.add('active');
        cell.innerText = volume;
        cell.onclick = function() {
          rcn_global_bin.rom[note_offset + 1] = 0; // Volume
          rcn_dispatch_ed_event('rcn_bin_change', {
            begin: note_offset + 1,
            end: note_offset + 2,
          });
        }
      } else {
        cell.onclick = function() {
          rcn_global_bin.rom[note_offset + 0] = pitch;
          rcn_global_bin.rom[note_offset + 1] = 7; // Volume
          rcn_dispatch_ed_event('rcn_bin_change', {
            begin: note_offset,
            end: note_offset + 2,
          });
        }
      }
    }
  }
}

rcn_sound_ed.prototype.title = 'Sound Editor';
rcn_sound_ed.prototype.docs_link = 'sound-editor';
rcn_sound_ed.prototype.type = 'sound_ed';
rcn_sound_ed.prototype.unique = true;

rcn_editors.push(rcn_sound_ed);
