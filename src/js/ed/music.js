// Raccoon music helpers

const rcn_note_names = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
];

const rcn_scales = [
  {
    name: 'Major',
    suffix: ' Major',
    tonelist: [0, 2, 4, 5, 7, 9, 11],
  },
];

const rcn_chords = [
  {
    name: 'Unison',
    suffix: '.',
    tonelist: [0],
  },
  {
    name: 'Fifth',
    suffix: '5',
    tonelist: [0, 7],
  },

  // Triads
  {
    name: 'Major',
    suffix: '',
    tonelist: [0, 4, 7],
  },
  {
    name: 'Minor',
    suffix: 'm',
    tonelist: [0, 3, 7],
  },
  {
    name: 'Augmented',
    suffix: '+',
    tonelist: [0, 4, 8],
  },
  {
    name: 'Diminished',
    suffix: '-',
    tonelist: [0, 3, 6],
  },
  {
    name: 'Suspended fourth',
    suffix: 'sus4',
    tonelist: [0, 5, 7],
  },
  {
    name: 'Suspended second',
    suffix: 'sus2',
    tonelist: [0, 2, 7],
  },

  // Seventh chords
  {
    name: 'Dominant seventh',
    suffix: '7',
    tonelist: [0, 4, 7, 10],
  },
  {
    name: 'Major seventh',
    suffix: 'maj7',
    tonelist: [0, 4, 7, 11],
  },
  {
    name: 'Minor-major seventh',
    suffix: 'mM7',
    tonelist: [0, 3, 7, 11],
  },
  {
    name: 'Minor seventh',
    suffix: 'm7',
    tonelist: [0, 3, 7, 10],
  },
  {
    name: 'Augmented-major seventh',
    suffix: '+M7',
    tonelist: [0, 4, 8, 11],
  },
  {
    name: 'Augmented seventh',
    suffix: '+7',
    tonelist: [0, 4, 8, 10],
  },
  {
    name: 'Half-diminished seventh',
    suffix: 'ø',
    tonelist: [0, 3, 6, 10],
  },
  {
    name: 'Diminished seventh',
    suffix: 'o7',
    tonelist: [0, 3, 6, 9],
  },
  {
    name: 'Dominant seventh flat five',
    suffix: '7♭5',
    tonelist: [0, 4, 6, 10],
  },
];

function rcn_pitch_to_name(pitch) {
  const octave = Math.floor(pitch / 12) + 1;
  const names = ['C-', 'C#', 'D-', 'D#', 'E-', 'F-', 'F#', 'G-', 'G#', 'A-', 'A#', 'B-'];
  return names[pitch % 12] + octave;
}

function rcn_sound_notes_total(sound) {
  const notes = new Array(rcn.sound_pitch_count).fill(0);
  const sound_offset = rcn.mem_sound_offset + sound * 66;
  for(let i = 0; i < rcn.sound_note_count; i++) {
    const note_offset = sound_offset + 2 + i * 2;
    const pitch = rcn_global_bin.rom[note_offset + 0] & 0x3f;
    const volume = rcn_global_bin.rom[note_offset + 1] & 0x7;
    notes[pitch] += volume;
  }
  return notes;
}

function rcn_music_notes_total(music) {
  const notes = new Array(rcn.sound_pitch_count).fill(0);
  const tracks = rcn_music_tracks(music).filter(t => t >= 0);
  for(let track of tracks) {
    const track_notes = rcn_sound_notes_total(track);
    for(let j = 0; j < rcn.sound_pitch_count; j++) {
      notes[j] += track_notes[j];
    }
  }
  return notes;
}

function rcn_detect_scale_for_music(music) {
  return rcn_detect_tonelist_from_tones(rcn_scales, rcn_notes_to_tones(rcn_music_notes_total(music)));
}

function rcn_detect_chord_for_music(music) {
  return rcn_detect_tonelist_from_tones(rcn_chords, rcn_notes_to_tones(rcn_music_notes_total(music)));
}

function rcn_detect_tonelist_from_tones(tonelists, tones) {
  const normalized_tones = rcn_normalize_tones(tones);
  let tonelist_candidates = [];
  for(let tonelist of tonelists) {
    for(let key = 0; key < 12; key++) {
      const chord_candidate = {
        name: rcn_note_names[key] + tonelist.suffix,
        key: key,
        tonelist: tonelist,
        tonelist: rcn_shift_tonelist(tonelist.tonelist, key),
        score: 0,
      };
      for(let tone of chord_candidate.tonelist) {
        chord_candidate.score += normalized_tones[tone];
      }
      if(chord_candidate.score > 0) {
        tonelist_candidates.push(chord_candidate);
      }
    }
  }

  // Remove chords with more tones but same score
  tonelist_candidates = tonelist_candidates.filter((v,i,a) => !a.find(c => c.score == v.score && c.tonelist.length < v.tonelist.length));

  // Sort chords by descending score
  tonelist_candidates.sort((a, b) => a.score < b.score);

  return tonelist_candidates;
}

function rcn_notes_to_tones(notes) {
  const tones = new Array(12).fill(0);
  for(let i = 0; i < notes.length; i++) {
    tones[i % 12] += notes[i];
  }
  return tones;
}

function rcn_normalize_tones(tones) {
  const sum = tones.reduce((a, b) => a + b, 0);
  return tones.map(t => t / sum);
}

function rcn_shift_tonelist(tones, key) {
  return tones.map(t => (t + key) % 12);
}

function rcn_music_tracks(music) {
  let tracks = [];
  const music_offset = rcn.mem_music_offset + music * 4;
  for(let i = 0; i < rcn.music_track_count; i++) {
    const track_byte = rcn_global_bin.rom[music_offset + i];
    tracks.push((track_byte & 0x40) ? (track_byte & 0x3f) : -1);
  }
  return tracks;
}

function rcn_sound_details(sound) {
  const sound_offset = rcn.mem_sound_offset + sound * 66;
  return {
    period: rcn_global_bin.rom[sound_offset] + 4,
    envelope: rcn_global_bin.rom[sound_offset + 1] >> 6,
    instrument: rcn_global_bin.rom[sound_offset + 1] & 0x3f,
  };
}

function rcn_sound_note(sound, index) {
  const sound_offset = rcn.mem_sound_offset + sound * 66;
  const note_offset = sound_offset + 2 + index * 2;
  return {
    pitch: rcn_global_bin.rom[note_offset + 0] & 0x3f,
    volume: rcn_global_bin.rom[note_offset + 1] & 0x7,
    effect: (rcn_global_bin.rom[note_offset + 1] >> 3) & 0x7,
  };
}
