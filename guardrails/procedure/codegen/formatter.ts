/**
 * コード生成結果フォーマッター
 */

import type { GenerateResult } from "./generator";

/**
 * 最大出力文字数（約20,000トークン相当、日本語前提）
 */
const MAX_OUTPUT_CHARS = 20_000;

/**
 * 末尾に確保する文字数の割合
 */
const TAIL_RATIO = 0.85;

/**
 * 出力を省略してフォーマット
 */
const truncateOutput = (output: string): string => {
  if (output.length <= MAX_OUTPUT_CHARS) {
    return output;
  }

  const tailChars = Math.floor(MAX_OUTPUT_CHARS * TAIL_RATIO);
  const headChars = MAX_OUTPUT_CHARS - tailChars;

  const head = output.slice(0, headChars);
  const tail = output.slice(-tailChars);

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
 * 実行時間をフォーマット
 */
const formatDuration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}分${remainingSeconds}秒`;
  }
  return `${seconds}秒`;
};

/**
 * 生成結果をフォーマット
 */
export const formatGenerateResult = (result: GenerateResult): string => {
  const status = result.success ? "✅ 成功" : "❌ 失敗";
  const duration = formatDuration(result.duration);

  const output = [
    `# ⚙️ コード生成結果: ${status}`,
    "",
    `- **ワークスペース**: ${result.workspace}`,
    `- **実行時間**: ${duration}`,
    "",
    "---",
    "",
    result.output,
  ].join("\n");

  return truncateOutput(output);
};
