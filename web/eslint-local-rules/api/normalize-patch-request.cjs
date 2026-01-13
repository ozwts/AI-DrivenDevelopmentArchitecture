/**
 * PATCH リクエスト normalizePatchRequest使用必須ルール
 *
 * PATCHリクエストを送信する際は、dirtyFieldsを使用して
 * 変更されたフィールドのみを送信する。
 * normalizePatchRequest関数を使用することで、
 * 3値セマンティクス（値あり/undefined/null）を正しく処理する。
 *
 * 参照: guardrails/policy/web/api/20-api-client.md
 */

"use strict";

module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "PATCH requests should use normalizePatchRequest with dirtyFields",
      category: "API",
      recommended: true,
    },
    schema: [],
    messages: {
      useNormalizePatchRequest:
        "PATCH request should use 'normalizePatchRequest(data, dirtyFields)' to properly handle 3-value semantics. See: 20-api-client.md",
    },
  },

  create(context) {
    const filename = context.getFilename();

    // API関連ファイルのみ（features/*/api/ または routes/**/api/）
    if (!filename.includes("/api/")) {
      return {};
    }

    // テスト除外
    if (filename.includes(".test.")) {
      return {};
    }

    let hasNormalizePatchRequestImport = false;

    return {
      // normalizePatchRequestのインポートをチェック
      ImportDeclaration(node) {
        if (
          node.source?.value?.includes("/normalize") ||
          node.source?.value?.includes("@/app/lib/api")
        ) {
          const hasImport = node.specifiers?.some(
            (spec) => spec.imported?.name === "normalizePatchRequest",
          );
          if (hasImport) {
            hasNormalizePatchRequestImport = true;
          }
        }
      },

      // apiClient.patch() の呼び出しをチェック
      CallExpression(node) {
        // apiClient.patch() パターンを検出
        if (
          node.callee?.type === "MemberExpression" &&
          node.callee.object?.name === "apiClient" &&
          node.callee.property?.name === "patch"
        ) {
          // normalizePatchRequestがインポートされていない場合は警告
          if (!hasNormalizePatchRequestImport) {
            context.report({
              node,
              messageId: "useNormalizePatchRequest",
            });
          }
        }

        // api.xxx.patch() パターンも検出（生成されたAPIクライアント）
        if (
          node.callee?.type === "MemberExpression" &&
          node.callee.property?.name === "patch" &&
          node.callee.object?.type === "MemberExpression" &&
          node.callee.object.object?.name === "api"
        ) {
          if (!hasNormalizePatchRequestImport) {
            context.report({
              node,
              messageId: "useNormalizePatchRequest",
            });
          }
        }
      },
    };
  },
};
