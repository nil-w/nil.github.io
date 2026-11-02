/*!
 * image-dims.js — 为正文图片补全固有尺寸与加载策略
 *
 * 目的：消除「图片未声明尺寸 → 图片到达时把下方内容顶开」的 CLS 来源，
 *      并对首屏之外的图片启用原生懒加载。
 *
 * 安全边界：
 *   1. 站内图片（src 以 "/" 开头）从 source 目录读取真实文件取尺寸；
 *      读不到（404）一律原样保留，绝不猜测尺寸。
 *   2. 外链图片不联网探测，只查「远程尺寸缓存」image-sizes.json
 *      （由 probe-remote-sizes.js 生成，键为完整 URL）；缓存缺失则原样保留。
 *   3. 已带 width 属性的图片跳过（尊重文章作者手写的尺寸/百分比）。
 *   4. 注入的 width/height 等于图片固有像素尺寸，与 CSS（max-width:100%;
 *      height:auto）配合后，加载完成的渲染尺寸与未注入时完全一致，
 *      因此不改变任何既有布局结果，只是提前把位置预留出来。
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { READERS } = require('./lib/img-size');

const cache = new Map();

function sizeOf(absPath) {
  if (cache.has(absPath)) return cache.get(absPath);
  let out = null;
  try {
    const ext = path.extname(absPath).toLowerCase();
    const reader = READERS[ext];
    if (reader) {
      const buf = fs.readFileSync(absPath);
      out = reader(buf);
      if (out && (!out.w || !out.h)) out = null;
    }
  } catch (e) {
    out = null;
  }
  cache.set(absPath, out);
  return out;
}

/* 远程图片尺寸缓存（可选文件，缺失时等价于空表） */
let remoteTable = null;
function remoteSize(src) {
  if (!remoteTable) {
    try {
      remoteTable = JSON.parse(
        fs.readFileSync(path.join(__dirname, '../data/image-sizes.json'), 'utf8')
      );
    } catch (e) {
      remoteTable = {};
    }
  }
  const hit = remoteTable[src];
  return hit && hit.w && hit.h ? hit : null;
}

/* HTML 属性值里的 &amp; 需要还原，否则站内文件名中带 & 的图片会查不到 */
function unescapeAttr(v) {
  return v
    .replace(/&amp;/gi, '&')
    .replace(/&#63;/gi, '?')
    .replace(/&quot;/gi, '"');
}

hexo.extend.filter.register('after_render:html', function (str, data) {
  try {
    if (!str || str.indexOf('<img') === -1) return str;
    const sourceDir = hexo.source_dir || path.join(hexo.base_dir, 'source');
    let index = 0;

    return str.replace(/<img\b[^>]*>/gi, function (tag) {
      if (/\bwidth\s*=/i.test(tag)) return tag;              // 作者已声明尺寸
      if (/\bdata-src\s*=/i.test(tag) && !/\bsrc\s*=/i.test(tag)) return tag;

      const m = tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
      if (!m) return tag;
      const src = unescapeAttr(m[1]);

      let size = null;
      if (/^https?:\/\//i.test(src)) {
        size = remoteSize(src);
      } else if (src.startsWith('/') && !src.startsWith('//')) {
        const clean = decodeURIComponent(src.split('?')[0].split('#')[0]);
        size = sizeOf(path.join(sourceDir, clean.replace(/^\/+/, '')));
      }
      if (!size) return tag;                                  // 读不到：不动

      index += 1;
      const strategy = index === 1
        ? ' loading="eager" fetchpriority="high"'
        : ' loading="lazy"';
      return tag.replace(/\s*>$/, '') +
        ' width="' + size.w + '" height="' + size.h + '"' +
        strategy + ' decoding="async">';
    });
  } catch (e) {
    return str;
  }
}, 15);
