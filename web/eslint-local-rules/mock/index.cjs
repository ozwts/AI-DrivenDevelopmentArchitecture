/**
 * Mock用ESLintルール
 *
 * MSWハンドラーとテストデータの命名・実装パターン
 *
 * 参照: guardrails/policy/web/mock/
 */

"use strict";

module.exports = {
  "data-naming": require("./data-naming.cjs"),
  "handler-naming": require("./handler-naming.cjs"),
};
