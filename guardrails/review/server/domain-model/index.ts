/**
 * サーバー/ドメインモデルレビュー - MCPハンドラー
 */

import { reviewFilesInParallel } from "./domain-reviewer";
import { formatReviewResults } from "./formatter";

/**
 * review_domain_models MCPツールのハンドラー
 */
export const handleReviewDomainModels = async (args: {
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

  // ドメインモデルファイルのレビュー（並列実行）
  const reviewResult = await reviewFilesInParallel({
    targetFilePaths,
    guardrailsRoot,
    apiKey,
  });

  // 結果を整形して返す
  return formatReviewResults(reviewResult);
};
