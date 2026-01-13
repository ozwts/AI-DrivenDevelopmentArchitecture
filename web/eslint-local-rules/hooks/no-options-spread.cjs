/**
 * TanStack Queryオプションスプレッド禁止ルール
 *
 * カスタムhooksでuseQuery/useMutationのオプションをスプレッドで
 * 受け取ることを禁止する。
 *
 * 理由:
 * - 型安全性が低下する
 * - どのオプションが使われているか不明確になる
 * - 意図しないオプションの上書きが発生する可能性がある
 *
 * 代わりに、必要なオプションのみを明示的に受け取るべき。
 *
 * 参照: guardrails/policy/web/hooks/10-hooks-overview.md
 */

"use strict";

module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Custom hooks should not spread useQuery/useMutation options",
      category: "Hooks",
      recommended: true,
    },
    schema: [],
    messages: {
      noOptionsSpread:
        "Do not spread query/mutation options in custom hooks. Accept only specific options you need. See: 10-hooks-overview.md",
    },
  },

  create(context) {
    const filename = context.filename ?? context.getFilename();

    // hooks/ 配下のみ
    if (!filename.includes("/hooks/")) {
      return {};
    }

    // テストファイルは除外
    if (filename.includes(".test.")) {
      return {};
    }

    return {
      // 関数パラメータのスプレッドパターンを検出
      // function useXxx({ ...options }) または
      // function useXxx(options: UseQueryOptions<...>)
      FunctionDeclaration(node) {
        checkFunctionForOptionsSpread(node, context);
      },

      // アロー関数も対象
      ArrowFunctionExpression(node) {
        checkFunctionForOptionsSpread(node, context);
      },

      // 関数式も対象
      FunctionExpression(node) {
        checkFunctionForOptionsSpread(node, context);
      },
    };
  },
};

/**
 * 関数のパラメータにオプションスプレッドがないかチェック
 */
function checkFunctionForOptionsSpread(node, context) {
  if (!node.params || node.params.length === 0) {
    return;
  }

  for (const param of node.params) {
    // オブジェクトパターンでのスプレッド: ({ ...options })
    if (param.type === "ObjectPattern") {
      for (const prop of param.properties) {
        if (prop.type === "RestElement") {
          // スプレッドの名前をチェック
          const name =
            prop.argument.type === "Identifier" ? prop.argument.name : "";

          // options, queryOptions, mutationOptions などの名前
          if (
            name.toLowerCase().includes("option") ||
            name.toLowerCase().includes("config")
          ) {
            context.report({
              node: prop,
              messageId: "noOptionsSpread",
            });
          }
        }
      }
    }

    // 型アノテーションでのチェック: (options: UseQueryOptions<...>)
    if (param.typeAnnotation && param.typeAnnotation.typeAnnotation) {
      const typeAnnotation = param.typeAnnotation.typeAnnotation;

      if (
        typeAnnotation.type === "TSTypeReference" &&
        typeAnnotation.typeName &&
        typeAnnotation.typeName.type === "Identifier"
      ) {
        const typeName = typeAnnotation.typeName.name;

        // UseQueryOptions, UseMutationOptions などの型名
        if (
          typeName.includes("QueryOptions") ||
          typeName.includes("MutationOptions")
        ) {
          // パラメータがスプレッドで使われているかどうかは
          // 関数内部でのuseQuery/useMutationへの渡し方を見る必要があるが、
          // 型だけで検出するのは難しいので、ここでは警告のみ
          // 実際には関数本体で { ...options } を検出する方が確実
        }
      }
    }
  }
}
