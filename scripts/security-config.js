/* eslint-disable no-unused-vars */
/**
 * security-config.js — 运行时密钥注入（hexo 自动加载 scripts/ 目录）
 *
 * 背景（2026-10-27 安全修复）：
 *   gitalk 的 ClientSecret 被写死在 themes/ascent/_config.yml，渲染进每个
 *   文章页 → 线上 105 个页面可明文读取 → 可被第三方冒用 OAuth 换取 token。
 *   同类问题：加密文章的 password 曾是 front-matter 明文。
 *
 * 策略：密钥一律不入库，构建时从环境变量注入；缺失则 fail-closed。
 *   GITALK_CLIENT_SECRET   → gitalk 评论可用；未设置则整站停用评论
 *   BLOG_ENCRYPT_PASSWORD  → 加密文章密码（security-hardening.js 消费）
 *
 * 本地构建：
 *   GITALK_CLIENT_SECRET=xxx BLOG_ENCRYPT_PASSWORD=xxx hexo generate
 *   （建议写进 ~/.zshrc 或 .env.local，不入 git）
 */

function injectGitalk() {
  const theme = hexo.theme && hexo.theme.config;
  if (!theme || !theme.gitalk) return;

  const secret = (process.env.GITALK_CLIENT_SECRET || '').trim();
  const gitalk = theme.gitalk;

  // 兼容旧键名 ClientSecret
  if (secret) {
    gitalk.ClientSecret = secret;
    // 缺 ClientID 也视为配置不完整
    if (!gitalk.ClientID) gitalk.enable = false;
  } else {
    gitalk.ClientSecret = '';
    gitalk.enable = false;   // fail-closed：没有 secret 就不渲染评论区
  }
}

hexo.extend.filter.register('before_generate', injectGitalk);

// hexo server 热更新走 before_generate 之外的路径，这里再兜一次
hexo.extend.filter.register('before_post_render', function (data) {
  injectGitalk();
  return data;
});
