/**
 * 個別テストレビュー専用（1ショットレビュー）
 */

import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs/promises";
import * as path from "path";
import { loadAgentPrompt } from "../../agent-loader";
import { ALL_TOOLS, executeToolUse } from "../../tool-executor";

type FileReviewResult = {
  filePath: string;
  policies: string[];
  review: string;
  success: boolean;
  error?: string;
};

export type ReviewResult = {
  results: FileReviewResult[];
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
};

export type FileReviewInput = {
  targetFilePaths: string[];
  guardrailsRoot: string;
  apiKey: string;
};

/**
 * ファイルパスから適切なポリシーファイルのリストを取得
 */
const selectPolicies = (
  targetFilePath: string,
  policyBase: string,
): string[] => {
  const fileName = path.basename(targetFilePath);
  const isComponentTest = fileName.endsWith(".ct.test.tsx");
  const isSnapshotTest = fileName.endsWith(".ss.test.ts");

  if (isComponentTest) {
    return [
      path.join(policyBase, "10-test-strategy-overview.md"),
      path.join(policyBase, "20-component-test.md"),
    ];
  }

  if (isSnapshotTest) {
    return [
      path.join(policyBase, "10-test-strategy-overview.md"),
      path.join(policyBase, "30-snapshot-test.md"),
    ];
  }

  throw new Error(`サポートされていないファイル形式です: ${fileName}`);
};

/**
 * 全ファイルを1ショットでレビュー
 */
export const reviewFilesInParallel = async (
  input: FileReviewInput,
): Promise<ReviewResult> => {
  const { targetFilePaths, guardrailsRoot, apiKey } = input;

  const policyBase = path.join(
    guardrailsRoot,
    "policy",
    "web",
    "test-strategy",
  );

  try {
    // 1. エージェントプロンプトを読み込み
    const agentPath = path.join(
      guardrailsRoot,
      "..",
      ".claude",
      "agents",
      "guardrails-reviewer.md",
    );
    const agentPrompt = await loadAgentPrompt(agentPath);

    // 2. 全ファイルのポリシーを収集（重複排除）
    const allPolicyFiles = new Set<string>();
    const filePolicyMap: Record<string, string[]> = {};

    for (const filePath of targetFilePaths) {
      const policies = selectPolicies(filePath, policyBase);
      filePolicyMap[filePath] = policies;
      policies.forEach((p) => allPolicyFiles.add(p));
    }

    // 3. ポリシーファイルを読み込み
    const policyContents: Record<string, string> = {};
    await Promise.all(
      Array.from(allPolicyFiles).map(async (policyPath) => {
        const content = await fs.readFile(policyPath, "utf-8");
        policyContents[policyPath] = content;
      }),
    );

    // 4. システムプロンプトを構築
    let systemPrompt = agentPrompt;
    systemPrompt += "\n\n# Policies\n\n";

    for (const [policyPath, content] of Object.entries(policyContents)) {
      systemPrompt += `## ${path.basename(policyPath)}\n\n${content}\n\n---\n\n`;
    }

    // 5. レビュー指示を構築
    let userPrompt = "以下のファイルをレビューしてください。\n\n";

    for (const filePath of targetFilePaths) {
      const fileName = path.basename(filePath);
      const policies = filePolicyMap[filePath]
        .map((p) => path.basename(p))
        .join(", ");
      userPrompt += `## ${fileName}\n`;
      userPrompt += `- パス: ${filePath}\n`;
      userPrompt += `- 適用ポリシー: ${policies}\n\n`;
    }

    userPrompt +=
      "\nまず read_file ツールを使用して各ファイルの内容を読み込んでください。";

    // 6. Claude APIでレビュー実行
    const anthropic = new Anthropic({ apiKey });
    const messages: Anthropic.Messages.MessageParam[] = [
      { role: "user", content: userPrompt },
    ];

    let reviewText = "";
    let continueLoop = true;

    while (continueLoop) {
      // eslint-disable-next-line no-await-in-loop
      const response = await anthropic.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 8192,
        system: systemPrompt,
        messages,
        tools: ALL_TOOLS,
      });

      // Tool Useがあれば実行
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.Messages.ToolUseBlock =>
          block.type === "tool_use",
      );

      if (toolUseBlocks.length > 0) {
        // 全ツールを実行
        messages.push({
          role: "assistant",
          content: response.content,
        });

        // eslint-disable-next-line no-await-in-loop
        const toolResults = await Promise.all(
          toolUseBlocks.map((block) => executeToolUse(block)),
        );

        messages.push({
          role: "user",
          content: toolResults,
        });
      } else {
        // Textレスポンスを取得
        const textBlock = response.content.find(
          (block): block is Anthropic.Messages.TextBlock =>
            block.type === "text",
        );
        reviewText =
          textBlock !== null &&
          textBlock !== undefined &&
          typeof textBlock.text === "string"
            ? textBlock.text
            : "";
        continueLoop = false;
      }
    }

    // 7. 結果を構造化
    const results: FileReviewResult[] = targetFilePaths.map((filePath) => ({
      filePath,
      policies: filePolicyMap[filePath].map((p) => path.basename(p)),
      review: reviewText,
      success: true,
    }));

    return {
      results,
      summary: {
        total: results.length,
        successful: results.length,
        failed: 0,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    const results: FileReviewResult[] = targetFilePaths.map((filePath) => ({
      filePath,
      policies: [],
      review: "",
      success: false,
      error: errorMessage,
    }));

    return {
      results,
      summary: {
        total: results.length,
        successful: 0,
        failed: results.length,
      },
    };
  }
};
