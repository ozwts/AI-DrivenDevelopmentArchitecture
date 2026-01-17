/**
 * @what 同じビジネスルール（権限チェック、存在確認、重複チェック等）が複数のUseCaseで重複実装されていないか検証
 * @why ビジネスルールの重複は保守性を低下させ、変更漏れのリスクを高めるため
 * @failure 以下のパターンを検出: (1) xxxId比較 (2) undefined比較+特定エラー (3) ForbiddenError直前の比較
 *
 * @concept ビジネスルールの共通化
 *
 * 同じビジネスルール（権限チェック、存在確認、重複チェック等）を複数のUseCaseで重複実装する代わりに、
 * 共通関数（`use-case/shared/`）に抽出する。
 *
 * **理由:**
 * - **保守性**: ルール変更時に1箇所修正で済む
 * - **一貫性**: 全UseCaseで同じロジックが使用される
 * - **テスト容易性**: 共通関数を一度テストすれば良い
 *
 * @example-good
 * ```typescript
 * // use-case/shared/permission.ts
 * export const checkOwnership = (
 *   entityId: string,
 *   ownerId: string,
 * ): Result<void, ForbiddenError> => {
 *   if (entityId !== ownerId) {
 *     return Result.err(new ForbiddenError("アクセス権限がありません"));
 *   }
 *   return Result.ok(undefined);
 * };
 *
 * // use-case/shared/validation.ts
 * export const ensureExists = <T>(
 *   data: T | undefined,
 *   errorMessage: string,
 * ): Result<T, NotFoundError> => {
 *   if (data === undefined) {
 *     return Result.err(new NotFoundError(errorMessage));
 *   }
 *   return Result.ok(data);
 * };
 *
 * // update-project-use-case.ts
 * export class UpdateProjectUseCaseImpl implements UpdateProjectUseCase {
 *   async execute(input: UpdateProjectUseCaseInput): Promise<UpdateProjectUseCaseResult> {
 *     const project = ...; // 取得
 *
 *     // ✅ 共通関数を使用
 *     const existsResult = ensureExists(project, "プロジェクトが見つかりません");
 *     if (existsResult.isErr()) return existsResult;
 *
 *     const permissionResult = checkOwnership(project.userId, input.userId);
 *     if (permissionResult.isErr()) return permissionResult;
 *
 *     // ... 更新処理
 *   }
 * }
 * ```
 *
 * @example-bad
 * ```typescript
 * // update-project-use-case.ts
 * export class UpdateProjectUseCaseImpl implements UpdateProjectUseCase {
 *   async execute(input: UpdateProjectUseCaseInput) {
 *     const project = ...; // 取得
 *
 *     // ❌ 存在確認を直接実装（重複）
 *     if (project === undefined) {
 *       return Result.err(new NotFoundError("プロジェクトが見つかりません"));
 *     }
 *
 *     // ❌ 権限チェックを直接実装（重複）
 *     if (project.userId !== input.userId) {
 *       return Result.err(new ForbiddenError("アクセス権限がありません"));
 *     }
 *
 *     // ... 更新処理
 *   }
 * }
 *
 * // delete-project-use-case.ts
 * export class DeleteProjectUseCaseImpl implements DeleteProjectUseCase {
 *   async execute(input: DeleteProjectUseCaseInput) {
 *     const project = ...; // 取得
 *
 *     // ❌ 同じ存在確認を再実装（重複）
 *     if (project === undefined) {
 *       return Result.err(new NotFoundError("プロジェクトが見つかりません"));
 *     }
 *
 *     // ❌ 同じ権限チェックを再実装（重複）
 *     if (project.userId !== input.userId) {
 *       return Result.err(new ForbiddenError("アクセス権限がありません"));
 *     }
 *
 *     // ... 削除処理
 *   }
 * }
 * ```
 */

import * as ts from "typescript";
import { createASTChecker } from "../../../ast-checker";

/**
 * 特定のエラー型を返すif文を検出（ビジネスルール重複の兆候）
 */
const isBusinessRuleError = (errorName: string): boolean =>
  ["ForbiddenError", "NotFoundError", "ConflictError"].includes(errorName);

export const policyCheck = createASTChecker({
  filePattern: /-use-case\.ts$/,

  visitor: (node, ctx) => {
    const { fileName } = ctx.sourceFile;

    // テストファイル、ダミーファイルは除外
    if (fileName.includes(".test.") || fileName.includes(".dummy.")) {
      return;
    }

    // パターン1: xxxId !== yyyId（所有権・権限チェック）
    if (ts.isBinaryExpression(node)) {
      const { left, operatorToken, right } = node;

      // !== または != 演算子かチェック
      if (
        operatorToken.kind !== ts.SyntaxKind.ExclamationEqualsEqualsToken &&
        operatorToken.kind !== ts.SyntaxKind.ExclamationEqualsToken
      ) {
        return;
      }

      // 左辺と右辺がどちらもxxxIdパターンかチェック
      const isIdComparison = (expr: ts.Expression): boolean => {
        if (ts.isPropertyAccessExpression(expr) && ts.isIdentifier(expr.name)) {
          return expr.name.text.endsWith("Id") || expr.name.text === "id";
        }
        if (ts.isIdentifier(expr)) {
          return expr.text.endsWith("Id") || expr.text === "id";
        }
        return false;
      };

      if (isIdComparison(left) && isIdComparison(right)) {
        ctx.report(
          node,
          "ID比較によるビジネスルール（権限チェック等）をUseCase内で直接実装しています（重複の可能性）。\n" +
            "■ ❌ Bad: if (entity.userId !== input.userId) { return Result.err(new ForbiddenError(...)); }\n" +
            "■ ✅ Good: const result = checkOwnership(entity.userId, input.userId); if (result.isErr()) { ... }\n" +
            "■ 理由: 繰り返し使用される比較ロジックは use-case/shared/ に共通関数として抽出すべきです。\n" +
            "■ 注意: 初回実装時は警告を無視できますが、同じパターンが2箇所以上現れたら共通化を検討してください。"
        );
      }
    }

    // パターン2: undefined比較 + NotFoundError（存在確認）
    if (ts.isIfStatement(node)) {
      const condition = node.expression;

      // entity === undefined または entity !== undefined
      let isUndefinedCheck = false;
      if (ts.isBinaryExpression(condition)) {
        const { right } = condition;
        if (ts.isIdentifier(right) && right.text === "undefined") {
          isUndefinedCheck = true;
        }
      }

      if (isUndefinedCheck && node.thenStatement !== undefined) {
        // if文の中身をチェック
        let hasBusinessRuleError = false;

        const checkForError = (stmt: ts.Statement): void => {
          if (ts.isBlock(stmt)) {
            stmt.statements.forEach(checkForError);
          } else if (ts.isReturnStatement(stmt) && stmt.expression !== undefined) {
            // Result.err(new XxxError(...))パターンを検出
            if (ts.isCallExpression(stmt.expression)) {
              const callExpr = stmt.expression;
              if (
                ts.isPropertyAccessExpression(callExpr.expression) &&
                ts.isIdentifier(callExpr.expression.name) &&
                callExpr.expression.name.text === "err"
              ) {
                // 引数がnew XxxError()かチェック
                if (
                  callExpr.arguments.length > 0 &&
                  ts.isNewExpression(callExpr.arguments[0])
                ) {
                  const newExpr = callExpr.arguments[0];
                  if (
                    ts.isIdentifier(newExpr.expression) &&
                    isBusinessRuleError(newExpr.expression.text)
                  ) {
                    hasBusinessRuleError = true;
                  }
                }
              }
            }
          }
        };

        checkForError(node.thenStatement);

        if (hasBusinessRuleError) {
          ctx.report(
            node,
            "undefined比較による存在確認をUseCase内で直接実装しています（重複の可能性）。\n" +
              '■ ❌ Bad: if (entity === undefined) { return Result.err(new NotFoundError("見つかりません")); }\n' +
              '■ ✅ Good: const result = ensureExists(entity, "見つかりません"); if (result.isErr()) { ... }\n' +
              "■ 理由: 存在確認は use-case/shared/ に共通関数として抽出すべきです。\n" +
              "■ 注意: 初回実装時は警告を無視できますが、同じパターンが2箇所以上現れたら共通化を検討してください。"
          );
        }
      }
    }
  },
});
