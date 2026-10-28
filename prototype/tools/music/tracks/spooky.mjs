// "Spooky": bog, night, haunted and magic (Murk Mire, Snapjaw Swamp, Haunted Lighthouse, Wizard's Spire).
//
// The feel: the creepy swamp and haunted stages of the Donkey Kong Country Returns / Tropical Freeze scores (a feel, not
// their notes): a sneaky, slightly comic tiptoe theme in staccato bassoon and low clarinet over a walking pizzicato bass,
// answered by a music-box glockenspiel and pizzicato violins; eerie tremolo strings above, a slinking swung shuffle on
// log drums and muted congas; a lift where the horns sing a broad minor tune over a Neapolitan turn; then the theme a
// semitone higher (B-flat minor) for a dramatic climax with the organ, horns and trumpets; a music-box breather.
//
// Key: A harmonic minor (keyTr -5; the lift in A natural minor), the climax up a semitone. 100 bpm, swung eighths.
// Form (36 bars; the loop is bars 5-36, 76.8 s):
//   intro  4  a hit, tremolo shimmer, the music box alone, log drums creeping in
//   A      8  the tiptoe theme: bassoon + clarinet call (bars 1-2, 5-6), music box + pizzicato violins answer (3-4),
//             together with soft horns (7-8); walking pizzicato bass, the swamp shuffle
//   B      8  the lift: horns sing (piano mirror), clarinet countermelody, harp, the shuffle fuller, snare taps
//   climax 8  the theme a semitone up: horns + violins call, trumpets + glockenspiel answer, organ chords and pedal,
//             timpani, giant drum, gong
//   break  4  the music box over the drone and the tremolo, a heartbeat
//   build  4  Dm F Bb E7: pizzicato climbing, a timpani roll, horns swelling, a ghostly cymbal swell into the theme
//
// Stems: strings (tremolo pad, pizzicato bass, harp, pizzicato answers), brass (horns, trumpets, trombones), piano
// (the brass lines), perc (logs, congas, drums, cymbals, bells), winds (bassoon, clarinet, glockenspiel, organ, flute).
import { ph, voicing, atOrAbove, nearestTone, pc } from '../lib.mjs';

const CHORDS = {
  intro: ['Am', 'Dm/A', 'Am', 'E7'],
  A: ['Am', 'Am/G', 'F', 'E', 'Am', 'Am/G', 'Dm', 'E7'],
  B: ['F', 'G', 'Em', 'Am', 'Dm', 'Bb', 'E', 'F7'],
  climax: ['Am', 'Am/G', 'F', 'E', 'Am', 'Am/G', 'Dm', 'E7'],
  break: ['Am', 'Dm/A', 'Am', 'E7'],
  build: ['Dm', 'F', 'Bb', 'E7'],
};
// the tiptoe theme (written for the clarinet; the bassoon an octave down). Bars 1-2 and 5-6 the call, 3-4 the answer
const THEME = ph(
  [[0, 57, 2], [2, 60, 2], [4, 64, 2], [6, 63, 2], [8, 64, 2], [12, 69, 4]],
  [[0, 67, 2], [2, 65, 2], [4, 64, 2], [6, 63, 2], [8, 64, 4], [12, 60, 2], [14, 59, 2]],
  [[0, 72, 2], [2, 69, 2], [4, 77, 2], [6, 76, 2], [8, 74, 2], [10, 72, 2], [12, 69, 4]],
  [[0, 68, 4], [4, 71, 2], [6, 74, 2], [8, 71, 2], [10, 68, 2], [12, 64, 4]],
  [[0, 57, 2], [2, 60, 2], [4, 64, 2], [6, 63, 2], [8, 64, 2], [10, 72, 2], [12, 71, 2], [14, 69, 2]],
  [[0, 67, 2], [2, 66, 2], [4, 65, 2], [6, 64, 2], [8, 63, 2], [10, 64, 2], [12, 67, 4]],
  [[0, 65, 4], [4, 69, 2], [6, 74, 4], [10, 72, 2], [12, 69, 2], [14, 65, 2]],
  [[0, 64, 2], [2, 68, 2], [4, 71, 2], [6, 74, 2], [8, 76, 4], [12, 71, 2], [14, 68, 2]]);
const WHO = ['call', 'call', 'answer', 'answer', 'call', 'call', 'both', 'both'];
// the lift's tune: the horns
const LIFT = ph(
  [[0, 65, 6], [6, 69, 2], [8, 72, 8]],
  [[0, 71, 6], [6, 67, 2], [8, 62, 8]],
  [[0, 64, 6], [6, 67, 2], [8, 71, 6], [14, 72, 2]],
  [[0, 69, 12], [12, 64, 4]],
  [[0, 65, 4], [4, 69, 4], [8, 74, 8]],
  [[0, 74, 6], [6, 70, 2], [8, 65, 8]],
  [[0, 68, 6], [6, 71, 2], [8, 76, 8]],
  [[0, 75, 6], [6, 72, 2], [8, 69, 4], [12, 65, 4]]);
// the music box (intro and breather; the glockenspiel an octave up)
const CALL = ph(
  [[8, 76, 2], [10, 75, 2], [12, 76, 2], [14, 81, 2]],
  [[0, 77, 4], [4, 76, 2], [6, 74, 2], [8, 77, 4], [12, 81, 4]],
  [[0, 76, 2], [2, 75, 2], [4, 76, 2], [6, 72, 2], [8, 69, 8]],
  [[0, 68, 4], [4, 71, 4], [8, 74, 6]]);
// swing: the off-beat eighth is late (a triplet feel)
const sw = s => (s % 4 === 2 ? s + 0.62 : s);

export default {
  name: 'spooky', label: 'Spooky', bpm: 100, keyTr: -5, seed: 6613,
  form: [['intro', 4], ['A', 8], ['B', 8], ['climax', 8], ['break', 4], ['build', 4]], loop: 4, join: 4,
  chords: CHORDS, up: { climax: 1 },
  keyOf: B => B.sec === 'B' ? { tonic: 9, scale: 'minor' } : { tonic: pc(9 + B.up), scale: 'harmonic' },
  mix: { send: { strings: 0.36, winds: 0.36, perc: 0.22, brass: 0.3 }, level: { strings: 1.1, perc: 2.2, winds: 1.15 } },
  compose(S) {
    const { sp, bar, map, note, rev, rnd } = S;
    let pad = null, cl = 64;
    map.forEach(B => {
      const { sec, i, t0, C, up } = B, X = m => m + up;
      const intro = sec === 'intro', A = sec === 'A', lift = sec === 'B', big = sec === 'climax', calm = sec === 'break', build = sec === 'build';
      const drone = intro || calm, root = C.bass, r2 = atOrAbove(root, 33), lv = intro ? i : 0;
      const tune = (A || big) ? THEME[i] : lift ? LIFT[i] : drone ? CALL[i] : {};
      const pass = Object.values(tune).map(([m]) => pc(lift || drone ? m : X(m))).filter(p => !C.tones.includes(p));
      const keep = C.tones.filter(p => !pass.some(q => Math.abs(((p - q + 18) % 12) - 6) === 1)), PC = keep.length >= 1 ? { ...C, tones: keep } : C;
      const vel = v => Math.max(0.05, Math.min(1, v + (rnd() - 0.5) * 0.06));
      const at = s => t0 + sw(s) * sp + 0.002 + rnd() * 0.006;   // (always a hair after the grid: nothing lands exactly on a bar line)
      const len16 = (s, l) => (sw(s + l) - sw(s)) * sp;
      const preLoop = intro && B.last, barEnd = t0 + bar - (preLoop ? 0.15 : 0), held = barEnd - t0 - 0.06, hr = preLoop ? 0.1 : 0.22;
      const tp = t0 + 0.004;   // (held notes start a hair after the bar line: the loop's seam stays an ordinary bar line)
      const clip = (t, d) => Math.max(0.05, Math.min(d, barEnd - t - 0.03));
      const piano = (m, s, l, v) => note('piano', 'piano', m, at(s), { dur: len16(s, l) * 0.92, vel: vel(v * 0.85), pan: 0.1, rel: 0.2, att: 0.002 });
      const brass = (id, m, s, l, v, pan, o = {}) => { note('brass', id, m, at(s), { dur: Math.min(len16(s, l) * 0.92, barEnd - t0 - sw(s) * sp - 0.05), vel: vel(v), pan, att: o.att ?? 0.05, rel: o.rel ?? 0.18 }); if (o.piano !== false) piano(m, s, l, v); };

      // ---- strings: the pad. Tremolo violins and violas (eerie, quiet), cellos holding the bass ----
      const sv = intro ? 0.62 : A ? 0.45 : lift ? 0.7 : big ? 0.72 : calm ? 0.62 : 0.5 + 0.1 * i;
      pad = voicing(PC, 57, 3, pad && pad.every(m => PC.tones.includes(pc(m))) ? pad : null);
      pad.forEach((m, k) => note('strings', 'vlnTrem', m, t0 + 0.004, { dur: held, vel: sv * (0.75 + 0.1 * k), pan: -0.3 + k * 0.3, att: 0.25, rel: hr, gain: A ? 1.7 : calm ? 0.85 : intro ? 0.8 + 0.2 * lv : 1 }));   // (the tremolo's loud layer, played softly: its bow noise is the shimmer)
      if (drone && !(intro && i === 0)) note('strings', 'vlnTrem', atOrAbove(C.root, 81) + 7 <= 88 ? atOrAbove(C.root, 81) : atOrAbove(C.root, 69), tp, { dur: held, vel: 0.28, pan: 0.5, att: 0.6, rel: hr });   // (a high shimmer)
      const lowV = drone ? 0.45 : sv * 0.9;   // (the drone's cellos and basses on their softer layer)
      note('strings', 'vcSus', atOrAbove(root, 40), tp, { dur: held, vel: lowV, pan: -0.4, att: 0.15, rel: hr });
      if (drone || big || build) note('strings', 'cbSus', atOrAbove(root, 33), tp, { dur: held, vel: lowV * 0.95, pan: -0.2, att: 0.2, rel: hr });
      if (big) note('strings', 'vcTrem', atOrAbove(C.root, 45), tp, { dur: held, vel: 0.55, pan: -0.5, att: 0.1, rel: hr });

      // ---- the walking pizzicato bass: root, a chord tone, the octave, a chromatic step into the next bar ----
      if (A || lift || big) {
        const near = (m, ps) => ps.some(p => Math.abs(((pc(m) - p + 18) % 12) - 6) <= 1 && pc(m) !== p), tn = Object.values(tune).map(([m]) => pc(lift ? m : X(m)));
        const nb = atOrAbove(B.next.C.bass, 33), cand = [nb - 1, nb + 1, nb - 2, nb + 2].find(m => !near(m, C.tones) && !near(m, tn) && !tn.includes(pc(m)) || C.tones.includes(pc(m))) ?? atOrAbove(C.root, 33);
        const fifth = PC.tones.includes(pc(C.root + 7)) ? atOrAbove(C.root + 7, 33) : atOrAbove(PC.tones[1] ?? C.root, 33);
        const walk = [[0, r2], [4, fifth], [8, atOrAbove(PC.tones[0], 40)], [12, cand < 36 ? cand + 12 : cand]];
        walk.forEach(([s, m]) => {
          const v = (big ? 0.85 : lift ? 0.75 : 0.68) * (s === 0 ? 1 : 0.85);
          note('strings', 'cbPizz', m, at(s), { dur: clip(at(s), sp * 3.5), vel: vel(v), pan: -0.1, rel: 0.15 });
          note('strings', 'vcPizz', m + 12, at(s), { dur: clip(at(s), sp * 3), vel: vel(v * 0.7), pan: -0.3, rel: 0.12 });
        });
        if (rnd() < 0.5 && !big) note('strings', 'vcPizz', r2 + 12, at(14), { dur: clip(at(14), sp), vel: 0.4, pan: -0.3, rel: 0.1 });   // (a swung pickup now and then)
      } else if (calm && i % 2 === 0) note('strings', 'cbPizz', r2, t0, { dur: sp * 6, vel: 0.5, pan: -0.1, rel: 0.3 });
      else if (build) for (let s = 0; s < 16; s += 2) { const m = atOrAbove(C.root, 45) + [0, 7, 12, 7, 0, 7, 12, 12 + C.ivs[1]][s / 2] + (i >= 2 && s >= 8 ? 12 : 0); note('strings', 'vcPizz', m, at(s), { dur: clip(at(s), sp * 1.5), vel: vel(0.5 + 0.1 * i), pan: -0.3, rel: 0.15 }); if (s % 4 === 0) note('strings', 'cbPizz', r2, at(s), { dur: clip(at(s), sp * 3), vel: vel(0.55 + 0.08 * i), pan: -0.1, rel: 0.2 }); }

      // ---- the harp: a glissando up into each new section, rippling arpeggios through the lift ----
      if (B.intoNew && (A || lift || build || intro)) {
        const tones = []; for (let m = 55; m < 92 && tones.length < 12; m++) if (PC.tones.includes(pc(m))) tones.push(m);
        const gl = preLoop ? 2.4 : 4;   // (the intro's glissando is done before the loop's bar line)
        tones.forEach((m, k) => note('strings', 'harp', m, t0 + (12 + k * gl / tones.length) * sp, { dur: clip(t0 + (12 + k * gl / tones.length) * sp, sp * 4), vel: 0.4 + 0.03 * k, pan: -0.3 + k * 0.05, rel: 0.1 }));
      }
      if (lift || calm) for (let s = 0; s < 16; s += 2) {
        const base = atOrAbove(C.root, 52), tones = []; for (let m = base; m < base + 24; m++) if (PC.tones.includes(pc(m))) tones.push(m);
        const k = s / 2, idx = k < 4 ? k * 2 : (7 - k) * 2, m = tones[Math.min(tones.length - 1, Math.round(idx * (tones.length - 1) / 6))];
        note('strings', 'harp', m, at(s), { dur: clip(at(s), sp * 5), vel: vel(calm ? 0.5 : 0.42), pan: 0.35, rel: 0.12 });
      }

      for (let s = 0; s < 16; s++) {
        const t = at(s);
        // ---- the tunes ----
        const th = (A || big) ? THEME[i][s] : null, lf = lift ? LIFT[i][s] : null, ca = drone ? CALL[i][s] : null;
        if (th) {
          const [m0, l] = th, m = X(m0), w = WHO[i], d = len16(s, l), short = l <= 2;
          if (A) {
            if (w === 'call' || w === 'both') {
              note('winds', short ? 'bsnStac' : 'bsn', m - 12, t, { dur: short ? d * 0.6 : d * 0.9, vel: vel(0.72), pan: -0.1, att: 0.01, rel: 0.12, gain: 1.2 });
              note('winds', short ? 'clarStac' : 'clar', m, t, { dur: short ? d * 0.55 : d * 0.9, vel: vel(0.6), pan: 0.2, att: 0.01, rel: 0.12, gain: 0.85 });
            }
            if (w === 'answer' || w === 'both') {
              note('winds', 'glock', m + 12, t, { dur: clip(t, d * 0.95), vel: vel(w === 'both' ? 0.5 : 0.62), pan: 0.4, rel: 0.12, gain: 0.85 });
              note('strings', 'vlnPizz', m, t, { dur: clip(t, Math.min(d, sp * 2)), vel: vel(0.62), pan: 0.3, rel: 0.1 });
            }
            if (w === 'both') brass('hnSus', m - 12, s, l, 0.48, -0.25);
          } else {
            if (w === 'call' || w === 'both') {
              brass('hnSus', m, s, l, 0.85, -0.2);
              note('strings', 'vlnSus', m + 12, t, { dur: d * 0.9, vel: vel(0.68), pan: 0.3, att: 0.03, rel: 0.15 });
              note('winds', short ? 'bsnStac' : 'bsn', m - 12, t, { dur: short ? d * 0.6 : d * 0.9, vel: vel(0.7), pan: -0.1, att: 0.01, rel: 0.12, gain: 1.2 });
            }
            if (w === 'answer' || w === 'both') {
              brass('tptSus', m, s, l, w === 'both' ? 0.65 : 0.75, 0.2, { piano: w !== 'both' });
              note('winds', 'glock', m + 12, t, { dur: clip(t, d * 0.95), vel: vel(0.6), pan: 0.4, rel: 0.12 });
              note('winds', 'xylo', m + 12, t, { dur: clip(t, Math.min(d, sp * 2)), vel: vel(0.55), pan: -0.4, rel: 0.15 });
            }
            if (C.tones.includes(pc(m))) brass('tbnSus', atOrAbove(pc(m), 48), s, l, 0.65, 0.15, { piano: false });
          }
        }
        if (lf) {
          const [m, l] = lf, d = len16(s, l);
          brass('hnSus', m, s, l, 0.9, -0.2, { att: 0.07 });
          note('strings', 'vlnSus', m + 12, t, { dur: d * 0.92, vel: vel(i >= 4 ? 0.68 : 0.55), pan: 0.35, att: 0.06, rel: 0.2 });
          note('strings', 'vlaSus', m, t, { dur: d * 0.92, vel: vel(0.5), pan: 0.15, att: 0.06, rel: 0.2 });
          if (i >= 4) note('winds', 'flute', m + 12, t, { dur: d * 0.92, vel: 0.45, pan: -0.3, att: 0.08, rel: 0.2 });
        }
        // the lift's clarinet countermelody: two long chord notes a bar, stepping
        if (lift && (s === 0 || s === 8)) {
          let m = nearestTone(PC, cl + (s === 8 ? (cl > 64 ? -2 : 2) : 0)); if (s === 8 && m === cl) m = nearestTone(PC, cl + (cl > 64 ? -3 : 3));
          cl = Math.max(57, Math.min(69, m));
          note('winds', 'clar', cl, at(s), { dur: sp * 7.3, vel: vel(0.62), pan: 0.3, att: 0.1, rel: 0.2, gain: 1.2 }); note('winds', 'bsn', cl - 12, at(s), { dur: sp * 7.3, vel: vel(0.5), pan: -0.2, att: 0.1, rel: 0.2 });
        }
        if (ca && !(intro && i === 0 && s < 8)) {
          const [m, l] = ca;
          note('winds', 'glock', m + 12, t, { dur: clip(t, len16(s, l) * 0.95), vel: vel(0.62), pan: 0.3, rel: 0.12, gain: calm ? 1.6 : 1.3 });
          if (calm || i >= 2) note('strings', 'harp', m, t, { dur: clip(t, len16(s, l) * 0.9), vel: vel(0.45), pan: -0.2, rel: 0.1 });
          if ((calm || (intro && i >= 2)) && l >= 4) note('winds', 'clar', m - 12, t, { dur: clip(t, len16(s, l) * 0.9), vel: 0.5, pan: -0.15, att: 0.06, rel: 0.2 });
        }
        // the build's winds: bassoon and clarinet tiptoeing up the chord
        if (build && s % 4 === 0) { const tones = []; for (let m = 45; tones.length < 12; m++) if (C.tones.includes(pc(m))) tones.push(m); const m = tones[i + s / 4]; note('winds', 'bsnStac', m, t, { dur: sp * 1.2, vel: vel(0.55 + 0.08 * i), pan: -0.1, rel: 0.1 }); note('winds', 'clarStac', m + 12, t, { dur: sp * 1.2, vel: vel(0.5 + 0.08 * i), pan: 0.2, rel: 0.1, gain: 0.9 }); }
        // ---- the organ: the climax's chords and pedal (and a ghostly chord in the breather) ----
        if (s === 0 && big) {
          voicing(PC, 57, 4).forEach((m, k) => note('winds', 'organ', m, tp, { dur: held, vel: 0.85, pan: -0.2 + k * 0.13, att: 0.04, rel: 0.22, gain: 1.4 }));
          note('winds', 'organPedal', atOrAbove(root, 36), tp, { dur: held, vel: 0.85, pan: 0, att: 0.04, rel: 0.22, gain: 1.3 });
        }
        if (s === 0 && (calm || (intro && i >= 1))) voicing(PC, 57, 3).forEach((m, k) => note('winds', 'organ', m, tp, { dur: held, vel: 0.6, pan: -0.15 + k * 0.15, att: 0.5, rel: hr, gain: calm ? 1.8 : 1.5 }));
        // ---- brass: soft stopped-horn chords in A's second half, swells in the build, stabs at the climax ----
        if (A && s === 0 && i >= 4 && i < 6) voicing(PC, 52, 3).forEach((m, k) => brass('hnSus', m, 0, 14, 0.32, -0.3 + k * 0.2, { att: 0.3 }));
        if (build && s === 0) voicing(C, 53, 3).forEach((m, k) => brass('hnSus', m, 0, 15, 0.42 + 0.14 * i, -0.2 + k * 0.2, { att: bar * 0.6, rel: 0.12 }));
        if (lift && (s === 6 || s === 14) && i % 2 === 1) { voicing(PC, 55, 3).forEach((m, k) => note('brass', 'hnStac', m, t, { vel: vel(0.5), pan: -0.3 + k * 0.15, dur: 0.18, rel: 0.12 })); voicing(PC, 55, 3).forEach(m => piano(m, s, 1, 0.4)); }
        if (big && s === 0) { note('brass', 'tubaSus', atOrAbove(root, 28) + (atOrAbove(root, 28) < 33 ? 12 : 0), tp, { dur: held, vel: 0.65, pan: 0.1, att: 0.08, rel: 0.2 }); }

        // ---- percussion: the swamp shuffle ----
        const g = intro ? [0, 0.5, 0.7, 0.85][i] : calm ? 0.5 : build ? 0.7 + 0.08 * i : big ? 1 : lift ? 0.95 : 0.95;
        const pd = d => (preLoop ? clip(t, d) : d);
        if (!(intro && i < 1)) {
          // the log drums: low on 1 and 3 and the swung & of 2, high on the swung offbeats
          if (s === 0 || s === 8 || (s === 6 && !drone)) note('perc', 'logLo', null, t, { vel: vel(g * (s === 0 ? 0.85 : 0.7)), pan: -0.2, dur: pd(1), rel: 0.2, gain: 2.4 });
          if ((s === 2 || s === 10 || s === 14) && !(intro && i < 2)) note('perc', 'logHi', null, t, { vel: vel(g * 0.55), pan: 0.25, dur: pd(0.8), rel: 0.15, gain: 1.9 });
          // muted congas on the backbeat, a slap now and then
          if ((s === 4 || s === 12) && !(intro && i < 2)) note('perc', 'ethMute', null, t, { vel: vel(0.6 * g), pan: 0.15, filter: /ethnicLow_hit_(mp|f)/, dur: pd(0.6), rel: 0.15, gain: 2 });
          if (!drone && (s === 14 || (s === 7 && rnd() < 0.4))) note('perc', 'ethMute', null, t, { vel: vel(0.4 * g), pan: 0.4, filter: /ethnicHigh_hit_(pp|mp)/, dur: 0.4, rel: 0.1, gain: 1.6 });
          // the slit drum's ghosts filling the swing
          if (!drone && s % 4 === 3 && rnd() < 0.35) note('perc', 'log', null, t, { vel: 0.3, pan: -0.45, filter: /slitdrum[12]_(ppp|mp)/, dur: 0.5, rel: 0.1, gain: 0.8 * g });
        }
        // snare taps (brushes-ish) and the shaker once it lifts
        if ((lift || big) && (s === 4 || s === 12)) note('perc', 'snare2', null, t, { vel: vel(big ? 0.75 : 0.6), pan: 0.1, dur: 0.5, rel: 0.1, gain: 1.8 });
        if ((lift || big || (build && i >= 2)) && s % 2 === 0) note('perc', 'shaker', null, t, { vel: s % 4 ? 0.6 : 0.35, pan: 0.55, dur: 0.25, rel: 0.05, gain: 0.6 * g });
        if (A && i >= 4 && s % 4 === 2) note('perc', 'shaker', null, t, { vel: 0.5, pan: 0.55, dur: 0.25, rel: 0.05, gain: 0.45 });
        // the climax's weight: the giant drum, the bass drum, toms on the swung pickups, timpani every two bars
        if (big && (s === 0 || s === 8)) note('perc', 'bigMallet', null, t, { vel: vel(s === 0 ? 0.8 : 0.6), pan: 0, filter: /hit_(mf|f)_/, dur: 1.6, rel: 0.4, gain: 0.7 });
        if (big && (s === 0 || s === 6 || s === 8)) note('perc', 'bdrum', null, t, { vel: 0.65, filter: /^bdrum_(mp|f)_/, dur: 1.5, rel: 0.3, gain: 0.55 });
        if (big && i % 2 === 1 && (s === 14 || s === 15)) note('perc', s === 14 ? 'tenorHi' : 'tenorLo', null, t, { vel: 0.6, pan: 0.2, dur: 0.6, rel: 0.2 });
        if (s === 0 && (big || (lift && i % 2 === 0))) note('perc', 'timp', null, t, { vel: big ? 0.7 : 0.5, pan: -0.15, filter: /Timpani[12]_Hit/, dur: 2.5, rel: 0.6, gain: 0.7 });
        // the bells: Nepalese bells at the phrase starts, a heartbeat on the giant drum in the breather
        if (s === 0 && (i % 4 === 0) && (drone || A)) note('perc', 'nepBells', null, t, { vel: 0.5, pan: 0.45, filter: /fx[123]_short/, dur: pd(3), rel: 0.8, gain: 0.9 });
        if (calm && (s === 0 || s === 3)) note('perc', 'bigHand', null, t, { vel: s === 0 ? 0.55 : 0.4, filter: /hit_(pp|p|mp)_/, dur: 1.2, rel: 0.3, gain: 1.1 });
        if (intro && i >= 1 && (s === 0 || s === 3)) note('perc', 'bigHand', null, t, { vel: (s === 0 ? 0.45 : 0.32) + 0.05 * i, filter: /hit_(pp|p|mp)_/, dur: pd(1.2), rel: preLoop ? 0.1 : 0.3, gain: 1.1 });
        // (the first moment is a hit)
        if (intro && i === 0 && s === 0) { note('perc', 'bigMallet', null, 0, { vel: 0.6, filter: /hit_(mf|f)_/, dur: 2, rel: 0.5 }); note('perc', 'timp', null, 0, { vel: 0.5, filter: /Timpani[12]_Hit/, dur: 2.5, rel: 0.6, gain: 0.6 }); note('perc', 'cym', null, 0.02, { vel: 0.5, pan: 0.3, filter: /softmall_(mp|f)$/, dur: 3, rel: 1, gain: 0.6 }); }
        // ---- the joins: ghostly cymbal swells (reversed), a gong and clash at the climax, a timpani roll into the theme ----
        if (s === 0 && B.intoNew && sec !== 'climax') rev('perc', 'cym', /softmall_ff$/, t0 + bar - (preLoop ? 0.02 : 0.012), { len: bar * (build ? 0.9 : 0.6), gain: build ? 0.85 : 0.9 });
        if (s === 0 && i === 0 && big) { note('perc', 'gong', null, t, { vel: 0.85, pan: -0.1, dur: 6, rel: 1.5, gain: 0.8 }); note('perc', 'clash', null, t, { vel: 0.8, pan: 0.3, filter: /ff_loose/, dur: 4, rel: 1, gain: 0.6 }); }
        if (s === 0 && i === 0 && (A || lift)) note('perc', 'cym', null, t, { vel: 0.6, pan: 0.3, filter: /softmall_f$/, dur: 4, rel: 1, gain: 0.6 });
        if (s === 8 && B.intoNew && (intro || build)) note('perc', 'timpRoll', null, at(8) - 0.004, { vel: 1, filter: /Timpani[12]_Roll_v5/, dur: barEnd - at(8), rel: intro ? 0.08 : 0.05, gain: 0.6 });
        if (build && i === 3 && s >= 8 && s % 2 === 0) note('perc', s % 4 ? 'tenorHi' : 'tenorLo', null, t, { vel: 0.4 + 0.03 * s, pan: (s - 11) * 0.12, dur: 0.6, rel: 0.2, gain: 0.6 });
        if (build && i === 0 && s === 0) for (let k = 0; k < 128; k++) note('perc', 'snare', null, t0 + 0.003 + k * sp / 2, { vel: 0.1 + 0.6 * (k / 128) ** 1.6, pan: 0.1, filter: /^snare1_(pppp|ppp|pp|p|mp|f)_/, dur: 0.22, rel: 0.06 });
        if (build && i >= 2 && (s === 0 || s === 8)) note('perc', 'bigMallet', null, t, { vel: 0.5 + 0.1 * (i - 2), filter: /hit_(mf|f)_/, dur: 1.5, rel: 0.4, gain: 0.6 });
      }
    });
  },
};
