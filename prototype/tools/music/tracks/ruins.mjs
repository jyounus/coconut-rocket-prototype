// "Ruins": ancient ruins, desert and temples (Sunken Temple, Idol's Climb, Fossil Bonepit, Cursed Treasure Vault,
// Sandstorm Canyon, Bamboo Pagoda). The model track for the mood groups (see COMPOSER_BRIEF.md).
//
// The feel: a sun-baked adventure groove in the spirit of the Donkey Kong Country Returns / Tropical Freeze scores (a
// feel, not their notes): E Phrygian dominant (E F G# A B C D: the desert's raised third over a flat second), a
// snake-charmer oboe hook answered by horns, hand drums on a darbuka-style 3-3-2 with a syncopated low end, plucked
// strings and harp, a warm string pad, a singing A-minor lift for the violins, then the theme in full brass and strings
// a whole step up (F#) for the climax; a breather of harp and oboe over the drone, and a snare-and-timpani build home.
//
// Form (112 bpm, 36 bars; the loop is bars 5-36, 68.6 s):
//   intro  4  E drone, harp ripples, chimes; the oboe's call; hand drums come in
//   A      8  the theme: oboe calls (bars 1-2, 5-6), horns answer (3-4), together (7-8); marimba ostinato, pizzicato bass
//   B      8  the lift (A minor): violins in octaves, horn countermelody, low brass, snare backbeat, stabs
//   climax 8  the theme a step up (F#): horns and violins, trombones under, oboe and flute on top, gong, glockenspiel
//   break  4  harp and the oboe's call over the drone, the drums down to a heartbeat
//   build  4  Am F Dm E: rising pizzicato, snare roll and timpani, horns swelling, back to the theme
//
// Stems: strings (pad, pizzicato bass, harp, the lift's melody, spiccato drive), brass (horn answers, countermelody,
// stabs, low brass, the climax theme), piano (the brass lines on piano: the alternative lead), perc (every drum and
// cymbal), winds (oboe, flute, marimba, glockenspiel).
import { ph, voicing, atOrAbove, nearestTone, pc } from '../lib.mjs';

// ---- the score ----
const CHORDS = {
  intro: ['E', 'F/E', 'E', 'E'],
  A: ['E', 'F', 'G', 'F', 'E', 'F', 'Dm', 'E'],
  B: ['Am', 'F', 'C', 'G', 'Am', 'F', 'Dm', 'E'],
  climax: ['E', 'F', 'G', 'F', 'E', 'F', 'Dm', 'E'],
  break: ['E', 'F/E', 'E', 'E'],
  build: ['Am', 'F', 'Dm', 'E'],
};
// the theme (written in E; the climax plays it a step up): bars 1-2 and 5-6 the oboe's call, 3-4 the horns' answer
const THEME = ph(
  [[0, 71, 3], [3, 72, 3], [6, 71, 2], [8, 68, 2], [10, 69, 2], [12, 71, 4]],
  [[0, 72, 6], [6, 69, 2], [8, 65, 4], [12, 69, 4]],
  [[0, 67, 3], [3, 71, 3], [6, 74, 2], [8, 72, 2], [10, 71, 2], [12, 67, 4]],
  [[0, 69, 6], [6, 65, 2], [8, 69, 4], [12, 72, 4]],
  [[0, 71, 3], [3, 72, 3], [6, 71, 2], [8, 68, 2], [10, 69, 2], [12, 71, 4]],
  [[0, 72, 3], [3, 74, 3], [6, 76, 2], [8, 77, 6], [14, 76, 2]],
  [[0, 77, 3], [3, 76, 3], [6, 74, 2], [8, 72, 2], [10, 74, 2], [12, 69, 4]],
  [[0, 68, 8], [8, 71, 4], [12, 76, 4]]);
const WHO = ['call', 'call', 'answer', 'answer', 'call', 'call', 'both', 'both'];
// the lift's melody (A minor), sung by the violins in octaves
const LIFT = ph(
  [[0, 76, 8], [8, 81, 6], [14, 79, 2]],
  [[0, 77, 6], [6, 79, 2], [8, 72, 8]],
  [[0, 76, 6], [6, 74, 2], [8, 72, 4], [12, 79, 4]],
  [[0, 79, 8], [8, 74, 4], [12, 71, 4]],
  [[0, 72, 4], [4, 76, 4], [8, 81, 8]],
  [[0, 81, 6], [6, 79, 2], [8, 77, 4], [12, 72, 4]],
  [[0, 77, 6], [6, 81, 2], [8, 74, 8]],
  [[0, 71, 8], [8, 68, 4], [12, 74, 4]]);
// the call: the oboe alone over the drone (intro and breather)
const CALL = ph(
  [[4, 71, 4], [8, 72, 2], [10, 71, 2], [12, 68, 4]],
  [[0, 69, 4], [4, 72, 2], [6, 69, 2], [8, 65, 8]],
  [[4, 76, 4], [8, 77, 2], [10, 76, 2], [12, 71, 4]],
  [[0, 72, 3], [3, 71, 1], [4, 69, 4], [8, 68, 4], [12, 64, 4]]);
// the groove's accents (a 3-3-2 under a darbuka's dum-tek), the marimba's ostinato and the pizzicato bass (semitones over
// the chord's root, on the 3-3-2 steps)
const ACC = [1, 0.4, 0.6, 0.85, 0.45, 0.55, 0.9, 0.45, 0.8, 0.4, 0.6, 0.85, 0.5, 0.55, 0.9, 0.5];
const MAR = { 0: 12, 3: 7, 6: 12, 8: 0, 11: 7, 14: 12 }, MAR_HI = { 2: 19, 10: 16, 13: 19 };
const PIZZ = { 0: 0, 3: 0, 6: 7, 8: 12, 11: 7, 14: 0 };

export default {
  name: 'ruins', label: 'Ruins', bpm: 112, keyTr: 2, seed: 9071,
  form: [['intro', 4], ['A', 8], ['B', 8], ['climax', 8], ['break', 4], ['build', 4]], loop: 4, join: 4,
  chords: CHORDS, up: { climax: 2 },
  // the key per bar, for the studio's note editor: E Phrygian dominant, the lift in A minor
  keyOf: B => B.sec === 'B' || B.sec === 'build' ? { tonic: 9, scale: 'minor' } : { tonic: pc(4 + B.up), scale: 'phrygDom' },
  mix: { send: { strings: 0.34, winds: 0.34, perc: 0.18 }, level: { strings: 1.15, perc: 1.25, winds: 1.15 } },
  compose(S) {
    const { sp, bar, map, note, rev, rnd } = S;
    let pad = null, horn = 62;   // (the pad's last voicing, for smooth voice leading; the countermelody's last note)
    map.forEach(B => {
      const { sec, i, t0, C, up } = B, X = m => m + up;
      const intro = sec === 'intro', A = sec === 'A', lift = sec === 'B', big = sec === 'climax', calm = sec === 'break', build = sec === 'build';
      const drone = intro || calm, root = C.bass, r2 = atOrAbove(root, 36), lv = intro ? i : 0;   // (lv: how far the intro has grown)
      // (the tune's passing notes: the pad, harp, marimba and stabs leave out any chord note a semitone from one, so nothing
      // rubs under the tune; PC is the chord they play)
      const tune = (A || big) ? THEME[i] : lift ? LIFT[i] : drone ? CALL[i] : {}, pass = Object.values(tune).map(([m]) => pc(lift ? m : X(m))).filter(p => !C.tones.includes(p));
      const keep = C.tones.filter(p => !pass.some(q => Math.abs(((p - q + 18) % 12) - 6) === 1)), PC = keep.length >= 1 ? { ...C, tones: keep } : C;
      const vel = (v, t) => Math.max(0.05, Math.min(1, v + (rnd() - 0.5) * 0.06));
      const at = s => t0 + s * sp + (rnd() - 0.5) * 0.006;   // (a hair of human timing)
      // the brass lines also go to the piano stem (the piano mix plays them on the piano instead)
      const piano = (m, s, len, v) => note('piano', 'piano', m, at(s), { dur: len * sp * 0.95, vel: vel(v * 0.85), pan: 0.1, rel: 0.2, att: 0.002 });
      const brass = (id, m, s, len, v, pan, o = {}) => { note('brass', id, m, at(s), { dur: len * sp * 0.93, vel: vel(v), pan, att: o.att ?? 0.05, rel: o.rel ?? 0.16 }); if (o.piano !== false) piano(m, s, len, v); };

      // ---- strings: the pad (cellos on the bass, violas and violins voiced smoothly), swelling in each bar ----
      const sv = intro ? 0.42 + 0.08 * lv : A ? 0.52 : lift ? 0.6 : big ? 0.75 : calm ? 0.5 : 0.45 + 0.1 * i;
      // (the intro's last bar lets everything go before the loop's first bar line: whatever rang over it would be missing
      // when the loop comes round, so the seam would jump)
      const preLoop = intro && B.last, barEnd = t0 + bar - (preLoop ? 0.15 : 0), held = barEnd - t0 - 0.05, hr = preLoop ? 0.1 : 0.25;
      const vc = atOrAbove(root, 40);
      note('strings', 'vcSus', vc, t0, { dur: held, vel: sv, pan: -0.4, att: 0.12, rel: hr });
      if (drone) note('strings', 'cbSus', atOrAbove(root, 28) + 12 > 47 ? atOrAbove(root, 28) : atOrAbove(root, 28) + 12, t0, { dur: held, vel: sv * 0.9, pan: -0.2, att: 0.2, rel: hr });
      if (!(intro && i === 0)) {
        pad = voicing(PC, 55, 3, pad && pad.filter(m => PC.tones.includes(pc(m))).length === pad.length ? pad : null);
        pad.forEach((m, k) => note('strings', k < 2 ? 'vlaSus' : 'vlnSus', m, Math.max(0, t0 - 0.02), { dur: held + 0.01, vel: sv * (k < 2 ? 0.9 : 0.8), pan: -0.15 + k * 0.22, att: 0.08, rel: hr - 0.03 }));   // (a hair early, bowed legato into the bar)
      } else note('strings', 'vlaSus', 64, t0, { dur: held, vel: 0.28, pan: 0.05, att: 0.4, rel: hr });   // (the drone's fifth)
      if (lift || big || (build && i >= 2)) {
        note('strings', 'cbSus', atOrAbove(root, 28) + (atOrAbove(root, 28) < 33 ? 12 : 0), t0, { dur: held, vel: big ? 0.75 : 0.6, pan: -0.2, att: 0.08, rel: hr });
        if (big) note('strings', 'vlnSus', pad[pad.length - 1] + (pad[pad.length - 1] + 12 > 88 ? 0 : 12), t0, { dur: held, vel: 0.5, pan: 0.55, att: 0.15, rel: hr });
      }

      for (let s = 0; s < 16; s++) {
        const t = t0 + s * sp, a = ACC[s];
        // ---- the pizzicato bass (cellos and the contrabass) on the 3-3-2, rising eighths through the build ----
        if (!drone) {
          if (build) {
            if (s % 2 === 0) { const m = r2 + [0, 7, 12, 7, 0, 7, 12, 12 + C.ivs[1]][s / 2] + (i >= 3 && s >= 8 ? 12 : 0); note('strings', 'vcPizz', m + 12, at(s), { dur: sp * 1.6, vel: vel(0.5 + 0.1 * i + 0.1 * a), pan: -0.3, rel: 0.2 }); if (s % 4 === 0) note('strings', 'cbPizz', r2, at(s), { dur: sp * 3, vel: vel(0.6 + 0.08 * i), pan: -0.1, rel: 0.25 }); }
          } else if (PIZZ[s] != null) {
            const m = r2 + PIZZ[s], v = (big ? 0.85 : lift ? 0.75 : 0.66) * a;
            note('strings', 'cbPizz', m, at(s), { dur: Math.min(sp * 2.5, barEnd - t - 0.06), vel: vel(v), pan: -0.1, rel: 0.12 });
            note('strings', 'vcPizz', m + 12, at(s), { dur: Math.min(sp * 2, barEnd - t - 0.06), vel: vel(v * 0.8), pan: -0.3, rel: 0.12 });
          }
        } else if (calm && (s === 0 || s === 6)) note('strings', 'cbPizz', r2, at(s), { dur: sp * 4, vel: 0.45, pan: -0.1, rel: 0.3 });
        // ---- the harp: rippling up and down the chord in the drone sections and the lift, in eighths at the climax ----
        const harpOn = drone || lift || (big && s % 2 === 0) || (build && i < 2 && s % 2 === 0);
        if (harpOn && !(intro && i === 0 && s < 2)) {
          // (the chord's tones over two octaves; when the passing notes leave only one or two, the ripple spreads over what is
          // left rather than climbing out of the harp's range)
          const base = atOrAbove(C.root, C.bass !== C.root ? 57 : 50), tones = []; for (let m = base; m < base + 24; m++) if (PC.tones.includes(pc(m))) tones.push(m);
          const k = s % 16, idx = k < 8 ? k : 15 - k, m = tones[Math.round(idx * (tones.length - 1) / 7)] + (big ? 12 : 0);
          note('strings', 'harp', m, at(s), { dur: Math.min(sp * 6, barEnd - t - 0.03), vel: vel((drone ? 0.6 : 0.45) + 0.15 * (s % 4 === 0)), pan: 0.35 - idx * 0.05, rel: 0.12 });   // (let go by the bar line: the next chord is often a semitone away)
        }
        // ---- the spiccato drive (violas on the 3-3-2 in the theme, cellos too at the climax), a run up the scale out of the lift ----
        if ((big || A) && a > 0.8) note('strings', 'vlaSpic', atOrAbove(C.root, 55), at(s), { dur: sp * 0.9, vel: vel((big ? 0.62 : 0.5) * a), pan: 0.2, rel: 0.08 });
        if (big && a > 0.8) note('strings', 'vcSpic', atOrAbove(C.root, 43), at(s), { dur: sp * 0.9, vel: vel(0.6 * a), pan: -0.3, rel: 0.08 });
        if (lift && i === 7 && s >= 8) note('strings', 'vlnSpic', [71, 72, 74, 76, 77, 80, 81, 83][s - 8], at(s), { dur: sp, vel: 0.55 + 0.04 * (s - 8), pan: 0.35, rel: 0.06 });

        // ---- the tunes ----
        const th = (A || big) ? THEME[i][s] : null, lf = lift ? LIFT[i][s] : null, cl = drone ? CALL[i][s] : null;
        if (cl && !(intro && i === 0 && s < 4)) {   // the oboe's call (a touch of flute an octave up in the breather)
          const [m, len] = cl;
          note('winds', 'oboe', m, at(s), { dur: Math.min(len * sp * 0.95, barEnd - t - 0.2), vel: vel(0.7), pan: 0.15, att: 0.03, rel: 0.2, gain: 1.3 });
          if (calm && len >= 4) note('winds', 'flute', m + 12, at(s + 2), { dur: (len - 2.6) * sp, vel: 0.35, pan: -0.25, att: 0.08, rel: 0.25 });
        }
        if (th) {
          const [m0, len] = th, m = X(m0), w = WHO[i];
          if (A) {
            if (w === 'call' || w === 'both') note('winds', 'oboe', m, at(s), { dur: len * sp * 0.93, vel: vel(0.8), pan: 0.15, att: 0.025, rel: 0.16, gain: 1.5 });
            if (w === 'answer') brass('hnSus', m - 12, s, len, 0.72, -0.2);
            if (w === 'both') brass('hnSus', m - 12, s, len, 0.55, -0.2);
            if (w === 'answer') note('winds', 'clar', m - 12, at(s), { dur: len * sp * 0.93, vel: 0.4, pan: 0.3, att: 0.04, rel: 0.16 });
          } else {   // the climax: horns, violins an octave up, trombones an octave down on the chord's notes, oboe and flute on top
            brass('hnSus', m, s, len, 0.92, -0.2);
            note('strings', 'vlnSus', m + 12, at(s), { dur: len * sp * 0.93, vel: vel(0.75), pan: 0.3, att: 0.04, rel: 0.16 });
            if (C.tones.includes(pc(m))) brass('tbnSus', m - 12, s, len, 0.78, 0.15, { piano: false });
            note('winds', 'oboe', m, at(s), { dur: len * sp * 0.93, vel: vel(0.6), pan: 0.15, att: 0.025, rel: 0.16 });
            note('winds', 'flute', m + 12, at(s), { dur: len * sp * 0.93, vel: vel(0.55), pan: -0.25, att: 0.03, rel: 0.16 });
          }
        }
        if (lf) {   // the lift: violins in octaves, flute joining for the second half
          const [m, len] = lf;
          note('strings', 'vlnSus', m, at(s), { dur: len * sp * 0.94, vel: vel(0.78), pan: 0.25, att: 0.06, rel: 0.2 });
          note('strings', 'vlnSus', m - 12, at(s), { dur: len * sp * 0.94, vel: vel(0.62), pan: 0.4, att: 0.06, rel: 0.2, tune: 6 });
          if (i >= 4) note('winds', 'flute', m + 12, at(s), { dur: len * sp * 0.94, vel: 0.45, pan: -0.2, att: 0.05, rel: 0.2 });
        }
        // the lift's horn countermelody: two long chord notes a bar, moving by the nearest step
        if (lift && (s === 0 || s === 8)) {
          let m = nearestTone(C, horn + (s === 8 ? (horn > 62 ? -2 : 2) : 0)); if (s === 8 && m === horn) m = nearestTone(C, horn + (horn > 62 ? -3 : 3));
          horn = Math.max(55, Math.min(69, m));
          brass('hnSus', horn, s, 8, 0.6, -0.25, { att: 0.1 });
        }
        // ---- brass: stabs on the 3-3-2 when it lifts, low brass under the lift and the climax, swells in the build ----
        if ((lift || big) && (s === 0 || s === 3 || s === 6) && !(lift && s === 0)) {
          const v = (big ? 0.7 : 0.55) * a;
          voicing(PC, 55, 3).forEach((m, k) => note('brass', 'hnStac', m, at(s), { vel: vel(v), pan: -0.3 + k * 0.12, dur: 0.2, rel: 0.12 }));
          note('brass', 'tbnStac', atOrAbove(root, 43), at(s), { vel: vel(v), pan: 0.15, dur: 0.24, rel: 0.14 });
          voicing(PC, 55, 3).forEach(m => piano(m, s, 2, v * 0.8));
        }
        if (s === 0 && (lift || big)) {
          note('brass', 'tbnSus', atOrAbove(root, 43), t0, { dur: bar * 0.94, vel: big ? 0.68 : 0.55, pan: 0.2, att: 0.12, rel: 0.2 });
          note('brass', 'tubaSus', atOrAbove(root, 28) + (atOrAbove(root, 28) < 33 ? 12 : 0), t0, { dur: bar * 0.94, vel: big ? 0.68 : 0.55, pan: 0.1, att: 0.12, rel: 0.2 });
        }
        if (build && s === 0) { const v = voicing(C, 53, 2); v.forEach((m, k) => brass('hnSus', m, 0, 15, 0.35 + 0.12 * i, -0.2 + k * 0.2, { att: bar * 0.6, rel: 0.12 })); }
        // ---- winds: the marimba's ostinato (A, the climax, the end of the build), glockenspiel sparkle at the climax ----
        if ((A || big || (build && i >= 2)) && MAR[s] != null) {
          const m = atOrAbove(C.root, 52) + (MAR[s] === 7 && !PC.tones.includes(pc(C.root + 7)) ? 12 : MAR[s]);
          note('winds', 'marimba', m, at(s), { dur: Math.min(sp * 2, barEnd - t - 0.12), vel: vel((big ? 0.7 : 0.6) * a), pan: -0.35, rel: 0.15 });
          if (big && MAR_HI[s + 2] != null && PC.tones.includes(pc(C.root + MAR_HI[s + 2]))) note('winds', 'marimba', atOrAbove(C.root, 52) + MAR_HI[s + 2], at(s + 2), { dur: sp, vel: 0.45, pan: -0.45, rel: 0.2 });
        }
        if (big && (s === 0 || s === 6 || s === 12)) { const m = atOrAbove(PC.tones[(s / 6) % PC.tones.length], 84); note('winds', 'glock', m, at(s), { dur: Math.min(sp * 4, barEnd - t - 0.06), vel: 0.45, pan: 0.4, rel: 0.15 }); }

        // ---- percussion ----
        const g = intro ? [0, 0.6, 0.8, 0.92][i] : calm ? 0.55 : build ? 0.75 + 0.08 * i : big ? 1 : lift ? 0.95 : 0.92;   // (how much of the groove plays)
        // the dum: the big frame drum by hand (and the bass drum doubling it at the lift and the climax)
        if (!(intro && i === 0)) {
          if (s === 0 || (s === 8 && !calm) || (s === 10 && (big || lift)) || (s === 3 && !drone && (i % 2))) note('perc', 'bigHand', null, at(s), { vel: vel(g * (s === 0 ? 0.95 : 0.75)), pan: 0, filter: /hit_(mp|f|ff)_/, dur: 1.5, rel: 0.4, gain: 1.4 });
          if ((lift || big) && (s === 0 || s === 6 || s === 10)) note('perc', 'bdrum', null, t, { vel: big ? 0.75 : 0.6, filter: /^bdrum(3)?_(p|mp|f)_/, dur: 2, rel: 0.4, gain: 0.7 });
        }
        // the tek: conga and quinto slaps on the offbeats, the low tumba on the 3-3-2's syncopations
        if (!drone || (intro && i >= 2)) {
          if (s === 2 || s === 6 || s === 12 || (s === 14 && !intro)) note('perc', 'conga', null, at(s), { vel: vel(0.55 * g + 0.1), pan: 0.3, filter: s === 12 ? /^Quinto-HitN/ : /^Conga-HitN/, dur: 0.8, rel: 0.2 });
          if (!intro && (s === 3 || s === 11)) note('perc', 'conga', null, at(s), { vel: vel(0.6 * g), pan: -0.3, filter: /^Tumba-HitN/, dur: 0.9, rel: 0.2 });
          // ghost notes: bongos filling the sixteenths, softly and never the same twice
          if (s % 2 === 1 && rnd() < (intro ? 0.35 : 0.6)) note('perc', 'bongo', null, at(s), { vel: vel(0.25 + 0.15 * rnd()), pan: 0.45, filter: rnd() < 0.5 ? /^High/ : /^Low/, dur: 0.4, rel: 0.1, gain: 0.7 * g });
        }
        if (intro && i === 1 && (s === 0 || s === 8)) note('perc', 'ethDrum', null, at(s), { vel: 0.5, pan: -0.2, filter: /ethnicLowOpen_hit_mp/, dur: 1.2, rel: 0.3 });
        // the shaker and tambourine (the tambourine on the offbeats once it lifts)
        if (!(intro && i < 2) && !calm) note('perc', 'shaker', null, at(s), { vel: s % 2 ? 0.6 : 0.35, pan: 0.55, dur: 0.3, rel: 0.05, gain: (s % 4 === 2 ? 0.9 : 0.55) * g });
        if ((lift || big) && s % 4 === 2) note('perc', 'tamb', null, at(s), { vel: vel(0.5), pan: -0.5, filter: /^Tamb1-Hit/, dur: 0.6, rel: 0.1 });
        // the snare's backbeat at the lift and the climax
        if ((lift || big) && (s === 4 || s === 12)) note('perc', 'snare', null, t, { vel: big ? 0.72 : 0.58, pan: 0.1, filter: /^snare1_(mp|f|ff)_/, dur: 0.8, rel: 0.2 });
        // finger cymbals and chimes: the temple's air
        if ((drone || A) && s === 14 && i % 2 === 1) note('perc', 'fingerCym', null, at(s), { vel: 0.5, pan: 0.5, dur: 2.5, rel: 0.6 });
        // (the very first moment is a hit: the game finds where an encoded file truly starts by its first sound)
        if (intro && i === 0 && s === 0) { note('perc', 'bigMallet', null, 0, { vel: 0.55, filter: /hit_(mf|f)_/, dur: 2, rel: 0.5 }); note('perc', 'timp', null, 0, { vel: 0.5, filter: /Timpani[12]_Hit/, dur: 2.5, rel: 0.6, gain: 0.6 }); }
        if (s === 0 && i === 0 && drone) note('perc', 'chimes', null, t, { vel: 0.4, pan: -0.4, filter: /windchimes_(slowDesc1|desc1)/, dur: 4, rel: 1, gain: 0.8 });
        // ---- the joins ----
        if (s === 0 && i === 0 && (A || lift)) note('perc', 'cym', null, t, { vel: 0.7, pan: 0.3, filter: /hit_hardmall_(f|fff)$/, dur: 4, rel: 1, gain: lift ? 0.6 : 0.5 });
        if (s === 0 && i === 0 && big) { note('perc', 'gong', null, t, { vel: 0.8, pan: -0.1, dur: 6, rel: 1.5, gain: 0.8 }); note('perc', 'cym', null, t, { vel: 0.8, pan: 0.3, filter: /hit_hardmall_(f|fff)$/, dur: 4, rel: 1, gain: 0.7 }); }
        if (s === 0 && i % 2 === 0 && (A || big || lift)) note('perc', 'timp', null, t, { vel: big ? 0.7 : 0.55, pan: -0.15, filter: /Timpani[12]_Hit/, dur: 2.5, rel: 0.6, gain: 0.7 });
        if (s === 0 && B.intoNew && sec !== 'climax' && sec !== 'break') rev('perc', 'cym', /hit_hardmall_f$/, t0 + bar, { len: bar * (build ? 0.9 : 0.6), gain: build ? 1.5 : 1.7 });   // (a cymbal hit backwards: a swell into the downbeat)
        if (s === 8 && B.intoNew && (intro || build)) note('perc', 'timpRoll', null, t, { vel: 1, filter: /Timpani[12]_Roll_v5/, dur: intro ? barEnd - t : sp * 8, rel: intro ? 0.1 : 0.05, gain: 0.7 });
        // tom fills out of the theme and the lift (tenors, low to high, the 3-3-2 then sixteenths)
        if (B.intoNew && (A || lift) && s >= 10) note('perc', s % 2 ? 'tenorLo' : 'tenorHi', null, at(s), { vel: vel(0.55 + 0.05 * (s - 10)), pan: (s - 12.5) * 0.15, dur: 0.6, rel: 0.2 });
        // the build: a snare roll crescendo across its four bars, toms in its last two beats
        if (build && i === 0 && s === 0) for (let k = 0; k < 128; k++) note('perc', 'snare', null, t + k * sp / 2, { vel: 0.12 + 0.68 * (k / 128) ** 1.5, pan: 0.1, filter: /^snare1_(pp|p|mp|f|ff)_/, dur: 0.25, rel: 0.08 });
        if (build && i === 3 && s >= 8 && s % 2 === 0) note('perc', s % 4 ? 'tenorHi' : 'tenorLo', null, at(s), { vel: 0.6 + 0.04 * s, pan: (s - 11) * 0.12, dur: 0.6, rel: 0.2 });
      }
    });
  },
};
