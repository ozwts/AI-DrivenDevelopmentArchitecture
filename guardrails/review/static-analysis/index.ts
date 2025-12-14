/**
 * 静的解析レビュー（Static Analysis Review）
 *
 * TypeScript型チェックとESLintによる静的解析機能を提供
 */

// 責務定義
export {
  type StaticAnalysisResponsibility,
  STATIC_ANALYSIS_RESPONSIBILITIES,
} from "./responsibilities";

// ハンドラー
export {
  createStaticAnalysisHandler,
  type StaticAnalysisHandlerInput,
  type Workspace,
} from "./handler";

// レビュアー（内部利用）
export {
  executeStaticAnalysis,
  type StaticAnalysisInput,
  type StaticAnalysisResult,
  type StaticAnalysisType,
  type TypeCheckIssue,
  type LintIssue,
} from "./reviewer";

// フォーマッター（内部利用）
export { formatStaticAnalysisResults } from "./formatter";
