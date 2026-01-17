/**
 * @what ハンドラー内での単一UseCase呼び出し制約チェック
 * @why ハンドラーを薄いアダプターに保ち、ビジネスロジックをUseCase層に集約するため
 * @failure ハンドラー内で複数のUseCaseを呼び出している場合にエラー
 *
 * @concept 単一UseCase呼び出し原則
 *
 * ハンドラーは**単一のUseCaseのみ**を呼び出す。複数のUseCaseを呼び出す必要がある場合は、
 * それらを統合した新しいUseCaseを作成する。
 *
 * **理由:**
 * - ハンドラーを薄いアダプターに保つ
 * - トランザクション境界を明確にする
 * - ビジネスロジックの凝集度を高める
 *
 * @example-good
 * ```typescript
 * export const buildCreateProjectHandler =
 *   ({ container }: { container: Container }) =>
 *   async (c: AppContext) => {
 *     const useCase = container.get<CreateProjectUseCase>(serviceId.CREATE_PROJECT_USE_CASE);
 *
 *     // 単一のUseCaseのみ呼び出し
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
 *     const createUseCase = container.get<CreateProjectUseCase>(serviceId.CREATE_PROJECT_USE_CASE);
 *     const notifyUseCase = container.get<NotifyUseCase>(serviceId.NOTIFY_USE_CASE);
 *
 *     // ❌ 複数のUseCaseを呼び出し
 *     const createResult = await createUseCase.execute(data);
 *     const notifyResult = await notifyUseCase.execute({ projectId: createResult.data.id });
 *   };
 * ```
 */

import * as ts from "typescript";
import { createASTChecker } from "../../ast-checker";

export const policyCheck = createASTChecker({
  filePattern: /-handler\.ts$/,

  visitor: (node, ctx) => {
    // 関数宣言/アロー関数を検出
    if (!ts.isArrowFunction(node) && !ts.isFunctionDeclaration(node)) return;

    // 関数ボディを取得
    const {body} = node;
    if (body === undefined) return;
    if (!ts.isBlock(body)) return;

    // UseCase.execute呼び出しをカウント
    let useCaseExecuteCount = 0;
    const useCaseExecuteCalls: ts.Node[] = [];

    const countUseCaseExecute = (n: ts.Node) => {
      // xxx.execute(...) パターンを検出
      if (ts.isCallExpression(n)) {
        const {expression} = n;
        if (ts.isPropertyAccessExpression(expression)) {
          if (expression.name.text === "execute") {
            const object = expression.expression;
            // 変数名に UseCase が含まれているかチェック
            if (ts.isIdentifier(object)) {
              const varName = object.text;
              if (/[Uu]se[Cc]ase/.test(varName) || varName.endsWith("UseCase")) {
                useCaseExecuteCount += 1;
                useCaseExecuteCalls.push(n);
              }
            }
          }
        }
      }
      ts.forEachChild(n, countUseCaseExecute);
    };

    ts.forEachChild(body, countUseCaseExecute);

    if (useCaseExecuteCount > 1) {
      ctx.report(
        node,
        `ハンドラー内で複数のUseCase.execute()が呼び出されています（${useCaseExecuteCount}回）。\n` +
          "■ ハンドラーは単一のUseCaseのみを呼び出すべきです。\n" +
          "■ 複数のUseCaseが必要な場合は、それらを統合した新しいUseCaseを作成してください。"
      );
    }
  },
});
