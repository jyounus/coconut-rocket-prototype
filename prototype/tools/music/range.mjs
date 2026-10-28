// Which notes a track asks of each instrument against the notes it has samples for (a note far outside its samples is
// pitch-shifted a long way and sounds unnatural):  node range.mjs <track>
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import * as lib from './lib.mjs';
const name = process.argv[2], def = (await import(pathToFileURL(`${process.cwd()}/tracks/${name}.mjs`).href)).default;
const used = {}, orig = lib.renderTrack;
// run the score with note() only recording what it is asked
const S = { def, bufs: {}, sp: 60 / def.bpm / 4, bar: 240 / def.bpm, beat: 60 / def.bpm, map: [], loopStart: 0, loopEnd: 0, N: 0, rnd: lib.rnd,
  note: (stem, id, midi) => { if (midi == null) return; const u = used[id] || (used[id] = [999, -1, 0]); u[0] = Math.min(u[0], midi); u[1] = Math.max(u[1], midi); u[2]++; }, rev: () => {} };
const sp = S.sp, bar = S.bar;
for (const [sec, n] of def.form) for (let i = 0; i < n; i++) { const list = def.chords[sec], up = (def.up && def.up[sec]) || 0, nm = lib.transName(list[i % list.length], up); S.map.push({ b: S.map.length, sec, i, n, up, ch: nm, C: lib.chord(nm), t0: S.map.length * bar }); }
S.map.forEach((B, b) => { B.next = S.map[(b + 1) % S.map.length]; B.last = B.i === B.n - 1; B.intoNew = B.last && B.next.sec !== B.sec; });
def.compose(S);
for (const [id, [lo, hi, n]] of Object.entries(used)) {
  const ms = lib.index(id).map(s => s.midi), slo = Math.min(...ms), shi = Math.max(...ms);
  const warn = lo < slo - 3 || hi > shi + 3 ? `  << beyond its samples by ${Math.max(slo - lo, hi - shi)} semitones` : '';
  console.log(`${id.padEnd(9)} plays ${lib.noteName(lo)}-${lib.noteName(hi)} (${n} notes); samples ${lib.noteName(slo)}-${lib.noteName(shi)}${warn}`);
}
