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
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import { createReviewHandler } from "./review/review-handler";
import {
  REVIEW_RESPONSIBILITIES,
  STATIC_ANALYSIS_RESPONSIBILITIES,
} from "./review/responsibilities";
import { createStaticAnalysisHandler } from "./review/static-analysis-handler";

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

  // ========================================
  // Review (司法): ポリシーに基づくコードレビュー
  // ========================================

  // ----- 定性的レビュー (Qualitative Review) -----
  // LLMを使用したポリシーベースのコードレビュー
  // 責務定義（review/responsibilities.ts）から動的にツールを登録
  // 新しいレビュー責務を追加する場合は、responsibilities.ts に定義を追加するだけで自動登録されます
  //
  // 例: review_server_domain_models, review_web_tests
  for (const responsibility of REVIEW_RESPONSIBILITIES) {
    const handler = createReviewHandler(responsibility);

    server.registerTool(
      responsibility.id,
      {
        description: responsibility.toolDescription,
        inputSchema: responsibility.inputSchema,
      },
      async ({ targetFilePaths }) => {
        try {
          const result = await handler({
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
  }

  // ----- 静的解析レビュー (Static Analysis Review) -----
  // TypeScript型チェック・ESLintによる静的解析
  // 責務定義（review/responsibilities.ts）から動的にツールを登録
  //
  // 例: review_server_static_analysis
  for (const responsibility of STATIC_ANALYSIS_RESPONSIBILITIES) {
    const handler = createStaticAnalysisHandler();

    server.registerTool(
      responsibility.id,
      {
        description: responsibility.toolDescription,
        inputSchema: responsibility.inputSchema,
      },
      async ({ workspace, targetFilePaths, analysisType }) => {
        try {
          const result = await handler({
            workspace,
            targetFilePaths,
            analysisType,
            guardrailsRoot: GUARDRAILS_ROOT,
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
  }

  // ========================================
  // Procedure (行政): ポリシーに従った手順実行
  // ========================================
  // TODO: 将来実装予定
  // ポリシーに定義された手順を自動実行するツールを登録
  // 例: execute_migration_procedure, execute_deployment_procedure, etc.

  // Stdio経由で通信
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("Guardrails MCPサーバーがstdio上で起動しました");
};

main().catch((error) => {
  console.error("致命的なエラー:", error);
  process.exit(1);
});
