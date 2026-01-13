/**
 * ユースケース層用ESLintルール
 *
 * MECE構成:
 * - use-case-structure: UseCase構造要件（executeメソッド、プライベートメソッド禁止、Props型）
 * - no-throw: throw禁止（Result型使用）
 * - file-requirements: ファイル存在要件（テストファイル）
 * - result-return-type: execute()がResult型を返すことを強制
 * - props-readonly: Props型プロパティのreadonly必須
 * - no-private-method: プライベートメソッド禁止
 * - in-operator-pattern: PATCHフィールド存在チェックで'in'演算子使用
 * - no-nullish-coalescing-in-patch: PATCH更新での??演算子使用禁止
 *
 * 参照: guardrails/policy/server/use-case/
 */

"use strict";

module.exports = {
  "use-case-structure": require("./use-case-structure.cjs"),
  "no-throw": require("./no-throw.cjs"),
  "file-requirements": require("./file-requirements.cjs"),
  "result-return-type": require("./result-return-type.cjs"),
  "props-readonly": require("./props-readonly.cjs"),
  "no-private-method": require("./no-private-method.cjs"),
  "in-operator-pattern": require("./in-operator-pattern.cjs"),
  "no-nullish-coalescing-in-patch": require("./no-nullish-coalescing-in-patch.cjs"),
};
