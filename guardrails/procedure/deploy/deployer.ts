/**
 * デプロイ実行（Deployer）
 *
 * 開発環境へのTerraformデプロイを実行（npm scripts経由）
 * ターゲット別にデプロイ可能（全体、API、Web等）
 */

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * デプロイアクション
 */
export type DeployAction = "diff" | "deploy" | "destroy";

/**
 * デプロイターゲット
 * - all: 全リソース
 * - api: APIサーバー（Lambda + DB）
 * - web: Webフロントエンド（S3 + CloudFront）
 * - 将来: batch, scheduler等を追加可能
 */
export type DeployTarget = "all" | "api" | "web";

/**
 * デプロイ結果
 */
export type DeployResult = {
  success: boolean;
  action: DeployAction;
  target: DeployTarget;
  environment: string;
  output: string;
  duration: number;
};

/**
 * デプロイ入力
 */
export type DeployInput = {
  action: DeployAction;
  target: DeployTarget;
  projectRoot: string;
};

/**
 * npm scriptsマッピング
 * キー: `${action}:${target}`
 * 値: npm scriptコマンド名
 *
 * 新しいターゲットを追加する場合:
 * 1. DeployTarget型に追加
 * 2. このマッピングに対応するスクリプトを追加
 * 3. infra/package.jsonに対応するスクリプトを追加
 */
const SCRIPT_MAP: Record<string, string | undefined> = {
  // diff（差分確認）- 全体のみ
  "diff:all": "diff:dev",
  "diff:api": undefined,
  "diff:web": undefined,

  // deploy（デプロイ）
  "deploy:all": "deploy:dev",
  "deploy:api": "deploy:api:dev",
  "deploy:web": "deploy:web:dev",

  // destroy（削除）- 全体のみ
  "destroy:all": "destroy:dev",
  "destroy:api": undefined,
  "destroy:web": undefined,
};

/**
 * サポートされている組み合わせかチェック
 */
const getSupportedScript = (
  action: DeployAction,
  target: DeployTarget,
): string | null => {
  const key = `${action}:${target}`;
  const script = SCRIPT_MAP[key];

  if (script === undefined) {
    return null;
  }

  return script;
};

/**
 * 未サポート組み合わせのメッセージ
 */
const getUnsupportedMessage = (
  action: DeployAction,
  target: DeployTarget,
): string => {
  const suggestions: Record<DeployAction, string> = {
    diff: "差分確認は target='all' で全体を確認してください。",
    deploy: "このターゲットのデプロイはサポートされていません。",
    destroy: "削除は target='all' で全体を削除してください。個別削除は危険なためサポートしていません。",
  };

  return `未サポートの組み合わせ: action='${action}', target='${target}'\n${suggestions[action]}`;
};

/**
 * デプロイを実行
 */
export const executeDeploy = async (
  input: DeployInput,
): Promise<DeployResult> => {
  const { action, target, projectRoot } = input;
  const startTime = Date.now();
  const environment = "dev";

  const infraDir = `${projectRoot}/infra`;

  // サポートされている組み合わせかチェック
  const script = getSupportedScript(action, target);

  if (script === null) {
    return {
      success: false,
      action,
      target,
      environment,
      output: getUnsupportedMessage(action, target),
      duration: Date.now() - startTime,
    };
  }

  try {
    const { stdout, stderr } = await execAsync(`npm run ${script}`, {
      cwd: infraDir,
      maxBuffer: 1024 * 1024 * 10,
      timeout: 600000, // 10分
    });

    const output = stdout !== "" ? stdout : stderr;

    return {
      success: true,
      action,
      target,
      environment,
      output,
      duration: Date.now() - startTime,
    };
  } catch (error: unknown) {
    const execError = error as { stdout?: string; stderr?: string };
    let output = "";
    if (execError.stdout !== undefined && execError.stdout !== "") {
      output = execError.stdout;
    } else if (execError.stderr !== undefined && execError.stderr !== "") {
      output = execError.stderr;
    } else {
      output = error instanceof Error ? error.message : String(error);
    }

    return {
      success: false,
      action,
      target,
      environment,
      output,
      duration: Date.now() - startTime,
    };
  }
};
