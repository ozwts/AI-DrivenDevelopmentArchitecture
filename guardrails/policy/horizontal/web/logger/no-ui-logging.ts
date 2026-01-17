/**
 * @what UIコンポーネント層（lib/ui/）でのLogger使用を禁止
 * @why UIプリミティブは純粋なビュー表現であり、ログ出力のような副作用を持たないため
 * @failure lib/ui/配下でlogger.*の呼び出しを検出した場合にエラー
 *
 * @concept UIコンポーネントの純粋性
 *
 * UIプリミティブ（Button, Input等）はログ出力しない。
 * ログ出力はRoutes層、Features層、Hooks層の責務。
 *
 * **レイヤー別ログ出力責務:**
 * | レイヤー | ログ出力 |
 * |---------|---------|
 * | Routes | ○ |
 * | Hooks (features) | ○ |
 * | API Client (lib) | ○ |
 * | Hooks (lib) | ○（エラー時のみ）|
 * | UI Components (lib) | × |
 * | Utils (lib) | × |
 *
 * @example-good
 * ```typescript
 * // Routes層でログ出力
 * const logger = buildLogger("ResetPasswordRoute");
 * const handleSubmit = async () => {
 *   logger.info("パスワードリセット開始", { email });
 * };
 * ```
 *
 * @example-bad
 * ```typescript
 * // UIコンポーネントでログ出力（NG）
 * function Button({ onClick }) {
 *   const logger = buildLogger("Button");
 *   logger.debug("Buttonレンダリング"); // ❌
 *   return <button onClick={onClick} />;
 * }
 * ```
 */

import * as ts from "typescript";
import { createASTChecker } from "../../../ast-checker";

export const policyCheck = createASTChecker({
  // lib/ui/配下のファイルを対象
  filePattern: /\/lib\/ui\/.*\.(ts|tsx)$/,

  visitor: (node, ctx) => {
    const { fileName } = ctx.sourceFile;

    // テストファイルは除外
    if (fileName.includes(".test.") || fileName.includes(".spec.")) {
      return;
    }

    // buildLogger() の呼び出しをチェック
    if (ts.isCallExpression(node)) {
      const expression = node.expression;

      if (ts.isIdentifier(expression) && expression.text === "buildLogger") {
        ctx.report(
          node,
          "UIコンポーネント層でのLogger使用は禁止です。\n" +
            "■ ❌ Bad: lib/ui/ 内で buildLogger() を呼び出す\n" +
            "■ ✅ Good: Routes層またはHooks層でログ出力\n" +
            "■ 理由: UIプリミティブは純粋なビュー表現であり、副作用を持ちません。"
        );
      }
    }

    // logger.xxx() の呼び出しもチェック
    if (ts.isCallExpression(node)) {
      const expression = node.expression;

      if (ts.isPropertyAccessExpression(expression)) {
        const object = expression.expression;
        const method = expression.name.text;
        const loggerMethods = ["debug", "info", "warn", "error", "appendKeys"];

        if (
          ts.isIdentifier(object) &&
          object.text === "logger" &&
          loggerMethods.includes(method)
        ) {
          ctx.report(
            node,
            `UIコンポーネント層でのログ出力は禁止です: logger.${method}()\n` +
              "■ ❌ Bad: lib/ui/ 内で logger.info(...)\n" +
              "■ ✅ Good: Routes層またはHooks層でログ出力\n" +
              "■ 理由: UIプリミティブは純粋なビュー表現であり、副作用を持ちません。"
          );
        }
      }
    }
  },
});
