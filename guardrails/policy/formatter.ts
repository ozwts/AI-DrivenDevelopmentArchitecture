/**
 * ポリシーリストフォーマッター
 */

import type { WorkspaceInfo } from "./responsibilities";

/**
 * ワークスペース情報をフォーマット
 */
const formatWorkspaces = (workspaces: WorkspaceInfo[]): string[] => {
  const lines: string[] = [];

  for (const ws of workspaces) {
    lines.push(`### ${ws.workspace}`);

    if (ws.layers.length === 0) {
      lines.push("  (レイヤーなし)\n");
      continue;
    }

    for (const layer of ws.layers) {
      const checkCount = layer.checks.length;
      lines.push(
        `**Layer: ${layer.layer}** (${checkCount} ${checkCount === 1 ? "check" : "checks"})`
      );

      for (const check of layer.checks) {
        const description =
          typeof check.description === "string" &&
          check.description.length > 0
            ? check.description
            : "(説明なし)";
        lines.push(`  - ${check.id}: ${description}`);
      }

      lines.push("");
    }
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
