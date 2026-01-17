/**
 * Procedure Module - MCP Tool Registration
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  DEV_SERVER_RESPONSIBILITIES,
  TEST_RESPONSIBILITIES,
  FIX_RESPONSIBILITIES,
  CODEGEN_RESPONSIBILITIES,
  DEPLOY_RESPONSIBILITIES,
  WORKFLOW_RESPONSIBILITIES,
  CONTEXT_RESPONSIBILITIES,
} from "./index.js";
import {
  executeDeploy,
  type DeployAction,
  type DeployTarget,
} from "./deploy/deployer.js";
import { formatDeployResult } from "./deploy/formatter.js";
import { executeFix, type FixType, type FixWorkspace } from "./fix/fixer.js";
import { formatFixResult } from "./fix/formatter.js";
import {
  executeGenerate,
  type GenerateWorkspace,
} from "./codegen/generator.js";
import { formatGenerateResult } from "./codegen/formatter.js";

/**
 * Register Procedure tools to MCP server
 */
export function registerProcedureTools(
  server: McpServer,
  projectRoot: string,
  guardrailsRoot: string
): void {
  // Dev Server Management
  for (const responsibility of DEV_SERVER_RESPONSIBILITIES) {
    server.registerTool(
      responsibility.id,
      {
        description: responsibility.toolDescription,
        inputSchema: responsibility.inputSchema,
      },
      async (input: Record<string, unknown>): Promise<any> => {
        try {
          const result = await responsibility.handler(input, projectRoot);
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
      }
    );
  }

  // Test Runner Management
  for (const responsibility of TEST_RESPONSIBILITIES) {
    server.registerTool(
      responsibility.id,
      {
        description: responsibility.toolDescription,
        inputSchema: responsibility.inputSchema,
      },
      async (input: Record<string, unknown>): Promise<any> => {
        try {
          const result = await responsibility.handler(input, projectRoot);
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
      }
    );
  }

  // Auto Fix Management
  for (const responsibility of FIX_RESPONSIBILITIES) {
    server.registerTool(
      responsibility.id,
      {
        description: responsibility.toolDescription,
        inputSchema: responsibility.inputSchema,
      },
      async (input: Record<string, unknown>): Promise<any> => {
        try {
          const workspace = input.workspace as FixWorkspace;
          const fixType = (input.fixType as FixType | undefined) ?? "all";

          const result = await executeFix({
            workspace,
            fixType,
            projectRoot,
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
      }
    );
  }

  // Code Generation Management
  for (const responsibility of CODEGEN_RESPONSIBILITIES) {
    server.registerTool(
      responsibility.id,
      {
        description: responsibility.toolDescription,
        inputSchema: responsibility.inputSchema,
      },
      async (input: Record<string, unknown>): Promise<any> => {
        try {
          const workspace = input.workspace as GenerateWorkspace;

          const result = await executeGenerate({
            workspace,
            projectRoot,
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
      }
    );
  }

  // Deploy Management
  for (const responsibility of DEPLOY_RESPONSIBILITIES) {
    server.registerTool(
      responsibility.id,
      {
        description: responsibility.toolDescription,
        inputSchema: responsibility.inputSchema,
      },
      async (input: Record<string, unknown>): Promise<any> => {
        try {
          const action = input.action as DeployAction;
          const target = (input.target as DeployTarget | undefined) ?? "all";
          const useBranchEnv =
            (input.useBranchEnv as boolean | undefined) ?? false;
          const initialDeploy =
            (input.initialDeploy as boolean | undefined) ?? false;

          // 初回デプロイモード: 2段階デプロイを実行
          if (initialDeploy && action === "deploy") {
            // Step 1: all target
            const step1Result = await executeDeploy({
              action,
              target: "all",
              projectRoot,
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

            // Step 2: web target
            const step2Result = await executeDeploy({
              action,
              target: "web",
              projectRoot,
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
            projectRoot,
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
      }
    );
  }

  // Workflow Management
  for (const responsibility of WORKFLOW_RESPONSIBILITIES) {
    server.registerTool(
      responsibility.id,
      {
        description: responsibility.toolDescription,
        inputSchema: responsibility.inputSchema,
      },
      async (input: Record<string, unknown>): Promise<any> => {
        try {
          const result = await responsibility.handler(input, guardrailsRoot);
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
      }
    );
  }

  // Context Restoration
  for (const responsibility of CONTEXT_RESPONSIBILITIES) {
    server.registerTool(
      responsibility.id,
      {
        description: responsibility.toolDescription,
        inputSchema: responsibility.inputSchema,
      },
      async (input: Record<string, unknown>): Promise<any> => {
        try {
          const result = await responsibility.handler(input, guardrailsRoot);
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
      }
    );
  }
}
