'use strict';

// Generates the PWA icons as real PNGs with no image libraries: we build the
// raw RGBA pixels and encode a PNG by hand (zlib for the pixel stream, a small
// CRC-32 for the chunks). Run: `node scripts/gen-icons.js`.
//
// Artwork: a green felt gradient with two fanned playing cards — the back one
// face-down (red), the front one white with a heart pip.

const zlib = require('node:zlib');
const fs = require('node:fs');
const path = require('node:path');

const OUT = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(OUT, { recursive: true });

// CRC-32 (PNG uses the standard IEEE polynomial).
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(size, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

function lerp(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

// Point-in-rotated-rounded-rect: transform (x,y) into the card's local frame.
function inCard(x, y, cx, cy, w, h, rot, r) {
  const cos = Math.cos(-rot);
  const sin = Math.sin(-rot);
  const lx = (x - cx) * cos - (y - cy) * sin;
  const ly = (x - cx) * sin + (y - cy) * cos;
  const dx = Math.abs(lx) - (w / 2 - r);
  const dy = Math.abs(ly) - (h / 2 - r);
  if (dx <= 0 && dy <= 0) return true;
  const qx = Math.max(dx, 0);
  const qy = Math.max(dy, 0);
  return qx * qx + qy * qy <= r * r;
}

// Heart pip: two circles + a triangle, in the front card's local frame.
function inHeart(x, y, cx, cy, s, rot) {
  const cos = Math.cos(-rot);
  const sin = Math.sin(-rot);
  const lx = ((x - cx) * cos - (y - cy) * sin) / s;
  const ly = ((x - cx) * sin + (y - cy) * cos) / s;
  const d1 = Math.hypot(lx + 0.45, ly + 0.35) <= 0.62;
  const d2 = Math.hypot(lx - 0.45, ly + 0.35) <= 0.62;
  const tri = ly >= -0.15 && ly <= 1.0 && Math.abs(lx) <= (1.0 - ly) * 0.93;
  return d1 || d2 || tri;
}

function draw(size, { maskable = false } = {}) {
  const feltA = [22, 84, 52];   // deep felt green
  const feltB = [10, 46, 30];
  const rgba = Buffer.alloc(size * size * 4);

  const scale = maskable ? 0.72 : 0.92;
  const cw = size * 0.42 * scale;
  const ch = size * 0.58 * scale;
  const cr = size * 0.045 * scale;
  const cx = size * 0.5;
  const cy = size * 0.52;
  const pip = size * 0.085 * scale;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // Radial felt gradient.
      const t = Math.min(1, Math.hypot(x - size / 2, y - size / 2) / (size * 0.7));
      let col = lerp(feltA, feltB, t);

      // Rounded-square tile for non-maskable; full bleed for maskable.
      let inside = true;
      if (!maskable) {
        const r = size * 0.18;
        const cornerX = Math.min(x, size - x);
        const cornerY = Math.min(y, size - y);
        if (cornerX < r && cornerY < r) {
          const ddx = r - cornerX;
          const ddy = r - cornerY;
          if (ddx * ddx + ddy * ddy > r * r) inside = false;
        }
      }
      if (!inside) {
        rgba[i + 3] = 0;
        continue;
      }

      // Back card: face-down red, fanned left.
      const backRot = -0.30;
      const bx = cx - size * 0.10;
      if (inCard(x, y, bx, cy, cw, ch, backRot, cr)) {
        col = [178, 44, 48];
        // thin light border
        if (!inCard(x, y, bx, cy, cw - size * 0.03, ch - size * 0.03, backRot, cr * 0.8)) {
          col = [242, 230, 214];
        }
      }

      // Front card: white, fanned right, with a heart pip.
      const frontRot = 0.16;
      const fx = cx + size * 0.07;
      if (inCard(x, y, fx, cy, cw, ch, frontRot, cr)) {
        col = [248, 245, 238];
        if (inHeart(x, y, fx, cy - size * 0.02, pip, frontRot)) col = [200, 42, 54];
      }

      rgba[i] = col[0];
      rgba[i + 1] = col[1];
      rgba[i + 2] = col[2];
      rgba[i + 3] = 255;
    }
  }
  return rgba;
}

function write(name, size, opts) {
  const png = encodePng(size, draw(size, opts));
  fs.writeFileSync(path.join(OUT, name), png);
  console.log('wrote', name, `(${png.length} bytes)`);
}

write('icon-192.png', 192, {});
write('icon-512.png', 512, {});
write('icon-maskable-512.png', 512, { maskable: true });
