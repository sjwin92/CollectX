// 24x24 pixel-art avatar builder — a flat, iconic "crypto-punk" style bust:
// one flat background, a hard-edged head, a single shadow tone, minimal
// features and one bold trait on top. Every shape and palette value here is
// authored from scratch; no game sprites or character likenesses are used.

export interface AvatarConfig {
  bg: number;
  skin: number;
  hair: number;
  hairColor: number;
  eyes: number;
  eyeColor: number;
  outfit: number;
  outfitStyle: number;
  accessory: number;
}

export const AVATAR_GRID = 24;

export const PALETTE = {
  bg: ["#648595", "#7a6a86", "#6f8f7a", "#575d7a", "#a6785c", "#4f8a8a", "#6a6f78", "#a86a72"],
  skin: ["#ffd9b8", "#ecb98f", "#cd9666", "#a06a3f", "#6f4525", "#d8a97f"],
  hair: ["#12121a", "#2b1d16", "#4a2f1c", "#7a4a22", "#b6802f", "#d8cfa8", "#a83a30", "#3a5f8a", "#6a4a86", "#3a7a5f"],
  eye: ["#33241a", "#14141a", "#2f5f7a", "#3a6f45", "#9a6a2a", "#4a4f58"],
  outfit: ["#34576f", "#8a3630", "#3a6f45", "#7a6a2f", "#56406f", "#2f2f38", "#a85f2f", "#2f7a7a"],
  line: "#141019",
  white: "#f4f2ea",
} as const;

export const HAIR_STYLES = ["Short", "Swept", "Spiky", "Bowl", "Long", "Ponytail", "Buzz", "Wavy", "Undercut"];
export const EYE_STYLES = ["Regular", "Wide", "Half", "Angry", "Dot"];
export const OUTFIT_STYLES = ["Tee", "Collared", "Hoodie", "Jacket"];
export const ACCESSORIES = ["None", "Cap", "Headphones", "Shades", "Scarf", "Headband", "Earbuds"];

const rnd = (n: number) => Math.floor(Math.random() * n);

export function randomAvatarConfig(): AvatarConfig {
  return {
    bg: rnd(PALETTE.bg.length),
    skin: rnd(PALETTE.skin.length),
    hair: rnd(HAIR_STYLES.length),
    hairColor: rnd(PALETTE.hair.length),
    eyes: rnd(EYE_STYLES.length),
    eyeColor: rnd(PALETTE.eye.length),
    outfit: rnd(PALETTE.outfit.length),
    outfitStyle: rnd(OUTFIT_STYLES.length),
    accessory: rnd(ACCESSORIES.length),
  };
}

export const DEFAULT_AVATAR: AvatarConfig = {
  bg: 0, skin: 1, hair: 0, hairColor: 0, eyes: 0, eyeColor: 0, outfit: 0, outfitStyle: 0, accessory: 0,
};

// ── colour helpers ──────────────────────────────────────────────────────
const parse = (h: string) => {
  const s = h.replace("#", "");
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
};
const toHex = (r: number, g: number, b: number) =>
  "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
function mix(a: string, b: string, t: number) {
  const [ar, ag, ab] = parse(a), [br, bg, bb] = parse(b);
  return toHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t);
}
const shade = (c: string) => mix(c, "#000000", 0.16);
const deep = (c: string) => mix(c, "#000000", 0.32);
const lift = (c: string) => mix(c, "#ffffff", 0.16);

// ── pixel ops (grid units; cell is an integer, origin already translated) ─
type Ctx = CanvasRenderingContext2D;
function px(ctx: Ctx, cell: number, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x * cell, y * cell, w * cell, h * cell);
}
/** Stamp a string grid. `map` translates chars to colours; " "/"." skip. */
function stamp(ctx: Ctx, cell: number, ox: number, oy: number, rows: string[], map: Record<string, string>) {
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      const c = map[rows[y][x]];
      if (c) px(ctx, cell, ox + x, oy + y, 1, 1, c);
    }
  }
}

// ── geometry ────────────────────────────────────────────────────────────
const HX = 7, HY = 5, HW = 10;   // face block: cols 7..16, rows 5..15
const EYE_Y = HY + 4;            // 9
const MOUTH_Y = HY + 8;          // 13
const BUST_Y = 18;

const FACE = [
  ".SSSSSSSS.",
  "SSSSSSSSSS",
  "SSSSSSSSSS",
  "SSSSSSSSSS",
  "SSSSSSSSSS",
  "SSSSSSSSSS",
  "SSSSSSSSSS",
  "SSSSSSSSSS",
  "SSSSSSSSSS",
  ".SSSSSSSS.",
  "..SSSSSS..",
];

function drawHead(ctx: Ctx, cell: number, sk: string) {
  const sh = shade(sk);
  stamp(ctx, cell, HX, HY, FACE, { S: sk });

  // a single restrained 1px shadow down the shaded (right) edge of the face
  for (let y = 2; y < FACE.length; y++) {
    const row = FACE[y];
    let last = -1;
    for (let x = 0; x < row.length; x++) if (row[x] === "S") last = x;
    if (last >= 0) px(ctx, cell, HX + last, HY + y, 1, 1, sh);
  }
  // one soft pixel of shadow tucked under the jaw
  px(ctx, cell, HX + 5, HY + 10, 3, 1, sh);

  // ears (1px) + neck
  px(ctx, cell, HX - 1, HY + 4, 1, 3, sk);
  px(ctx, cell, HX + HW, HY + 4, 1, 3, sh);
  px(ctx, cell, 10, 16, 4, 2, sk);
  px(ctx, cell, 13, 16, 1, 2, sh);
  px(ctx, cell, 10, 15, 4, 1, sh);
}

function drawFace(ctx: Ctx, cell: number, cfg: AvatarConfig, sk: string) {
  const sh = shade(sk);
  const ec = mix(PALETTE.eye[cfg.eyeColor], "#000000", 0.2);
  const brow = mix(PALETTE.hair[cfg.hairColor], "#000000", 0.1);
  const mouth = mix(sk, "#3a1f1f", 0.55);
  const L = 9, R = 13; // eye x per side (2px wide); gap at cols 11-12

  switch (cfg.eyes) {
    case 1: // Wide
      px(ctx, cell, L, EYE_Y, 2, 2, ec);
      px(ctx, cell, R, EYE_Y, 2, 2, ec);
      px(ctx, cell, L, EYE_Y, 1, 1, PALETTE.white);
      px(ctx, cell, R, EYE_Y, 1, 1, PALETTE.white);
      break;
    case 2: // Half — lidded
      px(ctx, cell, L, EYE_Y - 1, 2, 1, sh);
      px(ctx, cell, R, EYE_Y - 1, 2, 1, sh);
      px(ctx, cell, L, EYE_Y, 2, 1, ec);
      px(ctx, cell, R, EYE_Y, 2, 1, ec);
      break;
    case 3: // Angry — inner brows down
      px(ctx, cell, L, EYE_Y, 2, 1, ec);
      px(ctx, cell, R, EYE_Y, 2, 1, ec);
      px(ctx, cell, L + 1, EYE_Y - 1, 2, 1, brow);
      px(ctx, cell, R - 1, EYE_Y - 1, 2, 1, brow);
      break;
    case 4: // Dot
      px(ctx, cell, L + 1, EYE_Y, 1, 1, ec);
      px(ctx, cell, R, EYE_Y, 1, 1, ec);
      break;
    default: // Regular
      px(ctx, cell, L, EYE_Y, 2, 1, ec);
      px(ctx, cell, R, EYE_Y, 2, 1, ec);
  }

  // nose — a small centred shadow, a touch to the shaded side
  px(ctx, cell, 12, EYE_Y + 2, 1, 2, sh);
  px(ctx, cell, 13, EYE_Y + 3, 1, 1, sh);

  // mouth — a clean 3px line
  px(ctx, cell, 10, MOUTH_Y, 3, 1, mouth);
}

// ── outfit / bust ───────────────────────────────────────────────────────
function drawBust(ctx: Ctx, cell: number, o: string, style: number) {
  const sh = shade(o), dp = deep(o), hi = lift(o);
  px(ctx, cell, 4, BUST_Y, 16, 1, o);
  px(ctx, cell, 3, BUST_Y + 1, 18, 6, o);
  px(ctx, cell, 4, BUST_Y, 16, 1, hi);
  px(ctx, cell, 16, BUST_Y + 1, 5, 6, sh);
  px(ctx, cell, 3, BUST_Y + 5, 18, 2, sh);

  if (style === 0) {
    px(ctx, cell, 11, BUST_Y, 2, 1, dp); // Tee — crew notch
  } else if (style === 1) {
    stamp(ctx, cell, 9, BUST_Y - 1, ["WW..WW", "WW..WW", ".W..W."], { W: PALETTE.white }); // Collar
    px(ctx, cell, 9, BUST_Y - 1, 2, 2, mix(PALETTE.white, "#000", 0.1));
  } else if (style === 2) {
    px(ctx, cell, 8, BUST_Y - 1, 8, 2, dp); // Hoodie collar
    px(ctx, cell, 10, BUST_Y + 1, 1, 4, PALETTE.white);
    px(ctx, cell, 13, BUST_Y + 1, 1, 4, PALETTE.white);
  } else {
    px(ctx, cell, 10, BUST_Y, 4, 5, mix(o, "#fff", 0.55)); // Jacket over tee
    stamp(ctx, cell, 8, BUST_Y - 1, ["LL....RR", "LL....RR", ".L....R.", ".L....R."], { L: dp, R: dp });
  }
}

// ── hair ────────────────────────────────────────────────────────────────
function drawHairBack(ctx: Ctx, cell: number, h: string, style: number) {
  const sh = shade(h), dp = deep(h);
  if (style === 4) { // Long — frames the face, hangs to the shoulders
    px(ctx, cell, HX - 1, HY, HW + 2, 13, h);
    px(ctx, cell, HX - 1, HY, 1, 13, sh);
    px(ctx, cell, HX + HW, HY, 1, 13, dp);
    px(ctx, cell, HX - 1, HY + 12, HW + 2, 1, dp);
  } else if (style === 5) { // Ponytail
    px(ctx, cell, HX - 1, HY, HW + 2, 5, h);
    px(ctx, cell, HX + HW, HY + 1, 3, 8, h);
    px(ctx, cell, HX + HW + 2, HY + 2, 1, 6, dp);
    px(ctx, cell, HX + HW - 1, HY, 2, 2, dp); // tie
  } else if (style === 7) { // Wavy — medium side length
    px(ctx, cell, HX - 1, HY + 1, 1, 8, sh);
    px(ctx, cell, HX + HW, HY + 1, 1, 8, dp);
  }
}

const HAIR_FRONT: Record<number, string[]> = {
  0: ["..HHHHHH..", ".HHHHHHHH.", "HHHHHHHHHH", "HHHHHHHHHH", "HssssssssH", "H........H"],
  1: ["..HHHHHHH.", ".HHHHHHHHH", "HHHHHHHHHH", "HHHHHHHHHH", "HHHHHHsssH", "HHHH....sH"],
  2: ["..H...HH..", ".HHH.HHHHH", "HHHHHHHHHH", "HHHHHHHHHH", "HssssssssH", "Hs......sH"],
  3: [".HHHHHHHH.", "HHHHHHHHHH", "HHHHHHHHHH", "HHHHHHHHHH", "HHHHHHHHHH", "HssssssssH"],
  4: ["..HHHHHH..", ".HHHHHHHH.", "HHHHHHHHHH", "HHHHHHHHHH", "HssssssssH", "H........H"],
  5: ["..HHHHHHH.", ".HHHHHHHHH", "HHHHHHHHHH", "HHHHHHHHHH", "HssssssssH", "H........H"],
  6: ["..hhhhhh..", ".hhhhhhhh.", "hhhhhhhhhh", "hhhhhhhhhh"],
  7: [".H.HH.H.H.", "HHHHHHHHHH", "HHHHHHHHHH", "HHHHHHHHHH", "HsssssssH.", ".H..ss..H."],
  8: ["..HHHHHHH.", ".HHHHHHHHH", "HHHHHHHHHH", "HHHHHHHHHH", "..HHHHHH..", "..ssssss.."],
};

function drawHairFront(ctx: Ctx, cell: number, h: string, style: number) {
  const rows = HAIR_FRONT[style] ?? HAIR_FRONT[0];
  stamp(ctx, cell, HX, HY - 2, rows, { H: h, s: shade(h), h: mix(h, "#000000", 0.12) });
}

// ── accessories ─────────────────────────────────────────────────────────
function drawAccessory(ctx: Ctx, cell: number, acc: number) {
  const W = PALETTE.white, L = PALETTE.line;
  switch (acc) {
    case 1: { // Cap
      const c = "#c0392b", cs = shade(c);
      px(ctx, cell, HX, HY - 3, HW, 1, c);
      px(ctx, cell, HX - 1, HY - 2, HW + 2, 3, c);
      px(ctx, cell, HX - 1, HY - 2, HW + 2, 1, lift(c));
      px(ctx, cell, HX - 1, HY + 1, HW + 2, 1, cs);
      px(ctx, cell, HX + HW, HY + 1, 6, 1, cs); // brim
      px(ctx, cell, HX + HW, HY + 2, 5, 1, deep(c));
      px(ctx, cell, HX + 4, HY - 4, 1, 1, lift(c)); // button
      break;
    }
    case 2: { // Headphones
      px(ctx, cell, HX + 1, HY - 3, HW - 2, 1, "#2a2a30");
      px(ctx, cell, HX, HY - 2, 1, 2, "#2a2a30");
      px(ctx, cell, HX + HW - 1, HY - 2, 1, 2, "#2a2a30");
      const cup = "#2f7a8a";
      px(ctx, cell, HX - 2, HY + 3, 2, 4, cup);
      px(ctx, cell, HX + HW, HY + 3, 2, 4, cup);
      px(ctx, cell, HX - 2, HY + 3, 1, 4, lift(cup));
      px(ctx, cell, HX + HW + 1, HY + 3, 1, 4, deep(cup));
      break;
    }
    case 3: { // Shades
      const f = "#1c1c22";
      px(ctx, cell, 8, EYE_Y - 1, 3, 3, f);
      px(ctx, cell, 13, EYE_Y - 1, 3, 3, f);
      px(ctx, cell, 11, EYE_Y, 2, 1, f);          // bridge
      px(ctx, cell, HX - 1, EYE_Y - 1, 1, 1, f);  // temples
      px(ctx, cell, HX + HW, EYE_Y - 1, 1, 1, f);
      px(ctx, cell, 8, EYE_Y - 1, 1, 1, "#5b6b7a");
      px(ctx, cell, 13, EYE_Y - 1, 1, 1, "#5b6b7a");
      break;
    }
    case 4: { // Scarf
      const s = "#3a6f45";
      px(ctx, cell, HX, 15, HW, 3, s);
      px(ctx, cell, HX, 15, HW, 1, lift(s));
      px(ctx, cell, HX, 17, HW, 1, shade(s));
      px(ctx, cell, 14, 18, 2, 4, shade(s));
      px(ctx, cell, 15, 18, 1, 4, deep(s));
      break;
    }
    case 5: { // Headband
      const b = "#2f5f9a";
      px(ctx, cell, HX, HY + 2, HW, 1, b);
      px(ctx, cell, HX, HY + 2, HW, 1, lift(b));
      px(ctx, cell, HX, HY + 3, 1, 1, shade(b));
      px(ctx, cell, HX - 1, HY + 2, 1, 2, shade(b)); // knot
      break;
    }
    case 6: { // Earbuds
      px(ctx, cell, HX - 1, HY + 5, 1, 1, W);
      px(ctx, cell, HX + HW, HY + 5, 1, 1, W);
      px(ctx, cell, HX - 1, HY + 6, 1, 6, mix(W, L, 0.15));
      break;
    }
  }
}

// ── compose ─────────────────────────────────────────────────────────────
function normCfg(raw: Partial<AvatarConfig> | null | undefined): AvatarConfig {
  const n = (v: unknown, len: number) => {
    const i = Math.trunc(Number(v));
    return Number.isFinite(i) && i >= 0 ? i % len : 0;
  };
  return {
    bg: n(raw?.bg, PALETTE.bg.length),
    skin: n(raw?.skin, PALETTE.skin.length),
    hair: n(raw?.hair, HAIR_STYLES.length),
    hairColor: n(raw?.hairColor, PALETTE.hair.length),
    eyes: n(raw?.eyes, EYE_STYLES.length),
    eyeColor: n(raw?.eyeColor, PALETTE.eye.length),
    outfit: n(raw?.outfit, PALETTE.outfit.length),
    outfitStyle: n(raw?.outfitStyle, OUTFIT_STYLES.length),
    accessory: n(raw?.accessory, ACCESSORIES.length),
  };
}

export function drawAvatar(ctx: Ctx, raw: Partial<AvatarConfig>, sizePx: number) {
  const cfg = normCfg(raw);
  const cell = Math.max(1, Math.floor(sizePx / AVATAR_GRID));
  const pad = Math.round((sizePx - cell * AVATAR_GRID) / 2);
  ctx.imageSmoothingEnabled = false;

  const bg = PALETTE.bg[cfg.bg];
  const skin = PALETTE.skin[cfg.skin];
  const hair = PALETTE.hair[cfg.hairColor];
  const outfit = PALETTE.outfit[cfg.outfit];

  // flat background — the pad border is the same flat colour, so it's seamless
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, sizePx, sizePx);

  ctx.save();
  ctx.translate(pad, pad);
  drawHairBack(ctx, cell, hair, cfg.hair);
  drawBust(ctx, cell, outfit, cfg.outfitStyle);
  drawHead(ctx, cell, skin);
  drawFace(ctx, cell, cfg, skin);
  drawHairFront(ctx, cell, hair, cfg.hair);
  drawAccessory(ctx, cell, cfg.accessory);
  ctx.restore();
}

// ── outputs ─────────────────────────────────────────────────────────────
function render(cfg: Partial<AvatarConfig>, sizePx: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = sizePx;
  canvas.height = sizePx;
  const ctx = canvas.getContext("2d");
  if (ctx) drawAvatar(ctx, cfg, sizePx);
  return canvas;
}

export const avatarToDataUrl = (cfg: AvatarConfig, sizePx = 336) => render(cfg, sizePx).toDataURL("image/png");

export function avatarToBlob(cfg: AvatarConfig, sizePx = 336): Promise<Blob> {
  return new Promise((resolve, reject) =>
    render(cfg, sizePx).toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"),
  );
}
