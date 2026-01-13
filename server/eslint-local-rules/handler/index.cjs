/**
 * ハンドラー層用ESLintルール
 *
 * 参照: guardrails/policy/server/handler/21-http-handler-implementation.md
 */

"use strict";

module.exports = {
  "container-get-restriction": require("./container-get-restriction.cjs"),
  "single-usecase-call": require("./single-usecase-call.cjs"),
  "no-repository-import": require("./no-repository-import.cjs"),
  "response-mapper-required": require("./response-mapper-required.cjs"),
};
