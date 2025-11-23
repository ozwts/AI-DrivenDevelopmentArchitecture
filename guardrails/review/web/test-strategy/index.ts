/**
 * Webテスト戦略レビュー - MCPハンドラー
 */

import Anthropic from "@anthropic-ai/sdk";
import { checkCoverageForDirectory } from "./coverage-checker";
import { reviewFilesInParallel } from "./test-reviewer";
import { formatReviewResults } from "./formatter";

/**
 * ターゲットファイルからページディレクトリを抽出
 */
const extractPageDirectories = (targetFilePaths: string[]): string[] => {
  const directories = new Set<string>();

  for (const filePath of targetFilePaths) {
    // pages/{PageName}/ファイル名 のパターンを抽出
    const match = filePath.match(/\/pages\/([^/]+)\//);
    if (match !== null && match !== undefined) {
      const fullPath = filePath.substring(0, filePath.lastIndexOf("/"));
      directories.add(fullPath);
    }
  }

  return Array.from(directories);
};

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

  // Claude APIクライアント
  const anthropic = new Anthropic({ apiKey });

  // 1. ページディレクトリを抽出（重複排除）
  const pageDirectories = extractPageDirectories(targetFilePaths);

  // 2. カバレッジチェック（並列実行、ページごとに1回のみ）
  const coverageResults = await Promise.all(
    pageDirectories.map((dir) =>
      checkCoverageForDirectory(dir, guardrailsRoot, anthropic),
    ),
  );

  // 3. 個別テストファイルのレビュー（並列実行）
  const reviewResult = await reviewFilesInParallel({
    targetFilePaths,
    guardrailsRoot,
    apiKey,
  });

  // 4. 結果を統合して返す
  return formatReviewResults(coverageResults, reviewResult);
};
