// "Carnival": toys, sweets and the carnival (Pinball Palace, Candy Caverns, Cheddar Caverns, Toybox Tower, Monkey
// Carnival).
//
// The feel: the playful bonus-room and toy stages in the spirit of the Donkey Kong Country Returns / Tropical Freeze
// scores (a feel, not their notes): a bouncy circus two-step in G major with a swung edge (every offbeat 8th a little
// late), oom-pah tuba and pizzicato basses on 1 and 3, horn and string "pahs" on 2 and 4 with the snare, cowbell on the
// offbeats, sleigh bells. A whistle-able hook full of cheeky chromatic neighbours is passed round the band: piccolo
// (bars 1-2), low clarinet (3-4), glockenspiel and xylophone (5-6), all of them (7-8). The lift goes to C major for a
// singing violin tune with trumpet fanfares; the climax is the hook a whole step up (A major) on trumpets and piccolo;
// the break is a soft samba (surdo, agogo bells, tambourine, snare taps) with the clarinet noodling; a snare roll and a
// xylophone run home.
//
// Form (132 bpm, 40 bars; the loop is bars 5-40, 65.5 s):
//   intro  4  a music-box glockenspiel fanfare over sleigh bells; the oom-pah starts; a xylophone run up
//   A      8  the hook passed round: piccolo, clarinet, glockenspiel and xylophone, everyone; secondary dominants
//   B      8  the lift (C major): violins and violas in octaves, trumpet fanfares, a snare march, flute on top
//   climax 8  the hook a step up (A major): trumpets, piccolo, clarinet, xylophone, violins, crash cymbals
//   break  8  a soft samba break: surdo, agogo bells, tambourine, snare taps; the clarinet joins for bars 5-8
//   build  4  C Cm A7 D7: the oom-pah back, a snare roll, horns swelling, a xylophone run into A
//
// Stems: strings (pizzicato bass, staccato pahs, the lift's tune), brass (tuba oom, horn and trombone pahs, trumpet
// fanfares and the climax's hook), piano (the brass lines on piano: an honky-tonk oom-pah), perc (every unpitched sound
// plus timpani), winds (piccolo, clarinet, flute, glockenspiel, xylophone).
import { ph, voicing, atOrAbove, nearestTone, pc } from '../lib.mjs';

// ---- the score ----
const CHORDS = {
  intro: ['G', 'D7', 'G', 'D7'],
  A: ['G', 'B7', 'C', 'Cm', 'G', 'E7', 'A7', 'D7'],
  B: ['C', 'Am', 'F', 'G', 'Em', 'A7', 'D7', 'E7'],
  climax: ['G', 'B7', 'C', 'Cm', 'G', 'E7', 'A7', 'D7'],   // (up a whole step: A major)
  break: ['G', 'G', 'C', 'D7'],
  build: ['C', 'Cm', 'A7', 'D7'],
};
// the hook (written in G at the piccolo's pitch): bouncy, with chromatic neighbours a 16th long
const HOOK = ph(
  [[0, 86, 2], [2, 85, 1], [3, 86, 1], [4, 83, 2], [6, 79, 2], [8, 83, 2], [10, 86, 2], [12, 91, 4]],
  [[0, 90, 3], [3, 87, 1], [4, 90, 2], [6, 93, 2], [8, 90, 4], [12, 87, 2], [14, 83, 2]],
  [[0, 88, 2], [2, 87, 1], [3, 88, 1], [4, 84, 2], [6, 79, 2], [8, 84, 2], [10, 88, 2], [12, 91, 4]],
  [[0, 87, 4], [4, 84, 2], [6, 91, 2], [8, 87, 4], [12, 86, 4]],
  [[0, 83, 2], [2, 86, 2], [4, 91, 2], [6, 95, 2], [8, 93, 2], [10, 91, 2], [12, 86, 4]],
  [[0, 92, 2], [2, 88, 2], [4, 83, 2], [6, 88, 2], [8, 92, 4], [12, 95, 2], [14, 86, 2]],
  [[0, 93, 2], [2, 88, 2], [4, 85, 2], [6, 88, 2], [8, 91, 4], [12, 88, 2], [14, 85, 2]],
  [[0, 90, 4], [4, 84, 2], [6, 86, 2], [8, 90, 2], [10, 93, 2], [12, 96, 2], [14, 93, 2]]);
const WHO = ['picc', 'picc', 'clar', 'clar', 'bells', 'bells', 'all', 'all'];
// the lift (C major): a singing tune for violins (violas an octave down)
const LIFT = ph(
  [[0, 76, 6], [6, 79, 2], [8, 84, 6], [14, 79, 2]],
  [[0, 81, 8], [8, 76, 4], [12, 72, 4]],
  [[0, 77, 6], [6, 81, 2], [8, 84, 6], [14, 81, 2]],
  [[0, 83, 8], [8, 79, 4], [12, 74, 4]],
  [[0, 79, 6], [6, 83, 2], [8, 88, 6], [14, 86, 2]],
  [[0, 85, 6], [6, 81, 2], [8, 79, 4], [12, 76, 4]],
  [[0, 78, 6], [6, 81, 2], [8, 84, 4], [12, 86, 4]],
  [[0, 83, 4], [4, 80, 4], [8, 86, 4], [12, 83, 2], [14, 80, 2]]);
// the intro's music-box fanfare, and the clarinet's tune over the samba break
const FANFARE = ph([[4, 79, 2], [6, 83, 2], [8, 86, 4], [12, 91, 4]], [[0, 90, 4], [4, 86, 2], [6, 84, 2], [8, 81, 4], [12, 78, 3]]);
const SAMBA = ph(
  [[0, 67, 3], [3, 71, 3], [6, 74, 2], [8, 71, 2], [10, 67, 2], [12, 62, 4]],
  [[0, 64, 2], [2, 67, 2], [4, 71, 4], [8, 69, 6]],
  [[0, 67, 3], [3, 72, 3], [6, 76, 2], [8, 72, 2], [10, 67, 2], [12, 64, 4]],
  [[0, 66, 2], [2, 69, 2], [4, 72, 4], [8, 74, 4], [12, 72, 2], [14, 69, 2]]);
// the swing: where each 16th of a beat lands (the offbeat 8th 0.4 of a 16th late, the 16ths either side a little)
const SW = [0, 0.2, 0.4, 0.2];
const pos = s => s + SW[((s % 4) + 4) % 4];

// carnival: the chord with the tune's passing notes taken out while they sound (see works.mjs: the same idea)
function carnivalFilter(C, tune, X) {
  const act = Array.from({ length: 16 }, () => []);
  for (const [s, [m, len]] of Object.entries(tune)) { const p = pc(X(m)); if (C.tones.includes(p)) continue; for (let k = +s; k < Math.min(16, +s + len); k++) act[k].push(p); }
  return (s0 = 0, len = 16) => {
    const bad = []; for (let k = Math.max(0, s0); k < Math.min(16, s0 + len); k++) bad.push(...act[k]);
    const keep = C.tones.filter(p => !bad.some(q => Math.abs(((p - q + 18) % 12) - 6) === 1));
    return keep.length ? { ...C, tones: keep } : C;
  };
}

export default {
  name: 'carnival', label: 'Carnival', bpm: 132, keyTr: 5, seed: 7321,
  form: [['intro', 4], ['A', 8], ['B', 8], ['climax', 8], ['break', 8], ['build', 4]], loop: 4, join: 4,
  chords: CHORDS, up: { climax: 2 },
  // the key per bar, for the studio's note editor: G major, the lift in C major, the climax in A major
  keyOf: B => B.sec === 'B' ? { tonic: 0, scale: 'major' } : { tonic: pc(7 + B.up), scale: 'major' },
  mix: { send: { strings: 0.28, winds: 0.3, perc: 0.15, brass: 0.24 }, level: { strings: 1.1, perc: 1.1, winds: 1.1, brass: 1 }, master: 0.72 },
  compose(S) {
    const { sp, bar, map, rev, rnd } = S;
    map.forEach(B => {
      const { sec, i, t0, C, up, b } = B, X = m => m + up;
      const intro = sec === 'intro', A = sec === 'A', lift = sec === 'B', big = sec === 'climax', calm = sec === 'break', build = sec === 'build';
      const hookOn = A || big, root = C.bass;
      const tune = hookOn ? HOOK[i] : lift ? LIFT[i] : calm && i >= 4 ? SAMBA[i - 4] : intro && i < 2 ? FANFARE[i] : {};
      const F = carnivalFilter(C, tune, X), PC = F();
      const vel = v => Math.max(0.05, Math.min(1, v + (rnd() - 0.5) * 0.07));
      // (the loop's first bar line: every hit lands a few ms after it, so no attack starts on the very sample the loop jumps to)
      const late = s => (b === 4 && s === 0 ? 0.004 : 0), at = s => t0 + pos(s) * sp + late(s) + (rnd() - 0.5) * 0.008;
      const len16 = (s, len) => (pos(s + len) - pos(s)) * sp;   // (a note's length on the swung grid)
      const preLoop = intro && B.last, barEnd = t0 + bar - (preLoop ? 0.15 : 0), held = barEnd - t0 - 0.05, hr = preLoop ? 0.1 : 0.25;
      const clip = (t, d) => Math.min(d, barEnd - t - 0.03);
      // (every note of the intro's last bar is let go before the loop's first bar line: whatever rang over it would be
      // missing when the loop comes round)
      const N = (stem, id, m, tt, o = {}) => { if (preLoop) { if (tt > barEnd - 0.03) return; o = { ...o, dur: Math.min(o.dur ?? 10, barEnd - tt - 0.02), rel: Math.min(o.rel ?? 0.25, 0.08) }; } S.note(stem, id, m, tt, o); };
      const oompah = (intro && i >= 2) || A || lift || big || build;
      const piano = (m, s, d, v) => N('piano', 'piano', m, at(s), { dur: Math.max(0.1, d), vel: vel(v * 0.85), pan: 0.1, rel: 0.16, att: 0.002 });
      const brass = (id, m, s, d, v, pan, o = {}) => { N('brass', id, m, at(s), { dur: d, vel: vel(v), pan, att: o.att ?? 0.02, rel: o.rel ?? 0.12 }); if (o.piano !== false) piano(m + (o.pianoUp ?? 0), s, d, v); };

      // ---- strings: a soft pad under the lift and the climax (cellos, and high violins at the climax) ----
      // the intro's and the samba break's bed: violas and cellos holding the chord softly
      if (intro || calm) voicing(PC, 50, 3).forEach((m, k) => N('strings', k ? 'vlaSus' : 'vcSus', m, t0, { dur: held, vel: intro ? 0.55 : 0.36, pan: -0.3 + k * 0.25, att: 0.2, rel: hr, gain: intro ? 0.6 : 1 }));
      if (lift || big || (build && i >= 2)) {
        N('strings', 'vcSus', atOrAbove(root, 41), t0, { dur: held, vel: lift ? 0.45 : 0.5, pan: -0.4, att: 0.1, rel: hr });
        if (big) voicing(PC, 67, 3).forEach((m, k) => N('strings', 'vlnSus', m, Math.max(0, t0 - 0.02), { dur: held + 0.01, vel: 0.42, pan: 0.2 + k * 0.15, att: 0.1, rel: hr - 0.03 }));
      }

      for (let s = 0; s < 16; s++) {
        const t = t0 + pos(s) * sp + late(s);
        // ---- the oom-pah: tuba and pizzicato basses on 1 and 3 (root, then the fifth below), pahs on 2 and 4 ----
        if (oompah && (s === 0 || s === 8)) {
          const r = atOrAbove(root, 40), m = s === 0 || !PC.tones.includes(pc(r - 5)) ? r : r - 5, v = big ? 0.72 : lift ? 0.62 : 0.58;
          if (!intro) brass('tubaSus', m, s, sp * 3, v, 0.05, { att: 0.01, rel: 0.1 });   // (the intro's oom-pah is strings only: the piano's long hall would linger under the loop start)
          N('strings', 'cbPizz', m, at(s), { dur: sp * 3, vel: vel(v), pan: -0.15, rel: 0.12 });
          if (big || lift) N('strings', 'vcPizz', m + 12, at(s), { dur: sp * 3, vel: vel(v * 0.8), pan: -0.35, rel: 0.12 });
        }
        if (oompah && (s === 4 || s === 12)) {
          const ch = F(s, 3), v = big ? 0.6 : lift ? 0.5 : 0.52;
          if (!intro) voicing(ch, 55, 3).forEach((m, k) => brass('hnStac', m, s, 0.16, v, -0.35 + k * 0.15, { att: 0.005, rel: 0.08 }));
          if (big) N('brass', 'tbnStac', atOrAbove(ch.tones[0], 50), at(s), { dur: 0.16, vel: vel(0.5), pan: 0.25, rel: 0.08 });
          voicing(ch, lift ? 55 : 64, 3).forEach((m, k) => N('strings', k < 2 && !lift ? 'vlaSpic' : lift ? 'vlaSpic' : 'vlnSpic', m, at(s), { dur: sp * 1.2, vel: vel(v), pan: 0.15 + k * 0.12, rel: 0.06 }));
        }
        if (calm && [0, 3, 6, 10, 12].includes(s)) voicing(F(s, 2), 62, 3).forEach((m, k) => N('strings', 'vlnPizz', m, at(s), { dur: clip(at(s), sp * 2), vel: vel(0.45 + 0.1 * (s === 0)), pan: 0.25 + k * 0.1, rel: 0.1 }));
        // the samba break's bass: the root on 1, the fifth on the surdo's strong beat
        if (calm && (s === 0 || s === 4 || s === 8 || s === 12)) {
          const r = atOrAbove(root, 40), m = s % 8 === 0 || !PC.tones.includes(pc(r + 7)) ? r : r + 7;
          N('strings', 'cbPizz', m, at(s), { dur: clip(t, sp * 3), vel: vel(s % 8 === 0 ? 0.5 : 0.4), pan: -0.15, rel: 0.12 });
        }

        // ---- the tunes ----
        const tn = tune[s];
        if (tn && hookOn) {
          const [m0, len] = tn, m = X(m0), d = len16(s, len), w = WHO[i];
          if (A) {
            if (w === 'picc' || w === 'all') N('winds', len >= 3 ? 'picc' : 'piccStac', m, at(s), { dur: d * (len >= 3 ? 0.9 : 0.7), vel: vel(0.7), pan: 0.2, att: 0.01, rel: 0.1, gain: 1.2 });
            if (w === 'clar' || w === 'all') N('winds', len >= 3 ? 'clar' : 'clarStac', m - 12, at(s), { dur: d * (len >= 3 ? 0.9 : 0.7), vel: vel(0.75), pan: -0.2, att: 0.01, rel: 0.1, gain: w === 'all' ? 0.9 : 1.2 });
            if (w === 'bells' || w === 'all') {
              N('winds', 'glock', m, at(s), { dur: clip(at(s), d * 0.85), vel: vel(0.55), pan: 0.35, rel: 0.12, gain: 1.3 });
              N('winds', 'xylo', m - 12, at(s), { dur: clip(at(s), d * 0.8), vel: vel(0.55), pan: -0.35, rel: 0.1 });
            }
            if (w === 'all') N('strings', 'vlnSpic', m - 12, at(s), { dur: d * 0.7, vel: vel(0.55), pan: 0.3, rel: 0.08 });
          } else {   // the climax: trumpets an octave down (horns two), piccolo on top, clarinet, xylophone, violins
            brass(len >= 3 ? 'tptSus' : 'tptStac', m - 12, s, d * (len >= 3 ? 0.9 : 0.7), 0.82, 0.15);
            brass(len >= 3 ? 'hnSus' : 'hnStac', m - 24, s, d * (len >= 3 ? 0.9 : 0.7), 0.45, -0.25, { piano: false });
            N('winds', len >= 3 ? 'picc' : 'piccStac', m, at(s), { dur: d * (len >= 3 ? 0.9 : 0.7), vel: vel(0.65), pan: 0.2, att: 0.01, rel: 0.1, gain: 1.2 });
            N('winds', len >= 3 ? 'clar' : 'clarStac', m - 12, at(s), { dur: d * (len >= 3 ? 0.9 : 0.7), vel: vel(0.6), pan: -0.2, att: 0.01, rel: 0.1 });
            N('winds', 'xylo', m, at(s), { dur: clip(at(s), d * 0.8), vel: vel(0.5), pan: -0.35, rel: 0.1 });
            N('strings', len >= 3 ? 'vlnSus' : 'vlnSpic', m - 12, at(s), { dur: d * (len >= 3 ? 0.9 : 0.7), vel: vel(0.6), pan: 0.3, att: 0.02, rel: 0.1 });
          }
        }
        if (tn && lift) {   // the lift: violins, violas an octave down, the flute an octave up in the second half
          const [m, len] = tn, d = len16(s, len);
          N('strings', 'vlnSus', m, at(s), { dur: d * 0.94, vel: vel(0.86), pan: 0.25, att: 0.05, rel: 0.18, gain: 1.25 });
          N('strings', 'vlaSus', m - 12, at(s), { dur: d * 0.94, vel: vel(0.72), pan: 0.4, att: 0.05, rel: 0.18, gain: 1.2 });
          if (i >= 4) N('winds', 'flute', m + (m + 12 > 96 ? 0 : 12), at(s), { dur: d * 0.94, vel: 0.45, pan: -0.2, att: 0.04, rel: 0.18 });
        }
        if (tn && intro) { const [m, len] = tn; N('winds', 'clar', m - 12, at(s), { dur: Math.min(len16(s, len) * 0.85, barEnd - at(s) - 0.05), vel: vel(0.5), pan: -0.2, att: 0.02, rel: 0.12 }); N('winds', 'glock', m, at(s), { dur: clip(at(s), len16(s, len) * 0.9), vel: vel(0.65), pan: 0.3, rel: 0.2, gain: 1.8 }); }
        if (tn && calm) { const [m, len] = tn; N('winds', 'clar', m, at(s), { dur: Math.min(len16(s, len) * 0.85, barEnd - at(s) - 0.05), vel: vel(0.6), pan: -0.15, att: 0.02, rel: 0.12, gain: 1.5 }); }
        // the lift's trumpet fanfares: a rising arpeggio at the end of every other bar (ta-ta-ta-TA)
        if (lift && i % 2 === 1 && s >= 12) {
          const v3 = voicing(F(12, 4), 67, 4), m = v3[s - 12];
          brass('tptStac', m, s, sp * (s === 15 ? 1.5 : 0.7), 0.55 + 0.05 * (s - 12), 0.3, { att: 0.005 });
        }
        // the lift's warm horn chord, two voices held through each bar
        if (lift && s === 0) voicing(PC, 55, 2).forEach((m, k) => brass('hnSus', m, 0, bar * 0.92, 0.5, -0.3 + k * 0.2, { att: 0.12, rel: 0.2 }));
        // the build: horns swelling
        if (build && s === 0) voicing(C, 53, 2).forEach((m, k) => brass('hnSus', m, 0, bar * 0.92, 0.32 + 0.12 * i, -0.2 + k * 0.2, { att: bar * 0.6, rel: 0.12 }));

        // ---- winds: xylophone runs up the chord (the intro's last bar, the build's last bar) ----
        if ((preLoop || (build && i === 3)) && s >= 8) {
          const v8 = voicing(C, 67, 8), m = v8[s - 8];
          N('winds', 'xylo', m, at(s), { dur: clip(at(s), sp * 1.2), vel: vel(0.45 + 0.04 * (s - 8)), pan: -0.3 + 0.08 * (s - 8), rel: 0.08 });
        }
        // the glockenspiel's sparkle on the lift's downbeats
        if (lift && s === 0) N('winds', 'glock', atOrAbove(PC.tones[PC.tones.length > 2 ? 2 : 0], 84), at(s), { dur: clip(t, sp * 6), vel: 0.4, pan: 0.4, rel: 0.2 });

        // ---- percussion ----
        // (the very first moment is a hit: the game finds where an encoded file truly starts by its first sound)
        if (intro && i === 0 && s === 0) {
          N('perc', 'crash', null, 0, { vel: 0.55, filter: /crash1_mf/, dur: 3, rel: 0.8, pan: 0.3, gain: 0.8 });
          N('perc', 'bdrum', null, 0, { vel: 0.6, filter: /^bdrum_(mp|f)_/, dur: 1.5, rel: 0.4, gain: 0.7 });
          N('perc', 'tri', null, 0, { vel: 0.5, filter: /Triangle6-Hit_/, dur: 2, rel: 0.6, pan: 0.5 });
        }
        const groove = A || lift || big || (build && i >= 1) || (intro && i >= 2);
        // sleigh bells: a shake through the intro's music box, then on the quarters
        if (intro && i < 2 && s === 0) N('perc', 'sleigh', null, at(s), { vel: 0.5, filter: /sleighbell1_shake1/, dur: bar * 0.9, rel: 0.3, pan: -0.4, gain: 0.8 });
        if ((groove || calm) && s % 4 === 0 && !calm) N('perc', 'sleigh', null, at(s), { vel: vel(0.5), filter: /sleighbell[12]_hit_\d/, pan: -0.45, dur: 0.6, rel: 0.15, gain: 0.8 });
        // the kick with the oom, the snare with the pah (and a march roll in the lift)
        if (groove && (s === 0 || s === 8)) N('perc', 'bdrum', null, t, { vel: big ? 0.7 : 0.58, filter: /^bdrum_(mp|f)_/, dur: 1, rel: 0.3, gain: 0.7 });
        if (groove && (s === 4 || s === 12)) N('perc', 'snare', null, t, { vel: vel(big ? 0.66 : 0.55), pan: 0.1, filter: /^snare1_(mp|f|ff)_/, dur: 0.6, rel: 0.15 });
        if (lift && (s === 13 || s === 14 || s === 15) && i % 2 === 0) N('perc', 'snare', null, at(s), { vel: vel(0.3 + 0.06 * (s - 13)), pan: 0.1, filter: /^snare1_(p|mp)_/, dur: 0.3, rel: 0.08 });
        // the cowbell on the swung offbeats (A and the climax), tambourine at the climax
        if ((A || big) && s % 4 === 2) N('perc', 'cowbell', null, at(s), { vel: vel(s === 14 ? 0.6 : 0.45), pan: 0.45, dur: 0.5, rel: 0.1, gain: 0.8 });
        if (big && s % 2 === 0) N('perc', 'tamb', null, at(s), { vel: vel(s % 4 === 2 ? 0.55 : 0.35), pan: -0.5, filter: /^Tamb1-Hit/, dur: 0.4, rel: 0.08, gain: 0.8 });
        // a slapstick at the end of every fourth bar of the hook (the cheeky punctuation)
        if ((A || big) && i % 4 === 3 && s === 14) N('perc', 'wood', null, at(s), { vel: 0.7, filter: /^slapstick[123]$/, pan: 0.3, dur: 0.6, rel: 0.15, gain: 0.9 });
        // ---- the samba break: surdo (the bass drum, soft on 1, strong on 2), agogo bells, tambourine, snare taps ----
        if (calm) {
          const sv = 2 + 0.2 * (i >= 4);   // (the samba's level)
          if (s === 0 || s === 8) N('perc', 'bdrum', null, at(s), { vel: 0.35 * sv, filter: /^bdrum_muted_(pp|mp)_/, dur: 0.8, rel: 0.2, gain: 0.8 });
          if (s === 4 || s === 12) N('perc', 'bdrum', null, at(s), { vel: 0.5 * sv, filter: /^bdrum_(p|mp)_/, dur: 1.2, rel: 0.3, gain: 0.75 });
          const AG = { 0: 'hi', 2: 'hi', 4: 'lo', 7: 'hi', 10: 'lo', 12: 'hi', 14: 'lo' };
          if (AG[s]) N('perc', 'agogo', null, at(s), { vel: vel(0.45), filter: AG[s] === 'hi' ? /^agogoBell2/ : /^agogoBell3_f/, pan: AG[s] === 'hi' ? 0.4 : 0.2, dur: 0.5, rel: 0.1, gain: 0.6 * sv });
          if ([0, 3, 6, 10, 12].includes(s)) N('perc', 'snare2', null, at(s), { vel: vel(0.4), pan: -0.25, dur: 0.3, rel: 0.06, gain: 0.6 * sv });
          N('perc', 'shaker', null, at(s), { vel: s % 2 ? 0.55 : 0.35, pan: 0.55, dur: 0.25, rel: 0.05, gain: (s % 4 === 2 ? 0.6 : 0.35) * sv });
          if (s % 4 === 2) N('perc', 'tamb', null, at(s), { vel: vel(0.4), pan: -0.5, filter: /^Tamb1-Hit/, dur: 0.4, rel: 0.08, gain: 0.5 * sv });
          if (B.last && s === 12) N('perc', 'wood', null, at(s), { vel: 0.7, filter: /^vibraslap1/, pan: -0.3, dur: 1, rel: 0.2, gain: 0.7 });
        }
        // ---- the joins ----
        if (s === 0 && i === 0 && (A || big)) N('perc', 'crash', null, t, { vel: big ? 0.9 : 0.75, filter: big ? /crash1_ff/ : /crash1_mf/, pan: 0.3, dur: 4, rel: 1, gain: big ? 0.8 : 0.6 });
        if (s === 0 && i === 0 && lift) N('perc', 'cym', null, t, { vel: 0.7, pan: -0.3, filter: /hit_hardmall_(f|fff)$/, dur: 4, rel: 1, gain: 0.55 });
        if (s === 0 && i === 0 && (A || big || lift)) N('perc', 'timp', null, t, { vel: big ? 0.7 : 0.55, pan: -0.15, filter: /Timpani[12]_Hit/, dur: 2, rel: 0.5, gain: 0.7 });
        if (s === 0 && B.intoNew && (intro || build || sec === 'A' || lift)) rev('perc', 'cym', /hit_hardmall_f$/, t0 + bar, { len: bar * (intro || build ? 0.75 : 0.5), gain: intro || build ? 1.5 : 1.3 });
        // tom fills out of A (the swung 16ths, high to low)
        if (B.intoNew && A && s >= 12) N('perc', s % 2 ? 'tenorLo' : 'tenorHi', null, at(s), { vel: vel(0.55 + 0.05 * (s - 12)), pan: (13.5 - s) * 0.2, dur: 0.5, rel: 0.15 });
        // the build: a snare roll crescendo across its four bars
        if (build && i === 0 && s === 0) for (let k = 0; k < 128; k++) N('perc', 'snare', null, t + k * sp / 2, { vel: 0.1 + 0.62 * (k / 128) ** 1.5, pan: 0.1, filter: /^snare1_(pp|p|mp|f|ff)_/, dur: 0.25, rel: 0.08 });
      }
    });
  },
};
