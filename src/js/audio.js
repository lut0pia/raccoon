// Raccoon audio context
'use strict';

const rcn_audio_context = new (window.AudioContext || window.webkitAudioContext)();
const rcn_audio_channel_count = 4;
const rcn_audio_sample_rate = 44100;
const rcn_audio_buffer_size = rcn_audio_sample_rate / 30;
const rcn_audio_latency = 1 / 30;
const rcn_audio_frames_per_frame = 4;
const rcn_audio_frames_per_second = rcn_audio_frames_per_frame * 30;
const rcn_audio_ticks_per_measure = 32;
const rcn_audio_ticks_per_beat = rcn_audio_ticks_per_measure / 4;
const rcn_audio_bpm_per_period = (60 * rcn_audio_frames_per_second) / rcn_audio_ticks_per_beat;

function rcn_audio() {
  this.master_gain = rcn_audio_context.createGain();
  this.master_gain.connect(rcn_audio_context.destination);

  this.volume = 1;
  this.play_time = this.last_update = 0;

  this.channels = new Array(rcn_audio_channel_count);
  for(let i = 0; i < rcn_audio_channel_count; i++) {
    this.channels[i] = {
      notes: [],
    };
  }
}

rcn_audio.prototype.kill = function() {
  this.master_gain.disconnect();
}

rcn_audio.prototype.set_volume = function(volume) {
  this.volume = volume;
}

rcn_audio.prototype.update = function(bytes) {
  this.master_gain.gain.value = this.volume;

  // Make sure the audio context is running
  if(rcn_audio_context.state != 'running') {
    rcn_audio_context.resume();
    return;
  }

  // Suppress sound when updates are scarce (likely unfocused tab)
  if(this.last_update < rcn_audio_context.currentTime - (2 / 30)) {
    this.play_time = rcn_audio_context.currentTime;
    this.last_update = rcn_audio_context.currentTime;
    return;
  } else {
    this.last_update = rcn_audio_context.currentTime;
  }

  // Make sure we're not trying to cheat latency
  while(this.play_time < rcn_audio_context.currentTime + rcn_audio_latency) {
    this.play_time = rcn_audio_context.currentTime + rcn_audio_latency;
  }

  // Update channels with new notes
  for(let i = 0; i < rcn_audio_channel_count; i++) {
    const register_bytes = bytes.slice(i * 4, (i + 1) * 4);
    const channel = this.channels[i];

    if((register_bytes[0] & 0x80) == 0) {
      // Register is switched off
      continue;
    }

    const current_note = channel.notes.length > 0 ? channel.notes[0] : null;

    const note = {
      period: register_bytes[0] & 0x7f,
      offset: register_bytes[2] >> 6,
      envelope: register_bytes[1] >> 6,
      instrument: register_bytes[1] & 0x3f,
      pitch: register_bytes[2] & 0x3f,
      volume: (register_bytes[3] & 0x7) / 7,
      effect: (register_bytes[3] >> 3) & 0x7,
    };

    note.attack = [5, 5, 200, 200][note.envelope] / 1000;
    note.decay = [0, 200, 0, 200][note.envelope] / 1000;
    note.sustain = [1, 0.5, 1, 0.5][note.envelope];
    note.release = [5, 50, 200, 200][note.envelope] / 1000;
    note.start_time = this.play_time + note.offset / 120; // Divide by audio frames per second
    note.duration = Math.max(note.period / 120, note.attack + note.decay)
    note.end_time = note.start_time + note.duration + note.release;
    note.phi = current_note ? current_note.phi : 0;

    if(current_note &&
      current_note.envelope == note.envelope &&
      current_note.instrument == note.instrument &&
      current_note.pitch == note.pitch &&
      current_note.volume == note.volume &&
      current_note.effect == note.effect) {
      current_note.end_time = note.end_time;
      current_note.duration = (current_note.end_time - current_note.start_time) - current_note.release;
    } else {
      channel.notes.unshift(note);
    }

    const play_time = this.play_time;
    channel.notes = channel.notes.filter(function(note) {
      return play_time < note.end_time + note.release;
    });
  }

  // Create audio buffer for current frame
  const buffer = rcn_audio_context.createBuffer(1, rcn_audio_buffer_size, rcn_audio_sample_rate);
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < rcn_audio_buffer_size; i++) {
    const t = this.play_time + (i / rcn_audio_sample_rate);

    samples[i] = 0;
    for(let j = 0; j < rcn_audio_channel_count; j++) {
      const channel = this.channels[j];
      for(let k = 0; k < channel.notes.length; k++) {
        samples[i] += rcn_note_waveform(t, channel.notes[k], channel.notes.length > k+1 ? channel.notes[k+1] : null);
      }
    }

    // Avoid saturation
    samples[i] /= rcn_audio_channel_count;
  }

  // Play the buffer at some time in the future
  const bsn = rcn_audio_context.createBufferSource();
  bsn.buffer = buffer;
  bsn.connect(this.master_gain);
  bsn.start(this.play_time);

  // Advance play time
  this.play_time += rcn_audio_buffer_size / rcn_audio_sample_rate;
}

const rcn_max_pitch = 64;
const rcn_pitch_to_freq = new Array(rcn_max_pitch);
// Precompute array for performance
for(let i = 0; i < rcn_max_pitch; i++) {
  // Start at C1, but use A4 frequency as tuning
  rcn_pitch_to_freq[i] =  440 * Math.pow(2, (i-45) / 12);
}

function rcn_note_waveform(t, note, previous_note) {
  if(!note) {
    return 0;
  }

  const offset_t = t - note.start_time;

  if(offset_t < 0 || offset_t > note.duration + note.release) {
    return 0;
  }

  const offset = offset_t / note.duration;
  let frequency = rcn_pitch_to_freq[note.pitch];
  let volume = note.volume;

  switch(note.effect) {
    case 1: // Slide
      if(previous_note) {
        frequency *= offset;
        frequency += (1.0 - offset) * rcn_pitch_to_freq[previous_note.pitch];
        volume = offset * note.volume + (1.0 - offset) * previous_note.volume;
      }
      break;
    case 2: // Vibrato
      frequency *= 1.0 + 0.04166 * (-Math.cos(offset * Math.PI * 2) / 2 + 0.5);
      break;
    case 3: // Drop
      frequency *= 1.0 - offset;
      break;
    case 4: // Fadein
      volume *= offset;
      break;
    case 5: // Fadeout
      volume *= 1.0 - offset;
      break;
  }

  { // Compute envelope
    let adsr;
    if(offset_t < note.attack) {
      adsr = offset_t / note.attack;
    } else if(offset_t < note.attack + note.decay) {
      adsr = (((note.sustain - 1) / note.decay) * (offset_t - note.attack) + 1);
    } else if(offset_t < note.duration) {
      adsr = note.sustain;
    } else {
      adsr = ((note.release - offset_t + note.duration) / note.release) * note.sustain;
    }
    volume *= adsr;
    volume = Math.max(volume, 0);
  }

  const instrument = rcn_instruments[note.instrument];
  const waveform = instrument.waveform(note.phi % 1, note.phi) * volume;
  note.phi += frequency / rcn_audio_sample_rate;
  return waveform;
}

const rcn_instruments = [
  {
    name: 'Triangle',
    waveform: function(t) {
      return Math.abs(4 * t - 2) - 1;
    },
  },
  {
    name: 'Tilted Saw',
    waveform: function(t) {
      const a = 0.9;
      return (t < a
        ? 2 * t / a - 1
        : 2 * (1 - t) / (1 - a) - 1) * 0.406;
    },
  },
  {
    name: 'Saw',
    waveform: function(t) {
      return 0.653 * (t < 0.5 ? t : t - 1);
    },
  },
  {
    name: 'Square',
    waveform: function(t) {
      return t < 0.5 ? 0.25 : -0.25;
    },
  },
  {
    name: 'Pulse',
    waveform: function(t) {
      return t < 0.33333333 ? 0.25 : -0.25;
    },
  },
  {
    name: 'Organ',
    waveform: function(t) {
      return (t < 0.5
        ? 3 - Math.abs(24 * t - 6)
        : 1 - Math.abs(16 * t - 12)) * 0.111111111;
    },
  },
  {
    name: 'Noise',
    waveform: function(t) {
      return Math.random() * 2 - 1;
    },
  },
  {
    name: 'Phaser',
    waveform: function(t, adv) {
      const k = Math.abs(2 * ((adv / 128) % 1) - 1);
      const u = (t + 0.5 * k) % 1;
      return (Math.abs(4 * u - 2) - Math.abs(8 * t - 4)) * 0.4;
    },
  },
  {
    name: 'Sine',
    waveform: function(t) {
      return Math.sin(t * Math.PI * 2);
    },
  },
];
