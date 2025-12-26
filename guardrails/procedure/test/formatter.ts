/**
 * テスト結果のフォーマット
 */
import type { TestResult } from "./test-runner";

/**
 * 最大出力文字数（約20,000トークン相当、日本語前提）
 * MCPレスポンスの上限を考慮し、安全マージンを持たせる
 */
const MAX_OUTPUT_CHARS = 20_000;

/**
 * 末尾に確保する文字数の割合（テスト結果サマリーが末尾にあるため優先）
 */
const TAIL_RATIO = 0.85;

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
 * テスト出力を省略してフォーマット
 *
 * 出力が最大文字数を超える場合、先頭と末尾のみを表示し、途中を省略する。
 * テスト結果のサマリーは通常末尾に表示されるため、末尾を優先的に残す。
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
 * テスト結果をフォーマット
 */
export const formatTestResult = (result: TestResult): string => {
  const status = result.success ? "✅ 成功" : "❌ 失敗";
  const duration = formatDuration(result.duration);
  const truncatedOutput = truncateOutput(result.output);

  return [
    `## テスト結果: ${status}`,
    "",
    `- **対象**: ${result.target}`,
    `- **実行時間**: ${duration}`,
    "",
    "### 出力",
    "",
    "```",
    truncatedOutput,
    "```",
  ].join("\n");
};
