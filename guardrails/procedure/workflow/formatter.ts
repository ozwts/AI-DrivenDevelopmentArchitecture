/**
 * Workflow Formatter（ワークフローフォーマッター）
 *
 * ワークフロータスクの出力整形
 */

import type { TaskWithStatus } from "./memory";

/**
 * タスクリストをチェックリスト形式でフォーマット
 */
export const formatTaskList = (
  goal: string | null,
  tasks: TaskWithStatus[],
  runbooksDir?: string,
): string => {
  if (tasks.length === 0) {
    return "タスクが登録されていません。";
  }

  const lines: string[] = ["## ワークフロータスク", ""];

  // ゴール表示
  if (goal !== null) {
    lines.push(`**Goal**: ${goal}`, "");
  }

  // 進捗サマリー
  const completed = tasks.filter((t) => t.done).length;
  const total = tasks.length;
  lines.push(`**進捗: ${completed}/${total} 完了**`, "");

  // タスクリスト
  for (const task of tasks) {
    const checkbox = task.done ? "[x]" : "[ ]";
    const indexLabel = `[${task.index}]`;

    lines.push(`### ${checkbox} ${indexLabel} ${task.what}`);
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
