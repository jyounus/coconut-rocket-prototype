// "Reef": sea and reef, under water (Hidden Lagoon, Jelly Drift, Shipwreck Hold, Cascade Falls).
//
// The feel: the dreamy, floating water stages of the Donkey Kong Country Returns / Tropical Freeze scores (a feel, not
// their notes): F Lydian (the raised fourth, B natural, over an F pedal: Fadd9 to G/F, the "floating" colour), a slow
// bossa on soft congas, shaker and a rim click instead of a drum kit, harp arpeggios in sixteenths that never stop, a
// breathing string pad with slow swells, a long singing flute melody answered by a soft horn chorale, flute and clarinet
// in thirds, glockenspiel and marimba sparkle, bubbles, and cymbal swells instead of crashes. The climax is the hook
// again a tender whole step up (G Lydian), the violins joining the flute, the horns a warm chorale, never loud.
// (Tempo 88 rather than the plan's 92: a slower bossa breathes more and sits further from frost's 92.)
//
// Form (88 bpm, 36 bars; the loop is bars 5-36, 87.3 s):
//   intro  4  Fadd9 / G/F: harp, pad, bubbles and chimes; the flute's first phrase; the congas tiptoe in
//   A      8  the hook: flute calls (bars 1-2, 5-6), horns answer (3-4), flute and clarinet in thirds (7-8); bossa groove
//   B      8  the lift (D minor / B-flat, an E-flat colour at the end): violins in octaves, horn chorale, clarinet line
//   climax 8  the hook a step up (G): flute and violins in octaves, clarinet thirds, horns and trombones, glockenspiel
//   break  4  harp, pad and bubbles; the clarinet and flute trade the hook's head; the drums down to a heartbeat
//   build  4  Bbadd9 Am7 Gm7 Csus4: the groove returns, rising pizzicato, flute and clarinet climbing, a swell home
//
// Stems: strings (pad, harp, pizzicato bass, the lift's melody, the climax's violins), brass (horn answers and chorale,
// trombones), piano (the brass lines on piano), perc (congas, shaker, rim, kick, timpani, cymbal swells, bubbles),
// winds (flute, clarinet, marimba, glockenspiel).
import { ph, voicing, atOrAbove, nearestTone, pc } from '../lib.mjs';

// ---- the score ----
const CHORDS = {
  intro: ['Fadd9', 'G/F', 'Fadd9', 'G/F'],
  A: ['Fadd9', 'G/F', 'Fadd9', 'G/F', 'Dm7', 'Bbadd9', 'Gm7', 'Csus4'],
  B: ['Dm7', 'Am7', 'Bbadd9', 'F/A', 'Gm7', 'Dm7', 'Eb6', 'Dsus4'],
  climax: ['Fadd9', 'G/F', 'Fadd9', 'G/F', 'Dm7', 'Bbadd9', 'Gm7', 'Csus4'],
  break: ['Fadd9', 'G/F', 'Bbadd9/F', 'G/F'],
  build: ['Bbadd9', 'Am7', 'Gm7', 'Csus4'],
};
// the hook (in F; the climax plays it a step up): a long, floating line that leans on the Lydian B natural
const THEME = ph(
  [[0, 72, 3], [3, 77, 3], [6, 81, 6], [12, 79, 2], [14, 81, 2]],
  [[0, 83, 10], [10, 79, 2], [12, 74, 4]],
  [[0, 76, 6], [6, 77, 2], [8, 79, 4], [12, 72, 4]],
  [[0, 74, 6], [6, 71, 2], [8, 74, 4], [12, 79, 4]],
  [[0, 72, 3], [3, 77, 3], [6, 81, 4], [10, 84, 6]],
  [[0, 86, 6], [6, 84, 2], [8, 81, 4], [12, 77, 4]],
  [[0, 79, 4], [4, 82, 4], [8, 81, 4], [12, 77, 4]],
  [[0, 79, 8], [8, 77, 4], [12, 72, 4]]);
const WHO = ['call', 'call', 'answer', 'answer', 'call', 'call', 'both', 'both'];
// the lift's melody, sung by the violins in octaves
const LIFT = ph(
  [[0, 81, 6], [6, 77, 2], [8, 74, 4], [12, 76, 4]],
  [[0, 72, 8], [8, 76, 4], [12, 79, 4]],
  [[0, 81, 6], [6, 82, 2], [8, 86, 8]],
  [[0, 84, 6], [6, 81, 2], [8, 77, 4], [12, 79, 4]],
  [[0, 82, 6], [6, 81, 2], [8, 79, 4], [12, 74, 4]],
  [[0, 77, 6], [6, 76, 2], [8, 74, 4], [12, 81, 4]],
  [[0, 79, 4], [4, 82, 4], [8, 86, 6], [14, 84, 2]],
  [[0, 81, 8], [8, 79, 4], [12, 81, 4]]);
// the hook's head over the pedal (intro bars 3-4 on the flute; the breather: clarinet bars 1-2, flute 3-4)
const CALL = ph(
  [[4, 72, 2], [6, 77, 2], [8, 81, 8]],
  [[0, 83, 8], [8, 79, 4], [12, 74, 4]],
  [[4, 72, 2], [6, 77, 2], [8, 81, 6]],
  [[0, 79, 6], [6, 74, 2], [8, 71, 6]]);
// the build's climbing line (flute, the clarinet a third under)
const CLIMB = ph([], [[8, 72, 4], [12, 76, 4]], [[0, 74, 4], [4, 77, 4], [8, 79, 4], [12, 82, 4]], [[0, 84, 8], [8, 79, 4], [12, 77, 4]]);
// the bossa: the bass (semitones over the bass note: root, fifth), the rim's clave over two bars, the marimba's comping
const BASS = { 0: [0, 6], 6: [7, 2], 8: [0, 5], 14: [7, 2] };
const CLAVE = [[0, 6, 12], [4, 10]];
const MAR = { 2: 0, 6: 1, 10: 0, 13: 1 };

export default {
  name: 'reef', label: 'Reef', bpm: 88, keyTr: 3, seed: 5150,
  form: [['intro', 4], ['A', 8], ['B', 8], ['climax', 8], ['break', 4], ['build', 4]], loop: 4, join: 4,
  chords: CHORDS, up: { climax: 2 },
  // the key per bar, for the studio's note editor: F Lydian over the pedal, F major where B-flat is in the chord
  keyOf: B => ({ tonic: pc(5 + B.up), scale: B.sec === 'B' || B.sec === 'build' || B.C.tones.includes(pc(10 + B.up)) ? 'major' : 'lydian' }),
  mix: { send: { strings: 0.4, winds: 0.44, perc: 0.26, brass: 0.34 }, level: { strings: 1.1, perc: 1.6, winds: 1.1, brass: 1 }, room: 0.9, master: 0.8 },
  compose(S) {
    const { sp, bar, map, note, rev, rnd } = S;
    let pad = null, hornPad = null, clarLine = 62;
    map.forEach(B => {
      const { sec, i, t0, C, up } = B, X = m => m + up;
      const intro = sec === 'intro', A = sec === 'A', lift = sec === 'B', big = sec === 'climax', calm = sec === 'break', build = sec === 'build';
      const drone = intro || calm, groove = A || lift || big || build, root = C.bass, r2 = atOrAbove(root, 36);
      // the tunes in this bar (at pitch), and the passing notes the accompaniment leaves room for
      const tune = (A || big) ? THEME[i] : lift ? LIFT[i] : (intro && i >= 2) || calm ? CALL[i] : build ? CLIMB[i] : {};
      const tp = m => (A || big) ? X(m) : m;
      const pass = Object.values(tune).map(([m]) => pc(tp(m))).filter(p => !C.tones.includes(p));
      const keep = C.tones.filter(p => !pass.some(q => Math.abs(((p - q + 18) % 12) - 6) === 1)), PC = keep.length >= 2 ? { ...C, tones: keep } : C;
      const vel = v => Math.max(0.05, Math.min(1, v + (rnd() - 0.5) * 0.06));
      const at = s => Math.max(0, t0 + s * sp + (rnd() - 0.5) * 0.008);
      const piano = (m, s, len, v) => note('piano', 'piano', m, at(s), { dur: len * sp * 0.95, vel: vel(v * 0.8), pan: 0.1, rel: 0.2, att: 0.002 });
      const brass = (id, m, s, len, v, pan, o = {}) => { note('brass', id, m, at(s), { dur: len * sp * 0.93, vel: vel(v), pan, att: o.att ?? 0.08, rel: o.rel ?? 0.25 }); if (o.piano !== false) piano(m, s, len, v); };
      // a chord tone a third (or a fourth) under a melody note: the clarinet's harmony
      const under = m => { for (const d of [3, 4, 5]) if (PC.tones.includes(pc(m - d))) return m - d; return null; };
      const preLoop = intro && B.last, barEnd = t0 + bar - (preLoop ? 0.15 : 0), held = barEnd - t0 - 0.05, hr = preLoop ? 0.1 : 0.2;

      // ---- strings: the breathing pad (cellos on the bass, violas and violins voiced smoothly, slow swells) ----
      const sv = intro ? 0.46 + 0.06 * i : A ? 0.42 : lift ? 0.5 : big ? 0.58 : calm ? 0.4 : 0.36 + 0.05 * i;
      note('strings', 'vcSus', atOrAbove(root, 41), t0, { dur: held, vel: sv, pan: -0.35, att: 0.5, rel: hr });
      pad = voicing(PC, 57, 3, pad && pad.filter(m => PC.tones.includes(pc(m))).length === pad.length ? pad : null);
      pad.forEach((m, k) => note('strings', k === 0 ? 'vlaSus' : 'vlnSus', m, Math.max(0, t0 - 0.02), { dur: held + 0.01, vel: sv * 0.78, pan: -0.15 + k * 0.2, att: 0.7, rel: hr }));
      if (drone || lift) note('strings', 'cbSus', atOrAbove(root, 29) + (atOrAbove(root, 29) < 33 ? 12 : 0), t0, { dur: held, vel: sv * 0.8, pan: -0.2, att: 0.6, rel: hr });
      if (big) note('strings', 'vlaSus', atOrAbove(PC.tones[PC.tones.length - 1], 64), t0, { dur: held, vel: 0.42, pan: 0.45, att: 0.8, rel: hr });

      for (let s = 0; s < 16; s++) {
        const t = t0 + s * sp;
        // ---- the harp: sixteenths up and down two octaves of the chord, never stopping ----
        if (!(intro && i === 0 && s < 2)) {
          const base = atOrAbove(PC.root ?? C.root, 53), tones = []; for (let m = base; m < base + 24; m++) if (PC.tones.includes(pc(m))) tones.push(m);
          const idx = s < 8 ? s : 15 - s, m = tones[Math.round(idx * (tones.length - 1) / 7)] + (big ? 12 : 0);
          const hv = (intro ? 0.6 : drone ? 0.5 : big ? 0.48 : 0.4) + 0.12 * (s % 4 === 0) + (build ? 0.04 * i : 0);
          note('strings', 'harp', m, at(s), { dur: Math.min(sp * 6, barEnd - t - 0.03), vel: vel(hv), pan: 0.4 - idx * 0.08, rel: 0.15 });
        }
        // ---- the bossa bass: pizzicato contrabass and cellos, root and fifth; rising eighths through the build ----
        if (groove && !(build && i >= 2)) {
          const b = BASS[s];
          if (b) {
            const fifth = PC.tones.includes(pc(root + 7)) ? 7 : pc(C.root - root) || 12, m = r2 + (b[0] ? fifth : 0), v = big ? 0.72 : lift ? 0.66 : 0.6;
            note('strings', 'cbPizz', m, at(s), { dur: Math.min(sp * b[1], barEnd - t - 0.06), vel: vel(v), pan: -0.1, rel: 0.2 });
            note('strings', 'vcPizz', m + 12, at(s), { dur: Math.min(sp * b[1] * 0.8, barEnd - t - 0.06), vel: vel(v * 0.7), pan: -0.3, rel: 0.15 });
          }
        } else if (build && s % 2 === 0) {
          const m = r2 + [0, 7, 12, 7, 0, 7, 12, 12 + C.ivs[1]][s / 2] + (i === 3 && s >= 8 ? 12 : 0);
          note('strings', 'vcPizz', m + 12 > 72 ? m : m + 12, at(s), { dur: sp * 1.6, vel: vel(0.5 + 0.06 * i), pan: -0.3, rel: 0.2 });
          if (s % 4 === 0) note('strings', 'cbPizz', r2, at(s), { dur: sp * 3, vel: vel(0.55 + 0.05 * i), pan: -0.1, rel: 0.25 });
        } else if (calm && (s === 0 || s === 8)) note('strings', 'cbPizz', r2, at(s), { dur: sp * 6, vel: 0.42, pan: -0.1, rel: 0.4 });

        // ---- the tunes ----
        const tn = tune[s];
        if (tn && (A || big)) {
          const [m0, len] = tn, m = X(m0), w = WHO[i], d = len * sp * 0.94, h = under(m);
          if (A) {
            if (w !== 'answer') note('winds', 'flute', m, at(s), { dur: d, vel: vel(0.78), pan: 0.15, att: 0.05, rel: 0.2, gain: 1.45 });
            if (w === 'answer') brass('hnSus', m - 12, s, len, 0.66, -0.2, { att: 0.07 });
            if (w === 'both') { brass('hnSus', m - 12, s, len, 0.45, -0.2); if (h) note('winds', 'clar', h, at(s), { dur: d, vel: vel(0.55), pan: -0.15, att: 0.05, rel: 0.2, gain: 1.2 }); }
            if (w === 'call' && i >= 4 && h) note('winds', 'clar', h, at(s), { dur: d, vel: vel(0.45), pan: -0.15, att: 0.05, rel: 0.2 });
          } else {   // the climax: flute and violins in octaves, the clarinet a third under the flute
            note('winds', 'flute', m, at(s), { dur: d, vel: vel(0.8), pan: 0.15, att: 0.05, rel: 0.2, gain: 1.35 });
            note('strings', 'vlnSus', m, at(s), { dur: d, vel: vel(0.66), pan: 0.3, att: 0.07, rel: 0.2 });
            note('strings', 'vlnSus', m - 12, at(s), { dur: d, vel: vel(0.56), pan: 0.45, att: 0.07, rel: 0.2, tune: 5 });
            if (h) note('winds', 'clar', h, at(s), { dur: d, vel: vel(0.58), pan: -0.15, att: 0.05, rel: 0.2, gain: 1.15 });
          }
        }
        if (tn && lift) {   // the lift: violins in octaves, the flute doubling the top in the second half
          const [m, len] = tn, d = len * sp * 0.94;
          note('strings', 'vlnSus', m, at(s), { dur: d, vel: vel(0.74), pan: 0.25, att: 0.08, rel: 0.2 });
          note('strings', 'vlnSus', m - 12, at(s), { dur: d, vel: vel(0.6), pan: 0.4, att: 0.08, rel: 0.2, tune: 6 });
          if (i >= 4) note('winds', 'flute', m, at(s), { dur: d, vel: vel(0.5), pan: -0.2, att: 0.06, rel: 0.2 });
        }
        if (tn && drone) {   // the hook's head over the pedal
          const [m, len] = tn, d = Math.min(len * sp * 0.94, barEnd - t - 0.2), clar = calm && i < 2;
          note('winds', clar ? 'clar' : 'flute', clar ? m - 12 : m, at(s), { dur: d, vel: vel(0.66), pan: clar ? -0.15 : 0.15, att: 0.06, rel: 0.2, gain: clar ? 1.3 : 1.35 });
        }
        if (tn && build) {   // the build's climbing line in thirds
          const [m, len] = tn, d = len * sp * 0.94, h = under(m);
          note('winds', 'flute', m, at(s), { dur: d, vel: vel(0.55 + 0.08 * i), pan: 0.15, att: 0.05, rel: 0.25, gain: 1.2 });
          if (h) note('winds', 'clar', h, at(s), { dur: d, vel: vel(0.5 + 0.06 * i), pan: -0.15, att: 0.05, rel: 0.25 });
        }
        // the lift's clarinet line: two long chord notes a bar, moving by the nearest step, under the violins
        if (lift && (s === 0 || s === 8)) {
          let m = nearestTone(PC, clarLine + (s === 8 ? (clarLine > 64 ? -2 : 2) : 0)); if (s === 8 && m === clarLine) m = nearestTone(PC, clarLine + (clarLine > 64 ? -3 : 3));
          clarLine = Math.max(57, Math.min(69, m));
          note('winds', 'clar', clarLine, at(s), { dur: 8 * sp * 0.94, vel: vel(0.42), pan: -0.25, att: 0.12, rel: 0.2 });
        }
        // ---- brass: the soft horn chorale under the lift and the climax (trombones under the climax), a swell in the build ----
        if (s === 0 && (lift || big)) {
          hornPad = voicing(PC, 53, 3, hornPad && hornPad.filter(m => PC.tones.includes(pc(m))).length === 3 ? hornPad : null);
          hornPad.forEach((m, k) => brass('hnSus', m, 0, 15.5, big ? 0.6 : 0.42, -0.3 + k * 0.15, { att: 0.35, rel: 0.4 }));
          if (big) brass('tbnSus', atOrAbove(root, 41), 0, 15.5, 0.42, 0.2, { att: 0.3, rel: 0.4, piano: false });
          if (big && i % 2 === 0) note('brass', 'tubaSus', atOrAbove(root, 29) + (atOrAbove(root, 29) < 33 ? 12 : 0), t0, { dur: bar * 0.94, vel: 0.4, pan: 0.1, att: 0.3, rel: 0.4 });
        }
        if (build && s === 0 && i >= 1) voicing(C, 53, 3).forEach((m, k) => brass('hnSus', m, 0, 15, 0.28 + 0.1 * i, -0.2 + k * 0.2, { att: bar * 0.6, rel: 0.15 }));
        // ---- winds: the marimba's bossa comping, glockenspiel sparkle ----
        if ((A || big || (build && i >= 2)) && MAR[s] != null) {
          const v2 = voicing(PC, 60, 4), pair = MAR[s] ? v2.slice(2, 4) : v2.slice(0, 2);
          pair.forEach(m => note('winds', 'marimba', m, at(s), { dur: Math.min(sp * 2, barEnd - t - 0.1), vel: vel(big ? 0.5 : 0.42), pan: -0.35, rel: 0.2, gain: 0.8 }));
        }
        if (((intro && i >= 1) || calm || big || lift) && (s === 0 || s === 6 || (big && s === 12))) {
          const top = PC.tones[(s / 6 + i) % PC.tones.length], m = atOrAbove(top, big ? 86 : 84);
          note('winds', 'glock', m, at(s), { dur: Math.min(sp * 6, barEnd - t - 0.05), vel: vel(lift ? 0.3 : 0.4), pan: 0.4, rel: 0.2 });
        }

        // ---- percussion: soft and rounded ----
        const g = intro ? [0, 0, 0.55, 0.7][i] : calm ? 0.45 : build ? 0.6 + 0.08 * i : big ? 1 : lift ? 0.92 : 0.85;
        // (the very first moment is a hit: the game finds where an encoded file starts by its first sound)
        if (intro && i === 0 && s === 0) { note('perc', 'bdrum', null, 0, { vel: 0.55, filter: /^bdrum3?_(p|mp)_/, dur: 2, rel: 0.5, gain: 0.9 }); note('strings', 'harp', 41, 0, { dur: bar * 0.9, vel: 0.7, pan: -0.1, rel: 0.4 }); }
        if (s === 4 && i === 0 && drone) note('perc', 'misc', null, t, { vel: 0.5, filter: /^bubbles$/, dur: 5, rel: 1.2, gain: 0.45, pan: -0.3 });
        if (s === 0 && i === 2 && drone) note('perc', 'misc', null, t, { vel: 0.5, filter: /^bubbles2$/, dur: Math.min(5, barEnd + bar - t - 0.3), rel: 0.8, gain: 0.4, pan: 0.35 });
        if (s === 0 && i === 0 && drone) note('perc', 'chimes', null, t, { vel: 0.4, pan: 0.4, filter: /windchimes_(slowDesc|slowAsc)/, dur: 4, rel: 1, gain: 0.7 });
        // the kick: soft, on one and three (and the bossa's pickup into three at the climax); a heartbeat in the breather
        if (groove || (intro && i >= 2)) {
          if (s === 0 || (s === 8 && !(intro)) || (s === 7 && big)) note('perc', 'bdrum', null, at(s), { vel: vel((s === 7 ? 0.35 : 0.5) * g + 0.05), filter: /^bdrum3?_(p|mp)_/, dur: 1.5, rel: 0.4, gain: 0.85 });
        } else if (calm && s === 0) note('perc', 'bdrum', null, t, { vel: 0.35, filter: /^bdrum3?_(pp|p)_/, dur: 1.5, rel: 0.4, gain: 0.8 });
        // congas: the low tumba on the bossa's "and"s, quinto slaps between, light taps on the beats
        if (groove || (intro && i >= 2)) {
          if (s === 6 || s === 14) note('perc', 'conga', null, at(s), { vel: vel(0.45 * g + 0.1), pan: -0.25, filter: /^Tumba-HitN/, dur: 0.9, rel: 0.2 });
          if (!intro && (s === 3 || s === 11)) note('perc', 'conga', null, at(s), { vel: vel(0.35 * g), pan: 0.3, filter: /^Quinto-HitN/, dur: 0.7, rel: 0.2 });
          if (!intro && (s === 4 || s === 12 || (s === 9 && big))) note('perc', 'conga', null, at(s), { vel: vel(0.3 * g), pan: 0.2, filter: /^Conga-(Tap1|HitN_v1)/, dur: 0.6, rel: 0.15 });
        }
        // the rim's bossa clave (claves, softly) over two bars
        if (groove && !(build && i < 1) && CLAVE[i % 2].includes(s)) note('perc', 'claves', null, at(s), { vel: vel(0.3), pan: 0.35, filter: /_v1_/, dur: 0.4, rel: 0.1, gain: 0.55 * g });
        // the shaker in sixteenths, leaning on the off-beats
        if (groove || (intro && i >= 2)) note('perc', 'shaker', null, at(s), { vel: s % 4 === 2 ? 0.6 : 0.35, pan: 0.55, dur: 0.3, rel: 0.05, gain: (s % 4 === 2 ? 0.75 : s % 2 ? 0.5 : 0.35) * g });
        if ((lift || big) && (s === 4 || s === 12)) note('perc', 'tamb', null, at(s), { vel: vel(0.35), pan: -0.5, filter: /^Tamb1-Shake/, dur: 0.6, rel: 0.1, gain: 0.7 });
        // timpani: soft on the downbeats of the lift and the climax, rolling softly into the climax and home
        if (s === 0 && (lift || big) && i % 2 === 0) note('perc', 'timp', null, t, { vel: big ? 0.5 : 0.4, pan: -0.15, filter: /Timpani[12]_Hit_v[13]/, dur: 2.5, rel: 0.7, gain: 0.6 });
        if (s === 8 && B.intoNew && (lift || build || intro)) note('perc', 'timpRoll', null, t, { vel: 0.5, filter: /Timpani[12]_Roll_v3/, dur: intro ? barEnd - t : sp * 8, rel: intro ? 0.1 : 0.05, gain: intro ? 0.45 : 0.6 });
        // cymbal swells (a soft-mallet hit backwards) into each new section, and a gentle wash where it lands
        if (s === 0 && ((B.intoNew && !big) || (big && i === 3))) rev('perc', 'cym', /softmall_f$/, t0 + bar - (preLoop ? 0.15 : 0), { len: bar * 0.8, gain: build ? 1.4 : 1.15 });
        if (s === 0 && ((i === 0 && (A || lift || big)) || (big && i === 4))) note('perc', 'cym', null, t, { vel: 0.5, pan: 0.3, filter: /softmall_mp$/, dur: 4, rel: 1.2, gain: big ? 0.6 : 0.45 });
        if (s === 0 && i === 0 && (A || big)) note('perc', 'belltree', null, t, { vel: 0.5, pan: 0.5, dur: 3, rel: 1, gain: 0.6 });
        // a soft tom pickup at the end of the build
        if (build && i === 3 && s >= 12) note('perc', s % 2 ? 'tenorHi' : 'tenorLo', null, at(s), { vel: vel(0.4 + 0.04 * (s - 12)), pan: (s - 13.5) * 0.15, filter: /_(mp|mf|p)_/, dur: 0.6, rel: 0.2 });
      }
    });
  },
};
