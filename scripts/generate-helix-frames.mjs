#!/usr/bin/env node
/**
 * Pre-renders 60 frames of a rotating DNA double helix at high resolution,
 * converts each to ASCII with a wide luminance-mapped char ramp, and writes
 * the result to lib/helixFrames.js as a static JS module.
 *
 * Run:  node scripts/generate-helix-frames.mjs
 *
 * The frames are baked at build/dev time only — the browser just cycles
 * through the strings, so runtime cost is essentially zero.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── tunables ──────────────────────────────────────────────────────────────
const N_FRAMES = 60;            // a full rotation
const COLS = 100;               // ascii output width (more cells = more breathing room)
const ROWS = 58;                // ascii output height
const SRC_W = COLS * 6;         // hi-res render width (super-sample)
const SRC_H = ROWS * 12;        // hi-res render height (chars are ~half-width)
const SAMPLES_PER_STRAND = 540; // densely sampled along the helix
const REVOLUTIONS = 1.0;        // ONE clean turn — rotationally periodic + plenty of whitespace
const SPHERE_R_WORLD = 0.075;   // backbone tube thickness
const RUNG_EVERY = 60;          // sparse rungs (~9 visible) — clean look
const RUNG_STEPS = 24;          // sample density along each rung
const RUNG_R_MULT = 0.32;       // rung atoms — thin readable bars
const RUNG_INTENSITY = 0.7;     // rungs render slightly dimmer than backbones
const HELIX_X_AMP = 0.52;       // helix radius
const HELIX_Y_AMP = 0.82;       // helix height span (kept under 1 so tilt fits)
const DEPTH_FADE_MIN = 0.28;    // back-most multiplier (lower = stronger front↔back contrast)
const TILT_RAD = (25 * Math.PI) / 180; // 25° in-plane tilt of the helix axis
const VISUAL_X_OFFSET = 0;      // geometric center stays at world-x=0; visual nudge is in CSS (.helix__pre)

const TILT_COS = Math.cos(TILT_RAD);
const TILT_SIN = Math.sin(TILT_RAD);

// Lighting — head-on direction (camera-facing) so the apparent bright
// center stays on the helix axis as it rotates. Slight downward bias keeps
// the surface still readable as 3D rather than flat.
const LIGHT = (() => {
  const v = [0.0, -0.25, 1.0];
  const len = Math.hypot(v[0], v[1], v[2]);
  return v.map((x) => x / len);
})();
const AMBIENT = 0.32; // higher ambient → less brightness swing as it rotates

// Wide character ramp — dark→light. The reference outputs use a varied
// ramp (digits + letters + punctuation) which gives the dense, textured feel.
// Order: lowest-luminance first. Includes uppercase + digits for density.
const CHAR_RAMP =
  " .'`,_\"^-:;~!><+=*?[]{}/\\()|iltrfjzxnvuoyc1234567890LCJQYUXZ0OmwqpdbkhaoEXNMR#%MWB&@$";

// ── helpers ───────────────────────────────────────────────────────────────
function clamp01(x) {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

// Apply in-plane (z-axis) tilt to a world-space point so the helix axis
// is rotated by TILT_RAD in the xy plane.
function applyTilt(x, y, z) {
  return {
    x: x * TILT_COS - y * TILT_SIN + VISUAL_X_OFFSET,
    y: x * TILT_SIN + y * TILT_COS,
    z,
  };
}

function generateBackbonePoints(theta) {
  const points = [];
  const ySpan = HELIX_Y_AMP * 2;
  for (let strand = 0; strand < 2; strand++) {
    const phase = strand * Math.PI;
    for (let i = 0; i < SAMPLES_PER_STRAND; i++) {
      const t = i / (SAMPLES_PER_STRAND - 1);
      const angle = theta + t * Math.PI * 2 * REVOLUTIONS + phase;
      const px = Math.cos(angle) * HELIX_X_AMP;
      const py = t * ySpan - HELIX_Y_AMP;
      const pz = Math.sin(angle) * HELIX_X_AMP;
      const tilted = applyTilt(px, py, pz);
      points.push({ ...tilted, kind: "strand" });
    }
  }
  // Base-pair rungs — small spheres bridging the two strands at each step
  const rungSamples = Math.floor(SAMPLES_PER_STRAND / RUNG_EVERY);
  for (let r = 0; r < rungSamples; r++) {
    const t = r / (rungSamples - 1);
    const angle = theta + t * Math.PI * 2 * REVOLUTIONS;
    const xA = Math.cos(angle) * HELIX_X_AMP;
    const zA = Math.sin(angle) * HELIX_X_AMP;
    const xB = Math.cos(angle + Math.PI) * HELIX_X_AMP;
    const zB = Math.sin(angle + Math.PI) * HELIX_X_AMP;
    const py = t * ySpan - HELIX_Y_AMP;
    for (let s = 1; s < RUNG_STEPS; s++) {
      const f = s / RUNG_STEPS;
      const rx = xA + (xB - xA) * f;
      const rz = zA + (zB - zA) * f;
      const tilted = applyTilt(rx, py, rz);
      points.push({ ...tilted, kind: "rung" });
    }
  }
  return points;
}

function renderFrame(theta) {
  const img = new Float32Array(SRC_W * SRC_H);
  const zbuf = new Float32Array(SRC_W * SRC_H).fill(-Infinity);

  const points = generateBackbonePoints(theta);
  // Render back-to-front isn't strictly needed since we z-buffer, but it makes
  // overlapping highlights look softer.
  points.sort((a, b) => a.z - b.z);

  for (const p of points) {
    const radiusWorld =
      p.kind === "strand" ? SPHERE_R_WORLD : SPHERE_R_WORLD * RUNG_R_MULT;
    // Project to screen
    const cx = (p.x + 1) * 0.5 * SRC_W;
    const cy = (p.y + 1) * 0.5 * SRC_H;
    const rx = radiusWorld * SRC_W * 0.5;
    const ry = radiusWorld * SRC_W * 0.5; // aspect-preserving in pixel space
    const cxi = Math.round(cx);
    const cyi = Math.round(cy);
    const rPx = Math.round(rx);
    if (rPx <= 0) continue;

    for (let dy = -rPx; dy <= rPx; dy++) {
      for (let dx = -rPx; dx <= rPx; dx++) {
        const d2 = dx * dx + dy * dy;
        if (d2 > rPx * rPx) continue;
        const px = cxi + dx;
        const py = cyi + dy;
        if (px < 0 || px >= SRC_W || py < 0 || py >= SRC_H) continue;

        // Sphere normal at this pixel (local frame)
        const nx = dx / rPx;
        const ny = dy / rPx;
        const nzSq = 1 - nx * nx - ny * ny;
        if (nzSq < 0) continue;
        const nz = Math.sqrt(nzSq);

        // World-space normal: screen y inverted
        const nDotL = Math.max(0, nx * LIGHT[0] + -ny * LIGHT[1] + nz * LIGHT[2]);
        // Add a touch of rim lighting for definition
        const rim = Math.pow(1 - nz, 2.5) * 0.18;
        const lit = clamp01(AMBIENT + (1 - AMBIENT) * nDotL + rim);

        // Surface depth in world units
        const pixelZ = p.z + nz * radiusWorld;
        // Depth fade — closer to camera (higher z) stays bright,
        // farther (lower z) dims toward DEPTH_FADE_MIN. zRange ≈ ±HELIX_X_AMP.
        const depthT = clamp01((pixelZ + HELIX_X_AMP) / (2 * HELIX_X_AMP));
        const depthFactor = DEPTH_FADE_MIN + (1 - DEPTH_FADE_MIN) * depthT;
        const intensity = lit * depthFactor;

        const idx = py * SRC_W + px;
        if (pixelZ > zbuf[idx]) {
          zbuf[idx] = pixelZ;
          // Rungs render dimmer so the backbones read as the primary structure
          img[idx] =
            p.kind === "rung" ? intensity * RUNG_INTENSITY : intensity;
        }
      }
    }
  }

  return img;
}

function imageToAscii(img) {
  const cellW = SRC_W / COLS;
  const cellH = SRC_H / ROWS;
  const lines = new Array(ROWS);
  for (let r = 0; r < ROWS; r++) {
    let row = "";
    const y0 = Math.floor(r * cellH);
    const y1 = Math.floor((r + 1) * cellH);
    for (let c = 0; c < COLS; c++) {
      const x0 = Math.floor(c * cellW);
      const x1 = Math.floor((c + 1) * cellW);
      let sum = 0;
      let count = 0;
      for (let y = y0; y < y1; y++) {
        const rowOff = y * SRC_W;
        for (let x = x0; x < x1; x++) {
          sum += img[rowOff + x];
          count++;
        }
      }
      const avg = count ? sum / count : 0;
      // Apply a gentle gamma so mid-tones spread across more chars
      const tone = Math.pow(avg, 0.85);
      const idx = Math.min(
        CHAR_RAMP.length - 1,
        Math.max(0, Math.floor(tone * CHAR_RAMP.length))
      );
      row += CHAR_RAMP[idx];
    }
    lines[r] = row; // keep full COLS-wide rows so the <pre> is symmetric
    //                  around the helix's geometric center (world x = 0).
  }
  return lines.join("\n");
}

// ── main ──────────────────────────────────────────────────────────────────
const frames = new Array(N_FRAMES);
for (let f = 0; f < N_FRAMES; f++) {
  const theta = f * ((Math.PI * 2) / N_FRAMES);
  const img = renderFrame(theta);
  frames[f] = imageToAscii(img);
  process.stdout.write(`\rrendered ${f + 1}/${N_FRAMES}`);
}
process.stdout.write("\n");

const out =
  `// Auto-generated by scripts/generate-helix-frames.mjs — do not hand-edit.\n` +
  `// ${N_FRAMES} frames of a rotating DNA double helix, ${COLS} cols × ${ROWS} rows.\n` +
  `export const FRAMES = ${JSON.stringify(frames)};\n` +
  `export const COLS = ${COLS};\n` +
  `export const ROWS = ${ROWS};\n`;

const libDir = `${__dirname}/../lib`;
mkdirSync(libDir, { recursive: true });
writeFileSync(`${libDir}/helixFrames.js`, out);

const totalBytes = out.length;
console.log(
  `wrote lib/helixFrames.js (${(totalBytes / 1024).toFixed(1)} KB, ${
    frames[0].length
  } chars/frame)`
);
