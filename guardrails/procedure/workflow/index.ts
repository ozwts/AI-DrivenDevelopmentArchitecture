/**
 * ワークフロー管理（Workflow Management）
 *
 * フェーズベースのタスク計画・登録・進捗管理機能を提供
 * - requirements: 要件定義の登録（スコープ設定含む）
 * - plan: フェーズ単位でタスクを計画（コンテキスト参照）
 * - set: タスク登録/上書き
 * - done: 完了マーク
 * - list: 全タスク表示（フェーズ状態含む）
 * - advance: フェーズ遷移
 * - set-pr: PR情報登録
 * - clear: クリア
 */

// 責務定義
export {
  WORKFLOW_RESPONSIBILITIES,
  type WorkflowResponsibility,
} from "./responsibilities";

// フェーズ定義
export {
  PHASES,
  getPhasesForScope,
  getPhaseDefinition,
  getNextPhase,
  isPhaseInScope,
  type Phase,
  type Scope,
  type PhaseDefinition,
} from "./phases";

// メモリ（内部利用）
export {
  getWorkflowMemory,
  type Requirement,
  type WorkflowTask,
  type TaskWithStatus,
  type Notes,
  type PhaseState,
  type PRInfo,
} from "./memory";

// コンテキスト収集
export {
  collectContext,
  formatContextForGuidance,
  type WorkflowContext,
  type CommitInfo,
  type PRComment,
} from "./context-collector";

// プランナー（内部利用）
export { executePlan, type PlannerResult } from "./planner";

// フォーマッター（内部利用）
export {
  formatTaskList,
  formatRequirementsResult,
  formatSetResult,
  formatDoneResult,
  formatClearResult,
  formatAdvanceResult,
  formatAdvanceBlockedResult,
  formatWorkflowCompleteResult,
} from "./formatter";
