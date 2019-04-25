// Raccoon audio context

const rcn_audio_context = new AudioContext();
const rcn_audio_channel_count = 4;

function rcn_audio() {
  this.master_gain = rcn_audio_context.createGain();
  this.master_gain.connect(rcn_audio_context.destination);

  // Map from channel to instrument node
  this.channel_map = new Array(rcn_audio_channel_count);
  this.register = new Array(rcn_audio_channel_count);
  this.instrument_pool = [];

  this.set_master_gain(0.33);
}

rcn_audio.prototype.kill = function() {
  this.master_gain.disconnect();

  for(let instance of this.instrument_pool) {
    instance.kill();
  }
}

rcn_audio.prototype.set_master_gain = function(gain) {
  this.master_gain.gain.setValueAtTime(gain, rcn_audio_context.currentTime);
}

rcn_audio.prototype.update = function(frame_time, bytes) {
  const change_time = frame_time + (1.5 / 30);

  for(let i = 0; i < rcn_audio_channel_count; i++) {
    const register = bytes.slice(i * 4, (i + 1) * 4);
    const offset = bytes[i * 3 + 1] >> 6;
    const sub_change_time = change_time + offset / 120; // Divide by audio frames per second
    this.update_channel(i, sub_change_time, {
      period: register[0],
      instrument: register[1],
      pitch: register[2] & 0x3f,
      volume: (register[3] & 0x7) / 7,
      effect: (register[3] >> 3) & 0x7,
    });
  }

  // Suppress sound when updates are scarce (likely unfocused tab)
  if(!this.last_update || this.last_update > rcn_audio_context.currentTime - (2 / 30)) {
    this.master_gain.gain.cancelScheduledValues(rcn_audio_context.currentTime);
    this.master_gain.gain.setValueAtTime(0.33, rcn_audio_context.currentTime);
  }
  this.master_gain.gain.setTargetAtTime(0, change_time + (2 / 30), 0.001);
  this.last_update = rcn_audio_context.currentTime;
}

rcn_audio.prototype.update_channel = function(i, change_time, register) {
  const old_register = this.register[i];
  this.register[i] = register;

  const instrument_changed = !old_register || old_register.instrument != register.instrument;
  if(instrument_changed) {
    if(this.channel_map[i] !== undefined) {
      let inst_node = this.instrument_pool[this.channel_map[i]];
      inst_node.gain.gain.setTargetAtTime(0, change_time, 0.001); // Fade out previous node
      inst_node.free_after = change_time;
    }
    const instrument = rcn_instruments[register.instrument];
    this.channel_map[i] = this.find_or_create_instrument_node(instrument);
  }

  this.instrument_pool[this.channel_map[i]].update(change_time, register);
}

rcn_audio.prototype.find_or_create_instrument_node = function(instrument) {
  for(let i = 0; i < this.instrument_pool.length; i++) {
    let inst_node = this.instrument_pool[i];
    if(inst_node.name == instrument.name &&
      inst_node.free_after < rcn_audio_context.currentTime) {
      return i;
    }
  }

  // We haven't found an instrument, create it
  let instrument_instance = instrument.create();
  instrument_instance.gain.connect(this.master_gain);
  instrument_instance.name = instrument.name;
  this.instrument_pool.push(instrument_instance);
  return this.instrument_pool.length - 1;
}

function rcn_pitch_to_freq(pitch) {
  pitch -= 45; // Start at C1, but use A4 frequency as tuning
  return 440 * Math.pow(2, pitch / 12);
}

function rcn_pitch_to_name(pitch) {
  const octave = Math.floor(pitch / 12) + 1;
  const names = ['C-', 'C#', 'D-', 'D#', 'E-', 'F-', 'F#', 'G-', 'G#', 'A-', 'A#', 'B-'];
  return names[pitch % 12] + octave;
}

function rcn_oscillator(type) {
  const osc = rcn_audio_context.createOscillator();
  osc.type = type;
  return osc;
}

function rcn_custom_oscillator(o) {
  const count = o.count;
  const real_fun = o.real_fun || function() { return 0; }
  const imag_fun = o.imag_fun || function() { return 0; }
  const real = new Float32Array(count);
  const imag = new Float32Array(count);
  real[0] = o.offset || 0;
  for(let i = 1; i < count; i++) {
    real[i] = real_fun(i);
    imag[i] = imag_fun(i);
  }
  const constraints = {};
  constraints.disableNormalization = o.disable_normalization;
  const wave = rcn_audio_context.createPeriodicWave(real, imag, constraints);
  const osc = rcn_audio_context.createOscillator();
  osc.setPeriodicWave(wave);
  return osc;
}

function rcn_instrument_oscillator_create(type) {
  return function() {
    const osc = rcn_oscillator(type);
    return new rcn_instrument_instance({
      oscillators: [osc],
    });
  }
}
function rcn_instrument_custom_oscillator_create(o) {
  return function() {
    const osc = rcn_custom_oscillator(o);
    return new rcn_instrument_instance({
      oscillators: [osc],
    });
  }
}

class rcn_instrument_instance {
  constructor(o) {
    this.free_after = 0;
    this.oscillators = o.oscillators || [];
    this.extra_update = o.update || function() {};
    o.outputs = o.outputs || this.oscillators;

    for(let osc of this.oscillators) {
      osc.start(0);
    }

    let gain = rcn_audio_context.createGain();
    gain.gain.value = 0;
    this.gain = gain;

    for(let output of o.outputs) {
      output.connect(gain);
    }

    let nodes = new Set(o.nodes || []);
    nodes.add(gain);
    for(let osc of this.oscillators) {
      nodes.add(osc);
    }
    this.nodes = nodes;
  }

  update(change_time, register) {
    this.free_after = change_time + (register.period / 120);
    this.gain.gain.setTargetAtTime(register.volume, change_time, 0.001);
    for(let osc of this.oscillators) {
      osc.frequency.setTargetAtTime(rcn_pitch_to_freq(register.pitch), change_time, 0.001);
    }
    this.extra_update(change_time, register);
  }

  kill() {
    for(let node of this.nodes) {
      node.disconnect();
      if(node.stop) {
        node.stop();
      }
    }
  }
}

const rcn_instruments = [
  {
    name: 'Triangle',
    create: rcn_instrument_custom_oscillator_create({
      count: 8,
      real_fun: function(i) { return (i % 2 == 1) ? (1 / (i * i)) : 0; },
    }),
  },
  {
    name: 'Round Saw',
    create: rcn_instrument_custom_oscillator_create({
      count: 4,
      imag_fun: function(i) { return 1 / (i * 2); },
    }),
  },
  {
    name: 'Saw',
    create: rcn_instrument_custom_oscillator_create({
      count: 8,
      imag_fun: function(i) { return 1 / (i * 2); },
    }),
  },
  {
    name: 'Square',
    create: rcn_instrument_custom_oscillator_create({
      count: 8,
      imag_fun: function(i) { return (i % 2 == 1) ? (1 / i) : 0; },
    }),
  },
  {
    name: 'Pulse',
    create: function() {
      let saw1 = rcn_custom_oscillator({
        count: 8,
        imag_fun: function(i) { return 1 / (i * 2); },
      });
      let saw2 = rcn_custom_oscillator({
        count: 8,
        imag_fun: function(i) { return 1 / (i * 2); },
      });
      const inv_saw2 = rcn_audio_context.createGain();
      inv_saw2.gain.setValueAtTime(-1, rcn_audio_context.currentTime);
      const del_inv_saw2 = rcn_audio_context.createDelay();
      saw2.connect(inv_saw2).connect(del_inv_saw2);
      return new rcn_instrument_instance({
        oscillators: [saw1, saw2],
        outputs: [saw1, del_inv_saw2],
        nodes: [inv_saw2],
        update: function(change_time, register) {
          const freq = rcn_pitch_to_freq(register.pitch);
          del_inv_saw2.delayTime.setTargetAtTime((1/freq) * Math.PI, change_time, 0.001);
        }
      });
    },
  },
  {
    name: 'Organ',
    create: rcn_instrument_custom_oscillator_create({
      count: 3,
      imag_fun: function(i) { return  i < 2 ? 1 : 0; },
      real_fun: function(i) { return  i > 1 ? 2 : 0; },
    }),
  },
  {
    name: 'Noise',
    create: function() {
      const buffer_size = 2 * rcn_audio_context.sampleRate;
      const noise_buffer = rcn_audio_context.createBuffer(1, buffer_size, rcn_audio_context.sampleRate);
      const output = noise_buffer.getChannelData(0);
      let last_out = 0;
      for (let i = 0; i < buffer_size; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (last_out + (0.02 * white)) / 1.02;
        last_out = output[i];
        output[i] *= 3.5;
      }

      const brown_noise = rcn_audio_context.createBufferSource();
      brown_noise.buffer = noise_buffer;
      brown_noise.loop = true;
      brown_noise.start(0);
      return new rcn_instrument_instance({
        outputs: [brown_noise],
      });
    },
  },
  {
    name: 'Phaser',
    create: function() {
      let tri = rcn_custom_oscillator({
        count: 8,
        real_fun: function(i) { return (i % 2 == 1) ? (1 / (i * i)) : 0; },
      });
      let sine = rcn_custom_oscillator({
        count: 2,
        real_fun: function(i) { return 0.25; },
        disable_normalization: true,
      });
      sine.start();

      return new rcn_instrument_instance({
        oscillators: [tri],
        outputs: [tri, sine],
        update: function(change_time, register) {
          const freq = rcn_pitch_to_freq(register.pitch);
          sine.frequency.setTargetAtTime(freq * 128 / 129, change_time, 0.001);
        }
      });
    },
  },
];
