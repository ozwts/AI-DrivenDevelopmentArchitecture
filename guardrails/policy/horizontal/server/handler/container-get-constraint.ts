/**
 * @what container.getで取得可能な型の制約チェック
 * @why ハンドラー層の責務を薄いアダプターに限定するため
 * @failure ハンドラーでLogger/UseCase以外をcontainer.getで取得している場合にエラー
 *
 * @concept container.getの制約
 *
 * ハンドラーで`container.get`で取得してよいのは**Logger**と**UseCase**のみ。
 *
 * | 取得可否 | 型 | 理由 |
 * |----------|------|------|
 * | ✅ 許可 | Logger | ロギングはインフラ関心事 |
 * | ✅ 許可 | UseCase | ビジネスロジックの委譲先 |
 * | ❌ 禁止 | Repository | UseCase層の責務 |
 * | ❌ 禁止 | AuthClient | UseCase層の責務 |
 * | ❌ 禁止 | StorageClient | UseCase層の責務 |
 * | ❌ 禁止 | その他Port | UseCase層の責務 |
 *
 * @example-good
 * ```typescript
 * export const buildCreateProjectHandler =
 *   ({ container }: { container: Container }) =>
 *   async (c: AppContext) => {
 *     const logger = container.get<Logger>(serviceId.LOGGER);
 *     const useCase = container.get<CreateProjectUseCase>(serviceId.CREATE_PROJECT_USE_CASE);
 *
 *     const result = await useCase.execute(data);
 *     // ...
 *   };
 * ```
 *
 * @example-bad
 * ```typescript
 * export const buildCreateProjectHandler =
 *   ({ container }: { container: Container }) =>
 *   async (c: AppContext) => {
 *     // ❌ Repository取得は禁止
 *     const repository = container.get<ProjectRepository>(serviceId.PROJECT_REPOSITORY);
 *     // ❌ AuthClient取得は禁止
 *     const authClient = container.get<AuthClient>(serviceId.AUTH_CLIENT);
 *     // ❌ StorageClient取得は禁止
 *     const storageClient = container.get<StorageClient>(serviceId.STORAGE_CLIENT);
 *   };
 * ```
 */

import * as ts from "typescript";
import { createASTChecker } from "../../../ast-checker";

// 許可される型パターン
const ALLOWED_TYPE_PATTERNS = [
  /^Logger$/,
  /UseCase$/,
];

// 禁止される型パターン（明示的に警告）
const FORBIDDEN_TYPE_PATTERNS = [
  /Repository$/,
  /Client$/,
  /Service$/,
  /Gateway$/,
  /Adapter$/,
  /Port$/,
  /Provider$/,
];

export const policyCheck = createASTChecker({
  filePattern: /-handler\.ts$/,

  visitor: (node, ctx) => {
    // container.get<Type>(...) の呼び出しを検出
    if (!ts.isCallExpression(node)) return;

    const {expression} = node;

    // container.get パターンをチェック
    if (!ts.isPropertyAccessExpression(expression)) return;
    if (expression.name.text !== "get") return;

    // 左辺が container かチェック（変数名で判断）
    const object = expression.expression;
    if (!ts.isIdentifier(object)) return;
    if (object.text !== "container") return;

    // 型引数を取得
    const typeArgs = node.typeArguments;
    if (typeArgs === undefined || typeArgs.length === 0) return;

    const typeArg = typeArgs[0];
    if (!ts.isTypeReferenceNode(typeArg)) return;

    const {typeName} = typeArg;
    if (!ts.isIdentifier(typeName)) return;

    const typeText = typeName.text;

    // 許可されている型かチェック
    const isAllowed = ALLOWED_TYPE_PATTERNS.some((pattern) => pattern.test(typeText));
    if (isAllowed) return;

    // 禁止されている型かチェック
    const isForbidden = FORBIDDEN_TYPE_PATTERNS.some((pattern) => pattern.test(typeText));

    if (isForbidden) {
      ctx.report(
        node,
        `ハンドラーで container.get<${typeText}>() を使用しています。\n` +
          "■ ハンドラーで取得できるのは Logger と UseCase のみです。\n" +
          "■ Repository/Client/Service等はUseCase層で注入してください。"
      );
    } else {
      // 許可リストにも禁止リストにもない場合も警告
      ctx.report(
        node,
        `ハンドラーで container.get<${typeText}>() を使用しています。\n` +
          "■ ハンドラーで取得できるのは Logger と UseCase のみです。\n" +
          "■ この型がUseCaseでない場合は、UseCase層で注入してください。"
      );
    }
  },
});
