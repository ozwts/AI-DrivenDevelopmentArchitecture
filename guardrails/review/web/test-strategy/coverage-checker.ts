/**
 * カバレッジチェック専用
 */

import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs/promises";
import * as path from "path";

export type CoverageCheckResult = {
  pageDirectory: string;
  review: string;
  success: boolean;
  error?: string;
};

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
 * ページディレクトリのカバレッジチェック
 */
export const checkCoverageForDirectory = async (
  pageDirectory: string,
  guardrailsRoot: string,
  anthropic: Anthropic,
): Promise<CoverageCheckResult> => {
  try {
    // 00-test-coverage-requirements.md を読み込み
    const policyBase = path.join(
      guardrailsRoot,
      "policy",
      "web",
      "test-strategy",
    );
    const coveragePolicyPath = path.join(
      policyBase,
      "00-test-coverage-requirements.md",
    );
    const coveragePolicy = await fs.readFile(coveragePolicyPath, "utf-8");

    const systemPrompt = `あなたはGuardrailsポリシーに従ってテストカバレッジをチェックします。

# Policy: 00-test-coverage-requirements.md

${coveragePolicy}

ページディレクトリ: ${pageDirectory}`;

    const messages: Anthropic.Messages.MessageParam[] = [
      {
        role: "user",
        content: `${pageDirectory} のテストカバレッジをチェックしてください。`,
      },
    ];

    let reviewText = "";
    let continueLoop = true;

    while (continueLoop) {
      // eslint-disable-next-line no-await-in-loop
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
          block.type === "tool_use",
      );

      if (
        toolUseBlock !== null &&
        toolUseBlock !== undefined &&
        toolUseBlock.name === "read_file"
      ) {
        // ファイルを読み込み
        const input = toolUseBlock.input as { path: string };
        // eslint-disable-next-line no-await-in-loop
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
            block.type === "text",
        );
        reviewText =
          textBlock !== null &&
          textBlock !== undefined &&
          typeof textBlock.text === "string" &&
          textBlock.text !== ""
            ? textBlock.text
            : "";
        continueLoop = false;
      }
    }

    return {
      pageDirectory,
      review: reviewText,
      success: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      pageDirectory,
      review: "",
      success: false,
      error: errorMessage,
    };
  }
};
