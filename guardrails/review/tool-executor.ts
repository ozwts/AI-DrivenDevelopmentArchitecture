/**
 * 共通ツール定義と実行ロジック
 */

import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs/promises";

/**
 * ツール結果の型
 */
type ToolResult = {
  type: "tool_result";
  tool_use_id: string;
  content: string;
  isError?: boolean;
};

/**
 * ファイル読み込みツール定義
 */
export const READ_FILE_TOOL: Anthropic.Messages.Tool = {
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
 * ファイル一覧取得ツール定義
 */
export const LIST_FILES_TOOL: Anthropic.Messages.Tool = {
  name: "list_files",
  description: "指定されたディレクトリ内のファイル一覧を取得します",
  input_schema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "ディレクトリの絶対パス",
      },
    },
    required: ["path"],
  },
};

/**
 * 全ツール定義の配列
 */
export const ALL_TOOLS: Anthropic.Messages.Tool[] = [
  READ_FILE_TOOL,
  LIST_FILES_TOOL,
];

/**
 * ツールを実行
 */
export const executeToolUse = async (
  block: Anthropic.Messages.ToolUseBlock,
): Promise<ToolResult> => {
  if (block.name === "read_file") {
    const toolInput = block.input as { path: string };
    try {
      const fileContent = await fs.readFile(toolInput.path, "utf-8");
      return {
        type: "tool_result" as const,
        tool_use_id: block.id,
        content: fileContent,
      };
    } catch (error) {
      return {
        type: "tool_result" as const,
        tool_use_id: block.id,
        content: `Error: ${error instanceof Error ? error.message : String(error)}`,
        isError: true,
      };
    }
  }

  if (block.name === "list_files") {
    const toolInput = block.input as { path: string };
    try {
      const files = await fs.readdir(toolInput.path);
      return {
        type: "tool_result" as const,
        tool_use_id: block.id,
        content: files.join("\n"),
      };
    } catch (error) {
      return {
        type: "tool_result" as const,
        tool_use_id: block.id,
        content: `Error: ${error instanceof Error ? error.message : String(error)}`,
        isError: true,
      };
    }
  }

  return {
    type: "tool_result" as const,
    tool_use_id: block.id,
    content: "Unknown tool",
  };
};
