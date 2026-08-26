// On-device card detection & centering measurement — a compact, dependency-free
// computer-vision pipeline that runs on a downscaled camera frame (live) or a
// full still (measurement). No OpenCV / WASM: grayscale + Sobel gradient +
// 1-D projection to find the four card edges, robust line fits for a real
// (tilt-aware) quad, then a light perspective de-skew to read the inner border
// for PSA-style centering.
//
// Everything here is pure — the Web Worker and the main-thread fallback both
// import it.

import type {
  Point,
  Quad,
  ScanFrameResult,
  AlignHint,
  MeasuredCentering,
  StillMeasurement,
  CaptureQuality,
} from "./scanTypes";

// ── Grayscale + gradients ──────────────────────────────────────────────────

function toGray(data: Uint8ClampedArray, w: number, h: number): Float32Array {
  const g = new Float32Array(w * h);
  for (let i = 0, p = 0; i < g.length; i++, p += 4) {
    // Rec. 601 luma
    g[i] = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
  }
  return g;
}

interface Projections {
  col: Float32Array; // sum |d/dx| per column
  row: Float32Array; // sum |d/dy| per row
}

/** Sobel-magnitude projected onto each axis. Cheap and robust for edge lines. */
function gradientProjections(g: Float32Array, w: number, h: number): Projections {
  const col = new Float32Array(w);
  const row = new Float32Array(h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx = g[i - 1] - g[i + 1];
      const gy = g[i - w] - g[i + w];
      col[x] += Math.abs(gx);
      row[y] += Math.abs(gy);
    }
  }
  return { col, row };
}

/** Strongest gradient peak within [lo, hi) of a projection profile. */
function peakInRange(profile: Float32Array, lo: number, hi: number): number {
  lo = Math.max(1, Math.floor(lo));
  hi = Math.min(profile.length - 1, Math.ceil(hi));
  let best = lo;
  let bestVal = -1;
  for (let i = lo; i < hi; i++) {
    if (profile[i] > bestVal) {
      bestVal = profile[i];
      best = i;
    }
  }
  // sub-pixel refine via parabolic interpolation around the peak
  if (best > 0 && best < profile.length - 1) {
    const a = profile[best - 1];
    const b = profile[best];
    const c = profile[best + 1];
    const denom = a - 2 * b + c;
    if (denom !== 0) best += (0.5 * (a - c)) / denom;
  }
  return best;
}

// ── Edge refinement into a tilt-aware quad ─────────────────────────────────

/** Find the local gradient extremum along one scan line (fixed axis). */
function edgeAlong(
  g: Float32Array,
  w: number,
  h: number,
  fixed: number,
  axis: "col" | "row",
  searchLo: number,
  searchHi: number,
): number | null {
  let best = -1;
  let bestVal = 6; // ignore weak noise
  const lo = Math.max(1, Math.floor(searchLo));
  if (axis === "col") {
    const x = Math.round(fixed);
    if (x < 1 || x >= w - 1) return null;
    const hi = Math.min(h - 1, Math.ceil(searchHi));
    for (let y = lo; y < hi; y++) {
      const i = y * w + x;
      const mag = Math.abs(g[i - w] - g[i + w]);
      if (mag > bestVal) {
        bestVal = mag;
        best = y;
      }
    }
  } else {
    const y = Math.round(fixed);
    if (y < 1 || y >= h - 1) return null;
    const hi = Math.min(w - 1, Math.ceil(searchHi));
    for (let x = lo; x < hi; x++) {
      const i = y * w + x;
      const mag = Math.abs(g[i - 1] - g[i + 1]);
      if (mag > bestVal) {
        bestVal = mag;
        best = x;
      }
    }
  }
  return best < 0 ? null : best;
}

interface Line {
  a: number; // slope
  b: number; // intercept
  vertical: boolean; // true => x = a*y + b ; false => y = a*x + b
}

/** Least-squares fit with one MAD-based outlier rejection pass. */
function fitLine(pts: Point[], vertical: boolean): Line | null {
  if (pts.length < 3) return null;
  const fit = (sample: Point[]): Line => {
    let sx = 0, sy = 0, sxy = 0, sxx = 0;
    const n = sample.length;
    for (const p of sample) {
      const u = vertical ? p.y : p.x;
      const v = vertical ? p.x : p.y;
      sx += u;
      sy += v;
      sxy += u * v;
      sxx += u * u;
    }
    const denom = n * sxx - sx * sx || 1e-6;
    const a = (n * sxy - sx * sy) / denom;
    const b = (sy - a * sx) / n;
    return { a, b, vertical };
  };
  let line = fit(pts);
  const resid = pts.map((p) => {
    const u = vertical ? p.y : p.x;
    const v = vertical ? p.x : p.y;
    return Math.abs(v - (line.a * u + line.b));
  });
  const med = [...resid].sort((x, y) => x - y)[Math.floor(resid.length / 2)];
  const kept = pts.filter((_, i) => resid[i] <= Math.max(2, med * 3));
  if (kept.length >= 3 && kept.length < pts.length) line = fit(kept);
  return line;
}

function intersect(l1: Line, l2: Line): Point | null {
  // one vertical (x = a*y + b), one horizontal (y = a*x + b)
  const v = l1.vertical ? l1 : l2;
  const hz = l1.vertical ? l2 : l1;
  if (!v.vertical || hz.vertical) return null;
  // x = v.a*y + v.b ; y = hz.a*x + hz.b
  const y = (hz.a * v.b + hz.b) / (1 - hz.a * v.a || 1e-6);
  const x = v.a * y + v.b;
  return { x, y };
}

interface EdgeFit {
  quad: Quad | null;
  lines: { left: Line; right: Line; top: Line; bottom: Line } | null;
}

/**
 * Given rough axis-aligned edge positions, refine each of the 4 sides by
 * sampling the perpendicular gradient at several points, fitting a line, and
 * intersecting adjacent lines into a quad.
 */
function refineQuad(
  g: Float32Array,
  w: number,
  h: number,
  rough: { left: number; right: number; top: number; bottom: number },
): EdgeFit {
  const SAMPLES = 11;
  const spanY = rough.bottom - rough.top;
  const spanX = rough.right - rough.left;
  if (spanX < w * 0.2 || spanY < h * 0.2) return { quad: null, lines: null };

  const window = Math.max(6, Math.round(Math.min(spanX, spanY) * 0.08));

  const leftPts: Point[] = [];
  const rightPts: Point[] = [];
  for (let k = 1; k < SAMPLES - 1; k++) {
    const y = rough.top + (spanY * k) / (SAMPLES - 1);
    const lx = edgeAlong(g, w, h, y, "row", rough.left - window, rough.left + window);
    if (lx != null) leftPts.push({ x: lx, y });
    const rx = edgeAlong(g, w, h, y, "row", rough.right - window, rough.right + window);
    if (rx != null) rightPts.push({ x: rx, y });
  }
  const topPts: Point[] = [];
  const botPts: Point[] = [];
  for (let k = 1; k < SAMPLES - 1; k++) {
    const x = rough.left + (spanX * k) / (SAMPLES - 1);
    const ty = edgeAlong(g, w, h, x, "col", rough.top - window, rough.top + window);
    if (ty != null) topPts.push({ x, y: ty });
    const by = edgeAlong(g, w, h, x, "col", rough.bottom - window, rough.bottom + window);
    if (by != null) botPts.push({ x, y: by });
  }

  const left = fitLine(leftPts, true);
  const right = fitLine(rightPts, true);
  const top = fitLine(topPts, false);
  const bottom = fitLine(botPts, false);
  if (!left || !right || !top || !bottom) return { quad: null, lines: null };

  const tl = intersect(left, top);
  const tr = intersect(right, top);
  const br = intersect(right, bottom);
  const bl = intersect(left, bottom);
  if (!tl || !tr || !br || !bl) return { quad: null, lines: null };

  return { quad: [tl, tr, br, bl], lines: { left, right, top, bottom } };
}

// ── Quality measures over the detected card region ─────────────────────────

function polyArea(q: Quad): number {
  let s = 0;
  for (let i = 0; i < 4; i++) {
    const a = q[i];
    const b = q[(i + 1) % 4];
    s += a.x * b.y - b.x * a.y;
  }
  return Math.abs(s) / 2;
}

function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** 0 = perfectly square-on; grows with rotation + keystone/perspective. */
function skewScore(q: Quad): number {
  const [tl, tr, br, bl] = q;
  const topLen = dist(tl, tr);
  const botLen = dist(bl, br);
  const leftLen = dist(tl, bl);
  const rightLen = dist(tr, br);
  // opposite-side length mismatch = perspective/keystone
  const hMismatch = Math.abs(topLen - botLen) / Math.max(topLen, botLen, 1);
  const vMismatch = Math.abs(leftLen - rightLen) / Math.max(leftLen, rightLen, 1);
  // corner-angle deviation from 90°
  let angleDev = 0;
  for (let i = 0; i < 4; i++) {
    const p0 = q[(i + 3) % 4];
    const p1 = q[i];
    const p2 = q[(i + 1) % 4];
    const v1x = p0.x - p1.x, v1y = p0.y - p1.y;
    const v2x = p2.x - p1.x, v2y = p2.y - p1.y;
    const dot = v1x * v2x + v1y * v2y;
    const m = Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y) || 1;
    const ang = Math.acos(Math.max(-1, Math.min(1, dot / m)));
    angleDev += Math.abs(ang - Math.PI / 2);
  }
  angleDev /= 4; // radians
  return Math.min(1, hMismatch * 1.6 + vMismatch * 1.6 + angleDev * 1.4);
}

interface RegionStats {
  glare: number;
  brightness: number;
  sharpness: number;
}

/** Stats over an axis-aligned inset of the card's bounding box. */
function regionStats(g: Float32Array, data: Uint8ClampedArray, w: number, h: number, q: Quad): RegionStats {
  const xs = q.map((p) => p.x);
  const ys = q.map((p) => p.y);
  const x0 = Math.max(1, Math.floor(Math.min(...xs) + (Math.max(...xs) - Math.min(...xs)) * 0.12));
  const x1 = Math.min(w - 1, Math.ceil(Math.max(...xs) - (Math.max(...xs) - Math.min(...xs)) * 0.12));
  const y0 = Math.max(1, Math.floor(Math.min(...ys) + (Math.max(...ys) - Math.min(...ys)) * 0.12));
  const y1 = Math.min(h - 1, Math.ceil(Math.max(...ys) - (Math.max(...ys) - Math.min(...ys)) * 0.12));

  let n = 0;
  let sum = 0;
  let blown = 0;
  let lapSum = 0;
  let lapSq = 0;
  for (let y = y0; y < y1; y += 2) {
    for (let x = x0; x < x1; x += 2) {
      const i = y * w + x;
      const p = i * 4;
      const luma = g[i];
      sum += luma;
      const maxC = Math.max(data[p], data[p + 1], data[p + 2]);
      if (maxC >= 246 && luma >= 232) blown++;
      const lap = 4 * g[i] - g[i - 1] - g[i + 1] - g[i - w] - g[i + w];
      lapSum += lap;
      lapSq += lap * lap;
      n++;
    }
  }
  if (n === 0) return { glare: 0, brightness: 0, sharpness: 0 };
  const mean = lapSum / n;
  return {
    glare: blown / n,
    brightness: sum / n,
    sharpness: lapSq / n - mean * mean, // variance of Laplacian
  };
}

// ── Public: analyse one live frame ────────────────────────────────────────

const FILL_MIN = 0.55;
const FILL_MAX = 0.94;
const SKEW_MAX = 0.16;
const GLARE_MAX = 0.02;
const SHARP_MIN = 14;
const DARK_MIN = 55;

export function analyzeFrame(
  data: Uint8ClampedArray,
  w: number,
  h: number,
): ScanFrameResult {
  const empty: ScanFrameResult = {
    quad: null,
    frameWidth: w,
    frameHeight: h,
    fill: 0,
    skew: 1,
    glare: 0,
    sharpness: 0,
    brightness: 0,
    aligned: false,
    hint: "searching",
  };

  const g = toGray(data, w, h);
  const { col, row } = gradientProjections(g, w, h);

  // Rough edges: strongest gradient peak in the outer bands of each axis.
  const rough = {
    left: peakInRange(col, w * 0.02, w * 0.4),
    right: peakInRange(col, w * 0.6, w * 0.98),
    top: peakInRange(row, h * 0.02, h * 0.4),
    bottom: peakInRange(row, h * 0.6, h * 0.98),
  };
  if (rough.right - rough.left < w * 0.35 || rough.bottom - rough.top < h * 0.35) {
    return empty;
  }

  const { quad } = refineQuad(g, w, h, rough);
  if (!quad) return empty;

  const fill = polyArea(quad) / (w * h);
  const skew = skewScore(quad);
  const { glare, brightness, sharpness } = regionStats(g, data, w, h, quad);

  let hint: AlignHint = "ready";
  if (fill < FILL_MIN) hint = "move-closer";
  else if (fill > FILL_MAX) hint = "move-back";
  else if (brightness < DARK_MIN) hint = "too-dark";
  else if (skew > SKEW_MAX) hint = "straighten";
  else if (glare > GLARE_MAX) hint = "glare";
  else if (sharpness < SHARP_MIN) hint = "hold-steady";

  const aligned =
    fill >= FILL_MIN &&
    fill <= FILL_MAX &&
    skew <= SKEW_MAX &&
    glare <= GLARE_MAX &&
    sharpness >= SHARP_MIN &&
    brightness >= DARK_MIN;

  return {
    quad,
    frameWidth: w,
    frameHeight: h,
    fill,
    skew,
    glare,
    sharpness,
    brightness,
    aligned,
    hint: aligned ? "ready" : hint,
  };
}

// ── Public: measure a full still (de-skew + inner border → centering) ─────

/**
 * PSA-style centering sub-grade from the worst-axis larger-side percentage.
 * Thresholds follow PSA's published front-centering tolerances:
 *   55/45 → 10, 60/40 → 9, 65/35 → 8, 70/30 → 7, 80/20 → 6, 85/15 → 5.
 * A 2pp cushion is added on each step since the geometric measurement runs
 * a touch conservative (it tends to over-report off-centering slightly).
 */
export function centeringGrade(worstLargerPct: number): number {
  const p = worstLargerPct;
  if (p <= 56) return 10;
  if (p <= 61) return 9;
  if (p <= 66) return 8;
  if (p <= 71) return 7;
  if (p <= 78) return 6.5;
  if (p <= 82) return 6;
  if (p <= 87) return 5;
  if (p <= 92) return 4;
  return 3;
}

/** Bilinear-sample the source quad into an axis-aligned w×h buffer. */
function deskew(
  src: Float32Array,
  sw: number,
  sh: number,
  quad: Quad,
  dw: number,
  dh: number,
): Float32Array {
  const [tl, tr, br, bl] = quad;
  const out = new Float32Array(dw * dh);
  for (let y = 0; y < dh; y++) {
    const v = y / (dh - 1);
    for (let x = 0; x < dw; x++) {
      const u = x / (dw - 1);
      // bilinear blend of the 4 corners
      const topX = tl.x + (tr.x - tl.x) * u;
      const topY = tl.y + (tr.y - tl.y) * u;
      const botX = bl.x + (br.x - bl.x) * u;
      const botY = bl.y + (br.y - bl.y) * u;
      const sx = topX + (botX - topX) * v;
      const sy = topY + (botY - topY) * v;
      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);
      if (x0 < 0 || y0 < 0 || x0 >= sw - 1 || y0 >= sh - 1) continue;
      const fx = sx - x0;
      const fy = sy - y0;
      const i = y0 * sw + x0;
      out[y * dw + x] =
        src[i] * (1 - fx) * (1 - fy) +
        src[i + 1] * fx * (1 - fy) +
        src[i + sw] * (1 - fx) * fy +
        src[i + sw + 1] * fx * fy;
    }
  }
  return out;
}

/**
 * Walk inward from an edge of the deskewed image and return the offset (px)
 * of the first strong border line running parallel to that edge — the inner
 * frame the artwork sits inside.
 */
function innerOffset(
  d: Float32Array,
  dw: number,
  dh: number,
  side: "left" | "right" | "top" | "bottom",
): number {
  const horizontal = side === "top" || side === "bottom";
  const along = horizontal ? dw : dh;
  const across = horizontal ? dh : dw;
  const start = Math.round(across * 0.015);
  const end = Math.round(across * 0.32);
  const marginA = Math.round(along * 0.12); // ignore the corners

  let bestOff = start;
  let bestScore = 0;
  for (let off = start; off < end; off++) {
    const pos = side === "right" || side === "bottom" ? across - 1 - off : off;
    let sum = 0;
    let cnt = 0;
    for (let a = marginA; a < along - marginA; a += 2) {
      let grad: number;
      if (horizontal) {
        const i = pos * dw + a;
        if (pos < 1 || pos >= dh - 1) continue;
        grad = Math.abs(d[i - dw] - d[i + dw]);
      } else {
        const i = a * dw + pos;
        if (pos < 1 || pos >= dw - 1) continue;
        grad = Math.abs(d[i - 1] - d[i + 1]);
      }
      sum += grad;
      cnt++;
    }
    const score = cnt ? sum / cnt : 0;
    if (score > bestScore) {
      bestScore = score;
      bestOff = off;
    }
  }
  return bestOff;
}

export function measureStill(
  data: Uint8ClampedArray,
  w: number,
  h: number,
): StillMeasurement {
  const g = toGray(data, w, h);
  const { col, row } = gradientProjections(g, w, h);
  const rough = {
    left: peakInRange(col, w * 0.01, w * 0.42),
    right: peakInRange(col, w * 0.58, w * 0.99),
    top: peakInRange(row, h * 0.01, h * 0.42),
    bottom: peakInRange(row, h * 0.58, h * 0.99),
  };

  const { quad } = refineQuad(g, w, h, rough);

  const quality: CaptureQuality = { glare: 0, sharpness: 0, skew: 1, brightness: 0, flags: [] };
  if (!quad) {
    quality.flags.push("no-card-detected");
    return { quad: null, centering: null, quality };
  }

  const stats = regionStats(g, data, w, h, quad);
  quality.glare = stats.glare;
  quality.brightness = stats.brightness;
  quality.sharpness = stats.sharpness;
  quality.skew = skewScore(quad);
  if (quality.glare > 0.03) quality.flags.push("glare");
  if (quality.sharpness < 12) quality.flags.push("soft-focus");
  if (quality.skew > 0.2) quality.flags.push("angled");
  if (quality.brightness < 55) quality.flags.push("dark");

  // De-skew to a 5:7 buffer, then locate the inner border on each side.
  const DW = 500;
  const DH = 700;
  const flat = deskew(g, w, h, quad, DW, DH);
  const L = innerOffset(flat, DW, DH, "left");
  const R = innerOffset(flat, DW, DH, "right");
  const T = innerOffset(flat, DW, DH, "top");
  const B = innerOffset(flat, DW, DH, "bottom");

  const hTotal = L + R || 1;
  const vTotal = T + B || 1;
  const lrLarger = (Math.max(L, R) / hTotal) * 100;
  const tbLarger = (Math.max(T, B) / vTotal) * 100;
  const worst = Math.max(lrLarger, tbLarger);

  const fmt = (x: number) => `${Math.round(x)}/${100 - Math.round(x)}`;
  const centering: MeasuredCentering = {
    lr: fmt((L / hTotal) * 100),
    tb: fmt((T / vTotal) * 100),
    worstOffset: Math.round(worst - 50),
    grade: centeringGrade(worst),
    gaps: [L, R, T, B],
  };

  // Sanity guard: absurd measurements (border walk hit an artefact) → drop it.
  if (L + R < DW * 0.02 || T + B < DH * 0.02 || L + R > DW * 0.7 || T + B > DH * 0.7) {
    quality.flags.push("centering-uncertain");
    return { quad, centering: null, quality };
  }

  return { quad, centering, quality };
}
