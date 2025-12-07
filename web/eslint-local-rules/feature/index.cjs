/**
 * Feature設計用ESLintルール
 *
 * MECE構成:
 * - no-cross-feature-import: Feature間直接インポート禁止
 *
 * 参照: guardrails/policy/web/feature/
 */

"use strict";

module.exports = {
  "no-cross-feature-import": require("./no-cross-feature-import.cjs"),
};
