/**
 * ワークフロー管理（Workflow Management）
 *
 * タスクの計画・登録・進捗管理機能を提供
 * - plan: サブエージェント誘発（タスク抽出）
 * - set: タスク登録/上書き
 * - done: 完了マーク
 * - list: 全タスク表示
 * - clear: クリア
 */

// 責務定義
export {
  WORKFLOW_RESPONSIBILITIES,
  type WorkflowResponsibility,
} from "./responsibilities";

// メモリ（内部利用）
export {
  getWorkflowMemory,
  type WorkflowTask,
  type TaskWithStatus,
} from "./memory";

// プランナー（内部利用）
export { executePlan, type PlannerResult } from "./planner";

// フォーマッター（内部利用）
export {
  formatTaskList,
  formatSetResult,
  formatDoneResult,
  formatClearResult,
} from "./formatter";
