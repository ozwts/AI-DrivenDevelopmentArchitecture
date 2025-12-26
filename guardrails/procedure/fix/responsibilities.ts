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
      "Runs auto-fix on server side. ESLint --fix, Prettier, knip (unused export detection).",
    inputSchema: {
      fixType: z
        .enum(["lint", "format", "knip", "all"])
        .optional()
        .default("all")
        .describe(
          "Fix type: 'lint' (lint only), 'format' (format only), 'knip' (unused exports), 'all' (lint+format). Default: 'all'.",
        ),
    },
  },
  {
    id: "procedure_fix_web",
    toolDescription:
      "Runs auto-fix on web side. ESLint --fix, Prettier, knip (unused export detection).",
    inputSchema: {
      fixType: z
        .enum(["lint", "format", "knip", "all"])
        .optional()
        .default("all")
        .describe(
          "Fix type: 'lint' (lint only), 'format' (format only), 'knip' (unused exports), 'all' (lint+format). Default: 'all'.",
        ),
    },
  },
  {
    id: "procedure_fix_infra",
    toolDescription:
      "Runs auto-fix on infra side. Executes terraform fmt.",
    inputSchema: {},
  },
];
