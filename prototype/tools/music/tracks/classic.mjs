// The classic score: menu, jungle, caves and magma (the original Coconut Rocket soundtrack, one score in three keys).
// Moved here unchanged from render.mjs on 2026-10-28 (renders sample-for-sample identical to before): don't edit it,
// the game's baked studio edits (AUDIO_BAKED) are made against these exact files.
//
// The score: a form of sections, one chord per bar, tunes as phrase tables, the 3-3-2 drive.
import { SR, note, reversed, rnd, setSeed, stemBufs, finish, ph } from '../lib.mjs';

// The piano part, in the spirit of the great minimalist film-score pianos (a style, not anyone's notes): a hypnotic
// ostinato ticking in 8ths on two held notes of the key (A and D: the fifth and the root), with an upper note that
// leans on E and F every other bar. Those notes stay put while the chords move under them, so each chord recolours
// them (a seventh over Bb, a sixth over C, a ninth over G minor): that slowly shifting tension is the goosebump. Around
// it, restraint: deep pedalled octaves on each chord's root, a sparse tune of only the tune's long notes, and layers
// that arrive one by one (the ostinato alone, then the bass, then the tune, then the ostinato doubled an octave up and
// soft chords, then everything at forte). Every two-bar phrase crescendos; a touch of human variation in timing and touch.
const BEAT = { sp: 0.125 };   // the current track's 16th (set per render)
const OSTI = [[69, 74, 69, 74, 69, 74, 69, 76], [69, 74, 69, 76, 69, 77, 69, 76]];   // the two-bar cell, in 8ths (D minor; moves with the music)
// Keep an ostinato note if it fits the chord: a chord tone, or a major chord's ninth (a whole step from everything).
// Anything else moves to the nearest note that fits: with the strings playing the same chord in the same octave, even
// a lush seventh becomes a semitone cluster.
function fitChord(n, chord, root) {
  const pcs = new Set(chord.map(c => ((c % 12) + 12) % 12)), r = ((root % 12) + 12) % 12, major = pcs.has((r + 4) % 12);
  const colours = major ? [2] : [];
  const ok = m => { const pc = ((m % 12) + 12) % 12; return pcs.has(pc) || colours.some(c => (r + c) % 12 === pc); };
  if (ok(n)) return n;
  for (const d of [-1, 1, -2, 2, -3, 3]) if (ok(n + d)) return n + d;
  return n;
}
function pianoPart(bufs, P) {
  const { t0, sp, sec, i, C, X, root, tuneAt, steady } = P, big = sec === 'climax', lift = sec === 'B' || big, calm = sec === 'break';
  const base = { intro: 0.3 + 0.06 * (steady ? 1 : i), A: 0.42, B: 0.52, climax: 0.72, break: 0.28, build: 0.32 + 0.13 * i }[sec];
  const human = () => (rnd() - 0.5) * 0.06;
  // (a pianist changes the pedal with the chord: every note lets go by the next bar line, so nothing smears into it)
  const barEnd = t0 + 16 * sp;
  const key = (m, s, vel, o = {}) => {
    const at = t0 + s * sp + (rnd() - 0.5) * 0.007, dur = Math.min(o.dur ?? sp * 2, barEnd - at), rel = Math.max(0.06, Math.min(o.rel ?? 2.5, barEnd + 0.05 - (at + dur)));
    note(o.wet ? bufs.pianoWet : bufs, 'piano', 'piano', m, at, { vel: Math.max(0.06, Math.min(1, vel)), gain: o.gain ?? 1, dur, rel, att: 0.002, pan: o.pan ?? 0 });
  };
  // the ostinato: 8ths, crescendo across the two-bar phrase, the beat a touch firmer, notes left to ring on the pedal
  // (and it gives way to the tune: a note a semitone off a tune note sounding over it takes the tune's note instead)
  const sung = []; for (let s = 0; s < 16; s++) { const tn = tuneAt(s); if (tn) sung.push([s, s + tn[1], tn[0]]); }
  const giveWay = (m, s) => { for (const [a, b, t] of sung) if (a < s + 6 && b > s) { const d = (((m - t) % 12) + 12) % 12; if (d === 1 || d === 11) return m + (d === 1 ? -1 : 1); } return m; };
  for (let e = 0; e < 8; e++) {
    const s = e * 2, m = giveWay(fitChord(X(OSTI[i % 2][e]), C.s.map(X), root), s), grow = 0.16 * ((i % 2) * 8 + e) / 16, v = base + grow + (e % 2 ? 0 : 0.04) + human();
    key(m, s, v, { dur: sp * 4, rel: 2.2, pan: e % 2 ? 0.28 : -0.12, gain: 0.8 });
    if (lift || (sec === 'build' && i >= 2)) key(m + 12, s, v * 0.7, { dur: sp * 3, rel: 2.2, pan: e % 2 ? 0.45 : 0.1, gain: 0.45 });
    // the shimmer: an octave above, heard only through the hall (a halo, not a line)
    key(m + 12, s, v * 0.6, { dur: sp * 2, rel: 1.5, gain: 0.5, wet: true });
  }
  // the bass: a deep octave on the chord's root, held on the pedal (from the second bar of the intro; re-struck on
  // every beat as the build drives up, and mid-bar at the climax)
  if (!(sec === 'intro' && i === 0 && !steady)) {
    const low = root - 12 >= 28 ? root - 12 : root, bv = base + 0.08;
    const hits = sec === 'build' ? [0, 4, 8, 12] : big ? [0, 8] : [0];
    for (const s of hits) { key(low, s, bv + human(), { dur: sp * (16 - s), rel: 3, pan: -0.2, gain: 0.85 }); key(low + 12, s, (bv - 0.08) + human(), { dur: sp * (16 - s), rel: 3, pan: -0.15, gain: 0.55 }); }
  }
  // soft chords under the lift and the climax: the chord's middle voices, once a bar
  if (lift) C.s.map(X).slice(1, 4).forEach((m, k) => key(m, 0, base * 0.7 + human(), { dur: sp * 16, rel: 3, pan: -0.1 + k * 0.12, gain: 0.4 }));
  // the tune: only its long notes, sparse and singing (an octave up from the left hand, in octaves when it lifts)
  for (let s = 0; s < 16; s++) {
    const tn = tuneAt(s); if (!tn || (tn[1] < 4 && !calm)) continue;
    if (sec === 'intro') continue;   // (the intro is the ostinato and the bass alone)
    const [m, len] = tn, v = base + 0.22 + human(), dur = len * sp;
    key(m, s, v, { dur, rel: 3, pan: 0.15, gain: 1.05 });
    if (lift) key(m - 12, s, v * 0.85, { dur, rel: 3, pan: 0.05, gain: 0.7 });
    if (big) key(m + 12, s, v * 0.6, { dur, rel: 3, pan: 0.25, gain: 0.4 });
  }
}

// ---------- the score ----------
// chords: bass root, string voicing (cellos, violas, violins), the brass section's
const EC = {
  Dm: { r: 38, s: [50, 57, 62, 65, 69], br: [62, 65, 69] },
  Bb: { r: 34, s: [46, 53, 58, 62, 65], br: [58, 62, 65] },
  F:  { r: 41, s: [53, 57, 60, 65, 69], br: [60, 65, 69] },
  C:  { r: 36, s: [48, 55, 60, 64, 67], br: [60, 64, 67] },
  Gm: { r: 43, s: [43, 55, 58, 62, 67], br: [58, 62, 67] },
  Eb: { r: 39, s: [51, 55, 58, 63, 67], br: [58, 63, 67] },
  A:  { r: 45, s: [45, 57, 61, 64, 69], br: [57, 61, 64] },
};
const SEC = {
  intro:  { ch: ['Dm', 'Dm', 'Bb', 'A'] },
  A:      { ch: ['Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'Gm', 'A'] },
  B:      { ch: ['Gm', 'Eb', 'Bb', 'F', 'Gm', 'Eb', 'C', 'A'] },
  climax: { ch: ['Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'Gm', 'A'], up: 2 },
  break:  { ch: ['Dm', 'Bb', 'Gm', 'A'] },
  build:  { ch: ['Gm', 'Bb', 'C', 'A'] },
};
const THEME_A = ph([[0, 74, 6], [6, 72, 2], [8, 74, 2], [10, 76, 2], [12, 77, 4]], [[0, 74, 8], [8, 70, 4], [12, 72, 4]], [[0, 72, 6], [6, 69, 2], [8, 72, 2], [10, 74, 2], [12, 77, 4]], [[0, 72, 8], [8, 67, 8]],
                   [[0, 74, 6], [6, 72, 2], [8, 74, 2], [10, 76, 2], [12, 77, 4]], [[0, 79, 6], [6, 77, 2], [8, 74, 4], [12, 77, 4]], [[0, 79, 4], [4, 77, 4], [8, 74, 4], [12, 72, 4]], [[0, 73, 8], [8, 76, 4], [12, 81, 4]]);
const THEME_B = ph([[0, 79, 8], [8, 82, 8]], [[0, 82, 4], [4, 79, 4], [8, 75, 8]], [[0, 77, 8], [8, 82, 8]], [[0, 81, 12], [12, 77, 4]],
                   [[0, 79, 8], [8, 82, 8]], [[0, 84, 6], [6, 82, 2], [8, 79, 8]], [[0, 79, 4], [4, 81, 4], [8, 84, 8]], [[0, 85, 16]]);
const CALL = ph([[0, 62, 6], [6, 69, 2], [8, 74, 8]], [[0, 72, 4], [4, 69, 4], [8, 74, 8]], [[0, 70, 6], [6, 74, 2], [8, 77, 8]], [[0, 76, 8], [8, 73, 8]]);
const ACC = [1, 0.45, 0.55, 0.9, 0.45, 0.55, 0.95, 0.5, 1, 0.45, 0.55, 0.9, 0.45, 0.55, 0.95, 0.6];
const OSTN = [0, 0, 12, 0, 7, 0, 12, 7, 0, 0, 12, 0, 7, 0, 12, 7];
const DMIN = [62, 64, 65, 67, 69, 70, 73, 74, 76, 77, 79, 81, 82, 85];   // (harmonic minor: the runs lead into the A chord, so C sharp)
// the tracks: form, tempo, transposition, which layers play (0 drops one), where the loop restarts and where a track
// joins when it follows another run track (both in bars)
export const TRACKS = {
  menu:   { bpm: 104, tr: 0, form: [['intro', 4]], loop: 0, join: 0, k: { drums: 0.35, stabs: 0, lowBrass: 0, swell: 0, spic: 0.7, steady: 1, brass: 0 } },   // (just the intro, looping: steady, no brass)
  jungle: { bpm: 120, tr: 0, form: [['intro', 4], ['A', 8], ['B', 8], ['climax', 8], ['break', 4], ['build', 4]], loop: 4, join: 4, k: {} },
  // (the owner liked the jungle score best: the other zones play it too, each a step deeper)
  caves:  { bpm: 116, tr: -2, form: [['intro', 4], ['A', 8], ['B', 8], ['climax', 8], ['break', 4], ['build', 4]], loop: 4, join: 4, k: {} },
  magma:  { bpm: 120, tr: -4, form: [['intro', 4], ['A', 8], ['B', 8], ['climax', 8], ['break', 4], ['build', 4]], loop: 4, join: 4, k: {} },
};
export function render(name) {
  const T = TRACKS[name], sp = 60 / T.bpm / 4, bar = sp * 16, map = [];
  for (const [sec, n] of T.form) for (let i = 0; i < n; i++) map.push({ sec, i, n, ch: SEC[sec].ch[i % SEC[sec].ch.length] });
  const loopStart = T.loop * bar, loopEnd = map.length * bar, tail = 5, total = loopEnd + tail, N = Math.ceil(total * SR);
  const bufs = stemBufs(N); bufs.pianoWet = { piano: { L: new Float32Array(N), R: new Float32Array(N) } };
  const K = { drums: 1, stabs: 1, lowBrass: 1, swell: 1, spic: 1, steady: 0, brass: 1, ...T.k };
  setSeed(12345); BEAT.sp = sp;
  map.forEach((B, b) => {
    const next = map[(b + 1) % map.length], sec = B.sec, up = (SEC[sec].up || 0) + T.tr, C = EC[B.ch], root = C.r + up, X = m => m + up;
    const t0 = b * bar, big = sec === 'climax', lift = sec === 'B' || big, calm = sec === 'break', last = B.i === B.n - 1, intoNew = last && next.sec !== sec;
    const D = K.drums, lv = K.steady ? 1 : B.i;   // (lv: how far the intro has grown; a steady loop stays put)
    // the section's tune, in the key the brass plays it (the lift's line is written at pitch, so only the track's own
    // transposition applies to it)
    const tuneAt = s => { const n2 = (sec === 'intro' || calm) ? CALL[B.i][s] : (sec === 'A' || big) ? THEME_A[B.i][s] : sec === 'B' ? THEME_B[B.i][s] : null; return n2 && [sec === 'B' ? n2[0] + T.tr : X(n2[0]), n2[1]]; };
    pianoPart(bufs, { t0, sp, sec, i: B.i, n: B.n, C, X, root, tuneAt, steady: K.steady });
    // the string section: a sustained chord across the bar, cellos / violas / violins, swelling in
    const sv = { intro: 0.35 + 0.08 * lv, A: 0.45, B: 0.6, climax: 0.8, break: 0.35, build: 0.35 + 0.1 * B.i }[sec];
    const [c1, c2, c3, c4, c5] = C.s.map(X);
    note(bufs, 'strings', 'vcSus', c1, t0, { dur: bar - 0.06, vel: sv, pan: -0.45, att: 0.08, rel: 0.22 });
    note(bufs, 'strings', 'vlaSus', c2, t0, { dur: bar - 0.06, vel: sv, pan: -0.15, att: 0.08, rel: 0.22 });
    note(bufs, 'strings', 'vlaSus', c3, t0, { dur: bar - 0.06, vel: sv * 0.9, pan: 0.05, att: 0.08, rel: 0.22 });
    note(bufs, 'strings', 'vlnSus', c4, t0, { dur: bar - 0.06, vel: sv * 0.9, pan: 0.3, att: 0.08, rel: 0.22 });
    if (lift || calm) note(bufs, 'strings', 'vlnSus', c5, t0, { dur: bar - 0.06, vel: sv * 0.85, pan: 0.5, att: 0.1, rel: 0.22 });
    if (big) note(bufs, 'strings', 'vlnSus', c5 + 12, t0, { dur: bar - 0.06, vel: 0.65, pan: 0.6, att: 0.1, rel: 0.22 });
    // low strings and low brass under the lift and the climax (and the end of the build)
    if (lift || (sec === 'build' && B.i >= 2)) {
      note(bufs, 'strings', 'cbSus', root, t0, { dur: bar - 0.06, vel: big ? 0.8 : 0.65, pan: -0.2, att: 0.06, rel: 0.22 });
      if (K.lowBrass) { note(bufs, 'brass', 'tbnSus', root + 12, t0, { dur: bar * 0.94, vel: big ? 0.75 : 0.6, pan: 0.2, att: 0.1, rel: 0.2, gain: K.lowBrass });
        note(bufs, 'brass', 'tbnSus', root + 19, t0, { dur: bar * 0.94, vel: big ? 0.7 : 0.55, pan: 0.3, att: 0.1, rel: 0.2, gain: K.lowBrass });
        note(bufs, 'brass', 'tubaSus', root, t0, { dur: bar * 0.94, vel: big ? 0.75 : 0.6, pan: 0.1, att: 0.1, rel: 0.2, gain: K.lowBrass }); }
    }
    for (let s = 0; s < 16; s++) {
      const t = t0 + s * sp, a = ACC[s];
      // the drive: spiccato strings on the 3-3-2 (violas and cellos; violins an octave up when it lifts)
      if (!calm && K.spic) {
        const sl = (sec === 'intro' ? 0.35 + 0.12 * lv : sec === 'build' ? 0.4 + 0.12 * B.i : big ? 0.85 : lift ? 0.75 : 0.62) * a * K.spic;
        note(bufs, 'strings', 'vcSpic', X(C.r + 12 + OSTN[s]), t, { dur: sp * 0.9, vel: sl, pan: -0.35, rel: 0.08 });
        if (sec !== 'intro' || (B.i >= 2 && !K.steady)) note(bufs, 'strings', 'vlaSpic', X(C.r + 24 + OSTN[s]), t, { dur: sp * 0.9, vel: sl * 0.85, pan: 0.15, rel: 0.08 });
        if (lift && s % 2 === 0) note(bufs, 'strings', 'vlnSpic', X(C.r + 36 + OSTN[s]), t, { dur: sp * 0.9, vel: sl * 0.7, pan: 0.45, rel: 0.08 });
      }
      // the bass: contrabass on the accents (pumping octaves at the climax)
      if (!calm && (big ? s % 2 === 0 : a > 0.85)) note(bufs, 'strings', 'cbSpic', big && s % 4 === 2 ? root + 12 : root, t, { dur: sp * 1.5, vel: (big ? 0.85 : 0.7) * a, pan: -0.1, rel: 0.12 });
      // brass stabs on the 3-3-2 (trumpets, horns, trombones) when it lifts
      if (K.stabs && lift && (s === 0 || s === 3 || s === 6)) {
        // (horns and trombones in the middle range, no trumpets: bright stabs on the same notes pumped like an accordion)
        const v = (big ? 0.75 : 0.55) * a * K.stabs;
        C.br.forEach((m, i) => note(bufs, 'brass', 'hnStac', X(m) - 12, t, { vel: v, pan: -0.25 + i * 0.1, dur: 0.22, rel: 0.12 }));
        note(bufs, 'brass', 'tbnStac', root + 12, t, { vel: v, pan: 0.1, dur: 0.25, rel: 0.15 });
        if (big) note(bufs, 'brass', 'tbnStac', root, t, { vel: v * 0.9, pan: 0.2, dur: 0.25, rel: 0.15 });
      }
      // the tunes
      const tune = (sec === 'intro' || calm) ? CALL[B.i][s] : (sec === 'A' || big) ? THEME_A[B.i][s] : sec === 'B' ? THEME_B[B.i][s] : null;
      if (tune) {
        const [m, len] = tune, dur = len * sp * 0.93;   // (and a short release: each note lets go before the next)
        if (sec === 'intro' || calm) {
          if (calm) note(bufs, 'winds', 'flute', X(m) + 12, t, { dur, vel: 0.55, pan: 0.2, att: 0.05, rel: 0.16 });
          note(bufs, 'brass', 'hnSus', X(m), t, { dur, vel: calm ? 0.45 : 0.65, pan: -0.2, att: 0.04, rel: 0.14 });
        } else if (sec === 'B') {
          note(bufs, 'strings', 'vlnSus', m + T.tr, t, { dur, vel: 0.8, pan: 0.2, att: 0.05, rel: 0.16 });
          note(bufs, 'strings', 'vlnSus', m + T.tr, t, { dur, vel: 0.7, pan: 0.35, att: 0.05, rel: 0.16, tune: 7 });
          note(bufs, 'brass', 'hnSus', m + T.tr - 12, t, { dur, vel: 0.75, pan: -0.25, att: 0.04, rel: 0.14 });
        } else {
          // the horns with violins an octave up; at the climax trombones double it an octave down (heroic octaves) on the notes that belong to the chord (a passing note an octave down rubs against the strings).
          // (no detuned second horn and no trumpet in unison: together they sounded like an accordion)
          note(bufs, 'brass', 'hnSus', X(m), t, { dur, vel: big ? 0.95 : 0.72, pan: -0.2, att: 0.04, rel: 0.16 });
          note(bufs, 'strings', 'vlnSus', X(m) + 12, t, { dur, vel: big ? 0.8 : 0.6, pan: 0.3, att: 0.05, rel: 0.16 });
          if (big && C.s.some(c => (((X(c) - X(m)) % 12) + 12) % 12 === 0)) note(bufs, 'brass', 'tbnSus', X(m) - 12, t, { dur, vel: 0.85, pan: 0.15, att: 0.05, rel: 0.16 });
        }
      }
      // percussion
      if (D) {
        // taiko-like: the big bass drum and tenor drums on the 3-3-2
        const tk = (sec === 'intro' ? 0.45 + 0.1 * lv : big ? 1 : sec === 'B' ? 0.85 : sec === 'build' ? 0.45 + 0.13 * B.i : 0.7) * D;
        if (!calm) {
          if (s === 0 || s === 6) note(bufs, 'perc', 'bdrum', null, t, { vel: Math.min(1, tk), pan: 0, filter: /^bdrum(3)?_(p|mp|f|ff|fff)_/, dur: 2.5, rel: 0.5, gain: 0.9 });
          if (s === 3 || s === 11 || (s === 8 && sec !== 'intro')) note(bufs, 'perc', 'tenorLo', null, t, { vel: Math.min(1, tk * 0.8), pan: s === 3 ? -0.3 : 0.3, dur: 1, rel: 0.3 });
          if (s === 0) note(bufs, 'perc', 'timp', null, t, { vel: big ? 0.75 : 0.6, pan: -0.15, filter: /Timpani[12]_Hit/, dur: 2.5, rel: 0.6, gain: 0.8 * D });
        } else if (s === 0 || s === 3) note(bufs, 'perc', 'bdrum', null, t, { vel: s ? 0.25 : 0.4, filter: /^bdrum_(ppp|pp|p)_/, dur: 2, rel: 0.4 });
        if (lift && (s === 4 || s === 12)) note(bufs, 'perc', 'snare', null, t, { vel: big ? 0.8 : 0.6, pan: 0.1, filter: /^snare1_(mp|f|ff|fff)_/, dur: 1, rel: 0.2, gain: D });
        if (big && B.i % 4 === 3 && s >= 12) note(bufs, 'perc', s % 2 ? 'tenorLo' : 'tenorHi', null, t, { vel: 0.8, pan: (s - 13.5) * 0.25, dur: 0.8, rel: 0.2, gain: D });
        // crashes on the big downbeats, a reversed cymbal roll swelling into them
        // (one mallet crash on the bass drum already there: a metal-sheet crash and a second, fff bass drum on top made the
        // climax's downbeat jump out)
        if (s === 0 && B.i === 0 && (lift || sec === 'A')) note(bufs, 'perc', 'cym', null, t, { vel: 0.8, pan: 0.3, filter: /hit_hardmall_(f|fff)$/, dur: 4, rel: 1, gain: big ? 0.75 : 0.6 });
        if (s === 0 && intoNew && (sec === 'A' || sec === 'B' || sec === 'intro' || sec === 'build') && K.swell) reversed(bufs, 'perc', 'cym', /softmall_roll(2_cresc|3_ff)/, t0 + bar, { len: bar * (sec === 'build' ? 1 : 0.75), gain: 0.8 });
        // rolls into the next section: timpani out of the intro and the build, snare and a string run out of the theme
        if (s === 8 && intoNew && (sec === 'intro' || sec === 'build')) note(bufs, 'perc', 'timpRoll', null, t, { vel: 1, filter: /Timpani[12]_Roll_v5/, dur: sp * 8, rel: 0.05, gain: 0.8 });
        if (s === 8 && intoNew && (sec === 'A' || sec === 'B')) {
          for (let i = 0; i < 16; i++) note(bufs, 'perc', 'snare', null, t + i * sp / 2, { vel: 0.3 + 0.5 * i / 16, pan: 0.1, filter: /^snare1_(p|mp|f)_/, dur: 0.3, rel: 0.1 });
          DMIN.slice(sec === 'B' ? 4 : 0, (sec === 'B' ? 4 : 0) + 8).forEach((m, i) => note(bufs, 'strings', 'vlnSpic', X(m), t + i * sp, { vel: 0.55 + 0.04 * i, pan: 0.3, dur: sp, rel: 0.06 }));
        }
        if (sec === 'build' && B.i === 0 && s === 0) for (let i = 0; i < 64 * 2; i++) note(bufs, 'perc', 'snare', null, t + i * sp / 2, { vel: 0.15 + 0.7 * (i / 128) ** 1.4, pan: 0.1, filter: /^snare1_(pp|p|mp|f|ff)_/, dur: 0.25, rel: 0.08 });
        // the jungle under it: log drum and shaker
        if (!calm && (s === 6 || s === 14)) note(bufs, 'perc', 'log', null, t, { vel: 0.6, pan: -0.4, filter: s === 6 ? /slitdrum1_(mp|ff)/ : /slitdrum2_(mp|ff)/, dur: 0.6, rel: 0.1 });
        if (!calm && (sec !== 'intro' || B.i >= 1)) note(bufs, 'perc', 'shaker', null, t, { vel: s % 2 ? 0.7 : 0.4, pan: 0.5, dur: 0.3, rel: 0.05, gain: s % 2 ? 0.8 : 0.5 });
      }
    }
  });
  const sections = []; map.forEach((B, b) => { if (B.i === 0) sections.push({ name: B.sec, at: +(b * bar).toFixed(4) }); });
  return finish({ name, bufs, N, loopStart, loopEnd, bpm: T.bpm, bars: map.length, sections, join: T.join * bar, brass: !!K.brass });
}
