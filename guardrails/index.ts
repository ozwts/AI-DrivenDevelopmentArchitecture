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
  buildReviewResponsibilities,
  createReviewHandler,
  STATIC_ANALYSIS_RESPONSIBILITIES,
  createStaticAnalysisHandler,
  UNUSED_EXPORTS_RESPONSIBILITIES,
  createUnusedExportsHandler,
} from "./review";
import { DEV_SERVER_RESPONSIBILITIES, TEST_RESPONSIBILITIES } from "./procedure";

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
  // policy/配下のmeta.jsonから動的にツールを登録
  // 新しいレビュー責務を追加する場合は、meta.jsonを配置しREVIEWABLE_*_POLICIESに追加するだけで自動登録されます
  //
  // 例: review_server_domain_model, review_server_use_case
  const reviewResponsibilities = buildReviewResponsibilities(GUARDRAILS_ROOT);
  for (const responsibility of reviewResponsibilities) {
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

  // ----- 未使用export検出 (Unused Exports Detection) -----
  // knipを使用した未使用export検出
  // 責務定義（review/responsibilities.ts）から動的にツールを登録
  //
  // 例: review_unused_exports
  for (const responsibility of UNUSED_EXPORTS_RESPONSIBILITIES) {
    const handler = createUnusedExportsHandler();

    server.registerTool(
      responsibility.id,
      {
        description: responsibility.toolDescription,
        inputSchema: responsibility.inputSchema,
      },
      async ({ workspace, targetDirectories }) => {
        try {
          const result = await handler({
            workspace,
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

  // ========================================
  // Procedure (行政): ポリシーに従った手順実行
  // ========================================

  // プロジェクトルートディレクトリ（guardrailsの親）
  const PROJECT_ROOT = path.dirname(GUARDRAILS_ROOT);

  // ----- 開発サーバー管理 (Dev Server Management) -----
  // 開発サーバーの起動・停止・状態確認・ログ取得
  for (const responsibility of DEV_SERVER_RESPONSIBILITIES) {
    server.registerTool(
      responsibility.id,
      {
        description: responsibility.toolDescription,
        inputSchema: responsibility.inputSchema,
      },
      async (input: Record<string, unknown>) => {
        try {
          const result = await responsibility.handler(input, PROJECT_ROOT);
          return {
            content: [
              {
                type: "text" as const,
                text: result,
              },
            ],
          };
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          return {
            content: [
              {
                type: "text" as const,
                text: `エラー: ${msg}`,
              },
            ],
            isError: true,
          };
        }
      },
    );
  }

  // ----- テスト実行管理 (Test Runner Management) -----
  // テストの実行・結果取得
  for (const responsibility of TEST_RESPONSIBILITIES) {
    server.registerTool(
      responsibility.id,
      {
        description: responsibility.toolDescription,
        inputSchema: responsibility.inputSchema,
      },
      async (input: Record<string, unknown>) => {
        try {
          const result = await responsibility.handler(input, PROJECT_ROOT);
          return {
            content: [
              {
                type: "text" as const,
                text: result,
              },
            ],
          };
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          return {
            content: [
              {
                type: "text" as const,
                text: `エラー: ${msg}`,
              },
            ],
            isError: true,
          };
        }
      },
    );
  }

  // Stdio経由で通信
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("Guardrails MCPサーバーがstdio上で起動しました");
};

main().catch((error) => {
  console.error("致命的なエラー:", error);
  process.exit(1);
});
