/**
 * 依存の方向ルール
 *
 * app/ 内の依存は一方向のみ許可:
 * - routes → features → lib（順方向）
 * - 逆方向のインポートは禁止
 *
 * 参照: guardrails/policy/web/route/10-route-overview.md
 *       - 依存の方向: routes → features → lib
 */

"use strict";

const LAYER_ORDER = ["lib", "features", "routes"];

/**
 * パスから層を抽出
 */
const getLayer = (filePath) => {
  if (filePath.includes("/lib/")) return "lib";
  if (filePath.includes("/features/")) return "features";
  if (filePath.includes("/routes/")) return "routes";
  return null;
};

/**
 * インポートパスから層を抽出
 */
const getImportLayer = (importPath) => {
  // @/lib/..., @/features/..., @/routes/... パターン
  const match = importPath.match(/^@\/(lib|features|routes)/);
  if (match) return match[1];

  // 相対パス ../../../lib/... パターン
  if (importPath.includes("/lib/")) return "lib";
  if (importPath.includes("/features/")) return "features";
  if (importPath.includes("/routes/")) return "routes";

  return null;
};

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Enforce dependency direction: routes → features → lib",
      category: "Architecture",
      recommended: true,
    },
    schema: [],
    messages: {
      invalidDependency:
        "Invalid dependency direction: '{{fromLayer}}' cannot import from '{{toLayer}}'. Allowed: routes → features → lib. See: route/10-route-overview.md",
    },
  },

  create(context) {
    const filename = context.getFilename();

    // src/app/ 内のファイルのみ対象
    if (!filename.includes("/src/app/") && !filename.includes("/app/")) {
      return {};
    }

    // テストファイルは除外
    if (filename.includes(".test.") || filename.includes(".spec.")) {
      return {};
    }

    const fromLayer = getLayer(filename);
    if (!fromLayer) return {};

    const fromIndex = LAYER_ORDER.indexOf(fromLayer);

    return {
      ImportDeclaration(node) {
        const importPath = node.source.value;
        const toLayer = getImportLayer(importPath);

        if (!toLayer) return;

        const toIndex = LAYER_ORDER.indexOf(toLayer);

        // 自分より下層（index が小さい）へのインポートは許可
        // 自分と同層も許可
        // 自分より上層（index が大きい）へのインポートは禁止
        if (toIndex > fromIndex) {
          context.report({
            node,
            messageId: "invalidDependency",
            data: {
              fromLayer,
              toLayer,
            },
          });
        }
      },
    };
  },
};
