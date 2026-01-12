/**
 * デプロイ結果フォーマッター
 */

import type { DeployResult } from "./deployer";

/**
 * 最大出力文字数（約20,000トークン相当、日本語前提）
 */
const MAX_OUTPUT_CHARS = 20_000;

/**
 * 末尾に確保する文字数の割合（エラーメッセージは末尾に出力されるため優先）
 */
const TAIL_RATIO = 0.85;

/**
 * 出力を省略してフォーマット
 *
 * 出力が最大文字数を超える場合、先頭と末尾のみを表示し、途中を省略する。
 * エラーメッセージは通常末尾に表示されるため、末尾を優先的に残す。
 */
const truncateOutput = (output: string, maxChars: number): string => {
  if (output.length <= maxChars) {
    return output;
  }

  const tailChars = Math.floor(maxChars * TAIL_RATIO);
  const headChars = maxChars - tailChars;

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
 * アクションのラベルを取得
 */
const getActionLabel = (action: string): string => {
  const labels: Record<string, string> = {
    diff: "差分確認 (Plan)",
    deploy: "デプロイ (Apply)",
    destroy: "削除 (Destroy)",
    upgrade: "プロバイダ更新 (Upgrade)",
  };
  return labels[action] ?? action;
};

/**
 * ターゲットのラベルを取得
 */
const getTargetLabel = (target: string): string => {
  const labels: Record<string, string> = {
    all: "全リソース",
    api: "API (Lambda + DB)",
    web: "Web (S3 + CloudFront)",
    batch: "Batch",
  };
  return labels[target] ?? target;
};

/**
 * 実行時間をフォーマット
 */
const formatDuration = (ms: number): string => {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    return `${seconds}秒`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}分${remainingSeconds}秒`;
};

/**
 * デプロイ結果をフォーマット
 */
export const formatDeployResult = (result: DeployResult): string => {
  const lines: string[] = [];

  // ヘッダー
  const statusIcon = result.success ? "✅" : "❌";
  const actionLabel = getActionLabel(result.action);
  const targetLabel = getTargetLabel(result.target);
  lines.push(`## ${statusIcon} ${actionLabel} 結果`);
  lines.push("");

  // サマリー
  lines.push("### サマリー");
  const envLabel =
    result.branchSuffix !== undefined && result.branchSuffix !== ""
      ? `${result.environment} (ブランチ環境: ${result.branchSuffix})`
      : result.environment;
  lines.push(`- **環境**: ${envLabel}`);
  lines.push(`- **ターゲット**: ${targetLabel}`);
  lines.push(`- **アクション**: ${actionLabel}`);
  lines.push(`- **ステータス**: ${result.success ? "成功" : "失敗"}`);
  lines.push(`- **実行時間**: ${formatDuration(result.duration)}`);
  lines.push("");

  // 出力
  lines.push("### 出力");
  lines.push("```");
  lines.push(result.output.trim());
  lines.push("```");

  const formatted = lines.join("\n");
  return truncateOutput(formatted, MAX_OUTPUT_CHARS);
};
