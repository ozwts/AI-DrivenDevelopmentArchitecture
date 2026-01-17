/**
 * @what toDynamicValue内で依存関係をctx.container.get()で取得しているか検証
 * @why 依存関係をハードコードすると、テスタビリティと柔軟性が失われるため
 * @failure toDynamicValue内で直接new XImpl()をネストして使用している場合に警告
 *
 * @concept 依存関係の解決
 *
 * DIコンテナのtoDynamicValue()内では、依存関係を`ctx.container.get()`で取得する。
 * 別のImplクラスを直接newしてはいけない。
 *
 * **理由:**
 * - **テスタビリティ**: モックに差し替え可能
 * - **一貫性**: すべての依存関係がコンテナで管理される
 * - **柔軟性**: 環境ごとに異なる実装を注入可能
 *
 * @example-good
 * ```typescript
 * // ✅ Good: ctx.container.get()で依存関係を取得
 * container
 *   .bind<CreateProjectUseCase>(serviceId.CREATE_PROJECT_USE_CASE)
 *   .toDynamicValue((ctx) => {
 *     const projectRepository = ctx.container.get<ProjectRepository>(
 *       serviceId.PROJECT_REPOSITORY,
 *     );
 *     const logger = ctx.container.get<Logger>(serviceId.LOGGER);
 *     const fetchNow = ctx.container.get<FetchNow>(serviceId.FETCH_NOW);
 *
 *     return new CreateProjectUseCaseImpl({
 *       projectRepository,
 *       logger,
 *       fetchNow,
 *     });
 *   })
 *   .inSingletonScope();
 * ```
 *
 * @example-bad
 * ```typescript
 * // ❌ Bad: 依存関係を直接インスタンス化
 * container
 *   .bind<CreateProjectUseCase>(serviceId.CREATE_PROJECT_USE_CASE)
 *   .toDynamicValue((ctx) => {
 *     return new CreateProjectUseCaseImpl({
 *       projectRepository: new ProjectRepositoryImpl({ ... }), // ❌ 直接new
 *       logger: new LoggerImpl({ ... }), // ❌ 直接new
 *       fetchNow: () => new Date(),
 *     });
 *   })
 *   .inSingletonScope();
 * ```
 */

import * as ts from "typescript";
import { createASTChecker } from "../../ast-checker";

/**
 * toDynamicValue()のコールバック内にいるかチェック
 */
const isInToDynamicValue = (node: ts.Node): boolean => {
  let current: ts.Node | undefined = node.parent;

  while (current !== undefined) {
    if (ts.isCallExpression(current)) {
      const expr = current.expression;
      if (
        ts.isPropertyAccessExpression(expr) &&
        ts.isIdentifier(expr.name) &&
        expr.name.text === "toDynamicValue"
      ) {
        return true;
      }
    }
    current = current.parent;
  }

  return false;
};

/**
 * NewExpressionがObjectLiteralのプロパティ値として使われているかチェック
 */
const isNestedInObjectLiteral = (node: ts.NewExpression): boolean => {
  const parent = node.parent;

  // PropertyAssignment: { prop: new XImpl() }
  if (ts.isPropertyAssignment(parent)) {
    return true;
  }

  // ShorthandPropertyAssignment: { prop } は該当しない

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

    // NewExpressionをチェック
    if (!ts.isNewExpression(node)) return;
    if (!ts.isIdentifier(node.expression)) return;

    const className = node.expression.text;

    // Implクラスでない場合はスキップ
    if (!className.endsWith("Impl")) return;

    // toDynamicValue内でない場合はスキップ
    if (!isInToDynamicValue(node)) return;

    // return文の直後の場合は許可（メインのインスタンス化）
    const parent = node.parent;
    if (ts.isReturnStatement(parent)) {
      return;
    }

    // オブジェクトリテラルのプロパティ値として使われている場合は警告
    if (isNestedInObjectLiteral(node)) {
      ctx.report(
        node,
        `依存関係（${className}）を直接インスタンス化しています。\n` +
          `■ ❌ Bad: new ${className}({ ... }) をプロパティ値として使用\n` +
          `■ ✅ Good: ctx.container.get<Type>(serviceId.XXX) で取得\n` +
          "■ 理由: 依存関係はコンテナから取得し、テスタビリティと一貫性を確保してください。"
      );
    }
  },
});
