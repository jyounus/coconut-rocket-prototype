// Estimates a sample's fundamental (autocorrelation over a steady stretch) to check the library's note naming.
// usage: node pitch.mjs <wav> [...]
import { readWav } from './wav.mjs';
const name = m => ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
for (const f of process.argv.slice(2)) {
  const { L, R, rate } = readWav(f), n = Math.min(L.length, rate * 2), off = Math.min(Math.floor(rate * 0.25), Math.floor(L.length / 4));
  const x = new Float32Array(Math.min(8192, n - off)); for (let i = 0; i < x.length; i++) x[i] = (L[off + i] + R[off + i]) / 2;
  let best = 0, bl = 0; const minL = Math.floor(rate / 2000), maxL = Math.floor(rate / 25);
  const r0 = x.reduce((a, v) => a + v * v, 0);
  const ac = []; for (let lag = minL; lag < maxL && lag < x.length / 2; lag++) { let s = 0; for (let i = 0; i + lag < x.length; i++) s += x[i] * x[i + lag]; ac[lag] = s / r0; }
  // the first strong peak (avoids octave errors)
  const mx = Math.max(...ac.filter(v => v != null)); for (let lag = minL + 1; lag < ac.length - 1; lag++) if (ac[lag] > 0.85 * mx && ac[lag] >= ac[lag - 1] && ac[lag] >= ac[lag + 1]) { bl = lag; break; }
  const hz = rate / bl, midi = Math.round(69 + 12 * Math.log2(hz / 440));
  console.log(`${f.split('/').pop()}: ${hz.toFixed(1)} Hz ≈ ${name(midi)} (midi ${midi})`);
}
