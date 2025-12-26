/**
 * 自動修正責務定義
 */

import { z } from "zod";

/**
 * 自動修正責務
 */
export type FixResponsibility = {
  id: string;
  toolDescription: string;
  inputSchema: {
    fixType?: z.ZodDefault<z.ZodOptional<z.ZodEnum<["lint", "format", "all"]>>>;
    targetPath?: z.ZodOptional<z.ZodString>;
  };
};

/**
 * 自動修正責務定義
 */
export const FIX_RESPONSIBILITIES: FixResponsibility[] = [
  {
    id: "procedure_fix_server",
    toolDescription:
      "サーバー側（server）で自動修正を実行します。ESLint --fixを実行します。",
    inputSchema: {
      fixType: z
        .enum(["lint", "format", "all"])
        .optional()
        .default("all")
        .describe(
          "修正タイプ: 'lint'（Lint修正のみ）、'format'（フォーマットのみ）、'all'（全て）。デフォルトは 'all'。",
        ),
      targetPath: z
        .string()
        .optional()
        .describe("修正対象のパス（省略時はワークスペース全体）"),
    },
  },
  {
    id: "procedure_fix_web",
    toolDescription:
      "フロントエンド側（web）で自動修正を実行します。ESLint --fixを実行します。",
    inputSchema: {
      fixType: z
        .enum(["lint", "format", "all"])
        .optional()
        .default("all")
        .describe(
          "修正タイプ: 'lint'（Lint修正のみ）、'format'（フォーマットのみ）、'all'（全て）。デフォルトは 'all'。",
        ),
      targetPath: z
        .string()
        .optional()
        .describe("修正対象のパス（省略時はワークスペース全体）"),
    },
  },
  {
    id: "procedure_fix_infra",
    toolDescription:
      "インフラ側（infra）で自動修正を実行します。terraform fmtを実行します。",
    inputSchema: {
      targetPath: z
        .string()
        .optional()
        .describe("修正対象のパス（省略時はワークスペース全体）"),
    },
  },
];
