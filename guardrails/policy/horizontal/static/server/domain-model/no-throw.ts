/**
 * @what Entity/Value Objectでthrow文を使用していないか検査
 * @why 例外はResult型で表現すべきであり、throwは制御フローを予測不能にするため
 * @failure throw文を含むEntity/VOを検出した場合にエラー
 *
 * @concept Result型による明示的エラーハンドリング
 *
 * - **throw禁止**: 例外を使わず、`Result<T, E>`で成功/失敗を明示的に返す
 * - **型安全**: エラーハンドリング漏れを型システムで検出可能
 * - **予測可能性**: 制御フローが明確になり、コードの追跡が容易
 * - **Always Valid**: ドメインオブジェクトは常に正しい状態であることを保証
 *
 * @example-good
 * ```typescript
 * export class TodoStatus {
 *   static from(props: TodoStatusProps): Result<TodoStatus, DomainError> {
 *     if (!validStatuses.includes(props.status)) {
 *       return Result.err(new DomainError("無効なステータス"));
 *     }
 *     return Result.ok(new TodoStatus(props.status));
 *   }
 * }
 *
 * export class Todo {
 *   complete(completedAt: string): Result<Todo, DomainError> {
 *     if (!this.dueDate) {
 *       return Result.err(new DomainError("期限のないTODOは完了できません"));
 *     }
 *     return Result.ok(new Todo({ ...this, status: TodoStatus.completed() }));
 *   }
 * }
 * ```
 *
 * @example-bad
 * ```typescript
 * export class TodoStatus {
 *   static from(props: TodoStatusProps): TodoStatus {
 *     if (!validStatuses.includes(props.status)) {
 *       throw new Error("無効なステータス"); // NG: throwを使用
 *     }
 *     return new TodoStatus(props.status);
 *   }
 * }
 *
 * export class Todo {
 *   complete(): Todo {
 *     if (this.status.isCompleted()) {
 *       throw new Error("Already completed"); // NG: Result型を使うべき
 *     }
 *   }
 * }
 * ```
 */

import * as ts from "typescript";
import { createASTChecker } from "../../../../ast-checker";

export const policyCheck = createASTChecker({
  filePattern: /\.(entity|vo)\.ts$/,

  visitor: (node, ctx) => {
    if (!ts.isThrowStatement(node)) return;

    ctx.report(
      node,
      "throw文の使用は禁止されています。Result型（Result.err()）を使用してエラーを表現してください。"
    );
  },
});
