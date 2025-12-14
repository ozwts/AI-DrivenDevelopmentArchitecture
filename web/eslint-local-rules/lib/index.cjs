/**
 * 技術基盤（lib）用ESLintルール
 *
 * - no-domain-dependency: アプリケーション固有コードへの依存禁止
 *
 * 参照: guardrails/policy/web/lib/
 */

"use strict";

module.exports = {
  "no-domain-dependency": require("./no-domain-dependency.cjs"),
};
