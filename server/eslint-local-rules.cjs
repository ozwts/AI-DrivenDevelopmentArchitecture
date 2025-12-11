/**
 * ローカルESLintルール
 *
 * プロジェクト固有のカスタムルールを定義
 *
 * ディレクトリ構成:
 * - common/: 全層共通ルール
 * - domain-model/: ドメインモデル用ルール
 * - use-case/: ユースケース層用ルール
 * - di-container/: DIコンテナ用ルール
 * - handler/: ハンドラー層用ルール
 * - repository/: リポジトリ用ルール
 *
 * 参照: guardrails/policy/server/domain-model/
 *       guardrails/policy/server/use-case/
 *       guardrails/policy/server/di-container/
 *       guardrails/policy/server/handler/
 *       guardrails/policy/server/repository/
 */

"use strict";

const commonRules = require("./eslint-local-rules/common/index.cjs");
const domainModelRules = require("./eslint-local-rules/domain-model/index.cjs");
const useCaseRules = require("./eslint-local-rules/use-case/index.cjs");
const diContainerRules = require("./eslint-local-rules/di-container/index.cjs");
const handlerRules = require("./eslint-local-rules/handler/index.cjs");
const repositoryRules = require("./eslint-local-rules/repository/index.cjs");

module.exports = {
  // 共通ルール（プレフィックス: common/）
  "common/no-new-date": commonRules["no-new-date"],

  // ドメインモデル用ルール（プレフィックス: domain-model/）
  "domain-model/entity-structure": domainModelRules["entity-structure"],
  "domain-model/value-object-structure": domainModelRules["value-object-structure"],
  "domain-model/aggregate-structure": domainModelRules["aggregate-structure"],
  "domain-model/file-requirements": domainModelRules["file-requirements"],
  "domain-model/no-throw": domainModelRules["no-throw"],
  "domain-model/no-null": domainModelRules["no-null"],
  "domain-model/no-external-deps": domainModelRules["no-external-deps"],
  "domain-model/repository-interface": domainModelRules["repository-interface"],

  // ユースケース層用ルール（プレフィックス: use-case/）
  "use-case/use-case-structure": useCaseRules["use-case-structure"],
  "use-case/no-throw": useCaseRules["no-throw"],
  "use-case/file-requirements": useCaseRules["file-requirements"],

  // DIコンテナ用ルール（プレフィックス: di-container/）
  "di-container/interface-impl-import-pattern": diContainerRules["interface-impl-import-pattern"],

  // ハンドラー層用ルール（プレフィックス: handler/）
  "handler/container-get-restriction": handlerRules["container-get-restriction"],
  "handler/single-usecase-call": handlerRules["single-usecase-call"],

  // リポジトリ用ルール（プレフィックス: repository/）
  "repository/file-requirements": repositoryRules["file-requirements"],
};
