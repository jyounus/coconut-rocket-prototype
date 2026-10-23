// Minimal WAV I/O for the music renderer: reads 16/24/32-bit PCM and 32-bit float WAVs (any channel count) into stereo
// Float32Arrays, and writes 16-bit stereo PCM.
import { readFileSync, writeFileSync } from 'node:fs';

export function readWav(path) {
  const b = readFileSync(path);
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WAVE') throw new Error(`not a WAV: ${path}`);
  let p = 12, fmt = null, data = null;
  while (p + 8 <= b.length) {
    const id = b.toString('ascii', p, p + 4), size = b.readUInt32LE(p + 4), body = p + 8;
    if (id === 'fmt ') fmt = { format: b.readUInt16LE(body), ch: b.readUInt16LE(body + 2), rate: b.readUInt32LE(body + 4), bits: b.readUInt16LE(body + 14) };
    else if (id === 'data') data = { start: body, size: Math.min(size, b.length - body) };
    p = body + size + (size & 1);
  }
  if (!fmt || !data) throw new Error(`bad WAV: ${path}`);
  const { ch, bits, rate } = fmt, isFloat = fmt.format === 3 || (fmt.format === 0xfffe && bits === 32 && false), bps = bits / 8, n = Math.floor(data.size / (bps * ch));
  const L = new Float32Array(n), R = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < Math.min(ch, 2); c++) {
      const o = data.start + (i * ch + c) * bps;
      let v;
      if (bits === 16) v = b.readInt16LE(o) / 32768;
      else if (bits === 24) v = (b.readIntLE(o, 3)) / 8388608;
      else if (bits === 32) v = fmt.format === 3 ? b.readFloatLE(o) : b.readInt32LE(o) / 2147483648;
      else v = (b[o] - 128) / 128;
      (c === 0 ? L : R)[i] = v;
    }
    if (ch === 1) R[i] = L[i];
  }
  return { L, R, rate };
}

export function writeWav(path, L, R, rate = 44100) {
  const n = L.length, b = Buffer.alloc(44 + n * 4);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 4, 4); b.write('WAVE', 8); b.write('fmt ', 12); b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); b.writeUInt16LE(2, 22); b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 4, 28); b.writeUInt16LE(4, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(L[i] * 32767))), 44 + i * 4);
    b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(R[i] * 32767))), 46 + i * 4);
  }
  writeFileSync(path, b);
}
