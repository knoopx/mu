/**
 * Stage photographs, drawn in memory.
 *
 * A scene that shows an image must show one for the reason the scene is told: a
 * tile is there to prove the window lays a picture out, not to reproduce a
 * holiday. So no story reads a file. Each photo below is painted from a fixed
 * seed — the same pixels every run, on every machine — and encoded as a PNG in
 * memory, so a capture pass touches no disk for a picture and a fixture cannot
 * drift from the file beside it.
 */
import { deflateSync } from "node:zlib";

export interface StageImage {
  width: number;
  height: number;
  /** The PNG bytes, ready for a `data:` URL or an attachment. */
  png: Buffer;
}

/* ------------------------------------------------------------- the drawing */

type Rgb = [number, number, number];

const mix = (a: Rgb, b: Rgb, at: number): Rgb => [
  a[0] + (b[0] - a[0]) * at,
  a[1] + (b[1] - a[1]) * at,
  a[2] + (b[2] - a[2]) * at,
];

/** A deterministic stand-in for a camera's grain. */
const grain = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
};

class Canvas {
  readonly pixels: Buffer;

  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.pixels = Buffer.alloc(width * height * 3);
  }

  put(x: number, y: number, color: Rgb): void {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const at = (y * this.width + x) * 3;
    this.pixels[at] = Math.max(0, Math.min(255, Math.round(color[0])));
    this.pixels[at + 1] = Math.max(0, Math.min(255, Math.round(color[1])));
    this.pixels[at + 2] = Math.max(0, Math.min(255, Math.round(color[2])));
  }

  /** A vertical wash: what a sky, a body of water or a wall of grass is. */
  wash(top: Rgb, bottom: Rgb, from = 0, to = this.height): void {
    const span = Math.max(1, to - from);
    for (let y = from; y < to; y++) {
      const color = mix(top, bottom, (y - from) / span);
      for (let x = 0; x < this.width; x++) this.put(x, y, color);
    }
  }

  /** A soft blob of light — a sun, a flare, a lit patch of grass. */
  glow(cx: number, cy: number, radius: number, color: Rgb, power = 1): void {
    for (let y = cy - radius; y <= cy + radius; y++) {
      for (let x = cx - radius; x <= cx + radius; x++) {
        const d = Math.hypot(x - cx, y - cy) / radius;
        if (d > 1) continue;
        const at = Math.pow(1 - d, 2) * power;
        const here = this.at(Math.trunc(x), Math.trunc(y));
        this.put(Math.trunc(x), Math.trunc(y), mix(here, color, at));
      }
    }
  }

  /** A hard shape — a ridge, a building, a body in water. */
  shape(
    left: number,
    right: number,
    topOf: (x: number) => number,
    color: Rgb,
  ): void {
    for (let x = left; x < right; x++) {
      const top = topOf(x);
      for (let y = top; y < this.height; y++) this.put(x, y, color);
    }
  }

  /** Scattered marks: bubbles, star trails, a fence line, windows. */
  specks(
    count: number,
    seed: number,
    place: (at: number, random: () => number) => [number, number, number, Rgb],
  ): void {
    const random = grain(seed);
    for (let n = 0; n < count; n++) {
      const [x, y, size, color] = place(n, random);
      for (let dy = -size; dy <= size; dy++)
        for (let dx = -size; dx <= size; dx++)
          if (dx * dx + dy * dy <= size * size)
            this.put(Math.trunc(x + dx), Math.trunc(y + dy), color);
    }
  }

  /** Thin strokes at an angle: grass, rain, a bridge's cables. */
  strokes(
    count: number,
    seed: number,
    place: (at: number, random: () => number) => [number, number, number, Rgb],
  ): void {
    const random = grain(seed);
    for (let n = 0; n < count; n++) {
      const [x, y, long, color] = place(n, random);
      for (let i = 0; i < long; i++) this.put(Math.trunc(x + i * 0.4), Math.trunc(y - i), color);
    }
  }

  private at(x: number, y: number): Rgb {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return [0, 0, 0];
    const at = (y * this.width + x) * 3;
    return [
      this.pixels[at],
      this.pixels[at + 1],
      this.pixels[at + 2],
    ];
  }
}

/* ------------------------------------------------------------ the pictures */

type Painter = (sheet: Canvas) => void;

const meadow: Painter = (sheet) => {
  sheet.wash([236, 214, 150], [168, 138, 62]);
  sheet.glow(sheet.width * 0.5, sheet.height * 0.78, 90, [255, 246, 214], 0.9);
  sheet.glow(sheet.width * 0.18, sheet.height * 0.2, 60, [250, 232, 176], 0.5);
  sheet.strokes(520, 7, (n, random) => [
    random() * sheet.width,
    sheet.height * (0.45 + random() * 0.55),
    6 + random() * 26,
    [214, 176, 92],
  ]);
  sheet.shape(sheet.width * 0.74, sheet.width * 0.77, () => sheet.height * 0.34, [78, 58, 34]);
};

const swimmer: Painter = (sheet) => {
  sheet.wash([44, 96, 148], [8, 26, 54]);
  sheet.glow(sheet.width * 0.3, sheet.height * 0.12, 120, [110, 170, 214], 0.5);
  sheet.shape(sheet.width * 0.42, sheet.width * 0.78, () => sheet.height * 0.42, [10, 22, 40]);
  sheet.specks(140, 11, (n, random) => [
    sheet.width * (0.45 + random() * 0.35),
    sheet.height * (0.05 + random() * 0.4),
    1 + Math.floor(random() * 3),
    [150, 200, 230],
  ]);
};

const river: Painter = (sheet) => {
  sheet.wash([186, 200, 214], [96, 116, 132], 0, sheet.height * 0.42);
  sheet.wash([70, 96, 116], [26, 44, 62], sheet.height * 0.42);
  const wall = (side: number, tone: Rgb): void =>
    sheet.shape(
      side < 0 ? 0 : sheet.width * (0.5 + 0.12 * Math.abs(side)),
      side < 0 ? sheet.width * (0.5 - 0.12 * Math.abs(side)) : sheet.width,
      (x) => sheet.height * (0.16 + 0.28 * Math.abs(x / sheet.width - 0.5)),
      tone,
    );
  wall(-1, [122, 74, 58]);
  wall(1, [104, 62, 50]);
  sheet.specks(220, 23, (n, random) => [
    random() * sheet.width,
    sheet.height * (0.18 + random() * 0.2),
    1,
    [214, 220, 226],
  ]);
  sheet.shape(sheet.width * 0.66, sheet.width * 0.74, () => sheet.height * 0.82, [232, 236, 240]);
};

const stars: Painter = (sheet) => {
  sheet.wash([12, 14, 26], [2, 3, 8]);
  const cx = sheet.width * 0.52;
  const cy = sheet.height * 0.44;
  for (let arc = 0; arc < 90; arc++) {
    const random = grain(arc * 977);
    const radius = 20 + random() * (sheet.width * 0.55);
    const from = random() * Math.PI * 2;
    const sweep = 0.4 + random() * 1.4;
    const tone: Rgb = [210 + random() * 40, 214 + random() * 30, 230];
    for (let step = 0; step < 40; step++) {
      const angle = from + (sweep * step) / 40;
      sheet.put(Math.trunc(cx + Math.cos(angle) * radius), Math.trunc(cy + Math.sin(angle) * radius), tone);
    }
  }
  sheet.shape(0, sheet.width, () => sheet.height * 0.72, [1, 1, 3]);
};

const bay: Painter = (sheet) => {
  sheet.wash([196, 216, 232], [150, 182, 208], 0, sheet.height * 0.52);
  sheet.wash([44, 104, 156], [16, 52, 92], sheet.height * 0.52);
  sheet.shape(
    sheet.width * 0.08,
    sheet.width * 0.92,
    (x) =>
      sheet.height *
      (0.44 - 0.06 * Math.sin((x / sheet.width) * Math.PI * 6) - 0.02 * Math.cos(x / 12)),
    [82, 92, 104],
  );
  sheet.strokes(60, 31, (n, random) => [
    sheet.width * (0.1 + random() * 0.8),
    sheet.height * (0.6 + random() * 0.35),
    8 + random() * 18,
    [96, 150, 190],
  ]);
};

const PAINTERS = { meadow, swimmer, river, stars, bay } as const;

export type StageImageKey = keyof typeof PAINTERS;

/* ------------------------------------------------------------ the encoder */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let bit = 0; bit < 8; bit++) c = c & 1 ? 0xed_b8_83_20 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

const crc32 = (bytes: Buffer): number => {
  let crc = -1;
  for (const byte of bytes) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ byte) & 0xff]!;
  return (crc ^ -1) >>> 0;
};

const chunk = (kind: string, body: Buffer): Buffer => {
  const out = Buffer.alloc(8 + body.length + 4);
  out.writeUInt32BE(body.length, 0);
  out.write(kind, 4, "ascii");
  body.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(kind, "ascii"), body])), 8 + body.length);
  return out;
};

const pngOf = (width: number, height: number, rgb: Buffer): Buffer => {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolour, no alpha
  const rows = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    const row = y * (1 + width * 3);
    rows[row] = 0; // no filter
    rgb.copy(rows, row + 1, y * width * 3, (y + 1) * width * 3);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(rows, { level: 6 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
};

/** The picture a scene claims to show, painted once per key and kept. */
const cache = new Map<StageImageKey, StageImage>();

export function stageImage(
  key: StageImageKey,
  width: number,
  height: number,
): StageImage {
  const same = cache.get(key);
  if (same && same.width === width && same.height === height) return same;
  const sheet = new Canvas(width, height);
  PAINTERS[key](sheet);
  const image: StageImage = { width, height, png: pngOf(width, height, sheet.pixels) };
  cache.set(key, image);
  return image;
}
