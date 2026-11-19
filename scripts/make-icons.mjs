// Generates public/icon-192.png and public/icon-512.png (no dependencies).
// Draws the app mark: green rounded square, red bottom band, white Cyrillic "Б".
import fs from 'node:fs';
import zlib from 'node:zlib';

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function render(size) {
  const s = size / 512;
  const px = Buffer.alloc(size * (size * 4 + 1));
  const inRounded = (x, y, r) => {
    const cx = x < r ? r : x > 512 - r ? 512 - r : x;
    const cy = y < r ? r : y > 512 - r ? 512 - r : y;
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
  };
  const inB = (x, y) => {
    if (x >= 160 && x < 224 && y >= 96 && y < 400) return true; // stem
    if (x >= 160 && x < 368 && y >= 96 && y < 152) return true; // top bar
    // bowl: ring centred (280, 304), outer r 96, inner r 40, right half + bars
    const dx = x - 280, dy = y - 304, d2 = dx * dx + dy * dy;
    if (x >= 280 && d2 <= 96 * 96 && d2 >= 40 * 40) return true;
    if (x >= 224 && x < 280 && ((y >= 208 && y < 264) || (y >= 344 && y < 400))) return true;
    return false;
  };
  for (let py = 0; py < size; py++) {
    const row = py * (size * 4 + 1);
    px[row] = 0;
    for (let pxl = 0; pxl < size; pxl++) {
      const x = (pxl + 0.5) / s, y = (py + 0.5) / s;
      let rgba = [0, 0, 0, 0];
      if (inRounded(x, y, 112)) rgba = y >= 400 ? [194, 31, 16, 255] : [0, 122, 90, 255];
      if (inB(x, y)) rgba = [255, 255, 255, 255];
      px.set(rgba, row + 1 + pxl * 4);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(px)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const size of [192, 512]) fs.writeFileSync(new URL(`../public/icon-${size}.png`, import.meta.url), render(size));
console.log('icons written');
