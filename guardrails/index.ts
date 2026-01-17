#!/usr/bin/env node

/**
 * Guardrails MCP Server
 *
 * 三権分立システムのMCPサーバー
 * - Policy (立法): ポリシーの定義と一覧
 * - Procedure (行政): Policyに従って手順を実行
 * - Review (司法): Policyに基づいてコードを審査
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as path from "path";
import { fileURLToPath } from "url";
import { registerPolicyTools } from "./policy/register-tools.js";
import { registerReviewTools } from "./review/register-tools.js";
import { registerProcedureTools } from "./procedure/register-tools.js";

// ESMで__dirnameを取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// guardrailsルートディレクトリ（index.tsの位置）
const GUARDRAILS_ROOT = __dirname;

// プロジェクトルートディレクトリ（guardrailsの親）
const PROJECT_ROOT = path.dirname(GUARDRAILS_ROOT);

/**
 * MCPサーバーを起動
 */
const main = async (): Promise<void> => {
  const server = new McpServer({
    name: "guardrails-mcp-server",
    version: "1.0.0",
  });

  // Register tools from each module
  registerPolicyTools(server, GUARDRAILS_ROOT);
  registerReviewTools(server, GUARDRAILS_ROOT);
  registerProcedureTools(server, PROJECT_ROOT, GUARDRAILS_ROOT);

  // Stdio経由で通信
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("Guardrails MCPサーバーがstdio上で起動しました");
};

main().catch((error) => {
  console.error("致命的なエラー:", error);
  process.exit(1);
});
