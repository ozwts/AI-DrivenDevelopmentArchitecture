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
 * - entity-jsdoc-required: EntityにJSDoc必須
 * - entity-method-naming: Entityメソッドのドメイン命名
 * - single-repository-per-aggregate: 1集約=1リポジトリ強制
 * - es2022-private-field: ES2022プライベートフィールド強制
 * - no-parameter-property: パラメータプロパティ禁止
 * - vo-always-validates: VO常時バリデーション
 * - entity-id-required: Entity idプロパティ必須
 * - repository-type-definition: Repository type定義必須
 * - vo-from-method-required: VO from()メソッド必須
 * - vo-required-methods: VO equals/toString必須
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
  "entity-jsdoc-required": require("./entity-jsdoc-required.cjs"),
  "entity-method-naming": require("./entity-method-naming.cjs"),
  "single-repository-per-aggregate": require("./single-repository-per-aggregate.cjs"),
  "es2022-private-field": require("./es2022-private-field.cjs"),
  "no-parameter-property": require("./no-parameter-property.cjs"),
  "vo-always-validates": require("./vo-always-validates.cjs"),
  "entity-id-required": require("./entity-id-required.cjs"),
  "repository-type-definition": require("./repository-type-definition.cjs"),
  "vo-from-method-required": require("./vo-from-method-required.cjs"),
  "vo-required-methods": require("./vo-required-methods.cjs"),
  "vo-private-constructor": require("./vo-private-constructor.cjs"),
  "vo-meaningful-field-name": require("./vo-meaningful-field-name.cjs"),
  "no-logger": require("./no-logger.cjs"),
  "no-utility-vo": require("./no-utility-vo.cjs"),
};
