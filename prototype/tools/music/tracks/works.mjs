// "Works": machines, clockwork, mines and the lab (Old Gold Mine, Clockwork Tower, Kooky Lab, Pipe Organ Cavern).
//
// The feel: the factory and mine-cart stages in the spirit of the Donkey Kong Country Returns / Tropical Freeze scores
// (a feel, not their notes): a tight, slightly comic machine in C minor that keeps stacking gears until it is all
// running, then a big brass hook rides over it. Each instrument is a gear on its own cycle: the xylophone's 16ths cycle
// three chord notes against the four-step beat (the pattern shifts every beat), the claves tick dotted 8ths (3 against
// 4), the staccato bassoon bounces 8ths in fours, the woodblocks tick-tock the quarters, an anvil sits on the backbeat
// and a brake drum clanks at the end of every other bar. The hook is a call and response: oboe and low clarinet
// staccato (the call), muted-sounding staccato trumpets and horns (the answer); the lift goes to E-flat major with the
// violins singing in octaves; the climax is the hook in full brass and organ a minor third up (E-flat minor).
//
// Form (126 bpm, 40 bars; the loop is bars 5-40, 68.6 s):
//   intro  4  the machine starts: an anvil, a ratchet winding up, the clock; bassoon, xylophone, claves, pizzicato join
//   A     12  bars 1-4 the machine alone (organ in the cavern's colour); bars 5-12 the hook: oboe and clarinet call
//             (1-2, 5-6), staccato trumpets and horns answer (3-4), all together (7-8; a Neapolitan D-flat in bar 7)
//   B      8  the lift (E-flat major): violins in octaves, a horn countermelody, low brass, snare and anvil backbeat
//   climax 8  the hook up a minor third (E-flat minor): trumpets and horns, trombones, organ, glockenspiel, violins
//   break  4  the machine winds down: the clock, a music-box glockenspiel and a legato bassoon over soft organ
//   build  4  the gears come back one by one, a ratchet, snare 16ths and a timpani roll, horns swelling into A
//
// Stems: strings (pad, spiccato pump, pizzicato, the lift's melody), brass (the answers, countermelody, low brass, the
// climax's hook), piano (the brass lines on piano), perc (every unpitched sound plus timpani), winds (xylophone,
// bassoon, oboe, clarinet, flute, glockenspiel, organ).
import { ph, voicing, atOrAbove, nearestTone, pc } from '../lib.mjs';

// ---- the score ----
const CHORDS = {
  intro: ['Cm', 'Cm', 'Ab/C', 'Cm'],
  A: ['Cm', 'Ab', 'Fm', 'G', 'Cm', 'Ab', 'Fm', 'G', 'Cm', 'Ab', 'Db', 'G7'],
  B: ['Ab', 'Bb', 'Eb', 'Cm', 'Ab', 'Bb', 'Fm', 'Bb7'],
  climax: ['Cm', 'Ab', 'Fm', 'G', 'Cm', 'Ab', 'Db', 'G7'],   // (up a minor third: E-flat minor)
  break: ['Cm', 'Ab', 'Fm', 'G'],
  build: ['Ab', 'Fm', 'Db', 'G7'],
};
// the hook (written in C minor): two-bar phrases, the staccato machine figure, a Neapolitan turn in bar 7
const HOOK = ph(
  [[0, 72, 2], [2, 72, 1], [3, 75, 2], [5, 72, 1], [6, 79, 3], [10, 77, 2], [12, 75, 2], [14, 74, 2]],
  [[0, 72, 3], [3, 75, 3], [6, 72, 4], [12, 68, 2], [14, 70, 2]],
  [[0, 72, 2], [2, 72, 1], [3, 77, 2], [5, 72, 1], [6, 80, 3], [10, 79, 2], [12, 77, 2], [14, 75, 2]],
  [[0, 74, 3], [3, 71, 3], [6, 67, 6], [12, 71, 2], [14, 74, 2]],
  [[0, 72, 2], [2, 72, 1], [3, 75, 2], [5, 72, 1], [6, 79, 3], [10, 77, 2], [12, 75, 2], [14, 74, 2]],
  [[0, 72, 3], [3, 75, 3], [6, 80, 4], [10, 79, 2], [12, 77, 2], [14, 75, 2]],
  [[0, 77, 3], [3, 80, 3], [6, 77, 2], [8, 73, 4], [12, 77, 2], [14, 80, 2]],
  [[0, 79, 3], [3, 74, 3], [6, 71, 4], [10, 74, 2], [12, 77, 2], [14, 71, 2]]);
const WHO = ['call', 'call', 'answer', 'answer', 'call', 'call', 'both', 'both'];
// the lift (E-flat major), violins in octaves, climbing into the climax's new key at the end
const LIFT = ph(
  [[0, 72, 6], [6, 75, 2], [8, 80, 6], [14, 79, 2]],
  [[0, 77, 8], [8, 74, 4], [12, 70, 4]],
  [[0, 75, 6], [6, 79, 2], [8, 82, 6], [14, 80, 2]],
  [[0, 79, 8], [8, 75, 4], [12, 72, 4]],
  [[0, 72, 4], [4, 75, 4], [8, 80, 6], [14, 82, 2]],
  [[0, 82, 6], [6, 80, 2], [8, 77, 4], [12, 74, 4]],
  [[0, 80, 6], [6, 79, 2], [8, 77, 4], [12, 72, 4]],
  [[0, 77, 4], [4, 80, 4], [8, 82, 4], [12, 86, 4]]);
const LOOP_BAR = 4;

// works: the chord with the tune's passing notes taken out (a chord note a semitone from a melody note that is not in
// the chord, while that note sounds between steps s0 and s0 + len), so no gear rubs under the tune
function worksFilter(C, tune, X) {
  const act = Array.from({ length: 16 }, () => []);
  for (const [s, [m, len]] of Object.entries(tune)) { const p = pc(X(m)); if (C.tones.includes(p)) continue; for (let k = +s; k < Math.min(16, +s + len); k++) act[k].push(p); }
  return (s0 = 0, len = 16) => {
    const bad = []; for (let k = Math.max(0, s0); k < Math.min(16, s0 + len); k++) bad.push(...act[k]);
    const keep = C.tones.filter(p => !bad.some(q => Math.abs(((p - q + 18) % 12) - 6) === 1));
    return keep.length ? { ...C, tones: keep } : C;
  };
}

export default {
  name: 'works', label: 'Machines', bpm: 126, keyTr: -2, seed: 2613,
  form: [['intro', 4], ['A', 12], ['B', 8], ['climax', 8], ['break', 4], ['build', 4]], loop: LOOP_BAR, join: LOOP_BAR,
  chords: CHORDS, up: { climax: 3 },
  // the key per bar, for the studio's note editor: C (harmonic) minor, the lift in E-flat major, the climax in E-flat minor
  keyOf: B => B.sec === 'B' ? { tonic: 3, scale: 'major' } : { tonic: pc(B.up), scale: B.sec === 'A' || B.sec === 'climax' || B.sec === 'build' ? 'harmonic' : 'minor' },
  mix: { send: { strings: 0.3, winds: 0.3, perc: 0.16, brass: 0.26 }, level: { strings: 1.1, perc: 1.15, winds: 1.1, brass: 1 } },
  compose(S) {
    const { sp, bar, map, rev, rnd } = S;
    let pad = null, horn = 63;
    map.forEach(B => {
      const { sec, i, t0, C, up, b } = B, X = m => m + up;
      const intro = sec === 'intro', A = sec === 'A', lift = sec === 'B', big = sec === 'climax', calm = sec === 'break', build = sec === 'build';
      const hb = A && i >= 4 ? i - 4 : big ? i : -1, root = C.bass;
      const tune = hb >= 0 ? HOOK[hb] : lift ? LIFT[i] : calm ? HOOK[i] : {};
      const F = worksFilter(C, tune, X), PC = F();
      const vel = v => Math.max(0.05, Math.min(1, v + (rnd() - 0.5) * 0.06));
      // (a machine: tight timing. On the loop's first bar line every hit lands a few ms after it, so the seam itself carries
      // only the wrapped tail and no attack starts exactly on the sample the loop jumps to)
      const late = s => (b === LOOP_BAR && s === 0 ? 0.004 : 0), at = s => t0 + s * sp + late(s) + (rnd() - 0.5) * 0.004;
      const preLoop = intro && B.last, barEnd = t0 + bar - (preLoop ? 0.15 : 0), held = barEnd - t0 - 0.05, hr = preLoop ? 0.1 : 0.25;
      const clip = (t, d) => Math.min(d, barEnd - t - 0.03);
      // (every note of the intro's last bar is let go before the loop's first bar line: whatever rang over it would be
      // missing when the loop comes round)
      const N = (stem, id, m, tt, o = {}) => { if (preLoop) { if (tt > barEnd - 0.03) return; o = { ...o, dur: Math.min(o.dur ?? 10, barEnd - tt - 0.02), rel: Math.min(o.rel ?? 0.25, 0.08) }; } S.note(stem, id, m, tt, o); };
      // (how far the machine has been built: which gears turn in this bar)
      const gearBsn = (intro && i >= 1) || A || big || build || lift, gearXylo = (intro && i >= 2) || A || big || (build && i >= 1) || lift,
        gearClave = (intro && i >= 2) || (A && i >= 1) || big || (build && i >= 2), pump = (intro && i === 3) || A || lift || big || (build && i >= 2),
        pizz = (intro && i === 3) || A || big || (build && i >= 1), anvilOn = (intro && i === 3) || (A && i >= 2) || lift || big || (build && i >= 3);
      const piano = (m, s, len, v) => N('piano', 'piano', m, at(s), { dur: Math.max(0.12, len * sp * 0.9), vel: vel(v * 0.85), pan: 0.1, rel: 0.18, att: 0.002 });
      const brass = (id, m, s, len, v, pan, o = {}) => { N('brass', id, m, at(s), { dur: len * sp * (o.short ?? 0.93), vel: vel(v), pan, att: o.att ?? 0.03, rel: o.rel ?? 0.14 }); if (o.piano !== false) piano(m, s, len * (o.short ?? 0.93), v); };

      // ---- strings: the cellos' root and the violas' and violins' pad ----
      const sv = intro ? 0.35 + 0.06 * i : A ? (i < 4 ? 0.36 : 0.44) : lift ? 0.56 : big ? 0.66 : calm ? 0.36 : 0.4 + 0.08 * i;
      if (!(intro && i < 2)) N('strings', 'vcSus', atOrAbove(root, 40), t0, { dur: held, vel: sv, pan: -0.4, att: 0.1, rel: hr });
      if (A || lift || big || build) {
        pad = voicing(PC, 55, 3, pad && pad.every(m => PC.tones.includes(pc(m))) ? pad : null);
        pad.forEach((m, k) => N('strings', k < 2 ? 'vlaSus' : 'vlnSus', m, Math.max(0, t0 - 0.02), { dur: held + 0.01, vel: sv * (k < 2 ? 0.85 : 0.75), pan: -0.15 + k * 0.22, att: 0.08, rel: hr - 0.03 }));
      }
      if (lift || big) N('strings', 'cbSus', atOrAbove(root, 28) + (atOrAbove(root, 28) < 33 ? 12 : 0), t0, { dur: held, vel: big ? 0.66 : 0.55, pan: -0.2, att: 0.08, rel: hr });

      for (let s = 0; s < 16; s++) {
        const t = t0 + s * sp + late(s), g = (b - LOOP_BAR) * 16 + s, g3 = ((g % 3) + 3) % 3, down = s % 4 === 0;
        // ---- the spiccato pump: basses on the 8ths, cellos an octave up on the offbeats ----
        if (pump && s % 2 === 0 && !(intro && s >= 10)) {   // (the intro's pump stops early: its low ring would linger under the loop start)
          const r = atOrAbove(root, 36), v = (big ? 0.7 : lift ? 0.6 : 0.52) * (down ? 1 : 0.75);
          N('strings', 'cbSpic', r, at(s), { dur: sp * 1.2, vel: vel(v), pan: -0.15, rel: 0.06 });
          if (s % 4 === 2) N('strings', 'vcSpic', r + 12, at(s), { dur: sp * 1.1, vel: vel(v * 0.85), pan: -0.35, rel: 0.06 });
        }
        if (calm && (s === 0 || s === 8)) N('strings', 'cbPizz', atOrAbove(root, 36), at(s), { dur: clip(t, sp * 5), vel: 0.45, pan: -0.1, rel: 0.25 });
        // ---- pizzicato: offbeat chords (the violins; the violas while the violins sing the lift) ----
        if ((pizz || lift) && s % 4 === 2) {
          const ch = F(s, 2);
          voicing(ch, lift ? 60 : 67, 2).forEach((m, k) => N('strings', lift ? 'vlaPizz' : 'vlnPizz', m, at(s), { dur: clip(t, sp * 2), vel: vel(big ? 0.6 : 0.5), pan: 0.3 + k * 0.1, rel: 0.1 }));
        }
        // ---- the tunes ----
        const tn = tune[s];
        if (tn && hb >= 0) {
          const [m0, len] = tn, m = X(m0), w = WHO[hb], short = len < 3;
          if (A) {
            if (w === 'call' || w === 'both') {
              N('winds', 'oboeStac', m, at(s), { dur: len * sp * 0.6, vel: vel(0.75), pan: 0.2, rel: 0.1, gain: 1.4 });
              N('winds', 'clarStac', m - 12, at(s), { dur: len * sp * 0.6, vel: vel(0.7), pan: -0.15, rel: 0.1, gain: 1.3 });
            }
            if (w === 'answer' || w === 'both') {
              brass('tptStac', m, s, len, w === 'both' ? 0.68 : 0.8, 0.15, { short: 0.55 });
              brass('hnStac', m - 12, s, len, w === 'both' ? 0.62 : 0.72, -0.2, { short: 0.55, piano: false });
            }
          } else {   // the climax: trumpets (held on the long notes), horns an octave down, trombones on the chord notes
            brass(short ? 'tptStac' : 'tptSus', m, s, len, 0.85, 0.15, { short: short ? 0.6 : 0.93 });
            brass(short ? 'hnStac' : 'hnSus', m - 12, s, len, 0.8, -0.2, { short: short ? 0.6 : 0.93, piano: false });
            if (C.tones.includes(pc(m))) brass(short ? 'tbnStac' : 'tbnSus', m - 24, s, len, 0.66, 0.25, { short: short ? 0.6 : 0.93, piano: false });
            N('strings', short ? 'vlnSpic' : 'vlnSus', m, at(s), { dur: len * sp * (short ? 0.7 : 0.93), vel: vel(0.62), pan: 0.3, att: 0.03, rel: 0.12 });
            N('winds', 'glock', m + 12, at(s), { dur: clip(t, len * sp * 0.85), vel: vel(0.45), pan: 0.4, rel: 0.15 });
          }
        }
        if (tn && lift) {   // the lift: violins in octaves, flute an octave up in the second half
          const [m, len] = tn;
          N('strings', 'vlnSus', m, at(s), { dur: len * sp * 0.94, vel: vel(0.76), pan: 0.25, att: 0.06, rel: 0.2 });
          N('strings', 'vlnSus', m - 12, at(s), { dur: len * sp * 0.94, vel: vel(0.6), pan: 0.4, att: 0.06, rel: 0.2, tune: 6 });
          if (i >= 4) N('winds', 'flute', m + 12, at(s), { dur: len * sp * 0.94, vel: 0.42, pan: -0.2, att: 0.05, rel: 0.2 });
        }
        if (tn && calm) {   // the break: a music-box glockenspiel calls (bars 1-2), the bassoon answers legato (3-4)
          const [m, len] = tn;
          if (i < 2) N('winds', 'glock', m + 12, at(s), { dur: clip(t, len * sp + 0.3), vel: vel(0.42), pan: 0.35, rel: 0.25 });
          else N('winds', 'bsn', m - 12, at(s), { dur: Math.min(len * sp * 0.92, barEnd - t - 0.05), vel: vel(0.55), pan: -0.15, att: 0.03, rel: 0.15, gain: 1 });
        }
        // the lift's horn countermelody: two chord notes a bar, moving by the nearest step
        if (lift && (s === 0 || s === 8)) {
          let m = nearestTone(PC, horn + (s === 8 ? (horn > 63 ? -2 : 2) : 0)); if (s === 8 && m === horn) m = nearestTone(PC, horn + (horn > 63 ? -3 : 3));
          horn = Math.max(55, Math.min(70, m));
          brass('hnSus', horn, s, 8, 0.55, -0.25, { att: 0.1 });
        }
        // ---- brass: low brass under the lift and the climax; a machine stab on the 3-against-4 in the climax; swells in the build ----
        if (s === 0 && (lift || big)) {
          N('brass', 'tbnSus', atOrAbove(root, 43), t0, { dur: bar * 0.94, vel: big ? 0.6 : 0.5, pan: 0.2, att: 0.1, rel: 0.2 });
          N('brass', 'tubaSus', atOrAbove(root, 28) + (atOrAbove(root, 28) < 33 ? 12 : 0), t0, { dur: bar * 0.94, vel: big ? 0.62 : 0.5, pan: 0.1, att: 0.1, rel: 0.2 });
        }
        if (lift && (s === 6 || s === 14) && i % 2 === 1) voicing(F(s, 2), 55, 3).forEach((m, k) => { N('brass', 'hnStac', m, at(s), { vel: vel(0.5), pan: -0.3 + k * 0.15, dur: 0.18, rel: 0.1 }); piano(m, s, 1.5, 0.45); });
        if (build && s === 0) voicing(C, 53, 2).forEach((m, k) => brass('hnSus', m, 0, 15, 0.32 + 0.12 * i, -0.2 + k * 0.2, { att: bar * 0.6, rel: 0.12 }));
        // ---- winds: the gears ----
        // the xylophone: 16ths cycling three chord notes (so the figure shifts against the beat), every fourth 16th left out
        if (gearXylo && s % 4 !== 3) {
          const v3 = voicing(F(s, 2), 72, 3), m = [v3[0], v3[2], v3[1]][g3];
          const v = (lift ? 0.3 : big ? 0.4 : 0.36) + (g3 === 0 ? 0.14 : 0) + (down ? 0.05 : 0);
          N('winds', 'xylo', m + (big ? 12 : 0), at(s), { dur: clip(t, sp * 1.5), vel: vel(v), pan: 0.35, rel: 0.1, gain: big ? 0.8 : 1 });
        }
        // the staccato bassoon: 8ths bouncing root, fifth, octave, fifth
        if (gearBsn && s % 2 === 0) {
          const lo = atOrAbove(root, 43), fifth = nearestTone(PC, lo + 7), m = [lo, fifth, lo + 12, fifth][((g / 2) % 4 + 4) % 4];
          N('winds', 'bsnStac', m, at(s), { dur: sp * 1.2, vel: vel((lift ? 0.5 : 0.6) * (down ? 1 : 0.8)), pan: -0.3, rel: 0.08, gain: A ? 0.95 : 1.15 });
        }
        // the organ: the cavern's colour (the machine's first bars, the break, the climax), the pedal under the climax
        if (s === 0 && ((A && i < 4) || calm || big)) {
          const ov = voicing(PC, big ? 60 : 55, big ? 3 : 4);
          ov.forEach((m, k) => N('winds', 'organ', m, t0, { dur: held, vel: 0.5, pan: -0.25 + k * 0.15, att: 0.06, rel: hr, gain: big ? 0.9 : calm ? 0.4 : 0.6 }));
          if (big || calm) N('winds', 'organPedal', atOrAbove(root, 36), t0, { dur: held, vel: 0.5, pan: 0, att: 0.06, rel: hr, gain: big ? 0.9 : 0.55 });
        }

        // ---- percussion ----
        // (the very first moment is a hit: the game finds where an encoded file truly starts by its first sound)
        if (intro && i === 0 && s === 0) {
          N('perc', 'anvil', null, 0, { vel: 0.8, dur: 1.5, rel: 0.4, pan: 0.2 });
          N('perc', 'timp', null, 0, { vel: 0.55, filter: /Timpani[12]_Hit/, dur: 2.5, rel: 0.6, gain: 0.7 });
          N('perc', 'bdrum', null, 0, { vel: 0.6, filter: /^bdrum_(mp|f)_/, dur: 1.5, rel: 0.4, gain: 0.6 });
        }
        // the clock: woodblocks tick-tock on the quarters, everywhere
        if (down && !(intro && i === 0 && s === 0)) N('perc', 'wood', null, at(s), { vel: vel(s % 8 === 0 ? 0.7 : 0.55), filter: s % 8 === 0 ? /^wood_click_f/ : /^wood_click(3|_mp)/, pan: s % 8 === 0 ? -0.45 : 0.45, dur: 0.4, rel: 0.1, gain: calm ? 0.8 : 1 });
        // claves on every third 16th (3 against 4)
        if (gearClave && g3 === 0) N('perc', 'claves', null, at(s), { vel: vel(0.45 + 0.15 * down), pan: 0.55, dur: 0.4, rel: 0.1, gain: 0.8 });
        // the anvil on the backbeat; the brake drum at the end of every other bar (and halfway in the climax)
        if (anvilOn && (s === 4 || s === 12)) N('perc', 'anvil', null, at(s), { vel: vel(big ? 0.7 : 0.6), pan: 0.2, dur: 1, rel: 0.3, gain: big ? 0.9 : 0.75 });
        if (((A && i >= 4) || lift) && s === 14 && i % 2 === 1 || (big && (s === 6 || s === 14))) N('perc', 'brake', null, at(s), { vel: vel(0.6), pan: -0.3, dur: 0.8, rel: 0.2, gain: 0.8 });
        // the kick: 1 and 3, a push before 3 when it lifts
        const kick = (A || lift || big || (build && i >= 2)) && (s === 0 || s === 8 || ((lift || big) && s === 6) || (big && s === 11));
        if (kick || (calm && s === 0)) N('perc', 'bdrum', null, t, { vel: big ? 0.72 : calm ? 0.4 : 0.6, filter: /^bdrum_(mp|f)_/, dur: 1.2, rel: 0.3, gain: 0.75 });
        // the snare's backbeat (with the anvil) and a motor of snare taps in the lift and the climax
        if ((lift || big) && (s === 4 || s === 12)) N('perc', 'snare', null, t, { vel: big ? 0.68 : 0.56, pan: 0.1, filter: /^snare1_(mp|f|ff)_/, dur: 0.6, rel: 0.15 });
        if ((lift || big) && s % 4 !== 0) N('perc', 'snare2', null, at(s), { vel: vel(0.3 + 0.2 * (s % 2 === 0)), pan: -0.1, dur: 0.3, rel: 0.06, gain: 0.55 });
        // timpani on the downbeat of every other bar
        if (s === 0 && i % 2 === 0 && (A || lift || big)) N('perc', 'timp', null, t, { vel: big ? 0.65 : 0.5, pan: -0.15, filter: /Timpani[12]_Hit/, dur: 2, rel: 0.5, gain: 0.7 });
        // ---- the joins ----
        if (s === 0 && i === 0 && (A || lift)) N('perc', 'cym', null, t, { vel: 0.7, pan: 0.3, filter: /hit_hardmall_(f|fff)$/, dur: 4, rel: 1, gain: lift ? 0.6 : 0.5 });
        if (s === 0 && i === 0 && big) { N('perc', 'clash', null, t, { vel: 0.85, pan: -0.2, filter: /crash_hit_ff_loose/, dur: 4, rel: 1, gain: 0.8 }); N('perc', 'bdrum', null, t, { vel: 0.85, filter: /^bdrum_(f|ff)_/, dur: 2, rel: 0.4, gain: 0.8 }); }
        if (s === 0 && B.intoNew && sec !== 'climax' && sec !== 'break') rev('perc', 'cym', /hit_hardmall_f$/, t0 + bar, { len: bar * (build ? 0.9 : 0.6), gain: 1.5 });   // (the intro's swell and the build's both end on the loop start: the same gain, so the seam matches)
        // the ratchet: the machine wound up (the intro's start, the build's last bar)
        if ((intro && i === 0 && s === 4) || (build && i === 3 && s === 0)) N('perc', 'wood', null, at(s), { vel: 0.7, filter: /^ratchet1/, pan: -0.3, dur: intro ? 1.6 : 1.8, rel: 0.3, gain: 0.9 });
        if (intro && i === 3 && s === 8) N('perc', 'timpRoll', null, t, { vel: 1, filter: /Timpani[12]_Roll_v5/, dur: barEnd - t, rel: 0.1, gain: 0.6 });
        // tom fills out of A and the lift: 16ths, low to high
        if (B.intoNew && (A || lift) && s >= 12) N('perc', s % 2 ? 'tenorHi' : 'tenorLo', null, at(s), { vel: vel(0.55 + 0.06 * (s - 12)), pan: (s - 13.5) * 0.2, dur: 0.5, rel: 0.15 });
        // the build: snare 16ths growing over its last two bars, a timpani roll into A
        if (build && i >= 2) N('perc', 'snare', null, at(s), { vel: 0.18 + 0.6 * (((i - 2) * 16 + s) / 32) ** 1.4, pan: 0.1, filter: /^snare1_(pp|p|mp|f|ff)_/, dur: 0.3, rel: 0.08, gain: s % 4 === 0 ? 1 : 0.75 });
        if (build && i === 3 && s === 8) N('perc', 'timpRoll', null, t, { vel: 1, filter: /Timpani[12]_Roll_v5/, dur: sp * 8, rel: 0.05, gain: 0.6 });
      }
    });
  },
};
