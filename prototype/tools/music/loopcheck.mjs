// Checks a render's loop seam and its peaks: the step from the loop's last sample to its first (as the game plays it)
// against the steps everywhere else in the file, the level just before and after the seam, the mix's peak and length.
//   node loopcheck.mjs <track> [stem ...]          (default: the mix and the piano mix)
import { readFileSync } from 'node:fs';
import { readWav } from './wav.mjs';
const [name, ...rest] = process.argv.slice(2), info = JSON.parse(readFileSync('out/tracks.json', 'utf8'))[name];
if (!info) { console.log(`no ${name} in out/tracks.json`); process.exit(1); }
const files = rest.length ? rest.map(s => `out/${name}-${s}.wav`) : [`out/${name}.wav`, `out/${name}-pianomix.wav`];
const loopLen = info.loopEnd - info.loopStart;
console.log(`${name}: ${info.bpm} bpm, ${info.bars} bars, loop ${info.loopStart.toFixed(2)}-${info.loopEnd.toFixed(2)} s (${loopLen.toFixed(1)} s)${loopLen < 60 || loopLen > 110 ? '  << loop not within 60-110 s' : ''}`);
for (const f of files) {
  const { L, R, rate } = readWav(f), n = L.length, LS = Math.round(info.loopStart * rate), LE = n;   // (the file ends at the loop end)
  const steps = []; let peak = 0;
  for (let i = 1; i < n; i++) { steps.push(Math.max(Math.abs(L[i] - L[i - 1]), Math.abs(R[i] - R[i - 1]))); peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i])); }
  steps.sort((a, b) => a - b);
  const q = p => steps[Math.min(steps.length - 1, Math.floor(p * steps.length))];
  const seam = Math.max(Math.abs(L[LS] - L[LE - 1]), Math.abs(R[LS] - R[LE - 1]));
  // the second difference across the seam (a kink is a click too), against the file's own
  const d2 = (a, b, c) => Math.abs(a - 2 * b + c), seam2 = Math.max(d2(L[LE - 2], L[LE - 1], L[LS]), d2(L[LE - 1], L[LS], L[LS + 1]));
  const all2 = []; for (let i = 2; i < n; i += 3) all2.push(d2(L[i - 2], L[i - 1], L[i])); all2.sort((a, b) => a - b);
  // the same kink at every other bar line (a downbeat's attack is a kink of its own: the seam should look like one)
  const bl = 240 / info.bpm, bars2 = []; for (let t = info.loopStart + bl; t < info.loopEnd - 0.01; t += bl) { const j = Math.round(t * rate); bars2.push(Math.max(d2(L[j - 2], L[j - 1], L[j]), d2(L[j - 1], L[j], L[j + 1]))); }
  bars2.sort((a, b) => a - b);
  const rms = (a, b) => { let s = 0; for (let i = a; i < b; i++) s += L[i] * L[i] + R[i] * R[i]; return (10 * Math.log10(s / (2 * (b - a)) + 1e-12)).toFixed(1); };
  const w = Math.round(rate * 0.05);
  console.log(`  ${f.split('/').pop()}: peak ${peak.toFixed(3)} (${(20 * Math.log10(peak)).toFixed(1)} dBFS)` +
    `\n    seam step ${seam.toFixed(4)} (median step ${q(0.5).toFixed(4)}, 99th pct ${q(0.99).toFixed(4)}: ${seam <= q(0.99) ? 'ordinary' : 'LARGER THAN 99% OF STEPS'})` +
    `, seam kink ${seam2.toFixed(4)} (99th pct ${all2[Math.floor(all2.length * 0.99)].toFixed(4)}; at the other bar lines median ${bars2[bars2.length >> 1].toFixed(4)}, max ${bars2[bars2.length - 1].toFixed(4)})` +
    `\n    level 50 ms before the loop end ${rms(LE - w, LE)} dB, 50 ms after the loop start ${rms(LS, LS + w)} dB`);
}
