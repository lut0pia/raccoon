// Raccoon music editor
'use strict';

function rcn_music_ed() {
  rcn_music_ed.prototype.__proto__ = rcn_window.prototype;
  rcn_window.call(this);

  this.current_music = 0;

  let music_ed = this;

  // Create music select
  let music_select_label = document.createElement('label');
  music_select_label.innerText = 'Music: ';
  this.add_child(music_select_label);
  this.add_child(this.music_select = rcn_ui_select({
    options: new Array(64).fill(0).map(function(v, i){ return i; }),
    onchange: function() {
      music_ed.set_current_music(Number(this.value));
    },
  }));
  this.add_child(document.createElement('br'));

  // Create track count range
  let tracks_label = document.createElement('label');
  tracks_label.innerText = 'Tracks: ';
  this.add_child(tracks_label);
  this.track_count_range = document.createElement('input');
  this.track_count_range.type = 'range';
  this.track_count_range.min = 1;
  this.track_count_range.max = 4;
  this.track_count_range.onchange = function() {
    music_ed.set_track_count(Number(this.value));
  }
  this.add_child(this.track_count_range);

  // Create track select
  this.track_select = [];
  for(let i = 0; i < 4; i++) {
    let select = rcn_ui_select({
      options: new Array(64).fill(0).map(function(v, i){ return i; }),
      onchange: function() {
        music_ed.set_track(i, Number(this.value));
      },
    });
    this.add_child(select);
    this.track_select.push(select);
  }
  this.add_child(document.createElement('br'));

  // Create next select
  let next_select_label = document.createElement('label');
  next_select_label.innerText = 'Next: ';
  this.add_child(next_select_label);
  this.add_child(this.next_select = rcn_ui_select({
    options: new Array(64).fill(0).map(function(v, i){ return i; }),
    onchange: function() {
      music_ed.set_next(Number(this.value));
    },
  }));

  this.addEventListener('rcn_bin_change', function(e) {
    // Music update
    const mem_music_begin = rcn.mem_music_offset;
    const mem_music_end = rcn.mem_music_offset + rcn.mem_music_size;
    if(e.detail.begin < mem_music_end && e.detail.end > mem_music_begin) {
      music_ed.update_track_count();
      music_ed.update_tracks();
      music_ed.update_next();
    }
  });

  this.update_track_count();
  this.update_tracks();
  this.update_next();
}

rcn_music_ed.prototype.set_track_count = function(count) {
  const music_offset = this.get_current_music_offset();
  rcn_global_bin.rom[music_offset] &= 0x3f;
  rcn_global_bin.rom[music_offset] |= (count - 1) << 6;
  rcn_dispatch_ed_event('rcn_bin_change', {
    begin: music_offset,
    end: music_offset + 1,
  });
}

rcn_music_ed.prototype.set_current_music = function(i) {
  this.current_music = i;
  this.update_track_count();
  this.update_tracks();
  this.update_next();
}

rcn_music_ed.prototype.get_current_music_offset = function() {
  return rcn.mem_music_offset + this.current_music * 4;
}

rcn_music_ed.prototype.set_track = function(i, sound) {
  const music_offset = this.get_current_music_offset();
  rcn_global_bin.rom[music_offset + i] &= 0xc0;
  rcn_global_bin.rom[music_offset + i] |= sound;
  rcn_dispatch_ed_event('rcn_bin_change', {
    begin: music_offset + i,
    end: music_offset + i + 1,
  });
}

rcn_music_ed.prototype.get_track = function(i) {
  const music_offset = this.get_current_music_offset();
  return rcn_global_bin.rom[music_offset + i] & 0x3f;
}

rcn_music_ed.prototype.get_track_count = function() {
  const music_offset = this.get_current_music_offset();
  return (rcn_global_bin.rom[music_offset] >> 6) + 1;
}

rcn_music_ed.prototype.update_track_count = function() {
  this.track_count_range.value = this.get_track_count();;
}

rcn_music_ed.prototype.update_tracks = function() {
  const track_count = this.get_track_count();
  for(let i = 0; i < 4; i++) {
    this.track_select[i].value = this.get_track(i);
    if(i >= track_count) {
      this.track_select[i].setAttribute('disabled', '');
    } else {
      this.track_select[i].removeAttribute('disabled');
    }
  }
}

rcn_music_ed.prototype.set_next = function(next) {
  const music_offset = this.get_current_music_offset();

  rcn_global_bin.rom[music_offset + 1] &= 0x3f;
  rcn_global_bin.rom[music_offset + 2] &= 0x3f;
  rcn_global_bin.rom[music_offset + 3] &= 0x3f;

  rcn_global_bin.rom[music_offset + 1] |= (next >> 4) << 6;
  rcn_global_bin.rom[music_offset + 2] |= (next >> 2) << 6;
  rcn_global_bin.rom[music_offset + 3] |= (next >> 0) << 6;

  rcn_dispatch_ed_event('rcn_bin_change', {
    begin: music_offset + 1,
    end: music_offset + 4,
  });
}

rcn_music_ed.prototype.get_next = function() {
  const music_offset = this.get_current_music_offset();
  let next = 0;
  next += (rcn_global_bin.rom[music_offset + 1] >> 6) << 4;
  next += (rcn_global_bin.rom[music_offset + 2] >> 6) << 2;
  next += (rcn_global_bin.rom[music_offset + 3] >> 6) << 0;

  return next;
}

rcn_music_ed.prototype.update_next = function() {
  this.next_select.value = this.get_next();
}

rcn_music_ed.prototype.title = 'Music Editor';
rcn_music_ed.prototype.type = 'music_ed';

rcn_editors.push(rcn_music_ed);
