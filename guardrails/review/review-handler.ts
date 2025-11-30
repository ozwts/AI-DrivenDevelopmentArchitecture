/**
 * 汎用レビューハンドラー
 */

import * as path from "path";
import { z } from "zod";
import { executeReview, ReviewResult } from "./qualitative-reviewer";
import { formatQualitativeReviewResults } from "./formatter";

/**
 * レビュー責務定義
 */
export type ReviewResponsibility = {
  /** 責務ID（ツール名に使用） */
  id: string;
  /** レビュータイトル */
  title: string;
  /** ポリシーディレクトリ（guardrailsRoot からの相対パス） */
  policyDir: string;
  /** レビュー責務（例: "ドメインモデル (Domain Model)"） */
  responsibility: string;
  /** ツール説明 */
  toolDescription: string;
  /** 入力スキーマ */
  inputSchema: {
    targetDirectories: z.ZodArray<z.ZodString>;
  };
};

/**
 * レビューハンドラー入力
 */
export type ReviewHandlerInput = {
  targetDirectories: string[];
  guardrailsRoot: string;
};

/**
 * 汎用レビューハンドラー
 */
export const createReviewHandler =
  (responsibility: ReviewResponsibility) =>
  async (args: ReviewHandlerInput): Promise<string> => {
    const { targetDirectories, guardrailsRoot } = args;

    // バリデーション
    if (
      !targetDirectories ||
      !Array.isArray(targetDirectories) ||
      targetDirectories.length === 0
    ) {
      throw new Error(
        "targetDirectoriesは必須で、空でない配列である必要があります",
      );
    }

    // ポリシーディレクトリのパス構築
    const fullPolicyDir = path.join(guardrailsRoot, responsibility.policyDir);

    // レビュー実行（ガイダンス生成のみ）
    const reviewResult: ReviewResult = await executeReview({
      targetDirectories,
      policyDir: fullPolicyDir,
      responsibility: responsibility.responsibility,
    });

    // 結果整形
    return formatQualitativeReviewResults(reviewResult, responsibility.title);
  };
