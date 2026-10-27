/**
 * Synthesizes the demo video's background music: an original, royalty-free
 * instrumental (pad, piano-like arpeggio, bass, light drums) at 96 BPM.
 *
 *   npx tsx scripts/demo/make-music.ts <out.wav> <seconds>
 */
import { writeFileSync } from "fs";

const [out, secondsArg] = process.argv.slice(2);
if (!out || !secondsArg) {
  console.error("Usage: make-music.ts <out.wav> <seconds>");
  process.exit(1);
}

const RATE = 44100;
const BPM = 96;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;
const seconds = Number(secondsArg);
const length = Math.ceil(seconds * RATE);
const left = new Float32Array(length);
const right = new Float32Array(length);

const midiHz = (note: number) => 440 * Math.pow(2, (note - 69) / 12);

// Cmaj7 – G6 – Am7 – Fmaj9, one chord per bar.
const chords = [
  [48, 55, 59, 64, 67],
  [43, 55, 59, 62, 64],
  [45, 55, 60, 64, 67],
  [41, 57, 60, 64, 67],
];

// Deterministic noise so every render sounds the same.
let seed = 7;
const noise = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 2 ** 31 - 1;
};

function add(at: number, samples: number, pan: number, voice: (t: number, i: number) => number) {
  const start = Math.round(at * RATE);
  const gainL = Math.cos((pan + 1) * Math.PI / 4);
  const gainR = Math.sin((pan + 1) * Math.PI / 4);
  for (let i = 0; i < samples && start + i < length; i++) {
    const value = voice(i / RATE, i);
    left[start + i] += value * gainL;
    right[start + i] += value * gainR;
  }
}

/** Soft pad: detuned triangle-ish voices with slow attack and release. */
function pad(at: number, duration: number, note: number, gain: number, pan: number) {
  const hz = midiHz(note);
  let low = 0;
  add(at, Math.round((duration + 1.2) * RATE), pan, (t) => {
    const env = Math.min(1, t / 0.9) * (t > duration ? Math.max(0, 1 - (t - duration) / 1.2) : 1);
    let raw = 0;
    for (const detune of [-0.12, 0, 0.11]) {
      const phase = (t * hz * Math.pow(2, detune / 12)) % 1;
      raw += 1 - 4 * Math.abs(phase - 0.5);
    }
    low += 0.08 * (raw / 3 - low);
    return low * env * gain;
  });
}

/** Electric-piano-like pluck: sine with soft harmonics and a fast decay. */
function pluck(at: number, note: number, gain: number, pan: number) {
  const hz = midiHz(note);
  add(at, Math.round(1.6 * RATE), pan, (t) => {
    const env = Math.exp(-t * 3.2) * Math.min(1, t / 0.004);
    const w = 2 * Math.PI * hz * t;
    return (Math.sin(w) + 0.35 * Math.sin(2 * w) * Math.exp(-t * 6) + 0.12 * Math.sin(3 * w) * Math.exp(-t * 9)) * env * gain;
  });
}

function bass(at: number, duration: number, note: number, gain: number) {
  const hz = midiHz(note);
  add(at, Math.round((duration + 0.05) * RATE), 0, (t) => {
    const env = Math.min(1, t / 0.01) * (t > duration ? Math.max(0, 1 - (t - duration) / 0.05) : Math.exp(-t * 0.8));
    const w = 2 * Math.PI * hz * t;
    return Math.tanh(1.6 * (Math.sin(w) + 0.25 * Math.sin(2 * w))) * env * gain;
  });
}

function kick(at: number, gain: number) {
  let phase = 0;
  add(at, Math.round(0.35 * RATE), 0, (t) => {
    phase += (48 + 90 * Math.exp(-t * 28)) / RATE;
    return Math.sin(2 * Math.PI * phase) * Math.exp(-t * 9) * gain;
  });
}

function hat(at: number, gain: number, pan: number) {
  let last = 0;
  add(at, Math.round(0.06 * RATE), pan, (t) => {
    const n = noise();
    const high = n - last;
    last = n;
    return high * Math.exp(-t * 70) * gain;
  });
}

function clap(at: number, gain: number) {
  let low = 0;
  add(at, Math.round(0.22 * RATE), 0, (t) => {
    low += 0.35 * (noise() - low);
    const bursts = t < 0.03 ? 0.6 + 0.4 * Math.sin(t * 900) : 1;
    return (noise() - low) * Math.exp(-t * 22) * bursts * gain;
  });
}

const bars = Math.ceil(seconds / BAR);
for (let bar = 0; bar < bars; bar++) {
  const at = bar * BAR;
  const chord = chords[bar % chords.length];
  // The arrangement builds in, then thins out for the ending.
  const fromEnd = bars - bar;
  const withBass = bar >= 2 && fromEnd > 1;
  const withDrums = bar >= 4 && fromEnd > 2;
  const withClap = bar >= 8 && fromEnd > 2;

  chord.slice(1).forEach((note, i) => pad(at, BAR, note, 0.07, -0.5 + i * 0.33));

  // Up-and-down 8th-note arpeggio over the upper chord tones.
  const arp = [...chord.slice(1), chord[1] + 12, ...chord.slice(1).reverse()].map((n) => n + 12);
  for (let step = 0; step < 8; step++) {
    pluck(at + step * BEAT / 2, arp[step % arp.length], step % 2 ? 0.07 : 0.1, step % 2 ? 0.35 : -0.35);
  }

  if (withBass) {
    const root = chord[0] - 12;
    bass(at, BEAT * 1.5, root, 0.12);
    bass(at + BEAT * 1.5, BEAT * 0.5, root, 0.08);
    bass(at + BEAT * 2, BEAT * 1.5, root, 0.11);
    bass(at + BEAT * 3.5, BEAT * 0.5, root + 12, 0.07);
  }
  if (withDrums) {
    kick(at, 0.4);
    kick(at + BEAT * 2, 0.36);
    kick(at + BEAT * 2.75, 0.25);
    for (let step = 0; step < 8; step++) hat(at + step * BEAT / 2, step % 2 ? 0.09 : 0.05, step % 2 ? 0.3 : -0.2);
  }
  if (withClap) {
    clap(at + BEAT, 0.12);
    clap(at + BEAT * 3, 0.12);
  }
}

// Dotted-8th stereo echo for space.
const delay = Math.round(BEAT * 0.75 * RATE);
for (let i = delay; i < length; i++) {
  left[i] += right[i - delay] * 0.22;
  right[i] += left[i - delay] * 0.22;
}

// Fade in and out, then normalize to -1 dBFS.
const fadeIn = 1.5 * RATE;
const fadeOut = 3 * RATE;
let peak = 0;
for (let i = 0; i < length; i++) {
  const fade = Math.min(1, i / fadeIn, (length - i) / fadeOut);
  left[i] *= fade;
  right[i] *= fade;
  peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
}
const scale = 0.89 / peak;

const wav = Buffer.alloc(44 + length * 4);
wav.write("RIFF", 0);
wav.writeUInt32LE(36 + length * 4, 4);
wav.write("WAVEfmt ", 8);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(2, 22);
wav.writeUInt32LE(RATE, 24);
wav.writeUInt32LE(RATE * 4, 28);
wav.writeUInt16LE(4, 32);
wav.writeUInt16LE(16, 34);
wav.write("data", 36);
wav.writeUInt32LE(length * 4, 40);
for (let i = 0; i < length; i++) {
  wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, left[i] * scale)) * 32767), 44 + i * 4);
  wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, right[i] * scale)) * 32767), 46 + i * 4);
}
writeFileSync(out, wav);
console.log(`Wrote ${out} (${seconds}s at ${BPM} BPM)`);
