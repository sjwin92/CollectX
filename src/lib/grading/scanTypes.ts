// Shared types for the on-device card scanner. Kept dependency-free so the
// same code runs on the main thread and inside the Web Worker.

export interface Point {
  x: number;
  y: number;
}

/** Four corners, clockwise from top-left, in source-image pixels. */
export type Quad = [Point, Point, Point, Point];

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export type AlignHint =
  | "searching"
  | "move-closer"
  | "move-back"
  | "straighten"
  | "glare"
  | "too-dark"
  | "hold-steady"
  | "ready";

/** Result of analysing a single live camera frame (downscaled). */
export interface ScanFrameResult {
  /** Detected card outline in the analysed frame's pixel space, or null. */
  quad: Quad | null;
  /** Frame dimensions the quad is expressed in. */
  frameWidth: number;
  frameHeight: number;
  /** 0..1 — how much of the target guide box the card fills. */
  fill: number;
  /** 0..1 — 0 is perfectly square to camera, higher is more tilted/rotated. */
  skew: number;
  /** 0..1 — fraction of near-blown-out pixels over the card face. */
  glare: number;
  /** Relative focus measure (variance of Laplacian). Higher = sharper. */
  sharpness: number;
  /** Mean luma over the card face, 0..255. */
  brightness: number;
  /** True when every capture check passes. */
  aligned: boolean;
  hint: AlignHint;
}

/** Centering measured geometrically from a still. */
export interface MeasuredCentering {
  /** e.g. "56/44" — left/right split of the horizontal border budget. */
  lr: string;
  /** e.g. "52/48" — top/bottom split. */
  tb: string;
  /** Worst-axis deviation from a perfect 50/50, in percentage points. */
  worstOffset: number;
  /** PSA-style centering sub-grade, 1..10, from the worst axis. */
  grade: number;
  /** Raw border gaps in deskewed pixels: [left, right, top, bottom]. */
  gaps: [number, number, number, number];
}

export interface CaptureQuality {
  glare: number;
  sharpness: number;
  skew: number;
  brightness: number;
  /** Short machine tags describing what (if anything) was wrong. */
  flags: string[];
}

export interface StillMeasurement {
  quad: Quad | null;
  centering: MeasuredCentering | null;
  quality: CaptureQuality;
}
