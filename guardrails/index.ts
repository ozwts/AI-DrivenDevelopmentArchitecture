#!/usr/bin/env node

/**
 * Guardrails MCP Server
 *
 * 三権分立システムのMCPサーバー
 * - Review (司法): Policyに基づいてコードを審査
 * - Procedure (行政): Policyに従って手順を実行 (将来対応)
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as path from "path";
import { fileURLToPath } from "url";
import { prepareReview } from "./review/web/test-strategy/review-executor.js";
import { reviewFilesInParallel, ParallelReviewResult } from "./review/web/test-strategy/parallel-reviewer.js";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

// ESMで__dirnameを取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// guardrailsルートディレクトリ（index.tsの位置）
const GUARDRAILS_ROOT = __dirname;

/**
 * レビュー結果を整形
 */
function formatReviewResults(result: ParallelReviewResult): string {
  const { results, summary } = result;

  let output = `# Parallel Review Results\n\n`;
  output += `## Summary\n\n`;
  output += `- Total files: ${summary.total}\n`;
  output += `- Successful: ${summary.successful}\n`;
  output += `- Failed: ${summary.failed}\n\n`;
  output += `---\n\n`;

  results.forEach((r, index) => {
    output += `## File ${index + 1}: ${r.filePath}\n\n`;

    if (r.success) {
      output += `### Policies Applied\n\n`;
      r.policies.forEach((p) => {
        output += `- ${p}\n`;
      });
      output += `\n### Review\n\n${r.review}\n\n`;
    } else {
      output += `### Error\n\n${r.error}\n\n`;
    }

    output += `---\n\n`;
  });

  return output;
}

/**
 * AWS Secrets ManagerからANTHROPIC_API_KEYを取得
 */
async function loadSecretsFromAWS(): Promise<void> {
  // 既に環境変数が設定されている場合はスキップ
  if (process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY already set in environment");
    return;
  }

  try {
    const client = new SecretsManagerClient({ region: "ap-northeast-1" });
    const command = new GetSecretValueCommand({
      SecretId: "sandbox-dev/ANTHROPIC_API_KEY",
    });

    const response = await client.send(command);

    if (response.SecretString) {
      // SecretStringがJSON形式の場合はパース
      try {
        const secret = JSON.parse(response.SecretString);
        process.env.ANTHROPIC_API_KEY = secret.ANTHROPIC_API_KEY;
        console.error("ANTHROPIC_API_KEY loaded from AWS Secrets Manager");
      } catch {
        // JSON形式でない場合はそのまま使用
        process.env.ANTHROPIC_API_KEY = response.SecretString;
        console.error("ANTHROPIC_API_KEY loaded from AWS Secrets Manager");
      }
    } else {
      throw new Error("SecretString is empty");
    }
  } catch (error) {
    console.error("Failed to load secrets from AWS:", error);
    throw new Error("ANTHROPIC_API_KEY is required but not found in environment or AWS Secrets Manager");
  }
}

/**
 * MCPサーバーを起動
 */
async function main() {
  // 起動時にAWS Secrets Managerからシークレットを取得
  await loadSecretsFromAWS();

  const server = new Server(
    {
      name: "guardrails-mcp-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // ツール一覧を返す
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "review_with_policy",
          description:
            "Review code based on Guardrails policies. Automatically selects appropriate policies based on file type (*.ct.test.tsx or *.ss.test.ts) and loads them in parallel. Returns the review instruction for Claude to perform the review.",
          inputSchema: {
            type: "object",
            properties: {
              targetFilePath: {
                type: "string",
                description:
                  "Absolute path to the file to review (e.g., /path/to/TodoForm.ct.test.tsx)",
              },
            },
            required: ["targetFilePath"],
          },
        },
        {
          name: "review_files_parallel",
          description:
            "Review multiple files in parallel using Claude Agent SDK. Each file is reviewed based on its appropriate policies, and results are aggregated. Requires ANTHROPIC_API_KEY environment variable.",
          inputSchema: {
            type: "object",
            properties: {
              targetFilePaths: {
                type: "array",
                items: {
                  type: "string",
                },
                description:
                  "Array of absolute paths to files to review (e.g., ['/path/to/TodoForm.ct.test.tsx', '/path/to/TodoCard.ct.test.tsx'])",
              },
            },
            required: ["targetFilePaths"],
          },
        },
      ],
    };
  });

  // ツール実行
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (!args) {
      throw new Error("Arguments are required");
    }

    if (name === "review_with_policy") {
      const targetFilePath = args.targetFilePath as string;

      if (!targetFilePath) {
        throw new Error("targetFilePath is required");
      }

      try {
        const result = await prepareReview({
          targetFilePath,
          guardrailsRoot: GUARDRAILS_ROOT,
        });

        // MCPツールの戻り値として、レビュー用の指示を返す
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text",
              text: `Error: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    } else if (name === "review_files_parallel") {
      const targetFilePaths = args.targetFilePaths as string[];

      if (!targetFilePaths || !Array.isArray(targetFilePaths) || targetFilePaths.length === 0) {
        throw new Error("targetFilePaths is required and must be a non-empty array");
      }

      // API Keyを環境変数から取得
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error("ANTHROPIC_API_KEY environment variable is required");
      }

      try {
        const result = await reviewFilesInParallel({
          targetFilePaths,
          guardrailsRoot: GUARDRAILS_ROOT,
          apiKey,
        });

        // レビュー結果を整形して返す
        const formattedResult = formatReviewResults(result);

        return {
          content: [
            {
              type: "text",
              text: formattedResult,
            },
          ],
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text",
              text: `Error: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    }

    throw new Error(`Unknown tool: ${name}`);
  });

  // Stdio経由で通信
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("Guardrails MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
