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
  /** 依存ポリシーID一覧（オプション） */
  dependencies?: string[];
};

/**
 * レビューハンドラー入力
 */
export type ReviewHandlerInput = {
  targetDirectories: string[];
  guardrailsRoot: string;
};

/**
 * 依存ポリシーIDからポリシーディレクトリの絶対パスを解決する
 *
 * @param dependencyId 依存ポリシーID（例: "port", "domain-model"）
 * @param currentPolicyDir 現在のポリシーディレクトリの絶対パス
 * @returns 依存ポリシーディレクトリの絶対パス
 */
const resolveDependencyPath = (
  dependencyId: string,
  currentPolicyDir: string,
): string => {
  // 現在のポリシーディレクトリの親ディレクトリ（例: policy/server/）
  const parentDir = path.dirname(currentPolicyDir);
  // 依存ポリシーディレクトリ（例: policy/server/port/）
  return path.join(parentDir, dependencyId);
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
      targetDirectories === null ||
      targetDirectories === undefined ||
      !Array.isArray(targetDirectories) ||
      targetDirectories.length === 0
    ) {
      throw new Error(
        "targetDirectoriesは必須で、空でない配列である必要があります",
      );
    }

    // ポリシーディレクトリのパス構築
    const fullPolicyDir = path.join(guardrailsRoot, responsibility.policyDir);

    // 依存ポリシーディレクトリのパス解決
    const dependencyPolicyDirs = responsibility.dependencies?.map((depId) =>
      resolveDependencyPath(depId, fullPolicyDir),
    );

    // レビュー実行（ガイダンス生成のみ）
    const reviewResult: ReviewResult = await executeReview({
      targetDirectories,
      policyDir: fullPolicyDir,
      responsibility: responsibility.responsibility,
      dependencyPolicyDirs,
    });

    // 結果整形
    return formatQualitativeReviewResults(reviewResult, responsibility.title);
  };
