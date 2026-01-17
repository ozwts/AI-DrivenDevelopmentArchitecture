/**
 * @what Entity/Value Objectのコンストラクタがprivateで宣言されているか検査
 * @why publicコンストラクタは直接インスタンス化を許し、ファクトリメソッド（from()）によるバリデーションをバイパスするため
 * @failure publicまたはprotectedコンストラクタを持つEntity/VOを検出した場合にエラー
 *
 * @concept ファクトリパターン（private constructor + from()）
 *
 * - **privateコンストラクタ**: 外部からの直接インスタンス化を禁止
 * - **from()ファクトリメソッド**: バリデーション済みのインスタンス生成を保証
 * - **Always Valid**: 不正な状態のオブジェクトが生成されることを防止
 * - **Result型との組み合わせ**: バリデーション失敗時はエラーを返す
 *
 * @example-good
 * ```typescript
 * export class TodoStatus {
 *   readonly #status: TodoStatusValue;
 *
 *   private constructor(status: TodoStatusValue) {
 *     this.#status = status;
 *   }
 *
 *   static from(props: TodoStatusProps): Result<TodoStatus, DomainError> {
 *     // バリデーション後にインスタンス化
 *     return Result.ok(new TodoStatus(props.status));
 *   }
 * }
 * ```
 *
 * @example-bad
 * ```typescript
 * export class TodoStatus {
 *   constructor(public value: string) {} // NG: publicコンストラクタ
 * }
 *
 * export class Todo {
 *   constructor(props: TodoProps) { // NG: 暗黙的にpublic
 *     this.id = props.id;
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

    // クラス名を取得（レポート用）
    const className = node.name?.text ?? 'Anonymous';

    // コンストラクタを探す
    for (const member of node.members) {
      if (!ts.isConstructorDeclaration(member)) continue;

      // privateかどうかチェック
      const hasPrivate = member.modifiers?.some(
        (m) => m.kind === ts.SyntaxKind.PrivateKeyword
      );

      if (!hasPrivate) {
        ctx.report(
          member,
          `クラス "${className}" のコンストラクタにprivate修飾子がありません。ファクトリメソッド（from()）パターンを使用してください。`
        );
      }
    }
  },
});
