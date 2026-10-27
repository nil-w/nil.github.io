/* eslint-disable no-unused-vars */
/**
 * asset-local.js — 第三方 CDN 资源本地化降级（hexo 自动加载 scripts/ 目录）
 *
 * 存在理由（2026-10-26 实测）：
 *   站点引用 4 个境外 CDN：fonts.googleapis.com / fonts.gstatic.com /
 *   cdn.jsdelivr.net / unpkg.com。其中 Google Fonts 在境内经常被污染或
 *   不可达 → 字体加载失败 → 首屏文字闪烁 → Core Web Vitals 掉分 → 搜索排名降。
 *
 * 准则（用户 2026-10-26 追加）：
 *   「本地静态文件引用，可以使用在线地址，降级使用本地映射」
 *   → 在线地址优先（CDN 快），本地映射降级（CDN 挂了不白屏）。
 *
 * 实现方式：after_render:css 改写 @font-face 的 src 顺序，
 *   在在线 URL 后面追加本地 woff2 映射；after_render:html 对
 *   <script>/<link> 注入 onerror 降级。
 *
 * 本地映射表在 _config.yml 的 asset_fallback 段配置，不硬编码在此。
 */

const FALLBACK = hexo.config.asset_fallback || {};

/**
 * @font-face 的 src 是「列表式」：浏览器按顺序尝试，第一个成功的生效。
 * 所以把本地 URL 追加到在线 URL 之后 = 在线优先、本地降级。
 */
function rewriteFontFaceSrc(css) {
  const fonts = FALLBACK.fonts || {};
  return css.replace(
    /(@font-face\s*\{[^}]*?src\s*:\s*)([^;}]+)([^}]*?\})/gi,
    (m, head, srcBody, tail) => {
      // 只处理还含在线 gstatic/googleapis 地址的块
      if (!/fonts\.(gstatic|googleapis)\.com/i.test(srcBody)) return m;

      let extra = '';
      // 找出这个字重对应的本地文件（按 src 里的文件名匹配）
      for (const [remote, local] of Object.entries(fonts)) {
        const base = remote.split('/').pop();
        if (base && srcBody.includes(base) && local) {
          const localUrl = local.startsWith('/') ? local : '/' + local;
          if (!srcBody.includes(localUrl)) {
            extra += `, url("${localUrl}") format("woff2")`;
          }
        }
      }
      if (!extra) return m;
      return head + srcBody + extra + tail;
    }
  );
}

/**
 * <script src="在线地址"> 加 onerror 降级到本地。
 * onerror 只在加载失败时触发，属性顺序不影响。
 */
function addScriptFallback(html) {
  const scripts = FALLBACK.scripts || {};

  // <script src="...">  →  <script src="..." onerror="...">
  html = html.replace(
    /<script\s+src=["']([^"']+)["'](\s*[^>]*?)?>/gi,
    (m, src, rest) => {
      const local = scripts[src];
      if (!local) return m;
      if (/onerror=/i.test(m)) return m;
      const localUrl = local.startsWith('/') ? local : '/' + local;
      const handler = `this.onerror=null;this.src='${localUrl}'`;
      return `<script src="${src}" onerror="${handler}"${rest || ''}>`;
    }
  );

  // <link rel="stylesheet" href="在线地址"> 同样降级
  html = html.replace(
    /<link\s+rel=["']stylesheet["']\s+href=["']([^"']+)["'](\s*[^>]*?)?>/gi,
    (m, href, rest) => {
      const local = scripts[href];
      if (!local) return m;
      if (/onerror=/i.test(m)) return m;
      const localUrl = local.startsWith('/') ? local : '/' + local;
      const handler = `this.onerror=null;this.href='${localUrl}'`;
      return `<link rel="stylesheet" href="${href}" onerror="${handler}"${rest || ''}>`;
    }
  );

  return html;
}

/**
 * ESM import 无法用 onerror 降级（静态 import 失败会直接报错）。
 * 对 mermaid 这类 ESM CDN，改成动态 import + try/catch 降级。
 */
function fixEsmImport(html) {
  const esm = FALLBACK.esm || {};
  Object.keys(esm).forEach((remote) => {
    const local = esm[remote];
    if (!local) return;
    const localUrl = local.startsWith('/') ? local : '/' + local;

    // import x from "https://cdn.../y/+esm";
    const staticRe = new RegExp(
      `import\\s+(\\w+)\\s+from\\s+["']${remote.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']\\s*;`,
      'g'
    );
    html = html.replace(staticRe, (m, name) =>
      `let ${name};\n  try { ${name} = (await import("${remote}")).default; }\n` +
      `  catch (e) { console.warn("[asset-fallback] CDN failed, using local:", "${localUrl}"); ` +
      `${name} = (await import("${localUrl}")).default; }`
    );
  });
  return html;
}

hexo.extend.filter.register('after_render:css', function (css) {
  if (typeof css !== 'string' || !css) return css;
  return rewriteFontFaceSrc(css);
});

hexo.extend.filter.register('after_render:html', function (html) {
  if (typeof html !== 'string' || !html) return html;
  html = fixEsmImport(html);
  html = addScriptFallback(html);
  return html;
});
