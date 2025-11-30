/**
 * ドメインモデル外部依存禁止ルール
 *
 * domain/model 内では許可リスト以外のimportを禁止。
 *
 * 許可:
 * - 同じドメイン層内（@/domain/）
 * - util層（@/util/）
 * - 相対インポート（./、../）
 *
 * 参照: guardrails/policy/server/domain-model/10-domain-model-overview.md
 */

"use strict";

const ALLOWED_IMPORTS = [
  "@/domain/",
  "@/util/",
  "./",
  "../",
];

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Domain model must not depend on external libraries",
      category: "Domain Model",
      recommended: true,
    },
    schema: [],
    messages: {
      noExternalDeps:
        "Domain model must not import '{{importPath}}'. Only @/domain/, @/util/, and relative imports allowed. See: 10-domain-model-overview.md",
    },
  },

  create(context) {
    const filename = context.getFilename();

    if (!filename.includes("/domain/model/")) {
      return {};
    }

    // テスト・ダミーは除外（テスト用にモック等が必要な場合がある）
    if (filename.includes(".test.") || filename.includes(".dummy.")) {
      return {};
    }

    /**
     * インポートパスが許可されているかチェック
     */
    const isAllowed = (importPath) => {
      for (const allowed of ALLOWED_IMPORTS) {
        if (importPath.startsWith(allowed)) {
          return true;
        }
      }
      return false;
    };

    return {
      ImportDeclaration(node) {
        const importPath = node.source.value;
        if (!isAllowed(importPath)) {
          context.report({
            node,
            messageId: "noExternalDeps",
            data: { importPath },
          });
        }
      },

      // 動的import
      ImportExpression(node) {
        if (node.source.type === "Literal") {
          const importPath = node.source.value;
          if (!isAllowed(importPath)) {
            context.report({
              node,
              messageId: "noExternalDeps",
              data: { importPath },
            });
          }
        }
      },
    };
  },
};
