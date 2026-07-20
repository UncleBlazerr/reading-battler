// Generates small procedural placeholder sound effects into public/audio/.
//
// These are PLACEHOLDERS. The intended final assets are CC0 sounds from
// Kenney.nl (Interface Sounds / Impact Sounds packs). See docs/worklog.md.
// Regenerate with:  node tools/gen-placeholder-audio.mjs
//
// No dependencies — writes 16-bit mono PCM WAV files by hand.

import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const SAMPLE_RATE = 44100;
const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "audio");
mkdirSync(outDir, { recursive: true });

/** Build a mono Float32 buffer of `seconds` length using a per-sample fn. */
function synth(seconds, fn) {
  const n = Math.floor(seconds * SAMPLE_RATE);
  const buf = new Float32Array(n);
  for (let i = 0; i < n; i++) buf[i] = fn(i / SAMPLE_RATE, i, n);
  return buf;
}

const clamp = (v) => Math.max(-1, Math.min(1, v));
/** Exponential decay envelope. */
const decay = (t, rate) => Math.exp(-t * rate);
const sine = (t, f) => Math.sin(2 * Math.PI * f * t);
const noise = () => Math.random() * 2 - 1;

function writeWav(name, samples) {
  const dataLen = samples.length * 2;
  const buf = Buffer.alloc(44 + dataLen);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataLen, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(SAMPLE_RATE, 24);
  buf.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataLen, 40);
  for (let i = 0; i < samples.length; i++) {
    buf.writeInt16LE(Math.round(clamp(samples[i]) * 32000), 44 + i * 2);
  }
  writeFileSync(join(outDir, name), buf);
  console.log("wrote", name, `(${(dataLen / 1024).toFixed(1)} KB)`);
}

// Fire: noisy whoosh with a low rumble.
writeWav(
  "fire.wav",
  synth(0.45, (t) => clamp((noise() * 0.5 + sine(t, 90) * 0.5) * decay(t, 8)) * 0.8),
);

// Lightning: bright crackle with fast high-frequency zap.
writeWav(
  "lightning.wav",
  synth(0.4, (t) => clamp((noise() * 0.7 + sine(t, 1400 - t * 1500) * 0.3) * decay(t, 14)) * 0.8),
);

// Ice: shimmering high sine cluster.
writeWav(
  "ice.wav",
  synth(0.5, (t) =>
    clamp((sine(t, 1200) + sine(t, 1810) * 0.6 + sine(t, 2400) * 0.4) * decay(t, 6)) * 0.5,
  ),
);

// Impact: short thud when the attack lands.
writeWav(
  "impact.wav",
  synth(0.18, (t) => clamp((sine(t, 160 - t * 300) + noise() * 0.4) * decay(t, 30)) * 0.9),
);

// Wrong: gentle, non-punishing low "boop" (soft fail).
writeWav(
  "wrong.wav",
  synth(0.25, (t) => sine(t, 220 - t * 120) * decay(t, 9) * 0.5),
);

// Tap: tiny click for picking a card.
writeWav(
  "tap.wav",
  synth(0.06, (t) => sine(t, 660) * decay(t, 40) * 0.4),
);

// Win: happy ascending arpeggio (C-E-G-C).
const notes = [523.25, 659.25, 783.99, 1046.5];
writeWav(
  "win.wav",
  synth(0.7, (t) => {
    const step = Math.min(notes.length - 1, Math.floor(t / 0.15));
    const local = t - step * 0.15;
    return sine(local, notes[step]) * decay(local, 6) * 0.5;
  }),
);

console.log("Placeholder audio generated in", outDir);
