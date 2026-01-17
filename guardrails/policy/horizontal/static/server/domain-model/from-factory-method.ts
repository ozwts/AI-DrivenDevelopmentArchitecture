/**
 * @what Entity/Value Objectにstatic from()ファクトリメソッドが存在するか検査
 * @why privateコンストラクタと組み合わせて、バリデーション済みのインスタンス生成を保証するため
 * @failure static from()メソッドを持たないEntity/VOを検出した場合にエラー
 *
 * @concept from()ファクトリメソッドのパターン
 *
 * | 状況 | 戻り値 |
 * |------|--------|
 * | バリデーションあり | `Result<Entity, DomainError>` |
 * | バリデーションなし | `Entity` を直接返す |
 *
 * - **from()の責務**: データ整合性（不変条件）のチェック
 * - **個別メソッドの責務**: 操作の前提条件（ビジネスルール）のチェック
 * - **Props型パターン**: 引数は`<Entity>Props`型エイリアスで受け取る
 *
 * @example-good
 * ```typescript
 * export class Todo {
 *   readonly id: string;
 *   readonly title: string;
 *
 *   private constructor(props: TodoProps) {
 *     this.id = props.id;
 *     this.title = props.title;
 *   }
 *
 *   static from(props: TodoProps): Result<Todo, DomainError> {
 *     if (props.status.isCompleted() && props.completedAt === undefined) {
 *       return Result.err(new DomainError("完了済みTODOには完了日時が必要です"));
 *     }
 *     return Result.ok(new Todo(props));
 *   }
 * }
 *
 * export class TodoStatus {
 *   readonly #status: TodoStatusValue;
 *
 *   private constructor(status: TodoStatusValue) {
 *     this.#status = status;
 *   }
 *
 *   static from(props: TodoStatusProps): Result<TodoStatus, DomainError> {
 *     if (!validStatuses.includes(props.status)) {
 *       return Result.err(new DomainError("無効なステータス"));
 *     }
 *     return Result.ok(new TodoStatus(props.status));
 *   }
 * }
 * ```
 *
 * @example-bad
 * ```typescript
 * export class Todo {
 *   readonly id: string;
 *
 *   private constructor(props: TodoProps) {
 *     this.id = props.id;
 *   }
 *   // NG: static from()メソッドがない
 * }
 *
 * export class TodoStatus {
 *   readonly #status: string;
 *
 *   private constructor(status: string) {
 *     this.#status = status;
 *   }
 *
 *   // NG: インスタンスメソッドのfrom()
 *   from(props: TodoStatusProps): TodoStatus {
 *     return new TodoStatus(props.status);
 *   }
 * }
 * ```
 */

import * as ts from 'typescript';
import createCheck from '../../check-builder';

export default createCheck({
  filePattern: /\.(entity|vo)\.ts$/,

  visitor: (node, ctx) => {
    if (!ts.isClassDeclaration(node)) return;

    // クラス名を取得
    const className = node.name?.text ?? 'Anonymous';

    // static from()メソッドを探す
    const hasStaticFrom = node.members.some((member) => {
      if (!ts.isMethodDeclaration(member)) return false;
      if (!ts.isIdentifier(member.name)) return false;
      if (member.name.text !== 'from') return false;

      // staticかどうかチェック
      const hasStatic = member.modifiers?.some(
        (m) => m.kind === ts.SyntaxKind.StaticKeyword
      );

      return hasStatic === true;
    });

    if (!hasStaticFrom) {
      ctx.report(
        node,
        `クラス "${className}" には static from() ファクトリメソッドが必要です。privateコンストラクタと組み合わせて使用してください。`
      );
    }
  },
});
