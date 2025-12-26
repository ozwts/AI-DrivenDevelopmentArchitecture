/**
 * 静的解析責務定義
 */

import { z } from "zod";

/**
 * 静的解析責務定義
 */
export type StaticAnalysisResponsibility = {
  /** 責務ID（ツール名に使用） */
  id: string;
  /** ツール説明 */
  toolDescription: string;
  /** 入力スキーマ */
  inputSchema: {
    workspace: z.ZodEnum<["server", "web"]>;
    targetDirectories: z.ZodArray<z.ZodString>;
    analysisType: z.ZodDefault<
      z.ZodOptional<z.ZodEnum<["type-check", "lint", "both"]>>
    >;
  };
};

/**
 * 静的解析責務定義
 */
export const STATIC_ANALYSIS_RESPONSIBILITIES: StaticAnalysisResponsibility[] =
  [
    {
      id: "review_static_analysis",
      toolDescription:
        "Runs static analysis on the specified workspace. TypeScript type checking (tsc --noEmit), ESLint (eslint --format json), or both. Type check runs on entire project, Lint checks files under specified directories.",
      inputSchema: {
        workspace: z
          .enum(["server", "web"])
          .describe(
            "Workspace to run static analysis: 'server' (server-side), 'web' (frontend)",
          ),
        targetDirectories: z
          .array(z.string())
          .describe(
            "Array of absolute paths of target directories to review (e.g., ['/path/to/server/src/domain/model'])",
          ),
        analysisType: z
          .enum(["type-check", "lint", "both"])
          .optional()
          .default("both")
          .describe(
            "Analysis type: 'type-check' (type check only), 'lint' (lint only), 'both' (both). Default is 'both'.",
          ),
      },
    },
  ];
