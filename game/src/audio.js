// Sound, all synthesised with the Web Audio API: no audio files. The browser only lets a page make
// sound after a click or key press, so unlock() is called from the first one; every call before that
// does nothing, and so does every call where audio is missing.
let ctx = null;
let master = null;
let muted = false;
let noiseBuffer = null;
let beatClock = 0;
let beatIndex = 0;

/** Create the audio context on the first user gesture. */
export function unlock() {
  if (ctx !== null) {
    if (ctx.state === 'suspended') ctx.resume();
    return;
  }
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.45;
    master.connect(ctx.destination);
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  } catch {
    ctx = null;
  }
}

export function toggleMute() {
  muted = !muted;
  if (master !== null) master.gain.value = muted ? 0 : 0.45;
  return muted;
}

export const isMuted = () => muted;

/** One pitched blip: a start frequency that slides to an end frequency while it fades out. */
function tone(from, to, seconds, type, volume, delay = 0) {
  if (ctx === null) return;
  const start = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, start);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), start + seconds);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
  osc.connect(gain);
  gain.connect(master);
  osc.start(start);
  osc.stop(start + seconds + 0.02);
}

/** A burst of filtered noise: the body of a hit or a swish. */
function burst(seconds, volume, cutoff, delay = 0) {
  if (ctx === null) return;
  const start = ctx.currentTime + delay;
  const src = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  src.buffer = noiseBuffer;
  filter.type = 'lowpass';
  filter.frequency.value = cutoff;
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  src.start(start);
  src.stop(start + seconds + 0.02);
}

export const sfx = {
  shoot: () => tone(880, 330, 0.09, 'triangle', 0.12),
  hit: () => {
    tone(220, 90, 0.08, 'square', 0.1);
    burst(0.06, 0.12, 1800);
  },
  kill: () => {
    tone(330, 60, 0.18, 'sawtooth', 0.12);
    burst(0.14, 0.16, 900);
  },
  pickup: (pitch = 0) => tone(660 + pitch * 40, 1320 + pitch * 40, 0.08, 'sine', 0.13),
  dash: () => burst(0.18, 0.2, 2600),
  hurt: () => {
    tone(180, 50, 0.3, 'sawtooth', 0.22);
    burst(0.25, 0.25, 700);
  },
  card: () => {
    tone(523, 784, 0.12, 'triangle', 0.16);
    tone(784, 1046, 0.16, 'triangle', 0.14, 0.09);
  },
  wave: () => {
    tone(262, 262, 0.14, 'square', 0.1);
    tone(330, 330, 0.14, 'square', 0.1, 0.12);
    tone(392, 392, 0.22, 'square', 0.1, 0.24);
  },
  boss: () => {
    tone(98, 49, 0.9, 'sawtooth', 0.28);
    burst(0.8, 0.2, 400);
  },
  win: () => [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, f, 0.3, 'triangle', 0.16, i * 0.14)),
  lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, f * 0.9, 0.4, 'triangle', 0.18, i * 0.2)),
};

const SCALE = [0, 3, 5, 7, 10, 12, 15];

/** A slow, low pulse under the game; it gets quicker and higher as `tension` goes from 0 to 1. */
export function musicTick(dt, tension) {
  if (ctx === null || muted) return;
  beatClock -= dt;
  if (beatClock > 0) return;
  beatClock = 0.62 - tension * 0.28;
  beatIndex = (beatIndex + 1) % 8;
  const root = 110;
  const degree = [0, 2, 4, 2, 0, 3, 5, 3][beatIndex];
  const note = root * Math.pow(2, SCALE[degree] / 12);
  tone(note, note * 0.99, 0.5, 'sine', 0.07 + tension * 0.03);
  if (beatIndex % 4 === 0) tone(root / 2, root / 2, 0.6, 'triangle', 0.09);
  if (tension > 0.5 && beatIndex % 2 === 1) tone(note * 2, note * 2, 0.12, 'square', 0.03);
}
