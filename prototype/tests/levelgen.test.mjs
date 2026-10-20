// Fairness checks for the level generator in ../index.html.
// Run: node prototype/tests/levelgen.test.mjs
// It extracts the code between /* LEVELGEN:BEGIN */ and /* LEVELGEN:END */ markers,
// generates many shafts and checks every layout rule independently of the generator.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const html = fs.readFileSync(fileURLToPath(new URL('../index.html', import.meta.url)), 'utf8');
const regions = [...html.matchAll(/\/\* LEVELGEN:BEGIN \*\/([\s\S]*?)\/\* LEVELGEN:END \*\//g)].map(m => m[1]);
if (regions.length < 3) throw new Error('LEVELGEN markers not found in index.html');
const { createLevel, RULES, WORLD_W } = new Function(regions.join('\n') + '\nreturn { createLevel, RULES, WORLD_W };')();

const HITBOX = 26;
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
function fail(rule, detail) {
  if (!failures.has(rule)) failures.set(rule, { count: 0, example: detail });
  failures.get(rule).count++;
}

function tightest(level, lo, hi) {
  let L = -Infinity, R = Infinity;
  for (let a = lo; a <= hi; a += 2) { const [l, r] = level.walls(a); L = Math.max(L, l); R = Math.min(R, r); }
  return [L, R];
}

for (const cfg of CONFIGS) {
  for (let k = 0; k < SEEDS; k++) {
    const seed = Math.imul(k + 1, 2654435761) >>> 0;
    const level = createLevel(seed, cfg);
    const hz = [];
    level.fill(HEIGHT, hz);
    checked++;
    const tag = `seed ${seed} density ${cfg.density} intro ${cfg.intro}`;
    const intro = cfg.intro * 10;

    // determinism: the same seed always gives the same shaft
    if (k < 20) {
      const again = []; createLevel(seed, cfg).fill(HEIGHT, again);
      if (JSON.stringify(again) !== JSON.stringify(hz)) fail('same seed gives the same layout', tag);
    }
    if (hz.length < HEIGHT / 1000) fail('shaft has a reasonable number of obstacles', `${tag}: only ${hz.length}`);

    for (let i = 0; i < hz.length; i++) {
      const h = hz[i];
      const where = `${tag} at ${(h.lo / 10).toFixed(0)} m`;

      // easy start: only bats and pods, nothing below the planks
      if (h.lo < 400) fail('nothing spawns on the start planks', where);
      if (h.lo < intro && !['bat', 'pend'].includes(h.type)) fail('easy start has only bats and pods', `${where}: ${h.type}`);

      // every static hazard leaves a lane at least RULES.minLane wide (3.5 hitboxes)
      if (h.type === 'geyser') {
        const [L, R] = tightest(level, h.lo, h.hi);
        const tip = h.side > 0 ? h.base + h.len : h.base - h.len;
        const lane = h.side > 0 ? R - tip : tip - L;
        if (lane < RULES.minLane - 0.5) fail('geyser leaves an open lane', `${where}: ${lane.toFixed(0)} units`);
        if (h.period * h.warnFrac < 0.6 - 1e-9) fail('geyser warns for at least 0.6 s', where);
      }
      if (h.type === 'pend') {
        const [L, R] = tightest(level, h.lo, h.aAlt);
        const reach = h.ax + h.side * (h.len * Math.sin(0.78 + 0.55) + h.r);
        const lane = h.side > 0 ? R - reach : reach - L;
        if (lane < RULES.minLane - 0.5) fail('spiky pod leaves an open lane', `${where}: ${lane.toFixed(0)} units`);
      }
      if (h.type === 'firebar') {
        const [L, R] = tightest(level, h.lo, h.hi);
        const clear = Math.min(h.cx - h.len - L, R - (h.cx + h.len));
        if (clear < HITBOX + 8) fail('fire wheel leaves room at the walls', `${where}: ${clear.toFixed(0)} units`);
      }
      if (h.type === 'bat' && h.amp * h.speed > RULES.batMaxSpeed + 1e-6) fail('bats stay under the speed cap', where);

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
        const heavy = t => t === 'geyser' || t === 'firebar' || t === 'pend';
        if (h.type === 'boulder' && heavy(q.type) && q.lo < h.alt + RULES.boulderZone[1]) fail('boulders keep clear of other hazards', where);
        if (q.type === 'boulder' && heavy(h.type) && h.hi > q.alt - RULES.boulderZone[0]) fail('boulders keep clear of other hazards', where);
      }
    }
  }
}

if (failures.size) {
  console.log(`FAILED: ${failures.size} rule(s) broken across ${checked} shafts`);
  for (const [rule, { count, example }] of failures) console.log(`  ✗ ${rule} — ${count}× (e.g. ${example})`);
  process.exit(1);
}
console.log(`PASS: ${checked} shafts × ${HEIGHT / 10} m checked against every layout rule`);
