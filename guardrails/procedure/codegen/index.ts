/**
 * コード生成（Code Generation）
 *
 * API型生成、モック生成などのコード生成機能を提供
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
  type GenerateType,
  type GenerateWorkspace,
} from "./generator";

// フォーマッター
export { formatGenerateResult } from "./formatter";
