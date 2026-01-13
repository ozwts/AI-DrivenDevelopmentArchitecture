/**
 * route.tsx ファイル存在必須ルール
 *
 * routes/配下のルートディレクトリには route.tsx が必要。
 * ただし以下は除外:
 * - _shared/ (共有コード用)
 * - _layout/ (レイアウト用)
 * - components/ (コンポーネント用)
 * - hooks/ (フック用)
 * - _index/ (インデックスルート - 親がOutletを使う場合)
 *
 * 実装方法:
 * routes/配下の.tsx/.tsファイルを処理する際、そのファイルが所属する
 * ルートディレクトリにroute.tsxが存在するかチェックする。
 *
 * 参照: guardrails/policy/web/route/20-colocation-patterns.md
 */

"use strict";

const fs = require("fs");
const path = require("path");

/**
 * ルートディレクトリを特定する
 * 例: /routes/todo/components/TodoList.tsx → /routes/todo
 * 例: /routes/todo/[todoId]/route.tsx → /routes/todo/[todoId]
 */
function findRouteDirectory(filename) {
  const routesMatch = filename.match(/\/routes\/([^/]+)/);
  if (!routesMatch) {
    return null;
  }

  const routesIndex = filename.indexOf("/routes/");
  const afterRoutes = filename.substring(routesIndex + "/routes/".length);
  const parts = afterRoutes.split("/");

  // 最初のディレクトリがルートディレクトリ
  // ただし、ネストしたルート（[todoId]等）の場合はそちらを優先
  let routeDir = filename.substring(0, routesIndex + "/routes/".length) + parts[0];

  // 動的ルート（[param]形式）を探す
  for (let i = 1; i < parts.length - 1; i++) {
    const part = parts[i];
    if (part.startsWith("[") && part.endsWith("]")) {
      routeDir =
        filename.substring(0, routesIndex + "/routes/".length) +
        parts.slice(0, i + 1).join("/");
    }
  }

  return routeDir;
}

/**
 * 除外パターンかどうかをチェック
 */
function isExcludedPath(filename) {
  const excludePatterns = [
    "/_shared/",
    "/_layout/",
    "/components/",
    "/hooks/",
    "/utils/",
    "/api/",
    "/_index/",
  ];

  return excludePatterns.some((pattern) => filename.includes(pattern));
}

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Route directories must have route.tsx file",
      category: "Route",
      recommended: true,
    },
    schema: [],
    messages: {
      missingRouteFile:
        "Route directory '{{dirname}}' should have a route.tsx file. See: 20-colocation-patterns.md",
    },
  },

  create(context) {
    const filename = context.filename ?? context.getFilename();

    // routes/配下のファイルのみ
    if (!filename.includes("/routes/")) {
      return {};
    }

    // .tsx または .ts ファイルのみ
    if (!filename.endsWith(".tsx") && !filename.endsWith(".ts")) {
      return {};
    }

    // route.tsx 自体は対象外（存在確認不要）
    if (filename.endsWith("/route.tsx")) {
      return {};
    }

    // テストファイルは対象外
    if (filename.includes(".test.")) {
      return {};
    }

    // 除外パターンに含まれていればスキップ
    if (isExcludedPath(filename)) {
      return {};
    }

    // ルートディレクトリを特定
    const routeDir = findRouteDirectory(filename);
    if (!routeDir) {
      return {};
    }

    // route.tsx が存在するかチェック
    const routeFilePath = path.join(routeDir, "route.tsx");
    if (fs.existsSync(routeFilePath)) {
      return {};
    }

    // route.tsx がない場合はエラー
    const routePath = routeDir.split("/routes/")[1] || routeDir;

    return {
      Program(node) {
        context.report({
          node,
          messageId: "missingRouteFile",
          data: { dirname: routePath },
        });
      },
    };
  },
};
