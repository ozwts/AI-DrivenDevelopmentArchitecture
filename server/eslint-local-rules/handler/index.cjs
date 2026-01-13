/**
 * ハンドラー層用ESLintルール
 *
 * - container-get-restriction: container.getでLoggerとUseCaseのみ取得可
 * - single-usecase-call: 1ハンドラー1UseCase呼び出し
 * - no-repository-import: リポジトリ直接インポート禁止
 * - response-mapper-required: レスポンスマッパー必須
 * - enforce-null-to-undefined: PATCHハンドラーでnull→undefined変換
 *
 * 参照: guardrails/policy/server/handler/21-http-handler-implementation.md
 */

"use strict";

module.exports = {
  "container-get-restriction": require("./container-get-restriction.cjs"),
  "single-usecase-call": require("./single-usecase-call.cjs"),
  "no-repository-import": require("./no-repository-import.cjs"),
  "response-mapper-required": require("./response-mapper-required.cjs"),
  "enforce-null-to-undefined": require("./enforce-null-to-undefined.cjs"),
};
