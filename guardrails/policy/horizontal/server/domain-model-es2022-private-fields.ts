/**
 * @what Value ObjectでES2022プライベートフィールド（#）を使用しているか検査
 * @why アンダースコアプレフィックス（_value）はESLintのno-underscore-dangleに違反し、ES2022の#fieldは言語レベルの真のプライベート性を提供するため
 * @failure アンダースコアプレフィックスのプライベートフィールドを検出した場合にエラー
 *
 * @concept ES2022プライベートフィールド
 *
 * - **言語レベルのプライベート性**: `#field`は真のプライベートフィールド（外部からアクセス不可）
 * - **ESLint適合**: `_value`は`no-underscore-dangle`違反、`#`は違反なし
 * - **意味のある名前**: `#value`ではなく`#status`, `#email`等の具体的な名前を使用
 * - **TypeScriptとの親和性**: `readonly #field`で不変性も同時に表現
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
 *   get status(): TodoStatusValue {
 *     return this.#status;
 *   }
 * }
 *
 * export class Email {
 *   readonly #email: string;
 *
 *   private constructor(email: string) {
 *     this.#email = email;
 *   }
 * }
 * ```
 *
 * @example-bad
 * ```typescript
 * export class TodoStatus {
 *   private readonly _value: string; // NG: アンダースコアプレフィックス
 *
 *   private constructor(value: string) {
 *     this._value = value;
 *   }
 * }
 *
 * export class Email {
 *   private _email: string; // NG: ES2022 #fieldを使用すべき
 * }
 * ```
 */

import * as ts from "typescript";
import { createASTChecker } from "../../ast-checker";

export const policyCheck = createASTChecker({
  filePattern: /\.vo\.ts$/,

  visitor: (node, ctx) => {
    if (!ts.isPropertyDeclaration(node)) return;

    // プロパティ名を取得
    const propertyName = node.name;
    if (!ts.isIdentifier(propertyName)) return;

    const name = propertyName.text;

    // アンダースコアで始まるプライベートフィールドを検出
    if (name.startsWith("_")) {
      ctx.report(
        node,
        `アンダースコアプレフィックス "${name}" の使用は禁止されています。ES2022プライベートフィールド（#${name.slice(1)}）を使用してください。`
      );
    }
  },
});
