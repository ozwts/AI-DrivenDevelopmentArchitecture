/**
 * デプロイ（Deploy）
 *
 * 開発環境へのTerraformデプロイ機能を提供
 * ターゲット別にデプロイ可能（全体、API、Web等）
 */

// 責務定義
export {
  type DeployResponsibility,
  DEPLOY_RESPONSIBILITIES,
} from "./responsibilities";

// 実行
export {
  executeDeploy,
  getCurrentBranchName,
  getBranchNameHash,
  type DeployInput,
  type DeployResult,
  type DeployAction,
  type DeployTarget,
} from "./deployer";

// フォーマッター
export { formatDeployResult } from "./formatter";
