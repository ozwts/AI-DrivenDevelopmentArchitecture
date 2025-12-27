/**
 * 自動修正責務定義
 */

import { z } from "zod";

/**
 * 自動修正責務（統合版）
 */
export type FixResponsibility = {
  id: string;
  toolDescription: string;
  inputSchema: {
    workspace: z.ZodEnum<["server", "web", "infra"]>;
    fixType?: z.ZodDefault<
      z.ZodOptional<z.ZodEnum<["lint", "format", "knip", "all"]>>
    >;
  };
};

/**
 * 自動修正責務定義（統合版）
 *
 * 3ツールを1つに統合:
 * - workspace: server | web | infra
 * - fixType: lint | format | knip | all (infraでは無視)
 *
 * 利用するnpm scripts:
 * - server: npm run fix:lint, npm run fix:format, npm run fix:knip
 * - web: npm run fix:lint, npm run fix:format, npm run fix:knip
 * - infra: npm run fix (terraform fmt)
 */
export const FIX_RESPONSIBILITIES: FixResponsibility[] = [
  {
    id: "procedure_fix",
    toolDescription:
      "Runs auto-fix. workspace: 'server'/'web' (ESLint --fix, Prettier, knip), 'infra' (terraform fmt). fixType applies to server/web only.",
    inputSchema: {
      workspace: z
        .enum(["server", "web", "infra"])
        .describe("Target workspace: server, web, infra"),
      fixType: z
        .enum(["lint", "format", "knip", "all"])
        .optional()
        .default("all")
        .describe(
          "Fix type for server/web: 'lint', 'format', 'knip', 'all' (default). Ignored for infra.",
        ),
    },
  },
];
