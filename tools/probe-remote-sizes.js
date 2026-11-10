#!/usr/bin/env node
/*!
 * probe-remote-sizes.js — 探测正文中外链图片的固有尺寸，写入尺寸缓存
 *
 * 用法：node tools/probe-remote-sizes.js
 * 产物：themes/ascent/scripts/image-sizes.json  { "<url>": { "w": 宽, "h": 高 } }
 *
 * 说明：
 *   - 构建期不联网（image-dims.js 只读缓存），本脚本为手动/CI 预跑；
 *   - 只下载图片头部字节（Range: 0-65535）解析尺寸，不落盘原图；
 *   - 探测失败的 URL 保持不写入，过滤器会自动跳过，绝不猜测尺寸。
 */
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { READERS } = require('../themes/ascent/scripts/lib/img-size');

const ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const OUT = path.join(ROOT, 'themes/ascent/scripts/image-sizes.json');
const CACHE_DIR = path.join(__dirname, '.cache');

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

function collectUrls() {
  const urls = new Set();
  for (const f of walk(PUBLIC_DIR)) {
    const s = fs.readFileSync(f, 'utf8');
    const re = /<img\b[^>]*>/gi;
    let m;
    while ((m = re.exec(s))) {
      const tag = m[0];
      if (/\bwidth\s*=/i.test(tag)) continue;
      const sm = tag.match(/\bsrc\s*=\s*["'](https?:\/\/[^"']+)["']/i);
      if (sm) urls.add(sm[1].replace(/&amp;/gi, '&'));
    }
  }
  return [...urls];
}

function fetchHead(url, redirects = 0) {
  return new Promise((resolve) => {
    let lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, {
      headers: { 'User-Agent': UA, Range: 'bytes=0-65535', Accept: 'image/*,*/*' },
      timeout: 12000,
    }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirects < 4) {
        res.resume();
        const next = new URL(res.headers.location, url).toString();
        return resolve(fetchHead(next, redirects + 1));
      }
      if (res.statusCode !== 200 && res.statusCode !== 206) {
        res.resume();
        return resolve({ err: 'HTTP ' + res.statusCode });
      }
      const chunks = [];
      let size = 0;
      res.on('data', (c) => {
        chunks.push(c); size += c.length;
        if (size > 65536) { res.destroy(); }
      });
      res.on('close', () => resolve({ buf: Buffer.concat(chunks), type: res.headers['content-type'] }));
      res.on('error', () => resolve({ buf: Buffer.concat(chunks), type: res.headers['content-type'] }));
    });
    req.on('timeout', () => { req.destroy(); resolve({ err: 'timeout' }); });
    req.on('error', (e) => resolve({ err: e.message }));
  });
}

function sniff(buf, contentType) {
  const order = [];
  const ct = (contentType || '').toLowerCase();
  if (ct.includes('png')) order.push('.png');
  if (ct.includes('jpeg') || ct.includes('jpg')) order.push('.jpg');
  if (ct.includes('gif')) order.push('.gif');
  if (ct.includes('webp')) order.push('.webp');
  return order.concat(['.png', '.jpg', '.gif', '.webp']);
}

(async () => {
  const urls = collectUrls();
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const table = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
  const todo = urls.filter((u) => !(table[u] && table[u].w));
  console.log(`外链无尺寸图片 ${urls.length} 个，待探测 ${todo.length} 个`);

  for (const url of todo) {
    const r = await fetchHead(url);
    if (!r.buf) { console.log('  SKIP', r.err, url.slice(0, 90)); continue; }
    let size = null;
    for (const ext of sniff(r.buf, r.type)) {
      const fn = READERS[ext];
      if (!fn) continue;
      const s = fn(r.buf);
      if (s && s.w && s.h) { size = s; break; }
    }
    if (!size) { console.log('  SKIP parse-fail', url.slice(0, 90)); continue; }
    table[url] = { w: size.w, h: size.h };
    console.log(`  OK   ${size.w}x${size.h}  ${url.slice(0, 90)}`);
  }

  fs.writeFileSync(OUT, JSON.stringify(table, null, 2) + '\n');
  console.log('写入', path.relative(ROOT, OUT), Object.keys(table).length, '条');
})();
