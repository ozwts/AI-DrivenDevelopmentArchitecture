/**
 * ローカルESLintルール
 *
 * プロジェクト固有のカスタムルールを定義
 *
 * ディレクトリ構成:
 * - common/: 全層共通ルール（依存方向、API呼び出し）
 * - component/: コンポーネント設計用ルール
 * - feature/: Feature設計用ルール
 * - lib/: 技術基盤用ルール
 * - design/: デザイン用ルール
 * - route/: ルート設計用ルール
 * - ui/: UIプリミティブ設計用ルール
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

module.exports = {
  // 共通ルール（プレフィックス: common/）
  "common/dependency-direction": commonRules["dependency-direction"],
  "common/no-direct-fetch": commonRules["no-direct-fetch"],

  // コンポーネント設計用ルール（プレフィックス: component/）
  "component/props-readonly": componentRules["props-readonly"],
  "component/require-component-test": componentRules["require-component-test"],

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
};
