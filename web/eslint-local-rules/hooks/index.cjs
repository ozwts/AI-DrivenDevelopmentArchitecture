/**
 * Hooks用ESLintルール
 *
 * TanStack Query パターンとカスタムhooksの実装ルール
 *
 * - query-key-constant: QueryKey定数化
 * - mutation-invalidate-pattern: Mutation後のinvalidate推奨
 * - no-query-result-mapping: Query結果マッピング禁止
 * - no-options-spread: useQuery/useMutationオプションスプレッド禁止
 * - no-usestate-with-query: useQuery使用時のuseState併用禁止
 *
 * 参照: guardrails/policy/web/hooks/
 */

"use strict";

module.exports = {
  "query-key-constant": require("./query-key-constant.cjs"),
  "mutation-invalidate-pattern": require("./mutation-invalidate-pattern.cjs"),
  "no-query-result-mapping": require("./no-query-result-mapping.cjs"),
  "no-options-spread": require("./no-options-spread.cjs"),
  "no-usestate-with-query": require("./no-usestate-with-query.cjs"),
};
