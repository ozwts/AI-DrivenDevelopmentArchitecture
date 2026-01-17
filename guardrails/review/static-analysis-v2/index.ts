/**
 * カスタム静的解析モジュール（TypeScript Compiler API）
 */

// 責務定義
export {
  type CustomStaticAnalysisResponsibility,
  CUSTOM_STATIC_ANALYSIS_RESPONSIBILITIES,
} from "./responsibilities";

// ハンドラー
export {
  createCustomStaticAnalysisHandler,
  type CustomStaticAnalysisHandlerInput,
  type CustomWorkspace,
} from "./handler";

// 実行関数
export { runStaticAnalysisV2 } from "./runner";
export { formatViolations } from "./formatter";
