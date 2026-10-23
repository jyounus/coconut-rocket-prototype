// Per-section loudness of a render and its stems, and how much of its energy sits below 40 Hz (rumble)
//   node levels.mjs <track>
import { readFileSync } from 'node:fs';
import { readWav } from './wav.mjs';
const name = process.argv[2], info = JSON.parse(readFileSync('out/tracks.json', 'utf8'))[name];
const files = { mix: `out/${name}.wav`, ...Object.fromEntries(info.stems.map(s => [s, `out/${name}-${s}.wav`])) };
const secs = info.sections.map((s, i) => ({ ...s, end: info.sections[i + 1] ? info.sections[i + 1].at : info.loopEnd }));
const rows = [];
for (const [k, f] of Object.entries(files)) {
  const { L, R, rate } = readWav(f);
  const db = (a, b) => { let s = 0; for (let i = a; i < b; i++) s += L[i] * L[i] + R[i] * R[i]; return (10 * Math.log10(s / (2 * (b - a)) + 1e-12)).toFixed(1); };
  rows.push(k.padEnd(8) + secs.map(s => `${s.name} ${db(Math.floor(s.at * rate), Math.floor(s.end * rate))}`).join(' | '));
  if (k === 'mix') {   // energy below 40 Hz: a one-pole low-pass at 40 Hz
    let lo = 0, all = 0, y = 0; const a = 1 - Math.exp(-2 * Math.PI * 40 / rate);
    for (let i = 0; i < L.length; i++) { const x = (L[i] + R[i]) / 2; y += a * (x - y); lo += y * y; all += x * x; }
    rows.push(`  below 40 Hz: ${(lo / all * 100).toFixed(1)}% of the energy`);
  }
}
console.log(rows.join('\n'));
