/**
 * @what ドメインモデルでのログ出力を禁止
 * @why ドメインモデルは純粋なビジネスロジックに集中すべき。ログはアプリケーション層（UseCase, Handler）で行う
 * @failure Loggerのインポートまたはlogger呼び出しを検出した場合にエラー
 *
 * @concept ドメイン層の純粋性
 *
 * ドメインモデル（Entity, VO, Repository）は副作用を持たない純粋な層。
 * ログ出力は副作用であり、アプリケーション層の責務。
 *
 * @example-good
 * ```typescript
 * // ドメインモデル - ログなし
 * export class Todo {
 *   complete(): Result<Todo, DomainError> {
 *     if (this.status.isCompleted()) {
 *       return Result.err(new DomainError("Already completed"));
 *     }
 *     return Result.ok(new Todo({ ...this, status: TodoStatus.completed() }));
 *   }
 * }
 *
 * // UseCase - ログはここで
 * export const completeTodo = async (props: Props): Promise<Result<...>> => {
 *   logger.info("Completing todo", { todoId: props.todoId });
 *   const result = await todo.complete();
 *   // ...
 * };
 * ```
 *
 * @example-bad
 * ```typescript
 * import { Logger } from '@/port/logger';  // ❌ Loggerインポート禁止
 *
 * export class Todo {
 *   complete(logger: Logger): Result<Todo, DomainError> {
 *     logger.info("Completing todo");  // ❌ ドメインでログ禁止
 *     // ...
 *   }
 * }
 * ```
 */

import * as ts from 'typescript';
import createCheck from '../../check-builder';

export default createCheck({
  filePattern: /\.(entity|vo|repository)\.ts$/,

  visitor: (node, ctx) => {
    // 1. Loggerインポートのチェック
    if (ts.isImportDeclaration(node)) {
      const moduleSpecifier = node.moduleSpecifier;
      if (!ts.isStringLiteral(moduleSpecifier)) return;

      const importPath = moduleSpecifier.text;

      // logger関連のインポートをチェック
      if (importPath.includes('/logger') || importPath.includes('logger/')) {
        const importClause = node.importClause;
        if (importClause?.namedBindings && ts.isNamedImports(importClause.namedBindings)) {
          for (const element of importClause.namedBindings.elements) {
            const name = element.name.text;
            if (name === 'Logger' || name === 'logger') {
              ctx.report(
                node,
                `ドメインモデルでのLoggerインポートは禁止されています。` +
                  `ログ出力はアプリケーション層（UseCase, Handler）で行ってください。`
              );
            }
          }
        }
      }
    }

    // 2. logger.xxx() 呼び出しのチェック
    if (ts.isCallExpression(node)) {
      const expression = node.expression;
      if (ts.isPropertyAccessExpression(expression)) {
        const obj = expression.expression;
        if (ts.isIdentifier(obj) && obj.text === 'logger') {
          ctx.report(
            node,
            `ドメインモデルでのログ出力は禁止されています。` +
              `ログはアプリケーション層（UseCase, Handler）で行ってください。`
          );
        }
      }
    }
  },
});
