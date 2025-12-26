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
    fixType?: z.ZodDefault<
      z.ZodOptional<z.ZodEnum<["lint", "format", "knip", "all"]>>
    >;
  };
};

/**
 * 自動修正責務定義
 *
 * 利用するnpm scripts:
 * - server: npm run fix:lint, npm run fix:format, npm run validate:knip
 * - web: npm run fix:lint, npm run fix:format, npm run validate:knip
 * - infra: npm run fix (terraform fmt)
 */
export const FIX_RESPONSIBILITIES: FixResponsibility[] = [
  {
    id: "procedure_fix_server",
    toolDescription:
      "サーバー側（server）で自動修正を実行します。ESLint --fix、Prettier、knip（未使用export検出）を実行します。",
    inputSchema: {
      fixType: z
        .enum(["lint", "format", "knip", "all"])
        .optional()
        .default("all")
        .describe(
          "修正タイプ: 'lint'（Lint修正のみ）、'format'（フォーマットのみ）、'knip'（未使用export検出）、'all'（lint+format）。デフォルトは 'all'。",
        ),
    },
  },
  {
    id: "procedure_fix_web",
    toolDescription:
      "フロントエンド側（web）で自動修正を実行します。ESLint --fix、Prettier、knip（未使用export検出）を実行します。",
    inputSchema: {
      fixType: z
        .enum(["lint", "format", "knip", "all"])
        .optional()
        .default("all")
        .describe(
          "修正タイプ: 'lint'（Lint修正のみ）、'format'（フォーマットのみ）、'knip'（未使用export検出）、'all'（lint+format）。デフォルトは 'all'。",
        ),
    },
  },
  {
    id: "procedure_fix_infra",
    toolDescription:
      "インフラ側（infra）で自動修正を実行します。terraform fmtを実行します。",
    inputSchema: {},
  },
];
