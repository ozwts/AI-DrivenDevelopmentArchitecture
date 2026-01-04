/**
 * Workflow Memory（ワークフローメモリ）
 *
 * タスクの状態をインメモリで管理
 * MCPサーバーのプロセス内で永続化
 */

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
  /** 参照先runbook名（例: "server-implementation"） */
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
  private tasks: TaskWithStatus[] = [];

  /**
   * タスクを登録（既存タスクは上書き）
   */
  setTasks(tasks: WorkflowTask[]): void {
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
   * タスクをクリア
   */
  clear(): void {
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
