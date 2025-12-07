/**
 * 技術基盤（lib）用ESLintルール
 *
 * MECE構成:
 * - no-provider-context: Provider/Context禁止
 *
 * 注: 依存方向のチェックは common/dependency-direction で統一的に実施
 *
 * 参照: guardrails/policy/web/lib/
 */

"use strict";

module.exports = {
  "no-provider-context": require("./no-provider-context.cjs"),
};
