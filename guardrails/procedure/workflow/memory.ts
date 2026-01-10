/**
 * Workflow Memory（ワークフローメモリ）
 *
 * タスクの状態をインメモリで管理
 * MCPサーバーのプロセス内で永続化
 */

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
  /** 参照先runbook相対パス（例: "procedure/workflow/runbooks/50-server.md"） */
  ref?: string;
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
 * ワークフローメモリ
 * シングルトンでタスク状態を管理
 */
class WorkflowMemory {
  private requirements: Requirement[] = [];

  private goal: string | null = null;

  private tasks: TaskWithStatus[] = [];

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

  /**
   * タスクを登録（既存タスクは上書き）
   */
  setTasks(tasks: WorkflowTask[], goal?: string): void {
    if (goal !== undefined) {
      this.goal = goal;
    }
    this.tasks = tasks.map((task, index) => ({
      ...task,
      index,
      done: false,
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
   * 要件定義・ゴール・タスクをクリア
   */
  clear(): void {
    this.requirements = [];
    this.goal = null;
    this.tasks = [];
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
