/**
 * 定性的レビュー実装（Qualitative Review）
 *
 * MCPサーバーからサブエージェント起動を誘導する軽量レビュー準備ロジック。
 * 実際のレビューは guardrails-reviewer サブエージェントが実行します。
 *
 * 注: 静的解析（型チェック、Lint）は static-analysis-reviewer.ts を使用
 */

import * as fs from "fs/promises";

/**
 * レビュー入力パラメータ
 */
export type ReviewInput = {
  /** レビュー対象ディレクトリのパス一覧 */
  targetDirectories: string[];
  /** ポリシーディレクトリの絶対パス */
  policyDir: string;
  /** レビュー責務（例: "ドメインモデル (Domain Model)"） */
  responsibility: string;
};

/**
 * レビュー結果
 */
export type ReviewResult = {
  /** 全体レビューテキスト（ガイダンスメッセージ） */
  overallReview: string;
  /** レビュー対象ディレクトリ一覧 */
  targetDirectories: string[];
  /** レビュー成功フラグ */
  success: boolean;
  /** エラーメッセージ（失敗時） */
  error?: string;
};

/**
 * サブエージェント起動を促すガイダンスメッセージを生成
 */
const buildGuidanceMessage = (
  targetDirectories: string[],
  policyDir: string,
  responsibility: string,
): string => {
  let guidance =
    "以下の情報を使って `guardrails-reviewer` サブエージェントを起動し、ポリシーレビューを実行してください。\n\n";

  guidance += "**対象ディレクトリ:**\n";
  for (const directory of targetDirectories) {
    guidance += `- ${directory}\n`;
  }
  guidance += "\n";

  guidance += `**ポリシーディレクトリ:** ${policyDir}\n\n`;
  guidance += `**レビュー責務:** ${responsibility}\n`;

  return guidance;
};

/**
 * レビュー準備を実行し、サブエージェント起動を促すガイダンスを返す
 *
 * 外部AIは呼び出さず、ディレクトリ検証とポリシーマッピングのみ実行します。
 * 実際のレビューは guardrails-reviewer サブエージェントが実行します。
 */
export const executeReview = async (
  input: ReviewInput,
): Promise<ReviewResult> => {
  const { targetDirectories, policyDir, responsibility } = input;

  try {
    // 1. 対象ディレクトリの存在確認
    const directoryValidationResults = await Promise.all(
      targetDirectories.map(async (directory) => {
        try {
          const stats = await fs.stat(directory);
          return {
            directory,
            exists: stats.isDirectory(),
            error: null,
          };
        } catch (error) {
          return {
            directory,
            exists: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }),
    );

    // 存在しないディレクトリがあればエラー
    const missingDirectories = directoryValidationResults.filter(
      (result) => !result.exists,
    );
    if (missingDirectories.length > 0) {
      const errorMessage = missingDirectories
        .map(
          (dir) => `- ${dir.directory}: ${dir.error ?? "Directory not found"}`,
        )
        .join("\n");
      throw new Error(`以下のディレクトリが見つかりません:\n${errorMessage}`);
    }

    // 2. ポリシーディレクトリの存在確認
    try {
      const stats = await fs.stat(policyDir);
      if (!stats.isDirectory()) {
        throw new Error(`Policy path is not a directory: ${policyDir}`);
      }
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        throw new Error(`Policy directory not found: ${policyDir}`);
      }
      throw error;
    }

    // 3. サブエージェント起動を促すガイダンスメッセージを生成
    const guidance = buildGuidanceMessage(
      targetDirectories,
      policyDir,
      responsibility,
    );

    // 4. 結果を構造化
    return {
      overallReview: guidance,
      targetDirectories,
      success: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      overallReview: "",
      targetDirectories,
      success: false,
      error: errorMessage,
    };
  }
};
