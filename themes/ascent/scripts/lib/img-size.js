'use strict';
/* 图片固有尺寸解析（零依赖）：供 image-dims 过滤器与远程尺寸探测脚本共用。 */
/* ---------- 读取图片固有尺寸（无第三方依赖） ---------- */
function pngSize(buf) {
  if (buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47) return null;
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

function gifSize(buf) {
  if (buf.length < 10) return null;
  if (buf.toString('ascii', 0, 3) !== 'GIF') return null;
  return { w: buf.readUInt16LE(6), h: buf.readUInt16LE(8) };
}

function jpegSize(buf) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i < buf.length - 9) {
    if (buf[i] !== 0xff) { i++; continue; }
    const marker = buf[i + 1];
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
    const len = buf.readUInt16BE(i + 2);
    // SOF0..SOF15（排除 DHT/JPG/DAC）
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5) };
    }
    i += 2 + len;
  }
  return null;
}

function webpSize(buf) {
  if (buf.length < 30) return null;
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') return null;
  const fourcc = buf.toString('ascii', 12, 16);
  if (fourcc === 'VP8X') {
    const w = 1 + buf.readUIntLE(24, 3);
    const h = 1 + buf.readUIntLE(27, 3);
    return { w, h };
  }
  if (fourcc === 'VP8 ') {
    return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
  }
  if (fourcc === 'VP8L') {
    const b = buf.readUInt32LE(21);
    return { w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 };
  }
  return null;
}


const READERS = { '.png': pngSize, '.jpg': jpegSize, '.jpeg': jpegSize, '.gif': gifSize, '.webp': webpSize };

module.exports = { pngSize, gifSize, jpegSize, webpSize, READERS };
