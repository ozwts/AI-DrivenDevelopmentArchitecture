/**
 * Mutation後のQuery無効化パターンルール
 *
 * useMutationのonSuccessでqueryClient.invalidateQueriesを呼び出す。
 * データ更新後にキャッシュを適切に更新するため。
 *
 * 参照: guardrails/policy/web/hooks/20-query-patterns.md
 */

"use strict";

module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Suggest invalidateQueries in useMutation onSuccess",
      category: "Hooks",
      recommended: true,
    },
    schema: [],
    messages: {
      suggestInvalidate:
        "useMutationのonSuccessでqueryClient.invalidateQueriesを呼び出すことを検討してください。データ更新後にキャッシュを適切に更新するためです。",
    },
  },

  create(context) {
    const filename = context.getFilename();

    // テストファイルは除外
    if (filename.includes(".test.")) {
      return {};
    }

    return {
      CallExpression(node) {
        // useMutation呼び出しを検出
        if (node.callee?.name !== "useMutation") {
          return;
        }

        const args = node.arguments;
        if (args.length === 0) {
          return;
        }

        const firstArg = args[0];

        // オブジェクト形式の場合
        if (firstArg.type === "ObjectExpression") {
          const onSuccessProp = firstArg.properties.find(
            (p) => p.key?.name === "onSuccess",
          );

          // onSuccessがない場合は警告
          if (!onSuccessProp) {
            context.report({
              node,
              messageId: "suggestInvalidate",
            });
          }
        }
      },
    };
  },
};
