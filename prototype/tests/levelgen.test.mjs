// Fairness checks for the level generator in ../index.html.
// Run: node prototype/tests/levelgen.test.mjs
// It extracts the code between /* LEVELGEN:BEGIN */ and /* LEVELGEN:END */ markers,
// generates many shafts and checks every layout rule independently of the generator.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const html = fs.readFileSync(fileURLToPath(new URL('../index.html', import.meta.url)), 'utf8');
const regions = [...html.matchAll(/\/\* LEVELGEN:BEGIN \*\/([\s\S]*?)\/\* LEVELGEN:END \*\//g)].map(m => m[1]);
if (regions.length < 3) throw new Error('LEVELGEN markers not found in index.html');
const { createLevel, RULES, WORLD_W, DEFAULTS, gateK, gateExt, gateWarn, gatePeriod, gatePhase, gateStep, gateCommit, gateReopenIn, zoneOf, batPos, BAT_PAT, CHUNKS, SET_PIECES, BEATS, PILOT_HITS, pilotMaxSize, staticShapes } = new Function(regions.join('\n') + '\nreturn { createLevel, RULES, WORLD_W, DEFAULTS, gateK, gateExt, gateWarn, gatePeriod, gatePhase, gateStep, gateCommit, gateReopenIn, zoneOf, batPos, BAT_PAT, CHUNKS, SET_PIECES, BEATS, PILOT_HITS, pilotMaxSize, staticShapes };')();

// The widest and tallest pilot hitbox at any tilt (all 21 pilots, world units): every lane is sized from these.
const { w: PILOT_W, h: PILOT_H } = pilotMaxSize();
const FRUIT_PAD = 12;                        // a fruit's drawn radius plus a little
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
if (RULES.minLane < 2.5 * PILOT_W) fail('open lanes are at least 2.5 widest pilot hitboxes wide', `${RULES.minLane} vs ${PILOT_W.toFixed(1)}`);
if (RULES.minSpacing < 1.25 * PILOT_H) fail('hazards are spaced at least 1.25 tallest pilot hitboxes apart', `${RULES.minSpacing} vs ${PILOT_H.toFixed(1)}`);
if (RULES.minWidth < WORLD_W * 0.6) fail('the shaft minimum is 60% of the screen', `${RULES.minWidth}`);
for (const sp of BEATS.flat()) if (new Set(sp.steps.map(([t]) => t).filter(t => t !== 'arc')).size < 2) fail('beats mix hazard types', sp.name);
// crystals: a pilot that follows the crystals and feathers its thrust just enough to hold a steady climb (thrust on
// gravity / thrust of the time) at the monster's top base speed heats less over the longest crystal gap than one
// crystal cools (10% margin), so following the crystals always stays out of overheat while the engine runs at
// full strength (below 0.6 heat); holding full thrust flat out between crystals heats well past one crystal's
// cooling, so heat matters; and the gap is well short of the climb that overheats a cold engine
const CLEAR = PILOT_W / 2 + 25;              // a crystal's clearance from every hazard hitbox
{
  const D = DEFAULTS, duty = D.gravity / D.thrust, v = D.wormBase + 60;
  const perSec = duty / D.heatTime - (1 - duty) / D.coolTime, heatPerGap = RULES.crystal.gap / v * perSec;
  if (heatPerGap * 1.1 > RULES.crystal.cool) fail('following the crystals while feathering stays out of overheat', `${heatPerGap.toFixed(3)} per gap vs ${RULES.crystal.cool}`);
  const flatOut = RULES.crystal.gap / D.maxUp / D.heatTime;
  if (flatOut < RULES.crystal.cool * 1.6) fail('holding full thrust between crystals runs the engine hot', `${flatOut.toFixed(2)} vs ${RULES.crystal.cool}`);
  if (RULES.crystal.gap > 0.8 * D.maxUp * D.heatTime) fail('the crystal gap is well inside the overheat climb', '');
  if (RULES.crystal.clear < CLEAR || RULES.fruitHug < CLEAR) fail('crystals keep the widest pilot half-width plus 25 from hazards', `${RULES.crystal.clear} vs ${CLEAR.toFixed(1)}`);
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

// Fly into a gate at many points of its cycle, at full speed, at half speed and from a hover, with a pilot
// the height of the tallest hitbox, using the game's own gate clock (gateStep) and default physics.
// - The slabs never start to move while the pilot is committed (within its stopping reach, or inside).
// - A pilot that holds thrust and only lets go when it sees the countdown or a shut gate (after a reaction
//   time), hovers, and climbs again once it is open, never touches a slab and always gets through.
let gateSims = 0;
function simulateGate(h0, L, R, where) {
  const D = DEFAULTS, dt = 1 / 120, P = gatePeriod(h0);
  for (let ph = 0; ph < 32; ph++) for (const [v0, d0] of [[D.maxUp, 700], [D.maxUp * 0.5, 520], [0, 420], [D.maxUp, 460], [0, 160]]) {
    const h = { ...h0, clk: ph / 32 * P };
    let alt = h.alt - h.hb - d0 - PILOT_H / 2, vy = v0, t = 0, seen = -1, through = false, prevU = gatePhase(h, h.clk);
    while (t < 12) {
      const top = alt + PILOT_H / 2, bot = alt - PILOT_H / 2, below = (h.alt - h.hb) - top, passed = bot > h.alt + h.hb;
      gateStep(h, dt, below, vy, D.gravity, passed);
      const u = gatePhase(h, h.clk), k = gateK(h, h.clk), w = gateWarn(h, h.clk);
      if (prevU < RULES.gate.open && u >= RULES.gate.open && u < RULES.gate.open + RULES.gate.move && !passed && below < gateCommit(vy, D.gravity) - 1e-6) { fail('gates never start closing on a committed pilot', `${where} phase ${ph}/32 v ${v0}`); return; }
      prevU = u;
      // the reactive pilot: it notices the countdown or slabs after RULES.gate.react, then hovers until open
      const warned = (w > 0 || k > 0) && !h.held;
      if (warned && seen < 0) seen = t; else if (!warned) seen = -1;
      const wait = seen >= 0 && t - seen >= RULES.gate.react && !passed && below > -1;
      const thrust = wait ? vy < -30 && below < 80 ? true : vy < -120 : true;
      vy += ((thrust ? D.thrust : 0) - D.gravity) * dt; vy = Math.max(-560, Math.min(D.maxUp, vy)); alt += vy * dt; t += dt;
      const [eL, eR] = gateExt(h, k), gap = Math.min(h.mid - (h.lb + eL + 3), (h.rb - eR - 3) - h.mid);
      if (alt + PILOT_H / 2 > h.alt - h.hb && alt - PILOT_H / 2 < h.alt + h.hb && gap < PILOT_W / 2) { fail('a reactive pilot never touches a gate', `${where} phase ${ph}/32 v ${v0} d ${d0}`); return; }
      if (passed) { through = true; break; }
    }
    if (!through) fail('a reactive pilot always gets through a gate', `${where} phase ${ph}/32 v ${v0} d ${d0}`);
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
        (h.type === 'boulder' && Math.abs(h.x - mid) < h.r + C);
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
    if (cfg.density === 1 && cfg.intro === 300 && !hz.some((h, i) => i && h.lo < 1600 && h.lo - hz[i - 1].hi < RULES.intro.spacing)) fail('a two-hazard combo comes before 150 m', tag);
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
          const reach = h.ax + h.side * (h.len * Math.sin(0.78 + 0.55) + h.hr);
          if (h.side > 0 ? f.x - PAD < reach : f.x + PAD > reach) fail('fruit never sits in a pod swing', fw);
        } else if (h.type === 'crusher') {
          if (f.x - PAD < h.lb + h.maxL + 2 || f.x + PAD > h.rb - h.maxR - 2) fail('fruit never sits in a crusher', fw);
        } else if (h.type === 'firebar') {
          if (Math.hypot(f.x - h.cx, f.alt - h.alt) < h.len + h.br * 1.1 + PAD) fail('fruit never sits in a fire wheel', fw);
        } else if (h.type === 'spider') {
          if (Math.abs(f.x - h.x) < h.hw + PAD) fail('fruit never sits in a spider column', fw);
        } else if (h.type === 'lavafall') {
          if (Math.abs(f.x - h.x) < h.hw + PAD) fail('fruit never sits in a lavafall', fw);
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
        const [L, R] = tightest(level, h.lo, h.hi);
        const lane = Math.min(R, h.rb - h.maxR - 2) - Math.max(L, h.lb + h.maxL + 2);
        if (lane < RULES.minLane - 0.5) fail('crusher leaves an open lane when fully closed', `${where}: ${lane.toFixed(0)} units`);
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
        if (gateSims < 400) { gateSims++; simulateGate(h, L, R, where); }
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

if (zoneMix.carried < zoneMix.carriedOf * 0.9) fail('earlier zone hazards carry on into later zones', `${zoneMix.carried} of ${zoneMix.carriedOf}`);
if (zoneMix.varied < zoneMix.variedOf * 0.9) fail('every zone mixes several hazard types', `${zoneMix.varied} of ${zoneMix.variedOf}`);
for (const t of ['bat', 'pend', 'spike', 'spider', 'geyser', 'crusher', 'boulder', 'firebar', 'gate']) {
  if ((seen.get(t) || 0) < checked * 0.6) fail('every hazard type shows up in most shafts', `${t} in ${seen.get(t) || 0} of ${checked}`);
}

if ((zoneMix.sig || 0) < (zoneMix.sigOf || 1) * 0.8) fail('zone signature hazards lead each zone', `${zoneMix.sig} of ${zoneMix.sigOf}`);
if (gateSims < 50) fail('gates are simulated', `${gateSims}`);
if ((seen.get('lavafall*') || 0) < checked * 0.55) fail('lavafalls show up in most shafts', `${seen.get('lavafall*') || 0} of ${checked}`);
if ((zoneMix.corridors || 0) < checked * 0.55) fail('corridor stretches show up in most shafts', `${zoneMix.corridors || 0} of ${checked}`);

if (failures.size) {
  console.log(`FAILED: ${failures.size} rule(s) broken across ${checked} shafts`);
  for (const [rule, { count, example }] of failures) console.log(`  ✗ ${rule} — ${count}× (e.g. ${example})`);
  process.exit(1);
}
console.log(`PASS: ${checked} shafts × ${HEIGHT / 10} m checked against every layout rule (widest pilot hitbox ${PILOT_W.toFixed(1)}, lanes ≥ ${RULES.minLane}; ${gateSims} gates flown at 32 phases × 5 approaches)`);
