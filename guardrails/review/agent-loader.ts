/**
 * .claude/agents/*.md からエージェントプロンプトを読み込むユーティリティ
 */

import * as fs from "fs/promises";

/**
 * エージェント定義ファイルからプロンプト部分を抽出
 *
 * @param agentFilePath - .claude/agents/*.md のパス
 * @returns プロンプト文字列（frontmatter除外後）
 */
export const loadAgentPrompt = async (
  agentFilePath: string,
): Promise<string> => {
  const content = await fs.readFile(agentFilePath, "utf-8");

  // frontmatter（---で囲まれた部分）を除外
  const frontmatterRegex = /^---\n[\s\S]*?\n---\n/;
  const promptContent = content.replace(frontmatterRegex, "").trim();

  return promptContent;
};
