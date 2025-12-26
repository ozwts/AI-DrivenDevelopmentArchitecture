/**
 * 自動修正（Auto Fix）
 *
 * ESLint --fix、Prettier、terraform fmtなどの自動修正機能を提供
 */

// 責務定義
export { type FixResponsibility, FIX_RESPONSIBILITIES } from "./responsibilities";

// 実行
export { executeFix, type FixInput, type FixResult, type FixType, type FixWorkspace } from "./fixer";

// フォーマッター
export { formatFixResult } from "./formatter";
