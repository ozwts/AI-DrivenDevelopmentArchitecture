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
  buildUnifiedReviewResponsibility,
  createUnifiedReviewHandler,
  STATIC_ANALYSIS_RESPONSIBILITIES,
  createStaticAnalysisHandler,
  UNUSED_EXPORTS_RESPONSIBILITIES,
  createUnusedExportsHandler,
  INFRA_ANALYSIS_RESPONSIBILITIES,
  createInfraAnalysisHandler,
} from "./review";
import {
  DEV_SERVER_RESPONSIBILITIES,
  TEST_RESPONSIBILITIES,
  FIX_RESPONSIBILITIES,
  CODEGEN_RESPONSIBILITIES,
  DEPLOY_RESPONSIBILITIES,
} from "./procedure";
import { executeDeploy, type DeployAction, type DeployTarget } from "./procedure/deploy/deployer";
import { formatDeployResult } from "./procedure/deploy/formatter";
import { executeFix, type FixType, type FixWorkspace } from "./procedure/fix/fixer";
import { formatFixResult } from "./procedure/fix/formatter";
import { executeGenerate, type GenerateWorkspace } from "./procedure/codegen/generator";
import { formatGenerateResult } from "./procedure/codegen/formatter";

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
  // policy/配下のmeta.jsonから動的にスキャンし、単一ツールに統合
  // 新しいレビュー責務を追加する場合は、meta.jsonを配置するだけで自動認識
  const qualitativeReview = buildUnifiedReviewResponsibility(GUARDRAILS_ROOT);
  const qualitativeHandler = createUnifiedReviewHandler(qualitativeReview);

  server.registerTool(
    qualitativeReview.id,
    {
      description: qualitativeReview.toolDescription,
      inputSchema: qualitativeReview.inputSchema,
    },
    async ({ policyId, targetDirectories }) => {
      try {
        const result = await qualitativeHandler({
          policyId,
          targetDirectories,
          guardrailsRoot: GUARDRAILS_ROOT,
        });

        return {
          content: [{ type: "text", text: result }],
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `エラー: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );

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

  // ----- インフラ静的解析 (Infra Static Analysis) -----
  // Terraform環境のフォーマット・Lint・セキュリティスキャン
  // 責務定義（review/static-analysis-infra/responsibilities.ts）から動的にツールを登録
  //
  // 例: review_infra_static_analysis
  for (const responsibility of INFRA_ANALYSIS_RESPONSIBILITIES) {
    const handler = createInfraAnalysisHandler();

    server.registerTool(
      responsibility.id,
      {
        description: responsibility.toolDescription,
        inputSchema: responsibility.inputSchema,
      },
      async ({ targetDirectory, analysisType }) => {
        try {
          const result = await handler({
            targetDirectory,
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

  // ----- 自動修正管理 (Auto Fix Management) -----
  // ESLint --fix、Prettier、terraform fmt、knipによる自動修正
  // 統合版: workspace（server/web/infra）をパラメータで指定
  for (const responsibility of FIX_RESPONSIBILITIES) {
    server.registerTool(
      responsibility.id,
      {
        description: responsibility.toolDescription,
        inputSchema: responsibility.inputSchema,
      },
      async (input: Record<string, unknown>) => {
        try {
          const workspace = input.workspace as FixWorkspace;
          const fixType = (input.fixType as FixType | undefined) ?? "all";

          const result = await executeFix({
            workspace,
            fixType,
            projectRoot: PROJECT_ROOT,
          });

          return {
            content: [
              {
                type: "text" as const,
                text: formatFixResult(result),
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

  // ----- コード生成管理 (Code Generation Management) -----
  // OpenAPI型生成
  for (const responsibility of CODEGEN_RESPONSIBILITIES) {
    server.registerTool(
      responsibility.id,
      {
        description: responsibility.toolDescription,
        inputSchema: responsibility.inputSchema,
      },
      async (input: Record<string, unknown>) => {
        try {
          const workspace = input.workspace as GenerateWorkspace;

          const result = await executeGenerate({
            workspace,
            projectRoot: PROJECT_ROOT,
          });

          return {
            content: [
              {
                type: "text" as const,
                text: formatGenerateResult(result),
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

  // ----- デプロイ管理 (Deploy Management) -----
  // 開発環境へのTerraformデプロイ
  for (const responsibility of DEPLOY_RESPONSIBILITIES) {
    server.registerTool(
      responsibility.id,
      {
        description: responsibility.toolDescription,
        inputSchema: responsibility.inputSchema,
      },
      async (input: Record<string, unknown>) => {
        try {
          const action = input.action as DeployAction;
          const target = (input.target as DeployTarget | undefined) ?? "all";
          const useBranchEnv = (input.useBranchEnv as boolean | undefined) ?? false;
          const initialDeploy = (input.initialDeploy as boolean | undefined) ?? false;

          // 初回デプロイモード: 2段階デプロイを実行
          // 1. all: インフラ・API作成（API Gateway URL等がSSMに格納される）
          // 2. web: フロントエンド再ビルド（SSMから設定を取得してバンドル）
          if (initialDeploy && action === "deploy") {
            // Step 1: all target
            const step1Result = await executeDeploy({
              action,
              target: "all",
              projectRoot: PROJECT_ROOT,
              useBranchEnv,
            });

            if (!step1Result.success) {
              return {
                content: [
                  {
                    type: "text" as const,
                    text: formatDeployResult(step1Result),
                  },
                ],
              };
            }

            // Step 2: web target（SSM設定を取得してフロントエンドを再ビルド）
            const step2Result = await executeDeploy({
              action,
              target: "web",
              projectRoot: PROJECT_ROOT,
              useBranchEnv,
            });

            // 両方の結果を結合して返す
            const combinedOutput = [
              "## 初回デプロイ完了（2段階デプロイ）",
              "",
              "### Step 1: インフラ・API作成 (target=all)",
              formatDeployResult(step1Result),
              "",
              "### Step 2: フロントエンド再ビルド (target=web)",
              formatDeployResult(step2Result),
            ].join("\n");

            return {
              content: [
                {
                  type: "text" as const,
                  text: combinedOutput,
                },
              ],
            };
          }

          // 通常デプロイ
          const result = await executeDeploy({
            action,
            target,
            projectRoot: PROJECT_ROOT,
            useBranchEnv,
          });

          return {
            content: [
              {
                type: "text" as const,
                text: formatDeployResult(result),
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
