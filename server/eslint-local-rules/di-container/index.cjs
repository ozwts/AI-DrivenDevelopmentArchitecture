/**
 * DIコンテナ用ESLintルール
 *
 * 参照: guardrails/policy/server/di-container/10-di-container-overview.md
 */

"use strict";

module.exports = {
  // 汎用版（UseCase, Repository両対応）
  "interface-impl-import-pattern": require("./interface-impl-import-pattern.cjs"),
};
