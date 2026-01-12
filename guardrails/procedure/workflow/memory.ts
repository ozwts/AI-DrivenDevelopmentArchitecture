/**
 * Workflow Memory（ワークフローメモリ）
 *
 * タスクの状態をインメモリで管理
 * MCPサーバーのプロセス内で永続化
 */

import {
  type Phase,
  type Scope,
  getPhasesForScope,
  getNextPhase as getNextPhaseFromDefinition,
  isPhaseInScope as isPhaseInScopeFromDefinition,
} from "./phases";

/**
 * 要件定義
 *
 * 対話を通じて深掘りし、以下の観点を明確化する：
 * - actor: 誰がその機能を使うか
 * - want: 何をしたいか（ニーズ）
 * - because: なぜ必要か（課題・背景）
 * - acceptance: どうなれば成功か（成功基準）
 * - constraints: 守るべきルールや制約（オプション）
 */
export type Requirement = {
  /** 誰が（アクター・ユーザー種別） */
  actor: string;
  /** 何をしたい（ニーズ・欲求） */
  want: string;
  /** なぜ（課題・背景） */
  because: string;
  /** 成功基準（どうなれば達成か） */
  acceptance: string;
  /** 制約（オプション） */
  constraints?: string[];
};

/**
 * ワークフロータスク
 */
export type WorkflowTask = {
  /** 何をするか（具体的なアクション） */
  what: string;
  /** なぜするか（目的・理由） */
  why: string;
  /** 完了条件 */
  doneWhen: string;
  /** 参照先runbook相対パス（例: ["procedure/workflow/runbooks/50-server-domain.md"]） */
  refs?: string[];
  /** 完了状態（計画見直し時に完了済みタスクを保持するために使用） */
  done?: boolean;
  /** 所属フェーズ（オプション） */
  phase?: Phase;
};

/**
 * 状態付きタスク
 */
export type TaskWithStatus = WorkflowTask & {
  /** タスクインデックス（0始まり） */
  index: number;
  /** 完了フラグ */
  done: boolean;
};

/**
 * 特記事項（人・AIへの引き継ぎ用）
 */
export type Notes = {
  /** 設計判断: 重要な設計判断とその理由 */
  designDecisions: string[];
  /** 後続作業・残件: やりきれなかったこと */
  remainingWork: string[];
  /** 破壊的変更: 既存機能への影響 */
  breakingChanges: string[];
};

/**
 * フェーズ状態
 */
export type PhaseState = {
  /** 現在のフェーズ */
  current: Phase | null;
  /** 完了したフェーズ */
  completed: Phase[];
  /** 実装スコープ */
  scope: Scope;
};

/**
 * PR情報
 */
export type PRInfo = {
  /** PR番号 */
  number: number;
  /** PR URL */
  url: string;
};

/**
 * ワークフローメモリ
 * シングルトンでタスク状態を管理
 */
class WorkflowMemory {
  private requirements: Requirement[] = [];

  private goal: string | null = null;

  private tasks: TaskWithStatus[] = [];

  private notes: Notes = {
    designDecisions: [],
    remainingWork: [],
    breakingChanges: [],
  };

  private phaseState: PhaseState = {
    current: null,
    completed: [],
    scope: "full",
  };

  // ========================================
  // 要件定義
  // ========================================

  /**
   * 要件定義を設定
   */
  setRequirements(requirements: Requirement[]): void {
    this.requirements = requirements;
  }

  /**
   * 要件定義を取得
   */
  getRequirements(): Requirement[] {
    return [...this.requirements];
  }

  /**
   * 要件定義が存在するか
   */
  hasRequirements(): boolean {
    return this.requirements.length > 0;
  }

  // ========================================
  // ゴール
  // ========================================

  /**
   * ゴールを設定
   */
  setGoal(goal: string): void {
    this.goal = goal;
  }

  /**
   * ゴールを取得
   */
  getGoal(): string | null {
    return this.goal;
  }

  // ========================================
  // タスク管理
  // ========================================

  /**
   * タスクを登録（既存タスクは上書き）
   * doneフラグが指定されていればその値を使用、未指定ならfalse
   */
  setTasks(tasks: WorkflowTask[], goal?: string): void {
    if (goal !== undefined) {
      this.goal = goal;
    }
    this.tasks = tasks.map((task, index) => ({
      ...task,
      index,
      done: task.done ?? false,
    }));
  }

  /**
   * タスクを完了マーク
   */
  markDone(index: number): boolean {
    const task = this.tasks.find((t) => t.index === index);
    if (task === undefined) {
      return false;
    }
    task.done = true;
    return true;
  }

  /**
   * 全タスクを取得
   */
  getTasks(): TaskWithStatus[] {
    return [...this.tasks];
  }

  /**
   * 未完了タスクを取得
   */
  getPendingTasks(): TaskWithStatus[] {
    return this.tasks.filter((t) => !t.done);
  }

  /**
   * 完了タスクを取得
   */
  getCompletedTasks(): TaskWithStatus[] {
    return this.tasks.filter((t) => t.done);
  }

  /**
   * タスクが存在するか
   */
  hasTasks(): boolean {
    return this.tasks.length > 0;
  }

  /**
   * 進捗を取得
   */
  getProgress(): { total: number; completed: number; pending: number } {
    const total = this.tasks.length;
    const completed = this.tasks.filter((t) => t.done).length;
    return {
      total,
      completed,
      pending: total - completed,
    };
  }

  /**
   * 特定フェーズのタスクを取得
   */
  getTasksForPhase(phase: Phase): TaskWithStatus[] {
    return this.tasks.filter((t) => t.phase === phase);
  }

  /**
   * 特定フェーズの未完了タスクを取得
   */
  getPendingTasksForPhase(phase: Phase): TaskWithStatus[] {
    return this.tasks.filter((t) => t.phase === phase && !t.done);
  }

  // ========================================
  // 特記事項
  // ========================================

  /**
   * 特記事項を取得
   */
  getNotes(): Notes {
    return { ...this.notes };
  }

  /**
   * 特記事項を設定
   */
  setNotes(notes: Partial<Notes>): void {
    if (notes.designDecisions !== undefined) {
      this.notes.designDecisions = notes.designDecisions;
    }
    if (notes.remainingWork !== undefined) {
      this.notes.remainingWork = notes.remainingWork;
    }
    if (notes.breakingChanges !== undefined) {
      this.notes.breakingChanges = notes.breakingChanges;
    }
  }

  /**
   * 設計判断を追加
   */
  addDesignDecision(decision: string): void {
    this.notes.designDecisions.push(decision);
  }

  /**
   * 後続作業・残件を追加
   */
  addRemainingWork(work: string): void {
    this.notes.remainingWork.push(work);
  }

  /**
   * 破壊的変更を追加
   */
  addBreakingChange(change: string): void {
    this.notes.breakingChanges.push(change);
  }

  // ========================================
  // フェーズ管理
  // ========================================

  /**
   * スコープを設定
   */
  setScope(scope: Scope): void {
    this.phaseState.scope = scope;
  }

  /**
   * スコープを取得
   */
  getScope(): Scope {
    return this.phaseState.scope;
  }

  /**
   * 現在のフェーズを取得
   */
  getCurrentPhase(): Phase | null {
    return this.phaseState.current;
  }

  /**
   * 現在のフェーズを設定
   */
  setCurrentPhase(phase: Phase): void {
    this.phaseState.current = phase;
  }

  /**
   * フェーズを完了マーク
   */
  completePhase(phase: Phase): void {
    if (!this.phaseState.completed.includes(phase)) {
      this.phaseState.completed.push(phase);
    }
  }

  /**
   * 完了したフェーズを取得
   */
  getCompletedPhases(): Phase[] {
    return [...this.phaseState.completed];
  }

  /**
   * フェーズがスコープに含まれるか確認
   */
  isPhaseInScope(phase: Phase): boolean {
    return isPhaseInScopeFromDefinition(phase, this.phaseState.scope);
  }

  /**
   * 次のフェーズを取得
   */
  getNextPhase(): Phase | null {
    return getNextPhaseFromDefinition(
      this.phaseState.current,
      this.phaseState.scope,
    );
  }

  /**
   * スコープ内のフェーズ一覧を取得
   */
  getPhasesInScope(): Phase[] {
    return getPhasesForScope(this.phaseState.scope);
  }

  /**
   * フェーズ状態全体を取得
   */
  getPhaseState(): PhaseState {
    return { ...this.phaseState };
  }

  /**
   * フェーズが完了済みか確認
   */
  isPhaseCompleted(phase: Phase): boolean {
    return this.phaseState.completed.includes(phase);
  }

  // ========================================
  // クリア
  // ========================================

  /**
   * 要件定義・ゴール・タスク・特記事項・フェーズをクリア
   */
  clear(): void {
    this.requirements = [];
    this.goal = null;
    this.tasks = [];
    this.notes = {
      designDecisions: [],
      remainingWork: [],
      breakingChanges: [],
    };
    this.phaseState = {
      current: null,
      completed: [],
      scope: "full",
    };
  }
}

// シングルトンインスタンス
let memoryInstance: WorkflowMemory | null = null;

/**
 * ワークフローメモリを取得
 */
export const getWorkflowMemory = (): WorkflowMemory => {
  if (memoryInstance === null) {
    memoryInstance = new WorkflowMemory();
  }
  return memoryInstance;
};

// 型の再エクスポート
export type { Phase, Scope } from "./phases";
