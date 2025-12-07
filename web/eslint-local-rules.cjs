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
 *
 * 参照: guardrails/policy/web/
 */

"use strict";

const commonRules = require("./eslint-local-rules/common/index.cjs");
const componentRules = require("./eslint-local-rules/component/index.cjs");
const featureRules = require("./eslint-local-rules/feature/index.cjs");
const libRules = require("./eslint-local-rules/lib/index.cjs");
const designRules = require("./eslint-local-rules/design/index.cjs");

module.exports = {
  // 共通ルール（プレフィックス: common/）
  "common/dependency-direction": commonRules["dependency-direction"],
  "common/no-direct-fetch": commonRules["no-direct-fetch"],

  // コンポーネント設計用ルール（プレフィックス: component/）
  "component/props-readonly": componentRules["props-readonly"],

  // Feature設計用ルール（プレフィックス: feature/）
  "feature/no-cross-feature-import": featureRules["no-cross-feature-import"],

  // 技術基盤用ルール（プレフィックス: lib/）
  "lib/no-provider-context": libRules["no-provider-context"],

  // デザイン用ルール（プレフィックス: design/）
  "design/no-arbitrary-values": designRules["no-arbitrary-values"],
};
