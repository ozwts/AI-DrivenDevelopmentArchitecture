/**
 * @what Implクラスのインスタンス化でPropsパターン（オブジェクト引数）を使用しているか検証
 * @why 位置引数は順序に依存し、可読性と保守性が低いため
 * @failure new XImpl(arg1, arg2)のように位置引数で依存を渡している場合に警告
 *
 * @concept Propsパターン
 *
 * Implクラスのインスタンス化では、位置引数ではなくオブジェクト（Props）で依存を渡す。
 *
 * **理由:**
 * - **可読性**: プロパティ名で意図が明確
 * - **保守性**: 順序変更の影響を受けない
 * - **拡張性**: 新しい依存を追加しやすい
 * - **型安全性**: TypeScriptの型チェックが効く
 *
 * @example-good
 * ```typescript
 * // ✅ Good: Propsパターンで依存を渡す
 * return new CreateProjectUseCaseImpl({
 *   projectRepository,
 *   logger,
 *   fetchNow,
 * });
 * ```
 *
 * @example-bad
 * ```typescript
 * // ❌ Bad: 位置引数で依存を渡す
 * return new CreateProjectUseCaseImpl(projectRepository, logger, fetchNow);
 * ```
 */

import * as ts from "typescript";
import { createASTChecker } from "../../ast-checker";

export const policyCheck = createASTChecker({
  filePattern: /register-.*-container\.ts$/,

  visitor: (node, ctx) => {
    const { fileName } = ctx.sourceFile;

    // テストファイルは除外
    if (fileName.includes(".test.") || fileName.includes(".dummy.")) {
      return;
    }

    // NewExpressionをチェック
    if (!ts.isNewExpression(node)) return;
    if (!ts.isIdentifier(node.expression)) return;

    const className = node.expression.text;

    // Implクラスでない場合はスキップ
    if (!className.endsWith("Impl")) return;

    // 引数がない場合はスキップ（引数なしのコンストラクタ）
    if (node.arguments === undefined || node.arguments.length === 0) return;

    // 引数が1つでObjectLiteralExpressionの場合はOK（Propsパターン）
    if (node.arguments.length === 1) {
      const arg = node.arguments[0];
      if (ts.isObjectLiteralExpression(arg)) {
        return; // ✅ Propsパターン
      }
    }

    // 引数が2つ以上、または1つでオブジェクトリテラルでない場合は警告
    const argCount = node.arguments.length;
    ctx.report(
      node,
      `${className}のインスタンス化で位置引数を使用しています（${argCount}個の引数）。\n` +
        `■ ❌ Bad: new ${className}(arg1, arg2, ...)\n` +
        `■ ✅ Good: new ${className}({ prop1, prop2, ... })\n` +
        "■ 理由: Propsパターン（オブジェクト引数）を使用して、可読性と保守性を向上させてください。"
    );
  },
});
