/**
 * SSM Parameter Storeから設定を取得し、TypeScriptファイルを生成
 *
 * 使用方法:
 *   npx tsx scripts/fetch-config.ts [環境] [ブランチサフィックス]
 *
 * 例:
 *   npx tsx scripts/fetch-config.ts dev           # 共有dev環境
 *   npx tsx scripts/fetch-config.ts dev abc123f   # ブランチ環境
 */

import { SSMClient, GetParametersByPathCommand } from "@aws-sdk/client-ssm";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// ESMで__dirnameを取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 定数
const AWS_REGION = "ap-northeast-1";
const PROJECT_PREFIX = "sandbox-dev";
const OUTPUT_DIR = path.join(__dirname, "../src/config/generated");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "env.generated.ts");

// 必須パラメータ
const REQUIRED_PARAMS = [
  "API_URL",
  "COGNITO_USER_POOL_ID",
  "COGNITO_CLIENT_ID",
  "COGNITO_REGION",
] as const;

type RequiredParam = (typeof REQUIRED_PARAMS)[number];
type EnvConfig = Record<RequiredParam, string>;

/**
 * SSM Parameter Storeからパラメータを取得
 */
const fetchParameters = async (parameterPath: string): Promise<Map<string, string>> => {
  const ssmClient = new SSMClient({ region: AWS_REGION });
  const parameters = new Map<string, string>();

  let nextToken: string | undefined;

  do {
    const command = new GetParametersByPathCommand({
      Path: parameterPath,
      WithDecryption: true,
      NextToken: nextToken,
    });

    const response = await ssmClient.send(command);

    if (response.Parameters !== undefined) {
      for (const param of response.Parameters) {
        if (param.Name !== undefined && param.Value !== undefined) {
          const envKey = param.Name.split("/").pop();
          if (envKey !== undefined && envKey !== "") {
            parameters.set(envKey, param.Value);
          }
        }
      }
    }

    nextToken = response.NextToken;
  } while (nextToken !== undefined);

  return parameters;
};

/**
 * 初回デプロイ用のプレースホルダー設定
 * SSMパラメータが存在しない場合（初回デプロイ時）に使用
 */
const PLACEHOLDER_CONFIG: EnvConfig = {
  API_URL: "https://placeholder.execute-api.ap-northeast-1.amazonaws.com",
  COGNITO_USER_POOL_ID: "ap-northeast-1_PLACEHOLDER",
  COGNITO_CLIENT_ID: "placeholder-client-id",
  COGNITO_REGION: "ap-northeast-1",
};

/**
 * 必須パラメータの検証（初回デプロイ時はプレースホルダーを使用）
 */
const validateParameters = (params: Map<string, string>): { config: EnvConfig; isPlaceholder: boolean } => {
  // SSMが空の場合（初回デプロイ）はプレースホルダーを使用
  if (params.size === 0) {
    console.warn("⚠️  SSMパラメータが見つかりません（初回デプロイ）");
    console.warn("⚠️  プレースホルダー設定を使用します");
    console.warn("⚠️  デプロイ完了後、再度ビルドしてください");
    return { config: PLACEHOLDER_CONFIG, isPlaceholder: true };
  }

  const config: Partial<EnvConfig> = {};
  const missing: string[] = [];

  for (const key of REQUIRED_PARAMS) {
    const value = params.get(key);
    if (value === undefined) {
      missing.push(key);
    } else {
      config[key] = value;
    }
  }

  if (missing.length > 0) {
    throw new Error(`必須パラメータが見つかりません: ${missing.join(", ")}`);
  }

  return { config: config as EnvConfig, isPlaceholder: false };
};

/**
 * TypeScriptファイルを生成
 */
const generateTypeScriptFile = (config: EnvConfig): string => {
  const timestamp = new Date().toISOString();

  return `/**
 * 自動生成ファイル - 手動編集禁止
 *
 * 生成日時: ${timestamp}
 * 生成元: scripts/fetch-config.ts
 *
 * このファイルはSSM Parameter Storeから取得した設定値を含みます。
 * 再生成するには: npm run config:fetch
 */

export const generatedEnv = {
  API_URL: "${config.API_URL}",
  COGNITO_USER_POOL_ID: "${config.COGNITO_USER_POOL_ID}",
  COGNITO_CLIENT_ID: "${config.COGNITO_CLIENT_ID}",
  COGNITO_REGION: "${config.COGNITO_REGION}",
} as const;

export type GeneratedEnv = typeof generatedEnv;
`;
};

/**
 * メイン処理
 */
const main = async (): Promise<void> => {
  // 引数解析
  const args = process.argv.slice(2);
  const env = args[0] ?? "dev";
  const branchSuffix = args[1];

  // パスプレフィックス構築
  const resourcePrefix = branchSuffix !== undefined
    ? `${PROJECT_PREFIX}-${branchSuffix}`
    : PROJECT_PREFIX;
  const parameterPath = `/${resourcePrefix}/web`;

  console.log(`環境: ${env}`);
  console.log(`パラメータパス: ${parameterPath}`);

  // SSMからパラメータ取得
  console.log("SSM Parameter Storeから設定を取得中...");
  const params = await fetchParameters(parameterPath);
  console.log(`取得したパラメータ数: ${params.size}`);

  // 検証（初回デプロイ時はプレースホルダーを使用）
  const { config, isPlaceholder } = validateParameters(params);

  // 出力ディレクトリ作成
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // ファイル生成
  const content = generateTypeScriptFile(config);
  fs.writeFileSync(OUTPUT_FILE, content, "utf-8");

  console.log(`生成完了: ${OUTPUT_FILE}`);
  if (isPlaceholder) {
    console.log("設定値: (プレースホルダー)");
  } else {
    console.log("設定値:");
  }
  console.log(`  API_URL: ${config.API_URL}`);
  console.log(`  COGNITO_USER_POOL_ID: ${config.COGNITO_USER_POOL_ID}`);
  console.log(`  COGNITO_CLIENT_ID: ${config.COGNITO_CLIENT_ID}`);
  console.log(`  COGNITO_REGION: ${config.COGNITO_REGION}`);
};

main().catch((error: unknown) => {
  console.error("エラー:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
