/**
 * コンポーネント設計用ESLintルール
 *
 * MECE構成:
 * - props-readonly: Props型のreadonly修飾子
 * - require-component-test: コンポーネントテスト必須
 *
 * 参照: guardrails/policy/web/component/
 */

"use strict";

module.exports = {
  "props-readonly": require("./props-readonly.cjs"),
  "require-component-test": require("./require-component-test.cjs"),
};
