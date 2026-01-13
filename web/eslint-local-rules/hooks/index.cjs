/**
 * Hooks用ESLintルール
 *
 * TanStack Query パターンとカスタムhooksの実装ルール
 *
 * 参照: guardrails/policy/web/hooks/
 */

"use strict";

module.exports = {
  "query-key-constant": require("./query-key-constant.cjs"),
  "mutation-invalidate-pattern": require("./mutation-invalidate-pattern.cjs"),
  "no-query-result-mapping": require("./no-query-result-mapping.cjs"),
};
