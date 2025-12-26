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
    generateType: z.ZodDefault<
      z.ZodOptional<z.ZodEnum<["api-types", "mock", "all"]>>
    >;
  };
};

/**
 * コード生成責務定義
 */
export const CODEGEN_RESPONSIBILITIES: CodegenResponsibility[] = [
  {
    id: "procedure_codegen",
    toolDescription:
      "指定されたワークスペースでコード生成を実行します。API型生成（OpenAPIからの型生成）、モック生成などを行います。",
    inputSchema: {
      workspace: z
        .enum(["server", "web"])
        .describe(
          "生成対象のワークスペース: 'server'（サーバー側）、'web'（フロントエンド）",
        ),
      generateType: z
        .enum(["api-types", "mock", "all"])
        .optional()
        .default("all")
        .describe(
          "生成タイプ: 'api-types'（API型のみ）、'mock'（モックのみ）、'all'（全て）。デフォルトは 'all'。",
        ),
    },
  },
];
