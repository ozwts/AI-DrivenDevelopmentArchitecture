/**
 * 汎用レビューハンドラー
 */

import * as fs from "fs/promises";
import * as path from "path";
import { z } from "zod";
import { ReviewScope, executeReview, ReviewResult } from "./qualitative-reviewer";
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
  apiKey: string;
};

/**
 * 汎用レビューハンドラー
 */
export const createReviewHandler = (responsibility: ReviewResponsibility) =>
  async (args: ReviewHandlerInput): Promise<string> => {
    const { targetFilePaths, guardrailsRoot, apiKey } = args;

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

    if (
      apiKey === null ||
      apiKey === undefined ||
      typeof apiKey !== "string" ||
      apiKey === ""
    ) {
      throw new Error("ANTHROPIC_API_KEY環境変数が必要です");
    }

    // ポリシーディレクトリのバリデーション
    const fullPolicyDir = path.join(guardrailsRoot, responsibility.policyDir);
    try {
      const stats = await fs.stat(fullPolicyDir);
      if (!stats.isDirectory()) {
        throw new Error(`Policy path is not a directory: ${fullPolicyDir}`);
      }
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        throw new Error(`Policy directory not found: ${fullPolicyDir}`);
      }
      throw error;
    }

    // レビュー実行
    const reviewResult: ReviewResult = await executeReview({
      targetFilePaths,
      policyDir: fullPolicyDir,
      guardrailsRoot,
      apiKey,
      reviewScope: responsibility.scope,
    });

    // 結果整形
    return formatQualitativeReviewResults(reviewResult, responsibility.title);
  };
