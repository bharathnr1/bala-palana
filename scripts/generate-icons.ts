import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { deflateSync } from "node:zlib";

/**
 * Generates the PWA icons in `public/icons` (04-ui-spec § PWA). Kept in the
 * repo so the artwork is reproducible and no image tool or paid asset is
 * needed: a saffron rounded square with a white lotus.
 *
 * Run with `pnpm icons`.
 */
const OUT_DIR = resolve(process.cwd(), "public/icons");

const SAFFRON = { r: 0xc2, g: 0x57, b: 0x1a };
const WHITE = { r: 255, g: 255, b: 255 };
const SUPERSAMPLE = 3;

type Ellipse = { cx: number; cy: number; rx: number; ry: number; deg: number };

/** Lotus petals in unit coordinates, centre petal first. */
const PETALS: Ellipse[] = [
  { cx: 0.5, cy: 0.46, rx: 0.095, ry: 0.22, deg: 0 },
  { cx: 0.345, cy: 0.53, rx: 0.085, ry: 0.185, deg: -38 },
  { cx: 0.655, cy: 0.53, rx: 0.085, ry: 0.185, deg: 38 },
  { cx: 0.225, cy: 0.63, rx: 0.065, ry: 0.135, deg: -68 },
  { cx: 0.775, cy: 0.63, rx: 0.065, ry: 0.135, deg: 68 },
  { cx: 0.5, cy: 0.68, rx: 0.055, ry: 0.1, deg: 0 },
];

function inPetal(u: number, v: number, scale: number): boolean {
  // Dividing by scale < 1 expands the sample point, which shrinks the mark.
  const x = 0.5 + (u - 0.5) / scale;
  const y = 0.5 + (v - 0.5) / scale;

  return PETALS.some(({ cx, cy, rx, ry, deg }) => {
    const rad = (deg * Math.PI) / 180;
    const dx = x - cx;
    const dy = y - cy;
    const along = dx * Math.cos(rad) + dy * Math.sin(rad);
    const across = -dx * Math.sin(rad) + dy * Math.cos(rad);
    return (along * along) / (rx * rx) + (across * across) / (ry * ry) <= 1;
  });
}

/** Rounded square, corner radius `r`; the straight section is `0.5 - r` wide. */
function inRoundedSquare(u: number, v: number, r: number): boolean {
  const half = 0.5 - r;
  const dx = Math.max(Math.abs(u - 0.5) - half, 0);
  const dy = Math.max(Math.abs(v - 0.5) - half, 0);
  return dx * dx + dy * dy <= r * r;
}

function render(size: number, maskable: boolean): Buffer {
  const pixels = Buffer.alloc(size * size * 4);
  const markScale = maskable ? 0.72 : 1; // maskable art stays inside the safe zone

  for (let px = 0; px < size; px += 1) {
    for (let py = 0; py < size; py += 1) {
      let background = 0;
      let mark = 0;

      for (let sy = 0; sy < SUPERSAMPLE; sy += 1) {
        for (let sx = 0; sx < SUPERSAMPLE; sx += 1) {
          const u = (px + (sx + 0.5) / SUPERSAMPLE) / size;
          const v = (py + (sy + 0.5) / SUPERSAMPLE) / size;
          if (maskable || inRoundedSquare(u, v, 0.22)) background += 1;
          if (inPetal(u, v, markScale)) mark += 1;
        }
      }

      const samples = SUPERSAMPLE * SUPERSAMPLE;
      const coverage = background / samples;
      const ink = mark / samples;
      const offset = (py * size + px) * 4;

      pixels[offset] = Math.round(SAFFRON.r + (WHITE.r - SAFFRON.r) * ink);
      pixels[offset + 1] = Math.round(SAFFRON.g + (WHITE.g - SAFFRON.g) * ink);
      pixels[offset + 2] = Math.round(SAFFRON.b + (WHITE.b - SAFFRON.b) * ink);
      pixels[offset + 3] = Math.round(255 * coverage);
    }
  }

  return pixels;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(input: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of input) crc = CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(size: number, pixels: Buffer): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  // compression, filter and interlace stay 0

  // One filter byte (0 = none) per scanline.
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let row = 0; row < size; row += 1) {
    raw[row * (size * 4 + 1)] = 0;
    pixels.copy(raw, row * (size * 4 + 1) + 1, row * size * 4, (row + 1) * size * 4);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync(OUT_DIR, { recursive: true });

for (const size of [192, 512]) {
  for (const maskable of [false, true]) {
    const name = maskable ? `maskable-${size}.png` : `icon-${size}.png`;
    const file = resolve(OUT_DIR, name);
    writeFileSync(file, encodePng(size, render(size, maskable)));
    console.log(`wrote ${file}`);
  }
}
