/**
 * Workflow Planner（ワークフロープランナー）
 *
 * MCPサーバーからサブエージェント起動を誘導する軽量プランニングロジック。
 * 実際のタスク抽出は workflow-planner サブエージェントが実行します。
 */

import * as fs from "fs/promises";
import * as path from "path";
import { getWorkflowMemory, type Requirement } from "./memory";

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
 * サブエージェント起動を促すガイダンスメッセージを生成
 */
const buildGuidanceMessage = (
  availableRunbooks: string[],
  goal: string | null,
  requirements: Requirement[],
): string => {
  const lines: string[] = [];

  // 要件が未設定の場合は警告
  if (goal === null || requirements.length === 0) {
    lines.push("⚠️ **要件定義が未設定です**\n");
    lines.push(
      "`plan` の前に `requirements` アクションで要件を登録してください。\n",
    );
    lines.push("```typescript");
    lines.push("procedure_workflow(action: 'requirements',");
    lines.push('  goal: "全体のゴール",');
    lines.push("  requirements: [");
    lines.push("    {");
    lines.push('      actor: "誰が",');
    lines.push('      want: "何をしたい",');
    lines.push('      because: "なぜ（課題）",');
    lines.push('      acceptance: "成功基準"');
    lines.push("    }");
    lines.push("  ]");
    lines.push(")");
    lines.push("```\n");
    return lines.join("\n");
  }

  // 現在の要件を表示
  lines.push("## 現在の要件定義\n");
  lines.push(`**Goal**: ${goal}\n`);
  lines.push("### Requirements\n");
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

  lines.push(
    "`workflow-planner` サブエージェントを起動し、上記の要件に基づいてタスクを提案させてください。\n",
  );

  lines.push("## サブエージェントの役割\n");
  lines.push("- 要件をタスクにブレークダウンする");
  lines.push("- runbooksを参照してタスクリストを**提案**する（登録はしない）");
  lines.push(
    "- **ステップを具体化**（各ステップで何を作るかを明示、1成果物=1タスク）",
  );
  lines.push("- 各タスクに参照先runbookを紐づける");
  lines.push("- 提案を受けてメインセッションが登録を判断する\n");

  lines.push("## フェーズ順序\n");
  lines.push(
    "タスクの順番は `procedure/workflow/runbooks/10-development-overview.md` の考えを遵守すること。\n",
  );

  if (availableRunbooks.length > 0) {
    lines.push("## 利用可能なRunbooks\n");
    for (const runbook of availableRunbooks) {
      const relativePath = `procedure/workflow/runbooks/${runbook}.md`;
      lines.push(`- \`${relativePath}\``);
    }
    lines.push("");
  }

  lines.push("## タスク登録フォーマット（メインセッション用）\n");
  lines.push("```typescript");
  lines.push("procedure_workflow(action: 'set',");
  lines.push("  tasks: [");
  lines.push("    {");
  lines.push('      what: "何をするか（具体的なアクション）",');
  lines.push('      why: "なぜするか（目的・理由）",');
  lines.push('      doneWhen: "完了条件",');
  lines.push('      ref: "procedure/workflow/runbooks/50-server.md"  // runbook相対パス');
  lines.push("    }");
  lines.push("  ]");
  lines.push(")");
  lines.push("```");

  return lines.join("\n");
};

/**
 * プランニング準備を実行し、サブエージェント起動を促すガイダンスを返す
 */
export const executePlan = async (
  guardrailsRoot: string,
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
        // ディレクトリがなければ作成
        await fs.mkdir(runbooksDir, { recursive: true });
      } else {
        throw error;
      }
    }

    // 利用可能なrunbookをスキャン
    const availableRunbooks = await scanRunbooks(runbooksDir);

    // 現在の要件を取得
    const memory = getWorkflowMemory();
    const goal = memory.getGoal();
    const requirements = memory.getRequirements();

    // ガイダンスメッセージを生成
    const guidance = buildGuidanceMessage(
      availableRunbooks,
      goal,
      requirements,
    );

    return {
      guidance,
      runbooksDir,
      availableRunbooks,
      success: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      guidance: "",
      runbooksDir: "",
      availableRunbooks: [],
      success: false,
      error: errorMessage,
    };
  }
};
