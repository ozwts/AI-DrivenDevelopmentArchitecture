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
    workspace: z.ZodEnum<["server", "web", "all"]>;
  };
};

/**
 * コード生成責務定義
 *
 * 利用するnpm scripts:
 * - all: npm run codegen（bundle + server + web）
 * - server: npm run codegen -w server（内部でbundle実行）
 * - web: npm run codegen -w web（内部でbundle実行）
 *
 * 注意: 各ワークスペースのcodegenスクリプトは内部でcodegen:bundleを先に実行するため、
 * どのワークスペースを指定しても常にOpenAPI結合が行われる
 */
export const CODEGEN_RESPONSIBILITIES: CodegenResponsibility[] = [
  {
    id: "procedure_codegen",
    toolDescription:
      "Runs code generation on specified workspace. Generates types from OpenAPI (openapi-zod-client). 'all' runs bundle + both workspaces.",
    inputSchema: {
      workspace: z
        .enum(["server", "web", "all"])
        .describe(
          "Target workspace: 'server' (server-side), 'web' (frontend), 'all' (bundle + both)",
        ),
    },
  },
];
