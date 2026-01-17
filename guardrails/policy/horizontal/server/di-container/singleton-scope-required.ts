/**
 * @what DIコンテナ登録でinSingletonScope()が使用されているか検証
 * @why ステートレスなコンポーネントはSingletonで管理し、メモリ効率を向上させるため
 * @failure bind()後にinSingletonScope()が呼ばれていない場合に警告
 *
 * @concept スコープ管理
 *
 * DIコンテナでは、ほぼすべてのコンポーネントをSingletonスコープで登録する。
 *
 * | コンポーネント | スコープ | 理由 |
 * |--------------|---------|------|
 * | Repository | Singleton | ステートレス、再利用可能 |
 * | UseCase | Singleton | ステートレス、再利用可能 |
 * | Logger | Singleton | 共有リソース |
 * | 環境変数 | Singleton | 不変値 |
 * | UoWランナー | Singleton | ファクトリとして機能 |
 *
 * @example-good
 * ```typescript
 * // ✅ Good: inSingletonScope()を使用
 * container
 *   .bind<CreateProjectUseCase>(serviceId.CREATE_PROJECT_USE_CASE)
 *   .toDynamicValue((ctx) => new CreateProjectUseCaseImpl({ ... }))
 *   .inSingletonScope();
 *
 * container
 *   .bind(serviceId.USERS_TABLE_NAME)
 *   .toDynamicValue(() => unwrapEnv("USERS_TABLE_NAME"))
 *   .inSingletonScope();
 * ```
 *
 * @example-bad
 * ```typescript
 * // ❌ Bad: inSingletonScope()がない
 * container
 *   .bind<CreateProjectUseCase>(serviceId.CREATE_PROJECT_USE_CASE)
 *   .toDynamicValue((ctx) => new CreateProjectUseCaseImpl({ ... }));
 *   // Transientスコープになり、毎回新しいインスタンスが作られる
 *
 * // ❌ Bad: inTransientScope()を使用
 * container
 *   .bind<CreateProjectUseCase>(serviceId.CREATE_PROJECT_USE_CASE)
 *   .toDynamicValue((ctx) => new CreateProjectUseCaseImpl({ ... }))
 *   .inTransientScope();  // ステートレスなのにTransientは非効率
 * ```
 */

import * as ts from "typescript";
import { createASTChecker } from "../../../ast-checker";

/**
 * メソッドチェーンにinSingletonScope()が含まれているか検証
 */
const hasInSingletonScope = (node: ts.Node): boolean => {
  if (ts.isCallExpression(node)) {
    const expr = node.expression;
    if (
      ts.isPropertyAccessExpression(expr) &&
      ts.isIdentifier(expr.name) &&
      expr.name.text === "inSingletonScope"
    ) {
      return true;
    }
  }
  return false;
};

/**
 * bind()呼び出しを含むチェーンを検出
 */
const isBindChain = (node: ts.CallExpression): boolean => {
  let current: ts.Expression = node.expression;

  while (ts.isCallExpression(current) || ts.isPropertyAccessExpression(current)) {
    if (ts.isPropertyAccessExpression(current) && ts.isIdentifier(current.name)) {
      if (current.name.text === "bind") {
        return true;
      }
    }
    if (ts.isCallExpression(current)) {
      current = current.expression;
    } else if (ts.isPropertyAccessExpression(current)) {
      current = current.expression;
    }
  }

  return false;
};

/**
 * toDynamicValue()またはtoConstantValue()で終わるチェーンを検出
 */
const endsWithValueBinding = (node: ts.CallExpression): boolean => {
  if (ts.isPropertyAccessExpression(node.expression) && ts.isIdentifier(node.expression.name)) {
    const methodName = node.expression.name.text;
    return methodName === "toDynamicValue" || methodName === "toConstantValue";
  }
  return false;
};

export const policyCheck = createASTChecker({
  filePattern: /register-.*-container\.ts$/,

  visitor: (node, ctx) => {
    const { fileName } = ctx.sourceFile;

    // テストファイルは除外
    if (fileName.includes(".test.") || fileName.includes(".dummy.")) {
      return;
    }

    // ExpressionStatementをチェック（container.bind(...).toDynamicValue(...).inSingletonScope()）
    if (!ts.isExpressionStatement(node)) return;
    if (!ts.isCallExpression(node.expression)) return;

    const callExpr = node.expression;

    // inSingletonScope()で終わっている場合はOK
    if (hasInSingletonScope(callExpr)) {
      return;
    }

    // inTransientScope()で終わっている場合は警告
    if (
      ts.isPropertyAccessExpression(callExpr.expression) &&
      ts.isIdentifier(callExpr.expression.name) &&
      callExpr.expression.name.text === "inTransientScope"
    ) {
      ctx.report(
        node,
        "DIコンテナ登録でinTransientScope()を使用しています。\n" +
          "■ ❌ Bad: .inTransientScope()\n" +
          "■ ✅ Good: .inSingletonScope()\n" +
          "■ 理由: Repository/UseCase/Logger等はステートレスなため、Singletonで管理すべきです。"
      );
      return;
    }

    // toDynamicValue()またはtoConstantValue()で終わっている場合は警告
    if (endsWithValueBinding(callExpr) && isBindChain(callExpr)) {
      ctx.report(
        node,
        "DIコンテナ登録でinSingletonScope()が指定されていません。\n" +
          "■ ❌ Bad: .toDynamicValue(() => ...)\n" +
          "■ ✅ Good: .toDynamicValue(() => ...).inSingletonScope()\n" +
          "■ 理由: スコープ未指定はTransientとなり、毎回インスタンスが作られます。明示的にSingletonを指定してください。"
      );
    }
  },
});
