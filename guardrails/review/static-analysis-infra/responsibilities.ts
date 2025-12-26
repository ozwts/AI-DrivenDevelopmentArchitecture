/**
 * インフラ静的解析責務定義
 */

import { z } from "zod";

/**
 * インフラ静的解析責務定義
 */
export type InfraAnalysisResponsibility = {
  /** 責務ID（ツール名に使用） */
  id: string;
  /** ツール説明 */
  toolDescription: string;
  /** 入力スキーマ */
  inputSchema: {
    targetDirectory: z.ZodString;
    analysisType: z.ZodDefault<
      z.ZodOptional<z.ZodEnum<["format", "lint", "security", "all"]>>
    >;
  };
};

/**
 * インフラ静的解析責務定義
 */
export const INFRA_ANALYSIS_RESPONSIBILITIES: InfraAnalysisResponsibility[] = [
  {
    id: "review_infra_static_analysis",
    toolDescription:
      "指定されたTerraform環境ディレクトリの静的解析を実行します。terraform fmt（フォーマットチェック）、TFLint（Lintチェック）、Trivy（セキュリティスキャン）、または全てを選択できます。",
    inputSchema: {
      targetDirectory: z
        .string()
        .describe(
          "解析対象のTerraform環境ディレクトリの絶対パス（例: '/path/to/infra/terraform/environments/dev'）",
        ),
      analysisType: z
        .enum(["format", "lint", "security", "all"])
        .optional()
        .default("all")
        .describe(
          "実行する解析タイプ: 'format'（terraform fmt）、'lint'（TFLint）、'security'（Trivy）、'all'（全て）。デフォルトは 'all'。",
        ),
    },
  },
];
