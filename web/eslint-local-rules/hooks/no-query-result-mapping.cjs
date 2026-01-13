/**
 * TanStack Query結果マッピング禁止ルール
 *
 * カスタムフックでTanStack Queryの戻り値を独自の状態オブジェクトにマッピングすることを禁止。
 * useQuery/useMutationの結果はそのまま返すべき。
 *
 * 検出対象:
 * - { todos: query.data, loading: query.isLoading, error: query.error } のようなマッピング
 * - useStateをuseQueryと併用してローディング状態を管理
 *
 * 参照: guardrails/policy/web/hooks/20-query-patterns.md
 */

"use strict";

// TanStack Queryの標準プロパティ名
const TANSTACK_QUERY_PROPERTIES = [
  "data",
  "isLoading",
  "isPending",
  "isError",
  "error",
  "isSuccess",
  "isFetching",
  "isRefetching",
  "status",
  "fetchStatus",
  "refetch",
  "mutate",
  "mutateAsync",
  "reset",
  "isIdle",
];

// マッピングでよく使われる別名パターン
const COMMON_MAPPING_ALIASES = {
  data: ["todos", "items", "result", "response", "users", "projects"],
  isLoading: ["loading", "isLoading", "isPending"],
  isPending: ["loading", "pending"],
  error: ["fetchError", "queryError", "err"],
  isError: ["hasError", "failed"],
};

module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Return TanStack Query result directly without mapping to custom object",
      category: "Hooks",
      recommended: true,
    },
    schema: [],
    messages: {
      noQueryResultMapping:
        "Return useQuery/useMutation result directly instead of mapping to custom object. Use '{{ original }}' instead of '{{ alias }}'. See: 20-query-patterns.md",
      noCustomLoadingState:
        "Don't use useState for loading state with useQuery. TanStack Query provides isLoading/isPending. See: 20-query-patterns.md",
    },
  },

  create(context) {
    const filename = context.getFilename();

    // hooks関連ファイルのみ（use*.ts, use*.tsx, hooks/内）
    const isHooksFile =
      filename.includes("/hooks/") ||
      /\/use[A-Z][a-zA-Z]*\.(ts|tsx)$/.test(filename);

    if (!isHooksFile) {
      return {};
    }

    // テストファイル除外
    if (filename.includes(".test.")) {
      return {};
    }

    // useQuery/useMutationを呼び出している変数を追跡
    const queryVariables = new Set();
    // useStateでloading系の状態を持っている変数を追跡
    const loadingStateVariables = new Set();

    return {
      // useQuery/useMutationの呼び出しを追跡
      VariableDeclarator(node) {
        if (
          node.init?.type === "CallExpression" &&
          node.init.callee?.name &&
          (node.init.callee.name === "useQuery" ||
            node.init.callee.name === "useMutation" ||
            node.init.callee.name === "useSuspenseQuery" ||
            node.init.callee.name === "useInfiniteQuery")
        ) {
          if (node.id?.name) {
            queryVariables.add(node.id.name);
          }
        }

        // useStateでloading状態を追跡
        if (
          node.init?.type === "CallExpression" &&
          node.init.callee?.name === "useState"
        ) {
          // const [isLoading, setIsLoading] = useState(false)
          if (node.id?.type === "ArrayPattern") {
            const firstElement = node.id.elements?.[0];
            if (firstElement?.name) {
              const name = firstElement.name.toLowerCase();
              if (
                name.includes("loading") ||
                name.includes("pending") ||
                name.includes("fetching")
              ) {
                loadingStateVariables.add(firstElement.name);
              }
            }
          }
        }
      },

      // 関数の戻り値をチェック
      ReturnStatement(node) {
        // オブジェクトリテラルを返している場合
        if (node.argument?.type !== "ObjectExpression") {
          return;
        }

        const properties = node.argument.properties || [];

        for (const prop of properties) {
          if (prop.type !== "Property") continue;

          const keyName = prop.key?.name || prop.key?.value;
          if (!keyName) continue;

          // query.data, query.isLoading などのアクセスをチェック
          if (
            prop.value?.type === "MemberExpression" &&
            prop.value.object?.name &&
            queryVariables.has(prop.value.object.name)
          ) {
            const originalProp = prop.value.property?.name;

            // 標準プロパティを別名でマッピングしている場合
            if (
              TANSTACK_QUERY_PROPERTIES.includes(originalProp) &&
              keyName !== originalProp
            ) {
              context.report({
                node: prop,
                messageId: "noQueryResultMapping",
                data: { original: originalProp, alias: keyName },
              });
            }
          }
        }
      },

      // useStateでのローディング状態 + useQueryの組み合わせを検出
      "Program:exit"() {
        if (queryVariables.size > 0 && loadingStateVariables.size > 0) {
          // 両方が存在する場合は警告
          // （正確なスコープ分析は複雑なため、ファイル単位で警告）
          for (const loadingVar of loadingStateVariables) {
            const sourceCode = context.getSourceCode();
            const ast = sourceCode.ast;

            // VariableDeclarationを探して警告を出す
            for (const node of ast.body) {
              if (node.type === "VariableDeclaration") {
                for (const decl of node.declarations) {
                  if (
                    decl.id?.type === "ArrayPattern" &&
                    decl.id.elements?.[0]?.name === loadingVar
                  ) {
                    context.report({
                      node: decl,
                      messageId: "noCustomLoadingState",
                    });
                  }
                }
              }
            }
          }
        }
      },
    };
  },
};
