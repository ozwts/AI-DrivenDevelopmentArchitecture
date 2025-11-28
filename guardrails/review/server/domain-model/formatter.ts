/**
 * 結果整形
 */

import * as path from "path";
import { ReviewResult } from "./domain-reviewer";

/**
 * レビュー結果を整形
 */
export const formatReviewResults = (reviewResult: ReviewResult): string => {
  const { results, summary } = reviewResult;

  let output = "";

  output += "# 📝 ドメインモデルレビュー\n\n";
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
