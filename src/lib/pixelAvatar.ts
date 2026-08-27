// Original 16x16 pixel-art avatar builder — a chunky retro-handheld look, but
// every shape here is drawn from scratch. No game sprites or character art.

export interface AvatarConfig {
  bg: number;
  skin: number;
  hair: number;
  hairColor: number;
  eyes: number;
  outfit: number;
  accessory: number;
}

export const AVATAR_GRID = 16;

export const PALETTE = {
  bg: ["#20304a", "#3a6ea5", "#2f6b4f", "#8a4a6a", "#6a4a8a", "#a6752e", "#3a3f4a", "#c25b4a"],
  skin: ["#ffdcae", "#f0b98a", "#d99a66", "#b06a3e", "#7a4a2e", "#5a3a28"],
  hair: ["#1c1c22", "#4a2f1a", "#7a4a22", "#c98f3a", "#e3dcc4", "#b03a3a", "#356fa5", "#6a4a8a", "#4a8a6a"],
  outfit: ["#356fa5", "#b03a3a", "#4a8a4a", "#8a8a3a", "#6a4a8a", "#2f2f38", "#c96a3a", "#3aa5a5"],
  line: "#141420",
  white: "#f4f4ec",
} as const;

export const HAIR_STYLES = ["Cropped", "Swept", "Spiky", "Bowl", "Long", "Ponytail", "Buzz", "Curls"];
export const EYE_STYLES = ["Round", "Determined", "Calm", "Wink"];
export const ACCESSORIES = ["None", "Cap", "Headset", "Shades", "Bandana", "Earring"];

type Rect = [x: number, y: number, w: number, h: number, color: string];

const rnd = (n: number) => Math.floor(Math.random() * n);

export function randomAvatarConfig(): AvatarConfig {
  return {
    bg: rnd(PALETTE.bg.length),
    skin: rnd(PALETTE.skin.length),
    hair: rnd(HAIR_STYLES.length),
    hairColor: rnd(PALETTE.hair.length),
    eyes: rnd(EYE_STYLES.length),
    outfit: rnd(PALETTE.outfit.length),
    accessory: rnd(ACCESSORIES.length),
  };
}

export const DEFAULT_AVATAR: AvatarConfig = {
  bg: 1, skin: 0, hair: 1, hairColor: 1, eyes: 0, outfit: 0, accessory: 0,
};

function hairRects(style: number, c: string): Rect[] {
  switch (style) {
    case 0: // Cropped
      return [[4, 2, 8, 2, c], [3, 3, 2, 3, c], [11, 3, 2, 3, c]];
    case 1: // Swept
      return [[4, 2, 9, 2, c], [3, 3, 2, 4, c], [12, 3, 1, 3, c], [4, 4, 5, 1, c]];
    case 2: // Spiky
      return [[4, 2, 8, 2, c], [3, 1, 2, 2, c], [7, 0, 2, 2, c], [11, 1, 2, 2, c], [3, 3, 2, 3, c], [11, 3, 2, 3, c]];
    case 3: // Bowl
      return [[3, 2, 10, 3, c], [3, 4, 2, 2, c], [11, 4, 2, 2, c]];
    case 4: // Long
      return [[4, 2, 8, 2, c], [3, 3, 2, 8, c], [11, 3, 2, 8, c], [4, 4, 4, 1, c]];
    case 5: // Ponytail
      return [[4, 2, 8, 2, c], [3, 3, 2, 3, c], [11, 3, 2, 3, c], [12, 4, 2, 5, c]];
    case 6: // Buzz
      return [[4, 3, 8, 1, c], [4, 2, 8, 1, PALETTE.line]];
    case 7: // Curls
      return [[4, 1, 2, 2, c], [6, 2, 2, 1, c], [8, 1, 2, 2, c], [10, 2, 2, 1, c], [3, 3, 2, 3, c], [11, 3, 2, 3, c], [4, 3, 8, 1, c]];
    default:
      return [];
  }
}

function eyeRects(style: number): Rect[] {
  const L = PALETTE.line;
  switch (style) {
    case 0: return [[6, 7, 1, 2, L], [9, 7, 1, 2, L]]; // Round
    case 1: return [[6, 7, 2, 1, L], [8, 7, 2, 1, L]]; // Determined
    case 2: return [[6, 8, 1, 1, L], [9, 8, 1, 1, L]]; // Calm
    case 3: return [[6, 7, 1, 2, L], [8, 8, 2, 1, L]]; // Wink
    default: return [];
  }
}

function accessoryRects(acc: number): Rect[] {
  const L = PALETTE.line;
  switch (acc) {
    case 1: return [[3, 2, 10, 2, "#c23b3b"], [3, 4, 11, 1, L], [6, 1, 4, 1, "#c23b3b"]]; // Cap
    case 2: return [[2, 5, 1, 4, L], [13, 5, 1, 4, L], [2, 4, 12, 1, L], [1, 6, 1, 2, "#3aa5a5"], [14, 6, 1, 2, "#3aa5a5"]]; // Headset
    case 3: return [[5, 7, 3, 2, L], [8, 7, 3, 2, L], [7, 8, 1, 1, L]]; // Shades
    case 4: return [[3, 5, 10, 1, "#4a8a4a"], [3, 6, 2, 1, "#3a6a3a"], [11, 6, 2, 1, "#3a6a3a"]]; // Bandana
    case 5: return [[10, 10, 1, 1, "#e3c04a"]]; // Earring
    default: return [];
  }
}

function buildRects(cfg: AvatarConfig): Rect[] {
  const skin = PALETTE.skin[cfg.skin];
  const hair = PALETTE.hair[cfg.hairColor];
  const outfit = PALETTE.outfit[cfg.outfit];
  const L = PALETTE.line;

  const rects: Rect[] = [];

  // subtle ground shadow
  rects.push([2, 15, 12, 1, "rgba(0,0,0,0.18)"]);

  // shoulders / torso with an outline
  rects.push([2, 12, 12, 4, L]);
  rects.push([3, 13, 10, 3, outfit]);
  rects.push([7, 13, 2, 3, PALETTE.white]); // collar/placket
  rects.push([3, 12, 10, 1, outfit]);

  // neck
  rects.push([7, 11, 2, 1, skin]);

  // head outline + fill
  rects.push([4, 3, 8, 9, L]);
  rects.push([5, 4, 6, 7, skin]);
  rects.push([4, 5, 1, 4, skin]);
  rects.push([11, 5, 1, 4, skin]);

  // ears
  rects.push([4, 7, 1, 2, skin]);
  rects.push([11, 7, 1, 2, skin]);

  // hair (behind accessories)
  rects.push(...hairRects(cfg.hair, hair));

  // face
  rects.push(...eyeRects(cfg.eyes));
  rects.push([8, 9, 2, 1, "rgba(200,90,90,0.35)"]); // cheek
  rects.push([7, 9, 2, 1, L]); // mouth

  // accessory on top
  rects.push(...accessoryRects(cfg.accessory));

  return rects;
}

export function drawAvatar(ctx: CanvasRenderingContext2D, cfg: AvatarConfig, px: number) {
  const cell = px / AVATAR_GRID;
  ctx.imageSmoothingEnabled = false;

  // background — flat colour with a 1-cell darker frame
  ctx.fillStyle = PALETTE.bg[cfg.bg];
  ctx.fillRect(0, 0, px, px);
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.fillRect(0, 0, px, cell);
  ctx.fillRect(0, px - cell, px, cell);
  ctx.fillRect(0, 0, cell, px);
  ctx.fillRect(px - cell, 0, cell, px);

  for (const [x, y, w, h, color] of buildRects(cfg)) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x * cell), Math.round(y * cell), Math.ceil(w * cell), Math.ceil(h * cell));
  }
}

/** Render to a PNG data URL (default 256px, chunky pixels). */
export function avatarToDataUrl(cfg: AvatarConfig, px = 256): string {
  const canvas = document.createElement("canvas");
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  drawAvatar(ctx, cfg, px);
  return canvas.toDataURL("image/png");
}

export async function avatarToBlob(cfg: AvatarConfig, px = 256): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  drawAvatar(ctx, cfg, px);
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"),
  );
}
