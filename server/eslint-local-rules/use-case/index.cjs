/**
 * ユースケース層用ESLintルール
 *
 * MECE構成:
 * - use-case-structure: UseCase構造要件（executeメソッド、プライベートメソッド禁止、Props型）
 * - no-throw: throw禁止（Result型使用）
 * - file-requirements: ファイル存在要件（テストファイル）
 * - result-return-type: execute()がResult型を返すことを強制
 *
 * 参照: guardrails/policy/server/use-case/
 */

"use strict";

module.exports = {
  "use-case-structure": require("./use-case-structure.cjs"),
  "no-throw": require("./no-throw.cjs"),
  "file-requirements": require("./file-requirements.cjs"),
  "result-return-type": require("./result-return-type.cjs"),
};
