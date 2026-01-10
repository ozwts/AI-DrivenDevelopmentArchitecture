/**
 * Workflow Formatter（ワークフローフォーマッター）
 *
 * ワークフロータスクの出力整形
 */

import type { TaskWithStatus, Requirement } from "./memory";

/**
 * タスクリストをチェックリスト形式でフォーマット
 */
export const formatTaskList = (
  goal: string | null,
  requirements: Requirement[],
  tasks: TaskWithStatus[],
  runbooksDir?: string,
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
    for (let i = 0; i < requirements.length; i++) {
      const req = requirements[i];
      lines.push(`${i + 1}. **${req.what}**`);
      lines.push(`   - Why: ${req.why}`);
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
        const refPath =
          runbooksDir !== undefined
            ? `${runbooksDir}/${task.ref}.md`
            : `runbooks/${task.ref}.md`;
        lines.push(`- **Ref**: \`${refPath}\``);
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

  for (let i = 0; i < requirements.length; i++) {
    const req = requirements[i];
    lines.push(`${i + 1}. **${req.what}**`);
    lines.push(`   - Why: ${req.why}`);
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
export const formatSetResult = (goal: string, taskCount: number): string =>
  `**Goal**: ${goal}\n\n${taskCount}件のタスクを登録しました。\n\n\`procedure_workflow(action: 'list')\` で確認できます。`;

/**
 * タスク完了結果をフォーマット
 */
export const formatDoneResult = (
  success: boolean,
  index: number,
  task?: TaskWithStatus,
): string => {
  if (!success) {
    return `エラー: インデックス ${index} のタスクが見つかりません。`;
  }

  return `タスク [${index}] を完了しました: ${task?.what}`;
};

/**
 * クリア結果をフォーマット
 */
export const formatClearResult = (): string => "すべてのタスクをクリアしました。";
