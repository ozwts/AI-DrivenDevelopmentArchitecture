/**
 * デプロイ結果フォーマッター
 */

import type { DeployResult } from "./deployer";

/**
 * 最大出力文字数（日本語前提で20,000トークン相当）
 */
const MAX_OUTPUT_CHARS = 20000;

/**
 * 出力を切り詰める
 */
const truncateOutput = (output: string, maxChars: number): string => {
  if (output.length <= maxChars) {
    return output;
  }

  const truncatedLength = maxChars - 100;
  const truncatedOutput = output.slice(0, truncatedLength);
  const remainingChars = output.length - truncatedLength;

  return `${truncatedOutput}\n\n... (${remainingChars.toLocaleString()} 文字省略)`;
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
