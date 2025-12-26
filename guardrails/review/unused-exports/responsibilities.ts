/**
 * 未使用export検出責務定義
 */

import { z } from "zod";

/**
 * 未使用export検出責務定義
 */
export type UnusedExportsResponsibility = {
  /** 責務ID（ツール名に使用） */
  id: string;
  /** ツール説明 */
  toolDescription: string;
  /** 入力スキーマ */
  inputSchema: {
    workspace: z.ZodEnum<["server", "web"]>;
    targetDirectories: z.ZodOptional<z.ZodArray<z.ZodString>>;
  };
};

/**
 * 未使用export検出責務定義
 */
export const UNUSED_EXPORTS_RESPONSIBILITIES: UnusedExportsResponsibility[] = [
  {
    id: "review_unused_exports",
    toolDescription:
      "Detects unused exports in the specified workspace. Uses knip to find exported but unused functions, types, and variables.",
    inputSchema: {
      workspace: z
        .enum(["server", "web"])
        .describe(
          "Workspace to run detection: 'server' (server-side), 'web' (frontend)",
        ),
      targetDirectories: z
        .array(z.string())
        .optional()
        .describe(
          "Array of absolute paths to filter (if omitted, all files are targeted)",
        ),
    },
  },
];
