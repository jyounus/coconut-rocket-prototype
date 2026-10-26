// The shared adventure level graph every world-map concept draws: 20 levels, with forks and merges.
// A level unlocks once ANY level leading into it has 3 stars. `region` picks the art around it;
// `pilot` is the character whose ride suits that level best (its portrait is maps/../pilots/<pilot>.png);
// `boss` levels show the boss portrait (pilots/boss-<boss>.png).
// Stars: 1 = reach the finish, 2 = hit the coconut target, 3 = no revive (as in the game today).
// The demo progress: levels 1-6 cleared with 3 stars (the player took the Temple branch), Murk Mire tried
// (2 stars, so Snapjaw Swamp is still locked), and the player now stands on the boss, Gobblebloom.
window.LEVELS = [
  { id: 1,  name: 'Root Run',          region: 'jungle',  stars: 3, pilot: 'lemur',     perk: 'All-rounder: the starter ride' },
  { id: 2,  name: 'Vine Gully',        region: 'jungle',  stars: 3, pilot: 'chameleon', perk: 'Sticky tongue grabs coconuts off the vines' },
  { id: 3,  name: 'Thorn Hollow',      region: 'jungle',  stars: 3, pilot: 'snail',     perk: 'Shell shrugs off one thorn hit' },
  { id: 4,  name: 'Sunken Steps',      region: 'temple',  stars: 3, pilot: 'raccoon',   perk: 'Sniffs out hidden treasure rooms' },
  { id: 5,  name: 'Dart Hall',         region: 'temple',  stars: 3, pilot: 'cat',       perk: 'Nine lives: one free dart hit' },
  { id: 6,  name: "Idol's Climb",      region: 'temple',  stars: 3, pilot: 'piggy',     perk: 'Gold idols are worth double' },
  { id: 7,  name: 'Murk Mire',         region: 'bog',     stars: 2, pilot: 'axolotl',   perk: 'Breathes the swamp gas safely' },
  { id: 8,  name: 'Snapjaw Swamp',     region: 'bog',     stars: 0, pilot: 'dachshund', perk: 'Snappers lunge at the hot dog, not you' },
  { id: 9,  name: 'Gobblebloom',       region: 'jungle',  stars: 0, pilot: 'chameleon', perk: 'Hot-chili shots burn the plant boss', boss: 'flytrap', current: true },
  { id: 10, name: 'Glowshroom Grotto', region: 'grotto',  stars: 0, pilot: 'mushroom',  perk: 'Immune to spore clouds' },
  { id: 11, name: 'Hidden Lagoon',     region: 'lagoon',  stars: 0, pilot: 'puffer',    perk: 'Swims fast through the water' },
  { id: 12, name: 'Jelly Drift',       region: 'lagoon',  stars: 0, pilot: 'duck',      perk: 'Stings bounce off the rubber duck' },
  { id: 13, name: 'Old Gold Mine',     region: 'mine',    stars: 0, pilot: 'mole',      perk: 'Rides the rails and digs shortcuts' },
  { id: 14, name: 'Basalt Deep',       region: 'caves',   stars: 0, pilot: 'firefly',   perk: 'Lights up the dark tunnels' },
  { id: 15, name: 'Geode King',        region: 'caves',   stars: 0, pilot: 'goat',      perk: 'Firework blasts crack the crystal boss', boss: 'golem' },
  { id: 16, name: 'Amethyst Geode',    region: 'crystal', stars: 0, pilot: 'hamster',   perk: 'Lasers glance off the turbo ball' },
  { id: 17, name: 'Frost Hollow',      region: 'frost',   stars: 0, pilot: 'bear',      perk: 'Ice block never freezes up' },
  { id: 18, name: 'Thunder Rift',      region: 'storm',   stars: 0, pilot: 'robot',     perk: 'Tin tub soaks up one shock' },
  { id: 19, name: 'Magma Core',        region: 'magma',   stars: 0, pilot: 'ember',     perk: 'Fireproof: lava splashes do nothing' },
  { id: 20, name: 'Bellows Drake',     region: 'magma',   stars: 0, pilot: 'penguin',   perk: 'Fizz shots cool the dragon boss', boss: 'dragon' },
];
// [from, to] paths. 3 forks into Temple (4-6) or Bog (7-8), both meet at the boss 9. 10 forks into Lagoon (11-12)
// or the Mine (13), meeting at 14. After the second boss (15) a three-way fork (16 / 17 / 18) meets at 19.
window.PATHS = [[1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 9], [3, 7], [7, 8], [8, 9], [9, 10],
  [10, 11], [11, 12], [12, 14], [10, 13], [13, 14], [14, 15], [15, 16], [15, 17], [15, 18], [16, 19], [17, 19], [18, 19], [19, 20]];
// Future levels: the map must show where new ones attach (drawn as a fogged/dashed "coming soon" continuation after 20).
window.FUTURE = { after: 20, label: 'More levels coming' };

// derived state for drawing: 'done' (3 stars), 'tried' (1-2 stars), 'open' (unlocked, no stars), 'locked'
(() => {
  const by = Object.fromEntries(LEVELS.map(l => [l.id, l]));
  for (const l of LEVELS) {
    const ins = PATHS.filter(p => p[1] === l.id).map(p => by[p[0]]);
    const unlocked = l.id === 1 || ins.some(p => p.stars === 3);
    l.state = l.stars === 3 ? 'done' : l.stars > 0 ? 'tried' : unlocked ? 'open' : 'locked';
  }
  // a path is lit when its start has 3 stars
  window.PATH_STATE = PATHS.map(([a]) => by[a].stars === 3 ? 'lit' : 'dark');
  window.LEVEL_BY = by;
})();

// images: K.img('lemur') / K.img('boss-flytrap'); draw only when .complete (they load in a few ms)
K.imgs = {};
K.img = name => K.imgs[name] || (K.imgs[name] = Object.assign(new Image(), { src: (window.PILOT_DIR || 'pilots/') + name + '.png' }));
for (const l of LEVELS) { K.img(l.pilot); if (l.boss) K.img('boss-' + l.boss); }
// draws a round portrait badge (pilot or boss image clipped to a circle with a coloured ring)
K.badge = (ctx, name, x, y, r, ring = '#ffcf3a') => {
  const im = K.img(name);
  ctx.save();
  ctx.fillStyle = K.rg(ctx, x - r * 0.3, y - r * 0.4, r * 1.3, ['#5b4a68', '#2a2032']); ctx.beginPath(); ctx.arc(x, y, r, 0, K.TAU); ctx.fill();
  if (im.complete && im.naturalWidth) { ctx.save(); ctx.beginPath(); ctx.arc(x, y, r - 1, 0, K.TAU); ctx.clip(); ctx.drawImage(im, x - r * 1.15, y - r * 1.05, r * 2.3, r * 2.3); ctx.restore(); }
  ctx.strokeStyle = ring; ctx.lineWidth = Math.max(1.5, r * 0.13); ctx.beginPath(); ctx.arc(x, y, r, 0, K.TAU); ctx.stroke();
  ctx.restore();
};
// a gold star (filled) or an empty star socket
K.star = (ctx, x, y, r, on = true) => {
  ctx.save(); ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  ctx.closePath();
  if (on) { ctx.fillStyle = K.lg(ctx, x - r, y - r, x + r * 0.6, y + r, ['#fff6b0', '#ffd23a', '#e08a12']); ctx.fill(); ctx.strokeStyle = '#9a5408'; ctx.lineWidth = Math.max(0.8, r * 0.16); ctx.stroke(); }
  else { ctx.fillStyle = 'rgba(30,20,30,.55)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,241,214,.35)'; ctx.lineWidth = Math.max(0.8, r * 0.14); ctx.stroke(); }
  ctx.restore();
};
