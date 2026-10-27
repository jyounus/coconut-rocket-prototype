// Shared lighting constants (terrain renderer and props use the same sun, sky and camera).
import * as L from '../layout.mjs';
export const SUN = L.SUN;
export const SUNC = [1.66, 1.5, 1.24], SKY = [0.40, 0.53, 0.78], BOUNCE = [0.16, 0.13, 0.08];
const vl = Math.hypot(0, L.K, 1);
export const VIEW = [0, L.K / vl, 1 / vl];                 // from a surface point toward the camera
const h = [SUN[0] + VIEW[0], SUN[1] + VIEW[1], SUN[2] + VIEW[2]], hl = Math.hypot(...h);
export const HALF = h.map(c => c / hl);                       // Blinn half vector
