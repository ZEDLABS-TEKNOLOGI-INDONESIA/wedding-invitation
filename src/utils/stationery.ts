/**
 * Stationery renderer — kartu QR & surat undangan bergaya floral elegan.
 * Semua digambar di <canvas> agar bisa memakai font script (Great Vibes)
 * dan Cormorant Garamond, gradasi lembut, serta ornamen bunga cat air.
 */
import QRCode from "qrcode";

export interface StationeryTheme {
  id: string;
  name: string;
  paper: [string, string];
  ink: string;
  muted: string;
  accent: string;
  accentSoft: string;
  petal: string;
  petalDeep: string;
  petalLight: string;
  leaf: string;
  leafDeep: string;
  gold: string;
}

export const STATIONERY_THEMES: StationeryTheme[] = [
  {
    id: "sage",
    name: "Sage Garden",
    paper: ["#FCFBF6", "#F1F2E7"],
    ink: "#2F3B27",
    muted: "#7A8270",
    accent: "#6B7F4E",
    accentSoft: "#CBD5B6",
    petal: "#F3D6CC",
    petalDeep: "#D59B8C",
    petalLight: "#FFF4EF",
    leaf: "#A3B38A",
    leafDeep: "#5E7247",
    gold: "#B89B5E",
  },
  {
    id: "blush",
    name: "Blush Rose",
    paper: ["#FFF9F7", "#FBECE9"],
    ink: "#4E3035",
    muted: "#9A787C",
    accent: "#B4677A",
    accentSoft: "#EDC9CF",
    petal: "#F4C3CB",
    petalDeep: "#D2808F",
    petalLight: "#FFF1F3",
    leaf: "#AEBE9F",
    leafDeep: "#6C8264",
    gold: "#C4A06A",
  },
  {
    id: "maroon",
    name: "Burgundy Velvet",
    paper: ["#FCF8F5", "#F3E8E2"],
    ink: "#441420",
    muted: "#8C6168",
    accent: "#7E1F33",
    accentSoft: "#DDB7BE",
    petal: "#CF7A88",
    petalDeep: "#8C2B41",
    petalLight: "#F7DCE0",
    leaf: "#909C7C",
    leafDeep: "#535E48",
    gold: "#B8955A",
  },
  {
    id: "gold",
    name: "Champagne Gold",
    paper: ["#FFFCF5", "#F6EEDB"],
    ink: "#45351B",
    muted: "#8F7C5A",
    accent: "#A27C2C",
    accentSoft: "#E8D6A8",
    petal: "#F2E1C0",
    petalDeep: "#D2AF6E",
    petalLight: "#FFF9EC",
    leaf: "#B7B58E",
    leafDeep: "#787750",
    gold: "#B8913A",
  },
  {
    id: "blue",
    name: "Dusty Blue",
    paper: ["#F9FBFD", "#EAF0F5"],
    ink: "#26374D",
    muted: "#74859A",
    accent: "#56708F",
    accentSoft: "#C3D1E0",
    petal: "#DCE6F0",
    petalDeep: "#94ABC5",
    petalLight: "#F7FAFD",
    leaf: "#A8B6A9",
    leafDeep: "#62766A",
    gold: "#B49E6E",
  },
];

type Ctx = CanvasRenderingContext2D;

export const SCRIPT_FONT = `"Great Vibes", "Pinyon Script", cursive`;
export const SERIF_FONT = `"Cormorant Garamond", "Times New Roman", serif`;

const TAU = Math.PI * 2;

/* ------------------------------------------------------------------ */
/* Fonts                                                               */
/* ------------------------------------------------------------------ */

let fontsPromise: Promise<void> | null = null;

export const ensureStationeryFonts = (): Promise<void> => {
  if (typeof document === "undefined") return Promise.resolve();
  if (fontsPromise) return fontsPromise;
  fontsPromise = (async () => {
    const id = "stationery-fonts";
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Great+Vibes&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&display=swap";
      const loaded = new Promise<void>((resolve) => {
        link.onload = () => resolve();
        link.onerror = () => resolve();
        setTimeout(resolve, 4000);
      });
      document.head.appendChild(link);
      await loaded;
    }
    try {
      await Promise.all([
        document.fonts.load(`64px "Great Vibes"`),
        document.fonts.load(`500 48px "Cormorant Garamond"`),
        document.fonts.load(`600 48px "Cormorant Garamond"`),
        document.fonts.load(`italic 500 48px "Cormorant Garamond"`),
      ]);
    } catch {
      /* fallback ke font sistem */
    }
  })();
  return fontsPromise;
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export const hexA = (hex: string, alpha: number): string => {
  const h = hex.replace("#", "");
  const n = parseInt(
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h,
    16
  );
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
};

const createCanvas = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
};

const setSpacing = (ctx: Ctx, px: number) => {
  (ctx as unknown as { letterSpacing: string }).letterSpacing = `${px}px`;
};

const serif = (px: number, weight = 500, italic = false) =>
  `${italic ? "italic " : ""}${weight} ${px}px ${SERIF_FONT}`;
const script = (px: number) => `${px}px ${SCRIPT_FONT}`;

export const fitFont = (
  ctx: Ctx,
  text: string,
  maxW: number,
  size: number,
  fontFn: (px: number) => string,
  min = 18
): number => {
  let s = size;
  ctx.font = fontFn(s);
  while (ctx.measureText(text).width > maxW && s > min) {
    s -= 2;
    ctx.font = fontFn(s);
  }
  return s;
};

export const wrapText = (ctx: Ctx, text: string, maxW: number): string[] => {
  const lines: string[] = [];
  for (const para of String(text || "").split(/\n/)) {
    const words = para.split(/\s+/).filter(Boolean);
    let line = "";
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > maxW && line) {
        lines.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
};

const drawLines = (
  ctx: Ctx,
  lines: string[],
  x: number,
  y: number,
  lh: number
): number => {
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lh));
  return y + lines.length * lh;
};

const roundRect = (
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

/* ------------------------------------------------------------------ */
/* Paper & frame                                                       */
/* ------------------------------------------------------------------ */

export const drawPaper = (ctx: Ctx, w: number, h: number, t: StationeryTheme) => {
  const g = ctx.createLinearGradient(0, 0, w * 0.3, h);
  g.addColorStop(0, t.paper[0]);
  g.addColorStop(1, t.paper[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const glow = (x: number, y: number, r: number, color: string, a: number) => {
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, hexA(color, a));
    rg.addColorStop(1, hexA(color, 0));
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, w, h);
  };
  glow(0, 0, w * 0.7, t.petal, 0.35);
  glow(w, h, w * 0.75, t.petal, 0.3);
  glow(w * 0.5, h * 0.45, w * 0.6, "#ffffff", 0.55);
};

export const drawFrame = (ctx: Ctx, w: number, h: number, t: StationeryTheme) => {
  const s = w / 1240;
  const m = 46 * s;
  const gap = 14 * s;
  ctx.save();
  ctx.strokeStyle = hexA(t.accent, 0.55);
  ctx.lineWidth = 2.2 * s;
  ctx.strokeRect(m, m, w - m * 2, h - m * 2);
  ctx.strokeStyle = hexA(t.gold, 0.6);
  ctx.lineWidth = 1 * s;
  ctx.strokeRect(m + gap, m + gap, w - (m + gap) * 2, h - (m + gap) * 2);

  // ornamen tengah sisi atas & bawah
  [m, h - m].forEach((y) => {
    ctx.fillStyle = t.paper[0];
    ctx.fillRect(w / 2 - 70 * s, y - 8 * s, 140 * s, 16 * s);
    drawDiamond(ctx, w / 2, y, 7 * s, t.gold);
    [-1, 1].forEach((d) => {
      ctx.beginPath();
      ctx.arc(w / 2 + d * 26 * s, y, 3 * s, 0, TAU);
      ctx.fillStyle = hexA(t.accent, 0.7);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(w / 2 + d * 46 * s, y, 2 * s, 0, TAU);
      ctx.fillStyle = hexA(t.gold, 0.7);
      ctx.fill();
    });
  });
  ctx.restore();
};

const drawDiamond = (ctx: Ctx, x: number, y: number, r: number, c: string) => {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r, y);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r, y);
  ctx.closePath();
  ctx.fillStyle = c;
  ctx.fill();
};

export const drawDivider = (
  ctx: Ctx,
  cx: number,
  y: number,
  half: number,
  t: StationeryTheme
) => {
  ctx.save();
  [-1, 1].forEach((d) => {
    const g = ctx.createLinearGradient(cx, y, cx + d * half, y);
    g.addColorStop(0, hexA(t.gold, 0.9));
    g.addColorStop(1, hexA(t.gold, 0));
    ctx.strokeStyle = g;
    ctx.lineWidth = Math.max(1, half / 160);
    ctx.beginPath();
    ctx.moveTo(cx + d * half * 0.12, y);
    ctx.lineTo(cx + d * half, y);
    ctx.stroke();
  });
  drawHeart(ctx, cx, y, half * 0.05, t.accent);
  ctx.restore();
};

export const drawHeart = (
  ctx: Ctx,
  x: number,
  y: number,
  r: number,
  color: string
) => {
  ctx.save();
  ctx.translate(x, y - r * 0.2);
  ctx.beginPath();
  ctx.moveTo(0, r * 0.35);
  ctx.bezierCurveTo(-r * 1.2, -r * 0.4, -r * 0.55, -r * 1.25, 0, -r * 0.5);
  ctx.bezierCurveTo(r * 0.55, -r * 1.25, r * 1.2, -r * 0.4, 0, r * 0.35);
  ctx.closePath();
  ctx.translate(0, 0);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
};

/* ------------------------------------------------------------------ */
/* Botanical ornaments                                                 */
/* ------------------------------------------------------------------ */

const petalPath = (ctx: Ctx, len: number, wid: number) => {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(wid, -len * 0.2, wid * 0.95, -len * 0.92, 0, -len);
  ctx.bezierCurveTo(-wid * 0.95, -len * 0.92, -wid, -len * 0.2, 0, 0);
  ctx.closePath();
};

export const drawBloom = (
  ctx: Ctx,
  x: number,
  y: number,
  r: number,
  t: StationeryTheme,
  rot = 0
) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  const layers = [
    { n: 8, len: 1, w: 0.55, off: 0 },
    { n: 7, len: 0.8, w: 0.52, off: 0.4 },
    { n: 6, len: 0.6, w: 0.5, off: 0.15 },
    { n: 5, len: 0.4, w: 0.48, off: 0.6 },
  ];
  layers.forEach((L, li) => {
    for (let i = 0; i < L.n; i++) {
      ctx.save();
      ctx.rotate((i * TAU) / L.n + L.off);
      const len = r * L.len;
      petalPath(ctx, len, r * L.w * (0.9 + ((i * 37) % 10) / 50));
      const g = ctx.createLinearGradient(0, 0, 0, -len);
      g.addColorStop(0, t.petalDeep);
      g.addColorStop(0.5, t.petal);
      g.addColorStop(1, t.petalLight);
      ctx.fillStyle = g;
      if (li === 0) {
        ctx.shadowColor = hexA(t.petalDeep, 0.25);
        ctx.shadowBlur = r * 0.18;
      }
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = hexA(t.petalDeep, 0.35);
      ctx.lineWidth = Math.max(0.6, r * 0.015);
      ctx.stroke();
      ctx.restore();
    }
  });
  // putik
  const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.2);
  cg.addColorStop(0, hexA(t.gold, 0.95));
  cg.addColorStop(1, hexA(t.petalDeep, 0.9));
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.16, 0, TAU);
  ctx.fill();
  for (let i = 0; i < 10; i++) {
    const a = (i * TAU) / 10;
    ctx.beginPath();
    ctx.arc(
      Math.cos(a) * r * 0.22,
      Math.sin(a) * r * 0.22,
      r * 0.028,
      0,
      TAU
    );
    ctx.fillStyle = t.gold;
    ctx.fill();
  }
  ctx.restore();
};

const leafPath = (ctx: Ctx, len: number, wid: number) => {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(wid, -len * 0.25, wid * 0.8, -len * 0.75, 0, -len);
  ctx.bezierCurveTo(-wid * 0.8, -len * 0.75, -wid, -len * 0.25, 0, 0);
  ctx.closePath();
};

export const drawLeaf = (
  ctx: Ctx,
  x: number,
  y: number,
  len: number,
  angle: number,
  t: StationeryTheme,
  alpha = 1
) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalAlpha *= alpha;
  leafPath(ctx, len, len * 0.32);
  const g = ctx.createLinearGradient(-len * 0.3, 0, len * 0.3, -len);
  g.addColorStop(0, t.leafDeep);
  g.addColorStop(1, t.leaf);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = hexA(t.leafDeep, 0.5);
  ctx.lineWidth = Math.max(0.6, len * 0.015);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.05, -len * 0.5, 0, -len * 0.95);
  ctx.stroke();
  ctx.restore();
};

/** Ranting eucalyptus/daun kecil di sepanjang batang melengkung. */
export const drawSprig = (
  ctx: Ctx,
  x: number,
  y: number,
  len: number,
  angle: number,
  t: StationeryTheme,
  curve = 0.22
) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const cx = len * curve;
  const cy = -len / 2;
  const ex = 0;
  const ey = -len;
  ctx.strokeStyle = hexA(t.leafDeep, 0.8);
  ctx.lineWidth = Math.max(1, len * 0.012);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(cx, cy, ex, ey);
  ctx.stroke();
  const steps = 8;
  for (let k = 1; k <= steps; k++) {
    const u = k / (steps + 1);
    const px = 2 * (1 - u) * u * cx + u * u * ex;
    const py = 2 * (1 - u) * u * cy + u * u * ey;
    const tx = 2 * (1 - u) * cx + 2 * u * (ex - cx);
    const ty = 2 * (1 - u) * cy + 2 * u * (ey - cy);
    const tan = Math.atan2(ty, tx) + Math.PI / 2;
    const size = len * 0.2 * (1 - u * 0.55);
    const side = k % 2 === 0 ? 1 : -1;
    drawLeaf(ctx, px, py, size, tan + side * 0.85, t, 0.92);
    drawLeaf(ctx, px, py, size * 0.85, tan - side * 0.75, t, 0.75);
  }
  drawLeaf(ctx, ex, ey, len * 0.12, 0, t);
  ctx.restore();
};

const drawBerries = (
  ctx: Ctx,
  x: number,
  y: number,
  r: number,
  t: StationeryTheme,
  n = 5
) => {
  for (let i = 0; i < n; i++) {
    const a = (i * TAU) / n + 0.3;
    const d = r * (1.4 + (i % 2) * 0.7);
    const bx = x + Math.cos(a) * d;
    const by = y + Math.sin(a) * d;
    ctx.strokeStyle = hexA(t.leafDeep, 0.5);
    ctx.lineWidth = Math.max(0.6, r * 0.12);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(bx, by);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(bx, by, r * 0.55, 0, TAU);
    ctx.fillStyle = i % 2 ? t.gold : hexA(t.petalLight, 0.95);
    ctx.fill();
    ctx.strokeStyle = hexA(t.gold, 0.6);
    ctx.stroke();
  }
};

/** Rangkaian bunga sudut; digambar dalam koordinat lokal (+x,+y ke dalam halaman). */
const paintBouquet = (ctx: Ctx, s: number, t: StationeryTheme) => {
  const dir = (deg: number) => (deg * Math.PI) / 180 + Math.PI / 2;
  drawSprig(ctx, 30 * s, 30 * s, 300 * s, dir(4), t, 0.18);
  drawSprig(ctx, 30 * s, 30 * s, 300 * s, dir(86), t, -0.18);
  drawSprig(ctx, 40 * s, 40 * s, 230 * s, dir(45), t, 0.12);
  drawSprig(ctx, 40 * s, 40 * s, 190 * s, dir(24), t, -0.2);
  drawSprig(ctx, 40 * s, 40 * s, 190 * s, dir(66), t, 0.2);
  [12, 34, 56, 78].forEach((deg, i) =>
    drawLeaf(ctx, 60 * s, 60 * s, (110 - i * 6) * s, dir(deg), t, 0.95)
  );
  drawBerries(ctx, 205 * s, 70 * s, 7 * s, t);
  drawBerries(ctx, 70 * s, 205 * s, 7 * s, t);
  drawBloom(ctx, 150 * s, 48 * s, 40 * s, t, 0.6);
  drawBloom(ctx, 48 * s, 150 * s, 40 * s, t, 1.4);
  drawBloom(ctx, 78 * s, 78 * s, 72 * s, t, 0.2);
  drawBloom(ctx, 235 * s, 28 * s, 18 * s, t, 0.9);
  drawBloom(ctx, 28 * s, 235 * s, 18 * s, t, 2.1);
};

const bouquetCache = new Map<string, HTMLCanvasElement>();

const getBouquet = (t: StationeryTheme): HTMLCanvasElement => {
  const hit = bouquetCache.get(t.id);
  if (hit) return hit;
  const size = 560;
  const c = createCanvas(size, size);
  const ctx = c.getContext("2d")!;
  paintBouquet(ctx, 1.4, t);
  bouquetCache.set(t.id, c);
  return c;
};

/** corner: 0=kiri-atas, 1=kanan-atas, 2=kanan-bawah, 3=kiri-bawah */
export const drawCornerBouquet = (
  ctx: Ctx,
  w: number,
  h: number,
  corner: 0 | 1 | 2 | 3,
  scale: number,
  t: StationeryTheme
) => {
  const sprite = getBouquet(t);
  const size = sprite.width * scale * (w / 1240);
  const pos = [
    [0, 0],
    [w, 0],
    [w, h],
    [0, h],
  ][corner];
  ctx.save();
  ctx.translate(pos[0], pos[1]);
  ctx.rotate((corner * Math.PI) / 2);
  ctx.drawImage(sprite, -10, -10, size, size);
  ctx.restore();
};

/* ------------------------------------------------------------------ */
/* Monogram & styled QR                                                */
/* ------------------------------------------------------------------ */

export const drawMonogram = (
  ctx: Ctx,
  cx: number,
  cy: number,
  r: number,
  a: string,
  b: string,
  t: StationeryTheme
) => {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.strokeStyle = t.gold;
  ctx.lineWidth = r * 0.06;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.9, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = hexA(t.accent, 0.4);
  ctx.lineWidth = r * 0.025;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.78, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = t.ink;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = script(r * 0.8);
  ctx.fillText(a, cx - r * 0.3, cy + r * 0.02);
  ctx.fillText(b, cx + r * 0.32, cy + r * 0.02);
  drawHeart(ctx, cx, cy + r * 0.05, r * 0.14, t.accent);
  ctx.restore();
};

interface QrModel {
  modules: { size: number; get: (r: number, c: number) => number | boolean };
}

export const drawStyledQr = (
  ctx: Ctx,
  text: string,
  x: number,
  y: number,
  size: number,
  t: StationeryTheme,
  monogram?: { a: string; b: string }
) => {
  const model = (
    QRCode as unknown as {
      create: (txt: string, o: { errorCorrectionLevel: string }) => QrModel;
    }
  ).create(text || " ", { errorCorrectionLevel: "H" });
  const n = model.modules.size;
  const cell = size / n;
  const isEye = (r: number, c: number) =>
    (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);

  ctx.save();
  ctx.fillStyle = t.ink;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (isEye(r, c) || !model.modules.get(r, c)) continue;
      ctx.beginPath();
      ctx.arc(
        x + (c + 0.5) * cell,
        y + (r + 0.5) * cell,
        cell * 0.46,
        0,
        TAU
      );
      ctx.fill();
    }
  }
  const eye = (r0: number, c0: number) => {
    const ex = x + c0 * cell;
    const ey = y + r0 * cell;
    ctx.fillStyle = t.ink;
    roundRect(ctx, ex, ey, cell * 7, cell * 7, cell * 2.2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    roundRect(ctx, ex + cell, ey + cell, cell * 5, cell * 5, cell * 1.6);
    ctx.fill();
    ctx.fillStyle = t.accent;
    roundRect(ctx, ex + cell * 2, ey + cell * 2, cell * 3, cell * 3, cell * 1);
    ctx.fill();
  };
  eye(0, 0);
  eye(0, n - 7);
  eye(n - 7, 0);
  if (monogram) {
    const r = size * 0.12;
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, r + cell * 0.8, 0, TAU);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    drawMonogram(ctx, x + size / 2, y + size / 2, r, monogram.a, monogram.b, t);
  }
  ctx.restore();
};

const drawQrPanel = (
  ctx: Ctx,
  text: string,
  cx: number,
  top: number,
  qrSize: number,
  t: StationeryTheme,
  monogram?: { a: string; b: string }
) => {
  const pad = qrSize * 0.09;
  const box = qrSize + pad * 2;
  const x = cx - box / 2;
  ctx.save();
  ctx.shadowColor = hexA(t.petalDeep, 0.25);
  ctx.shadowBlur = box * 0.06;
  ctx.shadowOffsetY = box * 0.015;
  roundRect(ctx, x, top, box, box, box * 0.07);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = hexA(t.gold, 0.55);
  ctx.lineWidth = Math.max(1, box * 0.004);
  roundRect(
    ctx,
    x + pad * 0.35,
    top + pad * 0.35,
    box - pad * 0.7,
    box - pad * 0.7,
    box * 0.05
  );
  ctx.stroke();
  ctx.restore();
  drawStyledQr(ctx, text, x + pad, top + pad, qrSize, t, monogram);
  return top + box;
};

/* ------------------------------------------------------------------ */
/* QR Card                                                             */
/* ------------------------------------------------------------------ */

export interface QrCardOptions {
  url: string;
  guestName?: string;
  bride: string;
  groom: string;
  dateText?: string;
  theme: StationeryTheme;
  width?: number;
}

export const renderQrCard = (o: QrCardOptions): HTMLCanvasElement => {
  const W = o.width || 1080;
  const H = Math.round(W * (4 / 3));
  const s = W / 1080;
  const t = o.theme;
  const c = createCanvas(W, H);
  const ctx = c.getContext("2d")!;
  const cx = W / 2;

  drawPaper(ctx, W, H, t);
  drawFrame(ctx, W, H, t);
  drawCornerBouquet(ctx, W, H, 0, 0.62, t);
  drawCornerBouquet(ctx, W, H, 2, 0.62, t);
  drawCornerBouquet(ctx, W, H, 1, 0.3, t);
  drawCornerBouquet(ctx, W, H, 3, 0.3, t);

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = t.muted;
  ctx.font = serif(26 * s, 600);
  setSpacing(ctx, 9 * s);
  ctx.fillText("THE WEDDING OF", cx, 190 * s);
  setSpacing(ctx, 0);

  const names = `${o.bride} & ${o.groom}`;
  fitFont(ctx, names, 760 * s, 96 * s, script);
  ctx.fillStyle = t.ink;
  ctx.fillText(names, cx, 300 * s);

  if (o.dateText) {
    ctx.font = serif(28 * s, 500, true);
    ctx.fillStyle = t.muted;
    ctx.fillText(o.dateText, cx, 352 * s);
  }
  drawDivider(ctx, cx, 385 * s, 150 * s, t);

  const bottom = drawQrPanel(ctx, o.url, cx, 420 * s, 520 * s, t, {
    a: (o.bride || "A").charAt(0).toUpperCase(),
    b: (o.groom || "B").charAt(0).toUpperCase(),
  });

  ctx.fillStyle = t.muted;
  ctx.font = serif(24 * s, 600);
  setSpacing(ctx, 5 * s);
  ctx.fillText("KEPADA YTH.", cx, bottom + 70 * s);
  setSpacing(ctx, 0);

  ctx.fillStyle = t.ink;
  ctx.font = serif(48 * s, 600, true);
  const lines = wrapText(ctx, o.guestName || "Tamu Undangan", 760 * s).slice(
    0,
    2
  );
  if (lines.length === 1) fitFont(ctx, lines[0], 760 * s, 48 * s, (p) => serif(p, 600, true));
  drawLines(ctx, lines, cx, bottom + 130 * s, 54 * s);

  ctx.fillStyle = t.muted;
  ctx.font = serif(24 * s, 500, true);
  ctx.fillText(
    "Pindai untuk membuka undangan digital",
    cx,
    H - 92 * s
  );
  return c;
};

/** QR kotak elegan berbingkai emas & monogram (cocok untuk stiker amplop / souvenir). */
export const renderQrStamp = (o: QrCardOptions): HTMLCanvasElement => {
  const W = o.width || 900;
  const s = W / 900;
  const t = o.theme;
  const c = createCanvas(W, W);
  const ctx = c.getContext("2d")!;
  const cx = W / 2;

  drawPaper(ctx, W, W, t);
  const m = 28 * s;
  ctx.strokeStyle = hexA(t.accent, 0.5);
  ctx.lineWidth = 2.5 * s;
  roundRect(ctx, m, m, W - m * 2, W - m * 2, 28 * s);
  ctx.stroke();
  ctx.strokeStyle = hexA(t.gold, 0.6);
  ctx.lineWidth = 1.2 * s;
  roundRect(ctx, m + 10 * s, m + 10 * s, W - (m + 10 * s) * 2, W - (m + 10 * s) * 2, 22 * s);
  ctx.stroke();

  drawCornerBouquet(ctx, W, W, 0, 0.34, t);
  drawCornerBouquet(ctx, W, W, 2, 0.34, t);

  const qrSize = 560 * s;
  const top = 110 * s;
  const bottom = drawQrPanel(ctx, o.url, cx, top, qrSize, t, {
    a: (o.bride || "A").charAt(0).toUpperCase(),
    b: (o.groom || "B").charAt(0).toUpperCase(),
  });

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = t.ink;
  const label = o.guestName?.trim() || `${o.bride} & ${o.groom}`;
  fitFont(ctx, label, 700 * s, 44 * s, (p) => serif(p, 600, true), 22 * s);
  ctx.fillText(label, cx, bottom + 64 * s);
  return c;
};

/* ------------------------------------------------------------------ */
/* Invitation pages (A5, 4 halaman)                                    */
/* ------------------------------------------------------------------ */

export const PAGE_W = 1240;
export const PAGE_H = 1754;

export interface InvitationContent {
  brideName: string;
  groomName: string;
  brideFullName: string;
  groomFullName: string;
  brideParents: string;
  groomParents: string;
  venueName: string;
  venueAddress: string;
  mapsUrl: string;
  akadTitle: string;
  akadDay: string;
  akadDate: string;
  akadTime: string;
  resepsiTitle: string;
  resepsiDay: string;
  resepsiDate: string;
  resepsiTime: string;
  salamOpening: string;
  quote: string;
  closingText: string;
  salamClosing: string;
  signature: string;
}

const pageBase = (t: StationeryTheme, big: [0 | 1 | 2 | 3, 0 | 1 | 2 | 3]) => {
  const c = createCanvas(PAGE_W, PAGE_H);
  const ctx = c.getContext("2d")!;
  drawPaper(ctx, PAGE_W, PAGE_H, t);
  drawFrame(ctx, PAGE_W, PAGE_H, t);
  ([0, 1, 2, 3] as const).forEach((k) =>
    drawCornerBouquet(
      ctx,
      PAGE_W,
      PAGE_H,
      k,
      big.includes(k) ? 0.72 : 0.36,
      t
    )
  );
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  return { c, ctx };
};

const smallCaps = (
  ctx: Ctx,
  text: string,
  y: number,
  color: string,
  size = 28,
  spacing = 8
) => {
  ctx.fillStyle = color;
  ctx.font = serif(size, 600);
  setSpacing(ctx, spacing);
  ctx.fillText(text.toUpperCase(), PAGE_W / 2, y);
  setSpacing(ctx, 0);
};

export const renderCoverPage = (
  d: InvitationContent,
  guest: { name: string; address?: string },
  t: StationeryTheme
) => {
  const { c, ctx } = pageBase(t, [0, 2]);
  const cx = PAGE_W / 2;
  smallCaps(ctx, "The Wedding of", 400, t.muted, 30, 12);

  ctx.fillStyle = t.ink;
  fitFont(ctx, d.brideName, 860, 168, script);
  ctx.fillText(d.brideName, cx, 600);
  ctx.fillStyle = t.accent;
  ctx.font = script(100);
  ctx.fillText("&", cx, 725);
  ctx.fillStyle = t.ink;
  fitFont(ctx, d.groomName, 860, 168, script);
  ctx.fillText(d.groomName, cx, 880);

  drawDivider(ctx, cx, 950, 230, t);
  const dateLine = [d.resepsiDay, d.resepsiDate].filter(Boolean).join(", ");
  smallCaps(ctx, dateLine, 1015, t.muted, 30, 6);

  // kartu tamu
  ctx.font = serif(52, 600, true);
  const nameLines = wrapText(ctx, guest.name, 640).slice(0, 3);
  const boxW = 780;
  const boxH = 150 + nameLines.length * 62 + (guest.address ? 50 : 0);
  const bx = cx - boxW / 2;
  const by = 1130;
  ctx.save();
  ctx.shadowColor = hexA(t.petalDeep, 0.2);
  ctx.shadowBlur = 30;
  roundRect(ctx, bx, by, boxW, boxH, 30);
  ctx.fillStyle = hexA("#ffffff", 0.82);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = hexA(t.accent, 0.4);
  ctx.lineWidth = 2;
  roundRect(ctx, bx, by, boxW, boxH, 30);
  ctx.stroke();
  ctx.strokeStyle = hexA(t.gold, 0.5);
  ctx.lineWidth = 1;
  roundRect(ctx, bx + 12, by + 12, boxW - 24, boxH - 24, 22);
  ctx.stroke();

  ctx.fillStyle = t.muted;
  ctx.font = serif(32, 500, true);
  ctx.fillText("Kepada Yth. Bapak/Ibu/Saudara/i", cx, by + 72);
  ctx.fillStyle = t.ink;
  ctx.font = serif(52, 600, true);
  if (nameLines.length === 1)
    fitFont(ctx, nameLines[0], 680, 56, (p) => serif(p, 600, true));
  const after = drawLines(ctx, nameLines, cx, by + 140, 62);
  if (guest.address) {
    ctx.fillStyle = t.muted;
    ctx.font = serif(32, 500);
    ctx.fillText(guest.address, cx, after + 10);
  }
  return c;
};

export const renderCouplePage = (d: InvitationContent, t: StationeryTheme) => {
  const { c, ctx } = pageBase(t, [1, 3]);
  const cx = PAGE_W / 2;
  let y = 300;
  ctx.fillStyle = t.ink;
  ctx.font = serif(44, 600, true);
  y = drawLines(ctx, wrapText(ctx, d.salamOpening, 900), cx, y, 54);

  if (d.quote) {
    ctx.fillStyle = t.muted;
    ctx.font = serif(30, 500, true);
    y = drawLines(ctx, wrapText(ctx, d.quote, 880), cx, y + 30, 42);
  }
  drawDivider(ctx, cx, y + 30, 200, t);

  ctx.fillStyle = t.ink;
  ctx.font = serif(32, 500);
  y = drawLines(
    ctx,
    wrapText(
      ctx,
      "Dengan memohon rahmat dan ridha Allah SWT, kami bermaksud menyelenggarakan pernikahan putra-putri kami:",
      880
    ),
    cx,
    y + 100,
    44
  );

  const person = (full: string, parents: string, yy: number) => {
    ctx.fillStyle = t.accent;
    fitFont(ctx, full, 940, 104, script, 40);
    ctx.fillText(full, cx, yy + 90);
    ctx.fillStyle = t.muted;
    ctx.font = serif(30, 500);
    return drawLines(ctx, wrapText(ctx, parents, 860), cx, yy + 150, 40);
  };
  y = person(d.brideFullName, d.brideParents, y + 10);
  ctx.fillStyle = t.gold;
  ctx.font = script(90);
  ctx.fillText("&", cx, y + 70);
  person(d.groomFullName, d.groomParents, y + 80);
  return c;
};

export const renderEventPage = (d: InvitationContent, t: StationeryTheme) => {
  const { c, ctx } = pageBase(t, [0, 2]);
  const cx = PAGE_W / 2;
  ctx.fillStyle = t.ink;
  ctx.font = serif(36, 500, true);
  ctx.fillText("Insya Allah acara akan dilaksanakan pada:", cx, 250);

  const card = (title: string, day: string, date: string, time: string, y: number) => {
    const w = 820;
    const h = 250;
    ctx.save();
    ctx.shadowColor = hexA(t.petalDeep, 0.18);
    ctx.shadowBlur = 24;
    roundRect(ctx, cx - w / 2, y, w, h, 28);
    ctx.fillStyle = hexA("#ffffff", 0.8);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = hexA(t.accent, 0.35);
    ctx.lineWidth = 2;
    roundRect(ctx, cx - w / 2, y, w, h, 28);
    ctx.stroke();
    ctx.fillStyle = t.accent;
    fitFont(ctx, title, w - 80, 76, script, 40);
    ctx.fillText(title, cx, y + 92);
    ctx.fillStyle = t.ink;
    ctx.font = serif(34, 600);
    ctx.fillText([day, date].filter(Boolean).join(", "), cx, y + 158);
    ctx.fillStyle = t.muted;
    ctx.font = serif(30, 500, true);
    ctx.fillText(time, cx, y + 206);
  };
  card(d.akadTitle, d.akadDay, d.akadDate, d.akadTime, 310);
  card(d.resepsiTitle, d.resepsiDay, d.resepsiDate, d.resepsiTime, 600);

  drawDivider(ctx, cx, 935, 200, t);
  smallCaps(ctx, "Bertempat di", 1000, t.muted, 28, 8);
  ctx.fillStyle = t.ink;
  ctx.font = serif(44, 600);
  let y = drawLines(ctx, wrapText(ctx, d.venueName, 880), cx, 1062, 52);
  ctx.fillStyle = t.muted;
  ctx.font = serif(30, 500);
  y = drawLines(ctx, wrapText(ctx, d.venueAddress, 820).slice(0, 3), cx, y + 4, 40);

  const qrSize = 230;
  const top = Math.min(y + 30, PAGE_H - 160 - qrSize * 1.18);
  const end = drawQrPanel(ctx, d.mapsUrl, cx, top, qrSize, t);
  ctx.fillStyle = t.muted;
  ctx.font = serif(26, 500, true);
  ctx.fillText("Pindai untuk petunjuk lokasi", cx, end + 42);
  return c;
};

export const renderClosingPage = (
  d: InvitationContent,
  guestUrl: string,
  t: StationeryTheme
) => {
  const { c, ctx } = pageBase(t, [1, 3]);
  const cx = PAGE_W / 2;
  smallCaps(ctx, "Undangan Digital", 230, t.accent, 30, 10);
  const end = drawQrPanel(ctx, guestUrl, cx, 275, 400, t, {
    a: (d.brideName || "A").charAt(0).toUpperCase(),
    b: (d.groomName || "B").charAt(0).toUpperCase(),
  });
  ctx.fillStyle = t.muted;
  ctx.font = serif(28, 500, true);
  ctx.fillText(
    "Pindai untuk membuka undangan digital & konfirmasi kehadiran",
    cx,
    end + 50
  );

  drawDivider(ctx, cx, end + 110, 200, t);
  ctx.fillStyle = t.ink;
  ctx.font = serif(32, 500, true);
  let y = drawLines(ctx, wrapText(ctx, d.closingText, 880), cx, end + 180, 44);
  ctx.font = serif(36, 600, true);
  y = drawLines(ctx, wrapText(ctx, d.salamClosing, 900), cx, y + 40, 46);
  ctx.fillStyle = t.muted;
  ctx.font = serif(30, 500);
  ctx.fillText(d.signature, cx, y + 40);
  ctx.fillStyle = t.accent;
  const names = `${d.brideName} & ${d.groomName}`;
  fitFont(ctx, names, 900, 110, script, 40);
  ctx.fillText(names, cx, y + 150);
  return c;
};
