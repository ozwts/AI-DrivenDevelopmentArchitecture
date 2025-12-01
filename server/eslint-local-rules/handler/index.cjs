/**
 * ハンドラー層用ESLintルール
 *
 * 参照: guardrails/policy/server/handler/20-handler-implementation.md
 */

"use strict";

module.exports = {
  "container-get-restriction": require("./container-get-restriction.cjs"),
  "single-usecase-call": require("./single-usecase-call.cjs"),
};
