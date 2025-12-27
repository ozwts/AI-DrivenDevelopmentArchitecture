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
    action: z.ZodEnum<["diff", "deploy", "destroy", "upgrade"]>;
    target: z.ZodDefault<z.ZodOptional<z.ZodEnum<["all", "api", "web"]>>>;
    useBranchEnv: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
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
      "Executes Terraform deploy to dev environment. useBranchEnv=true creates isolated env using branch name hash.",
    inputSchema: {
      action: z
        .enum(["diff", "deploy", "destroy", "upgrade"])
        .describe(
          "Deploy action: 'diff' (Plan), 'deploy' (Apply), 'destroy' (Destroy), 'upgrade' (provider update)",
        ),
      target: z
        .enum(["all", "api", "web"])
        .optional()
        .default("all")
        .describe(
          "Deploy target: 'api' (API logic, table, env var value changes), 'web' (UI, static files), 'all' (both, new env vars, infra config). diff/destroy only supports 'all'.",
        ),
      useBranchEnv: z
        .boolean()
        .optional()
        .default(true)
        .describe(
          "Use branch environment. true: branch-specific env (default), false: shared dev env",
        ),
    },
  },
];
