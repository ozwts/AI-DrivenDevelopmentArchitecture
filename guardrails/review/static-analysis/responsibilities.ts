/**
 * 静的解析責務定義
 */

import { z } from "zod";

/**
 * 静的解析責務定義
 */
export type StaticAnalysisResponsibility = {
  /** 責務ID（ツール名に使用） */
  id: string;
  /** ツール説明 */
  toolDescription: string;
  /** 入力スキーマ */
  inputSchema: {
    workspace: z.ZodEnum<["server", "web"]>;
    targetDirectories: z.ZodArray<z.ZodString>;
    analysisType: z.ZodDefault<
      z.ZodOptional<z.ZodEnum<["type-check", "lint", "both"]>>
    >;
  };
};

/**
 * 静的解析責務定義
 */
export const STATIC_ANALYSIS_RESPONSIBILITIES: StaticAnalysisResponsibility[] =
  [
    {
      id: "review_static_analysis",
      toolDescription:
        "指定されたワークスペースの静的解析を実行します。TypeScript型チェック（tsc --noEmit）、ESLint（eslint --format json）、または両方を選択できます。型チェックはプロジェクト全体、Lintは指定ディレクトリ配下のファイルをチェックします。",
      inputSchema: {
        workspace: z
          .enum(["server", "web"])
          .describe(
            "静的解析を実行するワークスペース: 'server'（サーバー側）、'web'（フロントエンド側）",
          ),
        targetDirectories: z
          .array(z.string())
          .describe(
            "レビュー対象ディレクトリの絶対パスの配列（例: ['/path/to/server/src/domain/model']）",
          ),
        analysisType: z
          .enum(["type-check", "lint", "both"])
          .optional()
          .default("both")
          .describe(
            "実行する解析タイプ: 'type-check'（型チェックのみ）、'lint'（Lintのみ）、'both'（両方）。デフォルトは 'both'。",
          ),
      },
    },
  ];
