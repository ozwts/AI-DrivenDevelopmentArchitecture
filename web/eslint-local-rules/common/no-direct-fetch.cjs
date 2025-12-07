/**
 * 直接fetch呼び出し禁止ルール
 *
 * API通信はapiClientを使用する。直接のfetch呼び出しは禁止。
 *
 * 参照: guardrails/policy/web/lib/30-api-patterns.md
 *       - apiClient基盤: 一貫したエラーハンドリング、認証ヘッダー付与
 */

"use strict";

module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Disallow direct fetch() calls, use apiClient instead",
      category: "API",
      recommended: true,
    },
    schema: [],
    messages: {
      noDirectFetch:
        "Direct fetch() call is not allowed. Use apiClient from '@/lib/api' instead. See: lib/30-api-patterns.md",
    },
  },

  create(context) {
    const filename = context.getFilename();

    // lib/api/ 内のファイルは除外（apiClient自体の実装）
    if (filename.includes("/lib/api/")) {
      return {};
    }

    // テストファイルは除外
    if (filename.includes(".test.") || filename.includes(".spec.")) {
      return {};
    }

    // MSWハンドラーは除外
    if (filename.includes("/mocks/") || filename.includes(".handler.")) {
      return {};
    }

    return {
      CallExpression(node) {
        const callee = node.callee;

        // fetch() 直接呼び出し
        if (callee.type === "Identifier" && callee.name === "fetch") {
          context.report({
            node,
            messageId: "noDirectFetch",
          });
        }

        // window.fetch() 呼び出し
        if (
          callee.type === "MemberExpression" &&
          callee.object?.name === "window" &&
          callee.property?.name === "fetch"
        ) {
          context.report({
            node,
            messageId: "noDirectFetch",
          });
        }

        // globalThis.fetch() 呼び出し
        if (
          callee.type === "MemberExpression" &&
          callee.object?.name === "globalThis" &&
          callee.property?.name === "fetch"
        ) {
          context.report({
            node,
            messageId: "noDirectFetch",
          });
        }
      },
    };
  },
};
