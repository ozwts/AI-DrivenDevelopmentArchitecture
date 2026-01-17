/**
 * ポリシーリスト責務定義
 */

import { z } from "zod";

/**
 * ポリシーリスト責務定義
 */
export type ListPoliciesResponsibility = {
  /** 責務ID（ツール名に使用） */
  id: string;
  /** ツール説明 */
  toolDescription: string;
  /** 入力スキーマ */
  inputSchema: {
    type?: z.ZodOptional<z.ZodEnum<["static", "semantic"]>>;
  };
};

/**
 * Horizontal ポリシーリスト責務
 */
export const LIST_HORIZONTAL_POLICIES_RESPONSIBILITY: ListPoliciesResponsibility =
  {
    id: "policy_list_horizontal",
    toolDescription:
      "List all available horizontal policies (workspaces, layers, and checks). Horizontal policies are organized by workspace (server/web/infra) and layer (domain-model, use-case, etc.). Use this to discover what checks are available before running review_horizontal_static or review_horizontal_semantic.",
    inputSchema: {
      type: z
        .enum(["static", "semantic"])
        .optional()
        .describe(
          "Filter by policy type: 'static' (TypeScript Compiler API checks) or 'semantic' (generated semantic checks). If omitted, both types are shown."
        ),
    },
  };

/**
 * Vertical ポリシーリスト責務
 */
export const LIST_VERTICAL_POLICIES_RESPONSIBILITY: ListPoliciesResponsibility =
  {
    id: "policy_list_vertical",
    toolDescription:
      "List all available vertical policies. Vertical policies are cross-cutting concerns that span multiple layers. Use this to discover what vertical checks are available.",
    inputSchema: {
      type: z
        .enum(["static", "semantic"])
        .optional()
        .describe(
          "Filter by policy type: 'semantic' (business rules), 'static' (structural checks), or 'test' (test policies). If omitted, all types are shown."
        ),
    },
  };
