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
 * MCPサーバーを起動
 */
const main = async (): Promise<void> => {
  const server = new McpServer({
    name: "guardrails-mcp-server",
    version: "1.0.0",
  });

  // ========================================
  // Review (司法): ポリシーに基づくコードレビュー
  // ========================================

  // ----- 定性的レビュー (Qualitative Review) -----
  // サブエージェント起動を促すガイダンスメッセージを返す
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
      async ({ targetDirectories }) => {
        try {
          const result = await handler({
            targetDirectories,
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
      async ({ workspace, targetDirectories, analysisType }) => {
        try {
          const result = await handler({
            workspace,
            targetDirectories,
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
