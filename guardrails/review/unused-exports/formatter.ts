/**
 * 未使用export検出結果フォーマッター
 */

import { UnusedExportsResult } from "./reviewer";

/**
 * 未使用export検出結果を整形
 *
 * @param result - 未使用export検出結果
 * @param targetDirectories - 対象ディレクトリ一覧
 * @returns 整形されたマークダウン文字列
 */
export const formatUnusedExportsResults = (
  result: UnusedExportsResult,
  targetDirectories: string[],
): string => {
  let output = "";

  output += "# 🗑️ 未使用export検出\n\n";

  // サマリー
  output += "## サマリー\n\n";

  if (result.error !== null && result.error !== undefined) {
    output += "- **ステータス**: ❌ エラー\n\n";
    output += "---\n\n";
    output += `### エラー\n\n${result.error}\n\n`;
    return output;
  }

  output += `- **ステータス**: ${result.success ? "✅ 未使用exportなし" : `⚠️ ${result.unusedExports.length}件の未使用export`}\n`;
  output += "\n";

  // 対象ディレクトリ
  if (targetDirectories.length > 0) {
    output += "## 対象ディレクトリ\n\n";
    targetDirectories.forEach((dirPath) => {
      output += `- ${dirPath}\n`;
    });
    output += "\n";
  }

  output += "---\n\n";

  // 未使用export一覧
  if (result.unusedExports.length === 0) {
    output += "✅ **未使用のexportはありません。**\n\n";
  } else {
    output += `## 未使用export一覧（${result.unusedExports.length}件）\n\n`;
    output +=
      "以下のexportは使用されていません。削除を検討してください。\n\n";

    result.unusedExports.forEach((item) => {
      output += `- **${item.name}** - \`${item.file}:${item.line}:${item.column}\`\n`;
    });
    output += "\n";
  }

  return output;
};
