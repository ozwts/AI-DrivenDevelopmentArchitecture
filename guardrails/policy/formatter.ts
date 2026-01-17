/**
 * ポリシーリストフォーマッター
 */

import type { WorkspaceInfo } from "./responsibilities";

/**
 * ワークスペース情報をフォーマット
 * フラット構造: workspace直下にchecksが配置される
 */
const formatWorkspaces = (workspaces: WorkspaceInfo[]): string[] => {
  const lines: string[] = [];

  for (const ws of workspaces) {
    const checkCount = ws.checks.length;
    lines.push(`### ${ws.workspace} (${checkCount} ${checkCount === 1 ? "check" : "checks"})`);

    if (ws.checks.length === 0) {
      lines.push("  (チェックなし)\n");
      continue;
    }

    for (const check of ws.checks) {
      const description =
        typeof check.description === "string" &&
        check.description.length > 0
          ? check.description
          : "(説明なし)";
      lines.push(`  - ${check.id}: ${description}`);
    }

    lines.push("");
  }

  return lines;
};

/**
 * スキャン結果をMarkdown形式でフォーマット
 */
export const formatPolicyList = (
  title: string,
  staticWorkspaces: WorkspaceInfo[],
  semanticWorkspaces: WorkspaceInfo[]
): string => {
  const lines: string[] = [];
  lines.push(`# ${title}\n`);

  // Static
  if (staticWorkspaces.length > 0) {
    lines.push("## Static Checks\n");
    lines.push(...formatWorkspaces(staticWorkspaces));
  }

  // Semantic
  if (semanticWorkspaces.length > 0) {
    lines.push("## Semantic Checks\n");
    lines.push(...formatWorkspaces(semanticWorkspaces));
  }

  if (staticWorkspaces.length === 0 && semanticWorkspaces.length === 0) {
    return "ポリシーが見つかりませんでした。";
  }

  return lines.join("\n");
};
