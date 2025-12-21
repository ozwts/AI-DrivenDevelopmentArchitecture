/**
 * useOutletContext型パラメータ必須ルール
 *
 * useOutletContext()を使用する際は型パラメータを必須とする。
 * 型なしで使用すると親子間のデータ依存が静的に追跡できない。
 *
 * 参照: guardrails/policy/web/route/20-colocation-patterns.md
 *       - OutletContext型のパターン: 親ルートで型をexport、子ルートでimportして使用
 */

"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "useOutletContext() must have type parameter for static type safety",
      category: "Route",
      recommended: true,
    },
    schema: [],
    messages: {
      requireTypeParameter:
        "useOutletContext() must have type parameter. Example: useOutletContext<ParentOutletContext>(). See: route/20-colocation-patterns.md",
    },
  },

  create(context) {
    const filename = context.getFilename();

    // routes/ 内のファイルのみ対象
    if (!filename.includes("/routes/")) {
      return {};
    }

    // テストファイルは除外
    if (filename.includes(".test.") || filename.includes(".spec.")) {
      return {};
    }

    return {
      CallExpression(node) {
        // useOutletContext() 呼び出しを検出
        if (
          node.callee.type === "Identifier" &&
          node.callee.name === "useOutletContext"
        ) {
          // 型パラメータがない場合はエラー
          if (!node.typeArguments && !node.typeParameters) {
            context.report({
              node,
              messageId: "requireTypeParameter",
            });
          }
        }
      },
    };
  },
};
