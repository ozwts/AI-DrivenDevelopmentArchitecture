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
      "指定されたワークスペースでコード生成を実行します。OpenAPIからの型生成（openapi-zod-client）を行います。",
    inputSchema: {
      workspace: z
        .enum(["server", "web"])
        .describe(
          "生成対象のワークスペース: 'server'（サーバー側）、'web'（フロントエンド）",
        ),
    },
  },
];
