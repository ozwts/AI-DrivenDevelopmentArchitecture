/**
 * インフラ静的解析レビュー（Infra Static Analysis Review）
 *
 * Terraform fmt、TFLint、Trivyによるインフラコードの静的解析機能を提供
 */

// 責務定義
export {
  type InfraAnalysisResponsibility,
  INFRA_ANALYSIS_RESPONSIBILITIES,
} from "./responsibilities";

// ハンドラー
export {
  createInfraAnalysisHandler,
  type InfraAnalysisHandlerInput,
} from "./handler";

// レビュアー（内部利用）
export {
  executeInfraAnalysis,
  type InfraAnalysisInput,
  type InfraAnalysisResult,
  type InfraAnalysisType,
  type FormatIssue,
  type TFLintIssue,
  type TrivyIssue,
} from "./reviewer";

// フォーマッター（内部利用）
export { formatInfraAnalysisResults } from "./formatter";
