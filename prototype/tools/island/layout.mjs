// The island's composition, in world map units (1 unit = 1 CSS px at zoom 1; x east, y south, z up).
// The bake renders with an oblique camera: a world point (x, y, z) appears on the map at (x, y - K*z), so tall
// things lean up the screen and show their south faces, like a pre-rendered 3D overworld. map.json gets every
// position projected to that screen space.
import { chaikin, catmull, resample, polyLen } from './lib/geom.mjs';
import { rand, TAU } from './lib/noise.mjs';

export const SIZE = [1640, 2480];
export const K = 0.5;              // oblique lift: screen y = y - K*z
export const SUN = (() => { const v = [-0.56, -0.36, 0.75], l = Math.hypot(...v); return v.map(c => c / l); })();   // toward the sun (upper left)

const blob = (cx, cy, rx, ry, seed, n = 14, j = 0.22) => {
  const r = rand(seed), o = [];
  for (let i = 0; i < n; i++) { const a = i / n * TAU, k = 1 - j / 2 + r() * j; o.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
  return chaikin(o, 3, true);
};

// coastline (from the concept ×2, a bay on the east side for the pier)
export const COAST = chaikin([[796, 2392], [600, 2366], [420, 2310], [290, 2232], [170, 2100], [96, 1900], [64, 1700], [56, 1520], [84, 1300],
  [60, 1110], [52, 900], [76, 700], [140, 500], [240, 330], [380, 216], [600, 136], [880, 112], [1150, 140], [1360, 260], [1494, 470],
  [1540, 760], [1500, 1040], [1420, 1270], [1312, 1380], [1262, 1500], [1272, 1640], [1350, 1780], [1344, 1990], [1240, 2190],
  [1080, 2320], [940, 2376]], 4, true);

// regions: key, label, blob, label anchor (world)
export const REGIONS = [
  { key: 'beach', label: 'Coconut Beach', label_at: [800, 2330] },
  { key: 'jungle', label: 'Rootwood Jungle', label_at: [600, 2030] },
  { key: 'temple', label: 'Sunken Temple', blob: blob(196, 1600, 150, 290, 11, 12, 0.16), label_at: [196, 1660] },
  { key: 'bog', label: 'Murk Bog', blob: blob(626, 1700, 170, 200, 12, 13, 0.22), label_at: [640, 1690] },
  { key: 'grotto', label: 'Glowshroom Grotto', blob: blob(352, 1066, 214, 130, 13, 12, 0.2), label_at: [352, 1130] },
  { key: 'lagoon', label: 'Hidden Lagoon', label_at: [200, 760] },
  { key: 'mine', label: 'Old Gold Mine', blob: blob(650, 830, 180, 150, 14, 11, 0.22), label_at: [640, 900] },
  { key: 'caves', label: 'Basalt Caves', blob: blob(540, 540, 200, 150, 15, 12, 0.22), label_at: [520, 500] },
  { key: 'crystal', label: 'Amethyst Geode', blob: blob(1090, 290, 214, 130, 16, 12, 0.2), label_at: [1090, 240] },
  { key: 'frost', label: 'Frost Peak', blob: blob(1268, 580, 200, 196, 17, 12, 0.18), label_at: [1250, 640] },
  { key: 'storm', label: 'Thunder Cliff', blob: blob(1000, 770, 150, 118, 18, 11, 0.22), label_at: [990, 830] },
  { key: 'magma', label: 'Mount Bellows', blob: blob(880, 1180, 330, 250, 19, 14, 0.14), label_at: [900, 1330] },
];
export const REGION = Object.fromEntries(REGIONS.map(r => [r.key, r]));

// water bodies
export const LAGOON = blob(196, 752, 128, 196, 21, 12, 0.18);
export const HEADLAND = blob(214, 498, 124, 86, 22, 11, 0.2);          // the rocky cliff the waterfall drops off
export const ISLET11 = blob(172, 872, 38, 26, 23, 9, 0.2);             // sandy islet in the lagoon (node 11)
export const CREEK = catmull([[548, 1846], [500, 1930], [496, 2040], [436, 2150], [398, 2262], [356, 2338]], 18);
export const FALLS = catmull([[300, 470], [262, 500], [222, 530], [194, 556], [188, 600]], 16);   // stream over the cliff into the lagoon

// landmark volumes
export const VOLCANO = { x: 846, y: 1186, r: 240, h: 170, crater: 74, floor: 150, lake: { x: 846, y: 1158, r: 33 } };
export const MINE_MTN = { x: 704, y: 736, r: 124, h: 104 };
export const FROST_PEAK = { x: 1256, y: 476, r: 160, h: 168 };
export const STORM_MESA = { x: 1046, y: 706, r: 70, h: 64 };

// the 20 nodes (world positions: the token stands on its pad there)
export const NODES = [
  [1, 806, 2262], [2, 588, 2142], [3, 392, 1980], [4, 186, 1808], [5, 160, 1596], [6, 236, 1394], [7, 606, 1818], [8, 590, 1590],
  [9, 414, 1290], [10, 340, 1068], [11, 172, 872], [12, 262, 642], [13, 590, 872], [14, 520, 574], [15, 812, 404], [16, 1076, 270],
  [17, 1206, 640], [18, 1006, 792], [19, 1250, 1090], [20, 846, 1214],
].map(([id, x, y]) => ({ id, x, y, boss: id === 9 || id === 15 || id === 20 }));
export const NODE = Object.fromEntries(NODES.map(n => [n.id, n]));

// roads: waypoints between nodes (Catmull-Rom through them)
const WAY = {
  '1-2': [[720, 2236], [650, 2178]],
  '2-3': [[506, 2084], [446, 2030]],
  '3-4': [[318, 1950], [250, 1900], [204, 1860]],
  '4-5': [[150, 1720], [150, 1650]],
  '5-6': [[170, 1500], [196, 1440]],
  '6-9': [[290, 1340], [350, 1300]],
  '3-7': [[470, 1940], [540, 1880]],
  '7-8': [[630, 1740], [626, 1660]],
  '8-9': [[540, 1490], [470, 1380]],
  '9-10': [[420, 1210], [390, 1130]],
  '10-11': [[270, 1020], [210, 950]],
  '11-12': [[150, 800], [168, 720], [214, 668]],
  '12-14': [[340, 610], [430, 580]],
  '10-13': [[440, 1010], [530, 940]],
  '13-14': [[562, 790], [540, 690], [526, 630]],
  '14-15': [[600, 500], [700, 430]],
  '15-16': [[900, 360], [990, 300]],
  '15-17': [[920, 470], [1060, 560], [1140, 610]],
  '15-18': [[850, 520], [900, 640], [950, 740]],
  '16-19': [[1180, 300], [1300, 380], [1390, 520], [1430, 700], [1420, 880], [1350, 1020]],
  '17-19': [[1240, 760], [1260, 900], [1260, 1000]],
  '18-19': [[1080, 880], [1150, 980]],
  '19-20': [[1160, 1130], [1070, 1190], [990, 1228], [920, 1232]],
};
export const PATH_LIST = [[1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 9], [3, 7], [7, 8], [8, 9], [9, 10],
  [10, 11], [11, 12], [12, 14], [10, 13], [13, 14], [14, 15], [15, 16], [15, 17], [15, 18], [16, 19], [17, 19], [18, 19], [19, 20]];
export const PATHS = PATH_LIST.map(([a, b]) => {
  const A = NODE[a], B = NODE[b], ctrl = [[A.x, A.y], ...(WAY[a + '-' + b] || []), [B.x, B.y]];
  return { a, b, pts: resample(catmull(ctrl, 20), 3) };
});

// the future: an unbuilt road from the summit down to a pier in the east bay, a boat route and fogged islands
export const FUTURE = {
  road: resample(catmull([[846, 1214], [870, 1262], [930, 1340], [1040, 1420], [1150, 1480], [1236, 1520]], 20), 3),
  pier: { x0: 1232, y0: 1528, x1: 1340, y1: 1528, w: 22 },
  sea: catmull([[1360, 1540], [1450, 1610], [1520, 1720], [1530, 1800], [1500, 1960], [1470, 2120], [1460, 2200]], 14),
  islands: [{ x: 1530, y: 1830, r: 84, seed: 3 }, { x: 1452, y: 2240, r: 66, seed: 8 }],
  label: 'More islands coming',
};

// road half-width (map units) and node pad radius
export const ROAD_HW = 15, PAD_R = 34, BOSS_PAD_R = 44;
export const totalRoadLen = () => PATHS.reduce((s, p) => s + polyLen(p.pts), 0);
