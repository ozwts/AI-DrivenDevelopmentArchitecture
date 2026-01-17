/**
 * Policy Module - MCP Tool Registration
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  LIST_HORIZONTAL_POLICIES_RESPONSIBILITY,
  LIST_VERTICAL_POLICIES_RESPONSIBILITY,
} from "./responsibilities.js";
import {
  createListHorizontalPoliciesHandler,
  createListVerticalPoliciesHandler,
} from "./handler.js";

/**
 * Register Policy tools to MCP server
 */
export function registerPolicyTools(
  server: McpServer,
  guardrailsRoot: string
): void {
  // Horizontal Policies
  const horizontalHandler = createListHorizontalPoliciesHandler();
  server.registerTool(
    LIST_HORIZONTAL_POLICIES_RESPONSIBILITY.id,
    {
      description: LIST_HORIZONTAL_POLICIES_RESPONSIBILITY.toolDescription,
      inputSchema: LIST_HORIZONTAL_POLICIES_RESPONSIBILITY.inputSchema,
    },
    async (input: Record<string, unknown>): Promise<any> => {
      try {
        const type = input.type as "static" | "semantic" | undefined;
        const result = await horizontalHandler({
          type,
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

  // Vertical Policies
  const verticalHandler = createListVerticalPoliciesHandler();
  server.registerTool(
    LIST_VERTICAL_POLICIES_RESPONSIBILITY.id,
    {
      description: LIST_VERTICAL_POLICIES_RESPONSIBILITY.toolDescription,
      inputSchema: LIST_VERTICAL_POLICIES_RESPONSIBILITY.inputSchema,
    },
    async (input: Record<string, unknown>): Promise<any> => {
      try {
        const type = input.type as "static" | "semantic" | undefined;
        const result = await verticalHandler({
          type,
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
