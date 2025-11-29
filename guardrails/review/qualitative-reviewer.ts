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
 * レビュー対象の責務（Review Scope）定義
 */
export type ReviewScope = {
  /** レビュー責務（例: "ドメインモデル (Domain Model)"） */
  responsibility: string;
  /** 対象（例: "Entity, Value Object, Aggregate"） */
  targets: string;
};

/**
 * レビュー入力パラメータ
 */
export type ReviewInput = {
  /** レビュー対象ファイルのパス一覧 */
  targetFilePaths: string[];
  /** ポリシーディレクトリの絶対パス */
  policyDir: string;
  /** guardrailsディレクトリのルートパス（現在未使用だが将来の拡張のため保持） */
  guardrailsRoot: string;
  /** レビュー責務定義 */
  reviewScope: ReviewScope;
};

/**
 * ファイルごとのレビュー結果
 */
export type FileReviewResult = {
  filePath: string;
  review: string;
  success: boolean;
  error?: string;
};

/**
 * レビュー結果
 */
export type ReviewResult = {
  /** 全体レビューテキスト（複数ファイルの場合はファイルごとに区切られたテキスト） */
  overallReview: string;
  /** レビュー対象ファイル一覧 */
  targetFiles: string[];
  /** レビュー成功フラグ */
  success: boolean;
  /** エラーメッセージ（失敗時） */
  error?: string;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
};

/**
 * サブエージェント起動を促すガイダンスメッセージを生成
 */
const buildGuidanceMessage = (
  targetFilePaths: string[],
  policyDir: string,
  reviewScope: ReviewScope,
): string => {
  let guidance =
    "以下の情報を使って `guardrails-reviewer` サブエージェントを起動し、ポリシーレビューを実行してください。\n\n";

  guidance += "**対象ファイル:**\n";
  for (const filePath of targetFilePaths) {
    guidance += `- ${filePath}\n`;
  }
  guidance += "\n";

  guidance += `**ポリシーディレクトリ:** ${policyDir}\n\n`;

  guidance += `**レビュー責務:** ${reviewScope.responsibility}\n`;
  guidance += `**対象:** ${reviewScope.targets}\n`;

  return guidance;
};

/**
 * レビュー準備を実行し、サブエージェント起動を促すガイダンスを返す
 *
 * 外部AIは呼び出さず、ファイル検証とポリシーマッピングのみ実行します。
 * 実際のレビューは guardrails-reviewer サブエージェントが実行します。
 */
export const executeReview = async (
  input: ReviewInput,
): Promise<ReviewResult> => {
  const { targetFilePaths, policyDir, reviewScope } = input;

  try {
    // 1. 対象ファイルの存在確認
    const fileValidationResults = await Promise.all(
      targetFilePaths.map(async (filePath) => {
        try {
          const stats = await fs.stat(filePath);
          return {
            filePath,
            exists: stats.isFile(),
            error: null,
          };
        } catch (error) {
          return {
            filePath,
            exists: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }),
    );

    // 存在しないファイルがあればエラー
    const missingFiles = fileValidationResults.filter(
      (result) => !result.exists,
    );
    if (missingFiles.length > 0) {
      const errorMessage = missingFiles
        .map((file) => `- ${file.filePath}: ${file.error ?? "File not found"}`)
        .join("\n");
      throw new Error(`以下のファイルが見つかりません:\n${errorMessage}`);
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
      targetFilePaths,
      policyDir,
      reviewScope,
    );

    // 4. 結果を構造化
    return {
      overallReview: guidance,
      targetFiles: targetFilePaths,
      success: true,
      summary: {
        total: targetFilePaths.length,
        successful: targetFilePaths.length,
        failed: 0,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      overallReview: "",
      targetFiles: targetFilePaths,
      success: false,
      error: errorMessage,
      summary: {
        total: targetFilePaths.length,
        successful: 0,
        failed: targetFilePaths.length,
      },
    };
  }
};
