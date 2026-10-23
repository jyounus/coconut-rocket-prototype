// A spectrogram image of a WAV (time across, log frequency up, brightness = level in dB), with a loudness strip under it,
// so a render can be looked at: where the instruments sit, how dense it is, how it builds.
//   node spectrogram.mjs <in.wav> <out.png> [seconds-from] [seconds-to]
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { readWav } from './wav.mjs';
const [inp, outp, fromS, toS] = process.argv.slice(2);
const { L, R, rate } = readWav(inp);
const a = Math.floor((+fromS || 0) * rate), b = Math.min(L.length, toS ? Math.floor(+toS * rate) : L.length);
const W = 1400, H = 420, LH = 60, N = 4096, hop = Math.max(1, Math.floor((b - a - N) / W));
const fft = (re, im) => { const n = re.length; for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } } for (let len = 2; len <= n; len <<= 1) { const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang); for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) { const p = i + k, q = p + len / 2, tr = re[q] * cr - im[q] * ci, ti = re[q] * ci + im[q] * cr; re[q] = re[p] - tr; im[q] = im[p] - ti; re[p] += tr; im[p] += ti; const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr; } } } };
const win = Float32Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N));
const img = Buffer.alloc((W * 3 + 1) * (H + LH)), fmin = 30, fmax = 12000, rms = [];
for (let x = 0; x < W; x++) {
  const s0 = a + x * hop, re = new Float32Array(N), im = new Float32Array(N); let e = 0;
  for (let i = 0; i < N; i++) { const v = ((L[s0 + i] || 0) + (R[s0 + i] || 0)) / 2; re[i] = v * win[i]; e += v * v; }
  rms.push(10 * Math.log10(e / N + 1e-12)); fft(re, im);
  for (let y = 0; y < H; y++) {
    const f = fmin * Math.pow(fmax / fmin, 1 - y / H), k = Math.round(f * N / rate), m = Math.hypot(re[k], im[k]) / N, db = 20 * Math.log10(m + 1e-9);
    const v = Math.max(0, Math.min(1, (db + 95) / 70));   // -95..-25 dB
    const r = Math.min(255, v * 2.2 * 255), g = Math.min(255, Math.max(0, (v - 0.35) * 1.8 * 255)), bl = Math.min(255, Math.max(0, (v * 1.4 - 0.9) * 255 + (v < 0.4 ? v * 200 : 0)));
    const o = y * (W * 3 + 1) + 1 + x * 3; img[o] = r; img[o + 1] = g; img[o + 2] = bl;
  }
}
// the loudness strip (RMS, -45..-10 dBFS) and a grid line every 10 s along the top
for (let x = 0; x < W; x++) { const h = Math.max(0, Math.min(LH, (rms[x] + 45) / 35 * LH)); for (let y = 0; y < LH; y++) { const o = (H + y) * (W * 3 + 1) + 1 + x * 3, on = LH - y <= h; img[o] = on ? 90 : 20; img[o + 1] = on ? 200 : 20; img[o + 2] = on ? 255 : 30; } }
const secs = (b - a) / rate; for (let s = 10; s < secs; s += 10) { const x = Math.round(s / secs * W); for (let y = 0; y < H + LH; y += 3) { const o = y * (W * 3 + 1) + 1 + x * 3; img[o] = img[o + 1] = img[o + 2] = 200; } }
for (let y = 0; y < H + LH; y++) img[y * (W * 3 + 1)] = 0;
const crc = (buf) => { let c = ~0; for (const v of buf) { c ^= v; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return ~c >>> 0; };
const chunk = (t, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]), c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H + LH, 4); ihdr[8] = 8; ihdr[9] = 2;
writeFileSync(outp, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(img)), chunk('IEND', Buffer.alloc(0))]));
console.log(`${outp}: ${secs.toFixed(1)} s`);
