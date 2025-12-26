/**
 * デプロイ責務定義
 */

import { z } from "zod";

/**
 * デプロイ責務
 */
export type DeployResponsibility = {
  id: string;
  toolDescription: string;
  inputSchema: {
    action: z.ZodEnum<["diff", "deploy", "destroy"]>;
    target: z.ZodDefault<z.ZodOptional<z.ZodEnum<["all", "api", "web"]>>>;
  };
};

/**
 * デプロイ責務定義
 *
 * 開発環境へのデプロイのみサポート。
 * 将来的にbatch等のターゲットを追加する場合:
 * 1. deployer.ts の DeployTarget型に追加
 * 2. deployer.ts の SCRIPT_MAP にマッピングを追加
 * 3. このファイルの target enum に追加
 * 4. infra/package.json に対応するスクリプトを追加
 */
export const DEPLOY_RESPONSIBILITIES: DeployResponsibility[] = [
  {
    id: "procedure_deploy_dev",
    toolDescription:
      "開発環境（dev）へのTerraformデプロイを実行します。",
    inputSchema: {
      action: z
        .enum(["diff", "deploy", "destroy"])
        .describe(
          "デプロイアクション: 'diff'（差分確認/Plan）、'deploy'（デプロイ/Apply）、'destroy'（削除/Destroy）",
        ),
      target: z
        .enum(["all", "api", "web"])
        .optional()
        .default("all")
        .describe(
          "デプロイターゲット: 'api'（APIロジック変更、テーブル追加・変更、既存環境変数の値変更時）、'web'（UI変更、静的ファイル更新時）、'all'（両方変更、新規環境変数追加、インフラ設定変更時）。diff/destroyはallのみ対応。",
        ),
    },
  },
];
