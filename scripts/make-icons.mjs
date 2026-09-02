/**
 * Generates the PWA icons as flat PNGs — accent tile with a white progress
 * chevron. No image library; a minimal truecolour-alpha PNG encoder.
 * Run: `node scripts/make-icons.mjs` (outputs committed under public/icons).
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ACCENT = [0x1e, 0x5b, 0xff];
const WHITE = [0xff, 0xff, 0xff];

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}
function png(size, draw) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = draw(x, y);
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
      raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** distance from point to segment (a→b) */
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function draw(size) {
  const s = size;
  const stroke = s * 0.1;
  // upward chevron centred slightly low
  const cx = s / 2;
  const midY = s * 0.62;
  const topY = s * 0.4;
  const wing = s * 0.2;
  return (x, y) => {
    const d = Math.min(
      segDist(x, y, cx - wing, midY, cx, topY),
      segDist(x, y, cx, topY, cx + wing, midY),
    );
    const on = d <= stroke / 2 ? 1 : d <= stroke / 2 + 1 ? 0.5 : 0;
    if (on > 0) {
      return [WHITE[0], WHITE[1], WHITE[2], Math.round(255 * on) || 255];
    }
    return [ACCENT[0], ACCENT[1], ACCENT[2], 255];
  };
}

const outDir = path.join(process.cwd(), 'public/icons');
mkdirSync(outDir, { recursive: true });
for (const size of [192, 512]) {
  writeFileSync(path.join(outDir, `icon-${size}.png`), png(size, draw(size)));
}
writeFileSync(path.join(process.cwd(), 'public/apple-touch-icon.png'), png(180, draw(180)));
console.log('wrote public/icons/icon-192.png, icon-512.png, public/apple-touch-icon.png');
