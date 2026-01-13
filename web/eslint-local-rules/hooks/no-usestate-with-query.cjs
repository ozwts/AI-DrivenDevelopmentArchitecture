/**
 * useQuery使用時のuseState併用禁止ルール
 *
 * TanStack Queryを使用するカスタムフック内で、
 * useStateを併用してローディング状態などを管理することを禁止。
 *
 * 理由:
 * - TanStack Queryは`isLoading`, `isPending`, `isError`などの状態を提供
 * - useStateで独自のローディング状態を管理すると状態の重複が発生
 * - 状態の同期が必要になり、バグの原因となる
 *
 * 禁止パターン:
 * ```typescript
 * const useMyData = () => {
 *   const [isLoading, setIsLoading] = useState(false); // NG
 *   const query = useQuery({ ... });
 *   return { ...query, isLoading };
 * };
 * ```
 *
 * 参照: guardrails/policy/web/hooks/20-query-patterns.md
 */

"use strict";

module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Avoid using useState with useQuery/useMutation for state management",
      category: "Hooks",
      recommended: true,
    },
    schema: [],
    messages: {
      noUseStateWithQuery:
        "Avoid using useState with {{queryHook}}. TanStack Query provides loading/error states. See: 20-query-patterns.md",
    },
  },

  create(context) {
    const filename = context.filename ?? context.getFilename();

    // hooks/ 配下または use*.ts ファイルのみ
    if (!filename.includes("/hooks/") && !filename.match(/\/use[A-Z][^/]*\.ts/)) {
      return {};
    }

    // テストファイルは除外
    if (filename.includes(".test.")) {
      return {};
    }

    let hasUseState = false;
    let useStateNode = null;
    let hasQueryHook = false;
    let queryHookName = "";
    let queryHookNode = null;

    return {
      CallExpression(node) {
        if (node.callee.type !== "Identifier") {
          return;
        }

        const calleeName = node.callee.name;

        // useState の検出
        if (calleeName === "useState") {
          hasUseState = true;
          useStateNode = node;
        }

        // TanStack Query hooks の検出
        if (
          calleeName === "useQuery" ||
          calleeName === "useMutation" ||
          calleeName === "useInfiniteQuery" ||
          calleeName === "useSuspenseQuery"
        ) {
          hasQueryHook = true;
          queryHookName = calleeName;
          queryHookNode = node;
        }
      },

      "Program:exit"() {
        // useStateとQuery hookの両方が存在する場合に警告
        if (hasUseState && hasQueryHook && useStateNode) {
          context.report({
            node: useStateNode,
            messageId: "noUseStateWithQuery",
            data: { queryHook: queryHookName },
          });
        }
      },
    };
  },
};
