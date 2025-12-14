/**
 * 定性的レビュー結果フォーマッター
 */

import { ReviewResult } from "./reviewer";

/**
 * 定性的レビュー結果を整形
 *
 * @param reviewResult - レビュー結果
 * @param title - レビュータイトル（例: "ドメインモデルレビュー", "テストファイルレビュー"）
 * @returns 整形されたマークダウン文字列
 */
export const formatQualitativeReviewResults = (
  reviewResult: ReviewResult,
  title: string,
): string => {
  const { overallReview, targetDirectories, success, error } = reviewResult;

  let output = "";

  output += `# 📝 ${title}\n\n`;

  output += "## 対象ディレクトリ\n\n";
  targetDirectories.forEach((dirPath) => {
    output += `- ${dirPath}\n`;
  });
  output += "\n";

  output += "---\n\n";

  if (success) {
    output += overallReview;
    output += "\n\n";
  } else {
    output += `### エラー\n\n${error ?? "不明なエラー"}\n\n`;
  }

  return output;
};
