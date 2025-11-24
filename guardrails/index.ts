#!/usr/bin/env node

/**
 * Guardrails MCP Server
 *
 * 三権分立システムのMCPサーバー
 * - Review (司法): Policyに基づいてコードを審査
 * - Procedure (行政): Policyに従って手順を実行 (将来対応)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as path from "path";
import { fileURLToPath } from "url";
import { z } from "zod";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import { handleReviewWebTests } from "./review/web/test-strategy";
import { handleReviewDomainModels } from "./review/server/domain-model";

// ESMで__dirnameを取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// guardrailsルートディレクトリ（index.tsの位置）
const GUARDRAILS_ROOT = __dirname;

/**
 * AWS Secrets ManagerからANTHROPIC_API_KEYを取得
 */
const loadSecretsFromAWS = async (): Promise<void> => {
  // 既に環境変数が設定されている場合はスキップ
  if (
    typeof process.env.ANTHROPIC_API_KEY === "string" &&
    process.env.ANTHROPIC_API_KEY !== ""
  ) {
    console.error("ANTHROPIC_API_KEYは既に環境変数に設定されています");
    return;
  }

  try {
    const client = new SecretsManagerClient({ region: "ap-northeast-1" });
    const command = new GetSecretValueCommand({
      SecretId: "sandbox-dev/ANTHROPIC_API_KEY",
    });

    const response = await client.send(command);

    if (
      typeof response.SecretString === "string" &&
      response.SecretString !== ""
    ) {
      // SecretStringがJSON形式の場合はパース
      try {
        const secret = JSON.parse(response.SecretString);
        process.env.ANTHROPIC_API_KEY = secret.ANTHROPIC_API_KEY;
        console.error(
          "ANTHROPIC_API_KEYをAWS Secrets Managerから読み込みました",
        );
      } catch {
        // JSON形式でない場合はそのまま使用
        process.env.ANTHROPIC_API_KEY = response.SecretString;
        console.error(
          "ANTHROPIC_API_KEYをAWS Secrets Managerから読み込みました",
        );
      }
    } else {
      throw new Error("SecretStringが空です");
    }
  } catch (error) {
    console.error("AWSからのシークレット読み込みに失敗しました:", error);
    throw new Error(
      "ANTHROPIC_API_KEYが必要ですが、環境変数またはAWS Secrets Managerに見つかりませんでした",
    );
  }
};

/**
 * MCPサーバーを起動
 */
const main = async (): Promise<void> => {
  // 起動時にAWS Secrets Managerからシークレットを取得
  await loadSecretsFromAWS();

  const server = new McpServer({
    name: "guardrails-mcp-server",
    version: "1.0.0",
  });

  // review_web_tests ツールを登録
  server.registerTool(
    "review_web_tests",
    {
      description:
        "作成・修正したフロントエンドのテストファイルがテスト戦略ポリシーに準拠しているかを審査します。対象：コンポーネントテスト（*.ct.test.tsx）、スナップショットテスト（*.ss.test.ts）",
      inputSchema: {
        targetFilePaths: z
          .array(z.string())
          .describe(
            "作成・修正したテストファイルの絶対パスの配列（例: ['/path/to/TodoForm.ct.test.tsx', '/path/to/TodoCard.ct.test.tsx']）",
          ),
      },
    },
    async ({ targetFilePaths }) => {
      try {
        const result = await handleReviewWebTests({
          targetFilePaths,
          guardrailsRoot: GUARDRAILS_ROOT,
          apiKey: process.env.ANTHROPIC_API_KEY ?? "",
        });

        return {
          content: [
            {
              type: "text",
              text: result,
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
              text: `エラー: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // review_domain_models ツールを登録
  server.registerTool(
    "review_domain_models",
    {
      description:
        "作成・修正したサーバー側のドメインモデルファイルがドメインモデルポリシーに準拠しているかを審査します。対象：エンティティ（*.ts）、リポジトリインターフェース（*-repository.ts）",
      inputSchema: {
        targetFilePaths: z
          .array(z.string())
          .describe(
            "作成・修正したドメインモデルファイルの絶対パスの配列（例: ['/path/to/server/src/domain/model/todo/todo.ts', '/path/to/server/src/domain/model/todo/todo-repository.ts']）",
          ),
      },
    },
    async ({ targetFilePaths }) => {
      try {
        const result = await handleReviewDomainModels({
          targetFilePaths,
          guardrailsRoot: GUARDRAILS_ROOT,
          apiKey: process.env.ANTHROPIC_API_KEY ?? "",
        });

        return {
          content: [
            {
              type: "text",
              text: result,
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
              text: `エラー: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // Stdio経由で通信
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("Guardrails MCPサーバーがstdio上で起動しました");
};

main().catch((error) => {
  console.error("致命的なエラー:", error);
  process.exit(1);
});
