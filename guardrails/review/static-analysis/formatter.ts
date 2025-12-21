/**
 * 静的解析結果フォーマッター
 */

import { StaticAnalysisResult } from "./reviewer";

/**
 * 静的解析結果を整形
 *
 * @param result - 静的解析結果
 * @param targetDirectories - 対象ディレクトリ一覧
 * @returns 整形されたマークダウン文字列
 */
export const formatStaticAnalysisResults = (
  result: StaticAnalysisResult,
  targetDirectories: string[],
): string => {
  let output = "";

  let analysisTypeLabel: string;
  if (result.analysisType === "type-check") {
    analysisTypeLabel = "型チェック";
  } else if (result.analysisType === "lint") {
    analysisTypeLabel = "Lintチェック";
  } else {
    analysisTypeLabel = "静的解析（型チェック + Lint）";
  }

  output += `# 🔍 ${analysisTypeLabel}\n\n`;

  // サマリー
  output += "## サマリー\n\n";

  if (result.error !== null && result.error !== undefined) {
    output += "- **ステータス**: ❌ エラー\n\n";
    output += "---\n\n";
    output += `### エラー\n\n${result.error}\n\n`;
    return output;
  }

  output += `- **ステータス**: ${result.success ? "✅ 合格" : "❌ 問題あり"}\n`;

  if (result.typeCheck !== null && result.typeCheck !== undefined) {
    output += `- 型チェック: ${result.typeCheck.passed ? "✅ 合格" : `❌ ${result.typeCheck.issues.length}件の問題`}\n`;
  }

  if (result.lint !== null && result.lint !== undefined) {
    const errorCount = result.lint.issues.filter(
      (issue) => issue.severity === "error",
    ).length;
    const warningCount = result.lint.issues.filter(
      (issue) => issue.severity === "warning",
    ).length;
    output += `- Lint: ${result.lint.passed ? "✅ 合格" : `❌ ${errorCount}件のエラー, ${warningCount}件の警告`}\n`;
  }

  output += "\n";

  // 対象ディレクトリ
  output += "## 対象ディレクトリ\n\n";
  targetDirectories.forEach((dirPath) => {
    output += `- ${dirPath}\n`;
  });
  output += "\n";

  output += "---\n\n";

  // 型チェック結果
  if (result.typeCheck !== null && result.typeCheck !== undefined) {
    output += "## 型チェック結果\n\n";

    if (result.typeCheck.passed) {
      output += "✅ **型エラーはありません。**\n\n";
    } else {
      output += `❌ **${result.typeCheck.issues.length}件の型エラーが見つかりました。**\n\n`;

      if (result.typeCheck.issues.length > 0) {
        output += "### エラー詳細\n\n";
        result.typeCheck.issues.forEach((issue) => {
          output += `- **${issue.file}:${issue.line}:${issue.column}**\n`;
          output += `  - コード: \`${issue.code}\`\n`;
          output += `  - メッセージ: ${issue.message}\n\n`;
        });
      }

      output += "### 型チェック出力\n\n";
      output += "```\n";
      output += result.typeCheck.output;
      output += "\n```\n\n";
    }
  }

  // Lint結果
  if (result.lint !== null && result.lint !== undefined) {
    output += "## Lint結果\n\n";

    if (result.lint.passed) {
      if (result.lint.issues.length === 0) {
        output += "✅ **Lintエラーはありません。**\n\n";
      } else {
        output += `⚠️ **警告: ${result.lint.issues.length}件（エラーなし）**\n\n`;
        output += "### 警告詳細\n\n";
        result.lint.issues.forEach((issue) => {
          const ruleId =
            issue.ruleId !== null && issue.ruleId !== undefined
              ? issue.ruleId
              : "N/A";
          output += `- **${issue.file}:${issue.line}:${issue.column}**\n`;
          output += `  - ルール: \`${ruleId}\`\n`;
          output += `  - メッセージ: ${issue.message}\n\n`;
        });
      }
    } else {
      const errorCount = result.lint.issues.filter(
        (issue) => issue.severity === "error",
      ).length;
      const warningCount = result.lint.issues.filter(
        (issue) => issue.severity === "warning",
      ).length;

      output += `❌ **${errorCount}件のエラー, ${warningCount}件の警告が見つかりました。**\n\n`;

      // エラーを先に表示
      const errors = result.lint.issues.filter(
        (issue) => issue.severity === "error",
      );
      if (errors.length > 0) {
        output += "### エラー\n\n";
        errors.forEach((issue) => {
          const ruleId =
            issue.ruleId !== null && issue.ruleId !== undefined
              ? issue.ruleId
              : "N/A";
          output += `- **${issue.file}:${issue.line}:${issue.column}**\n`;
          output += `  - ルール: \`${ruleId}\`\n`;
          output += `  - メッセージ: ${issue.message}\n\n`;
        });
      }

      // 警告を次に表示
      const warnings = result.lint.issues.filter(
        (issue) => issue.severity === "warning",
      );
      if (warnings.length > 0) {
        output += "### 警告\n\n";
        warnings.forEach((issue) => {
          const ruleId =
            issue.ruleId !== null && issue.ruleId !== undefined
              ? issue.ruleId
              : "N/A";
          output += `- **${issue.file}:${issue.line}:${issue.column}**\n`;
          output += `  - ルール: \`${ruleId}\`\n`;
          output += `  - メッセージ: ${issue.message}\n\n`;
        });
      }
    }
  }

  // 案内セクション
  output += "---\n\n";
  output += "**💡 ご案内:**\n\n";

  if (result.success) {
    output +=
      "- 静的解析に合格しました。定性レビューMCPツールを実行してください\n";
  } else {
    output += "- エラーを修正してから、再度静的解析を実行してください\n";
  }

  return output;
};
