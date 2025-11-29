/**
 * 共通ツール定義と実行ロジック
 */

import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs/promises";
import * as glob from "glob";

/**
 * ポリシーファイル命名規則
 */
const POLICY_FILE_PATTERNS = {
  /** Overview ファイルパターン（*0-*-overview.md） */
  overview: /^\d0-.*-overview\.md$/,
} as const;

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
 * Overview ファイル一覧取得ツール定義
 */
export const LIST_OVERVIEW_FILES_TOOL: Anthropic.Messages.Tool = {
  name: "list_overview_files",
  description:
    "指定されたポリシーディレクトリ内の Overview ファイル (*0-*-overview.md) のみを取得します。トークン効率化のため、まずこのツールで Overview を読み込み、必要に応じて詳細ファイルを read_file で読み込んでください。",
  input_schema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "ポリシーディレクトリの絶対パス",
      },
    },
    required: ["path"],
  },
};

/**
 * Glob パターンマッチングツール定義
 */
export const GLOB_TOOL: Anthropic.Messages.Tool = {
  name: "glob",
  description:
    "指定されたパターンに一致するファイルを検索します。コードベース内のファイルを検索する際に使用してください（例: '**/*.ts', 'server/src/domain/model/**/*.ts'）",
  input_schema: {
    type: "object",
    properties: {
      pattern: {
        type: "string",
        description: "Globパターン（例: '**/*.ts', 'policy/**/*-overview.md'）",
      },
      cwd: {
        type: "string",
        description:
          "検索開始ディレクトリの絶対パス（省略時はプロジェクトルート）",
      },
    },
    required: ["pattern"],
  },
};

/**
 * Grep 検索ツール定義
 */
export const GREP_TOOL: Anthropic.Messages.Tool = {
  name: "grep",
  description:
    "指定されたパターンに一致する行をファイルから検索します。既存コードのパターンを調査する際に使用してください。",
  input_schema: {
    type: "object",
    properties: {
      pattern: {
        type: "string",
        description: "検索する正規表現パターン",
      },
      path: {
        type: "string",
        description: "検索対象のファイルまたはディレクトリの絶対パス",
      },
      filePattern: {
        type: "string",
        description:
          "ファイルパターン（例: '*.ts'）。pathがディレクトリの場合のみ有効",
      },
    },
    required: ["pattern", "path"],
  },
};

/**
 * 全ツール定義の配列
 */
export const ALL_TOOLS: Anthropic.Messages.Tool[] = [
  READ_FILE_TOOL,
  LIST_FILES_TOOL,
  LIST_OVERVIEW_FILES_TOOL,
  GLOB_TOOL,
  GREP_TOOL,
];

/**
 * ツール一覧の説明文を生成
 *
 * @returns ツール一覧のMarkdown形式の説明文
 */
export const generateToolDescriptions = (): string =>
  ALL_TOOLS.map((tool) => `- \`${tool.name}\`: ${tool.description}`).join("\n");

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

  if (block.name === "list_overview_files") {
    const toolInput = block.input as { path: string };
    try {
      const allFiles = await fs.readdir(toolInput.path);
      // Overview ファイルのみフィルタ
      const overviewFiles = allFiles.filter((file) =>
        file.match(POLICY_FILE_PATTERNS.overview),
      );
      return {
        type: "tool_result" as const,
        tool_use_id: block.id,
        content:
          overviewFiles.length > 0
            ? overviewFiles.join("\n")
            : "No overview files found",
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

  if (block.name === "glob") {
    const toolInput = block.input as { pattern: string; cwd?: string };
    try {
      const files = glob.sync(toolInput.pattern, {
        cwd: toolInput.cwd,
        absolute: true,
        nodir: true,
      });
      return {
        type: "tool_result" as const,
        tool_use_id: block.id,
        content:
          files.length > 0
            ? files.join("\n")
            : `No files found matching pattern: ${toolInput.pattern}`,
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

  if (block.name === "grep") {
    const toolInput = block.input as {
      pattern: string;
      path: string;
      filePattern?: string;
    };
    try {
      const stats = await fs.stat(toolInput.path);
      const regex = new RegExp(toolInput.pattern, "gm");
      const results: string[] = [];

      if (stats.isFile()) {
        // 単一ファイルの検索
        const content = await fs.readFile(toolInput.path, "utf-8");
        const lines = content.split("\n");
        lines.forEach((line, index) => {
          if (regex.test(line)) {
            results.push(`${toolInput.path}:${index + 1}:${line}`);
          }
        });
      } else if (stats.isDirectory()) {
        // ディレクトリ内のファイルを検索
        const pattern = toolInput.filePattern ?? "**/*";
        const files = glob.sync(pattern, {
          cwd: toolInput.path,
          absolute: true,
          nodir: true,
        });

        const searchResults = await Promise.all(
          files.map(async (file: string) => {
            try {
              const content = await fs.readFile(file, "utf-8");
              const lines = content.split("\n");
              const matches: string[] = [];
              lines.forEach((line, index) => {
                if (regex.test(line)) {
                  matches.push(`${file}:${index + 1}:${line}`);
                }
              });
              return matches;
            } catch {
              // Skip files that can't be read (binary, permission issues, etc.)
              return [];
            }
          }),
        );

        // Flatten results
        results.push(...searchResults.flat());
      }

      return {
        type: "tool_result" as const,
        tool_use_id: block.id,
        content:
          results.length > 0
            ? results.join("\n")
            : `No matches found for pattern: ${toolInput.pattern}`,
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
