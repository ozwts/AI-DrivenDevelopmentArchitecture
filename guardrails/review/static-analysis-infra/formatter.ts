/**
 * インフラ静的解析結果フォーマッター
 */

import { InfraAnalysisResult } from "./reviewer";

/**
 * 最大出力文字数（約20,000トークン相当、日本語前提）
 * MCPレスポンスの上限を考慮し、安全マージンを持たせる
 */
const MAX_OUTPUT_CHARS = 20_000;

/**
 * 末尾に確保する文字数の割合（結果サマリーが末尾にあるため優先）
 */
const TAIL_RATIO = 0.85;

/**
 * 出力を省略してフォーマット
 *
 * 出力が最大文字数を超える場合、先頭と末尾のみを表示し、途中を省略する。
 */
const truncateOutput = (output: string): string => {
  if (output.length <= MAX_OUTPUT_CHARS) {
    return output;
  }

  const tailChars = Math.floor(MAX_OUTPUT_CHARS * TAIL_RATIO);
  const headChars = MAX_OUTPUT_CHARS - tailChars;

  const head = output.slice(0, headChars);
  const tail = output.slice(-tailChars);

  // 行の途中で切れないよう調整
  const headEndIndex = head.lastIndexOf("\n");
  const tailStartIndex = tail.indexOf("\n");

  const cleanHead = headEndIndex > 0 ? head.slice(0, headEndIndex) : head;
  const cleanTail =
    tailStartIndex >= 0 ? tail.slice(tailStartIndex + 1) : tail;

  const omittedChars = output.length - cleanHead.length - cleanTail.length;

  return [
    cleanHead,
    "",
    `... (約 ${Math.round(omittedChars / 1000)}K 文字省略) ...`,
    "",
    cleanTail,
  ].join("\n");
};

/**
 * インフラ静的解析結果を整形
 *
 * @param result - 解析結果
 * @param targetDirectory - 対象ディレクトリ
 * @returns 整形されたマークダウン文字列
 */
export const formatInfraAnalysisResults = (
  result: InfraAnalysisResult,
  targetDirectory: string,
): string => {
  let output = "";

  let analysisTypeLabel: string;
  if (result.analysisType === "format") {
    analysisTypeLabel = "フォーマットチェック";
  } else if (result.analysisType === "lint") {
    analysisTypeLabel = "TFLintチェック";
  } else if (result.analysisType === "security") {
    analysisTypeLabel = "セキュリティスキャン";
  } else {
    analysisTypeLabel = "インフラ静的解析（全チェック）";
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

  if (result.format !== null && result.format !== undefined) {
    output += `- フォーマット: ${result.format.passed ? "✅ 合格" : `❌ ${result.format.issues.length}件の問題`}\n`;
  }

  if (result.lint !== null && result.lint !== undefined) {
    const errorCount = result.lint.issues.filter(
      (issue) => issue.severity === "error",
    ).length;
    const warningCount = result.lint.issues.filter(
      (issue) => issue.severity === "warning",
    ).length;
    output += `- TFLint: ${result.lint.passed ? "✅ 合格" : `❌ ${errorCount}件のエラー, ${warningCount}件の警告`}\n`;
  }

  if (result.security !== null && result.security !== undefined) {
    const criticalCount = result.security.issues.filter(
      (issue) => issue.severity === "CRITICAL",
    ).length;
    const highCount = result.security.issues.filter(
      (issue) => issue.severity === "HIGH",
    ).length;
    const mediumCount = result.security.issues.filter(
      (issue) => issue.severity === "MEDIUM",
    ).length;
    const lowCount = result.security.issues.filter(
      (issue) => issue.severity === "LOW",
    ).length;
    const statusText = result.security.passed
      ? "✅ 合格"
      : `❌ CRITICAL:${criticalCount}, HIGH:${highCount}, MEDIUM:${mediumCount}, LOW:${lowCount}`;
    output += `- セキュリティ: ${statusText}\n`;
  }

  output += "\n";

  // 対象ディレクトリ
  output += "## 対象ディレクトリ\n\n";
  output += `- ${targetDirectory}\n\n`;

  output += "---\n\n";

  // フォーマットチェック結果
  if (result.format !== null && result.format !== undefined) {
    output += "## フォーマットチェック結果（terraform fmt）\n\n";

    if (result.format.passed) {
      output += "✅ **全ファイルが正しくフォーマットされています。**\n\n";
    } else {
      output += `❌ **${result.format.issues.length}件のファイルがフォーマットされていません。**\n\n`;
      output += "### フォーマットが必要なファイル\n\n";
      result.format.issues.forEach((issue) => {
        output += `- \`${issue.file}\`\n`;
      });
      output += "\n**修正コマンド**: `terraform fmt -recursive`\n\n";
    }
  }

  // TFLint結果
  if (result.lint !== null && result.lint !== undefined) {
    output += "## TFLint結果\n\n";

    if (result.lint.passed && result.lint.issues.length === 0) {
      output += "✅ **Lintエラーはありません。**\n\n";
    } else {
      const errors = result.lint.issues.filter(
        (issue) => issue.severity === "error",
      );
      const warnings = result.lint.issues.filter(
        (issue) => issue.severity === "warning",
      );
      const notices = result.lint.issues.filter(
        (issue) => issue.severity === "notice",
      );

      if (errors.length > 0) {
        output += "### ❌ エラー\n\n";
        errors.forEach((issue) => {
          const location =
            issue.file !== undefined
              ? `\`${issue.file}${issue.line !== undefined ? `:${issue.line}` : ""}\``
              : "N/A";
          output += `- **${issue.rule}** (${location})\n`;
          output += `  - ${issue.message}\n\n`;
        });
      }

      if (warnings.length > 0) {
        output += "### ⚠️ 警告\n\n";
        warnings.forEach((issue) => {
          const location =
            issue.file !== undefined
              ? `\`${issue.file}${issue.line !== undefined ? `:${issue.line}` : ""}\``
              : "N/A";
          output += `- **${issue.rule}** (${location})\n`;
          output += `  - ${issue.message}\n\n`;
        });
      }

      if (notices.length > 0) {
        output += "### 💡 通知\n\n";
        notices.forEach((issue) => {
          const location =
            issue.file !== undefined
              ? `\`${issue.file}${issue.line !== undefined ? `:${issue.line}` : ""}\``
              : "N/A";
          output += `- **${issue.rule}** (${location})\n`;
          output += `  - ${issue.message}\n\n`;
        });
      }
    }
  }

  // Trivy結果
  if (result.security !== null && result.security !== undefined) {
    output += "## セキュリティスキャン結果（Trivy）\n\n";

    if (result.security.passed && result.security.issues.length === 0) {
      output += "✅ **セキュリティ問題は検出されませんでした。**\n\n";
    } else {
      const bySeverity = {
        CRITICAL: result.security.issues.filter(
          (issue) => issue.severity === "CRITICAL",
        ),
        HIGH: result.security.issues.filter(
          (issue) => issue.severity === "HIGH",
        ),
        MEDIUM: result.security.issues.filter(
          (issue) => issue.severity === "MEDIUM",
        ),
        LOW: result.security.issues.filter(
          (issue) => issue.severity === "LOW",
        ),
      };

      if (bySeverity.CRITICAL.length > 0) {
        output += "### 🔴 CRITICAL\n\n";
        bySeverity.CRITICAL.forEach((issue) => {
          const fileDisplay =
            issue.file !== null && issue.file !== undefined && issue.file !== ""
              ? issue.file
              : "N/A";
          output += `- **${issue.id}**: ${issue.title}\n`;
          output += `  - ファイル: \`${fileDisplay}\`\n`;
          output += `  - 詳細: ${issue.message}\n`;
          if (issue.resolution !== null && issue.resolution !== undefined) {
            output += `  - 解決策: ${issue.resolution}\n`;
          }
          output += "\n";
        });
      }

      if (bySeverity.HIGH.length > 0) {
        output += "### 🟠 HIGH\n\n";
        bySeverity.HIGH.forEach((issue) => {
          const fileDisplay =
            issue.file !== null && issue.file !== undefined && issue.file !== ""
              ? issue.file
              : "N/A";
          output += `- **${issue.id}**: ${issue.title}\n`;
          output += `  - ファイル: \`${fileDisplay}\`\n`;
          output += `  - 詳細: ${issue.message}\n`;
          if (issue.resolution !== null && issue.resolution !== undefined) {
            output += `  - 解決策: ${issue.resolution}\n`;
          }
          output += "\n";
        });
      }

      if (bySeverity.MEDIUM.length > 0) {
        output += "### 🟡 MEDIUM\n\n";
        bySeverity.MEDIUM.forEach((issue) => {
          const fileDisplay =
            issue.file !== null && issue.file !== undefined && issue.file !== ""
              ? issue.file
              : "N/A";
          output += `- **${issue.id}**: ${issue.title}\n`;
          output += `  - ファイル: \`${fileDisplay}\`\n`;
          output += `  - 詳細: ${issue.message}\n`;
          if (issue.resolution !== null && issue.resolution !== undefined) {
            output += `  - 解決策: ${issue.resolution}\n`;
          }
          output += "\n";
        });
      }

      if (bySeverity.LOW.length > 0) {
        output += "### 🟢 LOW\n\n";
        bySeverity.LOW.forEach((issue) => {
          const fileDisplay =
            issue.file !== null && issue.file !== undefined && issue.file !== ""
              ? issue.file
              : "N/A";
          output += `- **${issue.id}**: ${issue.title}\n`;
          output += `  - ファイル: \`${fileDisplay}\`\n`;
          output += `  - 詳細: ${issue.message}\n`;
          if (issue.resolution !== null && issue.resolution !== undefined) {
            output += `  - 解決策: ${issue.resolution}\n`;
          }
          output += "\n";
        });
      }
    }
  }

  // 案内セクション
  output += "---\n\n";
  output += "**💡 ご案内:**\n\n";

  if (result.success) {
    output += "- インフラ静的解析に合格しました\n";
  } else {
    output += "- エラーを修正してから、再度静的解析を実行してください\n";
  }

  return truncateOutput(output);
};
