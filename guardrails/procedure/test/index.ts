/**
 * テスト実行管理（Test Runner Management）
 *
 * テストの実行・結果取得機能を提供
 */

// 責務定義
export { TEST_RESPONSIBILITIES } from "./responsibilities";

// テストランナー（内部利用）
export {
  getTestRunner,
  type TestTarget,
  type TestResult,
  type TestFilter,
  type E2ETestOptions,
} from "./test-runner";

// フォーマッター
export { formatTestResult, formatDuration } from "./formatter";
