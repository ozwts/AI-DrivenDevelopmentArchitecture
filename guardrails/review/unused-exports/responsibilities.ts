/**
 * 未使用export検出責務定義
 */

import { z } from "zod";

/**
 * 未使用export検出責務定義
 */
export type UnusedExportsResponsibility = {
  /** 責務ID（ツール名に使用） */
  id: string;
  /** ツール説明 */
  toolDescription: string;
  /** 入力スキーマ */
  inputSchema: {
    workspace: z.ZodEnum<["server", "web"]>;
    targetDirectories: z.ZodOptional<z.ZodArray<z.ZodString>>;
  };
};

/**
 * 未使用export検出責務定義
 */
export const UNUSED_EXPORTS_RESPONSIBILITIES: UnusedExportsResponsibility[] = [
  {
    id: "review_unused_exports",
    toolDescription:
      "指定されたワークスペースの未使用exportを検出します。knipを使用してexportされているが使用されていない関数・型・変数を検出します。",
    inputSchema: {
      workspace: z
        .enum(["server", "web"])
        .describe(
          "検出を実行するワークスペース: 'server'（サーバー側）、'web'（フロントエンド側）",
        ),
      targetDirectories: z
        .array(z.string())
        .optional()
        .describe(
          "フィルタ対象ディレクトリの絶対パスの配列（省略時は全ファイル対象）",
        ),
    },
  },
];
