/**
 * Workflow Planner（ワークフロープランナー）
 *
 * フェーズ単位でのタスク計画を支援
 * サブエージェント起動を誘導するガイダンスを生成
 */

import * as fs from "fs/promises";
import * as path from "path";
import { getWorkflowMemory, type Requirement, type Phase } from "./memory";
import { getPhaseDefinition, PHASES } from "./phases";
import {
  collectContext,
  formatContextForGuidance,
  type WorkflowContext,
} from "./context-collector";

/**
 * プランナー結果
 */
export type PlannerResult = {
  /** ガイダンスメッセージ */
  guidance: string;
  /** runbooksディレクトリパス */
  runbooksDir: string;
  /** 利用可能なrunbook一覧 */
  availableRunbooks: string[];
  /** 対象フェーズ */
  targetPhase: Phase | null;
  /** 成功フラグ */
  success: boolean;
  /** エラーメッセージ（失敗時） */
  error?: string;
};

/**
 * runbooksディレクトリから利用可能なrunbookを取得
 */
const scanRunbooks = async (runbooksDir: string): Promise<string[]> => {
  try {
    const files = await fs.readdir(runbooksDir);
    return files
      .filter((file) => file.endsWith(".md"))
      .map((file) => file.replace(".md", ""));
  } catch {
    return [];
  }
};

/**
 * フェーズ別ガイダンスメッセージを生成
 */
const buildPhaseGuidanceMessage = (
  targetPhase: Phase,
  goal: string,
  requirements: Requirement[],
  context: WorkflowContext,
): string => {
  const lines: string[] = [];
  const phaseDef = getPhaseDefinition(targetPhase);

  // ヘッダーと即時アクション
  lines.push(`# ${phaseDef?.name ?? targetPhase} フェーズの計画`);
  lines.push("");
  lines.push("## ▶ 次のアクション");
  lines.push("");
  lines.push(
    "**`workflow-planner` サブエージェントを起動**し、以下のコンテキストを渡してタスクを提案させてください。",
  );
  lines.push("");
  lines.push("---");
  lines.push("");

  // ゴールと要件
  lines.push(`**Goal**: ${goal}`);
  lines.push("");

  lines.push("## 要件定義");
  lines.push("");
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

  // コンテキスト（前のフェーズからの引き継ぎ）
  const contextStr = formatContextForGuidance(context);
  if (contextStr.length > 0) {
    lines.push("## 前フェーズからのコンテキスト");
    lines.push("");
    lines.push(contextStr);
  }

  // フェーズ固有の指示
  lines.push("## フェーズ固有の指示");
  lines.push("");
  if (phaseDef !== undefined) {
    lines.push(`**参照Runbook**: \`${phaseDef.runbook}\``);
    lines.push("");
    if (phaseDef.devMode !== undefined) {
      lines.push(`**開発モード**: \`${phaseDef.devMode}\``);
      lines.push("");
    }
  }

  // サブエージェントへの指示
  lines.push("## サブエージェントへの指示");
  lines.push("");
  lines.push(`- **${phaseDef?.name ?? targetPhase}フェーズのタスクのみ**を提案`);
  lines.push("- 上記のコンテキスト（コミット履歴、PRコメント、完了タスク）を考慮");
  lines.push("- runbookの各ステップを具体化（1成果物=1タスク）");
  lines.push("- 各タスクに`phase`フィールドを設定");
  lines.push("");

  // タスクフォーマット
  lines.push("## タスク登録フォーマット");
  lines.push("");
  lines.push("```typescript");
  lines.push("procedure_workflow(action: 'set', tasks: [");
  lines.push("  // 既存の完了済みタスク（必要な場合）");
  lines.push("  { what: '完了済みタスク', ..., done: true },");
  lines.push("  // 新規タスク");
  lines.push("  {");
  lines.push('    what: "何をするか",');
  lines.push('    why: "なぜするか",');
  lines.push('    doneWhen: "完了条件",');
  lines.push(`    refs: ["${phaseDef?.runbook ?? "procedure/workflow/runbooks/xxx.md"}"],`);
  lines.push(`    phase: "${targetPhase}"`);
  lines.push("  }");
  lines.push("])");
  lines.push("```");
  lines.push("");

  // フェーズ完了後の流れ
  lines.push("## フェーズ完了後");
  lines.push("");
  lines.push("1. 全タスク完了後: `procedure_workflow(action='advance')`");
  lines.push("2. 次フェーズの計画: `procedure_workflow(action='plan')`");

  return lines.join("\n");
};

/**
 * 要件未設定時のガイダンスメッセージを生成
 */
const buildRequirementsRequiredMessage = (): string => {
  const lines: string[] = [];

  lines.push("⚠️ **要件定義が未設定です**");
  lines.push("");
  lines.push(
    "`plan` の前に `requirements` アクションで要件とスコープを登録してください。",
  );
  lines.push("");
  lines.push("```typescript");
  lines.push("procedure_workflow(action: 'requirements',");
  lines.push('  goal: "全体のゴール",');
  lines.push("  scope: 'full',  // 'policy' | 'frontend' | 'server-domain' | 'full'");
  lines.push("  requirements: [");
  lines.push("    {");
  lines.push('      actor: "誰が",');
  lines.push('      want: "何をしたい",');
  lines.push('      because: "なぜ（課題）",');
  lines.push('      acceptance: "成功基準"');
  lines.push("    }");
  lines.push("  ]");
  lines.push(")");
  lines.push("```");
  lines.push("");
  lines.push("## スコープの選択肢");
  lines.push("");
  lines.push("| スコープ | 含まれるフェーズ |");
  lines.push("|----------|-----------------|");
  lines.push("| `policy` | Contract → Policy |");
  lines.push("| `frontend` | + Frontend |");
  lines.push("| `server-domain` | + Server/Domain |");
  lines.push("| `full` | + Server/Implement → Infra → E2E |");

  return lines.join("\n");
};

/**
 * 全フェーズ完了時のメッセージを生成
 */
const buildAllPhasesCompleteMessage = (completedPhases: Phase[]): string => {
  const lines: string[] = [];

  lines.push("🎉 **全フェーズが完了しています**");
  lines.push("");
  lines.push("完了したフェーズ:");
  for (const phase of completedPhases) {
    const phaseDef = getPhaseDefinition(phase);
    lines.push(`- ✅ ${phaseDef?.name ?? phase}`);
  }
  lines.push("");
  lines.push("新しいワークフローを開始するには、`clear` してから `requirements` を登録してください。");

  return lines.join("\n");
};

/**
 * プランニング準備を実行し、フェーズ別ガイダンスを返す
 */
export const executePlan = async (
  guardrailsRoot: string,
  targetPhaseOverride?: Phase,
): Promise<PlannerResult> => {
  try {
    const runbooksDir = path.join(
      guardrailsRoot,
      "procedure",
      "workflow",
      "runbooks",
    );

    // runbooksディレクトリの存在確認
    try {
      const stats = await fs.stat(runbooksDir);
      if (!stats.isDirectory()) {
        throw new Error(`Runbooks path is not a directory: ${runbooksDir}`);
      }
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        (error as NodeJS.ErrnoException).code === "ENOENT"
      ) {
        await fs.mkdir(runbooksDir, { recursive: true });
      } else {
        throw error;
      }
    }

    // 利用可能なrunbookをスキャン
    const availableRunbooks = await scanRunbooks(runbooksDir);

    // 現在の状態を取得
    const memory = getWorkflowMemory();
    const goal = memory.getGoal();
    const requirements = memory.getRequirements();
    const currentPhase = memory.getCurrentPhase();

    // 要件が未設定の場合
    if (goal === null || requirements.length === 0) {
      return {
        guidance: buildRequirementsRequiredMessage(),
        runbooksDir,
        availableRunbooks,
        targetPhase: null,
        success: true,
      };
    }

    // 対象フェーズを決定
    const targetPhase =
      targetPhaseOverride ?? currentPhase ?? memory.getNextPhase();

    // 全フェーズ完了の場合
    if (targetPhase === null) {
      return {
        guidance: buildAllPhasesCompleteMessage(memory.getCompletedPhases()),
        runbooksDir,
        availableRunbooks,
        targetPhase: null,
        success: true,
      };
    }

    // コンテキストを収集
    const context = await collectContext(guardrailsRoot);

    // フェーズ別ガイダンスを生成
    const guidance = buildPhaseGuidanceMessage(
      targetPhase,
      goal,
      requirements,
      context,
    );

    return {
      guidance,
      runbooksDir,
      availableRunbooks,
      targetPhase,
      success: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      guidance: "",
      runbooksDir: "",
      availableRunbooks: [],
      targetPhase: null,
      success: false,
      error: errorMessage,
    };
  }
};

// 利用可能なフェーズ一覧をエクスポート（参照用）
export { PHASES };
