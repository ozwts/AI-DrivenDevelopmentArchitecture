/**
 * Workflow Planner（ワークフロープランナー）
 *
 * MCPサーバーからサブエージェント起動を誘導する軽量プランニングロジック。
 * 実際のタスク抽出は workflow-planner サブエージェントが実行します。
 */

import * as fs from "fs/promises";
import * as path from "path";

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
const buildGuidanceMessage = (availableRunbooks: string[]): string => {
  let guidance =
    "`workflow-planner` サブエージェントを起動し、ワークフロータスクを提案させてください。\n\n";

  guidance += "## サブエージェントの役割\n\n";
  guidance += "- runbooksを参照してタスクリストを**提案**する（登録はしない）\n";
  guidance += "- 各タスクに参照先runbookを紐づける\n";
  guidance += "- 提案を受けてメインセッションが登録を判断する\n\n";

  if (availableRunbooks.length > 0) {
    guidance += "## 利用可能なRunbooks\n\n";
    for (const runbook of availableRunbooks) {
      const relativePath = `procedure/workflow/runbooks/${runbook}.md`;
      guidance += `- \`${relativePath}\`\n`;
    }
    guidance += "\n";
  }

  guidance += "## タスク登録フォーマット（メインセッション用）\n\n";
  guidance += "```typescript\n";
  guidance += "procedure_workflow(action: 'set', tasks: [\n";
  guidance += "  {\n";
  guidance += '    what: "何をするか（具体的なアクション）",\n';
  guidance += '    why: "なぜするか（目的・理由）",\n';
  guidance += '    doneWhen: "完了条件",\n';
  guidance += '    ref: "procedure/workflow/runbooks/xxx.md"  // 相対パス\n';
  guidance += "  }\n";
  guidance += "])\n";
  guidance += "```\n";

  return guidance;
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

    // ガイダンスメッセージを生成
    const guidance = buildGuidanceMessage(availableRunbooks);

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
