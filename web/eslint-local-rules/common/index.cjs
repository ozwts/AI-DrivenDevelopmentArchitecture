/**
 * 共通ESLintルール
 *
 * プロジェクト全体に適用されるルール
 *
 * MECE構成:
 * - dependency-direction: 依存の方向（routes → features → lib）
 * - no-direct-fetch: 直接fetch禁止（apiClient使用）
 *
 * 参照: guardrails/policy/web/
 */

"use strict";

module.exports = {
  "dependency-direction": require("./dependency-direction.cjs"),
  "no-direct-fetch": require("./no-direct-fetch.cjs"),
};
