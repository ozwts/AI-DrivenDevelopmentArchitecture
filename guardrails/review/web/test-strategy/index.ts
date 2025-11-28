/**
 * Webテスト戦略レビュー - MCPハンドラー
 */

import { reviewFilesInParallel } from "./test-reviewer";
import { formatReviewResults } from "./formatter";

/**
 * review_web_tests MCPツールのハンドラー
 */
export const handleReviewWebTests = async (args: {
  targetFilePaths: string[];
  guardrailsRoot: string;
  apiKey: string;
}): Promise<string> => {
  const { targetFilePaths, guardrailsRoot, apiKey } = args;

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

  // テストファイルのレビュー
  const reviewResult = await reviewFilesInParallel({
    targetFilePaths,
    guardrailsRoot,
    apiKey,
  });

  // 結果を返す
  return formatReviewResults(reviewResult);
};
