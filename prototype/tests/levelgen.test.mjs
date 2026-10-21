// Fairness checks for the level generator in ../index.html.
// Run: node prototype/tests/levelgen.test.mjs
// It extracts the code between /* LEVELGEN:BEGIN */ and /* LEVELGEN:END */ markers,
// generates many shafts and checks every layout rule independently of the generator.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const html = fs.readFileSync(fileURLToPath(new URL('../index.html', import.meta.url)), 'utf8');
const regions = [...html.matchAll(/\/\* LEVELGEN:BEGIN \*\/([\s\S]*?)\/\* LEVELGEN:END \*\//g)].map(m => m[1]);
if (regions.length < 3) throw new Error('LEVELGEN markers not found in index.html');
const { createLevel, RULES, WORLD_W, gateK, gateExt, gateWarn, zoneOf, batPos, BAT_PAT, CHUNKS, SET_PIECES } = new Function(regions.join('\n') + '\nreturn { createLevel, RULES, WORLD_W, gateK, gateExt, gateWarn, zoneOf, batPos, BAT_PAT, CHUNKS, SET_PIECES };')();

const HITBOX = 32;                          // the pilot's hitbox diameter (PLAYER_HIT 16 in index.html)
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
// lanes stay clearly wider than the (bigger) hitbox
if (RULES.minLane < 3 * HITBOX) fail('open lanes are at least three hitboxes wide', `${RULES.minLane} vs hitbox ${HITBOX}`);
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
      if (Math.abs(tip - WORLD_W / 2) < HITBOX / 2 + 20) fail('the first two thorns leave the launch line clear', `${tag} at ${(h.alt / 10).toFixed(0)} m`);
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
    const calmH = level.chambers.reduce((n, c) => n + Math.max(0, Math.min(c.a1, HEIGHT) - c.a0), 0);
    if (hz.length < (HEIGHT - calmH - RULES.clearStart) / 1000) fail('shaft has a reasonable number of obstacles', `${tag}: only ${hz.length}`);
    if (fruit.length < HEIGHT / 500) fail('shaft has fruit trails to collect', `${tag}: only ${fruit.length}`);
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
    if (arcs.length < RULES.arc.n) fail('shafts have fruit-arc release beats', `${tag}: ${arcs.length} arc fruit`);
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
      const covers =
        h.type === 'bat' ||
        (h.type === 'spider' && Math.abs(h.x - mid) < h.r + 13) ||
        (h.type === 'firebar' && Math.abs(h.cx - mid) < h.len) ||
        (h.type === 'crusher' && (h.lb + h.maxL > mid - 13 || h.rb - h.maxR < mid + 13)) ||
        h.type === 'gate' ||
        (h.type === 'boulder' && Math.abs(h.x - mid) < h.r + 13);
      if (covers) centre++;
    }
    if (after >= 30 && centre / after < 0.25) fail('a fair share of hazards cover the centre line from 150 m', `${tag}: ${(100 * centre / after).toFixed(0)}%`);

    // zone changes are left clear for their landmark, and above it for the zone title card
    for (const h of hz) for (const z of RULES.zones) if (h.lo < z + RULES.landmarkAfter && h.hi > z - RULES.landmarkClear) fail('zone landmarks are kept clear', `${tag}: ${h.type} at ${(h.lo / 10).toFixed(0)} m`);

    // every zone gets its scripted set piece about RULES.setPieceAt into it
    [0, ...RULES.zones].forEach((zs, z) => {
      if (zs + 3000 > HEIGHT) return;
      const mk = level.marks.find(m => m.zone === z);
      if (!mk) fail('every zone has its set piece', `${tag}: zone ${z + 1}`);
      // (a calm chamber that lands on the set piece's spot pushes it up by at most one chamber plus one gap)
      else if (mk.alt < zs + RULES.setPieceAt - 600 || mk.alt > zs + RULES.setPieceAt + 1500 + RULES.chamber.len[1] + RULES.spacing[0] / cfg.density) fail('set pieces start about 150 m into their zone', `${tag}: zone ${z + 1} at ${((mk.alt - zs) / 10).toFixed(0)} m in`);
    });

    // hazards wear their zone's skin: no jungle pods in the magma core
    for (const h of hz) if (h.skin !== undefined && typeof h.skin === 'number' && h.skin !== zoneOf(h.alt)) fail('hazards wear their zone skin', `${tag}: ${h.type} at ${(h.lo / 10).toFixed(0)} m`);

    // fruit sits inside the shaft and inside the safe lane of any static hazard at its height
    const PAD = HITBOX / 2;
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
          const reach = h.ax + h.side * (h.len * Math.sin(0.78 + 0.55) + h.r);
          if (h.side > 0 ? f.x - PAD < reach : f.x + PAD > reach) fail('fruit never sits in a pod swing', fw);
        } else if (h.type === 'crusher') {
          if (f.x - PAD < h.lb + h.maxL || f.x + PAD > h.rb - h.maxR) fail('fruit never sits in a crusher', fw);
        } else if (h.type === 'firebar') {
          if (Math.hypot(f.x - h.cx, f.alt - h.alt) < h.len + h.br + PAD) fail('fruit never sits in a fire wheel', fw);
        } else if (h.type === 'spider') {
          if (Math.abs(f.x - h.x) < h.r + PAD) fail('fruit never sits in a spider column', fw);
        } else if (h.type === 'lavafall') {
          if (Math.abs(f.x - h.x) < h.hw + PAD) fail('fruit never sits in a lavafall', fw);
        }
      }
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
    for (const sg of segs) if (sg.kind === 'pinch') {
      const [L, R] = level.walls((sg.a0 + sg.a1) / 2);
      if (R - L > RULES.pinchWidth[1] + RULES.wallShape * 2 + 14) fail('pinches squeeze the shaft', `${tag} at ${(sg.a0 / 10).toFixed(0)} m: ${(R - L).toFixed(0)}`);
    }
    // each zone's first chamber hosts its spectacle
    const specs = level.chambers.filter(c => c.spectacle).map(c => c.zone);
    if (new Set(specs).size !== specs.length) fail('one spectacle per zone', tag);
    for (const c of level.chambers) if (c.a1 < HEIGHT - 2000 && !specs.includes(c.zone)) fail('every zone with a chamber has a spectacle', `${tag}: zone ${c.zone + 1}`);
    // calm chambers carry a fruit weave
    for (const c of level.chambers) if (!fruit.some(f => f.alt > c.a0 && f.alt < c.a1)) fail('calm chambers have fruit', tag);

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
        const reach = h.ax + h.side * (h.len * Math.sin(0.78 + 0.55) + h.r);
        const lane = h.side > 0 ? R - reach : reach - L;
        if (lane < RULES.minLane - 0.5) fail('spiky pod leaves an open lane', `${where}: ${lane.toFixed(0)} units`);
      }
      if (h.type === 'firebar') {
        const [L, R] = tightest(level, h.lo, h.hi);
        const clear = Math.min(h.cx - h.len - L, R - (h.cx + h.len)) - h.br * 0.85;   // from the flame's edge
        if (clear < HITBOX + 8) fail('fire wheel leaves room at the walls', `${where}: ${clear.toFixed(0)} units`);
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
        if (Math.min(h.x - h.r - L, R - h.x - h.r) < RULES.minLane - 0.5) fail('spider leaves lanes on both sides', where);
        if (h.aAlt - h.mid - h.amp - h.r < h.lo - 0.5 || h.aAlt - h.mid + h.amp + h.r > h.hi + 0.5) fail('spider stays inside its band', where);
      }
      if (h.type === 'crusher') {
        const [L, R] = tightest(level, h.lo, h.hi);
        const lane = Math.min(R, h.rb - h.maxR) - Math.max(L, h.lb + h.maxL);
        if (lane < RULES.minLane - 0.5) fail('crusher leaves an open lane when fully closed', `${where}: ${lane.toFixed(0)} units`);
      }
      if (h.type === 'gate') {
        // shut for at most maxShut at a time, open for at least minOpen, and room to wait below it
        const [L, R] = tightest(level, h.lo, h.hi), step = 0.004;
        let shut = 0, open = 0, maxShut = 0, maxOpen = 0, minLaneOpen = Infinity;
        for (let t = 0; t < h.period * 2; t += step) {
          const [eL, eR] = gateExt(h, gateK(h, t));
          const lane = Math.min(R, h.rb - eR + 2) - Math.max(L, h.lb + eL - 2);
          if (lane < RULES.minLane) { shut += step; open = 0; } else { open += step; shut = 0; minLaneOpen = Math.min(minLaneOpen, lane); }
          maxShut = Math.max(maxShut, shut); maxOpen = Math.max(maxOpen, open);
        }
        if (maxShut > RULES.gate.maxShut + 1e-6) fail('gates are never shut for long', `${where}: ${maxShut.toFixed(2)} s`);
        if (Math.min(maxOpen, h.period) < RULES.gate.minOpen - 1e-6) fail('gates stay open long enough to pass', `${where}: ${maxOpen.toFixed(2)} s`);
        const [eL, eR] = gateExt(h, 0);
        if (Math.min(R, h.rb - eR + 2) - Math.max(L, h.lb + eL - 2) < RULES.minLane * 1.5) fail('open gates leave a wide lane', where);
        const below = hz[i - 1];
        if (below && h.lo - below.hi < RULES.gate.room - 0.5) fail('gates leave room to wait below', `${where}: ${(h.lo - below.hi).toFixed(0)} units`);
        // a fixed, readable rhythm, and a countdown that starts RULES.gate.warn before the slabs move
        if (h.period !== RULES.gate.period) fail('every gate runs on the same fixed period', `${where}: ${h.period}`);
        let warnT = 0, prevK = gateK(h, -step);
        for (let t = 0; t < h.period * 2; t += step) {
          const k = gateK(h, t), w = gateWarn(h, t);
          if ((k > prevK + 1e-9 || k >= 1) && w < 1) { fail('a gate never closes without its countdown', where); break; }
          if (w > 0 && w < 1) warnT += step;
          prevK = k;
        }
        if (Math.abs(warnT / 2 - RULES.gate.warn) > 0.02) fail('gate countdown lasts RULES.gate.warn', `${where}: ${(warnT / 2).toFixed(2)} s`);
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

if ((seen.get('lavafall*') || 0) < checked * 0.55) fail('lavafalls show up in most shafts', `${seen.get('lavafall*') || 0} of ${checked}`);
if ((zoneMix.corridors || 0) < checked * 0.55) fail('corridor stretches show up in most shafts', `${zoneMix.corridors || 0} of ${checked}`);

if (failures.size) {
  console.log(`FAILED: ${failures.size} rule(s) broken across ${checked} shafts`);
  for (const [rule, { count, example }] of failures) console.log(`  ✗ ${rule} — ${count}× (e.g. ${example})`);
  process.exit(1);
}
console.log(`PASS: ${checked} shafts × ${HEIGHT / 10} m checked against every layout rule`);
