// Fairness checks for the level generator in ../index.html.
// Run: node prototype/tests/levelgen.test.mjs
// It extracts the code between /* LEVELGEN:BEGIN */ and /* LEVELGEN:END */ markers,
// generates many shafts and checks every layout rule independently of the generator.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const html = fs.readFileSync(fileURLToPath(new URL('../index.html', import.meta.url)), 'utf8');
const regions = [...html.matchAll(/\/\* LEVELGEN:BEGIN \*\/([\s\S]*?)\/\* LEVELGEN:END \*\//g)].map(m => m[1]);
if (regions.length < 3) throw new Error('LEVELGEN markers not found in index.html');
const { createLevel, RULES, WORLD_W, DEFAULTS, gateK, gateExt, crusherExt, gateWarn, gatePeriod, gatePhase, gateStep, gateCommit, gateCloseIn, gateReopenIn, brakeDist, HANG, FALL_CAP, timingOf, hangCaps, zoneOf, batPos, BAT_PAT, CHUNKS, SET_PIECES, BEATS, PILOT_HITS, pilotMaxSize, staticShapes, GRAB, GRAB_STYLE, GRAB_TOTAL, grabPose, grabRig, PILOT_SCALE, PILOT_TILT, SIGNATURE, CHAR_FIT, VEH_FIT, PILOT_CAP, PART_ENV, SEAT_SCALE, SEAT_FLOOR, envScale, seatFit, seatPlace, comboHits, seatLocal, AMMO, CHASE, hungerLeash, COCO_GOLD, CHILI_R, COCO_R, GOLD_R, PICK_R, pickR, ADVENTURE, ADV, advSeed, advLevelOpts, pinJungle, capsSpan } = new Function(regions.join('\n') + '\nreturn { createLevel, RULES, WORLD_W, DEFAULTS, gateK, gateExt, crusherExt, gateWarn, gatePeriod, gatePhase, gateStep, gateCommit, gateCloseIn, gateReopenIn, brakeDist, HANG, FALL_CAP, timingOf, hangCaps, zoneOf, batPos, BAT_PAT, CHUNKS, SET_PIECES, BEATS, PILOT_HITS, pilotMaxSize, staticShapes, GRAB, GRAB_STYLE, GRAB_TOTAL, grabPose, grabRig, PILOT_SCALE, PILOT_TILT, SIGNATURE, CHAR_FIT, VEH_FIT, PILOT_CAP, PART_ENV, SEAT_SCALE, SEAT_FLOOR, envScale, seatFit, seatPlace, comboHits, seatLocal, AMMO, CHASE, hungerLeash, COCO_GOLD, CHILI_R, COCO_R, GOLD_R, PICK_R, pickR, ADVENTURE, ADV, advSeed, advLevelOpts, pinJungle, capsSpan };')();

// The widest and tallest pilot hitbox at any tilt (every character in every vehicle it can ride, world units): every
// lane is sized from these.
const { w: PILOT_W, h: PILOT_H } = pilotMaxSize();
const FRUIT_PAD = RULES.pickup.r + 2;       // the largest pickup radius (chili, coconut or golden coconut) plus a little
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
// model: CHASE plus hungerLeash): from its normal leash it reaches a pilot climbing at that speed only after more than
// twice the longest climb without a chili, so running dry right after a chili still leaves time to reach the next one;
// and the hunger is real: even flat out at top speed it catches you within 12 s.
const CLEAR = PILOT_W / 2 + 15 + RULES.pickup.r;   // a pickup's clearance from every hazard hitbox (pilot half-width, 15, the largest pickup radius)
const ammoStats = {};
{
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
      if (kb > 0) { const d = Math.min(kb, kb * dt * 14 + 20 * dt); wa -= d; kb -= d; }
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
      g += (pv - mv) * dt; t += dt;
    }
    return t;
  };
  ammoStats.caught = caught(v); ammoStats.caughtFlat = caught(D.maxUp); ammoStats.climb = gap / v;
  if (ammoStats.climb * 2 > ammoStats.caught) fail('the longest climb without a chili is well inside the time from empty to caught', `${ammoStats.climb.toFixed(2)} s vs ${ammoStats.caught.toFixed(2)} s`);
  if (ammoStats.caughtFlat > 12) fail('out of ammo the monster catches even a flat-out pilot', `${ammoStats.caughtFlat.toFixed(1)} s`);
  if (AMMO.start > AMMO.max || AMMO.per < 1 || AMMO.range <= D.chase) fail('ammo numbers are sane (start <= max, the leash is in range)', '');
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
    if (fruit.filter(f => f.kind === 'chili').length < HEIGHT / RULES.chili.gap) fail('shaft has a chili line', `${tag}: only ${fruit.filter(f => f.kind === 'chili').length}`);
    for (const f of fruit) if (!['chili', 'coco', 'gold'].includes(f.kind)) { fail('every pickup is a chili, a coconut or a golden coconut', `${tag}: ${f.kind}`); break; }
    for (const f of fruit) if (f.kind === 'chili' && !f.fill) { fail('only the guaranteed line holds chilies', tag); break; }
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
    {
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
  if (!fa.some(f => f.kind === 'chili') || !fa.some(f => f.kind === 'coco') || !fa.some(f => f.kind === 'gold')) fail('every pickup kind shows up', '');
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
      if (k === 0) advStats.real.push(`${st0.name} ${pl.lo | 0}-${pl.hi | 0}: lanes ${tMin.toFixed(0)}/${wMin.toFixed(0)}, coconut value ${tv}/${wv}`);
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

if (failures.size) {
  console.log(`FAILED: ${failures.size} rule(s) broken across ${checked} shafts`);
  for (const [rule, { count, example }] of failures) console.log(`  ✗ ${rule} — ${count}× (e.g. ${example})`);
  process.exit(1);
}
const dens = zoneMix.dens || [0];
console.log(`PASS: ${checked} shafts × ${HEIGHT / 10} m checked against every layout rule (widest pilot hitbox ${PILOT_W.toFixed(1)}, lanes ≥ ${RULES.minLane}, crusher slot ${RULES.crusher.slot}; ${gateSims} gates and ${crusherSims} crushers flown at 32 phases × 5 approaches; density after 300 m ${Math.min(...dens).toFixed(2)}–${Math.max(...dens).toFixed(2)} per 100 m, avg ${(dens.reduce((a, b) => a + b) / dens.length).toFixed(2)})`);
{
  const cv = zoneMix.coco || [0], cn = zoneMix.cocoN || [0], avg = a => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1);
  console.log(`PASS: chili line every ${RULES.chili.gap / 10} m or less: ${ammoStats.ratio.toFixed(2)}× the ammo auto-fire spends at the tightest leash (${ammoStats.spend.toFixed(2)} shots/s); flat out at the calm leash it fires ${ammoStats.flatSpend.toFixed(2)} shots/s, ${Math.round(ammoStats.flat * 100)}% of the chili line's supply; empty to caught ${ammoStats.caught.toFixed(1)} s (${ammoStats.caughtFlat.toFixed(1)} s flat out) vs ${ammoStats.climb.toFixed(2)} s to the next chili; first 500 m offers ${Math.min(...cn)}–${Math.max(...cn)} coconut pickups (avg ${avg(cn)}, worth ${avg(cv)} with golden ones), ${(zoneMix.per150 || 0).toFixed(2)} golden per 150 m`);
}
console.log(`PASS: ${pairStats.pairs} character × vehicle pairs: ${pairStats.flyable} fly now (21 pilots on their own rides, ${pairStats.swaps} swapped split pairs${pairStats.flyable < pairStats.pairs ? ', the rest wait on a split' : ''}); ${pairStats.vehicles} split vehicles and ${pairStats.characters} split characters inside their size envelopes (envelope scale ${pairStats.minEnv.toFixed(3)}+, floor ${SEAT_FLOOR}), so every pair of split parts fits; swapped pairs inside ${PILOT_CAP.w} × ${PILOT_CAP.h} art units at any tilt (widest ${pairStats.worst || '-'} ${pairStats.worstW.toFixed(2)}), characters scaled ${pairStats.swaps ? pairStats.minS.toFixed(3) : '-'}+${pairStats.cramped ? `, ${pairStats.cramped} cramped in a closed ride's room` : ''}; ${pairStats.sure} swaps also fit at their guaranteed placement${pairStats.collars ? ` (${pairStats.collars} rides add a collar's capsules)` : ''}${pairStats.offCentre.length ? `; off-centre seats: ${pairStats.offCentre.join(', ')}, ${pairStats.shifted} riders moved towards the centre` : ''}; widest pair ${(pairStats.widest * PILOT_SCALE).toFixed(2)} world units (limit ${(LANE_LIMIT.w * PILOT_SCALE).toFixed(2)})`);
console.log(advSummary());
console.log(`PASS: wall grabs for ${Object.keys(GRAB_STYLE).length} monsters (${grabStats.limbs} limb poses): hitboxes at most ${grabStats.worstIn.toFixed(1)} in from the wall (band ${GRAB.band}), top ${grabStats.maxTop.toFixed(1)} above the catch line (reach ${GRAB.reach}), narrowest centre lane ${grabStats.minLane.toFixed(0)} (widest pilot ${PILOT_W.toFixed(1)}), wind-up ${GRAB.wind} s; ${grabStats.types.size} limb types, every limb whole and anchored (jointed elbows bent ${grabStats.minBend.toFixed(0)}°+, knees ${grabStats.minKnee.toFixed(0)}°+, tapers ${grabStats.minTaper.toFixed(2)}x+, coils ${grabStats.minCoil.toFixed(2)} thick)`);
