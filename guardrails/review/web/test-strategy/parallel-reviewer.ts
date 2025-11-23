/**
 * 複数ファイルを並列でレビュー（Claude Agent SDK Tool Use）
 */

import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs/promises";
import * as path from "path";
import { selectPolicies, loadPolicies } from "./policy-loader.js";

export interface FileReviewInput {
  targetFilePaths: string[];
  guardrailsRoot: string;
  apiKey: string;
}

export interface FileReviewResult {
  filePath: string;
  policies: string[];
  review: string;
  success: boolean;
  error?: string;
}

export interface ParallelReviewResult {
  results: FileReviewResult[];
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

/**
 * ファイル読み込みツール定義
 */
const READ_FILE_TOOL: Anthropic.Messages.Tool = {
  name: "read_file",
  description: "指定されたパスのファイルの内容を読み込みます",
  input_schema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "読み込むファイルの絶対パス",
      },
    },
    required: ["path"],
  },
};

/**
 * 複数ファイルを並列でレビュー
 */
export async function reviewFilesInParallel(
  input: FileReviewInput
): Promise<ParallelReviewResult> {
  const { targetFilePaths, guardrailsRoot, apiKey } = input;

  // Claude APIクライアント
  const anthropic = new Anthropic({ apiKey });

  // 各ファイルを並列でレビュー
  const results = await Promise.all(
    targetFilePaths.map((filePath) =>
      reviewSingleFile(filePath, guardrailsRoot, anthropic)
    )
  );

  // サマリーを生成
  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return {
    results,
    summary: {
      total: results.length,
      successful,
      failed,
    },
  };
}

/**
 * 単一ファイルをレビュー（Tool Use）
 */
async function reviewSingleFile(
  filePath: string,
  guardrailsRoot: string,
  anthropic: Anthropic
): Promise<FileReviewResult> {
  try {
    // 1. ポリシーファイルを選択
    const { policyFiles } = await selectPolicies(filePath, guardrailsRoot);

    // 2. ポリシーを並列で読み込み
    const policyContents = await loadPolicies(policyFiles);
    const policies = policyFiles.map((file, index) => ({
      name: path.basename(file),
      content: policyContents[index],
    }));

    // 3. レビュー指示を生成
    const policySection = policies
      .map((p, index) => `## Policy ${index + 1}: ${p.name}\n\n${p.content}`)
      .join("\n\n---\n\n");

    const systemPrompt = `あなたはGuardrailsポリシーシステムに従うコードレビュアーです。
提供されたポリシーに基づいてコードをレビューし、建設的なフィードバックを提供してください。

${policySection}

対象ファイルを読み込む必要がある場合は、read_fileツールを使用してください。ファイルパス: ${filePath}`;

    // 4. Claude APIでレビュー実行（Tool Use）
    let messages: Anthropic.Messages.MessageParam[] = [
      {
        role: "user",
        content: `${filePath} のファイルを、提供されたポリシーに基づいてレビューしてください。まず read_file ツールを使用してファイルの内容を読み込んでください。`,
      },
    ];

    let reviewText = "";
    let continueLoop = true;

    while (continueLoop) {
      const response = await anthropic.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 4096,
        system: systemPrompt,
        messages,
        tools: [READ_FILE_TOOL],
      });

      // Tool Useがあれば実行
      const toolUseBlock = response.content.find(
        (block): block is Anthropic.Messages.ToolUseBlock =>
          block.type === "tool_use"
      );

      if (toolUseBlock && toolUseBlock.name === "read_file") {
        // ファイルを読み込み
        const input = toolUseBlock.input as { path: string };
        const fileContent = await fs.readFile(input.path, "utf-8");

        // Tool結果を追加
        messages.push({
          role: "assistant",
          content: response.content,
        });
        messages.push({
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: toolUseBlock.id,
              content: fileContent,
            },
          ],
        });
      } else {
        // Textレスポンスを取得
        const textBlock = response.content.find(
          (block): block is Anthropic.Messages.TextBlock =>
            block.type === "text"
        );
        reviewText = textBlock?.text || "";
        continueLoop = false;
      }
    }

    return {
      filePath,
      policies: policies.map((p) => p.name),
      review: reviewText,
      success: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      filePath,
      policies: [],
      review: "",
      success: false,
      error: errorMessage,
    };
  }
}
