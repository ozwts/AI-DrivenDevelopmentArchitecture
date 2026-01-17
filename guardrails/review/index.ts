/**
 * Review Module（司法）
 *
 * ポリシーに基づくコードレビュー機能を提供
 * - 定性的レビュー（Qualitative Review）: ポリシー準拠の定性的評価
 * - 静的解析レビュー（Static Analysis Review）: 型チェック・Lint
 * - 未使用export検出（Unused Exports Review）: knipによる不要コード検出
 */

// ========================================
// Qualitative Review（定性的レビュー）
// ========================================
export {
  type UnifiedReviewResponsibility,
  buildUnifiedReviewResponsibility,
  createUnifiedReviewHandler,
  type UnifiedReviewInput,
} from "./qualitative";

// ========================================
// Static Analysis Review（静的解析レビュー）
// ========================================
export {
  // 責務定義
  type StaticAnalysisResponsibility,
  STATIC_ANALYSIS_RESPONSIBILITIES,
  // ハンドラー
  createStaticAnalysisHandler,
  type StaticAnalysisHandlerInput,
} from "./static-analysis";

// ========================================
// Unused Exports Review（未使用export検出）
// ========================================
export {
  // 責務定義
  type UnusedExportsResponsibility,
  UNUSED_EXPORTS_RESPONSIBILITIES,
  // ハンドラー
  createUnusedExportsHandler,
  type UnusedExportsHandlerInput,
} from "./unused-exports";

// ========================================
// Infra Static Analysis Review（インフラ静的解析）
// ========================================
export {
  // 責務定義
  type InfraAnalysisResponsibility,
  INFRA_ANALYSIS_RESPONSIBILITIES,
  // ハンドラー
  createInfraAnalysisHandler,
  type InfraAnalysisHandlerInput,
} from "./static-analysis-infra";

// ========================================
// Custom Static Analysis Review（カスタム静的解析 - TypeScript Compiler API）
// ========================================
export {
  // 責務定義
  type CustomStaticAnalysisResponsibility,
  CUSTOM_STATIC_ANALYSIS_RESPONSIBILITIES,
  // ハンドラー
  createCustomStaticAnalysisHandler,
  type CustomStaticAnalysisHandlerInput,
} from "./static-analysis-v2";
