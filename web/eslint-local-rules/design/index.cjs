/**
 * デザイン用ESLintルール
 *
 * MECE構成:
 * - no-arbitrary-values: Tailwind arbitrary values禁止
 *
 * 参照: guardrails/policy/web/design/
 */

"use strict";

module.exports = {
  "no-arbitrary-values": require("./no-arbitrary-values.cjs"),
};
