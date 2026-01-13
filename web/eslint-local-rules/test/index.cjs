/**
 * テスト用ESLintルール
 *
 * テストファイルの品質を向上させるルール:
 * - selector-priority: getByRole/getByLabel優先、data-testid最後の手段
 *
 * 参照: guardrails/policy/web/component/20-selector-strategy.md
 */

"use strict";

module.exports = {
  "selector-priority": require("./selector-priority.cjs"),
};
