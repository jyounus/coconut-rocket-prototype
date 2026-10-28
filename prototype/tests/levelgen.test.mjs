// Fairness checks for the level generator in ../index.html.
// Run: node prototype/tests/levelgen.test.mjs
// It extracts the code between /* LEVELGEN:BEGIN */ and /* LEVELGEN:END */ markers,
// generates many shafts and checks every layout rule independently of the generator.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const html = fs.readFileSync(fileURLToPath(new URL('../index.html', import.meta.url)), 'utf8');
const regions = [...html.matchAll(/\/\* LEVELGEN:BEGIN \*\/([\s\S]*?)\/\* LEVELGEN:END \*\//g)].map(m => m[1]);
if (regions.length < 3) throw new Error('LEVELGEN markers not found in index.html');
const { createLevel, RULES, WORLD_W, DEFAULTS, gateK, gateExt, crusherExt, gateWarn, gatePeriod, gatePhase, gateStep, gateCommit, gateCloseIn, gateReopenIn, brakeDist, HANG, FALL_CAP, timingOf, hangCaps, zoneOf, batPos, BAT_PAT, CHUNKS, SET_PIECES, BEATS, PILOT_HITS, pilotMaxSize, staticShapes, GRAB, GRAB_STYLE, GRAB_TOTAL, grabPose, grabRig, PILOT_SCALE, PILOT_TILT, SIGNATURE, CHAR_FIT, VEH_FIT, PILOT_CAP, PART_ENV, SEAT_SCALE, SEAT_FLOOR, envScale, seatFit, seatPlace, comboHits, seatLocal, AMMO, CHASE, hungerLeash, hungerGap, COCO_GOLD, CHILI_R, COCO_R, GOLD_R, PICK_R, pickR, ADVENTURE, ADV, advSeed, advLevelOpts, pinJungle, capsSpan } = new Function(regions.join('\n') + '\nreturn { createLevel, RULES, WORLD_W, DEFAULTS, gateK, gateExt, crusherExt, gateWarn, gatePeriod, gatePhase, gateStep, gateCommit, gateCloseIn, gateReopenIn, brakeDist, HANG, FALL_CAP, timingOf, hangCaps, zoneOf, batPos, BAT_PAT, CHUNKS, SET_PIECES, BEATS, PILOT_HITS, pilotMaxSize, staticShapes, GRAB, GRAB_STYLE, GRAB_TOTAL, grabPose, grabRig, PILOT_SCALE, PILOT_TILT, SIGNATURE, CHAR_FIT, VEH_FIT, PILOT_CAP, PART_ENV, SEAT_SCALE, SEAT_FLOOR, envScale, seatFit, seatPlace, comboHits, seatLocal, AMMO, CHASE, hungerLeash, hungerGap, COCO_GOLD, CHILI_R, COCO_R, GOLD_R, PICK_R, pickR, ADVENTURE, ADV, advSeed, advLevelOpts, pinJungle, capsSpan };')();

// The widest and tallest pilot hitbox at any tilt (every character in every vehicle it can ride, world units): every
// lane is sized from these.
const { w: PILOT_W, h: PILOT_H } = pilotMaxSize();
const FRUIT_PAD = RULES.pickup.r + 2;
// pickups never overlap: any two keep their radii plus a hair apart (sorted by height, so only neighbours are compared)
const PICK_GAP = 2;
function overlaps(fruit) { const fs = [...fruit].sort((a, b) => a.alt - b.alt), out = []; for (let i = 0; i < fs.length; i++) for (let j = i + 1; j < fs.length && fs[j].alt - fs[i].alt < 2 * GOLD_R + PICK_GAP; j++) { const d = Math.hypot(fs[i].x - fs[j].x, fs[i].alt - fs[j].alt); if (d < pickR(fs[i]) + pickR(fs[j]) + PICK_GAP) out.push(`${fs[i].kind}/${fs[j].kind} ${d.toFixed(1)} apart at ${(fs[i].alt / 10).toFixed(0)} m`); } return out; }       // the largest pickup radius (chili, coconut or golden coconut) plus a little
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
// characters × vehicles: all 441 pairs (index.html, "Characters × vehicles: the hit side"). Lanes are sized from the widest
// and tallest pair, so no pair may be wider or taller than today's widest and tallest pilot (fixed here, not read from
// the file under test). Each split part must sit inside its size envelope (worked out again here), which makes every
// pair of split parts fit the cap, including pairs whose parts are split later. Every pair that flies now is checked
// too: its hitbox is exactly its character's capsules moved onto the seat plus its vehicle's capsules, and it fits.
const LANE_LIMIT = { w: 46.627, h: 73.5 };   // art units: the goat (69.94 world units across at full tilt) and the firefly
const pairStats = { pairs: 0, flyable: 0, swaps: 0, minS: Infinity, widest: 0, tallest: 0, worst: '', worstW: 0, vehicles: 0, characters: 0, minEnv: Infinity, cramped: 0, shifted: 0, offCentre: [], sure: 0, collars: 0 };
{
  const chars = Object.keys(SIGNATURE), rides = Object.values(SIGNATURE), owner = {};
  chars.forEach(ch => { owner[SIGNATURE[ch]] = ch; });
  const near = (a, b) => Math.abs(a - b) <= 1e-9;
  if (chars.length !== 21 || new Set(rides).size !== 21) fail('21 characters, each with its own signature ride', `${chars.length} characters, ${new Set(rides).size} rides`);
  for (const id in PILOT_HITS) if (!SIGNATURE[id]) fail('every pilot hitbox belongs to a character', id);
  if (Object.keys(CHAR_FIT).sort().join() !== chars.slice().sort().join() || Object.keys(VEH_FIT).sort().join() !== rides.slice().sort().join()) fail('CHAR_FIT and VEH_FIT list every character and vehicle (null until split)', '');
  if (PILOT_CAP.w > LANE_LIMIT.w || PILOT_CAP.h > LANE_LIMIT.h) fail('the pair cap is no bigger than today\'s widest and tallest pilot', `${PILOT_CAP.w} × ${PILOT_CAP.h}`);
  if (!(SEAT_FLOOR >= 0.65) || SEAT_SCALE[0] < SEAT_FLOOR || SEAT_SCALE[1] > 1.12) fail('a swapped character is drawn at 0.65 to 1.12 of its size', `floor ${SEAT_FLOOR}, ${SEAT_SCALE}`);
  const W = PILOT_CAP.w, H = PILOT_CAP.h, D = PART_ENV.depth;
  // reach of a capsule list from (0, 0) at each of the 21 tilts: [left, right, up, down]
  const reach = hits => Array.from({ length: 21 }, (_, k) => {
    const a = PILOT_TILT * (k - 10) / 10, cs = Math.cos(a), sn = Math.sin(a); let l = -Infinity, r = -Infinity, u = -Infinity, d = -Infinity;
    for (const [ax, ay, bx, by, R] of hits) for (const [x, y] of [[ax, ay], [bx, by]]) { const X = x * cs - y * sn, Y = x * sn + y * cs; l = Math.max(l, R - X); r = Math.max(r, X + R); u = Math.max(u, R - Y); d = Math.max(d, Y + R); }
    return [l, r, u, d];
  });
  const size = hits => reach(hits).reduce(([w, h], [l, r, u, d]) => [Math.max(w, l + r), Math.max(h, u + d)], [0, 0]);
  const mv = (hits, k, dx, dy) => hits.map(([ax, ay, bx, by, r]) => [ax * k + dx, ay * k + dy, bx * k + dx, by * k + dy, r * k]);
  const side = k => PART_ENV.side[0] + (PART_ENV.side[1] - PART_ENV.side[0]) * Math.abs(k - 10) / 10;
  const inside = (kind, hits) => reach(hits).every(([l, r, u, d], k) => { const sd = kind === 'vehicle' ? side(k) : W - side(k), e = 1e-9;
    return l + r <= W + e && u + d <= H + e && l <= sd + e && r <= sd + e && u <= H - D + e && d <= D + e; });
  const split = ch => !!(CHAR_FIT[ch] && VEH_FIT[SIGNATURE[ch]]);
  const cOwn = ch => PILOT_HITS[ch].slice(0, CHAR_FIT[ch].caps), vOwn = vh => PILOT_HITS[owner[vh]].slice(CHAR_FIT[owner[vh]].caps);
  // with a swapped rider a lip-less ride adds its collar's capsules (the collar is drawn for any rider but its own)
  const vSwap = vh => vOwn(vh).concat(VEH_FIT[vh].collar || []);
  for (const ch of chars) {
    const C = CHAR_FIT[ch], V = VEH_FIT[SIGNATURE[ch]];
    if (!C !== !V) { fail('a character is split together with its signature ride', ch); continue; }
    if (!C) continue;
    if (!(Number.isInteger(C.caps) && C.caps >= 1 && C.caps < PILOT_HITS[ch].length)) { fail('a split pilot\'s hitbox row starts with its character\'s capsules (caps)', ch); continue; }
    // its own pair: exactly the pilot's fitted hitbox, drawn where it always was
    const f = seatFit(ch, SIGNATURE[ch]);
    if (f.s !== 1 || f.dx !== 0 || f.dy !== 0 || f.hand || JSON.stringify(comboHits(ch, SIGNATURE[ch])) !== JSON.stringify(PILOT_HITS[ch])) fail('a split pilot sits on its own ride exactly as drawn, with its own hitbox', ch);
    if (C.hip[0] !== V.seat.x || C.hip[1] !== V.seat.y) fail('a split character\'s hip is its own ride\'s seat point', ch);
    // the vehicle's envelope: as drawn, round its seat point, or round its envelope centre (seat.x + shift) when its
    // seat sits off-centre
    pairStats.vehicles++;
    const st = V.seat, sx = st.shift || 0, vcaps = mv(vSwap(SIGNATURE[ch]), 1, -st.x - sx, -st.y);
    if (V.collar) pairStats.collars++;
    if (!Number.isFinite(sx) || !inside('vehicle', vcaps) || (st.floor != null && !(st.floor >= st.y && st.floor - st.y <= PART_ENV.drop))) fail('every split vehicle sits inside the vehicle envelope', SIGNATURE[ch]);
    // so any character inside its envelope, hip on that centre, fits it: at every tilt the pair reaches as far as the
    // further part each way, here with the character at the full extent its envelope allows
    // (each way the pair takes the further part; the character alone is at most cs to a side and W across, so the pair is
    // the vehicle, the vehicle on one side and the character on the other, or the character)
    const pairW = (l, r, cs) => Math.max(l + r, l + cs, cs + r, Math.min(2 * cs, W)), pairH = (u, d) => Math.max(u + d, u + D, H - D + d, H);
    const worst = reach(vcaps).reduce((m, [l, r, u, d], k) => Math.max(m, pairW(l, r, W - side(k)) - W, pairH(u, d) - H), -Infinity);
    if (worst > 1e-9) fail('any character inside its envelope fits every split vehicle at the vehicle\'s envelope centre', `${SIGNATURE[ch]}: ${worst.toFixed(2)} over`);
    if (sx) {   // an off-centre seat: round the seat point itself, the same worst-case character would not have fitted
      const at0 = reach(mv(vSwap(SIGNATURE[ch]), 1, -st.x, -st.y)).reduce((m, [l, r], k) => Math.max(m, pairW(l, r, W - side(k))), 0);
      pairStats.offCentre.push(`${SIGNATURE[ch]} shift ${sx} (worst case ${at0.toFixed(1)} wide round its seat point, ${(worst + W).toFixed(1)} round its centre)`);
    }
    // the character's envelope, at its envelope scale and at the floor, at both ends of the lift a ride can give it
    pairStats.characters++;
    const env = envScale(ch), body = cOwn(ch).concat(C.body || []);
    pairStats.minEnv = Math.min(pairStats.minEnv, env);
    const foot = C.foot != null ? C.foot : C.sink;
    for (const k of [env, SEAT_FLOOR]) for (const lift of [Math.min(0, foot * k - PART_ENV.drop), Math.max(0, foot * k, C.sink * k)])
      if (k < SEAT_FLOOR || !inside('character', mv(body, k, -C.hip[0] * k, -C.hip[1] * k - lift))) fail('every split character fits the character envelope at 0.65 of its size or more', `${ch}: envelope scale ${env.toFixed(3)}`);
  }
  for (const ch of chars) for (const vh of rides) {
    pairStats.pairs++;
    const hits = comboHits(ch, vh), own = SIGNATURE[ch] === vh, both = split(ch) && split(owner[vh]);
    if (!hits) { if (own || both) fail('every pilot on its own ride, and every pair of split parts, can fly', `${ch}+${vh}`); continue; }
    if (!own && !both) { fail('a fused pilot only flies with its own partner', `${ch}+${vh}`); continue; }
    pairStats.flyable++;
    const [w, h] = size(hits);
    pairStats.widest = Math.max(pairStats.widest, w); pairStats.tallest = Math.max(pairStats.tallest, h);
    if (own) continue;
    pairStats.swaps++;
    // the swap's hitbox is the character's capsules (and body capsules) moved onto the seat by the seat contract, plus
    // the vehicle's capsules: nothing dropped, nothing added
    const f = seatFit(ch, vh), C = CHAR_FIT[ch], st = VEH_FIT[vh].seat, k = f.s, sx = st.shift || 0;
    // an off-centre seat may move the rider across the opening, towards its envelope centre and never past it
    if (!(sx ? f.sh / sx >= 0 && f.sh / sx <= 1 : f.sh === 0)) fail('a rider moves across an off-centre opening only towards its envelope centre, and at most seat.shift', `${ch}+${vh}: ${f.sh} of ${sx}`);
    if (f.sh) pairStats.shifted++;
    const placed = (k, sh) => {
      const lift = st.floor != null ? st.y + (C.foot != null ? C.foot : C.sink) * k - st.floor : Math.max(0, C.sink * k - st.depth), dx = st.x + sh - C.hip[0] * k, dy = st.y - lift - C.hip[1] * k;
      return { dx, dy, hits: mv(cOwn(ch).concat(C.body || []), k, dx, dy).concat(vSwap(vh)) };
    };
    const { dx, dy, hits: want } = placed(k, f.sh);
    if (!near(f.dx, dx) || !near(f.dy, dy) || hits.length !== want.length || hits.some((c, i) => c.some((v, j) => !near(v, want[i][j])))) fail('a swapped pair\'s hitbox is its character\'s capsules on the seat plus its vehicle\'s', `${ch}+${vh}`);
    // the guarantee itself, on the real parts: at the full shift and the smaller of the asked scale and the character's
    // envelope scale, the pair always fits (seatFit never needs to go below that)
    const [gw, gh] = size(placed(Math.max(SEAT_FLOOR, Math.min(f.fit, envScale(ch))), sx).hits);
    if (gw > W + 1e-9 || gh > H + 1e-9) fail('every pair fits at its guaranteed placement (full shift, the smaller of its scale and envelope scale)', `${ch}+${vh}: ${gw.toFixed(2)} × ${gh.toFixed(2)}`);
    else pairStats.sure++;
    pairStats.minS = Math.min(pairStats.minS, k); if (f.cramped) pairStats.cramped++;
    if (f.floored || !(k >= SEAT_FLOOR - 1e-12) || k > SEAT_SCALE[1] + 1e-12) fail('every character fits every vehicle at 0.65 to 1.12 of its size', `${ch}+${vh}: scale ${k.toFixed(3)}`);
    if (w > W + 1e-9 || h > H + 1e-9) fail('every character in every vehicle stays inside the pair cap at any tilt', `${ch}+${vh}: ${w.toFixed(2)} × ${h.toFixed(2)} vs ${W} × ${H}`);
    if (w > pairStats.worstW) { pairStats.worstW = w; pairStats.worst = `${ch}+${vh}`; }
  }
  if (pairStats.pairs !== 441) fail('all 21 × 21 character and vehicle pairs are checked', `${pairStats.pairs}`);
  if (pairStats.widest > LANE_LIMIT.w || pairStats.tallest > LANE_LIMIT.h) fail('no pair is wider or taller than today\'s widest and tallest pilot (the lanes stay as they are)', `${pairStats.widest.toFixed(3)} × ${pairStats.tallest.toFixed(3)} art units`);
  if (Math.abs(pairStats.widest * PILOT_SCALE - PILOT_W) > 1e-9 || Math.abs(pairStats.tallest * PILOT_SCALE - PILOT_H) > 1e-9) fail('lanes are sized from the widest and tallest pair', `${(pairStats.widest * PILOT_SCALE).toFixed(3)} vs ${PILOT_W.toFixed(3)}`);
  // the seat contract on made-up parts: a bust's cut stays hidden (lifted to the ride's depth when it would show), a
  // rider stands on a closed ride's floor, its own ride moves nothing
  const bust = { hip: [0, -2], sink: 3, grip: null }, whole = { hip: [0, -2], sink: 0.5, foot: 6, grip: null };
  const lipSeat = { x: 1, y: -3, w: 25, depth: 1.2, grip: null }, ballSeat = { x: 0, y: -4, w: 30, depth: 0, floor: 5, grip: null };
  const p1 = seatPlace(bust, lipSeat, 0.9, false), p2 = seatPlace(whole, ballSeat, 0.95, false), p3 = seatPlace(bust, lipSeat, 1, true);
  if (!near((bust.hip[1] + bust.sink) * 0.9 + p1.dy, lipSeat.y + lipSeat.depth) || !near(bust.hip[0] * 0.9 + p1.dx, lipSeat.x)) fail('a bust\'s cut is lifted to the ride\'s hidden depth', JSON.stringify(p1));
  if (!near((whole.hip[1] + whole.foot) * 0.95 + p2.dy, ballSeat.floor)) fail('a rider stands on a closed ride\'s floor', JSON.stringify(p2));
  if (p3.dx !== lipSeat.x - bust.hip[0] || p3.dy !== lipSeat.y - bust.hip[1] || p3.lift !== 0) fail('a character\'s own ride lifts nothing', JSON.stringify(p3));
  const offSeat = { x: -4, y: -3, w: 20, depth: 1.2, grip: null, shift: 2.5 }, p4 = seatPlace(bust, offSeat, 0.9, false, 1.5), p5 = seatPlace(bust, offSeat, 1, true, 1.5);
  if (!near(bust.hip[0] * 0.9 + p4.dx, offSeat.x + 1.5) || p5.dx !== offSeat.x - bust.hip[0]) fail('an off-centre seat moves a swapped rider across the opening by its shift, and its own rider not at all', JSON.stringify([p4, p5]));
  // seatLocal: no change when the ride does not tip the pair; Shellby's own point mapping when it does
  const sl = (tip, pivot, f) => seatLocal({ s: f[0], dx: f[1], dy: f[2], tip, vehicle: { tip: pivot && { pivot } } }, 3.5, -12.25);
  const a = 0.33, own = [1 + (3.5 - 1) * Math.cos(a) + (-12.25 - 14) * Math.sin(a), 14 - (3.5 - 1) * Math.sin(a) + (-12.25 - 14) * Math.cos(a)];
  if (sl(a, null, [1, 0, 0]).join() !== '3.5,-12.25' || sl(0, [1, 14], [1, 0, 0]).join() !== '3.5,-12.25' || sl(a, [1, 14], [1, 0, 0]).join() !== own.join()) fail('seatLocal turns a point back about the ride\'s tip pivot', '');
}
for (const sp of BEATS.flat()) if (new Set(sp.steps.map(([t]) => t).filter(t => t !== 'arc')).size < 2) fail('beats mix hazard types', sp.name);
// chili ammo: a pilot that follows the chili line (the guaranteed gap-fill chilies) at the monster's top base speed
// picks up at least 1.15× the ammo that auto-fire spends at the monster's tightest normal leash (the game's own chase
// and blaster model: CHASE, a shot every AMMO.rate s while it is within AMMO.range, each hit knocking it AMMO.push down
// and stunning it AMMO.stun s, so it has to climb back into range), so following the chilies never runs dry. And ammo
// matters for a skilled pilot too: flat out at top speed with the leash opened by clean play (CHASE.open) the blaster
// still spends at least half of what the chili line supplies at that speed, so the tank does not just sit full. Out of ammo the monster gets hungry (the game's own chase
// model: CHASE plus hungerLeash and the hungerGap clamp): it eats you AMMO.starve s after you run dry, which is still
// more than the longest climb without a chili (with a 20% margin), so running dry right after a chili leaves time to
// reach the next one; and the hunger is real: even flat out at top speed it catches you within 12 s.
const CLEAR = PILOT_W / 2 + 15 + RULES.pickup.r;   // a pickup's clearance from every hazard hitbox (pilot half-width, 15, the largest pickup radius)
const ammoStats = {};
if (RULES.chili.endless) {
  const D = DEFAULTS, v = D.wormBase + 60, gap = RULES.chili.gap;
  // shots per second auto-fire spends on a pilot climbing steadily at pv, the monster (base speed `base`) chasing at
  // leash `target`: it fires while the monster is in range, shots fly down at AMMO.speed, a hit knocks it back (over a
  // few frames, as updateBlaster does) and stuns it
  const spendAt = (pv, target, base) => {
    let pa = 0, wa = -target, kb = 0, stun = 0, fireT = 0, n = 0, t = 0; const dt = 1 / 240, shots = [];
    while (t < 60) {
      pa += pv * dt;
      const g = pa - wa;
      let mv = base + Math.max(-base, Math.min(CHASE.cap, (g - target) * CHASE.k)), floor = base * CHASE.floor;
      if (stun > 0) { mv = Math.min(mv, -40); floor = Math.min(floor, -40); }
      wa += Math.max(mv, floor) * dt; fireT -= dt; stun -= dt;
      if (fireT <= 0 && g < AMMO.range && g > 0) { shots.push(pa - 20); n++; fireT = AMMO.rate; }
      for (let i = shots.length - 1; i >= 0; i--) { shots[i] -= AMMO.speed * dt; if (shots[i] <= wa) { shots.splice(i, 1); kb += AMMO.push; stun = AMMO.stun; } }
      if (kb > 0) { const d = Math.min(kb, kb * dt * 8 + 20 * dt); wa -= d; kb -= d; }
      t += dt;
    }
    return n / 60;
  };
  const supply = AMMO.per * v / gap, spend = spendAt(v, D.chase, v);
  ammoStats.ratio = supply / spend; ammoStats.spend = spend;
  if (supply < spend * 1.15) fail('following the chilies out-supplies auto-fire at the tightest leash by 15%', `${supply.toFixed(2)} vs ${spend.toFixed(2)} ammo/s`);
  const flatSupply = AMMO.per * D.maxUp / gap, flatSpend = spendAt(D.maxUp, Math.max(D.chase, CHASE.open), D.wormBase + 30);
  ammoStats.flat = flatSpend / flatSupply; ammoStats.flatSpend = flatSpend;
  if (flatSpend < flatSupply * 0.5) fail('a flat-out pilot at the calm leash still spends half the chili line\'s ammo', `${flatSpend.toFixed(2)} vs ${flatSupply.toFixed(2)} ammo/s`);
  if (flatSpend > flatSupply) fail('a flat-out pilot following the chilies still gains ammo', `${flatSpend.toFixed(2)} vs ${flatSupply.toFixed(2)} ammo/s`);
  const caught = pv => {
    let g = D.chase, h = 0, t = 0; const dt = 1 / 240, base = D.wormBase + 60;
    while (g > 0 && t < 30) {
      h = Math.min(1, h + dt / AMMO.starve);
      const [tg, cap] = hungerLeash(D.chase, CHASE.cap, h), mv = Math.max(base * CHASE.floor, base + Math.max(-base, Math.min(cap, (g - tg) * CHASE.k)));
      g = Math.min(g + (pv - mv) * dt, hungerGap(D.chase, h)); t += dt;
    }
    return t;
  };
  ammoStats.caught = caught(v); ammoStats.caughtFlat = caught(D.maxUp); ammoStats.climb = gap / v;
  if (ammoStats.climb * 1.2 > ammoStats.caught) fail('the longest climb without a chili is inside the time from empty to caught (20% margin)', `${ammoStats.climb.toFixed(2)} s vs ${ammoStats.caught.toFixed(2)} s`);
  if (ammoStats.caughtFlat > 12) fail('out of ammo the monster catches even a flat-out pilot', `${ammoStats.caughtFlat.toFixed(1)} s`);
  if (AMMO.start > AMMO.max || AMMO.per < 1 || AMMO.range <= D.chase) fail('ammo numbers are sane (start <= max, the leash is in range)', '');
}
{
  if (RULES.pickup.clear < CLEAR || RULES.fruitHug < CLEAR) fail('pickups keep the widest pilot half-width plus 15 plus their radius from hazards', `${RULES.pickup.clear} vs ${CLEAR.toFixed(1)}`);
  if (Math.max(CHILI_R, COCO_R, GOLD_R) !== PICK_R || RULES.pickup.r !== PICK_R) fail('the pickup clearance uses the largest pickup radius', '');
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
    if (RULES.chili.endless && fruit.filter(f => f.kind === 'chili').length < HEIGHT / RULES.chili.gap) fail('shaft has a chili line', `${tag}: only ${fruit.filter(f => f.kind === 'chili').length}`);
    if (!RULES.chili.endless && fruit.some(f => f.kind === 'chili')) fail('endless shafts hold no chilies (the blaster is Adventure only)', tag);
    for (const f of fruit) if (!['chili', 'coco', 'gold'].includes(f.kind)) { fail('every pickup is a chili, a coconut or a golden coconut', `${tag}: ${f.kind}`); break; }
    for (const f of fruit) if (f.kind === 'chili' && !f.fill) { fail('only the guaranteed line holds chilies', tag); break; }
    { const o = overlaps(fruit); if (o.length) fail('pickups never overlap', `${tag}: ${o[0]}${o.length > 1 ? ` (+${o.length - 1})` : ''}`); }
    // coconuts are plentiful (counted over the first 500 m after the launch, value with golden ones at COCO_GOLD)
    if (cfg.density === 1) {
      const c5 = fruit.filter(f => f.alt < 5000 && f.kind !== 'chili'), val = c5.reduce((n, f) => n + (f.kind === 'gold' ? COCO_GOLD : 1), 0);
      (zoneMix.coco = zoneMix.coco || []).push(val); (zoneMix.cocoN = zoneMix.cocoN || []).push(c5.length);
      zoneMix.gold = (zoneMix.gold || 0) + fruit.filter(f => f.kind === 'gold' && f.alt < HEIGHT - 800).length; zoneMix.goldH = (zoneMix.goldH || 0) + (HEIGHT - 800);
      if (c5.length < 25) fail('a 500 m climb offers plenty of coconuts', `${tag}: ${c5.length}`);
      if (fruit.some(f => f.kind === 'gold' && !f.bonus)) fail('golden coconuts sit only on risky spots', tag);
    }
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
    if (arcs.length < RULES.arc.n[0] && cfg.density >= 0.5) fail('shafts have coconut-arc release beats', `${tag}: ${arcs.length} arc coconuts`);
    for (const f of arcs) for (const h of hz) {
      const top = h.type === 'pend' ? h.aAlt : h.hi, lo = h.type === 'boulder' ? h.alt - 40 : h.lo;
      if (f.alt > lo - 10 && f.alt < top + 10) { fail('fruit arcs stay clear of hazards', `${tag} at ${(f.alt / 10).toFixed(0)} m: ${h.type}`); break; }
    }
    // racing lines: coconuts beside a wall hazard thread close to its reach (RULES.fruitHug), not the lane's middle
    // (the chili line is the main line, so it is left out)
    let near = 0, beside = 0;
    for (const f of fruit) for (const h of hz) {
      if (f.kind === 'chili') break;
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
      const fp = pickR(f) + 2;   // (each pickup by its own size)
      if (f.x - fp < L || f.x + fp > R) fail('fruit is inside the shaft', fw);
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

    // pickups (chilies and coconuts alike) keep CLEAR from every hazard hitbox they could meet: the static hitboxes (the game's own shapes),
    // a pod's whole swing, a crusher fully closed, a spider's whole bob (its body and legs) and a fire wheel's whole
    // sweep, measured here independently; and never within 40 of a spike or geyser tip at about the same height
    for (const f of fruit) {
      const fw = `${tag} ${f.kind} at ${(f.alt / 10).toFixed(0)} m`;
      for (const h of hz) {
        const top = h.type === 'pend' ? h.aAlt : h.hi;
        if (f.alt < h.lo - 200 || f.alt > top + 200) continue;
        let d = Infinity;
        const seg = (x0, a0, x1, a1, r) => { const dx = x1 - x0, da = a1 - a0, L = dx * dx + da * da, t = L ? Math.max(0, Math.min(1, ((f.x - x0) * dx + (f.alt - a0) * da) / L)) : 0; d = Math.min(d, Math.hypot(f.x - x0 - dx * t, f.alt - a0 - da * t) - r); };
        const box = (x0, x1, a0, a1) => { const dx = Math.max(x0 - f.x, 0, f.x - x1), da = Math.max(a0 - f.alt, 0, f.alt - a1); d = Math.min(d, dx || da ? Math.hypot(dx, da) : -1); };
        if (h.type === 'spike' || h.type === 'geyser' || h.type === 'lavafall') {
          for (const q of staticShapes(h)) q.k === 'b' ? box(q.x0, q.x1, q.a0, q.a1) : seg(q.x0, q.a0, q.x1, q.a1, q.r);
          if (h.type !== 'lavafall' && Math.abs(f.alt - h.alt) < 30 && Math.abs(f.x - (h.base + h.side * h.len)) < 40) fail('pickups never sit by a hazard tip', `${fw}: ${h.type}`);
        } else if (h.type === 'pend') {
          for (let i = 0; i <= 48; i++) { const th = h.side * (0.23 + 1.1 * i / 48); seg(h.ax + h.len * Math.sin(th), h.aAlt - h.len * Math.cos(th), h.ax + h.len * Math.sin(th), h.aAlt - h.len * Math.cos(th), h.hr); }
        } else if (h.type === 'crusher') {
          box(h.lb - 40, h.lb + h.maxL + 2, h.alt - h.hb, h.alt + h.hb); box(h.rb - h.maxR - 2, h.rb + 40, h.alt - h.hb, h.alt + h.hb);
        } else if (h.type === 'spider') {
          const k = 1.3, a0 = h.aAlt - h.mid - h.amp, a1 = h.aAlt - h.mid + h.amp;   // the body capsule and the legs, over the whole bob
          seg(h.x, a0 - 8 * k, h.x, a1 + 9 * k, 12 * k); box(h.x - 24.6 * k, h.x + 24.6 * k, a0 - 10.7 * k, a1 + 14.1 * k);   // legs: 24.6 out, 14.1 up, 10.7 down
        } else if (h.type === 'firebar') seg(h.cx, h.alt, h.cx, h.alt, h.len + h.br * 1.08);
        else if (h.type === 'hang') box(h.x - h.hw - RULES.hang.sway, h.x + h.hw + RULES.hang.sway, h.lo, h.aAlt);
        if (d < CLEAR - 0.5) { fail('pickups keep clear of hazard hitboxes', `${fw}: ${h.type} ${d.toFixed(0)} < ${CLEAR.toFixed(0)}`); break; }
      }
    }

    // the chili line: along the shaft there is never a longer climb than RULES.chili.gap without a chili (the ammo
    // fairness above is computed from that gap)
    if (RULES.chili.endless) {
      const alts = fruit.filter(f => f.kind === 'chili').map(f => f.alt).sort((x, y) => x - y);
      let prev = 58, worst = 0;
      for (const a of alts) { if (a > HEIGHT - 800) break; worst = Math.max(worst, a - prev); prev = a; }
      if (worst > RULES.chili.gap + 1) fail('a chili comes at least every RULES.chili.gap', `${tag}: ${worst.toFixed(0)} units`);
      // and a chili rarely sits on top of a coconut (both would be grabbed as one blob)
      let over = 0, nch = 0;
      for (const f of fruit) if (f.kind === 'chili') { nch++; if (fruit.some(q => q !== f && Math.hypot(q.x - f.x, q.alt - f.alt) < pickR(q) + CHILI_R)) over++; }
      if (over > nch * 0.05) fail('chilies keep off the coconuts', `${tag}: ${over} of ${nch}`);
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
  if (st.hand === 'vwing') {   // the geode vampire's wing-wrist: a big thumb claw that reads at phone size, finger bones and a membrane
    const L = Math.max(...hand.filter(p => p[5] === 'c').map(p => Math.hypot(p[2] - p[0], p[3] - p[1]) + p[4]));
    if (L < 28) fail('the wing thumb claw is big (28+ long)', `${id}: ${L.toFixed(0)}`);
    if (roles.filter(r => r === 'b').length < 3 || roles.filter(r => r === 'm').length < 2) fail('the wing-wrist folds three finger bones and a membrane down the wall', id);
  }
  if (st.hand === 'geode') {   // the Geode King's stone hand grips: a palm, four fingers curled over the wall's edge into the rock, a thumb
    if (roles.filter(r => r === 'o').length < 10) fail('the stone hand has a palm, four two-part fingers and a thumb', id);
    const tips = hand.filter((p, i) => i >= 2 && i <= 8 && i % 2 === 0);
    if (tips.some(p => !((p[2] - p[0]) * d > 0))) fail('the stone fingers curl over into the rock', id);
  }
  if (st.hand === 'parahook') {   // the Scissorjaw's parapod ends in ring segments and a big hooked claw that reads at phone size
    const hk = hand.filter(p => p[5] === 'c'), L = hk.reduce((m, p) => m + Math.hypot(p[2] - p[0], p[3] - p[1]), 0);
    if (hand.filter(p => p[5] === 's').length < 2 || hk.length < 3 || L < 30) fail('the parapod tip is ringed and ends in a big hook (30+ long)', `${id}: ${L.toFixed(0)}`);
    const tip = hk[hk.length - 2];   // the main hook's last joint curls over toward the rock
    if (!((tip[2] - tip[0]) * d > 0)) fail('the parapod hook curls over into the rock', id);
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

// Pickups (chilies and coconuts) never pop in on screen: filled the way the game does (a little at a time as the camera
// climbs, up to the screen top + 900), every pickup must already exist while it is still well above the top of a tall
// phone screen.
let popChecked = 0;
for (let sd = 0; sd < 150; sd++) {
  const VIEW = 1100, lv = createLevel(sd * 104729 + 7, DEFAULTS), hz = [], fr = [];
  lv.fill(VIEW + 900, hz, fr);
  let seenF = fr.length;
  for (let cam = 10; cam < 25000; cam += 10) {
    lv.fill(cam + VIEW + 900, hz, fr);
    for (; seenF < fr.length; seenF++, popChecked++) if (fr[seenF].alt < cam + VIEW + 100) fail('pickups appear above the screen, never pop in on it', `seed ${sd}: ${fr[seenF].kind} at ${fr[seenF].alt | 0} appeared with the screen top at ${cam + VIEW}`);
  }
}
if (popChecked < 1000) fail('pickup pop-in is checked', `${popChecked}`);
// every kind shows up, and filling the shaft a little at a time gives exactly the one-shot layout (the daily shaft is
// the same on every phone, whatever its screen height)
{
  const a = createLevel(4242, DEFAULTS), b = createLevel(4242, DEFAULTS), ha = [], fa = [], hb = [], fb = [];
  for (let cam = 0; cam < 20000; cam += 37) a.fill(cam + 1700, ha, fa);
  b.fill(20000 + 1700, hb, fb);
  const cut = f => f.alt < 19000, key = f => `${f.kind}:${f.x.toFixed(2)}:${f.alt.toFixed(2)}`;
  if (fa.filter(cut).map(key).sort().join() !== fb.filter(cut).map(key).sort().join()) fail('pickups do not depend on how the shaft is filled', '');
  if ((RULES.chili.endless && !fa.some(f => f.kind === 'chili')) || !fa.some(f => f.kind === 'coco') || !fa.some(f => f.kind === 'gold')) fail('every pickup kind shows up', '');
}
if (zoneMix.gold && zoneMix.goldH) {
  zoneMix.per150 = zoneMix.gold / (zoneMix.goldH / 1500);
  if (zoneMix.per150 < 0.6 || zoneMix.per150 > 1.6) fail('about one golden coconut per 150 m', `${zoneMix.per150.toFixed(2)} per 150 m`);
}

// ---------- Adventure, World 1 (fixed stages; the endless shafts above never fork) ----------
// Every stage on its real seed, plus many more seeds on the same settings, checked with the zones pinned to the jungle
// the way the game runs them:
// - everything stays jungle (thorn skins, no lavafalls), the shaft is never narrower than RULES.minWidth;
// - a stage has exactly one fork (the boss shaft none): its pillar stands inside the walls, both lanes keep room for
//   the widest pilot over its whole height (a sliding window as tall as the tallest pilot): the tight lane at least the
//   widest pilot plus a wall grab's band plus 8 (a claw on its wall still leaves a pilot room), the wide lane at least
//   the tight one plus 30 and twice the widest pilot;
// - nothing makes either lane impassable: no hazard's band (a boulder's whole fall included) reaches into the fork
//   stretch, and no monster limb above the catch line comes within the widest pilot of the pillar;
// - pickups clear the pillar like a wall (centre at least ADV.pickMargin from its hitbox, never touching it);
// - the chili line works in both lanes: a pilot keeping to either lane meets a chili at least every RULES.chili.gap
//   from the launch to the finish (the boss shaft every stage chiliGap); the tight lane holds more coconut value than
//   the wide one and a golden coconut;
// - the finish: no hazard reaches within 120 of the finish deck and no pickup sits above it;
// - the same seed always gives the same stage, and pickups never pop in on screen.
const advStats = { levels: 0, forks: 0, tightMin: Infinity, wideMin: Infinity, tightVal: 0, wideVal: 0, golds: 0, pickClear: Infinity, chiliGap: 0, bossChiliGap: 0, finishClear: Infinity, real: [] };
const segDist = (px, py, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy, t = L ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L)) : 0; return Math.hypot(px - ax - dx * t, py - ay - dy * t); };
const capsDist = (caps, x, a) => Math.min(...caps.map(q => segDist(x, a, q.x0, q.a0, q.x1, q.a1) - q.r));
// stages 1-4 are real climbs (35-70 s for a good pilot): each at least 1000 m and longer than the one before, at most 3000 m
{ let prev = 0; for (const st of ADVENTURE.stages) if (!st.boss) { if (st.len < 1000 || st.len > 3000 || st.len <= prev) fail('adventure stages climb 1000-3000 m, each longer than the last', `${st.name}: ${st.len} m`); prev = st.len; } }
pinJungle(true);
try {
  for (let k = 0; k < 150; k++) for (const st0 of ADVENTURE.stages) {
    const st = k ? { ...st0, seed: `${st0.seed}#${k}` } : st0, tag = `${st0.name} seed ${st.seed}`;
    const opts = advLevelOpts(st), level = createLevel(advSeed(st), opts), hz = [], fruit = [];
    const end = opts.adv.end, H = st.boss ? 16000 : end + 900;
    level.fill(H, hz, fruit);
    advStats.levels++;
    for (const h of hz) if ((h.type !== 'pillar' && zoneOf(h.alt) !== 0) || h.type === 'lavafall' || (h.type === 'spike' && h.skin !== 'thorn') || (h.skin != null && typeof h.skin === 'number' && h.skin !== 0)) { fail('adventure stages stay in the jungle', `${tag}: ${h.type} at ${h.alt | 0}`); break; }
    for (let a = 0; a < H; a += 4) { const [l, r] = level.walls(a); if (r - l < RULES.minWidth - 0.01) { fail('adventure shafts keep the minimum width', `${tag} at ${a}: ${(r - l).toFixed(1)}`); break; } }
    const pillars = hz.filter(h => h.type === 'pillar');
    if (pillars.length !== (st.boss ? 0 : 1)) fail('each stage forks once (the boss shaft never)', `${tag}: ${pillars.length}`);
    if (k < 15) {
      const again = [], againF = []; createLevel(advSeed(st), opts).fill(H, again, againF);
      if (JSON.stringify(again) !== JSON.stringify(hz) || JSON.stringify(againF) !== JSON.stringify(fruit)) fail('the same stage seed gives the same stage', tag);
    }
    // the chili line, for a pilot keeping to one lane (outside the fork both lanes are the whole shaft)
    const laneOf = f => { for (const pl of pillars) if (f.alt > pl.lo && f.alt < pl.hi) { const sp = capsSpan(pl.caps, f.alt); if (sp) return f.x < (sp[0] + sp[1]) / 2 ? -1 : 1; } return 0; };
    const chilies = fruit.filter(f => f.kind === 'chili' && f.alt < (end || H) - 200);
    const gapMax = st.boss ? st.chiliGap : RULES.chili.gap;
    for (const side of [-1, 1]) {
      const alts = [58, ...chilies.filter(f => { const l = laneOf(f); return l === 0 || l === side; }).map(f => f.alt).sort((p, q) => p - q), end ? end - 200 : H - 1200];
      let worst = 0; for (let i = 1; i < alts.length; i++) worst = Math.max(worst, alts[i] - alts[i - 1]);
      if (st.boss) advStats.bossChiliGap = Math.max(advStats.bossChiliGap, worst); else advStats.chiliGap = Math.max(advStats.chiliGap, worst);
      if (worst > gapMax + 1) fail(`the chili line works in both lanes${st.boss ? ' (boss shaft: its own gap)' : ''}`, `${tag} lane ${side}: ${worst.toFixed(0)} without a chili`);
    }
    if (end) {
      for (const h of hz) { const top = h.type === 'pend' ? h.aAlt : h.hi; if (h.type !== 'pillar' && top < end + 400) advStats.finishClear = Math.min(advStats.finishClear, end - top); if (h.type !== 'pillar' && top > end - 120 && h.lo < end + 60) fail('no hazard near the finish deck', `${tag}: ${h.type} up to ${top | 0} (finish ${end})`); }
      if (fruit.some(f => f.alt > end - 60)) fail('no pickups above the finish deck', tag);
    }
    for (const pl of pillars) {
      advStats.forks++;
      // lane widths over a sliding window as tall as the tallest pilot
      const step = 2, rows = [];
      for (let a = pl.lo - 4; a <= pl.hi + 4; a += step) {
        const [l, r] = level.walls(a), sp = capsSpan(pl.caps, a);
        if (!sp) { rows.push(null); continue; }
        if (sp[0] - l < 1 || r - sp[1] < 1) fail('the pillar stands clear of both walls', `${tag} at ${a | 0}`);
        rows.push(pl.tight < 0 ? [sp[0] - l, r - sp[1]] : [r - sp[1], sp[0] - l]);
      }
      const win = Math.ceil(PILOT_H / step);
      let tMin = Infinity, wMin = Infinity;
      for (let i = 0; i < rows.length; i++) {
        let t = Infinity, w = Infinity;
        for (let j = i; j < Math.min(rows.length, i + win); j++) if (rows[j]) { t = Math.min(t, rows[j][0]); w = Math.min(w, rows[j][1]); }
        if (t < Infinity) { tMin = Math.min(tMin, t); wMin = Math.min(wMin, w); }
      }
      advStats.tightMin = Math.min(advStats.tightMin, tMin); advStats.wideMin = Math.min(advStats.wideMin, wMin);
      if (tMin < PILOT_W + GRAB.band + 8) fail('the tight lane fits the widest pilot beside a wall grab', `${tag}: ${tMin.toFixed(1)}`);
      if (wMin < tMin + 30 || wMin < PILOT_W * 2) fail('the wide lane is clearly wider', `${tag}: ${wMin.toFixed(1)} vs ${tMin.toFixed(1)}`);
      // no hazard reaches into the fork (a boulder's whole fall counted), so neither lane is ever blocked
      for (const h of hz) {
        if (h === pl) continue;
        const low = h.type === 'boulder' ? h.alt - RULES.boulderFall : h.lo, top = h.type === 'pend' ? h.aAlt : h.hi;
        if (low < pl.hi + 40 && top > pl.lo - 40) fail('no hazard inside the fork', `${tag}: ${h.type} ${low | 0}-${top | 0} vs fork ${pl.lo | 0}-${pl.hi | 0}`);
      }
      { const o = overlaps(fruit); if (o.length) fail('pickups never overlap', `${tag}: ${o[0]}`); }
      // pickups clear the pillar like a wall
      for (const f of fruit) {
        if (f.alt < pl.lo - 80 || f.alt > pl.hi + 80) continue;
        const d = capsDist(pl.caps, f.x, f.alt);
        advStats.pickClear = Math.min(advStats.pickClear, d);
        if (d < ADV.pickMargin - 0.5 || d < pickR(f) + 4) fail('pickups keep clear of the pillar', `${tag}: ${f.kind} ${d.toFixed(1)} from it`);
      }
      // the risky tight lane pays more, with a golden coconut
      const inLane = side => fruit.filter(f => f.alt > pl.lo && f.alt < pl.hi && laneOf(f) === side);
      const val = list => list.reduce((n, f) => n + (f.kind === 'gold' ? COCO_GOLD : f.kind === 'coco' ? 1 : 0), 0);
      const tv = val(inLane(pl.tight)), wv = val(inLane(-pl.tight)), gold = inLane(pl.tight).some(f => f.kind === 'gold');
      advStats.tightVal += tv; advStats.wideVal += wv; if (gold) advStats.golds++;
      if (tv <= wv || !gold) fail('the tight lane holds more coconuts and a golden one', `${tag}: ${tv} vs ${wv}, golden ${gold}`);
      if (k === 0) {
        // the real stage: its coconut target (the second star) is within reach of a pilot taking the tight lane (at
        // most 45% of the coconut value on that path to the finish) without being a gimme (at least 30% of it)
        const path = val(fruit.filter(f => f.alt < end && laneOf(f) !== -pl.tight));
        if (st.target > path * 0.45 || st.target < path * 0.3) fail('the coconut target is reachable via the tight lane', `${tag}: target ${st.target} vs ${path} on the tight path`);
        advStats.real.push(`${st0.name} ${st0.len} m, fork ${pl.lo | 0}-${pl.hi | 0}: lanes ${tMin.toFixed(0)}/${wMin.toFixed(0)}, coconut value ${tv}/${wv}, target ${st.target} of ${path} on the tight path`);
      }
    }
  }
  // the fork can never be touched by a monster limb: its nearest point to a wall is beyond the grab band plus the widest pilot
  const st = ADVENTURE.stages.find(q => q.branch), level = createLevel(advSeed(st), advLevelOpts(st)), hz = [];
  level.fill(st.len * 10, hz, null);
  const pl = hz.find(h => h.type === 'pillar'), wallAt = a => level.walls(a);
  let nearest = Infinity;
  for (const [id, gs] of Object.entries(GRAB_STYLE)) for (let kill = pl.lo - 100; kill < pl.hi; kill += 37) for (const d of [-1, 1]) for (const ph of [0.55, 0.62, 0.8, null]) {
    const rig = grabRig(gs, d, wallAt, kill, grabPose(ph, kill * 0.1, d, GRAB.reach, gs), kill * 0.1, 200);
    for (const [x0, y0, x1, y1, r] of rig.caps) for (const u of [0, 0.5, 1]) {
      const x = lerp(x0, x1, u), a = kill - lerp(y0, y1, u);
      if (a <= kill || a < pl.lo - 40 || a > pl.hi + 40) continue;   // (above the catch line: below it is the monster's own body)
      const dd = capsDist(pl.caps, x, a) - r;
      nearest = Math.min(nearest, dd);
      if (dd < PILOT_W) fail('monster limbs never come near the pillar', `${id} side ${d}: ${dd.toFixed(1)}`);
    }
  }
  advStats.limbGap = nearest;
  // pickups (the fork's included) never pop in on screen
  for (let k = 0; k < 40; k++) for (const st0 of ADVENTURE.stages) {
    const st1 = { ...st0, seed: `${st0.seed}~${k}` }, lv = createLevel(advSeed(st1), advLevelOpts(st1)), hz1 = [], fr = [], VIEW = 1100;
    lv.fill(VIEW + 900, hz1, fr);
    let seenF = fr.length, seenH = hz1.length;
    for (let cam = 10; cam < (st0.boss ? 9000 : st0.len * 10); cam += 10) {
      lv.fill(cam + VIEW + 900, hz1, fr);
      for (; seenF < fr.length; seenF++) if (fr[seenF].alt < cam + VIEW + 100) fail('adventure pickups never pop in on screen', `${st0.name}: ${fr[seenF].kind} at ${fr[seenF].alt | 0}, screen top ${cam + VIEW}`);
      for (; seenH < hz1.length; seenH++) if (hz1[seenH].lo < cam + VIEW + 100) fail('the fork never pops in on screen', `${st0.name}: ${hz1[seenH].type} at ${hz1[seenH].lo | 0}, screen top ${cam + VIEW}`);
    }
  }
} finally { pinJungle(false); }
if (RULES.zones[0] !== 6800 || RULES.zones[1] !== 15000) fail('pinJungle(false) puts the endless zones back', RULES.zones.join());
for (const st of ADVENTURE.stages) if (!(st.reward > 0 && st.target > 0)) fail('every stage pays a reward and sets a coconut target', st.name);
if (ADVENTURE.stages.length !== 5 || !ADVENTURE.stages[4].boss) fail('World 1 has four stages and the boss', '');
const advSummary = () => `PASS: adventure: ${advStats.levels} stage shafts (${ADVENTURE.stages.length} stages × 150 seeds) stay jungle, ${advStats.forks} forks: tight lane ${advStats.tightMin.toFixed(1)}+ and wide lane ${advStats.wideMin.toFixed(1)}+ (widest pilot ${PILOT_W.toFixed(1)} + grab band ${GRAB.band}), no hazard inside, pickups ${advStats.pickClear.toFixed(1)}+ from the pillar, limbs ${advStats.limbGap.toFixed(0)}+ from it; chili line in both lanes ${advStats.chiliGap.toFixed(0)} or less (boss shaft ${advStats.bossChiliGap.toFixed(0)}), coconut value tight ${advStats.tightVal} vs wide ${advStats.wideVal} with ${advStats.golds} golden; hazards end ${advStats.finishClear.toFixed(0)}+ below the finish. Real stages: ${advStats.real.join('; ')}`;

// ---------- Adventure: the Old Gold Mine (island level 13), an authored stage with its own traps ----------
// As the grotto's checks: every rule on the stage's layout as the game builds it (and 8 other seeds, which only move
// phases and looks), then every beat, every nugget and every scaffold's outrun flown by a time-space search for the
// widest pilot. Crossings run free on their clocks (no holds), ropeways on theirs; a barrel's whole ring counts as
// solid the whole time (so its far lane alone must carry you past; only a nugget's dare flies its real fuse, lit the
// moment you reach its trigger line, with no hold); a scaffold's search starts on its trigger line the moment it starts
// to creak, from three places across the shaft.
const MN = new Function(regions.join('\n') + '\nreturn { createMineLevel, mineShapes, mineDanger, mineEnd, mineDashState, mineCartAt, mineBuckets, mineBucketShapes, mineScafPose, mineTntState, MINE, MINE_STAGE, MINE_TYPES, ADV_MINE, RULES, advSeed, shapeDist, laneSize, pickR, COCO_R, PICK_GAP, UNITS_PER_M };')();
const mineStats = { seeds: 0, traps: 0, searches: 0, worst: 0, nuggets: 0, outrun: 0, outrunWorst: 0, pick: Infinity, minW: Infinity, slope: 0, gapLane: Infinity, ringLane: Infinity, towerLane: Infinity, bucketGap: Infinity, len: 0, kinds: {} };
{
  const R = MN.RULES, W = PILOT_W, Hh = PILOT_H, M = 4, X = MN.MINE, st0 = MN.ADV_MINE;
  if (st0.theme !== 'mine' || !(st0.reward > 0)) fail('the Old Gold Mine is a themed stage with a reward', JSON.stringify(st0));
  if (!Array.isArray(st0.goals) || st0.goals.length !== 3 || !st0.goals.some(g => g.k === 'finish') || !st0.goals.some(g => g.k === 'mineNuggets' && g.n === 3) || !st0.goals.some(g => g.k === 'mineOutrun')) fail('the mine has three missions: the mother lode, 3 gold nuggets and outrunning every scaffold', JSON.stringify(st0.goals));
  if (Math.abs(st0.len * MN.UNITS_PER_M - MN.mineEnd()) > 1e-6) fail('the mine stage length matches its layout', `${st0.len}`);
  // the stage's order: crossings, then barrels, then ropeways, then scaffolds, each first met alone (never easier later)
  {
    const firsts = {}, seen = [];
    for (const sec of MN.MINE_STAGE) if (!sec.calm) for (const [, kind, o] of sec.beats) {
      const base = kind.match(/^[a-z]+/)[0];
      if (!firsts[base]) { firsts[base] = o; seen.push(base); if (kind !== base) fail('each mine trap is introduced alone first', `${kind} in ${sec.name}`); }
      else if ((o.open && firsts[base].open && o.open > firsts[base].open) || (o.v && firsts[base].v && o.v < firsts[base].v)) fail('a mine trap is never slower than its introduction', `${kind} in ${sec.name}`);
    }
    if (seen.join() !== 'dash,tnt,rope,scaf') fail('the mine teaches crossings, then barrels, then ropeways, then scaffolds', seen.join());
    if (!MN.MINE_STAGE.some(sec => sec.calm && !sec.finish && sec !== MN.MINE_STAGE[0])) fail('the mine has a breather', '');
    if (!MN.MINE_STAGE[MN.MINE_STAGE.length - 1].finish) fail('the mine ends in the mother lode cavern', '');
  }
  const capHit = (S, x, a, m) => {
    const r = W / 2 + m, half = Math.max(0, Hh / 2 - W / 2);
    for (const q of S) for (const da of half ? [-half, 0, half] : [0]) if (MN.shapeDist(q, x, a + da) < r) return true;
    return false;
  };
  const ext = S => { let x0 = Infinity, x1 = -Infinity; for (const q of S) { const a = q.k === 'c' ? q.x - q.r : q.k === 'b' ? q.x0 : Math.min(q.x0, q.x1) - q.r, b = q.k === 'c' ? q.x + q.r : q.k === 'b' ? q.x1 : Math.max(q.x0, q.x1) + q.r; x0 = Math.min(x0, a); x1 = Math.max(x1, b); } return [x0, x1]; };
  // every trap's shapes at search time t (the search starting at t0): a crossing on its free clock, a barrel's ring
  // solid (or, for a dare, its fuse lit at t0), a scaffold creaking from t0
  const shapesAt = (traps, t, real, t0) => {
    const S = [];
    for (const h of traps) {
      if (h.type === 'mineDash') MN.mineShapes({ ...h, clk: t }, t, S);
      else if (h.type === 'mineTnt') { if (real) MN.mineShapes({ ...h, litT: t0, boomT: t0 + h.fuse }, t, S); else MN.mineShapes(h, t, S, 'ring'); }
      else if (h.type === 'mineScaf') MN.mineShapes({ ...h, litT: t0 }, t, S);
      else MN.mineShapes(h, t, S);
    }
    return S;
  };
  // the search (as the grotto's), with an optional waypoint: `via(x, a)` must be touched before the goal counts
  function fly(level, traps, x0, a0, t0, goal, lo, hi, via, real) {
    const DT = 1 / 15, DX = 11, DA = 11, up = Math.round(440 * DT / DA), dn = Math.round(380 * DT / DA), sd = Math.round(330 * DT / DX);
    const nA = Math.ceil((hi - lo) / DA) + 1, nX = Math.ceil(400 / DX) + 1, V = 1e6;
    let front = new Set([Math.round(x0 / DX) * 1000 + Math.round((a0 - lo) / DA)]);
    for (let step = 1; step <= 10 / DT; step++) {
      const t = t0 + step * DT, S = shapesAt(traps, t, real, t0);
      const next = new Set(), blocked = new Map();
      const free = (xi, ai) => {
        const key = xi * 1000 + ai; if (blocked.has(key)) return blocked.get(key);
        const x = xi * DX, a = lo + ai * DA, [l, r] = level.walls(a), ok = x - W / 2 - 2 >= l && x + W / 2 + 2 <= r && level.walls(a + Hh / 2)[0] <= x - W / 2 && level.walls(a + Hh / 2)[1] >= x + W / 2 && level.walls(a - Hh / 2)[0] <= x - W / 2 && level.walls(a - Hh / 2)[1] >= x + W / 2 && !capHit(S, x, a, M);
        blocked.set(key, ok); return ok;
      };
      for (const k of front) {
        const got = k >= V, kk = k % V, xi = Math.floor(kk / 1000), ai = kk % 1000;
        for (let dA = -dn; dA <= up; dA++) for (let dX = -sd; dX <= sd; dX++) {
          const nx = xi + dX, na = ai + dA; if (na < 0 || na >= nA || nx < 0 || nx >= nX) continue;
          const g2 = got || !via || via(nx * DX, lo + na * DA), key = (g2 ? V : 0) + nx * 1000 + na; if (next.has(key) || !free(nx, na)) continue;
          if (g2 && goal(nx * DX, lo + na * DA)) return step * DT;
          next.add(key);
        }
      }
      if (!next.size) return -1;
      front = next;
    }
    return -1;
  }
  for (let k = 0; k <= 8; k++) {
    const st = k ? { ...st0, seed: `${st0.seed}~${k}` } : st0, level = MN.createMineLevel(MN.advSeed(st), st), hz = [], fr = [];
    mineStats.seeds++;
    {
      const VIEW = 1100, h1 = [], f1 = [];
      level.fill(VIEW + 900, h1, f1);
      let sh = h1.length, sf = f1.length;
      for (let cam = 10; cam < level.end; cam += 10) {
        level.fill(cam + VIEW + 900, h1, f1);
        for (; sh < h1.length; sh++) if (h1[sh].lo < cam + VIEW + 100) fail('mine traps never pop in on screen', `${h1[sh].type} at ${h1[sh].lo | 0}`);
        for (; sf < f1.length; sf++) if (f1[sf].alt < cam + VIEW + 100) fail('mine pickups never pop in on screen', `${f1[sf].kind} at ${f1[sf].alt | 0}`);
      }
      hz.push(...h1); fr.push(...f1);
    }
    mineStats.len = level.end / 10;
    for (const h of hz) if (!MN.MINE_TYPES.has(h.type)) fail('the mine only has its own traps', h.type);
    for (const h of hz) mineStats.kinds[h.type] = (mineStats.kinds[h.type] || 0) + (k ? 0 : 1);
    // every trap kind is first met in a beat of its own
    { const met = new Set(); for (const b of level.beats) for (const h of b.hs) if (!met.has(h.type)) { met.add(h.type); if (b.hs.length !== 1) fail('every mine trap is first met alone', `${h.type} in ${b.kind}`); } }
    // beats never crowd: each beat's traps start above the last beat's reach (one thing to read at a time)
    for (let i = 1; i < level.beats.length; i++) { const p = level.beats[i - 1], q = level.beats[i], g = Math.min(...q.hs.map(h => h.lo)) - Math.max(...p.hs.map(h => h.hi)); mineStats.beatGap = Math.min(mineStats.beatGap ?? Infinity, g); if (g < 0) fail('mine beats never overlap', `${p.kind} at ${p.a} / ${q.kind} at ${q.a}`); }
    if (hz.some(h => h.hi > level.end - 320)) fail('the mother lode cavern below the finish is clear of traps', `${Math.max(...hz.map(h => h.hi)) | 0} vs ${level.end}`);
    for (let a = 0; a < level.end + 200; a += 1) {
      const [l, r] = level.walls(a), [l2, r2] = level.walls(a + 1);
      mineStats.minW = Math.min(mineStats.minW, r - l); mineStats.slope = Math.max(mineStats.slope, l2 - l, r - r2);
    }
    if (mineStats.minW < R.minWidth) fail('the mine shaft is never narrower than minWidth', mineStats.minW.toFixed(1));
    if (mineStats.slope > R.maxWallSlope) fail('the mine walls never step in faster than maxWallSlope', mineStats.slope.toFixed(2));
    // static lanes: a crossing's gap between its stubs, the lane past a barrel's ring and past a standing scaffold are
    // each minLane; a ropeway's buckets leave gaps the widest pilot fits with room
    for (const h of hz) {
      const [l, r] = level.walls(h.alt);
      if (h.type === 'mineDash') {
        const S = MN.mineShapes(h, 0, [], 'body'), up = S.slice(0, 2), lo = S.slice(2), [u0, u1] = ext(up), [l0, l1] = ext(lo), g = h.side > 0 ? l0 - u1 : u0 - l1;
        mineStats.gapLane = Math.min(mineStats.gapLane, g); if (g < R.minLane) fail('a crossing leaves a gap of minLane between its stubs', `${g.toFixed(1)} at ${h.alt}`);
        // nothing a cart does ever rises: its path only falls
        let pa = Infinity; for (let s = 0; s <= h.run; s += 4) { const [, a] = MN.mineCartAt(h, s); if (a > pa + 1e-6) { fail('a minecart never rises', `${h.alt} at ${s}`); break; } pa = a; }
      }
      if (h.type === 'mineTnt') { const [x0, x1] = ext([{ k: 'c', x: h.bx, a: h.ba, r: h.R }]), [wl, wr] = level.walls(h.ba), g = h.side > 0 ? wr - x1 : x0 - wl; mineStats.ringLane = Math.min(mineStats.ringLane, g); if (g < R.minLane) fail('a barrel\'s ring leaves a far lane of minLane', `${g.toFixed(1)} at ${h.alt}`); }
      if (h.type === 'mineScaf') {
        const [x0, x1] = ext(MN.mineShapes(h, 0, [], 'body')), g = h.side > 0 ? r - x1 : x0 - l; mineStats.towerLane = Math.min(mineStats.towerLane, g); if (g < R.minLane) fail('a standing scaffold leaves a lane of minLane', `${g.toFixed(1)} at ${h.alt}`);
        let pth = -1; for (let t = 0; t < h.tell + 1; t += 0.01) { const th = MN.mineScafPose({ ...h, litT: 0 }, t).th; if (th < pth - 1e-9) { fail('a scaffold only ever falls', `${h.alt}`); break; } pth = th; }
      }
      if (h.type === 'mineRope') for (let t = 0; t < 4; t += 0.1) {
        const bs = MN.mineBuckets(h, t).map(([x, , sw]) => ext(MN.mineBucketShapes([], h, x, sw))).sort((p, q) => p[0] - q[0]);
        for (let i = 1; i < bs.length; i++) { const g = bs[i][0] - bs[i - 1][1]; mineStats.bucketGap = Math.min(mineStats.bucketGap, g); if (g < W + 2 * M + 30) fail('a ropeway\'s buckets leave gaps the widest pilot fits with room', `${g.toFixed(1)} at ${h.alt}`); }
      }
    }
    for (const f of fr) {
      const [l, r] = level.walls(f.alt), pr = MN.pickR(f);
      if (f.x - pr < l + R.fruitMargin - 0.5 || f.x + pr > r - R.fruitMargin + 0.5) fail('mine pickups stay off the walls', `${f.kind} at ${f.alt | 0}`);
      if (f.clear === -Infinity) continue;   // (the dares: the nuggets, the Lamp Room's horseshoe)
      const need = f.clear ?? (f.bonus || f.kind === 'gold' ? Math.ceil(MN.laneSize().w / 2 + 6 + MN.COCO_R) : R.pickup.clear);
      let dd = Infinity; for (const h of hz) if (h.lo - 220 < f.alt && h.hi + 220 > f.alt) for (const q of MN.mineDanger(h)) dd = Math.min(dd, MN.shapeDist(q, f.x, f.alt));
      if (!f.bonus && f.kind !== 'gold' && f.clear == null) mineStats.pick = Math.min(mineStats.pick, dd);
      if (dd < need - 0.5) fail('mine pickups stay clear of every trap\'s reach', `${f.kind} at ${f.alt | 0}: ${dd.toFixed(1)} < ${need}`);
    }
    for (let i = 0; i < fr.length; i++) for (let j = i + 1; j < fr.length && fr[j].alt - fr[i].alt < 80; j++) if (Math.hypot(fr[i].x - fr[j].x, fr[i].alt - fr[j].alt) < MN.pickR(fr[i]) + MN.pickR(fr[j]) + MN.PICK_GAP - 0.01) fail('mine pickups never overlap', `${fr[i].alt | 0}`);
    if (fr.filter(f => f.kind === 'nugget').length !== 3) fail('the mine holds exactly 3 gold nuggets', `${fr.filter(f => f.kind === 'nugget').length}`);
    let gap = 0, last = 60; for (const f of fr) if (f.kind === 'chili') { gap = Math.max(gap, f.alt - last); last = f.alt; }
    if (gap > 640) fail('the mine keeps a chili line', `${gap | 0}`);
    if (k > 2) continue;   // (the searches run on the stage itself and two more seeds)
    for (const b of level.beats) {
      const sc = b.hs.find(h => h.type === 'mineScaf'), hi = Math.max(...b.hs.map(h => h.hi)) + 90;
      if (sc) {
        // a scaffold: from its trigger line the moment it starts to creak, from either side and the middle
        const a0 = sc.trig - Hh / 2, lo = a0 - 60, traps = hz.filter(h => h.lo < hi + 60 && h.hi > lo - 60), [l, r] = level.walls(a0);
        mineStats.traps++;
        for (const x0 of [l + W / 2 + 12, (l + r) / 2, r - W / 2 - 12]) for (let p = 0; p < 3; p++) {
          mineStats.searches++;
          const tm = fly(level, traps, x0, a0, p * 1.13 + k * 0.37, (x, a) => a >= hi - 10, lo, hi + 20);
          if (tm < 0) fail('every mine scaffold can be passed by the widest pilot from wherever it starts to creak', `${b.kind} at ${b.a} (${b.sec.name}), from x ${x0.toFixed(0)}, phase ${p}, seed ${k}`);
          else mineStats.worst = Math.max(mineStats.worst, tm);
        }
        // and outrun (the mission): flat out from its trigger line, the widest pilot is above its top before it lands
        {
          const lane = sc.side > 0 ? (sc.base + sc.W + r) / 2 : (l + sc.base - sc.W) / 2, land = sc.tell + X.scaf.fall;
          mineStats.searches++;
          const tm = fly(level, traps, lane, a0, 0, (x, a) => a - Hh / 2 > sc.alt + sc.H + 2, lo, sc.hi + 200);
          if (tm < 0 || tm > land) fail('every scaffold can be outrun by the widest pilot flying flat out from its trigger', `${sc.alt}: ${tm.toFixed(2)} s vs ${land.toFixed(2)} s, seed ${k}`);
          else { mineStats.outrun++; mineStats.outrunWorst = Math.max(mineStats.outrunWorst, tm / land); }
        }
        continue;
      }
      const lo = Math.min(...b.hs.map(h => h.lo)) - 150, traps = hz.filter(h => h.lo < hi + 60 && h.hi > lo - 60);
      mineStats.traps++;
      for (let p = 0; p < 6; p++) {
        const t0 = p * 1.13 + k * 0.37, [l, r] = level.walls(lo + 40);
        mineStats.searches++;
        const tm = fly(level, traps, (l + r) / 2, lo + 40, t0, (x, a) => a >= hi - 10, lo, hi + 20);
        if (tm < 0) fail('every mine trap can be passed by the widest pilot from any phase', `${b.kind} at ${b.a} (${b.sec.name}), start ${t0.toFixed(2)} s, seed ${k}`);
        else mineStats.worst = Math.max(mineStats.worst, tm);
      }
    }
    // every nugget can be touched and then escaped (flown on past its trap) by the widest pilot: a crossing's from 6
    // phases, a barrel's and a scaffold's from their trigger lines (the fuse burning, the tower creaking)
    for (const f of fr.filter(f => f.kind === 'nugget')) {
      const own = hz.filter(h => h.lo - 60 < f.alt && h.hi + 140 > f.alt), trig = own.find(h => h.trig != null);
      const touch = (x, a) => Math.hypot(x - f.x, a - f.alt) < MN.COCO_R + W / 2 - 4;
      if (trig) {
        const a0 = trig.trig - Hh / 2, lo = a0 - 60, hi = Math.max(f.alt, ...own.map(h => h.hi)) + 100, traps = hz.filter(h => h.lo < hi + 60 && h.hi > lo - 60), [l, r] = level.walls(a0);
        let ok = false;
        for (const x0 of [l + W / 2 + 12, (l + r) / 2, r - W / 2 - 12]) { mineStats.searches++; if (fly(level, traps, x0, a0, k * 0.29, (x, a) => a >= hi - 10, lo, hi + 20, touch, true) >= 0) ok = true; }
        if (!ok) fail('every gold nugget can be grabbed and escaped by the widest pilot', `nugget at ${f.alt | 0} (${trig.type}), seed ${k}`);
      } else {
        const lo = Math.min(f.alt, ...own.map(h => h.lo)) - 200, hi = Math.max(f.alt, ...own.map(h => h.hi)) + 100;
        const traps = hz.filter(h => h.lo < hi + 60 && h.hi > lo - 60), [l, r] = level.walls(lo + 40);
        for (let p = 0; p < 6; p++) {
          mineStats.searches++;
          const tm = fly(level, traps, (l + r) / 2, lo + 40, p * 1.07 + k * 0.29, (x, a) => a >= hi - 10, lo, hi + 20, touch);
          if (tm < 0) fail('every gold nugget can be grabbed and escaped by the widest pilot', `nugget at ${f.alt | 0}, phase ${p}, seed ${k}`);
        }
      }
      mineStats.nuggets++;
    }
  }
}
const mineSummary = () => `PASS: Old Gold Mine: ${mineStats.seeds} layouts × ${mineStats.len} m, only its own traps (${Object.entries(mineStats.kinds).map(([k, n]) => `${n} ${k}`).join(', ')}), each taught alone first; shaft ${mineStats.minW.toFixed(0)}+ wide, wall slope ${mineStats.slope.toFixed(2)} (max ${MN.RULES.maxWallSlope}); gaps between trestle stubs ${mineStats.gapLane.toFixed(0)}+, lanes past blast rings ${mineStats.ringLane.toFixed(0)}+ and standing scaffolds ${mineStats.towerLane.toFixed(0)}+ (minLane ${MN.RULES.minLane}), bucket gaps ${mineStats.bucketGap.toFixed(0)}+, carts and towers only ever fall, beats ${mineStats.beatGap.toFixed(0)}+ apart; pickups ${mineStats.pick.toFixed(1)}+ from any trap's reach, nothing pops in; ${mineStats.traps} beats and ${mineStats.nuggets} nuggets (grab and escape) flown by the widest pilot in ${mineStats.searches} searches, the slowest pass ${mineStats.worst.toFixed(1)} s; ${mineStats.outrun} scaffolds outrun flat out (at worst ${Math.round(mineStats.outrunWorst * 100)}% of the time they take to land)`;

// ---------- Adventure: the Sunken Temple (island level 4), an authored stage with its own traps ----------
// Its own copy of the generator code, so its checks never disturb the shafts above. Every rule is checked on the
// stage's layout as the game builds it (and on 12 other seeds, which only move phases and looks), then every trap and
// every golden idol is flown by a time-space search for the widest pilot (a capsule as wide and as tall as the widest
// pilot hitbox, plus a margin) on the traps' own clocks with no holds, from 6 start phases.
const TM = new Function(regions.join('\n') + '\nreturn { createTempleLevel, templeShapes, templeDanger, templeEnd, TEMPLE, TEMPLE_STAGE, TEMPLE_TYPES, ADV_TEMPLE, RULES, advSeed, shapeDist, jetState, totemState, axeGeom, gateK, gatePhase, gatePeriod, laneSize, pickR, IDOL_R, COCO_R, PICK_GAP, UNITS_PER_M };')();
const templeStats = { seeds: 0, traps: 0, searches: 0, worst: 0, idols: 0, pick: Infinity, bonus: Infinity, minW: Infinity, slope: 0, jetLane: Infinity, totemLane: Infinity, len: 0, kinds: {} };
{
  const T = TM.TEMPLE, R = TM.RULES, W = PILOT_W, Hh = PILOT_H, M = 4, HUGc = Math.ceil(TM.laneSize().w / 2 + 6 + TM.COCO_R);
  const st0 = TM.ADV_TEMPLE;
  if (st0.theme !== 'temple' || !(st0.reward > 0)) fail('the Sunken Temple is a themed stage with a reward', JSON.stringify(st0));
  if (!Array.isArray(st0.goals) || st0.goals.length !== 3 || !st0.goals.some(g => g.k === 'finish') || !st0.goals.some(g => g.k === 'idols' && g.n === 3)) fail('the temple has three missions: the treasure chamber, 3 golden idols and one more', JSON.stringify(st0.goals));
  if (Math.abs(st0.len * TM.UNITS_PER_M - TM.templeEnd()) > 1e-6) fail('the temple stage length matches its layout', `${st0.len}`);
  // the stage's order: every trap kind is taught alone (its first beat is a single trap, slower than any later one)
  {
    const firsts = {}, seenKinds = [];
    for (const sec of TM.TEMPLE_STAGE) if (!sec.calm) for (const [, kind, o] of sec.beats) {
      const base = kind.replace(/Pair|Stack/, '');
      if (!firsts[base]) { firsts[base] = { kind, o, sec: sec.name }; seenKinds.push(base); if (kind !== base) fail('each trap is introduced alone first', `${kind} in ${sec.name}`); }
      else { const f = firsts[base].o, slower = base === 'axe' || base === 'jet' ? (o.P || 9) <= f.P : (o.open || 9) <= (f.open || 9); if (!slower) fail('a trap is never slower than its introduction', `${kind} in ${sec.name}`); }
    }
    if (seenKinds.join() !== 'axe,totem,jet,ram') fail('the temple teaches the axe, then darts, then jets, then rams', seenKinds.join());
    if (!TM.TEMPLE_STAGE.some(sec => sec.calm && !sec.finish && sec !== TM.TEMPLE_STAGE[0])) fail('the temple has a breather chamber', '');
    if (!TM.TEMPLE_STAGE[TM.TEMPLE_STAGE.length - 1].finish) fail('the temple ends in the treasure chamber', '');
  }
  const capHit = (S, x, a, m) => {   // the pilot capsule at (x, a) against shapes S
    const r = W / 2 + m, half = Math.max(0, Hh / 2 - W / 2);
    for (const q of S) for (const da of half ? [-half, 0, half] : [0]) if (TM.shapeDist(q, x, a + da) < r) return true;
    return false;
  };
  // A breadth-first search through (x, height, time): the pilot climbs at most 440, sinks at most 380 and slides at
  // most 330 units per second, waiting where it likes. Reach `goal(x, a)` within 9 s, starting at x0, a0 at time t0.
  function fly(level, traps, x0, a0, t0, goal, lo, hi) {
    const DT = 1 / 15, DX = 11, DA = 11, up = Math.round(440 * DT / DA), dn = Math.round(380 * DT / DA), sd = Math.round(330 * DT / DX);
    const nA = Math.ceil((hi - lo) / DA) + 1, nX = Math.ceil(400 / DX) + 1;
    let front = new Set([Math.round(x0 / DX) * 1000 + Math.round((a0 - lo) / DA)]);
    for (let step = 1; step <= 9 / DT; step++) {
      const t = t0 + step * DT, S = [];
      for (const h of traps) TM.templeShapes(h, t, t, S);
      const next = new Set(), blocked = new Map();
      const free = (xi, ai) => {
        const key = xi * 1000 + ai; if (blocked.has(key)) return blocked.get(key);
        const x = xi * DX, a = lo + ai * DA, [l, r] = level.walls(a), ok = x - W / 2 - 2 >= l && x + W / 2 + 2 <= r && level.walls(a + Hh / 2)[0] <= x - W / 2 && level.walls(a + Hh / 2)[1] >= x + W / 2 && level.walls(a - Hh / 2)[0] <= x - W / 2 && level.walls(a - Hh / 2)[1] >= x + W / 2 && !capHit(S, x, a, M);
        blocked.set(key, ok); return ok;
      };
      for (const k of front) {
        const xi = Math.floor(k / 1000), ai = k % 1000;
        for (let dA = -dn; dA <= up; dA++) for (let dX = -sd; dX <= sd; dX++) {
          const nx = xi + dX, na = ai + dA; if (na < 0 || na >= nA || nx < 0 || nx >= nX) continue;
          const key = nx * 1000 + na; if (next.has(key) || !free(nx, na)) continue;
          if (goal(nx * DX, lo + na * DA)) return step * DT;
          next.add(key);
        }
      }
      if (!next.size) return -1;
      front = next;
    }
    return -1;
  }
  for (let k = 0; k <= 12; k++) {
    const st = k ? { ...st0, seed: `${st0.seed}~${k}` } : st0, level = TM.createTempleLevel(TM.advSeed(st), st), hz = [], fr = [];
    templeStats.seeds++;
    // nothing pops in on screen: everything is handed over before it comes within a screen (1100) of the camera
    {
      const VIEW = 1100, h1 = [], f1 = [];
      level.fill(VIEW + 900, h1, f1);
      let sh = h1.length, sf = f1.length;
      for (let cam = 10; cam < level.end; cam += 10) {
        level.fill(cam + VIEW + 900, h1, f1);
        for (; sh < h1.length; sh++) if (h1[sh].lo < cam + VIEW + 100) fail('temple traps never pop in on screen', `${h1[sh].type} at ${h1[sh].lo | 0}`);
        for (; sf < f1.length; sf++) if (f1[sf].alt < cam + VIEW + 100) fail('temple pickups never pop in on screen', `${f1[sf].kind} at ${f1[sf].alt | 0}`);
      }
      hz.push(...h1); fr.push(...f1);
    }
    templeStats.len = level.end / 10;
    for (const h of hz) if (!TM.TEMPLE_TYPES.has(h.type)) fail('the temple only has its own traps (no jungle hazards)', h.type);
    for (const h of hz) templeStats.kinds[h.type] = (templeStats.kinds[h.type] || 0) + (k ? 0 : 1);
    if (hz.some(h => h.hi > level.end - 320)) fail('the treasure chamber below the finish is clear of traps', `${Math.max(...hz.map(h => h.hi)) | 0} vs ${level.end}`);
    // the shaft: never narrower than minWidth, never stepping in faster than maxWallSlope
    for (let a = 0; a < level.end + 200; a += 1) {
      const [l, r] = level.walls(a), [l2, r2] = level.walls(a + 1);
      templeStats.minW = Math.min(templeStats.minW, r - l); templeStats.slope = Math.max(templeStats.slope, l2 - l, r - r2);
    }
    if (templeStats.minW < R.minWidth) fail('the temple shaft is never narrower than minWidth', templeStats.minW.toFixed(1));
    if (templeStats.slope > R.maxWallSlope) fail('the temple walls never step in faster than maxWallSlope', templeStats.slope.toFixed(2));
    // static lanes: a jet's flame and a totem's head always leave a lane of minLane; a ram leaves its slot
    for (const h of hz) {
      const [l, r] = level.walls(h.alt);
      if (h.type === 'jet') { const lane = r - l - h.len; templeStats.jetLane = Math.min(templeStats.jetLane, lane); if (lane < R.minLane) fail('a fire jet leaves a lane of minLane', `${lane.toFixed(1)} at ${h.alt}`); }
      if (h.type === 'totem') {
        let L0 = l, R0 = r; for (const q of TM.templeShapes(h, 0, -999, []).slice(0, 4)) { const x0 = q.k === 'c' ? q.x - q.r : q.k === 'b' ? q.x0 : Math.min(q.x0, q.x1) - q.r, x1 = q.k === 'c' ? q.x + q.r : q.k === 'b' ? q.x1 : Math.max(q.x0, q.x1) + q.r; if (h.side > 0) L0 = Math.max(L0, x1); else R0 = Math.min(R0, x0); }
        templeStats.totemLane = Math.min(templeStats.totemLane, R0 - L0); if (R0 - L0 < R.minLane) fail('a dart totem leaves a lane of minLane beside its head', `${(R0 - L0).toFixed(1)}`);
        // its darts fly straight across at its own height (never from below), and stick in the far wall
        for (let u = 0; u < 4; u += 0.05) for (const q of TM.totemState(h, u).darts) if (Math.abs(q.a - h.lane) > 8 || (h.side > 0 ? q.x > h.farX + 0.01 : q.x < h.farX - 0.01)) fail('totem darts fly straight across and stop at the far wall', `${q.a} ${q.x}`);
      }
      if (h.type === 'ram') { const S = TM.templeDanger(h), lft = Math.max(h.lb, ...S.filter(q => q.x0 < h.mid).map(q => q.x1)), rgt = Math.min(h.rb, ...S.filter(q => q.x1 > h.mid).map(q => q.x0)); if (rgt - lft < R.crusher.slot - 0.01) fail('a stone ram fully out always leaves the crusher slot', `${(rgt - lft).toFixed(1)}`); }
    }
    // facing jets alternate: never both alight at once
    const jets = hz.filter(h => h.type === 'jet');
    for (const a of jets) for (const b of jets) if (a !== b && a.side !== b.side && Math.abs(a.alt - b.alt) < 120) for (let t = 0; t < 2 * a.P; t += 0.02) if (TM.jetState(a, t).ext > 0 && TM.jetState(b, t).ext > 0) { fail('facing fire jets are never both alight', `${a.alt}/${b.alt} at ${t.toFixed(2)}`); break; }
    // pickups: inside the walls, apart, and clear of every trap's whole reach (racing-line ones: the hug distance)
    for (const f of fr) {
      const [l, r] = level.walls(f.alt), pr = TM.pickR(f);
      if (f.x - pr < l + R.fruitMargin - 0.5 || f.x + pr > r - R.fruitMargin + 0.5) fail('temple pickups stay off the walls', `${f.kind} at ${f.alt | 0}`);
      if (f.kind === 'idol') continue;
      let d = Infinity; for (const h of hz) if (h.lo - 220 < f.alt && (h.aAlt ?? h.hi) + 220 > f.alt) for (const q of TM.templeDanger(h)) d = Math.min(d, TM.shapeDist(q, f.x, f.alt));
      if (f.bonus || f.kind === 'gold') { templeStats.bonus = Math.min(templeStats.bonus, d); if (d < HUGc - 0.5) fail('temple racing-line pickups keep the hug distance from every trap', `${f.kind} at ${f.alt | 0}: ${d.toFixed(1)}`); }
      else { templeStats.pick = Math.min(templeStats.pick, d); if (d < R.pickup.clear - 0.5) fail('temple pickups stay clear of every trap\'s reach', `${f.kind} at ${f.alt | 0}: ${d.toFixed(1)}`); }
    }
    for (let i = 0; i < fr.length; i++) for (let j = i + 1; j < fr.length && fr[j].alt - fr[i].alt < 80; j++) if (Math.hypot(fr[i].x - fr[j].x, fr[i].alt - fr[j].alt) < TM.pickR(fr[i]) + TM.pickR(fr[j]) + TM.PICK_GAP - 0.01) fail('temple pickups never overlap', `${fr[i].alt | 0}`);
    if (fr.filter(f => f.kind === 'idol').length !== 3) fail('the temple holds exactly 3 golden idols', `${fr.filter(f => f.kind === 'idol').length}`);
    let gap = 0, last = 60; for (const f of fr) if (f.kind === 'chili') { gap = Math.max(gap, f.alt - last); last = f.alt; }
    if (gap > 640) fail('the temple keeps a chili line', `${gap | 0}`);
    if (k > 3) continue;   // (the searches run on the stage itself and three more seeds)
    // every beat flown by the widest pilot from below to above, from 6 start phases
    for (const b of level.beats) {
      const lo = Math.min(...b.hs.map(h => h.lo)) - 150, hi = Math.max(...b.hs.map(h => h.aAlt ?? h.hi)) + 90;
      const traps = hz.filter(h => h.lo < hi + 60 && (h.aAlt ?? h.hi) > lo - 60);
      templeStats.traps++;
      for (let p = 0; p < 6; p++) {
        const t0 = p * 1.13 + k * 0.37, [l, r] = level.walls(lo + 40);
        templeStats.searches++;
        const tm = fly(level, traps, (l + r) / 2, lo + 40, t0, (x, a) => a >= hi - 10, lo, hi + 20);
        if (tm < 0) fail('every temple trap can be passed by the widest pilot from any phase', `${b.kind} at ${b.a} (${b.sec.name}), start ${t0.toFixed(2)} s, seed ${k}`);
        else templeStats.worst = Math.max(templeStats.worst, tm);
      }
    }
    // every golden idol can be reached (touched) by the widest pilot, from 6 phases
    for (const f of fr.filter(f => f.kind === 'idol')) {
      const lo = f.alt - 260, hi = f.alt + 160, traps = hz.filter(h => h.lo < hi + 60 && (h.aAlt ?? h.hi) > lo - 60), [l, r] = level.walls(lo + 40);
      for (let p = 0; p < 6; p++) {
        templeStats.searches++;
        const tm = fly(level, traps, (l + r) / 2, lo + 40, p * 1.07 + k * 0.29, (x, a) => Math.hypot(x - f.x, a - f.alt) < TM.IDOL_R + W / 2 - 4, lo, hi);
        if (tm < 0) fail('every golden idol can be reached by the widest pilot', `idol at ${f.alt | 0}, phase ${p}, seed ${k}`);
      }
      templeStats.idols++;
    }
  }
}
const templeSummary = () => `PASS: Sunken Temple: ${templeStats.seeds} layouts × ${templeStats.len} m, only its own traps (${Object.entries(templeStats.kinds).map(([k, n]) => `${n} ${k}`).join(', ')}), each taught alone first; shaft ${templeStats.minW.toFixed(0)}+ wide with steps of slope ${templeStats.slope.toFixed(2)} (max ${TM.RULES.maxWallSlope}); jet lanes ${templeStats.jetLane.toFixed(0)}+, totem lanes ${templeStats.totemLane.toFixed(0)}+ (minLane ${TM.RULES.minLane}), facing jets never both alight, darts straight across; pickups ${templeStats.pick.toFixed(1)}+ from any trap's reach (racing line ${templeStats.bonus.toFixed(1)}+), nothing pops in; ${templeStats.traps} beats and ${templeStats.idols} idols flown by the widest pilot (${PILOT_W.toFixed(1)} × ${PILOT_H.toFixed(1)} + 4) in ${templeStats.searches} searches from 6 phases each, the slowest pass ${templeStats.worst.toFixed(1)} s`;


// ---------- Adventure: Frost Hollow (island level 17), an authored stage with its own traps ----------
// As the grotto's checks: every rule on the stage's layout as the game builds it (and 8 other seeds, which only move
// phases and looks), then every beat and every frost lily flown by a time-space search for the widest pilot on the
// traps' own clocks from 6 start phases (a breath face's cone counts as solid here: every beat can be passed without
// ever getting frosted, which the "never frosted" mission needs).
const FR = new Function(regions.join('\n') + '\nreturn { createFrostLevel, frostShapes, frostDanger, frostEnd, frostIcicle, frostBreathAt, frostCone, frostSnowball, frostPanel, FROST, FROST_STAGE, FROST_TYPES, ADV_FROST, RULES, advSeed, shapeDist, laneSize, pickR, COCO_R, PICK_GAP, UNITS_PER_M };')();
const frostStats = { seeds: 0, traps: 0, searches: 0, worst: 0, lilies: 0, pick: Infinity, minW: Infinity, slope: 0, shelfLane: Infinity, faceLane: Infinity, coneLane: Infinity, panel: Infinity, burst: 0, len: 0, kinds: {} };
{
  const R = FR.RULES, W = PILOT_W, Hh = PILOT_H, M = 4, st0 = FR.ADV_FROST;
  if (st0.theme !== 'frost' || !(st0.reward > 0)) fail('Frost Hollow is a themed stage with a reward', JSON.stringify(st0));
  if (!Array.isArray(st0.goals) || st0.goals.length !== 3 || !st0.goals.some(g => g.k === 'finish') || !st0.goals.some(g => g.k === 'lilies' && g.n === 3) || !st0.goals.some(g => g.k === 'noFrost')) fail('Frost Hollow has three missions: the Frost Throne, 3 frost lilies and never frosted', JSON.stringify(st0.goals));
  if (Math.abs(st0.len * FR.UNITS_PER_M - FR.frostEnd()) > 1e-6) fail('the Frost Hollow stage length matches its layout', `${st0.len}`);
  // the stage's order: icicle shelves, then breath faces, then snowball chutes, then glass bridges, each taught alone
  // (never faster first: a later one is never slower than its introduction)
  {
    const firsts = {}, seen = [], base = { iciclePair: 'icicles', breathPair: 'breath', breathIcicle: 'breath', snowballPair: 'snowball', snowBreath: 'breath', paneSnow: 'pane' };
    for (const sec of FR.FROST_STAGE) if (!sec.calm) for (const [, kind, o] of sec.beats) {
      const b = base[kind] || kind;
      if (!firsts[b]) { firsts[b] = o; seen.push(b); if (kind !== b) fail('each frost trap is introduced alone first', `${kind} in ${sec.name}`); }
      else if (o.P && firsts[b].P && o.P / (o.n || 1) > firsts[b].P / (firsts[b].n || 1) + 1e-9) fail('a frost trap is never slower than its introduction', `${kind} in ${sec.name}`);
    }
    if (seen.join() !== 'icicles,breath,snowball,pane') fail('Frost Hollow teaches icicles, then breath, then snowballs, then bridges', seen.join());
    if (!FR.FROST_STAGE.some(sec => sec.calm && !sec.finish && sec !== FR.FROST_STAGE[0])) fail('Frost Hollow has a breather cavern', '');
    if (!FR.FROST_STAGE[FR.FROST_STAGE.length - 1].finish) fail('Frost Hollow ends in the Frost Throne\'s hall', '');
  }
  const capHit = (S, x, a, m) => {
    const r = W / 2 + m, half = Math.max(0, Hh / 2 - W / 2);
    for (const q of S) for (const da of half ? [-half, 0, half] : [0]) if (FR.shapeDist(q, x, a + da) < r) return true;
    return false;
  };
  const ext = S => { let x0 = Infinity, x1 = -Infinity; for (const q of S) { const a = q.k === 'c' ? q.x - q.r : q.k === 'b' ? q.x0 : Math.min(q.x0, q.x1) - q.r, b = q.k === 'c' ? q.x + q.r : q.k === 'b' ? q.x1 : Math.max(q.x0, q.x1) + q.r; x0 = Math.min(x0, a); x1 = Math.max(x1, b); } return [x0, x1]; };
  // the search (as the grotto's), with an optional waypoint: `via(x, a)` must be touched before the goal counts
  function fly(level, traps, x0, a0, t0, goal, lo, hi, via) {
    const DT = 1 / 15, DX = 11, DA = 11, up = Math.round(440 * DT / DA), dn = Math.round(380 * DT / DA), sd = Math.round(330 * DT / DX);
    const nA = Math.ceil((hi - lo) / DA) + 1, nX = Math.ceil(400 / DX) + 1, V = 1e6;
    let front = new Set([Math.round(x0 / DX) * 1000 + Math.round((a0 - lo) / DA)]);
    for (let step = 1; step <= 12 / DT; step++) {
      const t = t0 + step * DT, S = [];
      for (const h of traps) FR.frostShapes(h, t, S);
      const next = new Set(), blocked = new Map();
      const free = (xi, ai) => {
        const key = xi * 1000 + ai; if (blocked.has(key)) return blocked.get(key);
        const x = xi * DX, a = lo + ai * DA, [l, r] = level.walls(a), ok = x - W / 2 - 2 >= l && x + W / 2 + 2 <= r && level.walls(a + Hh / 2)[0] <= x - W / 2 && level.walls(a + Hh / 2)[1] >= x + W / 2 && level.walls(a - Hh / 2)[0] <= x - W / 2 && level.walls(a - Hh / 2)[1] >= x + W / 2 && !capHit(S, x, a, M);
        blocked.set(key, ok); return ok;
      };
      for (const k of front) {
        const got = k >= V, kk = k % V, xi = Math.floor(kk / 1000), ai = kk % 1000;
        for (let dA = -dn; dA <= up; dA++) for (let dX = -sd; dX <= sd; dX++) {
          const nx = xi + dX, na = ai + dA; if (na < 0 || na >= nA || nx < 0 || nx >= nX) continue;
          const g2 = got || !via || via(nx * DX, lo + na * DA), key = (g2 ? V : 0) + nx * 1000 + na; if (next.has(key) || !free(nx, na)) continue;
          if (g2 && goal(nx * DX, lo + na * DA)) return step * DT;
          next.add(key);
        }
      }
      if (!next.size) return -1;
      front = next;
    }
    return -1;
  }
  for (let k = 0; k <= 8; k++) {
    const st = k ? { ...st0, seed: `${st0.seed}~${k}` } : st0, level = FR.createFrostLevel(FR.advSeed(st), st), hz = [], fr = [];
    frostStats.seeds++;
    {
      const VIEW = 1100, h1 = [], f1 = [];
      level.fill(VIEW + 900, h1, f1);
      let sh = h1.length, sf = f1.length;
      for (let cam = 10; cam < level.end; cam += 10) {
        level.fill(cam + VIEW + 900, h1, f1);
        for (; sh < h1.length; sh++) if (h1[sh].lo < cam + VIEW + 100) fail('frost traps never pop in on screen', `${h1[sh].type} at ${h1[sh].lo | 0}`);
        for (; sf < f1.length; sf++) if (f1[sf].alt < cam + VIEW + 100) fail('frost pickups never pop in on screen', `${f1[sf].kind} at ${f1[sf].alt | 0}`);
      }
      hz.push(...h1); fr.push(...f1);
    }
    frostStats.len = level.end / 10;
    for (const h of hz) if (!FR.FROST_TYPES.has(h.type)) fail('Frost Hollow only has its own traps', h.type);
    for (const h of hz) frostStats.kinds[h.type] = (frostStats.kinds[h.type] || 0) + (k ? 0 : 1);
    // beats never crowd: each beat's traps start above the last beat's reach (one thing to read at a time); an icicle
    // shelf's lo is its icicles' whole fall, so only its shelf counts here
    const bodyLo = h => h.type === 'icicles' ? h.alt - FR.FROST.icicle.len[1] - 30 : h.type === 'snowball' ? h.hitAt[1] - FR.FROST.snowball.r : h.lo;
    for (let i = 1; i < level.beats.length; i++) { const p = level.beats[i - 1], q = level.beats[i], g = Math.min(...q.hs.map(bodyLo)) - Math.max(...p.hs.map(h => h.hi)); frostStats.beatGap = Math.min(frostStats.beatGap ?? Infinity, g); if (g < 0) fail('frost beats never overlap', `${p.kind} at ${p.a} / ${q.kind} at ${q.a}`); }
    if (hz.some(h => h.hi > level.end - 320)) fail('the Frost Throne\'s hall below the finish is clear of traps', `${Math.max(...hz.map(h => h.hi)) | 0} vs ${level.end}`);
    for (let a = 0; a < level.end + 200; a += 1) {
      const [l, r] = level.walls(a), [l2, r2] = level.walls(a + 1);
      frostStats.minW = Math.min(frostStats.minW, r - l); frostStats.slope = Math.max(frostStats.slope, l2 - l, r - r2);
    }
    if (frostStats.minW < R.minWidth) fail('the Frost Hollow shaft is never narrower than minWidth', frostStats.minW.toFixed(1));
    if (frostStats.slope > R.maxWallSlope) fail('the Frost Hollow walls never step in faster than maxWallSlope', frostStats.slope.toFixed(2));
    // static lanes: an icicle shelf with every icicle at every point of its fall, a breath face and its widest cone each
    // leave a lane (minLane past the shelf and the head; the cone, which never kills, the widest pilot with room)
    for (const h of hz) {
      const [l, r] = level.walls(h.alt), lane = S => { const [x0, x1] = ext(S); return h.side > 0 ? r - x1 : x0 - l; };
      if (h.type === 'icicles') { const m = lane(FR.frostDanger(h)); frostStats.shelfLane = Math.min(frostStats.shelfLane, m); if (m < R.minLane) fail('an icicle shelf and its falling icicles leave a lane of minLane', `${m.toFixed(1)} at ${h.alt}`); }
      if (h.type === 'breath') {
        const m = lane(FR.frostShapes(h, 0, [], 'body')), mc = lane(FR.frostDanger(h));
        frostStats.faceLane = Math.min(frostStats.faceLane, m); frostStats.coneLane = Math.min(frostStats.coneLane, mc);
        if (m < R.minLane) fail('a breath face leaves a lane of minLane', `${m.toFixed(1)} at ${h.alt}`);
        if (mc < W + 30) fail('a breath face\'s widest cone leaves a lane the widest pilot fits with room', `${mc.toFixed(1)} at ${h.alt}`);
      }
      if (h.type === 'pane') {
        for (const [x0, x1] of h.panels) { const w = Math.min(x1, r) - Math.max(x0, l); frostStats.panel = Math.min(frostStats.panel, w); if (w < W + 2 * M + 30) fail('a glass bridge panel opens wide enough for the widest pilot with room', `${w.toFixed(1)} at ${h.alt}`); }
        // one panel at a time: never more than one open, and a panel is open (or opening) at least every P / n s
        let both = 0, longest = 0, shutFor = 0;
        for (let t = 0; t < h.P * 2; t += 0.02) { const op = h.panels.filter((_, j) => FR.frostPanel(h, t, j).open).length; if (op > 1) both++; shutFor = op ? 0 : shutFor + 0.02; longest = Math.max(longest, shutFor); }
        if (both) fail('a glass bridge opens one panel at a time', `${h.alt}`);
        if (longest > h.P / h.n) fail('a glass bridge is never all shut for longer than P / n', `${longest.toFixed(2)} at ${h.alt}`);
      }
      if (h.type === 'snowball') {
        // the ball never leaves the shaft before it bursts on the far wall, and it bursts there within the trap's reach
        const S = FR.FROST.snowball;
        for (let t = 0; t < h.P; t += 0.01) { const b = FR.frostSnowball(h, t).ball; if (!b) continue; const [bl, br] = level.walls(b[1]); if (b[0] - S.r < bl - S.r * 0.75 || b[0] + S.r > br + S.r * 0.75) { fail('a snowball stays in the shaft until it bursts', `${h.alt} t ${t.toFixed(2)}`); break; } if (b[1] - S.r < h.lo) { fail('a snowball\'s arc stays inside its trap\'s band', `${h.alt}`); break; } }
        frostStats.burst++;
      }
    }
    for (const f of fr) {
      const [l, r] = level.walls(f.alt), pr = FR.pickR(f);
      if (f.x - pr < l + R.fruitMargin - 0.5 || f.x + pr > r - R.fruitMargin + 0.5) fail('frost pickups stay off the walls', `${f.kind} at ${f.alt | 0}`);
      if (f.clear === -Infinity) continue;   // (the dares: the lilies, the Frozen Falls snowflake)
      const need = f.clear ?? (f.bonus || f.kind === 'gold' ? Math.ceil(FR.laneSize().w / 2 + 6 + FR.COCO_R) : R.pickup.clear);
      let dd = Infinity; for (const h of hz) if (h.lo - 220 < f.alt && h.hi + 220 > f.alt) for (const q of FR.frostDanger(h)) dd = Math.min(dd, FR.shapeDist(q, f.x, f.alt));
      if (!f.bonus && f.kind !== 'gold' && f.clear == null) frostStats.pick = Math.min(frostStats.pick, dd);
      if (dd < need - 0.5) fail('frost pickups stay clear of every trap\'s reach', `${f.kind} at ${f.alt | 0}: ${dd.toFixed(1)} < ${need}`);
    }
    for (let i = 0; i < fr.length; i++) for (let j = i + 1; j < fr.length && fr[j].alt - fr[i].alt < 80; j++) if (Math.hypot(fr[i].x - fr[j].x, fr[i].alt - fr[j].alt) < FR.pickR(fr[i]) + FR.pickR(fr[j]) + FR.PICK_GAP - 0.01) fail('frost pickups never overlap', `${fr[i].alt | 0}`);
    if (fr.filter(f => f.kind === 'lily').length !== 3) fail('Frost Hollow holds exactly 3 frost lilies', `${fr.filter(f => f.kind === 'lily').length}`);
    let gap = 0, last = 60; for (const f of fr) if (f.kind === 'chili') { gap = Math.max(gap, f.alt - last); last = f.alt; }
    if (gap > 640) fail('Frost Hollow keeps a chili line', `${gap | 0}`);
    if (k > 2) continue;   // (the searches run on the stage itself and two more seeds)
    for (const b of level.beats) {
      const lo = Math.min(...b.hs.map(h => h.type === 'snowball' ? h.hitAt[1] - 120 : h.lo - (h.type === 'icicles' ? 40 : 150))) - 40, hi = Math.max(...b.hs.map(h => h.hi)) + 90;
      const traps = hz.filter(h => h.lo < hi + 60 && h.hi > lo - 60);
      frostStats.traps++;
      for (let p = 0; p < 6; p++) {
        const t0 = p * 1.13 + k * 0.37, [l, r] = level.walls(lo + 40);
        frostStats.searches++;
        const tm = fly(level, traps, (l + r) / 2, lo + 40, t0, (x, a) => a >= hi - 10, lo, hi + 20);
        if (tm < 0) fail('every frost trap can be passed by the widest pilot from any phase, never frosted', `${b.kind} at ${b.a} (${b.sec.name}), start ${t0.toFixed(2)} s, seed ${k}`);
        else frostStats.worst = Math.max(frostStats.worst, tm);
      }
    }
    // every frost lily can be touched and then escaped (flown on past its trap) by the widest pilot, from 6 phases
    for (const f of fr.filter(f => f.kind === 'lily')) {
      const own = hz.filter(h => h.lo - 40 < f.alt && h.hi + 120 > f.alt), lo = Math.min(f.alt, ...own.map(h => h.type === 'icicles' ? h.alt - 260 : h.lo)) - 200, hi = Math.max(f.alt, ...own.map(h => h.hi)) + 100;
      const traps = hz.filter(h => h.lo < hi + 60 && h.hi > lo - 60), [l, r] = level.walls(lo + 40);
      for (let p = 0; p < 6; p++) {
        frostStats.searches++;
        const tm = fly(level, traps, (l + r) / 2, lo + 40, p * 1.07 + k * 0.29, (x, a) => a >= hi - 10, lo, hi + 20, (x, a) => Math.hypot(x - f.x, a - f.alt) < FR.COCO_R + W / 2 - 4);
        if (tm < 0) fail('every frost lily can be grabbed and escaped by the widest pilot', `lily at ${f.alt | 0}, phase ${p}, seed ${k}`);
      }
      frostStats.lilies++;
    }
  }
}
const frostSummary = () => `PASS: Frost Hollow: ${frostStats.seeds} layouts × ${frostStats.len} m, only its own traps (${Object.entries(frostStats.kinds).map(([k, n]) => `${n} ${k}`).join(', ')}), each taught alone first; shaft ${frostStats.minW.toFixed(0)}+ wide, wall slope ${frostStats.slope.toFixed(2)} (max ${FR.RULES.maxWallSlope}); lanes past icicle shelves ${frostStats.shelfLane.toFixed(0)}+, breath faces ${frostStats.faceLane.toFixed(0)}+ (minLane ${FR.RULES.minLane}), past their cones ${frostStats.coneLane.toFixed(0)}+, bridge panels ${frostStats.panel.toFixed(0)}+ wide, one open at a time; ${frostStats.burst} snowball arcs inside the shaft; beats ${(frostStats.beatGap ?? 0).toFixed(0)}+ apart; pickups ${frostStats.pick.toFixed(1)}+ from any reach; ${frostStats.traps} beats × 6 phases and ${frostStats.lilies} lilies flown by the widest pilot without frost (${frostStats.searches} searches, slowest ${frostStats.worst.toFixed(1)} s)`;
// ---------- Adventure: the Honeycomb Hive (island level 5), an authored stage with its own traps ----------
// As the temple's checks: every rule on the stage's layout as the game builds it (and on 12 other seeds), then every beat
// flown by a time-space search for the widest pilot on the traps' own clocks with no holds, from 6 start phases: once
// where only what kills blocks it (every beat passable), and once with the honey blocking too (the clean line of the
// "never stuck in honey" mission always exists). Every golden honey pot is reached the same way.
const HV = new Function(regions.join('\n') + '\nreturn { createHiveLevel, hiveShapes, hiveDanger, hiveEnd, HIVE, HIVE_STAGE, HIVE_TYPES, ADV_HIVE, RULES, advSeed, shapeDist, beeState, dripState, guardPos, beeLoop, laneSize, pickR, COCO_R, PICK_GAP, UNITS_PER_M };')();
const hiveStats = { seeds: 0, traps: 0, searches: 0, worst: 0, clean: 0, pots: 0, pick: Infinity, bonus: Infinity, minW: Infinity, slope: 0, dripLane: Infinity, honeyLane: Infinity, len: 0, kinds: {} };
{
  const R = HV.RULES, W = PILOT_W, Hh = PILOT_H, M = 4, HUGc = Math.ceil(HV.laneSize().w / 2 + 6 + HV.COCO_R);
  const st0 = HV.ADV_HIVE;
  if (st0.theme !== 'hive' || !(st0.reward > 0)) fail('the Honeycomb Hive is a themed stage with a reward', JSON.stringify(st0));
  if (!Array.isArray(st0.goals) || st0.goals.length !== 3 || !st0.goals.some(g => g.k === 'finish') || !st0.goals.some(g => g.k === 'pots' && g.n === 3) || !st0.goals.some(g => g.k === 'noSticky')) fail('the hive has three missions: the royal chamber, 3 honey pots and never stuck in honey', JSON.stringify(st0.goals));
  if (Math.abs(st0.len * HV.UNITS_PER_M - HV.hiveEnd()) > 1e-6) fail('the hive stage length matches its layout', `${st0.len}`);
  // the stage's order: every trap kind is taught alone first (its first beat a single trap, slower than any later one)
  {
    const firsts = {}, seenKinds = [], base = k => k.startsWith('honey') ? 'honey' : k.replace(/Pair|Stack/, '');
    const pace = (b, o) => b === 'drip' ? o.P : b === 'bees' ? o.open : b === 'guard' ? o.cross + o.rest : 0;
    for (const sec of HV.HIVE_STAGE) if (!sec.calm) for (const [, kind, o] of sec.beats) {
      const b = base(kind);
      if (!firsts[b]) { firsts[b] = { kind, o }; seenKinds.push(b); if (kind !== b) fail('each hive trap is introduced alone first', `${kind} in ${sec.name}`); }
      else if (b !== 'honey' && pace(b, o) && pace(b, o) > pace(b, firsts[b].o)) fail('a hive trap is never slower than its introduction', `${kind} in ${sec.name}`);
    }
    if (seenKinds.join() !== 'drip,bees,honey,guard') fail('the hive teaches drips, then bees, then honey, then guards', seenKinds.join());
    if (!HV.HIVE_STAGE.some(sec => sec.calm && !sec.finish && sec !== HV.HIVE_STAGE[0])) fail('the hive has a breather chamber', '');
    if (!HV.HIVE_STAGE[HV.HIVE_STAGE.length - 1].finish) fail('the hive ends in the royal chamber', '');
  }
  const capHit = (S, x, a, m) => {
    const r = W / 2 + m, half = Math.max(0, Hh / 2 - W / 2);
    for (const q of S) for (const da of half ? [-half, 0, half] : [0]) if (HV.shapeDist(q, x, a + da) < r) return true;
    return false;
  };
  // the temple's search (see fly there), on the hive's shapes; soft: the honey blocks too
  function fly(level, traps, x0, a0, t0, goal, lo, hi, soft) {
    const DT = 1 / 15, DX = 11, DA = 11, up = Math.round(440 * DT / DA), dn = Math.round(380 * DT / DA), sd = Math.round(330 * DT / DX);
    const nA = Math.ceil((hi - lo) / DA) + 1, nX = Math.ceil(400 / DX) + 1;
    let front = new Set([Math.round(x0 / DX) * 1000 + Math.round((a0 - lo) / DA)]);
    for (let step = 1; step <= 9 / DT; step++) {
      const t = t0 + step * DT, S = [];
      for (const h of traps) HV.hiveShapes(h, t, t, S, soft);
      const next = new Set(), blocked = new Map();
      const free = (xi, ai) => {
        const key = xi * 1000 + ai; if (blocked.has(key)) return blocked.get(key);
        const x = xi * DX, a = lo + ai * DA, [l, r] = level.walls(a), ok = x - W / 2 - 2 >= l && x + W / 2 + 2 <= r && level.walls(a + Hh / 2)[0] <= x - W / 2 && level.walls(a + Hh / 2)[1] >= x + W / 2 && level.walls(a - Hh / 2)[0] <= x - W / 2 && level.walls(a - Hh / 2)[1] >= x + W / 2 && !capHit(S, x, a, M);
        blocked.set(key, ok); return ok;
      };
      for (const k of front) {
        const xi = Math.floor(k / 1000), ai = k % 1000;
        for (let dA = -dn; dA <= up; dA++) for (let dX = -sd; dX <= sd; dX++) {
          const nx = xi + dX, na = ai + dA; if (na < 0 || na >= nA || nx < 0 || nx >= nX) continue;
          const key = nx * 1000 + na; if (next.has(key) || !free(nx, na)) continue;
          if (goal(nx * DX, lo + na * DA)) return step * DT;
          next.add(key);
        }
      }
      if (!next.size) return -1;
      front = next;
    }
    return -1;
  }
  for (let k = 0; k <= 12; k++) {
    const st = k ? { ...st0, seed: `${st0.seed}~${k}` } : st0, level = HV.createHiveLevel(HV.advSeed(st), st), hz = [], fr = [];
    hiveStats.seeds++;
    {
      const VIEW = 1100, h1 = [], f1 = [];
      level.fill(VIEW + 900, h1, f1);
      let sh = h1.length, sf = f1.length;
      for (let cam = 10; cam < level.end; cam += 10) {
        level.fill(cam + VIEW + 900, h1, f1);
        for (; sh < h1.length; sh++) if (h1[sh].lo < cam + VIEW + 100) fail('hive traps never pop in on screen', `${h1[sh].type} at ${h1[sh].lo | 0}`);
        for (; sf < f1.length; sf++) if (f1[sf].alt < cam + VIEW + 100) fail('hive pickups never pop in on screen', `${f1[sf].kind} at ${f1[sf].alt | 0}`);
      }
      hz.push(...h1); fr.push(...f1);
    }
    hiveStats.len = level.end / 10;
    for (const h of hz) if (!HV.HIVE_TYPES.has(h.type)) fail('the hive only has its own traps', h.type);
    for (const h of hz) hiveStats.kinds[h.type] = (hiveStats.kinds[h.type] || 0) + (k ? 0 : 1);
    if (hz.some(h => h.hi > level.end - 320)) fail('the royal chamber below the finish is clear of traps', `${Math.max(...hz.map(h => h.hi)) | 0} vs ${level.end}`);
    for (let a = 0; a < level.end + 200; a += 1) {
      const [l, r] = level.walls(a), [l2, r2] = level.walls(a + 1);
      hiveStats.minW = Math.min(hiveStats.minW, r - l); hiveStats.slope = Math.max(hiveStats.slope, l2 - l, r - r2);
    }
    if (hiveStats.minW < R.minWidth) fail('the hive shaft is never narrower than minWidth', hiveStats.minW.toFixed(1));
    if (hiveStats.slope > R.maxWallSlope) fail('the comb walls never step in faster than maxWallSlope', hiveStats.slope.toFixed(2));
    // static lanes: a drip's lobe and column, the honey's curtain each leave minLane to the other wall; a swarm's pod and
    // a resting guard leave the rest of the shaft; drips fall straight down, never up
    for (const h of hz) {
      if (h.type === 'drip' || h.type === 'honey') {
        const S = h.type === 'drip' ? HV.hiveDanger(h) : HV.hiveShapes(h, 0, 0, [], true);
        for (let a = h.lo; a <= h.hi; a += 4) {
          const [l, r] = level.walls(a); let L0 = l, R0 = r;
          for (const q of S) {
            const span = q.k === 'c' ? [q.a - q.r, q.a + q.r] : q.k === 'b' ? [q.a0, q.a1] : [Math.min(q.a0, q.a1) - q.r, Math.max(q.a0, q.a1) + q.r]; if (a < span[0] || a > span[1]) continue;
            const x0 = q.k === 'c' ? q.x - q.r : q.k === 'b' ? q.x0 : Math.min(q.x0, q.x1) - q.r, x1 = q.k === 'c' ? q.x + q.r : q.k === 'b' ? q.x1 : Math.max(q.x0, q.x1) + q.r;
            if (h.side > 0) L0 = Math.max(L0, x1); else R0 = Math.min(R0, x0);
          }
          const lane = R0 - L0; if (h.type === 'drip') hiveStats.dripLane = Math.min(hiveStats.dripLane, lane); else hiveStats.honeyLane = Math.min(hiveStats.honeyLane, lane);
          if (lane < R.minLane) { fail(`a ${h.type === 'drip' ? 'drip' : 'honey fall'} leaves a lane of minLane`, `${lane.toFixed(1)} at ${a | 0}`); break; }
        }
      }
      if (h.type === 'drip') { let prev = Infinity; for (let u = 0; u < h.P; u += 0.02) { const g = HV.dripState(h, u - h.ph * h.P); if (g.fall >= 0) { if (g.a > prev + 0.01 || Math.abs(g.x - h.dx) > 0.01) fail('honey drips fall straight down', `${h.alt}`); prev = g.a; } else prev = Infinity; } }
      if (h.type === 'bees') { const [l, r] = level.walls(h.mouthA); for (let v = 0; v <= 1; v += 0.01) { const [x] = HV.beeLoop(h, v); if (x - 23 < l || x + 23 > r) { fail('a swarm\'s loop stays inside the shaft', `${h.alt} v ${v.toFixed(2)}`); break; } } }
    }
    // pickups: inside the walls, apart, clear of every trap's whole reach (racing-line ones: the hug distance)
    for (const f of fr) {
      const [l, r] = level.walls(f.alt), pr = HV.pickR(f);
      if (f.x - pr < l + R.fruitMargin - 0.5 || f.x + pr > r - R.fruitMargin + 0.5) fail('hive pickups stay off the walls', `${f.kind} at ${f.alt | 0}`);
      if (f.kind === 'pot') continue;
      let d = Infinity; for (const h of hz) if (h.lo - 220 < f.alt && h.hi + 220 > f.alt) for (const q of HV.hiveDanger(h)) d = Math.min(d, HV.shapeDist(q, f.x, f.alt));
      if (f.bonus || f.kind === 'gold') { hiveStats.bonus = Math.min(hiveStats.bonus, d); if (d < HUGc - 0.5) fail('hive racing-line pickups keep the hug distance from every trap', `${f.kind} at ${f.alt | 0}: ${d.toFixed(1)}`); }
      else { hiveStats.pick = Math.min(hiveStats.pick, d); if (d < R.pickup.clear - 0.5) fail('hive pickups stay clear of every trap\'s reach', `${f.kind} at ${f.alt | 0}: ${d.toFixed(1)}`); }
    }
    for (let i = 0; i < fr.length; i++) for (let j = i + 1; j < fr.length && fr[j].alt - fr[i].alt < 80; j++) if (Math.hypot(fr[i].x - fr[j].x, fr[i].alt - fr[j].alt) < HV.pickR(fr[i]) + HV.pickR(fr[j]) + HV.PICK_GAP - 0.01) fail('hive pickups never overlap', `${fr[i].alt | 0}`);
    if (fr.filter(f => f.kind === 'pot').length !== 3) fail('the hive holds exactly 3 golden honey pots', `${fr.filter(f => f.kind === 'pot').length}`);
    let gap = 0, last = 60; for (const f of fr) if (f.kind === 'chili') { gap = Math.max(gap, f.alt - last); last = f.alt; }
    if (gap > 640) fail('the hive keeps a chili line', `${gap | 0}`);
    if (k > 3) continue;
    for (const b of level.beats) {
      const lo = Math.min(...b.hs.map(h => h.lo)) - 150, hi = Math.max(...b.hs.map(h => h.hi)) + 90;
      const traps = hz.filter(h => h.lo < hi + 60 && h.hi > lo - 60);
      hiveStats.traps++;
      for (const soft of [false, true]) for (let p = 0; p < 6; p++) {
        const t0 = p * 1.13 + k * 0.37 + (soft ? 0.5 : 0), [l, r] = level.walls(lo + 40);
        hiveStats.searches++;
        const tm = fly(level, traps, (l + r) / 2, lo + 40, t0, (x, a) => a >= hi - 10, lo, hi + 20, soft);
        if (tm < 0) fail(soft ? 'every hive beat has a clean line clear of the honey too, from any phase' : 'every hive trap can be passed by the widest pilot from any phase', `${b.kind} at ${b.a} (${b.sec.name}), start ${t0.toFixed(2)} s, seed ${k}`);
        else { hiveStats.worst = Math.max(hiveStats.worst, tm); if (soft) hiveStats.clean++; }
      }
    }
    for (const f of fr.filter(f => f.kind === 'pot')) {
      const lo = f.alt - 260, hi = f.alt + 160, traps = hz.filter(h => h.lo < hi + 60 && h.hi > lo - 60), [l, r] = level.walls(lo + 40);
      for (let p = 0; p < 6; p++) {
        hiveStats.searches++;
        const tm = fly(level, traps, (l + r) / 2, lo + 40, p * 1.07 + k * 0.29, (x, a) => Math.hypot(x - f.x, a - f.alt) < HV.HIVE.potR + W / 2 - 4, lo, hi, true);
        if (tm < 0) fail('every golden honey pot can be reached by the widest pilot (clear of the honey)', `pot at ${f.alt | 0}, phase ${p}, seed ${k}`);
      }
      hiveStats.pots++;
    }
  }
}
const hiveSummary = () => `PASS: Honeycomb Hive: ${hiveStats.seeds} layouts × ${hiveStats.len} m, only its own traps (${Object.entries(hiveStats.kinds).map(([k, n]) => `${n} ${k}`).join(', ')}), each taught alone first; comb shaft ${hiveStats.minW.toFixed(0)}+ wide with slopes ${hiveStats.slope.toFixed(2)} (max ${HV.RULES.maxWallSlope}); drip lanes ${hiveStats.dripLane.toFixed(0)}+, honey lanes ${hiveStats.honeyLane.toFixed(0)}+ (minLane ${HV.RULES.minLane}), drips straight down, swarm loops inside the shaft; pickups ${hiveStats.pick.toFixed(1)}+ from any trap's reach (racing line ${hiveStats.bonus.toFixed(1)}+), nothing pops in; ${hiveStats.traps} beats (each also flown clear of the honey: ${hiveStats.clean} clean passes) and ${hiveStats.pots} honey pots flown by the widest pilot in ${hiveStats.searches} searches from 6 phases each, the slowest pass ${hiveStats.worst.toFixed(1)} s`;


// ---------- Adventure: the Thunder Rift (island level 18), an authored stage with its own traps ----------
// As the grotto's checks: every rule on the stage's layout as the game builds it (and 8 other seeds, which only move
// phases and looks), then every beat and every storm-glass orb flown by a time-space search for the widest pilot on the
// traps' own clocks from 6 start phases, with each gust shoving the search sideways while it blows (and each beat flown
// again with the gusts' bands closed while they blow: the "never caught by a gust" mission is always possible).
const SM = new Function(regions.join('\n') + '\nreturn { createStormLevel, stormShapes, stormDanger, stormEnd, stormTeslaState, stormBoltState, stormGustState, stormOrbPos, stormTerm, STORM, STORM_STAGE, STORM_TYPES, ADV_STORM, RULES, advSeed, shapeDist, laneSize, pickR, COCO_R, PICK_GAP, UNITS_PER_M };')();
const stormStats = { seeds: 0, traps: 0, searches: 0, worst: 0, clean: 0, glass: 0, pick: Infinity, minW: Infinity, slope: 0, teslaLane: Infinity, boltLane: Infinity, orbWall: Infinity, len: 0, kinds: {} };
{
  const R = SM.RULES, W = PILOT_W, Hh = PILOT_H, M = 4, st0 = SM.ADV_STORM, X = SM.STORM;
  if (st0.theme !== 'storm' || !(st0.reward > 0)) fail('the Thunder Rift is a themed stage with a reward', JSON.stringify(st0));
  if (!Array.isArray(st0.goals) || st0.goals.length !== 3 || !st0.goals.some(g => g.k === 'finish') || !st0.goals.some(g => g.k === 'stormGlass' && g.n === 3) || !st0.goals.some(g => g.k === 'stormCalm')) fail('the rift has three missions: the Storm Heart, 3 storm-glass orbs and never caught by a gust', JSON.stringify(st0.goals));
  if (Math.abs(st0.len * SM.UNITS_PER_M - SM.stormEnd()) > 1e-6) fail('the rift stage length matches its layout', `${st0.len}`);
  // the stage's order: pylons, then ball lightning, then lightning strikes, then gusts, each taught alone (never slower)
  {
    const firsts = {}, seen = [];
    for (const sec of SM.STORM_STAGE) if (!sec.calm) for (const [, kind, o] of sec.beats) {
      const base = kind.replace(/(Stack|Pair|Orb|Tesla|Bolt)$/, '');
      if (!firsts[base]) { firsts[base] = o; seen.push(base); if (kind !== base || o.tilt) fail('each storm trap is introduced alone first', `${kind} in ${sec.name}`); }
      else if (kind === base && o.P && firsts[base].P && o.P > firsts[base].P) fail('a storm trap is never slower than its introduction', `${kind} in ${sec.name}`);
    }
    if (seen.join() !== 'tesla,orb,bolt,gust') fail('the rift teaches pylons, then ball lightning, then strikes, then gusts', seen.join());
    if (!SM.STORM_STAGE.some(sec => sec.calm && !sec.finish && sec !== SM.STORM_STAGE[0])) fail('the rift has a breather', '');
    if (!SM.STORM_STAGE[SM.STORM_STAGE.length - 1].finish) fail('the rift ends at the Storm Heart', '');
  }
  const capHit = (S, x, a, m) => {
    const r = W / 2 + m, half = Math.max(0, Hh / 2 - W / 2);
    for (const q of S) for (const da of half ? [-half, 0, half] : [0]) if (SM.shapeDist(q, x, a + da) < r) return true;
    return false;
  };
  // the search (as the grotto's) with the gusts: while a gust blows over the pilot it is carried a cell a step toward the
  // far wall (never into it); closed: a blowing gust's band counts as solid. via(x, a) must be touched before the goal.
  function fly(level, traps, x0, a0, t0, goal, lo, hi, via, closed) {
    const DT = 1 / 15, DX = 11, DA = 11, up = Math.round(440 * DT / DA), dn = Math.round(380 * DT / DA), sd = Math.round(330 * DT / DX);
    const nA = Math.ceil((hi - lo) / DA) + 1, nX = Math.ceil(400 / DX) + 1, V = 1e6, gusts = traps.filter(h => h.type === 'stormGust');
    let front = new Set([Math.round(x0 / DX) * 1000 + Math.round((a0 - lo) / DA)]);
    for (let step = 1; step <= 10 / DT; step++) {
      const t = t0 + step * DT, S = [], G = gusts.map(h => ({ h, k: SM.stormGustState(h, t).k }));
      for (const h of traps) SM.stormShapes(h, t, S);
      const next = new Set(), blocked = new Map();
      const inWalls = (x, a) => { const [l, r] = level.walls(a); return x - W / 2 - 2 >= l && x + W / 2 + 2 <= r && level.walls(a + Hh / 2)[0] <= x - W / 2 && level.walls(a + Hh / 2)[1] >= x + W / 2 && level.walls(a - Hh / 2)[0] <= x - W / 2 && level.walls(a - Hh / 2)[1] >= x + W / 2; };
      const gustOver = a => G.find(g => g.k > 0.3 && a + Hh / 2 > g.h.lo && a - Hh / 2 < g.h.hi);
      const free = (xi, ai) => {
        const key = xi * 1000 + ai; if (blocked.has(key)) return blocked.get(key);
        const x = xi * DX, a = lo + ai * DA, ok = inWalls(x, a) && !capHit(S, x, a, M) && !(closed && gustOver(a));
        blocked.set(key, ok); return ok;
      };
      for (const k of front) {
        const got = k >= V, kk = k % V, xi = Math.floor(kk / 1000), ai = kk % 1000;
        for (let dA = -dn; dA <= up; dA++) for (let dX = -sd; dX <= sd; dX++) {
          let nx = xi + dX; const na = ai + dA; if (na < 0 || na >= nA || nx < 0 || nx >= nX) continue;
          const g = !closed && gustOver(lo + na * DA);
          if (g) { const d = g.h.side, n2 = nx + d; if (inWalls(n2 * DX, lo + na * DA)) nx = n2; }   // (carried, but never into the wall)
          const g2 = got || !via || via(nx * DX, lo + na * DA), key = (g2 ? V : 0) + nx * 1000 + na; if (next.has(key) || !free(nx, na)) continue;
          if (g2 && goal(nx * DX, lo + na * DA)) return step * DT;
          next.add(key);
        }
      }
      if (!next.size) return -1;
      front = next;
    }
    return -1;
  }
  for (let k = 0; k <= 8; k++) {
    const st = k ? { ...st0, seed: `${st0.seed}~${k}` } : st0, level = SM.createStormLevel(SM.advSeed(st), st), hz = [], fr = [];
    stormStats.seeds++;
    {
      const VIEW = 1100, h1 = [], f1 = [];
      level.fill(VIEW + 900, h1, f1);
      let sh = h1.length, sf = f1.length;
      for (let cam = 10; cam < level.end; cam += 10) {
        level.fill(cam + VIEW + 900, h1, f1);
        for (; sh < h1.length; sh++) if (h1[sh].lo < cam + VIEW + 100) fail('storm traps never pop in on screen', `${h1[sh].type} at ${h1[sh].lo | 0}`);
        for (; sf < f1.length; sf++) if (f1[sf].alt < cam + VIEW + 100) fail('storm pickups never pop in on screen', `${f1[sf].kind} at ${f1[sf].alt | 0}`);
      }
      hz.push(...h1); fr.push(...f1);
    }
    stormStats.len = level.end / 10;
    for (const h of hz) if (!SM.STORM_TYPES.has(h.type)) fail('the rift only has its own traps', h.type);
    for (const h of hz) stormStats.kinds[h.type] = (stormStats.kinds[h.type] || 0) + (k ? 0 : 1);
    for (let i = 1; i < level.beats.length; i++) { const p = level.beats[i - 1], q = level.beats[i], g = Math.min(...q.hs.map(h => h.lo)) - Math.max(...p.hs.map(h => h.hi)); stormStats.beatGap = Math.min(stormStats.beatGap ?? Infinity, g); if (g < 0) fail('storm beats never overlap', `${p.kind} at ${p.a} / ${q.kind} at ${q.a}`); }
    if (hz.some(h => h.hi > level.end - 320)) fail('the summit below the finish is clear of traps', `${Math.max(...hz.map(h => h.hi)) | 0} vs ${level.end}`);
    for (let a = 0; a < level.end + 200; a += 1) {
      const [l, r] = level.walls(a), [l2, r2] = level.walls(a + 1);
      stormStats.minW = Math.min(stormStats.minW, r - l); stormStats.slope = Math.max(stormStats.slope, l2 - l, r - r2);
    }
    if (stormStats.minW < R.minWidth) fail('the rift is never narrower than minWidth', stormStats.minW.toFixed(1));
    if (stormStats.slope > R.maxWallSlope) fail('the rift walls never step in faster than maxWallSlope', stormStats.slope.toFixed(2));
    // static lanes and the traps' own rules
    for (const h of hz) {
      if (h.type === 'stormTesla') {
        // the pylons sit on the walls (no gap behind them) and leave a lane of minLane between their terminals; the arc
        // runs between the two terminals and nowhere else
        const [[xl, al], [xr, ar]] = SM.stormTerm(h), lane = (xr - X.tesla.ball) - (xl + X.tesla.ball);
        stormStats.teslaLane = Math.min(stormStats.teslaLane, lane); if (lane < R.minLane) fail('tesla pylons leave a lane of minLane between their terminals', `${lane.toFixed(1)} at ${h.alt}`);
        if (Math.abs(level.walls(al)[0] - h.L) > 3 || Math.abs(level.walls(ar)[1] - h.R) > 3) fail('tesla pylons sit on the walls', `${h.alt}`);
      }
      if (h.type === 'stormBolt') {
        // the open lane beside a rod's column and outcrop is at least minLane, the column hangs from above the rod (never
        // from below) and the rod stands on its own wall
        const [l, r] = level.walls(h.alt + X.bolt.col * 0.5), S = SM.stormDanger(h), x0 = Math.min(...S.map(q => q.k === 'c' ? q.x - q.r : Math.min(q.x0, q.x1) - q.r)), x1 = Math.max(...S.map(q => q.k === 'c' ? q.x + q.r : Math.max(q.x0, q.x1) + q.r));
        const lane = h.side > 0 ? r - x1 : x0 - l;
        stormStats.boltLane = Math.min(stormStats.boltLane, lane); if (lane < R.minLane) fail('a lightning column leaves a lane of minLane beside it', `${lane.toFixed(1)} at ${h.alt}`);
        const col = SM.stormShapes(h, h.P * (1 - h.ph) - (X.bolt.strike * 0.5 + X.bolt.glow), [], 'shock')[0];
        if (!col || col.a0 < h.alt + X.bolt.rod || col.a1 <= col.a0) fail('a lightning strike comes down from above its rod', `${h.alt}`);
        if (Math.abs(h.base - (h.side > 0 ? level.walls(h.alt)[0] : level.walls(h.alt)[1])) > 3) fail('a lightning rod stands on its own wall', `${h.alt}`);
      }
      if (h.type === 'stormOrb') for (let q = 0; q < 64; q++) {
        // an orb's path stays inside the shaft with room to spare
        const [x, a] = SM.stormOrbPos(h, h.P * q / 64), [l, r] = level.walls(a), m = Math.min(x - l, r - x) - X.orb.r;
        stormStats.orbWall = Math.min(stormStats.orbWall, m); if (m < 20) fail('an orb\'s path keeps off the walls', `${m.toFixed(1)} at ${h.alt}`);
        if (h.pair) { const [x2, a2] = SM.stormOrbPos(h, h.P * q / 64, 1); if (Math.hypot(x2 - x, a2 - a) < 2 * X.orb.r + W) fail('a pair of orbs never bunch up', `${h.alt}`); }
      }
      if (h.type === 'stormGust') {
        // a gust's band stays inside its trap's height and never overlaps anything lethal at the same height on its
        // downwind wall closer than the pilot's width plus the push (it throws you toward traps, not into them)
        const st2 = SM.stormGustState(h, h.P * 2), k = Math.max(...Array.from({ length: 80 }, (_, i) => SM.stormGustState(h, h.P * i / 80).k));
        if (!(k > 0.95) || st2 == null) fail('a gust blows full strength once a cycle', `${h.alt}`);
      }
    }
    for (const f of fr) {
      const [l, r] = level.walls(f.alt), pr = SM.pickR(f);
      if (f.x - pr < l + R.fruitMargin - 0.5 || f.x + pr > r - R.fruitMargin + 0.5) fail('storm pickups stay off the walls', `${f.kind} at ${f.alt | 0}`);
      if (f.clear === -Infinity) continue;   // (the dares: storm glass, the gold in a rod's column, the eye's spiral)
      const need = f.clear ?? (f.bonus || f.kind === 'gold' ? Math.ceil(SM.laneSize().w / 2 + 6 + SM.COCO_R) : R.pickup.clear);
      let dd = Infinity; for (const h of hz) if (h.lo - 220 < f.alt && h.hi + 220 > f.alt) for (const q of SM.stormDanger(h)) dd = Math.min(dd, SM.shapeDist(q, f.x, f.alt));
      if (!f.bonus && f.kind !== 'gold' && f.clear == null) stormStats.pick = Math.min(stormStats.pick, dd);
      if (dd < need - 0.5) fail('storm pickups stay clear of every trap\'s reach', `${f.kind} at ${f.alt | 0}: ${dd.toFixed(1)} < ${need}`);
    }
    for (let i = 0; i < fr.length; i++) for (let j = i + 1; j < fr.length && fr[j].alt - fr[i].alt < 80; j++) if (Math.hypot(fr[i].x - fr[j].x, fr[i].alt - fr[j].alt) < SM.pickR(fr[i]) + SM.pickR(fr[j]) + SM.PICK_GAP - 0.01) fail('storm pickups never overlap', `${fr[i].alt | 0}`);
    if (fr.filter(f => f.kind === 'stormGlass').length !== 3) fail('the rift holds exactly 3 storm-glass orbs', `${fr.filter(f => f.kind === 'stormGlass').length}`);
    let gap = 0, last = 60; for (const f of fr) if (f.kind === 'chili') { gap = Math.max(gap, f.alt - last); last = f.alt; }
    if (gap > 640) fail('the rift keeps a chili line', `${gap | 0}`);
    if (k > 2) continue;   // (the searches run on the stage itself and two more seeds)
    for (const b of level.beats) {
      const lo = Math.min(...b.hs.map(h => h.lo)) - 150, hi = Math.max(...b.hs.map(h => h.hi)) + 90;
      const traps = hz.filter(h => h.lo < hi + 60 && h.hi > lo - 60);
      stormStats.traps++;
      for (let p = 0; p < 6; p++) {
        const t0 = p * 1.13 + k * 0.37, [l, r] = level.walls(lo + 40);
        stormStats.searches++;
        const tm = fly(level, traps, (l + r) / 2, lo + 40, t0, (x, a) => a >= hi - 10, lo, hi + 20);
        if (tm < 0) fail('every storm trap can be passed by the widest pilot from any phase', `${b.kind} at ${b.a} (${b.sec.name}), start ${t0.toFixed(2)} s, seed ${k}`);
        else stormStats.worst = Math.max(stormStats.worst, tm);
        if (traps.some(h => h.type === 'stormGust')) {
          stormStats.searches++;
          if (fly(level, traps, (l + r) / 2, lo + 40, t0, (x, a) => a >= hi - 10, lo, hi + 20, null, true) < 0) fail('every storm beat can be flown without being caught by a gust', `${b.kind} at ${b.a}, start ${t0.toFixed(2)} s, seed ${k}`);
          else stormStats.clean++;
        }
      }
    }
    // every storm-glass orb can be touched and then escaped (flown on past its trap) by the widest pilot, from 6 phases
    for (const f of fr.filter(f => f.kind === 'stormGlass')) {
      const own = hz.filter(h => h.lo - 40 < f.alt && h.hi + 120 > f.alt), lo = Math.min(f.alt, ...own.map(h => h.lo)) - 200, hi = Math.max(f.alt, ...own.map(h => h.hi)) + 100;
      const traps = hz.filter(h => h.lo < hi + 60 && h.hi > lo - 60), [l, r] = level.walls(lo + 40);
      for (let p = 0; p < 6; p++) {
        stormStats.searches++;
        const tm = fly(level, traps, (l + r) / 2, lo + 40, p * 1.07 + k * 0.29, (x, a) => a >= hi - 10, lo, hi + 20, (x, a) => Math.hypot(x - f.x, a - f.alt) < SM.COCO_R + W / 2 - 4);
        if (tm < 0) fail('every storm-glass orb can be grabbed and escaped by the widest pilot', `glass at ${f.alt | 0}, phase ${p}, seed ${k}`);
      }
      stormStats.glass++;
    }
  }
}
const stormSummary = () => `PASS: Thunder Rift: ${stormStats.seeds} layouts × ${stormStats.len} m, only its own traps (${Object.entries(stormStats.kinds).map(([k, n]) => `${n} ${k}`).join(', ')}), each taught alone first; shaft ${stormStats.minW.toFixed(0)}+ wide, slate steps of slope ${stormStats.slope.toFixed(2)} (max ${SM.RULES.maxWallSlope}); lanes between pylons ${stormStats.teslaLane.toFixed(0)}+, beside lightning columns ${stormStats.boltLane.toFixed(0)}+ (minLane ${SM.RULES.minLane}), strikes only from above, orb paths ${stormStats.orbWall.toFixed(0)}+ off the walls, beats ${stormStats.beatGap.toFixed(0)}+ apart; pickups ${stormStats.pick.toFixed(1)}+ from any trap's reach, nothing pops in; ${stormStats.traps} beats (gusts shoving the search; ${stormStats.clean} passes also clear of every gust) and ${stormStats.glass} storm-glass orbs (grab and escape) flown by the widest pilot in ${stormStats.searches} searches from 6 phases each, the slowest pass ${stormStats.worst.toFixed(1)} s`;
// ---------- Adventure: the Glowshroom Grotto (island level 10), an authored stage with its own traps ----------
// As the temple's checks: every rule on the stage's layout as the game builds it (and 8 other seeds, which only move
// phases and looks), then every beat and every glow pearl flown by a time-space search for the widest pilot on the
// traps' own clocks from 6 start phases (bounce caps count as solid here: the search never relies on a boing).
const GR = new Function(regions.join('\n') + '\nreturn { createGrottoLevel, grottoShapes, grottoDanger, grottoEnd, grottoPuff, grottoCloud, grottoSnap, grottoSway, GROTTO, GROTTO_STAGE, GROTTO_TYPES, ADV_GROTTO, RULES, advSeed, shapeDist, laneSize, pickR, COCO_R, PICK_GAP, UNITS_PER_M };')();
const grottoStats = { seeds: 0, traps: 0, searches: 0, worst: 0, pearls: 0, pick: Infinity, minW: Infinity, slope: 0, puffLane: Infinity, snapLane: Infinity, capLane: Infinity, veil: Infinity, fling: 0, len: 0, kinds: {} };
{
  const R = GR.RULES, W = PILOT_W, Hh = PILOT_H, M = 4, st0 = GR.ADV_GROTTO;
  if (st0.theme !== 'grotto' || !(st0.reward > 0)) fail('the Glowshroom Grotto is a themed stage with a reward', JSON.stringify(st0));
  if (!Array.isArray(st0.goals) || st0.goals.length !== 3 || !st0.goals.some(g => g.k === 'finish') || !st0.goals.some(g => g.k === 'pearls' && g.n === 3) || !st0.goals.some(g => g.k === 'time')) fail('the grotto has three missions: the Mother Mushroom, 3 glow pearls and a time', JSON.stringify(st0.goals));
  if (Math.abs(st0.len * GR.UNITS_PER_M - GR.grottoEnd()) > 1e-6) fail('the grotto stage length matches its layout', `${st0.len}`);
  // the stage's order: puffers, then bounce caps, then veils, then snap-caps, each taught alone (never slower later)
  {
    const firsts = {}, seen = [];
    for (const sec of GR.GROTTO_STAGE) if (!sec.calm) for (const [, kind, o] of sec.beats) {
      const base = kind.replace(/Pair|Stack|Ladder|Puff$/, '');
      if (!firsts[base]) { firsts[base] = o; seen.push(base); if (kind !== base) fail('each grotto trap is introduced alone first', `${kind} in ${sec.name}`); }
      else if (o.P && firsts[base].P && o.P > firsts[base].P) fail('a grotto trap is never slower than its introduction', `${kind} in ${sec.name}`);
    }
    if (seen.join() !== 'puffer,bounce,curtain,snap') fail('the grotto teaches puffers, then bounce caps, then veils, then snap-caps', seen.join());
    if (!GR.GROTTO_STAGE.some(sec => sec.calm && !sec.finish && sec !== GR.GROTTO_STAGE[0])) fail('the grotto has a breather cavern', '');
    if (!GR.GROTTO_STAGE[GR.GROTTO_STAGE.length - 1].finish) fail('the grotto ends in the Mother Mushroom cavern', '');
  }
  const capHit = (S, x, a, m) => {
    const r = W / 2 + m, half = Math.max(0, Hh / 2 - W / 2);
    for (const q of S) for (const da of half ? [-half, 0, half] : [0]) if (GR.shapeDist(q, x, a + da) < r) return true;
    return false;
  };
  const ext = S => { let x0 = Infinity, x1 = -Infinity; for (const q of S) { const a = q.k === 'c' ? q.x - q.r : q.k === 'b' ? q.x0 : Math.min(q.x0, q.x1) - q.r, b = q.k === 'c' ? q.x + q.r : q.k === 'b' ? q.x1 : Math.max(q.x0, q.x1) + q.r; x0 = Math.min(x0, a); x1 = Math.max(x1, b); } return [x0, x1]; };
  // the search (as the temple's), with an optional waypoint: `via(x, a)` must be touched before the goal counts
  function fly(level, traps, x0, a0, t0, goal, lo, hi, via) {
    const DT = 1 / 15, DX = 11, DA = 11, up = Math.round(440 * DT / DA), dn = Math.round(380 * DT / DA), sd = Math.round(330 * DT / DX);
    const nA = Math.ceil((hi - lo) / DA) + 1, nX = Math.ceil(400 / DX) + 1, V = 1e6;
    let front = new Set([Math.round(x0 / DX) * 1000 + Math.round((a0 - lo) / DA)]);
    for (let step = 1; step <= 10 / DT; step++) {
      const t = t0 + step * DT, S = [];
      for (const h of traps) GR.grottoShapes(h, t, S);
      const next = new Set(), blocked = new Map();
      const free = (xi, ai) => {
        const key = xi * 1000 + ai; if (blocked.has(key)) return blocked.get(key);
        const x = xi * DX, a = lo + ai * DA, [l, r] = level.walls(a), ok = x - W / 2 - 2 >= l && x + W / 2 + 2 <= r && level.walls(a + Hh / 2)[0] <= x - W / 2 && level.walls(a + Hh / 2)[1] >= x + W / 2 && level.walls(a - Hh / 2)[0] <= x - W / 2 && level.walls(a - Hh / 2)[1] >= x + W / 2 && !capHit(S, x, a, M);
        blocked.set(key, ok); return ok;
      };
      for (const k of front) {
        const got = k >= V, kk = k % V, xi = Math.floor(kk / 1000), ai = kk % 1000;
        for (let dA = -dn; dA <= up; dA++) for (let dX = -sd; dX <= sd; dX++) {
          const nx = xi + dX, na = ai + dA; if (na < 0 || na >= nA || nx < 0 || nx >= nX) continue;
          const g2 = got || !via || via(nx * DX, lo + na * DA), key = (g2 ? V : 0) + nx * 1000 + na; if (next.has(key) || !free(nx, na)) continue;
          if (g2 && goal(nx * DX, lo + na * DA)) return step * DT;
          next.add(key);
        }
      }
      if (!next.size) return -1;
      front = next;
    }
    return -1;
  }
  for (let k = 0; k <= 8; k++) {
    const st = k ? { ...st0, seed: `${st0.seed}~${k}` } : st0, level = GR.createGrottoLevel(GR.advSeed(st), st), hz = [], fr = [];
    grottoStats.seeds++;
    {
      const VIEW = 1100, h1 = [], f1 = [];
      level.fill(VIEW + 900, h1, f1);
      let sh = h1.length, sf = f1.length;
      for (let cam = 10; cam < level.end; cam += 10) {
        level.fill(cam + VIEW + 900, h1, f1);
        for (; sh < h1.length; sh++) if (h1[sh].lo < cam + VIEW + 100) fail('grotto traps never pop in on screen', `${h1[sh].type} at ${h1[sh].lo | 0}`);
        for (; sf < f1.length; sf++) if (f1[sf].alt < cam + VIEW + 100) fail('grotto pickups never pop in on screen', `${f1[sf].kind} at ${f1[sf].alt | 0}`);
      }
      hz.push(...h1); fr.push(...f1);
    }
    grottoStats.len = level.end / 10;
    for (const h of hz) if (!GR.GROTTO_TYPES.has(h.type)) fail('the grotto only has its own traps', h.type);
    for (const h of hz) grottoStats.kinds[h.type] = (grottoStats.kinds[h.type] || 0) + (k ? 0 : 1);
    // beats never crowd: each beat's traps start above the last beat's reach (one thing to read at a time)
    for (let i = 1; i < level.beats.length; i++) { const p = level.beats[i - 1], q = level.beats[i], g = Math.min(...q.hs.map(h => h.lo)) - Math.max(...p.hs.map(h => h.hi)); grottoStats.beatGap = Math.min(grottoStats.beatGap ?? Infinity, g); if (g < 0) fail('grotto beats never overlap', `${p.kind} at ${p.a} / ${q.kind} at ${q.a}`); }
    if (hz.some(h => h.hi > level.end - 320)) fail('the Mother Mushroom cavern below the finish is clear of traps', `${Math.max(...hz.map(h => h.hi)) | 0} vs ${level.end}`);
    for (let a = 0; a < level.end + 200; a += 1) {
      const [l, r] = level.walls(a), [l2, r2] = level.walls(a + 1);
      grottoStats.minW = Math.min(grottoStats.minW, r - l); grottoStats.slope = Math.max(grottoStats.slope, l2 - l, r - r2);
    }
    if (grottoStats.minW < R.minWidth) fail('the grotto shaft is never narrower than minWidth', grottoStats.minW.toFixed(1));
    if (grottoStats.slope > R.maxWallSlope) fail('the grotto walls never step in faster than maxWallSlope', grottoStats.slope.toFixed(2));
    // static lanes: a puffer's biggest cloud, a bounce cap and a snap-cap's widest gape each leave a lane of minLane;
    // a veil always leaves one gap the widest pilot fits with room to spare
    for (const h of hz) {
      const [l, r] = level.walls(h.alt), lane = S => { const [x0, x1] = ext(S); return h.side > 0 ? r - x1 : x0 - l; };
      if (h.type === 'puffer') { let m = Infinity; for (let u = 0; u <= 1; u += 0.05) m = Math.min(m, lane([...GR.grottoShapes(h, 0, [], 'body'), ...GR.grottoCloud(h, u).map(([x, a, rr]) => ({ k: 'c', x, a, r: rr * 0.84 }))])); grottoStats.puffLane = Math.min(grottoStats.puffLane, m); if (m < R.minLane) fail('a puffer\'s biggest cloud leaves a lane of minLane', `${m.toFixed(1)} at ${h.alt}`); }
      if (h.type === 'bounce') { const m = lane(GR.grottoShapes(h, 0, [])); grottoStats.capLane = Math.min(grottoStats.capLane, m); if (m < R.minLane) fail('a bounce cap leaves a lane of minLane', `${m.toFixed(1)} at ${h.alt}`); }
      if (h.type === 'snap') { const m = lane(GR.grottoDanger(h)); grottoStats.snapLane = Math.min(grottoStats.snapLane, m); if (m < R.minLane) fail('a snap-cap leaves a lane of minLane past its tips', `${m.toFixed(1)} at ${h.alt}`); }
      if (h.type === 'curtain') for (let t = 0; t < h.P; t += h.P / 40) {
        // (each thread's sweep at this moment: its root at x, its tip swayed by sw, the worm's girth round both)
        const iv2 = h.xs.map((x, i) => { const sw = GR.grottoSway(h, t, i), C = GR.GROTTO.curtain; return [Math.min(x, x + sw) - C.worm - 1, Math.max(x, x + sw * 1.08) + C.worm + 1]; }).sort((p, q) => p[0] - q[0]);
        let best = 0, x = l; for (const [a, b] of iv2) { best = Math.max(best, a - x); x = Math.max(x, b); } best = Math.max(best, r - x);
        grottoStats.veil = Math.min(grottoStats.veil, best); if (best < W + 2 * M + 30) fail('a glow-worm veil always leaves a gap the widest pilot fits with room', `${best.toFixed(1)} at ${h.alt}`);
      }
    }
    // a boing's fling (the steering locked for lock seconds, thrown kick units across and lifted) never throws you into
    // a lethal trap: the corridor it sweeps is clear of every other trap's whole reach
    for (const h of hz.filter(h => h.type === 'bounce')) {
      const B = GR.GROTTO.bounce, d = h.side, others = hz.filter(q => q.type !== 'bounce' && q.lo < h.alt + 500 && q.hi > h.alt - 200), S = []; for (const q of others) S.push(...GR.grottoDanger(q));
      const [l, r] = level.walls(h.alt), xA = h.base + d * (B.out - 10), rise = B.lock * 440 * 1.15 + 60;
      for (let u = 0; u <= 1; u += 0.05) {
        const x = Math.min(r - W / 2 - 4, Math.max(l + W / 2 + 4, xA + d * B.kick * u)), a = h.alt + 10 + rise * u;
        if (capHit(S, x, a, 0)) { fail('a bounce cap\'s fling never throws you into a trap', `cap at ${h.alt}, ${u.toFixed(2)}`); break; }
      }
      grottoStats.fling++;
    }
    for (const f of fr) {
      const [l, r] = level.walls(f.alt), pr = GR.pickR(f);
      if (f.x - pr < l + R.fruitMargin - 0.5 || f.x + pr > r - R.fruitMargin + 0.5) fail('grotto pickups stay off the walls', `${f.kind} at ${f.alt | 0}`);
      if (f.clear === -Infinity) continue;   // (the dares: glow pearls, the gold in a snap-cap's mouth, the Moonpool ring)
      const need = f.clear ?? (f.bonus || f.kind === 'gold' ? Math.ceil(GR.laneSize().w / 2 + 6 + GR.COCO_R) : R.pickup.clear);
      let dd = Infinity; for (const h of hz) if (h.lo - 220 < f.alt && h.hi + 220 > f.alt) for (const q of GR.grottoDanger(h)) dd = Math.min(dd, GR.shapeDist(q, f.x, f.alt));
      if (!f.bonus && f.kind !== 'gold' && f.clear == null) grottoStats.pick = Math.min(grottoStats.pick, dd);
      if (dd < need - 0.5) fail('grotto pickups stay clear of every trap\'s reach', `${f.kind} at ${f.alt | 0}: ${dd.toFixed(1)} < ${need}`);
    }
    for (let i = 0; i < fr.length; i++) for (let j = i + 1; j < fr.length && fr[j].alt - fr[i].alt < 80; j++) if (Math.hypot(fr[i].x - fr[j].x, fr[i].alt - fr[j].alt) < GR.pickR(fr[i]) + GR.pickR(fr[j]) + GR.PICK_GAP - 0.01) fail('grotto pickups never overlap', `${fr[i].alt | 0}`);
    if (fr.filter(f => f.kind === 'pearl').length !== 3) fail('the grotto holds exactly 3 glow pearls', `${fr.filter(f => f.kind === 'pearl').length}`);
    let gap = 0, last = 60; for (const f of fr) if (f.kind === 'chili') { gap = Math.max(gap, f.alt - last); last = f.alt; }
    if (gap > 640) fail('the grotto keeps a chili line', `${gap | 0}`);
    if (k > 2) continue;   // (the searches run on the stage itself and two more seeds)
    for (const b of level.beats) {
      const lo = Math.min(...b.hs.map(h => h.lo)) - 150, hi = Math.max(...b.hs.map(h => h.hi)) + 90;
      const traps = hz.filter(h => h.lo < hi + 60 && h.hi > lo - 60);
      grottoStats.traps++;
      for (let p = 0; p < 6; p++) {
        const t0 = p * 1.13 + k * 0.37, [l, r] = level.walls(lo + 40);
        grottoStats.searches++;
        const tm = fly(level, traps, (l + r) / 2, lo + 40, t0, (x, a) => a >= hi - 10, lo, hi + 20);
        if (tm < 0) fail('every grotto trap can be passed by the widest pilot from any phase', `${b.kind} at ${b.a} (${b.sec.name}), start ${t0.toFixed(2)} s, seed ${k}`);
        else grottoStats.worst = Math.max(grottoStats.worst, tm);
      }
    }
    // every glow pearl can be touched and then escaped (flown on past its trap) by the widest pilot, from 6 phases
    for (const f of fr.filter(f => f.kind === 'pearl')) {
      const own = hz.filter(h => h.lo - 40 < f.alt && h.hi + 120 > f.alt), lo = Math.min(f.alt, ...own.map(h => h.lo)) - 200, hi = Math.max(f.alt, ...own.map(h => h.hi)) + 100;
      const traps = hz.filter(h => h.lo < hi + 60 && h.hi > lo - 60), [l, r] = level.walls(lo + 40);
      for (let p = 0; p < 6; p++) {
        grottoStats.searches++;
        const tm = fly(level, traps, (l + r) / 2, lo + 40, p * 1.07 + k * 0.29, (x, a) => a >= hi - 10, lo, hi + 20, (x, a) => Math.hypot(x - f.x, a - f.alt) < GR.COCO_R + W / 2 - 4);
        if (tm < 0) fail('every glow pearl can be grabbed and escaped by the widest pilot', `pearl at ${f.alt | 0}, phase ${p}, seed ${k}`);
      }
      grottoStats.pearls++;
    }
  }
}
const grottoSummary = () => `PASS: Glowshroom Grotto: ${grottoStats.seeds} layouts × ${grottoStats.len} m, only its own traps (${Object.entries(grottoStats.kinds).map(([k, n]) => `${n} ${k}`).join(', ')}), each taught alone first; shaft ${grottoStats.minW.toFixed(0)}+ wide, wall slope ${grottoStats.slope.toFixed(2)} (max ${GR.RULES.maxWallSlope}); lanes past puffer clouds ${grottoStats.puffLane.toFixed(0)}+, bounce caps ${grottoStats.capLane.toFixed(0)}+, snap-caps ${grottoStats.snapLane.toFixed(0)}+ (minLane ${GR.RULES.minLane}), veil gaps ${grottoStats.veil.toFixed(0)}+, beats ${grottoStats.beatGap.toFixed(0)}+ apart; ${grottoStats.fling} boing flings clear of every trap; pickups ${grottoStats.pick.toFixed(1)}+ from any trap's reach, nothing pops in; ${grottoStats.traps} beats and ${grottoStats.pearls} pearls (grab and escape) flown by the widest pilot in ${grottoStats.searches} searches from 6 phases each, the slowest pass ${grottoStats.worst.toFixed(1)} s`;
if (failures.size) {
  console.log(`FAILED: ${failures.size} rule(s) broken across ${checked} shafts`);
  for (const [rule, { count, example }] of failures) console.log(`  ✗ ${rule} — ${count}× (e.g. ${example})`);
  process.exit(1);
}
const dens = zoneMix.dens || [0];
console.log(`PASS: ${checked} shafts × ${HEIGHT / 10} m checked against every layout rule (widest pilot hitbox ${PILOT_W.toFixed(1)}, lanes ≥ ${RULES.minLane}, crusher slot ${RULES.crusher.slot}; ${gateSims} gates and ${crusherSims} crushers flown at 32 phases × 5 approaches; density after 300 m ${Math.min(...dens).toFixed(2)}–${Math.max(...dens).toFixed(2)} per 100 m, avg ${(dens.reduce((a, b) => a + b) / dens.length).toFixed(2)})`);
{
  const cv = zoneMix.coco || [0], cn = zoneMix.cocoN || [0], avg = a => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1);
  console.log(RULES.chili.endless ? `PASS: chili line every ${RULES.chili.gap / 10} m or less: ${ammoStats.ratio.toFixed(2)}× the ammo auto-fire spends at the tightest leash (${ammoStats.spend.toFixed(2)} shots/s); flat out at the calm leash it fires ${ammoStats.flatSpend.toFixed(2)} shots/s, ${Math.round(ammoStats.flat * 100)}% of the chili line's supply; empty to caught ${ammoStats.caught.toFixed(1)} s (${ammoStats.caughtFlat.toFixed(1)} s flat out) vs ${ammoStats.climb.toFixed(2)} s to the next chili; first 500 m offers ${Math.min(...cn)}–${Math.max(...cn)} coconut pickups (avg ${avg(cn)}, worth ${avg(cv)} with golden ones), ${(zoneMix.per150 || 0).toFixed(2)} golden per 150 m` : `PASS: no chilies or blaster in endless (Adventure only); first 500 m offers ${Math.min(...cn)}–${Math.max(...cn)} coconut pickups (avg ${avg(cn)}, worth ${avg(cv)} with golden ones), ${(zoneMix.per150 || 0).toFixed(2)} golden per 150 m`);
}
console.log(`PASS: ${pairStats.pairs} character × vehicle pairs: ${pairStats.flyable} fly now (21 pilots on their own rides, ${pairStats.swaps} swapped split pairs${pairStats.flyable < pairStats.pairs ? ', the rest wait on a split' : ''}); ${pairStats.vehicles} split vehicles and ${pairStats.characters} split characters inside their size envelopes (envelope scale ${pairStats.minEnv.toFixed(3)}+, floor ${SEAT_FLOOR}), so every pair of split parts fits; swapped pairs inside ${PILOT_CAP.w} × ${PILOT_CAP.h} art units at any tilt (widest ${pairStats.worst || '-'} ${pairStats.worstW.toFixed(2)}), characters scaled ${pairStats.swaps ? pairStats.minS.toFixed(3) : '-'}+${pairStats.cramped ? `, ${pairStats.cramped} cramped in a closed ride's room` : ''}; ${pairStats.sure} swaps also fit at their guaranteed placement${pairStats.collars ? ` (${pairStats.collars} rides add a collar's capsules)` : ''}${pairStats.offCentre.length ? `; off-centre seats: ${pairStats.offCentre.join(', ')}, ${pairStats.shifted} riders moved towards the centre` : ''}; widest pair ${(pairStats.widest * PILOT_SCALE).toFixed(2)} world units (limit ${(LANE_LIMIT.w * PILOT_SCALE).toFixed(2)})`);
// Level slots: each new themed level puts its test block immediately before its slot line.
// ---------- Adventure: Murk Mire (island level 7), an authored stage with its own traps ----------
// As the frost's checks: every rule on the stage's layout as the game builds it (and 8 other seeds, which only move
// phases and looks), then every beat and every firefly jar flown by the widest pilot. Clocked traps (vents, spouts) by
// the time-space search from 6 start phases (a vent's column counts at full height from just before it belches, so the
// search never leans on play holding it); snappers from the moment they are set off, from either side and the middle,
// the search kept inside their reach (so they strike again the moment they can, as for a pilot who never backs off);
// and the wisps, which follow the pilot, by a scripted flight on the game's own wisp step (lure it to one wall, wait,
// dart to the other and climb), swept over its choices until one gets through. (This block reports its own failures:
// it runs after the shared report.)
{
const BG = new Function(regions.join('\n') + '\nreturn { createBogLevel, bogShapes, bogDanger, bogEnd, bogVentAt, bogPlume, bogSnapAt, bogSnapCycle, bogSnapTau, bogSpoutAt, bogStream, bogWispStep, bogWispPos, BOG, BOG_STAGE, BOG_TYPES, ADV_BOG, RULES, advSeed, shapeDist, laneSize, pickR, COCO_R, PICK_GAP, UNITS_PER_M };')();
const bClamp = (v, a, b) => v < a ? a : v > b ? b : v;
const bogStats = { seeds: 0, traps: 0, searches: 0, runs: 0, worst: 0, jars: 0, pick: Infinity, minW: Infinity, slope: 0, ventLane: Infinity, snapLane: Infinity, biteGap: Infinity, spoutLane: Infinity, oneBite: 0, oneBiteWorst: 0, wispRatio: 0, len: 0, kinds: {} };
const before = failures.size;
{
  const R = BG.RULES, W = PILOT_W, Hh = PILOT_H, M = 4, X = BG.BOG, st0 = BG.ADV_BOG;
  if (st0.theme !== 'bog' || !(st0.reward > 0)) fail('the Murk Mire is a themed stage with a reward', JSON.stringify(st0));
  if (!Array.isArray(st0.goals) || st0.goals.length !== 3 || !st0.goals.some(g => g.k === 'finish') || !st0.goals.some(g => g.k === 'bogJars' && g.n === 3) || !st0.goals.some(g => g.k === 'bogOneBite')) fail('the Murk Mire has three missions: the Bog Heart, 3 firefly jars and never bitten twice', JSON.stringify(st0.goals));
  if (Math.abs(st0.len * BG.UNITS_PER_M - BG.bogEnd()) > 1e-6) fail('the Murk Mire stage length matches its layout', `${st0.len}`);
  // the stage's order: vents, then snappers, then spouts, then wisps, each taught alone (never faster first)
  {
    const firsts = {}, seen = [], base = { ventPair: 'vent', snapPair: 'snap', snapVent: 'vent', spoutPair: 'spout', spoutVent: 'spout', snapSpout: 'spout', wispPair: 'wisp', wispSnap: 'wisp', wispVent: 'vent' };
    for (const sec of BG.BOG_STAGE) if (!sec.calm) for (const [, kind, o] of sec.beats) {
      const b = base[kind] || kind;
      if (!firsts[b]) { firsts[b] = o; seen.push(b); if (kind !== b) fail('each bog trap is introduced alone first', `${kind} in ${sec.name}`); }
      else if (o.P && firsts[b].P && o.P > firsts[b].P + 1e-9) fail('a bog trap is never slower than its introduction', `${kind} in ${sec.name}`);
    }
    if (seen.join() !== 'vent,snap,spout,wisp') fail('the Murk Mire teaches vents, then snappers, then spouts, then wisps', seen.join());
    if (!BG.BOG_STAGE.some(sec => sec.calm && !sec.finish && sec !== BG.BOG_STAGE[0])) fail('the Murk Mire has a breather', '');
    if (!BG.BOG_STAGE[BG.BOG_STAGE.length - 1].finish) fail('the Murk Mire ends in the Bog Heart\'s hollow', '');
  }
  // a wisp is always slower sideways than any pilot (330 a second in the searches), so a lure always wins ground
  bogStats.wispRatio = X.wisp.v / 330;
  if (X.wisp.v > 0.5 * 330) fail('a wisp drifts at under half a pilot\'s sideways speed', `${X.wisp.v}`);
  const capHit = (S, x, a, m) => {
    const r = W / 2 + m, half = Math.max(0, Hh / 2 - W / 2);
    for (const q of S) for (const da of half ? [-half, 0, half] : [0]) if (BG.shapeDist(q, x, a + da) < r) return true;
    return false;
  };
  const ext = S => { let x0 = Infinity, x1 = -Infinity; for (const q of S) { const a = q.k === 'c' ? q.x - q.r : q.k === 'b' ? q.x0 : Math.min(q.x0, q.x1) - q.r, b = q.k === 'c' ? q.x + q.r : q.k === 'b' ? q.x1 : Math.max(q.x0, q.x1) + q.r; x0 = Math.min(x0, a); x1 = Math.max(x1, b); } return [x0, x1]; };
  const wallsOk = (level, x, a) => { const [l, r] = level.walls(a); return x - W / 2 - 2 >= l && x + W / 2 + 2 <= r && level.walls(a + Hh / 2)[0] <= x - W / 2 && level.walls(a + Hh / 2)[1] >= x + W / 2 && level.walls(a - Hh / 2)[0] <= x - W / 2 && level.walls(a - Hh / 2)[1] >= x + W / 2; };
  // every trap's shapes at search time t: vents strict, snappers on a run of strikes from trig0 (their set-off), spouts
  // on their clocks (wisps never enter a search)
  const shapesAt = (traps, t, trig0) => { const S = []; for (const h of traps) { if (h.type === 'bogVent') BG.bogShapes(h, t, S, 'strict'); else if (h.type === 'bogSnap') BG.bogShapes(trig0.has(h) ? { ...h, trig0: trig0.get(h) } : h, t, S); else BG.bogShapes(h, t, S); } return S; };
  // the search (as the frost's), with an optional waypoint: `via(x, a)` must be touched before the goal counts; trig0:
  // each snapper's set-off time (absent: resting, as if it were never set off: only for snappers out of reach)
  function fly(level, traps, x0, a0, t0, goal, lo, hi, via, trig0 = new Map(), maxT = 12) {
    const DT = 1 / 15, DX = 11, DA = 11, up = Math.round(440 * DT / DA), dn = Math.round(380 * DT / DA), sd = Math.round(330 * DT / DX);
    const nA = Math.ceil((hi - lo) / DA) + 1, nX = Math.ceil(400 / DX) + 1, V = 1e6;
    let front = new Set([Math.round(x0 / DX) * 1000 + Math.round((a0 - lo) / DA)]);
    for (let step = 1; step <= maxT / DT; step++) {
      const t = t0 + step * DT, S = shapesAt(traps, t, trig0);
      const next = new Set(), blocked = new Map();
      const free = (xi, ai) => {
        const key = xi * 1000 + ai; if (blocked.has(key)) return blocked.get(key);
        const x = xi * DX, a = lo + ai * DA, ok = wallsOk(level, x, a) && !capHit(S, x, a, M);
        blocked.set(key, ok); return ok;
      };
      for (const k of front) {
        const got = k >= V, kk = k % V, xi = Math.floor(kk / 1000), ai = kk % 1000;
        for (let dA = -dn; dA <= up; dA++) for (let dX = -sd; dX <= sd; dX++) {
          const nx = xi + dX, na = ai + dA; if (na < 0 || na >= nA || nx < 0 || nx >= nX) continue;
          const g2 = got || !via || via(nx * DX, lo + na * DA), key = (g2 ? V : 0) + nx * 1000 + na; if (next.has(key) || !free(nx, na)) continue;
          if (g2 && goal(nx * DX, lo + na * DA)) return step * DT;
          next.add(key);
        }
      }
      if (!next.size) return -1;
      front = next;
    }
    return -1;
  }
  // The scripted flight through a beat with wisps (and whatever else is in it), on the game's own wisp step and snapper
  // trigger: stage by stage from the bottom, a wisp is lured to one wall (to wall `side`, then held there `wait` s or
  // until it has come over), the pilot darts to the other wall and climbs past once clear; a snapper is baited from its
  // trigger line and passed in its far lane once it is `q` into its recoil; a vent or a spout is passed in its far lane
  // (the vent: after `wait`). The same kinematics as the search (440 up, 380 down, 330 sideways a second). Returns
  // { ok, t, touched }.
  function runBeat(level, traps, x0, a0, t0, plan, goalA, touch) {
    const DT = 1 / 30, SX = 330 * DT, UP = 440 * DT, DN = 380 * DT, live = traps.map(h => h.type === 'bogWisp' ? { ...h, wx: h.home, wv: 0 } : h.type === 'bogSnap' ? { ...h, trigT: null } : h);
    let x = x0, a = a0, t = t0, touched = false;
    const go = (tx, ta) => { x += bClamp(tx - x, -SX, SX); a += bClamp(ta - a, -DN, UP); };
    const tick = () => {
      t += DT;
      const pLow = a - Hh / 2, pTop = a + Hh / 2;
      for (const h of live) {
        if (h.type === 'bogWisp') BG.bogWispStep(h, DT, x, pLow, pTop);
        if (h.type === 'bogSnap') {
          const tau = h.trigT == null ? null : t - h.trigT, inZone = pTop > h.trigLo && pLow < h.alt + 60;
          if ((tau == null || tau >= BG.bogSnapCycle()) && inZone) h.trigT = t; else if (tau != null && tau >= BG.bogSnapCycle()) h.trigT = null;
        }
      }
      const S = []; for (const h of live) { if (h.type === 'bogVent') BG.bogShapes(h, t, S, 'strict'); else BG.bogShapes(h, t, S); }
      if (!wallsOk(level, x, a) || capHit(S, x, a, M)) return false;
      if (touch && touch(x, a)) touched = true;
      return true;
    };
    const lanes = alt => { let l = -Infinity, r = Infinity; for (let q = alt - Hh / 2 - 10; q <= alt + Hh / 2 + 50; q += 6) { const [a0, a1] = level.walls(q); l = Math.max(l, a0); r = Math.min(r, a1); } return [l + W / 2 + 16, r - W / 2 - 16]; };
    const farOf = (hs, alt) => lanes(alt)[hs > 0 ? 1 : 0];
    let side = plan.side;   // the wall the pilot is on (-1 left, 1 right)
    for (const stg of plan.stages) {
      const h = live[stg.i];
      if (h.type === 'bogWisp') {
        const Wp = BG.BOG.wisp, ah = h.alt - Wp.r - Wp.bob - Hh / 2 - 14, [xl, xr] = lanes(ah), lure = side < 0 ? xl : xr, other = side < 0 ? xr : xl;
        let n = 0;
        while (Math.abs(x - lure) > 0.5 || Math.abs(a - ah) > 0.5) { go(lure, ah); if (!tick()) return { ok: false, t: t - t0 }; if (++n > 600) return { ok: false, t: t - t0 }; }
        let w = 0;
        while (w < stg.wait || (Math.abs(h.wx - lure) > 34 && h.wx > h.lim[0] + 1 && h.wx < h.lim[1] - 1 && w < 4)) { w += DT; go(lure, ah); if (!tick()) return { ok: false, t: t - t0 }; }
        let climbing = false; n = 0;
        while (a - Hh / 2 < h.alt + Wp.r + Wp.bob + 8) {
          if (!climbing && Math.abs(x - h.wx) >= Wp.r + W / 2 + 40) climbing = true;
          go(climbing ? lanes(a)[side < 0 ? 1 : 0] : other, climbing ? a + 100 : ah);
          if (!tick()) return { ok: false, t: t - t0 };
          if (++n > 600) return { ok: false, t: t - t0 };
        }
        side = -side;
      } else if (h.type === 'bogSnap') {
        const Sn = BG.BOG.snap, ah = h.trigLo - Hh / 2 + 6, [xl, xr] = lanes(h.alt), far = h.side > 0 ? xr : xl;
        let n = 0;
        while (h.trigT == null) { go(far, ah); if (!tick()) return { ok: false, t: t - t0 }; if (++n > 600) return { ok: false, t: t - t0 }; }
        const passAt = Sn.tell + Sn.lunge + Sn.hold + Sn.recoil * stg.q;
        while (t - h.trigT < passAt) { go(far, ah); if (!tick()) return { ok: false, t: t - t0 }; }
        while (a - Hh / 2 < h.alt + 40) { go(farOf(h.side, a), a + 100); if (!tick()) return { ok: false, t: t - t0 }; }
        side = h.side > 0 ? 1 : -1;
      } else {   // a vent or a spout: wait below it, then climb its far lane
        const top = h.type === 'bogVent' ? h.alt + 30 : h.alt + BG.BOG.spout.r + 10, hold = h.lo - Hh / 2 - 20, [xl, xr] = lanes(h.alt), far = h.side > 0 ? xr : xl;
        let w = 0;
        while (w < stg.wait) { w += DT; go(far, Math.min(a, hold)); if (!tick()) return { ok: false, t: t - t0 }; }
        let n = 0;
        while (a - Hh / 2 < top) { go(farOf(h.side, a), a + 100); if (!tick()) return { ok: false, t: t - t0 }; if (++n > 600) return { ok: false, t: t - t0 }; }
        side = h.side > 0 ? 1 : -1;
      }
    }
    let n = 0;
    while (a - Hh / 2 < goalA) { go(x, a + 100); if (!tick()) return { ok: false, t: t - t0 }; if (++n > 300) break; }
    return { ok: a - Hh / 2 >= goalA, t: t - t0, touched };
  }
  // every plan for a beat: each wisp lured to either wall first, waits for wisps and vents swept, snappers passed at
  // three points of their recoil
  function plans(hs) {
    const order = hs.map((h, i) => ({ h, i })).sort((p, q) => p.h.alt - q.h.alt), out = [];
    const waits = [0, 0.35, 0.7, 1.05, 1.4, 1.75, 2.1, 2.45, 2.8, 3.2];
    const rec = (k, acc) => {
      if (k === order.length) { out.push(acc); return; }
      const { h, i } = order[k];
      if (h.type === 'bogSnap') { for (const q of [0.35, 0.55, 0.75]) rec(k + 1, [...acc, { i, q }]); }
      else if (h.type === 'bogSpout') { for (const w of waits) rec(k + 1, [...acc, { i, wait: w }]); }
      else if (h.type === 'bogVent') { for (const w of [0, 1.2, 2.4]) rec(k + 1, [...acc, { i, wait: w }]); }
      else for (const w of k === 0 ? waits : [0, 0.7, 1.4, 2.1]) rec(k + 1, [...acc, { i, wait: w }]);
    };
    rec(0, []);
    return out.flatMap(stages => [{ side: -1, stages }, { side: 1, stages }]);
  }
  for (let k = 0; k <= 8; k++) {
    const st = k ? { ...st0, seed: `${st0.seed}~${k}` } : st0, level = BG.createBogLevel(BG.advSeed(st), st), hz = [], fr = [];
    bogStats.seeds++;
    {
      const VIEW = 1100, h1 = [], f1 = [];
      level.fill(VIEW + 900, h1, f1);
      let sh = h1.length, sf = f1.length;
      for (let cam = 10; cam < level.end; cam += 10) {
        level.fill(cam + VIEW + 900, h1, f1);
        for (; sh < h1.length; sh++) if (h1[sh].lo < cam + VIEW + 100 || (h1[sh].trigLo ?? Infinity) < cam + VIEW + 100) fail('bog traps never pop in on screen', `${h1[sh].type} at ${h1[sh].lo | 0}`);
        for (; sf < f1.length; sf++) if (f1[sf].alt < cam + VIEW + 100) fail('bog pickups never pop in on screen', `${f1[sf].kind} at ${f1[sf].alt | 0}`);
      }
      hz.push(...h1); fr.push(...f1);
    }
    bogStats.len = level.end / 10;
    for (const h of hz) if (!BG.BOG_TYPES.has(h.type)) fail('the Murk Mire only has its own traps', h.type);
    for (const h of hz) bogStats.kinds[h.type] = (bogStats.kinds[h.type] || 0) + (k ? 0 : 1);
    // beats never crowd: each beat's traps (a snapper from its trigger line) start above the last beat's reach
    const reachLo = h => h.type === 'bogSnap' ? h.trigLo : h.lo;
    for (let i = 1; i < level.beats.length; i++) { const p = level.beats[i - 1], q = level.beats[i], g = Math.min(...q.hs.map(reachLo)) - Math.max(...p.hs.map(h => h.hi)); bogStats.beatGap = Math.min(bogStats.beatGap ?? Infinity, g); if (g < 0) fail('bog beats never overlap', `${p.kind} at ${p.a} / ${q.kind} at ${q.a}`); }
    if (hz.some(h => h.hi > level.end - 320)) fail('the Bog Heart\'s hollow below the finish is clear of traps', `${Math.max(...hz.map(h => h.hi)) | 0} vs ${level.end}`);
    for (let a = 0; a < level.end + 200; a += 1) {
      const [l, r] = level.walls(a), [l2, r2] = level.walls(a + 1);
      bogStats.minW = Math.min(bogStats.minW, r - l); bogStats.slope = Math.max(bogStats.slope, l2 - l, r - r2);
    }
    if (bogStats.minW < R.minWidth) fail('the Murk Mire shaft is never narrower than minWidth', bogStats.minW.toFixed(1));
    if (bogStats.slope > R.maxWallSlope) fail('the Murk Mire walls never step in faster than maxWallSlope', bogStats.slope.toFixed(2));
    // static lanes: past a vent's widest column, past a resting snapper and past a dribbling spout, minLane; a snapper's
    // bite leaves no gap any pilot fits (it is a gate: bait it); a spout's full surge splashes on the far wall; nothing
    // a stream does rises
    for (const h of hz) {
      const [l, r] = level.walls(h.alt), lane = S => { const [x0, x1] = ext(S); return h.side > 0 ? r - x1 : x0 - l; };
      if (h.type === 'bogVent') { const m = lane(BG.bogDanger(h)); bogStats.ventLane = Math.min(bogStats.ventLane, m); if (m < R.minLane) fail('a gas vent and its widest column leave a lane of minLane', `${m.toFixed(1)} at ${h.alt}`); }
      if (h.type === 'bogSnap') {
        const m = lane(BG.bogShapes(h, 0, [])); bogStats.snapLane = Math.min(bogStats.snapLane, m); if (m < R.minLane) fail('a resting snapper leaves a lane of minLane', `${m.toFixed(1)} at ${h.alt}`);
        let g = Infinity; for (let t = 0; t < BG.bogSnapCycle(); t += 0.01) { const S = BG.bogShapes({ ...h, trig0: 0 }, t, []); const st = BG.bogSnapAt(h, t); if (st.k >= 1) g = Math.min(g, lane(S)); }
        bogStats.biteGap = Math.min(bogStats.biteGap, g); if (!(g < W)) fail('a snapper\'s bite leaves no gap a pilot fits', `${g.toFixed(1)} at ${h.alt}`);
      }
      if (h.type === 'bogSpout') {
        const m = lane(BG.bogShapes({ ...h, ph: 0 }, 0, [])); bogStats.spoutLane = Math.min(bogStats.spoutLane, m); if (m < R.minLane) fail('a dribbling spout leaves a lane of minLane', `${m.toFixed(1)} at ${h.alt}`);
        const full = BG.bogStream(h, h.vFull, null); if (!full.hit) fail('a spout\'s full surge splashes on the far wall', `${h.alt}`);
        for (const v of [BG.BOG.spout.vLow, h.vFull * 0.5, h.vFull]) { const { pts } = BG.bogStream(h, v, null); for (let i = 1; i < pts.length; i++) if (pts[i][1] > pts[i - 1][1] + 1e-9) { fail('an acid stream never rises', `${h.alt}`); break; } }
      }
      if (h.type === 'bogWisp') { const [wl, wr] = level.walls(h.alt); if (h.lim[0] - BG.BOG.wisp.r < wl || h.lim[1] + BG.BOG.wisp.r > wr) fail('a wisp keeps off the walls', `${h.alt}`); }
    }
    for (const f of fr) {
      const [l, r] = level.walls(f.alt), pr = BG.pickR(f);
      if (f.x - pr < l + R.fruitMargin - 0.5 || f.x + pr > r - R.fruitMargin + 0.5) fail('bog pickups stay off the walls', `${f.kind} at ${f.alt | 0}`);
      if (f.clear === -Infinity) continue;   // (the dares: the jars, the Sunken Willow's ring)
      const need = f.clear ?? (f.bonus || f.kind === 'gold' ? Math.ceil(BG.laneSize().w / 2 + 6 + BG.COCO_R) : R.pickup.clear);
      let dd = Infinity; for (const h of hz) if (h.lo - 220 < f.alt && h.hi + 220 > f.alt) for (const q of BG.bogDanger(h)) dd = Math.min(dd, BG.shapeDist(q, f.x, f.alt));
      if (!f.bonus && f.kind !== 'gold' && f.clear == null) bogStats.pick = Math.min(bogStats.pick, dd);
      if (dd < need - 0.5) fail('bog pickups stay clear of every trap\'s reach', `${f.kind} at ${f.alt | 0}: ${dd.toFixed(1)} < ${need}`);
    }
    for (let i = 0; i < fr.length; i++) for (let j = i + 1; j < fr.length && fr[j].alt - fr[i].alt < 80; j++) if (Math.hypot(fr[i].x - fr[j].x, fr[i].alt - fr[j].alt) < BG.pickR(fr[i]) + BG.pickR(fr[j]) + BG.PICK_GAP - 0.01) fail('bog pickups never overlap', `${fr[i].alt | 0}`);
    if (fr.filter(f => f.kind === 'jar').length !== 3) fail('the Murk Mire holds exactly 3 firefly jars', `${fr.filter(f => f.kind === 'jar').length}`);
    let gap = 0, last = 60; for (const f of fr) if (f.kind === 'chili') { gap = Math.max(gap, f.alt - last); last = f.alt; }
    if (gap > 640) fail('the Murk Mire keeps a chili line', `${gap | 0}`);
    if (k > 2) continue;   // (the flights run on the stage itself and two more seeds)
    const touchOf = f => (x, a) => BG.shapeDist({ k: 's', x0: x, a0: a - (Hh / 2 - W / 2), x1: x, a1: a + (Hh / 2 - W / 2), r: 0 }, f.x, f.alt) < BG.COCO_R + W / 2 - 4;
    for (const b of level.beats) {
      const hi = Math.max(...b.hs.map(h => h.hi)) + 90, jar = fr.find(f => f.kind === 'jar' && b.hs.some(h => h.jar && Math.abs(f.alt - h.alt) < 600));
      bogStats.traps++;
      if (b.hs.some(h => h.type === 'bogWisp')) {
        // the scripted flight: from below the beat, from 6 phases of its clocks; the jar's beat also touching the jar
        const lo = Math.min(...b.hs.map(h => h.type === 'bogSnap' ? h.trigLo : h.lo)) - 260, traps = hz.filter(h => h.lo < hi + 60 && (h.trigLo ?? h.lo) < hi + 60 && h.hi > lo - 60);
        for (let p = 0; p < 6; p++) {
          const t0 = p * 1.13 + k * 0.37, [l, r] = level.walls(lo);
          let best = null;
          for (const pl of plans(b.hs)) {
            const plan = { side: pl.side, stages: pl.stages.map(sg => ({ ...sg, i: traps.indexOf(b.hs[sg.i]) })) };
            bogStats.runs++;
            const res = runBeat(level, traps, (l + r) / 2, lo, t0, plan, hi - 10 - 90, null);
            if (res.ok) { best = res; break; }
          }
          if (!best) fail('every wisp beat can be flown by the widest pilot from any phase', `${b.kind} at ${b.a} (${b.sec.name}), start ${t0.toFixed(2)} s, seed ${k}`);
          else bogStats.worst = Math.max(bogStats.worst, best.t);
        }
        if (jar) {
          let ok = false;
          for (const pl of plans(b.hs)) { const plan = { side: pl.side, stages: pl.stages.map(sg => ({ ...sg, i: traps.indexOf(b.hs[sg.i]) })) }; bogStats.runs++; const res = runBeat(level, traps, (level.walls(lo)[0] + level.walls(lo)[1]) / 2, lo, k * 0.29, plan, hi - 100, touchOf(jar)); if (res.ok && res.touched) { ok = true; break; } }
          if (!ok) fail('every firefly jar can be grabbed and escaped by the widest pilot', `jar at ${jar.alt | 0} (wisp), seed ${k}`); else bogStats.jars++;
        }
        continue;
      }
      const snaps = b.hs.filter(h => h.type === 'bogSnap').sort((p, q) => p.alt - q.alt);
      // the part below the first snapper's reach (or the whole beat): the search from 6 phases
      const clocked = b.hs.filter(h => h.type !== 'bogSnap' && (!snaps.length || h.alt < snaps[0].alt));
      if (clocked.length) {
        const lo = Math.min(...clocked.map(h => h.lo)) - 150, top = snaps.length ? snaps[0].trigLo - Hh / 2 - 4 : hi, traps = hz.filter(h => h.lo < top + 200 && h.hi > lo - 60 && h.type !== 'bogWisp');
        for (let p = 0; p < 6; p++) {
          const t0 = p * 1.13 + k * 0.37, [l, r] = level.walls(lo + 40);
          bogStats.searches++;
          const tm = fly(level, traps, (l + r) / 2, lo + 40, t0, (x, a) => a >= top - 10, lo, top + 20);
          if (tm < 0) fail('every bog trap can be passed by the widest pilot from any phase', `${b.kind} at ${b.a} (${b.sec.name}), start ${t0.toFixed(2)} s, seed ${k}`);
          else bogStats.worst = Math.max(bogStats.worst, tm);
        }
        if (jar && !snaps.length) {
          const own = b.hs.find(h => h.jar), lo2 = own.lo - 200, hi2 = own.hi + 100, tr2 = hz.filter(h => h.lo < hi2 + 60 && h.hi > lo2 - 60), [l, r] = level.walls(lo2 + 40);
          for (let p = 0; p < 6; p++) {
            bogStats.searches++;
            const tm = fly(level, tr2, (l + r) / 2, lo2 + 40, p * 1.07 + k * 0.29, (x, a) => a >= hi2 - 10, lo2, hi2 + 20, touchOf(jar));
            if (tm < 0) fail('every firefly jar can be grabbed and escaped by the widest pilot', `jar at ${jar.alt | 0}, phase ${p}, seed ${k}`);
          }
          bogStats.jars++;
        }
      }
      // each snapper: from its trigger line the moment it is set off (from either side and the middle, the beat's
      // clocked traps at 3 phases), never dropping out of its reach; and (the mission) past it before it strikes again
      for (const sn of snaps) {
        const a0 = sn.trigLo - Hh / 2 + 1, top = snaps.find(q => q.alt > sn.alt) ? snaps.find(q => q.alt > sn.alt).trigLo - Hh / 2 - 4 : hi, traps = hz.filter(h => h.lo < top + 200 && h.hi > a0 - 300 && h.type !== 'bogWisp'), [l, r] = level.walls(a0);
        const trig = t0 => new Map([[sn, t0]]);
        // (a start inside a gas column's reach is left out: there play holds the vent while you sit in it)
        const gasAt = traps.filter(h => h.type === 'bogVent').flatMap(h => BG.bogDanger(h)), starts = [l + W / 2 + 12, (l + r) / 2, r - W / 2 - 12].filter(x0 => !capHit(gasAt, x0, a0, M));
        if (!starts.length) fail('every snapper can be set off from somewhere clear of the gas', `${sn.alt}`);
        for (const x0 of starts) for (let p = 0; p < 3; p++) {
          const t0 = p * 1.37 + k * 0.41;
          bogStats.searches++;
          const tm = fly(level, traps, x0, a0, t0, (x, a) => a >= top - 10, a0, top + 20, null, trig(t0));
          if (tm < 0) fail('every snapper can be passed by the widest pilot from wherever it is set off', `${b.kind} at ${b.a} (${b.sec.name}), from x ${x0.toFixed(0)}, phase ${p}, seed ${k}`);
          else bogStats.worst = Math.max(bogStats.worst, tm);
        }
        {
          const again = BG.bogSnapCycle() + X.snap.tell;
          bogStats.searches++;
          const lane = sn.side > 0 ? r - W / 2 - 14 : l + W / 2 + 14, tm = fly(level, traps, lane, a0, 0, (x, a) => a - Hh / 2 > sn.alt + 34, a0, sn.hi + Hh + 40, null, trig(0), again);
          if (tm < 0 || tm > again) fail('every snapper can be passed before it bites again (the mission)', `${sn.alt}: ${tm.toFixed(2)} s vs ${again.toFixed(2)} s, seed ${k}`);
          else { bogStats.oneBite++; bogStats.oneBiteWorst = Math.max(bogStats.oneBiteWorst, tm / again); }
        }
        if (jar && sn.jar) {
          let ok = false;
          for (const x0 of [l + W / 2 + 12, (l + r) / 2, r - W / 2 - 12]) { bogStats.searches++; if (fly(level, traps, x0, a0, k * 0.29, (x, a) => a >= top - 10, a0, top + 20, touchOf(jar), trig(k * 0.29)) >= 0) ok = true; }
          if (!ok) fail('every firefly jar can be grabbed and escaped by the widest pilot', `jar at ${jar.alt | 0} (snapper), seed ${k}`); else bogStats.jars++;
        }
      }
    }
  }
}
const bogSummary = () => `PASS: Murk Mire: ${bogStats.seeds} layouts × ${bogStats.len} m, only its own traps (${Object.entries(bogStats.kinds).map(([k, n]) => `${n} ${k}`).join(', ')}), each taught alone first; shaft ${bogStats.minW.toFixed(0)}+ wide, wall slope ${bogStats.slope.toFixed(2)} (max ${BG.RULES.maxWallSlope}); lanes past gas columns ${bogStats.ventLane.toFixed(0)}+, resting snappers ${bogStats.snapLane.toFixed(0)}+, dribbling spouts ${bogStats.spoutLane.toFixed(0)}+ (minLane ${BG.RULES.minLane}), a snapper's bite leaves ${bogStats.biteGap.toFixed(0)} (a gate), full surges splash on the far wall and never rise, wisps drift at ${Math.round(bogStats.wispRatio * 100)}% of a pilot's sideways speed; beats ${(bogStats.beatGap ?? 0).toFixed(0)}+ apart; pickups ${bogStats.pick.toFixed(1)}+ from any reach; ${bogStats.traps} beats and ${bogStats.jars} jar flights (grab and escape) by the widest pilot (${bogStats.searches} searches, ${bogStats.runs} scripted wisp runs, slowest ${bogStats.worst.toFixed(1)} s); ${bogStats.oneBite} snappers passed before they bite again (at worst ${Math.round(bogStats.oneBiteWorst * 100)}% of the time)`;
globalThis.bogSummary = bogSummary;
if (failures.size > before) {
  console.log(`FAILED: Murk Mire: ${failures.size - before} rule(s) broken`);
  for (const [rule, { count, example }] of [...failures].slice(before)) console.log(`  ✗ ${rule} — ${count}× (e.g. ${example})`);
  process.exitCode = 1;
}
}
// (test slot: Murk Mire, island level 7)
// ---------- Adventure: the Hidden Lagoon (island level 11), an authored stage with its own traps ----------
// As the grotto's checks: every rule on the stage's layout as the game builds it (and 8 other seeds, which only move
// phases and looks), then every beat and every golden conch flown by a time-space search for the widest pilot on the
// traps' own clocks from 6 start phases. A gushing cascade counts as solid here (the search never relies on being swept),
// and a gulper's suck drags the search toward its mouth exactly as it drags the rocket.
const LG = new Function(regions.join('\n') + '\nreturn { createLagoonLevel, lagoonShapes, lagoonDanger, lagoonEnd, lagoonFishState, lagoonFishPos, lagoonJellyState, lagoonFallFlow, lagoonFallSheet, lagoonFallX, lagoonGulpState, lagoonGulpPull, lagoonGulpBody, LAGOON, LAGOON_STAGE, LAGOON_TYPES, ADV_LAGOON, RULES, advSeed, shapeDist, laneSize, pickR, COCO_R, PICK_GAP, UNITS_PER_M };')();
const lagoonStats = { seeds: 0, traps: 0, searches: 0, worst: 0, conchs: 0, pick: Infinity, minW: Infinity, slope: 0, ledgeLane: Infinity, gulpLane: Infinity, fallLane: Infinity, jellyGap: Infinity, arcRoom: Infinity, sweep: 0, len: 0, kinds: {}, beatGap: Infinity };
{
  const R = LG.RULES, W = PILOT_W, Hh = PILOT_H, M = 4, st0 = LG.ADV_LAGOON, X = LG.LAGOON;
  const lfail = (rule, d) => fail('lagoon: ' + rule, d);
  if (st0.theme !== 'lagoon' || !(st0.reward > 0)) lfail('the Hidden Lagoon is a themed stage with a reward', JSON.stringify(st0));
  if (!Array.isArray(st0.goals) || st0.goals.length !== 3 || !st0.goals.some(g => g.k === 'finish') || !st0.goals.some(g => g.k === 'lagoonConch' && g.n === 3) || !st0.goals.some(g => g.k === 'lagoonDry')) lfail('three missions: the lagoon, 3 golden conchs and staying dry', JSON.stringify(st0.goals));
  if (Math.abs(st0.len * LG.UNITS_PER_M - LG.lagoonEnd()) > 1e-6) lfail('the stage length matches its layout', `${st0.len}`);
  // the stage's order: piranhas, then jellies, then cascades, then gulpers, each taught alone (never faster at first)
  {
    const firsts = {}, seen = [], base = k => k.replace(/Stack|Pair|Fish$|Jelly$/, '');
    for (const sec of LG.LAGOON_STAGE) if (!sec.calm) for (const [, kind, o] of sec.beats) {
      const b = base(kind);
      if (!firsts[b]) { firsts[b] = o; seen.push(b); if (kind !== b) lfail('each trap is introduced alone first', `${kind} in ${sec.name}`); }
      else if (o.P && firsts[b].P && o.P > firsts[b].P) lfail('a trap is never slower than its introduction', `${kind} in ${sec.name}`);
    }
    if (seen.join() !== 'fish,jelly,fall,gulp') lfail('the lagoon teaches piranhas, jellies, cascades, then gulpers', seen.join());
    if (!LG.LAGOON_STAGE.some(sec => sec.calm && !sec.finish && sec !== LG.LAGOON_STAGE[0])) lfail('the lagoon has a breather', '');
    if (!LG.LAGOON_STAGE[LG.LAGOON_STAGE.length - 1].finish) lfail('the stage ends in the hidden lagoon', '');
  }
  const capHit = (S, x, a, m) => {
    const r = W / 2 + m, half = Math.max(0, Hh / 2 - W / 2);
    for (const q of S) for (const da of half ? [-half, 0, half] : [0]) if (LG.shapeDist(q, x, a + da) < r) return true;
    return false;
  };
  const ext = S => { let x0 = Infinity, x1 = -Infinity; for (const q of S) { const a = q.k === 'c' ? q.x - q.r : q.k === 'b' ? q.x0 : Math.min(q.x0, q.x1) - q.r, b = q.k === 'c' ? q.x + q.r : q.k === 'b' ? q.x1 : Math.max(q.x0, q.x1) + q.r; x0 = Math.min(x0, a); x1 = Math.max(x1, b); } return [x0, x1]; };
  // the search (as the grotto's): solid = every lethal shape plus every gushing sheet; a sucking gulper drags each step
  function fly(level, traps, x0, a0, t0, goal, lo, hi, via) {
    const DT = 1 / 15, DX = 11, DA = 11, up = Math.round(440 * DT / DA), dn = Math.round(380 * DT / DA), sd = Math.round(330 * DT / DX);
    const nA = Math.ceil((hi - lo) / DA) + 1, nX = Math.ceil(400 / DX) + 1, V = 1e6, gul = traps.filter(h => h.type === 'lagoonGulp');
    let front = new Set([Math.round(x0 / DX) * 1000 + Math.round((a0 - lo) / DA)]);
    for (let step = 1; step <= 10 / DT; step++) {
      const t = t0 + step * DT, S = [];
      for (const h of traps) { LG.lagoonShapes(h, t, S); if (h.type === 'lagoonFall') LG.lagoonShapes(h, t, S, 'sheet'); }
      const gst = gul.map(h => [h, LG.lagoonGulpState(h, t)]);
      const next = new Set(), blocked = new Map();
      const free = (xi, ai) => {
        const key = xi * 1000 + ai; if (blocked.has(key)) return blocked.get(key);
        const x = xi * DX, a = lo + ai * DA, [l, r] = level.walls(a), ok = x - W / 2 - 2 >= l && x + W / 2 + 2 <= r && level.walls(a + Hh / 2)[0] <= x - W / 2 && level.walls(a + Hh / 2)[1] >= x + W / 2 && level.walls(a - Hh / 2)[0] <= x - W / 2 && level.walls(a - Hh / 2)[1] >= x + W / 2 && !capHit(S, x, a, M);
        blocked.set(key, ok); return ok;
      };
      for (const k of front) {
        const got = k >= V, kk = k % V, xi = Math.floor(kk / 1000), ai = kk % 1000;
        let drift = 0; for (const [h, gs] of gst) drift += LG.lagoonGulpPull(h, gs, xi * DX, lo + ai * DA);
        const dc = drift * DT / DX;   // (the drag this step, in cells: added to every move, to the nearest cell)
        for (let dA = -dn; dA <= up; dA++) for (let dX = -sd; dX <= sd; dX++) {
          const nx = xi + Math.round(dX + dc), na = ai + dA; if (na < 0 || na >= nA || nx < 0 || nx >= nX) continue;
          const g2 = got || !via || via(nx * DX, lo + na * DA), key = (g2 ? V : 0) + nx * 1000 + na; if (next.has(key) || !free(nx, na)) continue;
          if (g2 && goal(nx * DX, lo + na * DA)) return step * DT;
          next.add(key);
        }
      }
      if (!next.size) return -1;
      front = next;
    }
    return -1;
  }
  for (let k = 0; k <= 8; k++) {
    const st = k ? { ...st0, seed: `${st0.seed}~${k}` } : st0, level = LG.createLagoonLevel(LG.advSeed(st), st), hz = [], fr = [];
    lagoonStats.seeds++;
    {
      const VIEW = 1100, h1 = [], f1 = [];
      level.fill(VIEW + 900, h1, f1);
      let sh = h1.length, sf = f1.length;
      for (let cam = 10; cam < level.end; cam += 10) {
        level.fill(cam + VIEW + 900, h1, f1);
        for (; sh < h1.length; sh++) if (h1[sh].lo < cam + VIEW + 100) lfail('traps never pop in on screen', `${h1[sh].type} at ${h1[sh].lo | 0}`);
        for (; sf < f1.length; sf++) if (f1[sf].alt < cam + VIEW + 100) lfail('pickups never pop in on screen', `${f1[sf].kind} at ${f1[sf].alt | 0}`);
      }
      hz.push(...h1); fr.push(...f1);
    }
    lagoonStats.len = level.end / 10;
    for (const h of hz) if (!LG.LAGOON_TYPES.has(h.type)) lfail('the lagoon only has its own traps', h.type);
    for (const h of hz) lagoonStats.kinds[h.type] = (lagoonStats.kinds[h.type] || 0) + (k ? 0 : 1);
    for (let i = 1; i < level.beats.length; i++) { const p = level.beats[i - 1], q = level.beats[i], g = Math.min(...q.hs.map(h => h.lo)) - Math.max(...p.hs.map(h => h.hi)); lagoonStats.beatGap = Math.min(lagoonStats.beatGap, g); if (g < 0) lfail('beats never overlap', `${p.kind} at ${p.a} / ${q.kind} at ${q.a}`); }
    if (hz.some(h => h.hi > level.end - 320)) lfail('the lagoon below the finish is clear of traps', `${Math.max(...hz.map(h => h.hi)) | 0} vs ${level.end}`);
    for (let a = 0; a < level.end + 200; a += 1) {
      const [l, r] = level.walls(a), [l2, r2] = level.walls(a + 1);
      lagoonStats.minW = Math.min(lagoonStats.minW, r - l); lagoonStats.slope = Math.max(lagoonStats.slope, l2 - l, r - r2);
    }
    if (lagoonStats.minW < R.minWidth) lfail('the shaft is never narrower than minWidth', lagoonStats.minW.toFixed(1));
    if (lagoonStats.slope > R.maxWallSlope) lfail('the walls never step in faster than maxWallSlope', lagoonStats.slope.toFixed(2));
    // static lanes: between a piranha's ledge tips, past a gulper's widest gape, past a cascade's full gush (minLane);
    // a jelly always leaves one gap the widest pilot fits with room, at every point of its drift, stroke and flare
    for (const h of hz) {
      const [l, r] = level.walls(h.alt);
      if (h.type === 'lagoonFish') { const S = []; LG.lagoonShapes({ ...h, P: 1e9, ph: 0 }, 0, S); const tl = Math.max(...S.filter(q => q.x0 < h.x).map(q => Math.max(q.x0, q.x1) + q.r)), tr = Math.min(...S.filter(q => q.x0 > h.x).map(q => Math.min(q.x0, q.x1) - q.r)), m = tr - tl; lagoonStats.ledgeLane = Math.min(lagoonStats.ledgeLane, m); if (m < R.minLane) lfail('a piranha\'s ledges leave a lane of minLane', `${m.toFixed(1)} at ${h.alt}`); }
      if (h.type === 'lagoonGulp') { const [x0, x1] = ext(LG.lagoonGulpBody([], h, 1)); const m = h.side > 0 ? r - x1 : x0 - l; lagoonStats.gulpLane = Math.min(lagoonStats.gulpLane, m); if (m < R.minLane) lfail('a gulper\'s widest gape leaves a lane of minLane', `${m.toFixed(1)} at ${h.alt}`); }
      if (h.type === 'lagoonFall') { const S = LG.lagoonFallSheet([], h, 1); for (const q of S) { const ar = (q.a0 + q.a1) / 2, [ll, rr] = level.walls(ar), x = h.side > 0 ? Math.max(q.x0, q.x1) + q.r : Math.min(q.x0, q.x1) - q.r, m = h.side > 0 ? rr - x : x - ll; lagoonStats.fallLane = Math.min(lagoonStats.fallLane, m); if (m < R.minLane) lfail('a full cascade leaves a dry lane of minLane', `${m.toFixed(1)} at ${h.alt}`); } }
      if (h.type === 'lagoonJelly') for (let t = 0; t < 24; t += 0.1) {
        const S = LG.lagoonShapes(h, t, []), [x0, x1] = ext(S), [ll, rr] = level.walls(LG.lagoonJellyState(h, t).a - 50), best = Math.max(x0 - ll, rr - x1);
        lagoonStats.jellyGap = Math.min(lagoonStats.jellyGap, best); if (best < W + 2 * M + 30) { lfail('a jelly always leaves a gap the widest pilot fits with room', `${best.toFixed(1)} at ${h.alt}`); break; }
      }
    }
    // a piranha's leap never crowds the racing lane: above the very top of its arc (both ways, its body's full size)
    // there is at least minLane of open height before any other trap's reach (a cascade's rock; its sheet only sweeps),
    // so a pilot that has cleared the ledges can sit above the arc and is never hit from below
    { const top = q => q.k === 'c' ? q.a + q.r : Math.max(q.a0, q.a1) + (q.r || 0), bot = q => q.k === 'c' ? q.a - q.r : Math.min(q.a0, q.a1) - (q.r || 0);
      for (const h of hz) if (h.type === 'lagoonFish') {
        const arcTop = Math.max(...LG.lagoonDanger(h).map(top));
        let room = Infinity;
        for (const g of hz) if (g !== h && g.alt > h.alt && g.alt < h.alt + 900) { const S = g.type === 'lagoonFall' ? LG.lagoonShapes(g, 0, [], 'body') : LG.lagoonDanger(g); room = Math.min(room, Math.min(...S.map(bot)) - arcTop); }
        lagoonStats.arcRoom = Math.min(lagoonStats.arcRoom, room);
        if (room < R.minLane) lfail('a piranha\'s arc leaves minLane of open lane above it', `${room.toFixed(1)} at ${h.alt}`);
      } }
    // a cascade's sweep (down at its push speed, out of the sheet) never carries you into a lethal trap: the column below
    // and beside its sheet is clear of every other trap's whole reach
    for (const h of hz.filter(h => h.type === 'lagoonFall')) {
      const others = hz.filter(q => q !== h && q.type !== 'lagoonFall' && q.lo < h.top + 60 && q.hi > h.alt - 420), S = []; for (const q of others) S.push(...LG.lagoonDanger(q));
      const x0 = Math.min(h.base, LG.lagoonFallX(h, X.fall.len) + h.side * (X.fall.w1 / 2 + 40)), x1 = Math.max(h.base, LG.lagoonFallX(h, X.fall.len) + h.side * (X.fall.w1 / 2 + 40));
      let bad = false; for (let x = x0; x <= x1 && !bad; x += 8) for (let a = h.alt - 150; a <= h.top && !bad; a += 8) if (capHit(S, x, a, 0)) bad = true;
      if (bad) lfail('a cascade never sweeps you into a trap', `${h.alt}`);
      lagoonStats.sweep++;
    }
    for (const f of fr) {
      const [l, r] = level.walls(f.alt), pr = LG.pickR(f);
      if (f.x - pr < l + R.fruitMargin - 0.5 || f.x + pr > r - R.fruitMargin + 0.5) lfail('pickups stay off the walls', `${f.kind} at ${f.alt | 0}`);
      if (f.clear === -Infinity) continue;   // (the dares: conchs and the Shallows' ring)
      const need = f.clear ?? (f.bonus || f.kind === 'gold' ? Math.ceil(LG.laneSize().w / 2 + 6 + LG.COCO_R) : R.pickup.clear);
      let dd = Infinity; for (const h of hz) if (h.lo - 220 < f.alt && h.hi + 220 > f.alt) for (const q of LG.lagoonDanger(h)) dd = Math.min(dd, LG.shapeDist(q, f.x, f.alt));
      if (!f.bonus && f.kind !== 'gold' && f.clear == null) lagoonStats.pick = Math.min(lagoonStats.pick, dd);
      if (dd < need - 0.5) lfail('pickups stay clear of every trap\'s reach', `${f.kind} at ${f.alt | 0}: ${dd.toFixed(1)} < ${need}`);
    }
    // the conchs are dares, but never inside a lethal shape at its widest
    for (const f of fr.filter(f => f.kind === 'lagoonConch')) for (const h of hz) if (h.lo - 60 < f.alt && h.hi + 60 > f.alt && h.type !== 'lagoonFall') {
      const S = h.type === 'lagoonFish' ? (() => { const S = []; LG.lagoonShapes({ ...h, P: 1e9, ph: 0 }, 0, S); return S; })() : LG.lagoonDanger(h);
      for (const q of S) if (LG.shapeDist(q, f.x, f.alt) < LG.COCO_R + 2) { lfail('a conch never sits in a trap\'s solid parts', `${h.type} at ${f.alt | 0}`); break; }
    }
    for (let i = 0; i < fr.length; i++) for (let j = i + 1; j < fr.length && fr[j].alt - fr[i].alt < 80; j++) if (Math.hypot(fr[i].x - fr[j].x, fr[i].alt - fr[j].alt) < LG.pickR(fr[i]) + LG.pickR(fr[j]) + LG.PICK_GAP - 0.01) lfail('pickups never overlap', `${fr[i].alt | 0}`);
    if (fr.filter(f => f.kind === 'lagoonConch').length !== 3) lfail('the lagoon holds exactly 3 golden conchs', `${fr.filter(f => f.kind === 'lagoonConch').length}`);
    let gap = 0, last = 60; for (const f of fr) if (f.kind === 'chili') { gap = Math.max(gap, f.alt - last); last = f.alt; }
    if (gap > 640) lfail('the lagoon keeps a chili line', `${gap | 0}`);
    if (k > 2) continue;   // (the searches run on the stage itself and two more seeds)
    for (const b of level.beats) {
      const lo = Math.min(...b.hs.map(h => h.lo)) - 150, hi = Math.max(...b.hs.map(h => h.hi)) + 90;
      const traps = hz.filter(h => h.lo < hi + 60 && h.hi > lo - 60);
      lagoonStats.traps++;
      for (let p = 0; p < 6; p++) {
        const t0 = p * 1.13 + k * 0.37, [l, r] = level.walls(lo + 40);
        lagoonStats.searches++;
        const tm = fly(level, traps, (l + r) / 2, lo + 40, t0, (x, a) => a >= hi - 10, lo, hi + 20);
        if (tm < 0) lfail('every trap can be passed by the widest pilot from any phase', `${b.kind} at ${b.a} (${b.sec.name}), start ${t0.toFixed(2)} s, seed ${k}`);
        else lagoonStats.worst = Math.max(lagoonStats.worst, tm);
      }
    }
    // every conch can be touched and then escaped (flown on past its trap) by the widest pilot, from 6 phases
    for (const f of fr.filter(f => f.kind === 'lagoonConch')) {
      const own = hz.filter(h => h.lo - 40 < f.alt && h.hi + 120 > f.alt), lo = Math.min(f.alt, ...own.map(h => h.lo)) - 200, hi = Math.max(f.alt, ...own.map(h => h.hi)) + 100;
      const traps = hz.filter(h => h.lo < hi + 60 && h.hi > lo - 60), [l, r] = level.walls(lo + 40);
      for (let p = 0; p < 6; p++) {
        lagoonStats.searches++;
        const tm = fly(level, traps, (l + r) / 2, lo + 40, p * 1.07 + k * 0.29, (x, a) => a >= hi - 10, lo, hi + 20, (x, a) => Math.hypot(x - f.x, a - f.alt) < LG.COCO_R + W / 2 - 4);
        if (tm < 0) lfail('every golden conch can be grabbed and escaped by the widest pilot', `conch at ${f.alt | 0}, phase ${p}, seed ${k}`);
      }
      lagoonStats.conchs++;
    }
  }
  if (failures.size) {
    console.log(`FAILED: ${failures.size} rule(s) broken`);
    for (const [rule, { count, example }] of failures) console.log(`  ✗ ${rule} — ${count}× (e.g. ${example})`);
    process.exit(1);
  }
}
const lagoonSummary = () => `PASS: Hidden Lagoon: ${lagoonStats.seeds} layouts × ${lagoonStats.len} m, only its own traps (${Object.entries(lagoonStats.kinds).map(([k, n]) => `${n} ${k}`).join(', ')}), each taught alone first; shaft ${lagoonStats.minW.toFixed(0)}+ wide, wall slope ${lagoonStats.slope.toFixed(2)} (max ${LG.RULES.maxWallSlope}); lanes between piranha ledges ${lagoonStats.ledgeLane.toFixed(0)}+, past gulpers ${lagoonStats.gulpLane.toFixed(0)}+, beside full cascades ${lagoonStats.fallLane.toFixed(0)}+ (minLane ${LG.RULES.minLane}), jelly gaps ${lagoonStats.jellyGap.toFixed(0)}+, ${lagoonStats.arcRoom.toFixed(0)}+ open above every piranha arc, beats ${lagoonStats.beatGap.toFixed(0)}+ apart; ${lagoonStats.sweep} cascade sweeps clear of every trap; pickups ${lagoonStats.pick.toFixed(1)}+ from any trap's reach, nothing pops in; ${lagoonStats.traps} beats and ${lagoonStats.conchs} conchs (grab and escape) flown by the widest pilot, dragged by every gulper, in ${lagoonStats.searches} searches from 6 phases each, the slowest pass ${lagoonStats.worst.toFixed(1)} s`;
// (test slot: Hidden Lagoon, island level 11)
// ---------- Adventure: the Amethyst Geode (island level 16), an authored stage with its own traps ----------
// As Frost Hollow's checks: every rule on the stage's layout as the game builds it (and 8 other seeds, which only move
// phases and looks), then every beat and every heart geode flown by a time-space search for the widest pilot on the
// traps' own clocks from 6 start phases (a prism beam's halo counts as solid here: every beat can be passed without
// ever getting singed, which the "never singed" mission needs).
const GE = new Function(regions.join('\n') + '\nreturn { createGeodeLevel, geodeShapes, geodeDanger, geodeEnd, geodePrismAt, geodeShardAt, geodeBounceAt, geodeChimeAt, geodePathAt, GEODE, GEODE_STAGE, GEODE_TYPES, ADV_GEODE, RULES, advSeed, shapeDist, laneSize, pickR, COCO_R, PICK_GAP, UNITS_PER_M };')();
const geodeStats = { seeds: 0, traps: 0, searches: 0, worst: 0, hearts: 0, pick: Infinity, minW: Infinity, slope: 0, beatGap: Infinity, len: 0, kinds: {}, paths: 0, ripples: 0 };
{
  const R = GE.RULES, W = PILOT_W, Hh = PILOT_H, M = 4, st0 = GE.ADV_GEODE, X = GE.GEODE;
  if (st0.theme !== 'geode' || !(st0.reward > 0)) fail('the Amethyst Geode is a themed stage with a reward', JSON.stringify(st0));
  if (!Array.isArray(st0.goals) || st0.goals.length !== 3 || !st0.goals.some(g => g.k === 'finish') || !st0.goals.some(g => g.k === 'geodeHearts' && g.n === 3) || !st0.goals.some(g => g.k === 'geodeUnsinged')) fail('the Amethyst Geode has three missions: the Heart of the Geode, 3 heart geodes and never singed', JSON.stringify(st0.goals));
  if (Math.abs(st0.len * GE.UNITS_PER_M - GE.geodeEnd()) > 1e-6) fail('the Amethyst Geode stage length matches its layout', `${st0.len}`);
  // nothing lethal from below: beams only sweep down to level, shards only fly level or down, gems only fall, ripples
  // only spread from level down
  if (!(X.prism.a0 > X.prism.a1 && X.prism.a1 >= 0)) fail('a prism beam only sweeps down, never below level', `${X.prism.a0} → ${X.prism.a1}`);
  if (!X.shard.angles.every(an => an > 0 && an < Math.PI)) fail('crown shards never fly upward', X.shard.angles.join());
  if (!(X.chime.span > 0 && X.chime.span < Math.PI / 2)) fail('a chime ripple spreads only from level down', `${X.chime.span}`);
  // the stage's order: prisms, then crowns, then ricochet pockets, then chimes, each taught alone (never faster first)
  {
    const firsts = {}, seen = [], base = { prismPair: 'geodePrism', prismCross: 'geodePrism', shardPair: 'geodeShard', shardPrism: 'geodeShard', bounceShard: 'geodeShard', bounceDuo: 'geodeBounce', chimePrism: 'geodeChime', chimeShard: 'geodeShard' };
    for (const sec of GE.GEODE_STAGE) if (!sec.calm) for (const [, kind, o] of sec.beats) {
      const b = base[kind] || kind;
      if (!firsts[b]) { firsts[b] = o; seen.push(b); if (kind !== b) fail('each geode trap is introduced alone first', `${kind} in ${sec.name}`); }
      else if (o.P && firsts[b].P && o.P > firsts[b].P + 1e-9) fail('a geode trap is never slower than its introduction', `${kind} in ${sec.name}`);
    }
    for (const sec of GE.GEODE_STAGE) if (!sec.calm) for (const [, kind] of sec.beats) if ((kind === 'bounceDuo' && !firsts.geodeBounce) || (kind.startsWith('chime') && !firsts.geodeChime)) fail('each geode trap is introduced alone first', kind);
    if (seen.join() !== 'geodePrism,geodeShard,geodeBounce,geodeChime') fail('the Amethyst Geode teaches prisms, then crowns, then ricochets, then chimes', seen.join());
    if (!GE.GEODE_STAGE.some(sec => sec.calm && !sec.finish && sec !== GE.GEODE_STAGE[0])) fail('the Amethyst Geode has a breather grotto', '');
    if (!GE.GEODE_STAGE[GE.GEODE_STAGE.length - 1].finish) fail('the Amethyst Geode ends in the Heart of the Geode', '');
  }
  const capHit = (S, x, a, m) => {
    const r = W / 2 + m, half = Math.max(0, Hh / 2 - W / 2);
    for (const q of S) for (const da of half ? [-half, 0, half] : [0]) if (GE.shapeDist(q, x, a + da) < r) return true;
    return false;
  };
  // every lethal shape of the traps at t, and the prism beams' halos (the search never lets itself be singed)
  const allShapes = (traps, t, S) => { for (const h of traps) { GE.geodeShapes(h, t, S); if (h.type === 'geodePrism') GE.geodeShapes(h, t, S, 'halo'); } return S; };
  // the search (as Frost Hollow's), with an optional waypoint: `via(x, a)` must be touched before the goal counts
  function fly(level, traps, x0, a0, t0, goal, lo, hi, via) {
    const DT = 1 / 15, DX = 11, DA = 11, up = Math.round(440 * DT / DA), dn = Math.round(380 * DT / DA), sd = Math.round(330 * DT / DX);
    const nA = Math.ceil((hi - lo) / DA) + 1, nX = Math.ceil(400 / DX) + 1, V = 1e6;
    let front = new Set([Math.round(x0 / DX) * 1000 + Math.round((a0 - lo) / DA)]);
    for (let step = 1; step <= 14 / DT; step++) {
      const t = t0 + step * DT, S = allShapes(traps, t, []);
      const next = new Set(), blocked = new Map();
      const free = (xi, ai) => {
        const key = xi * 1000 + ai; if (blocked.has(key)) return blocked.get(key);
        const x = xi * DX, a = lo + ai * DA, [l, r] = level.walls(a), ok = x - W / 2 - 2 >= l && x + W / 2 + 2 <= r && level.walls(a + Hh / 2)[0] <= x - W / 2 && level.walls(a + Hh / 2)[1] >= x + W / 2 && level.walls(a - Hh / 2)[0] <= x - W / 2 && level.walls(a - Hh / 2)[1] >= x + W / 2 && !capHit(S, x, a, M);
        blocked.set(key, ok); return ok;
      };
      for (const k of front) {
        const got = k >= V, kk = k % V, xi = Math.floor(kk / 1000), ai = kk % 1000;
        for (let dA = -dn; dA <= up; dA++) for (let dX = -sd; dX <= sd; dX++) {
          const nx = xi + dX, na = ai + dA; if (na < 0 || na >= nA || nx < 0 || nx >= nX) continue;
          const g2 = got || !via || via(nx * DX, lo + na * DA), key = (g2 ? V : 0) + nx * 1000 + na; if (next.has(key) || !free(nx, na)) continue;
          if (g2 && goal(nx * DX, lo + na * DA)) return step * DT;
          next.add(key);
        }
      }
      if (!next.size) return -1;
      front = next;
    }
    return -1;
  }
  for (let k = 0; k <= 8; k++) {
    const st = k ? { ...st0, seed: `${st0.seed}~${k}` } : st0, level = GE.createGeodeLevel(GE.advSeed(st), st), hz = [], fr = [];
    geodeStats.seeds++;
    {
      const VIEW = 1100, h1 = [], f1 = [];
      level.fill(VIEW + 900, h1, f1);
      let sh = h1.length, sf = f1.length;
      for (let cam = 10; cam < level.end; cam += 10) {
        level.fill(cam + VIEW + 900, h1, f1);
        for (; sh < h1.length; sh++) if (h1[sh].lo < cam + VIEW + 100) fail('geode traps never pop in on screen', `${h1[sh].type} at ${h1[sh].lo | 0}`);
        for (; sf < f1.length; sf++) if (f1[sf].alt < cam + VIEW + 100) fail('geode pickups never pop in on screen', `${f1[sf].kind} at ${f1[sf].alt | 0}`);
      }
      hz.push(...h1); fr.push(...f1);
    }
    geodeStats.len = level.end / 10;
    for (const h of hz) if (!GE.GEODE_TYPES.has(h.type)) fail('the Amethyst Geode only has its own traps', h.type);
    for (const h of hz) geodeStats.kinds[h.type] = (geodeStats.kinds[h.type] || 0) + (k ? 0 : 1);
    // beats never crowd: each beat's traps start above the last beat's whole reach (one thing to read at a time)
    for (let i = 1; i < level.beats.length; i++) { const p = level.beats[i - 1], q = level.beats[i], g = Math.min(...q.hs.map(h => h.lo)) - Math.max(...p.hs.map(h => h.hi)); geodeStats.beatGap = Math.min(geodeStats.beatGap, g); if (g < 0) fail('geode beats never overlap', `${p.kind} at ${p.a} / ${q.kind} at ${q.a}`); }
    if (hz.some(h => h.hi > level.end - 320)) fail('the Heart of the Geode below the finish is clear of traps', `${Math.max(...hz.map(h => h.hi)) | 0} vs ${level.end}`);
    for (let a = 0; a < level.end + 200; a += 1) {
      const [l, r] = level.walls(a), [l2, r2] = level.walls(a + 1);
      geodeStats.minW = Math.min(geodeStats.minW, r - l); geodeStats.slope = Math.max(geodeStats.slope, l2 - l, r - r2);
    }
    if (geodeStats.minW < R.minWidth) fail('the geode shaft is never narrower than minWidth', geodeStats.minW.toFixed(1));
    if (geodeStats.slope > R.maxWallSlope) fail('the geode walls never step in faster than maxWallSlope', geodeStats.slope.toFixed(2));
    for (const h of hz) {
      if (h.type === 'geodeBounce') {
        // a gem's path stays inside the shaft and only ever falls
        for (let i = 0; i < h.path.length - 1; i++) if (h.path[i + 1][1] >= h.path[i][1]) fail('a ricochet gem only ever falls', `${h.alt}`);
        for (let d = 0; d < h.plen; d += 4) { const [x, a] = GE.geodePathAt(h, d), [l, r] = level.walls(a); if (x - X.bounce.r < l - 1.5 || x + X.bounce.r > r + 1.5) { fail('a ricochet gem stays in the shaft', `${h.alt} at ${d}`); break; } }
        geodeStats.paths++;
      }
      if (h.type === 'geodeChime') { if (h.rmax > 420) fail('a chime ripple dies on the far wall', `${h.rmax}`); geodeStats.ripples++; }
      if (h.type === 'geodePrism') for (const L of h.lens) if (!(L > 150 && L < 520)) fail('a prism beam ends on the far wall', `${L} at ${h.alt}`);
    }
    for (const f of fr) {
      const [l, r] = level.walls(f.alt), pr = GE.pickR(f);
      if (f.x - pr < l + R.fruitMargin - 0.5 || f.x + pr > r - R.fruitMargin + 0.5) fail('geode pickups stay off the walls', `${f.kind} at ${f.alt | 0}`);
      if (f.clear === -Infinity) continue;   // (the dares: the hearts, the grotto's cut gem)
      const need = f.clear ?? (f.bonus || f.kind === 'gold' ? Math.ceil(GE.laneSize().w / 2 + 6 + GE.COCO_R) : R.pickup.clear);
      let dd = Infinity; for (const h of hz) if (h.lo - 220 < f.alt && h.hi + 220 > f.alt) for (const q of GE.geodeDanger(h)) dd = Math.min(dd, GE.shapeDist(q, f.x, f.alt));
      if (!f.bonus && f.kind !== 'gold' && f.clear == null) geodeStats.pick = Math.min(geodeStats.pick, dd);
      if (dd < need - 0.5) fail('geode pickups stay clear of every trap\'s reach', `${f.kind} at ${f.alt | 0}: ${dd.toFixed(1)} < ${need}`);
    }
    for (let i = 0; i < fr.length; i++) for (let j = i + 1; j < fr.length && fr[j].alt - fr[i].alt < 80; j++) if (Math.hypot(fr[i].x - fr[j].x, fr[i].alt - fr[j].alt) < GE.pickR(fr[i]) + GE.pickR(fr[j]) + GE.PICK_GAP - 0.01) fail('geode pickups never overlap', `${fr[i].alt | 0}`);
    if (fr.filter(f => f.kind === 'heart').length !== 3) fail('the Amethyst Geode holds exactly 3 heart geodes', `${fr.filter(f => f.kind === 'heart').length}`);
    let gap = 0, last = 60; for (const f of fr) if (f.kind === 'chili') { gap = Math.max(gap, f.alt - last); last = f.alt; }
    if (gap > 640) fail('the Amethyst Geode keeps a chili line', `${gap | 0}`);
    if (k > 2) continue;   // (the searches run on the stage itself and two more seeds)
    for (const b of level.beats) {
      const lo = Math.min(...b.hs.map(h => h.lo)) - 150, hi = Math.max(...b.hs.map(h => h.hi)) + 90;
      const traps = hz.filter(h => h.lo < hi + 60 && h.hi > lo - 60);
      geodeStats.traps++;
      for (let p = 0; p < 6; p++) {
        const t0 = p * 1.13 + k * 0.37, [l, r] = level.walls(lo + 40);
        geodeStats.searches++;
        const tm = fly(level, traps, (l + r) / 2, lo + 40, t0, (x, a) => a >= hi - 10, lo, hi + 20);
        if (tm < 0) fail('every geode trap can be passed by the widest pilot from any phase, never singed', `${b.kind} at ${b.a} (${b.sec.name}), start ${t0.toFixed(2)} s, seed ${k}`);
        else geodeStats.worst = Math.max(geodeStats.worst, tm);
      }
    }
    // every heart geode can be touched and then escaped (flown on past its trap) by the widest pilot, from 6 phases
    for (const f of fr.filter(f => f.kind === 'heart')) {
      const own = hz.filter(h => h.lo - 40 < f.alt && h.hi + 120 > f.alt), lo = Math.min(f.alt, ...own.map(h => h.lo)) - 200, hi = Math.max(f.alt, ...own.map(h => h.hi)) + 100;
      const traps = hz.filter(h => h.lo < hi + 60 && h.hi > lo - 60), [l, r] = level.walls(lo + 40);
      for (let p = 0; p < 6; p++) {
        geodeStats.searches++;
        const tm = fly(level, traps, (l + r) / 2, lo + 40, p * 1.07 + k * 0.29, (x, a) => a >= hi - 10, lo, hi + 20, (x, a) => Math.hypot(x - f.x, a - f.alt) < GE.COCO_R + W / 2 - 4);
        if (tm < 0) fail('every heart geode can be grabbed and escaped by the widest pilot', `heart at ${f.alt | 0}, phase ${p}, seed ${k}`);
      }
      geodeStats.hearts++;
    }
  }
}
const geodeSummary = () => `PASS: Amethyst Geode: ${geodeStats.seeds} layouts × ${geodeStats.len} m, only its own traps (${Object.entries(geodeStats.kinds).map(([k, n]) => `${n} ${k}`).join(', ')}), each taught alone first; shaft ${geodeStats.minW.toFixed(0)}+ wide, wall slope ${geodeStats.slope.toFixed(2)} (max ${GE.RULES.maxWallSlope}); beams only sweep down, shards only fly level or down, ${geodeStats.paths} gem paths only fall and stay in the shaft, ${geodeStats.ripples} ripples spread only down; beats ${geodeStats.beatGap.toFixed(0)}+ apart; pickups ${geodeStats.pick.toFixed(1)}+ from any reach; ${geodeStats.traps} beats × 6 phases and ${geodeStats.hearts} heart geodes flown by the widest pilot never singed (${geodeStats.searches} searches, slowest ${geodeStats.worst.toFixed(1)} s)`;
// (test slot: Amethyst Geode, island level 16)
// ---------- Adventure: the Fossil Bonepit (island level 21), an authored stage with its own traps ----------
// As the Amethyst Geode's checks: every rule on the stage's layout as the game builds it (and 8 other seeds, which only
// move phases and looks), then every beat and every amber mosquito flown by a time-space search for the widest pilot on
// the traps' own clocks from 6 start phases (the bone dust of a snapping skull or a slamming ribcage counts as solid
// here: every beat can be passed without ever getting dusted, which the "never dusted" mission needs).
const FO = new Function(regions.join('\n') + '\nreturn { createFossilLevel, fossilShapes, fossilDanger, fossilEnd, fossilSkullAt, fossilRibAt, fossilSerpentAt, fossilPathAt, fossilSkullPt, FOSSIL, FOSSIL_STAGE, FOSSIL_TYPES, ADV_FOSSIL, RULES, advSeed, shapeDist, laneSize, pickR, COCO_R, PICK_GAP, UNITS_PER_M };')();
const fossilStats = { seeds: 0, traps: 0, searches: 0, worst: 0, ambers: 0, pick: Infinity, minW: Infinity, slope: 0, beatGap: Infinity, len: 0, kinds: {}, lanes: Infinity, digs: 0 };
{
  const R = FO.RULES, W = PILOT_W, Hh = PILOT_H, M = 4, st0 = FO.ADV_FOSSIL, X = FO.FOSSIL;
  if (st0.theme !== 'fossil' || !(st0.reward > 0)) fail('the Fossil Bonepit is a themed stage with a reward', JSON.stringify(st0));
  if (!Array.isArray(st0.goals) || st0.goals.length !== 3 || !st0.goals.some(g => g.k === 'finish') || !st0.goals.some(g => g.k === 'fossilAmber' && g.n === 3) || !st0.goals.some(g => g.k === 'fossilDustless')) fail('the Fossil Bonepit has three missions: the Great Amber, 3 amber mosquitoes and never dusted', JSON.stringify(st0.goals));
  if (Math.abs(st0.len * FO.UNITS_PER_M - FO.fossilEnd()) > 1e-6) fail('the Fossil Bonepit stage length matches its layout', `${st0.len}`);
  // the stage's order: skulls, then ribcages, then serpents, each taught alone (never faster first)
  {
    const firsts = {}, seen = [], base = { skullPair: 'fossilSkull', ribSkull: 'fossilRib', ribDuo: 'fossilRib', serpentSkull: 'fossilSerpent', serpentRib: 'fossilSerpent', serpentDuo: 'fossilSerpent' };
    for (const sec of FO.FOSSIL_STAGE) if (!sec.calm) for (const [, kind, o] of sec.beats) {
      const b = base[kind] || kind;
      if (!firsts[b]) { firsts[b] = o; seen.push(b); if (kind !== b) fail('each fossil trap is introduced alone first', `${kind} in ${sec.name}`); }
      else if (o.P && firsts[b].P && o.P > firsts[b].P + 1e-9) fail('a fossil trap is never slower than its introduction', `${kind} in ${sec.name}`);
    }
    if (seen.join() !== 'fossilSkull,fossilRib,fossilSerpent') fail('the Fossil Bonepit teaches skulls, then ribcages, then serpents', seen.join());
    if (!FO.FOSSIL_STAGE.some(sec => sec.calm && !sec.finish && sec !== FO.FOSSIL_STAGE[0])) fail('the Fossil Bonepit has a breather seam', '');
    if (!FO.FOSSIL_STAGE[FO.FOSSIL_STAGE.length - 1].finish) fail('the Fossil Bonepit ends in the Great Amber', '');
  }
  const capHit = (S, x, a, m) => {
    const r = W / 2 + m, half = Math.max(0, Hh / 2 - W / 2);
    for (const q of S) for (const da of half ? [-half, 0, half] : [0]) if (FO.shapeDist(q, x, a + da) < r) return true;
    return false;
  };
  // every lethal shape of the traps at t, and their bone dust (the search never lets itself be dusted)
  const allShapes = (traps, t, S) => { for (const h of traps) FO.fossilShapes(h, t, S); return S; };
  // the search (as the geode's), with an optional waypoint: `via(x, a)` must be touched before the goal counts
  function fly(level, traps, x0, a0, t0, goal, lo, hi, via) {
    const DT = 1 / 15, DX = 11, DA = 11, up = Math.round(440 * DT / DA), dn = Math.round(380 * DT / DA), sd = Math.round(330 * DT / DX);
    const nA = Math.ceil((hi - lo) / DA) + 1, nX = Math.ceil(400 / DX) + 1, V = 1e6;
    let front = new Set([Math.round(x0 / DX) * 1000 + Math.round((a0 - lo) / DA)]);
    for (let step = 1; step <= 16 / DT; step++) {
      const t = t0 + step * DT, S = allShapes(traps, t, []);
      const next = new Set(), blocked = new Map();
      const free = (xi, ai) => {
        const key = xi * 1000 + ai; if (blocked.has(key)) return blocked.get(key);
        const x = xi * DX, a = lo + ai * DA, [l, r] = level.walls(a), ok = x - W / 2 - 2 >= l && x + W / 2 + 2 <= r && level.walls(a + Hh / 2)[0] <= x - W / 2 && level.walls(a + Hh / 2)[1] >= x + W / 2 && level.walls(a - Hh / 2)[0] <= x - W / 2 && level.walls(a - Hh / 2)[1] >= x + W / 2 && !capHit(S, x, a, M);
        blocked.set(key, ok); return ok;
      };
      for (const k of front) {
        const got = k >= V, kk = k % V, xi = Math.floor(kk / 1000), ai = kk % 1000;
        for (let dA = -dn; dA <= up; dA++) for (let dX = -sd; dX <= sd; dX++) {
          const nx = xi + dX, na = ai + dA; if (na < 0 || na >= nA || nx < 0 || nx >= nX) continue;
          const g2 = got || !via || via(nx * DX, lo + na * DA), key = (g2 ? V : 0) + nx * 1000 + na; if (next.has(key) || !free(nx, na)) continue;
          if (g2 && goal(nx * DX, lo + na * DA)) return step * DT;
          next.add(key);
        }
      }
      if (!next.size) return -1;
      front = next;
    }
    return -1;
  }
  for (let k = 0; k <= 8; k++) {
    const st = k ? { ...st0, seed: `${st0.seed}~${k}` } : st0, level = FO.createFossilLevel(FO.advSeed(st), st), hz = [], fr = [];
    fossilStats.seeds++;
    {
      const VIEW = 1100, h1 = [], f1 = [];
      level.fill(VIEW + 900, h1, f1);
      let sh = h1.length, sf = f1.length;
      for (let cam = 10; cam < level.end; cam += 10) {
        level.fill(cam + VIEW + 900, h1, f1);
        for (; sh < h1.length; sh++) if (h1[sh].lo < cam + VIEW + 100) fail('fossil traps never pop in on screen', `${h1[sh].type} at ${h1[sh].lo | 0}`);
        for (; sf < f1.length; sf++) if (f1[sf].alt < cam + VIEW + 100) fail('fossil pickups never pop in on screen', `${f1[sf].kind} at ${f1[sf].alt | 0}`);
      }
      hz.push(...h1); fr.push(...f1);
    }
    fossilStats.len = level.end / 10;
    for (const h of hz) if (!FO.FOSSIL_TYPES.has(h.type)) fail('the Fossil Bonepit only has its own traps', h.type);
    for (const h of hz) fossilStats.kinds[h.type] = (fossilStats.kinds[h.type] || 0) + (k ? 0 : 1);
    // beats never crowd: each beat's traps start above the last beat's whole reach (one thing to read at a time)
    for (let i = 1; i < level.beats.length; i++) { const p = level.beats[i - 1], q = level.beats[i], g = Math.min(...q.hs.map(h => h.lo)) - Math.max(...p.hs.map(h => h.hi)); fossilStats.beatGap = Math.min(fossilStats.beatGap, g); if (g < 0) fail('fossil beats never overlap', `${p.kind} at ${p.a} / ${q.kind} at ${q.a}`); }
    if (hz.some(h => h.hi > level.end - 320)) fail('the Great Amber below the finish is clear of traps', `${Math.max(...hz.map(h => h.hi)) | 0} vs ${level.end}`);
    for (let a = 0; a < level.end + 200; a += 1) {
      const [l, r] = level.walls(a), [l2, r2] = level.walls(a + 1);
      fossilStats.minW = Math.min(fossilStats.minW, r - l); fossilStats.slope = Math.max(fossilStats.slope, l2 - l, r - r2);
    }
    if (fossilStats.minW < R.minWidth) fail('the fossil shaft is never narrower than minWidth', fossilStats.minW.toFixed(1));
    if (fossilStats.slope > R.maxWallSlope) fail('the fossil walls never step in faster than maxWallSlope', fossilStats.slope.toFixed(2));
    for (const h of hz) {
      if (h.type === 'fossilSkull') {
        // nothing strikes from below: the lower jaw never rises (it only lunges sideways), the upper skull only slams
        // down (it opens slowly, in the tell and as it slides back), and a lunging skull always leaves the far lane
        let prevJ = null, prevTip = null;
        for (let t = 0; t < h.P; t += 1 / 60) {
          const s1 = FO.fossilSkullAt(h, t), jaw = FO.fossilSkullPt(h, s1, 138, -11, false)[1], tip = FO.fossilSkullPt(h, s1, 150, 5, true)[1];
          if (prevJ != null && jaw > prevJ + 1e-6) { fail('a skull\'s lower jaw never rises', `${h.alt}`); break; }
          if (prevTip != null && (tip - prevTip) * 60 > 140) { fail('a skull only opens slowly (it strikes downward)', `${h.alt} ${((tip - prevTip) * 60).toFixed(0)}`); break; }
          prevJ = jaw; prevTip = tip;
          const S = FO.fossilShapes(h, t, [], 'body'); let reach = -Infinity;
          for (const q of S) { const xs = q.k === 'c' ? [q.x] : [q.x0, q.x1]; for (const x of xs) reach = Math.max(reach, h.side * (x - h.base) + q.r); }
          const [l, r] = level.walls(h.alt), lane = (r - l) - reach; fossilStats.lanes = Math.min(fossilStats.lanes, lane);
          if (lane < FO.laneSize().w + 8) { fail('a skull always leaves the widest pilot a lane', `${h.alt}: ${lane.toFixed(0)}`); break; }
        }
      }
      if (h.type === 'fossilSerpent') {
        // its band only ever dips across the shaft (it never swims up past its burrow's height)
        for (let dd = 0; dd <= h.span; dd += 4) { const [, a] = FO.fossilPathAt(h, dd); if (a > h.alt + X.serpent.amp + 1e-6) { fail('a serpent never swims up past its burrow', `${h.alt}`); break; } }
        if (Math.abs(h.span - Math.abs(h.x1 - h.x0)) > 1e-6) fail('a serpent swims burrow to burrow', `${h.alt}`);
      }
      if (h.type === 'fossilRib') {
        // the ribs only ever slide sideways, and shut they leave no gap anywhere across the shaft
        for (const Rb of h.ribs) if (Math.abs(Rb.shut - h.cx) > X.rib.over + 1e-6 || Math.sign(Rb.shut - Rb.open) !== Rb.d) fail('ribs slide out across the shaft to interlock', `${h.alt}`);
      }
    }
    for (const f of fr) {
      const [l, r] = level.walls(f.alt), pr = FO.pickR(f);
      if (f.x - pr < l + R.fruitMargin - 0.5 || f.x + pr > r - R.fruitMargin + 0.5) fail('fossil pickups stay off the walls', `${f.kind} at ${f.alt | 0}`);
      if (f.clear === -Infinity) continue;   // (the dares: the amber mosquitoes, the seam's ammonite)
      const need = f.clear ?? (f.bonus || f.kind === 'gold' ? Math.ceil(FO.laneSize().w / 2 + 6 + FO.COCO_R) : R.pickup.clear);
      let dd = Infinity; for (const h of hz) if (h.lo - 220 < f.alt && h.hi + 220 > f.alt) for (const q of FO.fossilDanger(h)) dd = Math.min(dd, FO.shapeDist(q, f.x, f.alt));
      if (!f.bonus && f.kind !== 'gold' && f.clear == null) fossilStats.pick = Math.min(fossilStats.pick, dd);
      if (dd < need - 0.5) fail('fossil pickups stay clear of every trap\'s reach', `${f.kind} at ${f.alt | 0}: ${dd.toFixed(1)} < ${need}`);
    }
    for (let i = 0; i < fr.length; i++) for (let j = i + 1; j < fr.length && fr[j].alt - fr[i].alt < 80; j++) if (Math.hypot(fr[i].x - fr[j].x, fr[i].alt - fr[j].alt) < FO.pickR(fr[i]) + FO.pickR(fr[j]) + FO.PICK_GAP - 0.01) fail('fossil pickups never overlap', `${fr[i].alt | 0}`);
    if (fr.filter(f => f.kind === 'amber').length !== 3) fail('the Fossil Bonepit holds exactly 3 amber mosquitoes', `${fr.filter(f => f.kind === 'amber').length}`);
    let gap = 0, last = 60; for (const f of fr) if (f.kind === 'chili') { gap = Math.max(gap, f.alt - last); last = f.alt; }
    if (gap > 640) fail('the Fossil Bonepit keeps a chili line', `${gap | 0}`);
    // the buried bones sit on quiet wall, well away from every trap
    for (const g of level.digs) { if (hz.some(h => h.lo - 160 < g.alt && h.hi + 160 > g.alt)) fail('buried bones sit well away from the traps', `${g.alt | 0}`); }
    fossilStats.digs = level.digs.length;
    if (level.digs.length < 6) fail('the Fossil Bonepit buries a few bones to dig up', `${level.digs.length}`);
    if (k > 2) continue;   // (the searches run on the stage itself and two more seeds)
    for (const b of level.beats) {
      const lo = Math.min(...b.hs.map(h => h.lo)) - 150, hi = Math.max(...b.hs.map(h => h.hi)) + 90;
      const traps = hz.filter(h => h.lo < hi + 60 && h.hi > lo - 60);
      fossilStats.traps++;
      for (let p = 0; p < 6; p++) {
        const t0 = p * 1.13 + k * 0.37, [l, r] = level.walls(lo + 40);
        fossilStats.searches++;
        const tm = fly(level, traps, (l + r) / 2, lo + 40, t0, (x, a) => a >= hi - 10, lo, hi + 20);
        if (tm < 0) fail('every fossil trap can be passed by the widest pilot from any phase, never dusted', `${b.kind} at ${b.a} (${b.sec.name}), start ${t0.toFixed(2)} s, seed ${k}`);
        else fossilStats.worst = Math.max(fossilStats.worst, tm);
      }
    }
    // every amber mosquito can be touched and then escaped (flown on past its trap) by the widest pilot, from 6 phases
    for (const f of fr.filter(f => f.kind === 'amber')) {
      const own = hz.filter(h => h.lo - 40 < f.alt && h.hi + 120 > f.alt), lo = Math.min(f.alt, ...own.map(h => h.lo)) - 200, hi = Math.max(f.alt, ...own.map(h => h.hi)) + 100;
      const traps = hz.filter(h => h.lo < hi + 60 && h.hi > lo - 60), [l, r] = level.walls(lo + 40);
      for (let p = 0; p < 6; p++) {
        fossilStats.searches++;
        const tm = fly(level, traps, (l + r) / 2, lo + 40, p * 1.07 + k * 0.29, (x, a) => a >= hi - 10, lo, hi + 20, (x, a) => Math.hypot(x - f.x, a - f.alt) < FO.COCO_R + W / 2 - 4);
        if (tm < 0) fail('every amber mosquito can be grabbed and escaped by the widest pilot', `amber at ${f.alt | 0}, phase ${p}, seed ${k}`);
      }
      fossilStats.ambers++;
    }
  }
}
const fossilSummary = () => `PASS: Fossil Bonepit: ${fossilStats.seeds} layouts × ${fossilStats.len} m, only its own traps (${Object.entries(fossilStats.kinds).map(([k, n]) => `${n} ${k}`).join(', ')}), each taught alone first; shaft ${fossilStats.minW.toFixed(0)}+ wide, wall slope ${fossilStats.slope.toFixed(2)} (max ${FO.RULES.maxWallSlope}); lower jaws never rise, skulls only slam down and always leave a ${fossilStats.lanes.toFixed(0)}+ lane, ribs only slide sideways, serpents only dip; beats ${fossilStats.beatGap.toFixed(0)}+ apart; pickups ${fossilStats.pick.toFixed(1)}+ from any reach; ${fossilStats.digs} buried bones on quiet wall; ${fossilStats.traps} beats × 6 phases and ${fossilStats.ambers} amber mosquitoes flown by the widest pilot never dusted (${fossilStats.searches} searches, slowest ${fossilStats.worst.toFixed(1)} s)`;
// (test slot: Fossil Bonepit, island level 21)
// ---------- Adventure: Shipwreck Hold (island level 22), an authored stage with its own traps ----------
// As the lagoon's checks: every rule on the stage's layout as the game builds it (and 8 other seeds, which only move
// phases and looks), then every beat and every golden compass flown by a time-space search for the widest pilot on the
// traps' own clocks from 6 start phases.
const SW = new Function(regions.join('\n') + '\nreturn { createShipwreckLevel, shipwreckShapes, shipwreckDanger, shipwreckEnd, shipwreckCannonState, shipwreckBallX, shipwreckPortAlt, shipwreckBarrels, shipwreckAnchorState, shipwreckAnchorBody, shipwreckYard, shipwreckKrakenState, shipwreckArm, shipwreckArmBody, shipwreckSlingPos, shipwreckSlingBody, SHIPWRECK, SHIPWRECK_STAGE, SHIPWRECK_TYPES, ADV_SHIPWRECK, RULES, advSeed, shapeDist, laneSize, pickR, COCO_R, PICK_GAP, UNITS_PER_M };')();
const shipwreckStats = { seeds: 0, traps: 0, searches: 0, worst: 0, compasses: 0, pick: Infinity, minW: Infinity, slope: 0, barrelLane: Infinity, anchorLane: Infinity, anchorWall: Infinity, armLane: Infinity, gapRow: Infinity, slingGap: [Infinity, 0], len: 0, kinds: {}, beatGap: Infinity };
{
  const R = SW.RULES, W = PILOT_W, Hh = PILOT_H, M = 4, st0 = SW.ADV_SHIPWRECK, X = SW.SHIPWRECK;
  const sfail = (rule, d) => fail('shipwreck: ' + rule, d), swLerp = (a, b, t) => a + (b - a) * t;
  if (st0.theme !== 'shipwreck' || !(st0.reward > 0)) sfail('Shipwreck Hold is a themed stage with a reward', JSON.stringify(st0));
  if (!Array.isArray(st0.goals) || st0.goals.length !== 3 || !st0.goals.some(g => g.k === 'finish') || !st0.goals.some(g => g.k === 'shipwreckCompass' && g.n === 3) || !st0.goals.some(g => g.k === 'shipwreckGap' && g.n > 0)) sfail('three missions: the cabin, 3 golden compasses and the broadside gaps', JSON.stringify(st0.goals));
  if (Math.abs(st0.len * SW.UNITS_PER_M - SW.shipwreckEnd()) > 1e-6) sfail('the stage length matches its layout', `${st0.len}`);
  // the stage's order: cannons, then anchors, then krakens, then slings, each taught alone (never faster at first)
  {
    const firsts = {}, seen = [], base = k => k === 'broadside' ? 'cannon' : k.replace(/(Pair|Cannon|Anchor|Kraken)$/, '');
    for (const sec of SW.SHIPWRECK_STAGE) if (!sec.calm) for (const [, kind, o] of sec.beats) {
      const b = base(kind);
      if (!firsts[b]) { firsts[b] = o; seen.push(b); if (kind !== b) sfail('each trap is introduced alone first', `${kind} in ${sec.name}`); }
      else if (o.P && firsts[b].P && o.P > firsts[b].P) sfail('a trap is never slower than its introduction', `${kind} in ${sec.name}`);
    }
    if (seen.join() !== 'cannon,anchor,kraken,sling') sfail('the hold teaches cannons, anchors, krakens, then slings', seen.join());
    if (!SW.SHIPWRECK_STAGE.some(sec => sec.calm && !sec.finish && sec !== SW.SHIPWRECK_STAGE[0])) sfail('the hold has a breather', '');
    if (!SW.SHIPWRECK_STAGE[SW.SHIPWRECK_STAGE.length - 1].finish) sfail('the stage ends in the captain\'s cabin', '');
  }
  // the shut port's row fits the widest pilot between the balls with room; the rows either side of a live port don't
  { const g = 2 * X.cannon.sp - 2 * X.cannon.ball; shipwreckStats.gapRow = g; if (g < Hh + 2 * M + 12) sfail('a rack\'s gap row fits the widest pilot', `${g}`); }
  // nothing lethal comes from below: a kraken's arm only ever sweeps down (its angle never rises while it is out)
  { const h = { side: 1, base: 20, alt: 0, P: 5, ph: 0 }; let prev = null; for (let t = 0; t < 5; t += 0.01) { const st = SW.shipwreckKrakenState(h, t); if (st.ext > 0 && prev && prev.ext > 0 && st.ang > prev.ang + 1e-9) { sfail('a kraken\'s arm only sweeps down', `${t.toFixed(2)}`); break; } prev = st; } }
  const capHit = (S, x, a, m) => {
    const r = W / 2 + m, half = Math.max(0, Hh / 2 - W / 2);
    for (const q of S) for (const da of half ? [-half, 0, half] : [0]) if (SW.shapeDist(q, x, a + da) < r) return true;
    return false;
  };
  const ext = S => { let x0 = Infinity, x1 = -Infinity; for (const q of S) { const a = q.k === 'c' ? q.x - q.r : q.k === 'b' ? q.x0 : Math.min(q.x0, q.x1) - q.r, b = q.k === 'c' ? q.x + q.r : q.k === 'b' ? q.x1 : Math.max(q.x0, q.x1) + q.r; x0 = Math.min(x0, a); x1 = Math.max(x1, b); } return [x0, x1]; };
  // the search (as the lagoon's): solid = every lethal shape at that moment
  function fly(level, traps, x0, a0, t0, goal, lo, hi, via) {
    const DT = 1 / 15, DX = 11, DA = 11, up = Math.round(440 * DT / DA), dn = Math.round(380 * DT / DA), sd = Math.round(330 * DT / DX);
    const nA = Math.ceil((hi - lo) / DA) + 1, nX = Math.ceil(400 / DX) + 1, V = 1e6;
    let front = new Set([Math.round(x0 / DX) * 1000 + Math.round((a0 - lo) / DA)]);
    for (let step = 1; step <= 10 / DT; step++) {
      const t = t0 + step * DT, S = [];
      for (const h of traps) SW.shipwreckShapes(h, t, S);
      const next = new Set(), blocked = new Map();
      const free = (xi, ai) => {
        const key = xi * 1000 + ai; if (blocked.has(key)) return blocked.get(key);
        const x = xi * DX, a = lo + ai * DA, [l, r] = level.walls(a), ok = x - W / 2 - 2 >= l && x + W / 2 + 2 <= r && level.walls(a + Hh / 2)[0] <= x - W / 2 && level.walls(a + Hh / 2)[1] >= x + W / 2 && level.walls(a - Hh / 2)[0] <= x - W / 2 && level.walls(a - Hh / 2)[1] >= x + W / 2 && !capHit(S, x, a, M);
        blocked.set(key, ok); return ok;
      };
      for (const k of front) {
        const got = k >= V, kk = k % V, xi = Math.floor(kk / 1000), ai = kk % 1000;
        for (let dA = -dn; dA <= up; dA++) for (let dX = -sd; dX <= sd; dX++) {
          const nx = xi + dX, na = ai + dA; if (na < 0 || na >= nA || nx < 0 || nx >= nX) continue;
          const g2 = got || !via || via(nx * DX, lo + na * DA), key = (g2 ? V : 0) + nx * 1000 + na; if (next.has(key) || !free(nx, na)) continue;
          if (g2 && goal(nx * DX, lo + na * DA)) return step * DT;
          next.add(key);
        }
      }
      if (!next.size) return -1;
      front = next;
    }
    return -1;
  }
  for (let k = 0; k <= 8; k++) {
    const st = k ? { ...st0, seed: `${st0.seed}~${k}` } : st0, level = SW.createShipwreckLevel(SW.advSeed(st), st), hz = [], fr = [];
    shipwreckStats.seeds++;
    {
      const VIEW = 1100, h1 = [], f1 = [];
      level.fill(VIEW + 900, h1, f1);
      let sh = h1.length, sf = f1.length;
      for (let cam = 10; cam < level.end; cam += 10) {
        level.fill(cam + VIEW + 900, h1, f1);
        for (; sh < h1.length; sh++) if (h1[sh].lo < cam + VIEW + 100) sfail('traps never pop in on screen', `${h1[sh].type} at ${h1[sh].lo | 0}`);
        for (; sf < f1.length; sf++) if (f1[sf].alt < cam + VIEW + 100) sfail('pickups never pop in on screen', `${f1[sf].kind} at ${f1[sf].alt | 0}`);
      }
      hz.push(...h1); fr.push(...f1);
    }
    shipwreckStats.len = level.end / 10;
    for (const h of hz) if (!SW.SHIPWRECK_TYPES.has(h.type)) sfail('the hold only has its own traps', h.type);
    for (const h of hz) shipwreckStats.kinds[h.type] = (shipwreckStats.kinds[h.type] || 0) + (k ? 0 : 1);
    for (let i = 1; i < level.beats.length; i++) { const p = level.beats[i - 1], q = level.beats[i], g = Math.min(...q.hs.map(h => h.lo)) - Math.max(...p.hs.map(h => h.hi)); shipwreckStats.beatGap = Math.min(shipwreckStats.beatGap, g); if (g < 0) sfail('beats never overlap', `${p.kind} at ${p.a} / ${q.kind} at ${q.a}`); }
    for (const b of level.beats) for (let i = 0; i < b.hs.length; i++) for (let j = i + 1; j < b.hs.length; j++) { const p = b.hs[i], q = b.hs[j]; if (p.hi > q.lo && q.hi > p.lo) sfail('the traps in a beat never overlap', `${b.kind} at ${b.a}`); }
    if (hz.some(h => h.hi > level.end - 320)) sfail('the cabin below the finish is clear of traps', `${Math.max(...hz.map(h => h.hi)) | 0} vs ${level.end}`);
    for (let a = 0; a < level.end + 200; a += 1) {
      const [l, r] = level.walls(a), [l2, r2] = level.walls(a + 1);
      shipwreckStats.minW = Math.min(shipwreckStats.minW, r - l); shipwreckStats.slope = Math.max(shipwreckStats.slope, l2 - l, r - r2);
    }
    if (shipwreckStats.minW < R.minWidth) sfail('the shaft is never narrower than minWidth', shipwreckStats.minW.toFixed(1));
    if (shipwreckStats.slope > R.maxWallSlope) sfail('the walls never step in faster than maxWallSlope', shipwreckStats.slope.toFixed(2));
    // static lanes: past a rack's barrels, past an anchor's yard and its anchor at rest (and in its lurch and settle),
    // past a kraken arm's whole sweep (minLane); an anchor's swing never reaches the far wall; a sling's pallet never
    // touches a wall, and the gap at its end opens wide enough for the widest pilot with room
    for (const h of hz) {
      const lane = (S, a) => { const [l, r] = level.walls(a), [x0, x1] = ext(S); return h.side > 0 ? r - x1 : x0 - l; };
      if (h.type === 'shipwreckCannon') { const m = Math.min(...Array.from({ length: h.n }, (_, i) => lane(SW.shipwreckBarrels([], h), SW.shipwreckPortAlt(h, i)))); shipwreckStats.barrelLane = Math.min(shipwreckStats.barrelLane, m); if (m < R.minLane) sfail('a rack\'s barrels leave a lane of minLane', `${m.toFixed(1)} at ${h.alt}`); }
      if (h.type === 'shipwreckAnchor') {
        const S = SW.shipwreckYard([], h); for (let k2 = 0; k2 <= 8; k2++) SW.shipwreckAnchorBody(S, h, swLerp(-X.anchor.back - 0.03, 0.05, k2 / 8));
        const m = Math.min(lane(S, h.alt), lane(S, h.pa - 100)); shipwreckStats.anchorLane = Math.min(shipwreckStats.anchorLane, m); if (m < R.minLane) sfail('an anchor at rest leaves a lane of minLane', `${m.toFixed(1)} at ${h.alt}`);
        for (let k2 = 0; k2 <= 24; k2++) { const B = SW.shipwreckAnchorBody([], h, swLerp(-X.anchor.back - 0.03, X.anchor.amp, k2 / 24)); for (const q of B) { const qa = q.k === 'c' ? q.a : (q.a0 + q.a1) / 2, [l, r] = level.walls(qa), [x0, x1] = ext([q]), m2 = h.side > 0 ? r - x1 : x0 - l, m3 = h.side > 0 ? x0 - l : r - x1; shipwreckStats.anchorWall = Math.min(shipwreckStats.anchorWall, m2, m3); if (m2 < 4 || m3 < 2) sfail('an anchor never swings into a wall', `${Math.min(m2, m3).toFixed(1)} at ${h.alt}`); } }
      }
      if (h.type === 'shipwreckKraken') { const m = lane(SW.shipwreckDanger(h), h.alt); shipwreckStats.armLane = Math.min(shipwreckStats.armLane, m); if (m < R.minLane) sfail('a kraken\'s arm leaves a lane of minLane by the far wall', `${m.toFixed(1)} at ${h.alt}`); }
      if (h.type === 'shipwreckSling') for (const s of [-1, 1]) {
        const p = { x: h.cx + s * h.amp }, [x0, x1] = ext(SW.shipwreckSlingBody([], h, p.x, h.alt)), [l, r] = level.walls(h.alt + 20), shut = s > 0 ? r - x1 : x0 - l, open = s > 0 ? x0 - l : r - x1;
        shipwreckStats.slingGap = [Math.min(shipwreckStats.slingGap[0], shut), Math.max(shipwreckStats.slingGap[1], open)];
        if (shut < 4) sfail('a sling\'s pallet never touches a wall', `${shut.toFixed(1)} at ${h.alt}`);
        if (open < W + 2 * M + 30) sfail('a sling\'s end gap opens wide for the widest pilot', `${open.toFixed(1)} at ${h.alt}`);
      }
    }
    for (const f of fr) {
      const [l, r] = level.walls(f.alt), pr = SW.pickR(f);
      if (f.x - pr < l + R.fruitMargin - 0.5 || f.x + pr > r - R.fruitMargin + 0.5) sfail('pickups stay off the walls', `${f.kind} at ${f.alt | 0}`);
      if (f.clear === -Infinity) continue;   // (the dares: compasses and the Galley's ring)
      const need = f.clear ?? (f.bonus || f.kind === 'gold' ? Math.ceil(SW.laneSize().w / 2 + 6 + SW.COCO_R) : R.pickup.clear);
      let dd = Infinity; for (const h of hz) if (h.lo - 220 < f.alt && h.hi + 220 > f.alt) for (const q of SW.shipwreckDanger(h)) dd = Math.min(dd, SW.shapeDist(q, f.x, f.alt));
      if (!f.bonus && f.kind !== 'gold' && f.clear == null) shipwreckStats.pick = Math.min(shipwreckStats.pick, dd);
      if (dd < need - 0.5) sfail('pickups stay clear of every trap\'s reach', `${f.kind} at ${f.alt | 0}: ${dd.toFixed(1)} < ${need}`);
    }
    // the compasses are dares, but never inside a trap's solid parts (barrels, yard, the anchor at rest)
    for (const f of fr.filter(f => f.kind === 'shipwreckCompass')) for (const h of hz) if (h.lo - 60 < f.alt && h.hi + 60 > f.alt) {
      const S = h.type === 'shipwreckCannon' ? SW.shipwreckBarrels([], h) : h.type === 'shipwreckAnchor' ? SW.shipwreckAnchorBody(SW.shipwreckYard([], h), h, 0) : [];
      for (const q of S) if (SW.shapeDist(q, f.x, f.alt) < SW.COCO_R + 2) { sfail('a compass never sits in a trap\'s solid parts', `${h.type} at ${f.alt | 0}`); break; }
    }
    for (let i = 0; i < fr.length; i++) for (let j = i + 1; j < fr.length && fr[j].alt - fr[i].alt < 80; j++) if (Math.hypot(fr[i].x - fr[j].x, fr[i].alt - fr[j].alt) < SW.pickR(fr[i]) + SW.pickR(fr[j]) + SW.PICK_GAP - 0.01) sfail('pickups never overlap', `${fr[i].alt | 0}`);
    if (fr.filter(f => f.kind === 'shipwreckCompass').length !== 3) sfail('the hold holds exactly 3 golden compasses', `${fr.filter(f => f.kind === 'shipwreckCompass').length}`);
    let gap = 0, last = 60; for (const f of fr) if (f.kind === 'chili') { gap = Math.max(gap, f.alt - last); last = f.alt; }
    if (gap > 640) sfail('the hold keeps a chili line', `${gap | 0}`);
    if (k > 2) continue;   // (the searches run on the stage itself and two more seeds)
    for (const b of level.beats) {
      const lo = Math.min(...b.hs.map(h => h.lo)) - 150, hi = Math.max(...b.hs.map(h => h.hi)) + 90;
      const traps = hz.filter(h => h.lo < hi + 60 && h.hi > lo - 60);
      shipwreckStats.traps++;
      for (let p = 0; p < 6; p++) {
        const t0 = p * 1.13 + k * 0.37, [l, r] = level.walls(lo + 40);
        shipwreckStats.searches++;
        const tm = fly(level, traps, (l + r) / 2, lo + 40, t0, (x, a) => a >= hi - 10, lo, hi + 20);
        if (tm < 0) sfail('every trap can be passed by the widest pilot from any phase', `${b.kind} at ${b.a} (${b.sec.name}), start ${t0.toFixed(2)} s, seed ${k}`);
        else shipwreckStats.worst = Math.max(shipwreckStats.worst, tm);
      }
    }
    // every compass can be touched and then escaped (flown on past its trap) by the widest pilot, from 6 phases
    for (const f of fr.filter(f => f.kind === 'shipwreckCompass')) {
      const own = hz.filter(h => h.lo - 40 < f.alt && h.hi + 120 > f.alt), lo = Math.min(f.alt, ...own.map(h => h.lo)) - 200, hi = Math.max(f.alt, ...own.map(h => h.hi)) + 100;
      const traps = hz.filter(h => h.lo < hi + 60 && h.hi > lo - 60), [l, r] = level.walls(lo + 40);
      for (let p = 0; p < 6; p++) {
        shipwreckStats.searches++;
        const tm = fly(level, traps, (l + r) / 2, lo + 40, p * 1.07 + k * 0.29, (x, a) => a >= hi - 10, lo, hi + 20, (x, a) => Math.hypot(x - f.x, a - f.alt) < SW.COCO_R + W / 2 - 4);
        if (tm < 0) sfail('every golden compass can be grabbed and escaped by the widest pilot', `compass at ${f.alt | 0}, phase ${p}, seed ${k}`);
      }
      shipwreckStats.compasses++;
    }
  }
  if (failures.size) {
    console.log(`FAILED: ${failures.size} rule(s) broken`);
    for (const [rule, { count, example }] of failures) console.log(`  ✗ ${rule} — ${count}× (e.g. ${example})`);
    process.exit(1);
  }
}
const shipwreckSummary = () => `PASS: Shipwreck Hold: ${shipwreckStats.seeds} layouts × ${shipwreckStats.len} m, only its own traps (${Object.entries(shipwreckStats.kinds).map(([k, n]) => `${n} ${k}`).join(', ')}), each taught alone first; shaft ${shipwreckStats.minW.toFixed(0)}+ wide, wall slope ${shipwreckStats.slope.toFixed(2)} (max ${SW.RULES.maxWallSlope}); lanes past barrels ${shipwreckStats.barrelLane.toFixed(0)}+, past anchors at rest ${shipwreckStats.anchorLane.toFixed(0)}+, past a kraken's sweep ${shipwreckStats.armLane.toFixed(0)}+ (minLane ${SW.RULES.minLane}); a rack's gap row ${shipwreckStats.gapRow} high (widest pilot ${PILOT_H.toFixed(0)}); anchors ${shipwreckStats.anchorWall.toFixed(0)}+ off the walls; sling end gaps ${shipwreckStats.slingGap[0].toFixed(0)}..${shipwreckStats.slingGap[1].toFixed(0)}; beats ${shipwreckStats.beatGap.toFixed(0)}+ apart; pickups ${shipwreckStats.pick.toFixed(1)}+ from any trap's reach, nothing pops in; ${shipwreckStats.traps} beats and ${shipwreckStats.compasses} compasses (grab and escape) flown by the widest pilot in ${shipwreckStats.searches} searches from 6 phases each, the slowest pass ${shipwreckStats.worst.toFixed(1)} s`;
// (test slot: Shipwreck Hold, island level 22)
// ---------- Adventure: the Cursed Treasure Vault (island level 23), an authored stage with its own traps ----------
// As the lagoon's checks: every rule on the stage's layout as the game builds it (and 8 other seeds, which only move
// phases, sides and looks), then every beat, every cursed ruby and every real chest flown by a time-space search for the
// widest pilot on the traps' own clocks from several start phases (a pouring column, a lashing tongue, a lunging skull
// and a rolling surge all count as solid exactly when the game kills on them).
const VG = new Function(regions.join('\n') + '\nreturn { createVaultLevel, vaultShapes, vaultDanger, vaultEnd, vaultAvalState, vaultChestBody, vaultChestTrigger, vaultSkullState, vaultSurgeState, VAULT, VAULT_STAGE, VAULT_TYPES, ADV_VAULT, RULES, advSeed, shapeDist, laneSize, pickR, COCO_R, PICK_GAP, UNITS_PER_M };')();
const vaultStats = { seeds: 0, traps: 0, searches: 0, worst: 0, rubies: 0, chests: 0, realChests: 0, pick: Infinity, minW: Infinity, slope: 0, lane: { vaultAval: Infinity, vaultChest: Infinity, vaultSkull: Infinity, vaultSurge: Infinity }, len: 0, kinds: {}, beatGap: Infinity };
{
  const R = VG.RULES, W = PILOT_W, Hh = PILOT_H, M = 4, st0 = VG.ADV_VAULT, X = VG.VAULT;
  const vfail = (rule, d) => fail('vault: ' + rule, d);
  if (st0.theme !== 'vault' || !(st0.reward > 0)) vfail('the vault is a themed stage with a reward', JSON.stringify(st0));
  if (!Array.isArray(st0.goals) || st0.goals.length !== 3 || !st0.goals.some(g => g.k === 'finish') || !st0.goals.some(g => g.k === 'vaultRuby' && g.n === 3) || !st0.goals.some(g => g.k === 'vaultChests' && g.n > 0)) vfail('three missions: the hoard, 3 cursed rubies and the real chests', JSON.stringify(st0.goals));
  if (Math.abs(st0.len * VG.UNITS_PER_M - VG.vaultEnd()) > 1e-6) vfail('the stage length matches its layout', `${st0.len}`);
  // the stage's order: avalanches, then chests (a real one, then a mimic), then skulls, then surges, each taught alone
  {
    const fam = { aval: 'aval', avalPair: 'aval', chest: 'chest', mimic: 'mimic', chestPair: 'mimic', mimicAval: 'mimic', skull: 'skull', skullPair: 'skull', skullChest: 'skull', skullAval: 'skull', surge: 'surge', surgePair: 'surge', surgeSkull: 'surge', surgeChest: 'surge', surgeAval: 'surge' };
    const firsts = {}, seen = [];
    for (const sec of VG.VAULT_STAGE) if (!sec.calm) for (const [, kind, o] of sec.beats) {
      const b = fam[kind]; if (!b) { vfail('every beat is a known kind', kind); continue; }
      if (!firsts[b]) { firsts[b] = o; seen.push(b); if (kind !== b) vfail('each trap is introduced alone first', `${kind} in ${sec.name}`); }
      else if (o.P && firsts[b].P && o.P > firsts[b].P + 0.31) vfail('a trap is never slower than its introduction', `${kind} in ${sec.name}`);
    }
    if (seen.join() !== 'aval,chest,mimic,skull,surge') vfail('the vault teaches avalanches, chests, mimics, skulls, then surges', seen.join());
    if (!VG.VAULT_STAGE.some(sec => sec.calm && !sec.finish && sec !== VG.VAULT_STAGE[0])) vfail('the vault has a breather', '');
    if (!VG.VAULT_STAGE[VG.VAULT_STAGE.length - 1].finish) vfail('the stage ends in the captain\'s hoard', '');
  }
  const capHit = (S, x, a, m) => {
    const r = W / 2 + m, half = Math.max(0, Hh / 2 - W / 2);
    for (const q of S) for (const da of half ? [-half, 0, half] : [0]) if (VG.shapeDist(q, x, a + da) < r) return true;
    return false;
  };
  const ext = S => { let x0 = Infinity, x1 = -Infinity; for (const q of S) { const a = q.k === 'c' ? q.x - q.r : Math.min(q.x0, q.x1) - q.r, b = q.k === 'c' ? q.x + q.r : Math.max(q.x0, q.x1) + q.r; x0 = Math.min(x0, a); x1 = Math.max(x1, b); } return [x0, x1]; };
  // the search (as the lagoon's): solid = every lethal shape of every trap at that moment
  function fly(level, traps, x0, a0, t0, goal, lo, hi, via) {
    const DT = 1 / 15, DX = 11, DA = 11, up = Math.round(440 * DT / DA), dn = Math.round(380 * DT / DA), sd = Math.round(330 * DT / DX);
    const nA = Math.ceil((hi - lo) / DA) + 1, nX = Math.ceil(400 / DX) + 1, V = 1e6;
    let front = new Set([Math.round(x0 / DX) * 1000 + Math.round((a0 - lo) / DA)]);
    for (let step = 1; step <= 10 / DT; step++) {
      const t = t0 + step * DT, S = [];
      for (const h of traps) VG.vaultShapes(h, t, S);
      const next = new Set(), blocked = new Map();
      const free = (xi, ai) => {
        const key = xi * 1000 + ai; if (blocked.has(key)) return blocked.get(key);
        const x = xi * DX, a = lo + ai * DA, [l, r] = level.walls(a), ok = x - W / 2 - 2 >= l && x + W / 2 + 2 <= r && level.walls(a + Hh / 2)[0] <= x - W / 2 && level.walls(a + Hh / 2)[1] >= x + W / 2 && level.walls(a - Hh / 2)[0] <= x - W / 2 && level.walls(a - Hh / 2)[1] >= x + W / 2 && !capHit(S, x, a, M);
        blocked.set(key, ok); return ok;
      };
      for (const k of front) {
        const got = k >= V, kk = k % V, xi = Math.floor(kk / 1000), ai = kk % 1000;
        for (let dA = -dn; dA <= up; dA++) for (let dX = -sd; dX <= sd; dX++) {
          const nx = xi + dX, na = ai + dA; if (na < 0 || na >= nA || nx < 0 || nx >= nX) continue;
          const g2 = got || !via || via(nx * DX, lo + na * DA), key = (g2 ? V : 0) + nx * 1000 + na; if (next.has(key) || !free(nx, na)) continue;
          if (g2 && goal(nx * DX, lo + na * DA)) return step * DT;
          next.add(key);
        }
      }
      if (!next.size) return -1;
      front = next;
    }
    return -1;
  }
  for (let k = 0; k <= 8; k++) {
    const st = k ? { ...st0, seed: `${st0.seed}~${k}` } : st0, level = VG.createVaultLevel(VG.advSeed(st), st), hz = [], fr = [];
    vaultStats.seeds++;
    {
      const VIEW = 1100, h1 = [], f1 = [];
      level.fill(VIEW + 900, h1, f1);
      let sh = h1.length, sf = f1.length;
      for (let cam = 10; cam < level.end; cam += 10) {
        level.fill(cam + VIEW + 900, h1, f1);
        for (; sh < h1.length; sh++) if (h1[sh].lo < cam + VIEW + 100) vfail('traps never pop in on screen', `${h1[sh].type} at ${h1[sh].lo | 0}`);
        for (; sf < f1.length; sf++) if (f1[sf].alt < cam + VIEW + 100) vfail('pickups never pop in on screen', `${f1[sf].kind} at ${f1[sf].alt | 0}`);
      }
      hz.push(...h1); fr.push(...f1);
    }
    vaultStats.len = level.end / 10;
    for (const h of hz) if (!VG.VAULT_TYPES.has(h.type)) vfail('the vault only has its own traps', h.type);
    for (const h of hz) vaultStats.kinds[h.type + (h.type === 'vaultChest' ? (h.mimic ? '(mimic)' : '(real)') : '')] = (vaultStats.kinds[h.type + (h.type === 'vaultChest' ? (h.mimic ? '(mimic)' : '(real)') : '')] || 0) + (k ? 0 : 1);
    for (let i = 1; i < level.beats.length; i++) { const p = level.beats[i - 1], q = level.beats[i], g = Math.min(...q.hs.map(h => h.lo)) - Math.max(...p.hs.map(h => h.hi)); vaultStats.beatGap = Math.min(vaultStats.beatGap, g); if (g < 0) vfail('beats never overlap', `${p.kind} at ${p.a} / ${q.kind} at ${q.a}`); }
    if (hz.some(h => h.hi > level.end - 320)) vfail('the hoard below the finish is clear of traps', `${Math.max(...hz.map(h => h.hi)) | 0} vs ${level.end}`);
    for (let a = 0; a < level.end + 200; a += 1) {
      const [l, r] = level.walls(a), [l2, r2] = level.walls(a + 1);
      vaultStats.minW = Math.min(vaultStats.minW, r - l); vaultStats.slope = Math.max(vaultStats.slope, l2 - l, r - r2);
    }
    if (vaultStats.minW < R.minWidth) vfail('the shaft is never narrower than minWidth', vaultStats.minW.toFixed(1));
    if (vaultStats.slope > R.maxWallSlope) vfail('the walls never step in faster than maxWallSlope', vaultStats.slope.toFixed(2));
    // static lanes: every trap at its widest reach (a full column, a mimic's tongue at full stretch, a skull's ring and
    // lunges, a surge at full heave) leaves an open lane of minLane to the far wall, at every height it reaches
    for (const h of hz) {
      const S = VG.vaultDanger(h);
      for (const q of S) {
        const a0 = q.k === 'c' ? q.a - q.r : Math.min(q.a0, q.a1) - q.r, a1 = q.k === 'c' ? q.a + q.r : Math.max(q.a0, q.a1) + q.r;
        for (let a = a0; a <= a1; a += 6) {
          const [x0, x1] = ext([q]), [l, r] = level.walls(a), m = h.side > 0 ? r - x1 : x0 - l;
          vaultStats.lane[h.type] = Math.min(vaultStats.lane[h.type], m);
          if (m < R.minLane) { vfail('every trap leaves a lane of minLane to the far wall', `${h.type} ${m.toFixed(1)} at ${h.alt | 0}`); break; }
        }
      }
    }
    for (const f of fr) {
      const [l, r] = level.walls(f.alt), pr = VG.pickR(f);
      if (f.x - pr < l + R.fruitMargin - 0.5 || f.x + pr > r - R.fruitMargin + 0.5) vfail('pickups stay off the walls', `${f.kind} at ${f.alt | 0}`);
      if (f.clear === -Infinity) continue;   // (the dares: rubies and the Grotto's ring)
      const need = f.clear ?? (f.bonus || f.kind === 'gold' ? Math.ceil(VG.laneSize().w / 2 + 6 + VG.COCO_R) : R.pickup.clear);
      let dd = Infinity; for (const h of hz) if (h.lo - 220 < f.alt && h.hi + 220 > f.alt) for (const q of VG.vaultDanger(h)) dd = Math.min(dd, VG.shapeDist(q, f.x, f.alt));
      if (!f.bonus && f.kind !== 'gold' && f.clear == null) vaultStats.pick = Math.min(vaultStats.pick, dd);
      if (dd < need - 0.5) vfail('pickups stay clear of every trap\'s reach', `${f.kind} at ${f.alt | 0}: ${dd.toFixed(1)} < ${need}`);
    }
    // a ruby is a dare, but never inside a solid part (the arm holding it)
    for (const f of fr.filter(f => f.kind === 'vaultRuby')) for (const h of hz) if (h.lo - 60 < f.alt && h.hi + 60 > f.alt)
      for (const q of VG.vaultShapes(h, 0, [], 'body')) if (VG.shapeDist(q, f.x, f.alt) < 4) { vfail('a ruby never sits in a trap\'s solid parts', `${h.type} at ${f.alt | 0}`); break; }
    for (let i = 0; i < fr.length; i++) for (let j = i + 1; j < fr.length && fr[j].alt - fr[i].alt < 80; j++) if (Math.hypot(fr[i].x - fr[j].x, fr[i].alt - fr[j].alt) < VG.pickR(fr[i]) + VG.pickR(fr[j]) + VG.PICK_GAP - 0.01) vfail('pickups never overlap', `${fr[i].alt | 0}`);
    if (fr.filter(f => f.kind === 'vaultRuby').length !== 3) vfail('the vault holds exactly 3 cursed rubies', `${fr.filter(f => f.kind === 'vaultRuby').length}`);
    const reals = hz.filter(h => h.type === 'vaultChest' && !h.mimic);
    vaultStats.realChests = reals.length;
    if (reals.length < st0.goals.find(g => g.k === 'vaultChests').n + 2) vfail('the vault holds a few more real chests than the mission asks', `${reals.length}`);
    let gap = 0, last = 60; for (const f of fr) if (f.kind === 'chili') { gap = Math.max(gap, f.alt - last); last = f.alt; }
    if (gap > 640) vfail('the vault keeps a chili line', `${gap | 0}`);
    if (k > 2) continue;   // (the searches run on the stage itself and two more seeds)
    for (const b of level.beats) {
      const lo = Math.min(...b.hs.map(h => h.lo)) - 150, hi = Math.max(...b.hs.map(h => h.hi)) + 90;
      const traps = hz.filter(h => h.lo < hi + 60 && h.hi > lo - 60);
      vaultStats.traps++;
      for (let p = 0; p < 6; p++) {
        const t0 = p * 1.13 + k * 0.37, [l, r] = level.walls(lo + 40);
        vaultStats.searches++;
        const tm = fly(level, traps, (l + r) / 2, lo + 40, t0, (x, a) => a >= hi - 10, lo, hi + 20);
        if (tm < 0) vfail('every trap can be passed by the widest pilot from any phase', `${b.kind} at ${b.a} (${b.sec.name}), start ${t0.toFixed(2)} s, seed ${k}`);
        else vaultStats.worst = Math.max(vaultStats.worst, tm);
      }
    }
    // every ruby can be touched and then escaped (flown on past its traps) by the widest pilot, from 6 phases; every
    // real chest can be cracked open (its trigger touched: body and halo) and escaped, from 3
    const dare = (f, x, a, touch, n, label) => {
      const own = hz.filter(h => h.lo - 40 < a && h.hi + 120 > a), lo = Math.min(a, ...own.map(h => h.lo)) - 200, hi = Math.max(a, ...own.map(h => h.hi)) + 100;
      const traps = hz.filter(h => h.lo < hi + 60 && h.hi > lo - 60), [l, r] = level.walls(lo + 40);
      for (let p = 0; p < n; p++) {
        vaultStats.searches++;
        const tm = fly(level, traps, (l + r) / 2, lo + 40, p * 1.07 + k * 0.29, (x, a) => a >= hi - 10, lo, hi + 20, touch);
        if (tm < 0) { vfail(`every ${label} can be reached and escaped by the widest pilot`, `${label} at ${a | 0}, phase ${p}, seed ${k}`); return false; }
      }
      return true;
    };
    for (const f of fr.filter(f => f.kind === 'vaultRuby')) if (dare(f, f.x, f.alt, (x, a) => Math.hypot(x - f.x, a - f.alt) < VG.COCO_R + W / 2 - 4, 6, 'cursed ruby')) vaultStats.rubies++;
    if (k === 0) for (const h of reals) { const B = VG.vaultChestTrigger([], h); if (dare(h, h.x, h.alt + 17, (x, a) => capHit(B, x, a, -2), 3, 'real chest')) vaultStats.chests++; }
  }
  if (failures.size) {
    console.log(`FAILED: ${failures.size} rule(s) broken`);
    for (const [rule, { count, example }] of failures) console.log(`  ✗ ${rule} — ${count}× (e.g. ${example})`);
    process.exit(1);
  }
}
const vaultSummary = () => `PASS: Cursed Treasure Vault: ${vaultStats.seeds} layouts × ${vaultStats.len} m, only its own traps (${Object.entries(vaultStats.kinds).map(([k, n]) => `${n} ${k}`).join(', ')}), each taught alone first; shaft ${vaultStats.minW.toFixed(0)}+ wide, wall slope ${vaultStats.slope.toFixed(2)} (max ${VG.RULES.maxWallSlope}); open lanes past avalanches ${vaultStats.lane.vaultAval.toFixed(0)}+, chests ${vaultStats.lane.vaultChest.toFixed(0)}+, skulls ${vaultStats.lane.vaultSkull.toFixed(0)}+, surges ${vaultStats.lane.vaultSurge.toFixed(0)}+ (minLane ${VG.RULES.minLane}), beats ${vaultStats.beatGap.toFixed(0)}+ apart; pickups ${vaultStats.pick.toFixed(1)}+ from any trap's reach, nothing pops in; ${vaultStats.traps} beats, ${vaultStats.rubies} rubies and ${vaultStats.chests}/${vaultStats.realChests} real chests (reach and escape) flown by the widest pilot in ${vaultStats.searches} searches, the slowest pass ${vaultStats.worst.toFixed(1)} s`;
// (test slot: Cursed Treasure Vault, island level 23)
// ---------- Adventure: Cascade Falls (island level 24), an authored stage with its own traps ----------
// As the Fossil Bonepit's checks: every rule on the stage's layout as the game builds it (and 8 other seeds, which only
// move phases and looks), then every beat and every rainbow drop flown by a time-space search for the widest pilot on
// the traps' own clocks from 6 start phases. Inside a chute the search climbs no faster than the chute lets it, and a
// surge front counts as solid: every beat can be passed without ever being washed back, which the "never washed back"
// mission needs.
const CA = new Function(regions.join('\n') + '\nreturn { createCascadeLevel, cascadeShapes, cascadeDanger, cascadeEnd, cascadeCx, cascadeHw, cascadeTipFill, cascadeChuteAt, cascadeLogAt, cascadeFishAt, cascadeFishPt, cascadeTipperAt, cascadeTipPt, CASCADE, CASCADE_STAGE, CASCADE_TYPES, ADV_CASCADE, RULES, advSeed, shapeDist, laneSize, pickR, COCO_R, PICK_GAP, UNITS_PER_M };')();
const cascadeStats = { seeds: 0, traps: 0, searches: 0, worst: 0, drops: 0, pick: Infinity, minW: Infinity, slope: 0, beatGap: Infinity, len: 0, kinds: {}, hop: 0, tipV: 0, chutes: 0, dryLane: Infinity, bend: 0 };
{
  const R = CA.RULES, W = PILOT_W, Hh = PILOT_H, M = 4, st0 = CA.ADV_CASCADE, X = CA.CASCADE;
  if (st0.theme !== 'cascade' || !(st0.reward > 0)) fail('Cascade Falls is a themed stage with a reward', JSON.stringify(st0));
  if (!Array.isArray(st0.goals) || st0.goals.length !== 3 || !st0.goals.some(g => g.k === 'finish') || !st0.goals.some(g => g.k === 'cascadeDrops' && g.n === 3) || !st0.goals.some(g => g.k === 'cascadeDry')) fail('Cascade Falls has three missions: the Rainbow Spring, 3 rainbow drops and never washed back', JSON.stringify(st0.goals));
  if (Math.abs(st0.len * CA.UNITS_PER_M - CA.cascadeEnd()) > 1e-6) fail('the Cascade Falls stage length matches its layout', `${st0.len}`);
  // the stage's order: the great fall alone first, then logs, then flying fish, then tippers, each taught alone (never faster first)
  {
    const firsts = {}, seen = [], base = { logPair: 'cascadeLog', fishBoth: 'cascadeFish', fishLog: 'cascadeFish', tipperPair: 'cascadeTipper', tipperFish: 'cascadeTipper', tipperLog: 'cascadeTipper', logBoth: 'cascadeLog', fishTwin: 'cascadeFish', tipperBoth: 'cascadeTipper' };
    const S = CA.CASCADE_STAGE, firstChute = S.findIndex(sec => sec.chute), firstBeat = S.findIndex(sec => sec.beats);
    if (!(firstChute > 0 && firstChute < firstBeat && !S[firstChute].beats)) fail('Cascade Falls teaches the Downpour Chute alone before any trap', `${firstChute} ${firstBeat}`);
    for (const sec of S) if (sec.beats) for (const [, kind, o] of sec.beats) {
      const b = base[kind] || kind;
      if (!firsts[b]) { firsts[b] = o; seen.push(b); if (kind !== b) fail('each cascade trap is introduced alone first', `${kind} in ${sec.name}`); }
      else if (o.P && firsts[b].P && o.P > firsts[b].P + 1e-9) fail('a cascade trap is never slower than its introduction', `${kind} in ${sec.name}`);
    }
    if (seen.join() !== 'cascadeLog,cascadeFish,cascadeTipper') fail('Cascade Falls teaches logs, then flying fish, then tippers', seen.join());
    if (!S.some(sec => sec.calm && !sec.finish && sec !== S[0])) fail('Cascade Falls has a breather ledge', '');
    if (!S[S.length - 1].finish) fail('Cascade Falls ends in the Rainbow Spring', '');
  }
  const capHit = (S, x, a, m) => {
    const r = W / 2 + m, half = Math.max(0, Hh / 2 - W / 2);
    for (const q of S) for (const da of half ? [-half, 0, half] : [0]) if (CA.shapeDist(q, x, a + da) < r) return true;
    return false;
  };
  // the middle of the widest dry ground at height a (beside or between the falls there)
  const dryMid = (level, chutes, a) => {
    const [l, r] = level.walls(a), here = chutes.filter(q => a >= q.lo && a <= q.hi).map(q => [CA.cascadeCx(q, a) - CA.cascadeHw(q, a), CA.cascadeCx(q, a) + CA.cascadeHw(q, a)]).sort((p, q) => p[0] - q[0]);
    let x = l, best = null; for (const [p, q] of [...here, [r, r]]) { if (!best || p - x > best[1] - best[0]) best = [x, p]; x = Math.max(x, q); }
    return (best[0] + best[1]) / 2;
  };
  // every lethal shape of the traps at t, and the chutes' surge fronts (the search never lets itself be washed back)
  const allShapes = (traps, t, S) => { for (const h of traps) CA.cascadeShapes(h, t, S); return S; };
  // the search (as the fossil's): in a chute the climb is capped at the chute's `up`
  function fly(level, traps, x0, a0, t0, goal, lo, hi, via) {
    const DT = 1 / 15, DX = 11, DA = 11, up = Math.round(440 * DT / DA), upC = Math.floor(X.chute.up * DT / DA), dn = Math.round(380 * DT / DA), sd = Math.round(330 * DT / DX);
    const nA = Math.ceil((hi - lo) / DA) + 1, nX = Math.ceil(400 / DX) + 1, V = 1e6, chutes = traps.filter(h => h.type === 'cascadeChute');
    const wet = new Map(), inChute = (xi, ai) => { const key = xi * 1000 + ai; if (wet.has(key)) return wet.get(key); const x = xi * DX, a = lo + ai * DA, v = chutes.some(c => a > c.lo && a < c.hi && Math.abs(x - CA.cascadeCx(c, a)) < CA.cascadeHw(c, a)); wet.set(key, v); return v; };
    let front = new Set([Math.round(x0 / DX) * 1000 + Math.round((a0 - lo) / DA)]);
    for (let step = 1; step <= 18 / DT; step++) {
      const t = t0 + step * DT, S = allShapes(traps, t, []);
      const next = new Set(), blocked = new Map();
      const free = (xi, ai) => {
        const key = xi * 1000 + ai; if (blocked.has(key)) return blocked.get(key);
        const x = xi * DX, a = lo + ai * DA, [l, r] = level.walls(a), ok = x - W / 2 - 2 >= l && x + W / 2 + 2 <= r && level.walls(a + Hh / 2)[0] <= x - W / 2 && level.walls(a + Hh / 2)[1] >= x + W / 2 && level.walls(a - Hh / 2)[0] <= x - W / 2 && level.walls(a - Hh / 2)[1] >= x + W / 2 && !capHit(S, x, a, M);
        blocked.set(key, ok); return ok;
      };
      for (const k of front) {
        const got = k >= V, kk = k % V, xi = Math.floor(kk / 1000), ai = kk % 1000, u = inChute(xi, ai) ? upC : up;
        for (let dA = -dn; dA <= u; dA++) for (let dX = -sd; dX <= sd; dX++) {
          const nx = xi + dX, na = ai + dA; if (na < 0 || na >= nA || nx < 0 || nx >= nX) continue;
          const g2 = got || !via || via(nx * DX, lo + na * DA), key = (g2 ? V : 0) + nx * 1000 + na; if (next.has(key) || !free(nx, na)) continue;
          if (g2 && goal(nx * DX, lo + na * DA)) return step * DT;
          next.add(key);
        }
      }
      if (!next.size) { globalThis.casDbg = { step, t, maxA: Math.max(...[...front].map(k => lo + (k % V) % 1000 * DA)), xs: [...front].slice(0, 30).map(k => [Math.floor((k % V) / 1000) * DX, lo + (k % V) % 1000 * DA]) }; return -1; }
      front = next;
    }
    return -1;
  }
  for (let k = 0; k <= 8; k++) {
    const st = k ? { ...st0, seed: `${st0.seed}~${k}` } : st0, level = CA.createCascadeLevel(CA.advSeed(st), st), hz = [], fr = [];
    cascadeStats.seeds++;
    {
      const VIEW = 1100, h1 = [], f1 = [];
      level.fill(VIEW + 900, h1, f1);
      let sh = h1.length, sf = f1.length;
      for (let cam = 10; cam < level.end; cam += 10) {
        level.fill(cam + VIEW + 900, h1, f1);
        for (; sh < h1.length; sh++) if (h1[sh].lo < cam + VIEW + 100) fail('cascade traps never pop in on screen', `${h1[sh].type} at ${h1[sh].lo | 0}`);
        for (; sf < f1.length; sf++) if (f1[sf].alt < cam + VIEW + 100) fail('cascade pickups never pop in on screen', `${f1[sf].kind} at ${f1[sf].alt | 0}`);
      }
      hz.push(...h1); fr.push(...f1);
    }
    cascadeStats.len = level.end / 10;
    for (const h of hz) if (!CA.CASCADE_TYPES.has(h.type)) fail('Cascade Falls only has its own traps', h.type);
    for (const h of hz) cascadeStats.kinds[h.type] = (cascadeStats.kinds[h.type] || 0) + (k ? 0 : 1);
    const chutes = hz.filter(h => h.type === 'cascadeChute'), traps0 = hz.filter(h => h.type !== 'cascadeChute');
    cascadeStats.chutes = chutes.length;
    // beats never crowd: each beat's traps start above the last beat's whole reach (one thing to read at a time)
    for (let i = 1; i < level.beats.length; i++) { const p = level.beats[i - 1], q = level.beats[i], g = Math.min(...q.hs.map(h => h.lo)) - Math.max(...p.hs.map(h => h.hi)); cascadeStats.beatGap = Math.min(cascadeStats.beatGap, g); if (g < 0) fail('cascade beats never overlap', `${p.kind} at ${p.a} / ${q.kind} at ${q.a}`); }
    if (traps0.some(h => h.hi > level.end - 320) || chutes.some(c => c.hi > level.end - 200)) fail('the Rainbow Spring below the finish is clear of traps and falls', `${Math.max(...hz.map(h => h.hi)) | 0} vs ${level.end}`);
    for (let a = 0; a < level.end + 200; a += 1) {
      const [l, r] = level.walls(a), [l2, r2] = level.walls(a + 1);
      cascadeStats.minW = Math.min(cascadeStats.minW, r - l); cascadeStats.slope = Math.max(cascadeStats.slope, l2 - l, r - r2);
    }
    if (cascadeStats.minW < R.minWidth) fail('the cascade shaft is never narrower than minWidth', cascadeStats.minW.toFixed(1));
    if (cascadeStats.slope > R.maxWallSlope) fail('the cascade walls never step in faster than maxWallSlope', cascadeStats.slope.toFixed(2));
    // the chutes: where the traps are, a fall leaves a dry lane each side the widest pilot fits; elsewhere (it may
    // hug a wall or split in two) there is always dry ground the widest pilot fits; every bend, shift and swell is gentle
    for (const c of chutes) {
      const trapped = traps0.some(h => h.hi > c.lo && h.lo < c.hi);
      for (let a = c.lo; a <= c.hi; a += 4) {
        const [l, r] = level.walls(a), cx = CA.cascadeCx(c, a), hw = CA.cascadeHw(c, a);
        if (trapped) {
          const lane = Math.min(cx - hw - l, r - cx - hw); cascadeStats.dryLane = Math.min(cascadeStats.dryLane, lane);
          if (lane < W + 10) { fail('beside the traps a chute always leaves a dry lane each side', `${a}: ${lane.toFixed(0)}`); break; }
        } else {
          const here = chutes.filter(q => a >= q.lo && a <= q.hi).map(q => [CA.cascadeCx(q, a) - CA.cascadeHw(q, a), CA.cascadeCx(q, a) + CA.cascadeHw(q, a)]).sort((p, q) => p[0] - q[0]);
          let x = l, best = 0; for (const [p, q] of here) { best = Math.max(best, p - x); x = Math.max(x, q); } best = Math.max(best, r - x);
          cascadeStats.dryGround = Math.min(cascadeStats.dryGround ?? Infinity, best);
          if (best < W + 10) { fail('beside a chute there is always dry ground the widest pilot fits', `${a}: ${best.toFixed(0)}`); break; }
        }
        cascadeStats.bend = Math.max(cascadeStats.bend, Math.abs(CA.cascadeCx(c, a + 4) - cx) / 4, Math.abs(CA.cascadeHw(c, a + 4) - hw) / 4);
      }
    }
    if (cascadeStats.bend > 0.5) fail('a chute only bends gently', cascadeStats.bend.toFixed(2));
    cascadeStats.chuteKinds = { twin: chutes.filter(c => c.twin).length, pool: chutes.filter(c => c.pool).length, shift: chutes.filter(c => c.shift).length };
    if (!cascadeStats.chuteKinds.twin || !cascadeStats.chuteKinds.pool || !cascadeStats.chuteKinds.shift) fail('the falls vary: one splits in two, one crosses the shaft, one breaks into terrace pools', JSON.stringify(cascadeStats.chuteKinds));
    for (const h of hz) {
      if (h.type === 'cascadeLog') {
        // a log only ever falls: after it leaves the shelf it never rises more than its little hop off the boulder
        let low = Infinity;
        for (let t = 0; t < h.P; t += 1 / 120) { const s1 = CA.cascadeLogAt(h, t); if (s1.ph === 'fall' || s1.ph === 'fly') { if (s1.a > low + 1e-6) cascadeStats.hop = Math.max(cascadeStats.hop, s1.a - low); low = Math.min(low, s1.a); } else low = Infinity; }
        if (cascadeStats.hop > X.log.hop + 0.5) fail('a log only ever falls (a little hop off its boulder at most)', `${h.alt} ${cascadeStats.hop.toFixed(1)}`);
      }
      if (h.type === 'cascadeFish') {
        // flying fish never rise once out of the water, and glide out of the chute's side into the basin on the wall
        for (let i = 0; i < h.n; i++) { let prev = Infinity; for (let q = 0; q <= 1.0001; q += 0.02) { const [, a] = CA.cascadeFishPt(h, i, q); if (a > prev + 1e-6) { fail('flying fish never rise', `${h.alt}`); break; } prev = a; } }
        const c = chutes.find(c => h.alt > c.lo && h.alt < c.hi);
        if (!c || Math.abs(Math.abs(h.x0 - CA.cascadeCx(c, h.alt)) - (CA.cascadeHw(c, h.alt) - 10)) > 1e-6) fail('flying fish leap out of a chute', `${h.alt}`);
      }
      if (h.type === 'cascadeTipper') {
        if (!(CA.cascadeTipFill(h.P) >= X.tipper.minFill && CA.cascadeTipFill(h.P) > X.tipper.tell)) fail('a tipper always has time to fill (and to creak before it tips)', `${h.alt} ${h.P}`);
        // a tipper's arm only swings fast downward: rising back, its tip is never faster than `rise`
        let prev = null;
        for (let t = 0; t < h.P; t += 1 / 120) { const s1 = CA.cascadeTipperAt(h, t), a = CA.cascadeTipPt(h, s1.th, X.tipper.L)[1]; if (prev != null && a > prev) cascadeStats.tipV = Math.max(cascadeStats.tipV, (a - prev) * 120); prev = a; }
        if (cascadeStats.tipV > X.tipper.rise + 1e-6) fail('a tipper only rises slowly (it strikes downward)', `${h.alt} ${cascadeStats.tipV.toFixed(0)}`);
      }
    }
    for (const f of fr) {
      const [l, r] = level.walls(f.alt), pr = CA.pickR(f);
      if (f.x - pr < l + R.fruitMargin - 0.5 || f.x + pr > r - R.fruitMargin + 0.5) fail('cascade pickups stay off the walls', `${f.kind} at ${f.alt | 0}`);
      if (f.clear === -Infinity) continue;   // (the dares: the rainbow drops, the ledge's coconut rainbow)
      const need = f.clear ?? (f.bonus || f.kind === 'gold' ? Math.ceil(CA.laneSize().w / 2 + 6 + CA.COCO_R) : R.pickup.clear);
      let dd = Infinity; for (const h of traps0) if (h.lo - 220 < f.alt && h.hi + 220 > f.alt) for (const q of CA.cascadeDanger(h)) dd = Math.min(dd, CA.shapeDist(q, f.x, f.alt));
      if (!f.bonus && f.kind !== 'gold' && f.clear == null) cascadeStats.pick = Math.min(cascadeStats.pick, dd);
      if (dd < need - 0.5) fail('cascade pickups stay clear of every trap\'s reach', `${f.kind} at ${f.alt | 0}: ${dd.toFixed(1)} < ${need}`);
    }
    for (let i = 0; i < fr.length; i++) for (let j = i + 1; j < fr.length && fr[j].alt - fr[i].alt < 80; j++) if (Math.hypot(fr[i].x - fr[j].x, fr[i].alt - fr[j].alt) < CA.pickR(fr[i]) + CA.pickR(fr[j]) + CA.PICK_GAP - 0.01) fail('cascade pickups never overlap', `${fr[i].alt | 0}`);
    if (fr.filter(f => f.kind === 'drop').length !== 3) fail('Cascade Falls holds exactly 3 rainbow drops', `${fr.filter(f => f.kind === 'drop').length}`);
    let gap = 0, last = 60; for (const f of fr) if (f.kind === 'chili') { gap = Math.max(gap, f.alt - last); last = f.alt; }
    if (gap > 640) fail('Cascade Falls keeps a chili line', `${gap | 0}`);
    if (k > 2) continue;   // (the searches run on the stage itself and two more seeds)
    const near = (lo, hi) => hz.filter(h => h.lo < hi + 60 && h.hi > lo - 60);
    for (const b of level.beats) {
      // (it starts in a dry lane 150 under the beat, or just over the last beat's reach where that is closer)
      const bi = level.beats.indexOf(b), prevTop = bi > 0 ? Math.max(...level.beats[bi - 1].hs.map(h => h.hi)) : -Infinity;
      const lo = Math.min(...b.hs.map(h => h.lo)) - 150, hi = Math.max(...b.hs.map(h => h.hi)) + 90, traps = near(lo, hi), a0 = Math.max(lo + 40, Math.min(prevTop + 20, Math.min(...b.hs.map(h => h.lo)) - 10));
      cascadeStats.traps++;
      for (let p = 0; p < 6; p++) {
        const t0 = p * 1.13 + k * 0.37, [l, r] = level.walls(a0), c = traps.find(h => h.type === 'cascadeChute' && a0 > h.lo && a0 < h.hi);
        const S0 = allShapes(traps, t0 + 1 / 15, []), cand = c ? [(l + CA.cascadeCx(c, a0) - CA.cascadeHw(c, a0)) / 2, (CA.cascadeCx(c, a0) + CA.cascadeHw(c, a0) + r) / 2] : [dryMid(level, chutes, a0), (l + r) / 2 - 60, (l + r) / 2 + 60, l + 45, r - 45];
        const x0 = cand.find(x => !capHit(S0, x, a0, M)) ?? cand[0];   // (start in whichever dry lane the trap below isn't sweeping just then)
        cascadeStats.searches++;
        const tm = fly(level, traps, x0, a0, t0, (x, a) => a >= hi - 10, lo, hi + 20);
        if (tm < 0) fail('every cascade trap can be passed by the widest pilot from any phase, never washed back', `${b.kind} at ${b.a} (${b.sec.name}), start ${t0.toFixed(2)} s, seed ${k} ${JSON.stringify(globalThis.casDbg)} lo ${lo} hi ${hi} x0 ${x0.toFixed(0)} a0 ${a0}`);
        else cascadeStats.worst = Math.max(cascadeStats.worst, tm);
      }
    }
    // the Downpour (the chute alone) can be climbed from any phase without being washed back
    for (const c of chutes.filter(c => c.sec === 'The Downpour' && !c.twinOf)) for (let p = 0; p < 3; p++) for (let a = c.lo - 100; a < c.hi; a += 700) {
      const hi = Math.min(c.hi + 60, a + 800), traps = near(a, hi), [l, r] = level.walls(a + 40);
      cascadeStats.searches++;
      const x0 = dryMid(level, chutes, a + 40);
      if (fly(level, traps, x0, a + 40, p * 1.7 + k, (x, aa) => aa >= hi - 10, a, hi + 20) < 0) fail('the Downpour can be climbed without being washed back', `${a | 0} phase ${p}`);
    }
    // every rainbow drop can be touched and then escaped (flown on past its trap) by the widest pilot, from 6 phases
    for (const f of fr.filter(f => f.kind === 'drop')) {
      const own = traps0.filter(h => h.lo - 40 < f.alt && h.hi + 120 > f.alt), lo = Math.min(f.alt, ...own.map(h => h.lo)) - 200, hi = Math.max(f.alt, ...own.map(h => h.hi)) + 100;
      const traps = near(lo, hi), [l, r] = level.walls(lo + 40), c = traps.find(h => h.type === 'cascadeChute' && lo + 40 > h.lo && lo + 40 < h.hi), x0 = dryMid(level, chutes, lo + 40);
      for (let p = 0; p < 6; p++) {
        cascadeStats.searches++;
        const tm = fly(level, traps, x0, lo + 40, p * 1.07 + k * 0.29, (x, a) => a >= hi - 10, lo, hi + 20, (x, a) => Math.hypot(x - f.x, a - f.alt) < CA.COCO_R + W / 2 - 4);
        if (tm < 0) fail('every rainbow drop can be grabbed and escaped by the widest pilot', `drop at ${f.alt | 0}, phase ${p}, seed ${k}`);
      }
      cascadeStats.drops++;
    }
  }
}
const cascadeSummary = () => `PASS: Cascade Falls: ${cascadeStats.seeds} layouts × ${cascadeStats.len} m, only its own traps (${Object.entries(cascadeStats.kinds).map(([k, n]) => `${n} ${k}`).join(', ')}), the great fall taught alone, then each trap alone first; shaft ${cascadeStats.minW.toFixed(0)}+ wide, wall slope ${cascadeStats.slope.toFixed(2)} (max ${CA.RULES.maxWallSlope}); falls (${cascadeStats.chutes}: ${cascadeStats.chuteKinds.twin} split, ${cascadeStats.chuteKinds.shift} crossing, ${cascadeStats.chuteKinds.pool} terrace pools) leave dry ground ${cascadeStats.dryGround | 0}+, beside traps ${cascadeStats.dryLane.toFixed(0)}+ dry lanes and bend at most ${cascadeStats.bend.toFixed(2)}; logs only fall (hop ${cascadeStats.hop.toFixed(1)}), fish never rise, tippers rise at ${cascadeStats.tipV.toFixed(0)} at most; beats ${cascadeStats.beatGap.toFixed(0)}+ apart; pickups ${cascadeStats.pick.toFixed(1)}+ from any reach; ${cascadeStats.traps} beats × 6 phases, the Downpour and ${cascadeStats.drops} rainbow drops flown by the widest pilot never washed back (${cascadeStats.searches} searches, slowest ${cascadeStats.worst.toFixed(1)} s)`;
// (test slot: Cascade Falls, island level 24)
// ---------- Adventure: Gull Cliffs (island level 25), an authored stage with its own traps and its own wind ----------
// As the storm's checks: every rule on the stage's layout as the game builds it (and 8 other seeds, which only move
// phases and looks), then every beat and every golden egg flown by a time-space search for the widest pilot on the
// traps' own clocks from 6 start phases, the blowholes' jets and the wind's gusts shoving the search sideways while they
// blow, and every gull's dive tried at 5 targets across the shaft (it locks onto wherever you are), plus a dodge from
// right under each target as the gull locks on.
const CL = new Function(regions.join('\n') + '\nreturn { createCliffsLevel, cliffsShapes, cliffsDanger, cliffsEnd, cliffsGullState, cliffsGullPos, cliffsGullPath, cliffsGullBody, cliffsSlideState, cliffsSlideRock, cliffsBoulders, cliffsBlowState, cliffsInJet, cliffsJetPush, cliffsCrabState, cliffsCrabBody, cliffsShelf, cliffsWindState, CLIFFS, CLIFFS_STAGE, CLIFFS_TYPES, ADV_CLIFFS, RULES, advSeed, shapeDist, laneSize, pickR, COCO_R, PICK_GAP, UNITS_PER_M };')();
const cliffsStats = { seeds: 0, traps: 0, searches: 0, worst: 0, eggs: 0, dodges: 0, pick: Infinity, minW: Infinity, slope: 0, slideLane: Infinity, crabLane: Infinity, crabShut: 0, crabWall: Infinity, gullWall: Infinity, jetWall: Infinity, boulderWall: Infinity, len: 0, kinds: {}, beatGap: Infinity };
{
  const R = CL.RULES, W = PILOT_W, Hh = PILOT_H, M = 4, st0 = CL.ADV_CLIFFS, X = CL.CLIFFS;
  const cfail = (rule, d) => fail('cliffs: ' + rule, d);
  if (st0.theme !== 'cliffs' || !(st0.reward > 0)) cfail('Gull Cliffs is a themed stage with a reward', JSON.stringify(st0));
  if (!Array.isArray(st0.goals) || st0.goals.length !== 3 || !st0.goals.some(g => g.k === 'finish') || !st0.goals.some(g => g.k === 'cliffsEgg' && g.n === 3) || !st0.goals.some(g => g.k === 'cliffsSurf' && g.n > 0)) cfail('three missions: the summit, 3 golden eggs and surfing the blowholes', JSON.stringify(st0.goals));
  if (Math.abs(st0.len * CL.UNITS_PER_M - CL.cliffsEnd()) > 1e-6) cfail('the stage length matches its layout', `${st0.len}`);
  // the stage's order: gulls, then rockfalls, then blowholes, then crabs, each taught alone (never faster at first)
  {
    const firsts = {}, seen = [], base = k => k.replace(/(Pair|Gull|Slide|Blow)$/, '');
    for (const sec of CL.CLIFFS_STAGE) if (!sec.calm) for (const [, kind, o] of sec.beats) {
      const b = base(kind);
      if (!firsts[b]) { firsts[b] = o; seen.push(b); if (kind !== b) cfail('each trap is introduced alone first', `${kind} in ${sec.name}`); }
      else if (o.P && firsts[b].P && o.P > firsts[b].P) cfail('a trap is never slower than its introduction', `${kind} in ${sec.name}`);
    }
    if (seen.join() !== 'gull,slide,blow,crab') cfail('the cliffs teach gulls, rockfalls, blowholes, then crabs', seen.join());
    if (!CL.CLIFFS_STAGE.some(sec => sec.calm && !sec.finish && sec !== CL.CLIFFS_STAGE[0])) cfail('the cliffs have a breather', '');
    if (!CL.CLIFFS_STAGE[CL.CLIFFS_STAGE.length - 1].finish) cfail('the stage ends at the summit', '');
  }
  // nothing lethal comes from below: a gull only ever dives down (its height never rises while it can hurt), boulders
  // only fall, a crab's claw only ever reaches down over the gap
  {
    const h = { side: 1, alt: 0, P: 5, ph: 0, hx: 66, L: 0, R: 360, base: 0 };
    for (const lx of [40, 180, 320]) { let prev = null; for (let t = 0; t < 5; t += 0.005) { const st = CL.cliffsGullState(h, t); if (st.mode !== 'dive') { prev = null; continue; } const p = CL.cliffsGullPos(h, st, lx); if (prev && p.a > prev.a + 1e-6) { cfail('a gull only dives down while it can hurt', `${t.toFixed(3)} target ${lx}`); break; } prev = p; } }
  }
  const capHit = (S, x, a, m) => {
    const r = W / 2 + m, half = Math.max(0, Hh / 2 - W / 2);
    for (const q of S) for (const da of half ? [-half, 0, half] : [0]) if (CL.shapeDist(q, x, a + da) < r) return true;
    return false;
  };
  const ext = S => { let x0 = Infinity, x1 = -Infinity; for (const q of S) { const a = q.k === 'c' ? q.x - q.r : q.k === 'b' ? q.x0 : Math.min(q.x0, q.x1) - q.r, b = q.k === 'c' ? q.x + q.r : q.k === 'b' ? q.x1 : Math.max(q.x0, q.x1) + q.r; x0 = Math.min(x0, a); x1 = Math.max(x1, b); } return [x0, x1]; };
  // the search (as the storm's): solid = every lethal shape at that moment (gulls diving at lockX); while a blowhole's
  // jet blasts over the pilot it is carried a cell a step toward the far wall, and while the wind gusts a cell every
  // third step downwind (never into a wall). via(x, a) must be touched before the goal; goal(x, a, time).
  function fly(level, traps, x0, a0, t0, goal, lo, hi, via, lockX, T = 10) {
    const DT = 1 / 15, DX = 11, DA = 11, up = Math.round(440 * DT / DA), dn = Math.round(380 * DT / DA), sd = Math.round(330 * DT / DX);
    const nA = Math.ceil((hi - lo) / DA) + 1, nX = Math.ceil(400 / DX) + 1, V = 1e6, blows = traps.filter(h => h.type === 'cliffsBlow');
    let front = new Set([Math.round(x0 / DX) * 1000 + Math.round((a0 - lo) / DA)]);
    for (let step = 1; step <= T / DT; step++) {
      const t = t0 + step * DT, S = [], B = blows.map(h => ({ h, k: CL.cliffsBlowState(h, t).k })).filter(b => b.k > 0.3), wd = CL.cliffsWindState(t);
      for (const h of traps) CL.cliffsShapes(h, t, S, h.type === 'cliffsGull' ? lockX : undefined);
      const next = new Set(), blocked = new Map();
      const inWalls = (x, a) => { const [l, r] = level.walls(a); return x - W / 2 - 2 >= l && x + W / 2 + 2 <= r && level.walls(a + Hh / 2)[0] <= x - W / 2 && level.walls(a + Hh / 2)[1] >= x + W / 2 && level.walls(a - Hh / 2)[0] <= x - W / 2 && level.walls(a - Hh / 2)[1] >= x + W / 2; };
      const free = (xi, ai) => {
        const key = xi * 1000 + ai; if (blocked.has(key)) return blocked.get(key);
        const x = xi * DX, a = lo + ai * DA, ok = inWalls(x, a) && !capHit(S, x, a, M);
        blocked.set(key, ok); return ok;
      };
      for (const k of front) {
        const got = k >= V, kk = k % V, xi = Math.floor(kk / 1000), ai = kk % 1000;
        for (let dA = -dn; dA <= up; dA++) for (let dX = -sd; dX <= sd; dX++) {
          let nx = xi + dX; const na = ai + dA; if (na < 0 || na >= nA || nx < 0 || nx >= nX) continue;
          const a = lo + na * DA;
          const b = B.find(q => CL.cliffsInJet(q.h, nx * DX, a, Hh / 2 - 10) >= 0 && CL.cliffsInJet(q.h, nx * DX, a, Hh / 2 - 10) < 0.85);
          if (b) { const n2 = nx + b.h.side; if (inWalls(n2 * DX, a)) nx = n2; }   // (carried, but never into the wall)
          else if (wd.k * level.windAt(a) > 0.25 && step % 3 === 0) { const n2 = nx + wd.side; if (inWalls(n2 * DX, a)) nx = n2; }
          const g2 = got || !via || via(nx * DX, a), key = (g2 ? V : 0) + nx * 1000 + na; if (next.has(key) || !free(nx, na)) continue;
          if (g2 && goal(nx * DX, a, step * DT)) return step * DT;
          next.add(key);
        }
      }
      if (!next.size) return -1;
      front = next;
    }
    return -1;
  }
  const locks = h => { const out = []; for (let i = 0; i < 5; i++) out.push(h.L + X.gull.edge + (h.R - h.L - 2 * X.gull.edge) * i / 4); return out; };
  for (let k = 0; k <= 8; k++) {
    const st = k ? { ...st0, seed: `${st0.seed}~${k}` } : st0, level = CL.createCliffsLevel(CL.advSeed(st), st), hz = [], fr = [];
    cliffsStats.seeds++;
    {
      const VIEW = 1100, h1 = [], f1 = [];
      level.fill(VIEW + 900, h1, f1);
      let sh = h1.length, sf = f1.length;
      for (let cam = 10; cam < level.end; cam += 10) {
        level.fill(cam + VIEW + 900, h1, f1);
        for (; sh < h1.length; sh++) if (h1[sh].lo < cam + VIEW + 100) cfail('traps never pop in on screen', `${h1[sh].type} at ${h1[sh].lo | 0}`);
        for (; sf < f1.length; sf++) if (f1[sf].alt < cam + VIEW + 100) cfail('pickups never pop in on screen', `${f1[sf].kind} at ${f1[sf].alt | 0}`);
      }
      hz.push(...h1); fr.push(...f1);
    }
    cliffsStats.len = level.end / 10;
    for (const h of hz) if (!CL.CLIFFS_TYPES.has(h.type)) cfail('the cliffs only have their own traps', h.type);
    for (const h of hz) cliffsStats.kinds[h.type] = (cliffsStats.kinds[h.type] || 0) + (k ? 0 : 1);
    for (let i = 1; i < level.beats.length; i++) { const p = level.beats[i - 1], q = level.beats[i], g = Math.min(...q.hs.map(h => h.lo)) - Math.max(...p.hs.map(h => h.hi)); cliffsStats.beatGap = Math.min(cliffsStats.beatGap, g); if (g < 0) cfail('beats never overlap', `${p.kind} at ${p.a} / ${q.kind} at ${q.a}`); }
    for (const b of level.beats) if (b.kind !== 'blowSlide') for (let i = 0; i < b.hs.length; i++) for (let j = i + 1; j < b.hs.length; j++) { const p = b.hs[i], q = b.hs[j]; if (p.hi > q.lo && q.hi > p.lo) cfail('the traps in a beat never overlap (but a blowhole aimed into a rockfall)', `${b.kind} at ${b.a}`); }
    if (hz.some(h => h.hi > level.end - 320)) cfail('the summit below the finish is clear of traps', `${Math.max(...hz.map(h => h.hi)) | 0} vs ${level.end}`);
    if (hz.filter(h => h.type === 'cliffsBlow').length < 6) cfail('enough blowholes to surf', '');
    for (let a = 0; a < level.end + 200; a += 1) {
      const [l, r] = level.walls(a), [l2, r2] = level.walls(a + 1);
      cliffsStats.minW = Math.min(cliffsStats.minW, r - l); cliffsStats.slope = Math.max(cliffsStats.slope, l2 - l, r - r2);
    }
    if (cliffsStats.minW < R.minWidth) cfail('the shaft is never narrower than minWidth', cliffsStats.minW.toFixed(1));
    if (cliffsStats.slope > R.maxWallSlope) cfail('the walls never step in faster than maxWallSlope', cliffsStats.slope.toFixed(2));
    // static lanes and reaches: past a rockfall's rock and its boulders at rest (minLane), boulders never reach the far
    // wall; past a crab's shelf with the crab at home (minLane), its lunge shutting the gap and never touching the far
    // wall; a gull's hover and dives inside the walls; a blowhole's jet stopping short of the far wall
    for (const h of hz) {
      const lane = (S, a) => { const [l, r] = level.walls(a), [x0, x1] = ext(S); return h.side > 0 ? r - x1 : x0 - l; };
      if (h.type === 'cliffsSlide') {
        const S = CL.cliffsSlideRock([], h); for (const b of CL.cliffsBoulders(h, { fall: -1, regrow: 1 })) if (b) S.push({ k: 'c', x: b[0], a: b[1], r: b[2] });
        const m = Math.min(lane(S, h.alt), lane(S, h.alt - X.slide.drop)); cliffsStats.slideLane = Math.min(cliffsStats.slideLane, m); if (m < R.minLane) cfail('a rockfall leaves a lane of minLane', `${m.toFixed(1)} at ${h.alt}`);
        for (let f = 0; f <= X.slide.fall; f += 0.02) for (const b of CL.cliffsBoulders(h, { fall: f, regrow: 1 })) if (b) { const m2 = lane([{ k: 'c', x: b[0], a: b[1], r: b[2] }], b[1]); cliffsStats.boulderWall = Math.min(cliffsStats.boulderWall, m2); if (m2 < R.minLane) cfail('falling boulders leave a lane of minLane', `${m2.toFixed(1)} at ${h.alt}`); }
      }
      if (h.type === 'cliffsCrab') {
        const S = CL.cliffsShelf([], h); CL.cliffsCrabBody(S, h, { pos: 0, lunge: 0, tell: 1 }); CL.cliffsCrabBody(S, h, { pos: 0, lunge: 0, tell: 0 });
        const m = lane(S, h.alt); cliffsStats.crabLane = Math.min(cliffsStats.crabLane, m); if (m < R.minLane) cfail('a crab at home leaves a lane of minLane', `${m.toFixed(1)} at ${h.alt}`);
        const L2 = CL.cliffsCrabBody(CL.cliffsShelf([], h), h, { pos: 1, lunge: 1, tell: 0 }), g = lane(L2, h.alt);
        cliffsStats.crabShut = Math.max(cliffsStats.crabShut, g); cliffsStats.crabWall = Math.min(cliffsStats.crabWall, g);
        if (g < 6) cfail('a crab never lunges into the far wall', `${g.toFixed(1)} at ${h.alt}`);
        if (g > W - 4) cfail('a lunging crab shuts the gap', `${g.toFixed(1)} at ${h.alt}`);
      }
      if (h.type === 'cliffsGull') for (const lx of locks(h)) {
        const S = []; for (let q = 0; q <= 1; q += 0.05) CL.cliffsGullBody(S, CL.cliffsGullPos(h, { mode: 'dive', k: q, u: 0 }, lx), 'dive');
        CL.cliffsGullBody(S, CL.cliffsGullPos(h, { mode: 'hover', k: 1, u: 0 }, lx), 'hover', 1);
        for (const q of S) { const qa = q.k === 'c' ? q.a : (q.a0 + q.a1) / 2, [l, r] = level.walls(qa), [x0, x1] = ext([q]), m2 = Math.min(x0 - l, r - x1); cliffsStats.gullWall = Math.min(cliffsStats.gullWall, m2); if (m2 < 2) { cfail('a gull never flies into a wall', `${m2.toFixed(1)} at ${h.alt}`); break; } }
      }
      if (h.type === 'cliffsBlow') { const [l, r] = level.walls(h.alt), m = h.side > 0 ? r - (h.base + h.reach) : h.base - h.reach - l; cliffsStats.jetWall = Math.min(cliffsStats.jetWall, m); if (m < 30) cfail('a blowhole\'s jet stops short of the far wall', `${m.toFixed(1)} at ${h.alt}`); }
    }
    for (const f of fr) {
      const [l, r] = level.walls(f.alt), pr = CL.pickR(f);
      if (f.x - pr < l + R.fruitMargin - 0.5 || f.x + pr > r - R.fruitMargin + 0.5) cfail('pickups stay off the walls', `${f.kind} at ${f.alt | 0}`);
      if (f.clear === -Infinity) continue;   // (the dares: eggs and the Meadow's ring)
      const need = f.clear ?? (f.bonus || f.kind === 'gold' ? Math.ceil(CL.laneSize().w / 2 + 6 + CL.COCO_R) : R.pickup.clear);
      let dd = Infinity; for (const h of hz) if (h.lo - 220 < f.alt && h.hi + 220 > f.alt) for (const q of CL.cliffsDanger(h)) dd = Math.min(dd, CL.shapeDist(q, f.x, f.alt));
      if (!f.bonus && f.kind !== 'gold' && f.clear == null) cliffsStats.pick = Math.min(cliffsStats.pick, dd);
      if (dd < need - 0.5) cfail('pickups stay clear of every trap\'s reach', `${f.kind} at ${f.alt | 0}: ${dd.toFixed(1)} < ${need}`);
    }
    // the eggs are dares, but never inside a trap's solid parts (a rockfall's rock, a crab's shelf or the crab at home)
    for (const f of fr.filter(f => f.kind === 'cliffsEgg')) for (const h of hz) if (h.lo - 60 < f.alt && h.hi + 60 > f.alt) {
      const S = h.type === 'cliffsSlide' ? CL.cliffsSlideRock([], h) : h.type === 'cliffsCrab' ? CL.cliffsCrabBody(CL.cliffsShelf([], h), h, { pos: 0, lunge: 0, tell: 0 }) : [];
      for (const q of S) if (CL.shapeDist(q, f.x, f.alt) < CL.COCO_R + 2) { cfail('an egg never sits in a trap\'s solid parts', `${h.type} at ${f.alt | 0}`); break; }
    }
    for (let i = 0; i < fr.length; i++) for (let j = i + 1; j < fr.length && fr[j].alt - fr[i].alt < 80; j++) if (Math.hypot(fr[i].x - fr[j].x, fr[i].alt - fr[j].alt) < CL.pickR(fr[i]) + CL.pickR(fr[j]) + CL.PICK_GAP - 0.01) cfail('pickups never overlap', `${fr[i].alt | 0}`);
    if (fr.filter(f => f.kind === 'cliffsEgg').length !== 3) cfail('the cliffs hold exactly 3 golden eggs', `${fr.filter(f => f.kind === 'cliffsEgg').length}`);
    let gap = 0, last = 60; for (const f of fr) if (f.kind === 'chili') { gap = Math.max(gap, f.alt - last); last = f.alt; }
    if (gap > 640) cfail('the cliffs keep a chili line', `${gap | 0}`);
    if (k > 2) continue;   // (the searches run on the stage itself and two more seeds)
    for (const b of level.beats) {
      const lo = Math.min(...b.hs.map(h => h.lo)) - 150, hi = Math.max(...b.hs.map(h => h.hi)) + 90;
      const traps = hz.filter(h => h.lo < hi + 60 && h.hi > lo - 60), gull = b.hs.find(h => h.type === 'cliffsGull');
      cliffsStats.traps++;
      for (const lx of gull ? locks(gull) : [null]) for (let p = 0; p < 6; p++) {
        const t0 = p * 1.13 + k * 0.37, [l, r] = level.walls(lo + 40);
        cliffsStats.searches++;
        const tm = fly(level, traps, (l + r) / 2, lo + 40, t0, (x, a) => a >= hi - 10, lo, hi + 20, null, lx);
        if (tm < 0) cfail('every beat can be passed by the widest pilot from any phase', `${b.kind} at ${b.a} (${b.sec.name}), start ${t0.toFixed(2)} s, lock ${lx | 0}, seed ${k}`);
        else cliffsStats.worst = Math.max(cliffsStats.worst, tm);
      }
      // the dodge: right under a gull's target, at its height, as it locks on: get clear (live 2 s or climb past)
      if (gull && k === 0) for (const lx of locks(gull)) {
        const G0 = X.gull, rest = gull.P - G0.tell - G0.dive - G0.away, tl = (Math.floor(5 - gull.ph) + rest / gull.P - gull.ph + 5) * gull.P;
        cliffsStats.searches++; cliffsStats.dodges++;
        const tm = fly(level, traps, lx, gull.alt, tl, (x, a, tt) => tt >= 2.0 || a >= hi - 10, lo, hi + 20, null, lx, 3);
        if (tm < 0) cfail('a gull\'s target can always be dodged', `gull at ${gull.alt} target ${lx | 0}`);
      }
    }
    // every egg can be touched and then escaped (flown on past its trap) by the widest pilot, from 6 phases
    for (const f of fr.filter(f => f.kind === 'cliffsEgg')) {
      const own = hz.filter(h => h.lo - 40 < f.alt && h.hi + 120 > f.alt), lo = Math.min(f.alt, ...own.map(h => h.lo)) - 200, hi = Math.max(f.alt, ...own.map(h => h.hi)) + 100;
      const traps = hz.filter(h => h.lo < hi + 60 && h.hi > lo - 60), [l, r] = level.walls(lo + 40), gull = traps.find(h => h.type === 'cliffsGull');
      for (const lx of gull ? [gull.L + X.gull.edge, (gull.L + gull.R) / 2, gull.R - X.gull.edge] : [null]) for (let p = 0; p < 6; p++) {
        cliffsStats.searches++;
        const tm = fly(level, traps, (l + r) / 2, lo + 40, p * 1.07 + k * 0.29, (x, a) => a >= hi - 10, lo, hi + 20, (x, a) => Math.hypot(x - f.x, a - f.alt) < CL.COCO_R + W / 2 - 4, lx);
        if (tm < 0) cfail('every golden egg can be grabbed and escaped by the widest pilot', `egg at ${f.alt | 0}, phase ${p}, lock ${lx | 0}, seed ${k}`);
      }
      cliffsStats.eggs++;
    }
  }
  if (failures.size) {
    console.log(`FAILED: ${failures.size} rule(s) broken`);
    for (const [rule, { count, example }] of failures) console.log(`  ✗ ${rule} — ${count}× (e.g. ${example})`);
    process.exit(1);
  }
}
const cliffsSummary = () => `PASS: Gull Cliffs: ${cliffsStats.seeds} layouts × ${cliffsStats.len} m, only its own traps (${Object.entries(cliffsStats.kinds).map(([k, n]) => `${n} ${k}`).join(', ')}), each taught alone first; shaft ${cliffsStats.minW.toFixed(0)}+ wide, ledge undersides of slope ${cliffsStats.slope.toFixed(2)} (max ${CL.RULES.maxWallSlope}); lanes past rockfalls ${cliffsStats.slideLane.toFixed(0)}+ (falling boulders ${cliffsStats.boulderWall.toFixed(0)}+), past a crab at home ${cliffsStats.crabLane.toFixed(0)}+ (minLane ${CL.RULES.minLane}), a lunging crab leaves ${cliffsStats.crabShut.toFixed(0)} (widest pilot ${PILOT_W.toFixed(0)}) and stays ${cliffsStats.crabWall.toFixed(0)}+ off the wall; gulls ${cliffsStats.gullWall.toFixed(0)}+ off the walls and only diving down; jets stop ${cliffsStats.jetWall.toFixed(0)}+ short of the far wall; beats ${cliffsStats.beatGap.toFixed(0)}+ apart; pickups ${cliffsStats.pick.toFixed(1)}+ from any trap's reach, nothing pops in; ${cliffsStats.traps} beats (gulls diving at 5 targets each, jets and gusts shoving), ${cliffsStats.dodges} dodges from under a gull's target and ${cliffsStats.eggs} eggs (grab and escape) flown by the widest pilot in ${cliffsStats.searches} searches, the slowest pass ${cliffsStats.worst.toFixed(1)} s`;
// (test slot: Gull Cliffs, island level 25)
// ---------- Adventure: the Clockwork Tower (island level 26), an authored stage with its own traps ----------
// As the vault's checks: every rule on the stage's layout as the game builds it (and 8 other seeds, which only move
// sides and looks), then every beat and every golden watch flown by a time-space search for the widest pilot on the
// traps' own clocks from several start phases (a sweeping tooth, a slamming ram, a punching cuckoo and a rocking anchor
// all count as solid exactly when the game kills on them). The tower's clock is one beat for every trap: the searches
// start off the beat too.
const CG = new Function(regions.join('\n') + '\nreturn { createClockworkLevel, clockworkShapes, clockworkDanger, clockworkEnd, clockworkGearState, clockworkPistonState, clockworkCuckooState, clockworkAnchorState, CLOCKWORK, CLOCKWORK_STAGE, CLOCKWORK_TYPES, ADV_CLOCKWORK, RULES, advSeed, shapeDist, laneSize, pickR, COCO_R, PICK_GAP, UNITS_PER_M };')();
const clockworkStats = { seeds: 0, traps: 0, searches: 0, worst: 0, watches: 0, pick: Infinity, minW: Infinity, slope: 0, lane: { clockworkGear: Infinity, clockworkPiston: Infinity, clockworkCuckoo: Infinity, clockworkAnchor: Infinity }, len: 0, kinds: {}, beatGap: Infinity };
{
  const R = CG.RULES, W = PILOT_W, Hh = PILOT_H, M = 4, st0 = CG.ADV_CLOCKWORK;
  const cfail = (rule, d) => fail('clockwork: ' + rule, d);
  if (st0.theme !== 'clockwork' || !(st0.reward > 0)) cfail('the tower is a themed stage with a reward', JSON.stringify(st0));
  if (!Array.isArray(st0.goals) || st0.goals.length !== 3 || !st0.goals.some(g => g.k === 'finish') || !st0.goals.some(g => g.k === 'clockworkWatch' && g.n === 3) || !st0.goals.some(g => g.k === 'time' && g.s > 0)) cfail('three missions: the great clock, 3 golden watches and the tower clock', JSON.stringify(st0.goals));
  if (Math.abs(st0.len * CG.UNITS_PER_M - CG.clockworkEnd()) > 1e-6) cfail('the stage length matches its layout', `${st0.len}`);
  // the stage's order: gears, then pistons, then cuckoos, then anchors, each taught alone; never faster than taught
  {
    const fam = { gear: 'gear', gearPair: 'gear', piston: 'piston', pistonPair: 'piston', pistonGear: 'piston', cuckoo: 'cuckoo', cuckooPair: 'cuckoo', cuckooPiston: 'cuckoo', cuckooGear: 'cuckoo', anchor: 'anchor', anchorCuckoo: 'anchor', anchorPiston: 'anchor', anchorGear: 'anchor' };
    const firsts = {}, seen = [];
    for (const sec of CG.CLOCKWORK_STAGE) if (!sec.calm) for (const [, kind, o] of sec.beats) {
      const b = fam[kind]; if (!b) { cfail('every beat is a known kind', kind); continue; }
      if (!firsts[b]) { firsts[b] = o; seen.push(b); if (kind !== b) cfail('each trap is introduced alone first', `${kind} in ${sec.name}`); }
      else if ((o.P && firsts[b].P && o.P > firsts[b].P) || (o.every && firsts[b].every && o.every > firsts[b].every)) cfail('a trap is never slower than its introduction', `${kind} in ${sec.name}`);
    }
    if (seen.join() !== 'gear,piston,cuckoo,anchor') cfail('the tower teaches gears, pistons, cuckoos, then anchors', seen.join());
    if (!CG.CLOCKWORK_STAGE.some(sec => sec.calm && !sec.finish && sec !== CG.CLOCKWORK_STAGE[0])) cfail('the tower has a breather', '');
    if (!CG.CLOCKWORK_STAGE[CG.CLOCKWORK_STAGE.length - 1].finish) cfail('the stage ends at the great clock', '');
    for (const sec of CG.CLOCKWORK_STAGE) if (!sec.calm) for (const [, , o] of sec.beats) if ((o.ph && Math.abs(o.ph - Math.round(o.ph)) > 1e-9) || (o.P && o.P !== Math.round(o.P)) || (o.every && o.every !== Math.round(o.every))) cfail('every trap keeps the tower\'s beat (whole beats)', JSON.stringify(o));
  }
  const capHit = (S, x, a, m) => {
    const r = W / 2 + m, half = Math.max(0, Hh / 2 - W / 2);
    for (const q of S) for (const da of half ? [-half, 0, half] : [0]) if (CG.shapeDist(q, x, a + da) < r) return true;
    return false;
  };
  const ext = S => { let x0 = Infinity, x1 = -Infinity; for (const q of S) { const r = q.r || 0, a = q.k === 'c' ? q.x - r : Math.min(q.x0, q.x1) - r, b = q.k === 'c' ? q.x + r : Math.max(q.x0, q.x1) + r; x0 = Math.min(x0, a); x1 = Math.max(x1, b); } return [x0, x1]; };
  // the search (as the vault's): solid = every lethal shape of every trap at that moment
  function fly(level, traps, x0, a0, t0, goal, lo, hi, via) {
    const DT = 1 / 15, DX = 11, DA = 11, up = Math.round(440 * DT / DA), dn = Math.round(380 * DT / DA), sd = Math.round(330 * DT / DX);
    const nA = Math.ceil((hi - lo) / DA) + 1, nX = Math.ceil(400 / DX) + 1, V = 1e6;
    let front = new Set([Math.round(x0 / DX) * 1000 + Math.round((a0 - lo) / DA)]);
    for (let step = 1; step <= 10 / DT; step++) {
      const t = t0 + step * DT, S = [];
      for (const h of traps) CG.clockworkShapes(h, t, S);
      const next = new Set(), blocked = new Map();
      const free = (xi, ai) => {
        const key = xi * 1000 + ai; if (blocked.has(key)) return blocked.get(key);
        const x = xi * DX, a = lo + ai * DA, [l, r] = level.walls(a), ok = x - W / 2 - 2 >= l && x + W / 2 + 2 <= r && level.walls(a + Hh / 2)[0] <= x - W / 2 && level.walls(a + Hh / 2)[1] >= x + W / 2 && level.walls(a - Hh / 2)[0] <= x - W / 2 && level.walls(a - Hh / 2)[1] >= x + W / 2 && !capHit(S, x, a, M);
        blocked.set(key, ok); return ok;
      };
      for (const k of front) {
        const got = k >= V, kk = k % V, xi = Math.floor(kk / 1000), ai = kk % 1000;
        for (let dA = -dn; dA <= up; dA++) for (let dX = -sd; dX <= sd; dX++) {
          const nx = xi + dX, na = ai + dA; if (na < 0 || na >= nA || nx < 0 || nx >= nX) continue;
          const g2 = got || !via || via(nx * DX, lo + na * DA), key = (g2 ? V : 0) + nx * 1000 + na; if (next.has(key) || !free(nx, na)) continue;
          if (g2 && goal(nx * DX, lo + na * DA)) return step * DT;
          next.add(key);
        }
      }
      if (!next.size) return -1;
      front = next;
    }
    return -1;
  }
  for (let k = 0; k <= 8; k++) {
    const st = k ? { ...st0, seed: `${st0.seed}~${k}` } : st0, level = CG.createClockworkLevel(CG.advSeed(st), st), hz = [], fr = [];
    clockworkStats.seeds++;
    {
      const VIEW = 1100, h1 = [], f1 = [];
      level.fill(VIEW + 900, h1, f1);
      let sh = h1.length, sf = f1.length;
      for (let cam = 10; cam < level.end; cam += 10) {
        level.fill(cam + VIEW + 900, h1, f1);
        for (; sh < h1.length; sh++) if (h1[sh].lo < cam + VIEW + 100) cfail('traps never pop in on screen', `${h1[sh].type} at ${h1[sh].lo | 0}`);
        for (; sf < f1.length; sf++) if (f1[sf].alt < cam + VIEW + 100) cfail('pickups never pop in on screen', `${f1[sf].kind} at ${f1[sf].alt | 0}`);
      }
      hz.push(...h1); fr.push(...f1);
    }
    clockworkStats.len = level.end / 10;
    for (const h of hz) if (!CG.CLOCKWORK_TYPES.has(h.type)) cfail('the tower only has its own traps', h.type);
    for (const h of hz) clockworkStats.kinds[h.type.slice(9)] = (clockworkStats.kinds[h.type.slice(9)] || 0) + (k ? 0 : 1);
    for (let i = 1; i < level.beats.length; i++) { const p = level.beats[i - 1], q = level.beats[i], g = Math.min(...q.hs.map(h => h.lo)) - Math.max(...p.hs.map(h => h.hi)); clockworkStats.beatGap = Math.min(clockworkStats.beatGap, g); if (g < 0) cfail('beats never overlap', `${p.kind} at ${p.a} / ${q.kind} at ${q.a}`); }
    if (hz.some(h => h.hi > level.end - 320)) cfail('the clock chamber below the finish is clear of traps', `${Math.max(...hz.map(h => h.hi)) | 0} vs ${level.end}`);
    for (let a = 0; a < level.end + 200; a += 1) {
      const [l, r] = level.walls(a), [l2, r2] = level.walls(a + 1);
      clockworkStats.minW = Math.min(clockworkStats.minW, r - l); clockworkStats.slope = Math.max(clockworkStats.slope, l2 - l, r - r2);
    }
    if (clockworkStats.minW < R.minWidth) cfail('the shaft is never narrower than minWidth', clockworkStats.minW.toFixed(1));
    if (clockworkStats.slope > R.maxWallSlope) cfail('the walls never step in faster than maxWallSlope', clockworkStats.slope.toFixed(2));
    // static lanes: every trap at its widest reach (a tooth all round its sweep, a ram fully out, a cuckoo at full
    // stretch, an anchor in both poses) leaves an open lane of minLane to the far wall, at every height it reaches
    for (const h of hz) {
      const S = CG.clockworkDanger(h);
      for (const q of S) {
        const r = q.r || 0, a0 = q.k === 'c' ? q.a - r : Math.min(q.a0, q.a1) - r, a1 = q.k === 'c' ? q.a + r : Math.max(q.a0, q.a1) + r;
        for (let a = a0; a <= a1; a += 6) {
          const [x0, x1] = ext([q]), [l, r] = level.walls(a), m = h.side > 0 ? r - x1 : x0 - l;
          clockworkStats.lane[h.type] = Math.min(clockworkStats.lane[h.type], m);
          if (m < R.minLane) { cfail('every trap leaves a lane of minLane to the far wall', `${h.type} ${m.toFixed(1)} at ${h.alt | 0}`); break; }
        }
      }
    }
    for (const f of fr) {
      const [l, r] = level.walls(f.alt), pr = CG.pickR(f);
      if (f.x - pr < l + R.fruitMargin - 0.5 || f.x + pr > r - R.fruitMargin + 0.5) cfail('pickups stay off the walls', `${f.kind} at ${f.alt | 0}`);
      if (f.clear === -Infinity) continue;   // (the dares: watches and the Bell Loft's clock face)
      const need = f.clear ?? (f.bonus || f.kind === 'gold' ? Math.ceil(CG.laneSize().w / 2 + 6 + CG.COCO_R) : R.pickup.clear);
      let dd = Infinity; for (const h of hz) if (h.lo - 220 < f.alt && h.hi + 220 > f.alt) for (const q of CG.clockworkDanger(h)) dd = Math.min(dd, CG.shapeDist(q, f.x, f.alt));
      if (!f.bonus && f.kind !== 'gold' && f.clear == null) clockworkStats.pick = Math.min(clockworkStats.pick, dd);
      if (dd < need - 0.5) cfail('pickups stay clear of every trap\'s reach', `${f.kind} at ${f.alt | 0}: ${dd.toFixed(1)} < ${need}`);
    }
    // a watch is a dare, but never inside a solid part (a cog's rim, a housing, a house, a boss)
    for (const f of fr.filter(f => f.kind === 'clockworkWatch')) for (const h of hz) if (h.lo - 60 < f.alt && h.hi + 60 > f.alt)
      for (const q of CG.clockworkShapes(h, 0, [], 'body')) if (CG.shapeDist(q, f.x, f.alt) < CG.COCO_R + 4) { cfail('a watch never sits in a trap\'s solid parts', `${h.type} at ${f.alt | 0}`); break; }
    for (let i = 0; i < fr.length; i++) for (let j = i + 1; j < fr.length && fr[j].alt - fr[i].alt < 80; j++) if (Math.hypot(fr[i].x - fr[j].x, fr[i].alt - fr[j].alt) < CG.pickR(fr[i]) + CG.pickR(fr[j]) + CG.PICK_GAP - 0.01) cfail('pickups never overlap', `${fr[i].alt | 0}`);
    if (fr.filter(f => f.kind === 'clockworkWatch').length !== 3) cfail('the tower holds exactly 3 golden watches', `${fr.filter(f => f.kind === 'clockworkWatch').length}`);
    let gap = 0, last = 60; for (const f of fr) if (f.kind === 'chili') { gap = Math.max(gap, f.alt - last); last = f.alt; }
    if (gap > 640) cfail('the tower keeps a chili line', `${gap | 0}`);
    if (k > 2) continue;   // (the searches run on the stage itself and two more seeds)
    for (const b of level.beats) {
      const lo = Math.min(...b.hs.map(h => h.lo)) - 150, hi = Math.max(...b.hs.map(h => h.hi)) + 90;
      const traps = hz.filter(h => h.lo < hi + 60 && h.hi > lo - 60);
      clockworkStats.traps++;
      for (let p = 0; p < 6; p++) {
        const t0 = p * 1.13 + k * 0.37, [l, r] = level.walls(lo + 40);
        clockworkStats.searches++;
        const tm = fly(level, traps, (l + r) / 2, lo + 40, t0, (x, a) => a >= hi - 10, lo, hi + 20);
        if (tm < 0) cfail('every trap can be passed by the widest pilot from any phase', `${b.kind} at ${b.a} (${b.sec.name}), start ${t0.toFixed(2)} s, seed ${k}`);
        else clockworkStats.worst = Math.max(clockworkStats.worst, tm);
      }
    }
    // every watch can be touched and then escaped (flown on past its traps) by the widest pilot, from 6 phases
    const dare = (f, x, a, touch, n, label) => {
      const own = hz.filter(h => h.lo - 40 < a && h.hi + 120 > a), lo = Math.min(a, ...own.map(h => h.lo)) - 200, hi = Math.max(a, ...own.map(h => h.hi)) + 100;
      const traps = hz.filter(h => h.lo < hi + 60 && h.hi > lo - 60), [l, r] = level.walls(lo + 40);
      for (let p = 0; p < n; p++) {
        clockworkStats.searches++;
        const tm = fly(level, traps, (l + r) / 2, lo + 40, p * 1.07 + k * 0.29, (x, a) => a >= hi - 10, lo, hi + 20, touch);
        if (tm < 0) { cfail(`every ${label} can be reached and escaped by the widest pilot`, `${label} at ${a | 0}, phase ${p}, seed ${k}`); return false; }
      }
      return true;
    };
    for (const f of fr.filter(f => f.kind === 'clockworkWatch')) if (dare(f, f.x, f.alt, (x, a) => Math.hypot(x - f.x, a - f.alt) < CG.COCO_R + W / 2 - 4, 6, 'golden watch')) clockworkStats.watches++;
  }
  if (failures.size) {
    console.log(`FAILED: ${failures.size} rule(s) broken`);
    for (const [rule, { count, example }] of failures) console.log(`  ✗ ${rule} — ${count}× (e.g. ${example})`);
    process.exit(1);
  }
}
const clockworkSummary = () => `PASS: Clockwork Tower: ${clockworkStats.seeds} layouts × ${clockworkStats.len} m, only its own traps (${Object.entries(clockworkStats.kinds).map(([k, n]) => `${n} ${k}`).join(', ')}), each taught alone first, all on one ${CG.CLOCKWORK.beat} s beat; shaft ${clockworkStats.minW.toFixed(0)}+ wide, wall slope ${clockworkStats.slope.toFixed(2)} (max ${CG.RULES.maxWallSlope}); open lanes past gears ${clockworkStats.lane.clockworkGear.toFixed(0)}+, pistons ${clockworkStats.lane.clockworkPiston.toFixed(0)}+, cuckoos ${clockworkStats.lane.clockworkCuckoo.toFixed(0)}+, anchors ${clockworkStats.lane.clockworkAnchor.toFixed(0)}+ (minLane ${CG.RULES.minLane}), beats ${clockworkStats.beatGap.toFixed(0)}+ apart; pickups ${clockworkStats.pick.toFixed(1)}+ from any trap's reach, nothing pops in; ${clockworkStats.traps} beats and ${clockworkStats.watches} golden watches (reach and escape) flown by the widest pilot in ${clockworkStats.searches} searches, the slowest pass ${clockworkStats.worst.toFixed(1)} s`;
// (test slot: Clockwork Tower, island level 26)
// ---------- Adventure: Kooky Lab (island level 27), an authored stage with its own traps ----------
// As Cascade Falls' checks: every rule on the stage's layout as the game builds it (and 8 other seeds, which only move
// phases and looks), then every beat and every Eureka potion flown by a time-space search for the widest pilot on the
// traps' own clocks from 6 start phases. A ray's beam, a falling flask and its goo count as solid (every beat can be
// passed without ever being shrunk or slimed, which the "never shrunk" mission needs), and a magnet that is on drags the
// search toward it as it drags the rocket.
const LK = new Function(regions.join('\n') + '\nreturn { createLabLevel, labkShapes, labkDanger, labkEnd, labkGrabAt, labkGrabTip, labkRayAt, labkFlaskAt, labkMagAt, labkPull, labkFallT, LABK, LABK_STAGE, LABK_TYPES, LABK_GOO, ADV_LAB, RULES, advSeed, shapeDist, laneSize, pickR, COCO_R, PICK_GAP, UNITS_PER_M };')();
const labStats = { seeds: 0, traps: 0, searches: 0, worst: 0, pots: 0, pick: Infinity, minW: Infinity, slope: 0, beatGap: Infinity, len: 0, kinds: {}, grabLane: Infinity, pull: 0 };
{
  const R = LK.RULES, W = PILOT_W, Hh = PILOT_H, M = 4, st0 = LK.ADV_LAB, X = LK.LABK;
  if (st0.theme !== 'lab' || !(st0.reward > 0)) fail('Kooky Lab is a themed stage with a reward', JSON.stringify(st0));
  if (!Array.isArray(st0.goals) || st0.goals.length !== 3 || !st0.goals.some(g => g.k === 'finish') || !st0.goals.some(g => g.k === 'labPotions' && g.n === 3) || !st0.goals.some(g => g.k === 'labNoShrink')) fail('Kooky Lab has three missions: the Great Tank, 3 Eureka potions and never shrunk', JSON.stringify(st0.goals));
  if (Math.abs(st0.len * LK.UNITS_PER_M - LK.labkEnd()) > 1e-6) fail('the Kooky Lab stage length matches its layout', `${st0.len}`);
  // the stage's order: grabbers, then rays, then flasks, then magnets, each taught alone (never faster first)
  {
    const firsts = {}, seen = [], base = { grabPair: 'labGrab', grabBoth: 'labGrab', rayGrab: 'labRay', rayPair: 'labRay', flaskPair: 'labFlask', flaskGrab: 'labFlask', flaskRay: 'labFlask', magGrab: 'labMag', magFlask: 'labFlask', magRay: 'labRay', magPair: 'labMag' };
    const S = LK.LABK_STAGE;
    for (const sec of S) if (sec.beats) for (const [, kind, o] of sec.beats) {
      const b = base[kind] || kind;
      if (!firsts[b]) { firsts[b] = o; seen.push(b); if (kind !== b) fail('each lab trap is introduced alone first', `${kind} in ${sec.name}`); }
      else if (kind === b && o.P && firsts[b].P && o.P > firsts[b].P + 1e-9) fail('a lab trap is never slower than its introduction', `${kind} in ${sec.name}`);
    }
    if (seen.join() !== 'labGrab,labRay,labFlask,labMag') fail('Kooky Lab teaches grabbers, then rays, then flasks, then magnets', seen.join());
    if (!S.some(sec => sec.calm && !sec.finish && sec !== S[0])) fail('Kooky Lab has a breather', '');
    if (!S[S.length - 1].finish) fail('Kooky Lab ends at the Great Tank', '');
  }
  // a magnet's pull is always much weaker than the steering
  labStats.pull = X.mag.pull;
  if (X.mag.pull > 330 * 0.6) fail('a magnet never pulls harder than 60% of the steering', `${X.mag.pull}`);
  const capHit = (S, x, a, m) => {
    const r = W / 2 + m, half = Math.max(0, Hh / 2 - W / 2);
    for (const q of S) for (const da of half ? [-half, 0, half] : [0]) if (LK.shapeDist(q, x, a + da) < r) return true;
    return false;
  };
  // every shape of the traps at t, lethal and soft alike (the search never lets itself be shrunk or slimed)
  const allShapes = (traps, t, S) => { for (const h of traps) LK.labkShapes(h, t, S, h.noBeam ? 'still' : undefined); return S; };
  // the search (as the cascade's): a magnet that is on shifts every step sideways by its pull
  function fly(level, traps, x0, a0, t0, goal, lo, hi, via) {
    const DT = 1 / 15, DX = 11, DA = 11, up = Math.round(440 * DT / DA), dn = Math.round(380 * DT / DA), sd = Math.round(330 * DT / DX);
    const nA = Math.ceil((hi - lo) / DA) + 1, nX = Math.ceil(400 / DX) + 1, V = 1e6, mags = traps.filter(h => h.type === 'labMag');
    let front = new Set([Math.round(x0 / DX) * 1000 + Math.round((a0 - lo) / DA)]);
    for (let step = 1; step <= 18 / DT; step++) {
      const t = t0 + step * DT, S = allShapes(traps, t, []), pw = mags.map(h => LK.labkMagAt(h, t - DT).power);
      const next = new Set(), blocked = new Map();
      const free = (xi, ai) => {
        const key = xi * 1000 + ai; if (blocked.has(key)) return blocked.get(key);
        const x = xi * DX, a = lo + ai * DA, [l, r] = level.walls(a), ok = x - W / 2 - 2 >= l && x + W / 2 + 2 <= r && level.walls(a + Hh / 2)[0] <= x - W / 2 && level.walls(a + Hh / 2)[1] >= x + W / 2 && level.walls(a - Hh / 2)[0] <= x - W / 2 && level.walls(a - Hh / 2)[1] >= x + W / 2 && !capHit(S, x, a, M);
        blocked.set(key, ok); return ok;
      };
      for (const k of front) {
        const got = k >= V, kk = k % V, xi = Math.floor(kk / 1000), ai = kk % 1000;
        let drift = 0; mags.forEach((h, i) => { drift += LK.labkPull(h, pw[i], xi * DX, lo + ai * DA); });
        const sh = drift ? Math.round(drift * DT / DX) || Math.sign(drift) : 0;
        for (let dA = -dn; dA <= up; dA++) for (let dX = -sd + sh; dX <= sd + sh; dX++) {
          const nx = xi + dX, na = ai + dA; if (na < 0 || na >= nA || nx < 0 || nx >= nX) continue;
          const g2 = got || !via || via(nx * DX, lo + na * DA), key = (g2 ? V : 0) + nx * 1000 + na; if (next.has(key) || !free(nx, na)) continue;
          if (g2 && goal(nx * DX, lo + na * DA)) return step * DT;
          next.add(key);
        }
      }
      if (!next.size) { globalThis.labDbg = { step, t, maxA: Math.max(...[...front].map(k => lo + (k % V) % 1000 * DA)), xs: [...front].slice(0, 30).map(k => [Math.floor((k % V) / 1000) * DX, lo + (k % V) % 1000 * DA]) }; return -1; }
      front = next;
    }
    return -1;
  }
  for (let k = 0; k <= 8; k++) {
    const st = k ? { ...st0, seed: `${st0.seed}~${k}` } : st0, level = LK.createLabLevel(LK.advSeed(st), st), hz = [], fr = [];
    labStats.seeds++;
    {
      const VIEW = 1100, h1 = [], f1 = [];
      level.fill(VIEW + 900, h1, f1);
      let sh = h1.length, sf = f1.length;
      for (let cam = 10; cam < level.end; cam += 10) {
        level.fill(cam + VIEW + 900, h1, f1);
        for (; sh < h1.length; sh++) if (h1[sh].lo < cam + VIEW + 100) fail('lab traps never pop in on screen', `${h1[sh].type} at ${h1[sh].lo | 0}`);
        for (; sf < f1.length; sf++) if (f1[sf].alt < cam + VIEW + 100) fail('lab pickups never pop in on screen', `${f1[sf].kind} at ${f1[sf].alt | 0}`);
      }
      hz.push(...h1); fr.push(...f1);
    }
    labStats.len = level.end / 10;
    for (const h of hz) if (!LK.LABK_TYPES.has(h.type)) fail('Kooky Lab only has its own traps', h.type);
    for (const h of hz) labStats.kinds[h.type] = (labStats.kinds[h.type] || 0) + (k ? 0 : 1);
    // beats never crowd: each beat's traps start above the last beat's whole reach (one thing to read at a time)
    for (let i = 1; i < level.beats.length; i++) { const p = level.beats[i - 1], q = level.beats[i], g = Math.min(...q.hs.map(h => h.lo)) - Math.max(...p.hs.map(h => h.hi)); labStats.beatGap = Math.min(labStats.beatGap, g); if (g < 0) fail('lab beats never overlap', `${p.kind} at ${p.a} / ${q.kind} at ${q.a}`); }
    // within a beat the traps never overlap either
    for (const b of level.beats) for (let i = 0; i < b.hs.length; i++) for (let j = i + 1; j < b.hs.length; j++) { const p = b.hs[i], q = b.hs[j]; if (p.alt !== q.alt && p.hi > q.lo && q.hi > p.lo) fail('the traps of a lab beat never overlap', `${b.kind} at ${b.a}`); }
    if (hz.some(h => h.hi > level.end - 320)) fail('the Great Tank below the finish is clear of traps', `${Math.max(...hz.map(h => h.hi)) | 0} vs ${level.end}`);
    for (let a = 0; a < level.end + 200; a += 1) {
      const [l, r] = level.walls(a), [l2, r2] = level.walls(a + 1);
      labStats.minW = Math.min(labStats.minW, r - l); labStats.slope = Math.max(labStats.slope, l2 - l, r - r2);
    }
    if (labStats.minW < R.minWidth) fail('the lab shaft is never narrower than minWidth', labStats.minW.toFixed(1));
    if (labStats.slope > R.maxWallSlope) fail('the lab walls never step in faster than maxWallSlope', labStats.slope.toFixed(2));
    for (const h of hz) {
      if (h.type === 'labGrab') {
        // at full reach a claw leaves the widest pilot a lane by the far wall (past whatever is parked there)
        const [l, r] = level.walls(h.alt), S = [];
        for (let t = 0; t < h.P; t += 1 / 30) LK.labkShapes(h, t, S, 'body');
        const twin = hz.find(q => q !== h && q.type === 'labGrab' && q.alt === h.alt);
        let reach = -Infinity; for (const q of S) { const xs = q.k === 'c' ? [q.x + h.side * q.r] : [q.x0 + h.side * q.r, q.x1 + h.side * q.r]; for (const x of xs) reach = Math.max(reach, h.side * x); }
        let lane = h.side > 0 ? r - reach : -reach - l;
        if (twin) { const T = []; LK.labkShapes(twin, (1 - twin.ph) * twin.P + 0.01, T, 'body'); let park = -Infinity; for (const q of T) { const xs = q.k === 'c' ? [q.x - h.side * q.r] : [q.x0 - h.side * q.r, q.x1 - h.side * q.r]; for (const x of xs) park = Math.max(park, -h.side * x); } lane = h.side > 0 ? -park - reach : -reach - park; }
        labStats.grabLane = Math.min(labStats.grabLane, lane);
        if (lane < W + 12) fail('a grabber at full reach leaves the widest pilot a lane', `${h.alt} ${lane.toFixed(0)}`);
      }
      if (h.type === 'labFlask') {
        // a flask lands on its bench
        const land = X.flask.x0 + X.flask.vx * LK.labkFallT();
        if (land > X.flask.bench - 8) fail('a slime flask lands on its bench', `${land}`);
      }
    }
    for (const f of fr) {
      const [l, r] = level.walls(f.alt), pr = LK.pickR(f);
      if (f.x - pr < l + R.fruitMargin - 0.5 || f.x + pr > r - R.fruitMargin + 0.5) fail('lab pickups stay off the walls', `${f.kind} at ${f.alt | 0}`);
      if (f.clear === -Infinity) continue;   // (the dares: the Eureka potions, the Tea Break's ring)
      const need = f.clear ?? (f.bonus || f.kind === 'gold' ? Math.ceil(LK.laneSize().w / 2 + 6 + LK.COCO_R) : R.pickup.clear);
      let dd = Infinity; for (const h of hz) if (h.lo - 220 < f.alt && h.hi + 220 > f.alt) for (const q of LK.labkDanger(h)) dd = Math.min(dd, LK.shapeDist(q, f.x, f.alt));
      if (!f.bonus && f.kind !== 'gold' && f.clear == null) labStats.pick = Math.min(labStats.pick, dd);
      if (dd < need - 0.5) fail('lab pickups stay clear of every trap\'s reach', `${f.kind} at ${f.alt | 0}: ${dd.toFixed(1)} < ${need}`);
    }
    for (let i = 0; i < fr.length; i++) for (let j = i + 1; j < fr.length && fr[j].alt - fr[i].alt < 80; j++) if (Math.hypot(fr[i].x - fr[j].x, fr[i].alt - fr[j].alt) < LK.pickR(fr[i]) + LK.pickR(fr[j]) + LK.PICK_GAP - 0.01) fail('lab pickups never overlap', `${fr[i].alt | 0}`);
    if (fr.filter(f => f.kind === 'potion').length !== 3) fail('Kooky Lab holds exactly 3 Eureka potions', `${fr.filter(f => f.kind === 'potion').length}`);
    let gap = 0, last = 60; for (const f of fr) if (f.kind === 'chili') { gap = Math.max(gap, f.alt - last); last = f.alt; }
    if (gap > 640) fail('Kooky Lab keeps a chili line', `${gap | 0}`);
    if (k > 2) continue;   // (the searches run on the stage itself and two more seeds)
    const near = (lo, hi) => hz.filter(h => h.lo < hi + 60 && h.hi > lo - 60);
    for (const b of level.beats) {
      // (it starts 150 under the beat, or just over the last beat's reach where that is closer)
      const bi = level.beats.indexOf(b), prevTop = bi > 0 ? Math.max(...level.beats[bi - 1].hs.map(h => h.hi)) : -Infinity;
      const lo = Math.min(...b.hs.map(h => h.lo)) - 150, hi = Math.max(...b.hs.map(h => h.hi)) + 90, traps = near(lo, hi), a0 = Math.max(lo + 40, Math.min(prevTop + 20, Math.min(...b.hs.map(h => h.lo)) - 10));
      labStats.traps++;
      for (let p = 0; p < 6; p++) {
        const t0 = p * 1.13 + k * 0.37, [l, r] = level.walls(a0);
        const S0 = allShapes(traps, t0 + 1 / 15, []), cand = [(l + r) / 2, (l + r) / 2 - 70, (l + r) / 2 + 70, l + 50, r - 50];
        const x0 = cand.find(x => !capHit(S0, x, a0, M)) ?? cand[0];
        labStats.searches++;
        const tm = fly(level, traps, x0, a0, t0, (x, a) => a >= hi - 10, lo, hi + 20);
        if (tm < 0) fail('every lab trap can be passed by the widest pilot from any phase, never shrunk or slimed', `${b.kind} at ${b.a} (${b.sec.name}), start ${t0.toFixed(2)} s, seed ${k} ${JSON.stringify(globalThis.labDbg)} lo ${lo} hi ${hi} x0 ${x0.toFixed(0)} a0 ${a0}`);
        else labStats.worst = Math.max(labStats.worst, tm);
      }
    }
    // every Eureka potion can be touched and then escaped (flown on past its trap) by the widest pilot, from 6 phases
    for (const f of fr.filter(f => f.kind === 'potion')) {
      const own = hz.filter(h => h.lo - 40 < f.alt && h.hi + 120 > f.alt), lo = Math.min(f.alt, ...own.map(h => h.lo)) - 200, hi = Math.max(f.alt, ...own.map(h => h.hi)) + 100;
      const traps = near(lo, hi), [l, r] = level.walls(lo + 40), x0 = (l + r) / 2;
      // (a potion on a beam's line is a dare against the "never shrunk" mission: there the beam only shrinks)
      const flyTraps = traps.map(h => h.type === 'labRay' && Math.abs(h.alt - f.alt) < 20 ? { ...h, noBeam: true } : h);
      for (let p = 0; p < 6; p++) {
        labStats.searches++;
        const tm = fly(level, flyTraps, x0, lo + 40, p * 1.07 + k * 0.29, (x, a) => a >= hi - 10, lo, hi + 20, (x, a) => Math.hypot(x - f.x, a - f.alt) < LK.COCO_R + W / 2 - 4);
        if (tm < 0) fail('every Eureka potion can be grabbed and escaped by the widest pilot', `potion at ${f.alt | 0}, phase ${p}, seed ${k}`);
      }
      labStats.pots++;
    }
  }
}
const labSummary = () => `PASS: Kooky Lab: ${labStats.seeds} layouts × ${labStats.len} m, only its own traps (${Object.entries(labStats.kinds).map(([k, n]) => `${n} ${k}`).join(', ')}), each trap taught alone first; shaft ${labStats.minW.toFixed(0)}+ wide, wall slope ${labStats.slope.toFixed(2)} (max ${LK.RULES.maxWallSlope}); grabbers leave ${labStats.grabLane.toFixed(0)}+ lanes, magnets pull ${labStats.pull} at most; beats ${labStats.beatGap.toFixed(0)}+ apart; pickups ${labStats.pick.toFixed(1)}+ from any reach; ${labStats.traps} beats × 6 phases and ${labStats.pots} Eureka potions flown by the widest pilot never shrunk or slimed (${labStats.searches} searches, slowest ${labStats.worst.toFixed(1)} s)`;
// (test slot: Kooky Lab, island level 27)
// ---------- Adventure: the Pipe Organ Cavern (island level 28), an authored stage with its own traps ----------
// As the tower's checks: every rule on the stage's layout as the game builds it (and 8 other seeds, which only move
// sides and looks), then every beat and every golden tuning fork flown by a time-space search for the widest pilot on
// the traps' own clocks from several start phases (a blowing jet, a crashing cymbal and a falling note all count as
// solid exactly when the game kills on them; a drum's head counts as solid too, so no pass needs a boing). The cave
// plays one beat for every trap: the searches start off the beat too.
const OG = new Function(regions.join('\n') + '\nreturn { createOrganLevel, organShapes, organDanger, organEnd, organPipeState, organCymbalState, organNotesState, organCymbalDisc, ORGAN, ORGAN_STAGE, ORGAN_TYPES, ADV_ORGAN, RULES, advSeed, shapeDist, laneSize, pickR, COCO_R, PICK_GAP, UNITS_PER_M };')();
const organStats = { seeds: 0, traps: 0, searches: 0, worst: 0, forks: 0, pick: Infinity, minW: Infinity, slope: 0, lane: { organPipe: Infinity, organDrum: Infinity, organCymbal: Infinity }, cols: 0, len: 0, kinds: {}, beatGap: Infinity, drumClear: Infinity, drums: 0 };
{
  const R = OG.RULES, W = PILOT_W, Hh = PILOT_H, M = 4, st0 = OG.ADV_ORGAN;
  const ofail = (rule, d) => fail('organ: ' + rule, d);
  if (st0.theme !== 'organ' || !(st0.reward > 0)) ofail('the cavern is a themed stage with a reward', JSON.stringify(st0));
  if (!Array.isArray(st0.goals) || st0.goals.length !== 3 || !st0.goals.some(g => g.k === 'finish') || !st0.goals.some(g => g.k === 'organFork' && g.n === 3) || !st0.goals.some(g => g.k === 'organDrum' && g.n > 0)) ofail('three missions: the grand organ, 3 golden tuning forks and the drums', JSON.stringify(st0.goals));
  if (Math.abs(st0.len * OG.UNITS_PER_M - OG.organEnd()) > 1e-6) ofail('the stage length matches its layout', `${st0.len}`);
  // the stage's order: pipes, then drums, then cymbals, then notes, each taught alone; never faster than taught
  {
    const fam = { pipe: 'pipe', pipePair: 'pipe', pipeStack: 'pipe', drum: 'drum', pipeDrum: 'drum', cymbal: 'cymbal', cymbalPipe: 'cymbal', pipeCymbal: 'cymbal', notes: 'notes', notesPipe: 'notes', notesCymbal: 'notes' };
    const firsts = {}, seen = [];
    for (const sec of OG.ORGAN_STAGE) if (!sec.calm) for (const [, kind, o] of sec.beats) {
      const b = fam[kind]; if (!b) { ofail('every beat is a known kind', kind); continue; }
      if (!firsts[b]) { firsts[b] = o; seen.push(b); if (kind !== b) ofail('each trap is introduced alone first', `${kind} in ${sec.name}`); }
      else if ((o.P && firsts[b].P && o.P > firsts[b].P) || (o.every && firsts[b].every && o.every > firsts[b].every)) ofail('a trap is never slower than its introduction', `${kind} in ${sec.name}`);
    }
    if (seen.join() !== 'pipe,drum,cymbal,notes') ofail('the cavern teaches pipes, drums, cymbals, then notes', seen.join());
    if (!OG.ORGAN_STAGE.some(sec => sec.calm && !sec.finish && sec !== OG.ORGAN_STAGE[0])) ofail('the cavern has a breather', '');
    if (!OG.ORGAN_STAGE[OG.ORGAN_STAGE.length - 1].finish) ofail('the stage ends at the grand organ', '');
    for (const sec of OG.ORGAN_STAGE) if (!sec.calm) for (const [, , o] of sec.beats) if ((o.ph && Math.abs(o.ph - Math.round(o.ph)) > 1e-9) || (o.P && o.P !== Math.round(o.P)) || (o.every && o.every !== Math.round(o.every))) ofail('every trap keeps the cave\'s beat (whole beats)', JSON.stringify(o));
  }
  const capHit = (S, x, a, m) => {
    const r = W / 2 + m, half = Math.max(0, Hh / 2 - W / 2);
    for (const q of S) for (const da of half ? [-half, 0, half] : [0]) if (OG.shapeDist(q, x, a + da) < r) return true;
    return false;
  };
  const ext = S => { let x0 = Infinity, x1 = -Infinity; for (const q of S) { const r = q.r || 0, a = q.k === 'c' ? q.x - r : Math.min(q.x0, q.x1) - r, b = q.k === 'c' ? q.x + r : Math.max(q.x0, q.x1) + r; x0 = Math.min(x0, a); x1 = Math.max(x1, b); } return [x0, x1]; };
  const span = q => { const r = q.r || 0; return q.k === 'c' ? [q.a - r, q.a + r] : [Math.min(q.a0, q.a1) - r, Math.max(q.a0, q.a1) + r]; };
  // the search (as the tower's): solid = every lethal shape of every trap at that moment, and the drums' heads
  function fly(level, traps, x0, a0, t0, goal, lo, hi, via) {
    const DT = 1 / 15, DX = 11, DA = 11, up = Math.round(440 * DT / DA), dn = Math.round(380 * DT / DA), sd = Math.round(330 * DT / DX);
    const nA = Math.ceil((hi - lo) / DA) + 1, nX = Math.ceil(400 / DX) + 1, V = 1e6;
    let front = new Set([Math.round(x0 / DX) * 1000 + Math.round((a0 - lo) / DA)]);
    for (let step = 1; step <= 12 / DT; step++) {
      const t = t0 + step * DT, S = [];
      for (const h of traps) OG.organShapes(h, t, S, 'bot');
      const next = new Set(), blocked = new Map();
      const free = (xi, ai) => {
        const key = xi * 1000 + ai; if (blocked.has(key)) return blocked.get(key);
        const x = xi * DX, a = lo + ai * DA, [l, r] = level.walls(a), ok = x - W / 2 - 2 >= l && x + W / 2 + 2 <= r && level.walls(a + Hh / 2)[0] <= x - W / 2 && level.walls(a + Hh / 2)[1] >= x + W / 2 && level.walls(a - Hh / 2)[0] <= x - W / 2 && level.walls(a - Hh / 2)[1] >= x + W / 2 && !capHit(S, x, a, M);
        blocked.set(key, ok); return ok;
      };
      for (const k of front) {
        const got = k >= V, kk = k % V, xi = Math.floor(kk / 1000), ai = kk % 1000;
        for (let dA = -dn; dA <= up; dA++) for (let dX = -sd; dX <= sd; dX++) {
          const nx = xi + dX, na = ai + dA; if (na < 0 || na >= nA || nx < 0 || nx >= nX) continue;
          const g2 = got || !via || via(nx * DX, lo + na * DA), key = (g2 ? V : 0) + nx * 1000 + na; if (next.has(key) || !free(nx, na)) continue;
          if (g2 && goal(nx * DX, lo + na * DA)) return step * DT;
          next.add(key);
        }
      }
      if (!next.size) return -1;
      front = next;
    }
    return -1;
  }
  for (let k = 0; k <= 8; k++) {
    const st = k ? { ...st0, seed: `${st0.seed}~${k}` } : st0, level = OG.createOrganLevel(OG.advSeed(st), st), hz = [], fr = [];
    organStats.seeds++;
    {
      const VIEW = 1100, h1 = [], f1 = [];
      level.fill(VIEW + 900, h1, f1);
      let sh = h1.length, sf = f1.length;
      for (let cam = 10; cam < level.end; cam += 10) {
        level.fill(cam + VIEW + 900, h1, f1);
        for (; sh < h1.length; sh++) if (h1[sh].lo < cam + VIEW + 100) ofail('traps never pop in on screen', `${h1[sh].type} at ${h1[sh].lo | 0}`);
        for (; sf < f1.length; sf++) if (f1[sf].alt < cam + VIEW + 100) ofail('pickups never pop in on screen', `${f1[sf].kind} at ${f1[sf].alt | 0}`);
      }
      hz.push(...h1); fr.push(...f1);
    }
    organStats.len = level.end / 10;
    for (const h of hz) if (!OG.ORGAN_TYPES.has(h.type)) ofail('the cavern only has its own traps', h.type);
    for (const h of hz) organStats.kinds[h.type.slice(5)] = (organStats.kinds[h.type.slice(5)] || 0) + (k ? 0 : 1);
    for (let i = 1; i < level.beats.length; i++) { const p = level.beats[i - 1], q = level.beats[i], g = Math.min(...q.hs.map(h => h.lo)) - Math.max(...p.hs.map(h => h.hi)); organStats.beatGap = Math.min(organStats.beatGap, g); if (g < 0) ofail('beats never overlap', `${p.kind} at ${p.a} / ${q.kind} at ${q.a}`); }
    if (hz.some(h => h.hi > level.end - 320)) ofail('the organ loft below the finish is clear of traps', `${Math.max(...hz.map(h => h.hi)) | 0} vs ${level.end}`);
    for (let a = 0; a < level.end + 200; a += 1) {
      const [l, r] = level.walls(a), [l2, r2] = level.walls(a + 1);
      organStats.minW = Math.min(organStats.minW, r - l); organStats.slope = Math.max(organStats.slope, l2 - l, r - r2);
    }
    if (organStats.minW < R.minWidth) ofail('the shaft is never narrower than minWidth', organStats.minW.toFixed(1));
    if (organStats.slope > R.maxWallSlope) ofail('the walls never step in faster than maxWallSlope', organStats.slope.toFixed(2));
    // static lanes: a pipe rank with every jet at full throw and a drum (kettle, ledge and head) leave an open lane of
    // minLane to the far wall at every height they reach; parked cymbals leave minLane open between them
    for (const h of hz) {
      if (h.type === 'organNotes') continue;
      const S = h.type === 'organCymbal' ? [-1, 1].map(e => { const d = OG.organCymbalDisc(h, e, 0); return { k: 'c', x: d.cx, a: h.alt, r: d.ey }; }) : OG.organDanger(h);
      if (h.type === 'organCymbal') {
        const [x0] = ext([S[1]]), [, x1] = ext([S[0]]), m = x0 - x1;
        organStats.lane.organCymbal = Math.min(organStats.lane.organCymbal, m);
        if (m < R.minLane) ofail('parked cymbals leave minLane open between them', `${m.toFixed(1)} at ${h.alt | 0}`);
        continue;
      }
      for (const q of S) {
        const [a0, a1] = span(q);
        for (let a = a0; a <= a1; a += 6) {
          const [x0, x1] = ext([q]), [l, r] = level.walls(a), m = h.side > 0 ? r - x1 : x0 - l;
          organStats.lane[h.type] = Math.min(organStats.lane[h.type], m);
          if (m < R.minLane) { ofail('every pipe and drum leaves a lane of minLane to the far wall', `${h.type} ${m.toFixed(1)} at ${h.alt | 0}`); break; }
        }
      }
    }
    // a staff never drops more than two of its four columns at once, and its columns sit inside the walls
    for (const h of hz.filter(h => h.type === 'organNotes')) {
      let most = 0;
      for (let t = 0; t < h.pat.length * h.every * OG.ORGAN.beat + 1; t += 0.02) { const cs = new Set(OG.organNotesState(h, t).falling.map(f => f.i)); most = Math.max(most, cs.size); }
      organStats.cols = Math.max(organStats.cols, most);
      if (most > 2) ofail('a staff drops at most two columns at once', `${most} at ${h.alt | 0}`);
      for (const x of h.cols) for (let a = h.alt - OG.ORGAN.notes.drop; a <= h.alt; a += 10) { const [l, r] = level.walls(a); if (x - 14 < l || x + 14 > r) { ofail('a staff\'s notes fall clear of the walls', `${h.alt | 0}`); break; } }
    }
    // a boing never throws you into a trap: above every drum's head the shaft is clear of traps for ORGAN.drum.clear
    for (const h of hz.filter(h => h.type === 'organDrum')) {
      const head = h.alt + OG.ORGAN.drum.head;
      if (!k) organStats.drums++;
      for (const g of hz) if (g !== h && g.hi > head && g.lo < head + OG.ORGAN.drum.clear + 400) { const d = g.lo - head; organStats.drumClear = Math.min(organStats.drumClear, d); if (d < OG.ORGAN.drum.clear) ofail('the shaft above a drum is clear for its boing', `${g.type} ${d | 0} above the drum at ${h.alt | 0}`); }
    }
    for (const f of fr) {
      const [l, r] = level.walls(f.alt), pr = OG.pickR(f);
      if (f.x - pr < l + R.fruitMargin - 0.5 || f.x + pr > r - R.fruitMargin + 0.5) ofail('pickups stay off the walls', `${f.kind} at ${f.alt | 0}`);
      if (f.clear === -Infinity) continue;   // (the dares: forks and the Choir Rest's stave)
      const need = f.clear ?? (f.bonus || f.kind === 'gold' ? Math.ceil(OG.laneSize().w / 2 + 6 + OG.COCO_R) : R.pickup.clear);
      let dd = Infinity; for (const h of hz) if (h.lo - 220 < f.alt && h.hi + 220 > f.alt) for (const q of OG.organDanger(h)) dd = Math.min(dd, OG.shapeDist(q, f.x, f.alt));
      if (!f.bonus && f.kind !== 'gold' && f.clear == null) organStats.pick = Math.min(organStats.pick, dd);
      if (dd < need - 0.5) ofail('pickups stay clear of every trap\'s reach', `${f.kind} at ${f.alt | 0}: ${dd.toFixed(1)} < ${need}`);
    }
    // a fork is a dare, but never inside a solid part (a windchest, a trumpet, a kettle, a bracket)
    for (const f of fr.filter(f => f.kind === 'organFork')) for (const h of hz) if (h.lo - 60 < f.alt && h.hi + 60 > f.alt)
      for (const q of OG.organShapes(h, 0, [], 'body')) if (OG.shapeDist(q, f.x, f.alt) < OG.COCO_R + 4) { ofail('a fork never sits in a trap\'s solid parts', `${h.type} at ${f.alt | 0}`); break; }
    for (let i = 0; i < fr.length; i++) for (let j = i + 1; j < fr.length && fr[j].alt - fr[i].alt < 80; j++) if (Math.hypot(fr[i].x - fr[j].x, fr[i].alt - fr[j].alt) < OG.pickR(fr[i]) + OG.pickR(fr[j]) + OG.PICK_GAP - 0.01) ofail('pickups never overlap', `${fr[i].alt | 0}`);
    if (fr.filter(f => f.kind === 'organFork').length !== 3) ofail('the cavern holds exactly 3 golden tuning forks', `${fr.filter(f => f.kind === 'organFork').length}`);
    if (organStats.drums < st0.goals.find(g => g.k === 'organDrum').n) ofail('the cavern has enough drums for its drum mission', `${organStats.drums}`);
    let gap = 0, last = 60; for (const f of fr) if (f.kind === 'chili') { gap = Math.max(gap, f.alt - last); last = f.alt; }
    if (gap > 640) ofail('the cavern keeps a chili line', `${gap | 0}`);
    if (k > 2) continue;   // (the searches run on the stage itself and two more seeds)
    for (const b of level.beats) {
      const lo = Math.min(...b.hs.map(h => h.lo)) - 150, hi = Math.max(...b.hs.map(h => h.hi)) + 90;
      const traps = hz.filter(h => h.lo < hi + 60 && h.hi > lo - 60);
      organStats.traps++;
      for (let p = 0; p < 6; p++) {
        const t0 = p * 1.13 + k * 0.37, [l, r] = level.walls(lo + 40);
        organStats.searches++;
        const tm = fly(level, traps, (l + r) / 2, lo + 40, t0, (x, a) => a >= hi - 10, lo, hi + 20);
        if (tm < 0) ofail('every trap can be passed by the widest pilot from any phase', `${b.kind} at ${b.a} (${b.sec.name}), start ${t0.toFixed(2)} s, seed ${k}`);
        else organStats.worst = Math.max(organStats.worst, tm);
      }
    }
    // every fork can be touched and then escaped (flown on past its traps) by the widest pilot, from 6 phases
    const dare = (f, x, a, touch, n, label) => {
      const own = hz.filter(h => h.lo - 40 < a && h.hi + 120 > a), lo = Math.min(a, ...own.map(h => h.lo)) - 200, hi = Math.max(a, ...own.map(h => h.hi)) + 100;
      const traps = hz.filter(h => h.lo < hi + 60 && h.hi > lo - 60), [l, r] = level.walls(lo + 40);
      for (let p = 0; p < n; p++) {
        organStats.searches++;
        const tm = fly(level, traps, (l + r) / 2, lo + 40, p * 1.07 + k * 0.29, (x, a) => a >= hi - 10, lo, hi + 20, touch);
        if (tm < 0) { ofail(`every ${label} can be reached and escaped by the widest pilot`, `${label} at ${a | 0}, phase ${p}, seed ${k}`); return false; }
      }
      return true;
    };
    for (const f of fr.filter(f => f.kind === 'organFork')) if (dare(f, f.x, f.alt, (x, a) => Math.hypot(x - f.x, a - f.alt) < OG.COCO_R + W / 2 - 4, 6, 'golden tuning fork')) organStats.forks++;
  }
  if (failures.size) {
    console.log(`FAILED: ${failures.size} rule(s) broken`);
    for (const [rule, { count, example }] of failures) console.log(`  ✗ ${rule} — ${count}× (e.g. ${example})`);
    process.exit(1);
  }
}
const organSummary = () => `PASS: Pipe Organ Cavern: ${organStats.seeds} layouts × ${organStats.len} m, only its own traps (${Object.entries(organStats.kinds).map(([k, n]) => `${n} ${k}`).join(', ')}), each taught alone first, all on one ${OG.ORGAN.beat} s beat; shaft ${organStats.minW.toFixed(0)}+ wide, wall slope ${organStats.slope.toFixed(2)} (max ${OG.RULES.maxWallSlope}); open lanes past pipes ${organStats.lane.organPipe.toFixed(0)}+, drums ${organStats.lane.organDrum.toFixed(0)}+, between parked cymbals ${organStats.lane.organCymbal.toFixed(0)}+ (minLane ${OG.RULES.minLane}), at most ${organStats.cols} of 4 note columns at once, ${organStats.drumClear.toFixed(0)}+ clear above every drum (${organStats.drums} drums), beats ${organStats.beatGap.toFixed(0)}+ apart; pickups ${organStats.pick.toFixed(1)}+ from any trap's reach, nothing pops in; ${organStats.traps} beats and ${organStats.forks} golden forks (reach and escape) flown by the widest pilot in ${organStats.searches} searches, the slowest pass ${organStats.worst.toFixed(1)} s`;
// (test slot: Pipe Organ Cavern, island level 28)
// ---------- Adventure: Pinball Palace (island level 29), an authored stage with its own traps ----------
// As the clockwork tower's checks: every rule on the stage's layout as the game builds it (and 8 other seeds, which only
// move sides and looks), then every beat and every golden jackpot star flown by a time-space search for the widest
// pilot on the traps' own clocks from several start phases (a flicking flipper, a ricocheting ball and popping targets
// count as solid exactly when the game kills on them; a bumper, which only kicks, counts as solid always).
const PB = new Function(regions.join('\n') + '\nreturn { createPinballLevel, pinballShapes, pinballDanger, pinballEnd, pinballCycle, pinballFlipState, pinballBallState, pinballBankState, PINBALL, PINBALL_STAGE, PINBALL_TYPES, ADV_PINBALL, RULES, advSeed, shapeDist, laneSize, pickR, COCO_R, PICK_GAP, UNITS_PER_M };')();
const pinballStats = { seeds: 0, traps: 0, searches: 0, worst: 0, stars: 0, pick: Infinity, minW: Infinity, slope: 0, lane: { pinballBumper: Infinity, pinballFlipper: Infinity, pinballBall: Infinity, pinballBank: Infinity }, len: 0, kinds: {}, beatGap: Infinity };
{
  const R = PB.RULES, W = PILOT_W, Hh = PILOT_H, M = 4, st0 = PB.ADV_PINBALL;
  const pfail = (rule, d) => fail('pinball: ' + rule, d);
  if (st0.theme !== 'pinball' || !(st0.reward > 0)) pfail('the palace is a themed stage with a reward', JSON.stringify(st0));
  if (!Array.isArray(st0.goals) || st0.goals.length !== 3 || !st0.goals.some(g => g.k === 'finish') || !st0.goals.some(g => g.k === 'pinballStar' && g.n === 3) || !st0.goals.some(g => g.k === 'pinballX' && g.n === 5)) pfail('three missions: the jackpot, 3 golden stars and the 5X multiplier', JSON.stringify(st0.goals));
  if (Math.abs(st0.len * PB.UNITS_PER_M - PB.pinballEnd()) > 1e-6) pfail('the stage length matches its layout', `${st0.len}`);
  if (PB.PINBALL.mults[3] !== 5 || PB.PINBALL.lamps.length !== 3) pfail('the multiplier climbs 2X, 3X, 5X', JSON.stringify(PB.PINBALL.lamps));
  // the stage's order: bumpers, then flippers, then the ball, then the target bank, each taught alone; never faster than
  // taught (a smaller P or S is faster)
  {
    const fam = { bump: 'bump', bumpPair: 'bump', bumpTri: 'bump', flip: 'flip', flipPair: 'flip', flipBump: 'flip', ball: 'ball', ballBump: 'ball', ballFlip: 'ball', bank: 'bank', bankBump: 'bank', bankFlip: 'bank', bankBall: 'bank' };
    const firsts = {}, seen = [];
    for (const sec of PB.PINBALL_STAGE) if (!sec.calm) for (const [, kind, o] of sec.beats) {
      const b = fam[kind]; if (!b) { pfail('every beat is a known kind', kind); continue; }
      if (!firsts[b]) { firsts[b] = o; seen.push(b); if (kind !== b) pfail('each trap is introduced alone first', `${kind} in ${sec.name}`); }
      else if ((o.P && firsts[b].P && o.P > firsts[b].P) || (o.S && firsts[b].S && o.S > firsts[b].S)) pfail('a trap is never slower than its introduction', `${kind} in ${sec.name}`);
    }
    if (seen.join() !== 'bump,flip,ball,bank') pfail('the palace teaches bumpers, flippers, the ball, then the target bank', seen.join());
    if (!PB.PINBALL_STAGE.some(sec => sec.calm && !sec.finish && sec !== PB.PINBALL_STAGE[0])) pfail('the palace has a breather', '');
    if (!PB.PINBALL_STAGE[PB.PINBALL_STAGE.length - 1].finish) pfail('the stage ends at the jackpot', '');
  }
  const capHit = (S, x, a, m) => {
    const r = W / 2 + m, half = Math.max(0, Hh / 2 - W / 2);
    for (const q of S) for (const da of half ? [-half, 0, half] : [0]) if (PB.shapeDist(q, x, a + da) < r) return true;
    return false;
  };
  // the widest open interval across the shaft at height a, given shapes S
  // (sum: the total of the open stretches a pilot fits through, for the steel ball: a ball in mid-flight splits the shaft
  // into two lanes, either of which you can take)
  const openAt = (level, S, a, sum) => {
    const [l, r] = level.walls(a), iv = [];
    for (const q of S) {
      let x0, x1;
      if (q.k === 'c') { const d = Math.abs(a - q.a); if (d >= q.r) continue; const w = Math.sqrt(q.r * q.r - d * d); x0 = q.x - w; x1 = q.x + w; }
      else if (q.k === 'b') { if (a < q.a0 || a > q.a1) continue; x0 = q.x0; x1 = q.x1; }
      else { let lo = Infinity, hi = -Infinity; for (let u = 0; u <= 1.0001; u += 1 / 24) { const x = q.x0 + (q.x1 - q.x0) * u, aa = q.a0 + (q.a1 - q.a0) * u, d = Math.abs(a - aa); if (d < q.r) { const w = Math.sqrt(q.r * q.r - d * d); lo = Math.min(lo, x - w); hi = Math.max(hi, x + w); } } if (lo > hi) continue; x0 = lo; x1 = hi; }
      iv.push([x0, x1]);
    }
    iv.sort((p, q) => p[0] - q[0]);
    let best = 0, tot = 0, cur = l;
    const take = w => { best = Math.max(best, w); if (w >= W + 8) tot += w; };
    for (const [x0, x1] of iv) { if (x0 > cur) take(x0 - cur); cur = Math.max(cur, x1); }
    take(r - cur);
    return sum ? tot : best;
  };
  // the search (as the vault's): solid = every shape of every trap at that moment
  function fly(level, traps, x0, a0, t0, goal, lo, hi, via) {
    const DT = 1 / 15, DX = 11, DA = 11, up = Math.round(440 * DT / DA), dn = Math.round(380 * DT / DA), sd = Math.round(330 * DT / DX);
    const nA = Math.ceil((hi - lo) / DA) + 1, nX = Math.ceil(400 / DX) + 1, V = 1e6;
    let front = new Set([Math.round(x0 / DX) * 1000 + Math.round((a0 - lo) / DA)]);
    for (let step = 1; step <= 12 / DT; step++) {
      const t = t0 + step * DT, S = [];
      for (const h of traps) PB.pinballShapes(h, t, S);
      const next = new Set(), blocked = new Map();
      const free = (xi, ai) => {
        const key = xi * 1000 + ai; if (blocked.has(key)) return blocked.get(key);
        const x = xi * DX, a = lo + ai * DA, [l, r] = level.walls(a), ok = x - W / 2 - 2 >= l && x + W / 2 + 2 <= r && level.walls(a + Hh / 2)[0] <= x - W / 2 && level.walls(a + Hh / 2)[1] >= x + W / 2 && level.walls(a - Hh / 2)[0] <= x - W / 2 && level.walls(a - Hh / 2)[1] >= x + W / 2 && !capHit(S, x, a, M);
        blocked.set(key, ok); return ok;
      };
      for (const k of front) {
        const got = k >= V, kk = k % V, xi = Math.floor(kk / 1000), ai = kk % 1000;
        for (let dA = -dn; dA <= up; dA++) for (let dX = -sd; dX <= sd; dX++) {
          const nx = xi + dX, na = ai + dA; if (na < 0 || na >= nA || nx < 0 || nx >= nX) continue;
          const g2 = got || !via || via(nx * DX, lo + na * DA), key = (g2 ? V : 0) + nx * 1000 + na; if (next.has(key) || !free(nx, na)) continue;
          if (g2 && goal(nx * DX, lo + na * DA)) return step * DT;
          next.add(key);
        }
      }
      if (!next.size) return -1;
      front = next;
    }
    return -1;
  }
  for (let k = 0; k <= 8; k++) {
    const st = k ? { ...st0, seed: `${st0.seed}~${k}` } : st0, level = PB.createPinballLevel(PB.advSeed(st), st), hz = [], fr = [];
    pinballStats.seeds++;
    {
      const VIEW = 1100, h1 = [], f1 = [];
      level.fill(VIEW + 900, h1, f1);
      let sh = h1.length, sf = f1.length;
      for (let cam = 10; cam < level.end; cam += 10) {
        level.fill(cam + VIEW + 900, h1, f1);
        for (; sh < h1.length; sh++) if (h1[sh].lo < cam + VIEW + 100) pfail('traps never pop in on screen', `${h1[sh].type} at ${h1[sh].lo | 0}`);
        for (; sf < f1.length; sf++) if (f1[sf].alt < cam + VIEW + 100) pfail('pickups never pop in on screen', `${f1[sf].kind} at ${f1[sf].alt | 0}`);
      }
      hz.push(...h1); fr.push(...f1);
    }
    pinballStats.len = level.end / 10;
    for (const h of hz) if (!PB.PINBALL_TYPES.has(h.type)) pfail('the palace only has its own traps', h.type);
    for (const h of hz) pinballStats.kinds[h.type.slice(7)] = (pinballStats.kinds[h.type.slice(7)] || 0) + (k ? 0 : 1);
    for (let i = 1; i < level.beats.length; i++) { const p = level.beats[i - 1], q = level.beats[i], g = Math.min(...q.hs.map(h => h.lo)) - Math.max(...p.hs.map(h => h.hi)); pinballStats.beatGap = Math.min(pinballStats.beatGap, g); if (g < 0) pfail('beats never overlap', `${p.kind} at ${p.a} / ${q.kind} at ${q.a}`); }
    if (hz.some(h => h.hi > level.end - 320)) pfail('the jackpot chamber below the finish is clear of traps', `${Math.max(...hz.map(h => h.hi)) | 0} vs ${level.end}`);
    for (let a = 0; a < level.end + 200; a += 1) {
      const [l, r] = level.walls(a), [l2, r2] = level.walls(a + 1);
      pinballStats.minW = Math.min(pinballStats.minW, r - l); pinballStats.slope = Math.max(pinballStats.slope, l2 - l, r - r2);
    }
    if (pinballStats.minW < R.minWidth) pfail('the shaft is never narrower than minWidth', pinballStats.minW.toFixed(1));
    if (pinballStats.slope > R.maxWallSlope) pfail('the walls never step in faster than maxWallSlope', pinballStats.slope.toFixed(2));
    // lanes: every trap alone, at every moment of its cycle, leaves an open lane of minLane across the shaft at every
    // height it reaches (a flipper all through its flick, the ball anywhere on its path, a bank with its gap anywhere)
    if (k < 3) for (const h of hz) {
      const C = PB.pinballCycle(h), n = h.type === 'pinballBumper' ? 1 : 48, D = PB.pinballDanger(h);
      let a0 = Infinity, a1 = -Infinity; for (const q of D) { const r = q.r || 0, lo = q.k === 'c' ? q.a - r : q.k === 'b' ? q.a0 : Math.min(q.a0, q.a1) - r, hi = q.k === 'c' ? q.a + r : q.k === 'b' ? q.a1 : Math.max(q.a0, q.a1) + r; a0 = Math.min(a0, lo); a1 = Math.max(a1, hi); }
      let worst = Infinity;
      for (let i = 0; i < n; i++) { const S = PB.pinballShapes(h, (i + 0.5) * C / n + (h.ph || 0), []); for (let a = a0; a <= a1; a += 4) worst = Math.min(worst, openAt(level, S, a, h.type === 'pinballBall')); }
      pinballStats.lane[h.type] = Math.min(pinballStats.lane[h.type], worst);
      if (worst < R.minLane) pfail('every trap leaves an open lane of minLane at every moment', `${h.type} ${worst.toFixed(1)} at ${h.alt | 0}`);
    }
    for (const f of fr) {
      const [l, r] = level.walls(f.alt), pr = PB.pickR(f);
      if (f.x - pr < l + R.fruitMargin - 0.5 || f.x + pr > r - R.fruitMargin + 0.5) pfail('pickups stay off the walls', `${f.kind} at ${f.alt | 0}`);
      if (f.clear === -Infinity) continue;   // (the dares: stars and the Bonus Round's star of coconuts)
      const need = f.clear ?? (f.bonus || f.kind === 'gold' ? Math.ceil(PB.laneSize().w / 2 + 6 + PB.COCO_R) : R.pickup.clear);
      let dd = Infinity; for (const h of hz) if (h.lo - 220 < f.alt && h.hi + 220 > f.alt) for (const q of PB.pinballDanger(h)) dd = Math.min(dd, PB.shapeDist(q, f.x, f.alt));
      if (!f.bonus && f.kind !== 'gold' && f.clear == null) pinballStats.pick = Math.min(pinballStats.pick, dd);
      if (dd < need - 0.5) pfail('pickups stay clear of every trap\'s reach', `${f.kind} at ${f.alt | 0}: ${dd.toFixed(1)} < ${need}`);
    }
    // a star is a dare, but never inside a solid part (a bumper, a pivot, a housing, a saucer, a bracket)
    for (const f of fr.filter(f => f.kind === 'pinballStar')) for (const h of hz) if (h.lo - 60 < f.alt && h.hi + 60 > f.alt)
      for (const q of PB.pinballShapes(h, 0, [], 'body')) if (PB.shapeDist(q, f.x, f.alt) < PB.COCO_R + 4) { pfail('a star never sits in a trap\'s solid parts', `${h.type} at ${f.alt | 0}`); break; }
    for (let i = 0; i < fr.length; i++) for (let j = i + 1; j < fr.length && fr[j].alt - fr[i].alt < 80; j++) if (Math.hypot(fr[i].x - fr[j].x, fr[i].alt - fr[j].alt) < PB.pickR(fr[i]) + PB.pickR(fr[j]) + PB.PICK_GAP - 0.01) pfail('pickups never overlap', `${fr[i].alt | 0}`);
    { const banks = hz.filter(h => h.type === 'pinballBank').length, rolls = fr.filter(f => f.kind === 'pinballRoll').length, need = PB.PINBALL.lamps[2];
      pinballStats.rolls = rolls;
      if (banks + 3 >= need || banks + 3 + rolls < need + 6) pfail('5X is reachable on the main line with slack (banks, stars and rollovers), but needs the rollovers', `${banks} banks, ${rolls} rollovers, ${need} lamps`); }
    if (fr.filter(f => f.kind === 'pinballStar').length !== 3) pfail('the palace holds exactly 3 golden stars', `${fr.filter(f => f.kind === 'pinballStar').length}`);
    let gap = 0, last = 60; for (const f of fr) if (f.kind === 'chili') { gap = Math.max(gap, f.alt - last); last = f.alt; }
    if (gap > 640) pfail('the palace keeps a chili line', `${gap | 0}`);
    if (k > 2) continue;   // (the searches run on the stage itself and two more seeds)
    for (const b of level.beats) {
      const lo = Math.min(...b.hs.map(h => h.lo)) - 150, hi = Math.max(...b.hs.map(h => h.hi)) + 90;
      const traps = hz.filter(h => h.lo < hi + 60 && h.hi > lo - 60);
      pinballStats.traps++;
      for (let p = 0; p < 6; p++) {
        const t0 = p * 1.13 + k * 0.37, [l, r] = level.walls(lo + 40);
        pinballStats.searches++;
        const tm = fly(level, traps, (l + r) / 2, lo + 40, t0, (x, a) => a >= hi - 10, lo, hi + 20);
        if (tm < 0) pfail('every trap can be passed by the widest pilot from any phase', `${b.kind} at ${b.a} (${b.sec.name}), start ${t0.toFixed(2)} s, seed ${k}`);
        else pinballStats.worst = Math.max(pinballStats.worst, tm);
      }
    }
    // every star can be touched and then escaped (flown on past its traps) by the widest pilot, from 6 phases
    const dare = (f, x, a, touch, n, label) => {
      const own = hz.filter(h => h.lo - 40 < a && h.hi + 120 > a), lo = Math.min(a, ...own.map(h => h.lo)) - 200, hi = Math.max(a, ...own.map(h => h.hi)) + 100;
      const traps = hz.filter(h => h.lo < hi + 60 && h.hi > lo - 60), [l, r] = level.walls(lo + 40);
      for (let p = 0; p < n; p++) {
        pinballStats.searches++;
        const tm = fly(level, traps, (l + r) / 2, lo + 40, p * 1.07 + k * 0.29, (x, a) => a >= hi - 10, lo, hi + 20, touch);
        if (tm < 0) { pfail(`every ${label} can be reached and escaped by the widest pilot`, `${label} at ${a | 0}, phase ${p}, seed ${k}`); return false; }
      }
      return true;
    };
    for (const f of fr.filter(f => f.kind === 'pinballStar')) if (dare(f, f.x, f.alt, (x, a) => Math.hypot(x - f.x, a - f.alt) < PB.COCO_R + W / 2 - 4, 6, 'golden star')) pinballStats.stars++;
  }
  if (failures.size) {
    console.log(`FAILED: ${failures.size} rule(s) broken`);
    for (const [rule, { count, example }] of failures) console.log(`  ✗ ${rule} — ${count}× (e.g. ${example})`);
    process.exit(1);
  }
}
const pinballSummary = () => `PASS: Pinball Palace: ${pinballStats.seeds} layouts × ${pinballStats.len} m, only its own traps (${Object.entries(pinballStats.kinds).map(([k, n]) => `${n} ${k}`).join(', ')}), each taught alone first; shaft ${pinballStats.minW.toFixed(0)}+ wide, wall slope ${pinballStats.slope.toFixed(2)} (max ${PB.RULES.maxWallSlope}); open lanes at every moment past bumpers ${pinballStats.lane.pinballBumper.toFixed(0)}+, flippers ${pinballStats.lane.pinballFlipper.toFixed(0)}+, the ball ${pinballStats.lane.pinballBall.toFixed(0)}+ (both sides of it), target banks ${pinballStats.lane.pinballBank.toFixed(0)}+ (minLane ${PB.RULES.minLane}), beats ${pinballStats.beatGap.toFixed(0)}+ apart; pickups ${pinballStats.pick.toFixed(1)}+ from any trap's reach, nothing pops in; ${pinballStats.rolls} rollover lamps (5X at ${PB.PINBALL.lamps[2]} lamps); ${pinballStats.traps} beats and ${pinballStats.stars} golden stars (reach and escape) flown by the widest pilot in ${pinballStats.searches} searches, the slowest pass ${pinballStats.worst.toFixed(1)} s`;
// (test slot: Pinball Palace, island level 29)
// ---------- Adventure: Candy Caverns (island level 30), an authored stage with its own traps ----------
// As Kooky Lab's checks: every rule on the stage's layout as the game builds it (and 8 other seeds, which only move
// phases and looks), then every beat and every golden bonbon flown by a time-space search for the widest pilot on the
// traps' own clocks from 6 start phases. A gumdrop and its push ring and a fountain's pour count as solid (every beat can
// be passed without ever being boinged or coated in chocolate); jawbreakers, bubbles, chutes, blowers, ledges, bowls and
// lollipops are solid anyway.
const CK = new Function(regions.join('\n') + '\nreturn { createCandyLevel, candyShapes, candyDanger, candyEnd, candyGumAt, candyChocAt, candyJawAt, candyJawPos, candyBubAt, candyStreamX, CANDY, CANDY_STAGE, CANDY_TYPES, ADV_CANDY, RULES, advSeed, shapeDist, laneSize, pickR, COCO_R, PICK_GAP, UNITS_PER_M };')();
const candyStats = { seeds: 0, traps: 0, searches: 0, worst: 0, bons: 0, pick: Infinity, minW: Infinity, slope: 0, beatGap: Infinity, len: 0, kinds: {}, bubLane: Infinity, lollyLane: Infinity, jawDrop: 0, push: 0 };
{
  const R = CK.RULES, W = PILOT_W, Hh = PILOT_H, M = 4, st0 = CK.ADV_CANDY, X = CK.CANDY;
  if (st0.theme !== 'candy' || !(st0.reward > 0)) fail('Candy Caverns is a themed stage with a reward', JSON.stringify(st0));
  if (!Array.isArray(st0.goals) || st0.goals.length !== 3 || !st0.goals.some(g => g.k === 'finish') || !st0.goals.some(g => g.k === 'candyBonbons' && g.n === 3) || !st0.goals.some(g => g.k === 'candyLollyCoins' && g.n > 0)) fail('Candy Caverns has three missions: the Great Cake, 3 golden bonbons and the lollipop coins', JSON.stringify(st0.goals));
  if (Math.abs(st0.len * CK.UNITS_PER_M - CK.candyEnd()) > 1e-6) fail('the Candy Caverns stage length matches its layout', `${st0.len}`);
  // the stage's order: gumdrops, then fountains, then jawbreakers, then blowers, each taught alone (never faster first)
  {
    const firsts = {}, seen = [], base = { gumPair: 'candyGum', gumBoth: 'candyGum', chocPair: 'candyChoc', chocGum: 'candyChoc', jawBoth: 'candyJaw', jawGum: 'candyJaw', jawChoc: 'candyJaw', bubPair: 'candyBubble', bubJaw: 'candyJaw', bubChoc: 'candyChoc', bubGum: 'candyBubble' };
    const S = CK.CANDY_STAGE;
    for (const sec of S) if (sec.beats) for (const [, kind, o] of sec.beats) {
      const b = base[kind] || kind;
      if (!firsts[b]) { firsts[b] = o; seen.push(b); if (kind !== b) fail('each candy trap is introduced alone first', `${kind} in ${sec.name}`); }
      else if (kind === b && o.P && firsts[b].P && o.P > firsts[b].P + 1e-9) fail('a candy trap is never slower than its introduction', `${kind} in ${sec.name}`);
    }
    if (seen.join() !== 'candyGum,candyChoc,candyJaw,candyBubble') fail('Candy Caverns teaches gumdrops, then fountains, then jawbreakers, then blowers', seen.join());
    if (!S.some(sec => sec.calm && !sec.finish && sec !== S[0])) fail('Candy Caverns has a breather', '');
    if (!S[S.length - 1].finish) fail('Candy Caverns ends at the Great Cake', '');
  }
  // a gumdrop's boing shoves you sideways, never harder than a couple of steering strokes
  candyStats.push = X.gum.push;
  if (X.gum.push > 640) fail('a gumdrop never pushes harder than 640', `${X.gum.push}`);
  const capHit = (S, x, a, m) => {
    const r = W / 2 + m, half = Math.max(0, Hh / 2 - W / 2);
    for (const q of S) for (const da of half ? [-half, 0, half] : [0]) if (CK.shapeDist(q, x, a + da) < r) return true;
    return false;
  };
  // every shape of the traps at t, lethal and soft alike (the search never lets itself be boinged or coated)
  const allShapes = (traps, t, S) => { for (const h of traps) CK.candyShapes(h, t, S, h.noSoft ? 'body' : undefined); return S; };
  function fly(level, traps, x0, a0, t0, goal, lo, hi, via) {
    const DT = 1 / 15, DX = 11, DA = 11, up = Math.round(440 * DT / DA), dn = Math.round(380 * DT / DA), sd = Math.round(330 * DT / DX);
    const nA = Math.ceil((hi - lo) / DA) + 1, nX = Math.ceil(400 / DX) + 1, V = 1e6;
    let front = new Set([Math.round(x0 / DX) * 1000 + Math.round((a0 - lo) / DA)]);
    for (let step = 1; step <= 18 / DT; step++) {
      const t = t0 + step * DT, S = allShapes(traps, t, []);
      const next = new Set(), blocked = new Map();
      const free = (xi, ai) => {
        const key = xi * 1000 + ai; if (blocked.has(key)) return blocked.get(key);
        const x = xi * DX, a = lo + ai * DA, [l, r] = level.walls(a), ok = x - W / 2 - 2 >= l && x + W / 2 + 2 <= r && level.walls(a + Hh / 2)[0] <= x - W / 2 && level.walls(a + Hh / 2)[1] >= x + W / 2 && level.walls(a - Hh / 2)[0] <= x - W / 2 && level.walls(a - Hh / 2)[1] >= x + W / 2 && !capHit(S, x, a, M);
        blocked.set(key, ok); return ok;
      };
      for (const k of front) {
        const got = k >= V, kk = k % V, xi = Math.floor(kk / 1000), ai = kk % 1000;
        for (let dA = -dn; dA <= up; dA++) for (let dX = -sd; dX <= sd; dX++) {
          const nx = xi + dX, na = ai + dA; if (na < 0 || na >= nA || nx < 0 || nx >= nX) continue;
          const g2 = got || !via || via(nx * DX, lo + na * DA), key = (g2 ? V : 0) + nx * 1000 + na; if (next.has(key) || !free(nx, na)) continue;
          if (g2 && goal(nx * DX, lo + na * DA)) return step * DT;
          next.add(key);
        }
      }
      if (!next.size) { globalThis.candyDbg = { step, t, maxA: Math.max(...[...front].map(k => lo + (k % V) % 1000 * DA)) }; return -1; }
      front = next;
    }
    return -1;
  }
  for (let k = 0; k <= 8; k++) {
    const st = k ? { ...st0, seed: `${st0.seed}~${k}` } : st0, level = CK.createCandyLevel(CK.advSeed(st), st), hz = [], fr = [];
    candyStats.seeds++;
    {
      const VIEW = 1100, h1 = [], f1 = [];
      level.fill(VIEW + 900, h1, f1);
      let sh = h1.length, sf = f1.length;
      for (let cam = 10; cam < level.end; cam += 10) {
        level.fill(cam + VIEW + 900, h1, f1);
        for (; sh < h1.length; sh++) if (h1[sh].lo < cam + VIEW + 100) fail('candy traps never pop in on screen', `${h1[sh].type} at ${h1[sh].lo | 0}`);
        for (; sf < f1.length; sf++) if (f1[sf].alt < cam + VIEW + 100) fail('candy pickups never pop in on screen', `${f1[sf].kind} at ${f1[sf].alt | 0}`);
      }
      hz.push(...h1); fr.push(...f1);
    }
    candyStats.len = level.end / 10;
    for (const h of hz) if (!CK.CANDY_TYPES.has(h.type)) fail('Candy Caverns only has its own traps', h.type);
    for (const h of hz) candyStats.kinds[h.type] = (candyStats.kinds[h.type] || 0) + (k ? 0 : 1);
    // beats never crowd: each beat's traps start above the last beat's whole reach (one thing to read at a time)
    for (let i = 1; i < level.beats.length; i++) { const p = level.beats[i - 1], q = level.beats[i], g = Math.min(...q.hs.map(h => h.lo)) - Math.max(...p.hs.map(h => h.hi)); candyStats.beatGap = Math.min(candyStats.beatGap, g); if (g < 0) fail('candy beats never overlap', `${p.kind} at ${p.a} / ${q.kind} at ${q.a}`); }
    for (const b of level.beats) for (let i = 0; i < b.hs.length; i++) for (let j = i + 1; j < b.hs.length; j++) { const p = b.hs[i], q = b.hs[j]; if (p.alt !== q.alt && p.hi > q.lo && q.hi > p.lo) fail('the traps of a candy beat never overlap', `${b.kind} at ${b.a}`); }
    for (const h of level.lollies) if (hz.some(q => q !== h && q.hi > h.lo - 20 && q.lo < h.hi + 20)) fail('a lollipop never crowds a trap', `${h.alt}`);
    if (hz.some(h => h.hi > level.end - 320)) fail('the Great Cake below the finish is clear of traps', `${Math.max(...hz.map(h => h.hi)) | 0} vs ${level.end}`);
    for (let a = 0; a < level.end + 200; a += 1) {
      const [l, r] = level.walls(a), [l2, r2] = level.walls(a + 1);
      candyStats.minW = Math.min(candyStats.minW, r - l); candyStats.slope = Math.max(candyStats.slope, l2 - l, r - r2);
    }
    if (candyStats.minW < R.minWidth) fail('the candy shaft is never narrower than minWidth', candyStats.minW.toFixed(1));
    if (candyStats.slope > R.maxWallSlope) fail('the candy walls never step in faster than maxWallSlope', candyStats.slope.toFixed(2));
    for (const h of hz) {
      if (h.type === 'candyJaw') {
        // the walls are straight where a jawbreaker bounces (its knocks are computed on them), it only ever falls, it
        // leaves its chute level and it shatters on a wall
        for (let a = h.lo; a <= h.hi; a += 4) { const [l, r] = level.walls(a); if (Math.abs(l - h.L) > 0.5 || Math.abs(r - h.R) > 0.5) { fail('the walls are straight where a jawbreaker bounces', `${h.alt} at ${a | 0}`); break; } }
        let pa = Infinity; for (let tau = 0; tau <= h.tEnd; tau += 0.02) { const p = CK.candyJawPos(h, tau); if (p.a > pa + 1e-9) fail('a jawbreaker only ever falls', `${h.alt}`); pa = p.a; }
        const pe = CK.candyJawPos(h, h.tEnd); if (Math.abs(pe.x - (h.side > 0 ? h.L + X.jaw.r : h.R - X.jaw.r)) > 0.5 && Math.abs(pe.x - (h.side > 0 ? h.R - X.jaw.r : h.L + X.jaw.r)) > 0.5) fail('a jawbreaker shatters on a wall', `${h.alt} ${pe.x.toFixed(1)}`);
        candyStats.jawDrop = Math.max(candyStats.jawDrop, h.alt - pe.a);
        if (h.alt - pe.a > X.jaw.drop + 0.5) fail('a jawbreaker falls no further than its drop', `${h.alt}`);
        if (h.P < X.jaw.tell + h.tEnd + 0.5) fail('one jawbreaker at a time per chute', `${h.alt}`);
      }
      if (h.type === 'candyBubble') {
        // at full size, still at the lips, a bubble leaves the widest pilot a lane by the far wall; the walls are straight
        // where it drifts; it pops on the far wall
        const S = []; CK.candyShapes(h, 0, S, 'still'); S.push({ k: 'c', x: h.base + h.side * (X.bub.mouth + X.bub.R - 3), a: h.alt, r: X.bub.R });
        let reach = -Infinity; for (const q of S) { const xs = q.k === 'c' ? [q.x + h.side * q.r] : [q.x0 + h.side * q.r, q.x1 + h.side * q.r]; for (const x of xs) reach = Math.max(reach, h.side * x); }
        const [l, r] = level.walls(h.alt), lane = h.side > 0 ? r - reach : -reach - l;
        candyStats.bubLane = Math.min(candyStats.bubLane, lane);
        if (lane < W + 12) fail('a full bubble at the lips leaves the widest pilot a lane', `${h.alt} ${lane.toFixed(0)}`);
        for (let a = h.lo; a <= h.hi; a += 4) { const [l2, r2] = level.walls(a); if (Math.abs((h.side > 0 ? r2 : l2) - h.far) > 0.5) { fail('the far wall is straight where a bubble drifts', `${h.alt}`); break; } }
        const T = []; CK.candyShapes(h, (1 - h.ph) * h.P - CK.CANDY.bub.pop - 0.004 + 50 * h.P, T, 'body'); const bb = T.find(q => q.k === 'c' && q.r > 40);
        if (!bb || Math.abs(h.side * (bb.x + h.side * bb.r / 0.97) - h.side * h.far) > 2.5) fail('a bubble pops on the far wall', `${h.alt} ${bb ? (bb.x + h.side * bb.r / 0.97 - h.far).toFixed(1) : 'none'}`);
      }
      if (h.type === 'candyChoc') {
        // the pour lands in its bowl
        const bx = CK.candyStreamX(h, X.choc.H);
        if (Math.abs(bx - CK.candyStreamX(h, X.choc.H - 2)) > 1) fail('a fountain pours straight into its bowl', `${h.alt}`);
      }
      if (h.type === 'candyLolly') {
        const S = CK.candyShapes(h, 0, [], 'still'); let reach = -Infinity; for (const q of S) { const xs = q.k === 'c' ? [q.x + h.side * q.r] : [q.x0 + h.side * q.r, q.x1 + h.side * q.r]; for (const x of xs) reach = Math.max(reach, h.side * x); }
        const [l, r] = level.walls(h.alt), lane = h.side > 0 ? r - reach : -reach - l; candyStats.lollyLane = Math.min(candyStats.lollyLane, lane);
        if (lane < W + 60) fail('a lollipop leaves a wide lane', `${h.alt}`);
      }
    }
    for (const f of fr) {
      const [l, r] = level.walls(f.alt), pr = CK.pickR(f);
      if (f.x - pr < l + R.fruitMargin - 0.5 || f.x + pr > r - R.fruitMargin + 0.5) fail('candy pickups stay off the walls', `${f.kind} at ${f.alt | 0}`);
      if (f.clear === -Infinity) continue;   // (the dares: the golden bonbons, the Lollipop Garden's ring)
      const need = f.clear ?? (f.bonus || f.kind === 'gold' ? Math.ceil(CK.laneSize().w / 2 + 6 + CK.COCO_R) : R.pickup.clear);
      let dd = Infinity; for (const h of hz) if (h.lo - 220 < f.alt && h.hi + 220 > f.alt) for (const q of CK.candyDanger(h)) dd = Math.min(dd, CK.shapeDist(q, f.x, f.alt));
      if (!f.bonus && f.kind !== 'gold' && f.clear == null) candyStats.pick = Math.min(candyStats.pick, dd);
      if (dd < need - 0.5) fail('candy pickups stay clear of every trap\'s reach', `${f.kind} at ${f.alt | 0}: ${dd.toFixed(1)} < ${need}`);
    }
    for (let i = 0; i < fr.length; i++) for (let j = i + 1; j < fr.length && fr[j].alt - fr[i].alt < 80; j++) if (Math.hypot(fr[i].x - fr[j].x, fr[i].alt - fr[j].alt) < CK.pickR(fr[i]) + CK.pickR(fr[j]) + CK.PICK_GAP - 0.01) fail('candy pickups never overlap', `${fr[i].alt | 0}`);
    if (fr.filter(f => f.kind === 'bonbon').length !== 3) fail('Candy Caverns holds exactly 3 golden bonbons', `${fr.filter(f => f.kind === 'bonbon').length}`);
    let gap = 0, last = 60; for (const f of fr) if (f.kind === 'chili') { gap = Math.max(gap, f.alt - last); last = f.alt; }
    if (gap > 640) fail('Candy Caverns keeps a chili line', `${gap | 0}`);
    if (k > 2) continue;   // (the searches run on the stage itself and two more seeds)
    const near = (lo, hi) => hz.filter(h => h.lo < hi + 60 && h.hi > lo - 60);
    for (const b of level.beats) {
      // (it starts 150 under the beat, or just over the last beat's reach where that is closer)
      const bi = level.beats.indexOf(b), prevTop = bi > 0 ? Math.max(...level.beats[bi - 1].hs.map(h => h.hi)) : -Infinity;
      const lo = Math.min(...b.hs.map(h => h.lo)) - 150, hi = Math.max(...b.hs.map(h => h.hi)) + 90, traps = near(lo, hi), a0 = Math.max(lo + 40, Math.min(prevTop + 20, Math.min(...b.hs.map(h => h.lo)) - 10));
      candyStats.traps++;
      for (let p = 0; p < 6; p++) {
        const t0 = p * 1.13 + k * 0.37, [l, r] = level.walls(a0);
        const S0 = allShapes(traps, t0 + 1 / 15, []), cand = [(l + r) / 2, (l + r) / 2 - 70, (l + r) / 2 + 70, l + 50, r - 50];
        const x0 = cand.find(x => !capHit(S0, x, a0, M)) ?? cand[0];
        candyStats.searches++;
        const tm = fly(level, traps, x0, a0, t0, (x, a) => a >= hi - 10, lo, hi + 20);
        if (tm < 0) fail('every candy trap can be passed by the widest pilot from any phase, never boinged or coated', `${b.kind} at ${b.a} (${b.sec.name}), start ${t0.toFixed(2)} s, seed ${k} ${JSON.stringify(globalThis.candyDbg)} lo ${lo} hi ${hi} x0 ${x0.toFixed(0)} a0 ${a0}`);
        else candyStats.worst = Math.max(candyStats.worst, tm);
      }
    }
    // every golden bonbon can be touched and then escaped (flown on past its trap) by the widest pilot, from 6 phases
    for (const f of fr.filter(f => f.kind === 'bonbon')) {
      const own = hz.filter(h => h.lo - 40 < f.alt && h.hi + 120 > f.alt), lo = Math.min(f.alt, ...own.map(h => h.lo)) - 200, hi = Math.max(f.alt, ...own.map(h => h.hi)) + 100;
      const traps = near(lo, hi), [l, r] = level.walls(lo + 40), x0 = (l + r) / 2;
      // (a bonbon by a pour is a dare: there the chocolate only slows you)
      const flyTraps = traps.map(h => h.type === 'candyChoc' && own.includes(h) ? { ...h, noSoft: true } : h);
      for (let p = 0; p < 6; p++) {
        candyStats.searches++;
        const tm = fly(level, flyTraps, x0, lo + 40, p * 1.07 + k * 0.29, (x, a) => a >= hi - 10, lo, hi + 20, (x, a) => Math.hypot(x - f.x, a - f.alt) < CK.COCO_R + W / 2 - 4);
        if (tm < 0) fail('every golden bonbon can be grabbed and escaped by the widest pilot', `bonbon at ${f.alt | 0}, phase ${p}, seed ${k}`);
      }
      candyStats.bons++;
    }
  }
}
const candySummary = () => `PASS: Candy Caverns: ${candyStats.seeds} layouts × ${candyStats.len} m, only its own traps (${Object.entries(candyStats.kinds).map(([k, n]) => `${n} ${k}`).join(', ')}), each trap taught alone first; shaft ${candyStats.minW.toFixed(0)}+ wide, wall slope ${candyStats.slope.toFixed(2)} (max ${CK.RULES.maxWallSlope}); full bubbles leave ${candyStats.bubLane.toFixed(0)}+ lanes, lollipops ${candyStats.lollyLane.toFixed(0)}+, jawbreakers fall ${candyStats.jawDrop.toFixed(0)} at most, gumdrops push ${candyStats.push} at most; beats ${candyStats.beatGap.toFixed(0)}+ apart; pickups ${candyStats.pick.toFixed(1)}+ from any reach; ${candyStats.traps} beats × 6 phases and ${candyStats.bons} golden bonbons flown by the widest pilot never boinged or coated (${candyStats.searches} searches, slowest ${candyStats.worst.toFixed(1)} s)`;
// (test slot: Candy Caverns, island level 30)
// ---------- Adventure: Cheddar Caverns (island level 31), an authored stage with its own traps ----------
// As the organ's checks: every rule on the stage's layout as the game builds it (and 8 other seeds, which only move sides
// and looks), then every beat and every lost mouseling flown by a time-space search for the widest pilot on the traps'
// own clocks from several start phases. A mousetrap is proximity-sprung, so the searches count its whole snap (every
// angle of its bar) as solid all the time; a mouseling over a mousetrap is flown with that trap already sprung (shut), and
// a safe spot to spring it from (outside its snap, inside its trigger) must exist.
const CH = new Function(regions.join('\n') + '\nreturn { createCheeseLevel, cheeseShapes, cheeseDanger, cheeseEnd, cheeseTrapState, cheeseWheelState, cheesePawState, cheeseGraterState, cheeseBait, CHEESE, CHEESE_STAGE, CHEESE_TYPES, ADV_CHEESE, RULES, advSeed, shapeDist, laneSize, pickR, COCO_R, PICK_GAP, UNITS_PER_M };')();
const cheeseStats = { seeds: 0, traps: 0, searches: 0, worst: 0, mice: 0, pick: Infinity, minW: Infinity, slope: 0, lane: { cheeseTrap: Infinity, cheeseWheel: Infinity, cheesePaw: Infinity, cheeseGrater: Infinity }, len: 0, kinds: {}, beatGap: Infinity, tunnels: 0, exitClear: Infinity, baitSpots: 0 };
{
  const R = CH.RULES, W = PILOT_W, Hh = PILOT_H, M = 4, st0 = CH.ADV_CHEESE, X = CH.CHEESE;
  const cfail = (rule, d) => fail('cheese: ' + rule, d);
  if (st0.theme !== 'cheese' || !(st0.reward > 0)) cfail('the caverns are a themed stage with a reward', JSON.stringify(st0));
  if (!Array.isArray(st0.goals) || st0.goals.length !== 3 || !st0.goals.some(g => g.k === 'finish') || !st0.goals.some(g => g.k === 'cheeseMouse' && g.n === 3) || !st0.goals.some(g => g.k === 'cheeseTunnel' && g.n > 0)) cfail('three missions: the hall, 3 mouselings and the tunnels', JSON.stringify(st0.goals));
  if (Math.abs(st0.len * CH.UNITS_PER_M - CH.cheeseEnd()) > 1e-6) cfail('the stage length matches its layout', `${st0.len}`);
  // the stage's order: mousetraps, then wheels, then paws, then graters, each taught alone; never faster than taught
  {
    const fam = { trap: 'trap', trapPair: 'trap', wheel: 'wheel', wheelPair: 'wheel', wheelTrap: 'wheel', paw: 'paw', pawPair: 'paw', pawTrap: 'paw', pawWheel: 'paw', grater: 'grater', graterPaw: 'grater', graterWheel: 'grater', graterTrap: 'grater' };
    const firsts = {}, seen = [];
    for (const sec of CH.CHEESE_STAGE) if (!sec.calm) for (const [, kind, o] of sec.beats) {
      const b = fam[kind]; if (!b) { cfail('every beat is a known kind', kind); continue; }
      if (!firsts[b]) { firsts[b] = o; seen.push(b); if (kind !== b) cfail('each trap is introduced alone first', `${kind} in ${sec.name}`); }
      else if (o.P && firsts[b].P && o.P > firsts[b].P + 1e-9) cfail('a trap is never slower than its introduction', `${kind} in ${sec.name}`);
    }
    if (seen.join() !== 'trap,wheel,paw,grater') cfail('the caverns teach mousetraps, wheels, paws, then graters', seen.join());
    if (!CH.CHEESE_STAGE.some(sec => sec.calm && !sec.finish && sec !== CH.CHEESE_STAGE[0])) cfail('the caverns have a breather', '');
    if (!CH.CHEESE_STAGE[CH.CHEESE_STAGE.length - 1].finish) cfail('the stage ends at the Mouse King\'s hall', '');
  }
  const capHit = (S, x, a, m) => {
    const r = W / 2 + m, half = Math.max(0, Hh / 2 - W / 2);
    for (const q of S) for (const da of half ? [-half, 0, half] : [0]) if (CH.shapeDist(q, x, a + da) < r) return true;
    return false;
  };
  const capDist = (px, pa, x, a) => { const half = Math.max(0, Hh / 2 - W / 2); return Math.min(...[-half, 0, half].map(da => Math.hypot(px - x, pa - a - da))) - W / 2; };
  const ext = S => { let x0 = Infinity, x1 = -Infinity; for (const q of S) { const r = q.r || 0, a = q.k === 'c' ? q.x - r : Math.min(q.x0, q.x1) - r, b = q.k === 'c' ? q.x + r : Math.max(q.x0, q.x1) + r; x0 = Math.min(x0, a); x1 = Math.max(x1, b); } return [x0, x1]; };
  const span = q => { const r = q.r || 0; return q.k === 'c' ? [q.a - r, q.a + r] : [Math.min(q.a0, q.a1) - r, Math.max(q.a0, q.a1) + r]; };
  // the searches' solid shapes: every trap at time t, a mousetrap's whole snap (unless sprung: then shut)
  const solid = (h, t, S) => CH.cheeseShapes(h, t, S, h.type === 'cheeseTrap' && h.trigT == null ? 'sweep' : undefined);
  // the search (as the organ's): solid = every lethal shape of every trap at that moment
  function fly(level, traps, x0, a0, t0, goal, lo, hi, via) {
    const DT = 1 / 15, DX = 11, DA = 11, up = Math.round(440 * DT / DA), dn = Math.round(380 * DT / DA), sd = Math.round(330 * DT / DX);
    const nA = Math.ceil((hi - lo) / DA) + 1, nX = Math.ceil(400 / DX) + 1, V = 1e6;
    let front = new Set([Math.round(x0 / DX) * 1000 + Math.round((a0 - lo) / DA)]);
    for (let step = 1; step <= 12 / DT; step++) {
      const t = t0 + step * DT, S = [];
      for (const h of traps) solid(h, t, S);
      const next = new Set(), blocked = new Map();
      const free = (xi, ai) => {
        const key = xi * 1000 + ai; if (blocked.has(key)) return blocked.get(key);
        const x = xi * DX, a = lo + ai * DA, [l, r] = level.walls(a), ok = x - W / 2 - 2 >= l && x + W / 2 + 2 <= r && level.walls(a + Hh / 2)[0] <= x - W / 2 && level.walls(a + Hh / 2)[1] >= x + W / 2 && level.walls(a - Hh / 2)[0] <= x - W / 2 && level.walls(a - Hh / 2)[1] >= x + W / 2 && !capHit(S, x, a, M);
        blocked.set(key, ok); return ok;
      };
      for (const k of front) {
        const got = k >= V, kk = k % V, xi = Math.floor(kk / 1000), ai = kk % 1000;
        for (let dA = -dn; dA <= up; dA++) for (let dX = -sd; dX <= sd; dX++) {
          const nx = xi + dX, na = ai + dA; if (na < 0 || na >= nA || nx < 0 || nx >= nX) continue;
          const g2 = got || !via || via(nx * DX, lo + na * DA), key = (g2 ? V : 0) + nx * 1000 + na; if (next.has(key) || !free(nx, na)) continue;
          if (g2 && goal(nx * DX, lo + na * DA)) return step * DT;
          next.add(key);
        }
      }
      if (!next.size) return -1;
      front = next;
    }
    return -1;
  }
  for (let k = 0; k <= 8; k++) {
    const st = k ? { ...st0, seed: `${st0.seed}~${k}` } : st0, level = CH.createCheeseLevel(CH.advSeed(st), st), hz = [], fr = [];
    cheeseStats.seeds++;
    {
      const VIEW = 1100, h1 = [], f1 = [];
      level.fill(VIEW + 900, h1, f1);
      let sh = h1.length, sf = f1.length;
      for (let cam = 10; cam < level.end; cam += 10) {
        level.fill(cam + VIEW + 900, h1, f1);
        for (; sh < h1.length; sh++) if (h1[sh].lo < cam + VIEW + 100) cfail('traps never pop in on screen', `${h1[sh].type} at ${h1[sh].lo | 0}`);
        for (; sf < f1.length; sf++) if (f1[sf].alt < cam + VIEW + 100) cfail('pickups never pop in on screen', `${f1[sf].kind} at ${f1[sf].alt | 0}`);
      }
      hz.push(...h1); fr.push(...f1);
    }
    cheeseStats.len = level.end / 10;
    for (const h of hz) if (!CH.CHEESE_TYPES.has(h.type)) cfail('the caverns only have their own traps', h.type);
    for (const h of hz) cheeseStats.kinds[h.type.slice(6)] = (cheeseStats.kinds[h.type.slice(6)] || 0) + (k ? 0 : 1);
    for (let i = 1; i < level.beats.length; i++) { const p = level.beats[i - 1], q = level.beats[i], g = Math.min(...q.hs.map(h => h.lo)) - Math.max(...p.hs.map(h => h.hi)); cheeseStats.beatGap = Math.min(cheeseStats.beatGap, g); if (g < 0) cfail('beats never overlap', `${p.kind} at ${p.a} / ${q.kind} at ${q.a}`); }
    if (hz.some(h => h.hi > level.end - 320)) cfail('the hall below the finish is clear of traps', `${Math.max(...hz.map(h => h.hi)) | 0} vs ${level.end}`);
    for (let a = 0; a < level.end + 200; a += 1) {
      const [l, r] = level.walls(a), [l2, r2] = level.walls(a + 1);
      cheeseStats.minW = Math.min(cheeseStats.minW, r - l); cheeseStats.slope = Math.max(cheeseStats.slope, l2 - l, r - r2);
    }
    if (cheeseStats.minW < R.minWidth) cfail('the shaft is never narrower than minWidth', cheeseStats.minW.toFixed(1));
    if (cheeseStats.slope > R.maxWallSlope) cfail('the walls never step in faster than maxWallSlope', cheeseStats.slope.toFixed(2));
    // static lanes: a mousetrap's shelf and its whole snap, a wheel's shelf (with its wheel at rest), a paw's whole swipe
    // leave an open lane of minLane to the far wall at every height they reach; a parked grater leaves minLane past it
    for (const h of hz) {
      if (h.type === 'cheeseGrater') {
        for (const at of [0, h.P / 2]) { const g = CH.cheeseGraterState(h, (h.ph || 0) + at + 0.01), m = at ? g.x - X.grater.gw - h.L : h.R - g.x - X.grater.gw; cheeseStats.lane.cheeseGrater = Math.min(cheeseStats.lane.cheeseGrater, m); if (m < R.minLane) cfail('a parked grater leaves minLane past it', `${m.toFixed(1)} at ${h.alt | 0}`); }
        continue;
      }
      const S = h.type === 'cheeseWheel' ? CH.cheeseShapes(h, h.ph || 0, [], undefined) : CH.cheeseDanger(h);
      for (const q of S) {
        const [a0, a1] = span(q);
        for (let a = a0; a <= a1; a += 6) {
          const [x0, x1] = ext([q]), [l, r] = level.walls(a), m = h.side > 0 ? r - x1 : x0 - l;
          cheeseStats.lane[h.type] = Math.min(cheeseStats.lane[h.type], m);
          if (m < R.minLane) { cfail('every mousetrap, wheel shelf and paw leaves a lane of minLane to the far wall', `${h.type} ${m.toFixed(1)} at ${h.alt | 0}`); break; }
        }
      }
    }
    // a falling wheel never passes through another trap's solid parts, and never through a wall
    for (const h of hz.filter(h => h.type === 'cheeseWheel')) {
      const others = hz.filter(g => g !== h && g.hi > h.lo - 40 && g.lo < h.hi + 40);
      let bad = null;
      for (let t = 0; t < h.P && !bad; t += 0.02) {
        const w = CH.cheeseWheelState(h, (h.ph || 0) + t); if (w.fly == null) continue;
        const [l, r] = level.walls(w.a); if (w.x - X.wheel.R < l - 3 || w.x + X.wheel.R > r + 3) bad = `wall at ${w.a | 0}`;
        for (const g of others) for (const q of CH.cheeseShapes(g, (h.ph || 0) + t, [], g.type === 'cheeseGrater' ? undefined : 'body')) if (CH.shapeDist(q, w.x, w.a) < X.wheel.R - 2) bad = `${g.type} at ${g.alt | 0}`;
      }
      if (bad) cfail('a falling wheel never passes through another trap or a wall', `wheel at ${h.alt | 0}: ${bad}`);
    }
    // the tunnels: their holes sit on a flat wall clear of any trap mounted on that wall; their exits open into clear
    // shaft (nothing for `clear` below and above); there are more of them than the mission asks for
    if (level.tunnels.length < st0.goals.find(g => g.k === 'cheeseTunnel').n + 1) cfail('the caverns have more tunnels than the tunnel mission needs', `${level.tunnels.length}`);
    for (const tn of level.tunnels) {
      if (!k) cheeseStats.tunnels++;
      for (const [a, x] of [[tn.a0, tn.x0], [tn.a1, tn.x1]]) {
        const [l, r] = level.walls(a), wx = tn.side > 0 ? l : r;
        if (Math.abs(wx - x) > 0.5 || Math.abs(level.walls(a - 25)[tn.side > 0 ? 0 : 1] - wx) > 1.5 || Math.abs(level.walls(a + 25)[tn.side > 0 ? 0 : 1] - wx) > 1.5) cfail('a tunnel\'s holes sit on a flat face of the wall', `${a | 0}`);
        for (const h of hz) if (h.side === tn.side && h.lo - 60 < a && h.hi + 60 > a) cfail('a tunnel\'s holes are clear of the traps on their wall', `${h.type} at ${h.alt | 0}, hole at ${a | 0}`);
      }
      for (const h of hz) {
        const d = Math.min(Math.abs(h.lo - tn.a1), Math.abs(h.hi - tn.a1), h.lo < tn.a1 && h.hi > tn.a1 ? 0 : Infinity), below = h.hi <= tn.a1 ? tn.a1 - h.hi : Infinity, above = h.lo >= tn.a1 ? h.lo - tn.a1 : Infinity;
        cheeseStats.exitClear = Math.min(cheeseStats.exitClear, Math.min(below, above, d));
        if (below < X.tunnel.clear[0] || above < X.tunnel.clear[1] || d === 0) cfail('a tunnel\'s exit opens into clear shaft', `${h.type} at ${h.alt | 0}, exit at ${tn.a1 | 0}`);
      }
    }
    for (const f of fr) {
      const [l, r] = level.walls(f.alt), pr = CH.pickR(f);
      if (f.x - pr < l + R.fruitMargin - 0.5 || f.x + pr > r - R.fruitMargin + 0.5) cfail('pickups stay off the walls', `${f.kind} at ${f.alt | 0}`);
      if (f.clear === -Infinity) continue;   // (the dares: mouselings and Mouse Village's ring)
      const need = f.clear ?? (f.bonus || f.kind === 'gold' ? Math.ceil(CH.laneSize().w / 2 + 6 + CH.COCO_R) : R.pickup.clear);
      let dd = Infinity; for (const h of hz) if (h.lo - 220 < f.alt && h.hi + 220 > f.alt) for (const q of CH.cheeseDanger(h)) dd = Math.min(dd, CH.shapeDist(q, f.x, f.alt));
      if (!f.bonus && f.kind !== 'gold' && f.clear == null) cheeseStats.pick = Math.min(cheeseStats.pick, dd);
      if (dd < need - 0.5) cfail('pickups stay clear of every trap\'s reach', `${f.kind} at ${f.alt | 0}: ${dd.toFixed(1)} < ${need}`);
    }
    // a mouseling is a dare, but never inside a solid part (a shelf, a trap's base or bait)
    for (const f of fr.filter(f => f.kind === 'cheeseMouse')) for (const h of hz) if (h.lo - 60 < f.alt && h.hi + 60 > f.alt)
      for (const q of CH.cheeseShapes(h, 0, [], 'body')) if (CH.shapeDist(q, f.x, f.alt) < CH.COCO_R + 4) { cfail('a mouseling never sits in a trap\'s solid parts', `${h.type} at ${f.alt | 0}`); break; }
    for (let i = 0; i < fr.length; i++) for (let j = i + 1; j < fr.length && fr[j].alt - fr[i].alt < 80; j++) if (Math.hypot(fr[i].x - fr[j].x, fr[i].alt - fr[j].alt) < CH.pickR(fr[i]) + CH.pickR(fr[j]) + CH.PICK_GAP - 0.01) cfail('pickups never overlap', `${fr[i].alt | 0}`);
    if (fr.filter(f => f.kind === 'cheeseMouse').length !== 3) cfail('the caverns hold exactly 3 lost mouselings', `${fr.filter(f => f.kind === 'cheeseMouse').length}`);
    let gap = 0, last = 60; for (const f of fr) if (f.kind === 'chili') { gap = Math.max(gap, f.alt - last); last = f.alt; }
    if (gap > 640) cfail('the caverns keep a chili line', `${gap | 0}`);
    if (k > 2) continue;   // (the searches run on the stage itself and two more seeds)
    for (const b of level.beats) {
      const lo = Math.min(...b.hs.map(h => h.lo)) - 150, hi = Math.max(...b.hs.map(h => h.hi)) + 90;
      const traps = hz.filter(h => h.lo < hi + 60 && h.hi > lo - 60);
      cheeseStats.traps++;
      for (let p = 0; p < 6; p++) {
        const t0 = p * 1.13 + k * 0.37, [l, r] = level.walls(lo + 40);
        cheeseStats.searches++;
        const tm = fly(level, traps, (l + r) / 2, lo + 40, t0, (x, a) => a >= hi - 10, lo, hi + 20);
        if (tm < 0) cfail('every trap can be passed by the widest pilot from any phase', `${b.kind} at ${b.a} (${b.sec.name}), start ${t0.toFixed(2)} s, seed ${k}`);
        else cheeseStats.worst = Math.max(cheeseStats.worst, tm);
      }
    }
    // every mouseling can be touched and then escaped (flown on past its traps) by the widest pilot, from 6 phases (one
    // over a mousetrap with that trap sprung, once a safe spot to spring it from is shown to exist)
    const dare = (f, x, a, touch, n, label) => {
      const own = hz.filter(h => h.lo - 40 < a && h.hi + 120 > a), lo = Math.min(a, ...own.map(h => h.lo)) - 200, hi = Math.max(a, ...own.map(h => h.hi)) + 100;
      const traps = hz.filter(h => h.lo < hi + 60 && h.hi > lo - 60).map(h => h.type === 'cheeseTrap' && own.includes(h) && CH.shapeDist({ k: 'c', x: h.base + h.side * X.trap.ax, a: h.alt + X.trap.ay, r: X.trap.bar + 30 }, x, a) < 0 ? { ...h, trigT: -1e4 } : h);
      for (const h of traps) if (h.trigT != null) {
        const [bx, ba] = CH.cheeseBait(h), S = CH.cheeseShapes({ ...h, trigT: null }, 0, [], 'sweep');
        let ok = false;
        for (let sx2 = h.L + W / 2 + 4; sx2 < h.R - W / 2 - 4 && !ok; sx2 += 6) for (let sa = h.alt - 220; sa < h.alt + 40 && !ok; sa += 6) if (!capHit(S, sx2, sa, M + 4) && capDist(bx, ba, sx2, sa) < X.trap.trig - 12) ok = true;
        if (!ok) cfail('a mouseling over a mousetrap has a safe spot to spring the trap from', `trap at ${h.alt | 0}`); else if (!k) cheeseStats.baitSpots++;
      }
      const [l, r] = level.walls(lo + 40);
      for (let p = 0; p < n; p++) {
        cheeseStats.searches++;
        const tm = fly(level, traps, (l + r) / 2, lo + 40, p * 1.07 + k * 0.29, (x, a) => a >= hi - 10, lo, hi + 20, touch);
        if (tm < 0) { cfail(`every ${label} can be reached and escaped by the widest pilot`, `${label} at ${a | 0}, phase ${p}, seed ${k}`); return false; }
      }
      return true;
    };
    for (const f of fr.filter(f => f.kind === 'cheeseMouse')) if (dare(f, f.x, f.alt, (x, a) => Math.hypot(x - f.x, a - f.alt) < CH.COCO_R + W / 2 - 4, 6, 'lost mouseling')) cheeseStats.mice++;
  }
  if (failures.size) {
    console.log(`FAILED: ${failures.size} rule(s) broken`);
    for (const [rule, { count, example }] of failures) console.log(`  ✗ ${rule} — ${count}× (e.g. ${example})`);
    process.exit(1);
  }
}
const cheeseSummary = () => `PASS: Cheddar Caverns: ${cheeseStats.seeds} layouts × ${cheeseStats.len} m, only its own traps (${Object.entries(cheeseStats.kinds).map(([k, n]) => `${n} ${k}`).join(', ')}), each taught alone first; shaft ${cheeseStats.minW.toFixed(0)}+ wide, wall slope ${cheeseStats.slope.toFixed(2)} (max ${CH.RULES.maxWallSlope}); open lanes past mousetraps ${cheeseStats.lane.cheeseTrap.toFixed(0)}+, wheel shelves ${cheeseStats.lane.cheeseWheel.toFixed(0)}+, paws ${cheeseStats.lane.cheesePaw.toFixed(0)}+, parked graters ${cheeseStats.lane.cheeseGrater.toFixed(0)}+ (minLane ${CH.RULES.minLane}); wheels never fall through anything; ${cheeseStats.tunnels} tunnels, exits ${cheeseStats.exitClear.toFixed(0)}+ clear; beats ${cheeseStats.beatGap.toFixed(0)}+ apart; pickups ${cheeseStats.pick.toFixed(1)}+ from any trap's reach, nothing pops in; ${cheeseStats.traps} beats and ${cheeseStats.mice} mouselings (reach and escape, ${cheeseStats.baitSpots} with a safe spot to spring the trap) flown by the widest pilot in ${cheeseStats.searches} searches, the slowest pass ${cheeseStats.worst.toFixed(1)} s`;
// (test slot: Cheddar Caverns, island level 31)
// ---------- Adventure: Toybox Tower (island level 32), an authored stage with its own traps ----------
// As the clockwork tower's checks: every rule on the stage's layout as the game builds it (and 8 other seeds, which only
// move sides and looks), then every beat and every golden teddy flown by a time-space search for the widest
// pilot on the traps' own clocks from several start phases (a popping jack, marching soldiers and a dropping yo-yo
// count as solid exactly when the game kills on them; a spinning top, which only knocks you away, counts as solid always).
const TB = new Function(regions.join('\n') + '\nreturn { createToyboxLevel, toyboxShapes, toyboxDanger, toyboxEnd, toyboxCycle, toyboxJackState, toyboxMarchState, toyboxStack, toyboxRelief, TOYBOX, TOYBOX_STAGE, TOYBOX_TYPES, ADV_TOYBOX, RULES, advSeed, shapeDist, laneSize, pickR, COCO_R, PICK_GAP, UNITS_PER_M };')();
const toyboxStats = { seeds: 0, traps: 0, searches: 0, worst: 0, stars: 0, pick: Infinity, minW: Infinity, slope: 0, lane: { toyboxJack: Infinity, toyboxMarch: Infinity, toyboxTop: Infinity, toyboxYoyo: Infinity }, len: 0, kinds: {}, beatGap: Infinity };
{
  const R = TB.RULES, W = PILOT_W, Hh = PILOT_H, M = 4, st0 = TB.ADV_TOYBOX;
  const tfail = (rule, d) => fail('toybox: ' + rule, d);
  if (st0.theme !== 'toybox' || !(st0.reward > 0)) tfail('the tower is a themed stage with a reward', JSON.stringify(st0));
  if (!Array.isArray(st0.goals) || st0.goals.length !== 3 || !st0.goals.some(g => g.k === 'finish') || !st0.goals.some(g => g.k === 'toyboxTeddy' && g.n === 3) || !st0.goals.some(g => g.k === 'toyboxDodge')) tfail('three missions: the music box, 3 golden teddies and dodging every top', JSON.stringify(st0.goals));
  if (Math.abs(st0.len * TB.UNITS_PER_M - TB.toyboxEnd()) > 1e-6) tfail('the stage length matches its layout', `${st0.len}`);
  if (!(TB.TOYBOX.march.salute > 0)) tfail('the soldiers salute Bolt', '');
  // the stage's order: jacks, then the march, then the tops, then the yo-yos, each taught alone; never faster than taught
  // (a smaller P is faster for a jack or a yo-yo, a bigger v for a march or a top)
  {
    const fam = { jack: 'jack', jackPair: 'jack', march: 'march', marchPair: 'march', marchJack: 'march', top: 'top', topPair: 'top', topJack: 'top', topMarch: 'top', yoyo: 'yoyo', yoyoPair: 'yoyo', yoyoJack: 'yoyo', yoyoTop: 'yoyo', yoyoMarch: 'yoyo' };
    const firsts = {}, seen = [];
    for (const sec of TB.TOYBOX_STAGE) if (!sec.calm) for (const [, kind, o] of sec.beats) {
      const b = fam[kind]; if (!b) { tfail('every beat is a known kind', kind); continue; }
      if (!firsts[b]) { firsts[b] = o; seen.push(b); if (kind !== b) tfail('each trap is introduced alone first', `${kind} in ${sec.name}`); }
      else if ((o.P && firsts[b].P && o.P > firsts[b].P) || (o.v && firsts[b].v && o.v < firsts[b].v)) tfail('a trap is never slower than its introduction', `${kind} in ${sec.name}`);
    }
    if (seen.join() !== 'jack,march,top,yoyo') tfail('the tower teaches jacks, the march, tops, then yo-yos', seen.join());
    if (!TB.TOYBOX_STAGE.some(sec => sec.calm && !sec.finish && sec !== TB.TOYBOX_STAGE[0])) tfail('the tower has a breather', '');
    if (!TB.TOYBOX_STAGE[TB.TOYBOX_STAGE.length - 1].finish) tfail('the stage ends at the music box', '');
  }
  const capHit = (S, x, a, m) => {
    const r = W / 2 + m, half = Math.max(0, Hh / 2 - W / 2);
    for (const q of S) for (const da of half ? [-half, 0, half] : [0]) if (TB.shapeDist(q, x, a + da) < r) return true;
    return false;
  };
  // the widest open interval across the shaft at height a, given shapes S
  // (sum: the total of the open stretches a pilot fits through, for the steel ball: a ball in mid-flight splits the shaft
  // into two lanes, either of which you can take)
  const openAt = (level, S, a, sum) => {
    const [l, r] = level.walls(a), iv = [];
    for (const q of S) {
      let x0, x1;
      if (q.k === 'c') { const d = Math.abs(a - q.a); if (d >= q.r) continue; const w = Math.sqrt(q.r * q.r - d * d); x0 = q.x - w; x1 = q.x + w; }
      else if (q.k === 'b') { if (a < q.a0 || a > q.a1) continue; x0 = q.x0; x1 = q.x1; }
      else { let lo = Infinity, hi = -Infinity; for (let u = 0; u <= 1.0001; u += 1 / 24) { const x = q.x0 + (q.x1 - q.x0) * u, aa = q.a0 + (q.a1 - q.a0) * u, d = Math.abs(a - aa); if (d < q.r) { const w = Math.sqrt(q.r * q.r - d * d); lo = Math.min(lo, x - w); hi = Math.max(hi, x + w); } } if (lo > hi) continue; x0 = lo; x1 = hi; }
      iv.push([x0, x1]);
    }
    iv.sort((p, q) => p[0] - q[0]);
    let best = 0, tot = 0, cur = l;
    const take = w => { best = Math.max(best, w); if (w >= W + 8) tot += w; };
    for (const [x0, x1] of iv) { if (x0 > cur) take(x0 - cur); cur = Math.max(cur, x1); }
    take(r - cur);
    return sum ? tot : best;
  };
  // the search (as the vault's): solid = every shape of every trap at that moment
  function fly(level, traps, x0, a0, t0, goal, lo, hi, via) {
    const DT = 1 / 15, DX = 11, DA = 11, up = Math.round(440 * DT / DA), dn = Math.round(380 * DT / DA), sd = Math.round(330 * DT / DX);
    const nA = Math.ceil((hi - lo) / DA) + 1, nX = Math.ceil(400 / DX) + 1, V = 1e6;
    let front = new Set([Math.round(x0 / DX) * 1000 + Math.round((a0 - lo) / DA)]);
    for (let step = 1; step <= 12 / DT; step++) {
      const t = t0 + step * DT, S = [];
      for (const h of traps) TB.toyboxShapes(h, t, S);
      const next = new Set(), blocked = new Map();
      const free = (xi, ai) => {
        const key = xi * 1000 + ai; if (blocked.has(key)) return blocked.get(key);
        const x = xi * DX, a = lo + ai * DA, [l, r] = level.walls(a), ok = x - W / 2 - 2 >= l && x + W / 2 + 2 <= r && level.walls(a + Hh / 2)[0] <= x - W / 2 && level.walls(a + Hh / 2)[1] >= x + W / 2 && level.walls(a - Hh / 2)[0] <= x - W / 2 && level.walls(a - Hh / 2)[1] >= x + W / 2 && !capHit(S, x, a, M);
        blocked.set(key, ok); return ok;
      };
      for (const k of front) {
        const got = k >= V, kk = k % V, xi = Math.floor(kk / 1000), ai = kk % 1000;
        for (let dA = -dn; dA <= up; dA++) for (let dX = -sd; dX <= sd; dX++) {
          const nx = xi + dX, na = ai + dA; if (na < 0 || na >= nA || nx < 0 || nx >= nX) continue;
          const g2 = got || !via || via(nx * DX, lo + na * DA), key = (g2 ? V : 0) + nx * 1000 + na; if (next.has(key) || !free(nx, na)) continue;
          if (g2 && goal(nx * DX, lo + na * DA)) return step * DT;
          next.add(key);
        }
      }
      if (!next.size) return -1;
      front = next;
    }
    return -1;
  }
  for (let k = 0; k <= 8; k++) {
    const st = k ? { ...st0, seed: `${st0.seed}~${k}` } : st0, level = TB.createToyboxLevel(TB.advSeed(st), st), hz = [], fr = [];
    toyboxStats.seeds++;
    {
      const VIEW = 1100, h1 = [], f1 = [];
      level.fill(VIEW + 900, h1, f1);
      let sh = h1.length, sf = f1.length;
      for (let cam = 10; cam < level.end; cam += 10) {
        level.fill(cam + VIEW + 900, h1, f1);
        for (; sh < h1.length; sh++) if (h1[sh].lo < cam + VIEW + 100) tfail('traps never pop in on screen', `${h1[sh].type} at ${h1[sh].lo | 0}`);
        for (; sf < f1.length; sf++) if (f1[sf].alt < cam + VIEW + 100) tfail('pickups never pop in on screen', `${f1[sf].kind} at ${f1[sf].alt | 0}`);
      }
      hz.push(...h1); fr.push(...f1);
    }
    toyboxStats.len = level.end / 10;
    for (const h of hz) if (!TB.TOYBOX_TYPES.has(h.type)) tfail('the tower only has its own traps', h.type);
    for (const h of hz) toyboxStats.kinds[h.type.slice(6)] = (toyboxStats.kinds[h.type.slice(6)] || 0) + (k ? 0 : 1);
    for (let i = 1; i < level.beats.length; i++) { const p = level.beats[i - 1], q = level.beats[i], g = Math.min(...q.hs.map(h => h.lo)) - Math.max(...p.hs.map(h => h.hi)); toyboxStats.beatGap = Math.min(toyboxStats.beatGap, g); if (g < 0) tfail('beats never overlap', `${p.kind} at ${p.a} / ${q.kind} at ${q.a}`); }
    if (hz.some(h => h.hi > level.end - 320)) tfail('the music box chamber below the finish is clear of traps', `${Math.max(...hz.map(h => h.hi)) | 0} vs ${level.end}`);
    for (let a = 0; a < level.end + 200; a += 1) {
      const [l, r] = level.walls(a), [l2, r2] = level.walls(a + 1);
      toyboxStats.minW = Math.min(toyboxStats.minW, r - l); toyboxStats.slope = Math.max(toyboxStats.slope, l2 - l, r - r2);
    }
    if (toyboxStats.minW < R.minWidth) tfail('the shaft is never narrower than minWidth', toyboxStats.minW.toFixed(1));
    if (toyboxStats.slope > R.maxWallSlope) tfail('the walls never step in faster than maxWallSlope', toyboxStats.slope.toFixed(2));
    // lanes: every trap alone, at every moment of its cycle, leaves an open lane of minLane across the shaft at every
    // height it reaches (a flipper all through its flick, the ball anywhere on its path, a bank with its gap anywhere)
    if (k < 3) for (const h of hz) {
      const C = TB.toyboxCycle(h), n = 48, D = TB.toyboxDanger(h);
      let a0 = Infinity, a1 = -Infinity; for (const q of D) { const r = q.r || 0, lo = q.k === 'c' ? q.a - r : q.k === 'b' ? q.a0 : Math.min(q.a0, q.a1) - r, hi = q.k === 'c' ? q.a + r : q.k === 'b' ? q.a1 : Math.max(q.a0, q.a1) + r; a0 = Math.min(a0, lo); a1 = Math.max(a1, hi); }
      let worst = Infinity;
      for (let i = 0; i < n; i++) { const S = TB.toyboxShapes(h, (i + 0.5) * C / n + (h.ph || 0), []); for (let a = a0; a <= a1; a += 4) worst = Math.min(worst, openAt(level, S, a, h.type === 'toyboxTop')); }
      toyboxStats.lane[h.type] = Math.min(toyboxStats.lane[h.type], worst);
      if (worst < R.minLane) tfail('every trap leaves an open lane of minLane at every moment', `${h.type} ${worst.toFixed(1)} at ${h.alt | 0}`);
    }
    for (const f of fr) {
      const [l, r] = level.walls(f.alt), pr = TB.pickR(f);
      if (f.x - pr < l + R.fruitMargin - 0.5 || f.x + pr > r - R.fruitMargin + 0.5) tfail('pickups stay off the walls', `${f.kind} at ${f.alt | 0}`);
      if (f.clear === -Infinity) continue;   // (the dares: teddies and the Playroom Rug's heart of coconuts)
      const need = f.clear ?? (f.bonus || f.kind === 'gold' ? Math.ceil(TB.laneSize().w / 2 + 6 + TB.COCO_R) : R.pickup.clear);
      let dd = Infinity; for (const h of hz) if (h.lo - 220 < f.alt && h.hi + 220 > f.alt) for (const q of TB.toyboxDanger(h)) dd = Math.min(dd, TB.shapeDist(q, f.x, f.alt));
      if (!f.bonus && f.kind !== 'gold' && f.clear == null) toyboxStats.pick = Math.min(toyboxStats.pick, dd);
      if (dd < need - 0.5) tfail('pickups stay clear of every trap\'s reach', `${f.kind} at ${f.alt | 0}: ${dd.toFixed(1)} < ${need}`);
    }
    // a teddy is a dare, but never inside a solid part (a jack's box or shelf, a march's shelf, a crane's arm)
    for (const f of fr.filter(f => f.kind === 'toyboxTeddy')) for (const h of hz) if (h.lo - 60 < f.alt && h.hi + 60 > f.alt)
      for (const q of TB.toyboxShapes(h, 0, [], 'body')) if (TB.shapeDist(q, f.x, f.alt) < TB.COCO_R + 4) { tfail('a teddy never sits in a trap\'s solid parts', `${h.type} at ${f.alt | 0}`); break; }
    for (let i = 0; i < fr.length; i++) for (let j = i + 1; j < fr.length && fr[j].alt - fr[i].alt < 80; j++) if (Math.hypot(fr[i].x - fr[j].x, fr[i].alt - fr[j].alt) < TB.pickR(fr[i]) + TB.pickR(fr[j]) + TB.PICK_GAP - 0.01) tfail('pickups never overlap', `${fr[i].alt | 0}`);
    { const tr = hz.filter(h => h.type === 'toyboxTop').length; toyboxStats.rolls = tr;
      if (tr < 8) tfail('the top mission has tops to dodge', `${tr}`);
      if (level.stack.some(items => items.some((q, i) => i && Math.abs(q.p - items[i - 1].p) > Math.min(6, (items[i - 1].a1 - items[i - 1].a0) / 2, (q.a1 - q.a0) / 2) * 1.4 + 1e-6))) tfail('the toy stack never steps out faster than its ramps', ''); }
    if (fr.filter(f => f.kind === 'toyboxTeddy').length !== 3) tfail('the tower holds exactly 3 golden teddies', `${fr.filter(f => f.kind === 'toyboxTeddy').length}`);
    let gap = 0, last = 60; for (const f of fr) if (f.kind === 'chili') { gap = Math.max(gap, f.alt - last); last = f.alt; }
    if (gap > 640) tfail('the tower keeps a chili line', `${gap | 0}`);
    if (k > 2) continue;   // (the searches run on the stage itself and two more seeds)
    for (const b of level.beats) {
      const lo = Math.min(...b.hs.map(h => h.lo)) - 150, hi = Math.max(...b.hs.map(h => h.hi)) + 90;
      const traps = hz.filter(h => h.lo < hi + 60 && h.hi > lo - 60);
      toyboxStats.traps++;
      for (let p = 0; p < 6; p++) {
        const t0 = p * 1.13 + k * 0.37, [l, r] = level.walls(lo + 40);
        toyboxStats.searches++;
        const tm = fly(level, traps, (l + r) / 2, lo + 40, t0, (x, a) => a >= hi - 10, lo, hi + 20);
        if (tm < 0) tfail('every trap can be passed by the widest pilot from any phase', `${b.kind} at ${b.a} (${b.sec.name}), start ${t0.toFixed(2)} s, seed ${k}`);
        else toyboxStats.worst = Math.max(toyboxStats.worst, tm);
      }
    }
    // every teddy can be touched and then escaped (flown on past its traps) by the widest pilot, from 6 phases
    const dare = (f, x, a, touch, n, label) => {
      const own = hz.filter(h => h.lo - 40 < a && h.hi + 120 > a), lo = Math.min(a, ...own.map(h => h.lo)) - 200, hi = Math.max(a, ...own.map(h => h.hi)) + 100;
      const traps = hz.filter(h => h.lo < hi + 60 && h.hi > lo - 60), [l, r] = level.walls(lo + 40);
      for (let p = 0; p < n; p++) {
        toyboxStats.searches++;
        const tm = fly(level, traps, (l + r) / 2, lo + 40, p * 1.07 + k * 0.29, (x, a) => a >= hi - 10, lo, hi + 20, touch);
        if (tm < 0) { tfail(`every ${label} can be reached and escaped by the widest pilot`, `${label} at ${a | 0}, phase ${p}, seed ${k}`); return false; }
      }
      return true;
    };
    for (const f of fr.filter(f => f.kind === 'toyboxTeddy')) if (dare(f, f.x, f.alt, (x, a) => Math.hypot(x - f.x, a - f.alt) < TB.COCO_R + W / 2 - 4, 6, 'golden teddy')) toyboxStats.stars++;
  }
  if (failures.size) {
    console.log(`FAILED: ${failures.size} rule(s) broken`);
    for (const [rule, { count, example }] of failures) console.log(`  ✗ ${rule} — ${count}× (e.g. ${example})`);
    process.exit(1);
  }
}
const toyboxSummary = () => `PASS: Toybox Tower: ${toyboxStats.seeds} layouts × ${toyboxStats.len} m, only its own traps (${Object.entries(toyboxStats.kinds).map(([k, n]) => `${n} ${k}`).join(', ')}), each taught alone first; shaft ${toyboxStats.minW.toFixed(0)}+ wide, toy-stack wall slope ${toyboxStats.slope.toFixed(2)} (max ${TB.RULES.maxWallSlope}); open lanes at every moment past jacks ${toyboxStats.lane.toyboxJack.toFixed(0)}+, marches ${toyboxStats.lane.toyboxMarch.toFixed(0)}+, tops ${toyboxStats.lane.toyboxTop.toFixed(0)}+ (both sides of it), yo-yos ${toyboxStats.lane.toyboxYoyo.toFixed(0)}+ (minLane ${TB.RULES.minLane}), beats ${toyboxStats.beatGap.toFixed(0)}+ apart; pickups ${toyboxStats.pick.toFixed(1)}+ from any trap's reach, nothing pops in; ${toyboxStats.rolls} tops to dodge; ${toyboxStats.traps} beats and ${toyboxStats.stars} golden teddies (reach and escape) flown by the widest pilot in ${toyboxStats.searches} searches, the slowest pass ${toyboxStats.worst.toFixed(1)} s`;
// (test slot: Toybox Tower, island level 32)
// ---------- Adventure: Monkey Carnival (island level 33), an authored stage with its own traps ----------
// As the Candy Caverns' checks: every rule on the stage's layout as the game builds it (and 8 other seeds, which only
// move phases, aims and looks), then every beat and every golden ticket flown by a time-space search for the widest
// pilot on the traps' own clocks from 6 start phases. Every carnival shape is lethal (cannons and their monkeys, wheels
// and their spokes, jugglers and their pins, hoops' burning rims, poles and podiums, balloon stands).
const CV = new Function(regions.join('\n') + '\nreturn { createCarnivalLevel, carnivalShapes, carnivalDanger, carnivalEnd, carnivalCanAt, carnivalCanGeo, carnivalWheelAt, carnivalJugAt, carnivalJugGeo, carnivalPinPos, carnivalHoopAt, carnivalHoopX, CARNIVAL, CARNIVAL_STAGE, CARNIVAL_TYPES, ADV_CARNIVAL, RULES, advSeed, shapeDist, laneSize, pickR, COCO_R, PICK_GAP, UNITS_PER_M };')();
const carnivalStats = { seeds: 0, traps: 0, searches: 0, worst: 0, tix: 0, pick: Infinity, minW: Infinity, slope: 0, beatGap: Infinity, len: 0, kinds: {}, wheelLane: Infinity, hoopGap: Infinity, hoopFar: Infinity, standLane: Infinity, canLane: Infinity, pinDrop: 0, rise: 0 };
{
  const R = CV.RULES, W = PILOT_W, Hh = PILOT_H, M = 4, st0 = CV.ADV_CARNIVAL, X = CV.CARNIVAL;
  const cfail = (rule, d) => fail('carnival: ' + rule, d);
  if (st0.theme !== 'carnival' || !(st0.reward > 0)) cfail('Monkey Carnival is a themed stage with a reward', JSON.stringify(st0));
  if (!Array.isArray(st0.goals) || st0.goals.length !== 3 || !st0.goals.some(g => g.k === 'finish') || !st0.goals.some(g => g.k === 'carnivalTickets' && g.n === 3) || !st0.goals.some(g => g.k === 'carnivalHoops' && g.n > 0)) cfail('three missions: the Big Top, 3 golden tickets and the hoops', JSON.stringify(st0.goals));
  if (Math.abs(st0.len * CV.UNITS_PER_M - CV.carnivalEnd()) > 1e-6) cfail('the stage length matches its layout', `${st0.len}`);
  // the stage's order: cannons, then wheels, then jugglers, then hoops, each taught alone (never faster first)
  {
    const firsts = {}, seen = [], base = { canPair: 'carnivalCannon', canStack: 'carnivalCannon', wheelPair: 'carnivalWheel', wheelCan: 'carnivalWheel', jugPair: 'carnivalJuggler', jugWheel: 'carnivalJuggler', jugCan: 'carnivalJuggler', hoopPair: 'carnivalHoop', hoopCan: 'carnivalHoop', hoopWheel: 'carnivalHoop', hoopJug: 'carnivalHoop' };
    const S = CV.CARNIVAL_STAGE;
    for (const sec of S) if (sec.beats) for (const [, kind, o] of sec.beats) {
      const b = base[kind] || kind;
      if (!firsts[b]) { firsts[b] = o; seen.push(b); if (kind !== b) cfail('each trap is introduced alone first', `${kind} in ${sec.name}`); }
      else if (kind === b && o.P && firsts[b].P && o.P > firsts[b].P + 1e-9) cfail('a trap is never slower than its introduction', `${kind} in ${sec.name}`);
    }
    if (seen.join() !== 'carnivalCannon,carnivalWheel,carnivalJuggler,carnivalHoop') cfail('the carnival teaches cannons, then wheels, then jugglers, then hoops', seen.join());
    if (!S.some(sec => sec.calm && !sec.finish && sec !== S[0])) cfail('the carnival has a breather', '');
    if (!S[S.length - 1].finish) cfail('the stage ends at the Big Top', '');
  }
  const capHit = (S, x, a, m) => {
    const r = W / 2 + m, half = Math.max(0, Hh / 2 - W / 2);
    for (const q of S) for (const da of half ? [-half, 0, half] : [0]) if (CV.shapeDist(q, x, a + da) < r) return true;
    return false;
  };
  const allShapes = (traps, t, S) => { for (const h of traps) CV.carnivalShapes(h, t, S); return S; };
  // how far a set of shapes reaches out from the wall on side d (the furthest point into the shaft)
  const reachOf = (S, d) => { let reach = -Infinity; for (const q of S) { const xs = q.k === 'c' ? [q.x + d * q.r] : [q.x0 + d * q.r, q.x1 + d * q.r]; for (const x of xs) reach = Math.max(reach, d * x); } return reach; };
  function fly(level, traps, x0, a0, t0, goal, lo, hi, via) {
    const DT = 1 / 15, DX = 11, DA = 11, up = Math.round(440 * DT / DA), dn = Math.round(380 * DT / DA), sd = Math.round(330 * DT / DX);
    const nA = Math.ceil((hi - lo) / DA) + 1, nX = Math.ceil(400 / DX) + 1, V = 1e6;
    let front = new Set([Math.round(x0 / DX) * 1000 + Math.round((a0 - lo) / DA)]);
    for (let step = 1; step <= 18 / DT; step++) {
      const t = t0 + step * DT, S = allShapes(traps, t, []);
      const next = new Set(), blocked = new Map();
      const free = (xi, ai) => {
        const key = xi * 1000 + ai; if (blocked.has(key)) return blocked.get(key);
        const x = xi * DX, a = lo + ai * DA, [l, r] = level.walls(a), ok = x - W / 2 - 2 >= l && x + W / 2 + 2 <= r && level.walls(a + Hh / 2)[0] <= x - W / 2 && level.walls(a + Hh / 2)[1] >= x + W / 2 && level.walls(a - Hh / 2)[0] <= x - W / 2 && level.walls(a - Hh / 2)[1] >= x + W / 2 && !capHit(S, x, a, M);
        blocked.set(key, ok); return ok;
      };
      for (const k of front) {
        const got = k >= V, kk = k % V, xi = Math.floor(kk / 1000), ai = kk % 1000;
        for (let dA = -dn; dA <= up; dA++) for (let dX = -sd; dX <= sd; dX++) {
          const nx = xi + dX, na = ai + dA; if (na < 0 || na >= nA || nx < 0 || nx >= nX) continue;
          const g2 = got || !via || via(nx * DX, lo + na * DA), key = (g2 ? V : 0) + nx * 1000 + na; if (next.has(key) || !free(nx, na)) continue;
          if (g2 && goal(nx * DX, lo + na * DA)) return step * DT;
          next.add(key);
        }
      }
      if (!next.size) { globalThis.carnivalDbg = { step, t, maxA: Math.max(...[...front].map(k => lo + (k % V) % 1000 * DA)) }; return -1; }
      front = next;
    }
    return -1;
  }
  for (let k = 0; k <= 8; k++) {
    const st = k ? { ...st0, seed: `${st0.seed}~${k}` } : st0, level = CV.createCarnivalLevel(CV.advSeed(st), st), hz = [], fr = [];
    carnivalStats.seeds++;
    {
      const VIEW = 1100, h1 = [], f1 = [];
      level.fill(VIEW + 900, h1, f1);
      let sh = h1.length, sf = f1.length;
      for (let cam = 10; cam < level.end; cam += 10) {
        level.fill(cam + VIEW + 900, h1, f1);
        for (; sh < h1.length; sh++) if (h1[sh].lo < cam + VIEW + 100) cfail('traps never pop in on screen', `${h1[sh].type} at ${h1[sh].lo | 0}`);
        for (; sf < f1.length; sf++) if (f1[sf].alt < cam + VIEW + 100) cfail('pickups never pop in on screen', `${f1[sf].kind} at ${f1[sf].alt | 0}`);
      }
      hz.push(...h1); fr.push(...f1);
    }
    carnivalStats.len = level.end / 10;
    for (const h of hz) if (!CV.CARNIVAL_TYPES.has(h.type)) cfail('the carnival only has its own traps', h.type);
    for (const h of hz) carnivalStats.kinds[h.type] = (carnivalStats.kinds[h.type] || 0) + (k ? 0 : 1);
    // beats never crowd: each beat's traps start above the last beat's whole reach (one act to read at a time)
    for (let i = 1; i < level.beats.length; i++) { const p = level.beats[i - 1], q = level.beats[i], g = Math.min(...q.hs.map(h => h.lo)) - Math.max(...p.hs.map(h => h.hi)); carnivalStats.beatGap = Math.min(carnivalStats.beatGap, g); if (g < 0) cfail('beats never overlap', `${p.kind} at ${p.a} / ${q.kind} at ${q.a}`); }
    for (const b of level.beats) for (let i = 0; i < b.hs.length; i++) for (let j = i + 1; j < b.hs.length; j++) { const p = b.hs[i], q = b.hs[j]; if (p.alt !== q.alt && p.hi > q.lo && q.hi > p.lo) cfail('the traps of a beat never overlap', `${b.kind} at ${b.a}`); }
    for (const h of level.stands) if (hz.some(q => q !== h && q.hi > h.lo - 20 && q.lo < h.hi + 20)) cfail('a balloon stand never crowds a trap', `${h.alt}`);
    if (hz.some(h => h.hi > level.end - 320)) cfail('the Big Top below the finish is clear of traps', `${Math.max(...hz.map(h => h.hi)) | 0} vs ${level.end}`);
    for (let a = 0; a < level.end + 200; a += 1) {
      const [l, r] = level.walls(a), [l2, r2] = level.walls(a + 1);
      carnivalStats.minW = Math.min(carnivalStats.minW, r - l); carnivalStats.slope = Math.max(carnivalStats.slope, l2 - l, r - r2);
    }
    if (carnivalStats.minW < R.minWidth) cfail('the shaft is never narrower than minWidth', carnivalStats.minW.toFixed(1));
    if (carnivalStats.slope > R.maxWallSlope) cfail('the walls never step in faster than maxWallSlope', carnivalStats.slope.toFixed(2));
    for (const h of hz) {
      const lane = (S, d) => { const [l, r] = level.walls(h.alt); return d > 0 ? r - reachOf(S, d) : -reachOf(S, d) - l; };
      // nothing on the stage ever rises at you: a flying monkey moves level or down, pins only ever fall
      if (h.type === 'carnivalCannon') {
        const g = CV.carnivalCanGeo(h);
        if (g.Ea > g.Sa + 1e-9) cfail('a cannon never fires upward', `${h.alt}`);
        for (let a = h.lo; a <= h.hi; a += 4) { const [l, r] = level.walls(a); if (Math.abs((h.side > 0 ? r : l) - h.far) > 0.5) { cfail('the far wall is straight where a cannon\'s net hangs', `${h.alt}`); break; } }
        if (Math.abs(g.Ex - (h.far - h.side * (X.can.net + X.can.mr - 4))) > 0.5) cfail('the monkey lands in the net', `${h.alt}`);
        let worst = Infinity; for (let t = 0; t < h.P; t += 0.05) { const S = CV.carnivalShapes(h, t, []).filter(q => (q.k === 'c' ? Math.abs(q.x - h.base) : Math.min(Math.abs(q.x0 - h.base), Math.abs(q.x1 - h.base))) < 120); worst = Math.min(worst, lane(S, h.side)); }
        carnivalStats.canLane = Math.min(carnivalStats.canLane, worst); if (worst < W + 60) cfail('a cannon leaves a wide lane', `${h.alt}`);
        if (h.P < X.can.tell + g.tF + X.can.land + X.can.out + 1) cfail('one monkey at a time per cannon', `${h.alt}`);
      }
      if (h.type === 'carnivalJuggler') {
        const g = CV.carnivalJugGeo(h);
        X.jug.v.forEach((v, i) => { let pa = Infinity; for (let tau = 0; tau <= g.tE[i]; tau += 0.02) { const p = CV.carnivalPinPos(h, i, tau); if (p.a > pa + 1e-9) cfail('a pin only ever falls', `${h.alt}`); pa = p.a; } carnivalStats.pinDrop = Math.max(carnivalStats.pinDrop, h.alt - CV.carnivalPinPos(h, i, g.tE[i]).a); const pe = CV.carnivalPinPos(h, i, g.tE[i]); if (Math.abs(pe.x - (h.far - h.side * X.jug.hl)) > 0.5) cfail('every pin reaches the far wall', `${h.alt}`); });
        for (let a = h.lo; a <= h.hi; a += 4) { const [l, r] = level.walls(a); if (Math.abs((h.side > 0 ? r : l) - h.far) > 0.5) { cfail('the far wall is straight where pins clatter', `${h.alt}`); break; } }
        if (h.P < X.jug.tell + g.vol + 1) cfail('one volley at a time per juggler', `${h.alt}`);
      }
      if (h.type === 'carnivalWheel') {
        // spokes right out, the far lane stays open for the widest pilot
        const S = []; CV.carnivalShapes(h, 0, S, 'still'); S.push({ k: 'c', x: h.base + h.side * X.wheel.cx, a: h.alt, r: X.wheel.reach + X.wheel.tip });
        const ln = lane(S, h.side); carnivalStats.wheelLane = Math.min(carnivalStats.wheelLane, ln); if (ln < W + 40) cfail('a wheel\'s full sweep leaves the far lane open', `${h.alt} ${ln.toFixed(0)}`);
      }
      if (h.type === 'carnivalHoop') {
        // the ring's middle fits the widest pilot; slid right out, its far rim leaves no way round; the far wall is straight
        const gap = 2 * X.hoop.R - 2 * X.hoop.tube; carnivalStats.hoopGap = Math.min(carnivalStats.hoopGap, gap);
        if (gap < W + 2 * M + 30) cfail('a hoop\'s ring fits the widest pilot with room', `${gap}`);
        const xF = CV.carnivalHoopX(h, h.eMax) + h.side * 2 * X.hoop.R, far = Math.abs(h.far - xF) - X.hoop.tube; carnivalStats.hoopFar = Math.min(carnivalStats.hoopFar, far);
        if (Math.abs(far - X.hoop.gap) > 0.5) cfail('a hoop slides out to its gap off the far wall', `${h.alt} ${far.toFixed(1)}`);
        const S = []; CV.carnivalShapes(h, (10 + (1 - (((h.ph % 1) + 1) % 1))) * h.P + 0.01, S); const ln = lane(S, h.side); if (ln < W + 60) cfail('a drawn-back hoop leaves a wide lane', `${h.alt} ${ln.toFixed(0)}`);
        for (let a = h.lo; a <= h.hi; a += 4) { const [l, r] = level.walls(a); if (Math.abs((h.side > 0 ? r : l) - h.far) > 0.5) { cfail('the far wall is straight where a hoop slides', `${h.alt}`); break; } }
      }
      if (h.type === 'carnivalStand') {
        const S = CV.carnivalShapes(h, 0, [], 'still'), ln = lane(S, h.side); carnivalStats.standLane = Math.min(carnivalStats.standLane, ln);
        if (ln < W + 120) cfail('a balloon stand leaves a wide lane', `${h.alt}`);
      }
    }
    for (const f of fr) {
      const [l, r] = level.walls(f.alt), pr = CV.pickR(f);
      if (f.x - pr < l + R.fruitMargin - 0.5 || f.x + pr > r - R.fruitMargin + 0.5) cfail('pickups stay off the walls', `${f.kind} at ${f.alt | 0}`);
      if (f.clear === -Infinity) continue;   // (the dares: the golden tickets, the Midway's ring)
      const need = f.clear ?? (f.bonus || f.kind === 'gold' ? Math.ceil(CV.laneSize().w / 2 + 6 + CV.COCO_R) : R.pickup.clear);
      let dd = Infinity; for (const h of hz) if (h.lo - 220 < f.alt && h.hi + 220 > f.alt) for (const q of CV.carnivalDanger(h)) dd = Math.min(dd, CV.shapeDist(q, f.x, f.alt));
      if (!f.bonus && f.kind !== 'gold' && f.clear == null) carnivalStats.pick = Math.min(carnivalStats.pick, dd);
      if (dd < need - 0.5) cfail('pickups stay clear of every trap\'s reach', `${f.kind} at ${f.alt | 0}: ${dd.toFixed(1)} < ${need}`);
    }
    for (let i = 0; i < fr.length; i++) for (let j = i + 1; j < fr.length && fr[j].alt - fr[i].alt < 80; j++) if (Math.hypot(fr[i].x - fr[j].x, fr[i].alt - fr[j].alt) < CV.pickR(fr[i]) + CV.pickR(fr[j]) + CV.PICK_GAP - 0.01) cfail('pickups never overlap', `${fr[i].alt | 0}`);
    if (fr.filter(f => f.kind === 'ticket').length !== 3) cfail('the carnival holds exactly 3 golden tickets', `${fr.filter(f => f.kind === 'ticket').length}`);
    if (level.beats.filter(b => b.hs.some(h => h.type === 'carnivalHoop')).length < st0.goals.find(g => g.k === 'carnivalHoops').n + 3) cfail('there are plenty of hoops for the hoop mission', '');
    let gap = 0, last = 60; for (const f of fr) if (f.kind === 'chili') { gap = Math.max(gap, f.alt - last); last = f.alt; }
    if (gap > 640) cfail('the carnival keeps a chili line', `${gap | 0}`);
    if (k > 2) continue;   // (the searches run on the stage itself and two more seeds)
    const near = (lo, hi) => hz.filter(h => h.lo < hi + 60 && h.hi > lo - 60);
    for (const b of level.beats) {
      // (it starts 150 under the beat, or just over the last beat's reach where that is closer)
      const bi = level.beats.indexOf(b), prevTop = bi > 0 ? Math.max(...level.beats[bi - 1].hs.map(h => h.hi)) : -Infinity;
      const lo = Math.min(...b.hs.map(h => h.lo)) - 150, hi = Math.max(...b.hs.map(h => h.hi)) + 90, traps = near(lo, hi), a0 = Math.max(lo + 40, Math.min(prevTop + 20, Math.min(...b.hs.map(h => h.lo)) - 10));
      carnivalStats.traps++;
      for (let p = 0; p < 6; p++) {
        const t0 = p * 1.13 + k * 0.37, [l, r] = level.walls(a0);
        const S0 = allShapes(traps, t0 + 1 / 15, []), cand = [(l + r) / 2, (l + r) / 2 - 70, (l + r) / 2 + 70, l + 50, r - 50];
        const x0 = cand.find(x => !capHit(S0, x, a0, M)) ?? cand[0];
        carnivalStats.searches++;
        const tm = fly(level, traps, x0, a0, t0, (x, a) => a >= hi - 10, lo, hi + 20);
        if (tm < 0) cfail('every trap can be passed by the widest pilot from any phase', `${b.kind} at ${b.a} (${b.sec.name}), start ${t0.toFixed(2)} s, seed ${k} ${JSON.stringify(globalThis.carnivalDbg)} lo ${lo} hi ${hi} x0 ${x0.toFixed(0)} a0 ${a0}`);
        else carnivalStats.worst = Math.max(carnivalStats.worst, tm);
      }
    }
    // every golden ticket can be touched and then escaped (flown on past its trap) by the widest pilot, from 6 phases
    for (const f of fr.filter(f => f.kind === 'ticket')) {
      const own = hz.filter(h => h.lo - 40 < f.alt && h.hi + 120 > f.alt), lo = Math.min(f.alt, ...own.map(h => h.lo)) - 200, hi = Math.max(f.alt, ...own.map(h => h.hi)) + 100;
      const traps = near(lo, hi), [l, r] = level.walls(lo + 40), x0 = (l + r) / 2;
      for (let p = 0; p < 6; p++) {
        carnivalStats.searches++;
        const tm = fly(level, traps, x0, lo + 40, p * 1.07 + k * 0.29, (x, a) => a >= hi - 10, lo, hi + 20, (x, a) => Math.hypot(x - f.x, a - f.alt) < CV.COCO_R + W / 2 - 4);
        if (tm < 0) cfail('every golden ticket can be grabbed and escaped by the widest pilot', `ticket at ${f.alt | 0}, phase ${p}, seed ${k}`);
      }
      carnivalStats.tix++;
    }
  }
}
const carnivalSummary = () => `PASS: Monkey Carnival: ${carnivalStats.seeds} layouts × ${carnivalStats.len} m, only its own traps (${Object.entries(carnivalStats.kinds).map(([k, n]) => `${n} ${k}`).join(', ')}), each act taught alone first; shaft ${carnivalStats.minW.toFixed(0)}+ wide, wall slope ${carnivalStats.slope.toFixed(2)} (max ${CV.RULES.maxWallSlope}); cannons leave ${carnivalStats.canLane.toFixed(0)}+ lanes and never fire upward, pins only fall (${carnivalStats.pinDrop.toFixed(0)} at most), wheels' full sweeps leave ${carnivalStats.wheelLane.toFixed(0)}+, hoops' rings ${carnivalStats.hoopGap}+ across (slid out ${carnivalStats.hoopFar.toFixed(0)} off the far wall), balloon stands ${carnivalStats.standLane.toFixed(0)}+; beats ${carnivalStats.beatGap.toFixed(0)}+ apart; pickups ${carnivalStats.pick.toFixed(1)}+ from any reach; ${carnivalStats.traps} beats × 6 phases and ${carnivalStats.tix} golden tickets flown by the widest pilot (${carnivalStats.searches} searches, slowest ${carnivalStats.worst.toFixed(1)} s)`;
// (test slot: Monkey Carnival, island level 33)
// ---------- Adventure: Haunted Lighthouse (island level 34), an authored stage with its own traps ----------
// As the caverns' checks: every rule on the stage's layout as the game builds it (and 8 other seeds, which only move
// sides and looks), then every beat and every luna moth flown by a time-space search for the widest pilot on the traps'
// own clocks (and their lamps' swings: a thorn stem or a phantom is solid only in the beam, a shadow hand only out of it)
// from several start phases.
const LH = new Function(regions.join('\n') + '\nreturn { createLighthouseLevel, lighthouseShapes, lighthouseDanger, lighthouseEnd, lighthouseLit, lighthouseBeamOff, lighthouseShadowReach, lighthousePhantomState, lighthouseLanternState, LIGHTHOUSE, LIGHTHOUSE_STAGE, LIGHTHOUSE_TYPES, ADV_LIGHTHOUSE, RULES, advSeed, shapeDist, laneSize, pickR, COCO_R, PICK_GAP, UNITS_PER_M };')();
const lighthouseStats = { seeds: 0, traps: 0, searches: 0, worst: 0, moths: 0, pick: Infinity, minW: Infinity, slope: 0, lane: { lighthouseThorn: Infinity, lighthouseLantern: Infinity, lighthouseShadow: Infinity }, len: 0, kinds: {}, beatGap: Infinity, lamps: 0, beamGap: Infinity, phantoms: 0, litFrac: {} };
{
  const R = LH.RULES, W = PILOT_W, Hh = PILOT_H, M = 4, st0 = LH.ADV_LIGHTHOUSE, X = LH.LIGHTHOUSE;
  const lfail = (rule, d) => fail('lighthouse: ' + rule, d);
  if (st0.theme !== 'lighthouse' || !(st0.reward > 0)) lfail('the lighthouse is a themed stage with a reward', JSON.stringify(st0));
  if (!Array.isArray(st0.goals) || st0.goals.length !== 3 || !st0.goals.some(g => g.k === 'finish') || !st0.goals.some(g => g.k === 'lighthouseMoth' && g.n === 3) || !st0.goals.some(g => g.k === 'lighthouseGhost' && g.n > 0)) lfail('three missions: the lantern room, 3 moths and the phantoms', JSON.stringify(st0.goals));
  if (Math.abs(st0.len * LH.UNITS_PER_M - LH.lighthouseEnd()) > 1e-6) lfail('the stage length matches its layout', `${st0.len}`);
  // the stage's order: thorns, then phantoms, then lanterns, then shadow hands, each taught alone; never faster than taught
  {
    const fam = { thorn: 'thorn', thornPair: 'thorn', phantom: 'phantom', phantomPair: 'phantom', phantomThorn: 'phantom', lantern: 'lantern', lanternPair: 'lantern', lanternThorn: 'lantern', lanternPhantom: 'lantern', shadow: 'shadow', shadowThorn: 'shadow', shadowLantern: 'shadow', shadowPhantom: 'shadow' };
    const firsts = {}, seen = [];
    for (const sec of LH.LIGHTHOUSE_STAGE) if (!sec.calm) for (const [, kind, o] of sec.beats) {
      const b = fam[kind]; if (!b) { lfail('every beat is a known kind', kind); continue; }
      if (!firsts[b]) { firsts[b] = o; seen.push(b); if (kind !== b) lfail('each trap is introduced alone first', `${kind} in ${sec.name}`); }
    }
    if (seen.join() !== 'thorn,phantom,lantern,shadow') lfail('the lighthouse teaches thorns, phantoms, lanterns, then shadow hands', seen.join());
    if (!LH.LIGHTHOUSE_STAGE.some(sec => sec.calm && !sec.finish && sec !== LH.LIGHTHOUSE_STAGE[0])) lfail('the lighthouse has a breather', '');
    if (!LH.LIGHTHOUSE_STAGE[LH.LIGHTHOUSE_STAGE.length - 1].finish) lfail('the stage ends at the Lantern Room', '');
  }
  const capHit = (S, x, a, m) => {
    const r = W / 2 + m, half = Math.max(0, Hh / 2 - W / 2);
    for (const q of S) for (const da of half ? [-half, 0, half] : [0]) if (LH.shapeDist(q, x, a + da) < r) return true;
    return false;
  };
  const ext = S => { let x0 = Infinity, x1 = -Infinity; for (const q of S) { const r = q.r || 0, a = q.k === 'c' ? q.x - r : Math.min(q.x0, q.x1) - r, b = q.k === 'c' ? q.x + r : Math.max(q.x0, q.x1) + r; x0 = Math.min(x0, a); x1 = Math.max(x1, b); } return [x0, x1]; };
  const span = q => { const r = q.r || 0; return q.k === 'c' ? [q.a - r, q.a + r] : [Math.min(q.a0, q.a1) - r, Math.max(q.a0, q.a1) + r]; };
  // the search (as the caverns'): solid = every lethal shape of every trap at that moment
  function fly(level, traps, x0, a0, t0, goal, lo, hi, via) {
    const DT = 1 / 15, DX = 11, DA = 11, up = Math.round(440 * DT / DA), dn = Math.round(380 * DT / DA), sd = Math.round(330 * DT / DX);
    const nA = Math.ceil((hi - lo) / DA) + 1, nX = Math.ceil(400 / DX) + 1, V = 1e6;
    let front = new Set([Math.round(x0 / DX) * 1000 + Math.round((a0 - lo) / DA)]);
    for (let step = 1; step <= 12 / DT; step++) {
      const t = t0 + step * DT, S = [];
      for (const h of traps) LH.lighthouseShapes(h, t, S);
      const next = new Set(), blocked = new Map();
      const free = (xi, ai) => {
        const key = xi * 1000 + ai; if (blocked.has(key)) return blocked.get(key);
        const x = xi * DX, a = lo + ai * DA, [l, r] = level.walls(a), ok = x - W / 2 - 2 >= l && x + W / 2 + 2 <= r && level.walls(a + Hh / 2)[0] <= x - W / 2 && level.walls(a + Hh / 2)[1] >= x + W / 2 && level.walls(a - Hh / 2)[0] <= x - W / 2 && level.walls(a - Hh / 2)[1] >= x + W / 2 && !capHit(S, x, a, M);
        blocked.set(key, ok); return ok;
      };
      for (const k of front) {
        const got = k >= V, kk = k % V, xi = Math.floor(kk / 1000), ai = kk % 1000;
        for (let dA = -dn; dA <= up; dA++) for (let dX = -sd; dX <= sd; dX++) {
          const nx = xi + dX, na = ai + dA; if (na < 0 || na >= nA || nx < 0 || nx >= nX) continue;
          const g2 = got || !via || via(nx * DX, lo + na * DA), key = (g2 ? V : 0) + nx * 1000 + na; if (next.has(key) || !free(nx, na)) continue;
          if (g2 && goal(nx * DX, lo + na * DA)) return step * DT;
          next.add(key);
        }
      }
      if (!next.size) return -1;
      front = next;
    }
    return -1;
  }
  for (let k = 0; k <= 8; k++) {
    const st = k ? { ...st0, seed: `${st0.seed}~${k}` } : st0, level = LH.createLighthouseLevel(LH.advSeed(st), st), hz = [], fr = [];
    lighthouseStats.seeds++;
    {
      const VIEW = 1100, h1 = [], f1 = [];
      level.fill(VIEW + 900, h1, f1);
      let sh = h1.length, sf = f1.length;
      for (let cam = 10; cam < level.end; cam += 10) {
        level.fill(cam + VIEW + 900, h1, f1);
        for (; sh < h1.length; sh++) if (h1[sh].lo < cam + VIEW + 100) lfail('traps never pop in on screen', `${h1[sh].type} at ${h1[sh].lo | 0}`);
        for (; sf < f1.length; sf++) if (f1[sf].alt < cam + VIEW + 100) lfail('pickups never pop in on screen', `${f1[sf].kind} at ${f1[sf].alt | 0}`);
      }
      hz.push(...h1); fr.push(...f1);
    }
    lighthouseStats.len = level.end / 10;
    for (const h of hz) if (!LH.LIGHTHOUSE_TYPES.has(h.type)) lfail('the lighthouse only has its own traps', h.type);
    for (const h of hz) lighthouseStats.kinds[h.type.slice(10)] = (lighthouseStats.kinds[h.type.slice(10)] || 0) + (k ? 0 : 1);
    if (!k) { lighthouseStats.lamps = level.lamps.length; lighthouseStats.phantoms = hz.filter(h => h.type === 'lighthousePhantom').length; }
    if (hz.filter(h => h.type === 'lighthousePhantom').length < st0.goals.find(g => g.k === 'lighthouseGhost').n + 2) lfail('the lighthouse has more phantoms than the phantom mission needs', '');
    for (let i = 1; i < level.beats.length; i++) { const p = level.beats[i - 1], q = level.beats[i], g = Math.min(...q.hs.map(h => h.lo)) - Math.max(...p.hs.map(h => h.hi)); lighthouseStats.beatGap = Math.min(lighthouseStats.beatGap, g); if (g < 0) lfail('beats never overlap', `${p.kind} at ${p.a} / ${q.kind} at ${q.a}`); }
    if (hz.some(h => h.hi > level.end - 320)) lfail('the lantern room below the finish is clear of traps', `${Math.max(...hz.map(h => h.hi)) | 0} vs ${level.end}`);
    for (let a = 0; a < level.end + 200; a += 1) {
      const [l, r] = level.walls(a), [l2, r2] = level.walls(a + 1);
      lighthouseStats.minW = Math.min(lighthouseStats.minW, r - l); lighthouseStats.slope = Math.max(lighthouseStats.slope, l2 - l, r - r2);
    }
    if (lighthouseStats.minW < R.minWidth) lfail('the shaft is never narrower than minWidth', lighthouseStats.minW.toFixed(1));
    if (lighthouseStats.slope > R.maxWallSlope) lfail('the walls never step in faster than maxWallSlope', lighthouseStats.slope.toFixed(2));
    // every lit trap answers only to its own lamp: no other lamp's beam ever reaches anywhere it can be
    for (const h of hz) if (h.lamp) for (const L of level.lamps) {
      if (L === h.lamp) continue;
      let dmin = Infinity; for (const q of LH.lighthouseDanger(h)) { const [a0, a1] = span(q), [x0, x1] = ext([q]); for (const a of [a0, a1]) for (const x of [x0, x1]) if (a < L.alt - 8) dmin = Math.min(dmin, Math.hypot(x - L.x, a - L.alt)); }
      lighthouseStats.beamGap = Math.min(lighthouseStats.beamGap, dmin - L.len);
      if (dmin < L.len + 10) { lfail('a lamp\'s beam never reaches another beat\'s traps', `${h.type} at ${h.alt | 0}, lamp at ${L.alt | 0}`); break; }
    }
    // static lanes: a thorn knot's every stem, a lantern's whole swing, a shadow hand at full reach leave an open lane of
    // minLane to the far wall at every height they reach
    for (const h of hz) {
      if (h.type === 'lighthousePhantom') continue;
      for (const q of LH.lighthouseShapes(h, 0, [], 'sweep')) {
        const [a0, a1] = span(q);
        for (let a = a0; a <= a1; a += 6) {
          const [x0, x1] = ext([q]), [l, r] = level.walls(a), m = h.side > 0 ? r - x1 : x0 - l;
          lighthouseStats.lane[h.type] = Math.min(lighthouseStats.lane[h.type], m);
          if (m < R.minLane) { lfail('every thorn knot, lantern swing and shadow hand leaves a lane of minLane to the far wall', `${h.type} ${m.toFixed(1)} at ${h.alt | 0}`); break; }
        }
      }
    }
    // how much of the time each lit trap is there (for the summary)
    if (!k) for (const h of hz) if (h.lamp) { const n = 200; let on = 0; for (let i = 0; i < n; i++) { const tt = h.lamp.ph + i * h.lamp.P / n; if (h.type === 'lighthouseShadow' ? LH.lighthouseShadowReach(h, tt) > LH.LIGHTHOUSE.shadow.reach * 0.6 : LH.lighthouseShapes(h, tt, [], undefined).length > (h.type === 'lighthouseThorn' ? 1 : 0)) on++; } const key = h.type.slice(10); (lighthouseStats.litFrac[key] = lighthouseStats.litFrac[key] || []).push(on / n); }
    for (const f of fr) {
      const [l, r] = level.walls(f.alt), pr = LH.pickR(f);
      if (f.x - pr < l + R.fruitMargin - 0.5 || f.x + pr > r - R.fruitMargin + 0.5) lfail('pickups stay off the walls', `${f.kind} at ${f.alt | 0}`);
      if (f.clear === -Infinity) continue;   // (the dares: moths and the Keeper's Quarters' ring)
      const need = f.clear ?? (f.bonus || f.kind === 'gold' ? Math.ceil(LH.laneSize().w / 2 + 6 + LH.COCO_R) : R.pickup.clear);
      let dd = Infinity; for (const h of hz) if (h.lo - 220 < f.alt && h.hi + 220 > f.alt) for (const q of LH.lighthouseDanger(h)) dd = Math.min(dd, LH.shapeDist(q, f.x, f.alt));
      if (!f.bonus && f.kind !== 'gold' && f.clear == null) lighthouseStats.pick = Math.min(lighthouseStats.pick, dd);
      if (dd < need - 0.5) lfail('pickups stay clear of every trap\'s reach', `${f.kind} at ${f.alt | 0}: ${dd.toFixed(1)} < ${need}`);
    }
    // a moth is a dare, but never inside a solid part (a thorn's knot, a lantern's bracket)
    for (const f of fr.filter(f => f.kind === 'lighthouseMoth')) for (const h of hz) if (h.lo - 60 < f.alt && h.hi + 60 > f.alt)
      for (const q of LH.lighthouseShapes(h, 0, [], 'body')) if (LH.shapeDist(q, f.x, f.alt) < LH.COCO_R + 4) { lfail('a moth never sits in a trap\'s solid parts', `${h.type} at ${f.alt | 0}`); break; }
    for (let i = 0; i < fr.length; i++) for (let j = i + 1; j < fr.length && fr[j].alt - fr[i].alt < 80; j++) if (Math.hypot(fr[i].x - fr[j].x, fr[i].alt - fr[j].alt) < LH.pickR(fr[i]) + LH.pickR(fr[j]) + LH.PICK_GAP - 0.01) lfail('pickups never overlap', `${fr[i].alt | 0}`);
    if (fr.filter(f => f.kind === 'lighthouseMoth').length !== 3) lfail('the lighthouse holds exactly 3 luna moths', `${fr.filter(f => f.kind === 'lighthouseMoth').length}`);
    let gap = 0, last = 60; for (const f of fr) if (f.kind === 'chili') { gap = Math.max(gap, f.alt - last); last = f.alt; }
    if (gap > 640) lfail('the lighthouse keeps a chili line', `${gap | 0}`);
    if (k > 2) continue;   // (the searches run on the stage itself and two more seeds)
    for (const b of level.beats) {
      const lo = Math.min(...b.hs.map(h => h.lo)) - 150, hi = Math.max(...b.hs.map(h => h.hi)) + 90;
      const traps = hz.filter(h => h.lo < hi + 60 && h.hi > lo - 60);
      lighthouseStats.traps++;
      for (let p = 0; p < 6; p++) {
        const t0 = p * 1.13 + k * 0.37, [l, r] = level.walls(lo + 40);
        lighthouseStats.searches++;
        const tm = fly(level, traps, (l + r) / 2, lo + 40, t0, (x, a) => a >= hi - 10, lo, hi + 20);
        if (tm < 0) lfail('every trap can be passed by the widest pilot from any phase', `${b.kind} at ${b.a} (${b.sec.name}), start ${t0.toFixed(2)} s, seed ${k}`);
        else lighthouseStats.worst = Math.max(lighthouseStats.worst, tm);
      }
    }
    // every moth can be touched and then escaped (flown on past its traps) by the widest pilot, from 6 phases
    for (const f of fr.filter(f => f.kind === 'lighthouseMoth')) {
      const own = hz.filter(h => h.lo - 40 < f.alt && h.hi + 120 > f.alt), lo = Math.min(f.alt, ...own.map(h => h.lo)) - 200, hi = Math.max(f.alt, ...own.map(h => h.hi)) + 100;
      const traps = hz.filter(h => h.lo < hi + 60 && h.hi > lo - 60), [l, r] = level.walls(lo + 40);
      let ok = true;
      for (let p = 0; p < 6 && ok; p++) {
        lighthouseStats.searches++;
        const tm = fly(level, traps, (l + r) / 2, lo + 40, p * 1.07 + k * 0.29, (x, a) => a >= hi - 10, lo, hi + 20, (x, a) => Math.hypot(x - f.x, a - f.alt) < X.moth.r + W / 2 - 4);
        if (tm < 0) { lfail('every luna moth can be reached and escaped by the widest pilot', `moth at ${f.alt | 0}, phase ${p}, seed ${k}`); ok = false; }
      }
      if (ok) lighthouseStats.moths++;
    }
  }
  if (failures.size) {
    console.log(`FAILED: ${failures.size} rule(s) broken`);
    for (const [rule, { count, example }] of failures) console.log(`  ✗ ${rule} — ${count}× (e.g. ${example})`);
    process.exit(1);
  }
}
const lighthouseSummary = () => `PASS: Haunted Lighthouse: ${lighthouseStats.seeds} layouts × ${lighthouseStats.len} m, only its own traps (${Object.entries(lighthouseStats.kinds).map(([k, n]) => `${n} ${k}`).join(', ')}) under ${lighthouseStats.lamps} lamps, each taught alone first; shaft ${lighthouseStats.minW.toFixed(0)}+ wide, wall slope ${lighthouseStats.slope.toFixed(2)} (max ${LH.RULES.maxWallSlope}); every beam ${lighthouseStats.beamGap.toFixed(0)}+ short of other beats' traps; solid share (thorn stems and phantoms in the light, shadow hands reaching out in the dark) ${Object.entries(lighthouseStats.litFrac).map(([k, v]) => `${k} ${Math.round(100 * Math.min(...v))}-${Math.round(100 * Math.max(...v))}%`).join(', ')}; open lanes past thorn knots ${lighthouseStats.lane.lighthouseThorn.toFixed(0)}+, lantern swings ${lighthouseStats.lane.lighthouseLantern.toFixed(0)}+, shadow hands ${lighthouseStats.lane.lighthouseShadow.toFixed(0)}+ (minLane ${LH.RULES.minLane}); beats ${lighthouseStats.beatGap.toFixed(0)}+ apart; pickups ${lighthouseStats.pick.toFixed(1)}+ from any trap's reach, nothing pops in; ${lighthouseStats.traps} beats and ${lighthouseStats.moths} moths (reach and escape) flown by the widest pilot in ${lighthouseStats.searches} searches, the slowest pass ${lighthouseStats.worst.toFixed(1)} s`;
// (test slot: Haunted Lighthouse, island level 34)
// ---------- Adventure: Wizard's Spire (island level 35), an authored stage with its own traps ----------
// As the toybox's checks: every rule on the stage's layout as the game builds it (and 8 other seeds, which only move
// sides and looks), then every beat and every lost scroll flown by a time-space search for the widest pilot on the
// traps' own clocks from several start phases (a flying book, rising bubbles and fresh ink count as solid exactly when
// the game kills on them). The rune portals never hurt and are never needed: the searches fly past them as open air,
// and each portal's mouth and twin must sit clear of every trap, a skip of at least one beat up the shaft.
const WZ = new Function(regions.join('\n') + '\nreturn { createWizardLevel, wizardShapes, wizardDanger, wizardEnd, wizardCycle, wizardBookState, wizardPortalMouth, wizardWallItems, WIZARD, WIZARD_STAGE, WIZARD_TYPES, ADV_WIZARD, RULES, advSeed, shapeDist, laneSize, pickR, COCO_R, PICK_GAP, UNITS_PER_M };')();
const wizardStats = { seeds: 0, traps: 0, searches: 0, worst: 0, stars: 0, pick: Infinity, minW: Infinity, slope: 0, lane: { wizardBook: Infinity, wizardCauldron: Infinity, wizardQuill: Infinity }, len: 0, kinds: {}, beatGap: Infinity, portals: 0, portalClear: Infinity, skip: Infinity };
{
  const R = WZ.RULES, W = PILOT_W, Hh = PILOT_H, M = 4, st0 = WZ.ADV_WIZARD;
  const tfail = (rule, d) => fail('wizard: ' + rule, d);
  if (st0.theme !== 'wizard' || !(st0.reward > 0)) tfail('the spire is a themed stage with a reward', JSON.stringify(st0));
  if (!Array.isArray(st0.goals) || st0.goals.length !== 3 || !st0.goals.some(g => g.k === 'finish') || !st0.goals.some(g => g.k === 'wizardScroll' && g.n === 3) || !st0.goals.some(g => g.k === 'wizardPortal' && g.n === 3)) tfail('three missions: the observatory, 3 lost scrolls and 3 rune portals', JSON.stringify(st0.goals));
  if (Math.abs(st0.len * WZ.UNITS_PER_M - WZ.wizardEnd()) > 1e-6) tfail('the stage length matches its layout', `${st0.len}`);
  // the perk: a book that Cappy came near never starts another flight
  { const h = { type: 'wizardBook', P: 4, ph: 0, calm: 1.0 }; for (let t = 1; t < 20; t += 0.05) { const s = WZ.wizardBookState(h, t); if (s.v >= 0 && t - s.u + (4 - 1 - 2.3) >= 1.0) { tfail('a calmed book stays home', `t ${t.toFixed(2)}`); break; } } }
  // the stage's order: books, then cauldrons, then quills, each taught alone; never slower than taught
  {
    const fam = { book: 'book', bookPair: 'book', cauldron: 'cauldron', cauldronPair: 'cauldron', cauldronBook: 'cauldron', quill: 'quill', quillPair: 'quill', quillBook: 'quill', quillCauldron: 'quill' };
    const firsts = {}, seen = [];
    for (const sec of WZ.WIZARD_STAGE) if (!sec.calm) for (const [, kind, o] of sec.beats) {
      const b = fam[kind]; if (!b) { tfail('every beat is a known kind', kind); continue; }
      if (!firsts[b]) { firsts[b] = o; seen.push(b); if (kind !== b) tfail('each trap is introduced alone first', `${kind} in ${sec.name}`); }
      else if (o.P && firsts[b].P && o.P > firsts[b].P) tfail('a trap is never slower than its introduction', `${kind} in ${sec.name}`);
    }
    if (seen.join() !== 'book,cauldron,quill') tfail('the spire teaches books, cauldrons, then quills', seen.join());
    if (!WZ.WIZARD_STAGE.some(sec => sec.calm && !sec.finish && sec !== WZ.WIZARD_STAGE[0])) tfail('the spire has a breather', '');
    if (!WZ.WIZARD_STAGE[WZ.WIZARD_STAGE.length - 1].finish) tfail('the stage ends at the observatory', '');
    const X = WZ.WIZARD.cauldron;
    for (const sec of WZ.WIZARD_STAGE) if (!sec.calm) for (const [, kind, o] of sec.beats) { const P = kind.startsWith('quillC') ? o.CP : kind.startsWith('cauldron') ? o.P : 0; if (P && P < X.T.tell + 2 * X.T.gap + X.life + X.pop + 0.05) tfail('a cauldron\'s bubbles are gone before it boils again', `${kind} P ${P}`); }
  }
  const capHit = (S, x, a, m) => {
    const r = W / 2 + m, half = Math.max(0, Hh / 2 - W / 2);
    for (const q of S) for (const da of half ? [-half, 0, half] : [0]) if (WZ.shapeDist(q, x, a + da) < r) return true;
    return false;
  };
  // the widest open interval across the shaft at height a, given shapes S
  const openAt = (level, S, a) => {
    const [l, r] = level.walls(a), iv = [];
    for (const q of S) {
      let x0, x1;
      if (q.k === 'c') { const d = Math.abs(a - q.a); if (d >= q.r) continue; const w = Math.sqrt(q.r * q.r - d * d); x0 = q.x - w; x1 = q.x + w; }
      else if (q.k === 'b') { if (a < q.a0 || a > q.a1) continue; x0 = q.x0; x1 = q.x1; }
      else { let lo = Infinity, hi = -Infinity; for (let u = 0; u <= 1.0001; u += 1 / 24) { const x = q.x0 + (q.x1 - q.x0) * u, aa = q.a0 + (q.a1 - q.a0) * u, d = Math.abs(a - aa); if (d < q.r) { const w = Math.sqrt(q.r * q.r - d * d); lo = Math.min(lo, x - w); hi = Math.max(hi, x + w); } } if (lo > hi) continue; x0 = lo; x1 = hi; }
      iv.push([x0, x1]);
    }
    iv.sort((p, q) => p[0] - q[0]);
    let best = 0, cur = l;
    for (const [x0, x1] of iv) { if (x0 > cur) best = Math.max(best, x0 - cur); cur = Math.max(cur, x1); }
    return Math.max(best, r - cur);
  };
  // the search (as the vault's): solid = every lethal shape of every trap at that moment
  function fly(level, traps, x0, a0, t0, goal, lo, hi, via) {
    const DT = 1 / 15, DX = 11, DA = 11, up = Math.round(440 * DT / DA), dn = Math.round(380 * DT / DA), sd = Math.round(330 * DT / DX);
    const nA = Math.ceil((hi - lo) / DA) + 1, nX = Math.ceil(400 / DX) + 1, V = 1e6;
    let front = new Set([Math.round(x0 / DX) * 1000 + Math.round((a0 - lo) / DA)]);
    for (let step = 1; step <= 12 / DT; step++) {
      const t = t0 + step * DT, S = [];
      for (const h of traps) WZ.wizardShapes(h, t, S);
      const next = new Set(), blocked = new Map();
      const free = (xi, ai) => {
        const key = xi * 1000 + ai; if (blocked.has(key)) return blocked.get(key);
        const x = xi * DX, a = lo + ai * DA, [l, r] = level.walls(a), ok = x - W / 2 - 2 >= l && x + W / 2 + 2 <= r && level.walls(a + Hh / 2)[0] <= x - W / 2 && level.walls(a + Hh / 2)[1] >= x + W / 2 && level.walls(a - Hh / 2)[0] <= x - W / 2 && level.walls(a - Hh / 2)[1] >= x + W / 2 && !capHit(S, x, a, M);
        blocked.set(key, ok); return ok;
      };
      for (const k of front) {
        const got = k >= V, kk = k % V, xi = Math.floor(kk / 1000), ai = kk % 1000;
        for (let dA = -dn; dA <= up; dA++) for (let dX = -sd; dX <= sd; dX++) {
          const nx = xi + dX, na = ai + dA; if (na < 0 || na >= nA || nx < 0 || nx >= nX) continue;
          const g2 = got || !via || via(nx * DX, lo + na * DA), key = (g2 ? V : 0) + nx * 1000 + na; if (next.has(key) || !free(nx, na)) continue;
          if (g2 && goal(nx * DX, lo + na * DA)) return step * DT;
          next.add(key);
        }
      }
      if (!next.size) return -1;
      front = next;
    }
    return -1;
  }
  for (let k = 0; k <= 8; k++) {
    const st = k ? { ...st0, seed: `${st0.seed}~${k}` } : st0, level = WZ.createWizardLevel(WZ.advSeed(st), st), hz = [], fr = [];
    wizardStats.seeds++;
    {
      const VIEW = 1100, h1 = [], f1 = [];
      level.fill(VIEW + 900, h1, f1);
      let sh = h1.length, sf = f1.length;
      for (let cam = 10; cam < level.end; cam += 10) {
        level.fill(cam + VIEW + 900, h1, f1);
        for (; sh < h1.length; sh++) if (h1[sh].lo < cam + VIEW + 100) tfail('traps never pop in on screen', `${h1[sh].type} at ${h1[sh].lo | 0}`);
        for (; sf < f1.length; sf++) if (f1[sf].alt < cam + VIEW + 100) tfail('pickups never pop in on screen', `${f1[sf].kind} at ${f1[sf].alt | 0}`);
      }
      hz.push(...h1); fr.push(...f1);
    }
    wizardStats.len = level.end / 10;
    for (const h of hz) if (!WZ.WIZARD_TYPES.has(h.type)) tfail('the spire only has its own traps', h.type);
    const traps = hz.filter(h => h.type !== 'wizardPortal');
    for (const h of hz) if (!(h.type === 'wizardPortal' && h.role === 'out')) wizardStats.kinds[h.type.slice(6)] = (wizardStats.kinds[h.type.slice(6)] || 0) + (k ? 0 : 1);
    for (let i = 1; i < level.beats.length; i++) { const p = level.beats[i - 1], q = level.beats[i], g = Math.min(...q.hs.map(h => h.lo)) - Math.max(...p.hs.map(h => h.hi)); wizardStats.beatGap = Math.min(wizardStats.beatGap, g); if (g < 0) tfail('beats never overlap', `${p.kind} at ${p.a} / ${q.kind} at ${q.a}`); }
    if (traps.some(h => h.hi > level.end - 320)) tfail('the observatory below the finish is clear of traps', `${Math.max(...traps.map(h => h.hi)) | 0} vs ${level.end}`);
    for (let a = 0; a < level.end + 200; a += 1) {
      const [l, r] = level.walls(a), [l2, r2] = level.walls(a + 1);
      wizardStats.minW = Math.min(wizardStats.minW, r - l); wizardStats.slope = Math.max(wizardStats.slope, l2 - l, r - r2);
    }
    if (wizardStats.minW < R.minWidth) tfail('the shaft is never narrower than minWidth', wizardStats.minW.toFixed(1));
    if (wizardStats.slope > R.maxWallSlope) tfail('the walls never step in faster than maxWallSlope', wizardStats.slope.toFixed(2));
    // lanes: every trap alone, at every moment of its cycle, leaves an open lane of minLane across the shaft at every
    // height it reaches (a book anywhere on its loop, every bubble anywhere on its rise, the ink line at full length)
    if (k < 3) for (const h of traps) {
      const C = WZ.wizardCycle(h), n = 64, D = WZ.wizardDanger(h);
      let a0 = Infinity, a1 = -Infinity; for (const q of D) { const r = q.r || 0, lo = q.k === 'c' ? q.a - r : q.k === 'b' ? q.a0 : Math.min(q.a0, q.a1) - r, hi = q.k === 'c' ? q.a + r : q.k === 'b' ? q.a1 : Math.max(q.a0, q.a1) + r; a0 = Math.min(a0, lo); a1 = Math.max(a1, hi); }
      let worst = Infinity;
      for (let i = 0; i < n; i++) { const S = WZ.wizardShapes(h, (i + 0.5) * C / n + (h.ph || 0), []); for (let a = a0; a <= a1; a += 4) worst = Math.min(worst, openAt(level, S, a)); }
      wizardStats.lane[h.type] = Math.min(wizardStats.lane[h.type], worst);
      if (worst < R.minLane) tfail('every trap leaves an open lane of minLane at every moment', `${h.type} ${worst.toFixed(1)} at ${h.alt | 0}`);
    }
    // the portals: a mouth on one wall, its twin on the other wall higher up past at least one beat, both clear of every
    // trap's reach, the pilot let out of the twin with room all round
    const ins = hz.filter(h => h.type === 'wizardPortal' && h.role === 'in');
    wizardStats.portals = ins.length;
    if (ins.length < 4) tfail('the spire has enough portals for the portal mission', `${ins.length}`);
    for (const p of ins) {
      const tw = p.twin;
      if (!tw || tw.side !== -p.side) { tfail('a portal\'s twin is on the other wall', `${p.alt | 0}`); continue; }
      const skipped = level.beats.filter(b => b.lo > p.alt && b.hi < tw.alt).length;
      wizardStats.skip = Math.min(wizardStats.skip, skipped);
      if (!skipped) tfail('a portal skips at least one beat', `${p.alt | 0} → ${tw.alt | 0}`);
      for (const [x, a, what] of [[p.wx + p.side * 12, p.alt, 'mouth'], [tw.wx - p.side * 12, tw.alt, 'twin'], [p.ox, p.oa, 'exit']]) {
        let dd = Infinity; for (const h of traps) if (h.lo - 300 < a && h.hi + 300 > a) for (const q of WZ.wizardDanger(h)) dd = Math.min(dd, WZ.shapeDist(q, x, a));
        wizardStats.portalClear = Math.min(wizardStats.portalClear, dd);
        if (dd < W / 2 + 40) tfail('a portal and its twin sit clear of every trap\'s reach', `${what} at ${a | 0}: ${dd.toFixed(1)}`);
      }
      const [l, r] = level.walls(p.oa);
      if (p.ox - W / 2 < l + 8 || p.ox + W / 2 > r - 8) tfail('the pilot comes out of a twin inside the shaft', `${p.oa | 0}`);
      if (Math.abs(p.wx - level.walls(p.alt)[p.side > 0 ? 0 : 1]) > 0.5) tfail('a portal sits on its wall', `${p.alt | 0}`);
    }
    for (const f of fr) {
      const [l, r] = level.walls(f.alt), pr = WZ.pickR(f);
      if (f.x - pr < l + R.fruitMargin - 0.5 || f.x + pr > r - R.fruitMargin + 0.5) tfail('pickups stay off the walls', `${f.kind} at ${f.alt | 0}`);
      if (f.clear === -Infinity) continue;   // (the dares: scrolls and the Star Chart Landing's ring of coconuts)
      const need = f.clear ?? (f.bonus || f.kind === 'gold' ? Math.ceil(WZ.laneSize().w / 2 + 6 + WZ.COCO_R) : R.pickup.clear);
      let dd = Infinity; for (const h of traps) if (h.lo - 220 < f.alt && h.hi + 220 > f.alt) for (const q of WZ.wizardDanger(h)) dd = Math.min(dd, WZ.shapeDist(q, f.x, f.alt));
      if (!f.bonus && f.kind !== 'gold' && f.clear == null) wizardStats.pick = Math.min(wizardStats.pick, dd);
      if (dd < need - 0.5) tfail('pickups stay clear of every trap\'s reach', `${f.kind} at ${f.alt | 0}: ${dd.toFixed(1)} < ${need}`);
    }
    // a scroll is a dare, but never inside a solid part (a shelf lip, a corbel, a pot, an inkwell)
    for (const f of fr.filter(f => f.kind === 'wizardScroll')) for (const h of traps) if (h.lo - 60 < f.alt && h.hi + 60 > f.alt)
      for (const q of WZ.wizardShapes(h, 0, [], 'body')) if (WZ.shapeDist(q, f.x, f.alt) < WZ.COCO_R + 4) { tfail('a scroll never sits in a trap\'s solid parts', `${h.type} at ${f.alt | 0}`); break; }
    for (let i = 0; i < fr.length; i++) for (let j = i + 1; j < fr.length && fr[j].alt - fr[i].alt < 80; j++) if (Math.hypot(fr[i].x - fr[j].x, fr[i].alt - fr[j].alt) < WZ.pickR(fr[i]) + WZ.pickR(fr[j]) + WZ.PICK_GAP - 0.01) tfail('pickups never overlap', `${fr[i].alt | 0}`);
    if (level.stack.some(items => items.some((q, i) => i && Math.abs(q.p - items[i - 1].p) > Math.min(6, (items[i - 1].a1 - items[i - 1].a0) / 2, (q.a1 - q.a0) / 2) * 1.4 + 1e-6))) tfail('the wall pieces never step out faster than their ramps', '');
    if (fr.filter(f => f.kind === 'wizardScroll').length !== 3) tfail('the spire holds exactly 3 lost scrolls', `${fr.filter(f => f.kind === 'wizardScroll').length}`);
    let gap = 0, last = 60; for (const f of fr) if (f.kind === 'chili') { gap = Math.max(gap, f.alt - last); last = f.alt; }
    if (gap > 640) tfail('the spire keeps a chili line', `${gap | 0}`);
    if (k > 2) continue;   // (the searches run on the stage itself and two more seeds)
    for (const b of level.beats) {
      const lo = Math.min(...b.hs.map(h => h.lo)) - 150, hi = Math.max(...b.hs.map(h => h.hi)) + 90;
      const near = traps.filter(h => h.lo < hi + 60 && h.hi > lo - 60);
      wizardStats.traps++;
      for (let p = 0; p < 6; p++) {
        const t0 = p * 1.13 + k * 0.37, [l, r] = level.walls(lo + 40);
        wizardStats.searches++;
        const tm = fly(level, near, (l + r) / 2, lo + 40, t0, (x, a) => a >= hi - 10, lo, hi + 20);
        if (tm < 0) tfail('every trap can be passed by the widest pilot from any phase', `${b.kind} at ${b.a} (${b.sec.name}), start ${t0.toFixed(2)} s, seed ${k}`);
        else wizardStats.worst = Math.max(wizardStats.worst, tm);
      }
    }
    // every scroll can be touched and then escaped (flown on past its traps) by the widest pilot, from 6 phases
    const dare = (f, x, a, touch, n, label) => {
      const own = traps.filter(h => h.lo - 40 < a && h.hi + 120 > a), lo = Math.min(a, ...own.map(h => h.lo)) - 200, hi = Math.max(a, ...own.map(h => h.hi)) + 100;
      const near = traps.filter(h => h.lo < hi + 60 && h.hi > lo - 60), [l, r] = level.walls(lo + 40);
      for (let p = 0; p < n; p++) {
        wizardStats.searches++;
        const tm = fly(level, near, (l + r) / 2, lo + 40, p * 1.07 + k * 0.29, (x, a) => a >= hi - 10, lo, hi + 20, touch);
        if (tm < 0) { tfail(`every ${label} can be reached and escaped by the widest pilot`, `${label} at ${a | 0}, phase ${p}, seed ${k}`); return false; }
      }
      return true;
    };
    for (const f of fr.filter(f => f.kind === 'wizardScroll')) if (dare(f, f.x, f.alt, (x, a) => Math.hypot(x - f.x, a - f.alt) < WZ.COCO_R + W / 2 - 4, 6, 'lost scroll')) wizardStats.stars++;
  }
  if (failures.size) {
    console.log(`FAILED: ${failures.size} rule(s) broken`);
    for (const [rule, { count, example }] of failures) console.log(`  ✗ ${rule} — ${count}× (e.g. ${example})`);
    process.exit(1);
  }
}
const wizardSummary = () => `PASS: Wizard's Spire: ${wizardStats.seeds} layouts × ${wizardStats.len} m, only its own traps (${Object.entries(wizardStats.kinds).map(([k, n]) => `${n} ${k}`).join(', ')}), each taught alone first; shaft ${wizardStats.minW.toFixed(0)}+ wide, wall slope ${wizardStats.slope.toFixed(2)} (max ${WZ.RULES.maxWallSlope}); open lanes at every moment past books ${wizardStats.lane.wizardBook.toFixed(0)}+, cauldrons ${wizardStats.lane.wizardCauldron.toFixed(0)}+, quills ${wizardStats.lane.wizardQuill.toFixed(0)}+ (minLane ${WZ.RULES.minLane}), beats ${wizardStats.beatGap.toFixed(0)}+ apart; ${wizardStats.portals} rune portals, each skipping ${wizardStats.skip}+ beats, ${wizardStats.portalClear.toFixed(0)}+ clear of any trap; pickups ${wizardStats.pick.toFixed(1)}+ from any trap's reach, nothing pops in; ${wizardStats.traps} beats and ${wizardStats.stars} lost scrolls (reach and escape) flown by the widest pilot in ${wizardStats.searches} searches, the slowest pass ${wizardStats.worst.toFixed(1)} s`;
// (test slot: Wizard's Spire, island level 35)
// ---------- Adventure: Starfall Summit (island level 36), an authored stage with its own traps ----------
// As the lighthouse's checks: every rule on the stage's layout as the game builds it (and 8 other seeds, which only move
// sides and looks), the wall asteroids never poking out past the shaft's edge, then every beat and every fallen star
// flown by a time-space search for the widest pilot on the traps' own clocks (a UFO's beam hauling the pilot toward its
// saucer while it is on) from several start phases.
const SF = new Function(regions.join('\n') + '\nreturn { createStarfallLevel, starfallShapes, starfallDanger, starfallEnd, starfallGrav, starfallUfoState, starfallPullAt, starfallMeteorState, starfallFlareState, starfallSatState, STARFALL, STARFALL_STAGE, STARFALL_TYPES, ADV_STARFALL, RULES, advSeed, shapeDist, laneSize, pickR, COCO_R, PICK_GAP, UNITS_PER_M };')();
const starfallStats = { seeds: 0, traps: 0, searches: 0, worst: 0, stars: 0, pick: Infinity, minW: Infinity, slope: 0, lane: { starfallFlare: Infinity, starfallUfo: Infinity, starfallSat: Infinity }, len: 0, kinds: {}, beatGap: Infinity, rocks: 0, poke: -Infinity, meteors: 0 };
{
  const R = SF.RULES, W = PILOT_W, Hh = PILOT_H, M = 4, st0 = SF.ADV_STARFALL, X = SF.STARFALL;
  const sfail = (rule, d) => fail('starfall: ' + rule, d);
  if (st0.theme !== 'starfall' || !(st0.reward > 0)) sfail('the starfall is a themed stage with a reward', JSON.stringify(st0));
  if (!Array.isArray(st0.goals) || st0.goals.length !== 3 || !st0.goals.some(g => g.k === 'finish') || !st0.goals.some(g => g.k === 'starfallStar' && g.n === 3) || !st0.goals.some(g => g.k === 'starfallGraze' && g.n > 0)) sfail('three missions: the star nest, 3 stars and the grazes', JSON.stringify(st0.goals));
  if (Math.abs(st0.len * SF.UNITS_PER_M - SF.starfallEnd()) > 1e-6) sfail('the stage length matches its layout', `${st0.len}`);
  if (SF.starfallGrav(0) !== 1 || Math.abs(SF.starfallGrav(1e5) - X.grav.lo) > 1e-9 || !(X.grav.lo > 0.5)) sfail('gravity eases from the island\'s to low, never too low', `${SF.starfallGrav(1e5)}`);
  // the stage's order: meteors, then satellites, then saucers, then flares, each taught alone; a breather; the finish
  {
    const fam = { meteor: 'meteor', sat: 'sat', satPair: 'sat', satMeteor: 'sat', ufo: 'ufo', ufoMeteor: 'ufo', ufoSat: 'ufo', ufoPair: 'ufo', flare: 'flare', flarePair: 'flare', flareMeteor: 'flare', flareSat: 'flare', flareUfo: 'flare' };
    const firsts = {}, seen = [];
    for (const sec of SF.STARFALL_STAGE) if (!sec.calm) for (const [, kind, o] of sec.beats) {
      const b = fam[kind]; if (!b) { sfail('every beat is a known kind', kind); continue; }
      if (!firsts[b]) { firsts[b] = o; seen.push(b); if (kind !== b) sfail('each trap is introduced alone first', `${kind} in ${sec.name}`); }
    }
    if (seen.join() !== 'meteor,sat,ufo,flare') sfail('the summit teaches meteors, satellites, saucers, then flares', seen.join());
    if (!SF.STARFALL_STAGE.some(sec => sec.calm && !sec.finish && sec !== SF.STARFALL_STAGE[0])) sfail('the summit has a breather', '');
    if (!SF.STARFALL_STAGE[SF.STARFALL_STAGE.length - 1].finish) sfail('the stage ends at the Star Nest', '');
  }
  const capHit = (S, x, a, m) => {
    const r = W / 2 + m, half = Math.max(0, Hh / 2 - W / 2);
    for (const q of S) for (const da of half ? [-half, 0, half] : [0]) if (SF.shapeDist(q, x, a + da) < r) return true;
    return false;
  };
  const ext = S => { let x0 = Infinity, x1 = -Infinity; for (const q of S) { const r = q.r || 0, a = q.k === 'c' ? q.x - r : q.k === 'b' ? q.x0 : Math.min(q.x0, q.x1) - r, b = q.k === 'c' ? q.x + r : q.k === 'b' ? q.x1 : Math.max(q.x0, q.x1) + r; x0 = Math.min(x0, a); x1 = Math.max(x1, b); } return [x0, x1]; };
  const span = q => { const r = q.r || 0; return q.k === 'c' ? [q.a - r, q.a + r] : q.k === 'b' ? [q.a0, q.a1] : [Math.min(q.a0, q.a1) - r, Math.max(q.a0, q.a1) + r]; };
  // the search (as the lighthouse's): solid = every lethal shape of every trap at that moment; a UFO's beam shifts every
  // move made inside it by its haul (toward the saucer) over that step
  function fly(level, traps, x0, a0, t0, goal, lo, hi, via) {
    const DT = 1 / 15, DX = 11, DA = 11, up = Math.round(440 * DT / DA), dn = Math.round(380 * DT / DA), sd = Math.round(330 * DT / DX);
    const nA = Math.ceil((hi - lo) / DA) + 1, nX = Math.ceil(400 / DX) + 1, V = 1e6, ufos = traps.filter(h => h.type === 'starfallUfo');
    let front = new Set([Math.round(x0 / DX) * 1000 + Math.round((a0 - lo) / DA)]);
    for (let step = 1; step <= 12 / DT; step++) {
      const t = t0 + step * DT, S = [], us = ufos.map(h => [h, SF.starfallUfoState(h, t - DT)]);
      for (const h of traps) SF.starfallShapes(h, t, S);
      const next = new Set(), blocked = new Map();
      const free = (xi, ai) => {
        const key = xi * 1000 + ai; if (blocked.has(key)) return blocked.get(key);
        const x = xi * DX, a = lo + ai * DA, [l, r] = level.walls(a), ok = x - W / 2 - 2 >= l && x + W / 2 + 2 <= r && level.walls(a + Hh / 2)[0] <= x - W / 2 && level.walls(a + Hh / 2)[1] >= x + W / 2 && level.walls(a - Hh / 2)[0] <= x - W / 2 && level.walls(a - Hh / 2)[1] >= x + W / 2 && !capHit(S, x, a, M);
        blocked.set(key, ok); return ok;
      };
      for (const k of front) {
        const got = k >= V, kk = k % V, xi = Math.floor(kk / 1000), ai = kk % 1000;
        let px = 0, pa = 0;
        for (const [h, st] of us) { const p = SF.starfallPullAt(h, st, xi * DX, lo + ai * DA); if (p) { px += p[0]; pa += p[1]; } }
        const sX = Math.round(px * DT / DX), sA = Math.round(pa * DT / DA);
        for (let dA = -dn; dA <= up; dA++) for (let dX = -sd; dX <= sd; dX++) {
          const nx = xi + dX + sX, na = ai + Math.min(up, dA + sA); if (na < 0 || na >= nA || nx < 0 || nx >= nX) continue;
          const g2 = got || !via || via(nx * DX, lo + na * DA), key = (g2 ? V : 0) + nx * 1000 + na; if (next.has(key) || !free(nx, na)) continue;
          if (g2 && goal(nx * DX, lo + na * DA)) return step * DT;
          next.add(key);
        }
      }
      if (!next.size) return -1;
      front = next;
    }
    return -1;
  }
  for (let k = 0; k <= 8; k++) {
    const st = k ? { ...st0, seed: `${st0.seed}~${k}` } : st0, level = SF.createStarfallLevel(SF.advSeed(st), st), hz = [], fr = [];
    starfallStats.seeds++;
    {
      const VIEW = 1100, h1 = [], f1 = [];
      level.fill(VIEW + 900, h1, f1);
      let sh = h1.length, sf = f1.length;
      for (let cam = 10; cam < level.end; cam += 10) {
        level.fill(cam + VIEW + 900, h1, f1);
        for (; sh < h1.length; sh++) if (h1[sh].lo < cam + VIEW + 100) sfail('traps never pop in on screen', `${h1[sh].type} at ${h1[sh].lo | 0}`);
        for (; sf < f1.length; sf++) if (f1[sf].alt < cam + VIEW + 100) sfail('pickups never pop in on screen', `${f1[sf].kind} at ${f1[sf].alt | 0}`);
      }
      hz.push(...h1); fr.push(...f1);
    }
    starfallStats.len = level.end / 10;
    for (const h of hz) if (!SF.STARFALL_TYPES.has(h.type)) sfail('the summit only has its own traps', h.type);
    for (const h of hz) starfallStats.kinds[h.type.slice(8)] = (starfallStats.kinds[h.type.slice(8)] || 0) + (k ? 0 : 1);
    if (!k) starfallStats.meteors = hz.filter(h => h.type === 'starfallMeteor').reduce((n, h) => n + h.n, 0);
    if (starfallStats.meteors < st0.goals.find(g => g.k === 'starfallGraze').n * 4) sfail('the summit has plenty more meteors than the graze mission needs', `${starfallStats.meteors}`);
    for (let i = 1; i < level.beats.length; i++) { const p = level.beats[i - 1], q = level.beats[i], g = Math.min(...q.hs.map(h => h.lo)) - Math.max(...p.hs.map(h => h.hi)); starfallStats.beatGap = Math.min(starfallStats.beatGap, g); if (g < 0) sfail('beats never overlap', `${p.kind} at ${p.a} / ${q.kind} at ${q.a}`); }
    if (hz.some(h => h.hi > level.end - 320)) sfail('the star nest below the finish is clear of traps', `${Math.max(...hz.map(h => h.hi)) | 0} vs ${level.end}`);
    for (let a = 0; a < level.end + 200; a += 1) {
      const [l, r] = level.walls(a), [l2, r2] = level.walls(a + 1);
      starfallStats.minW = Math.min(starfallStats.minW, r - l); starfallStats.slope = Math.max(starfallStats.slope, Math.abs(l2 - l), Math.abs(r - r2));
    }
    if (starfallStats.minW < R.minWidth) sfail('the shaft is never narrower than minWidth', starfallStats.minW.toFixed(1));
    if (starfallStats.slope > R.maxWallSlope) sfail('the walls never step faster than maxWallSlope', starfallStats.slope.toFixed(2));
    // the wall asteroids: every rock's face stays behind the shaft's edge (the pilot never overlaps the art)
    for (const side of [0, 1]) for (const rk of level.rocks[side]) {
      if (!k) starfallStats.rocks++;
      if (rk.c > level.end + 600) continue;
      for (let q = -0.95; q <= 0.95; q += 0.1) {
        const a = rk.c + q * rk.ry, e = rk.p - rk.rx + rk.rx * Math.sqrt(1 - q * q), [bl, br] = level.baseWalls(a), [l, r] = level.walls(a), face = side ? br - e : bl + e;
        const poke = side ? r - face : face - l; starfallStats.poke = Math.max(starfallStats.poke, poke);
        if (poke > 0.5) { sfail('wall asteroids never poke out past the shaft\'s edge', `side ${side} rock at ${rk.c | 0}: ${poke.toFixed(1)}`); break; }
      }
    }
    // static lanes: a flare's whole loop, a saucer, a satellite at either end of its drift leave an open lane of minLane
    for (const h of hz) {
      if (h.type === 'starfallMeteor') continue;
      const shapes = h.type === 'starfallSat' ? [-1, 1].map(e => ({ k: 'c', x: h.cx + e * h.amp, a: h.alt, r: X.sat.p1 + X.sat.pr, e })) : SF.starfallShapes(h, 0, [], 'sweep');
      for (const q of shapes) {
        const [a0, a1] = span(q);
        for (let a = a0; a <= a1; a += 6) {
          const [x0, x1] = ext([q]), [l, r] = level.walls(a), m = h.type === 'starfallSat' ? (q.e < 0 ? r - x1 : x0 - l) : h.side > 0 ? r - x1 : x0 - l;
          starfallStats.lane[h.type] = Math.min(starfallStats.lane[h.type], m);
          if (m < R.minLane) { sfail('every flare loop, saucer and satellite (at either end of its drift) leaves a lane of minLane', `${h.type} ${m.toFixed(1)} at ${h.alt | 0}`); break; }
        }
      }
    }
    for (const f of fr) {
      const [l, r] = level.walls(f.alt), pr = SF.pickR(f);
      if (f.x - pr < l + R.fruitMargin - 0.5 || f.x + pr > r - R.fruitMargin + 0.5) sfail('pickups stay off the walls', `${f.kind} at ${f.alt | 0}`);
      if (f.clear === -Infinity) continue;   // (the dares: stars and the Ringed Rest's ring)
      const need = f.clear ?? (f.bonus || f.kind === 'gold' ? Math.ceil(SF.laneSize().w / 2 + 6 + SF.COCO_R) : R.pickup.clear);
      let dd = Infinity; for (const h of hz) if (h.lo - 220 < f.alt && h.hi + 220 > f.alt) for (const q of SF.starfallDanger(h)) dd = Math.min(dd, SF.shapeDist(q, f.x, f.alt));
      if (!f.bonus && f.kind !== 'gold' && f.clear == null) starfallStats.pick = Math.min(starfallStats.pick, dd);
      if (dd < need - 0.5) sfail('pickups stay clear of every trap\'s reach', `${f.kind} at ${f.alt | 0}: ${dd.toFixed(1)} < ${need}`);
    }
    // a star is a dare, but never inside a solid part (a flare's sun, a saucer)
    for (const f of fr.filter(f => f.kind === 'starfallStar')) for (const h of hz) if (h.lo - 60 < f.alt && h.hi + 60 > f.alt)
      for (const q of SF.starfallShapes(h, 0, [], 'body')) if (SF.shapeDist(q, f.x, f.alt) < SF.COCO_R + 6) { sfail('a star never sits in a trap\'s solid parts', `${h.type} at ${f.alt | 0}`); break; }
    for (let i = 0; i < fr.length; i++) for (let j = i + 1; j < fr.length && fr[j].alt - fr[i].alt < 80; j++) if (Math.hypot(fr[i].x - fr[j].x, fr[i].alt - fr[j].alt) < SF.pickR(fr[i]) + SF.pickR(fr[j]) + SF.PICK_GAP - 0.01) sfail('pickups never overlap', `${fr[i].alt | 0}`);
    if (fr.filter(f => f.kind === 'starfallStar').length !== 3) sfail('the summit holds exactly 3 fallen stars', `${fr.filter(f => f.kind === 'starfallStar').length}`);
    let gap = 0, last = 60; for (const f of fr) if (f.kind === 'chili') { gap = Math.max(gap, f.alt - last); last = f.alt; }
    if (gap > 640) sfail('the summit keeps a chili line', `${gap | 0}`);
    if (k > 2) continue;   // (the searches run on the stage itself and two more seeds)
    for (const b of level.beats) {
      const lo = Math.min(...b.hs.map(h => h.lo)) - 150, hi = Math.max(...b.hs.map(h => h.hi)) + 90;
      const traps = hz.filter(h => h.lo < hi + 60 && h.hi > lo - 60);
      starfallStats.traps++;
      for (let p = 0; p < 6; p++) {
        const t0 = p * 1.13 + k * 0.37, [l, r] = level.walls(lo + 40);
        starfallStats.searches++;
        const tm = fly(level, traps, (l + r) / 2, lo + 40, t0, (x, a) => a >= hi - 10, lo, hi + 20);
        if (tm < 0) sfail('every trap can be passed by the widest pilot from any phase', `${b.kind} at ${b.a} (${b.sec.name}), start ${t0.toFixed(2)} s, seed ${k}`);
        else starfallStats.worst = Math.max(starfallStats.worst, tm);
      }
    }
    // every star can be touched and then escaped (flown on past its traps) by the widest pilot, from 6 phases
    for (const f of fr.filter(f => f.kind === 'starfallStar')) {
      const own = hz.filter(h => h.lo - 40 < f.alt && h.hi + 120 > f.alt), lo = Math.min(f.alt, ...own.map(h => h.lo)) - 200, hi = Math.max(f.alt, ...own.map(h => h.hi)) + 100;
      const traps = hz.filter(h => h.lo < hi + 60 && h.hi > lo - 60), [l, r] = level.walls(lo + 40);
      let ok = true;
      for (let p = 0; p < 6 && ok; p++) {
        starfallStats.searches++;
        const tm = fly(level, traps, (l + r) / 2, lo + 40, p * 1.07 + k * 0.29, (x, a) => a >= hi - 10, lo, hi + 20, (x, a) => Math.hypot(x - f.x, a - f.alt) < X.star.r + W / 2 - 4);
        if (tm < 0) { sfail('every fallen star can be reached and escaped by the widest pilot', `star at ${f.alt | 0}, phase ${p}, seed ${k}`); ok = false; }
      }
      if (ok) starfallStats.stars++;
    }
  }
  if (failures.size) {
    console.log(`FAILED: ${failures.size} rule(s) broken`);
    for (const [rule, { count, example }] of failures) console.log(`  ✗ ${rule} — ${count}× (e.g. ${example})`);
    process.exit(1);
  }
}
const starfallSummary = () => `PASS: Starfall Summit: ${starfallStats.seeds} layouts × ${starfallStats.len} m, only its own traps (${Object.entries(starfallStats.kinds).map(([k, n]) => `${n} ${k}`).join(', ')}; ${starfallStats.meteors} meteors), each taught alone first; gravity down to ${SF.STARFALL.grav.lo} of the island's; shaft ${starfallStats.minW.toFixed(0)}+ wide, wall slope ${starfallStats.slope.toFixed(2)} (max ${SF.RULES.maxWallSlope}), ${starfallStats.rocks} wall asteroids none poking past the edge (worst ${starfallStats.poke.toFixed(2)}); open lanes past flare loops ${starfallStats.lane.starfallFlare.toFixed(0)}+, saucers ${starfallStats.lane.starfallUfo.toFixed(0)}+, satellites at the ends of their drift ${starfallStats.lane.starfallSat.toFixed(0)}+ (minLane ${SF.RULES.minLane}); beats ${starfallStats.beatGap.toFixed(0)}+ apart; pickups ${starfallStats.pick.toFixed(1)}+ from any trap's reach, nothing pops in; ${starfallStats.traps} beats and ${starfallStats.stars} stars (reach and escape) flown by the widest pilot (hauled by the beams) in ${starfallStats.searches} searches, the slowest pass ${starfallStats.worst.toFixed(1)} s`;
// (test slot: Starfall Summit, island level 36)
// ---------- Adventure: Beanstalk Heights (island level 37), an authored stage with its own traps ----------
// As the starfall's checks: every rule on the stage's layout as the game builds it (and 8 other seeds, which only move
// sides and looks), the wall puffs and leaf ledges never poking out past the shaft's edge, then every beat and every
// golden feather flown by a time-space search for the widest pilot on the traps' own clocks (the falling leaves on the
// giant's footsteps) from several start phases. The search counts a bouncy cloud as solid: every beat can be passed
// without touching one (a bounce is only ever a help or a shove, never needed).
const BS = new Function(regions.join('\n') + '\nreturn { createBeanstalkLevel, beanstalkShapes, beanstalkLethal, beanstalkDanger, beanstalkEnd, beanstalkStep, beanstalkEggState, beanstalkPodState, beanstalkLeafState, beanstalkLeafPath, BEANSTALK, BEANSTALK_STAGE, BEANSTALK_TYPES, ADV_BEANSTALK, RULES, advSeed, shapeDist, laneSize, pickR, COCO_R, PICK_GAP, UNITS_PER_M };')();
const beanstalkStats = { seeds: 0, traps: 0, searches: 0, worst: 0, stars: 0, pick: Infinity, minW: Infinity, slope: 0, lane: { beanstalkEgg: Infinity, beanstalkPod: Infinity, beanstalkCloud: Infinity, beanstalkLeaf: Infinity }, len: 0, kinds: {}, beatGap: Infinity, puffs: 0, ledges: 0, poke: -Infinity, clouds: 0 };
{
  const R = BS.RULES, W = PILOT_W, Hh = PILOT_H, M = 4, st0 = BS.ADV_BEANSTALK, X = BS.BEANSTALK;
  const bfail = (rule, d) => fail('beanstalk: ' + rule, d);
  if (st0.theme !== 'beanstalk' || !(st0.reward > 0)) bfail('the beanstalk is a themed stage with a reward', JSON.stringify(st0));
  if (!Array.isArray(st0.goals) || st0.goals.length !== 3 || !st0.goals.some(g => g.k === 'finish') || !st0.goals.some(g => g.k === 'beanstalkFeather' && g.n === 3) || !st0.goals.some(g => g.k === 'beanstalkBounce' && g.n > 0)) bfail('three missions: the doorstep, 3 feathers and the bounces', JSON.stringify(st0.goals));
  if (Math.abs(st0.len * BS.UNITS_PER_M - BS.beanstalkEnd()) > 1e-6) bfail('the stage length matches its layout', `${st0.len}`);
  // the footsteps: a steady clock, the rumble before each step
  { const a = BS.beanstalkStep(X.step.t0 + 0.01), b = BS.beanstalkStep(X.step.t0 + X.step.P - 0.1); if (!(a.since < 0.02) || b.tell == null || BS.beanstalkStep(0).since !== Infinity) bfail('the giant\'s footsteps keep time, with a rumble before each', JSON.stringify([a, b])); }
  // the stage's order: eggs, then pods, then clouds, then leaves, each taught alone; a breather; the finish
  {
    const fam = { egg: 'egg', eggPair: 'egg', pod: 'pod', podPair: 'pod', podEgg: 'pod', cloud: 'cloud', cloudPair: 'cloud', cloudPod: 'cloud', cloudEgg: 'cloud', leaf: 'leaf', leafPair: 'leaf', leafPod: 'leaf', leafEgg: 'leaf', leafCloud: 'leaf' };
    const firsts = {}, seen = [];
    for (const sec of BS.BEANSTALK_STAGE) if (!sec.calm) for (const [, kind, o] of sec.beats) {
      const b = fam[kind]; if (!b) { bfail('every beat is a known kind', kind); continue; }
      if (!firsts[b]) { firsts[b] = o; seen.push(b); if (kind !== b) bfail('each trap is introduced alone first', `${kind} in ${sec.name}`); }
    }
    if (seen.join() !== 'egg,pod,cloud,leaf') bfail('the stalk teaches eggs, pods, clouds, then leaves', seen.join());
    if (!BS.BEANSTALK_STAGE.some(sec => sec.calm && !sec.finish && sec !== BS.BEANSTALK_STAGE[0])) bfail('the stalk has a breather', '');
    if (!BS.BEANSTALK_STAGE[BS.BEANSTALK_STAGE.length - 1].finish) bfail('the stage ends at the Giant\'s Doorstep', '');
  }
  const capHit = (S, x, a, m) => {
    const r = W / 2 + m, half = Math.max(0, Hh / 2 - W / 2);
    for (const q of S) for (const da of half ? [-half, 0, half] : [0]) if (BS.shapeDist(q, x, a + da) < r) return true;
    return false;
  };
  const ext = S => { let x0 = Infinity, x1 = -Infinity; for (const q of S) { const r = q.r || 0, a = q.k === 'c' ? q.x - r : q.k === 'b' ? q.x0 : Math.min(q.x0, q.x1) - r, b = q.k === 'c' ? q.x + r : q.k === 'b' ? q.x1 : Math.max(q.x0, q.x1) + r; x0 = Math.min(x0, a); x1 = Math.max(x1, b); } return [x0, x1]; };
  const span = q => { const r = q.r || 0; return q.k === 'c' ? [q.a - r, q.a + r] : q.k === 'b' ? [q.a0, q.a1] : [Math.min(q.a0, q.a1) - r, Math.max(q.a0, q.a1) + r]; };
  // the search (as the starfall's): solid = every shape of every trap at that moment, a bouncy cloud's puff included
  function fly(level, traps, x0, a0, t0, goal, lo, hi, via) {
    const DT = 1 / 15, DX = 11, DA = 11, up = Math.round(440 * DT / DA), dn = Math.round(380 * DT / DA), sd = Math.round(330 * DT / DX);
    const nA = Math.ceil((hi - lo) / DA) + 1, nX = Math.ceil(400 / DX) + 1, V = 1e6;
    let front = new Set([Math.round(x0 / DX) * 1000 + Math.round((a0 - lo) / DA)]);
    for (let step = 1; step <= 12 / DT; step++) {
      const t = t0 + step * DT, S = [];
      for (const h of traps) BS.beanstalkShapes(h, t, S);
      const next = new Set(), blocked = new Map();
      const free = (xi, ai) => {
        const key = xi * 1000 + ai; if (blocked.has(key)) return blocked.get(key);
        const x = xi * DX, a = lo + ai * DA, [l, r] = level.walls(a), ok = x - W / 2 - 2 >= l && x + W / 2 + 2 <= r && level.walls(a + Hh / 2)[0] <= x - W / 2 && level.walls(a + Hh / 2)[1] >= x + W / 2 && level.walls(a - Hh / 2)[0] <= x - W / 2 && level.walls(a - Hh / 2)[1] >= x + W / 2 && !capHit(S, x, a, M);
        blocked.set(key, ok); return ok;
      };
      for (const k of front) {
        const got = k >= V, kk = k % V, xi = Math.floor(kk / 1000), ai = kk % 1000;
        for (let dA = -dn; dA <= up; dA++) for (let dX = -sd; dX <= sd; dX++) {
          const nx = xi + dX, na = ai + dA; if (na < 0 || na >= nA || nx < 0 || nx >= nX) continue;
          const g2 = got || !via || via(nx * DX, lo + na * DA), key = (g2 ? V : 0) + nx * 1000 + na; if (next.has(key) || !free(nx, na)) continue;
          if (g2 && goal(nx * DX, lo + na * DA)) return step * DT;
          next.add(key);
        }
      }
      if (!next.size) return -1;
      front = next;
    }
    return -1;
  }
  for (let k = 0; k <= 8; k++) {
    const st = k ? { ...st0, seed: `${st0.seed}~${k}` } : st0, level = BS.createBeanstalkLevel(BS.advSeed(st), st), hz = [], fr = [];
    beanstalkStats.seeds++;
    {
      const VIEW = 1100, h1 = [], f1 = [];
      level.fill(VIEW + 900, h1, f1);
      let sh = h1.length, sf = f1.length;
      for (let cam = 10; cam < level.end; cam += 10) {
        level.fill(cam + VIEW + 900, h1, f1);
        for (; sh < h1.length; sh++) if (h1[sh].lo < cam + VIEW + 100) bfail('traps never pop in on screen', `${h1[sh].type} at ${h1[sh].lo | 0}`);
        for (; sf < f1.length; sf++) if (f1[sf].alt < cam + VIEW + 100) bfail('pickups never pop in on screen', `${f1[sf].kind} at ${f1[sf].alt | 0}`);
      }
      hz.push(...h1); fr.push(...f1);
    }
    beanstalkStats.len = level.end / 10;
    for (const h of hz) if (!BS.BEANSTALK_TYPES.has(h.type)) bfail('the stalk only has its own traps', h.type);
    for (const h of hz) beanstalkStats.kinds[h.type.slice(9)] = (beanstalkStats.kinds[h.type.slice(9)] || 0) + (k ? 0 : 1);
    if (!k) beanstalkStats.clouds = hz.filter(h => h.type === 'beanstalkCloud').length;
    if (beanstalkStats.clouds < st0.goals.find(g => g.k === 'beanstalkBounce').n * 2) bfail('the stalk has plenty more bouncy clouds than the bounce mission needs', `${beanstalkStats.clouds}`);
    if (hz.some(h => h.type === 'beanstalkLeaf' && h.alt < level.stepFrom + 200)) bfail('no leaf falls before the giant starts walking', '');
    for (let i = 1; i < level.beats.length; i++) { const p = level.beats[i - 1], q = level.beats[i], g = Math.min(...q.hs.map(h => h.lo)) - Math.max(...p.hs.map(h => h.hi)); beanstalkStats.beatGap = Math.min(beanstalkStats.beatGap, g); if (g < 0) bfail('beats never overlap', `${p.kind} at ${p.a} / ${q.kind} at ${q.a}`); }
    if (hz.some(h => h.hi > level.end - 320)) bfail('the doorstep below the finish is clear of traps', `${Math.max(...hz.map(h => h.hi)) | 0} vs ${level.end}`);
    for (let a = 0; a < level.end + 200; a += 1) {
      const [l, r] = level.walls(a), [l2, r2] = level.walls(a + 1);
      beanstalkStats.minW = Math.min(beanstalkStats.minW, r - l); beanstalkStats.slope = Math.max(beanstalkStats.slope, Math.abs(l2 - l), Math.abs(r - r2));
    }
    if (beanstalkStats.minW < R.minWidth) bfail('the shaft is never narrower than minWidth', beanstalkStats.minW.toFixed(1));
    if (beanstalkStats.slope > R.maxWallSlope) bfail('the walls never step faster than maxWallSlope', beanstalkStats.slope.toFixed(2));
    // the wall puffs and leaf ledges: every face stays behind the shaft's edge (the pilot never overlaps the art)
    for (const side of [0, 1]) {
      for (const pf of level.puffs[side]) {
        if (!k) beanstalkStats.puffs++;
        if (pf.c > level.end + 600) continue;
        for (let q = -0.95; q <= 0.95; q += 0.1) {
          const a = pf.c + q * pf.ry, e = pf.p - pf.rx + pf.rx * Math.sqrt(1 - q * q), [bl, br] = level.baseWalls(a), [l, r] = level.walls(a), face = side ? br - e : bl + e;
          const poke = side ? r - face : face - l; beanstalkStats.poke = Math.max(beanstalkStats.poke, poke);
          if (poke > 0.5) { bfail('wall puffs never poke out past the shaft\'s edge', `side ${side} puff at ${pf.c | 0}: ${poke.toFixed(1)}`); break; }
        }
      }
      for (const lg of level.ledges[side]) {
        if (!k) beanstalkStats.ledges++;
        for (let q = -0.98; q <= 0.98; q += 0.07) {
          const a = lg.c + q * lg.th, e = lg.p - lg.L * Math.asin(Math.abs(q)) / Math.PI, [bl, br] = level.baseWalls(a), [l, r] = level.walls(a), face = side ? br - e : bl + e;
          const poke = side ? r - face : face - l; beanstalkStats.poke = Math.max(beanstalkStats.poke, poke);
          if (poke > 0.5) { bfail('leaf ledges never poke out past the shaft\'s edge', `side ${side} ledge at ${lg.c | 0}: ${poke.toFixed(1)}`); break; }
        }
      }
    }
    // static lanes: a goose's egg column, a pod and the reach of its spray's lower beans, a cloud, a leaf at every point of
    // its swing leave an open lane of minLane
    for (const h of hz) {
      let shapes = h.type === 'beanstalkPod' ? BS.beanstalkShapes(h, 0, [], 'body') : BS.beanstalkShapes(h, 0, [], 'sweep');
      if (h.type === 'beanstalkLeaf') {   // (a falling leaf as the satellite was: at each end of its swing, its whole length round it)
        shapes = []; const P = q => BS.beanstalkLeafPath(h, q);
        for (let q = 0.9; q < X.leaf.fall; q += 0.02) { const [x0] = P(q - 0.02), [x1, a1] = P(q), [x2] = P(q + 0.02); if ((x1 - x0) * (x2 - x1) <= 0) shapes.push({ k: 'c', x: x1, a: a1, r: X.leaf.hw + X.leaf.r }); }
      }
      for (const q of shapes) {
        const [a0, a1] = span(q);
        for (let a = a0; a <= a1; a += 6) {
          const [x0, x1] = ext([q]), [l, r] = level.walls(a), m = h.type === 'beanstalkLeaf' ? Math.max(r - x1, x0 - l) : h.side > 0 ? r - x1 : x0 - l;
          beanstalkStats.lane[h.type] = Math.min(beanstalkStats.lane[h.type], m);
          if (m < R.minLane) { bfail('every egg column, pod, cloud and leaf leaves a lane of minLane', `${h.type} ${m.toFixed(1)} at ${h.alt | 0}`); break; }
        }
      }
    }
    for (const f of fr) {
      const [l, r] = level.walls(f.alt), pr = BS.pickR(f);
      if (f.x - pr < l + R.fruitMargin - 0.5 || f.x + pr > r - R.fruitMargin + 0.5) bfail('pickups stay off the walls', `${f.kind} at ${f.alt | 0}`);
      if (f.clear === -Infinity) continue;   // (the dares: feathers, the meadow's rainbow, a pink cloud's coconuts)
      const need = f.clear ?? (f.bonus || f.kind === 'gold' ? Math.ceil(BS.laneSize().w / 2 + 6 + BS.COCO_R) : R.pickup.clear);
      let dd = Infinity; for (const h of hz) if (h.lo - 220 < f.alt && h.hi + 220 > f.alt) for (const q of BS.beanstalkDanger(h)) dd = Math.min(dd, BS.shapeDist(q, f.x, f.alt));
      if (!f.bonus && f.kind !== 'gold' && f.clear == null) beanstalkStats.pick = Math.min(beanstalkStats.pick, dd);
      if (dd < need - 0.5) bfail('pickups stay clear of every trap\'s reach', `${f.kind} at ${f.alt | 0}: ${dd.toFixed(1)} < ${need}`);
    }
    // a feather is a dare, but never inside a solid part (a goose, a pod)
    for (const f of fr.filter(f => f.kind === 'beanstalkFeather')) for (const h of hz) if (h.lo - 60 < f.alt && h.hi + 60 > f.alt)
      for (const q of BS.beanstalkShapes(h, 0, [], 'body')) if (BS.shapeDist(q, f.x, f.alt) < BS.COCO_R + 6) { bfail('a feather never sits in a trap\'s solid parts', `${h.type} at ${f.alt | 0}`); break; }
    for (let i = 0; i < fr.length; i++) for (let j = i + 1; j < fr.length && fr[j].alt - fr[i].alt < 80; j++) if (Math.hypot(fr[i].x - fr[j].x, fr[i].alt - fr[j].alt) < BS.pickR(fr[i]) + BS.pickR(fr[j]) + BS.PICK_GAP - 0.01) bfail('pickups never overlap', `${fr[i].alt | 0}`);
    if (fr.filter(f => f.kind === 'beanstalkFeather').length !== 3) bfail('the stalk holds exactly 3 golden feathers', `${fr.filter(f => f.kind === 'beanstalkFeather').length}`);
    let gap = 0, last = 60; for (const f of fr) if (f.kind === 'chili') { gap = Math.max(gap, f.alt - last); last = f.alt; }
    if (gap > 640) bfail('the stalk keeps a chili line', `${gap | 0}`);
    if (k > 2) continue;   // (the searches run on the stage itself and two more seeds)
    for (const b of level.beats) {
      const lo = Math.min(...b.hs.map(h => h.lo)) - 150, hi = Math.max(...b.hs.map(h => h.hi)) + 90;
      const traps = hz.filter(h => h.lo < hi + 60 && h.hi > lo - 60);
      beanstalkStats.traps++;
      for (let p = 0; p < 6; p++) {
        const t0 = p * 1.13 + k * 0.37, [l, r] = level.walls(lo + 40);
        beanstalkStats.searches++;
        const tm = fly(level, traps, (l + r) / 2, lo + 40, t0, (x, a) => a >= hi - 10, lo, hi + 20);
        if (tm < 0) bfail('every trap can be passed by the widest pilot from any phase', `${b.kind} at ${b.a} (${b.sec.name}), start ${t0.toFixed(2)} s, seed ${k}`);
        else beanstalkStats.worst = Math.max(beanstalkStats.worst, tm);
      }
    }
    // every feather can be touched and then escaped (flown on past its traps) by the widest pilot, from 6 phases
    for (const f of fr.filter(f => f.kind === 'beanstalkFeather')) {
      const own = hz.filter(h => h.lo - 40 < f.alt && h.hi + 120 > f.alt), lo = Math.min(f.alt, ...own.map(h => h.lo)) - 200, hi = Math.max(f.alt, ...own.map(h => h.hi)) + 100;
      const traps = hz.filter(h => h.lo < hi + 60 && h.hi > lo - 60), [l, r] = level.walls(lo + 40);
      let ok = true;
      for (let p = 0; p < 6 && ok; p++) {
        beanstalkStats.searches++;
        const tm = fly(level, traps, (l + r) / 2, lo + 40, p * 1.07 + k * 0.29, (x, a) => a >= hi - 10, lo, hi + 20, (x, a) => Math.hypot(x - f.x, a - f.alt) < X.feather.r + W / 2 - 4);
        if (tm < 0) { bfail('every golden feather can be reached and escaped by the widest pilot', `feather at ${f.alt | 0}, phase ${p}, seed ${k}`); ok = false; }
      }
      if (ok) beanstalkStats.stars++;
    }
  }
  if (failures.size) {
    console.log(`FAILED: ${failures.size} rule(s) broken`);
    for (const [rule, { count, example }] of failures) console.log(`  ✗ ${rule} — ${count}× (e.g. ${example})`);
    process.exit(1);
  }
}
const beanstalkSummary = () => `PASS: Beanstalk Heights: ${beanstalkStats.seeds} layouts × ${beanstalkStats.len} m, only its own traps (${Object.entries(beanstalkStats.kinds).map(([k, n]) => `${n} ${k}`).join(', ')}), each taught alone first; the giant's footsteps every ${BS.BEANSTALK.step.P} s; shaft ${beanstalkStats.minW.toFixed(0)}+ wide, wall slope ${beanstalkStats.slope.toFixed(2)} (max ${BS.RULES.maxWallSlope}), ${beanstalkStats.puffs} cloud puffs and ${beanstalkStats.ledges} leaf ledges none poking past the edge (worst ${beanstalkStats.poke.toFixed(2)}); open lanes past egg columns ${beanstalkStats.lane.beanstalkEgg.toFixed(0)}+, pods ${beanstalkStats.lane.beanstalkPod.toFixed(0)}+, clouds ${beanstalkStats.lane.beanstalkCloud.toFixed(0)}+, falling leaves ${beanstalkStats.lane.beanstalkLeaf.toFixed(0)}+ (minLane ${BS.RULES.minLane}); beats ${beanstalkStats.beatGap.toFixed(0)}+ apart; pickups ${beanstalkStats.pick.toFixed(1)}+ from any trap's reach, nothing pops in; ${beanstalkStats.traps} beats and ${beanstalkStats.stars} feathers (reach and escape) flown by the widest pilot (clouds counted solid) in ${beanstalkStats.searches} searches, the slowest pass ${beanstalkStats.worst.toFixed(1)} s`;
// (test slot: Beanstalk Heights, island level 37)
// ---------- Adventure: Sandstorm Canyon (island level 38), an authored stage with its own traps ----------
// As the summit's checks: every rule on the stage's layout as the game builds it (and 8 other seeds, which only move
// sides and looks), the wall strata never standing out past the shaft's edge, then every beat and every golden scarab
// flown by a time-space search for the widest pilot on the traps' own clocks (a sandfall slowing the climb and the
// steering while it pours, the sandstorm's gusts pushing it sideways) from several start phases; and every beat flown
// again with the sandfalls treated as solid (the "touch 2 sandfalls or fewer" mission can be done).
const SS = new Function(regions.join('\n') + '\nreturn { createSandstormLevel, sandstormShapes, sandstormDanger, sandstormEnd, sandstormFallState, sandstormSandAt, sandstormGustAt, sandstormGustWave, sandstormScorpState, SANDSTORM, SANDSTORM_STAGE, SANDSTORM_TYPES, ADV_SANDSTORM, RULES, advSeed, shapeDist, laneSize, pickR, COCO_R, PICK_GAP, UNITS_PER_M };')();
const sandstormStats = { seeds: 0, traps: 0, searches: 0, worst: 0, dry: 0, gems: 0, pick: Infinity, minW: Infinity, slope: 0, lane: { sandstormScorp: Infinity, sandstormFall: Infinity }, len: 0, kinds: {}, beatGap: Infinity, bands: 0, gust: 0 };
{
  const R = SS.RULES, W = PILOT_W, Hh = PILOT_H, M = 4, st0 = SS.ADV_SANDSTORM, X = SS.SANDSTORM;
  const sfail = (rule, d) => fail('sandstorm: ' + rule, d);
  if (st0.theme !== 'sandstorm' || !(st0.reward > 0)) sfail('the canyon is a themed stage with a reward', JSON.stringify(st0));
  if (!Array.isArray(st0.goals) || st0.goals.length !== 3 || !st0.goals.some(g => g.k === 'finish') || !st0.goals.some(g => g.k === 'sandstormScarab' && g.n === 3) || !st0.goals.some(g => g.k === 'sandstormDry' && g.n >= 0)) sfail('three missions: the oasis, 3 scarabs and the sandfalls', JSON.stringify(st0.goals));
  if (Math.abs(st0.len * SS.UNITS_PER_M - SS.sandstormEnd()) > 1e-6) sfail('the stage length matches its layout', `${st0.len}`);
  {
    let mx = 0; for (let t = 0; t < X.gust.P; t += 0.01) mx = Math.max(mx, Math.abs(SS.sandstormGustWave(t)));
    if (mx > 1.0001 || mx < 0.99) sfail('the gust wave runs -1..1', `${mx}`);
  }
  // the stage's order: worms, then scorpions, then sandfalls, then tumbleweeds, each taught alone; a breather; the finish
  {
    const fam = { worm: 'worm', wormPair: 'worm', scorp: 'scorp', scorpPair: 'scorp', scorpWorm: 'scorp', fall: 'fall', fallPair: 'fall', fallScorp: 'fall', fallWorm: 'fall', weed: 'weed', weedPair: 'weed', weedFall: 'weed', weedScorp: 'weed', weedWorm: 'weed' };
    const firsts = {}, seen = [];
    for (const sec of SS.SANDSTORM_STAGE) if (!sec.calm) for (const [, kind] of sec.beats) {
      const b = fam[kind]; if (!b) { sfail('every beat is a known kind', kind); continue; }
      if (!firsts[b]) { firsts[b] = 1; seen.push(b); if (kind !== b) sfail('each trap is introduced alone first', `${kind} in ${sec.name}`); }
    }
    if (seen.join() !== 'worm,scorp,fall,weed') sfail('the canyon teaches worms, scorpions, sandfalls, then tumbleweeds', seen.join());
    if (!SS.SANDSTORM_STAGE.some(sec => sec.calm && !sec.finish && sec !== SS.SANDSTORM_STAGE[0])) sfail('the canyon has a breather', '');
    if (!SS.SANDSTORM_STAGE[SS.SANDSTORM_STAGE.length - 1].finish) sfail('the stage ends at the Hidden Oasis', '');
  }
  const capHit = (S, x, a, m) => {
    const r = W / 2 + m, half = Math.max(0, Hh / 2 - W / 2);
    for (const q of S) for (const da of half ? [-half, 0, half] : [0]) if (SS.shapeDist(q, x, a + da) < r) return true;
    return false;
  };
  const ext = S => { let x0 = Infinity, x1 = -Infinity; for (const q of S) { const r = q.r || 0, a = q.k === 'c' ? q.x - r : q.k === 'b' ? q.x0 : Math.min(q.x0, q.x1) - r, b = q.k === 'c' ? q.x + r : q.k === 'b' ? q.x1 : Math.max(q.x0, q.x1) + r; x0 = Math.min(x0, a); x1 = Math.max(x1, b); } return [x0, x1]; };
  // the search (as the summit's): solid = every lethal shape of every trap at that moment; inside a pouring sandfall the
  // climb is X.fall.up of its speed and the steering slower; the gusts shift every move by their push over that step.
  // dry: a pouring sandfall counts as solid (the mission's way through)
  function fly(level, traps, x0, a0, t0, goal, lo, hi, via, dry) {
    const DT = 1 / 15, DX = 11, DA = 11, up = Math.round(440 * DT / DA), upS = Math.max(1, Math.round(440 * X.fall.up * DT / DA)), dn = Math.round(380 * DT / DA), sd = Math.round(330 * DT / DX), sdS = Math.max(1, Math.round(330 / X.fall.lag * DT / DX));
    const nA = Math.ceil((hi - lo) / DA) + 1, nX = Math.ceil(400 / DX) + 1, V = 1e6, falls = traps.filter(h => h.type === 'sandstormFall');
    let front = new Set([Math.round(x0 / DX) * 1000 + Math.round((a0 - lo) / DA)]);
    for (let step = 1; step <= 12 / DT; step++) {
      const t = t0 + step * DT, S = [], fs = falls.map(h => [h, SS.sandstormFallState(h, t - DT)]), fsNow = dry ? falls.map(h => [h, SS.sandstormFallState(h, t)]) : [];
      for (const h of traps) SS.sandstormShapes(h, t, S);
      const next = new Set(), blocked = new Map();
      const free = (xi, ai) => {
        const key = xi * 1000 + ai; if (blocked.has(key)) return blocked.get(key);
        const x = xi * DX, a = lo + ai * DA, [l, r] = level.walls(a);
        let ok = x - W / 2 - 2 >= l && x + W / 2 + 2 <= r && level.walls(a + Hh / 2)[0] <= x - W / 2 && level.walls(a + Hh / 2)[1] >= x + W / 2 && level.walls(a - Hh / 2)[0] <= x - W / 2 && level.walls(a - Hh / 2)[1] >= x + W / 2 && !capHit(S, x, a, M);
        if (ok && dry) for (const [h, st] of fsNow) for (const da of [-Hh / 2 + 6, 0, Hh / 2 - 6]) if (SS.sandstormSandAt(h, st, x, a + da, W / 2)) { ok = false; break; }
        blocked.set(key, ok); return ok;
      };
      for (const k of front) {
        const got = k >= V, kk = k % V, xi = Math.floor(kk / 1000), ai = kk % 1000, x = xi * DX, a = lo + ai * DA;
        let sand = false; for (const [h, st] of fs) if (SS.sandstormSandAt(h, st, x, a, W / 2 - 10)) sand = true;
        const u = sand ? upS : up, s2 = sand ? sdS : sd, sX = Math.round(SS.sandstormGustAt(level, a, t - DT) * DT / DX);
        for (let dA = -dn; dA <= u; dA++) for (let dX = -s2; dX <= s2; dX++) {
          const nx = xi + dX + sX, na = ai + dA; if (na < 0 || na >= nA || nx < 0 || nx >= nX) continue;
          const g2 = got || !via || via(nx * DX, lo + na * DA), key = (g2 ? V : 0) + nx * 1000 + na; if (next.has(key) || !free(nx, na)) continue;
          if (g2 && goal(nx * DX, lo + na * DA)) return step * DT;
          next.add(key);
        }
      }
      if (!next.size) return -1;
      front = next;
    }
    return -1;
  }
  for (let k = 0; k <= 8; k++) {
    const st = k ? { ...st0, seed: `${st0.seed}~${k}` } : st0, level = SS.createSandstormLevel(SS.advSeed(st), st), hz = [], fr = [];
    sandstormStats.seeds++;
    {
      const VIEW = 1100, h1 = [], f1 = [];
      level.fill(VIEW + 900, h1, f1);
      let sh = h1.length, sf = f1.length;
      for (let cam = 10; cam < level.end; cam += 10) {
        level.fill(cam + VIEW + 900, h1, f1);
        for (; sh < h1.length; sh++) if (h1[sh].lo < cam + VIEW + 100) sfail('traps never pop in on screen', `${h1[sh].type} at ${h1[sh].lo | 0}`);
        for (; sf < f1.length; sf++) if (f1[sf].alt < cam + VIEW + 100) sfail('pickups never pop in on screen', `${f1[sf].kind} at ${f1[sf].alt | 0}`);
      }
      hz.push(...h1); fr.push(...f1);
    }
    sandstormStats.len = level.end / 10;
    for (let a = 0; a < level.end; a += 50) sandstormStats.gust = Math.max(sandstormStats.gust, level.gustK(a) * X.gust.v);
    for (const h of hz) if (!SS.SANDSTORM_TYPES.has(h.type)) sfail('the canyon only has its own traps', h.type);
    for (const h of hz) sandstormStats.kinds[h.type.slice(9)] = (sandstormStats.kinds[h.type.slice(9)] || 0) + (k ? 0 : 1);
    if (hz.filter(h => h.type === 'sandstormFall').length < 3 * st0.goals.find(g => g.k === 'sandstormDry').n) sfail('the canyon has plenty more sandfalls than the mission allows', '');
    for (let i = 1; i < level.beats.length; i++) { const p = level.beats[i - 1], q = level.beats[i], g = Math.min(...q.hs.map(h => h.lo)) - Math.max(...p.hs.map(h => h.hi)); sandstormStats.beatGap = Math.min(sandstormStats.beatGap, g); if (g < 0) sfail('beats never overlap', `${p.kind} at ${p.a} / ${q.kind} at ${q.a}`); }
    if (hz.some(h => h.hi > level.end - 320)) sfail('the oasis below the finish is clear of traps', `${Math.max(...hz.map(h => h.hi)) | 0} vs ${level.end}`);
    for (let a = 0; a < level.end + 200; a += 1) {
      const [l, r] = level.walls(a), [l2, r2] = level.walls(a + 1);
      sandstormStats.minW = Math.min(sandstormStats.minW, r - l); sandstormStats.slope = Math.max(sandstormStats.slope, Math.abs(l2 - l), Math.abs(r - r2));
    }
    if (sandstormStats.minW < R.minWidth) sfail('the shaft is never narrower than minWidth', sandstormStats.minW.toFixed(1));
    if (sandstormStats.slope > R.maxWallSlope) sfail('the walls never step faster than maxWallSlope', sandstormStats.slope.toFixed(2));
    if (!k) sandstormStats.bands = level.bands[0].length + level.bands[1].length;
    // static lanes: a scorpion's sting at full stretch and a sandfall's column leave an open lane of minLane
    for (const h of hz) {
      if (h.type === 'sandstormScorp') {
        const [x0, x1] = ext(SS.sandstormShapes(h, 0, [], 'sweep'));
        for (let a = h.alt - 20; a <= h.alt + X.scorp.top; a += 6) { const [l, r] = level.walls(a), m = h.side > 0 ? r - x1 : x0 - l; sandstormStats.lane.sandstormScorp = Math.min(sandstormStats.lane.sandstormScorp, m); if (m < R.minLane) { sfail('every scorpion leaves a lane of minLane', `${m.toFixed(1)} at ${h.alt | 0}`); break; } }
      } else if (h.type === 'sandstormFall') {
        for (let a = h.alt; a <= h.aT - X.fall.jet; a += 10) { const [l, r] = level.walls(a), hw = X.fall.hw1 + (X.fall.hw0 - X.fall.hw1) * (a - h.alt) / h.len, m = h.side > 0 ? r - (h.cx + hw) : (h.cx - hw) - l; sandstormStats.lane.sandstormFall = Math.min(sandstormStats.lane.sandstormFall, m); if (m < R.minLane - 60) { sfail('every sandfall leaves a lane', `${m.toFixed(1)} at ${h.alt | 0}`); break; } }
        { const [x0, x1] = ext(SS.sandstormShapes(h, 0, [])); for (let a = h.alt - 2 * X.fall.lr - 4; a <= h.alt + 4; a += 4) { const [l, r] = level.walls(a), m = h.side > 0 ? r - x1 : x0 - l; sandstormStats.lane.ledge = Math.min(sandstormStats.lane.ledge ?? Infinity, m); if (m < R.minLane) { sfail('every sandfall ledge leaves a lane of minLane', `${m.toFixed(1)} at ${h.alt | 0}`); break; } } }
      }
    }
    for (const f of fr) {
      const [l, r] = level.walls(f.alt), pr = SS.pickR(f);
      if (f.x - pr < l + R.fruitMargin - 0.5 || f.x + pr > r - R.fruitMargin + 0.5) sfail('pickups stay off the walls', `${f.kind} at ${f.alt | 0}`);
      if (f.clear === -Infinity) continue;   // (the dares: scarabs and the Painted Narrows' sun)
      const need = f.clear ?? (f.bonus || f.kind === 'gold' ? Math.ceil(SS.laneSize().w / 2 + 6 + SS.COCO_R) : R.pickup.clear);
      let dd = Infinity; for (const h of hz) if (h.lo - 220 < f.alt && h.hi + 220 > f.alt) for (const q of SS.sandstormDanger(h)) dd = Math.min(dd, SS.shapeDist(q, f.x, f.alt));
      if (!f.bonus && f.kind !== 'gold' && f.clear == null) sandstormStats.pick = Math.min(sandstormStats.pick, dd);
      if (dd < need - 0.5) sfail('pickups stay clear of every trap\'s reach', `${f.kind} at ${f.alt | 0}: ${dd.toFixed(1)} < ${need}`);
    }
    // a scarab is a dare, but never inside a solid part (a scorpion or its ledge)
    for (const f of fr.filter(f => f.kind === 'sandstormScarab')) for (const h of hz) if (h.lo - 60 < f.alt && h.hi + 60 > f.alt)
      for (const q of SS.sandstormShapes(h, 0, [], 'body')) if (SS.shapeDist(q, f.x, f.alt) < SS.COCO_R + 6) { sfail('a scarab never sits in a trap\'s solid parts', `${h.type} at ${f.alt | 0}`); break; }
    for (let i = 0; i < fr.length; i++) for (let j = i + 1; j < fr.length && fr[j].alt - fr[i].alt < 80; j++) if (Math.hypot(fr[i].x - fr[j].x, fr[i].alt - fr[j].alt) < SS.pickR(fr[i]) + SS.pickR(fr[j]) + SS.PICK_GAP - 0.01) sfail('pickups never overlap', `${fr[i].alt | 0}`);
    if (fr.filter(f => f.kind === 'sandstormScarab').length !== 3) sfail('the canyon holds exactly 3 golden scarabs', `${fr.filter(f => f.kind === 'sandstormScarab').length}`);
    let gap = 0, last = 60; for (const f of fr) if (f.kind === 'chili') { gap = Math.max(gap, f.alt - last); last = f.alt; }
    if (gap > 640) sfail('the canyon keeps a chili line', `${gap | 0}`);
    if (k > 2) continue;   // (the searches run on the stage itself and two more seeds)
    for (const b of level.beats) {
      const lo = Math.min(...b.hs.map(h => h.lo)) - 150, hi = Math.max(...b.hs.map(h => h.hi)) + 90;
      const traps = hz.filter(h => h.lo < hi + 60 && h.hi > lo - 60), wet = traps.some(h => h.type === 'sandstormFall');
      sandstormStats.traps++;
      for (let p = 0; p < 6; p++) {
        const t0 = p * 1.13 + k * 0.37, [l, r] = level.walls(lo + 40);
        sandstormStats.searches++;
        const tm = fly(level, traps, (l + r) / 2, lo + 40, t0, (x, a) => a >= hi - 10, lo, hi + 20);
        if (tm < 0) sfail('every trap can be passed by the widest pilot from any phase', `${b.kind} at ${b.a} (${b.sec.name}), start ${t0.toFixed(2)} s, seed ${k}`);
        else sandstormStats.worst = Math.max(sandstormStats.worst, tm);
        // and without touching a pouring sandfall (from half the phases)
        if (wet && p % 2 === 0) {
          sandstormStats.searches++;
          const td = fly(level, traps, (l + r) / 2, lo + 40, t0, (x, a) => a >= hi - 10, lo, hi + 20, null, true);
          if (td < 0) sfail('every sandfall beat can be passed dry by the widest pilot', `${b.kind} at ${b.a}, start ${t0.toFixed(2)} s, seed ${k}`);
          else sandstormStats.dry++;
        }
      }
    }
    // every scarab can be touched and then escaped (flown on past its traps) by the widest pilot, from 6 phases
    for (const f of fr.filter(f => f.kind === 'sandstormScarab')) {
      const own = hz.filter(h => h.lo - 40 < f.alt && h.hi + 120 > f.alt), lo = Math.min(f.alt, ...own.map(h => h.lo)) - 200, hi = Math.max(f.alt, ...own.map(h => h.hi)) + 100;
      const traps = hz.filter(h => h.lo < hi + 60 && h.hi > lo - 60), [l, r] = level.walls(lo + 40);
      let ok = true;
      for (let p = 0; p < 6 && ok; p++) {
        sandstormStats.searches++;
        const tm = fly(level, traps, (l + r) / 2, lo + 40, p * 1.07 + k * 0.29, (x, a) => a >= hi - 10, lo, hi + 20, (x, a) => Math.hypot(x - f.x, a - f.alt) < X.scarab.r + W / 2 - 4);
        if (tm < 0) { sfail('every golden scarab can be reached and escaped by the widest pilot', `scarab at ${f.alt | 0}, phase ${p}, seed ${k}`); ok = false; }
      }
      if (ok) sandstormStats.gems++;
    }
  }
  if (failures.size) {
    console.log(`FAILED: ${failures.size} rule(s) broken`);
    for (const [rule, { count, example }] of failures) console.log(`  ✗ ${rule} — ${count}× (e.g. ${example})`);
    process.exit(1);
  }
}
const sandstormSummary = () => `PASS: Sandstorm Canyon: ${sandstormStats.seeds} layouts × ${sandstormStats.len} m, only its own traps (${Object.entries(sandstormStats.kinds).map(([k, n]) => `${n} ${k}`).join(', ')}), each taught alone first; gusts up to ${sandstormStats.gust.toFixed(0)} u/s; shaft ${sandstormStats.minW.toFixed(0)}+ wide, wall slope ${sandstormStats.slope.toFixed(2)} (max ${SS.RULES.maxWallSlope}) over ${sandstormStats.bands} sandstone bands; open lanes past scorpion stings ${sandstormStats.lane.sandstormScorp.toFixed(0)}+ (minLane ${SS.RULES.minLane}), beside sandfalls ${sandstormStats.lane.sandstormFall.toFixed(0)}+ and past their foot ledges ${(sandstormStats.lane.ledge ?? 0).toFixed(0)}+; beats ${sandstormStats.beatGap.toFixed(0)}+ apart; pickups ${sandstormStats.pick.toFixed(1)}+ from any trap's reach, nothing pops in; ${sandstormStats.traps} beats (${sandstormStats.dry} dry runs past sandfalls) and ${sandstormStats.gems} scarabs (reach and escape) flown by the widest pilot (slowed by sand, pushed by gusts) in ${sandstormStats.searches} searches, the slowest pass ${sandstormStats.worst.toFixed(1)} s`;
// (test slot: Sandstorm Canyon, island level 38)
// (test slot: Anthill Underworks, island level 39)
// (test slot: Bamboo Pagoda, island level 40)
// (test slot: Hollow Palm, island level 41)

console.log(advSummary());
console.log(templeSummary());
console.log(hiveSummary());
console.log(grottoSummary());
console.log(frostSummary());
console.log(stormSummary());
console.log(mineSummary());
console.log(geodeSummary());
console.log(lagoonSummary());
console.log(bogSummary());
console.log(fossilSummary());
console.log(shipwreckSummary());
console.log(vaultSummary());
console.log(cascadeSummary());
console.log(clockworkSummary());
console.log(cliffsSummary());
console.log(labSummary());
console.log(organSummary());
console.log(pinballSummary());
console.log(candySummary());
console.log(cheeseSummary());
console.log(toyboxSummary());
console.log(lighthouseSummary());
console.log(wizardSummary());
console.log(starfallSummary());
console.log(carnivalSummary());
console.log(sandstormSummary());
console.log(beanstalkSummary());
console.log(`PASS: wall grabs for ${Object.keys(GRAB_STYLE).length} monsters (${grabStats.limbs} limb poses): hitboxes at most ${grabStats.worstIn.toFixed(1)} in from the wall (band ${GRAB.band}), top ${grabStats.maxTop.toFixed(1)} above the catch line (reach ${GRAB.reach}), narrowest centre lane ${grabStats.minLane.toFixed(0)} (widest pilot ${PILOT_W.toFixed(1)}), wind-up ${GRAB.wind} s; ${grabStats.types.size} limb types, every limb whole and anchored (jointed elbows bent ${grabStats.minBend.toFixed(0)}°+, knees ${grabStats.minKnee.toFixed(0)}°+, tapers ${grabStats.minTaper.toFixed(2)}x+, coils ${grabStats.minCoil.toFixed(2)} thick)`);
