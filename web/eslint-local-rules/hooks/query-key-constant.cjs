/**
 * QueryKey定数化ルール
 *
 * useQueryのqueryKeyは定数として定義する。
 * インラインの文字列配列は禁止。
 *
 * 参照: guardrails/policy/web/hooks/20-query-patterns.md
 */

"use strict";

module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Enforce queryKey constants for useQuery",
      category: "Hooks",
      recommended: true,
    },
    schema: [],
    messages: {
      useQueryKeyConstant:
        "queryKeyはインラインの配列ではなく、定数として定義してください。例: const QUERY_KEYS = { todos: ['todos'] as const }",
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
        // useQuery呼び出しを検出
        if (node.callee?.name !== "useQuery") {
          return;
        }

        const args = node.arguments;
        if (args.length === 0) {
          return;
        }

        const firstArg = args[0];

        // オブジェクト形式の場合
        if (firstArg.type === "ObjectExpression") {
          const queryKeyProp = firstArg.properties.find(
            (p) => p.key?.name === "queryKey",
          );

          if (queryKeyProp?.value?.type === "ArrayExpression") {
            // インライン配列の場合は警告
            const hasOnlyLiterals = queryKeyProp.value.elements.every(
              (el) =>
                el?.type === "Literal" || el?.type === "TemplateLiteral",
            );

            if (hasOnlyLiterals && queryKeyProp.value.elements.length > 0) {
              context.report({
                node: queryKeyProp,
                messageId: "useQueryKeyConstant",
              });
            }
          }
        }
      },
    };
  },
};
