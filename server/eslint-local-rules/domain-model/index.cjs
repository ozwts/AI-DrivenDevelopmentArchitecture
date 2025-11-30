/**
 * ドメインモデル用ESLintルール
 *
 * MECE構成:
 * - entity-structure: Entity構造要件
 * - value-object-structure: Value Object構造要件
 * - aggregate-structure: アグリゲート構造・命名要件
 * - file-requirements: ファイル存在要件
 * - no-throw: throw禁止（Result型使用）
 * - no-null: null禁止（undefined使用）
 * - no-external-deps: 外部依存禁止
 * - repository-interface: リポジトリIF要件
 *
 * 参照: guardrails/policy/server/domain-model/
 */

"use strict";

module.exports = {
  "entity-structure": require("./entity-structure.cjs"),
  "value-object-structure": require("./value-object-structure.cjs"),
  "aggregate-structure": require("./aggregate-structure.cjs"),
  "file-requirements": require("./file-requirements.cjs"),
  "no-throw": require("./no-throw.cjs"),
  "no-null": require("./no-null.cjs"),
  "no-external-deps": require("./no-external-deps.cjs"),
  "repository-interface": require("./repository-interface.cjs"),
};
