/**
 * ローカルESLintルール
 *
 * プロジェクト固有のカスタムルールを定義
 *
 * ディレクトリ構成:
 * - domain-model/: ドメインモデル用ルール
 *
 * 参照: guardrails/policy/server/domain-model/
 */

"use strict";

const domainModelRules = require("./eslint-local-rules/domain-model/index.cjs");

module.exports = {
  // ドメインモデル用ルール（プレフィックス: domain-model/）
  "domain-model/entity-structure": domainModelRules["entity-structure"],
  "domain-model/value-object-structure": domainModelRules["value-object-structure"],
  "domain-model/aggregate-structure": domainModelRules["aggregate-structure"],
  "domain-model/file-requirements": domainModelRules["file-requirements"],
  "domain-model/no-throw": domainModelRules["no-throw"],
  "domain-model/no-null": domainModelRules["no-null"],
  "domain-model/no-external-deps": domainModelRules["no-external-deps"],
  "domain-model/repository-interface": domainModelRules["repository-interface"],
};
