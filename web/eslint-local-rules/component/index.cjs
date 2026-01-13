/**
 * コンポーネント設計用ESLintルール
 *
 * MECE構成:
 * - props-readonly: Props型のreadonly修飾子
 * - require-component-test: コンポーネントテスト必須
 * - form-dirty-fields: フォームでdirtyFields使用を推奨
 * - form-generated-schema: OpenAPI生成スキーマ使用必須
 *
 * 参照: guardrails/policy/web/component/
 */

"use strict";

module.exports = {
  "props-readonly": require("./props-readonly.cjs"),
  "require-component-test": require("./require-component-test.cjs"),
  "form-dirty-fields": require("./form-dirty-fields.cjs"),
  "form-generated-schema": require("./form-generated-schema.cjs"),
};
