/**
 * Review Module - MCP Tool Registration
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  buildUnifiedReviewResponsibility,
  createUnifiedReviewHandler,
  STATIC_ANALYSIS_RESPONSIBILITIES,
  createStaticAnalysisHandler,
  UNUSED_EXPORTS_RESPONSIBILITIES,
  createUnusedExportsHandler,
  INFRA_ANALYSIS_RESPONSIBILITIES,
  createInfraAnalysisHandler,
  CUSTOM_STATIC_ANALYSIS_RESPONSIBILITIES,
  createCustomStaticAnalysisHandler,
} from "./index.js";

/**
 * Register Review tools to MCP server
 */
export function registerReviewTools(
  server: McpServer,
  guardrailsRoot: string
): void {
  // Qualitative Review
  const qualitativeReview = buildUnifiedReviewResponsibility(guardrailsRoot);
  const qualitativeHandler = createUnifiedReviewHandler(qualitativeReview);

  server.registerTool(
    qualitativeReview.id,
    {
      description: qualitativeReview.toolDescription,
      inputSchema: qualitativeReview.inputSchema,
    },
    async ({ policyId, targetDirectories }): Promise<any> => {
      try {
        const result = await qualitativeHandler({
          policyId,
          targetDirectories,
          guardrailsRoot,
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
    }
  );

  // Static Analysis Review
  for (const responsibility of STATIC_ANALYSIS_RESPONSIBILITIES) {
    const handler = createStaticAnalysisHandler();

    server.registerTool(
      responsibility.id,
      {
        description: responsibility.toolDescription,
        inputSchema: responsibility.inputSchema,
      },
      async ({ workspace, targetDirectories, analysisType }): Promise<any> => {
        try {
          const result = await handler({
            workspace,
            targetDirectories,
            analysisType,
            guardrailsRoot,
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
      }
    );
  }

  // Unused Exports Detection
  for (const responsibility of UNUSED_EXPORTS_RESPONSIBILITIES) {
    const handler = createUnusedExportsHandler();

    server.registerTool(
      responsibility.id,
      {
        description: responsibility.toolDescription,
        inputSchema: responsibility.inputSchema,
      },
      async ({ workspace, targetDirectories }): Promise<any> => {
        try {
          const result = await handler({
            workspace,
            targetDirectories,
            guardrailsRoot,
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
      }
    );
  }

  // Infra Static Analysis
  for (const responsibility of INFRA_ANALYSIS_RESPONSIBILITIES) {
    const handler = createInfraAnalysisHandler();

    server.registerTool(
      responsibility.id,
      {
        description: responsibility.toolDescription,
        inputSchema: responsibility.inputSchema,
      },
      async ({ targetDirectory, analysisType }): Promise<any> => {
        try {
          const result = await handler({
            targetDirectory,
            analysisType,
            guardrailsRoot,
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
      }
    );
  }

  // Custom Static Analysis (TypeScript Compiler API)
  for (const responsibility of CUSTOM_STATIC_ANALYSIS_RESPONSIBILITIES) {
    const handler = createCustomStaticAnalysisHandler();

    server.registerTool(
      responsibility.id,
      {
        description: responsibility.toolDescription,
        inputSchema: responsibility.inputSchema,
      },
      async ({ workspace, targetDirectories }): Promise<any> => {
        try {
          const result = await handler({
            workspace,
            targetDirectories,
            guardrailsRoot,
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
      }
    );
  }
}
