/**
 * 汎用レビューハンドラー
 */

import * as path from "path";
import { z } from "zod";
import {
  ReviewScope,
  executeReview,
  ReviewResult,
} from "./qualitative-reviewer";
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
  /** レビュースコープ */
  scope: ReviewScope;
  /** ツール説明 */
  toolDescription: string;
  /** 入力スキーマ */
  inputSchema: {
    targetFilePaths: z.ZodArray<z.ZodString>;
  };
};

/**
 * レビューハンドラー入力
 */
export type ReviewHandlerInput = {
  targetFilePaths: string[];
  guardrailsRoot: string;
};

/**
 * 汎用レビューハンドラー
 */
export const createReviewHandler =
  (responsibility: ReviewResponsibility) =>
  async (args: ReviewHandlerInput): Promise<string> => {
    const { targetFilePaths, guardrailsRoot } = args;

    // バリデーション
    if (
      targetFilePaths === null ||
      targetFilePaths === undefined ||
      !Array.isArray(targetFilePaths) ||
      targetFilePaths.length === 0
    ) {
      throw new Error(
        "targetFilePathsは必須で、空でない配列である必要があります",
      );
    }

    // ポリシーディレクトリのパス構築
    const fullPolicyDir = path.join(guardrailsRoot, responsibility.policyDir);

    // レビュー実行（ファイル検証とガイダンス生成のみ）
    const reviewResult: ReviewResult = await executeReview({
      targetFilePaths,
      policyDir: fullPolicyDir,
      guardrailsRoot,
      reviewScope: responsibility.scope,
    });

    // 結果整形
    return formatQualitativeReviewResults(reviewResult, responsibility.title);
  };
