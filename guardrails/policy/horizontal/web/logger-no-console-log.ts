/**
 * @what console.logの直接使用を禁止し、Logger経由でのログ出力を強制
 * @why 構造化ログ、ログレベル管理、統一されたログ出力を実現するため
 * @failure console.log/info/warn/error/debugの直接使用を検出した場合にエラー
 *
 * @concept Logger経由のログ出力
 *
 * すべてのログ出力はLogger経由で行う。console.*の直接使用は禁止。
 *
 * **理由:**
 * - **構造化ログ**: 付加情報（key-value）を統一的に出力
 * - **ログレベル管理**: 環境に応じたログレベル制御
 * - **一貫性**: サーバー側と統一されたログ出力
 *
 * **例外:**
 * - テストファイル: テスト時のデバッグ出力
 * - lib/logger実装: Logger実装自体
 *
 * @example-good
 * ```typescript
 * const logger = buildLogger("MyComponent");
 * logger.info("処理開始", { userId });
 * logger.debug("詳細情報", { data });
 * ```
 *
 * @example-bad
 * ```typescript
 * console.log("処理開始");
 * console.error("エラー発生", error);
 * ```
 */

import * as ts from "typescript";
import { createASTChecker } from "../../ast-checker";

// console.* メソッド名のリスト
const CONSOLE_METHODS = ["log", "info", "warn", "error", "debug"];

export const policyCheck = createASTChecker({
  // webアプリソースファイルを対象
  filePattern: /\/web\/app\/.*\.(ts|tsx)$/,

  visitor: (node, ctx) => {
    const { fileName } = ctx.sourceFile;

    // 除外ファイル
    // - テストファイル
    // - lib/logger: Logger実装自体
    if (fileName.includes(".test.") || fileName.includes("/lib/logger/")) {
      return;
    }

    // CallExpression（関数呼び出し）をチェック
    if (ts.isCallExpression(node)) {
      const expression = node.expression;

      // console.xxx() の形式をチェック
      if (ts.isPropertyAccessExpression(expression)) {
        const object = expression.expression;
        const method = expression.name.text;

        // console.log, console.info, etc.
        if (
          ts.isIdentifier(object) &&
          object.text === "console" &&
          CONSOLE_METHODS.includes(method)
        ) {
          ctx.report(
            node,
            `console.${method}() の直接使用は禁止です。\n` +
              "■ ❌ Bad: console.log(message)\n" +
              '■ ✅ Good: const logger = buildLogger("Component"); logger.info(message)\n' +
              "■ 理由: Logger経由で構造化ログを出力し、サーバー側と統一します。"
          );
        }
      }
    }
  },
});
