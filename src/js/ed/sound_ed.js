// Raccoon sound editor
'use strict';

function rcn_sound_ed() {
  rcn_sound_ed.prototype.__proto__ = rcn_window.prototype;
  rcn_window.call(this);

  const sound_ed = this;

  // Create VM
  this.vm = new rcn_vm({
    no_canvas: true,
    dom_element: this.section,
  });
  const vm_onmessage = this.vm.onmessage;
  this.vm.onmessage = function(e) {
    vm_onmessage.call(this, e);
    sound_ed.onmessage(e);
  }

  // Create sound select
  const sound_select_label = document.createElement('label');
  sound_select_label.innerText = 'Track: ';
  this.add_child(sound_select_label);
  this.add_child(this.sound_select = rcn_ui_select({
    options: new Array(rcn.sound_count).fill(0).map(function(v, i){ return i; }),
    onchange: function() {
      sound_ed.set_current_sound(Number(this.value));
    },
  }));
  this.add_child(document.createTextNode(' '));

  // Create play button
  this.add_child(this.play_button = rcn_ui_button({
    value: 'Play',
    onclick: function() {
      sound_ed.toggle_play();
    },
  }));

  // Create loop checkbox
  this.add_child(this.loop_checkbox = rcn_ui_checkbox({
    label: 'Loop',
    onchange: function() {
      sound_ed.set_loop(this.checked);
    },
  }));

  this.add_child(document.createElement('br'));

  // Create speed select
  const period_select_label = document.createElement('label');
  period_select_label.innerText = 'Period / Tempo: ';
  this.add_child(period_select_label);
  this.add_child(this.period_select = rcn_ui_select({
    options: new Array(128).fill(0).map(function(v, i) {
      const audio_frames = i + rcn_audio_frames_per_frame;
      return `${audio_frames} / ${Math.round(rcn_audio_bpm_per_period / audio_frames)} BPM`;
    }),
    onchange: function() {
      sound_ed.set_period(Number(this.value));
    },
  }));
  this.add_child(document.createElement('br'));

  // Create instrument select
  const instrument_select_label = document.createElement('label');
  instrument_select_label.innerText = 'Instrument: ';
  this.add_child(instrument_select_label);
  this.add_child(this.instrument_select = rcn_ui_select({
    options: Object.assign(...Object.keys(rcn_instruments).map(function(i) {
      return {[i]: rcn_instruments[i].name};
    })),
    onchange: function() {
      sound_ed.set_instrument(Number(this.value));
    },
  }));
  this.add_child(document.createTextNode(' '));

  // Create envelope select
  const envelope_select_label = document.createElement('label');
  envelope_select_label.innerText = 'Envelope: ';
  this.add_child(envelope_select_label);
  this.add_child(this.envelope_select = rcn_ui_select({
    options: {
      0: 'Beep', 1: 'Pluck', 2: 'Pad', 3: 'Plucked Pad?',
    },
    onchange: function() {
      sound_ed.set_envelope(Number(this.value));
    },
  }));
  this.add_child(document.createElement('br'));

  // Create note table wrapper
  const note_table_wrapper = document.createElement('div');
  note_table_wrapper.classList.add('wrapper');
  this.add_child(note_table_wrapper);

  // Create note table
  this.note_table = document.createElement('table');
  note_table_wrapper.appendChild(this.note_table);
  this.note_cells = new Array(rcn.sound_pitch_count);
  for(let pitch = rcn.sound_pitch_count - 1; pitch >= 0; pitch--) {
    const row = document.createElement('tr');
    this.note_table.appendChild(row);
    const row_header = document.createElement('th');
    row.appendChild(row_header);
    row_header.innerText = rcn_pitch_to_name(pitch);
    this.note_cells[pitch] = new Array(32);

    for(let note_index = 0; note_index < 32; note_index++) {
      const cell = document.createElement('td');
      row.appendChild(cell);
      cell.onmousedown = cell.onmouseover = function(e) {
        if(e.buttons == 0) {
          return;
        }
        rcn_window_focus(e.target);
        e.preventDefault();
        const note = sound_ed.get_current_sound_note(note_index);

        if(e.type == 'mousedown') { // Initial action
          if(note.pitch == pitch) { // Already a note
            if(e.buttons == 1) { // Remove note
              note.pitch = note.volume = note.effect = 0;
              sound_ed.last_mouse_action = 'remove';
            } else if(e.buttons == 2) { // Decrease volume
              note.volume = note.volume > 1 ? note.volume - 1 : 7;
              sound_ed.last_mouse_action = 'volume';
              sound_ed.last_mouse_value = note.volume;
            } else if(e.buttons == 4) { // Change effect
              note.effect = (note.effect + 1) % 6;
              sound_ed.last_mouse_action = 'effect';
              sound_ed.last_mouse_value = note.effect;
            }
          } else { // New note
            note.pitch = pitch;
            note.volume = 7;
            note.effect = 0;
            sound_ed.last_mouse_action = 'add';
          }
        } else { // Repeat initial action
          switch(sound_ed.last_mouse_action) {
            case 'add':
              note.pitch = pitch;
              note.volume = 7;
              note.effect = 0;
              break;
            case 'effect':
              note.effect = sound_ed.last_mouse_value;
              break;
            case 'remove':
              note.pitch = note.volume = note.effect = 0;
              break;
            case 'volume':
              note.volume = sound_ed.last_mouse_value;
              break;
          }
        }
        sound_ed.set_current_sound_note(note_index, note)
      }
      cell.oncontextmenu = function(e) { e.preventDefault(); }
      this.note_cells[pitch][note_index] = cell;
    }
  }

  this.addEventListener('rcn_bin_change', function(e) {
    if(rcn_mem_changed(e, 'sound')) {
      sound_ed.update_period();
      sound_ed.update_envelope();
      sound_ed.update_instrument();
      sound_ed.update_notes();
    }
    if(e.detail.begin < e.detail.end) {
      sound_ed.vm.load_memory(rcn_global_bin.rom.slice(e.detail.begin, e.detail.end), e.detail.begin);
    }
  });

  this.addEventListener('rcn_mute_request', function(e) {
    sound_ed.stop();
  });

  this.section.addEventListener('keydown', function(e) {
    if(!e.target.rcn_window) {
      return;
    }
    const transpose_factor = e.ctrlKey ? 12 : 1;
    if(e.key == 'ArrowUp') {
      sound_ed.transpose(transpose_factor);
      e.preventDefault();
    } else if(e.key == 'ArrowDown') {
      sound_ed.transpose(-transpose_factor);
      e.preventDefault();
    } else if(e.key == ' ') {
      sound_ed.toggle_play();
      e.preventDefault();
    }
  });

  this.vm.load_memory(rcn_global_bin.rom);
  this.set_current_sound(0);
}

rcn_sound_ed.prototype.title = 'Sound Editor';
rcn_sound_ed.prototype.docs_link = 'sound-editor';
rcn_sound_ed.prototype.type = 'sound_ed';
rcn_sound_ed.prototype.group = 'sound';
rcn_editors.push(rcn_sound_ed);

rcn_sound_ed.prototype.set_current_sound = function(i) {
  if(this.current_sound == i) {
    return; // Nothing to do
  }
  if(this.sound_select.value != i) {
    this.sound_select.value = i;
  }
  this.current_sound = i;
  this.update_period();
  this.update_envelope();
  this.update_instrument();
  this.update_notes();
  this.stop();
}

rcn_sound_ed.prototype.get_current_sound_offset = function() {
  return rcn.mem_sound_offset + this.current_sound * 66;
}

rcn_sound_ed.prototype.get_period = function() {
  const sound_offset = this.get_current_sound_offset();
  return rcn_global_bin.rom[sound_offset] + 4;
}

rcn_sound_ed.prototype.set_period = function(period) {
  const sound_offset = this.get_current_sound_offset();
  rcn_global_bin.rom[sound_offset] = period;
  rcn_dispatch_ed_event('rcn_bin_change', {
    begin: sound_offset,
    end: sound_offset + 1,
  });
}

rcn_sound_ed.prototype.update_period = function() {
  const sound_offset = this.get_current_sound_offset();
  this.period_select.value = rcn_global_bin.rom[sound_offset];
}

rcn_sound_ed.prototype.set_envelope = function(envelope) {
  const sound_offset = this.get_current_sound_offset();
  rcn_global_bin.rom[sound_offset + 1] &= 0x3f;
  rcn_global_bin.rom[sound_offset + 1] |= envelope << 6;
  rcn_dispatch_ed_event('rcn_bin_change', {
    begin: sound_offset + 1,
    end: sound_offset + 2,
  });
}

rcn_sound_ed.prototype.update_envelope = function() {
  const sound_offset = this.get_current_sound_offset();
  this.envelope_select.value = rcn_global_bin.rom[sound_offset + 1] >> 6;
}

rcn_sound_ed.prototype.set_instrument = function(instrument) {
  const sound_offset = this.get_current_sound_offset();
  rcn_global_bin.rom[sound_offset + 1] &= 0xc0;
  rcn_global_bin.rom[sound_offset + 1] |= instrument;
  rcn_dispatch_ed_event('rcn_bin_change', {
    begin: sound_offset + 1,
    end: sound_offset + 2,
  });
}

rcn_sound_ed.prototype.update_instrument = function() {
  const sound_offset = this.get_current_sound_offset();
  this.instrument_select.value = rcn_global_bin.rom[sound_offset + 1] & 0x3f;
}

rcn_sound_ed.prototype.get_current_sound_note = function(index) {
  const sound_offset = this.get_current_sound_offset();
  const note_offset = sound_offset + 2 + index * 2;
  return {
    pitch: rcn_global_bin.rom[note_offset + 0] & 0x3f,
    volume: rcn_global_bin.rom[note_offset + 1] & 0x7,
    effect: (rcn_global_bin.rom[note_offset + 1] >> 3) & 0x7,
  };
}

rcn_sound_ed.prototype.set_current_sound_note = function(index, note) {
  const sound_offset = this.get_current_sound_offset();
  const note_offset = sound_offset + 2 + index * 2;
  rcn_global_bin.rom[note_offset + 0] = note.pitch;
  rcn_global_bin.rom[note_offset + 1] = (note.effect << 3) | note.volume;
  rcn_dispatch_ed_event('rcn_bin_change', {
    begin: note_offset,
    end: note_offset + 2,
  });
}

rcn_sound_ed.prototype.update_notes = function() {
  for(let note_index = 0; note_index < 32; note_index++) {
    const note = this.get_current_sound_note(note_index)
    const is_playing = note_index == this.note_playing;
    for(let pitch = 0; pitch < rcn.sound_pitch_count; pitch++) {
      const cell = this.note_cells[pitch][note_index];
      const is_active = pitch == note.pitch && note.volume > 0;
      cell.classList.toggle('active', is_active);
      cell.classList.toggle('playing', is_playing);
      if(is_active) {
        cell.setAttribute('effect', ['none', 'slide', 'vibrato', 'drop', 'fadein', 'fadeout'][note.effect]);
        cell.setAttribute('volume', note.volume);
      }
    }
  }
}

rcn_sound_ed.prototype.transpose = function(delta) {
  const sound_offset = this.get_current_sound_offset();
  for(let i = 0; i < rcn_audio_ticks_per_measure; i++) {
    const note_offset = sound_offset + 2 + i * 2;
    let pitch = rcn_global_bin.rom[note_offset + 0] & 0x3f;
    pitch += delta;
    pitch = Math.max(0, Math.min(63, pitch));
    rcn_global_bin.rom[note_offset + 0] = pitch;
  }
  rcn_dispatch_ed_event('rcn_bin_change', {
    begin: sound_offset + 2,
    end: sound_offset + 2 + rcn_audio_ticks_per_measure * 2,
  });
}

rcn_sound_ed.prototype.toggle_play = function() {
  if(!this.is_playing()) {
    this.play();
  } else {
    this.stop();
  }
}

rcn_sound_ed.prototype.play = function() {
  rcn_dispatch_ed_event('rcn_mute_request');
  this.vm.load_code(`sfx(${this.current_sound}, 0, 0, 32, ${this.loop ? 255 : 1});`);
}

rcn_sound_ed.prototype.stop = function() {
  this.vm.load_code(`sfx(0, 0, 0, 0);`);
}

rcn_sound_ed.prototype.is_playing = function() {
  return this.note_playing >= 0;
}

rcn_sound_ed.prototype.set_loop = function(loop) {
  this.loop = loop;
  if(this.is_playing()) { // Already playing
    if(this.loop) {
      this.play();
    } else {
      this.stop();
    }
  }
}

rcn_sound_ed.prototype.onmessage = function(e) {
  switch(e.data.type) {
    case 'audio':
      this.vm.worker.postMessage({type: 'read', name: 'sound', offset: rcn.mem_soundstate_offset, size: rcn.mem_soundstate_size});
      break;
    case 'sound':
      const time = (new DataView(e.data.bytes.buffer).getUint16(4));
      let note = time > 0 ? Math.floor(time / this.get_period()) : -1;
      if(this.loop) {
        note %= 32;
      }
      if(this.note_playing != note) {
        this.note_playing = note;
        this.update_notes();
      }
      break;
  }
}
