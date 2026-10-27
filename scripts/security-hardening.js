/* eslint-disable no-unused-vars */
/**
 * security-hardening.js — 站点安全与备案合规（hexo 自动加载 scripts/ 目录）
 *
 * 存在理由（2026-10-26 实测）：
 *   1. 仓库 public，gh-pages 分支里 14 篇文章的 `password: 181622` 明文可读
 *      → 加密文章形同虚设（hexo-blog-encrypt 的密码在 front-matter 里）
 *   2. 站点无 security.txt（RFC 9116）
 *   3. 无自定义 404 页（GitHub Pages 返回通用 404，评分机构判为"站点维护不良"）
 *   4. 页脚无 ICP 备案号（国内评分必查项）
 *
 * 密码的处理方式（不破坏加密功能）：
 *   front-matter 里 `password: 181622` → 改为 `encrypt: true` 标记，
 *   真实密码改由 _config.yml 的 encrypt.tags 按 tag 匹配提供，
 *   或由环境变量 BLOG_ENCRYPT_PASSWORD 提供（推荐，密钥不入库）。
 *   hexo-blog-encrypt 原生支持 encrypt.tags 配置，无需改插件。
 *
 * 钩子：before_post_render（改 front-matter 语义）
 *       after_generate（产出 security.txt / 404.html）
 */

const fs = require('fs');
const path = require('path');

const BEIAN = hexo.config.beian || {};

/**
 * 读取站根 .env.local（不入库）注入进程环境变量。
 * 只补缺失键，不覆盖已有环境变量；解析故意保持极简（KEY=VALUE、可选引号）。
 */
(function loadDotEnv() {
  try {
    const fp = path.join(hexo.base_dir, '.env.local');
    if (!fs.existsSync(fp)) return;
    for (const line of fs.readFileSync(fp, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (!m || line.trim().startsWith('#')) continue;
      const val = m[2].replace(/^['"]|['"]$/g, '');
      if (!(m[1] in process.env)) process.env[m[1]] = val;
    }
  } catch (e) {
    hexo.log.warn('[security] 读取 .env.local 失败: ' + e.message);
  }
})();

/**
 * 密码注入：把 encrypt:true 标记的文章接上真实密码。
 * 优先级：环境变量 BLOG_ENCRYPT_PASSWORD > encrypt.tags[].password > encrypt.tags[].name
 */
function resolvePassword(page) {
  const enc = hexo.config.encrypt || {};
  const tags = enc.tags || [];

  // 1) 环境变量（密钥不入库，推荐）
  const envPw = process.env.BLOG_ENCRYPT_PASSWORD;
  if (envPw) return envPw;

  // 2) 按 tag 匹配（hexo-blog-encrypt 原生机制）
  const pageTags = (page.tags || []).map((t) => (typeof t === 'object' ? t.name : t));
  for (const t of tags) {
    if (t && t.name && pageTags.includes(t.name) && t.password) return t.password;
  }

  // 3) 无匹配 → 不加密（保持公开，避免卡住整站构建）
  return null;
}

/**
 * before_post_render：
 *   - `encrypt: true` → 注入真实 password，让 hexo-blog-encrypt 正常加密
 *   - 清掉 front-matter 里的明文 password（改由上面的机制提供）
 */
hexo.extend.filter.register('before_post_render', function (data) {
  if (!data) return data;

  const hasPlainPw = typeof data.password === 'string' && data.password.trim();
  const wantsEncrypt = data.encrypt === true || data.encrypt === 'true';

  if (!hasPlainPw && !wantsEncrypt) return data;

  if (hasPlainPw) {
    hexo.log.warn('[security] ' + (data.source || data.title) + ' 的 front-matter 含明文 password，已被运行时密钥覆盖');
  }

  const pw = resolvePassword(data);
  if (!pw) {
    // fail-closed：绝不把「要求加密」的文章以明文发布。
    // 2026-10-27 实测教训：hexo-blog-encrypt v4 已不支持 `encrypt: true` 标记，
    // 只认 password 字段；原逻辑仅在 data.password 非空时才注入，
    // 导致 8 篇只有 mark:true 的文章被明文发布。
    throw new Error(
      '[security] 加密文章「' + (data.title || data.source) + '」缺少密码来源。' +
      '请设置环境变量 BLOG_ENCRYPT_PASSWORD（可写入 .env.local，已 gitignore），' +
      '或在 _config.yml 的 encrypt.tags 中配置。已中止构建，避免加密内容以明文上线。'
    );
  }

  data.password = pw;
  data.encrypt = true;
  return data;
});

/**
 * after_render:html —— 注入页脚备案号。
 *
 * 主题 themes/ascent 没有独立的 footer 容器（页脚信息在 header partial 里），
 * 所以把备案信息插在 </body> 之前，用绝对定位的样式挂到页面底部，
 * 不依赖主题任何结构，改主题也不会失效。
 */
hexo.extend.filter.register('after_render:html', function (html) {
  if (typeof html !== 'string' || !html) return html;

  const beian = hexo.config.beian || {};
  if (!beian.icp) return html;
  if (/id=["']beian-info["']/.test(html)) return html;   // 幂等

  const url = beian.url || 'https://beian.miit.gov.cn';
  const police = beian.police
    ? `<a href="https://beian.mps.gov.cn/#/query/webSearch?code=${encodeURIComponent(beian.police)}" `
      + `target="_blank" rel="noopener nofollow">${beian.police}</a>`
    : '';

  const block =
    `\n  <div id="beian-info" style="text-align:center;font-size:12px;line-height:1.9;`
    + `color:#808080;padding:14px 12px 22px;opacity:.85;">` +
    `<a href="${url}" target="_blank" rel="noopener nofollow nofollow">${beian.icp}</a>` +
    (police ? ` &nbsp;|&nbsp; ${police}` : '') +
    `</div>\n`;

  // 插在最后一个 </body> 前
  const i = html.lastIndexOf('</body>');
  if (i === -1) return html;
  return html.slice(0, i) + block + html.slice(i);
});

/**
 * after_generate：产出安全与合规文件。
 */
hexo.extend.filter.register('after_generate', function () {
  const publicDir = hexo.public_dir;
  if (!publicDir) return;

  // ── 1. security.txt（RFC 9116）────────────────────────────
  // 注意：GitHub Pages 不发布点目录（.well-known/），实测 /.well-known/security.txt
  // 在 raw 上 200 但站点上 404。所以走 RFC 9116 允许的根目录路径 /security.txt，
  // 同时保留 .well-known 副本（若将来换到支持点目录的托管商即可生效）。
  const st = FALLBACK_SECURITY_TXT();
  if (st) {
    // ① 根目录：走 hexo 正常发布流程（source/ → public/ → 部署仓库）
    fs.writeFileSync(path.join(publicDir, 'security.txt'), st, 'utf8');

    // ② .well-known 副本：直接写进部署仓库，绕过 copyDir 的点目录过滤
    const dir = path.join(publicDir, '.well-known');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'security.txt'), st, 'utf8');

    const deployDir = hexo.base_dir && path.join(hexo.base_dir, '.deploy_git');
    if (deployDir && fs.existsSync(deployDir)) {
      try {
        const dWellKnown = path.join(deployDir, '.well-known');
        fs.mkdirSync(dWellKnown, { recursive: true });
        fs.writeFileSync(path.join(dWellKnown, 'security.txt'), st, 'utf8');
      } catch (e) {
        console.warn('[security-hardening] 写入 deploy 仓库失败:', e.message);
      }
    }
  }

  // ── 2. 自定义 404 页 ─────────────────────────────────────
  const notFound = path.join(publicDir, '404.html');
  const exists = fs.existsSync(notFound);
  if (!exists) {
    fs.writeFileSync(notFound, render404(), 'utf8');
  }

  // ── 3. 补 robots.txt 的 Sitemap 与 Crawl-delay ───────────
  const robotsPath = path.join(publicDir, 'robots.txt');
  if (fs.existsSync(robotsPath)) {
    let robots = fs.readFileSync(robotsPath, 'utf8');
    const site = (hexo.config.url || '').replace(/\/+$/, '');
    if (!robots.includes('Crawl-delay')) {
      robots = robots.replace(/(User-agent:\s*\*)/i, '$1\nCrawl-delay: 1');
    }
    if (!robots.includes('baidusitemap')) {
      robots += `\nSitemap: ${site}/baidusitemap.xml\n`;
    }
    fs.writeFileSync(robotsPath, robots, 'utf8');
  }
});

function FALLBACK_SECURITY_TXT() {
  const s = hexo.config.security || {};
  if (!s.contact) return null;
  const lines = [];
  if (s.expires) lines.push(`Expires: ${s.expires}`);
  if (s.encryption) lines.push(`Encryption: ${s.encryption}`);
  if (s.acknowledgments) lines.push(`Acknowledgments: ${s.acknowledgments}`);
  if (s.preferred_languages) lines.push(`Preferred-Languages: ${s.preferred_languages}`);
  if (s.canonical) lines.push(`Canonical: ${s.canonical}`);
  if (s.policy) lines.push(`Policy: ${s.policy}`);
  if (s.hiring) lines.push(`Hiring: ${s.hiring}`);
  lines.push(`Contact: ${s.contact}`);
  return lines.join('\n') + '\n';
}

/**
 * 404 页：站内搜索引导 + 热门分类。评分机构看的是「404 是否有引导」，
 * 而不是「404 是否存在」。
 */
function render404() {
  const site = (hexo.config.url || '').replace(/\/+$/, '');
  const title = hexo.config.title || '';
  const desc = '页面不存在';
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>404 ${desc} | ${title}</title>
<meta name="robots" content="noindex,follow">
<meta name="description" content="${desc}，返回首页或使用站内搜索。">
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
       font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;
       background:#fafafa;color:#212121}
  .w{max-width:560px;padding:24px;text-align:center}
  h1{font-size:64px;margin:0;letter-spacing:-2px;color:#b5c8cf}
  p{color:#666;line-height:1.8}
  a{color:#4a7d8c;text-decoration:none}
  a:hover{text-decoration:underline}
  .box{margin:24px 0;padding:18px;background:#fff;border-radius:8px;
       box-shadow:0 1px 3px rgba(0,0,0,.08)}
  .box a{display:inline-block;margin:4px 8px}
  input{width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:6px;font-size:14px}
  button{margin-top:10px;padding:10px 22px;border:0;border-radius:6px;background:#4a7d8c;
         color:#fff;cursor:pointer;font-size:14px}
  footer{margin-top:28px;font-size:12px;color:#999}
</style>
</head>
<body>
<div class="w">
  <h1>404</h1>
  <p>${desc}。可能是链接失效，或者文章已被移动。</p>

  <div class="box">
    <form action="${site}/search/" method="get">
      <input type="text" name="q" placeholder="站内搜索…" aria-label="站内搜索">
      <button type="submit">搜索</button>
    </form>
  </div>

  <div class="box">
    <a href="${site}/">首页</a>
    <a href="${site}/archives/">归档</a>
    <a href="${site}/categories/">分类</a>
    <a href="${site}/tags/">标签</a>
    <a href="${site}/about/">关于</a>
    <a href="${site}/atom.xml">RSS</a>
  </div>

  <footer>${title}</footer>
</div>
</body>
</html>
`;
}

/**
 * after_render:html —— 注入安全响应头的 meta 等价物。
 *
 * 背景（2026-10-27）：GitHub Pages 不支持自定义响应头（实测无 X-Frame-Options、
 * X-Content-Type-Options、CSP 等），唯一可用的下行通道是 <meta>。其中：
 *   - Content-Security-Policy：meta 支持（frame-ancestors / report-uri / sandbox 除外）
 *   - Referrer-Policy：meta 支持（http-equiv="referrer" 已废弃，用 name="referrer"）
 *   - X-Content-Type-Options / X-Frame-Options / HSTS：meta 无效，只能靠托管商，
 *     已写入根目录 _headers（GitHub Pages 忽略，迁 Cloudflare/Netlify 即生效）
 *
 * CSP 白名单依据构建产物实测（public/*.html 的 script src 域名统计）：
 *   unpkg.com（reveal 幻灯片）/ cdn.jsdelivr.net（gitalk、搜索）/ cdnjs.cloudflare.com
 * 主题大量内联脚本，无法去掉 'unsafe-inline'；script-src 保留域名白名单，
 * 目的是挡住任意第三方域注入脚本，而非彻底消除 XSS 面。
 */
const SECURITY_HEADERS = hexo.config.security_headers || {};

function buildCsp() {
  const h = SECURITY_HEADERS;
  if (h.csp === false) return '';

  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    // 实测必要性（2026-10-27，Chromium）：hexo-blog-encrypt v4 在解密渲染阶段
    // 触发 eval，缺此项时控制台报 script-src 违规。鉴于主题本身大量内联脚本、
    // 'unsafe-inline' 无法去除，补 'unsafe-eval' 不实质放大攻击面。
    "'unsafe-eval'",
    'https://cdn.jsdelivr.net',
    'https://unpkg.com',
    'https://cdnjs.cloudflare.com',
  ].join(' ');

  const styleSrc = [
    "'self'",
    "'unsafe-inline'",
    'https://cdn.jsdelivr.net',
    'https://unpkg.com',
    'https://cdnjs.cloudflare.com',
    'https://fonts.googleapis.com',
  ].join(' ');

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    `style-src ${styleSrc}`,
    "img-src 'self' data: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https:",
    "frame-src 'self' https://www.slideshare.net https://player.bilibili.com",
    "media-src 'self' https:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
  ].join('; ');
}

hexo.extend.filter.register('after_render:html', function (html) {
  if (typeof html !== 'string' || !html) return html;
  if (/http-equiv=["']Content-Security-Policy["']/i.test(html)) return html;  // 幂等
  if (!/<head[^>]*>/i.test(html)) return html;                                // 非完整页面跳过

  const tags = [];
  const csp = buildCsp();
  if (csp) {
    tags.push(`<meta http-equiv="Content-Security-Policy" content="${csp}">`);
  }
  if (SECURITY_HEADERS.referrer !== false) {
    tags.push('<meta name="referrer" content="strict-origin-when-cross-origin">');
  }
  if (!tags.length) return html;

  // CSP meta 必须尽早出现，否则之前加载的资源不受约束 → 插在 <head> 之后
  return html.replace(/<head[^>]*>/i, (m) => `${m}\n  ${tags.join('\n  ')}`);
});

/**
 * after_generate —— 补齐非渲染链路产出的 HTML 的 CSP。
 *
 * 背景（2026-10-27 实测）：source/_slides 由幻灯片插件直接写盘成
 * public/slide/下的 index.html，不经过 after_render:html，导致这些页面
 * 完全没有 CSP meta（浏览器端「0 违规」实为「无策略可违反」），形成加固盲区。
 * 此处在产物落地后统一补注入，幂等：已含 CSP 的页面跳过。
 */
hexo.extend.filter.register('after_generate', function () {
  const csp = buildCsp();
  if (!csp && SECURITY_HEADERS.referrer === false) return;

  const targets = [];
  (function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (e) {
      return; // slide 目录不存在时静默跳过
    }
    for (const ent of entries) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (ent.isFile() && ent.name === 'index.html') targets.push(p);
    }
  })(path.join(hexo.public_dir, 'slide'));

  let patched = 0;
  for (const fp of targets) {
    let html;
    try {
      html = fs.readFileSync(fp, 'utf8');
    } catch (e) {
      continue;
    }
    if (/http-equiv=["']Content-Security-Policy["']/i.test(html)) continue;
    if (!/<head[^>]*>/i.test(html)) continue;
    const tags = [];
    if (csp) tags.push(`<meta http-equiv="Content-Security-Policy" content="${csp}">`);
    if (SECURITY_HEADERS.referrer !== false) {
      tags.push('<meta name="referrer" content="strict-origin-when-cross-origin">');
    }
    html = html.replace(/<head[^>]*>/i, (m) => `${m}\n  ${tags.join('\n  ')}`);
    try {
      fs.writeFileSync(fp, html);
      patched += 1;
    } catch (e) {
      hexo.log.warn('[security] 写入失败 ' + fp + ': ' + e.message);
    }
  }
  if (patched) {
    hexo.log.info(`[security] 已为 ${patched} 个 slide 页面补注入 CSP/referrer`);
  }
});
