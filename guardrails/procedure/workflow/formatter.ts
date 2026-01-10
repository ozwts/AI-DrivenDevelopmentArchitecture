/**
 * Workflow Formatter（ワークフローフォーマッター）
 *
 * ワークフロータスクの出力整形
 */

import type { TaskWithStatus, Requirement } from "./memory";

/**
 * タスク名を短縮（長すぎる場合は省略）
 */
const truncateTaskName = (name: string, maxLength: number = 40): string => {
  if (name.length <= maxLength) {
    return name;
  }
  return `${name.substring(0, maxLength - 3)}...`;
};

/**
 * 進捗サマリーテーブルを生成
 */
const formatProgressTable = (tasks: TaskWithStatus[]): string => {
  const completed = tasks.filter((t) => t.done).length;
  const total = tasks.length;
  const pendingTasks = tasks.filter((t) => !t.done);
  const nextIndex = pendingTasks.length > 0 ? pendingTasks[0].index : -1;

  const lines: string[] = [
    "",
    `## 進捗: ${completed}/${total} 完了`,
    "",
    "| # | タスク | 状態 |",
    "|---|--------|------|",
  ];

  for (const task of tasks) {
    let status: string;
    if (task.done) {
      status = "✅";
    } else if (task.index === nextIndex) {
      status = "▶ 次";
    } else {
      status = "⬜";
    }
    lines.push(`| ${task.index} | ${truncateTaskName(task.what)} | ${status} |`);
  }

  lines.push("");
  lines.push("_詳細: `procedure_workflow(action: 'list')`_");

  return lines.join("\n");
};

/**
 * 次のタスク詳細を表示するヘルパー
 */
const formatNextTaskDetail = (tasks: TaskWithStatus[]): string => {
  const pendingTasks = tasks.filter((t) => !t.done);
  if (pendingTasks.length === 0) {
    return "\n\n🎉 **全タスク完了！**";
  }

  const nextTask = pendingTasks[0];
  const lines: string[] = [
    "",
    "---",
    "",
    "## ▶ 次のタスク",
    "",
    `### [${nextTask.index}] ${nextTask.what}`,
    "",
    `- **Why**: ${nextTask.why}`,
    `- **Done when**: ${nextTask.doneWhen}`,
  ];

  if (nextTask.ref !== undefined) {
    lines.push(`- **Ref**: \`${nextTask.ref}\``);
  }

  lines.push("");
  lines.push(`完了後: \`procedure_workflow(action: 'done', index: ${nextTask.index})\``);

  return lines.join("\n");
};

/**
 * 進捗サマリー + 次タスク詳細を表示
 */
const formatProgressAndNextTask = (tasks: TaskWithStatus[]): string =>
  formatProgressTable(tasks) + formatNextTaskDetail(tasks);

/**
 * タスクリストをチェックリスト形式でフォーマット
 */
export const formatTaskList = (
  goal: string | null,
  requirements: Requirement[],
  tasks: TaskWithStatus[],
): string => {
  if (goal === null && requirements.length === 0 && tasks.length === 0) {
    return "ワークフローが登録されていません。";
  }

  const lines: string[] = ["## ワークフロー", ""];

  // ゴール表示
  if (goal !== null) {
    lines.push(`**Goal**: ${goal}`, "");
  }

  // 要件定義表示
  if (requirements.length > 0) {
    lines.push("### 要件定義", "");
    for (let i = 0; i < requirements.length; i += 1) {
      const req = requirements[i];
      lines.push(`${i + 1}. **${req.actor}** が **${req.want}**`);
      lines.push(`   - Because: ${req.because}`);
      lines.push(`   - Acceptance: ${req.acceptance}`);
      if (req.constraints !== undefined && req.constraints.length > 0) {
        lines.push(`   - Constraints: ${req.constraints.join(", ")}`);
      }
    }
    lines.push("");
  }

  // タスクリスト
  if (tasks.length > 0) {
    // 進捗サマリー
    const completed = tasks.filter((t) => t.done).length;
    const total = tasks.length;
    lines.push(`### タスク（${completed}/${total} 完了）`, "");

    for (const task of tasks) {
      const checkbox = task.done ? "[x]" : "[ ]";
      const indexLabel = `[${task.index}]`;

      lines.push(`#### ${checkbox} ${indexLabel} ${task.what}`);
      lines.push("");
      lines.push(`- **Why**: ${task.why}`);
      lines.push(`- **Done when**: ${task.doneWhen}`);

      if (task.ref !== undefined) {
        lines.push(`- **Ref**: \`${task.ref}\``);
      }

      lines.push("");
    }
  }

  return lines.join("\n");
};

/**
 * 要件定義登録結果をフォーマット
 */
export const formatRequirementsResult = (
  goal: string,
  requirements: Requirement[],
): string => {
  const lines: string[] = [
    `**Goal**: ${goal}`,
    "",
    `${requirements.length}件の要件を登録しました。`,
    "",
    "### 要件定義",
    "",
  ];

  for (let i = 0; i < requirements.length; i += 1) {
    const req = requirements[i];
    lines.push(`${i + 1}. **${req.actor}** が **${req.want}**`);
    lines.push(`   - Because: ${req.because}`);
    lines.push(`   - Acceptance: ${req.acceptance}`);
    if (req.constraints !== undefined && req.constraints.length > 0) {
      lines.push(`   - Constraints: ${req.constraints.join(", ")}`);
    }
  }

  lines.push("");
  lines.push("次のステップ:");
  lines.push("1. `procedure_workflow(action: 'plan')` でタスクを計画");
  lines.push("2. `procedure_workflow(action: 'set', tasks: [...])` でタスクを登録");

  return lines.join("\n");
};

/**
 * タスク登録結果をフォーマット
 */
export const formatSetResult = (goal: string, tasks: TaskWithStatus[]): string => {
  const taskCount = tasks.length;
  const base = `**Goal**: ${goal}\n\n${taskCount}件のタスクを登録しました。`;
  return base + formatProgressAndNextTask(tasks);
};

/**
 * タスク完了結果をフォーマット
 */
export const formatDoneResult = (
  success: boolean,
  index: number,
  task: TaskWithStatus | undefined,
  remainingTasks: TaskWithStatus[],
): string => {
  if (!success) {
    return `エラー: インデックス ${index} のタスクが見つかりません。`;
  }

  const base = `✅ タスク [${index}] を完了しました: ${task?.what}`;
  return base + formatProgressAndNextTask(remainingTasks);
};

/**
 * クリア結果をフォーマット
 */
export const formatClearResult = (): string => "すべてのタスクをクリアしました。";
