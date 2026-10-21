// Fairness checks for the level generator in ../index.html.
// Run: node prototype/tests/levelgen.test.mjs
// It extracts the code between /* LEVELGEN:BEGIN */ and /* LEVELGEN:END */ markers,
// generates many shafts and checks every layout rule independently of the generator.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const html = fs.readFileSync(fileURLToPath(new URL('../index.html', import.meta.url)), 'utf8');
const regions = [...html.matchAll(/\/\* LEVELGEN:BEGIN \*\/([\s\S]*?)\/\* LEVELGEN:END \*\//g)].map(m => m[1]);
if (regions.length < 3) throw new Error('LEVELGEN markers not found in index.html');
const { createLevel, RULES, WORLD_W, DEFAULTS, gateK, gateExt, crusherExt, gateWarn, gatePeriod, gatePhase, gateStep, gateCommit, gateCloseIn, gateReopenIn, brakeDist, HANG, FALL_CAP, timingOf, hangCaps, zoneOf, batPos, BAT_PAT, CHUNKS, SET_PIECES, BEATS, PILOT_HITS, pilotMaxSize, staticShapes, GRAB, GRAB_STYLE, GRAB_TOTAL, grabPose, grabRig } = new Function(regions.join('\n') + '\nreturn { createLevel, RULES, WORLD_W, DEFAULTS, gateK, gateExt, crusherExt, gateWarn, gatePeriod, gatePhase, gateStep, gateCommit, gateCloseIn, gateReopenIn, brakeDist, HANG, FALL_CAP, timingOf, hangCaps, zoneOf, batPos, BAT_PAT, CHUNKS, SET_PIECES, BEATS, PILOT_HITS, pilotMaxSize, staticShapes, GRAB, GRAB_STYLE, GRAB_TOTAL, grabPose, grabRig };')();

// The widest and tallest pilot hitbox at any tilt (all 21 pilots, world units): every lane is sized from these.
const { w: PILOT_W, h: PILOT_H } = pilotMaxSize();
const FRUIT_PAD = RULES.crystal.r + 2;       // a crystal's pickup radius (its drawn size) plus a little
const HEIGHT = 25000;                       // check the first 2500 m of every shaft
const SEEDS = 300;
const CONFIGS = [
  { density: 1, intro: 300 },
  { density: 2.2, intro: 300 },             // densest the Tune panel allows
  { density: 0.3, intro: 0 },
  { density: 1.4, intro: 600 },
];

const failures = new Map();
let checked = 0;
const zoneMix = { carried: 0, carriedOf: 0, varied: 0, variedOf: 0 };
const seen = new Map();                     // how many shafts each hazard type shows up in
function fail(rule, detail) {
  if (!failures.has(rule)) failures.set(rule, { count: 0, example: detail });
  failures.get(rule).count++;
}

function tightest(level, lo, hi) {
  let L = -Infinity, R = Infinity;
  for (let a = lo; a <= hi; a += 2) { const [l, r] = level.walls(a); L = Math.max(L, l); R = Math.min(R, r); }
  return [L, R];
}

// static checks on the authored data
// lanes stay clearly wider than the widest pilot hitbox, and hazards stay clearly further apart than the tallest
if (Object.keys(PILOT_HITS).length !== 21) fail('all 21 pilots have a fitted hitbox', `${Object.keys(PILOT_HITS).length}`);
if (RULES.minLane < 2.2 * PILOT_W) fail('open lanes are at least 2.2 widest pilot hitboxes wide', `${RULES.minLane} vs ${PILOT_W.toFixed(1)}`);
// crushers shut down to a slot of about 1.5 widest pilots plus a small margin: tight enough to threaten the centre, never closed
if (RULES.crusher.slot < 1.5 * PILOT_W + 8 || RULES.crusher.slot > 1.5 * PILOT_W + 30) fail('a shut crusher leaves a slot of about 1.5 widest pilots', `${RULES.crusher.slot}`);
if (RULES.minSpacing < 1.25 * PILOT_H) fail('hazards are spaced at least 1.25 tallest pilot hitboxes apart', `${RULES.minSpacing} vs ${PILOT_H.toFixed(1)}`);
if (RULES.minWidth < WORLD_W * 0.6) fail('the shaft minimum is 60% of the screen', `${RULES.minWidth}`);
for (const sp of BEATS.flat()) if (new Set(sp.steps.map(([t]) => t).filter(t => t !== 'arc')).size < 2) fail('beats mix hazard types', sp.name);
// crystals: a pilot that follows the crystals and feathers its thrust just enough to hold a steady climb (thrust on
// gravity / thrust of the time) at the monster's top base speed heats less over the longest crystal gap than one
// crystal cools (10% margin), so following the crystals always stays out of overheat while the engine runs at
// full strength (below 0.6 heat); holding full thrust flat out between crystals heats well past one crystal's
// cooling, so heat matters; and the gap is well short of the climb that overheats a cold engine
const CLEAR = PILOT_W / 2 + 15 + RULES.crystal.r;   // a crystal's clearance from every hazard hitbox (pilot half-width, 15, its own pickup radius)
{
  const D = DEFAULTS, duty = D.gravity / D.thrust, v = D.wormBase + 60;
  const perSec = duty / D.heatTime - (1 - duty) / D.coolTime, heatPerGap = RULES.crystal.gap / v * perSec;
  if (heatPerGap * 1.1 > RULES.crystal.cool) fail('following the crystals while feathering stays out of overheat', `${heatPerGap.toFixed(3)} per gap vs ${RULES.crystal.cool}`);
  const flatOut = RULES.crystal.gap / D.maxUp / D.heatTime;
  if (flatOut < RULES.crystal.cool * 1.6) fail('holding full thrust between crystals runs the engine hot', `${flatOut.toFixed(2)} vs ${RULES.crystal.cool}`);
  if (RULES.crystal.gap > 0.8 * D.maxUp * D.heatTime) fail('the crystal gap is well inside the overheat climb', '');
  if (RULES.crystal.clear < CLEAR || RULES.fruitHug < CLEAR) fail('crystals keep the widest pilot half-width plus 15 plus their radius from hazards', `${RULES.crystal.clear} vs ${CLEAR.toFixed(1)}`);
}
// gates: the open window is longer than climbing through the whole gate (both slabs' thickness plus the tallest
// pilot, from a standstill a little below it, after a reaction time), and the room left below a gate holds the
// tallest pilot plus its stopping reach from full speed
{
  const G = RULES.gate, acc = DEFAULTS.thrust - DEFAULTS.gravity, top = DEFAULTS.maxUp;
  const dist = 2 * G.hb + PILOT_H + 60, tAcc = top / acc, dAcc = top * tAcc / 2;
  const pass = G.react + (dist <= dAcc ? Math.sqrt(2 * dist / acc) : tAcc + (dist - dAcc) / top);
  if (G.open - G.warn < pass) fail('gates stay open longer than it takes to climb through them', `${(G.open - G.warn).toFixed(2)} s vs ${pass.toFixed(2)} s`);
  if (G.room < PILOT_H + gateCommit(top * 1.22, DEFAULTS.gravity)) fail('the room below a gate holds a pilot plus its stopping reach', `${G.room}`);
  const C = RULES.crusher;
  if (C.open - C.warn < pass) fail('crushers stay open longer than it takes to climb through them', `${(C.open - C.warn).toFixed(2)} s vs ${pass.toFixed(2)} s`);
  // the stopping reach includes the short hang after letting go (gravity × HANG.k for HANG.time)
  { let v = top * 1.22, a = 0, t = 0; const dt = 1 / 2000; while (v > 0) { v -= DEFAULTS.gravity * (t < HANG.time ? HANG.k : 1) * dt; a += Math.max(0, v) * dt; t += dt; }
    if (Math.abs(a - brakeDist(top * 1.22, DEFAULTS.gravity)) > 2) fail('the stopping reach models the hang', `${a.toFixed(1)} vs ${brakeDist(top * 1.22, DEFAULTS.gravity).toFixed(1)}`); }
  if (G.move * 2 + G.shut[1] > G.maxShut) fail('a gate reopens within maxShut', '');
}
// pacing: every chunk mixes hazard types (only the thorns-only openers are exempt), and most follow
// the tension / release (fruit arc) / spike rhythm
for (const c of CHUNKS) {
  const types = new Set(c.steps.map(([t]) => t).filter(t => t !== 'arc'));
  if (types.size < 2 && !(c.to != null && c.to <= 2500)) fail('every chunk mixes hazard types', c.name);
}
if (CHUNKS.filter(c => c.steps.some(([t]) => t === 'arc')).length < CHUNKS.length * 0.6) fail('most chunks have a fruit-arc release beat', '');
for (const sp of SET_PIECES) if (new Set(sp.steps.map(([t]) => t).filter(t => t !== 'arc')).size < 2) fail('set pieces mix hazard types', sp.name);
// the zone reveal (1.5 s, default top climb speed 440 plus a 0.45 s boost at +22%) never reaches a hazard
if (RULES.landmarkAfter < 1.5 * 440 + 0.45 * 0.22 * 440) fail('the zone reveal plays out over empty shaft', `${RULES.landmarkAfter}`);

// Fly into a gate or crusher at many points of its cycle, at full speed, at half speed and from a hover, with a
// pilot the height of the tallest hitbox, using the game's own clock (gateStep) and default physics (including the
// hang after letting go and the fall-speed cap).
// - The jaws / pistons never start to move while the pilot is committed (within its stopping reach, or inside).
// - A pilot that holds thrust and only lets go when it sees the countdown or a shut gate (after a reaction
//   time), hovers, and climbs again once it is open, never touches it and always gets through. For a crusher the
//   pilot holds the worst line: not in the slot, but where the longer piston closes.
// - Out of stopping reach the clock never waits: it advances exactly by dt (a fixed rhythm, not opening on arrival).
let gateSims = 0, crusherSims = 0;
function simulateTimed(h0, L, R, where) {
  const D = DEFAULTS, dt = 1 / 120, P = gatePeriod(h0), T = timingOf(h0), isC = h0.type === 'crusher';
  const label = isC ? 'crusher' : 'gate';
  // the pilot's x line: a gate's meeting point, or for a crusher inside the longer piston's reach
  const px = isC ? (h0.maxL >= h0.maxR ? Math.max(h0.lb + h0.maxL - PILOT_W / 2, h0.lb + h0.minExt + 3 + PILOT_W / 2) : Math.min(h0.rb - h0.maxR + PILOT_W / 2, h0.rb - h0.minExt - 3 - PILOT_W / 2)) : h0.mid;
  for (let ph = 0; ph < 32; ph++) for (const [v0, d0] of [[D.maxUp, 700], [D.maxUp * 0.5, 520], [0, 420], [D.maxUp, 460], [0, 160]]) {
    const h = { ...h0, clk: ph / 32 * P };
    let alt = h.alt - h.hb - d0 - PILOT_H / 2, vy = v0, t = 0, seen = -1, through = false, prevU = gatePhase(h, h.clk), off = 0;
    while (t < 14) {
      const top = alt + PILOT_H / 2, bot = alt - PILOT_H / 2, below = (h.alt - h.hb) - top, passed = bot > h.alt + h.hb;
      const clk0 = h.clk, committed = !passed && below < gateCommit(vy, D.gravity);
      gateStep(h, dt, below, vy, D.gravity, passed);
      if (!committed && Math.abs(h.clk - clk0 - dt) > 1e-9) { fail(`${label}s keep their rhythm for a pilot out of reach`, `${where} phase ${ph}/32`); return; }
      const u = gatePhase(h, h.clk), k = gateK(h, h.clk), w = gateWarn(h, h.clk);
      if (prevU < T.open && u >= T.open && u < T.open + 0.3 && !passed && below < gateCommit(vy, D.gravity) - 1e-6) { fail(`${label}s never start closing on a committed pilot`, `${where} phase ${ph}/32 v ${v0}`); return; }
      prevU = u;
      const warned = (w > 0 || k > 0) && !h.held;
      if (warned && seen < 0) seen = t; else if (!warned) seen = -1;
      const wait = seen >= 0 && t - seen >= RULES.gate.react && !passed && below > -1;
      const thrust = wait ? vy < -30 && below < 80 ? true : vy < -120 : true;
      off = thrust ? 0 : off + dt;
      vy += ((thrust ? D.thrust : 0) - D.gravity * (!thrust && off < HANG.time ? HANG.k : 1)) * dt; vy = Math.max(FALL_CAP, Math.min(D.maxUp, vy)); alt += vy * dt; t += dt;
      const inBand = alt + PILOT_H / 2 > h.alt - h.hb && alt - PILOT_H / 2 < h.alt + h.hb;
      if (isC) {
        const [eL, eR] = crusherExt(h, k), lf = h.lb + eL + 2, rf = h.rb - eR - 2;
        if (inBand && (px - PILOT_W / 2 < lf || px + PILOT_W / 2 > rf)) { fail('a reactive pilot never touches a crusher', `${where} phase ${ph}/32 v ${v0} d ${d0}`); return; }
      } else {
        const [eL, eR] = gateExt(h, k), gap = Math.min(h.mid - (h.lb + eL + 3), (h.rb - eR - 3) - h.mid);
        if (inBand && gap < PILOT_W / 2) { fail('a reactive pilot never touches a gate', `${where} phase ${ph}/32 v ${v0} d ${d0}`); return; }
      }
      if (passed) { through = true; break; }
    }
    if (!through) fail(`a reactive pilot always gets through a ${label}`, `${where} phase ${ph}/32 v ${v0} d ${d0}`);
  }
}

for (const cfg of CONFIGS) {
  for (let k = 0; k < SEEDS; k++) {
    const seed = Math.imul(k + 1, 2654435761) >>> 0;
    const level = createLevel(seed, cfg);
    const hz = [], fruit = [];
    level.fill(HEIGHT, hz, fruit);
    checked++;
    const tag = `seed ${seed} density ${cfg.density} intro ${cfg.intro}`;
    const intro = cfg.intro * 10;

    // the launch: the first 100 m are hazard-free, and the first two thorns are short (at most ~35% of the
    // shaft) and hug their wall, leaving the centre launch line clear, so just holding thrust survives
    if (hz.length && hz[0].lo < 1000) fail('the first 100 m are hazard-free', `${tag}: ${hz[0].type} at ${(hz[0].lo / 10).toFixed(0)} m`);
    for (const h of hz.filter(q => q.type === 'spike').slice(0, 2)) {
      const [L, R] = level.walls(h.alt), tip = h.base + h.side * h.len;
      if (h.len > 0.35 * (R - L)) fail('the first two thorns are short', `${tag} at ${(h.alt / 10).toFixed(0)} m: ${(100 * h.len / (R - L)).toFixed(0)}%`);
      if (Math.abs(tip - WORLD_W / 2) < PILOT_W / 2 + 12) fail('the first two thorns leave the launch line clear', `${tag} at ${(h.alt / 10).toFixed(0)} m`);
    }

    // zone signatures: lavafalls only in the magma core, basalt column segments only in the caves
    for (const h of hz) {
      if (h.type === 'lavafall' && zoneOf(h.alt) !== 2) fail('lavafalls only pour in the magma core', `${tag} at ${(h.alt / 10).toFixed(0)} m`);
      if (h.type === 'boulder' && h.col !== (zoneOf(h.alt) === 1)) fail('basalt column segments only fall in the caves', `${tag} at ${(h.alt / 10).toFixed(0)} m`);
    }
    if (hz.some(h => h.type === 'lavafall')) seen.set('lavafall*', (seen.get('lavafall*') || 0) + 1);
    // chase surges fire at chunk boundaries: those sit in clear shaft, never inside a hazard's band
    const cm = level.chunkMarks.filter(m => m.alt < HEIGHT);
    let hasCorridor = false;
    for (let i = 1; i < cm.length; i++) if (cm[i].alt <= cm[i - 1].alt) fail('chunk boundaries climb', tag);
    for (const m of cm) for (const h of hz) { const top = h.type === 'pend' ? h.aAlt : h.hi; if (m.alt > h.lo && m.alt < top) { fail('chunk boundaries sit in clear shaft', `${tag} at ${(m.alt / 10).toFixed(0)} m`); break; } }
    // corridors (interlocking hazards) are followed by a real breather
    for (let i = 0; i + 1 < cm.length; i++) {
      if (!cm[i].corridor) continue;
      hasCorridor = true;
      const before = hz.filter(h => h.lo < cm[i + 1].alt && h.lo >= cm[i].alt);
      if (!before.length) continue;
      const top = Math.max(...before.map(h => h.hi));
      if (cm[i + 1].alt - top < RULES.breather[1] * RULES.corridorBreather - 1) fail('corridors are followed by a long breather', `${tag} at ${(top / 10).toFixed(0)} m: ${(cm[i + 1].alt - top).toFixed(0)}`);
    }

    if (hasCorridor) zoneMix.corridors = (zoneMix.corridors || 0) + 1;

    // determinism: the same seed always gives the same shaft
    if (k < 20) {
      const again = [], againFruit = []; createLevel(seed, cfg).fill(HEIGHT, again, againFruit);
      if (JSON.stringify(again) !== JSON.stringify(hz) || JSON.stringify(againFruit) !== JSON.stringify(fruit)) fail('same seed gives the same layout', tag);
    }
    // calm chambers (and the clear launch) are empty on purpose, so they don't count toward the height that needs obstacles
    const calmH = level.chambers.reduce((n, c) => n + Math.max(0, Math.min(c.a1, HEIGHT) - c.a0), 0) + RULES.zones.filter(z => z < HEIGHT).length * (RULES.landmarkClear + RULES.landmarkAfter);
    if (hz.length < (HEIGHT - calmH - RULES.clearStart) / 1000) fail('shaft has a reasonable number of obstacles', `${tag}: only ${hz.length}`);
    // density after the first 300 m: at least 2 hazards per 100 m of the height left for them (not counting calm
    // chambers and zone arenas) on the default density, so the middle of a run never goes quiet
    if (cfg.density === 1) {
      const a0 = 3000, a1 = HEIGHT - 800, calm = level.chambers.reduce((n, c) => n + Math.max(0, Math.min(c.a1, a1) - Math.max(c.a0, a0)), 0) + RULES.zones.filter(z => z > a0 && z < a1).length * (RULES.landmarkClear + RULES.landmarkAfter);
      const n = hz.filter(h => h.lo >= a0 && h.lo < a1).length, per = n / ((a1 - a0 - calm) / 1000);
      zoneMix.dens = (zoneMix.dens || []); zoneMix.dens.push(per);
      if (per < 2.0) fail('hazards stay dense after 300 m', `${tag}: ${per.toFixed(2)} per 100 m`);
    }
    if (k < 100 && cfg.density === 1 && cfg.intro === 300) { zoneMix.intro = zoneMix.intro || new Set(); zoneMix.intro.add(hz.slice(0, 3).map(h => `${h.type}${h.side}:${Math.round(h.lo / 60)}`).join(' ')); }
    if (fruit.length < HEIGHT / RULES.crystal.gap) fail('shaft has crystals to collect', `${tag}: only ${fruit.length}`);
    for (const t of new Set(hz.map(h => h.type))) seen.set(t, (seen.get(t) || 0) + 1);

    // no monotonous runs: after the thorns-only opening, never more than RULES.maxRun of a type in a row
    const openEnd = intro > 0 ? RULES.clearStart + intro * RULES.intro.staticOnly : 0;
    for (let i = RULES.maxRun; i < hz.length; i++) {
      if (hz[i - RULES.maxRun].lo < openEnd + 400) continue;   // (the swap is decided a step before placement)
      if (hz.slice(i - RULES.maxRun, i + 1).every(q => q.type === hz[i].type)) fail('no long runs of one hazard type', `${tag} at ${(hz[i].lo / 10).toFixed(0)} m: ${hz[i].type}`);
    }
    // earlier zones' hazards carry on into later zones, and every zone mixes several hazard types
    const JUNGLE = ['spike', 'pend', 'spider', 'bat'], CAVES = ['crusher', 'gate', 'geyser'];
    const inZone = (a, b) => new Set(hz.filter(h => h.lo >= a && h.hi <= b).map(h => h.type));
    const caves = inZone(RULES.zones[0] + 1000, RULES.zones[1]), core = inZone(RULES.zones[1] + 1000, HEIGHT);
    zoneMix.carriedOf += 2;
    if (JUNGLE.some(t => caves.has(t))) zoneMix.carried++;
    if (JUNGLE.some(t => core.has(t)) && CAVES.some(t => core.has(t))) zoneMix.carried++;
    // (the jungle's stretch after the easy start is short, so three types there; four in the caves and the core)
    const jungleFrom = Math.max(intro, 1500), sets = [[caves, 4], [core, 4]];
    if (RULES.zones[0] - jungleFrom >= 3000) sets.push([inZone(jungleFrom, RULES.zones[0]), 3]);
    for (const [set, n] of sets) { zoneMix.variedOf++; if (set.size >= n) zoneMix.varied++; }

    // release beats: fruit arcs sweep across empty stretches, never through a hazard's band
    const arcs = fruit.filter(f => f.arc);
    if (arcs.length < RULES.arc.n && cfg.density >= 0.5) fail('shafts have fruit-arc release beats', `${tag}: ${arcs.length} arc fruit`);
    for (const f of arcs) for (const h of hz) {
      const top = h.type === 'pend' ? h.aAlt : h.hi, lo = h.type === 'boulder' ? h.alt - 40 : h.lo;
      if (f.alt > lo - 10 && f.alt < top + 10) { fail('fruit arcs stay clear of hazards', `${tag} at ${(f.alt / 10).toFixed(0)} m: ${h.type}`); break; }
    }
    // racing lines: fruit beside a wall hazard threads close to its reach (RULES.fruitHug), not the lane's middle
    let near = 0, beside = 0;
    for (const f of fruit) for (const h of hz) {
      if ((h.type !== 'spike' && h.type !== 'geyser') || f.alt < h.lo || f.alt > h.hi) continue;
      beside++;
      if (Math.abs(f.x - (h.base + h.side * (h.len + RULES.fruitHug))) < 8) near++;
    }
    if (beside > 10 && near / beside < 0.7) fail('fruit racing lines hug the hazards', `${tag}: ${near} of ${beside}`);

    // from 150 m on, holding the centre line without steering must stop working: a fair share of
    // hazards (centred spiders and fire wheels, offset crushers, bats sweeping the middle) cover it
    let centre = 0, after = 0;
    for (const h of hz) {
      if (h.lo < 1500) continue;
      after++;
      const [L, R] = level.walls(h.lo), mid = (L + R) / 2;
      // (it covers the centre line when a pilot of the widest hitbox holding the centre would be hit)
      const C = PILOT_W / 2 - 4, tipX = h.base + h.side * h.len;
      const covers =
        h.type === 'bat' ||
        (h.type === 'spider' && Math.abs(h.x - mid) < h.hw + C) ||
        (h.type === 'firebar' && Math.abs(h.cx - mid) < h.len) ||
        (h.type === 'crusher' && (h.lb + h.maxL > mid - C || h.rb - h.maxR < mid + C)) ||
        ((h.type === 'spike' || h.type === 'geyser') && (h.side > 0 ? tipX > mid - C : tipX < mid + C)) ||
        (h.type === 'pend' && Math.abs(h.ax + h.side * (h.len * Math.sin(1.33) + h.hr) - h.ax) > Math.abs(mid - h.ax) - C) ||
        h.type === 'gate' ||
        (h.type === 'boulder' && Math.abs(h.x - mid) < h.r + C) ||
        (h.type === 'hang' && Math.abs(h.x - mid) < h.hw + RULES.hang.sway + C);
      if (covers) centre++;
    }
    if (after >= 30 && centre / after < 0.25) fail('a fair share of hazards cover the centre line from 150 m', `${tag}: ${(100 * centre / after).toFixed(0)}%`);

    // zone changes are left clear for their landmark, and above it for the zone title card
    for (const h of hz) for (const z of RULES.zones) if (h.lo < z + RULES.landmarkAfter && h.hi > z - RULES.landmarkClear) fail('zone landmarks are kept clear', `${tag}: ${h.type} at ${(h.lo / 10).toFixed(0)} m`);
    // a breather arena below each zone change: wide open, hazard-free (above), with a fruit weave
    for (const z of RULES.zones) {
      if (z > HEIGHT) continue;
      const [L, R] = level.walls(z - RULES.landmarkClear / 2);
      if (R - L < RULES.arenaWidth - 2 * RULES.wallShape - 14) fail('breather arenas open the shaft wide', `${tag} at ${(z / 10).toFixed(0)} m: ${(R - L).toFixed(0)}`);
      if (!fruit.some(f => f.arena && f.alt > z - RULES.landmarkClear && f.alt < z)) fail('breather arenas carry a fruit weave', `${tag} at ${(z / 10).toFixed(0)} m`);
    }
    // pacing: a scripted beat (or set piece) about every 100 m once the opening is over
    const beats = level.marks.filter(m => m.alt < HEIGHT).map(m => m.alt).sort((a, b) => a - b);
    if (!beats.length || beats[0] > RULES.clearStart + 2200 + 2 * RULES.spacing[0] / cfg.density) fail('the first scripted beat comes early', `${tag}: ${beats[0]}`);
    for (let i = 1; i < beats.length; i++) if (beats[i] - beats[i - 1] > RULES.beatEvery * 3 + RULES.chamber.len[1] + RULES.landmarkClear + RULES.landmarkAfter + 3 * RULES.spacing[0] / cfg.density) { fail('scripted beats come about every 100 m', `${tag} at ${(beats[i - 1] / 10).toFixed(0)} m: ${((beats[i] - beats[i - 1]) / 10).toFixed(0)} m gap`); break; }
    // a first two-hazard combo before about 150 m (on the default easy start)
    if (cfg.density === 1 && cfg.intro === 300 && !hz.some((h, i) => i && h.lo < 2000 && h.lo - hz[i - 1].hi < RULES.minSpacing + RULES.intro.jitter * RULES.combo + 1)) fail('a two-hazard combo comes before 200 m', tag);
    // each zone's signature hazard shows up in its opening stretch
    RULES.zones.forEach((z, i) => {
      if (z + RULES.signature.len > HEIGHT) return;
      zoneMix.sigOf = (zoneMix.sigOf || 0) + 1;
      if (hz.some(h => h.type === RULES.signature.types[i + 1] && h.lo >= z && h.lo < z + RULES.signature.len + RULES.landmarkAfter)) zoneMix.sig = (zoneMix.sig || 0) + 1;
    });

    // every zone gets its scripted set piece about RULES.setPieceAt into it
    [0, ...RULES.zones].forEach((zs, z) => {
      if (zs + 3000 > HEIGHT) return;
      const mk = level.marks.find(m => m.zone === z && m.set);
      if (!mk) fail('every zone has its set piece', `${tag}: zone ${z + 1}`);
      // (a calm chamber that lands on the set piece's spot pushes it up by at most one chamber plus one gap)
      else if (mk.alt < zs + RULES.setPieceAt - 600 || mk.alt > zs + RULES.setPieceAt + 1500 + RULES.chamber.len[1] + RULES.spacing[0] / cfg.density) fail('set pieces start about 150 m into their zone', `${tag}: zone ${z + 1} at ${((mk.alt - zs) / 10).toFixed(0)} m in`);
    });

    // hazards wear their zone's skin: no jungle pods in the magma core
    for (const h of hz) if (h.skin !== undefined && typeof h.skin === 'number' && h.skin !== zoneOf(h.alt)) fail('hazards wear their zone skin', `${tag}: ${h.type} at ${(h.lo / 10).toFixed(0)} m`);

    // fruit sits inside the shaft and inside the safe lane of any static hazard at its height
    const PAD = FRUIT_PAD;
    for (const f of fruit) {
      const fw = `${tag} fruit at ${(f.alt / 10).toFixed(0)} m`;
      const [L, R] = level.walls(f.alt);
      if (f.x - PAD < L || f.x + PAD > R) fail('fruit is inside the shaft', fw);
      for (const h of hz) {
        const top = h.type === 'pend' ? h.aAlt : h.hi;
        if (f.alt < h.lo || f.alt > top) continue;
        if (h.type === 'geyser' || h.type === 'spike') {
          const tip = h.base + h.side * h.len;
          if (h.side > 0 ? f.x - PAD < tip : f.x + PAD > tip) fail('fruit never sits in a geyser or spike', `${fw}: ${h.type}`);
        } else if (h.type === 'pend') {
          // (against the pod's real sweep, sampled over its whole swing)
          let dmin = Infinity;
          for (let i = 0; i <= 64; i++) { const th = h.side * (0.23 + 1.1 * i / 64); dmin = Math.min(dmin, Math.hypot(f.x - (h.ax + h.len * Math.sin(th)), f.alt - (h.aAlt - h.len * Math.cos(th)))); }
          if (dmin < h.hr + PAD) fail('fruit never sits in a pod swing', fw);
        } else if (h.type === 'crusher') {
          if (f.x - PAD < h.lb + h.maxL + 2 || f.x + PAD > h.rb - h.maxR - 2) fail('fruit never sits in a crusher', fw);
        } else if (h.type === 'firebar') {
          if (Math.hypot(f.x - h.cx, f.alt - h.alt) < h.len + h.br * 1.1 + PAD) fail('fruit never sits in a fire wheel', fw);
        } else if (h.type === 'spider') {
          if (Math.abs(f.x - h.x) < h.hw + PAD) fail('fruit never sits in a spider column', fw);
        } else if (h.type === 'lavafall') {
          if (Math.abs(f.x - h.x) < h.hw + PAD) fail('fruit never sits in a lavafall', fw);
        } else if (h.type === 'hang') {
          if (Math.abs(f.x - h.x) < h.hw + RULES.hang.sway + PAD) fail('fruit never sits under a hanging hazard', fw);
        }
      }
    }

    // crystals keep CLEAR from every hazard hitbox they could meet: the static hitboxes (the game's own shapes),
    // a pod's whole swing, a crusher fully closed, a spider's whole bob (its body and legs) and a fire wheel's whole
    // sweep, measured here independently; and never within 40 of a spike or geyser tip at about the same height
    for (const f of fruit) {
      const fw = `${tag} crystal at ${(f.alt / 10).toFixed(0)} m`;
      for (const h of hz) {
        const top = h.type === 'pend' ? h.aAlt : h.hi;
        if (f.alt < h.lo - 200 || f.alt > top + 200) continue;
        let d = Infinity;
        const seg = (x0, a0, x1, a1, r) => { const dx = x1 - x0, da = a1 - a0, L = dx * dx + da * da, t = L ? Math.max(0, Math.min(1, ((f.x - x0) * dx + (f.alt - a0) * da) / L)) : 0; d = Math.min(d, Math.hypot(f.x - x0 - dx * t, f.alt - a0 - da * t) - r); };
        const box = (x0, x1, a0, a1) => { const dx = Math.max(x0 - f.x, 0, f.x - x1), da = Math.max(a0 - f.alt, 0, f.alt - a1); d = Math.min(d, dx || da ? Math.hypot(dx, da) : -1); };
        if (h.type === 'spike' || h.type === 'geyser' || h.type === 'lavafall') {
          for (const q of staticShapes(h)) q.k === 'b' ? box(q.x0, q.x1, q.a0, q.a1) : seg(q.x0, q.a0, q.x1, q.a1, q.r);
          if (h.type !== 'lavafall' && Math.abs(f.alt - h.alt) < 30 && Math.abs(f.x - (h.base + h.side * h.len)) < 40) fail('crystals never sit by a hazard tip', `${fw}: ${h.type}`);
        } else if (h.type === 'pend') {
          for (let i = 0; i <= 48; i++) { const th = h.side * (0.23 + 1.1 * i / 48); seg(h.ax + h.len * Math.sin(th), h.aAlt - h.len * Math.cos(th), h.ax + h.len * Math.sin(th), h.aAlt - h.len * Math.cos(th), h.hr); }
        } else if (h.type === 'crusher') {
          box(h.lb - 40, h.lb + h.maxL + 2, h.alt - h.hb, h.alt + h.hb); box(h.rb - h.maxR - 2, h.rb + 40, h.alt - h.hb, h.alt + h.hb);
        } else if (h.type === 'spider') {
          const k = 1.3, a0 = h.aAlt - h.mid - h.amp, a1 = h.aAlt - h.mid + h.amp;   // the body capsule and the legs, over the whole bob
          seg(h.x, a0 - 8 * k, h.x, a1 + 9 * k, 12 * k); box(h.x - 18 * k - 6.5 * k, h.x + 18 * k + 6.5 * k, a0 - 2 * k - 6.5 * k, a1 - 2 * k + 6.5 * k);
        } else if (h.type === 'firebar') seg(h.cx, h.alt, h.cx, h.alt, h.len + h.br * 1.08);
        else if (h.type === 'hang') box(h.x - h.hw - RULES.hang.sway, h.x + h.hw + RULES.hang.sway, h.lo, h.aAlt);
        if (d < CLEAR - 0.5) { fail('crystals keep clear of hazard hitboxes', `${fw}: ${h.type} ${d.toFixed(0)} < ${CLEAR.toFixed(0)}`); break; }
      }
    }

    // ice crystals keep the engine cool: along the shaft there is never a longer climb than RULES.crystal.gap
    // without one, and that climb at full thrust heats the engine less than one crystal cools it (with a 25%
    // margin) and is well short of the climb that would overheat it from cold
    {
      const alts = fruit.map(f => f.alt).sort((x, y) => x - y);
      let prev = 58, worst = 0;
      for (const a of alts) { if (a > HEIGHT - 800) break; worst = Math.max(worst, a - prev); prev = a; }
      if (worst > RULES.crystal.gap + 1) fail('a crystal comes at least every RULES.crystal.gap', `${tag}: ${worst.toFixed(0)} units`);
    }
    // authored stretches: pinches go right down to the minimum width, chambers open wide, and a calm
    // chamber (no hazards at all, not even a falling rock) comes at least every few stretches
    const segs = [];
    for (let a = 0; a < HEIGHT;) { const sg = level.segAt(a); segs.push(sg); a = sg.a1 + 1; }
    const kinds = new Set(segs.map(sg => sg.kind));
    if (!kinds.has('chamber')) fail('shafts have calm chambers', tag);
    if (intro < HEIGHT / 2 && !kinds.has('pinch')) fail('shafts have pinches', tag);
    let lastCalm = 0;
    segs.forEach((sg, i) => {
      if (sg.kind === 'pinch' && segs[i + 1] && segs[i + 1].kind === 'pinch') fail('a pinch always opens up again', `${tag} at ${(sg.a0 / 10).toFixed(0)} m`);
      if (sg.kind !== 'chamber') return;
      if (sg.a0 - lastCalm > (RULES.chamber.every[1] + 1) * RULES.stretch[1] + RULES.chamber.len[1]) fail('a calm chamber comes every few stretches', `${tag} at ${(sg.a0 / 10).toFixed(0)} m`);
      lastCalm = sg.a1;
      const mid = (sg.a0 + sg.a1) / 2, [L, R] = level.walls(mid);
      if (R - L < 320) fail('chambers open wide', `${tag} at ${(mid / 10).toFixed(0)} m: ${(R - L).toFixed(0)}`);
      for (const h of hz) {
        const top = h.type === 'pend' ? h.aAlt : h.hi, lo = h.type === 'boulder' ? h.alt - RULES.boulderZone[0] : h.lo;
        if (lo < sg.a1 && top > sg.a0) fail('calm chambers have no hazards', `${tag}: ${h.type} at ${(h.lo / 10).toFixed(0)} m`);
      }
    });
    for (const sg of segs) if (sg.kind === 'pinch' && !RULES.zones.some(z => sg.a1 > z - RULES.landmarkClear - 300 && sg.a0 < z + 360)) {
      const [L, R] = level.walls((sg.a0 + sg.a1) / 2);
      if (R - L > RULES.pinchWidth[1] + RULES.wallShape * 2 + 14) fail('pinches squeeze the shaft', `${tag} at ${(sg.a0 / 10).toFixed(0)} m: ${(R - L).toFixed(0)}`);
    }
    // every chamber stages a visual event, and each zone's first chamber hosts its big spectacle (variant 0)
    for (const c of level.chambers) if (!c.spectacle) fail('every chamber has a visual event', tag);
    for (const z of [0, 1, 2]) { const first = level.chambers.find(c => c.zone === z); if (first && first.variant !== 0) fail("each zone's first chamber hosts its spectacle", `${tag}: zone ${z + 1}`); }
    // calm chambers carry a fruit weave
    for (const c of level.chambers) if (c.a1 < HEIGHT - 800 && !fruit.some(f => f.alt > c.a0 && f.alt < c.a1)) fail('calm chambers have fruit', tag);

    // zone wall silhouettes (root bulges, column tiers, crags) never jut out like a hidden ledge
    for (const side of [0, 1]) {
      let prev = level.walls(0)[side];
      for (let a = 1; a <= HEIGHT; a += 1) {
        const x = level.walls(a)[side];
        if (Math.abs(x - prev) > RULES.maxWallSlope) { fail('walls never step in sharply', `${tag} at ${(a / 10).toFixed(0)} m: ${Math.abs(x - prev).toFixed(2)} per unit`); break; }
        prev = x;
      }
    }

    // shaft shape: never under 60% of the screen, and every narrow stretch opens up again
    let narrowSince = null;
    for (let a = 0; a <= HEIGHT; a += 5) {
      const [L, R] = level.walls(a), w = R - L;
      if (w < WORLD_W * 0.6 - 0.01) fail('shaft is at least 60% of the screen wide', `${tag} at ${(a / 10).toFixed(0)} m: ${(100 * w / WORLD_W).toFixed(0)}%`);
      if (L < 0 || R > WORLD_W) fail('walls stay on screen', `${tag} at ${(a / 10).toFixed(0)} m`);
      if (w < RULES.narrowGap) narrowSince ??= a;
      else if (w >= 290) narrowSince = null;
      if (narrowSince !== null && a - narrowSince > 1700) { fail('narrow stretches widen again', `${tag} narrow from ${(narrowSince / 10).toFixed(0)} m`); narrowSince = null; }
    }

    for (let i = 0; i < hz.length; i++) {
      const h = hz[i];
      const where = `${tag} at ${(h.lo / 10).toFixed(0)} m`;

      // easy start: thorns only at first, then pods and spiders; no bats until it is over
      if (h.lo < 400) fail('nothing spawns on the start planks', where);
      if (h.lo < intro && !RULES.intro.types.includes(h.type)) fail('easy start uses only the gentle obstacles', `${where}: ${h.type}`);
      if (h.lo < intro * RULES.intro.staticOnly && !RULES.intro.first.includes(h.type)) fail('easy start opens with one static hazard type', `${where}: ${h.type}`);
      if (h.type === 'bat' && h.lo < intro) fail('no bats during the easy start', where);

      // every static hazard leaves a lane at least RULES.minLane wide (3.5 hitboxes)
      if (h.type === 'geyser') {
        const [L, R] = tightest(level, h.lo, h.hi);
        const tip = h.side > 0 ? h.base + h.len : h.base - h.len;
        const lane = h.side > 0 ? R - tip : tip - L;
        if (lane < RULES.minLane - 0.5) fail('geyser leaves an open lane', `${where}: ${lane.toFixed(0)} units`);
      }
      if (h.type === 'pend') {
        const [L, R] = tightest(level, h.lo, h.aAlt);
        const reach = h.ax + h.side * (h.len * Math.sin(0.78 + 0.55) + h.hr);
        const lane = h.side > 0 ? R - reach : reach - L;
        if (lane < RULES.minLane - 0.5) fail('spiky pod leaves an open lane', `${where}: ${lane.toFixed(0)} units`);
        if (h.hr < RULES.hit.pod) fail('pods use their full hitbox for lanes', where);
      }
      if (h.type === 'firebar') {
        const [L, R] = tightest(level, h.lo, h.hi);
        // the tip passes beside you: from the flame's hitbox edge to the wall there is room for the widest pilot
        const clear = Math.min(h.cx - h.len - L, R - (h.cx + h.len)) - h.br * 1.1;
        if (clear < PILOT_W + 8) fail('fire wheel leaves room at the walls', `${where}: ${clear.toFixed(0)} units`);
        // and the half of the shaft away from the bar (beside the hub) is a lane for the widest pilot too
        if (Math.min(h.cx - L, R - h.cx) - 34 < PILOT_W * 1.5) fail('fire wheel leaves a lane beside its hub', where);
      }
      if (h.type === 'bat') {
        // sample the real flight path: sideways speed under the cap, and the bat inside its band
        const T = 6.283 / h.speed, dt = T / 400;
        let [px] = batPos(h, 0), vmax = 0;
        for (let t = dt; t <= T; t += dt) {
          const [x, y] = batPos(h, t);
          vmax = Math.max(vmax, Math.abs(x - px) / dt); px = x;
          if (y - h.r < h.lo - 0.5 || y + h.r > h.hi + 0.5) { fail('bats stay inside their band', where); break; }
        }
        if (vmax > RULES.batMaxSpeed + 1) fail('bats stay under the speed cap', `${where}: ${vmax.toFixed(0)}`);
        if (h.amp * h.speed * BAT_PAT[h.pat].vx > RULES.batMaxSpeed + 1e-6) fail('bats stay under the speed cap', where);
        // neighbouring bats never share a flight pattern, so three identical bats never appear together
        const nb = hz.slice(i + 1).find(q => q.type === 'bat');
        if (nb && nb.lo - h.hi < RULES.batLookGap - 400 && nb.pat === h.pat) fail('neighbouring bats fly differently', where);
      }
      if (h.type === 'spike') {
        const [L, R] = tightest(level, h.lo, h.hi);
        const tip = h.base + h.side * h.len;
        const lane = h.side > 0 ? R - tip : tip - L;
        if (lane < RULES.minLane - 0.5) fail('spike leaves an open lane', `${where}: ${lane.toFixed(0)} units`);
      }
      if (h.type === 'spider') {
        const [L, R] = tightest(level, h.lo, h.hi);
        if (Math.max(h.x - h.hw - L, R - h.x - h.hw) < RULES.minLane - 0.5) fail('spider leaves a full lane beside it', where);
        if (h.aAlt - h.mid - h.amp - h.r < h.lo - 0.5 || h.aAlt - h.mid + h.amp + h.r > h.hi + 0.5) fail('spider stays inside its band', where);
      }
      if (h.type === 'crusher') {
        const [L, R] = tightest(level, h.lo, h.hi), laneAt = k => { const [eL, eR] = crusherExt(h, k); return Math.min(R, h.rb - eR - 2) - Math.max(L, h.lb + eL + 2); };
        // shut: a slot of 1.5 widest pilots plus a margin, that covers the centre line; open: a full lane
        const slot = laneAt(1), mid = (L + R) / 2;
        if (slot < 1.5 * PILOT_W + 8 - 0.5) fail('a shut crusher leaves a slot the widest pilot fits', `${where}: ${slot.toFixed(0)} units`);
        if (slot > 1.5 * PILOT_W + 30 + 0.5) fail('a shut crusher threatens the centre', `${where}: slot ${slot.toFixed(0)} units`);
        if (h.lb + h.maxL + 2 > mid - PILOT_W / 2 + 4 && h.rb - h.maxR - 2 < mid + PILOT_W / 2 - 4) fail('a shut crusher threatens the centre', `${where}: slot around the centre line`);
        if (laneAt(0) < RULES.minLane - 0.5) fail('an open crusher leaves a full lane', `${where}: ${laneAt(0).toFixed(0)} units`);
        const below = hz[i - 1];
        if (below && h.lo - below.hi < RULES.gate.room - 0.5) fail('crushers leave room to wait below', `${where}: ${(h.lo - below.hi).toFixed(0)} units`);
        // the countdown always runs before the pistons move
        const step = 0.004, P = gatePeriod(h); let prevK = gateK(h, -step);
        for (let t = 0; t < P * 2; t += step) { const k = gateK(h, t), w = gateWarn(h, t); if ((k > prevK + 1e-9 || k >= 1) && w < 1) { fail('a crusher never closes without its countdown', where); break; } prevK = k; }
        if (crusherSims < 400) { crusherSims++; simulateTimed(h, L, R, where); }
      }
      if (h.type === 'hang') {
        // a hanging hazard leaves a full lane on one side and a widest-pilot lane on the other, its hitbox stays
        // inside its band (over its whole sway and drop) and inside the shaft, and it sits near the centre line
        const [L, R] = tightest(level, h.lo, h.hi), w = h.hw + RULES.hang.sway;
        if (Math.max(h.x - w - L, R - h.x - w) < RULES.minLane - 0.5) fail('a hanging hazard leaves a full lane beside it', where);
        if (Math.min(h.x - w - L, R - h.x - w) < PILOT_W + 8) fail('a hanging hazard leaves a pilot lane on its near side too', where);
        for (const [tt, fall] of [[0, 0], [1.2, 0], [2.4, 0], [3.6, h.drop]]) for (const c of hangCaps({ ...h, fall }, tt)) {
          if (Math.min(c.a0, c.a1) - c.r < h.lo - 0.5 || Math.max(c.a0, c.a1) + c.r > h.hi + 0.5) { fail('a hanging hazard stays inside its band', where); break; }
          if (Math.min(c.x0, c.x1) - c.r < h.x - w - 0.5 || Math.max(c.x0, c.x1) + c.r > h.x + w + 0.5) { fail('a hanging hazard stays inside its column', where); break; }
        }
        if (Math.abs(h.x - (L + R) / 2) > w + PILOT_W / 2) fail('a hanging hazard covers the centre line', where);
        if ((h.skin === 1) !== (h.drop > 0)) fail('only the cave stalactites drop', where);
      }
      if (h.type === 'gate') {
        // over a whole cycle of its clock: blocked (lane narrower than the widest pilot plus a margin) for at
        // most maxShut, a wide lane when open, and a countdown that always runs before the slabs move
        const [L, R] = tightest(level, h.lo, h.hi), step = 0.004, P = gatePeriod(h);
        const laneAt = t => { const [eL, eR] = gateExt(h, gateK(h, t)); return Math.min(R, h.rb - eR - 3) - Math.max(L, h.lb + eL + 3); };
        let shut = 0, maxShut = 0;
        for (let t = 0; t < P * 2; t += step) { if (laneAt(t) < PILOT_W + 8) { shut += step; maxShut = Math.max(maxShut, shut); } else shut = 0; }
        if (maxShut > RULES.gate.maxShut + 1e-6) fail('gates are never shut for long', `${where}: ${maxShut.toFixed(2)} s`);
        if (laneAt(-h.ph * P + 0.01) < RULES.minLane * 1.3 - 0.5) fail('open gates leave a wide lane', `${where}: ${laneAt(-h.ph * P + 0.01).toFixed(0)}`);
        if (laneAt(-h.ph * P + 0.01) < PILOT_W * 2.5) fail('an open gate fits 2.5 widest pilots', where);
        const below = hz[i - 1];
        if (below && h.lo - below.hi < RULES.gate.room - 0.5) fail('gates leave room to wait below', `${where}: ${(h.lo - below.hi).toFixed(0)} units`);
        let warnT = 0, prevK = gateK(h, -step);
        for (let t = 0; t < P * 2; t += step) {
          const k = gateK(h, t), w = gateWarn(h, t);
          if ((k > prevK + 1e-9 || k >= 1) && w < 1) { fail('a gate never closes without its countdown', where); break; }
          if (w > 0 && w < 1) warnT += step;
          prevK = k;
        }
        if (Math.abs(warnT / 2 - RULES.gate.warn) > 0.02) fail('gate countdown lasts RULES.gate.warn', `${where}: ${(warnT / 2).toFixed(2)} s`);
        if (gateSims < 400) { gateSims++; simulateTimed(h, L, R, where); }
      }
      if (h.type === 'lavafall') {
        const [L, R] = tightest(level, h.lo, h.hi);
        const lane = h.side > 0 ? R - (h.x + h.hw) : (h.x - h.hw) - L;
        if (lane < RULES.minLane - 0.5) fail('lavafall leaves an open lane', `${where}: ${lane.toFixed(0)} units`);
        if (h.x - h.hw < L || h.x + h.hw > R) fail('lavafalls never pour into a wall', where);
      }
      if (h.type === 'boulder') {
        const [L, R] = tightest(level, h.alt - RULES.boulderFall, h.alt + 100);
        if (h.x - h.r < L || h.x + h.r > R) fail('boulders never fall through a wall', where);
      }

      for (let j = i + 1; j < hz.length; j++) {
        const q = hz[j], dist = q.lo - h.hi;
        if (dist > 1000) break;
        if (dist < 0) fail('obstacles never overlap', `${where}: ${h.type} and ${q.type}`);
        if (j === i + 1 && dist < RULES.minSpacing - 0.5) fail('neighbours keep minimum spacing', `${where}: ${dist.toFixed(0)} units`);

        // the headline rule: geysers are never next to each other
        if (h.type === 'geyser' && q.type === 'geyser') {
          const need = h.narrow || q.narrow ? RULES.narrowGeyserGap : RULES.sameTypeGap.geyser;
          if (dist < need) fail('geysers are never close together', `${where}: ${(dist / 10).toFixed(0)} m apart`);
        }
        if (h.type === q.type && h.type !== 'geyser' && dist < RULES.sameTypeGap[h.type]) fail(`${h.type}s keep their distance`, where);

        // a boulder never drops while you're squeezing past a geyser, fire wheel or pod
        const heavy = t => t === 'geyser' || t === 'firebar' || t === 'pend' || t === 'crusher' || t === 'gate';
        if (h.type === 'boulder' && heavy(q.type) && q.lo < h.alt + RULES.boulderZone[1]) fail('boulders keep clear of other hazards', where);
        if (q.type === 'boulder' && heavy(h.type) && h.hi > q.alt - RULES.boulderZone[0]) fail('boulders keep clear of other hazards', where);
      }
    }
  }
}


// Monster wall grabs: every limb hitbox (which is also its art outline) stays within GRAB.band of its wall above the
// catch line and never more than GRAB.out into the rock; resting and winding up, nothing rises above the catch line;
// the wind-up lasts at least 0.4 s; a full grab tops out at GRAB.reach; and with both walls grabbing at once the
// centre lane stays wider than the widest pilot hitbox plus 60. Checked for all 20 monsters on real shafts.
const lerp = (a, b, t) => a + (b - a) * t;
const grabStats = { limbs: 0, worstIn: 0, worstOut: 0, minLane: Infinity, maxTop: -Infinity, types: new Set(), minTaper: Infinity, minBend: Infinity, minKnee: Infinity, minCoil: Infinity };
const angleAt = (a, b, c) => { const v1 = [b[0] - a[0], b[1] - a[1]], v2 = [c[0] - b[0], c[1] - b[1]]; return Math.acos(Math.max(-1, Math.min(1, (v1[0] * v2[0] + v1[1] * v2[1]) / (Math.hypot(...v1) * Math.hypot(...v2) || 1)))) * 180 / Math.PI; };
// Every wall limb is whole and anchored: its root sits on the body under the catch line, well in from the wall; the up
// chain runs from the root to the bend wholly under the catch line and joins the fore chain there; every chain is
// unbroken (each capsule overlaps the next) and the hand grows from the wrist; the hitbox is exactly its capsules.
// Then each limb type keeps its own anatomy: a jointed limb (arm, paw, pad, wing, pincer, fin, talon) bends at its
// elbow; a leg bends sharply at its knee and stays thin; a tentacle tapers hard and sweeps through an S; a body coil
// stays thick all the way to its tip; a pincer has two claw fingers; a fin has a membrane blade; a wing has its claw.
function limbCheck(id, st, rig, wallAt, kill) {
  const { root, up, fore, hand, d } = rig, side = d < 0 ? 0 : 1, wall = wallAt(kill - fore[0][1])[side];
  grabStats.types.add(st.type);
  if (root[1] - root[2] < 0) fail('the root sits under the catch line', id);
  if (Math.abs(root[0] - wall) < Math.abs(fore[0][0] - wall) + 30) fail('the root sits well in from the wall, beside the head', `${id}: ${Math.abs(root[0] - wall).toFixed(0)}`);
  if (up.some(([, y, r]) => y - r < 0)) fail('the up chain stays under the catch line', id);
  if (Math.hypot(up[up.length - 1][0] - fore[0][0], up[up.length - 1][1] - fore[0][1]) > 0.01) fail('the up chain joins the fore chain at the bend', id);
  for (const ch of [up, fore]) for (let i = 1; i < ch.length; i++) if (Math.hypot(ch[i][0] - ch[i - 1][0], ch[i][1] - ch[i - 1][1]) > ch[i][2] + ch[i - 1][2]) fail('limb chains are unbroken', `${id} at ${i}`);
  const w = fore[fore.length - 1];
  if (Math.hypot(hand[0][0] - w[0], hand[0][1] - w[1]) > hand[0][4] + w[2] + 2) fail('the hand grows from the wrist', `${id}: ${Math.hypot(hand[0][0] - w[0], hand[0][1] - w[1]).toFixed(1)}`);
  if (rig.caps.length !== up.length - 1 + fore.length - 1 + hand.length) fail('the hitbox is exactly the drawn capsules', id);
  const ty = st.type, taper = up[0][2] / w[2];
  const roles = hand.map(p => p[5]);
  if (ty === 'tentacle') {
    grabStats.minTaper = Math.min(grabStats.minTaper, taper);
    if (taper < 2.5) fail('tentacles taper hard from root to tip', `${id}: ${taper.toFixed(2)}`);
    // an S: the up chain's turn changes direction at least once
    let sgn = 0, flips = 0;
    for (let i = 2; i < up.length; i++) { const cr = (up[i - 1][0] - up[i - 2][0]) * (up[i][1] - up[i - 1][1]) - (up[i - 1][1] - up[i - 2][1]) * (up[i][0] - up[i - 1][0]); const s2 = Math.sign(Math.round(cr * 100)); if (s2 && sgn && s2 !== sgn) flips++; if (s2) sgn = s2; }
    if (flips < 1) fail('tentacles sweep through an S-curve', id);
  } else if (ty === 'coil') {
    const minR = Math.min(...up.map(p => p[2]), ...fore.map(p => p[2]));
    grabStats.minCoil = Math.min(grabStats.minCoil, minR / up[0][2]);
    if (minR < up[0][2] * 0.3) fail('body coils stay thick to the tip', `${id}: ${minR.toFixed(1)}`);
    if (Math.max(...up.map(p => p[1])) < up[0][1] + 20) fail('body coils loop down below their root', id);
  } else if (ty === 'leg') {
    const ang = angleAt(up[up.length - 4], up[up.length - 1], fore.find(p => p[1] <= fore[0][1] - 10) || fore[fore.length - 1]);
    grabStats.minKnee = Math.min(grabStats.minKnee, ang);
    if (ang < 25) fail('legs bend sharply at the knee', `${id}: ${ang.toFixed(0)}°`);
    if (w[2] > 8) fail('legs stay thin', id);
  } else if (GRAB_JOINTED_T.has(ty)) {
    grabStats.minTaper = Math.min(grabStats.minTaper, taper);
    if (taper < 1.2) fail('jointed limbs taper from root to wrist', `${id}: ${taper.toFixed(2)}`);
    const ang = angleAt(up[up.length - 4], up[up.length - 1], fore.find(p => p[1] <= fore[0][1] - 10) || fore[fore.length - 1]);
    grabStats.minBend = Math.min(grabStats.minBend, ang);
    if (ang < (ty === 'fin' ? 15 : 20)) fail('jointed limbs bend at the elbow', `${id}: ${ang.toFixed(0)}°`);
  } else if (taper < 1.4) fail('soft limbs taper from root to tip', `${id}: ${taper.toFixed(2)}`);
  if (ty === 'pincer' && roles.filter(r => r === 't').length < 2) fail('pincers have two claw fingers', id);
  if (ty === 'fin' && roles.filter(r => r === 'm').length < 2) fail('fins have a membrane blade', id);
  if (ty === 'wing' && !roles.includes('c')) fail('wings have a claw', id);
  if (ty === 'paw' && roles.filter(r => r === 'c').length < 3) fail('digging paws have long claws', id);
  if (ty === 'paw' && up[0][2] < 34) fail('digging forearms are huge shovels', `${id}: ${up[0][2]}`);
  if (st.hand === 'apegrip' && roles.filter(r => r === 'ft2').length < 4) fail('a gripping ape hand curls four fingers over the rock', id);
  if (st.hand === 'vclaw') {   // the geode vampire's thumb claw: big and bold enough to read on the wall at phone size
    const L = Math.max(...hand.filter(p => p[5] === 'c').map(p => Math.hypot(p[2] - p[0], p[3] - p[1]) + p[4]));
    if (L < 28) fail('the wing thumb claw is big (28+ long)', `${id}: ${L.toFixed(0)}`);
  }
  if (st.hand === 'geode' && roles.filter(r => r === 'o').length < 6) fail('the stone hand is an open palm (palm, four fingers, thumb)', id);
  if (st.hand === 'chaetae') {   // the Scissorjaw's hand: a big fan of glass bristles that reads at phone size
    const hh = Math.max(...hand.map(p => Math.max(p[1], p[3]) + p[4])) - Math.min(...hand.map(p => Math.min(p[1], p[3]) - p[4]));
    if (roles.filter(r => r === 'x').length < 5 || hh < 55) fail('the bristle-fan hand is big (5+ bristles, 55+ tall)', `${id}: ${hh.toFixed(0)}`);
  }
}
const GRAB_JOINTED_T = new Set(['arm', 'paw', 'pad', 'wing', 'pincer', 'fin', 'talon']);
{
  if (Object.keys(GRAB_STYLE).length !== 20) fail('all 20 monsters have a wall limb', `${Object.keys(GRAB_STYLE).length}`);
  if (GRAB.wind < 0.5) fail('every grab has a wind-up tell of at least 0.5 s', `${GRAB.wind}`);
  for (const [id, st] of Object.entries(GRAB_STYLE)) if (!(st.rest < -3)) fail('every limb idles under the catch line', id);
  // a climbing ape keeps its hands braced high up the walls even at rest (never tucked down beside its head)
  if (GRAB_STYLE.gorilla.rest - Math.abs(GRAB_STYLE.gorilla.lean || 0) < -32) fail('the climbing ape rests its hands high on the walls', `${GRAB_STYLE.gorilla.rest}`);
  if (new Set(Object.values(GRAB_STYLE).map(st => st.type)).size < 12) fail('the monsters climb with many different limb types', '');
  if (RULES.minWidth - 2 * GRAB.band < PILOT_W + 60) fail('the grab bands leave a centre lane wider than the widest pilot plus 60', '');
  // every point on a capsule's outline (sampled), in world units: [x, alt]
  const outline = (c, kill, f) => { const [x0, y0, x1, y1, r] = c; for (let i = 0; i <= 3; i++) { const u = i / 3, x = lerp(x0, x1, u), y = lerp(y0, y1, u); for (let k = 0; k < 12; k++) { const a = k / 12 * 6.2832; f(x + Math.cos(a) * r, kill - (y + Math.sin(a) * r)); } } };
  const phases = []; for (let ph = 0; ph < GRAB_TOTAL; ph += 0.05) phases.push(ph); phases.push(null);
  for (let sd = 1; sd <= 8; sd++) {
    const level = createLevel(sd * 7919 + 13, { density: 1, intro: 300 }), wallAt = a => level.walls(a);
    for (let kill = 400 + sd * 37; kill < 16000; kill += 521) {
      for (const [id, st] of Object.entries(GRAB_STYLE)) {
        const t = kill * 0.37 + sd;
        for (const ph of phases) {
          const rigs = [-1, 1].map(d => { const pose = grabPose(ph, t, d, GRAB.reach, st); return { pose, rig: grabRig(st, d, wallAt, kill, pose, t, 200) }; });
          for (const { pose, rig } of rigs) {
            grabStats.limbs++;
            const side = rig.d < 0 ? 0 : 1;
            limbCheck(id, st, rig, wallAt, kill);
            for (const c of rig.caps) {
              // on screen: never past the world edge (walls never come closer than about 8 to it)
              if (Math.min(c[0], c[2]) - c[4] < 0 || Math.max(c[0], c[2]) + c[4] > WORLD_W) fail('limbs stay on screen', `${id} kill ${kill}: ${(Math.min(c[0], c[2]) - c[4]).toFixed(1)} ${(Math.max(c[0], c[2]) + c[4]).toFixed(1)} walls ${wallAt(kill).map(v => v.toFixed(0))}`);
              if (Math.min(c[1], c[3]) - c[4] >= 0) continue;          // wholly under the catch line
              outline(c, kill, (x, a) => {
                if (a <= kill) return;
                const w = wallAt(a)[side], inn = side ? w - x : x - w;
                grabStats.maxTop = Math.max(grabStats.maxTop, a - kill);
                if (!pose.live) fail('nothing rises above the catch line before a grab goes live', `${id} ph ${ph}`);
                grabStats.worstIn = Math.max(grabStats.worstIn, inn);
                grabStats.worstOut = Math.max(grabStats.worstOut, -inn);
                if (inn > GRAB.band) fail('limb hitboxes stay within the band from the wall', `${id} seed ${sd} kill ${kill}: ${inn.toFixed(1)} in`);
                if (a > kill + GRAB.reach + 0.5) fail('grabs top out at GRAB.reach', `${id}: ${(a - kill).toFixed(1)}`);
              });
            }
          }
          // the centre lane between the two limbs, at every height above the catch line they reach
          if (ph != null && rigs[0].pose.live) {
            const lo = new Map(), hi = new Map();
            rigs.forEach(({ rig }, i) => { for (const c of rig.caps) outline(c, kill, (x, a) => { if (a <= kill) return; const k = Math.round(a / 4); if (i === 0) lo.set(k, Math.max(lo.get(k) ?? -Infinity, x)); else hi.set(k, Math.min(hi.get(k) ?? Infinity, x)); }); });
            for (let k = Math.ceil(kill / 4); k <= (kill + GRAB.reach) / 4; k++) {
              const [L, R] = wallAt(k * 4), lane = (hi.get(k) ?? R) - (lo.get(k) ?? L);
              grabStats.minLane = Math.min(grabStats.minLane, lane);
              if (lane < PILOT_W + 60) fail('wall grabs leave a centre lane wider than the widest pilot plus 60', `${id} seed ${sd}: ${lane.toFixed(0)}`);
            }
          }
        }
      }
    }
  }
}

if (zoneMix.carried < zoneMix.carriedOf * 0.9) fail('earlier zone hazards carry on into later zones', `${zoneMix.carried} of ${zoneMix.carriedOf}`);
if (zoneMix.varied < zoneMix.variedOf * 0.9) fail('every zone mixes several hazard types', `${zoneMix.varied} of ${zoneMix.variedOf}`);
for (const t of ['bat', 'pend', 'spike', 'spider', 'geyser', 'crusher', 'boulder', 'firebar', 'gate', 'hang']) {
  if ((seen.get(t) || 0) < checked * 0.6) fail('every hazard type shows up in most shafts', `${t} in ${seen.get(t) || 0} of ${checked}`);
}

if ((zoneMix.sig || 0) < (zoneMix.sigOf || 1) * 0.8) fail('zone signature hazards lead each zone', `${zoneMix.sig} of ${zoneMix.sigOf}`);
if (gateSims < 50) fail('gates are simulated', `${gateSims}`);
if (crusherSims < 50) fail('crushers are simulated', `${crusherSims}`);
// the opening varies from shaft to shaft (mirror and spacing), so it never plays the same on every seed
if (!zoneMix.intro || zoneMix.intro.size < 60) fail('the opening varies between shafts', `${zoneMix.intro ? zoneMix.intro.size : 0} of 100 distinct`);
if ((seen.get('lavafall*') || 0) < checked * 0.55) fail('lavafalls show up in most shafts', `${seen.get('lavafall*') || 0} of ${checked}`);
if ((zoneMix.corridors || 0) < checked * 0.55) fail('corridor stretches show up in most shafts', `${zoneMix.corridors || 0} of ${checked}`);

// Crystals never pop in on screen: filled the way the game does (a little at a time as the camera climbs, up to
// the screen top + 900), every crystal must already exist while it is still well above the top of a tall phone screen.
let popChecked = 0;
for (let sd = 0; sd < 150; sd++) {
  const VIEW = 1100, lv = createLevel(sd * 104729 + 7, DEFAULTS), hz = [], fr = [];
  lv.fill(VIEW + 900, hz, fr);
  let seenF = fr.length;
  for (let cam = 10; cam < 25000; cam += 10) {
    lv.fill(cam + VIEW + 900, hz, fr);
    for (; seenF < fr.length; seenF++, popChecked++) if (fr[seenF].alt < cam + VIEW + 100) fail('crystals appear above the screen, never pop in on it', `seed ${sd}: crystal at ${fr[seenF].alt | 0} appeared with the screen top at ${cam + VIEW}`);
  }
}
if (popChecked < 1000) fail('crystal pop-in is checked', `${popChecked}`);

if (failures.size) {
  console.log(`FAILED: ${failures.size} rule(s) broken across ${checked} shafts`);
  for (const [rule, { count, example }] of failures) console.log(`  ✗ ${rule} — ${count}× (e.g. ${example})`);
  process.exit(1);
}
const dens = zoneMix.dens || [0];
console.log(`PASS: ${checked} shafts × ${HEIGHT / 10} m checked against every layout rule (widest pilot hitbox ${PILOT_W.toFixed(1)}, lanes ≥ ${RULES.minLane}, crusher slot ${RULES.crusher.slot}; ${gateSims} gates and ${crusherSims} crushers flown at 32 phases × 5 approaches; density after 300 m ${Math.min(...dens).toFixed(2)}–${Math.max(...dens).toFixed(2)} per 100 m, avg ${(dens.reduce((a, b) => a + b) / dens.length).toFixed(2)})`);
console.log(`PASS: wall grabs for ${Object.keys(GRAB_STYLE).length} monsters (${grabStats.limbs} limb poses): hitboxes at most ${grabStats.worstIn.toFixed(1)} in from the wall (band ${GRAB.band}), top ${grabStats.maxTop.toFixed(1)} above the catch line (reach ${GRAB.reach}), narrowest centre lane ${grabStats.minLane.toFixed(0)} (widest pilot ${PILOT_W.toFixed(1)}), wind-up ${GRAB.wind} s; ${grabStats.types.size} limb types, every limb whole and anchored (jointed elbows bent ${grabStats.minBend.toFixed(0)}°+, knees ${grabStats.minKnee.toFixed(0)}°+, tapers ${grabStats.minTaper.toFixed(2)}x+, coils ${grabStats.minCoil.toFixed(2)} thick)`);
