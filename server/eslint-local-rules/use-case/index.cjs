/**
 * ユースケース層用ESLintルール
 *
 * MECE構成:
 * - use-case-structure: UseCase構造要件（executeメソッド、プライベートメソッド禁止、Props型）
 * - no-throw: throw禁止（Result型使用）
 * - file-requirements: ファイル存在要件（テストファイル）
 *
 * 参照: guardrails/policy/server/use-case/
 */

"use strict";

module.exports = {
  "use-case-structure": require("./use-case-structure.cjs"),
  "no-throw": require("./no-throw.cjs"),
  "file-requirements": require("./file-requirements.cjs"),
};
