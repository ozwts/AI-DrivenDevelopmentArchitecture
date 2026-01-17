/**
 * カスタム静的解析責務定義（TypeScript Compiler API）
 */

import { z } from "zod";

/**
 * カスタム静的解析責務定義
 */
export type CustomStaticAnalysisResponsibility = {
  /** 責務ID（ツール名に使用） */
  id: string;
  /** ツール説明 */
  toolDescription: string;
  /** 入力スキーマ */
  inputSchema: {
    workspace: z.ZodOptional<z.ZodEnum<["server", "web", "infra"]>>;
    targetDirectories: z.ZodArray<z.ZodString>;
  };
};

/**
 * カスタム静的解析責務定義
 */
export const CUSTOM_STATIC_ANALYSIS_RESPONSIBILITIES: CustomStaticAnalysisResponsibility[] =
  [
    {
      id: "review_custom_static_analysis",
      toolDescription:
        "Runs custom static analysis using TypeScript Compiler API. Dynamically loads policy checks from the specified workspace. If workspace is omitted, loads all workspaces (server, web, infra).",
      inputSchema: {
        workspace: z
          .enum(["server", "web", "infra"])
          .optional()
          .describe(
            "Workspace to run custom static analysis: 'server' (server-side), 'web' (frontend), 'infra' (infrastructure). If omitted, all workspaces are checked.",
          ),
        targetDirectories: z
          .array(z.string())
          .describe(
            "Array of absolute paths of target directories to review (e.g., ['/path/to/server/src/domain/model'])",
          ),
      },
    },
  ];
