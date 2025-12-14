/**
 * Procedure Module（行政）
 *
 * ポリシーに従った手順実行機能を提供
 * - 開発サーバー管理（Dev Server Management）: 起動・停止・状態確認・ログ取得
 * - テスト実行管理（Test Runner Management）: テスト実行・結果取得
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
