/**
 * テスト結果のフォーマット
 */
import type { TestResult } from "./test-runner";

/**
 * 実行時間をフォーマット
 */
export const formatDuration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 0) {
    return `${minutes}分${remainingSeconds}秒`;
  }
  return `${seconds}秒`;
};

/**
 * テスト結果をフォーマット
 */
export const formatTestResult = (result: TestResult): string => {
  const status = result.success ? "✅ 成功" : "❌ 失敗";
  const duration = formatDuration(result.duration);

  return [
    `## テスト結果: ${status}`,
    "",
    `- **対象**: ${result.target}`,
    `- **実行時間**: ${duration}`,
    "",
    "### 出力",
    "",
    "```",
    result.output,
    "```",
  ].join("\n");
};
