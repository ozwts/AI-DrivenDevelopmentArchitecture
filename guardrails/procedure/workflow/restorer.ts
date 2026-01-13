/**
 * Workflow Restorer（ワークフロー復元）
 *
 * PRボディからワークフロー状態を復元するためのガイダンスを生成
 * サブエージェント起動を誘導するガイダンスを生成
 */

import { getPRBody, getPRForCurrentBranch } from "./context-collector";

/**
 * 復元結果
 */
export type RestorerResult = {
  /** ガイダンスメッセージ */
  guidance: string;
  /** PRボディ */
  prBody: string | null;
  /** PR番号 */
  prNumber: number | null;
  /** 成功フラグ */
  success: boolean;
  /** エラーメッセージ（失敗時） */
  error?: string;
};

/**
 * PRが見つからない場合のメッセージを生成
 */
const buildNoPRMessage = (): string => {
  const lines: string[] = [];

  lines.push("⚠️ **PRが見つかりません**");
  lines.push("");
  lines.push("現在のブランチにPRが存在しないか、指定されたPR番号が無効です。");
  lines.push("");
  lines.push("以下を確認してください:");
  lines.push("- 現在のブランチでPRを作成済みか");
  lines.push("- `prNumber` パラメータで正しいPR番号を指定しているか");
  lines.push("");
  lines.push("```bash");
  lines.push("# 現在のブランチのPRを確認");
  lines.push("gh pr view");
  lines.push("```");

  return lines.join("\n");
};

/**
 * PRボディが空の場合のメッセージを生成
 */
const buildEmptyPRBodyMessage = (prNumber: number): string => {
  const lines: string[] = [];

  lines.push("⚠️ **PRボディが空です**");
  lines.push("");
  lines.push(`PR #${prNumber} のボディが空か、読み取れませんでした。`);
  lines.push("");
  lines.push("PRテンプレートに従ってPRボディを記載してください。");

  return lines.join("\n");
};

/**
 * 復元用のガイダンスメッセージを生成
 */
const buildRestoreGuidanceMessage = (
  prNumber: number,
  prBody: string,
): string => {
  const lines: string[] = [];

  // ヘッダーと即時アクション
  lines.push("# PRからのワークフロー復元");
  lines.push("");
  lines.push("## ▶ 次のアクション");
  lines.push("");
  lines.push(
    "**`workflow-restorer` サブエージェントを起動**し、以下のPRボディを渡してワークフロー状態を復元させてください。",
  );
  lines.push("");
  lines.push("---");
  lines.push("");

  // PR情報
  lines.push(`**PR番号**: #${prNumber}`);
  lines.push("");

  // PRボディ
  lines.push("## PRボディ");
  lines.push("");
  lines.push("```markdown");
  lines.push(prBody);
  lines.push("```");
  lines.push("");

  // サブエージェントへの指示
  lines.push("## サブエージェントへの指示");
  lines.push("");
  lines.push("1. 上記PRボディを解析し、Goal・要件・タスクを抽出");
  lines.push("2. `procedure_workflow(action='requirements')` で要件を復元");
  lines.push("3. `procedure_workflow(action='set')` でタスクを復元");
  lines.push("4. 復元結果を報告");
  lines.push("");

  // 注意事項
  lines.push("## 注意事項");
  lines.push("");
  lines.push("- タスクの完了状態（`[x]` / `[ ]`）を正確に復元すること");
  lines.push("- フェーズの識別（Contract / Policy / Frontend 等）を正確に行うこと");
  lines.push("- スコープはタスクに含まれるフェーズから推測すること");

  return lines.join("\n");
};

/**
 * 復元準備を実行し、ガイダンスを返す
 */
export const executeRestore = async (
  prNumberOverride?: number,
): Promise<RestorerResult> => {
  try {
    // PR情報を取得
    let prNumber: number | null = prNumberOverride ?? null;

    if (prNumber === null) {
      const pr = getPRForCurrentBranch();
      if (pr === null) {
        return {
          guidance: buildNoPRMessage(),
          prBody: null,
          prNumber: null,
          success: false,
          error: "No PR found for current branch",
        };
      }
      prNumber = pr.number;
    }

    // PRボディを取得
    const prBody = getPRBody(prNumber);

    if (prBody === null || prBody.trim() === "") {
      return {
        guidance: buildEmptyPRBodyMessage(prNumber),
        prBody: null,
        prNumber,
        success: false,
        error: "PR body is empty or could not be read",
      };
    }

    // ガイダンスを生成
    const guidance = buildRestoreGuidanceMessage(prNumber, prBody);

    return {
      guidance,
      prBody,
      prNumber,
      success: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      guidance: "",
      prBody: null,
      prNumber: null,
      success: false,
      error: errorMessage,
    };
  }
};
