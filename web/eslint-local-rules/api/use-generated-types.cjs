/**
 * 生成型使用ルール
 *
 * API通信では@/generated/から生成された型を使用する。
 * 手動定義のスキーマ・型は禁止。
 *
 * 参照: guardrails/policy/web/api/10-api-overview.md
 */

"use strict";

module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Enforce usage of generated types for API communication",
      category: "API",
      recommended: true,
    },
    schema: [],
    messages: {
      useGeneratedTypes:
        "API通信には @/generated/ から生成された型・スキーマを使用してください。手動定義は禁止です。",
    },
  },

  create(context) {
    const filename = context.getFilename();

    // テストファイルは除外
    if (filename.includes(".test.")) {
      return {};
    }

    // generated/ 配下は除外
    if (filename.includes("/generated/")) {
      return {};
    }

    // mocks/ は除外
    if (filename.includes("/mocks/")) {
      return {};
    }

    // hooks/ 配下でAPIスキーマを手動定義している場合を検出
    if (!filename.includes("/hooks/")) {
      return {};
    }

    return {
      // z.object() でスキーマを手動定義している場合
      CallExpression(node) {
        if (
          node.callee?.type === "MemberExpression" &&
          node.callee.object?.name === "z" &&
          node.callee.property?.name === "object"
        ) {
          // API関連のファイル名パターンを検出
          if (
            filename.includes("api") ||
            filename.includes("query") ||
            filename.includes("mutation")
          ) {
            context.report({
              node,
              messageId: "useGeneratedTypes",
            });
          }
        }
      },
    };
  },
};
