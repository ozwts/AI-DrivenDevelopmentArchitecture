/**
 * @what Value Objectにequals()メソッドが存在するか検査
 * @why Value Objectは値で等価性を判断するため、equals()メソッドは必須
 * @failure equals()メソッドを持たないValue Objectを検出した場合にエラー
 *
 * @concept Value Objectの等価性
 *
 * - **値で等価性を判断**: `this.#status === other.#status`
 * - **Entityとの違い**: EntityはIDで識別、VOは全プロパティで識別
 * - **equals()は必須メソッド**: Value Objectの定義上必須
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
 *     // ...
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
 *     // 大文字小文字を無視して比較
 *     return this.#email.toLowerCase() === other.#email.toLowerCase();
 *   }
 * }
 * ```
 *
 * @example-bad
 * ```typescript
 * export class TodoStatus {
 *   readonly #status: TodoStatusValue;
 *
 *   private constructor(status: TodoStatusValue) {
 *     this.#status = status;
 *   }
 *
 *   static from(props: TodoStatusProps): Result<TodoStatus, DomainError> {
 *     // ...
 *   }
 *
 *   // NG: equals()メソッドがない
 *   toString(): string {
 *     return this.#status;
 *   }
 * }
 *
 * export class Email {
 *   readonly #email: string;
 *
 *   // NG: equals()メソッドがない
 *   // Value Objectは値で等価性を判断するため必須
 * }
 * ```
 */

import * as ts from "typescript";
import { createASTChecker } from "../../../../ast-checker";

export const policyCheck = createASTChecker({
  filePattern: /\.vo\.ts$/,

  visitor: (node, ctx) => {
    if (!ts.isClassDeclaration(node)) return;

    // クラス名を取得
    const className = node.name?.text ?? "Anonymous";

    // equals()メソッドを探す
    const hasEquals = node.members.some((member) => {
      if (!ts.isMethodDeclaration(member)) return false;
      if (!ts.isIdentifier(member.name)) return false;
      return member.name.text === "equals";
    });

    if (!hasEquals) {
      ctx.report(
        node,
        `Value Object "${className}" には equals() メソッドが必要です。Value Objectは値で等価性を判断するため、equals()は必須です。`
      );
    }
  },
});
