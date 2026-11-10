#!/usr/bin/env bash
# 把 GitHub 仓库 nil-w/nil.github.io 的默认分支改为 gh-pages
#
# 用法:
#   GITHUB_TOKEN=ghp_xxx ./scripts/set-default-branch.sh
#   或先登录 gh:  gh auth login  然后直接运行
#
# 前提: 仓库里 gh-pages 分支已存在且是源码分支（本次已就绪）。
# 改默认分支不影响 GitHub Pages —— Pages 的发布源在 Settings > Pages
# 里单独指定，本仓库发布源是 master（hexo deploy 推送的产物分支）。

set -euo pipefail

REPO="${REPO:-nil-w/nil.github.io}"
TARGET_BRANCH="${TARGET_BRANCH:-gh-pages}"

need() { command -v "$1" >/dev/null 2>&1 || { echo "缺少 $1"; exit 1; }; }

# ── 路径 A: gh CLI ────────────────────────────────────────────────
if command -v gh >/dev/null 2>&1; then
  if gh auth status >/dev/null 2>&1; then
    echo "使用 gh CLI 改默认分支 -> $TARGET_BRANCH"
    gh api -X PATCH "repos/$REPO" -f "default_branch=$TARGET_BRANCH" --jq '.default_branch'
    exit 0
  fi
  echo "gh CLI 已安装但未登录，请先执行: gh auth login" >&2
  exit 1
fi

# ── 路径 B: 裸 curl + GITHUB_TOKEN ────────────────────────────────
if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  echo "需要 GITHUB_TOKEN 环境变量（或先安装并登录 gh CLI）" >&2
  echo "  token 权限: repo（public repo 也需要）" >&2
  exit 1
fi

echo "使用 API 改默认分支 -> $TARGET_BRANCH"
curl -sS -X PATCH \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "https://api.github.com/repos/$REPO" \
  -d "{\"default_branch\":\"$TARGET_BRANCH\"}" \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('default_branch') or d)"
