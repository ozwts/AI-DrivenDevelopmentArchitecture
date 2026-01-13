/**
 * API通信用ESLintルール
 *
 * APIクライアントと生成型の使用パターン
 *
 * 参照: guardrails/policy/web/api/
 */

"use strict";

module.exports = {
  "use-generated-types": require("./use-generated-types.cjs"),
};
