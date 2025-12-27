/**
 * デプロイ実行（Deployer）
 *
 * 開発環境へのTerraformデプロイを実行
 * - 共有dev環境: npm scripts経由
 * - ブランチ環境: 直接Terraform実行（State分離）
 */

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * デプロイアクション
 */
export type DeployAction = "diff" | "deploy" | "destroy" | "upgrade";

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
  branchSuffix?: string;
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
  /** ブランチ環境を使用するか（true: git hashを自動取得して分離環境を作成） */
  useBranchEnv?: boolean;
};

/**
 * 現在のブランチ名を取得
 */
export const getCurrentBranchName = async (cwd: string): Promise<string> => {
  const { stdout } = await execAsync("git branch --show-current", { cwd });
  return stdout.trim();
};

/**
 * ブランチ名のハッシュを取得（7文字）
 * ブランチ名をSHA1ハッシュ化して短縮
 */
export const getBranchNameHash = async (cwd: string): Promise<string> => {
  const { stdout } = await execAsync(
    "git branch --show-current | shasum | cut -c1-7",
    { cwd },
  );
  return stdout.trim().toLowerCase();
};

/**
 * npm scriptsマッピング（共有dev環境用）
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

  // upgrade（プロバイダ更新）- 全体のみ
  "upgrade:all": "config:upgrade:dev",
  "upgrade:api": undefined,
  "upgrade:web": undefined,
};

/**
 * npm scriptsマッピング（ブランチ環境用）
 * ブランチ名のハッシュでState・リソースを分離
 */
const BRANCH_SCRIPT_MAP: Record<string, string | undefined> = {
  // diff（差分確認）- 全体のみ
  "diff:all": "diff:branch:dev",
  "diff:api": undefined,
  "diff:web": undefined,

  // deploy（デプロイ）
  "deploy:all": "deploy:branch:dev",
  "deploy:api": "deploy:branch:api:dev",
  "deploy:web": "deploy:branch:web:dev",

  // destroy（削除）- 全体のみ
  "destroy:all": "destroy:branch:dev",
  "destroy:api": undefined,
  "destroy:web": undefined,

  // upgrade（プロバイダ更新）- 全体のみ
  "upgrade:all": "config:upgrade:branch:dev",
  "upgrade:api": undefined,
  "upgrade:web": undefined,
};

/**
 * サポートされている組み合わせかチェック
 */
const getSupportedScript = (
  action: DeployAction,
  target: DeployTarget,
  useBranchEnv: boolean,
): string | null => {
  const key = `${action}:${target}`;
  const scriptMap = useBranchEnv ? BRANCH_SCRIPT_MAP : SCRIPT_MAP;
  const script = scriptMap[key];

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
  useBranchEnv: boolean,
): string => {
  const envType = useBranchEnv ? "ブランチ環境" : "共有dev環境";

  const suggestions: Record<DeployAction, string> = {
    diff: "差分確認は target='all' で全体を確認してください。",
    deploy: "このターゲットのデプロイはサポートされていません。",
    destroy:
      "削除は target='all' で全体を削除してください。個別削除は危険なためサポートしていません。",
    upgrade:
      "プロバイダ更新は target='all' で全体を更新してください。",
  };

  return `未サポートの組み合わせ（${envType}）: action='${action}', target='${target}'\n${suggestions[action]}`;
};

/**
 * デプロイを実行
 */
export const executeDeploy = async (
  input: DeployInput,
): Promise<DeployResult> => {
  const { action, target, projectRoot, useBranchEnv = true } = input;
  const startTime = Date.now();
  const environment = "dev";

  const infraDir = `${projectRoot}/infra`;

  // ブランチ環境の場合はブランチ名ハッシュを取得
  let branchSuffix: string | undefined;
  if (useBranchEnv) {
    try {
      branchSuffix = await getBranchNameHash(projectRoot);
    } catch {
      return {
        success: false,
        action,
        target,
        environment,
        output: "ブランチ名の取得に失敗しました。gitリポジトリ内で実行してください。",
        duration: Date.now() - startTime,
      };
    }
  }

  // サポートされている組み合わせかチェック
  const script = getSupportedScript(action, target, useBranchEnv);

  if (script === null) {
    return {
      success: false,
      action,
      target,
      environment,
      branchSuffix,
      output: getUnsupportedMessage(action, target, useBranchEnv),
      duration: Date.now() - startTime,
    };
  }

  try {
    const { stdout, stderr } = await execAsync(`npm run ${script}`, {
      cwd: infraDir,
      maxBuffer: 1024 * 1024 * 50, // 50MB
      timeout: 600000, // 10分
      env: {
        ...process.env,
        TF_CLI_ARGS: "-no-color", // Terraformカラー無効化
        NO_COLOR: "1", // 汎用カラー無効化（npm等）
      },
    });

    const output = stdout !== "" ? stdout : stderr;

    return {
      success: true,
      action,
      target,
      environment,
      branchSuffix,
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
      branchSuffix,
      output,
      duration: Date.now() - startTime,
    };
  }
};
