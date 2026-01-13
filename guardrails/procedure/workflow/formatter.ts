/**
 * Workflow Formatter（ワークフローフォーマッター）
 *
 * ワークフロータスクの出力整形
 */

import type {
  TaskWithStatus,
  Requirement,
  Notes,
  PhaseState,
  PRInfo,
  Phase,
} from "./memory";
import { getPhaseDefinition } from "./phases";

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
 * 次のタスク詳細を表示するヘルパー（簡潔版）
 */
const formatNextTaskCompact = (tasks: TaskWithStatus[]): string => {
  const pendingTasks = tasks.filter((t) => !t.done);
  const completed = tasks.filter((t) => t.done).length;
  const total = tasks.length;

  if (pendingTasks.length === 0) {
    return `(${completed}/${total}) 🎉 フェーズ完了`;
  }

  const nextTask = pendingTasks[0];
  const lines: string[] = [
    `(${completed}/${total})`,
    "",
    `▶ **[${nextTask.index}] ${nextTask.what}**`,
  ];

  if (nextTask.refs !== undefined && nextTask.refs.length > 0) {
    lines.push(`  Refs: ${nextTask.refs.map((r) => `\`${r}\``).join(", ")}`);
  }

  lines.push(`  Done: \`procedure_workflow(action: 'done', index: ${nextTask.index})\``);

  return lines.join("\n");
};

/**
 * 次のタスク詳細を表示するヘルパー（フル版 - list用）
 */
const formatNextTaskDetail = (tasks: TaskWithStatus[]): string => {
  const pendingTasks = tasks.filter((t) => !t.done);
  if (pendingTasks.length === 0) {
    return [
      "",
      "",
      "🎉 **現在フェーズの全タスク完了！**",
      "",
      "次のステップ: `procedure_workflow(action: 'advance')` でフェーズを進める",
    ].join("\n");
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

  if (nextTask.refs !== undefined && nextTask.refs.length > 0) {
    lines.push(`- **Refs**: ${nextTask.refs.map((r) => `\`${r}\``).join(", ")}`);
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
  notes: Notes,
  phaseState: PhaseState,
  pr: PRInfo | null,
): string => {
  if (goal === null && requirements.length === 0 && tasks.length === 0) {
    return "ワークフローが登録されていません。";
  }

  const lines: string[] = ["## ワークフロー", ""];

  // フェーズ状態表示
  if (phaseState.current !== null) {
    const currentPhaseDef = getPhaseDefinition(phaseState.current);
    lines.push("### フェーズ進捗", "");
    lines.push(`**スコープ**: ${phaseState.scope}`);
    lines.push(`**現在のフェーズ**: ${currentPhaseDef?.name ?? phaseState.current}`);
    if (phaseState.completed.length > 0) {
      const completedNames = phaseState.completed.map(
        (p) => getPhaseDefinition(p)?.name ?? p,
      );
      lines.push(`**完了フェーズ**: ${completedNames.join(" → ")}`);
    }
    lines.push("");
  }

  // PR情報表示
  if (pr !== null) {
    lines.push(`**PR**: [#${pr.number}](${pr.url})`, "");
  }

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

      if (task.refs !== undefined && task.refs.length > 0) {
        lines.push(`- **Refs**: ${task.refs.map((r) => `\`${r}\``).join(", ")}`);
      }

      lines.push("");
    }
  }

  // 特記事項
  const hasNotes =
    notes.designDecisions.length > 0 ||
    notes.remainingWork.length > 0 ||
    notes.breakingChanges.length > 0;

  if (hasNotes) {
    lines.push("### 特記事項", "");

    if (notes.designDecisions.length > 0) {
      lines.push("#### 設計判断", "");
      for (const decision of notes.designDecisions) {
        lines.push(`- ${decision}`);
      }
      lines.push("");
    }

    if (notes.remainingWork.length > 0) {
      lines.push("#### 後続作業・残件", "");
      for (const work of notes.remainingWork) {
        lines.push(`- ${work}`);
      }
      lines.push("");
    }

    if (notes.breakingChanges.length > 0) {
      lines.push("#### 破壊的変更", "");
      for (const change of notes.breakingChanges) {
        lines.push(`- ${change}`);
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
  scope: string,
): string => {
  const lines: string[] = [
    `**Goal**: ${goal}`,
    `**Scope**: ${scope}`,
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
 * タスク登録結果をフォーマット（簡潔版）
 */
export const formatSetResult = (goal: string, tasks: TaskWithStatus[]): string => {
  const taskCount = tasks.length;
  const lines: string[] = [
    `**Goal**: ${goal}`,
    "",
    `${taskCount}件のタスクを登録しました。`,
    "",
    formatNextTaskCompact(tasks),
    "",
    "_全タスク: `procedure_workflow(action: 'list')`_",
  ];
  return lines.join("\n");
};

/**
 * タスク完了結果をフォーマット（簡潔版）
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

  const lines: string[] = [
    `✅ [${index}] ${task?.what}`,
    "",
    formatNextTaskCompact(remainingTasks),
  ];

  // 全タスク表示への誘導
  lines.push("");
  lines.push("_全タスク: `procedure_workflow(action: 'list')`_");

  return lines.join("\n");
};

/**
 * クリア結果をフォーマット
 */
export const formatClearResult = (): string => "すべてのタスクをクリアしました。";

/**
 * フェーズ遷移結果をフォーマット（簡潔版）
 */
export const formatAdvanceResult = (
  previousPhase: Phase,
  nextPhase: Phase,
  runbook?: string,
): string => {
  const prevPhaseDef = getPhaseDefinition(previousPhase);
  const nextPhaseDef = getPhaseDefinition(nextPhase);

  const lines: string[] = [
    `✅ **${prevPhaseDef?.name ?? previousPhase}** → **${nextPhaseDef?.name ?? nextPhase}**`,
  ];

  if (runbook !== undefined) {
    lines.push(`  Runbook: \`${runbook}\``);
  }

  return lines.join("\n");
};

/**
 * フェーズ遷移ブロック結果をフォーマット（未完了タスクがある場合）
 */
export const formatAdvanceBlockedResult = (
  currentPhase: Phase,
  pendingTasks: TaskWithStatus[],
): string => {
  const phaseDef = getPhaseDefinition(currentPhase);

  const lines: string[] = [
    `⚠️ **${phaseDef?.name ?? currentPhase}** フェーズには未完了のタスクがあります。`,
    "",
    "### 未完了タスク",
    "",
  ];

  for (const task of pendingTasks) {
    lines.push(`- [${task.index}] ${task.what}`);
  }

  lines.push("");
  lines.push("すべてのタスクを完了してから `procedure_workflow(action: 'advance')` を実行してください。");

  return lines.join("\n");
};

/**
 * ワークフロー完了結果をフォーマット
 */
export const formatWorkflowCompleteResult = (completedPhases: Phase[]): string => {
  const lines: string[] = [
    "🎉 **全フェーズが完了しました！**",
    "",
    "### 完了したフェーズ",
    "",
  ];

  for (const phase of completedPhases) {
    const phaseDef = getPhaseDefinition(phase);
    lines.push(`- ✅ ${phaseDef?.name ?? phase}`);
  }

  lines.push("");
  lines.push("新しいワークフローを開始するには:");
  lines.push("1. `procedure_workflow(action: 'clear')` で現在のワークフローをクリア");
  lines.push("2. `procedure_workflow(action: 'requirements', ...)` で新しい要件を登録");

  return lines.join("\n");
};

