// Raccoon audio context

const rcn_audio_context = new AudioContext();

function rcn_audio() {
  this.master_gain = rcn_audio_context.createGain();
  this.master_gain.connect(rcn_audio_context.destination);

  this.channel_gain = new Array(4);
  this.channel_play = new Array(4);
  for(let i = 0; i < 4; i++) {
    let gain = rcn_audio_context.createGain();
    gain.connect(this.master_gain);
    gain.gain.value = 0;
    this.channel_gain[i] = gain;
  }

  this.set_master_gain(0.5);
}

rcn_audio.prototype.kill = function() {
  this.master_gain.disconnect();
  for(let i = 0; i < 4; i++) {
    if(this.channel_play[i]) {
      this.channel_play[i].disconnect();
      this.channel_play[i].stop();
    }
    this.channel_gain[i].disconnect();
  }
}

rcn_audio.prototype.set_master_gain = function(gain) {
  this.master_gain.gain.setValueAtTime(gain, rcn_audio_context.currentTime);
}

rcn_audio.prototype.update = function(bytes) {
  for(let i = 0; i < 4; i++) {
    let register = {};
    register.instrument = bytes[i * 3];
    register.pitch = bytes[i * 3 + 1] & 0x3f;
    register.flip = (bytes[i * 3 + 1] & 0x40) != 0;
    register.volume = (bytes[i * 3 + 2] & 0x7)  / 7;
    register.effect = (bytes[i * 3 + 2] >> 3) & 0x7;
    this.update_channel(i, register);
  }
}

rcn_audio.prototype.update_channel = function(i, register) {
  if(!this.channel_play[i]) {
    const osc = rcn_audio_context.createOscillator();
    osc.type = 'triangle';
    osc.connect(this.channel_gain[i]);
    osc.start();
    this.channel_play[i] = osc;
  }

  this.channel_play[i].frequency.setTargetAtTime(rcn_pitch_to_freq(register.pitch), rcn_audio_context.currentTime + 0.03, 0.001);
  this.channel_gain[i].gain.setTargetAtTime(register.volume, rcn_audio_context.currentTime + 0.03, 0.001);
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
