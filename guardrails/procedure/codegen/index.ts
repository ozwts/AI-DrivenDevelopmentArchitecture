/**
 * コード生成（Code Generation）
 *
 * OpenAPIからの型生成機能を提供
 */

// 責務定義
export {
  type CodegenResponsibility,
  CODEGEN_RESPONSIBILITIES,
} from "./responsibilities";

// 実行
export {
  executeGenerate,
  type GenerateInput,
  type GenerateResult,
  type GenerateWorkspace,
} from "./generator";

// フォーマッター
export { formatGenerateResult } from "./formatter";
