/**
 * Procedure Module（行政）
 *
 * ポリシーに従った手順実行機能を提供
 * - 開発サーバー管理（Dev Server Management）: 起動・停止・状態確認・ログ取得
 * - テスト実行管理（Test Runner Management）: テスト実行・結果取得
 * - 自動修正（Auto Fix）: ESLint --fix、terraform fmt
 * - コード生成（Code Generation）: API型生成、モック生成
 */

// ========================================
// Dev Server Management（開発サーバー管理）
// ========================================
export {
  DEV_SERVER_RESPONSIBILITIES,
  type ProcedureResponsibility,
} from "./dev";

// ========================================
// Test Runner Management（テスト実行管理）
// ========================================
export { TEST_RESPONSIBILITIES } from "./test";

// ========================================
// Auto Fix（自動修正）
// ========================================
export { FIX_RESPONSIBILITIES, type FixResponsibility } from "./fix";

// ========================================
// Code Generation（コード生成）
// ========================================
export { CODEGEN_RESPONSIBILITIES, type CodegenResponsibility } from "./codegen";

// ========================================
// Deploy（デプロイ）
// ========================================
export { DEPLOY_RESPONSIBILITIES, type DeployResponsibility } from "./deploy";

// ========================================
// Workflow（ワークフロー管理）
// ========================================
export { WORKFLOW_RESPONSIBILITIES, type WorkflowResponsibility } from "./workflow";

// ========================================
// Context（コンテキスト復元）
// ========================================
export { CONTEXT_RESPONSIBILITIES, type ContextResponsibility } from "./context";
