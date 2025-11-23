/**
 * 結果整形
 */

import * as path from "path";
import { CoverageCheckResult } from "./coverage-checker";
import { ParallelReviewResult } from "./test-reviewer";

/**
 * レビュー結果を整形（カバレッジチェック + 個別レビュー）
 */
export const formatReviewResults = (
  coverageResults: CoverageCheckResult[],
  reviewResult: ParallelReviewResult,
): string => {
  let output = "";

  // カバレッジチェック結果
  if (coverageResults.length > 0) {
    output += "# 📊 テストカバレッジチェック\n\n";

    coverageResults.forEach((c) => {
      const dirName = path.basename(c.pageDirectory);
      output += `## ${dirName}\n\n`;

      if (c.success) {
        output += `${c.review}\n\n`;
      } else {
        output += `### エラー\n\n${c.error}\n\n`;
      }

      output += "---\n\n";
    });
  }

  // 個別テストレビュー結果
  const { results, summary } = reviewResult;

  output += "# 📝 個別テストファイルレビュー\n\n";
  output += "## サマリー\n\n";
  output += `- 総ファイル数: ${summary.total}\n`;
  output += `- 成功: ${summary.successful}\n`;
  output += `- 失敗: ${summary.failed}\n\n`;
  output += "---\n\n";

  results.forEach((r) => {
    const fileName = path.basename(r.filePath);
    output += `## ${fileName}\n\n`;

    if (r.success) {
      output += "### 適用されたポリシー\n\n";
      r.policies.forEach((p) => {
        output += `- ${p}\n`;
      });
      output += `\n### レビュー\n\n${r.review}\n\n`;
    } else {
      output += `### エラー\n\n${r.error}\n\n`;
    }

    output += "---\n\n";
  });

  return output;
};
