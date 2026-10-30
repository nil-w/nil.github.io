/* eslint-disable no-unused-vars */
/**
 * seo-head.js — Hexo 全站 SEO 收尾修正（scripts/ 目录自动加载）
 *
 * 分工约定（2026-10-29 重构）：
 *   结构性的 title / description / canonical / JSON-LD / viewport 已经在
 *   themes/ascent/layout/_partial/head.ejs 里正确生成，本文件只做「渲染后兜底」：
 *     - 历史遗留的 URL 粘连（config.url 无尾斜杠时可能出现 xxx.comAI/xx.html）
 *     - 首页 canonical 收敛到 /（而不是 /index.html）
 *     - 主题模板硬编码的旧 handle / 旧站名替换
 *     - og:image 缺失补默认封面
 *     - 重复的 twitter:card 去重
 *   以及生成前的数据修正：
 *     - post.updated 默认取文件 mtime，会让 sitemap / JSON-LD 的 lastmod、
 *       dateModified 全站相同（等于构建时刻）。这里在没有显式 front-matter
 *       updated 时回落到 date。
 */

const SITE_URL = (hexo.config.url || '').replace(/\/+$/, '');
const DEFAULT_OG_IMAGE = '/images/og-default.png';

/**
 * 拼绝对 URL，并顺手修掉「站点域名 + 路径」粘连、以及尾部 index.html。
 */
function absUrl(p) {
  if (!p) return SITE_URL + '/';
  let s = String(p);

  if (/^https?:\/\//i.test(s)) {
    if (SITE_URL && s.startsWith(SITE_URL)) {
      const rest = s.slice(SITE_URL.length).replace(/^\/+/, '');
      s = rest ? SITE_URL + '/' + rest : SITE_URL + '/';
    }
  } else {
    s = SITE_URL + '/' + s.replace(/^\/+/, '');
  }

  // 首页/目录页统一收敛：/index.html → /
  s = s.replace(/\/index\.html$/i, '/');
  return s;
}

/**
 * 从正文里抠一段纯文本当 description（文章未写 description 时的兜底）。
 */
function deriveDescription(page) {
  if (page.description) return String(page.description).trim();

  // 加密文章不要从正文推摘要，否则 meta 里会泄露明文
  if (page.encrypt || page.password) return hexo.config.description || '';

  const raw = String(page.content || page._content || page.raw || '')
    .replace(/^\uFEFF?---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
  const text = String(raw)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^[#>\-*+\s]+/gm, ' ')
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) return hexo.config.description || '';
  const cut = text.slice(0, 160);
  const dot = cut.lastIndexOf('。');
  const out = dot > 40 ? cut.slice(0, dot + 1) : cut;
  return out.length > 160 ? out.slice(0, 160) : out;
}

function ogImageOf(page) {
  const photos = page.photos || page.images || page.cover;
  const pick = (v) => {
    if (!v) return null;
    if (Array.isArray(v)) return v.length ? pick(v[0]) : null;
    return String(v);
  };
  return absUrl(pick(photos) || DEFAULT_OG_IMAGE);
}

/**
 * before_post_render：给文章补 description / keywords。
 */
hexo.extend.filter.register('before_post_render', function (data) {
  if (!data || data.content == null) return data;

  data.description = deriveDescription(data);

  const kw = new Set();
  (data.tags || []).forEach((t) => {
    const n = typeof t === 'object' ? t.name : t;
    if (n) kw.add(n);
  });
  (data.categories || []).forEach((c) => {
    const n = typeof c === 'object' ? c.name : c;
    if (n) kw.add(n);
  });
  data.keywords = kw.size ? [...kw].join(',') : (hexo.config.keywords || '');

  return data;
});

/**
 * after_generate：合并 4 个 render-blocking CSS 为单文件。
 *
 * 原页面在 <head> 里串行请求 style / search / googleapis / highlight
 * 四个样式表，移动端首屏多付 3 个 RTT。合并为一个顺序等价的 bundle。
 */
function applyCssBundle() {
  const fs = require('fs');
  const path = require('path');
  const cssDir = path.join(hexo.public_dir, 'css');
  const names = ['style.css', 'search.css', 'googleapis.css', 'highlight.css'];

  const missing = names.filter(n => !fs.existsSync(path.join(cssDir, n)));
  if (missing.length) {
    hexo.log.warn('[seo] CSS 合并跳过，缺少: ' + missing.join(', '));
    return;
  }

  const bundle = names
    .map(n => '/* ==== ' + n + ' ==== */\n' + fs.readFileSync(path.join(cssDir, n), 'utf8'))
    .join('\n');
  fs.writeFileSync(path.join(cssDir, 'bundle.css'), bundle, 'utf8');

  const re = /[ \t]*<link[^>]*href="\/css\/(?:style|search|googleapis|highlight)\.css"[^>]*>[ \t]*\r?\n?/g;
  let touched = 0;

  (function walk(dir) {
    for (const name of fs.readdirSync(dir)) {
      const fp = path.join(dir, name);
      const st = fs.statSync(fp);
      if (st.isDirectory()) { walk(fp); continue; }
      if (!name.endsWith('.html')) continue;

      let html = fs.readFileSync(fp, 'utf8');
      if (!re.test(html)) { re.lastIndex = 0; continue; }
      re.lastIndex = 0;

      html = html.replace(re, '');
      html = html.replace('</head>', '  <link rel="stylesheet" href="/css/bundle.css">\n</head>');
      fs.writeFileSync(fp, html, 'utf8');
      touched++;
    }
  })(hexo.public_dir);

  hexo.log.info('[seo] CSS 已合并为 bundle.css（' + (bundle.length / 1024).toFixed(1) + ' KB），处理页面 ' + touched + ' 个');
}

// generate 结束后写盘时执行一次（after_generate 在所有文件落盘后触发）
// deployBefore 保留：hexo deploy 会重新 generate，after_generate 已经跑过，
// 但 deployBefore 再跑一次保证 deploy 拿到的是合并后的产物
hexo.extend.filter.register('after_generate', applyCssBundle);
hexo.on('exit', applyCssBundle);
hexo.on('deployBefore', applyCssBundle);

/**
 * after_post_render：正文里的 <h1> 降级为 <h2>。
 *
 * 页面主标题已经由模板输出唯一的 <h1>，但不少老文章正文里用 "# xxx"
 * 当章节标题，渲染后会产生第二个 <h1>，标题层级断裂。
 */
hexo.extend.filter.register('after_post_render', function (data) {
  if (!data || typeof data.content !== 'string') return data;
  data.content = data.content
    .replace(/<h1(\s|>)/gi, '<h2$1')
    .replace(/<\/h1>/gi, '</h2>');

  // dateModified 兜底：Hexo 7 里 updated 默认取文件 mtime，
  // use_date_for_updated 在部分版本未生效，导致全站 lastmod 变成构建时刻。
  const fm = String(data.raw || data._content || '').slice(0, 600);
  if (!/^updated\s*:/m.test(fm)) {
    data.updated = data.date;
  }

  return data;
});

/**
 * before_generate：修正 updated。
 *
 * Hexo 在没有 front-matter `updated` 时会拿文件 mtime 填充，于是每次
 * git checkout / 构建后，sitemap 的 lastmod 与 JSON-LD 的 dateModified
 * 全站都变成「构建时刻」，Google 会认为所有页面天天变动，稀释抓取预算。
 * 这里改成：没有显式 updated 就用 date。
 */
hexo.extend.filter.register('before_generate', function () {
  const posts = hexo.locals.get('posts');
  if (!posts || !posts.forEach) return;
  posts.forEach((post) => {
    const raw = String(post.raw || '').slice(0, 800);
    const fmEnd = raw.indexOf('---', raw.indexOf('---') + 3);
    const fm = fmEnd > 0 ? raw.slice(0, fmEnd) : raw;
    if (!/^updated\s*:/m.test(fm)) {
      post.updated = post.date;
    }
  });
});

/**
 * after_render:html —— 渲染后兜底修正。
 */
hexo.extend.filter.register('after_render:html', function (html) {
  if (typeof html !== 'string' || !html) return html;

  // ── 1. canonical / og:url 里的 index.html 与粘连域名 ──────────
  html = html.replace(
    /(<link\s+rel=["']canonical["']\s+href=["'])([^"']+)(["'])/gi,
    (m, p1, url, p3) => p1 + absUrl(url) + p3
  );

  // ── 1b. og:url 里的 index.html ────────────────────────────
  html = html.replace(
    /(<meta\s+property=["']og:url["']\s+content=["'])([^"']+)(["'])/gi,
    (m, p1, url, p3) => p1 + absUrl(url) + p3
  );

  // ── 2. JSON-LD 兜底：补 image / inLanguage / mainEntityOfPage ──
  html = html.replace(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi,
    (m, body) => {
      let data;
      try {
        data = JSON.parse(body);
      } catch (e) {
        return m; // 不是合法 JSON 就别碰
      }

      if (data.url) data.url = absUrl(data.url);

      const isPost = data['@type'] === 'Article' || data['@type'] === 'BlogPosting';
      if (isPost) {
        data['@type'] = 'BlogPosting';
        if (!data.image) data.image = [ogImageOf({})];
        if (!data.inLanguage) data.inLanguage = 'zh-CN';
        if (!data.mainEntityOfPage) {
          data.mainEntityOfPage = { '@type': 'WebPage', '@id': data.url };
        }
        if (!data.publisher) {
          data.publisher = {
            '@type': 'Person',
            name: hexo.config.author || hexo.config.title,
            url: SITE_URL + '/',
          };
        }
      }
      // 注意：这里不再自动注入 WebSite 的 SearchAction——
      // 本站没有 /search/ 路由，指向它的 potentialAction 是死链。

      return '<script type="application/ld+json">\n  ' +
        JSON.stringify(data, null, 2).split('\n').join('\n  ') +
        '\n  </script>';
    }
  );

  // ── 3. <html lang="zh-CN"> ─────────────────────────────────
  if (/<html(\s[^>]*)?>/i.test(html) && !/<html[^>]*\slang=/i.test(html)) {
    html = html.replace(/<html(\s[^>]*)?>/i, '<html lang="zh-CN"$1>');
  }

  // ── 4. 旧 Twitter handle（主题 head.ejs 历史遗留 @yqwoe）──────
  const tw = hexo.config.twitter;
  if (tw && /@yqwoe/i.test(html)) {
    html = html.replace(/(@yqwoe)/gi, tw);
  }

  // ── 5. 导航栏旧站名 "sudo rm -rf /*" ─────────────────────────
  const siteTitle = hexo.config.title;
  if (siteTitle && /sudo rm -rf/.test(html)) {
    html = html.replace(/sudo rm -rf \/\*/g, siteTitle);
  }

  // ── 6. twitter:card 重复声明去重（保留最后一个 summary_large_image）──
  const cardMatches = html.match(/<meta\s+name=["']twitter:card["'][^>]*>/gi);
  if (cardMatches && cardMatches.length > 1) {
    let seen = 0;
    html = html.replace(/<meta\s+name=["']twitter:card["'][^>]*>/gi, (m) => {
      seen += 1;
      return seen === cardMatches.length ? m : '';
    });
  }

  // ── 7. og:image 缺失时补默认封面 ──────────────────────────
  if (!/<meta[^>]+property=["']og:image["']/i.test(html)) {
    const img = absUrl(DEFAULT_OG_IMAGE);
    html = html.replace(
      /(<meta[^>]+property=["']og:description["'][^>]*>)/i,
      `$1\n  <meta property="og:image" content="${img}">\n` +
      `  <meta property="og:image:width" content="1200">\n` +
      `  <meta property="og:image:height" content="630">`
    );
  }

  return html;
});
