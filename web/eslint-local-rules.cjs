/**
 * ローカルESLintルール
 *
 * プロジェクト固有のカスタムルールを定義
 *
 * ディレクトリ構成:
 * - common/: 全層共通ルール（依存方向、API呼び出し、console.log禁止）
 * - component/: コンポーネント設計用ルール
 * - feature/: Feature設計用ルール
 * - lib/: 技術基盤用ルール
 * - design/: デザイン用ルール
 * - route/: ルート設計用ルール
 * - ui/: UIプリミティブ設計用ルール
 * - hooks/: カスタムhooks・TanStack Query用ルール
 * - mock/: MSWモック用ルール
 * - api/: API通信用ルール
 *
 * 参照: guardrails/policy/web/
 */

"use strict";

const commonRules = require("./eslint-local-rules/common/index.cjs");
const componentRules = require("./eslint-local-rules/component/index.cjs");
const featureRules = require("./eslint-local-rules/feature/index.cjs");
const libRules = require("./eslint-local-rules/lib/index.cjs");
const designRules = require("./eslint-local-rules/design/index.cjs");
const routeRules = require("./eslint-local-rules/route/index.cjs");
const uiRules = require("./eslint-local-rules/ui/index.cjs");
const hooksRules = require("./eslint-local-rules/hooks/index.cjs");
const mockRules = require("./eslint-local-rules/mock/index.cjs");
const apiRules = require("./eslint-local-rules/api/index.cjs");

module.exports = {
  // 共通ルール（プレフィックス: common/）
  "common/dependency-direction": commonRules["dependency-direction"],
  "common/no-direct-fetch": commonRules["no-direct-fetch"],
  "common/no-console-log": commonRules["no-console-log"],

  // コンポーネント設計用ルール（プレフィックス: component/）
  "component/props-readonly": componentRules["props-readonly"],
  "component/require-component-test": componentRules["require-component-test"],
  "component/form-dirty-fields": componentRules["form-dirty-fields"],

  // Feature設計用ルール（プレフィックス: feature/）
  "feature/no-cross-feature-import": featureRules["no-cross-feature-import"],

  // 技術基盤用ルール（プレフィックス: lib/）
  "lib/no-domain-dependency": libRules["no-domain-dependency"],

  // デザイン用ルール（プレフィックス: design/）
  "design/no-arbitrary-values": designRules["no-arbitrary-values"],

  // ルート設計用ルール（プレフィックス: route/）
  "route/require-outlet-context-type": routeRules["require-outlet-context-type"],
  "route/outlet-requires-context": routeRules["outlet-requires-context"],
  "route/require-snapshot-test": routeRules["require-snapshot-test"],

  // UIプリミティブ設計用ルール（プレフィックス: ui/）
  "ui/no-classname-in-props": uiRules["no-classname-in-props"],
  "ui/require-omit-classname": uiRules["require-omit-classname"],
  "ui/require-composite-test": uiRules["require-composite-test"],
  "ui/cva-required": uiRules["cva-required"],
  "ui/forwardref-required": uiRules["forwardref-required"],

  // Hooks用ルール（プレフィックス: hooks/）
  "hooks/query-key-constant": hooksRules["query-key-constant"],
  "hooks/mutation-invalidate-pattern": hooksRules["mutation-invalidate-pattern"],
  "hooks/no-query-result-mapping": hooksRules["no-query-result-mapping"],

  // Mock用ルール（プレフィックス: mock/）
  "mock/data-naming": mockRules["data-naming"],
  "mock/handler-naming": mockRules["handler-naming"],

  // API用ルール（プレフィックス: api/）
  "api/use-generated-types": apiRules["use-generated-types"],
};
