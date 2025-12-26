/**
 * コード生成責務定義
 */

import { z } from "zod";

/**
 * コード生成責務
 */
export type CodegenResponsibility = {
  id: string;
  toolDescription: string;
  inputSchema: {
    workspace: z.ZodEnum<["server", "web"]>;
  };
};

/**
 * コード生成責務定義
 *
 * 利用するnpm scripts:
 * - server: npm run codegen -w server
 * - web: npm run codegen -w web
 */
export const CODEGEN_RESPONSIBILITIES: CodegenResponsibility[] = [
  {
    id: "procedure_codegen",
    toolDescription:
      "Runs code generation on specified workspace. Generates types from OpenAPI (openapi-zod-client).",
    inputSchema: {
      workspace: z
        .enum(["server", "web"])
        .describe(
          "Target workspace: 'server' (server-side), 'web' (frontend)",
        ),
    },
  },
];
