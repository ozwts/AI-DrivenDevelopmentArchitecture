/**
 * スナップショットテスト配置ルール
 *
 * - 通常のroute.tsx: 対応する route.ss.test.ts が必要
 * - Outlet親ルート: テストを配置してはいけない（子ルートでカバー）
 *
 * 参照: guardrails/policy/web/route/40-test-patterns.md
 *
 * Outlet親ルートは子ルートのスナップショットに含まれるため、
 * 重複テストを避けるためテスト禁止。
 */

"use strict";

const fs = require("fs");
const path = require("path");

/**
 * ファイル内容に <Outlet が含まれるかチェック
 */
function containsOutlet(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    return /<Outlet\b/.test(content);
  } catch {
    return false;
  }
}

module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "route.tsx files must have corresponding route.ss.test.ts file (except Outlet parent routes)",
      category: "Route",
      recommended: true,
    },
    schema: [],
    messages: {
      missingTest:
        "Route '{{routePath}}' is missing snapshot test file 'route.ss.test.ts'. See: guardrails/policy/web/route/40-test-patterns.md",
      outletParentHasTest:
        "Outlet parent route '{{routePath}}' should NOT have snapshot test. Child routes cover this layout. See: guardrails/policy/web/route/40-test-patterns.md",
    },
  },

  create(context) {
    const filename = context.filename ?? context.getFilename();

    // route.tsx のみ対象
    const basename = path.basename(filename);
    if (basename !== "route.tsx") {
      return {};
    }

    const dir = path.dirname(filename);
    const testPath = path.join(dir, "route.ss.test.ts");
    const testExists = fs.existsSync(testPath);
    const isOutletParent = containsOutlet(filename);
    const routePath = dir.split("/routes/")[1] || dir;

    // Outlet親ルート: テストがあったら違反
    if (isOutletParent && testExists) {
      return {
        Program(node) {
          context.report({
            node,
            messageId: "outletParentHasTest",
            data: { routePath },
          });
        },
      };
    }

    // 通常ルート: テストがなかったら違反
    if (!isOutletParent && !testExists) {
      return {
        Program(node) {
          context.report({
            node,
            messageId: "missingTest",
            data: { routePath },
          });
        },
      };
    }

    return {};
  },
};
