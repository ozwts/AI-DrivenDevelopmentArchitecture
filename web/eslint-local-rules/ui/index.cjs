/**
 * UIプリミティブ設計用ESLintルール
 *
 * - no-classname-in-props: Props型での明示的なclassName定義を禁止
 *
 * 責務分担:
 * - ESLint: 明示的な `{ className?: string }` の検出
 * - TypeScript: HTML属性型からのclassName継承の検出
 *
 * ディレクトリ構造に基づいて自動判定:
 * - lib/ui/leaf/: ❌ className禁止
 * - lib/ui/container/: ✅ className許可（ルール対象外）
 * - lib/ui/composite/: ❌ className禁止
 *
 * 参照: guardrails/policy/web/ui/
 */

"use strict";

module.exports = {
  "no-classname-in-props": require("./no-classname-in-props.cjs"),
  "require-omit-classname": require("./require-omit-classname.cjs"),
};
