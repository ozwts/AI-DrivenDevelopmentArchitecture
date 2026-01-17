/**
 * @what Value ObjectにtoString()メソッドが存在するか検査
 * @why デバッグ・ログ出力時に値を文字列として表現するため、toString()は必須
 * @failure toString()メソッドを持たないValue Objectを検出した場合にエラー
 *
 * @concept Value Objectのデバッグ表現
 *
 * - **toString()は必須メソッド**: デバッグ・ログ出力用に文字列表現を提供
 * - **可読性**: 開発者がオブジェクトの値を簡単に確認できる
 * - **ログ出力**: 構造化ログでValue Objectの状態を記録
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
 *   equals(other: TodoStatus): boolean {
 *     return this.#status === other.#status;
 *   }
 *
 *   toString(): string {
 *     return this.#status;
 *   }
 * }
 *
 * export class Email {
 *   readonly #email: string;
 *
 *   equals(other: Email): boolean {
 *     return this.#email.toLowerCase() === other.#email.toLowerCase();
 *   }
 *
 *   toString(): string {
 *     return this.#email;
 *   }
 * }
 *
 * export class FullName {
 *   readonly #firstName: string;
 *   readonly #lastName: string;
 *
 *   toString(): string {
 *     return `${this.#lastName} ${this.#firstName}`;
 *   }
 * }
 * ```
 *
 * @example-bad
 * ```typescript
 * export class TodoStatus {
 *   readonly #status: TodoStatusValue;
 *
 *   equals(other: TodoStatus): boolean {
 *     return this.#status === other.#status;
 *   }
 *
 *   // NG: toString()メソッドがない
 *   // デバッグ・ログ出力時に困る
 * }
 *
 * export class Email {
 *   readonly #email: string;
 *
 *   equals(other: Email): boolean {
 *     return this.#email.toLowerCase() === other.#email.toLowerCase();
 *   }
 *
 *   // NG: toString()メソッドがない
 * }
 * ```
 */

import * as ts from 'typescript';
import createCheck from '../../check-builder';

export default createCheck({
  filePattern: /\.vo\.ts$/,

  visitor: (node, ctx) => {
    if (!ts.isClassDeclaration(node)) return;

    // クラス名を取得
    const className = node.name?.text ?? 'Anonymous';

    // toString()メソッドを探す
    const hasToString = node.members.some((member) => {
      if (!ts.isMethodDeclaration(member)) return false;
      if (!ts.isIdentifier(member.name)) return false;
      return member.name.text === 'toString';
    });

    if (!hasToString) {
      ctx.report(
        node,
        `Value Object "${className}" には toString() メソッドが必要です。デバッグ・ログ出力用に文字列表現を提供してください。`
      );
    }
  },
});
