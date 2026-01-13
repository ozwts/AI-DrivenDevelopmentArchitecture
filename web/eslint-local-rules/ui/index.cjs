/**
 * UIプリミティブ設計用ESLintルール
 *
 * - no-classname-in-props: Props型での明示的なclassName定義を禁止
 * - require-omit-classname: HTML属性型継承時にclassNameをOmitで除外必須
 * - require-composite-test: Compositeコンポーネントにテスト必須
 * - cva-required: バリアントを持つコンポーネントはCVA使用必須
 * - forwardref-required: UIプリミティブはforwardRef必須
 * - no-conditional-classname: 条件分岐によるclassName生成禁止
 *
 * 責務分担:
 * - ESLint: 明示的な `{ className?: string }` の検出
 * - TypeScript: HTML属性型からのclassName継承の検出
 *
 * ディレクトリ構造に基づいて自動判定:
 * - lib/ui/leaf/: ❌ className禁止、テスト任意
 * - lib/ui/composite/: ❌ className禁止、テスト必須
 *
 * 参照: guardrails/policy/web/ui/
 */

"use strict";

module.exports = {
  "no-classname-in-props": require("./no-classname-in-props.cjs"),
  "require-omit-classname": require("./require-omit-classname.cjs"),
  "require-composite-test": require("./require-composite-test.cjs"),
  "cva-required": require("./cva-required.cjs"),
  "forwardref-required": require("./forwardref-required.cjs"),
  "no-conditional-classname": require("./no-conditional-classname.cjs"),
};
