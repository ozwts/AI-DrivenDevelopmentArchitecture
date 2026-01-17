/**
 * @what Value Objectでパラメータプロパティの使用を禁止
 * @why パラメータプロパティはES2022プライベートフィールド（#field）と相性が悪く、明示性に欠ける
 * @failure コンストラクタでパラメータプロパティを使用している場合にエラー
 *
 * @concept パラメータプロパティ禁止
 *
 * `private constructor(private readonly value: string)` のような記法は禁止。
 * ES2022プライベートフィールド `#field` とコンストラクタボディでの代入を使用する。
 *
 * @example-good
 * ```typescript
 * export class TodoStatus {
 *   readonly #status: TodoStatusValue;
 *
 *   private constructor(status: TodoStatusValue) {
 *     this.#status = status;  // コンストラクタボディで明示的に代入
 *   }
 * }
 * ```
 *
 * @example-bad
 * ```typescript
 * export class TodoStatus {
 *   // NG: パラメータプロパティ
 *   private constructor(private readonly value: string) {}
 * }
 *
 * export class Email {
 *   // NG: パラメータプロパティ
 *   private constructor(readonly email: string) {}
 * }
 * ```
 */

import * as ts from "typescript";
import { createASTChecker } from "../../../../ast-checker";

export const policyCheck = createASTChecker({
  filePattern: /\.vo\.ts$/,

  visitor: (node, ctx) => {
    if (!ts.isConstructorDeclaration(node)) return;

    for (const param of node.parameters) {
      // パラメータプロパティ = パラメータにアクセス修飾子がついている
      const hasModifier = param.modifiers?.some(
        (m) =>
          m.kind === ts.SyntaxKind.PublicKeyword ||
          m.kind === ts.SyntaxKind.PrivateKeyword ||
          m.kind === ts.SyntaxKind.ProtectedKeyword ||
          m.kind === ts.SyntaxKind.ReadonlyKeyword
      );

      if (hasModifier === true) {
        const paramName = ts.isIdentifier(param.name)
          ? param.name.text
          : "unknown";
        ctx.report(
          param,
          `パラメータプロパティ "${paramName}" の使用は禁止されています。` +
            `ES2022プライベートフィールド（#${paramName}）とコンストラクタボディでの代入を使用してください。`
        );
      }
    }
  },
});
