/**
 * @what Result.then()使用禁止チェック
 * @why TypeScriptのthenable問題を防ぐため
 * @failure Result.then()を使用している場合にエラー
 *
 * @concept Result.then()禁止（thenable問題）
 *
 * `Result.then()`はTypeScriptで`thenable`として扱われ、型推論が正しく機能しない。
 * 代わりに`Result.map()`を使用する。
 *
 * **問題の詳細:**
 * TypeScriptは`then`メソッドを持つオブジェクトを`Promise`と判定し、
 * `await`で自動的にunwrapしようとするため、意図しない型推論が発生する。
 *
 * @example-good
 * ```typescript
 * // ✅ Result.map()を使用
 * const result = Result.ok(existing)
 *   .map((t) => t.clarify(input.description, now))
 *   .map((t) => t.reschedule(input.dueDate, now))
 *   .map((t) => t.complete(now));
 *
 * if (result.isErr()) {
 *   return result;
 * }
 * ```
 *
 * @example-bad
 * ```typescript
 * // ❌ Result.then()を使用（thenable問題）
 * const result = Result.ok(existing)
 *   .then((t) => t.clarify(input.description, now))  // ❌ thenは使用禁止
 *   .then((t) => t.reschedule(input.dueDate, now));  // ❌
 * ```
 */

import * as ts from "typescript";
import { createASTChecker } from "../../../../ast-checker";

export const policyCheck = createASTChecker({
  filePattern: /-use-case\.ts$/,

  visitor: (node, ctx) => {
    // メソッド呼び出しをチェック
    if (!ts.isCallExpression(node)) return;

    const { expression } = node;
    if (!ts.isPropertyAccessExpression(expression)) return;

    const methodName = expression.name.text;
    if (methodName !== "then") return;

    // Result型に対するthen呼び出しをチェック
    const objectText = expression.expression.getText();
    const matchResult = objectText.match(/[a-zA-Z]+Result$/);
    if (objectText.includes("Result") || objectText.includes("result") || matchResult !== null) {
      ctx.report(
        node,
        "Result.then() を使用しています。\n" +
          "■ Result.then() は TypeScript の thenable 問題により型推論が正しく機能しません。\n" +
          "■ Result.map() を使用してください。\n" +
          "■ 例: result.map((t) => t.someMethod())"
      );
    }
  },
});
